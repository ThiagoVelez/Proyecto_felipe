import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users,
  ShieldCheck,
  Building2,
  Search,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  FileCheck2,
  UserCheck,
  UserX,
  Activity,
  Plus,
  Pencil,
  Trash2,
  X,
  Loader2,
  Network,
  Pill,
  FileWarning,
} from 'lucide-react';
import { apiClient } from '../../services/api';
import { loadBranches, saveBranches } from '../../services/branches';
import StaffRegisterModal from '../../components/StaffRegisterModal';
import AdminOrgChartView from './AdminOrgChartView';
import AdminPharmacyDashboardView from './AdminPharmacyDashboardView';
import PharmacyStockReportsView from '../../components/PharmacyStockReportsView';

const ROLE_NAMES = {
  1: 'ADMIN',
  2: 'MEDICO',
  3: 'ENFERMERO',
  4: 'ADMISION',
  5: 'AUDITOR',
  6: 'FARMACIA',
  7: 'LABORATORIO',
};

const AUDIT_LIMIT = 100;

const formatTimestamp = (value) => {
  if (!value) return 'Sin fecha';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Sin fecha' : date.toLocaleString();
};

// La asignacion de sede del personal es texto libre: se compara sin distinguir mayusculas ni parentesis finales
const normalizeBranch = (value) =>
  (value || '')
    .toLowerCase()
    .replace(/\s*\(.*?\)\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const serializeDetails = (details) => {
  if (details === null || details === undefined || details === '') return '';
  if (typeof details === 'string') return details;
  try {
    return JSON.stringify(details);
  } catch {
    return '';
  }
};

const ErrorPanel = ({ message, onRetry, retrying }) => (
  <div
    role="alert"
    className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs flex items-center justify-between gap-3"
  >
    <div className="flex items-center gap-2">
      <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
      <span>{message}</span>
    </div>
    <button
      type="button"
      onClick={onRetry}
      disabled={retrying}
      className="h-7 px-3 rounded-lg border border-red-300 bg-white hover:bg-red-100 text-red-800 font-semibold text-[11px] flex items-center gap-1 cursor-pointer disabled:opacity-50 shrink-0"
    >
      <RefreshCw className={`w-3 h-3 ${retrying ? 'animate-spin' : ''}`} />
      Reintentar
    </button>
  </div>
);

export const AdminDashboardScreen = ({ initialTab = 'governance', onTabChange }) => {
  const [internalTab, setInternalTab] = useState(initialTab);
  const activeTab = onTabChange ? (initialTab === 'profile' ? 'governance' : initialTab) : internalTab;

  const setActiveTab = (tab) => {
    setInternalTab(tab);
    if (onTabChange) onTabChange(tab);
  };
  const [users, setUsers] = useState([]);
  const [usersStatus, setUsersStatus] = useState('loading'); // 'loading' | 'ready' | 'error'
  const [usersError, setUsersError] = useState('');
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditStatus, setAuditStatus] = useState('loading');
  const [auditError, setAuditError] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error', text, retry? }
  const [pendingUserId, setPendingUserId] = useState(null);

  // Las sedes aun no tienen API: este catalogo solo se guarda en este navegador
  const [branches, setBranches] = useState(loadBranches);

  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isCreateBranchOpen, setIsCreateBranchOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [deletingBranch, setDeletingBranch] = useState(null);

  const fetchUsers = useCallback(async () => {
    setUsersStatus('loading');
    setUsersError('');
    try {
      const data = await apiClient.adminGetUsers();
      setUsers(Array.isArray(data) ? data : []);
      setUsersStatus('ready');
    } catch (err) {
      setUsersError(err.message || 'No fue posible cargar el personal.');
      setUsersStatus('error');
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    setAuditStatus('loading');
    setAuditError('');
    try {
      const logs = await apiClient.adminGetAuditLogs(AUDIT_LIMIT);
      setAuditLogs(Array.isArray(logs) ? logs : []);
      setAuditStatus('ready');
    } catch (err) {
      setAuditError(err.message || 'No fue posible cargar la bitácora de auditoría.');
      setAuditStatus('error');
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchLogs();
  }, [fetchUsers, fetchLogs]);

  useEffect(() => {
    saveBranches(branches);
  }, [branches]);

  useEffect(() => {
    if (feedback?.type !== 'success') return undefined;
    const timer = setTimeout(() => setFeedback(null), 5000);
    return () => clearTimeout(timer);
  }, [feedback]);

  // El estado local solo cambia cuando el servidor confirma la operacion
  const handleToggleStatus = async (user, newStatus) => {
    setPendingUserId(user.id);
    setFeedback(null);
    try {
      const res = await apiClient.adminUpdateUserStatus(user.id, newStatus);
      const confirmed = typeof res?.is_active === 'boolean' ? res.is_active : newStatus;
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, is_active: confirmed } : u)));
      setFeedback({
        type: 'success',
        text: confirmed
          ? `${user.full_name} fue habilitado. El servidor confirmó el cambio.`
          : `El acceso de ${user.full_name} fue suspendido y sus sesiones activas se invalidaron.`,
      });
      fetchLogs();
    } catch (err) {
      setFeedback({
        type: 'error',
        text: `No se pudo ${newStatus ? 'habilitar' : 'suspender'} a ${user.full_name}: ${err.message}`,
        retry: () => handleToggleStatus(user, newStatus),
      });
    } finally {
      setPendingUserId(null);
    }
  };

  const handleRegisterSuccess = () => {
    setFeedback({
      type: 'success',
      text: 'La solicitud de registro fue aceptada por el servidor. La cuenta queda pendiente de aprobación.',
    });
    fetchUsers();
    fetchLogs();
  };

  const handleCreateBranch = (newBranch) => {
    setBranches((prev) => [...prev, { ...newBranch, id: `br-${Date.now()}` }]);
    setIsCreateBranchOpen(false);
    setFeedback({ type: 'success', text: `Sede "${newBranch.name}" agregada al catálogo local de sedes.` });
  };

  const handleUpdateBranch = (updatedBranch) => {
    setBranches((prev) => prev.map((b) => (b.id === updatedBranch.id ? updatedBranch : b)));
    setEditingBranch(null);
    setFeedback({ type: 'success', text: `Sede "${updatedBranch.name}" actualizada en el catálogo local.` });
  };

  const handleDeleteBranch = (branchId) => {
    setBranches((prev) => prev.filter((b) => b.id !== branchId));
    setDeletingBranch(null);
    setFeedback({ type: 'success', text: 'Sede retirada del catálogo local.' });
  };

  const filteredUsers = users.filter((u) => {
    if (filterStatus === 'pending' && u.is_active) return false;
    if (filterStatus === 'active' && !u.is_active) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matches = [u.full_name, u.email, u.professional_card, u.document_number].some((field) =>
        (field || '').toLowerCase().includes(q)
      );
      if (!matches) return false;
    }
    return true;
  });

  const usersReady = usersStatus === 'ready';
  const metric = (value) => (usersReady ? value : '-');
  const totalStaff = users.length;
  const pendingStaff = users.filter((u) => !u.is_active).length;
  const activeDoctors = users.filter((u) => u.is_active && Number(u.role_id) === 2).length;
  const activeNurses = users.filter((u) => u.is_active && Number(u.role_id) === 3).length;

  const staffByBranch = useMemo(
    () =>
      branches.map((b) => {
        const key = normalizeBranch(b.name);
        const assigned = users.filter((u) => {
          const userKey = normalizeBranch(u.branch);
          return userKey && key && (userKey.includes(key) || key.includes(userKey));
        });
        return {
          id: b.id,
          total: assigned.length,
          active: assigned.filter((u) => u.is_active).length,
        };
      }),
    [branches, users]
  );

  const tabClass = (tab) =>
    `flex items-center gap-2 px-3.5 py-2 rounded-lg transition-colors cursor-pointer shrink-0 ${
      activeTab === tab
        ? 'bg-white text-primary shadow-xs font-bold'
        : 'text-on-surface-variant hover:text-on-surface'
    }`;

  return (
    <div className="space-y-5 animate-fade-in">
      {feedback && (
        <div
          role={feedback.type === 'error' ? 'alert' : 'status'}
          className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-between gap-3 shadow-xs ${
            feedback.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-900'
              : 'bg-primary/10 border-primary/20 text-primary'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'error' ? (
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {feedback.retry && (
              <button
                type="button"
                onClick={feedback.retry}
                className="text-[11px] underline cursor-pointer font-bold"
              >
                Reintentar
              </button>
            )}
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="text-[11px] underline cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-white border border-surface-container-high shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-on-surface-variant">Total Personal</span>
            <div className="w-8 h-8 rounded-xl bg-surface-container-high flex items-center justify-center text-on-surface">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-on-surface">{metric(totalStaff)}</div>
          <div className="text-[11px] text-outline font-medium">Cuentas registradas en el servidor</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-surface-container-high shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-on-surface-variant">Médicos Habilitados</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-700">{metric(activeDoctors)}</div>
          <div className="text-[11px] text-emerald-600 font-medium">Cuentas médicas activas</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-surface-container-high shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-on-surface-variant">Enfermería Activa</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-blue-700">{metric(activeNurses)}</div>
          <div className="text-[11px] text-blue-600 font-medium">Cuentas de enfermería activas</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-surface-container-high shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-on-surface-variant">Pendientes ReTHUS</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-700">{metric(pendingStaff)}</div>
          <div className="text-[11px] text-amber-800 font-medium">Requieren habilitación</div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 p-1 bg-surface-container-low rounded-xl border border-outline-variant/30 text-xs font-semibold overflow-x-auto">
        <button type="button" onClick={() => setActiveTab('governance')} className={tabClass('governance')}>
          <Users className="w-4 h-4" />
          <span>Gobernanza de Personal (ReTHUS)</span>
          {usersReady && pendingStaff > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
              {pendingStaff}
            </span>
          )}
        </button>

        <button type="button" onClick={() => setActiveTab('org_chart')} className={tabClass('org_chart')}>
          <Network className="w-4 h-4 text-emerald-600" />
          <span>Diagrama Administrativo</span>
        </button>

        <button type="button" onClick={() => setActiveTab('pharmacy_dashboard')} className={tabClass('pharmacy_dashboard')}>
          <Pill className="w-4 h-4 text-teal-600" />
          <span>Dashboard Farmacia</span>
        </button>

        <button type="button" onClick={() => setActiveTab('reports')} className={tabClass('reports')}>
          <FileWarning className="w-4 h-4 text-rose-600" />
          <span>Reportes & Alertas</span>
        </button>

        <button type="button" onClick={() => setActiveTab('audit')} className={tabClass('audit')}>
          <Activity className="w-4 h-4" />
          <span>Auditoría Forense (ISO 25010 / Ley 1581)</span>
        </button>

        <button type="button" onClick={() => setActiveTab('branches')} className={tabClass('branches')}>
          <Building2 className="w-4 h-4" />
          <span>Red Asistencial y Sedes ({branches.length})</span>
        </button>
      </div>

      {activeTab === 'org_chart' && (
        <AdminOrgChartView users={users} />
      )}

      {activeTab === 'pharmacy_dashboard' && (
        <AdminPharmacyDashboardView />
      )}

      {activeTab === 'reports' && (
        <PharmacyStockReportsView isCopyMode={false} />
      )}

      {activeTab === 'governance' && (
        <div className="bg-white rounded-2xl border border-surface-container-high shadow-xs overflow-hidden">
          <div className="p-4 border-b border-surface-container-high flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                aria-label="Buscar personal"
                placeholder="Buscar por nombre, documento, correo o tarjeta ReTHUS..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-9 pr-3 text-xs rounded-xl bg-surface-container-low border border-outline-variant focus:outline-none focus:ring-1 focus:ring-primary text-on-surface"
              />
              <Search className="w-3.5 h-3.5 text-outline absolute left-3 top-2.5" />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1 bg-surface-container-low p-1 rounded-xl border border-outline-variant/30 text-[11px]">
                <button
                  type="button"
                  onClick={() => setFilterStatus('all')}
                  className={`px-2.5 py-1 rounded-lg font-semibold cursor-pointer ${
                    filterStatus === 'all' ? 'bg-white text-on-surface shadow-xs' : 'text-outline hover:text-on-surface'
                  }`}
                >
                  Todos
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStatus('pending')}
                  className={`px-2.5 py-1 rounded-lg font-semibold cursor-pointer ${
                    filterStatus === 'pending' ? 'bg-amber-100 text-amber-900 shadow-xs' : 'text-outline hover:text-on-surface'
                  }`}
                >
                  Pendientes ({pendingStaff})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStatus('active')}
                  className={`px-2.5 py-1 rounded-lg font-semibold cursor-pointer ${
                    filterStatus === 'active' ? 'bg-emerald-100 text-emerald-900 shadow-xs' : 'text-outline hover:text-on-surface'
                  }`}
                >
                  Habilitados
                </button>
              </div>

              <button
                type="button"
                onClick={fetchUsers}
                title="Actualizar listado desde el servidor"
                className="h-8 px-2.5 rounded-lg border border-outline-variant hover:bg-surface-container-low flex items-center gap-1 text-xs text-on-surface cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${usersStatus === 'loading' ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refrescar</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('org_chart')}
                className="h-8 px-2.5 rounded-lg border border-primary/30 bg-primary/5 hover:bg-primary/10 text-primary font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
              >
                <Network className="w-3.5 h-3.5" />
                <span>Diagrama Jerárquico</span>
              </button>

              <button
                type="button"
                onClick={() => setIsRegisterOpen(true)}
                className="h-8 px-3 rounded-lg bg-primary hover:bg-primary-hover text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nuevo Personal</span>
              </button>
            </div>
          </div>

          {usersStatus === 'error' && (
            <div className="p-4 border-b border-surface-container-high">
              <ErrorPanel message={usersError} onRetry={fetchUsers} retrying={false} />
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-surface-container-low/50 border-b border-surface-container-high text-outline text-[11px] font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Personal Asistencial</th>
                  <th className="py-3 px-4">Rol en IPS</th>
                  <th className="py-3 px-4">Tarjeta ReTHUS</th>
                  <th className="py-3 px-4">Especialidad & Sede</th>
                  <th className="py-3 px-4">Estado Habilitación</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-high">
                {usersStatus === 'loading' ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-outline text-xs">
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Cargando personal desde el servidor...
                      </span>
                    </td>
                  </tr>
                ) : usersStatus === 'error' ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-outline text-xs">
                      No hay datos disponibles: el servidor no respondió el listado de personal.
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-outline text-xs">
                      {users.length === 0
                        ? 'Sin datos: el servidor no tiene personal registrado.'
                        : 'No se encontraron registros de personal con los filtros aplicados.'}
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const isAdm = Number(u.role_id) === 1;
                    const isPending = pendingUserId === u.id;
                    return (
                      <tr key={u.id} className="hover:bg-surface-container-lowest transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                              {u.full_name ? u.full_name.slice(0, 2).toUpperCase() : 'US'}
                            </div>
                            <div>
                              <div className="font-bold text-on-surface">{u.full_name}</div>
                              <div className="text-[11px] text-outline font-mono">
                                {u.document_type || 'CC'} {u.document_number} • {u.email}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              Number(u.role_id) === 1
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : Number(u.role_id) === 2
                                ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                : Number(u.role_id) === 6
                                ? 'bg-teal-100 text-teal-900 border border-teal-300'
                                : Number(u.role_id) === 7
                                ? 'bg-purple-100 text-purple-900 border border-purple-300'
                                : 'bg-blue-100 text-blue-900 border border-blue-300'
                            }`}
                          >
                            {u.role_name || ROLE_NAMES[Number(u.role_id)] || 'SIN ROL'}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1 font-mono font-semibold text-[11px] text-on-surface">
                            <FileCheck2 className="w-3.5 h-3.5 text-primary shrink-0" />
                            <span>{u.professional_card || 'Sin registro'}</span>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="text-on-surface font-medium">{u.specialty || 'Sin especialidad'}</div>
                          <div className="text-[11px] text-outline truncate max-w-[180px]">{u.branch || 'Sin sede asignada'}</div>
                        </td>

                        <td className="py-3 px-4">
                          {u.is_active ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Habilitado</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[10px] font-bold border border-amber-200">
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                              <span>Pendiente Aprobación</span>
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {isAdm ? (
                              <span className="text-[10px] text-outline font-medium px-2">Sistema</span>
                            ) : u.is_active ? (
                              <button
                                type="button"
                                disabled={isPending}
                                onClick={() => handleToggleStatus(u, false)}
                                className="h-7 px-2.5 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 font-semibold text-[11px] transition-colors cursor-pointer inline-flex items-center gap-1 disabled:opacity-50"
                                title="Suspender acceso asistencial"
                              >
                                {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserX className="w-3 h-3" />}
                                <span className="hidden sm:inline">Suspender</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled={isPending}
                                onClick={() => handleToggleStatus(u, true)}
                                className="h-7 px-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-[11px] transition-colors cursor-pointer inline-flex items-center gap-1 shadow-xs disabled:opacity-50"
                                title="Habilitar la cuenta de este profesional"
                              >
                                {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserCheck className="w-3 h-3" />}
                                <span className="hidden sm:inline">Aprobar</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="bg-white rounded-2xl border border-surface-container-high shadow-xs overflow-hidden space-y-4 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-surface-container-high">
            <div>
              <h3 className="text-sm font-bold text-on-surface">Bitácora de Auditoría del Servidor</h3>
              <p className="text-[11px] text-outline">
                Registro de solo lectura emitido por el servidor (últimos {AUDIT_LIMIT} eventos). Ley 1581 de 2012 y Res. 1995 de 1999.
              </p>
            </div>
            <button
              type="button"
              onClick={fetchLogs}
              className="h-8 px-3 rounded-lg border border-outline-variant hover:bg-surface-container-low flex items-center gap-1.5 text-xs text-on-surface cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${auditStatus === 'loading' ? 'animate-spin' : ''}`} />
              <span>Actualizar</span>
            </button>
          </div>

          {auditStatus === 'error' && <ErrorPanel message={auditError} onRetry={fetchLogs} retrying={false} />}

          <div className="space-y-2.5">
            {auditStatus === 'loading' ? (
              <div className="text-center py-8 text-outline text-xs inline-flex w-full items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Cargando bitácora desde el servidor...
              </div>
            ) : auditStatus === 'error' ? (
              <div className="text-center py-8 text-outline text-xs">
                No hay datos disponibles: el servidor no respondió la bitácora.
              </div>
            ) : auditLogs.length === 0 ? (
              <div className="text-center py-8 text-outline text-xs">
                Sin datos: el servidor no registra eventos de auditoría.
              </div>
            ) : (
              auditLogs.map((log) => {
                const details = serializeDetails(log.details);
                return (
                  <div
                    key={log.id}
                    className="p-3.5 rounded-xl bg-surface-container-lowest border border-outline-variant/30 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs hover:border-primary/40 transition-colors"
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary uppercase">
                          {log.action}
                        </span>
                        <span className="font-semibold text-on-surface font-mono break-all">{log.resource}</span>
                        <span className="text-[11px] text-outline">• Rol: {log.role || 'SISTEMA'}</span>
                      </div>
                      {details && (
                        <p className="text-[11px] text-on-surface-variant bg-surface-container-low/80 p-2 rounded-lg font-mono break-all">
                          {details}
                        </p>
                      )}
                      <div className="text-[11px] text-outline font-mono break-all">
                        IP: {log.ip_address || 'No registrada'} | Correlación: {log.correlation_id || 'N/A'} | Usuario: {log.user_id || 'N/A'}
                      </div>
                    </div>

                    <div className="text-[11px] text-outline font-mono shrink-0">
                      {formatTimestamp(log.timestamp)}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {activeTab === 'branches' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-surface-container-high shadow-xs">
            <div>
              <h3 className="text-sm font-bold text-on-surface">Red Asistencial Integrada del Valle del Cauca</h3>
              <p className="text-xs text-on-surface-variant">
                Catálogo de sedes de este navegador (no se sincroniza con el servidor). El personal asignado se calcula con las cuentas reales.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsCreateBranchOpen(true)}
              className="h-9 px-3.5 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Nueva Sede Asistencial</span>
            </button>
          </div>

          {branches.length === 0 ? (
            <div className="p-8 bg-white rounded-2xl border border-surface-container-high text-center text-outline text-xs">
              Sin datos: no hay sedes registradas en el catálogo.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {branches.map((b, index) => {
                const counts = staffByBranch[index];
                return (
                  <div
                    key={b.id}
                    className="p-4 rounded-2xl bg-white border border-surface-container-high shadow-xs space-y-3 hover:border-primary/40 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-primary shrink-0" />
                        <div>
                          <h4 className="font-bold text-sm text-on-surface">{b.name}</h4>
                          <span className="text-[11px] text-outline">{b.municipality}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                          {b.status}
                        </span>
                        <button
                          type="button"
                          onClick={() => setEditingBranch(b)}
                          title="Editar parámetros de la sede"
                          aria-label={`Editar la sede ${b.name}`}
                          className="p-1 rounded-lg border border-outline-variant hover:bg-surface-container-low text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingBranch(b)}
                          title="Retirar sede del catálogo"
                          aria-label={`Retirar la sede ${b.name}`}
                          className="p-1 rounded-lg border border-red-200 hover:bg-red-50 text-red-600 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="text-[11px] font-medium text-primary bg-primary/5 px-2.5 py-1 rounded-lg inline-block">
                      {b.level}
                    </div>

                    <p className="text-xs text-on-surface-variant leading-relaxed">{b.description}</p>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-surface-container-high text-center text-xs">
                      <div>
                        <div className="text-sm font-bold text-primary">{usersReady ? counts.total : '-'}</div>
                        <div className="text-[10px] text-outline">Personal asignado</div>
                      </div>
                      <div>
                        <div className="text-sm font-bold text-emerald-700">{usersReady ? counts.active : '-'}</div>
                        <div className="text-[10px] text-outline">Cuentas activas</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <StaffRegisterModal
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        onRegisterSuccess={handleRegisterSuccess}
        onBranchCreated={(newBranch) => {
          setBranches((prev) => {
            const exists = prev.some((b) => b.id === newBranch.id || b.name === newBranch.name);
            return exists ? prev : [...prev, newBranch];
          });
        }}
      />

      {isCreateBranchOpen && (
        <CreateBranchModal
          isOpen={isCreateBranchOpen}
          onClose={() => setIsCreateBranchOpen(false)}
          onSave={handleCreateBranch}
        />
      )}

      {editingBranch && (
        <EditBranchModal
          isOpen={!!editingBranch}
          branch={editingBranch}
          onClose={() => setEditingBranch(null)}
          onSave={handleUpdateBranch}
        />
      )}

      {deletingBranch && (
        <ConfirmDeleteModal
          isOpen={!!deletingBranch}
          title="Retirar Sede del Catálogo"
          message={`¿Desea retirar la sede "${deletingBranch.name}" del catálogo local? Esta acción solo afecta a este navegador.`}
          onClose={() => setDeletingBranch(null)}
          onConfirm={() => handleDeleteBranch(deletingBranch.id)}
        />
      )}
    </div>
  );
};

// ========================================================
// MODALES DEL CATALOGO LOCAL DE SEDES
// ========================================================

// 5. Modal Crear Sede
const CreateBranchModal = ({ isOpen, onClose, onSave }) => {
  const [name, setName] = useState('');
  const [level, setLevel] = useState('Nivel I • Urgencias');
  const [municipality, setMunicipality] = useState('');
  const [status, setStatus] = useState('Operativo');
  const [description, setDescription] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      name,
      level,
      municipality,
      status,
      description,
    });
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="Ventana de gestión" className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-surface-container-high overflow-hidden">
        <div className="px-5 py-4 bg-primary text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            <h3 className="font-bold text-sm">Añadir Sede a la Red Asistencial</h3>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar ventana" className="p-1 rounded-lg hover:bg-white/20 text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3 text-xs">
          <div>
            <label className="block text-[11px] font-semibold text-outline mb-1">Nombre de la Sede *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Sede Roldanillo - Centro de Atención"
              className="w-full h-8 px-3 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-outline mb-1">Nivel Asistencial</label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="w-full h-8 px-2 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface"
              >
                <option value="Nivel I • Básico">Nivel I • Básico</option>
                <option value="Nivel I • Urgencias">Nivel I • Urgencias</option>
                <option value="Nivel II • Especializado">Nivel II • Especializado</option>
                <option value="Nivel III • Alta Complejidad">Nivel III • Alta Complejidad</option>
                <option value="Ambulatorio • Promoción">Ambulatorio • Promoción</option>
                <option value="PWA Sync • Brigada Móvil">PWA Sync • Brigada Móvil</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-outline mb-1">Municipio *</label>
              <input
                type="text"
                required
                value={municipality}
                onChange={(e) => setMunicipality(e.target.value)}
                placeholder="Roldanillo, Valle del Cauca"
                className="w-full h-8 px-3 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface"
              />
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-outline mb-1">Descripción de Servicios</label>
            <textarea
              rows={2}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Servicios habilitados, cobertura poblacional y horario..."
              className="w-full p-2.5 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface"
            />
          </div>
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-surface-container">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg border border-outline-variant hover:bg-surface-container text-on-surface font-medium cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-white font-bold cursor-pointer shadow-xs"
            >
              Guardar Sede
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// 6. Modal Editar Sede
const EditBranchModal = ({ isOpen, branch, onClose, onSave }) => {
  const [name, setName] = useState(branch.name || '');
  const [level, setLevel] = useState(branch.level || '');
  const [status, setStatus] = useState(branch.status || 'Operativo');
  const [description, setDescription] = useState(branch.description || '');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...branch,
      name,
      level,
      status,
      description,
    });
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="Ventana de gestión" className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-surface-container-high overflow-hidden">
        <div className="px-5 py-4 bg-primary text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Pencil className="w-4 h-4" />
            <h3 className="font-bold text-sm">Editar Parámetros de Sede</h3>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar ventana" className="p-1 rounded-lg hover:bg-white/20 text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3 text-xs">
          <div>
            <label className="block text-[11px] font-semibold text-outline mb-1">Nombre de la Sede</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-8 px-3 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-outline mb-1">Nivel / Clasificación</label>
              <input
                type="text"
                required
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="w-full h-8 px-3 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-outline mb-1">Estado</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full h-8 px-2 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface"
              >
                <option value="Operativo">Operativo</option>
                <option value="En Contingencia">En Contingencia</option>
                <option value="Mantenimiento">Mantenimiento</option>
                <option value="En Espera">En Espera</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-outline mb-1">Descripción</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-2.5 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface"
            />
          </div>
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-surface-container">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg border border-outline-variant hover:bg-surface-container text-on-surface font-medium cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-white font-bold cursor-pointer shadow-xs"
            >
              Guardar Cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// 9. Modal Genérico de Confirmación de Eliminación (DELETE)
const ConfirmDeleteModal = ({ isOpen, title, message, onClose, onConfirm }) => {
  if (!isOpen) return null;

  return (
    <div role="dialog" aria-modal="true" aria-label="Ventana de gestión" className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-red-200 overflow-hidden">
        <div className="p-4 bg-red-50 border-b border-red-100 flex items-center gap-2.5 text-red-900">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
          <h3 className="font-bold text-sm">{title}</h3>
        </div>
        <div className="p-4 text-xs text-on-surface-variant leading-relaxed">
          {message}
        </div>
        <div className="p-3 bg-surface-container-low flex items-center justify-end gap-2 border-t border-surface-container">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg border border-outline-variant hover:bg-white text-on-surface text-xs font-medium cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold cursor-pointer shadow-xs"
          >
            Confirmar Eliminación
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardScreen;
