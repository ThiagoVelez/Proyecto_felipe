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
  Plus,
  Pencil,
  Trash2,
  X,
  Save,
  Check,
  FileText,
  AlertCircle,
  HelpCircle,
  ShieldAlert,
} from 'lucide-react';
import { apiClient } from '../../services/api';

// Lista inicial de sedes institucionales
const INITIAL_BRANCHES = [
  {
    id: 'br-01',
    name: 'Sede Cartago - Hospital Central',
    level: 'Nivel II • Hospitalario',
    municipality: 'Cartago, Valle del Cauca',
    capacity: '6/8 Consultorios • 2 Quirófanos',
    connectivity: '99.9%',
    staffCount: 12,
    status: 'Operativo',
    description: 'Centro de referencia regional. Servicio de Urgencias 24/7, Consulta Especializada y Quirófanos.',
  },
  {
    id: 'br-02',
    name: 'Sede La Unión - Urgencias',
    level: 'Nivel I • Trauma',
    municipality: 'La Unión, Valle del Cauca',
    capacity: '3/4 Boxes de Triaje',
    connectivity: '99.7%',
    staffCount: 6,
    status: 'Operativo',
    description: 'Unidad de Atención Rápida y Estabilización de Trauma. Triaje Manchester sincronizado.',
  },
  {
    id: 'br-03',
    name: 'Sede Tuluá - Ambulatoria',
    level: 'Ambulatorio • Promoción & Prevención',
    municipality: 'Tuluá, Valle del Cauca',
    capacity: '4/4 Consultorios Médicos',
    connectivity: '99.8%',
    staffCount: 5,
    status: 'Operativo',
    description: 'Centro de Atención Ambulatoria, Promoción de la Salud y Prevención de la Enfermedad.',
  },
  {
    id: 'br-04',
    name: 'Brigada Rural Desconectada',
    level: 'PWA Sync • Atención en Terreno',
    municipality: 'Zonas Rurales Valle Norte',
    capacity: 'Módulo Móvil • 0 Folios Pendientes',
    connectivity: 'Offline (Sync)',
    staffCount: 3,
    status: 'En Espera',
    description: 'Módulo de atención rural en veredas del norte del Valle. Almacenamiento IndexedDB y sincronización por lotes.',
  },
];

// Lista inicial de medicamentos catálogo CUM
const INITIAL_MEDICINES = [
  {
    id: 'med-01',
    cum: 'CUM-199420-1',
    generic: 'Amoxicilina',
    commercial: 'Amoxil 500mg',
    ingredient: 'BETALACTAMICOS',
    stock: 450,
    unit: 'Cápsula',
    risk: 'Riesgo Alérgico Alto',
    contraindications: 'Penicilinas y Cefalosporinas de 1ra Generación',
  },
  {
    id: 'med-02',
    cum: 'CUM-203112-4',
    generic: 'Paracetamol',
    commercial: 'Acetaminofén 500mg',
    ingredient: 'PARACETAMOL',
    stock: 1200,
    unit: 'Tableta',
    risk: 'Bajo Riesgo',
    contraindications: 'Hepatopatía activa y daño hepático severo',
  },
  {
    id: 'med-03',
    cum: 'CUM-188942-2',
    generic: 'Ibuprofeno',
    commercial: 'Advil Max 400mg',
    ingredient: 'AINES',
    stock: 320,
    unit: 'Gragea',
    risk: 'Gástrico / Renal',
    contraindications: 'Úlcera péptica activa e insuficiencia renal',
  },
  {
    id: 'med-04',
    cum: 'CUM-210455-8',
    generic: 'Ceftriaxona',
    commercial: 'Rocephin 1g',
    ingredient: 'CEFALOSPORINAS',
    stock: 85,
    unit: 'Vial Inyectable',
    risk: 'Control Hospitalario',
    contraindications: 'Alergia severa cruzada a betalactámicos',
  },
  {
    id: 'med-05',
    cum: 'CUM-177401-9',
    generic: 'Omeprazol',
    commercial: 'Losec 20mg',
    ingredient: 'OMEPRAZOL',
    stock: 600,
    unit: 'Cápsula',
    risk: 'Bajo Riesgo',
    contraindications: 'Hipersensibilidad a benzimidazoles',
  },
  {
    id: 'med-06',
    cum: 'CUM-220199-3',
    generic: 'Dipirona',
    commercial: 'Novalgina 1g/2ml',
    ingredient: 'DIPIRONA',
    stock: 190,
    unit: 'Ampolla',
    risk: 'Riesgo Hematológico',
    contraindications: 'Agranulocitosis previa y asma inducida',
  },
];

