import React from 'react';
import {
  LayoutDashboard,
  HeartPulse,
  FileText,
  Pill,
  ShieldCheck,
  CheckCircle2,
  Lock,
  UserCheck,
} from 'lucide-react';

export const Sidebar = ({ currentView, setCurrentView }) => {
  const menuItems = [
    {
      id: 'dashboard',
      label: 'Sala de Espera & Dashboard',
      icon: LayoutDashboard,
      badge: null,
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
      id: 'prescription',
      label: 'Prescripcion & Farmacia',
      icon: Pill,
      badge: 'Seguridad',
    },
    {
      id: 'profile',
      label: 'Mi Perfil Asistencial',
      icon: UserCheck,
      badge: 'ReTHUS',
    },
    {
      id: 'security',
      label: 'Seguridad & MFA',
      icon: ShieldCheck,
      badge: 'Activo',
    },
  ];

  return (
    <aside className="fixed left-0 top-20 bottom-0 w-64 bg-white z-40 flex flex-col justify-between py-6 border-r border-surface-container-high shadow-xs">
      <div className="flex flex-col gap-4 px-4">
        {/* ENCABEZADO DE NAVEGACION */}
        <div className="px-2 flex flex-col">
          <span className="text-[10px] font-bold uppercase tracking-wider text-outline font-mono">
            NAVEGACION CLINICA
          </span>
          <span className="text-xs text-on-surface-variant font-medium">
            Valle del Cauca Norte
          </span>
        </div>

        {/* LISTA DE ITEMS */}
        <nav className="flex flex-col gap-1.5">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;

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

      {/* PIE DEL SIDEBAR: WIDGET DE AUDITORIA FORENSE */}
      <div className="px-4 flex flex-col gap-2">
        <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/30 flex flex-col gap-1.5 shadow-xs">
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="text-[10px] font-bold font-mono tracking-wider text-outline uppercase">
              SHA-256 AUDIT LOG
            </span>
            <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
          </div>
          <div className="font-mono text-xs text-on-surface font-semibold truncate">
            #HASH-7a9f...e412
          </div>
          <div className="text-[10px] text-on-surface-variant leading-tight">
            Firma Forense activa bajo Ley 527/1999 y Res. 1995/1999.
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;

