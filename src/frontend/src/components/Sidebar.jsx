import React from 'react';
import {
  LayoutDashboard,
  HeartPulse,
  FileText,
  Pill,
  ShieldCheck,
  CheckCircle2,
  Lock,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Package,
} from 'lucide-react';

export const Sidebar = ({
  currentView,
  setCurrentView,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const menuItems = [
    {
      id: 'dashboard',
      label: 'Sala de Espera & Dashboard',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'appointments',
      label: 'Agenda & Citas Médicas',
      icon: Calendar,
      badge: 'Calendario',
    },
    {
      id: 'triage',
      label: 'Triaje Manchester',
      icon: HeartPulse,
      badge: 'En Proceso',
    },
    {
      id: 'hce',
      label: 'Historia Clinica (HCE)',
      icon: FileText,
      badge: 'Inmutable',
    },
    {
      id: 'treatment',
      label: 'Seguimiento de Tratamiento',
      icon: Pill,
      badge: 'Tripartita',
    },
    {
      id: 'prescription',
      label: 'Prescripcion & Farmacia',
      icon: Package,
      badge: 'PDF417',
    },
    {
      id: 'security',
      label: 'Seguridad & MFA',
      icon: ShieldCheck,
      badge: 'Activo',
    },
  ];

  return (
    <aside
      className={`fixed left-0 top-20 bottom-0 bg-white z-40 flex flex-col justify-between py-5 border-r border-surface-container-high shadow-xs transition-all duration-300 ease-in-out ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      <div className={`flex flex-col gap-4 ${isCollapsed ? 'px-2' : 'px-4'}`}>
        {/* ENCABEZADO DE NAVEGACION Y BOTON COLAPSAR / EXPANDIR */}
        {isCollapsed ? (
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={onToggleCollapse}
              title="Expandir menú lateral asistencial"
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
                NAVEGACION CLINICA
              </span>
              <span className="text-xs text-on-surface-variant font-medium">
                Valle del Cauca Norte
              </span>
            </div>
            <button
              type="button"
              onClick={onToggleCollapse}
              title="Ocultar menú lateral asistencial"
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
                  title={`${item.label}${item.badge ? ` (${item.badge})` : ''}`}
                  className={`w-full flex items-center justify-center p-3 rounded-xl transition-all cursor-pointer relative ${
                    isActive
                      ? 'bg-primary-container text-white font-semibold shadow-sm'
                      : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
                  }`}
                >
                  <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-white' : 'text-outline'}`} />
                  {item.badge && (
                    <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white" />
                  )}
                </button>
              );
            }

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setCurrentView(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl transition-all cursor-pointer text-left ${
                  isActive
                    ? 'bg-primary-container text-white font-semibold shadow-sm'
                    : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-white' : 'text-outline'}`} />
                  <span className="text-sm truncate">{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase shrink-0 ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-surface-container-high text-on-surface-variant'
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

      {/* PIE DE SIDEBAR CON GOBERNANZA HOSPITALARIA */}
      <div className={`pt-4 border-t border-surface-container ${isCollapsed ? 'px-2' : 'px-4'}`}>
        {isCollapsed ? (
          <div className="flex flex-col items-center gap-2 text-outline">
            <span className="w-2 h-2 rounded-full bg-emerald-500" title="Sistema Conectado" />
            <Lock className="w-4 h-4 opacity-70" title="Inmutabilidad Res. 1995" />
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-outline font-mono">
              <span>Sede Cartago</span>
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-800">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Online
              </span>
            </div>
            <div className="p-2 rounded-lg bg-surface-container-lowest border border-surface-container text-[11px] text-on-surface-variant flex items-center gap-2">
              <Lock className="w-4 h-4 text-primary shrink-0" />
              <span className="truncate">HCE Inmutable (Res. 1995)</span>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
