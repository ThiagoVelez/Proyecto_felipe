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
  refreshToken: localStorage.getItem('saludconecta_refresh_token') || '',
  user: JSON.parse(localStorage.getItem('saludconecta_user') || 'null'),
  _refreshPromise: null,

  setAuth(token, user, refreshToken) {
    this.token = token || '';
    this.user = user;
    if (refreshToken !== undefined) {
      this.refreshToken = refreshToken || '';
    }
    if (this.token) {
      localStorage.setItem('saludconecta_token', this.token);
      localStorage.setItem('saludconecta_user', JSON.stringify(user));
      if (this.refreshToken) {
        localStorage.setItem('saludconecta_refresh_token', this.refreshToken);
      } else {
        localStorage.removeItem('saludconecta_refresh_token');
      }
    } else {
      this.refreshToken = '';
      localStorage.removeItem('saludconecta_token');
      localStorage.removeItem('saludconecta_user');
      localStorage.removeItem('saludconecta_refresh_token');
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

        const isAuthEndpoint =
          endpoint === '/auth/login' ||
          endpoint === '/auth/refresh' ||
          endpoint === '/auth/logout';

        // Intento de renovacion transparente ante expiracion del Access Token (401), maximo 1 reintento
        if (res.status === 401 && !isAuthEndpoint && this.refreshToken && !options._isRetry) {
          try {
            await this.refreshSession();
            // Reintenta la peticion con el nuevo access token exactamente UNA vez
            return await this.request(endpoint, { ...options, strict, _isRetry: true });
          } catch {
            const error = new Error(
              errorData.error || (res.status >= 500 ? UNAVAILABLE_MESSAGE : `Error HTTP ${res.status}`)
            );
            error.status = 401;
            error.data = errorData;
            if (strict) throw error;
            return null;
          }
        }

        // Un 401 fuera del login indica token invalido, expirado o cuenta desactivada
        if (res.status === 401 && !isAuthEndpoint && this.token) {
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

  async refreshSession() {
    if (this._refreshPromise) {
      return this._refreshPromise;
    }

    this._refreshPromise = (async () => {
      try {
        if (!this.refreshToken) {
          throw new Error('No hay refresh token disponible');
        }

        const res = await fetch(`${API_BASE}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: this.refreshToken }),
        });

        if (!res.ok) {
          throw new Error('Token de renovacion rechazado o expirado');
        }

        const data = await res.json();
        const nextAccess = data.access_token || data.token;
        this.setAuth(nextAccess, data.user, data.refresh_token);
        return data;
      } catch (err) {
        this.expireSession();
        throw err;
      } finally {
        this._refreshPromise = null;
      }
    })();

    return this._refreshPromise;
  },

  expireSession() {
    this.setAuth('', null, '');
    localStorage.removeItem('saludconecta_session_active');
    window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
  },

  async login(credentials) {
    const res = await this.request('/auth/login', {
      strict: true,
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    this.setAuth(res.token || res.access_token, res.user, res.refresh_token);
    return res;
  },

  async logout() {
    try {
      if (this.refreshToken) {
        await fetch(`${API_BASE}/auth/logout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: this.refreshToken }),
        });
      }
    } catch {
      // Ignora error de red en cierre
    } finally {
      this.setAuth('', null, '');
    }
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

  async getMfaSeed(email) {
    return this.request(`/auth/mfa-seed?email=${encodeURIComponent(email || '')}`, {
      strict: false,
      method: 'GET',
    });
  },

  async registerAdmin(adminData) {
    return this.request('/auth/register-admin', {
      strict: true,
      method: 'POST',
      body: JSON.stringify(adminData),
    });
  },

  // Estado del registro inicial que ofrece el login (publico): Encargado de TI y sedes sin administrador
  async getSetupStatus() {
    return this.request('/auth/setup-status', { strict: true, method: 'GET' });
  },

  // Registro publico del Encargado de TI: el servidor lo rechaza si ya existe uno
  async registerTI(data) {
    return this.request('/auth/register-ti', {
      strict: true,
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Registro publico del primer administrador de una sede: el servidor lo rechaza si la sede ya tiene uno
  async registerBranchAdmin(data) {
    return this.request('/auth/register-branch-admin', {
      strict: true,
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Panel del Encargado de TI
  async tiGetOverview() {
    return this.request('/ti/overview', { strict: true });
  },

  async tiGetUsers() {
    const res = await this.request('/ti/users', { strict: true });
    return res?.users ?? [];
  },

  async tiSetAdminStatus(userId, isActive) {
    return this.request(`/ti/admins/${encodeURIComponent(userId)}/status`, {
      strict: true,
      method: 'PATCH',
      body: JSON.stringify({ is_active: isActive }),
    });
  },

  async tiGetAuditLogs(limit = 100) {
    const res = await this.request(`/ti/audit-logs?limit=${limit}`, { strict: true });
    return res?.audit_logs ?? [];
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

  async updatePatientContact(patientId, data) {
    return this.request(`/patients/${encodeURIComponent(patientId)}`, {
      strict: true,
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deletePatient(patientId) {
    return this.request(`/patients/${encodeURIComponent(patientId)}`, {
      strict: true,
      method: 'DELETE',
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

  // Kit Informatico Medico (Escala EVA y Modelo Anatomico Interactivo)
  async getRecordAnatomicalNotes(recordId) {
    const res = await this.request(`/clinical-records/${encodeURIComponent(recordId)}/anatomical-notes`, { strict: true });
    return Array.isArray(res) ? res : [];
  },

  async getPatientAnatomicalNotes(patientId) {
    const res = await this.request(`/patients/${encodeURIComponent(patientId)}/anatomical-notes`, { strict: true });
    return Array.isArray(res) ? res : [];
  },

  async createAnatomicalNote(data) {
    const url = data.clinical_record_id
      ? `/clinical-records/${encodeURIComponent(data.clinical_record_id)}/anatomical-notes`
      : `/patients/${encodeURIComponent(data.patient_id)}/anatomical-notes`;
    return this.request(url, {
      strict: true,
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateAnatomicalNote(noteId, data) {
    return this.request(`/anatomical-notes/${encodeURIComponent(noteId)}`, {
      strict: true,
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteAnatomicalNote(noteId) {
    return this.request(`/anatomical-notes/${encodeURIComponent(noteId)}`, {
      strict: true,
      method: 'DELETE',
    });
  },

  async updatePainAndMapping(recordId, data) {
    return this.request(`/clinical-records/${encodeURIComponent(recordId)}/pain-mapping`, {
      strict: true,
      method: 'PUT',
      body: JSON.stringify(data),
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

  // =========================================================================
  // METODOS API V2: AGENDAMIENTO, SEGUIMIENTO TRIPARTITO Y FARMACIA PDF417
  // =========================================================================

  async requestV2(endpoint, { strict = false, ...options } = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    const res = await fetch(`/api/v2${endpoint}`, {
      ...options,
      headers,
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      const error = new Error(
        errorData.error || (res.status >= 500 ? UNAVAILABLE_MESSAGE : `Error HTTP ${res.status}`)
      );
      error.status = res.status;
      error.data = errorData;
      throw error;
    }
    return res.json();
  },

  async createAppointment(data) {
    return this.requestV2('/appointments', {
      strict: true,
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getDoctorAppointments(doctorId = '') {
    const endpoint = doctorId ? `/appointments/doctor/${encodeURIComponent(doctorId)}` : '/appointments';
    return this.requestV2(endpoint, { strict: true });
  },

  async getAppointmentsByRange(doctorId, start, end) {
    const params = new URLSearchParams();
    if (doctorId) params.set('doctor_id', doctorId);
    if (start) params.set('start', start);
    if (end) params.set('end', end);
    return this.requestV2(`/appointments?${params.toString()}`, { strict: true });
  },

  // Laboratorio (ordenes en el servidor)
  async getLabOrders(status = '') {
    const qs = status ? `?status=${encodeURIComponent(status)}` : '';
    const res = await this.requestV2(`/lab-orders${qs}`, { strict: true });
    return res?.orders ?? [];
  },

  async createLabOrder(data) {
    return this.requestV2('/lab-orders', { strict: true, method: 'POST', body: JSON.stringify(data) });
  },

  async saveLabProgress(id, results, methodNotes) {
    return this.requestV2(`/lab-orders/${encodeURIComponent(id)}/progress`, {
      strict: true,
      method: 'PUT',
      body: JSON.stringify({ results, method_notes: methodNotes }),
    });
  },

  async sealLabOrder(id, results, methodNotes) {
    return this.requestV2(`/lab-orders/${encodeURIComponent(id)}/seal`, {
      strict: true,
      method: 'POST',
      body: JSON.stringify({ results, method_notes: methodNotes }),
    });
  },

  async dispatchLabOrder(id, email, copyDoctor) {
    return this.requestV2(`/lab-orders/${encodeURIComponent(id)}/dispatch`, {
      strict: true,
      method: 'POST',
      body: JSON.stringify({ email, copy_doctor: copyDoctor }),
    });
  },

  // Enfermeria (registro por paciente en el servidor)
  async getNursingRecords() {
    const res = await this.requestV2('/nursing', { strict: true });
    return res?.records ?? [];
  },

  async getNursingRecord(patientId) {
    return this.requestV2(`/nursing/${encodeURIComponent(patientId)}`, { strict: true });
  },

  async assignNursingOrder(patientId, order, medications) {
    return this.requestV2(`/nursing/${encodeURIComponent(patientId)}/order`, {
      strict: true,
      method: 'PUT',
      body: JSON.stringify({ order, medications }),
    });
  },

  async saveNursingDuties(patientId, duties) {
    return this.requestV2(`/nursing/${encodeURIComponent(patientId)}/duties`, {
      strict: true,
      method: 'PUT',
      body: JSON.stringify({ duties }),
    });
  },

  async addNursingNote(patientId, content) {
    return this.requestV2(`/nursing/${encodeURIComponent(patientId)}/notes`, {
      strict: true,
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  },

  // Sedes (catalogo del servidor)
  async getBranches() {
    const res = await this.request('/branches', { strict: true, method: 'GET' });
    return res?.branches ?? [];
  },

  async adminCreateBranch(data) {
    return this.request('/admin/branches', { strict: true, method: 'POST', body: JSON.stringify(data) });
  },

  async adminUpdateBranch(id, data) {
    return this.request(`/admin/branches/${encodeURIComponent(id)}`, { strict: true, method: 'PUT', body: JSON.stringify(data) });
  },

  async adminDeleteBranch(id) {
    const headers = { 'Content-Type': 'application/json' };
    if (this.token) headers.Authorization = `Bearer ${this.token}`;
    const res = await fetch(`${API_BASE}/admin/branches/${encodeURIComponent(id)}`, { method: 'DELETE', headers });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const error = new Error(data.error || `Error HTTP ${res.status}`);
      error.status = res.status;
      throw error;
    }
    return true;
  },

  // Portal publico del paciente (sin sesion)
  async getPublicBranches() {
    const res = await this.request('/public/branches', { strict: true, method: 'GET' });
    return res?.branches ?? [];
  },

  async submitAppointmentRequest(data) {
    return this.request('/public/appointment-requests', {
      strict: true,
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Bandeja de solicitudes de primera cita del medico
  async getAppointmentRequests(status = '') {
    const qs = status ? `?status=${encodeURIComponent(status)}` : '';
    const res = await this.requestV2(`/appointment-requests${qs}`, { strict: true });
    return res?.requests ?? [];
  },

  async getAppointmentRequestsPendingCount() {
    const res = await this.requestV2('/appointment-requests/pending-count', { strict: true });
    return res?.pending ?? 0;
  },

  async scheduleAppointmentRequest(id, appointmentDate, note = '') {
    return this.requestV2(`/appointment-requests/${encodeURIComponent(id)}/schedule`, {
      strict: true,
      method: 'POST',
      body: JSON.stringify({ appointment_date: appointmentDate, note }),
    });
  },

  async rejectAppointmentRequest(id, note) {
    return this.requestV2(`/appointment-requests/${encodeURIComponent(id)}/reject`, {
      strict: true,
      method: 'POST',
      body: JSON.stringify({ note }),
    });
  },

  async dispatchTreatment(data) {
    return this.requestV2('/treatments/dispatch', {
      strict: true,
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getTreatment(id) {
    return this.requestV2(`/treatments/${encodeURIComponent(id)}`, { strict: true });
  },

  async getPharmacyInbox(status = '', query = '') {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (query) params.set('q', query);
    const qs = params.toString();
    return this.requestV2(`/pharmacy/inbox${qs ? `?${qs}` : ''}`, { strict: true });
  },

  async getPharmacyInventory() {
    return this.requestV2('/pharmacy/inventory', { strict: true });
  },

  async addInventoryItem(data) {
    return this.requestV2('/pharmacy/inventory', {
      strict: true,
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateInventoryItem(id, data) {
    return this.requestV2(`/pharmacy/inventory/${encodeURIComponent(id)}`, {
      strict: true,
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteInventoryItem(id) {
    return this.requestV2(`/pharmacy/inventory/${encodeURIComponent(id)}`, {
      strict: true,
      method: 'DELETE',
    });
  },

  async adjustInventoryStock(id, stockQuantity, batchNumber) {
    return this.requestV2(`/pharmacy/inventory/${encodeURIComponent(id)}/stock`, {
      strict: true,
      method: 'PATCH',
      body: JSON.stringify({ stock_quantity: stockQuantity, batch_number: batchNumber }),
    });
  },

  async lookupPrescription(term) {
    return this.requestV2(`/pharmacy/prescriptions/lookup?term=${encodeURIComponent(term)}`, { strict: true });
  },

  async dispensePrescription(data) {
    return this.requestV2('/pharmacy/dispense', {
      strict: true,
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getPharmacyStockReports(status = '') {
    const qs = status && status !== 'TODOS' ? `?status=${encodeURIComponent(status)}` : '';
    return this.requestV2(`/pharmacy/reports${qs}`, { strict: true });
  },

  async checkPharmacyStockAlerts() {
    return this.requestV2('/pharmacy/reports/check', {
      strict: true,
      method: 'POST',
    });
  },

  async resolvePharmacyStockReport(id, notes = '', resolvedBy = '') {
    return this.requestV2(`/pharmacy/reports/${encodeURIComponent(id)}/resolve`, {
      strict: true,
      method: 'PATCH',
      body: JSON.stringify({ notes, resolved_by: resolvedBy }),
    });
  },

  async getPharmacyMetrics() {
    return this.requestV2('/pharmacy/metrics', { strict: true });
  },

  // =========================================================================
  // METODOS DEL MURO DE SALUD Y CONCIENTIZACIÓN (KIT INFORMÁTICO MÉDICO)
  // =========================================================================

  async getHealthEducationPosts(category = '') {
    const query = category && category !== 'TODOS' ? `?category=${encodeURIComponent(category)}` : '';
    return this.request(`/health-education${query}`, { strict: true });
  },

  async getHealthEducationPost(id) {
    return this.request(`/health-education/${encodeURIComponent(id)}`, { strict: true });
  },

  async createHealthEducationPost(data) {
    return this.request('/health-education', {
      strict: true,
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateHealthEducationPost(id, data) {
    return this.request(`/health-education/${encodeURIComponent(id)}`, {
      strict: true,
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteHealthEducationPost(id) {
    return this.request(`/health-education/${encodeURIComponent(id)}`, {
      strict: true,
      method: 'DELETE',
    });
  },
};

export default apiClient;
