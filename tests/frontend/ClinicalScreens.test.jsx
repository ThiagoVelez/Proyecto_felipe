import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import HceScreen from '../../src/frontend/src/screens/HceScreen';
import PrescriptionScreen from '../../src/frontend/src/screens/PrescriptionScreen';
import TriageScreen from '../../src/frontend/src/screens/TriageScreen';
import { apiClient } from '../../src/frontend/src/services/api';
import { mockApi, TEST_PATIENT, buildRecord } from './helpers/mockApi';

beforeEach(() => {
  apiClient.setAuth('token-de-prueba', {
    id: 'doc-1',
    full_name: 'Dra. Marta Ibarra',
    role: 'MEDICO',
    role_id: 2,
    professional_card: 'RM-1001',
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  apiClient.setAuth('', null);
});

describe('HceScreen - folios reales desde la API', () => {
  it('carga los folios del paciente y muestra el hash SHA-256 devuelto por el servidor', async () => {
    const serverHash = 'a'.repeat(64);
    const { calls } = mockApi({
      'GET /clinical-records/patient/pat-1': {
        body: [
          buildRecord({
            is_closed: true,
            hash_sha256: serverHash,
            previous_hash: 'b'.repeat(64),
            closed_at: '2026-11-02T10:30:00Z',
          }),
        ],
      },
    });

    render(<HceScreen patient={TEST_PATIENT} onPatientChange={vi.fn()} onNavigate={vi.fn()} />);

    expect(await screen.findByLabelText(/Motivo de Consulta/i)).toHaveValue('Dolor toracico de dos horas');
    expect(calls.some((c) => c.path === '/clinical-records/patient/pat-1')).toBe(true);

    fireEvent.click(screen.getByRole('tab', { name: /Cadena Forense/i }));
    expect(screen.getByTestId('record-hash')).toHaveTextContent(serverHash);
    expect(screen.getByText(/Penicilina/i)).toBeInTheDocument();
  });

  it('informa el fallo de carga cuando el servidor no esta disponible', async () => {
    mockApi({ 'GET /clinical-records/patient/pat-1': { status: 500, body: {} } });

    render(<HceScreen patient={TEST_PATIENT} onPatientChange={vi.fn()} onNavigate={vi.fn()} />);

    expect(await screen.findByText(/El servicio no está disponible/i)).toBeInTheDocument();
  });

  it.each([
    [403, 'Solo el medico autor del folio puede cerrarlo'],
    [409, 'El folio ya se encuentra cerrado'],
  ])('muestra el error %i del servidor al cerrar y firmar sin simular exito', async (status, message) => {
    const { calls } = mockApi({
      'GET /clinical-records/patient/pat-1': { body: [buildRecord()] },
      'POST /clinical-records/rec-1/close': { status, body: { error: message } },
    });

    render(<HceScreen patient={TEST_PATIENT} onPatientChange={vi.fn()} onNavigate={vi.fn()} />);

    fireEvent.click(await screen.findByRole('button', { name: /Cerrar y Sellar Folio \(SHA-256\)/i }));
    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(/identificador de firma/i), { target: { value: 'rm-1001' } });
    fireEvent.click(within(dialog).getByRole('button', { name: /^Cerrar y Sellar Folio$/i }));

    expect(await within(dialog).findByText(message)).toBeInTheDocument();
    const closeCall = calls.find((c) => c.path === '/clinical-records/rec-1/close');
    expect(closeCall.body.signature_token).toContain('RM-1001');
    expect(screen.queryByText(/Folio Cerrado Inmutable/i)).not.toBeInTheDocument();
  });

  it('exige completar los campos del folio antes de enviarlo al servidor', async () => {
    const { calls } = mockApi({ 'GET /clinical-records/patient/pat-1': { body: [] } });

    render(<HceScreen patient={TEST_PATIENT} onPatientChange={vi.fn()} onNavigate={vi.fn()} />);

    fireEvent.click(await screen.findByRole('button', { name: /Guardar Folio como Borrador/i }));

    expect(await screen.findByText(/Complete los campos obligatorios/i)).toBeInTheDocument();
    expect(calls.some((c) => c.method === 'POST')).toBe(false);
  });
});

describe('PrescriptionScreen - validacion de alergias por el servidor', () => {
  it('abre el modal de alergia con los datos del 422 del servidor', async () => {
    const { calls } = mockApi({
      'GET /clinical-records/patient/pat-1': { body: [buildRecord()] },
      'GET /medications': {
        body: {
          medications: [
            {
              id: 'med-1',
              cum_code: '19934212-01',
              commercial_name: 'Amoxil',
              generic_name: 'Amoxicilina',
              active_ingredient: 'Amoxicilina',
              concentration: '500 mg',
              pharmaceutical_form: 'Capsula',
              stock_quantity: 40,
            },
          ],
          count: 1,
        },
      },
      'POST /prescriptions': {
        status: 422,
        body: {
          error: 'Conflicto de alergia detectado',
          allergy_conflict: true,
          active_ingredient: 'Penicilina',
          severity: 'SEVERA',
          medication: 'Amoxil 500 mg Capsula',
        },
      },
    });

    render(<PrescriptionScreen patient={TEST_PATIENT} onPatientChange={vi.fn()} onNavigate={vi.fn()} />);

    await screen.findByRole('option', { name: /Amoxil/i });
    fireEvent.change(screen.getByLabelText('Medicamento'), { target: { value: 'med-1' } });
    fireEvent.change(screen.getByLabelText(/Dosis prescrita/i), { target: { value: '500 mg' } });
    fireEvent.change(screen.getByLabelText(/Cada cuántas horas/i), { target: { value: '8' } });
    fireEvent.change(screen.getByLabelText(/Duración \(días\)/i), { target: { value: '7' } });
    fireEvent.change(screen.getByLabelText(/Cantidad total/i), { target: { value: '21' } });
    fireEvent.click(screen.getByRole('button', { name: /Agregar Medicamento/i }));

    fireEvent.click(await screen.findByRole('button', { name: /Emitir Prescripción/i }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/Alerta Critica/i)).toBeInTheDocument();
    expect(within(dialog).getByText('Amoxil 500 mg Capsula')).toBeInTheDocument();
    expect(within(dialog).getByText(/Penicilina/i)).toBeInTheDocument();
    expect(within(dialog).getByTestId('allergy-server-message')).toHaveTextContent('Conflicto de alergia detectado');
    expect(within(dialog).queryByRole('button', { name: /Omitir Alerta/i })).not.toBeInTheDocument();

    const prescriptionCall = calls.find((c) => c.method === 'POST' && c.path === '/prescriptions');
    expect(prescriptionCall.body.clinical_record_id).toBe('rec-1');
    expect(prescriptionCall.body.items).toEqual([
      { medication_id: 'med-1', dosage: '500 mg', frequency_hours: 8, duration_days: 7, total_quantity: 21 },
    ]);
    expect(screen.queryByText(/Prescripción emitida correctamente/i)).not.toBeInTheDocument();
  });

  it('no agrega items con datos invalidos y no consulta el endpoint de prescripcion', async () => {
    const { calls } = mockApi({
      'GET /clinical-records/patient/pat-1': { body: [buildRecord()] },
      'GET /medications': { body: { medications: [], count: 0 } },
    });

    render(<PrescriptionScreen patient={TEST_PATIENT} onPatientChange={vi.fn()} onNavigate={vi.fn()} />);

    fireEvent.click(await screen.findByRole('button', { name: /Agregar Medicamento/i }));

    expect(await screen.findByText(/Seleccione un medicamento del catálogo/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Emitir Prescripción/i })).toBeDisabled();
    expect(calls.some((c) => c.method === 'POST')).toBe(false);
  });
});

