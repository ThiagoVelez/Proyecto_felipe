import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import StaffRegisterModal from '../../src/frontend/src/components/StaffRegisterModal';
import AdminDashboardScreen from '../../src/frontend/src/screens/admin/AdminDashboardScreen';
import UserProfileModal, { MEDICAL_BANNERS } from '../../src/frontend/src/components/UserProfileModal';
import ProfileScreen from '../../src/frontend/src/screens/ProfileScreen';
import AuthScreen from '../../src/frontend/src/screens/AuthScreen';

describe('StaffRegisterModal - Registro y Gobernanza ReTHUS', () => {
  it('renderiza todos los campos obligatorios del registro asistencial', () => {
    render(<StaffRegisterModal isOpen={true} onClose={() => {}} />);
    
    expect(screen.getByText(/Registro de Personal Asistencial/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Ej: RM-94821-VALLE/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/usuario@saludconecta.ips.gov.co/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Registrar Personal$/i })).toBeInTheDocument();
  });

  it('exige la tarjeta profesional ReTHUS para roles médicos y asistenciales', async () => {
    const { container } = render(<StaffRegisterModal isOpen={true} onClose={() => {}} />);

    // Rellenamos campos basicos excepto la tarjeta profesional
    fireEvent.change(screen.getByPlaceholderText(/Ej: Dr. Santiago Vélez/i), {
      target: { value: 'Dr. Prueba Clínico' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Ej: 1118234567/i), {
      target: { value: '111999888' },
    });
    fireEvent.change(screen.getByPlaceholderText(/usuario@saludconecta.ips.gov.co/i), {
      target: { value: 'prueba@saludconecta.ips.gov.co' },
    });
    fireEvent.change(screen.getByPlaceholderText(/••••••••••••/i), {
      target: { value: 'ClaveSegura2026*' },
    });

    const form = container.querySelector('form');
    fireEvent.submit(form);

    expect(await screen.findByText(/La Tarjeta Profesional o registro ReTHUS es de carácter obligatorio/i)).toBeInTheDocument();
  });
});

describe('Registro de personal - Acceso exclusivo desde el perfil del administrador', () => {
  it('el perfil del administrador abre el formulario de registro', () => {
    render(<ProfileScreen user={{ full_name: 'Administrador', role: 'ADMIN', role_id: 1 }} />);

    fireEvent.click(screen.getByRole('button', { name: /Registrar Personal/i }));

    expect(screen.getByText(/Registro de Personal Asistencial/i)).toBeInTheDocument();
  });

  it('muestra el rechazo del servidor en lugar de simular un registro exitoso', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'Acceso denegado' }), { status: 403 })
    );
    const { container } = render(<StaffRegisterModal isOpen={true} onClose={() => {}} />);

    fireEvent.change(screen.getByPlaceholderText(/Ej: RM-94821-VALLE/i), { target: { value: 'ENF-1' } });
    fireEvent.change(screen.getByPlaceholderText(/Ej: Dr. Santiago Vélez/i), { target: { value: 'Enfermera Prueba' } });
    fireEvent.change(screen.getByPlaceholderText(/Ej: 1118234567/i), { target: { value: '111999888' } });
    fireEvent.change(screen.getByPlaceholderText(/usuario@saludconecta.ips.gov.co/i), { target: { value: 'e@example.com' } });
    fireEvent.change(screen.getByPlaceholderText(/••••••••••••/i), { target: { value: 'ClaveSegura2026*' } });
    fireEvent.submit(container.querySelector('form'));

    expect(await screen.findByText('Acceso denegado')).toBeInTheDocument();
    expect(screen.queryByText('Personal Registrado')).not.toBeInTheDocument();
    expect(fetchSpy.mock.calls[0][0]).toBe('/api/v1/admin/users');
    fetchSpy.mockRestore();
  });

  it('el perfil de un médico no ofrece el registro de personal', () => {
    render(<ProfileScreen user={{ full_name: 'Dr. Prueba', role: 'MEDICO', role_id: 2 }} />);

    expect(screen.queryByRole('button', { name: /Registrar Personal/i })).not.toBeInTheDocument();
  });

  it('el login no ofrece el registro de personal', () => {
    render(<AuthScreen onLogin={() => {}} />);

    expect(screen.queryByRole('button', { name: /Registrar Personal|Solicitar Registro/i })).not.toBeInTheDocument();
  });
});

