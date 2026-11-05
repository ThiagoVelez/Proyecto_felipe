import React, { useState } from 'react';
import { LogOut, ShieldCheck, ChevronRight, ChevronLeft } from 'lucide-react';
import BrandLogo from '../../components/BrandLogo';
import AdminDashboardScreen from './AdminDashboardScreen';
import AdminSidebar from './AdminSidebar';
import ProfileScreen from '../ProfileScreen';

export const AdminLayout = ({ user, onLogout, onUpdateUser }) => {
  const [adminView, setAdminView] = useState('governance'); // 'governance' | 'org_chart' | 'audit' | 'branches' | 'profile'
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const currentUser = user || {};
  const displayName = currentUser.full_name || currentUser.name || 'Administrador';
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-surface flex flex-col font-sans">
      {/* HEADER EXCLUSIVO ADMINISTRATIVO */}
      <header className="h-16 border-b border-surface-container-high bg-white fixed top-0 left-0 right-0 z-50 px-4 sm:px-6 flex items-center justify-between shadow-xs">
        {/* Identidad Institucional */}
        <div className="flex items-center gap-3">
          <BrandLogo size="md" />
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
          {/* Perfil del Administrador (Navega a la Pantalla Completa de Perfil) */}
          <button
            type="button"
            onClick={() => setAdminView(adminView === 'profile' ? 'governance' : 'profile')}
            className="flex items-center gap-2.5 pl-3 border-l border-surface-container-high hover:opacity-85 transition-opacity cursor-pointer text-left"
            title="Ver pantalla de perfil de administrador y cambiar banner"
          >
            {currentUser.avatar ? (
              <img
                src={currentUser.avatar}
                alt="Admin"
                className="w-9 h-9 rounded-full object-cover border-2 border-amber-300 shrink-0"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-amber-100 border-2 border-amber-300 text-amber-800 font-bold text-xs flex items-center justify-center shrink-0">
                {initials}
              </div>
            )}
            <div className="hidden sm:flex flex-col text-left">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-xs text-on-surface">
                  {displayName}
                </span>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-200 text-amber-900">
                  ADMIN TI
                </span>
              </div>
              <div className="text-[11px] font-mono text-outline">
                {[currentUser.professional_card, currentUser.branch].filter(Boolean).join(' • ') || 'Sin datos de perfil'}
              </div>
            </div>
          </button>

          {/* Boton Salir */}
          <button
            type="button"
            onClick={onLogout}
            title="Cerrar sesion de administracion"
            aria-label="Cerrar sesión de administración"
            className="h-9 px-3 rounded-xl flex items-center gap-1.5 text-red-700 hover:bg-red-50 hover:text-red-800 transition-colors cursor-pointer text-xs font-semibold"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Cerrar Sesión</span>
          </button>
        </div>
      </header>

      {/* CUERPO PRINCIPAL CON MENÚ LATERAL */}
      <div className="flex flex-1 pt-16">
        {/* MENÚ LATERAL ADMINISTRATIVO */}
        <AdminSidebar
          currentView={adminView}
          setCurrentView={setAdminView}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
        />

        {/* CONTENEDOR CENTRAL */}
        <main
          className={`flex-1 transition-all duration-300 ease-in-out ${
            isSidebarCollapsed ? 'ml-20' : 'ml-64'
          } p-4 sm:p-6 lg:p-8 min-w-0 overflow-y-auto space-y-5`}
        >
          {adminView === 'profile' ? (
            <ProfileScreen
              user={currentUser}
              onUpdateUser={onUpdateUser}
              onNavigate={() => setAdminView('governance')}
            />
          ) : (
            <>
              {/* Banner de Cumplimiento Legal y Separación de Capas */}
              <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/80 flex items-start justify-between gap-3 text-amber-950">
                <div className="flex items-start gap-2.5">
                  <ShieldCheck className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                  <div className="space-y-0.5 text-xs">
                    <strong className="font-bold text-amber-900">
                      Aislamiento Estricto de Rol Administrativo (Reglas RBAC e ISO/IEC 25010):
                    </strong>
                    <p className="text-[11px] text-amber-900/90 leading-relaxed">
                      El usuario con rol <code>ADMIN</code> dispone de un entorno desacoplado enfocado exclusivamente en gobernanza de personal, organigrama institucional, auditoría forense inmutable y gestión de sedes. Por mandato de la Ley 1581 de 2012 y la Resolución 1995 de 1999, el Administrador TI no posee acceso a historias clínicas protegidas ni a la consulta asistencial.
                    </p>
                  </div>
                </div>
              </div>

              {/* Dashboard y Módulos Administrativos */}
              <AdminDashboardScreen
                initialTab={adminView}
                onTabChange={(tab) => setAdminView(tab)}
              />
            </>
          )}
        </main>
      </div>

      {/* FOOTER */}
      <footer className={`border-t border-surface-container-high py-3 px-6 text-center text-[11px] text-outline font-mono transition-all duration-300 ${isSidebarCollapsed ? 'ml-20' : 'ml-64'}`}>
        SaludConecta IPS v2.4 • Red de Salud Norte del Valle • Sistema Certificado bajo Normas ISO/IEC 25010 y MinSalud
      </footer>
    </div>
  );
};

export default AdminLayout;

