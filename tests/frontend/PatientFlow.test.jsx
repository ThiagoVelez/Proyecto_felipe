import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import PatientPicker from '../../src/frontend/src/components/PatientPicker';
import PatientRegisterModal, { validatePatientForm } from '../../src/frontend/src/components/PatientRegisterModal';
import Header from '../../src/frontend/src/components/Header';
import DashboardScreen from '../../src/frontend/src/screens/DashboardScreen';
import { apiClient } from '../../src/frontend/src/services/api';
import { mockApi, TEST_PATIENT } from './helpers/mockApi';

beforeEach(() => {
  apiClient.setAuth('token-de-prueba', { id: 'doc-1', role: 'MEDICO', role_id: 2, branch: 'Sede de Prueba' });
});

afterEach(() => {
  vi.restoreAllMocks();
  apiClient.setAuth('', null);
});

describe('PatientPicker - seleccion de paciente por API', () => {
  it('lista los pacientes del servidor y entrega el detalle con alergias al seleccionar', async () => {
    mockApi({
      'GET /patients': { body: { patients: [{ ...TEST_PATIENT, allergies: undefined }], count: 1 } },
      'GET /patients/pat-1': { body: TEST_PATIENT },
    });
    const onSelect = vi.fn();

    render(<PatientPicker onSelect={onSelect} />);

    fireEvent.click(await screen.findByRole('button', { name: /Seleccionar a Lucia Prado Rios/i }));

    await waitFor(() => expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'pat-1' })));
    expect(onSelect.mock.calls[0][0].allergies).toHaveLength(1);
  });

  it('busca por documento y avisa cuando el paciente no existe (404)', async () => {
    const { calls } = mockApi({
      'GET /patients': { body: { patients: [], count: 0 } },
      'GET /patients/lookup': { status: 404, body: { error: 'Paciente no encontrado' } },
    });

    render(<PatientPicker onSelect={vi.fn()} />);

    fireEvent.change(await screen.findByLabelText('Número de documento'), { target: { value: '999888' } });
    fireEvent.click(screen.getByRole('button', { name: /Buscar por documento/i }));

    expect(await screen.findByText(/No existe un paciente con ese documento/i)).toBeInTheDocument();
    const lookup = calls.find((c) => c.path === '/patients/lookup');
    expect(lookup.url).toContain('document_type=CC');
    expect(lookup.url).toContain('document_number=999888');
  });

  it('muestra el error de red al listar pacientes', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));

    render(<PatientPicker onSelect={vi.fn()} />);

    expect(await screen.findByText(/El servicio no está disponible/i)).toBeInTheDocument();
  });
});

describe('PatientRegisterModal - alta de paciente y alergias', () => {
  const fillRequired = () => {
    fireEvent.change(screen.getByLabelText(/Número de Documento/i), { target: { value: '1118000111' } });
    fireEvent.change(screen.getByLabelText(/Primer Nombre/i), { target: { value: 'Lucia' } });
    fireEvent.change(screen.getByLabelText(/Primer Apellido/i), { target: { value: 'Prado' } });
    fireEvent.change(screen.getByLabelText(/Fecha de Nacimiento/i), { target: { value: '1990-05-14' } });
    fireEvent.change(screen.getByLabelText(/EPS/i), { target: { value: 'Nueva EPS' } });
  };

  it('valida los campos del contrato antes de llamar al servidor', async () => {
    const { calls } = mockApi({});

    render(<PatientRegisterModal isOpen onClose={vi.fn()} onCreated={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /^Registrar Paciente$/i }));

    expect(await screen.findByText(/El primer nombre es obligatorio/i)).toBeInTheDocument();
    expect(calls).toHaveLength(0);
    expect(Object.keys(validatePatientForm({
      document_number: '', first_name: '', last_name: '', birth_date: '', eps_name: '', phone: '',
    }))).toEqual(['document_number', 'first_name', 'last_name', 'birth_date', 'eps_name']);
  });

  it('crea el paciente y registra sus alergias con las llamadas del contrato', async () => {
    const { calls } = mockApi({
      'POST /patients': { status: 201, body: { ...TEST_PATIENT, allergies: [] } },
      'POST /patients/pat-1/allergies': { status: 201, body: { id: 'al-1' } },
    });
    const onCreated = vi.fn();

    render(<PatientRegisterModal isOpen onClose={vi.fn()} onCreated={onCreated} />);
    fillRequired();
    fireEvent.change(screen.getByLabelText('Principio activo'), { target: { value: 'Penicilina' } });
    fireEvent.change(screen.getByLabelText('Severidad'), { target: { value: 'SEVERA' } });
    fireEvent.click(screen.getByRole('button', { name: /^Agregar$/i }));
    fireEvent.click(screen.getByRole('button', { name: /^Registrar Paciente$/i }));

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(expect.objectContaining({ id: 'pat-1' })));
    const created = calls.find((c) => c.path === '/patients' && c.method === 'POST');
    expect(created.body).toMatchObject({ document_type: 'CC', document_number: '1118000111', birth_date: '1990-05-14' });
    const allergy = calls.find((c) => c.path === '/patients/pat-1/allergies');
    expect(allergy.body).toEqual({ active_ingredient: 'Penicilina', severity: 'SEVERA' });
  });

  it('muestra el 409 de documento duplicado y no cierra el formulario', async () => {
    mockApi({ 'POST /patients': { status: 409, body: { error: 'Ya existe un paciente con ese documento' } } });
    const onCreated = vi.fn();

    render(<PatientRegisterModal isOpen onClose={vi.fn()} onCreated={onCreated} />);
    fillRequired();
    fireEvent.click(screen.getByRole('button', { name: /^Registrar Paciente$/i }));

    expect(await screen.findByText(/Ya existe un paciente con ese documento/i)).toBeInTheDocument();
    expect(onCreated).not.toHaveBeenCalled();
  });
});