describe('AuthScreen - El acceso depende de la respuesta del servidor', () => {
  const submitLogin = (container) => {
    fireEvent.change(screen.getByPlaceholderText(/usuario@saludconecta.ips.gov.co/i), {
      target: { value: 'admin@saludconecta.ips.gov.co' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Ej: MiClave2026/i), {
      target: { value: 'ClaveIncorrecta' },
    });
    fireEvent.submit(container.querySelector('form'));
  };

  it('inicia con correo y contraseña vacíos, mostrando solo el texto de ejemplo', () => {
    render(<AuthScreen />);

    expect(screen.getByPlaceholderText(/Ej: usuario@saludconecta/i)).toHaveValue('');
    expect(screen.getByPlaceholderText(/Ej: MiClave2026/i)).toHaveValue('');
  });

  it('despliega en acordeón las sedes registradas y permite elegir una', () => {
    localStorage.setItem(
      'saludconecta_admin_branches',
      JSON.stringify([
        { id: 'a', name: 'Sede Registrada Uno', municipality: 'Cartago', status: 'Operativo' },
        { id: 'b', name: 'Sede Registrada Dos', municipality: 'Buga', status: 'En Espera' },
      ])
    );
    render(<AuthScreen />);

    const trigger = screen.getByRole('button', { name: /Sede Operativa de Turno/i });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    fireEvent.click(screen.getByRole('button', { name: /Sede Registrada Dos/i }));
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveTextContent('Sede Registrada Dos');
    localStorage.clear();
  });

  it('no abre sesión cuando el servidor rechaza las credenciales', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'Credenciales invalidas' }), { status: 401 })
    );
    const onLoginSuccess = vi.fn();
    const { container } = render(<AuthScreen onLoginSuccess={onLoginSuccess} />);

    submitLogin(container);

    expect(await screen.findByText('Credenciales invalidas')).toBeInTheDocument();
    expect(onLoginSuccess).not.toHaveBeenCalled();
    expect(localStorage.getItem('saludconecta_token')).toBeNull();
    fetchSpy.mockRestore();
  });

  it('no abre sesión cuando el servidor no está disponible', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));
    const onLoginSuccess = vi.fn();
    const { container } = render(<AuthScreen onLoginSuccess={onLoginSuccess} />);

    submitLogin(container);

    expect(await screen.findByText(/El servicio no está disponible/i)).toBeInTheDocument();
    expect(onLoginSuccess).not.toHaveBeenCalled();
    expect(localStorage.getItem('saludconecta_token')).toBeNull();
    fetchSpy.mockRestore();
  });

  it('abre sesión con el token emitido por el servidor', async () => {
    const user = { id: 'u1', role: 'ADMIN', role_id: 1, full_name: 'Administrador' };
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ token: 'token-real', user }), { status: 200 })
    );
    const onLoginSuccess = vi.fn();
    const { container } = render(<AuthScreen onLoginSuccess={onLoginSuccess} />);

    submitLogin(container);

    await waitFor(() => expect(onLoginSuccess).toHaveBeenCalledWith({ token: 'token-real', user }));
    expect(localStorage.getItem('saludconecta_token')).toBe('token-real');
    localStorage.clear();
    fetchSpy.mockRestore();
  });
});

