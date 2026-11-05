import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import TreatmentFollowUpView from '../../src/frontend/src/screens/TreatmentFollowUpView';
import { apiClient } from '../../src/frontend/src/services/api';

describe('TreatmentFollowUpView - Prescripción Tripartita', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renderiza la vista de seguimiento, afiliación EPS y selector por concentración', async () => {
    vi.spyOn(apiClient, 'getPharmacyInventory').mockResolvedValue([
      {
        id: 'inv-amox-500',
        code_cum: 'CUM-199214-2',
        generic_name: 'Amoxicilina',
        brand_name: 'Amoxal 500mg',
        dosage: '500 mg',
        presentation: 'Tableta',
        unit_price: 1200,
        stock_quantity: 200,
      },
      {
        id: 'inv-risp-3',
        code_cum: 'CUM-204112-2',
        generic_name: 'Risperidona',
        brand_name: 'Risperdal 3mg',
        dosage: '3 mg',
        presentation: 'Tableta',
        unit_price: 5800,
        stock_quantity: 95,
      },
    ]);

    const mockPatient = {
      id: 'pat-01',
      first_name: 'Ana',
      last_name: 'Gomez',
      document_number: '987654321',
      eps_name: 'Nueva EPS',
      affiliation_type: 'CONTRIBUTIVO',
      email: 'ana@saludconecta.local',
      phone: '3151234567',
    };

    vi.spyOn(apiClient, 'listPatients').mockResolvedValue([mockPatient]);

    render(
      <TreatmentFollowUpView
        user={{ id: 'doc-01', full_name: 'Dr. Santiago Vélez' }}
        patient={mockPatient}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Seguimiento de Tratamiento y Farmacología')).toBeInTheDocument();
      expect(screen.getByText('1. Afiliación en Salud y Datos del Paciente')).toBeInTheDocument();
      expect(screen.getByText('2. Prescripción por Concentración / Dosis en Inventario')).toBeInTheDocument();
      expect(screen.getByText('3. Cobertura en Salud y Liquidación Farmacéutica')).toBeInTheDocument();
      expect(screen.getByText('Nueva EPS')).toBeInTheDocument();
    });
  });
});

