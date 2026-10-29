import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Sidebar from '../../src/frontend/src/components/Sidebar';
import Header from '../../src/frontend/src/components/Header';
import ProfileScreen from '../../src/frontend/src/screens/ProfileScreen';

describe('Doctor Clinical Layout & Sidebar', () => {
  it('renderiza el Sidebar asistencial con todos sus iconos y el perfil asistencial sin errores', () => {
    const handleSetView = vi.fn();
    render(<Sidebar currentView="dashboard" setCurrentView={handleSetView} />);

    expect(screen.getByText('Sala de Espera & Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Triaje Manchester')).toBeInTheDocument();
    expect(screen.getByText('Historia Clinica (HCE)')).toBeInTheDocument();
    expect(screen.getByText('Prescripcion & Farmacia')).toBeInTheDocument();
    expect(screen.getByText('Mi Perfil Asistencial')).toBeInTheDocument();
    expect(screen.getByText('Seguridad & MFA')).toBeInTheDocument();

    const profileBtn = screen.getByText('Mi Perfil Asistencial').closest('button');
    fireEvent.click(profileBtn);
    expect(handleSetView).toHaveBeenCalledWith('profile');
  });

  it('renderiza el Header asistencial con datos del Dr. Santiago Vélez', () => {
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