describe('AdminDashboardScreen - Panel de Control y Separación RBAC', () => {
  const serverUsers = [
    {
      id: 'u-1',
      role_id: 2,
      role_name: 'MEDICO',
      full_name: 'Dra. Ana Servidor',
      document_type: 'CC',
      document_number: '1001',
      email: 'ana@example.com',
      professional_card: 'RM-1',
      specialty: 'Pediatría',
      branch: 'Sede Cartago - Hospital Central (Nivel II)',
      is_active: true,
    },
    {
      id: 'u-2',
      role_id: 3,
      role_name: 'ENFERMERO',
      full_name: 'Lic. Beto Pendiente',
      document_type: 'CC',
      document_number: '1002',
      email: 'beto@example.com',
      professional_card: 'ENF-2',
      is_active: false,
    },
  ];

  const jsonResponse = (body, status = 200) => new Response(JSON.stringify(body), { status });

  const mockServer = ({ statusResponse, logs = [] } = {}) =>
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, options = {}) => {
      const method = options.method || 'GET';
      if (url.startsWith('/api/v1/admin/users') && method === 'GET') {
        return jsonResponse({ users: serverUsers, count: serverUsers.length });
      }
      if (url.includes('/status') && method === 'PATCH') {
        return statusResponse();
      }
      if (url.startsWith('/api/v1/admin/audit-logs')) {
        return jsonResponse({ audit_logs: logs, count: logs.length });
      }
      return jsonResponse({ error: 'ruta inesperada' }, 404);
    });

  it('muestra las métricas y el personal que devuelve el servidor', async () => {
    const fetchSpy = mockServer();
    render(<AdminDashboardScreen />);

    expect(screen.getByText(/Gobernanza de Personal \(ReTHUS\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Total Personal/i)).toBeInTheDocument();
    expect(await screen.findByText('Dra. Ana Servidor')).toBeInTheDocument();
    expect(screen.getByText('Lic. Beto Pendiente')).toBeInTheDocument();
    expect(screen.queryByText(/Santiago Vélez/i)).not.toBeInTheDocument();
    fetchSpy.mockRestore();
  });

  it('muestra el error real y permite reintentar cuando el listado de personal falla', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      if (url.startsWith('/api/v1/admin/users')) return jsonResponse({ error: 'Acceso denegado' }, 403);
      return jsonResponse({ audit_logs: [], count: 0 });
    });
    render(<AdminDashboardScreen />);

    expect(await screen.findByText('Acceso denegado')).toBeInTheDocument();
    expect(screen.queryByText('Dra. Ana Servidor')).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Reintentar/i }).length).toBeGreaterThanOrEqual(1);
    fetchSpy.mockRestore();
  });

  it('no muestra éxito ni altera el estado cuando el servidor rechaza el cambio de estado', async () => {
    const fetchSpy = mockServer({
      statusResponse: () => jsonResponse({ error: 'No se puede desactivar la cuenta' }, 409),
    });
    render(<AdminDashboardScreen />);

    await screen.findByText('Dra. Ana Servidor');
    fireEvent.click(screen.getByTitle(/Suspender acceso asistencial/i));

    expect(await screen.findByText(/No se puede desactivar la cuenta/i)).toBeInTheDocument();
    expect(screen.queryByText(/fue suspendido/i)).not.toBeInTheDocument();
    // La cuenta sigue habilitada: el botón de suspender continúa disponible
    expect(screen.getByTitle(/Suspender acceso asistencial/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Reintentar$/i })).toBeInTheDocument();
    fetchSpy.mockRestore();
  });

  it('refleja el cambio de estado solo después de la confirmación del servidor', async () => {
    const fetchSpy = mockServer({
      statusResponse: () => jsonResponse({ message: 'ok', user_id: 'u-1', is_active: false }),
    });
    render(<AdminDashboardScreen />);

    await screen.findByText('Dra. Ana Servidor');
    fireEvent.click(screen.getByTitle(/Suspender acceso asistencial/i));

    expect(await screen.findByText(/fue suspendido/i)).toBeInTheDocument();
    const patchCall = fetchSpy.mock.calls.find(([, opts]) => opts?.method === 'PATCH');
    expect(patchCall[0]).toBe('/api/v1/admin/users/u-1/status');
    expect(JSON.parse(patchCall[1].body)).toEqual({ is_active: false });
    fetchSpy.mockRestore();
  });

  it('presenta la bitácora real del servidor usando el campo timestamp', async () => {
    const fetchSpy = mockServer({
      logs: [
        {
          id: 7,
          user_id: 'u-1',
          role: 'MEDICO',
          action: 'LOGIN',
          resource: '/api/v1/auth/login',
          ip_address: '10.0.0.5',
          correlation_id: 'corr-real-7',
          details: { method: 'POST' },
          timestamp: '2026-11-02T10:00:00Z',
        },
      ],
    });
    render(<AdminDashboardScreen />);

    fireEvent.click(screen.getByRole('button', { name: /Auditoría Forense/i }));

    expect(await screen.findByText('/api/v1/auth/login')).toBeInTheDocument();
    expect(screen.getByText(/corr-real-7/)).toBeInTheDocument();
    expect(screen.getByText('LOGIN')).toBeInTheDocument();
    expect(screen.queryByText(/Sin fecha/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Registrar Hallazgo/i })).not.toBeInTheDocument();
    fetchSpy.mockRestore();
  });

  it('muestra el error del servidor en la bitácora y un estado vacío explícito', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      if (url.startsWith('/api/v1/admin/audit-logs')) return jsonResponse({ error: 'Servicio de auditoría caído' }, 503);
      return jsonResponse({ users: [], count: 0 });
    });
    render(<AdminDashboardScreen />);

    fireEvent.click(screen.getByRole('button', { name: /Auditoría Forense/i }));

    expect(await screen.findByText('Servicio de auditoría caído')).toBeInTheDocument();
    expect(screen.getByText(/No hay datos disponibles/i)).toBeInTheDocument();
    fetchSpy.mockRestore();
  });

  it('la pestaña de sedes no inventa cifras de ocupación ni conectividad', async () => {
    const fetchSpy = mockServer();
    render(<AdminDashboardScreen />);

    fireEvent.click(screen.getByRole('button', { name: /Red Asistencial y Sedes/i }));

    expect(await screen.findByText(/Sede Cartago - Hospital Central/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Nueva Sede Asistencial/i })).toBeInTheDocument();
    expect(screen.queryByText(/Conectividad/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Capacidad/i)).not.toBeInTheDocument();
    fetchSpy.mockRestore();
  });

  it('ya no ofrece el catálogo farmacológico simulado', () => {
    const fetchSpy = mockServer();
    render(<AdminDashboardScreen />);

    expect(screen.queryByRole('button', { name: /Catálogo CUM Farmacológico/i })).not.toBeInTheDocument();
    fetchSpy.mockRestore();
  });
});

