/**
 * Rol del usuario a partir de la sesión emitida por el servidor (DEF-80).
 *
 * Antes varias pantallas deducían el rol del nombre o la especialidad («Dra. …» = médico, «enf» = enfermería),
 * de modo que un médico de «Enfermedades infecciosas» recibía el menú de enfermería. El rol válido es solo el
 * `role` o el `role_id` que entrega el backend.
 */
const ROLE_BY_ID = {
  1: 'ADMIN',
  2: 'MEDICO',
  3: 'ENFERMERO',
  4: 'ADMISION',
  5: 'AUDITOR',
  6: 'FARMACIA',
  7: 'LABORATORIO',
  8: 'TI',
};

export function userRole(user) {
  if (!user) return '';
  const byName = String(user.role || user.role_name || '').toUpperCase();
  if (byName === 'ENFERMERA') return 'ENFERMERO';
  if (Object.values(ROLE_BY_ID).includes(byName)) return byName;
  return ROLE_BY_ID[Number(user.role_id)] || '';
}

export const hasRole = (user, ...roles) => roles.includes(userRole(user));
