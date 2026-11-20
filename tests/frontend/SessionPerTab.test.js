import { describe, it, expect, afterEach } from 'vitest';
import { apiClient } from '../../src/frontend/src/services/api';
import { migrateLegacySession, sessionStore } from '../../src/frontend/src/services/session';

afterEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

describe('Sesión por pestaña', () => {
  it('guarda el token y el usuario solo en la pestaña, no en el almacenamiento compartido', () => {
    apiClient.setAuth('acc-medico', { id: 'u-med', role: 'MEDICO' }, 'ref-medico');

    expect(sessionStorage.getItem('saludconecta_token')).toBe('acc-medico');
    expect(JSON.parse(sessionStorage.getItem('saludconecta_user')).role).toBe('MEDICO');
    expect(localStorage.getItem('saludconecta_token')).toBeNull();
    expect(localStorage.getItem('saludconecta_user')).toBeNull();
    apiClient.setAuth('', null, '');
  });

  it('adopta una sesión antigua de localStorage una sola vez y la retira del almacenamiento compartido', () => {
    localStorage.setItem('saludconecta_token', 'acc-antiguo');
    localStorage.setItem('saludconecta_user', JSON.stringify({ id: 'u1', role: 'ADMIN' }));
    localStorage.setItem('saludconecta_current_view', 'admin_users');

    migrateLegacySession();

    expect(sessionStore.getItem('saludconecta_token')).toBe('acc-antiguo');
    expect(sessionStore.getItem('saludconecta_current_view')).toBe('admin_users');
    expect(localStorage.getItem('saludconecta_token')).toBeNull();
    expect(localStorage.getItem('saludconecta_user')).toBeNull();
  });

  it('no sobrescribe la sesión de la pestaña con una antigua', () => {
    sessionStorage.setItem('saludconecta_token', 'acc-pestaña');
    localStorage.setItem('saludconecta_token', 'acc-otro');

    migrateLegacySession();

    expect(sessionStore.getItem('saludconecta_token')).toBe('acc-pestaña');
    expect(localStorage.getItem('saludconecta_token')).toBeNull();
  });
});
