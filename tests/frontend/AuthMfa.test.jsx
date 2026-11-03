import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AuthScreen from '../../src/frontend/src/screens/AuthScreen';
import SecurityMfaScreen from '../../src/frontend/src/screens/SecurityMfaScreen';
import { apiClient, SESSION_EXPIRED_EVENT } from '../../src/frontend/src/services/api';

const jsonResponse = (body, status = 200) => new Response(JSON.stringify(body), { status });

afterEach(() => {
  vi.restoreAllMocks();
  apiClient.setAuth('', null);
  localStorage.clear();
});

const fillLogin = () => {
  fireEvent.change(screen.getByPlaceholderText(/usuario@saludconecta.ips.gov.co/i), {
    target: { value: 'medico@example.com' },
  });
  fireEvent.change(screen.getByPlaceholderText(/Ej: MiClave2026/i), {
    target: { value: 'ClaveSegura2026*' },
  });
};

describe('Login - El segundo factor lo valida siempre el servidor', () => {
  it('solicita el código TOTP cuando el servidor responde mfa_required y lo envía sin validarlo localmente', async () => {
    const user = { id: 'u1', role: 'MEDICO', role_id: 2, full_name: 'Dr. Prueba', mfa_enabled: true };
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse({ error: 'MFA requerido', mfa_required: true }, 401))
      .mockResolvedValueOnce(jsonResponse({ token: 'jwt-real', user }));
    const onLoginSuccess = vi.fn();
    const { container } = render(<AuthScreen onLoginSuccess={onLoginSuccess} />);

    expect(screen.getByLabelText(/Digito 1 del codigo TOTP/i)).toBeInTheDocument();

    fillLogin();
    fireEvent.submit(container.querySelector('form'));

    expect(await screen.findByLabelText(/Digito 1 del codigo TOTP/i)).toBeInTheDocument();
    expect(JSON.parse(fetchSpy.mock.calls[0][1].body)).toEqual({
      email: 'medico@example.com',
      password: 'ClaveSegura2026*',
    });
    expect(onLoginSuccess).not.toHaveBeenCalled();

    // Código arbitrario: el cliente no lo compara con ningún secreto, solo lo transporta
    fireEvent.change(screen.getByLabelText(/Digito 1 del codigo TOTP/i), { target: { value: '123456' } });
    fireEvent.submit(container.querySelector('form'));

    await waitFor(() => expect(onLoginSuccess).toHaveBeenCalledWith({ token: 'jwt-real', user }));
    expect(JSON.parse(fetchSpy.mock.calls[1][1].body)).toEqual({
      email: 'medico@example.com',
      password: 'ClaveSegura2026*',
      totp_code: '123456',
    });
  });

  it('muestra el mensaje del servidor cuando el código TOTP es rechazado y limpia las casillas', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse({ error: 'MFA requerido', mfa_required: true }, 401))
      .mockResolvedValueOnce(
        jsonResponse({ error: 'Codigo de segundo factor (TOTP) invalido o expirado' }, 401)
      );
    const onLoginSuccess = vi.fn();
    const { container } = render(<AuthScreen onLoginSuccess={onLoginSuccess} />);

    fillLogin();
    fireEvent.submit(container.querySelector('form'));
    await screen.findByLabelText(/Digito 1 del codigo TOTP/i);

    fireEvent.change(screen.getByLabelText(/Digito 1 del codigo TOTP/i), { target: { value: '654321' } });
    fireEvent.submit(container.querySelector('form'));

    expect(await screen.findByText(/invalido o expirado/i)).toBeInTheDocument();
    expect(onLoginSuccess).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/Digito 1 del codigo TOTP/i)).toHaveValue('');
  });

  it('propaga el mensaje del servidor ante el bloqueo temporal por demasiados intentos (429)', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse({ error: 'Demasiados intentos. Intente en 15 minutos.' }, 429)
    );
    const { container } = render(<AuthScreen onLoginSuccess={vi.fn()} />);

    fillLogin();
    fireEvent.submit(container.querySelector('form'));

    expect(await screen.findByText('Demasiados intentos. Intente en 15 minutos.')).toBeInTheDocument();
  });

  it('muestra el aviso de sesión no válida recibido desde la aplicación', () => {
    render(<AuthScreen sessionNotice="Su sesión ya no es válida. Inicie sesión nuevamente." />);

    expect(screen.getByText(/Su sesión ya no es válida/i)).toBeInTheDocument();
  });
});

