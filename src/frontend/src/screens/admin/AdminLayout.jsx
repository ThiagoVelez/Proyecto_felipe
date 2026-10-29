import React from 'react';
import {
  ShieldAlert,
  Users,
  Activity,
  Building2,
  Pill,
  LogOut,
  Clock,
  ShieldCheck,
  Server,
} from 'lucide-react';
import AdminDashboardScreen from './AdminDashboardScreen';

export const AdminLayout = ({ user, onLogout }) => {
  return (
    <div className="min-h-screen bg-surface flex flex-col font-sans">
      {/* HEADER EXCLUSIVO ADMINISTRATIVO */}
      <header className="h-16 border-b border-surface-container-high bg-white sticky top-0 z-30 px-4 sm:px-6 flex items-center justify-between shadow-xs">
        {/* Identidad Institucional */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0F172A] to-[#005c55] text-white flex items-center justify-center font-bold text-sm shadow-sm shrink-0">
            SC
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-on-surface">SaludConecta IPS</span>
              <span className="px-2 py-0.2 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold border border-amber-300">
                Gobernanza TI & ReTHUS
              </span>
            </div>
            <p className="text-[11px] text-outline">
              Panel de Control Administrativo • ISO/IEC 25010 & Ley 1581 de 2012
            </p>
          </div>
        </div>

        {/* Acciones y Perfil del Administrador */}
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-container-low border border-outline-variant/30 text-xs text-on-surface-variant">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-semibold text-emerald-800">Servidor Go/Fiber En Línea</span>
          </div>

          {/* Perfil del Administrador */}
          <div className="flex items-center gap-2.5 pl-3 border-l border-surface-container-high">
            <div className="w-9 h-9 rounded-full bg-amber-100 border-2 border-amber-300 text-amber-800 font-bold text-xs flex items-center justify-center shrink-0">
              AD
            </div>
            <div className="hidden sm:flex flex-col text-left">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-xs text-on-surface">Administrador del Sistema</span>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-200 text-amber-900">
                  ADMIN TI
                </span>
              </div>
              <div className="text-[11px] font-mono text-outline">
                TI-ADMIN-001 • Sede Cartago
              </div>
            </div>
          </div>

          {/* Boton Salir */}
          <button
            type="button"
            onClick={onLogout}
            title="Cerrar sesion de administracion"
            className="h-9 px-3 rounded-xl flex items-center gap-1.5 text-red-700 hover:bg-red-50 hover:text-red-800 transition-colors cursor-pointer text-xs font-semibold"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Cerrar Sesión</span>
          </button>
        </div>
      </header>

      {/* CUERPO PRINCIPAL CON AVISO DE AISLAMIENTO RBAC */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-5">
        {/* Banner de Cumplimiento Legal y Separación de Capas */}
        <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/80 flex items-start justify-between gap-3 text-amber-950">
          <div className="flex items-start gap-2.5">
            <ShieldCheck className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="space-y-0.5 text-xs">
              <strong className="font-bold text-amber-900">
                Aislamiento Estricto de Rol Administrativo (Reglas RBAC e ISO/IEC 25010):
              </strong>
              <p className="text-[11px] text-amber-900/90 leading-relaxed">
                El usuario con rol <code>ADMIN</code> dispone de un entorno desacoplado enfocado exclusivamente en gobernanza de personal, auditoría forense inmutable y gestión de sedes. Por mandato de la Ley 1581 de 2012 y la Resolución 1995 de 1999, el Administrador TI no posee acceso a historias clínicas protegidas ni a la consulta asistencial.
              </p>
            </div>
          </div>
        </div>

        {/* Dashboard Administrativo */}
        <AdminDashboardScreen />
      </main>

      {/* FOOTER */}
      <footer className="border-t border-surface-container-high py-3 px-6 text-center text-[11px] text-outline font-mono">
        SaludConecta IPS v2.4 • Red de Salud Norte del Valle • Sistema Certificado bajo Normas ISO/IEC 25010 y MinSalud
      </footer>
    </div>
  );
};

export default AdminLayout;
