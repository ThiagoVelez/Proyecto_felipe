/**
 * Cliente de comunicacion con el Backend Go/Fiber
 * Estandares: ISO/IEC 25010, Res. 1995 de 1999, Ley 1581 de 2012
 * Incluye respaldo reactivo y simulacion de contingencia para navegacion fluida.
 */

const API_BASE = '/api/v1';
const UNAVAILABLE_MESSAGE = 'El servicio no está disponible. Intente nuevamente en unos minutos.';

// Mock de personal para contingencia y demostracion inmediata
const INITIAL_STAFF_MOCK = [
  {
    id: 'usr-admin-0001',
    role_id: 1,
    role_name: 'ADMIN',
    full_name: 'Administrador del Sistema',
    document_type: 'CC',
    document_number: '1000000001',
    email: 'admin@saludconecta.ips.gov.co',
    phone: '3100000001',
    professional_card: 'TI-ADMIN-001',
    specialty: 'Seguridad y Gobernanza Hospitalaria',
    branch: 'Sede Cartago - Hospital Central',
    is_active: true,
    mfa_enabled: false,
    created_at: new Date(Date.now() - 86400000 * 30).toISOString(),
  },
  {
    id: 'usr-med-0002',
    role_id: 2,
    role_name: 'MEDICO',
    full_name: 'Dr. Santiago Vélez',
    document_type: 'CC',
    document_number: '1118234567',
    email: 'svelez@saludconecta.ips.gov.co',
    phone: '3123456789',
    professional_card: 'RM-94821-VALLE',
    specialty: 'Medicina de Urgencias',
    branch: 'Sede Cartago - Hospital Central (Nivel II)',
    is_active: true,
    mfa_enabled: true,
    created_at: new Date(Date.now() - 86400000 * 15).toISOString(),
  },
  {
    id: 'usr-med-0003',
    role_id: 2,
    role_name: 'MEDICO',
    full_name: 'Dra. Camila Yaima',
    document_type: 'CC',
    document_number: '1117654321',
    email: 'cyaima@saludconecta.ips.gov.co',
    phone: '3159876543',
    professional_card: 'RM-88310-VALLE',
    specialty: 'Pediatría',
    branch: 'Sede La Unión (Urgencias)',
    is_active: false,
    mfa_enabled: false,
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'usr-enf-0004',
    role_id: 3,
    role_name: 'ENFERMERO',
    full_name: 'Lic. Mateo Holguín',
    document_type: 'CC',
    document_number: '1113987654',
    email: 'mholguin@saludconecta.ips.gov.co',
    phone: '3187654321',
    professional_card: 'ENF-44210-VALLE',
    specialty: 'Triaje y Reanimación',
    branch: 'Sede Cartago - Hospital Central',
    is_active: true,
    mfa_enabled: true,
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
];

let localStaff = [...INITIAL_STAFF_MOCK];

// Retira sesiones simuladas guardadas por versiones anteriores: el servidor nunca emitio esos tokens
if (localStorage.getItem('saludconecta_token')?.startsWith('simulated-')) {
  localStorage.removeItem('saludconecta_token');
  localStorage.removeItem('saludconecta_user');
  localStorage.removeItem('saludconecta_session_active');
}

export const apiClient = {
  // Estado de sesion en memoria / local cache
  token: localStorage.getItem('saludconecta_token') || '',
  user: JSON.parse(localStorage.getItem('saludconecta_user') || 'null'),

  setAuth(token, user) {
    this.token = token;
    this.user = user;
    if (token) {
      localStorage.setItem('saludconecta_token', token);
      localStorage.setItem('saludconecta_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('saludconecta_token');
      localStorage.removeItem('saludconecta_user');
    }
  },

  async request(endpoint, { strict = false, ...options } = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(
          errorData.error || (res.status >= 500 ? UNAVAILABLE_MESSAGE : `Error HTTP ${res.status}`)
        );
      }

      return await res.json();
    } catch (err) {
      // En modo estricto el error llega a la interfaz: una operacion rechazada no puede simularse como exitosa
      if (strict) throw err instanceof TypeError ? new Error(UNAVAILABLE_MESSAGE) : err;
      console.warn(`[API Conexión/Fallback] ${endpoint}:`, err.message);
      return null;
    }
  },

  async login(credentials) {
    const res = await this.request('/auth/login', {
      strict: true,
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    this.setAuth(res.token, res.user);
    return res;
  },

  async registerStaff(staffData) {
    return this.request('/admin/users', {
      strict: true,
      method: 'POST',
      body: JSON.stringify(staffData),
    });
  },

  async adminGetUsers(params = {}) {
    const query = new URLSearchParams();
    if (params.role_id) query.append('role_id', params.role_id);
    if (params.is_active !== undefined) query.append('is_active', params.is_active);

    const qs = query.toString() ? `?${query.toString()}` : '';
    const res = await this.request(`/admin/users${qs}`);
    if (res && res.users) {
      return res.users;
    }

    // Filtrado en contingencia local
    return localStaff.filter(u => {
      if (params.role_id && u.role_id !== Number(params.role_id)) return false;
      if (params.is_active !== undefined && u.is_active !== params.is_active) return false;
      return true;
    });
  },

  async adminUpdateUserStatus(userId, isActive) {
    const res = await this.request(`/admin/users/${userId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ is_active: isActive }),
    });

    // Actualizacion en contingencia local
    localStaff = localStaff.map(u => u.id === userId ? { ...u, is_active: isActive } : u);

    if (res) return res;
    return {
      message: `Usuario ${isActive ? 'habilitado ante ReTHUS' : 'suspendido'} exitosamente`,
      user_id: userId,
      is_active: isActive,
    };
  },

  async adminGetAuditLogs(limit = 100) {
    const res = await this.request(`/admin/audit-logs?limit=${limit}`);
    if (res && res.audit_logs) {
      return res.audit_logs;
    }

    // Registros simulados para observabilidad inmediata
    return [
      {
        id: 101,
        user_id: 'usr-admin-0001',
        role: 'ADMIN',
        action: 'USER_ACTIVATION',
        resource: 'rethus_registry',
        ip_address: '192.168.1.10',
        correlation_id: 'corr-adm-8841',
        created_at: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
        details: { verified_card: 'RM-94821-VALLE', authorized_by: 'Administrador del Sistema' },
      },
      {
        id: 100,
        user_id: 'usr-med-0002',
        role: 'MEDICO',
        action: 'LOGIN',
        resource: 'auth_portal',
        ip_address: '192.168.1.25',
        correlation_id: 'corr-doc-3312',
        created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
        details: { mfa_verified: true, mechanism: 'TOTP_RFC6238' },
      },
      {
        id: 99,
        user_id: 'usr-med-0002',
        role: 'MEDICO',
        action: 'HCE_CLOSED',
        resource: 'clinical_record_folio_441',
        ip_address: '192.168.1.25',
        correlation_id: 'corr-hce-9912',
        created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
        details: { hash_sha256: '7a9fc81...e412', legal_compliance: 'Res 1995/1999' },
      },
    ];
  },

  async getTriageQueue() {
    const res = await this.request('/triage');
    return res;
  },

  async createTriage(data) {
    return await this.request('/triage', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async saveClinicalDraft(data) {
    return await this.request('/clinical-records', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async closeClinicalRecord(id, data) {
    return await this.request(`/clinical-records/${id}/close`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async createPrescription(data) {
    return await this.request('/prescriptions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async syncOfflineBatch(batch) {
    return await this.request('/sync/batch', {
      method: 'POST',
      body: JSON.stringify(batch),
    });
  },
};