describe('Seguridad MFA - Configuración con secreto emitido por el servidor', () => {
  it('configura MFA con setup y enable del servidor sin calcular códigos localmente', async () => {
    const onUpdateUser = vi.fn();
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      if (url === '/api/v1/auth/mfa/setup') {
        return jsonResponse({
          secret: 'KRSXG5CTMVRXEZLU',
          otpauth_uri: 'otpauth://totp/SaludConecta:medico%40example.com?secret=KRSXG5CTMVRXEZLU&issuer=SaludConecta',
        });
      }
      if (url === '/api/v1/auth/mfa/enable') return jsonResponse({ message: 'MFA habilitado' });
      if (url === '/api/v1/auth/me') {
        return jsonResponse({ user: { id: 'u1', full_name: 'Dr. Prueba', mfa_enabled: true } });
      }
      return jsonResponse({ error: 'inesperada' }, 404);
    });
    render(<SecurityMfaScreen user={{ id: 'u1', full_name: 'Dr. Prueba', mfa_enabled: false }} onUpdateUser={onUpdateUser} />);

    fireEvent.click(screen.getByRole('button', { name: /Generar clave y QR/i }));

    const confirmInput = await screen.findByLabelText(/Código de 6 dígitos que muestra su aplicación/i);
    expect(JSON.parse(fetchSpy.mock.calls[0][1].body)).toEqual({});

    fireEvent.change(confirmInput, { target: { value: '000000' } });
    fireEvent.click(screen.getByRole('button', { name: /Confirmar y habilitar/i }));

    expect(await screen.findByText(/Segundo factor habilitado correctamente/i)).toBeInTheDocument();
    const enableCall = fetchSpy.mock.calls.find(([url]) => url === '/api/v1/auth/mfa/enable');
    expect(JSON.parse(enableCall[1].body)).toEqual({ code: '000000' });
    expect(onUpdateUser).toHaveBeenCalledWith(expect.objectContaining({ mfa_enabled: true }));
  });

  it('exige el código vigente antes de reconfigurar cuando la cuenta ya tiene MFA', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse({ secret: 'KRSXG5CTMVRXEZLU', otpauth_uri: 'otpauth://totp/x?secret=KRSXG5CTMVRXEZLU' })
    );
    render(<SecurityMfaScreen user={{ id: 'u1', full_name: 'Dr. Prueba', mfa_enabled: true }} onUpdateUser={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /Generar nueva clave/i }));
    expect(await screen.findByText(/Ingrese el código vigente de 6 dígitos/i)).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText(/Código vigente de su aplicación actual/i), { target: { value: '111222' } });
    fireEvent.click(screen.getByRole('button', { name: /Generar nueva clave/i }));

    await screen.findByLabelText(/Código de 6 dígitos que muestra su aplicación/i);
    expect(JSON.parse(fetchSpy.mock.calls[0][1].body)).toEqual({ current_code: '111222' });
  });

  it('muestra el rechazo del servidor y no declara MFA habilitado cuando el código es incorrecto', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      if (url === '/api/v1/auth/mfa/setup') {
        return jsonResponse({ secret: 'KRSXG5CTMVRXEZLU', otpauth_uri: 'otpauth://totp/x?secret=KRSXG5CTMVRXEZLU' });
      }
      return jsonResponse({ error: 'Codigo incorrecto' }, 400);
    });
    const onUpdateUser = vi.fn();
    render(<SecurityMfaScreen user={{ id: 'u1', mfa_enabled: false }} onUpdateUser={onUpdateUser} />);

    fireEvent.click(screen.getByRole('button', { name: /Generar clave y QR/i }));
    const confirmInput = await screen.findByLabelText(/Código de 6 dígitos que muestra su aplicación/i);
    fireEvent.change(confirmInput, { target: { value: '999999' } });
    fireEvent.click(screen.getByRole('button', { name: /Confirmar y habilitar/i }));

    expect(await screen.findByText('Codigo incorrecto')).toBeInTheDocument();
    expect(screen.queryByText(/Segundo factor habilitado correctamente/i)).not.toBeInTheDocument();
    expect(onUpdateUser).not.toHaveBeenCalled();
  });
});

