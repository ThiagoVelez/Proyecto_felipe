import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import AuthScreen from '../../src/frontend/src/screens/AuthScreen';
import AdminDashboardScreen from '../../src/frontend/src/screens/admin/AdminDashboardScreen';
import TiAdminsView from '../../src/frontend/src/screens/ti/TiAdminsView';
import TiMonitorView from '../../src/frontend/src/screens/ti/TiMonitorView';
import { mockApi } from './helpers/mockApi';

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

const SEDES = [
  'Sede Cartago - Hospital Central',
  'Sede La Unión - Urgencias',
  'Sede Tuluá - Ambulatoria',
  'Brigada Rural Desconectada',
];

const status = (tiRegistered, sedesConAdmin, tiSetupEnabled = true) => ({
  ti_registered: tiRegistered,
  ti_setup_enabled: tiSetupEnabled,
  branches: SEDES.map((name) => ({ name, has_admin: sedesConAdmin.includes(name) })),
});

const createdUser = (overrides) => ({
  status: 201,
  body: {
    user: { id: 'nuevo', email: 'nuevo@ips.example', full_name: 'Cuenta Nueva', branch: SEDES[0], ...overrides },
    mfa_secret: 'JBSWY3DPEHPK3PXP',
    otpauth_uri: 'otpauth://totp/SaludConecta:nuevo@ips.example?secret=JBSWY3DPEHPK3PXP',
  },
});

const fillRegistration = (fullNameLabel) => {
  fireEvent.change(screen.getByLabelText(fullNameLabel), { target: { value: 'Cuenta Nueva' } });
  fireEvent.change(screen.getByLabelText(/Número de Documento/i), { target: { value: '11223344' } });
  fireEvent.change(screen.getByLabelText(/Correo Institucional \*/i), { target: { value: 'nuevo@ips.example' } });
  fireEvent.change(screen.getByLabelText(/Contraseña Maestra/i), { target: { value: 'ClaveSegura2026*' } });
  fireEvent.change(screen.getByLabelText(/Confirmar Contraseña/i), { target: { value: 'ClaveSegura2026*' } });
};

