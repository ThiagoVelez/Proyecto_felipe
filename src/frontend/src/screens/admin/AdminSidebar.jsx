import React from 'react';
import PanelSidebar from '../../components/PanelSidebar';
import {
  Users,
  Network,
  Activity,
  Building2,
  Pill,
  FileWarning,
} from 'lucide-react';

export const AdminSidebar = ({
  currentView,
  setCurrentView,
  isCollapsed = false,
  onToggleCollapse,
  pendingCount = 0,
  branchesCount = 4,
  isMobileOpen = false,
  onMobileClose,
}) => {
  const menuItems = [
    {
      id: 'governance',
      label: 'Gobernanza de Personal',
      icon: Users,
      badge: pendingCount > 0 ? `${pendingCount} pend.` : 'ReTHUS',
      badgeColor: pendingCount > 0 ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-surface-container-high text-on-surface',
    },
    {
      id: 'org_chart',
      label: 'Diagrama Administrativo',
      icon: Network,
      badge: 'Jerarquía',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    },
    {
      id: 'pharmacy_dashboard',
      label: 'Dashboard Farmacia',
      icon: Pill,
      badge: 'Monitoreo',
      badgeColor: 'bg-teal-100 text-teal-800 border-teal-300',
    },
    {
      id: 'reports',
      label: 'Reportes',
      icon: FileWarning,
      badge: 'Alertas Stock',
      badgeColor: 'bg-rose-100 text-rose-800 border-rose-300',
    },
    {
      id: 'audit',
      label: 'Auditoría Forense',
      icon: Activity,
      badge: 'ISO 25010',
      badgeColor: 'bg-surface-container-high text-on-surface',
    },
    {
      id: 'branches',
      label: 'Red Asistencial y Sedes',
      icon: Building2,
      badge: `${branchesCount} Sedes`,
      badgeColor: 'bg-surface-container-high text-on-surface',
    },
  ];

  return (
    <PanelSidebar
      items={menuItems}
      currentView={currentView}
      setCurrentView={setCurrentView}
      isCollapsed={isCollapsed}
      onToggleCollapse={onToggleCollapse}
      isMobileOpen={isMobileOpen}
      onMobileClose={onMobileClose}
      eyebrow="GOBERNANZA TI"
      title="Panel Administrativo"
      menuName="menú lateral administrativo"
      footer={{
        title: 'Ley 1581 / Res. 1995',
        text: 'Aislamiento estricto de rol. Sin acceso a datos clínicos asistenciales.',
      }}
    />
  );
};

export default AdminSidebar;
