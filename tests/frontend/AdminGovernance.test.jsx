import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import StaffRegisterModal from '../../src/frontend/src/components/StaffRegisterModal';
import AdminDashboardScreen from '../../src/frontend/src/screens/admin/AdminDashboardScreen';
import UserProfileModal, { MEDICAL_BANNERS } from '../../src/frontend/src/components/UserProfileModal';

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

  it('permite cambiar a la pestaña de Red Asistencial y Sedes con CRUD', async () => {
    render(<AdminDashboardScreen />);

    const branchesTab = screen.getByRole('button', { name: /Red Asistencial y Sedes/i });
    fireEvent.click(branchesTab);

    expect(await screen.findByText(/Sede Cartago - Hospital Central/i)).toBeInTheDocument();
    expect(screen.getByText(/Sede La Unión - Urgencias/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Nueva Sede Asistencial/i })).toBeInTheDocument();
  });

  it('permite cambiar a la pestaña de Catálogo CUM Farmacológico con CRUD', async () => {
    render(<AdminDashboardScreen />);

    const catalogTab = screen.getByRole('button', { name: /Catálogo CUM Farmacológico/i });
    fireEvent.click(catalogTab);

    expect(await screen.findByText(/CUM-199420-1/i)).toBeInTheDocument();
    expect(screen.getByText(/Amoxil 500mg/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Nuevo Medicamento CUM/i })).toBeInTheDocument();
  });
});

describe('UserProfileModal - Perfil Asistencial Tipo Red Social con 5 Banners', () => {
  const mockUser = {
    id: 'usr-med-0002',
    name: 'Dr. Santiago Vélez',
    full_name: 'Dr. Santiago Vélez',
    role: 'MEDICO',
    professional_card: 'RM-94821-VALLE',
    specialty: 'Medicina de Urgencias',
    branch: 'Sede Cartago - Hospital Central (Nivel II)',
  };

  it('renderiza la información del perfil del Dr. Santiago Vélez y los 5 banners', () => {
    render(<UserProfileModal isOpen={true} onClose={() => {}} user={mockUser} />);

    expect(screen.getAllByText(/Dr. Santiago Vélez/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/RM-94821-VALLE/i)).toBeInTheDocument();
    expect(screen.getByText(/ReTHUS Verificado/i)).toBeInTheDocument();

    // Verificamos que la colección tenga exactamente 5 banners médicos
    expect(MEDICAL_BANNERS).toHaveLength(5);
    expect(screen.getByRole('button', { name: /Colección de Banners \(5\)/i })).toBeInTheDocument();
  });

  it('permite alternar entre los banners de áreas médicas como pediatría y farmacia', async () => {
    render(<UserProfileModal isOpen={true} onClose={() => {}} user={mockUser} />);

    const bannersTab = screen.getByRole('button', { name: /Colección de Banners \(5\)/i });
    fireEvent.click(bannersTab);

    expect(await screen.findByText(/Pediatría & Salud Infantil/i)).toBeInTheDocument();
    expect(screen.getByText(/Farmacología & Farmacia Hospitalaria/i)).toBeInTheDocument();
    expect(screen.getByText(/Cirugía & Quirófano Especializado/i)).toBeInTheDocument();
    expect(screen.getByText(/Cardiología & Medicina Interna/i)).toBeInTheDocument();
  });
});
