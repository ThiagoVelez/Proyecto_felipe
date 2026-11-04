import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Sidebar from '../../src/frontend/src/components/Sidebar';
import Header from '../../src/frontend/src/components/Header';
import ProfileScreen from '../../src/frontend/src/screens/ProfileScreen';

describe('Doctor Clinical Layout & Sidebar', () => {
  it('renderiza el Sidebar asistencial con sus accesos clinicos directos sin duplicidad de perfil', () => {
    const handleSetView = vi.fn();
    render(<Sidebar currentView="dashboard" setCurrentView={handleSetView} />);

    expect(screen.getByText('Sala de Espera & Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Triaje Manchester')).toBeInTheDocument();
    expect(screen.getByText('Historia Clinica (HCE)')).toBeInTheDocument();
    expect(screen.getByText('Prescripcion & Farmacia')).toBeInTheDocument();
    expect(screen.getByText('Seguridad & MFA')).toBeInTheDocument();
    expect(screen.queryByText('Mi Perfil Asistencial')).not.toBeInTheDocument();

    const hceBtn = screen.getByText('Historia Clinica (HCE)').closest('button');
    fireEvent.click(hceBtn);
    expect(handleSetView).toHaveBeenCalledWith('hce');
  });

  it('renderiza el Header asistencial con datos del Dr. Santiago Vélez y navega al perfil al hacer clic', () => {
    const mockUser = {
      id: 'usr-med-01',
      role: 'MEDICO',
      role_id: 2,
      full_name: 'Dr. Santiago Vélez',
      email: 'svelez@saludconecta.ips.gov.co',
      professional_card: 'RM-94821-VALLE',
      specialty: 'Medicina General y Urgencias',
      branch: 'Sede Cartago - Central',
    };

    const handleNavigate = vi.fn();
    render(
      <Header
        user={mockUser}
        onLogout={vi.fn()}
        currentView="dashboard"
        isOffline={false}
        setIsOffline={vi.fn()}
        onNavigate={handleNavigate}
      />
    );

    expect(screen.getByText('Dr. Santiago Vélez')).toBeInTheDocument();
    expect(screen.getByText('MEDICO')).toBeInTheDocument();
    expect(screen.getByText('RM-94821-VALLE')).toBeInTheDocument();

    const profileTrigger = screen.getByTitle(/Abrir pantalla de perfil asistencial/i);
    fireEvent.click(profileTrigger);
    expect(handleNavigate).toHaveBeenCalledWith('profile');
  });

  it('renderiza ProfileScreen en pantalla completa con los 5 banners medicos', () => {
    const mockUser = {
      id: 'usr-med-01',
      role: 'MEDICO',
      role_id: 2,
      full_name: 'Dr. Santiago Vélez',
      email: 'svelez@saludconecta.ips.gov.co',
      professional_card: 'RM-94821-VALLE',
      specialty: 'Medicina General y Urgencias',
      branch: 'Sede Cartago - Central',
    };

    render(
      <ProfileScreen
        user={mockUser}
        onUpdateUser={vi.fn()}
        onNavigate={vi.fn()}
      />
    );

    expect(screen.getByText('Mi Perfil Asistencial')).toBeInTheDocument();
    expect(screen.getByText(/Cambiar Portada/i)).toBeInTheDocument();
    expect(screen.getAllByText('Dr. Santiago Vélez').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('RM-94821-VALLE').length).toBeGreaterThanOrEqual(1);
  });

  it('permite colapsar y expandir el sidebar mostrando solo iconos en modo colapsado', () => {
    const handleToggle = vi.fn();
    const handleSetView = vi.fn();

    // Render en modo colapsado
    const { rerender } = render(
      <Sidebar
        currentView="dashboard"
        setCurrentView={handleSetView}
        isCollapsed={true}
        onToggleCollapse={handleToggle}
      />
    );

    // En modo colapsado, las etiquetas textuales no se muestran
    expect(screen.queryByText('NAVEGACION CLINICA')).not.toBeInTheDocument();

    // Boton para expandir
    const expandBtn = screen.getByTitle('Expandir menú lateral asistencial');
    expect(expandBtn).toBeInTheDocument();
    fireEvent.click(expandBtn);
    expect(handleToggle).toHaveBeenCalledTimes(1);

    // Rerender en modo expandido
    rerender(
      <Sidebar
        currentView="dashboard"
        setCurrentView={handleSetView}
        isCollapsed={false}
        onToggleCollapse={handleToggle}
      />
    );

    expect(screen.getByText('NAVEGACION CLINICA')).toBeInTheDocument();
    const collapseBtn = screen.getByTitle('Ocultar menú lateral asistencial');
    expect(collapseBtn).toBeInTheDocument();
  });
});