describe('Login - Registro inicial controlado por el servidor', () => {
  it('ofrece registrar al Encargado de TI y al administrador de sede cuando faltan', async () => {
    mockApi({ 'GET /auth/setup-status': { body: status(false, [SEDES[0]]) } });
    render(<AuthScreen />);

    expect(await screen.findByRole('button', { name: /Registrar Encargado de TI/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Registrar Administrador de Sede/i })).toBeInTheDocument();
  });

  it('oculta ambos botones cuando ya hay Encargado de TI y todas las sedes tienen administrador', async () => {
    const { calls } = mockApi({ 'GET /auth/setup-status': { body: status(true, SEDES) } });
    render(<AuthScreen />);

    await waitFor(() => expect(calls.some((c) => c.path === '/auth/setup-status')).toBe(true));
    expect(screen.queryByRole('button', { name: /Registrar Encargado de TI/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Registrar Administrador de Sede/i })).not.toBeInTheDocument();
  });

  it('no ofrece registrar al Encargado de TI si el servidor no tiene código de instalación', async () => {
    const { calls } = mockApi({ 'GET /auth/setup-status': { body: status(false, [], false) } });
    render(<AuthScreen />);

    await waitFor(() => expect(calls.some((c) => c.path === '/auth/setup-status')).toBe(true));
    expect(await screen.findByRole('button', { name: /Registrar Administrador de Sede/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Registrar Encargado de TI/i })).not.toBeInTheDocument();
  });

  it('no ofrece ningún registro si el servidor no responde', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));
    render(<AuthScreen />);

    await waitFor(() => expect(spy).toHaveBeenCalled());
    expect(screen.queryByRole('button', { name: /Registrar Encargado de TI/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Registrar Administrador de Sede/i })).not.toBeInTheDocument();
  });

  it('registra al Encargado de TI y oculta el botón cuando el servidor confirma que ya existe', async () => {
    let tiRegistered = false;
    const { calls } = mockApi({
      'GET /auth/setup-status': () => ({ body: status(tiRegistered, SEDES) }),
      'POST /auth/register-ti': () => {
        tiRegistered = true;
        return createdUser({ role: 'TI', role_id: 8 });
      },
    });
    render(<AuthScreen />);

    fireEvent.click(await screen.findByRole('button', { name: /Registrar Encargado de TI/i }));
    expect(screen.getByText('Registro del Encargado de TI')).toBeInTheDocument();
    fillRegistration(/Nombre Completo del Encargado de TI/i);

    // Sin código de instalación el formulario no se envía (campo obligatorio)
    expect(screen.getByLabelText(/Código de Instalación/i)).toBeRequired();
    fireEvent.click(screen.getByRole('button', { name: /Confirmar registro del Encargado de TI/i }));
    await new Promise((r) => setTimeout(r, 50));
    expect(calls.some((c) => c.path === '/auth/register-ti')).toBe(false);

    fireEvent.change(screen.getByLabelText(/Código de Instalación/i), { target: { value: 'codigo-de-la-sede-2026' } });
    fireEvent.click(screen.getByRole('button', { name: /Confirmar registro del Encargado de TI/i }));

    expect(await screen.findByText(/Encargado de TI Registrado y Habilitado/i)).toBeInTheDocument();
    const registro = calls.find((c) => c.path === '/auth/register-ti');
    expect(registro.method).toBe('POST');
    expect(registro.body).toMatchObject({
      full_name: 'Cuenta Nueva',
      email: 'nuevo@ips.example',
      setup_code: 'codigo-de-la-sede-2026',
    });

    fireEvent.click(screen.getByRole('button', { name: /Ir al Inicio de Sesión/i }));
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: /Registrar Encargado de TI/i })).not.toBeInTheDocument()
    );
    expect(screen.getByPlaceholderText(/Ej: usuario@saludconecta/i)).toHaveValue('nuevo@ips.example');
  });

  it('el registro de administrador de sede solo ofrece las sedes sin administrador', async () => {
    const { calls } = mockApi({
      'GET /auth/setup-status': { body: status(true, [SEDES[0], SEDES[1]]) },
      'POST /auth/register-branch-admin': createdUser({ role: 'ADMIN', role_id: 1, branch: SEDES[2], is_active: false }),
    });
    render(<AuthScreen />);

    fireEvent.click(await screen.findByRole('button', { name: /Registrar Administrador de Sede/i }));
    const select = screen.getByLabelText(/Sede sin administrador/i);
    const opciones = within(select).getAllByRole('option').map((o) => o.value);
    expect(opciones).toEqual([SEDES[2], SEDES[3]]);

    fillRegistration(/Nombre Completo del Administrador/i);
    fireEvent.click(screen.getByRole('button', { name: /Confirmar registro de administrador/i }));

    await waitFor(() => expect(calls.some((c) => c.path === '/auth/register-branch-admin')).toBe(true));
    const solicitud = calls.find((c) => c.path === '/auth/register-branch-admin').body;
    expect(solicitud.branch).toBe(SEDES[2]);
    expect(solicitud.setup_code).toBeUndefined();
    expect(await screen.findByText(/Pendiente de Aprobación/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Ir al Inicio de Sesión/i }));
    expect(await screen.findByText(/cuando el Encargado de TI apruebe su cuenta/i)).toBeInTheDocument();
  });
});

