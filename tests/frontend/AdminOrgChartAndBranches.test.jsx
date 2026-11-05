import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AdminLayout from '../../src/frontend/src/screens/admin/AdminLayout';
import AdminSidebar from '../../src/frontend/src/screens/admin/AdminSidebar';
import AdminOrgChartView from '../../src/frontend/src/screens/admin/AdminOrgChartView';
import StaffRegisterModal from '../../src/frontend/src/components/StaffRegisterModal';
import { INITIAL_BRANCHES } from '../../src/frontend/src/services/branches';

describe('AdminSidebar - Menú Lateral Administrativo', () => {
  it('renderiza todos los accesos administrativos y permite alternar vistas', () => {
    const handleSetView = vi.fn();
    const handleToggleCollapse = vi.fn();

    render(
      <AdminSidebar
        currentView="governance"
        setCurrentView={handleSetView}
        isCollapsed={false}
        onToggleCollapse={handleToggleCollapse}
        pendingCount={2}
      />
    );

    expect(screen.getByText(/Gobernanza de Personal/i)).toBeInTheDocument();
    expect(screen.getByText(/Diagrama Administrativo/i)).toBeInTheDocument();
    expect(screen.getByText(/Auditoría Forense/i)).toBeInTheDocument();
    expect(screen.getByText(/Red Asistencial y Sedes/i)).toBeInTheDocument();
    expect(screen.queryByText(/Mi Perfil Administrativo/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByText(/Diagrama Administrativo/i));
    expect(handleSetView).toHaveBeenCalledWith('org_chart');
  });

  it('permite colapsar el menú lateral mostrando solo iconos y badges', () => {
    const { rerender } = render(
      <AdminSidebar
        currentView="governance"
        setCurrentView={vi.fn()}
        isCollapsed={true}
        onToggleCollapse={vi.fn()}
      />
    );

    expect(screen.getByTitle(/Diagrama Administrativo/i)).toBeInTheDocument();
    expect(screen.queryByText(/GOBERNANZA TI/i)).not.toBeInTheDocument();
  });
});

describe('StaffRegisterModal - Creación Dinámica de Sedes', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('permite registrar una nueva sede cuando no está en el listado', () => {
    const handleBranchCreated = vi.fn();

    render(
      <StaffRegisterModal
        isOpen={true}
        onClose={vi.fn()}
        onBranchCreated={handleBranchCreated}
      />
    );

    // Debe mostrar botón "+ Nueva Sede"
    const newBranchToggle = screen.getByRole('button', { name: /\+ Nueva Sede/i });
    expect(newBranchToggle).toBeInTheDocument();

    fireEvent.click(newBranchToggle);

    // Se despliega el formulario de creación de sede
    expect(screen.getByText(/^Registrar Nueva Sede$/i)).toBeInTheDocument();
    const nameInput = screen.getByPlaceholderText(/Ej: Sede Ansermanuevo - Consulta Externa/i);
    expect(nameInput).toBeInTheDocument();

    fireEvent.change(nameInput, { target: { value: 'Sede Ansermanuevo - Consulta Externa' } });
    fireEvent.click(screen.getByRole('button', { name: /Guardar y Asignar Sede/i }));

    // Se confirma la creación y asignación
    expect(handleBranchCreated).toHaveBeenCalled();
    expect(screen.getByText(/Sede "Sede Ansermanuevo - Consulta Externa" registrada y asignada/i)).toBeInTheDocument();
  });
});

describe('AdminOrgChartView - Árbol Jerárquico Didáctico e Interactivo', () => {
  const mockStaff = [
    {
      id: 'usr-1',
      full_name: 'Dr. Santiago Vélez',
      role: 'MEDICO',
      role_id: 2,
      specialty: 'Medicina de Urgencias',
      branch: 'Sede Cartago - Hospital Central (Nivel II)',
      is_active: true,
      email: 'svelez@saludconecta.ips.gov.co',
      document_number: '1118234567',
      professional_card: 'RM-94821-VALLE',
    },
    {
      id: 'usr-2',
      full_name: 'Enf. Elizabeth',
      role: 'ENFERMERO',
      role_id: 3,
      specialty: 'Enfermera',
      branch: 'Sede Cartago - Hospital Central (Nivel II)',
      is_active: true,
      email: 'elizabeth@saludconecta.ips.gov.co',
      document_number: '12579622',
      professional_card: 'RM-6632-VALLE',
    },
    {
      id: 'usr-3',
      full_name: 'Santiago Arcos',
      role: 'FARMACIA',
      role_id: 6,
      specialty: 'Farmacia Hospitalaria',
      branch: 'Sede Cartago - Hospital Central (Nivel II)',
      is_active: true,
      email: 'arcos@farmacia.com',
      document_number: '125698744',
      professional_card: 'RM-6589-VALLE',
    },
  ];

  it('renderiza la Gerencia General en la cúspide y los departamentos ramificados', () => {
    render(<AdminOrgChartView users={mockStaff} />);

    // Cúspide
    expect(screen.getByText(/Dr\. Felipe Gutiérrez Isaza/i)).toBeInTheDocument();
    expect(screen.getByText(/ALTA DIRECCIÓN/i)).toBeInTheDocument();

    // Departamentos
    expect(screen.getByText(/Jefatura de Consulta Externa & Urgencias/i)).toBeInTheDocument();
    expect(screen.getByText(/Dirección Técnica Farmacéutica/i)).toBeInTheDocument();
    expect(screen.getByText(/Coordinación Asistencial de Enfermería/i)).toBeInTheDocument();

    // Personal asignado bajo sus ramas
    expect(screen.getByText(/Dr\. Santiago Vélez/i)).toBeInTheDocument();
    expect(screen.getByText(/Enf\. Elizabeth/i)).toBeInTheDocument();
    expect(screen.getByText(/Santiago Arcos/i)).toBeInTheDocument();
  });

  it('abre el modal de detalles con información completa al hacer clic en un perfil', () => {
    render(<AdminOrgChartView users={mockStaff} />);

    const personCard = screen.getByText(/Dr\. Santiago Vélez/i).closest('.interactive-card');
    fireEvent.click(personCard);

    // Modal de detalles
    expect(screen.getByText(/Ficha de Personal Institucional/i)).toBeInTheDocument();
    expect(screen.getByText(/svelez@saludconecta\.ips\.gov\.co/i)).toBeInTheDocument();
    expect(screen.getAllByText(/RM-94821-VALLE/i).length).toBeGreaterThanOrEqual(1);

    // Botón cerrar
    fireEvent.click(screen.getByRole('button', { name: /Cerrar Detalle/i }));
    expect(screen.queryByText(/Ficha de Personal Institucional/i)).not.toBeInTheDocument();
  });

  it('dispone de controles didácticos de zoom y reset', () => {
    render(<AdminOrgChartView users={mockStaff} />);

    expect(screen.getByTitle(/Aumentar Zoom/i)).toBeInTheDocument();
    expect(screen.getByTitle(/Reducir Zoom/i)).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();

    fireEvent.click(screen.getByTitle(/Aumentar Zoom/i));
    expect(screen.getByText('110%')).toBeInTheDocument();

    fireEvent.click(screen.getByTitle(/Restablecer posición/i));
    expect(screen.getByText('100%')).toBeInTheDocument();
  });
});