describe('DashboardScreen - cola de triaje real', () => {
  const triage = {
    id: 'tri-1',
    patient_id: 'pat-1',
    systolic_bp: 150,
    diastolic_bp: 95,
    heart_rate: 110,
    oxygen_saturation: 91,
    manchester_level: 'NIVEL_II',
    reason_for_consultation: 'Dolor toracico opresivo',
    status: 'PENDIENTE',
    created_at: new Date(Date.now() - 12 * 60000).toISOString(),
  };

  it('muestra la cola y los nombres desde la API, sin pacientes inventados', async () => {
    mockApi({
      'GET /triage': { body: [triage] },
      'GET /patients': { body: { patients: [TEST_PATIENT], count: 1 } },
    });

    render(<DashboardScreen onSelectPatient={vi.fn()} onNavigate={vi.fn()} />);

    expect(await screen.findByText('Lucia Prado Rios')).toBeInTheDocument();
    expect(screen.getByText(/NIVEL II/)).toBeInTheDocument();
    expect(screen.getByText('Dolor toracico opresivo')).toBeInTheDocument();
    expect(screen.queryByText(/Carlos Eduardo Mendoza/i)).not.toBeInTheDocument();
  });

  it('muestra el error cuando el servidor rechaza la consulta de la cola', async () => {
    mockApi({
      'GET /triage': { status: 403, body: { error: 'Rol sin permiso para consultar la cola' } },
      'GET /patients': { body: { patients: [], count: 0 } },
    });

    render(<DashboardScreen onSelectPatient={vi.fn()} onNavigate={vi.fn()} />);

    expect(await screen.findByText(/Rol sin permiso para consultar la cola/i)).toBeInTheDocument();
  });

  it('Llamar HCE marca el triaje en atencion, carga el paciente y navega', async () => {
    const { calls } = mockApi({
      'GET /triage': { body: [triage] },
      'GET /patients': { body: { patients: [TEST_PATIENT], count: 1 } },
      'PATCH /triage/tri-1/status': { body: { ...triage, status: 'EN_ATENCION' } },
      'GET /patients/pat-1': { body: TEST_PATIENT },
    });
    const onSelectPatient = vi.fn();
    const onNavigate = vi.fn();

    render(<DashboardScreen onSelectPatient={onSelectPatient} onNavigate={onNavigate} />);

    const row = (await screen.findByText('Lucia Prado Rios')).closest('tr');
    fireEvent.click(within(row).getByRole('button', { name: /Llamar HCE/i }));

    await waitFor(() => expect(onNavigate).toHaveBeenCalledWith('hce'));
    expect(onSelectPatient).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'pat-1' }),
      expect.objectContaining({ status: 'EN_ATENCION' })
    );
    expect(calls.find((c) => c.method === 'PATCH').body).toEqual({ status: 'EN_ATENCION' });
  });
});

describe('Header - buscador global de pacientes', () => {
  it('propaga el error 404 de la busqueda al usuario en lugar de ignorarlo', async () => {
    const onSearch = vi.fn().mockRejectedValue(Object.assign(new Error('Paciente no encontrado'), { status: 404 }));

    render(
      <Header
        user={{ full_name: 'Dra. Prueba', role: 'MEDICO', role_id: 2 }}
        onLogout={vi.fn()}
        currentView="dashboard"
        isOffline={false}
        setIsOffline={vi.fn()}
        onSearch={onSearch}
        onNavigate={vi.fn()}
      />
    );

    fireEvent.change(screen.getByLabelText('Número de documento del paciente'), { target: { value: '123456' } });
    fireEvent.submit(screen.getByLabelText('Número de documento del paciente').closest('form'));

    expect(await screen.findByText(/No existe un paciente con ese documento/i)).toBeInTheDocument();
    expect(onSearch).toHaveBeenCalledWith('CC', '123456');
  });
});
