import React, { useCallback, useEffect, useState } from 'react';
import { Server, Users, Building2, Cpu, Activity, CheckCircle2, AlertTriangle } from 'lucide-react';
import { apiClient } from '../../services/api';
import { ErrorBox, PageHeader, RefreshButton, ROLE_LABELS, formatDateTime, formatUptime } from './tiShared';

const AUTO_REFRESH_MS = 30000;

const KpiCard = ({ icon: Icon, label, value, detail, tone = 'indigo' }) => {
  const tones = {
    indigo: 'bg-indigo-50 text-indigo-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    slate: 'bg-slate-100 text-slate-700',
  };
  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-white border border-surface-container-high shadow-xs flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs font-semibold text-on-surface-variant">{label}</p>
        <p className="text-2xl font-black text-on-surface mt-1">{value}</p>
        {detail && <p className="text-[11px] text-outline mt-1">{detail}</p>}
      </div>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${tones[tone]}`}>
        <Icon className="w-5 h-5" />
      </div>
    </div>
  );
};

// Tablero de monitoreo: estado del servidor, cuentas por rol, administradores por sede y actividad reciente.
export const TiMonitorView = ({ onNavigate }) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [latencyMs, setLatencyMs] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const started = performance.now();
      const overview = await apiClient.tiGetOverview();
      setLatencyMs(Math.round(performance.now() - started));
      setData(overview);
      setError('');
    } catch (err) {
      setError(err.message || 'No fue posible consultar el estado del sistema.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, AUTO_REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

  const branches = data?.branches || [];
  const withAdmin = branches.filter((b) => b.admins.length > 0).length;
  const users = data?.users;
  const server = data?.server;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Monitoreo"
        title="Monitoreo del Sistema"
        description={`Se actualiza cada 30 segundos.${data ? ` Última lectura: ${formatDateTime(data.generated_at)}` : ''}`}
        actions={<RefreshButton onClick={load} loading={loading} />}
      />

      {error && <ErrorBox message={error} onRetry={load} />}

      {!data && loading && !error && (
        <div className="p-10 text-center text-sm text-outline">Consultando el estado del sistema...</div>
      )}

      {data && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
            <KpiCard
              icon={Server}
              label="Servidor"
              value={error ? 'Sin respuesta' : 'En línea'}
              detail={`Activo hace ${formatUptime(server?.uptime_seconds)} • ${latencyMs ?? '-'} ms`}
              tone={error ? 'amber' : 'emerald'}
            />
            <KpiCard
              icon={Users}
              label="Cuentas registradas"
              value={users?.total ?? 0}
              detail={`${users?.active ?? 0} activas • ${users?.pending ?? 0} suspendidas o pendientes`}
            />
            <KpiCard
              icon={Building2}
              label="Sedes con administrador"
              value={`${withAdmin} de ${branches.length}`}
              detail={withAdmin < branches.length ? 'Hay sedes sin administrador' : 'Todas las sedes cubiertas'}
              tone={withAdmin < branches.length ? 'amber' : 'emerald'}
            />
            <KpiCard
              icon={Cpu}
              label="Memoria del servidor"
              value={`${(server?.memory_alloc_mb ?? 0).toFixed(1)} MB`}
              detail={`${server?.goroutines ?? 0} procesos internos • ${server?.go_version || ''}`}
              tone="slate"
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {/* Cuentas por rol */}
            <section className="p-4 sm:p-5 rounded-2xl bg-white border border-surface-container-high shadow-xs space-y-3">
              <h2 className="text-sm font-bold text-on-surface">Cuentas por rol</h2>
              <ul className="divide-y divide-surface-container-high">
                {(users?.by_role || []).map((r) => (
                  <li key={r.role_id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                    <span className="font-semibold text-on-surface">{ROLE_LABELS[r.role_id] || r.role_name}</span>
                    <span className="flex items-center gap-2 font-mono">
                      <span className="text-on-surface font-bold">{r.total}</span>
                      <span className="text-emerald-700">{r.active} activas</span>
                      {r.pending > 0 && <span className="text-amber-700">{r.pending} pend.</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            {/* Administradores por sede */}
            <section className="p-4 sm:p-5 rounded-2xl bg-white border border-surface-container-high shadow-xs space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-bold text-on-surface">Administradores por sede</h2>
                <button
                  type="button"
                  onClick={() => onNavigate && onNavigate('admins')}
                  className="text-xs font-semibold text-indigo-700 hover:underline cursor-pointer"
                >
                  Gestionar
                </button>
              </div>
              <ul className="divide-y divide-surface-container-high">
                {branches.map((b) => (
                  <li key={b.name} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                    <span className="font-semibold text-on-surface min-w-0">{b.name}</span>
                    {b.admins.length > 0 ? (
                      <span className="flex items-center gap-1 text-emerald-700 font-semibold whitespace-nowrap">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {b.admins.length} admin.
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-amber-700 font-semibold whitespace-nowrap">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Sin administrador
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          </div>

          {/* Actividad reciente */}
          <section className="p-4 sm:p-5 rounded-2xl bg-white border border-surface-container-high shadow-xs space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-bold text-on-surface flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-600" />
                Actividad reciente
              </h2>
              <button
                type="button"
                onClick={() => onNavigate && onNavigate('audit')}
                className="text-xs font-semibold text-indigo-700 hover:underline cursor-pointer"
              >
                Ver bitácora
              </button>
            </div>
            {data.recent_audit.length === 0 ? (
              <p className="text-xs text-outline">Aún no hay eventos registrados en la bitácora.</p>
            ) : (
              <ul className="divide-y divide-surface-container-high">
                {data.recent_audit.map((log) => (
                  <li key={log.id} className="py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5 sm:gap-3 text-xs">
                    <span className="min-w-0">
                      <strong className="text-on-surface">{log.action}</strong>{' '}
                      <span className="text-on-surface-variant break-all">{log.resource}</span>
                    </span>
                    <span className="text-outline font-mono text-[11px] whitespace-nowrap">
                      {log.role || 'Anónimo'} • {formatDateTime(log.timestamp)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <p className="text-[11px] text-outline font-mono">
            SaludConecta IPS {server?.version} • Base de datos: {server?.db_driver} • En marcha desde{' '}
            {formatDateTime(server?.started_at)}
          </p>
        </>
      )}
    </div>
  );
};

export default TiMonitorView;
