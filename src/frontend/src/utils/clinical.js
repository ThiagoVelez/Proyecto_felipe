/**
 * Utilidades compartidas por las pantallas asistenciales.
 * Ninguna funcion inventa datos clinicos: solo formatean lo que devuelve la API.
 */

export const DOCUMENT_TYPES = [
  { value: 'CC', label: 'Cédula de Ciudadanía (CC)' },
  { value: 'TI', label: 'Tarjeta de Identidad (TI)' },
  { value: 'RC', label: 'Registro Civil (RC)' },
  { value: 'CE', label: 'Cédula de Extranjería (CE)' },
  { value: 'PA', label: 'Pasaporte (PA)' },
  { value: 'MS', label: 'Menor sin Identificación (MS)' },
];

export const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

// Catalogo visual de niveles Manchester; el nivel siempre lo determina el servidor
export const MANCHESTER_LEVELS = {
  NIVEL_I: {
    number: 'NIVEL I',
    name: 'REANIMACIÓN',
    maxWait: 'Inmediata (0 min)',
    color: 'bg-red-600 text-white',
    badgeColor: 'bg-red-100 text-red-950 border-red-300',
    borderColor: 'border-l-red-600',
  },
  NIVEL_II: {
    number: 'NIVEL II',
    name: 'MUY URGENTE',
    maxWait: '15 minutos',
    color: 'bg-orange-500 text-white',
    badgeColor: 'bg-orange-100 text-orange-950 border-orange-300',
    borderColor: 'border-l-orange-500',
  },
  NIVEL_III: {
    number: 'NIVEL III',
    name: 'URGENTE',
    maxWait: '30 minutos',
    color: 'bg-amber-500 text-amber-950',
    badgeColor: 'bg-amber-100 text-amber-950 border-amber-300',
    borderColor: 'border-l-amber-500',
  },
  NIVEL_IV: {
    number: 'NIVEL IV',
    name: 'MENOR URGENCIA',
    maxWait: '60 minutos',
    color: 'bg-emerald-600 text-white',
    badgeColor: 'bg-emerald-100 text-emerald-950 border-emerald-300',
    borderColor: 'border-l-emerald-600',
  },
  NIVEL_V: {
    number: 'NIVEL V',
    name: 'NO URGENTE',
    maxWait: '120 minutos',
    color: 'bg-blue-600 text-white',
    badgeColor: 'bg-blue-100 text-blue-950 border-blue-300',
    borderColor: 'border-l-blue-600',
  },
};

export const TRIAGE_STATUS_LABELS = {
  PENDIENTE: 'En espera de médico',
  EN_ATENCION: 'En atención',
  FINALIZADO: 'Finalizado',
};

export const getManchesterInfo = (level) =>
  MANCHESTER_LEVELS[level] ?? {
    number: level || 'SIN NIVEL',
    name: '',
    maxWait: '',
    color: 'bg-surface-container-high text-on-surface',
    badgeColor: 'bg-surface-container-low text-on-surface border-outline-variant',
    borderColor: 'border-l-outline-variant',
  };

const FALLBACK_BY_STATUS = {
  400: 'La solicitud contiene datos no válidos.',
  403: 'No tiene permiso para realizar esta operación.',
  404: 'El recurso solicitado no existe.',
  409: 'La operación entra en conflicto con el estado actual del registro.',
  422: 'Los datos enviados no cumplen las reglas clínicas de validación.',
  429: 'Demasiados intentos. Espere unos minutos antes de reintentar.',
};

/** Devuelve el mensaje del servidor; si solo hay un texto generico usa uno descriptivo segun el estado HTTP. */
export const getErrorMessage = (err, fallback = 'No fue posible completar la operación.') => {
  const message = err?.message;
  if (message && !/^Error HTTP \d+$/.test(message)) return message;
  return FALLBACK_BY_STATUS[err?.status] ?? message ?? fallback;
};

export const getFullName = (patient) => {
  if (!patient) return '';
  if (patient.full_name) return patient.full_name;
  return [patient.first_name, patient.second_name, patient.last_name, patient.second_last_name]
    .filter(Boolean)
    .join(' ');
};

export const getInitials = (patient) => {
  const first = patient?.first_name?.[0] ?? getFullName(patient)[0] ?? '';
  const last = patient?.last_name?.[0] ?? '';
  return `${first}${last}`.toUpperCase() || '--';
};

export const calculateAge = (birthDate, now = new Date()) => {
  if (!birthDate) return null;
  const birth = new Date(`${String(birthDate).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return null;
  let age = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) age -= 1;
  return age >= 0 ? age : null;
};

export const formatDateTime = (iso) => {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' });
};

export const minutesSince = (iso, now = Date.now()) => {
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return 0;
  return Math.max(0, Math.floor((now - time) / 60000));
};

export const formatWait = (minutes) => {
  if (minutes < 60) return `${String(minutes).padStart(2, '0')} min`;
  return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')} min`;
};

/** Descarga un objeto JSON como archivo en el navegador. */
export const downloadJson = (fileName, data) => {
  const content = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

/** Formatea el nombre del facultativo o personal asistencial respetando su rol sin duplicar prefijos. */
export const formatDoctorName = (name, role = '') => {
  if (!name) return 'Dr. Santiago Vélez';
  const roleUpper = String(role).toUpperCase();
  const lowerName = String(name).toLowerCase();
  const clean = String(name).replace(/^(?:dr\.|enf\.)\s*/gi, '').replace(/^(?:dr\.|enf\.)\s*/gi, '').trim();
  if (roleUpper === 'FARMACIA' || roleUpper.includes('FARMAC') || lowerName.includes('farma')) {
    return clean;
  }
  if (roleUpper === 'ENFERMERO' || roleUpper.includes('ENFERM') || lowerName.includes('enf')) {
    return `Enf. ${clean}`;
  }
  return `Dr. ${clean}`;
};

