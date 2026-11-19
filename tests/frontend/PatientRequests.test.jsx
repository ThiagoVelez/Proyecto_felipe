import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import PatientPortal, { distanceKm } from '../../src/frontend/src/screens/PatientPortal';
import DoctorRequestsInbox from '../../src/frontend/src/screens/DoctorRequestsInbox';
import Sidebar from '../../src/frontend/src/components/Sidebar';
import { mockApi } from './helpers/mockApi';

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

const SEDES = [
  { name: 'Sede Cartago - Hospital Central', municipality: 'Cartago, Valle del Cauca', latitude: 4.7464, longitude: -75.9117 },
  { name: 'Sede La Unión - Urgencias', municipality: 'La Unión, Valle del Cauca', latitude: 4.5322, longitude: -76.1036 },
  { name: 'Sede Tuluá - Ambulatoria', municipality: 'Tuluá, Valle del Cauca', latitude: 4.0847, longitude: -76.1954 },
];

const fillPortal = () => {
  const set = (label, value) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
  set(/Número de documento/i, '1094111222');
  set(/Nombres/i, 'Lucía');
  set(/Apellidos/i, 'Prado');
  set(/Fecha de nacimiento/i, '1990-05-14');
  set(/Sexo/i, 'F');
  set(/Grupo sanguíneo/i, 'O+');
  set(/^EPS/i, 'Nueva EPS');
  set(/Teléfono celular/i, '3001234567');
  set(/Correo electrónico/i, 'lucia@correo.example');
  set(/Observación/i, 'Dolor de cabeza frecuente hace dos semanas');
};

describe('Portal del paciente - Solicitud de primera cita', () => {
  it('calcula distancias reales entre municipios', () => {
    const tuluaCartago = distanceKm(4.0847, -76.1954, 4.7464, -75.9117);
    expect(tuluaCartago).toBeGreaterThan(75);
    expect(tuluaCartago).toBeLessThan(85);
  });

  it('con la ubicación del paciente ordena las sedes y elige la más cercana', async () => {
    mockApi({ 'GET /public/branches': { body: { branches: SEDES } } });
    vi.stubGlobal('navigator', {
      ...navigator,
      geolocation: {
        // Paciente en Tuluá
        getCurrentPosition: (ok) => ok({ coords: { latitude: 4.09, longitude: -76.2 } }),
      },
    });
    render(<PatientPortal />);
    await screen.findByText('Sede Cartago - Hospital Central');

    fireEvent.click(screen.getByRole('button', { name: /Usar mi ubicación/i }));

    const opciones = await screen.findAllByRole('radio');
    expect(opciones[0]).toHaveTextContent('Sede Tuluá - Ambulatoria');
    expect(opciones[0]).toHaveTextContent('Más cercana');
    expect(opciones[0]).toHaveAttribute('aria-checked', 'true');
    vi.unstubAllGlobals();
  });

  it('si el paciente no permite la ubicación puede elegir la sede de la lista', async () => {
    mockApi({ 'GET /public/branches': { body: { branches: SEDES } } });
    vi.stubGlobal('navigator', { ...navigator, geolocation: { getCurrentPosition: (_ok, fail) => fail(new Error('denegado')) } });
    render(<PatientPortal />);
    await screen.findByText('Sede Cartago - Hospital Central');

    fireEvent.click(screen.getByRole('button', { name: /Usar mi ubicación/i }));
    expect(await screen.findByText(/No pudimos obtener su ubicación/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: /Sede Cartago/i }));
    expect(screen.getByRole('radio', { name: /Sede Cartago/i })).toHaveAttribute('aria-checked', 'true');
    vi.unstubAllGlobals();
  });

  it('exige aceptar el tratamiento de datos antes de enviar', async () => {
    const { calls } = mockApi({ 'GET /public/branches': { body: { branches: SEDES } } });
    const { container } = render(<PatientPortal />);
    fireEvent.click(await screen.findByRole('radio', { name: /Sede Tuluá/i }));
    fillPortal();
    fireEvent.submit(container.querySelector('form'));

    expect(await screen.findByText(/Debe aceptar el tratamiento de sus datos/i)).toBeInTheDocument();
    expect(calls.some((c) => c.method === 'POST')).toBe(false);
  });

  it('envía la solicitud con los datos y la sede, y muestra el código', async () => {
    const { calls } = mockApi({
      'GET /public/branches': { body: { branches: SEDES } },
      'POST /public/appointment-requests': {
        status: 201,
        body: { code: 'SOL-ABC123', branch: SEDES[2].name, message: 'Solicitud recibida. Un médico de la sede revisará su agenda y le enviará la cita a su correo.' },
      },
    });
    const { container } = render(<PatientPortal />);
    fireEvent.click(await screen.findByRole('radio', { name: /Sede Tuluá/i }));
    fillPortal();
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.submit(container.querySelector('form'));

    expect(await screen.findByText('SOL-ABC123')).toBeInTheDocument();
    const envio = calls.find((c) => c.method === 'POST');
    expect(envio.path).toBe('/public/appointment-requests');
    expect(envio.body).toMatchObject({
      branch: 'Sede Tuluá - Ambulatoria',
      document_type: 'CC',
      document_number: '1094111222',
      email: 'lucia@correo.example',
      observations: 'Dolor de cabeza frecuente hace dos semanas',
      consent: true,
    });
  });

  it('muestra el mensaje del servidor cuando la sede no tiene médicos', async () => {
    mockApi({
      'GET /public/branches': { body: { branches: SEDES } },
      'POST /public/appointment-requests': { status: 409, body: { error: 'En este momento la sede no tiene médicos disponibles' } },
    });
    const { container } = render(<PatientPortal />);
    fireEvent.click(await screen.findByRole('radio', { name: /Sede La Unión/i }));
    fillPortal();
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.submit(container.querySelector('form'));

    expect(await screen.findByText(/la sede no tiene médicos disponibles/i)).toBeInTheDocument();
  });
});

