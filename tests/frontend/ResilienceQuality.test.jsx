import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import HceScreen from '../../src/frontend/src/screens/HceScreen';
import { apiClient } from '../../src/frontend/src/services/api';
import { mockApi, TEST_PATIENT, buildRecord } from './helpers/mockApi';

beforeEach(() => {
  apiClient.setAuth('token-resilience-qa', {
    id: 'doc-qa-1',
    full_name: 'Dr. Santiago Velez',
    role: 'MEDICO',
    role_id: 2,
    professional_card: 'RM-94821-VALLE',
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  apiClient.setAuth('', null);
});

describe('Resiliencia y Calidad de Interfaz (ISO/IEC 25010 & Res. 1995/1999)', () => {
  it('gestiona caidas 500 del servidor mostrando alerta accesible y boton de reintento sin pantalla blanca', async () => {
    let attempts = 0;
    mockApi({
      'GET /clinical-records/patient/pat-1': () => {
        attempts++;
        if (attempts === 1) {
          return { status: 500, body: {} };
        }
        return {
          status: 200,
          body: [
            buildRecord({
              id: 'rec-recuperado',
              is_closed: false,
              cie11_code: 'J00',
              anamnesis: 'Paciente estabilizado tras reintento de conexion',
            }),
          ],
        };
      },
    });

    render(<HceScreen patient={TEST_PATIENT} onPatientChange={vi.fn()} onNavigate={vi.fn()} />);

    // 1. Verificacion de alerta accesible sin caida ni pantalla blanca
    const errorMessage = await screen.findByText(/El servicio no está disponible/i);
    expect(errorMessage).toBeInTheDocument();

    // El banner del paciente y la navegacion continuan montados y legibles
    expect(screen.getByText(TEST_PATIENT.full_name)).toBeInTheDocument();

    // 2. Ejecucion del reintento interactivo
    const retryButton = screen.getByRole('button', { name: /Reintentar/i });
    expect(retryButton).toBeInTheDocument();
    fireEvent.click(retryButton);

    // 3. Confirmacion de recuperacion resiliente
    await waitFor(() => {
      expect(attempts).toBeGreaterThanOrEqual(2);
    });
    expect(await screen.findByLabelText(/Motivo de Consulta/i)).toHaveValue(
      'Paciente estabilizado tras reintento de conexion'
    );
  });

  it('bloquea estrictamente la edicion de folios cerrados con atributos disabled y readonly segun Res. 1995/1999', async () => {
    const closedRecord = buildRecord({
      id: 'rec-sellado-sha256',
      is_closed: true,
      cie11_code: 'I10',
      diagnosis_description: 'Hipertensión esencial primaria',
      treatment_plan: 'Control ambulatorio con Losartán 50mg cada 12 horas',
      anamnesis: 'Cefalea occipital recurrente en jornada laboral',
      physical_exam: 'TA 150/95 mmHg, pulsos presentes y simetricos',
      closed_at: '2026-11-03T10:00:00Z',
      hash_sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    });

    mockApi({
      'GET /clinical-records/patient/pat-1': {
        body: [closedRecord],
      },
    });

    render(<HceScreen patient={TEST_PATIENT} onPatientChange={vi.fn()} onNavigate={vi.fn()} />);

    // 1. Verificacion en Tab 1: Anamnesis y Examen Fisico
    const anamnesis = await screen.findByTestId('hce-anamnesis');
    const physicalExam = screen.getByTestId('hce-physical-exam');

    expect(anamnesis).toBeDisabled();
    expect(anamnesis).toHaveAttribute('readonly');
    expect(physicalExam).toBeDisabled();
    expect(physicalExam).toHaveAttribute('readonly');

    // 2. Verificacion en Tab 2: Diagnostico CIE-11
    const diagTab = screen.getByRole('tab', { name: /Diagnóstico CIE-11/i });
    fireEvent.click(diagTab);

    const cie11 = screen.getByTestId('hce-cie11');
    const diagnosis = screen.getByTestId('hce-diagnosis');

    expect(cie11).toBeDisabled();
    expect(cie11).toHaveAttribute('readonly');
    expect(diagnosis).toBeDisabled();
    expect(diagnosis).toHaveAttribute('readonly');
    expect(diagnosis).toHaveValue('Hipertensión esencial primaria');

    // 3. Verificacion en Tab 3: Plan de Tratamiento
    const planTab = screen.getByRole('tab', { name: /Plan de Tratamiento/i });
    fireEvent.click(planTab);

    const plan = screen.getByTestId('hce-plan');
    expect(plan).toBeDisabled();
    expect(plan).toHaveAttribute('readonly');
    expect(plan).toHaveValue('Control ambulatorio con Losartán 50mg cada 12 horas');

    // 4. Verificacion de indicador legal de folio sellado e inmutable
    expect(screen.getByText(/Folio Cerrado Inmutable/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Cerrar y Sellar Folio/i })).not.toBeInTheDocument();
  });
});
