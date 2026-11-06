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
    expect(screen.getByText('Kit Informático Médico')).toBeInTheDocument();
    expect(screen.getByText('Prescripcion & Farmacia')).toBeInTheDocument();
    expect(screen.getByText('Seguridad & MFA')).toBeInTheDocument();
    expect(screen.queryByText('Mi Perfil Asistencial')).not.toBeInTheDocument();

    const hceBtn = screen.getByText('Historia Clinica (HCE)').closest('button');
    fireEvent.click(hceBtn);
    expect(handleSetView).toHaveBeenCalledWith('hce');

    const kitBtn = screen.getByText('Kit Informático Médico').closest('button');
    fireEvent.click(kitBtn);
    expect(handleSetView).toHaveBeenCalledWith('medical_kit');
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
    fireEvent.click(screen.getByText('Editar Perfil'));
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

  it('renderiza el Sidebar diferenciado de Gestión Farmacéutica para rol FARMACIA', () => {
    const handleSetView = vi.fn();
    const pharmacistUser = {
      id: 'usr-pharm-01',
      role: 'FARMACIA',
      role_id: 6,
      full_name: 'Farmaseutico Santiago Arcos',
      specialty: 'farmacia',
    };
    render(<Sidebar currentView="pharmacy" setCurrentView={handleSetView} user={pharmacistUser} />);

    expect(screen.getByText('GESTIÓN FARMACÉUTICA')).toBeInTheDocument();
    expect(screen.getByText('Buzón & Dispensación')).toBeInTheDocument();
    expect(screen.getByText('Inventario de Medicamentos')).toBeInTheDocument();
    expect(screen.getByText('Seguimiento de Tratamiento')).toBeInTheDocument();
    expect(screen.getByText('Seguridad & MFA')).toBeInTheDocument();

    expect(screen.queryByText('Agenda & Citas Médicas')).not.toBeInTheDocument();
    expect(screen.queryByText('Triaje Manchester')).not.toBeInTheDocument();
    expect(screen.queryByText('Historia Clinica (HCE)')).not.toBeInTheDocument();

    const invBtn = screen.getByText('Inventario de Medicamentos').closest('button');
    fireEvent.click(invBtn);
    expect(handleSetView).toHaveBeenCalledWith('inventory');
  });

  it('renderiza el Sidebar asistencial para ENFERMERO incluyendo el Kit Informático Médico en modo lectura', () => {
    const handleSetView = vi.fn();
    const nurseUser = {
      id: 'usr-enf-01',
      role: 'ENFERMERO',
      role_id: 3,
      full_name: 'Enf. Elizabeth',
      specialty: 'Enfermera',
    };
    render(<Sidebar currentView="dashboard" setCurrentView={handleSetView} user={nurseUser} />);

    expect(screen.getByText('ENFERMERÍA & CUIDADOS')).toBeInTheDocument();
    expect(screen.getByText('Sala de Espera & Triaje')).toBeInTheDocument();
    expect(screen.getByText('Resumen Clínico Asistencial')).toBeInTheDocument();
    expect(screen.getByText('Kit Informático Médico')).toBeInTheDocument();
    expect(screen.getByText('Lista de Chequeo')).toBeInTheDocument();

    const kitBtn = screen.getByText('Kit Informático Médico').closest('button');
    fireEvent.click(kitBtn);
    expect(handleSetView).toHaveBeenCalledWith('medical_kit');
  });
});
