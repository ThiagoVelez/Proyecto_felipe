/**
 * Cliente de comunicacion con el Backend Go/Fiber
 * Estandares: ISO/IEC 25010, Res. 1995 de 1999, Ley 1581 de 2012
 * Toda la informacion proviene del servidor: no existe respaldo simulado.
 */

const API_BASE = '/api/v1';
export const SESSION_EXPIRED_EVENT = 'saludconecta:session-expired';
const UNAVAILABLE_MESSAGE = 'El servicio no está disponible. Intente nuevamente en unos minutos.';

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

        // Un 401 fuera del login indica token invalido, expirado o cuenta desactivada
        if (res.status === 401 && endpoint !== '/auth/login' && this.token) {
          this.expireSession();
        }

        const error = new Error(
          errorData.error || (res.status >= 500 ? UNAVAILABLE_MESSAGE : `Error HTTP ${res.status}`)
        );
        error.status = res.status;
        error.data = errorData;
        throw error;
      }

      return await res.json();
    } catch (err) {
      // En modo estricto el error llega a la interfaz: una operacion rechazada no puede simularse como exitosa
      if (strict) throw err instanceof TypeError ? new Error(UNAVAILABLE_MESSAGE) : err;
      console.warn(`[API] ${endpoint}:`, err.message);
      return null;
    }
  },

  expireSession() {
    this.setAuth('', null);
    localStorage.removeItem('saludconecta_session_active');
    window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
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

  async me() {
    const res = await this.request('/auth/me', { strict: true });
    if (res?.user) {
      this.setAuth(this.token, res.user);
    }
    return res?.user ?? null;
  },

  async setupMfa(currentCode) {
    return this.request('/auth/mfa/setup', {
      strict: true,
      method: 'POST',
      body: JSON.stringify(currentCode ? { current_code: currentCode } : {}),
    });
  },

  async enableMfa(code) {
    return this.request('/auth/mfa/enable', {
      strict: true,
      method: 'POST',
      body: JSON.stringify({ code }),
    });
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
    const res = await this.request(`/admin/users${qs}`, { strict: true });
    return res?.users ?? [];
  },

  async adminUpdateUserStatus(userId, isActive) {
    return this.request(`/admin/users/${userId}/status`, {
      strict: true,
      method: 'PATCH',
      body: JSON.stringify({ is_active: isActive }),
    });
  },

  async adminGetAuditLogs(limit = 100) {
    const res = await this.request(`/admin/audit-logs?limit=${limit}`, { strict: true });
    return res?.audit_logs ?? [];
  },

  async listPatients({ limit = 50, offset = 0 } = {}) {
    const res = await this.request(`/patients?limit=${limit}&offset=${offset}`, { strict: true });
    return res?.patients ?? [];
  },

  async lookupPatient(documentType, documentNumber) {
    const query = new URLSearchParams({ document_type: documentType, document_number: documentNumber });
    return this.request(`/patients/lookup?${query.toString()}`, { strict: true });
  },

  async getPatient(id) {
    return this.request(`/patients/${encodeURIComponent(id)}`, { strict: true });
  },

  async createPatient(data) {
    return this.request('/patients', {
      strict: true,
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async addPatientAllergy(patientId, data) {
    return this.request(`/patients/${encodeURIComponent(patientId)}/allergies`, {
      strict: true,
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getTriageQueue() {
    const res = await this.request('/triage', { strict: true });
    return Array.isArray(res) ? res : [];
  },

  async createTriage(data) {
    return this.request('/triage', {
      strict: true,
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateTriageStatus(id, status) {
    return this.request(`/triage/${encodeURIComponent(id)}/status`, {
      strict: true,
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  async saveClinicalDraft(data) {
    return this.request('/clinical-records', {
      strict: true,
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async closeClinicalRecord(id, data) {
    return this.request(`/clinical-records/${encodeURIComponent(id)}/close`, {
      strict: true,
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getPatientRecords(patientId) {
    const res = await this.request(`/clinical-records/patient/${encodeURIComponent(patientId)}`, { strict: true });
    return Array.isArray(res) ? res : [];
  },

  async verifyClinicalRecord(id) {
    return this.request(`/clinical-records/${encodeURIComponent(id)}/verify`, { strict: true });
  },

  async exportClinicalRecord(id, format) {
    return this.request(`/clinical-records/${encodeURIComponent(id)}/${format}`, { strict: true });
  },

  async addClarification(id, note) {
    return this.request(`/clinical-records/${encodeURIComponent(id)}/clarifications`, {
      strict: true,
      method: 'POST',
      body: JSON.stringify({ note }),
    });
  },

  async searchMedications(q = '') {
    const res = await this.request(`/medications?q=${encodeURIComponent(q)}`, { strict: true });
    return res?.medications ?? [];
  },

  async createPrescription(data) {
    return this.request('/prescriptions', {
      strict: true,
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async syncOfflineBatch(batch) {
    return this.request('/sync/batch', {
      strict: true,
      method: 'POST',
      body: JSON.stringify(batch),
    });
  },
};
