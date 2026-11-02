import { vi } from 'vitest';

/**
 * Simula el backend interceptando fetch. Cada ruta se declara como "METODO /ruta"
 * (sin query) y puede ser un objeto { status, body } o una funcion (peticion) => objeto.
 * Devuelve el espia y la lista de llamadas registradas para poder verificar los cuerpos enviados.
 */
export const mockApi = (routes) => {
  const calls = [];
  const spy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init = {}) => {
    const method = (init.method || 'GET').toUpperCase();
    const path = String(url).replace('/api/v1', '').split('?')[0];
    const request = { method, path, body: init.body ? JSON.parse(init.body) : undefined, url: String(url) };
    calls.push(request);

    const handler = routes[`${method} ${path}`];
    const result = handler
      ? typeof handler === 'function'
        ? handler(request)
        : handler
      : { status: 404, body: { error: `Ruta no simulada: ${method} ${path}` } };

    return new Response(JSON.stringify(result.body ?? {}), {
      status: result.status ?? 200,
      headers: { 'Content-Type': 'application/json' },
    });
  });
  return { spy, calls };
};

export const TEST_PATIENT = {
  id: 'pat-1',
  document_type: 'CC',
  document_number: '1118000111',
  first_name: 'Lucia',
  second_name: '',
  last_name: 'Prado',
  second_last_name: 'Rios',
  birth_date: '1990-05-14',
  gender: 'F',
  blood_type: 'O+',
  eps_name: 'Nueva EPS',
  affiliation_status: 'ACTIVO',
  full_name: 'Lucia Prado Rios',
  allergies: [
    { id: 'al-1', patient_id: 'pat-1', active_ingredient: 'Penicilina', severity: 'SEVERA', notes: 'Anafilaxia previa' },
  ],
};

export const buildRecord = (overrides = {}) => ({
  id: 'rec-1',
  patient_id: 'pat-1',
  doctor_id: 'doc-1',
  doctor_name: 'Dra. Marta Ibarra',
  anamnesis: 'Dolor toracico de dos horas',
  physical_exam: 'Murmullo vesicular conservado',
  cie11_code: 'BA00',
  diagnosis_description: 'Hipertension esencial',
  treatment_plan: 'Control de presion arterial',
  is_closed: false,
  signature_token: null,
  previous_hash: '',
  hash_sha256: '',
  created_at: '2026-11-02T10:00:00Z',
  closed_at: null,
  clarifications: [],
  ...overrides,
});