describe('Encargado de TI - Panel', () => {
  const admin = {
    id: 'adm-1',
    full_name: 'Admin Cartago',
    email: 'admin.cartago@ips.example',
    role_id: 1,
    is_active: true,
    branch: SEDES[0],
    created_at: '2026-11-01T10:00:00Z',
  };
  const overview = {
    generated_at: '2026-11-15T12:00:00Z',
    server: { version: 'v2.4', db_driver: 'mysql', started_at: '2026-11-15T10:00:00Z', uptime_seconds: 7200, go_version: 'go1.22', goroutines: 12, memory_alloc_mb: 8.5 },
    users: {
      total: 3,
      active: 3,
      pending: 0,
      by_role: [
        { role_id: 1, role_name: 'ADMIN', total: 1, active: 1, pending: 0 },
        { role_id: 2, role_name: 'MEDICO', total: 1, active: 1, pending: 0 },
        { role_id: 8, role_name: 'TI', total: 1, active: 1, pending: 0 },
      ],
    },
    branches: SEDES.map((name, i) => ({ name, admins: i === 0 ? [admin] : [] })),
    admins_without_branch: [],
    recent_audit: [{ id: 1, action: 'LOGIN', resource: '/api/v1/auth/login', role: 'TI', timestamp: '2026-11-15T11:59:00Z' }],
  };

  it('el tablero de monitoreo muestra el estado del servidor, las cuentas y las sedes sin administrador', async () => {
    mockApi({ 'GET /ti/overview': { body: overview } });
    render(<TiMonitorView />);

    expect(await screen.findByText('En línea')).toBeInTheDocument();
    expect(screen.getByText('1 de 4')).toBeInTheDocument();
    expect(screen.getAllByText('Sin administrador')).toHaveLength(3);
    expect(screen.getByText('Encargado de TI')).toBeInTheDocument();
    expect(screen.getByText('LOGIN')).toBeInTheDocument();
  });

  it('registra administradores adicionales con el endpoint reservado al Encargado de TI', async () => {
    const { calls } = mockApi({
      'GET /ti/overview': { body: overview },
      'POST /auth/register-admin': createdUser({ role: 'ADMIN', role_id: 1 }),
    });
    render(<TiAdminsView />);

    fireEvent.click(await screen.findByRole('button', { name: /Nuevo Administrador/i }));
    expect(screen.getByText('Registro de Administrador de Centro de Salud')).toBeInTheDocument();
    fillRegistration(/Nombre Completo del Administrador/i);
    fireEvent.click(screen.getByRole('button', { name: /Confirmar registro de administrador/i }));

    await waitFor(() => expect(calls.some((c) => c.path === '/auth/register-admin' && c.method === 'POST')).toBe(true));
    expect(await screen.findByText(/Administrador Cuenta Nueva registrado/i)).toBeInTheDocument();
  });

  it('suspende la cuenta de un administrador', async () => {
    const { calls } = mockApi({
      'GET /ti/overview': { body: overview },
      'PATCH /ti/admins/adm-1/status': { body: { is_active: false } },
    });
    render(<TiAdminsView />);

    fireEvent.click(await screen.findByRole('button', { name: /Suspender/i }));

    await waitFor(() => expect(calls.some((c) => c.method === 'PATCH')).toBe(true));
    expect(calls.find((c) => c.method === 'PATCH').body).toEqual({ is_active: false });
    expect(await screen.findByText(/Admin Cartago quedó suspendido/i)).toBeInTheDocument();
  });

  it('muestra las solicitudes pendientes y permite aprobarlas', async () => {
    const pendiente = { ...admin, id: 'adm-2', full_name: 'Solicitud Tuluá', email: 'tulua@ips.example', is_active: false, branch: SEDES[2] };
    const conPendiente = {
      ...overview,
      branches: SEDES.map((name, i) => ({ name, admins: i === 0 ? [admin] : i === 2 ? [pendiente] : [] })),
    };
    const { calls } = mockApi({
      'GET /ti/overview': { body: conPendiente },
      'PATCH /ti/admins/adm-2/status': { body: { is_active: true } },
    });
    render(<TiAdminsView />);

    expect(await screen.findByText(/1 cuenta de administrador pendiente o suspendida/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Aprobar \/ Habilitar/i }));

    await waitFor(() => expect(calls.some((c) => c.method === 'PATCH')).toBe(true));
    expect(calls.find((c) => c.method === 'PATCH').body).toEqual({ is_active: true });
  });

  it('el panel del administrador ya no registra administradores', async () => {
    mockApi({
      'GET /admin/users': { body: { users: [], count: 0 } },
      'GET /admin/audit-logs': { body: { audit_logs: [], count: 0 } },
    });
    render(<AdminDashboardScreen />);

    expect(await screen.findByRole('button', { name: /Nuevo Personal/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Nuevo Administrador/i })).not.toBeInTheDocument();
  });
});