describe('Cliente HTTP - Manejo central de sesión', () => {
  it('cierra la sesión y emite el evento ante un 401 fuera del login', async () => {
    apiClient.setAuth('token-viejo', { id: 'u1' });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({ error: 'Token invalido' }, 401));
    const listener = vi.fn();
    window.addEventListener(SESSION_EXPIRED_EVENT, listener);

    await expect(apiClient.me()).rejects.toThrow('Token invalido');

    window.removeEventListener(SESSION_EXPIRED_EVENT, listener);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(apiClient.token).toBe('');
    expect(localStorage.getItem('saludconecta_token')).toBeNull();
  });

  it('no cierra la sesión cuando el 401 proviene del login', async () => {
    apiClient.setAuth('token-vigente', { id: 'u1' });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({ error: 'Credenciales invalidas' }, 401));

    await expect(apiClient.login({ email: 'a@b.c', password: 'x' })).rejects.toThrow('Credenciales invalidas');

    expect(apiClient.token).toBe('token-vigente');
  });

  it('propaga el mensaje del servidor en las funciones de administración en lugar de devolver datos de respaldo', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => jsonResponse({ error: 'Demasiadas solicitudes' }, 429));

    await expect(apiClient.adminGetUsers()).rejects.toThrow('Demasiadas solicitudes');
    await expect(apiClient.adminGetAuditLogs()).rejects.toThrow('Demasiadas solicitudes');
    await expect(apiClient.adminUpdateUserStatus('u1', false)).rejects.toThrow('Demasiadas solicitudes');
  });

  it('no muestra el botón de alto contraste y muestra el botón de registro de administrador', () => {
    render(<AuthScreen />);

    expect(screen.queryByText(/Alto Contraste/i)).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Registrar Administrador de Centro de Salud/i })
    ).toBeInTheDocument();
  });

  it('abre el modal de registro de administrador y procesa el registro institucional', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse(
        {
          message: 'Administrador registrado',
          user: {
            id: 'adm-new',
            email: 'admin.nuevo@saludconecta.ips.gov.co',
            full_name: 'Admin Nuevo',
            role: 'ADMIN',
            role_id: 1,
            branch: 'Sede Cartago - Hospital Central',
          },
          mfa_secret: 'TESTSECRETBASE32',
          otpauth_uri: 'otpauth://totp/SaludConecta:admin.nuevo@saludconecta.ips.gov.co?secret=TESTSECRETBASE32',
        },
        201
      )
    );

    render(<AuthScreen />);

    fireEvent.click(screen.getByRole('button', { name: /Registrar Administrador de Centro de Salud/i }));

    expect(await screen.findByText(/Registro de Administrador de Centro de Salud/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Nombre Completo del Administrador/i), {
      target: { value: 'Admin Nuevo' },
    });
    fireEvent.change(screen.getByLabelText(/Número de Documento/i), {
      target: { value: '11223344' },
    });
    fireEvent.change(screen.getByLabelText(/Correo Institucional \*/i), {
      target: { value: 'admin.nuevo@saludconecta.ips.gov.co' },
    });
    fireEvent.change(screen.getByLabelText(/Contraseña Maestra/i), {
      target: { value: 'AdminClave2026*' },
    });
    fireEvent.change(screen.getByLabelText(/Confirmar Contraseña/i), {
      target: { value: 'AdminClave2026*' },
    });

    const submitBtn = screen.getByRole('button', { name: /Confirmar registro de administrador/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/auth/register-admin'),
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
  });
});
