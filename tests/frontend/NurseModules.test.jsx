import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import NurseSummaryView from '../../src/frontend/src/screens/NurseSummaryView';
import NurseChecklistView from '../../src/frontend/src/screens/NurseChecklistView';
import { apiClient } from '../../src/frontend/src/services/api';

vi.mock('../../src/frontend/src/services/api', () => ({
  apiClient: {
    listPatients: vi.fn(),
  },
}));

describe('Módulo Asistencial de Enfermería - Resumen Clínico & Lista de Chequeo', () => {
  const mockNurseUser = {
    id: 'usr-enf-0001',
    name: 'Enf. Elizabeth',
    full_name: 'Enf. Elizabeth',
    role: 'ENFERMERO',
    license: 'RM-6632-VALLE',
    specialty: 'Enfermera',
    branch: 'Sede Cartago - Hospital Central (Nivel II)',
  };

  const mockPatients = [
    {
      id: 'pat-001',
      document_type: 'CC',
      document_number: '111222333',
      first_name: 'Carlos',
      last_name: 'Mendoza',
      birth_date: '1985-04-12',
      gender: 'Masculino',
      eps_name: 'Sura',
      blood_type: 'O+',
      allergies: 'Penicilina, Dipirona',
    },
    {
      id: 'pat-002',
      document_type: 'CC',
      document_number: '444555666',
      first_name: 'María',
      last_name: 'Gómez',
      birth_date: '1992-08-25',
      gender: 'Femenino',
      eps_name: 'Nueva EPS',
      blood_type: 'A+',
      allergies: 'Ninguna conocida',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    apiClient.listPatients.mockResolvedValue(mockPatients);
  });

  it('renderiza NurseSummaryView con datos del paciente, diagnóstico y fármacos activos', async () => {
    render(
      <NurseSummaryView
        user={mockNurseUser}
        patient={mockPatients[0]}
        onNavigate={vi.fn()}
        onSelectPatient={vi.fn()}
      />
    );

    // Encabezado
    expect(await screen.findByText(/Resumen Clínico Asistencial \(HCE Básica\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Enf\. Elizabeth/i)).toBeInTheDocument();

    // Datos del paciente
    expect(screen.getAllByText(/Carlos Mendoza/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('111222333')).toBeInTheDocument();
    expect(screen.getByText(/Sura/i)).toBeInTheDocument();

    // Alerta de alergias
    expect(screen.getByText(/Alergias & Contraindicaciones/i)).toBeInTheDocument();
    expect(screen.getByText(/Penicilina, Dipirona/i)).toBeInTheDocument();

    // Botón para ir a lista de chequeo
    expect(screen.getAllByText(/Ir a Lista de Chequeo/i).length).toBeGreaterThanOrEqual(1);
  });

  it('renderiza NurseChecklistView con tareas marcables, estadísticas y notas de evolución', async () => {
    render(
      <NurseChecklistView
        user={mockNurseUser}
        patient={mockPatients[0]}
        onSelectPatient={vi.fn()}
        onNavigate={vi.fn()}
      />
    );

    // Título y paciente
    expect(await screen.findByText(/Lista de Chequeo y Deberes de Enfermería/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Carlos Mendoza/i).length).toBeGreaterThanOrEqual(1);

    // Verificar tareas predeterminadas
    expect(screen.getByText(/Verificar identificación: brazalete/i)).toBeInTheDocument();
    expect(screen.getByText(/Monitoreo horario de signos vitales/i)).toBeInTheDocument();

    // Marcar una tarea
    const dutyContainer = screen.getByText(/Verificar identificación: brazalete/i).closest('div');
    fireEvent.click(dutyContainer);

    // Formulario de deber personalizado
    const customInput = screen.getByPlaceholderText(/Escriba la acción requerida/i);
    fireEvent.change(customInput, { target: { value: 'Curación de herida operatoria con gasa estéril' } });
    fireEvent.click(screen.getByRole('button', { name: /Agregar/i }));

    expect(await screen.findByText(/Curación de herida operatoria con gasa estéril/i)).toBeInTheDocument();

    // Guardar nota de evolución
    const noteInput = screen.getByPlaceholderText(/Describa el estado actual del paciente/i);
    fireEvent.change(noteInput, { target: { value: 'Paciente hemodinámicamente estable, afebril, recibe tratamiento.' } });
    fireEvent.click(screen.getByRole('button', { name: /Guardar Nota de Evolución/i }));

    expect(await screen.findByText(/Paciente hemodinámicamente estable/i)).toBeInTheDocument();
  });
});
