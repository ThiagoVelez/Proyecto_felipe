import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LaboratoryScreen from '../../src/frontend/src/screens/LaboratoryScreen';
import DoctorLabOrdersView from '../../src/frontend/src/screens/DoctorLabOrdersView';
import AdminDashboardScreen from '../../src/frontend/src/screens/admin/AdminDashboardScreen';
import { mockApi } from './helpers/mockApi';

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

const orden = (overrides = {}) => ({
  id: 'LAB-2026-001',
  patient_id: 'pat-1',
  patient_name: 'Lucía Prado',
  patient_document: '1094111222',
  patient_document_type: 'CC',
  patient_email: 'lucia@correo.example',
  patient_eps: 'Nueva EPS',
  test_type: 'Hemograma Completo',
  sample_type: 'Sangre EDTA',
  priority: 'URGENTE',
  status: 'PENDIENTE',
  observations: 'Fiebre de tres días',
  ordering_doctor: 'Dra. Laura Gómez',
  doctor_email: 'laura@ips.example',
  results: '',
  method_notes: '',
  created_at: '2026-11-19T10:00:00Z',
  ...overrides,
});

describe('Laboratorio - órdenes en el servidor', () => {
  it('la bandeja muestra las órdenes del servidor y no órdenes de ejemplo', async () => {
    mockApi({ 'GET /lab-orders': { body: { orders: [orden()] } } });
    render(<LaboratoryScreen user={{ full_name: 'Bact. Ana Ruiz', role: 'LABORATORIO' }} />);

    expect(await screen.findByText('Hemograma Completo')).toBeInTheDocument();
    expect(screen.getAllByText(/Lucía Prado/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Médico Demo 01/)).not.toBeInTheDocument();
  });

  it('sella el resultado en el servidor y envía el correo real', async () => {
    const sellada = orden({ status: 'COMPLETADO', results: 'HB: 14 g/dL', validated_by: 'Bact. Ana Ruiz', bacteriologist_license: 'BAC-1', validated_at: '2026-11-19T11:00:00Z' });
    const { calls } = mockApi({
      'GET /lab-orders': { body: { orders: [orden()] } },
      'POST /lab-orders/LAB-2026-001/seal': { body: sellada },
      'POST /lab-orders/LAB-2026-001/dispatch': ({ body }) => ({ body: { ...sellada, dispatched_to: body.email, email_dispatched_at: '2026-11-19T11:05:00Z' } }),
    });
    render(<LaboratoryScreen user={{ full_name: 'Bact. Ana Ruiz', role: 'LABORATORIO' }} />);

    fireEvent.click(await screen.findByRole('button', { name: /Ingresar Resultados/i }));
    await screen.findByRole('button', { name: /Validar & Sellar Resultado/i });
    fireEvent.change(document.querySelector('textarea'), { target: { value: 'HB: 14 g/dL' } });
    fireEvent.click(screen.getByRole('button', { name: /Validar & Sellar Resultado/i }));

    expect(await screen.findByText(/validado y sellado bajo registro ReTHUS BAC-1/i)).toBeInTheDocument();
    const sello = calls.find((c) => c.path === '/lab-orders/LAB-2026-001/seal');
    expect(sello.body.results).toBe('HB: 14 g/dL');

    fireEvent.click(screen.getByRole('button', { name: /Enviar por Correo al Paciente/i }));
    fireEvent.click(await screen.findByRole('button', { name: /Confirmar y Despachar Correos/i }));
    expect(await screen.findByText(/Resultado oficial sellado enviado a lucia@correo.example/i)).toBeInTheDocument();
    const envio = calls.find((c) => c.path === '/lab-orders/LAB-2026-001/dispatch');
    expect(envio.body).toEqual({ email: 'lucia@correo.example', copy_doctor: true });
  });

  it('muestra el rechazo del servidor cuando el resultado ya está sellado', async () => {
    mockApi({
      'GET /lab-orders': { body: { orders: [orden({ status: 'EN_PROCESO', results: 'parcial' })] } },
      'PUT /lab-orders/LAB-2026-001/progress': { status: 409, body: { error: 'El resultado ya fue validado y sellado; no puede modificarse' } },
    });
    render(<LaboratoryScreen user={{ full_name: 'Bact. Ana Ruiz', role: 'LABORATORIO' }} />);

    fireEvent.click(await screen.findByRole('button', { name: /Continuar Análisis/i }));
    fireEvent.click(await screen.findByRole('button', { name: /Guardar Avance/i }));
    expect(await screen.findByText(/No se pudo guardar el avance: El resultado ya fue validado/i)).toBeInTheDocument();
  });

  it('el médico envía la orden al servidor con el paciente seleccionado', async () => {
    const paciente = { id: 'pat-1', full_name: 'Lucía Prado', document_number: '1094111222', birth_date: '1990-05-14' };
    const { calls } = mockApi({
      'GET /lab-orders': { body: { orders: [] } },
      'GET /patients': { body: { patients: [paciente] } },
      'POST /lab-orders': ({ body }) => ({ status: 201, body: orden({ id: 'LAB-2026-007', test_type: body.test_type }) }),
    });
    render(<DoctorLabOrdersView user={{ id: 'doc-1', full_name: 'Dra. Laura Gómez', role: 'MEDICO' }} patient={paciente} />);

    fireEvent.click(await screen.findByRole('button', { name: /Hemograma/i }));
    fireEvent.change(screen.getByPlaceholderText(/Describa el cuadro clínico/i), { target: { value: 'Fiebre de tres días' } });
    fireEvent.click(screen.getByRole('button', { name: /Enviar al Buzón de Laboratorio/i }));

    expect(await screen.findByText(/Orden LAB-2026-007 despachada/i)).toBeInTheDocument();
    const envio = calls.find((c) => c.method === 'POST' && c.path === '/lab-orders');
    expect(envio.body.patient_id).toBe('pat-1');
    expect(envio.body.test_type).toMatch(/Hemograma/i);
  });
});