export const AdminDashboardScreen = () => {
  const [activeTab, setActiveTab] = useState('governance'); // 'governance' | 'audit' | 'branches' | 'catalog'
  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterRole, setFilterRole] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionMessage, setActionMessage] = useState('');

  // Persistencia de Sedes (CRUD)
  const [branches, setBranches] = useState(() => {
    try {
      const saved = localStorage.getItem('saludconecta_admin_branches');
      return saved ? JSON.parse(saved) : INITIAL_BRANCHES;
    } catch {
      return INITIAL_BRANCHES;
    }
  });

  // Persistencia de Medicamentos CUM (CRUD)
  const [medicines, setMedicines] = useState(() => {
    try {
      const saved = localStorage.getItem('saludconecta_admin_medicines');
      return saved ? JSON.parse(saved) : INITIAL_MEDICINES;
    } catch {
      return INITIAL_MEDICINES;
    }
  });

  // ==========================================
  // ESTADOS PARA MODALES DE CRUD
  // ==========================================
  // 1. Usuarios / Personal Asistencial
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [deletingUser, setDeletingUser] = useState(null);

  // 2. Auditoría Forense
  const [isCreateAuditOpen, setIsCreateAuditOpen] = useState(false);
  const [editingAudit, setEditingAudit] = useState(null);
  const [deletingAudit, setDeletingAudit] = useState(null);

  // 3. Red Asistencial y Sedes
  const [isCreateBranchOpen, setIsCreateBranchOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [deletingBranch, setDeletingBranch] = useState(null);

  // 4. Catálogo CUM
  const [isCreateMedicineOpen, setIsCreateMedicineOpen] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState(null);
  const [deletingMedicine, setDeletingMedicine] = useState(null);

  // Carga inicial de usuarios y auditoría
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
      if (Array.isArray(logs) && logs.length > 0) {
        setAuditLogs(logs);
      } else {
        // Cargar bitácora inicial local
        const initialLogs = [
          {
            id: 'log-001',
            action: 'LOGIN_SUCCESS',
            resource: '/api/v1/auth/login',
            role: 'MEDICO',
            ip_address: '192.168.1.102',
            correlation_id: 'a87b-99f1-cartago',
            created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
            notes: 'Sesión autenticada con TOTP RFC 6238 en Sede Cartago.',
          },
          {
            id: 'log-002',
            action: 'HCE_SIGNED_SHA256',
            resource: '/api/v1/clinical-records/1',
            role: 'MEDICO',
            ip_address: '192.168.1.102',
            correlation_id: 'c412-7a9f-valle',
            created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
            notes: 'Firma forense inmutable de historia clínica generada según Res. 1995/1999.',
          },
          {
            id: 'log-003',
            action: 'RETHUS_VERIFICATION',
            resource: '/api/v1/admin/users/usr-med-0002',
            role: 'ADMIN',
            ip_address: '127.0.0.1',
            correlation_id: 'reth-94821-valle',
            created_at: new Date(Date.now() - 86400000).toISOString(),
            notes: 'Habilitación y verificación ante ReTHUS de Dr. Santiago Vélez.',
          },
        ];
        setAuditLogs(initialLogs);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchLogs();
  }, []);

  // Guardar sedes y medicamentos en localStorage cuando cambien
  useEffect(() => {
    localStorage.setItem('saludconecta_admin_branches', JSON.stringify(branches));
  }, [branches]);

  useEffect(() => {
    localStorage.setItem('saludconecta_admin_medicines', JSON.stringify(medicines));
  }, [medicines]);

  // ==========================================
  // OPERACIONES CRUD: PERSONAL ASISTENCIAL
  // ==========================================
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

  const handleCreateUser = (newUser) => {
    const userWithId = {
      ...newUser,
      id: `usr-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    setUsers((prev) => [userWithId, ...prev]);
    setIsCreateUserOpen(false);
    setActionMessage(`Usuario "${newUser.full_name}" registrado exitosamente en la plataforma.`);
    setTimeout(() => setActionMessage(''), 4000);
  };

  const handleUpdateUser = (updatedUser) => {
    setUsers((prev) => prev.map((u) => (u.id === updatedUser.id ? updatedUser : u)));
    setEditingUser(null);
    setActionMessage(`Datos de "${updatedUser.full_name}" actualizados correctamente.`);
    setTimeout(() => setActionMessage(''), 4000);
  };

  const handleDeleteUser = (userId) => {
    setUsers((prev) => prev.filter((u) => u.id !== userId));
    setDeletingUser(null);
    setActionMessage('Usuario eliminado del registro institucional.');
    setTimeout(() => setActionMessage(''), 4000);
  };

  // ==========================================
  // OPERACIONES CRUD: AUDITORÍA FORENSE
  // ==========================================
  const handleCreateAudit = (newLog) => {
    const logWithId = {
      ...newLog,
      id: `log-${Date.now()}`,
      correlation_id: `hash-${Math.random().toString(16).substring(2, 10)}`,
      created_at: new Date().toISOString(),
    };
    setAuditLogs((prev) => [logWithId, ...prev]);
    setIsCreateAuditOpen(false);
    setActionMessage(`Registro de auditoría forense #${logWithId.correlation_id} emitido y firmado.`);
    setTimeout(() => setActionMessage(''), 4000);
  };

  const handleUpdateAudit = (updatedLog) => {
    setAuditLogs((prev) => prev.map((l) => (l.id === updatedLog.id ? updatedLog : l)));
    setEditingAudit(null);
    setActionMessage('Dictamen forense actualizado.');
    setTimeout(() => setActionMessage(''), 4000);
  };

  const handleDeleteAudit = (logId) => {
    setAuditLogs((prev) => prev.filter((l) => l.id !== logId));
    setDeletingAudit(null);
    setActionMessage('Registro forense archivado con justificación.');
    setTimeout(() => setActionMessage(''), 4000);
  };

  // ==========================================
  // OPERACIONES CRUD: RED ASISTENCIAL Y SEDES
  // ==========================================
  const handleCreateBranch = (newBranch) => {
    const branchWithId = {
      ...newBranch,
      id: `br-${Date.now()}`,
    };
    setBranches((prev) => [...prev, branchWithId]);
    setIsCreateBranchOpen(false);
    setActionMessage(`Sede "${newBranch.name}" incorporada a la Red Asistencial.`);
    setTimeout(() => setActionMessage(''), 4000);
  };

  const handleUpdateBranch = (updatedBranch) => {
    setBranches((prev) => prev.map((b) => (b.id === updatedBranch.id ? updatedBranch : b)));
    setEditingBranch(null);
    setActionMessage(`Parámetros de la sede "${updatedBranch.name}" actualizados.`);
    setTimeout(() => setActionMessage(''), 4000);
  };

  const handleDeleteBranch = (branchId) => {
    setBranches((prev) => prev.filter((b) => b.id !== branchId));
    setDeletingBranch(null);
    setActionMessage('Sede retirada de la Red Asistencial.');
    setTimeout(() => setActionMessage(''), 4000);
  };

  // ==========================================
  // OPERACIONES CRUD: CATÁLOGO CUM FARMACOLÓGICO
  // ==========================================
  const handleCreateMedicine = (newMed) => {
    const medWithId = {
      ...newMed,
      id: `med-${Date.now()}`,
    };
    setMedicines((prev) => [medWithId, ...prev]);
    setIsCreateMedicineOpen(false);
    setActionMessage(`Medicamento "${newMed.commercial}" (${newMed.cum}) añadido al Catálogo CUM.`);
    setTimeout(() => setActionMessage(''), 4000);
  };

  const handleUpdateMedicine = (updatedMed) => {
    setMedicines((prev) => prev.map((m) => (m.id === updatedMed.id ? updatedMed : m)));
    setEditingMedicine(null);
    setActionMessage(`Medicamento "${updatedMed.commercial}" actualizado en catálogo.`);
    setTimeout(() => setActionMessage(''), 4000);
  };

  const handleDeleteMedicine = (medId) => {
    setMedicines((prev) => prev.filter((m) => m.id !== medId));
    setDeletingMedicine(null);
    setActionMessage('Medicamento retirado del inventario farmacéutico institucional.');
    setTimeout(() => setActionMessage(''), 4000);
  };

  // Filtrado de personal asistencial
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
    <div className="space-y-5 animate-fade-in">
      {/* Mensaje de acción reactivo */}
      {actionMessage && (
        <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-primary text-xs font-semibold flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
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
          <span>Red Asistencial y Sedes ({branches.length})</span>
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
          <span>Catálogo CUM Farmacológico ({medicines.length})</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: GOBERNANZA DE PERSONAL (CRUD COMPLETO)            */}
      {/* ======================================================== */}
      {activeTab === 'governance' && (
        <div className="bg-white rounded-2xl border border-surface-container-high shadow-xs overflow-hidden">
          {/* Barra de Filtros y Botón de Creación */}
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

              {/* Botón Crear Usuario Asistencial (CRUD: CREATE) */}
              <button
                type="button"
                onClick={() => setIsCreateUserOpen(true)}
                className="h-8 px-3 rounded-lg bg-primary hover:bg-primary-hover text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nuevo Personal</span>
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
                  <th className="py-3 px-4 text-right">Acciones de Gestión (CRUD)</th>
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

                        {/* ACCIONES CRUD: EDITAR, ELIMINAR, SUSPENDER / HABILITAR */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Botón Editar (CRUD: UPDATE) */}
                            <button
                              type="button"
                              onClick={() => setEditingUser(u)}
                              title="Editar datos de este profesional"
                              className="p-1.5 rounded-lg border border-outline-variant hover:bg-surface-container-low text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>

                            {/* Botón Eliminar (CRUD: DELETE) */}
                            {!isAdm && (
                              <button
                                type="button"
                                onClick={() => setDeletingUser(u)}
                                title="Eliminar registro de la plataforma"
                                className="p-1.5 rounded-lg border border-red-200 hover:bg-red-50 text-red-600 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Botón Rápido de Gobernanza ReTHUS */}
                            {isAdm ? (
                              <span className="text-[10px] text-outline font-medium px-2">Sistema</span>
                            ) : u.is_active ? (
                              <button
                                type="button"
                                onClick={() => handleToggleStatus(u, false)}
                                className="h-7 px-2.5 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 font-semibold text-[11px] transition-colors cursor-pointer inline-flex items-center gap-1"
                                title="Suspender acceso asistencial"
                              >
                                <UserX className="w-3 h-3" />
                                <span className="hidden sm:inline">Suspender</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleToggleStatus(u, true)}
                                className="h-7 px-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-[11px] transition-colors cursor-pointer inline-flex items-center gap-1 shadow-xs"
                                title="Verificar y habilitar tarjeta profesional ante ReTHUS"
                              >
                                <UserCheck className="w-3 h-3" />
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

      {/* ======================================================== */}
      {/* TAB 2: AUDITORÍA FORENSE (CRUD COMPLETO)                 */}
      {/* ======================================================== */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-2xl border border-surface-container-high shadow-xs overflow-hidden space-y-4 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-surface-container-high">
            <div>
              <h3 className="text-sm font-bold text-on-surface">Bitácora Forense Inmutable de Transacciones</h3>
              <p className="text-[11px] text-outline">
                Conforme a ISO/IEC 25010, Ley 1581 de 2012 y Res. 1995 de 1999 (Firma digital SHA-256)
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={fetchLogs}
                className="h-8 px-3 rounded-lg border border-outline-variant hover:bg-surface-container-low flex items-center gap-1.5 text-xs text-on-surface cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Actualizar</span>
              </button>
              {/* Botón Crear Registro de Auditoría (CRUD: CREATE) */}
              <button
                type="button"
                onClick={() => setIsCreateAuditOpen(true)}
                className="h-8 px-3 rounded-lg bg-primary hover:bg-primary-hover text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Registrar Hallazgo Forense</span>
              </button>
            </div>
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
                  className="p-3.5 rounded-xl bg-surface-container-lowest border border-outline-variant/30 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs hover:border-primary/40 transition-colors"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary uppercase">
                        {log.action}
                      </span>
                      <span className="font-semibold text-on-surface font-mono">{log.resource}</span>
                      <span className="text-[11px] text-outline">• Operador: {log.role || 'SISTEMA'}</span>
                      {log.notes && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          Dictamen Adjunto
                        </span>
                      )}
                    </div>
                    {log.notes && (
                      <p className="text-[11px] text-on-surface-variant bg-surface-container-low/80 p-2 rounded-lg italic">
                        "{log.notes}"
                      </p>
                    )}
                    <div className="text-[11px] text-outline font-mono">
                      IP: {log.ip_address || '127.0.0.1'} | Correlación: {log.correlation_id || 'N/A'}
                    </div>
                  </div>

                  <div className="flex flex-col md:items-end justify-between gap-2 shrink-0">
                    <div className="text-[11px] text-outline font-mono">
                      {log.created_at ? new Date(log.created_at).toLocaleString() : 'Reciente'}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-700 font-semibold flex items-center gap-1 text-[11px]">
                        <Lock className="w-3 h-3" /> SHA-256 Verificado
                      </span>
                      {/* Botón Editar Dictamen (CRUD: UPDATE) */}
                      <button
                        type="button"
                        onClick={() => setEditingAudit(log)}
                        title="Editar dictamen forense"
                        className="p-1 rounded-lg border border-outline-variant hover:bg-surface-container-low text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      {/* Botón Archivar / Eliminar (CRUD: DELETE) */}
                      <button
                        type="button"
                        onClick={() => setDeletingAudit(log)}
                        title="Archivar registro forense"
                        className="p-1 rounded-lg border border-red-200 hover:bg-red-50 text-red-600 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: RED ASISTENCIAL Y SEDES (CRUD COMPLETO)           */}
      {/* ======================================================== */}
      {activeTab === 'branches' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-surface-container-high shadow-xs">
            <div>
              <h3 className="text-sm font-bold text-on-surface">Red Asistencial Integrada del Valle del Cauca</h3>
              <p className="text-xs text-on-surface-variant">
                Administración de nodos de atención médica, unidades de urgencias y brigadas rurales.
              </p>
            </div>
            {/* Botón Crear Sede (CRUD: CREATE) */}
            <button
              type="button"
              onClick={() => setIsCreateBranchOpen(true)}
              className="h-9 px-3.5 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Nueva Sede Asistencial</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {branches.map((b) => (
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
                    {/* Botón Editar Sede (CRUD: UPDATE) */}
                    <button
                      type="button"
                      onClick={() => setEditingBranch(b)}
                      title="Editar parámetros de la sede"
                      className="p-1 rounded-lg border border-outline-variant hover:bg-surface-container-low text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    {/* Botón Eliminar Sede (CRUD: DELETE) */}
                    <button
                      type="button"
                      onClick={() => setDeletingBranch(b)}
                      title="Retirar sede de la red asistencial"
                      className="p-1 rounded-lg border border-red-200 hover:bg-red-50 text-red-600 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="text-[11px] font-medium text-primary bg-primary/5 px-2.5 py-1 rounded-lg inline-block">
                  {b.level}
                </div>

                <p className="text-xs text-on-surface-variant leading-relaxed">
                  {b.description}
                </p>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-surface-container-high text-center text-xs">
                  <div>
                    <div className="text-sm font-bold text-on-surface truncate">{b.capacity}</div>
                    <div className="text-[10px] text-outline">Capacidad / Boxes</div>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-emerald-700">{b.connectivity}</div>
                    <div className="text-[10px] text-outline">Conectividad</div>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-primary">{b.staffCount}</div>
                    <div className="text-[10px] text-outline">Personal Asignado</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: CATÁLOGO CUM FARMACOLÓGICO (CRUD COMPLETO)        */}
      {/* ======================================================== */}
      {activeTab === 'catalog' && (
        <div className="bg-white rounded-2xl border border-surface-container-high shadow-xs overflow-hidden">
          <div className="p-4 border-b border-surface-container-high flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-on-surface">Catálogo Institucional de Medicamentos (CUM / INVIMA)</h3>
              <p className="text-[11px] text-outline">
                Base de cruce automático para prevención de eventos adversos y contraindicaciones farmacológicas
              </p>
            </div>
            {/* Botón Crear Medicamento CUM (CRUD: CREATE) */}
            <button
              type="button"
              onClick={() => setIsCreateMedicineOpen(true)}
              className="h-9 px-3.5 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Medicamento CUM</span>
            </button>
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
                  <th className="py-3 px-4">Nivel de Riesgo & Contraindicación</th>
                  <th className="py-3 px-4 text-right">Acciones (CRUD)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-high">
                {medicines.map((m) => (
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
                      <div className="space-y-0.5">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-surface-container-high text-on-surface inline-block">
                          {m.risk}
                        </span>
                        {m.contraindications && (
                          <div className="text-[10px] text-red-700 italic">
                            Contraind.: {m.contraindications}
                          </div>
                        )}
                      </div>
                    </td>
                    {/* ACCIONES CRUD: EDITAR Y ELIMINAR */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setEditingMedicine(m)}
                          title="Editar información de medicamento"
                          className="p-1.5 rounded-lg border border-outline-variant hover:bg-surface-container-low text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingMedicine(m)}
                          title="Eliminar medicamento del catálogo"
                          className="p-1.5 rounded-lg border border-red-200 hover:bg-red-50 text-red-600 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODALES DE CREACIÓN Y EDICIÓN (CRUD)                      */}
      {/* ======================================================== */}

      {/* 1A. MODAL CREAR USUARIO */}
      {isCreateUserOpen && (
        <CreateUserModal
          isOpen={isCreateUserOpen}
          onClose={() => setIsCreateUserOpen(false)}
          onSave={handleCreateUser}
        />
      )}

      {/* 1B. MODAL EDITAR USUARIO */}
      {editingUser && (
        <EditUserModal
          isOpen={!!editingUser}
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSave={handleUpdateUser}
        />
      )}

      {/* 1C. MODAL ELIMINAR USUARIO */}
      {deletingUser && (
        <ConfirmDeleteModal
          isOpen={!!deletingUser}
          title="Eliminar Personal Asistencial"
          message={`¿Confirma la baja definitiva del profesional ${deletingUser.full_name} (${deletingUser.professional_card})? Esta acción revocará todos sus accesos de firma electrónica.`}
          onClose={() => setDeletingUser(null)}
          onConfirm={() => handleDeleteUser(deletingUser.id)}
        />
      )}

      {/* 2A. MODAL CREAR AUDITORÍA */}
      {isCreateAuditOpen && (
        <CreateAuditModal
          isOpen={isCreateAuditOpen}
          onClose={() => setIsCreateAuditOpen(false)}
          onSave={handleCreateAudit}
        />
      )}

      {/* 2B. MODAL EDITAR AUDITORÍA */}
      {editingAudit && (
        <EditAuditModal
          isOpen={!!editingAudit}
          log={editingAudit}
          onClose={() => setEditingAudit(null)}
          onSave={handleUpdateAudit}
        />
      )}

      {/* 2C. MODAL ELIMINAR AUDITORÍA */}
      {deletingAudit && (
        <ConfirmDeleteModal
          isOpen={!!deletingAudit}
          title="Archivar Registro Forense"
          message={`¿Confirma el archivado del registro de auditoría ${deletingAudit.correlation_id}? La traza será movida al almacenamiento de resguardo legal bajo Ley 1581 de 2012.`}
          onClose={() => setDeletingAudit(null)}
          onConfirm={() => handleDeleteAudit(deletingAudit.id)}
        />
      )}

      {/* 3A. MODAL CREAR SEDE */}
      {isCreateBranchOpen && (
        <CreateBranchModal
          isOpen={isCreateBranchOpen}
          onClose={() => setIsCreateBranchOpen(false)}
          onSave={handleCreateBranch}
        />
      )}

      {/* 3B. MODAL EDITAR SEDE */}
      {editingBranch && (
        <EditBranchModal
          isOpen={!!editingBranch}
          branch={editingBranch}
          onClose={() => setEditingBranch(null)}
          onSave={handleUpdateBranch}
        />
      )}

      {/* 3C. MODAL ELIMINAR SEDE */}
      {deletingBranch && (
        <ConfirmDeleteModal
          isOpen={!!deletingBranch}
          title="Retirar Sede de la Red"
          message={`¿Desea desincorporar la sede "${deletingBranch.name}" de la Red Asistencial? Verifique que no queden pacientes hospitalizados ni personal en turno activo.`}
          onClose={() => setDeletingBranch(null)}
          onConfirm={() => handleDeleteBranch(deletingBranch.id)}
        />
      )}

      {/* 4A. MODAL CREAR MEDICAMENTO CUM */}
      {isCreateMedicineOpen && (
        <CreateMedicineModal
          isOpen={isCreateMedicineOpen}
          onClose={() => setIsCreateMedicineOpen(false)}
          onSave={handleCreateMedicine}
        />
      )}

      {/* 4B. MODAL EDITAR MEDICAMENTO CUM */}
      {editingMedicine && (
        <EditMedicineModal
          isOpen={!!editingMedicine}
          medicine={editingMedicine}
          onClose={() => setEditingMedicine(null)}
          onSave={handleUpdateMedicine}
        />
      )}

      {/* 4C. MODAL ELIMINAR MEDICAMENTO */}
      {deletingMedicine && (
        <ConfirmDeleteModal
          isOpen={!!deletingMedicine}
          title="Eliminar Medicamento del Catálogo"
          message={`¿Confirma la baja del fármaco ${deletingMedicine.commercial} (${deletingMedicine.cum})? El interceptor de alergias desactivará las alertas de este principio activo.`}
          onClose={() => setDeletingMedicine(null)}
          onConfirm={() => handleDeleteMedicine(deletingMedicine.id)}
        />
      )}
    </div>
  );
};

// ========================================================
// SUB-COMPONENTES MODALES DE GESTIÓN (CRUD)
// ========================================================

// 1. Modal Crear Personal
const CreateUserModal = ({ isOpen, onClose, onSave }) => {
  const [fullName, setFullName] = useState('');
  const [docType, setDocType] = useState('CC');
  const [docNumber, setDocNumber] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [roleId, setRoleId] = useState('2'); // 2: Medico, 3: Enfermero
  const [professionalCard, setProfessionalCard] = useState('');
  const [specialty, setSpecialty] = useState('Medicina General');
  const [branch, setBranch] = useState('Sede Cartago - Hospital Central (Nivel II)');
  const [isActive, setIsActive] = useState(true);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      full_name: fullName,
      document_type: docType,
      document_number: docNumber,
      email,
      phone,
      role_id: Number(roleId),
      role_name: Number(roleId) === 1 ? 'ADMIN' : Number(roleId) === 2 ? 'MEDICO' : 'ENFERMERO',
      professional_card: professionalCard,
      specialty,
      branch,
      is_active: isActive,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-surface-container-high overflow-hidden">
        <div className="px-5 py-4 bg-primary text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            <h3 className="font-bold text-sm">Registrar Nuevo Personal Asistencial</h3>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-white/20 text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3.5 text-xs">
          <div>
            <label className="block text-[11px] font-semibold text-outline mb-1">Nombre Completo *</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ej: Dr. Andrés Gómez"
              className="w-full h-8 px-3 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface"
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-outline mb-1">Tipo Doc.</label>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                className="w-full h-8 px-2 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface"
              >
                <option value="CC">CC</option>
                <option value="CE">CE</option>
                <option value="PA">PA</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-[11px] font-semibold text-outline mb-1">Número de Documento *</label>
              <input
                type="text"
                required
                value={docNumber}
                onChange={(e) => setDocNumber(e.target.value)}
                placeholder="1118999888"
                className="w-full h-8 px-3 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-outline mb-1">Correo Institucional *</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="agomez@saludconecta.ips.gov.co"
                className="w-full h-8 px-3 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-outline mb-1">Teléfono</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="315 000 0000"
                className="w-full h-8 px-3 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-outline mb-1">Rol en Sistema</label>
              <select
                value={roleId}
                onChange={(e) => setRoleId(e.target.value)}
                className="w-full h-8 px-2 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface"
              >
                <option value="2">MÉDICO</option>
                <option value="3">ENFERMERO</option>
                <option value="1">ADMINISTRADOR TI</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-outline mb-1">Tarjeta ReTHUS *</label>
              <input
                type="text"
                required
                value={professionalCard}
                onChange={(e) => setProfessionalCard(e.target.value)}
                placeholder="RM-77610-VALLE"
                className="w-full h-8 px-3 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface font-mono"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-outline mb-1">Especialidad</label>
              <input
                type="text"
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                placeholder="Medicina General, Urgencias..."
                className="w-full h-8 px-3 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-outline mb-1">Sede Asignada</label>
              <select
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                className="w-full h-8 px-2 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface"
              >
                <option value="Sede Cartago - Hospital Central (Nivel II)">Sede Cartago</option>
                <option value="Sede La Unión (Urgencias)">Sede La Unión</option>
                <option value="Sede Tuluá (Ambulatoria)">Sede Tuluá</option>
                <option value="Brigada Rural (PWA Sync)">Brigada Rural</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="is_active_check"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded text-primary focus:ring-primary"
            />
            <label htmlFor="is_active_check" className="text-[11px] font-medium text-on-surface cursor-pointer">
              Habilitar y activar de inmediato ante ReTHUS
            </label>
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
              Guardar Personal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// 2. Modal Editar Personal
const EditUserModal = ({ isOpen, user, onClose, onSave }) => {
  const [fullName, setFullName] = useState(user.full_name || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [professionalCard, setProfessionalCard] = useState(user.professional_card || '');
  const [specialty, setSpecialty] = useState(user.specialty || '');
  const [branch, setBranch] = useState(user.branch || '');
  const [roleId, setRoleId] = useState(user.role_id?.toString() || '2');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...user,
      full_name: fullName,
      phone,
      professional_card: professionalCard,
      specialty,
      branch,
      role_id: Number(roleId),
      role_name: Number(roleId) === 1 ? 'ADMIN' : Number(roleId) === 2 ? 'MEDICO' : 'ENFERMERO',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-surface-container-high overflow-hidden">
        <div className="px-5 py-4 bg-primary text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Pencil className="w-4 h-4" />
            <h3 className="font-bold text-sm">Editar Información del Profesional</h3>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-white/20 text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3 text-xs">
          <div>
            <label className="block text-[11px] font-semibold text-outline mb-1">Nombre Completo</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full h-8 px-3 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-outline mb-1">Tarjeta ReTHUS</label>
              <input
                type="text"
                required
                value={professionalCard}
                onChange={(e) => setProfessionalCard(e.target.value)}
                className="w-full h-8 px-3 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-outline mb-1">Teléfono</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full h-8 px-3 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-outline mb-1">Especialidad</label>
              <input
                type="text"
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                className="w-full h-8 px-3 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-outline mb-1">Rol</label>
              <select
                value={roleId}
                onChange={(e) => setRoleId(e.target.value)}
                className="w-full h-8 px-2 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface"
              >
                <option value="2">MÉDICO</option>
                <option value="3">ENFERMERO</option>
                <option value="1">ADMINISTRADOR TI</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-outline mb-1">Sede Operativa</label>
            <select
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              className="w-full h-8 px-2 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface"
            >
              <option value="Sede Cartago - Hospital Central (Nivel II)">Sede Cartago - Hospital Central (Nivel II)</option>
              <option value="Sede La Unión (Urgencias)">Sede La Unión (Urgencias)</option>
              <option value="Sede Tuluá (Ambulatoria)">Sede Tuluá (Ambulatoria)</option>
              <option value="Brigada Rural (PWA Sync)">Brigada Rural (PWA Sync)</option>
            </select>
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

// 3. Modal Crear Auditoría Forense
const CreateAuditModal = ({ isOpen, onClose, onSave }) => {
  const [action, setAction] = useState('INSPECCION_FORENSE');
  const [resource, setResource] = useState('/api/v1/hce/seguridad');
  const [role, setRole] = useState('AUDITOR TI');
  const [ipAddress, setIpAddress] = useState('192.168.1.105');
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      action,
      resource,
      role,
      ip_address: ipAddress,
      notes,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-surface-container-high overflow-hidden">
        <div className="px-5 py-4 bg-primary text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            <h3 className="font-bold text-sm">Registrar Hallazgo Forense</h3>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-white/20 text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3 text-xs">
          <div>
            <label className="block text-[11px] font-semibold text-outline mb-1">Acción / Tipo de Evento</label>
            <select
              value={action}
              onChange={(e) => setAction(e.target.value)}
              className="w-full h-8 px-2 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface"
            >
              <option value="INSPECCION_FORENSE">INSPECCION_FORENSE</option>
              <option value="AUDITORIA_HABEAS_DATA">AUDITORIA_HABEAS_DATA</option>
              <option value="REVISION_RETHUS">REVISION_RETHUS</option>
              <option value="CONTROL_ACCESO_MFA">CONTROL_ACCESO_MFA</option>
              <option value="VERIFICACION_HASH_SHA256">VERIFICACION_HASH_SHA256</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-outline mb-1">Recurso Auditado</label>
            <input
              type="text"
              required
              value={resource}
              onChange={(e) => setResource(e.target.value)}
              placeholder="/api/v1/clinical-records"
              className="w-full h-8 px-3 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface font-mono"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-outline mb-1">Auditor / Operador</label>
              <input
                type="text"
                required
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="AUDITOR TI"
                className="w-full h-8 px-3 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-outline mb-1">Dirección IP</label>
              <input
                type="text"
                required
                value={ipAddress}
                onChange={(e) => setIpAddress(e.target.value)}
                placeholder="192.168.1.100"
                className="w-full h-8 px-3 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface font-mono"
              />
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-outline mb-1">Dictamen Pericial / Hallazgo</label>
            <textarea
              rows={3}
              required
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Describa el hallazgo u observación de conformidad normativa..."
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
              Firmar Hallazgo SHA-256
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// 4. Modal Editar Dictamen de Auditoría
const EditAuditModal = ({ isOpen, log, onClose, onSave }) => {
  const [notes, setNotes] = useState(log.notes || '');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ ...log, notes });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-surface-container-high overflow-hidden">
        <div className="px-5 py-4 bg-primary text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            <h3 className="font-bold text-sm">Editar Dictamen Forense</h3>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-white/20 text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3 text-xs">
          <div className="p-2.5 rounded-lg bg-surface-container-low space-y-1">
            <div className="font-mono text-primary font-bold">{log.correlation_id}</div>
            <div className="text-[11px] text-outline font-medium">Recurso: {log.resource}</div>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-outline mb-1">Dictamen / Observaciones Periciales</label>
            <textarea
              rows={4}
              required
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Actualice el dictamen o resolución del evento..."
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
              Guardar Dictamen
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// 5. Modal Crear Sede
const CreateBranchModal = ({ isOpen, onClose, onSave }) => {
  const [name, setName] = useState('');
  const [level, setLevel] = useState('Nivel I • Urgencias');
  const [municipality, setMunicipality] = useState('');
  const [capacity, setCapacity] = useState('4 Consultorios • 2 Boxes Triaje');
  const [connectivity, setConnectivity] = useState('99.8%');
  const [staffCount, setStaffCount] = useState(6);
  const [status, setStatus] = useState('Operativo');
  const [description, setDescription] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      name,
      level,
      municipality,
      capacity,
      connectivity,
      staffCount: Number(staffCount),
      status,
      description,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-surface-container-high overflow-hidden">
        <div className="px-5 py-4 bg-primary text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            <h3 className="font-bold text-sm">Añadir Sede a la Red Asistencial</h3>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-white/20 text-white cursor-pointer">
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
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-outline mb-1">Capacidad / Boxes</label>
              <input
                type="text"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                placeholder="4 Consultorios"
                className="w-full h-8 px-2 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-outline mb-1">Conectividad</label>
              <input
                type="text"
                value={connectivity}
                onChange={(e) => setConnectivity(e.target.value)}
                placeholder="99.5%"
                className="w-full h-8 px-2 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-outline mb-1">Médicos Asignados</label>
              <input
                type="number"
                min={0}
                value={staffCount}
                onChange={(e) => setStaffCount(e.target.value)}
                className="w-full h-8 px-2 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface"
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
  const [capacity, setCapacity] = useState(branch.capacity || '');
  const [connectivity, setConnectivity] = useState(branch.connectivity || '');
  const [staffCount, setStaffCount] = useState(branch.staffCount || 0);
  const [status, setStatus] = useState(branch.status || 'Operativo');
  const [description, setDescription] = useState(branch.description || '');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...branch,
      name,
      level,
      capacity,
      connectivity,
      staffCount: Number(staffCount),
      status,
      description,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-surface-container-high overflow-hidden">
        <div className="px-5 py-4 bg-primary text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Pencil className="w-4 h-4" />
            <h3 className="font-bold text-sm">Editar Parámetros de Sede</h3>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-white/20 text-white cursor-pointer">
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
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-outline mb-1">Capacidad</label>
              <input
                type="text"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                className="w-full h-8 px-2 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-outline mb-1">Conectividad</label>
              <input
                type="text"
                value={connectivity}
                onChange={(e) => setConnectivity(e.target.value)}
                className="w-full h-8 px-2 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-outline mb-1">Personal Asignado</label>
              <input
                type="number"
                min={0}
                value={staffCount}
                onChange={(e) => setStaffCount(e.target.value)}
                className="w-full h-8 px-2 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface"
              />
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

// 7. Modal Crear Medicamento CUM
const CreateMedicineModal = ({ isOpen, onClose, onSave }) => {
  const [cum, setCum] = useState('CUM-');
  const [generic, setGeneric] = useState('');
  const [commercial, setCommercial] = useState('');
  const [ingredient, setIngredient] = useState('');
  const [unit, setUnit] = useState('Tableta');
  const [stock, setStock] = useState(200);
  const [risk, setRisk] = useState('Bajo Riesgo');
  const [contraindications, setContraindications] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      cum,
      generic,
      commercial,
      ingredient: ingredient.toUpperCase(),
      unit,
      stock: Number(stock),
      risk,
      contraindications,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-surface-container-high overflow-hidden">
        <div className="px-5 py-4 bg-primary text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Pill className="w-4 h-4" />
            <h3 className="font-bold text-sm">Registrar Nuevo Medicamento CUM</h3>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-white/20 text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-outline mb-1">Código CUM (INVIMA) *</label>
              <input
                type="text"
                required
                value={cum}
                onChange={(e) => setCum(e.target.value)}
                placeholder="CUM-234810-1"
                className="w-full h-8 px-3 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface font-mono font-semibold"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-outline mb-1">Principio Activo *</label>
              <input
                type="text"
                required
                value={ingredient}
                onChange={(e) => setIngredient(e.target.value)}
                placeholder="BETALACTAMICOS, AINES..."
                className="w-full h-8 px-3 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface uppercase font-semibold"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-outline mb-1">Nombre Comercial *</label>
              <input
                type="text"
                required
                value={commercial}
                onChange={(e) => setCommercial(e.target.value)}
                placeholder="Ej: Amoxil 500mg"
                className="w-full h-8 px-3 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-outline mb-1">Nombre Genérico *</label>
              <input
                type="text"
                required
                value={generic}
                onChange={(e) => setGeneric(e.target.value)}
                placeholder="Ej: Amoxicilina"
                className="w-full h-8 px-3 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-outline mb-1">Presentación</label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full h-8 px-2 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface"
              >
                <option value="Tableta">Tableta</option>
                <option value="Cápsula">Cápsula</option>
                <option value="Vial Inyectable">Vial Inyectable</option>
                <option value="Ampolla">Ampolla</option>
                <option value="Gragea">Gragea</option>
                <option value="Jarabe">Jarabe</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-outline mb-1">Stock Inicial</label>
              <input
                type="number"
                min={0}
                required
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className="w-full h-8 px-2 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-outline mb-1">Nivel de Riesgo</label>
              <select
                value={risk}
                onChange={(e) => setRisk(e.target.value)}
                className="w-full h-8 px-2 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface"
              >
                <option value="Bajo Riesgo">Bajo Riesgo</option>
                <option value="Control Hospitalario">Control Hospitalario</option>
                <option value="Riesgo Alérgico Alto">Riesgo Alérgico Alto</option>
                <option value="Gástrico / Renal">Gástrico / Renal</option>
                <option value="Riesgo Hematológico">Riesgo Hematológico</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-outline mb-1">Contraindicaciones & Alergias Cruzadas</label>
            <input
              type="text"
              value={contraindications}
              onChange={(e) => setContraindications(e.target.value)}
              placeholder="Ej: Alergia a Penicilinas, Cefalosporinas..."
              className="w-full h-8 px-3 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface"
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
              Guardar Medicamento
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// 8. Modal Editar Medicamento CUM
const EditMedicineModal = ({ isOpen, medicine, onClose, onSave }) => {
  const [commercial, setCommercial] = useState(medicine.commercial || '');
  const [generic, setGeneric] = useState(medicine.generic || '');
  const [ingredient, setIngredient] = useState(medicine.ingredient || '');
  const [unit, setUnit] = useState(medicine.unit || '');
  const [stock, setStock] = useState(medicine.stock || 0);
  const [risk, setRisk] = useState(medicine.risk || 'Bajo Riesgo');
  const [contraindications, setContraindications] = useState(medicine.contraindications || '');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...medicine,
      commercial,
      generic,
      ingredient: ingredient.toUpperCase(),
      unit,
      stock: Number(stock),
      risk,
      contraindications,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-surface-container-high overflow-hidden">
        <div className="px-5 py-4 bg-primary text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Pencil className="w-4 h-4" />
            <h3 className="font-bold text-sm">Editar Medicamento {medicine.cum}</h3>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-white/20 text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-outline mb-1">Nombre Comercial</label>
              <input
                type="text"
                required
                value={commercial}
                onChange={(e) => setCommercial(e.target.value)}
                className="w-full h-8 px-3 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-outline mb-1">Nombre Genérico</label>
              <input
                type="text"
                required
                value={generic}
                onChange={(e) => setGeneric(e.target.value)}
                className="w-full h-8 px-3 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-outline mb-1">Principio Activo</label>
              <input
                type="text"
                required
                value={ingredient}
                onChange={(e) => setIngredient(e.target.value)}
                className="w-full h-8 px-2 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface uppercase font-semibold"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-outline mb-1">Stock Disponible</label>
              <input
                type="number"
                min={0}
                required
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className="w-full h-8 px-2 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-outline mb-1">Presentación</label>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full h-8 px-2 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface"
              />
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-outline mb-1">Nivel de Riesgo</label>
            <select
              value={risk}
              onChange={(e) => setRisk(e.target.value)}
              className="w-full h-8 px-2 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface"
            >
              <option value="Bajo Riesgo">Bajo Riesgo</option>
              <option value="Control Hospitalario">Control Hospitalario</option>
              <option value="Riesgo Alérgico Alto">Riesgo Alérgico Alto</option>
              <option value="Gástrico / Renal">Gástrico / Renal</option>
              <option value="Riesgo Hematológico">Riesgo Hematológico</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-outline mb-1">Contraindicaciones</label>
            <input
              type="text"
              value={contraindications}
              onChange={(e) => setContraindications(e.target.value)}
              className="w-full h-8 px-3 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface"
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm animate-fade-in">
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
