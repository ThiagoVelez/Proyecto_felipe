import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DoctorAppointmentsView from '../../src/frontend/src/screens/DoctorAppointmentsView';
import { apiClient } from '../../src/frontend/src/services/api';

describe('DoctorAppointmentsView - Agendamiento y Calendario', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renderiza el calendario mensual y el formulario de agendamiento', async () => {
    vi.spyOn(apiClient, 'getDoctorAppointments').mockResolvedValue([
      {
        id: 'app-01',
        doctor_id: 'doc-01',
        patient_id: 'pat-01',
        patient_name: 'Carlos Ramirez',
        patient_document: '111222333',
        appointment_date: new Date().toISOString(),
        observations: 'Control de rutina',
        status: 'SCHEDULED',
        email_sent: true,
      },
    ]);

    vi.spyOn(apiClient, 'listPatients').mockResolvedValue([
      {
        id: 'pat-01',
        first_name: 'Carlos',
        last_name: 'Ramirez',
        document_number: '111222333',
        email: 'carlos@saludconecta.local',
        eps_name: 'Sura',
      },
    ]);

    render(
      <DoctorAppointmentsView
        user={{ id: 'doc-01', full_name: 'Dr. Santiago Vélez', specialty: 'Medicina General' }}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Agenda y Calendario Médico')).toBeInTheDocument();
    });
    expect(screen.getByText('Agendar Nueva Cita')).toBeInTheDocument();
    expect(screen.getByText('Agendar y Enviar Confirmación por Correo (PDF)')).toBeInTheDocument();
  });
});