describe('TriageScreen - nivel Manchester determinado por el servidor', () => {
  const fillVitals = (values) => {
    fireEvent.change(screen.getByLabelText('Presión sistólica'), { target: { value: values.sys } });
    fireEvent.change(screen.getByLabelText('Presión diastólica'), { target: { value: '90' } });
    fireEvent.change(screen.getByLabelText('Frecuencia cardíaca'), { target: { value: '110' } });
    fireEvent.change(screen.getByLabelText('Frecuencia respiratoria'), { target: { value: '22' } });
    fireEvent.change(screen.getByLabelText('Saturación de O2'), { target: { value: '91' } });
    fireEvent.change(screen.getByLabelText('Temperatura'), { target: { value: '38.2' } });
    fireEvent.change(screen.getByLabelText('Escala de Glasgow'), { target: { value: values.glasgow } });
    fireEvent.change(screen.getByLabelText('Motivo de consulta'), { target: { value: 'Dolor toracico' } });
  };

  it('envia los signos vitales sin manchester_level y muestra el nivel que responde el servidor', async () => {
    const { calls } = mockApi({
      'POST /triage': {
        status: 201,
        body: { id: 'tri-1', patient_id: 'pat-1', manchester_level: 'NIVEL_II', status: 'PENDIENTE' },
      },
    });
    const onTriageSaved = vi.fn();

    render(
      <TriageScreen patient={TEST_PATIENT} onPatientChange={vi.fn()} onTriageSaved={onTriageSaved} onNavigate={vi.fn()} />
    );
    fillVitals({ sys: '150', glasgow: '15' });
    fireEvent.click(screen.getByRole('button', { name: /Confirmar Triaje Manchester/i }));

    expect(await screen.findByTestId('triage-server-level')).toHaveTextContent('NIVEL II');
    const triageCall = calls.find((c) => c.method === 'POST' && c.path === '/triage');
    expect(triageCall.body).not.toHaveProperty('manchester_level');
    expect(triageCall.body).toMatchObject({
      patient_id: 'pat-1',
      systolic_bp: 150,
      glasgow_score: 15,
      body_temperature: 38.2,
      reason_for_consultation: 'Dolor toracico',
    });
    expect(onTriageSaved).toHaveBeenCalledWith(expect.objectContaining({ id: 'tri-1' }));
  });

  it('solo envia manchester_level cuando el clinico escala manualmente', async () => {
    const { calls } = mockApi({
      'POST /triage': {
        status: 201,
        body: { id: 'tri-2', patient_id: 'pat-1', manchester_level: 'NIVEL_I', status: 'PENDIENTE' },
      },
    });

    render(<TriageScreen patient={TEST_PATIENT} onPatientChange={vi.fn()} onNavigate={vi.fn()} />);
    fillVitals({ sys: '150', glasgow: '15' });
    fireEvent.change(screen.getByLabelText(/Escalamiento clínico/i), { target: { value: 'NIVEL_I' } });
    fireEvent.click(screen.getByRole('button', { name: /Confirmar Triaje Manchester/i }));

    await screen.findByTestId('triage-server-level');
    expect(calls.find((c) => c.path === '/triage' && c.method === 'POST').body.manchester_level).toBe('NIVEL_I');
  });

  it('rechaza Glasgow fuera de rango sin llamar al servidor', async () => {
    const { calls } = mockApi({});

    render(<TriageScreen patient={TEST_PATIENT} onPatientChange={vi.fn()} onNavigate={vi.fn()} />);
    fillVitals({ sys: '150', glasgow: '2' });
    fireEvent.click(screen.getByRole('button', { name: /Confirmar Triaje Manchester/i }));

    expect(await screen.findByText(/Rango válido: 3 a 15/i)).toBeInTheDocument();
    expect(calls).toHaveLength(0);
  });

  it('muestra el 422 del servidor y no simula el guardado', async () => {
    mockApi({
      'POST /triage': { status: 422, body: { error: 'El nivel solicitado es menos urgente que el calculado' } },
    });

    render(<TriageScreen patient={TEST_PATIENT} onPatientChange={vi.fn()} onNavigate={vi.fn()} />);
    fillVitals({ sys: '150', glasgow: '15' });
    fireEvent.click(screen.getByRole('button', { name: /Confirmar Triaje Manchester/i }));

    await waitFor(() =>
      expect(screen.getByText(/El nivel solicitado es menos urgente que el calculado/i)).toBeInTheDocument()
    );
    expect(screen.queryByTestId('triage-server-level')).not.toBeInTheDocument();
  });
});