describe('UserProfileModal - Perfil Asistencial Tipo Red Social con 5 Banners', () => {
  const mockUser = {
    id: 'usr-med-0002',
    name: 'Dr. Santiago Vélez',
    full_name: 'Dr. Santiago Vélez',
    role: 'MEDICO',
    professional_card: 'RM-94821-VALLE',
    specialty: 'Medicina de Urgencias',
    branch: 'Sede Cartago - Hospital Central (Nivel II)',
  };

  it('renderiza la información del perfil del Dr. Santiago Vélez y los 5 banners', () => {
    render(<UserProfileModal isOpen={true} onClose={() => {}} user={mockUser} />);

    expect(screen.getAllByText(/Dr. Santiago Vélez/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/RM-94821-VALLE/i)).toBeInTheDocument();
    expect(screen.getByText(/ReTHUS Verificado/i)).toBeInTheDocument();

    // Verificamos que la colección tenga exactamente 5 banners médicos
    expect(MEDICAL_BANNERS).toHaveLength(5);
    expect(screen.getByRole('button', { name: /Colección de Banners \(5\)/i })).toBeInTheDocument();
  });

  it('permite alternar entre los banners de áreas médicas como pediatría y farmacia', async () => {
    render(<UserProfileModal isOpen={true} onClose={() => {}} user={mockUser} />);

    const bannersTab = screen.getByRole('button', { name: /Colección de Banners \(5\)/i });
    fireEvent.click(bannersTab);

    expect(await screen.findByText(/Pediatría & Salud Infantil/i)).toBeInTheDocument();
    expect(screen.getByText(/Farmacología & Farmacia Hospitalaria/i)).toBeInTheDocument();
    expect(screen.getByText(/Cirugía & Quirófano Especializado/i)).toBeInTheDocument();
    expect(screen.getByText(/Cardiología & Medicina Interna/i)).toBeInTheDocument();
  });
});

describe('ProfileScreen - Pantalla Completa Desacoplada sin Ventana Flotante', () => {
  const mockUser = {
    id: 'usr-med-0002',
    name: 'Dr. Santiago Vélez',
    full_name: 'Dr. Santiago Vélez',
    role: 'MEDICO',
    professional_card: 'RM-94821-VALLE',
    specialty: 'Medicina de Urgencias',
    branch: 'Sede Cartago - Hospital Central (Nivel II)',
  };

  it('renderiza la pantalla completa de perfil con botón de retorno y portadas médicas', () => {
    render(<ProfileScreen user={mockUser} onUpdateUser={() => {}} onNavigate={() => {}} />);

    expect(screen.getByText(/Volver al Panel Principal/i)).toBeInTheDocument();
    expect(screen.getByText(/Trayectoria & Perfil Asistencial/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cambiar Portada \(5 Banners\)/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Editar Perfil/i })).toBeInTheDocument();
  });

  it('permite navegar a la pestaña de banners y ver los 5 diseños en pantalla completa', async () => {
    render(<ProfileScreen user={mockUser} onUpdateUser={() => {}} onNavigate={() => {}} />);

    const bannersBtn = screen.getByRole('button', { name: /Colección de Banners \(5\)/i });
    fireEvent.click(bannersBtn);

    expect(await screen.findByText(/Pediatría & Salud Infantil/i)).toBeInTheDocument();
    expect(screen.getByText(/Farmacología & Farmacia Hospitalaria/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Urgencias & Cuidados Críticos/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Cirugía & Quirófano Especializado/i)).toBeInTheDocument();
    expect(screen.getByText(/Cardiología & Medicina Interna/i)).toBeInTheDocument();
  });
});
