import React, { useState, useEffect } from 'react';
import {
  Search,
  Wifi,
  WifiOff,
  Clock,
  LogOut,
  ChevronDown,
  ShieldCheck,
  Building2,
  RefreshCw,
  User,
} from 'lucide-react';

export const Header = ({ onLogout, onSearch, currentView, isOffline, setIsOffline, user, onUpdateUser, onNavigate }) => {
  const [docType, setDocType] = useState('CC');
  const [searchQuery, setSearchQuery] = useState('');
  const [sessionSeconds, setSessionSeconds] = useState(14 * 60 + 32);

  const currentUser = user || {
    name: 'Dr. Santiago Vélez',
    role: 'MEDICO',
    license: 'RM-94821-VALLE',
    branch: 'Sede Cartago - Central',
  };
  const isAdmin = currentUser.role === 'ADMIN' || currentUser.role_id === 1;

  // Temporizador de sesion asistencial
  useEffect(() => {
    const timer = setInterval(() => {
      setSessionSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimer = (totalSec) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')} min`;
  };

  const extendSession = () => {
    setSessionSeconds(15 * 60);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (onSearch) onSearch(docType, searchQuery);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md shadow-xs border-b border-surface-container-high">
      <div className="h-20 w-full px-6 lg:px-8 flex items-center justify-between gap-4">
        {/* LOGO & TITULO INSTITUCIONAL */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-primary-container text-white flex items-center justify-center font-bold text-lg shadow-sm">
            SC
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg text-primary tracking-tight leading-none">
                SaludConecta IPS
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-primary-fixed text-on-primary-fixed-variant">
                v2.4 PWA
              </span>
            </div>
            <span className="text-xs text-on-surface-variant font-medium">
              Red Norte del Valle • Modulo Asistencial
            </span>
          </div>
        </div>

        {/* BUSCADOR DE PACIENTES GLOBAL */}
        <form
          onSubmit={handleSearchSubmit}
          className="flex-1 max-w-xl mx-4 hidden md:flex items-center h-11 rounded-xl bg-surface-container-low px-3 shadow-xs border border-outline-variant/40 focus-within:ring-2 focus-within:ring-primary focus-within:border-primary transition-all"
        >
          <Search className="w-5 h-5 text-outline mr-2 shrink-0" />
          <select
            value={docType}
            onChange={(e) => setDocType(e.target.value)}
            className="bg-transparent text-on-surface font-semibold text-xs border-none outline-none pr-2 cursor-pointer focus:ring-0"
          >
            <option value="CC">CC</option>
            <option value="TI">TI</option>
            <option value="CE">CE</option>
            <option value="RC">RC</option>
            <option value="RU">RU</option>
          </select>
          <div className="h-4 w-px bg-outline-variant mx-2"></div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar paciente por documento o nombre... [Atajo: Ctrl + K]"
            className="w-full bg-transparent text-sm text-on-surface placeholder:text-outline outline-none border-none focus:ring-0"
          />
        </form>

        {/* ACCIONES Y PERFIL CLINICO */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Toggle de Conectividad (Online / Offline Rural) */}
          <button
            type="button"
            onClick={() => setIsOffline(!isOffline)}
            title="Alternar entre modo en linea y modo rural desconectado (PWA)"
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-all shadow-xs ${
              isOffline
                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                : 'bg-emerald-50 text-emerald-900 border border-emerald-200 hover:bg-emerald-100'
            }`}
          >
            {isOffline ? (
              <>
                <WifiOff className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                <span>Modo Rural (Offline)</span>
              </>
            ) : (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span>En Linea</span>
                <span className="text-[10px] text-emerald-700 font-mono font-normal">24ms</span>
              </>
            )}
          </button>

          {/* Temporizador de Sesion */}
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-low border border-outline-variant/30 text-xs text-on-surface-variant">
            <Clock className="w-3.5 h-3.5 text-outline" />
            <span className="font-mono">
              Sesion: <strong className="text-red-700 font-semibold">{formatTimer(sessionSeconds)}</strong>
            </span>
            <button
              type="button"
              onClick={extendSession}
              className="text-[11px] font-bold text-primary hover:underline ml-1 cursor-pointer"
            >
              Extender
            </button>
          </div>

          {/* Perfil del Usuario Asistencial o Administrador (Navega a la Pantalla de Perfil) */}
          <button
            type="button"
            onClick={() => onNavigate && onNavigate('profile')}
            className="flex items-center gap-2.5 pl-2 border-l border-surface-container-high hover:opacity-85 transition-opacity cursor-pointer text-left"
            title="Abrir pantalla de perfil asistencial y portadas"
          >
            {currentUser.avatar ? (
              <img
                src={currentUser.avatar}
                alt={currentUser.full_name || 'Perfil'}
                className="w-9 h-9 rounded-full object-cover border-2 border-primary/40 shrink-0"
              />
            ) : (
              <div
                className={`w-9 h-9 rounded-full ${
                  isAdmin
                    ? 'bg-amber-100 text-amber-800 border-amber-300'
                    : 'bg-primary/10 text-primary border-primary/20'
                } border-2 flex items-center justify-center font-bold text-xs shrink-0`}
              >
                {isAdmin
                  ? 'AD'
                  : currentUser.full_name
                  ? currentUser.full_name.slice(0, 2).toUpperCase()
                  : 'SV'}
              </div>
            )}
            <div className="hidden xl:flex flex-col text-left">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-xs text-on-surface">
                  {currentUser.full_name || currentUser.name || (isAdmin ? 'Administrador del Sistema' : 'Dr. Santiago Vélez')}
                </span>
                <span
                  className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                    isAdmin ? 'bg-amber-200 text-amber-900' : 'bg-primary-fixed text-on-primary-fixed-variant'
                  }`}
                >
                  {isAdmin ? 'ADMIN TI' : currentUser.role || 'MEDICO'}
                </span>
              </div>
              <div className="flex items-center gap-1 text-[11px] font-mono text-on-surface-variant">
                <span>
                  {currentUser.professional_card || currentUser.license || (isAdmin ? 'TI-ADMIN-001' : 'RM-94821-VALLE')}
                </span>
                <span>•</span>
                <span>{currentUser.branch ? currentUser.branch.split(' - ')[0] : 'Cartago'}</span>
              </div>
            </div>
          </button>

          {/* Boton Salir Seguro */}
          <button
            type="button"
            onClick={onLogout}
            title="Cierre seguro de sesion asistencial con auditoria SHA-256"
            className="h-9 px-3 rounded-xl flex items-center gap-1.5 text-red-700 hover:bg-red-50 hover:text-red-800 transition-colors cursor-pointer text-xs font-semibold"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Salir</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;

