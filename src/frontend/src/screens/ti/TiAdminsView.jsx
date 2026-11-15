import React, { useCallback, useEffect, useState } from 'react';
import { UserPlus, Building2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { apiClient } from '../../services/api';
import AdminRegisterModal from '../../components/AdminRegisterModal';
import { ErrorBox, PageHeader, RefreshButton, StatusPill, formatDateTime } from './tiShared';

const AdminRow = ({ admin, pending, onToggle }) => (
  <li className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
    <div className="min-w-0 text-xs space-y-0.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-bold text-sm text-on-surface">{admin.full_name}</span>
        <StatusPill active={admin.is_active} />
      </div>
      <p className="text-on-surface-variant break-all">{admin.email}</p>
      <p className="text-outline font-mono text-[11px]">Registrado: {formatDateTime(admin.created_at)}</p>
    </div>
    <button
      type="button"
      disabled={pending}
      onClick={() => onToggle(admin)}
      className={`h-9 px-3 rounded-lg text-xs font-semibold cursor-pointer w-full sm:w-auto shrink-0 disabled:opacity-50 ${
        admin.is_active
          ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
          : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
      }`}
    >
      {pending ? 'Guardando...' : admin.is_active ? 'Suspender' : 'Habilitar'}
    </button>
  </li>
);

// Gobierno de administradores: el Encargado de TI ve quién administra cada sede, registra administradores
// adicionales y puede suspender o habilitar sus cuentas.
export const TiAdminsView = () => {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);
  const [pendingId, setPendingId] = useState(null);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await apiClient.tiGetOverview());
      setError('');
    } catch (err) {
      setError(err.message || 'No fue posible consultar los administradores.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleToggle = async (admin) => {
    setPendingId(admin.id);
    setFeedback(null);
    try {
      await apiClient.tiSetAdminStatus(admin.id, !admin.is_active);
      setFeedback({
        type: 'success',
        text: `${admin.full_name} quedó ${admin.is_active ? 'suspendido' : 'habilitado'}.`,
      });
      await load();
    } catch (err) {
      setFeedback({ type: 'error', text: `No se pudo actualizar a ${admin.full_name}: ${err.message}` });
    } finally {
      setPendingId(null);
    }
  };

  const groups = [
    ...(data?.branches || []),
    ...(data?.admins_without_branch?.length
      ? [{ name: 'Sin sede del catálogo', admins: data.admins_without_branch, noBranch: true }]
      : []),
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Gobierno"
        title="Administradores por Sede"
        description="El primer administrador de cada sede se registra desde el inicio de sesión. Los adicionales los registra el Encargado de TI desde aquí."
        actions={
          <>
            <RefreshButton onClick={load} loading={loading} />
            <button
              type="button"
              onClick={() => setIsRegisterOpen(true)}
              className="h-9 px-4 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <UserPlus className="w-4 h-4" />
              <span>Nuevo Administrador</span>
            </button>
          </>
        }
      />

      {feedback && (
        <div
          role={feedback.type === 'error' ? 'alert' : 'status'}
          className={`p-3 rounded-xl text-xs font-medium border ${
            feedback.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          {feedback.text}
        </div>
      )}
      {error && <ErrorBox message={error} onRetry={load} />}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {groups.map((group) => (
          <section
            key={group.name}
            className="p-4 sm:p-5 rounded-2xl bg-white border border-surface-container-high shadow-xs space-y-2"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-bold text-on-surface flex items-center gap-2 min-w-0">
                <Building2 className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>{group.name}</span>
              </h2>
              {group.admins.length > 0 ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-700 whitespace-nowrap">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Sin administrador
                </span>
              )}
            </div>
            {group.admins.length === 0 ? (
              <p className="text-xs text-outline">
                Esta sede todavía puede registrar su administrador desde el inicio de sesión, o puede registrarlo usted
                con "Nuevo Administrador".
              </p>
            ) : (
              <ul className="divide-y divide-surface-container-high">
                {group.admins.map((admin) => (
                  <AdminRow key={admin.id} admin={admin} pending={pendingId === admin.id} onToggle={handleToggle} />
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>

      {isRegisterOpen && (
        <AdminRegisterModal
          isOpen
          mode="admin"
          onClose={() => setIsRegisterOpen(false)}
          onRegisterSuccess={(res) => {
            setFeedback({
              type: 'success',
              text: `Administrador ${res?.user?.full_name || ''} registrado. Entréguele sus credenciales y el código QR de doble factor por un canal seguro.`,
            });
            load();
          }}
        />
      )}
    </div>
  );
};

export default TiAdminsView;