describe('Sedes - catálogo del servidor', () => {
  it('el administrador crea una sede con coordenadas en el servidor', async () => {
    const { calls } = mockApi({
      'GET /branches': { body: { branches: [{ id: 'br-01', name: 'Sede Cartago - Hospital Central', status: 'Operativo' }] } },
      'GET /admin/users': { body: { users: [], count: 0 } },
      'GET /admin/audit-logs': { body: { audit_logs: [], count: 0 } },
      'POST /admin/branches': ({ body }) => ({ status: 201, body: { id: 'br-nueva', ...body } }),
    });
    render(<AdminDashboardScreen initialTab="branches" hideTabs />);

    fireEvent.click(await screen.findByRole('button', { name: /Añadir Sede|Nueva Sede|Agregar Sede/i }));
    const dialogo = await screen.findByRole('dialog');
    const campos = dialogo.querySelectorAll('input[type="text"]');
    fireEvent.change(campos[0], { target: { value: 'Sede Roldanillo - Ambulatoria' } });
    fireEvent.change(screen.getByLabelText(/Latitud/i), { target: { value: '4.4123' } });
    fireEvent.change(screen.getByLabelText(/Longitud/i), { target: { value: '-76.1547' } });
    fireEvent.submit(dialogo.querySelector('form'));

    await waitFor(() => expect(calls.some((c) => c.method === 'POST' && c.path === '/admin/branches')).toBe(true));
    const creacion = calls.find((c) => c.method === 'POST' && c.path === '/admin/branches');
    expect(creacion.body).toMatchObject({ name: 'Sede Roldanillo - Ambulatoria', latitude: 4.4123, longitude: -76.1547 });
    expect(await screen.findByText(/agregada a la red asistencial/i)).toBeInTheDocument();
  });

  it('muestra el motivo cuando el servidor no permite retirar la sede', async () => {
    mockApi({
      'GET /branches': { body: { branches: [{ id: 'br-01', name: 'Sede Cartago - Hospital Central', status: 'Operativo' }] } },
      'GET /admin/users': { body: { users: [], count: 0 } },
      'GET /admin/audit-logs': { body: { audit_logs: [], count: 0 } },
    });
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init = {}) => {
      if ((init.method || 'GET') === 'DELETE') {
        return new Response(JSON.stringify({ error: 'La sede tiene personal asignado' }), { status: 409 });
      }
      const path = String(url).replace(/^\/api\/v[12]/, '').split('?')[0];
      const body = path === '/branches'
        ? { branches: [{ id: 'br-01', name: 'Sede Cartago - Hospital Central', status: 'Operativo' }] }
        : path === '/admin/users' ? { users: [], count: 0 } : { audit_logs: [], count: 0 };
      return new Response(JSON.stringify(body), { status: 200 });
    });
    render(<AdminDashboardScreen initialTab="branches" hideTabs />);

    await screen.findByText('Sede Cartago - Hospital Central');
    fireEvent.click(screen.getAllByRole('button', { name: /Retirar|Eliminar/i })[0]);
    const confirmar = await screen.findByRole('dialog');
    const botones = confirmar.querySelectorAll('button');
    fireEvent.click(botones[botones.length - 1]);

    expect(await screen.findByText(/No se pudo retirar la sede: La sede tiene personal asignado/i)).toBeInTheDocument();
  });
});
