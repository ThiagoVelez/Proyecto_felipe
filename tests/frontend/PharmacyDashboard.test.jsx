import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PharmacyDashboard from '../../src/frontend/src/screens/PharmacyDashboard';
import { apiClient } from '../../src/frontend/src/services/api';

describe('PharmacyDashboard - Buzón, Inventario y Lector PDF417', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renderiza la vista de buzón con escáner PDF417 y sin botón redundante de inventario', async () => {
    vi.spyOn(apiClient, 'getPharmacyInbox').mockResolvedValue([
      {
        id: 'rx-01',
        unique_code: 'RX-2026-88123',
        patient_name: 'Marta Gomez',
        patient_document: '1144098231',
        patient_eps: 'Sura',
        coverage_type: 'EPS_PBS_100',
        subtotal_amount: 25200,
        status: 'PENDING',
        created_at: new Date().toISOString(),
        items: [
          {
            medication_name: 'Amoxicilina',
            dosage: '500 mg',
            quantity_prescribed: 21,
          },
        ],
      },
    ]);

    vi.spyOn(apiClient, 'getPharmacyInventory').mockResolvedValue([]);

    render(<PharmacyDashboard user={{ full_name: 'Farmacéutico Turno' }} initialTab="inbox" />);

    expect(screen.getByText('Gestión Farmacéutica y Control de Stock')).toBeInTheDocument();
    expect(screen.getByText('Escanear Cédula del Paciente (PDF417)')).toBeInTheDocument();

    // En el buzón no debe existir el botón de cambiar a inventario
    expect(screen.queryByText('Inventario General por Dosis')).not.toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('RX-2026-88123')).toBeInTheDocument();
      expect(screen.getByText('Marta Gomez')).toBeInTheDocument();
    });
  });

  it('renderiza la vista de inventario con botón de registrar medicamento, acciones de ajustar y eliminar', async () => {
    vi.spyOn(apiClient, 'getPharmacyInbox').mockResolvedValue([]);
    vi.spyOn(apiClient, 'getPharmacyInventory').mockResolvedValue([
      {
        id: 'inv-01',
        code_cum: 'CUM-199214-2',
        generic_name: 'Amoxicilina',
        brand_name: 'Amoxal 500mg',
        dosage: '500 mg',
        presentation: 'Tableta',
        unit_price: 1200,
        stock_quantity: 200,
        min_stock: 20,
        batch_number: 'LOT-AMX-2026B',
        expiry_date: '2028-12-31T00:00:00Z',
      },
      {
        id: 'inv-02',
        code_cum: 'CUM-204112-2',
        generic_name: 'Risperidona',
        brand_name: 'Risperdal 3mg',
        dosage: '3 mg',
        presentation: 'Tableta',
        unit_price: 5800,
        stock_quantity: 95,
        min_stock: 15,
        batch_number: 'LOT-RSP-2026B',
        expiry_date: '2027-06-30T00:00:00Z',
      },
    ]);

    render(<PharmacyDashboard user={{ full_name: 'Farmacéutico Turno' }} initialTab="inventory" />);

    expect(screen.getByText('Gestión Farmacéutica y Control de Stock')).toBeInTheDocument();
    // En inventario el botón superior es Registrar Nuevo Medicamento
    expect(screen.getByText('Registrar Nuevo Medicamento')).toBeInTheDocument();
    // No debe mostrar botón de buzón redundante
    expect(screen.queryByText('Buzón de Recetas')).not.toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Amoxal 500mg')).toBeInTheDocument();
      expect(screen.getByText('Risperdal 3mg')).toBeInTheDocument();
      expect(screen.getByText('CUM-199214-2')).toBeInTheDocument();
    });

    // Validar presencia de botones de acción: Ajustar y Eliminar
    const adjustButtons = screen.getAllByRole('button', { name: /Ajustar/i });
    const deleteButtons = screen.getAllByRole('button', { name: /Eliminar/i });
    expect(adjustButtons.length).toBeGreaterThanOrEqual(2);
    expect(deleteButtons.length).toBeGreaterThanOrEqual(2);

    // Al hacer click en Ajustar debe abrir el modal con los parámetros editables
    fireEvent.click(adjustButtons[0]);
    expect(screen.getByText('Ajustar Parámetros de Medicamento')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Amoxicilina')).toBeInTheDocument();
    expect(screen.getByDisplayValue('500 mg')).toBeInTheDocument();
    expect(screen.getByDisplayValue('CUM-199214-2')).toBeInTheDocument();
  });
});
