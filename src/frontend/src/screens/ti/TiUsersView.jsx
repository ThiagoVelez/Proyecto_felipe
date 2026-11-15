import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { apiClient } from '../../services/api';
import { ErrorBox, PageHeader, RefreshButton, ROLE_LABELS, StatusPill, formatDateTime, roleLabel } from './tiShared';

// Inventario de cuentas del sistema (solo lectura). La habilitación del personal asistencial la hace el
// administrador de cada sede; el Encargado de TI la consulta para dar soporte.
export const TiUsersView = () => {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [role, setRole] = useState('');
  const [state, setState] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setUsers(await apiClient.tiGetUsers());
      setError('');
    } catch (err) {
      setError(err.message || 'No fue posible consultar las cuentas.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((u) => {
      if (role && String(u.role_id) !== role) return false;
      if (state === 'active' && !u.is_active) return false;
      if (state === 'inactive' && u.is_active) return false;
      if (!q) return true;
      return [u.full_name, u.email, u.document_number, u.branch, u.professional_card]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [users, query, role, state]);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Soporte"
        title="Cuentas del Sistema"
        description="Consulta de todas las cuentas registradas, su rol, sede y estado. Solo lectura."
        actions={<RefreshButton onClick={load} loading={loading} />}
      />

      {error && <ErrorBox message={error} onRetry={load} />}

      <section className="p-4 sm:p-5 rounded-2xl bg-white border border-surface-container-high shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nombre, correo, documento o sede..."
              aria-label="Buscar cuentas"
              className="w-full h-10 pl-9 pr-3 rounded-xl border border-surface-container-high bg-surface text-xs focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
            <Search className="w-4 h-4 text-outline absolute left-3 top-3" />
          </div>
          <div className="grid grid-cols-2 gap-2 md:flex">
            <select
              aria-label="Filtrar por rol"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="h-10 px-3 rounded-xl border border-surface-container-high bg-surface text-xs"
            >
              <option value="">Todos los roles</option>
              {Object.entries(ROLE_LABELS).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
            <select
              aria-label="Filtrar por estado"
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="h-10 px-3 rounded-xl border border-surface-container-high bg-surface text-xs"
            >
              <option value="">Todos los estados</option>
              <option value="active">Activas</option>
              <option value="inactive">Suspendidas / pendientes</option>
            </select>
          </div>
        </div>

        <p className="text-[11px] text-outline">
          {filtered.length} de {users.length} cuentas
        </p>

        <ul className="divide-y divide-surface-container-high">
          {filtered.map((u) => (
            <li key={u.id} className="py-3 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-1 md:gap-4 text-xs">
              <div className="min-w-0 space-y-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-sm text-on-surface">{u.full_name}</span>
                  <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-800 text-[10px] font-bold">
                    {roleLabel(u)}
                  </span>
                  <StatusPill active={u.is_active} />
                </div>
                <p className="text-on-surface-variant break-all">{u.email}</p>
                <p className="text-outline">{u.branch || 'Sin sede'}</p>
              </div>
              <p className="text-outline font-mono text-[11px] md:text-right">
                MFA: {u.mfa_enabled ? 'activo' : 'no'} • {formatDateTime(u.created_at)}
              </p>
            </li>
          ))}
          {!loading && filtered.length === 0 && (
            <li className="py-8 text-center text-xs text-outline">No hay cuentas que coincidan con los filtros.</li>
          )}
        </ul>
      </section>
    </div>
  );
};

export default TiUsersView;
