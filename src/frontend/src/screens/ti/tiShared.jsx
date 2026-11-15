import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export const ROLE_LABELS = {
  1: 'Administrador',
  2: 'Médico',
  3: 'Enfermería',
  4: 'Admisión',
  5: 'Auditoría',
  6: 'Farmacia',
  7: 'Laboratorio',
  8: 'Encargado de TI',
};

export const roleLabel = (user) =>
  ROLE_LABELS[Number(user?.role_id)] || user?.role_name || user?.role || 'Sin rol';

export const formatDateTime = (value) => {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
};

export const formatUptime = (seconds) => {
  const s = Math.max(0, Number(seconds) || 0);
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  if (days > 0) return `${days} d ${hours} h`;
  if (hours > 0) return `${hours} h ${minutes} min`;
  return `${minutes} min`;
};

export const StatusPill = ({ active }) => (
  <span
    className={`px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${
      active ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
    }`}
  >
    {active ? 'Activa' : 'Suspendida / Pendiente'}
  </span>
);

export const PageHeader = ({ eyebrow, title, description, actions }) => (
  <div className="p-4 sm:p-6 rounded-2xl bg-white border border-surface-container-high shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
    <div className="min-w-0">
      <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-800 mb-1">
        {eyebrow}
      </span>
      <h1 className="text-xl sm:text-2xl font-bold text-on-surface">{title}</h1>
      {description && <p className="text-xs sm:text-sm text-on-surface-variant mt-0.5">{description}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2 md:shrink-0">{actions}</div>}
  </div>
);

export const RefreshButton = ({ onClick, loading }) => (
  <button
    type="button"
    onClick={onClick}
    className="h-9 px-3.5 rounded-xl border border-surface-container-high bg-white hover:bg-surface-container-low text-xs font-semibold text-on-surface flex items-center gap-1.5 cursor-pointer shadow-2xs"
  >
    <RefreshCw className={`w-3.5 h-3.5 text-outline ${loading ? 'animate-spin' : ''}`} />
    <span>Actualizar</span>
  </button>
);

export const ErrorBox = ({ message, onRetry }) => (
  <div role="alert" className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-sm flex flex-wrap items-center gap-3">
    <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
    <span className="flex-1 min-w-0">{message}</span>
    {onRetry && (
      <button
        type="button"
        onClick={onRetry}
        className="h-8 px-3 rounded-lg bg-white border border-red-300 text-xs font-semibold text-red-800 hover:bg-red-100 cursor-pointer"
      >
        Reintentar
      </button>
    )}
  </div>
);
