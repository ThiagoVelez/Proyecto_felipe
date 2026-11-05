import React from 'react';
import {
  Users,
  Network,
  Activity,
  Building2,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Shield,
  FileText,
} from 'lucide-react';

export const AdminSidebar = ({
  currentView,
  setCurrentView,
  isCollapsed = false,
  onToggleCollapse,
  pendingCount = 0,
  branchesCount = 4,
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
    {
      id: 'profile',
      label: 'Mi Perfil Administrativo',
      icon: ShieldCheck,
      badge: 'ADMIN TI',
      badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
    },
  ];

  return (
    <aside
      className={`fixed left-0 top-16 bottom-0 bg-white z-40 flex flex-col justify-between py-5 border-r border-surface-container-high shadow-xs transition-all duration-300 ease-in-out ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      <div className={`flex flex-col gap-4 ${isCollapsed ? 'px-2' : 'px-4'}`}>
        {/* ENCABEZADO DE NAVEGACIÓN Y BOTÓN COLAPSAR / EXPANDIR */}
        {isCollapsed ? (
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={onToggleCollapse}
              title="Expandir menú lateral administrativo"
              className="p-2 rounded-xl bg-surface-container-low hover:bg-surface-container text-primary transition-colors cursor-pointer shadow-2xs"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <div className="w-8 h-px bg-surface-container-high my-0.5" />
          </div>
        ) : (
          <div className="px-2 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-wider text-outline font-mono">
                GOBERNANZA TI
              </span>
              <span className="text-xs text-on-surface-variant font-medium">
                Panel Administrativo
              </span>
            </div>
            <button
              type="button"
              onClick={onToggleCollapse}
              title="Ocultar menú lateral administrativo"
              className="p-1.5 rounded-lg hover:bg-surface-container text-outline hover:text-on-surface transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* LISTA DE ITEMS */}
        <nav className="flex flex-col gap-1.5">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;

            if (isCollapsed) {
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setCurrentView(item.id)}
                  title={`${item.label} (${item.badge})`}
                  className={`w-full flex items-center justify-center p-3 rounded-xl transition-all cursor-pointer relative ${
                    isActive
                      ? 'bg-primary text-white font-semibold shadow-sm'
                      : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
                  }`}
                >
                  <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-white' : 'text-outline'}`} />
                  {item.badge && (
                    <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-amber-400 ring-2 ring-white" />
                  )}
                </button>
              );
            }

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setCurrentView(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs transition-all cursor-pointer ${
                  isActive
                    ? 'bg-primary text-white font-bold shadow-xs'
                    : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface font-semibold'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-outline'}`} />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border shrink-0 ${
                      isActive ? 'bg-white/20 text-white border-white/30' : item.badgeColor
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* PIE DEL MENÚ LATERAL */}
      {!isCollapsed && (
        <div className="px-4 pt-3 border-t border-surface-container-high space-y-1">
          <div className="flex items-center gap-2 text-[11px] text-outline font-medium">
            <Shield className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>Ley 1581 / Res. 1995</span>
          </div>
          <p className="text-[10px] text-outline/80 leading-tight">
            Aislamiento estricto de rol. Sin acceso a datos clínicos asistenciales.
          </p>
        </div>
      )}
    </aside>
  );
};

export default AdminSidebar;

