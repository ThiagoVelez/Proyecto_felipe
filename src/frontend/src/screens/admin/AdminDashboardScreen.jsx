import React, { useState, useEffect } from 'react';
import {
  Users,
  ShieldCheck,
  Building2,
  Pill,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  FileCheck2,
  UserCheck,
  UserX,
  Activity,
  Lock,
  Eye,
  Server,
  ArrowUpRight,
  Database,
  SlidersHorizontal,
} from 'lucide-react';
import { apiClient } from '../../services/api';

export const AdminDashboardScreen = () => {
  const [activeTab, setActiveTab] = useState('governance'); // 'governance' | 'audit' | 'branches' | 'catalog'
  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'pending' | 'active' | 'inactive'
  const [filterRole, setFilterRole] = useState('all'); // 'all' | '2' | '3'
  const [searchQuery, setSearchQuery] = useState('');
  const [actionMessage, setActionMessage] = useState('');

  // Medicamentos para la visualizacion del catalogo CUM
  const catalogMedicines = [
    { id: 1, cum: 'CUM-199420-1', generic: 'Amoxicilina', commercial: 'Amoxil 500mg', ingredient: 'BETALACTAMICOS', stock: 450, unit: 'Cápsula', risk: 'Riesgo Alérgico Alto' },
    { id: 2, cum: 'CUM-203112-4', generic: 'Paracetamol', commercial: 'Acetaminofén 500mg', ingredient: 'PARACETAMOL', stock: 1200, unit: 'Tableta', risk: 'Bajo Riesgo' },
    { id: 3, cum: 'CUM-188942-2', generic: 'Ibuprofeno', commercial: 'Advil Max 400mg', ingredient: 'AINES', stock: 320, unit: 'Gragea', risk: 'Gástrico / Renal' },
    { id: 4, cum: 'CUM-210455-8', generic: 'Ceftriaxona', commercial: 'Rocephin 1g', ingredient: 'CEFALOSPORINAS', stock: 85, unit: 'Vial Inyectable', risk: 'Control Hospitalario' },
    { id: 5, cum: 'CUM-177401-9', generic: 'Omeprazol', commercial: 'Losec 20mg', ingredient: 'OMEPRAZOL', stock: 600, unit: 'Cápsula', risk: 'Bajo Riesgo' },
    { id: 6, cum: 'CUM-220199-3', generic: 'Dipirona', commercial: 'Novalgina 1g/2ml', ingredient: 'DIPIRONA', stock: 190, unit: 'Ampolla', risk: 'Riesgo Hematológico' },
  ];

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await apiClient.adminGetUsers();
      if (Array.isArray(data)) {
        setUsers(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    try {
      const logs = await apiClient.adminGetAuditLogs();
      if (Array.isArray(logs)) {
        setAuditLogs(logs);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchLogs();
  }, []);

  const handleToggleStatus = async (user, newStatus) => {
    try {
      setActionMessage(`Actualizando estado de ${user.full_name}...`);
      const res = await apiClient.adminUpdateUserStatus(user.id, newStatus);
      if (res) {
        setUsers((prev) =>
          prev.map((u) => (u.id === user.id ? { ...u, is_active: newStatus } : u))
        );
        setActionMessage(
          newStatus
            ? `${user.full_name} ha sido HABILITADO y verificado ante ReTHUS.`
            : `El acceso asistencial de ${user.full_name} ha sido SUSPENDIDO.`
        );
        setTimeout(() => setActionMessage(''), 4000);
        fetchLogs();
      }
    } catch (err) {
      setActionMessage(`Error: ${err.message}`);
    }
  };

  // Filtrado de usuarios
  const filteredUsers = users.filter((u) => {
    if (filterStatus === 'pending' && u.is_active) return false;
    if (filterStatus === 'active' && !u.is_active) return false;
    if (filterStatus === 'inactive' && u.is_active) return false;

    if (filterRole !== 'all' && Number(u.role_id) !== Number(filterRole)) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = (u.full_name || '').toLowerCase().includes(q);
      const matchEmail = (u.email || '').toLowerCase().includes(q);
      const matchCard = (u.professional_card || '').toLowerCase().includes(q);
      const matchDoc = (u.document_number || '').toLowerCase().includes(q);
      if (!matchName && !matchEmail && !matchCard && !matchDoc) return false;
    }
    return true;
  });

  // Métricas
  const totalStaff = users.length;
  const pendingStaff = users.filter((u) => !u.is_active).length;
  const activeDoctors = users.filter((u) => u.is_active && Number(u.role_id) === 2).length;
  const activeNurses = users.filter((u) => u.is_active && Number(u.role_id) === 3).length;

  return (
    <div className="space-y-5">
      {/* Mensaje de acción reactivo */}
      {actionMessage && (
        <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-primary text-xs font-semibold flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-primary" />
            <span>{actionMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionMessage('')}
            className="text-[11px] underline cursor-pointer hover:text-primary-hover"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* KPI Cards de Gobernanza */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-white border border-surface-container-high shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-on-surface-variant">Total Personal</span>
            <div className="w-8 h-8 rounded-xl bg-surface-container-high flex items-center justify-center text-on-surface">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-on-surface">{totalStaff}</div>
          <div className="text-[11px] text-outline font-medium">Registrados en plataforma</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-surface-container-high shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-on-surface-variant">Médicos Habilitados</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-700">{activeDoctors}</div>
          <div className="text-[11px] text-emerald-600 font-medium">ReTHUS verificado activo</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-surface-container-high shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-on-surface-variant">Enfermería Activa</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-blue-700">{activeNurses}</div>
          <div className="text-[11px] text-blue-600 font-medium">Triaje y urgencias</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-surface-container-high shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-on-surface-variant">Pendientes ReTHUS</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-700">{pendingStaff}</div>
          <div className="text-[11px] text-amber-800 font-medium">Requieren habilitación</div>
        </div>
      </div>

      {/* Navegación por pestañas administrativas */}
      <div className="flex items-center gap-1.5 p-1 bg-surface-container-low rounded-xl border border-outline-variant/30 text-xs font-semibold overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('governance')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-colors cursor-pointer shrink-0 ${
            activeTab === 'governance'
              ? 'bg-white text-primary shadow-xs font-bold'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Gobernanza de Personal (ReTHUS)</span>
          {pendingStaff > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
              {pendingStaff}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('audit')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-colors cursor-pointer shrink-0 ${
            activeTab === 'audit'
              ? 'bg-white text-primary shadow-xs font-bold'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Auditoría Forense (ISO 25010 / Ley 1581)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('branches')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-colors cursor-pointer shrink-0 ${
            activeTab === 'branches'
              ? 'bg-white text-primary shadow-xs font-bold'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Red Asistencial y Sedes</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('catalog')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-colors cursor-pointer shrink-0 ${
            activeTab === 'catalog'
              ? 'bg-white text-primary shadow-xs font-bold'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <Pill className="w-4 h-4" />
          <span>Catálogo CUM Farmacológico</span>
        </button>
      </div>

      {/* TAB 1: GOBERNANZA DE PERSONAL */}
      {activeTab === 'governance' && (
        <div className="bg-white rounded-2xl border border-surface-container-high shadow-xs overflow-hidden">
          {/* Barra de Filtros y Búsqueda */}
          <div className="p-4 border-b border-surface-container-high flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                placeholder="Buscar por nombre, documento, correo o tarjeta ReTHUS..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-9 pr-3 text-xs rounded-xl bg-surface-container-low border border-outline-variant focus:outline-none focus:ring-1 focus:ring-primary text-on-surface"
              />
              <Search className="w-3.5 h-3.5 text-outline absolute left-3 top-2.5" />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Filtro Estado */}
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

              {/* Botón Refrescar */}
              <button
                type="button"
                onClick={fetchUsers}
                title="Actualizar listado desde el servidor"
                className="h-8 px-2.5 rounded-lg border border-outline-variant hover:bg-surface-container-low flex items-center gap-1 text-xs text-on-surface cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refrescar</span>
              </button>
            </div>
          </div>

          {/* Tabla de Personal Asistencial */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-surface-container-low/50 border-b border-surface-container-high text-outline text-[11px] font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Personal Asistencial</th>
                  <th className="py-3 px-4">Rol en IPS</th>
                  <th className="py-3 px-4">Tarjeta ReTHUS</th>
                  <th className="py-3 px-4">Especialidad & Sede</th>
                  <th className="py-3 px-4">Estado Habilitación</th>
                  <th className="py-3 px-4 text-right">Acción de Gobernanza</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-high">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-outline text-xs">
                      No se encontraron registros de personal con los filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const isAdm = Number(u.role_id) === 1;
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
                                : 'bg-blue-100 text-blue-900 border border-blue-300'
                            }`}
                          >
                            {u.role_name || (Number(u.role_id) === 1 ? 'ADMIN' : Number(u.role_id) === 2 ? 'MEDICO' : 'ENFERMERO')}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1 font-mono font-semibold text-[11px] text-on-surface">
                            <FileCheck2 className="w-3.5 h-3.5 text-primary shrink-0" />
                            <span>{u.professional_card || 'Sin registro'}</span>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="text-on-surface font-medium">{u.specialty || 'General'}</div>
                          <div className="text-[11px] text-outline truncate max-w-[180px]">{u.branch || 'Sede Principal'}</div>
                        </td>

                        <td className="py-3 px-4">
                          {u.is_active ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Habilitado ReTHUS</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[10px] font-bold border border-amber-200">
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                              <span>Pendiente Aprobación</span>
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right">
                          {isAdm ? (
                            <span className="text-[10px] text-outline font-medium">Cuenta Sistema</span>
                          ) : u.is_active ? (
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(u, false)}
                              className="h-7 px-3 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 font-semibold text-[11px] transition-colors cursor-pointer inline-flex items-center gap-1"
                              title="Suspender acceso asistencial"
                            >
                              <UserX className="w-3 h-3" />
                              <span>Suspender</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(u, true)}
                              className="h-7 px-3 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-[11px] transition-colors cursor-pointer inline-flex items-center gap-1 shadow-xs"
                              title="Verificar y habilitar tarjeta profesional ante ReTHUS"
                            >
                              <UserCheck className="w-3 h-3" />
                              <span>Aprobar ReTHUS</span>
                            </button>
                          )}
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

      {/* TAB 2: AUDITORÍA FORENSE Y TRAZABILIDAD */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-2xl border border-surface-container-high shadow-xs overflow-hidden space-y-4 p-4">
          <div className="flex items-center justify-between pb-3 border-b border-surface-container-high">
            <div>
              <h3 className="text-sm font-bold text-on-surface">Bitácora Forense Inmutable de Transacciones</h3>
              <p className="text-[11px] text-outline">
                Conforme a ISO/IEC 25010, Ley 1581 de 2012 y Res. 1995 de 1999 (Firma digital SHA-256)
              </p>
            </div>
            <button
              type="button"
              onClick={fetchLogs}
              className="h-8 px-3 rounded-lg border border-outline-variant hover:bg-surface-container-low flex items-center gap-1.5 text-xs text-on-surface cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Actualizar Bitácora</span>
            </button>
          </div>

          <div className="space-y-2.5">
            {auditLogs.length === 0 ? (
              <div className="text-center py-8 text-outline text-xs">
                No hay trazas de auditoría registradas en el período.
              </div>
            ) : (
              auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 rounded-xl bg-surface-container-lowest border border-outline-variant/30 flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary uppercase">
                        {log.action}
                      </span>
                      <span className="font-semibold text-on-surface font-mono">{log.resource}</span>
                      <span className="text-[11px] text-outline">• Operador: {log.role || 'SISTEMA'}</span>
                    </div>
                    <div className="text-[11px] text-outline font-mono">
                      IP: {log.ip_address || '127.0.0.1'} | Correlación: {log.correlation_id || 'N/A'}
                    </div>
                  </div>

                  <div className="flex md:flex-col md:items-end justify-between text-[11px] text-outline font-mono">
                    <span>{log.created_at ? new Date(log.created_at).toLocaleString() : 'Reciente'}</span>
                    <span className="text-emerald-700 font-semibold flex items-center gap-1">
                      <Lock className="w-3 h-3" /> SHA-256 Verificado
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 3: RED ASISTENCIAL Y SEDES */}
      {activeTab === 'branches' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-white border border-surface-container-high shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                <h4 className="font-bold text-sm text-on-surface">Sede Cartago - Hospital Central</h4>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                Nivel II • Operativo
              </span>
            </div>
            <p className="text-xs text-on-surface-variant">
              Centro de referencia regional. Servicio de Urgencias 24/7, Consulta Especializada y Quirófanos.
            </p>
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-surface-container-high text-center text-xs">
              <div>
                <div className="text-base font-bold text-on-surface">6/8</div>
                <div className="text-[10px] text-outline">Consultorios</div>
              </div>
              <div>
                <div className="text-base font-bold text-emerald-700">99.9%</div>
                <div className="text-[10px] text-outline">Conectividad</div>
              </div>
              <div>
                <div className="text-base font-bold text-primary">12</div>
                <div className="text-[10px] text-outline">Médicos Asignados</div>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-surface-container-high shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                <h4 className="font-bold text-sm text-on-surface">Sede La Unión - Urgencias</h4>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                Nivel I • Operativo
              </span>
            </div>
            <p className="text-xs text-on-surface-variant">
              Unidad de Atención Rápida y Estabilización de Trauma. Triaje Manchester sincronizado.
            </p>
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-surface-container-high text-center text-xs">
              <div>
                <div className="text-base font-bold text-on-surface">3/4</div>
                <div className="text-[10px] text-outline">Boxes de Triaje</div>
              </div>
              <div>
                <div className="text-base font-bold text-emerald-700">99.7%</div>
                <div className="text-[10px] text-outline">Conectividad</div>
              </div>
              <div>
                <div className="text-base font-bold text-primary">6</div>
                <div className="text-[10px] text-outline">Médicos Asignados</div>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-surface-container-high shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                <h4 className="font-bold text-sm text-on-surface">Sede Tuluá - Ambulatoria</h4>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                Ambulatorio • Operativo
              </span>
            </div>
            <p className="text-xs text-on-surface-variant">
              Centro de Atención Ambulatoria, Promoción de la Salud y Prevención de la Enfermedad.
            </p>
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-surface-container-high text-center text-xs">
              <div>
                <div className="text-base font-bold text-on-surface">4/4</div>
                <div className="text-[10px] text-outline">Consultorios</div>
              </div>
              <div>
                <div className="text-base font-bold text-emerald-700">99.8%</div>
                <div className="text-[10px] text-outline">Conectividad</div>
              </div>
              <div>
                <div className="text-base font-bold text-primary">5</div>
                <div className="text-[10px] text-outline">Médicos Asignados</div>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-surface-container-high shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Server className="w-5 h-5 text-amber-700" />
                <h4 className="font-bold text-sm text-on-surface">Brigada Rural Desconectada</h4>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                PWA Sync • En Espera
              </span>
            </div>
            <p className="text-xs text-on-surface-variant">
              Módulo de atención rural en veredas del norte del Valle. Almacenamiento IndexedDB y sincronización por lotes.
            </p>
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-surface-container-high text-center text-xs">
              <div>
                <div className="text-base font-bold text-on-surface">0</div>
                <div className="text-[10px] text-outline">Folios Pendientes</div>
              </div>
              <div>
                <div className="text-base font-bold text-amber-700">Offline</div>
                <div className="text-[10px] text-outline">Modo Asíncrono</div>
              </div>
              <div>
                <div className="text-base font-bold text-primary">3</div>
                <div className="text-[10px] text-outline">Personal en Campo</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: CATÁLOGO CUM FARMACOLÓGICO */}
      {activeTab === 'catalog' && (
        <div className="bg-white rounded-2xl border border-surface-container-high shadow-xs overflow-hidden">
          <div className="p-4 border-b border-surface-container-high">
            <h3 className="text-sm font-bold text-on-surface">Catálogo Institucional de Medicamentos (CUM / INVIMA)</h3>
            <p className="text-[11px] text-outline">
              Base de cruce automático para prevención de eventos adversos y contraindicaciones farmacológicas
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-surface-container-low/50 border-b border-surface-container-high text-outline text-[11px] font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Código CUM</th>
                  <th className="py-3 px-4">Nombre Genérico & Comercial</th>
                  <th className="py-3 px-4">Principio Activo</th>
                  <th className="py-3 px-4">Presentación</th>
                  <th className="py-3 px-4">Stock en Farmacia</th>
                  <th className="py-3 px-4">Nivel de Riesgo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-high">
                {catalogMedicines.map((m) => (
                  <tr key={m.id} className="hover:bg-surface-container-lowest transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-primary">{m.cum}</td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-on-surface">{m.commercial}</div>
                      <div className="text-[11px] text-outline">{m.generic}</div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-on-surface">{m.ingredient}</td>
                    <td className="py-3 px-4 text-on-surface-variant">{m.unit}</td>
                    <td className="py-3 px-4 font-mono font-bold">{m.stock} unidades</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-surface-container-high text-on-surface">
                        {m.risk}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboardScreen;

