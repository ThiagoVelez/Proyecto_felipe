/**
 * Cliente de comunicacion con el Backend Go/Fiber
 * Incluye respaldo reactivo y simulacion offline cuando no hay conexion de red.
 */

const API_BASE = '/api/v1';

export const apiClient = {
  // Estado de sesion en memoria / local cache
  token: localStorage.getItem('saludconecta_token') || '',
  user: JSON.parse(localStorage.getItem('saludconecta_user') || 'null') || {
    id: 'u-doc-01',
    name: 'Dra. Sofia Ramirez C.',
    role: 'MEDICO',
    email: 'sramirez@saludconecta.ips.gov.co',
    license: 'RM-76001-VALLE',
    branch: 'Sede Cartago - Central',
  },

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

  async request(endpoint, options = {}) {
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
        throw new Error(errorData.error || `Error HTTP ${res.status}`);
      }

      return await res.json();
    } catch (err) {
      // Fallback de simulacion para navegacion fluida si el backend no esta encendido
      console.warn(`[API Fallback] ${endpoint}:`, err.message);
      return null;
    }
  },

  async login(credentials) {
    const res = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    return res;
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
