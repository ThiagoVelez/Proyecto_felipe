/**
 * Almacenamiento de la sesion por pestaña.
 *
 * El token, el usuario y la vista actual viven en sessionStorage: cada pestaña o ventana
 * conserva su propia sesion al recargar (F5) y abrir otro perfil en otra ventana no
 * reemplaza la sesion de las demas. localStorage se comparte entre todas las pestañas
 * del navegador, por eso antes al recargar se abria el ultimo perfil iniciado.
 */

export const SESSION_KEYS = [
  'saludconecta_token',
  'saludconecta_refresh_token',
  'saludconecta_user',
  'saludconecta_session_active',
  'saludconecta_current_view',
];

function storage() {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export const sessionStore = {
  getItem(key) {
    try {
      return storage()?.getItem(key) ?? null;
    } catch {
      return null;
    }
  },
  setItem(key, value) {
    try {
      storage()?.setItem(key, value);
    } catch {
      /* almacenamiento no disponible: la sesion queda solo en memoria */
    }
  },
  removeItem(key) {
    try {
      storage()?.removeItem(key);
    } catch {
      /* nada que borrar */
    }
  },
  clear() {
    SESSION_KEYS.forEach((key) => this.removeItem(key));
  },
};

// Versiones anteriores guardaban la sesion en localStorage, compartida por todas las pestañas.
// La primera pestaña que carga esta version la adopta como propia y la retira de localStorage.
export function migrateLegacySession() {
  try {
    const legacyToken = window.localStorage.getItem('saludconecta_token');
    if (legacyToken && !sessionStore.getItem('saludconecta_token')) {
      SESSION_KEYS.forEach((key) => {
        const value = window.localStorage.getItem(key);
        if (value !== null) sessionStore.setItem(key, value);
      });
    }
    SESSION_KEYS.forEach((key) => window.localStorage.removeItem(key));
  } catch {
    /* sin acceso a localStorage */
  }
}

// DEF-76: datos clínicos que versiones anteriores dejaban en localStorage (compartido entre usuarios del equipo).
// Hoy viven en el servidor; se borran al cargar la aplicación y al cerrar sesión.
const CLINICAL_LEGACY_KEYS = ['saludconecta_lab_orders', 'saludconecta_nurse_orders', 'saludconecta_admin_branches',
  'saludconecta_admin_medicines', 'saludconecta_pharmacy_reports', 'saludconecta_profile_custom', 'saludconecta_avatar'];
const CLINICAL_LEGACY_PREFIXES = ['saludconecta_nurse_checklist_'];

export function purgeClinicalStorage() {
  try {
    CLINICAL_LEGACY_KEYS.forEach((key) => window.localStorage.removeItem(key));
    Object.keys(window.localStorage).forEach((key) => {
      if (CLINICAL_LEGACY_PREFIXES.some((prefix) => key.startsWith(prefix))) window.localStorage.removeItem(key);
    });
  } catch {
    /* sin acceso a localStorage */
  }
}

migrateLegacySession();
purgeClinicalStorage();
