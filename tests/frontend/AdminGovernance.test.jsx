import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import StaffRegisterModal from '../../src/frontend/src/components/StaffRegisterModal';
import AdminDashboardScreen from '../../src/frontend/src/screens/admin/AdminDashboardScreen';

describe('StaffRegisterModal - Autorregistro y Gobernanza ReTHUS', () => {
  it('renderiza todos los campos obligatorios del registro asistencial', () => {
    render(<StaffRegisterModal isOpen={true} onClose={() => {}} />);
    
    expect(screen.getByText(/Autorregistro de Personal Asistencial/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Ej: RM-94821-VALLE/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/usuario@saludconecta.ips.gov.co/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Enviar Solicitud ReTHUS/i })).toBeInTheDocument();
  });

  it('exige la tarjeta profesional ReTHUS para roles médicos y asistenciales', async () => {
    const { container } = render(<StaffRegisterModal isOpen={true} onClose={() => {}} />);

    // Rellenamos campos basicos excepto la tarjeta profesional
    fireEvent.change(screen.getByPlaceholderText(/Ej: Dr. Santiago Vélez/i), {
      target: { value: 'Dr. Prueba Clínico' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Ej: 1118234567/i), {
      target: { value: '111999888' },
    });
    fireEvent.change(screen.getByPlaceholderText(/usuario@saludconecta.ips.gov.co/i), {
      target: { value: 'prueba@saludconecta.ips.gov.co' },
    });
    fireEvent.change(screen.getByPlaceholderText(/••••••••••••/i), {
      target: { value: 'ClaveSegura2026*' },
    });

    const form = container.querySelector('form');
    fireEvent.submit(form);

    expect(await screen.findByText(/La Tarjeta Profesional o registro ReTHUS es de carácter obligatorio/i)).toBeInTheDocument();
  });
});

describe('AdminDashboardScreen - Panel de Control y Separación RBAC', () => {
  it('muestra las métricas de gobernanza y la lista de personal asistencial', async () => {
    render(<AdminDashboardScreen />);

    expect(screen.getByText(/Gobernanza de Personal \(ReTHUS\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Total Personal/i)).toBeInTheDocument();
    expect(screen.getByText(/Médicos Habilitados/i)).toBeInTheDocument();
    expect(screen.getByText(/Pendientes ReTHUS/i)).toBeInTheDocument();

    // Comprueba la presencia de Dr. Santiago Vélez en la lista
    await waitFor(() => {
      expect(screen.getByText(/Dr. Santiago Vélez/i)).toBeInTheDocument();
    });
  });
});
