import React, { useEffect, useState } from 'react';
import { LogOut, Menu, Gauge, UserCog, Users, ScrollText, ShieldCheck } from 'lucide-react';
import BrandLogo from '../../components/BrandLogo';
import PanelSidebar from '../../components/PanelSidebar';
import { useMobileNav } from '../../hooks/useMobileNav';
import ProfileScreen from '../ProfileScreen';
import SecurityMfaScreen from '../SecurityMfaScreen';
import TiMonitorView from './TiMonitorView';
import TiAdminsView from './TiAdminsView';
import TiUsersView from './TiUsersView';
import TiAuditView from './TiAuditView';

const TI_MENU = [
  { id: 'monitor', label: 'Monitoreo del Sistema', icon: Gauge },
  { id: 'admins', label: 'Administradores por Sede', icon: UserCog },
  { id: 'users', label: 'Cuentas del Sistema', icon: Users },
  { id: 'audit', label: 'Bitácora de Auditoría', icon: ScrollText },
  { id: 'security', label: 'Seguridad & MFA', icon: ShieldCheck },
];
const VALID_VIEWS = new Set([...TI_MENU.map((i) => i.id), 'profile']);

const viewFromHash = () => {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash.replace('#ti-', '').replace('#', '');
  return VALID_VIEWS.has(hash) ? hash : null;
};

// Entorno exclusivo del Encargado de TI: monitoreo del sistema y gobierno de administradores.
// Igual que el entorno administrativo, no tiene acceso a historias clínicas.
export const TiLayout = ({ user, onLogout, onUpdateUser }) => {
  const [view, setView] = useState(() => viewFromHash() || 'monitor');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useMobileNav();
  const currentUser = user || {};
  const displayName = currentUser.full_name || currentUser.name || 'Encargado de TI';
  const initials = displayName.slice(0, 2).toUpperCase();

  // Flechas Atrás / Adelante del navegador entre apartados del panel
  useEffect(() => {
    window.history.replaceState({ tiView: view }, '', `#ti-${view}`);
    const onPop = (event) => setView(event.state?.tiView || viewFromHash() || 'monitor');
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const navigate = (next) => {
    if (next === view) return;
    setView(next);
    window.history.pushState({ tiView: next }, '', `#ti-${next}`);
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col font-sans">
      <header className="h-16 border-b border-surface-container-high bg-white fixed top-0 left-0 right-0 z-50 px-3 sm:px-6 flex items-center justify-between gap-2 shadow-xs">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={() => setIsMobileNavOpen((prev) => !prev)}
            aria-label="Abrir menú de navegación"
            aria-expanded={isMobileNavOpen}
            className="md:hidden p-2 -ml-1 rounded-xl text-on-surface hover:bg-surface-container-low cursor-pointer shrink-0"
          >
            <Menu className="w-5 h-5" />
          </button>
          <BrandLogo size="md" />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-on-surface truncate">SaludConecta IPS</span>
              <span className="hidden sm:inline px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-bold border border-indigo-300">
                Encargado de TI
              </span>
            </div>
            <p className="hidden sm:block text-[11px] text-outline">
              Monitoreo del sistema y gobierno de administradores • Sin acceso a datos clínicos
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            type="button"
            onClick={() => navigate(view === 'profile' ? 'monitor' : 'profile')}
            className="flex items-center gap-2.5 pl-3 border-l border-surface-container-high hover:opacity-85 transition-opacity cursor-pointer text-left"
            title="Ver perfil del Encargado de TI"
          >
            {currentUser.avatar ? (
              <img
                src={currentUser.avatar}
                alt="Perfil TI"
                className="w-9 h-9 rounded-full object-cover border-2 border-indigo-300 shrink-0"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-indigo-100 border-2 border-indigo-300 text-indigo-800 font-bold text-xs flex items-center justify-center shrink-0">
                {initials}
              </div>
            )}
            <div className="hidden sm:flex flex-col text-left">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-xs text-on-surface">{displayName}</span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-200 text-indigo-900">TI</span>
              </div>
              <div className="text-[11px] font-mono text-outline">
                {[currentUser.professional_card, currentUser.branch].filter(Boolean).join(' • ') || 'Sin datos de perfil'}
              </div>
            </div>
          </button>
          <button
            type="button"
            onClick={onLogout}
            aria-label="Cerrar sesión del Encargado de TI"
            className="h-9 px-3 rounded-xl flex items-center gap-1.5 text-red-700 hover:bg-red-50 hover:text-red-800 transition-colors cursor-pointer text-xs font-semibold"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Cerrar Sesión</span>
          </button>
        </div>
      </header>

      <div className="flex flex-1 pt-16">
        <PanelSidebar
          items={TI_MENU}
          currentView={view}
          setCurrentView={navigate}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
          isMobileOpen={isMobileNavOpen}
          onMobileClose={() => setIsMobileNavOpen(false)}
          eyebrow="TECNOLOGÍA (TI)"
          title="Panel del Encargado de TI"
          menuName="menú lateral de TI"
          footer={{
            title: 'Ley 1581 / ISO 27001',
            text: 'Monitoreo y gobierno de cuentas. Sin acceso a historias clínicas.',
          }}
        />

        <main
          className={`flex-1 transition-all duration-300 ease-in-out ${
            isSidebarCollapsed ? 'md:ml-20' : 'md:ml-64'
          } p-3 sm:p-6 lg:p-8 min-w-0 overflow-x-hidden overflow-y-auto space-y-5`}
        >
          {view === 'monitor' && <TiMonitorView onNavigate={navigate} />}
          {view === 'admins' && <TiAdminsView />}
          {view === 'users' && <TiUsersView />}
          {view === 'audit' && <TiAuditView />}
          {view === 'security' && <SecurityMfaScreen user={currentUser} onUpdateUser={onUpdateUser} />}
          {view === 'profile' && (
            <ProfileScreen user={currentUser} onUpdateUser={onUpdateUser} onNavigate={() => navigate('monitor')} />
          )}
        </main>
      </div>
    </div>
  );
};

export default TiLayout;
