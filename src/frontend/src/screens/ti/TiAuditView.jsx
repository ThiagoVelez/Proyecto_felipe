import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { apiClient } from '../../services/api';
import { ErrorBox, PageHeader, RefreshButton, formatDateTime } from './tiShared';

// Bitácora de auditoría forense del servidor (últimos 200 eventos), con búsqueda local.
export const TiAuditView = () => {
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setLogs(await apiClient.tiGetAuditLogs(200));
      setError('');
    } catch (err) {
      setError(err.message || 'No fue posible consultar la bitácora.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return logs;
    return logs.filter((log) =>
      [log.action, log.resource, log.role, log.ip_address, log.user_id]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [logs, query]);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="ISO/IEC 27001"
        title="Bitácora de Auditoría"
        description="Eventos registrados por el servidor: accesos, cambios de cuentas y operaciones sobre la API."
        actions={<RefreshButton onClick={load} loading={loading} />}
      />

      {error && <ErrorBox message={error} onRetry={load} />}

      <section className="p-4 sm:p-5 rounded-2xl bg-white border border-surface-container-high shadow-xs space-y-4">
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por acción, recurso, rol o IP..."
            aria-label="Buscar en la bitácora"
            className="w-full h-10 pl-9 pr-3 rounded-xl border border-surface-container-high bg-surface text-xs focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
          <Search className="w-4 h-4 text-outline absolute left-3 top-3" />
        </div>
        <p className="text-[11px] text-outline">
          {filtered.length} de {logs.length} eventos
        </p>
        <ul className="divide-y divide-surface-container-high">
          {filtered.map((log) => (
            <li key={log.id} className="py-2.5 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-0.5 md:gap-4 text-xs">
              <span className="min-w-0">
                <strong className="text-on-surface">{log.action}</strong>{' '}
                <span className="text-on-surface-variant break-all">{log.resource}</span>
              </span>
              <span className="text-outline font-mono text-[11px] md:text-right">
                {log.role || 'Anónimo'} • {log.ip_address || '-'} • {formatDateTime(log.timestamp)}
              </span>
            </li>
          ))}
          {!loading && filtered.length === 0 && (
            <li className="py-8 text-center text-xs text-outline">No hay eventos que coincidan.</li>
          )}
        </ul>
      </section>
    </div>
  );
};

export default TiAuditView;