describe('Bandeja de solicitudes del médico', () => {
  const solicitud = {
    id: 'req-1',
    code: 'SOL-ABC123',
    branch: 'Sede Tuluá - Ambulatoria',
    document_type: 'CC',
    document_number: '1094111222',
    first_name: 'Lucía',
    last_name: 'Prado',
    birth_date: '1990-05-14T00:00:00Z',
    gender: 'F',
    blood_type: 'O+',
    eps_name: 'Nueva EPS',
    phone: '3001234567',
    email: 'lucia@correo.example',
    observations: 'Dolor de cabeza frecuente hace dos semanas',
    status: 'PENDIENTE',
    created_at: '2026-11-19T10:00:00Z',
    updated_at: '2026-11-19T10:00:00Z',
  };
  const doctor = { id: 'doc-1', role: 'MEDICO', role_id: 2, full_name: 'Dr. Tuluá' };

  it('muestra la solicitud y la agenda con la cita y el correo del paciente', async () => {
    const { calls } = mockApi({
      'GET /appointment-requests': { body: { requests: [solicitud] } },
      'GET /appointments': { body: [] },
      'POST /appointment-requests/req-1/schedule': { body: { request: { ...solicitud, status: 'AGENDADA' } } },
    });
    render(<DoctorRequestsInbox user={doctor} />);

    expect(await screen.findByText(/Dolor de cabeza frecuente/i, { selector: 'p.whitespace-pre-wrap' })).toBeInTheDocument();
    expect(screen.getByText('lucia@correo.example')).toBeInTheDocument();
    expect(await screen.findByText(/No tiene citas ese día/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Hora'), { target: { value: '09:20' } });
    fireEvent.change(screen.getByLabelText(/Indicaciones para el paciente/i), { target: { value: 'Traer exámenes' } });
    fireEvent.click(screen.getByRole('button', { name: /Agendar y enviar por correo/i }));

    expect(await screen.findByText(/Cita agendada para Lucía Prado/i)).toBeInTheDocument();
    const agendar = calls.find((c) => c.path === '/appointment-requests/req-1/schedule');
    expect(agendar.body.note).toBe('Traer exámenes');
    const cuando = new Date(agendar.body.appointment_date);
    expect(cuando.getHours()).toBe(9);
    expect(cuando.getMinutes()).toBe(20);
  });

  it('marca como ocupadas las horas que ya tienen cita', async () => {
    const manana = new Date(Date.now() + 24 * 3600 * 1000);
    manana.setHours(10, 0, 0, 0);
    mockApi({
      'GET /appointment-requests': { body: { requests: [solicitud] } },
      'GET /appointments': { body: [{ id: 'a1', appointment_date: manana.toISOString(), patient_name: 'Otro Paciente', status: 'SCHEDULED' }] },
    });
    render(<DoctorRequestsInbox user={doctor} />);

    expect(await screen.findByText('Otro Paciente')).toBeInTheDocument();
    const hora = within(screen.getByLabelText('Hora')).getByRole('option', { name: '10:00 (ocupada)' });
    expect(hora).toBeDisabled();
  });

  it('el rechazo exige motivo y lo envía', async () => {
    const { calls } = mockApi({
      'GET /appointment-requests': { body: { requests: [solicitud] } },
      'GET /appointments': { body: [] },
      'POST /appointment-requests/req-1/reject': { body: { request: { ...solicitud, status: 'RECHAZADA' } } },
    });
    render(<DoctorRequestsInbox user={doctor} />);

    fireEvent.click(await screen.findByRole('button', { name: /^Rechazar$/i }));
    fireEvent.click(screen.getByRole('button', { name: /Confirmar rechazo/i }));
    expect(await screen.findByText(/Escriba el motivo del rechazo/i)).toBeInTheDocument();
    expect(calls.some((c) => c.path.endsWith('/reject'))).toBe(false);

    fireEvent.change(screen.getByLabelText(/Motivo/i), { target: { value: 'Debe acudir a urgencias' } });
    fireEvent.click(screen.getByRole('button', { name: /Confirmar rechazo/i }));
    await waitFor(() => expect(calls.some((c) => c.path.endsWith('/reject'))).toBe(true));
    expect(calls.find((c) => c.path.endsWith('/reject')).body).toEqual({ note: 'Debe acudir a urgencias' });
  });

  it('el menú del médico muestra la bandeja con el número de pendientes', async () => {
    mockApi({ 'GET /appointment-requests/pending-count': { body: { pending: 3 } } });
    render(<Sidebar currentView="dashboard" setCurrentView={() => {}} user={doctor} />);

    expect(await screen.findByLabelText('3 solicitudes pendientes')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Bandeja de Solicitudes/i })).toBeInTheDocument();
  });

  it('enfermería no ve la bandeja de solicitudes', () => {
    const spy = vi.spyOn(globalThis, 'fetch');
    render(<Sidebar currentView="dashboard" setCurrentView={() => {}} user={{ id: 'n1', role: 'ENFERMERO', role_id: 3 }} />);

    expect(screen.queryByRole('button', { name: /Bandeja de Solicitudes/i })).not.toBeInTheDocument();
    expect(spy).not.toHaveBeenCalled();
  });
});
