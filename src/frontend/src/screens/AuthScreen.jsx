import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  Lock,
  Mail,
  KeyRound,
  Eye,
  EyeOff,
  Smartphone,
  AlertTriangle,
  QrCode,
  Timer,
  RefreshCw,
  UserPlus,
  Info,
  X,
} from 'lucide-react';
import BranchAccordion from '../components/BranchAccordion';
import MfaQrModal from '../components/MfaQrModal';
import AdminRegisterModal from '../components/AdminRegisterModal';
import ClinicalBiometricVisualizer from '../components/ClinicalBiometricVisualizer';
import { loadBranches } from '../services/branches';
import { apiClient } from '../services/api';
import {
  calculateTotpCode,
  getRemainingSeconds,
  generateBase32Secret,
  generateQrDataUrl,
  buildOtpAuthUri,
} from '../utils/totp';

const EMPTY_CODE = ['', '', '', '', '', ''];

export const AuthScreen = ({ onLoginSuccess, sessionNotice = '' }) => {
  const [identifier, setIdentifier] = useState('');
  const [branches] = useState(loadBranches);
  const [branch, setBranch] = useState(() => branches[0]?.name || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [totp, setTotp] = useState(EMPTY_CODE);
  const [mfaSecret, setMfaSecret] = useState('JBSWY3DPEHPK3PXP');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [mfaTimer, setMfaTimer] = useState(getRemainingSeconds());
  const [showQrModal, setShowQrModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const digitRefs = useRef([]);

  const showStatus = (message, error = false) => {
    setStatusMessage(message);
    setIsError(error);
  };

  // Temporizador de ventana TOTP de 30 segundos
  useEffect(() => {
    const timer = setInterval(() => {
      setMfaTimer(getRemainingSeconds());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Sincronización de semilla y QR exclusivo según el correo institucional ingresado
  useEffect(() => {
    let isMounted = true;
    const targetEmail = identifier.trim().toLowerCase() || 'usuario@saludconecta.ips.gov.co';

    const debounce = setTimeout(async () => {
      try {
        const seedData = await apiClient.getMfaSeed(targetEmail);
        if (!isMounted) return;
        const secret = seedData?.secret || 'JBSWY3DPEHPK3PXP';
        const uri = seedData?.otpauth_uri || buildOtpAuthUri(secret, targetEmail, 'SaludConecta IPS');
        setMfaSecret(secret);
        const url = await generateQrDataUrl(uri, 140);
        if (isMounted && url) {
          setQrDataUrl(url);
        }
      } catch {
        if (!isMounted) return;
        const fallbackUri = buildOtpAuthUri(mfaSecret, targetEmail, 'SaludConecta IPS');
        generateQrDataUrl(fallbackUri, 140).then((url) => {
          if (isMounted && url) setQrDataUrl(url);
        });
      }
    }, 600);

    return () => {
      isMounted = false;
      clearTimeout(debounce);
    };
  }, [identifier]);

  // Rotación manual de semilla para pruebas de laboratorio
  const handleManualRotate = async () => {
    const newSecret = generateBase32Secret(16);
    setMfaSecret(newSecret);
    const targetEmail = identifier.trim().toLowerCase() || 'usuario@saludconecta.ips.gov.co';
    const uri = buildOtpAuthUri(newSecret, targetEmail, 'SaludConecta IPS');
    const url = await generateQrDataUrl(uri, 140);
    if (url) setQrDataUrl(url);
    setTotp(EMPTY_CODE);
    showStatus('Nueva clave generada. Escanee el nuevo QR en su aplicación.');
  };

  // Manejo de ingreso de dígitos
  const handleDigitChange = (index, value) => {
    const sanitized = value.replace(/\D/g, '');

    // Pegado completo de 6 dígitos
    if (sanitized.length > 1) {
      const digits = sanitized.slice(0, 6).split('');
      digits.forEach((d, i) => {
        if (digitRefs.current[i]) {
          digitRefs.current[i].value = d;
        }
      });
      setTotp([...digits, ...EMPTY_CODE].slice(0, 6));
      digitRefs.current[Math.min(digits.length, 5)]?.focus();
      return;
    }

    const newTotp = [...totp];
    newTotp[index] = sanitized;
    setTotp(newTotp);

    if (sanitized && index < 5) {
      digitRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !totp[index] && index > 0) {
      digitRefs.current[index - 1]?.focus();
    }
  };

  // Ayudante de pruebas: calcula el código vigente del segundo
  const handleAutofillTest = async () => {
    try {
      const code = await calculateTotpCode(mfaSecret);
      if (code && code.length === 6) {
        setTotp(code.split(''));
        showStatus('Código vigente autocompletado para verificación.');
      }
    } catch {
      showStatus('No fue posible calcular el código automático.', true);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const domDigits = digitRefs.current.map((el) => el?.value || '').join('');
    const stateCode = totp.join('');
    const code = domDigits.length === 6 ? domDigits : stateCode;

    setIsSubmitting(true);
    showStatus('Verificando credenciales con el servidor...');

    try {
      const credentials = {
        email: identifier.trim().toLowerCase(),
        password,
      };
      if (code.length === 6) {
        credentials.totp_code = code;
      }

      const res = await apiClient.login(credentials);

      if (res?.user) {
        showStatus('Autenticación exitosa. Redirigiendo a interfaz autorizada...');
        onLoginSuccess?.(res);
      } else {
        showStatus('El servidor no devolvió una sesión válida. Intente nuevamente.', true);
      }
    } catch (err) {
      if (err.data?.mfa_required && code.length < 6) {
        showStatus(
          'Su cuenta requiere segundo factor. Ingrese el código de 6 dígitos o pulse "Pegar código de prueba".',
          true
        );
        digitRefs.current[0]?.focus();
      } else {
        setTotp(EMPTY_CODE);
        showStatus(err.message || 'Error en comunicación con el servicio de autenticación.', true);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen w-full flex flex-col lg:flex-row overflow-x-hidden bg-slate-900">
      {/* PANEL IZQUIERDO: Formulario Clínico & ReTHUS */}
      <section
        data-purpose="clinical-auth-panel"
        className="w-full lg:w-[48%] xl:w-[45%] min-h-screen bg-white flex flex-col justify-between border-r border-slate-200 shadow-2xl relative z-20 overflow-y-auto custom-scroll"
      >
        <div className="px-6 sm:px-10 xl:px-12 py-8 flex flex-col justify-between min-h-full">
          <div>
            {/* Top Header & Branding Institucional */}
            <header className="flex items-center justify-between pb-5 border-b border-slate-100">
              <div className="flex items-center gap-3.5">
                {/* Logotipo Isotipo Cruz Asistencial Digital */}
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#005c55] via-teal-600 to-cyan-700 flex items-center justify-center text-white shadow-md shadow-teal-900/20 ring-1 ring-emerald-500/30">
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2.5"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 4v16m-8-8h16" />
                    <circle className="stroke-white/40" cx="12" cy="12" r="3" strokeWidth="1.5" />
                  </svg>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="inline-block text-[10px] tracking-wider uppercase font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200/70">
                      Red Integrada Valle del Cauca
                    </span>
                  </div>
                  <h1 className="text-lg font-extrabold tracking-tight text-slate-900 leading-tight">
                    SaludConecta <span className="text-[#005c55] font-black">IPS</span>
                  </h1>
                  <p className="text-[11px] font-medium text-slate-500 leading-none mt-0.5">
                    Portal Clínico Asistencial y Gobernanza Hospitalaria
                  </p>
                </div>
              </div>

              {/* Badge de Seguridad Cifrada */}
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-[11px] font-medium shadow-2xs">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span className="font-semibold">TLS 1.3 / SHA-256</span>
              </div>
            </header>

            {/* Título Principal del Login */}
            <div className="mt-6 mb-5">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                Inicio de Sesión y Firma Biométrica
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Ingrese credenciales asistenciales validadas ante el{' '}
                <strong className="text-slate-700 font-semibold">ReTHUS</strong> y{' '}
                <strong className="text-slate-700 font-semibold">MinSalud</strong>.
              </p>
            </div>

            {/* Formulario de Credenciales Asistenciales */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Campo: Correo Institucional */}
              <div>
                <label
                  htmlFor="login-email"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1"
                >
                  Correo Institucional
                </label>
                <div className="relative rounded-lg shadow-2xs">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    id="login-email"
                    type="email"
                    autoComplete="username"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    required
                    placeholder="Ej: usuario@saludconecta.ips.gov.co"
                    className="block w-full rounded-lg border border-slate-300 pl-10 pr-3.5 py-2.5 text-sm font-medium text-slate-800 placeholder-slate-400 focus:border-[#005c55] focus:ring-2 focus:ring-teal-500/20 transition-all bg-slate-50/40 hover:bg-white focus:bg-white"
                  />
                </div>
              </div>

              {/* Campo: Sede Operativa de Turno */}
              <div>
                <BranchAccordion
                  label="Sede Operativa de Turno"
                  branches={branches}
                  value={branch}
                  onChange={setBranch}
                />
              </div>

              {/* Campo: Contraseña Asistencial ReTHUS */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label
                    htmlFor="login-password"
                    className="block text-xs font-semibold uppercase tracking-wider text-slate-700"
                  >
                    Contraseña Asistencial ReTHUS
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(true)}
                    className="text-xs text-[#005c55] hover:text-teal-800 font-semibold hover:underline cursor-pointer"
                  >
                    ¿Olvidó contraseña?
                  </button>
                </div>
                <div className="relative rounded-lg shadow-2xs">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                    <KeyRound className="h-4 w-4" />
                  </div>
                  <input
                    id="login-password"
                    autoComplete="current-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Ej: MiClave2026*"
                    className="block w-full rounded-lg border border-slate-300 pl-10 pr-10 py-2.5 text-sm font-medium text-slate-800 placeholder-slate-400 focus:border-[#005c55] focus:ring-2 focus:ring-teal-500/20 transition-all bg-slate-50/40 hover:bg-white focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* SEGUNDO FACTOR OBLIGATORIO (TOTP) */}
              <div
                data-purpose="totp-card"
                className="rounded-xl border border-teal-200/80 bg-gradient-to-b from-teal-50/60 to-emerald-50/30 p-4 transition-all shadow-2xs space-y-3"
              >
                {/* Encabezado con Contador Regresivo */}
                <div className="flex items-center justify-between pb-2.5 border-b border-teal-100">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-teal-600/10 text-teal-700 flex items-center justify-center font-bold text-xs shrink-0">
                      <Smartphone className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        Segundo Factor Obligatorio (TOTP)
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Google Authenticator, Microsoft Authenticator o Authy
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white border border-teal-200 text-teal-800 text-[11px] font-mono font-bold shadow-2xs">
                    <Timer className="w-3 h-3 text-[#005c55]" />
                    <span>00:{mfaTimer.toString().padStart(2, '0')}s</span>
                  </div>
                </div>

                {/* QR y Cuadrícula de 6 dígitos */}
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  {/* QR Vectorial Directo */}
                  <div className="relative group bg-white p-2 rounded-lg border border-slate-200 shadow-2xs shrink-0 cursor-pointer text-center">
                    <div className="w-[72px] h-[72px] flex items-center justify-center bg-white overflow-hidden rounded">
                      {qrDataUrl ? (
                        <img
                          src={qrDataUrl}
                          alt="Código QR TOTP SaludConecta"
                          className="w-full h-full object-contain cursor-pointer transition-transform hover:scale-105"
                          title="Haz clic para ampliar QR"
                          onClick={() => setShowQrModal(true)}
                        />
                      ) : (
                        <div className="text-[10px] text-slate-400">Generando QR...</div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowQrModal(true)}
                      className="block w-full text-[9px] font-semibold text-teal-700 mt-1 hover:underline cursor-pointer"
                    >
                      Ampliar QR
                    </button>
                  </div>

                  {/* Input de 6 Dígitos con salto automático */}
                  <div className="flex-1 w-full">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-semibold text-slate-600">
                        Código de 6 dígitos:
                      </span>
                      <button
                        type="button"
                        onClick={handleAutofillTest}
                        className="text-[11px] text-teal-700 font-semibold hover:text-teal-900 hover:underline cursor-pointer"
                      >
                        Pegar código de prueba
                      </button>
                    </div>

                    <div className="flex items-center justify-between gap-1 sm:gap-1.5">
                      {totp.map((digit, idx) => (
                        <React.Fragment key={idx}>
                          {idx === 3 && (
                            <span className="text-slate-400 font-bold text-sm select-none">-</span>
                          )}
                          <input
                            id={`totp-input-${idx}`}
                            ref={(el) => {
                              digitRefs.current[idx] = el;
                            }}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            autoComplete="one-time-code"
                            aria-label={`Digito ${idx + 1} del codigo TOTP`}
                            value={digit}
                            onChange={(e) => handleDigitChange(idx, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(idx, e)}
                            placeholder="•"
                            className="w-9 h-11 sm:w-10 sm:h-11 text-center font-mono font-bold text-lg rounded-lg border border-slate-300 focus:border-[#005c55] focus:ring-2 focus:ring-teal-500/30 bg-white shadow-2xs text-[#005c55]"
                          />
                        </React.Fragment>
                      ))}
                    </div>

                    <div className="flex items-center justify-between mt-2 text-[10px] text-slate-500">
                      <span className="flex items-center gap-1.5 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Semilla ReTHUS sincronizada
                      </span>
                      <button
                        type="button"
                        onClick={handleManualRotate}
                        className="flex items-center gap-1 text-slate-600 hover:text-slate-900 font-medium cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3 text-slate-500" />
                        <span>Rotar QR</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Alerta Preventiva Legal de Auditoría */}
              <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-amber-50/90 border border-amber-200/80 text-amber-900 text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed text-[11px]">
                  <strong className="font-semibold text-amber-950">Control de Acceso:</strong>{' '}
                  Bloqueo preventivo tras 5 intentos fallidos (Res. 1995 de 1999 y Circular MinSalud
                  024).
                </p>
              </div>

              {sessionNotice && !statusMessage && (
                <div
                  role="alert"
                  className="p-2.5 rounded-lg bg-amber-50 text-amber-900 border border-amber-200 text-xs font-medium text-center"
                >
                  {sessionNotice}
                </div>
              )}

              {statusMessage && (
                <div
                  role={isError ? 'alert' : 'status'}
                  className={`p-2.5 rounded-lg text-xs font-medium text-center ${
                    isError
                      ? 'bg-rose-50 text-rose-800 border border-rose-200'
                      : 'bg-teal-50 text-teal-800 border border-teal-200'
                  }`}
                >
                  {statusMessage}
                </div>
              )}

              {/* Botón de Envío / Firma Digital */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-6 rounded-xl font-bold text-sm tracking-wide text-white bg-gradient-to-r from-teal-800 via-[#005c55] to-teal-700 hover:from-teal-900 hover:via-teal-800 hover:to-teal-800 active:scale-[0.99] transition-all shadow-lg shadow-teal-900/25 flex items-center justify-center gap-2 group cursor-pointer disabled:opacity-50"
              >
                <Lock className="w-4 h-4 text-emerald-300 group-hover:rotate-12 transition-transform duration-300" />
                <span>
                  {isSubmitting ? 'Verificando con Servidor...' : 'Iniciar Sesión y Firmar'}
                </span>
              </button>
            </form>
          </div>

          {/* Footer y Cumplimiento Normativo Asistencial */}
          <footer className="pt-5 mt-4 border-t border-slate-100 flex flex-col gap-2.5">
            <div className="flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => setShowAdminModal(true)}
                className="flex items-center gap-1.5 text-teal-800 hover:text-teal-950 font-semibold hover:underline cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5 text-teal-600" />
                <span>Registrar Administrador de Centro de Salud</span>
              </button>
              <span className="text-[11px] font-mono text-slate-400">Build 2026.02-prod</span>
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span>Certificado ISO/IEC 25010 • Grado Médico</span>
              <span className="flex items-center gap-1 text-emerald-600 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                Nodo Departamental en línea
              </span>
            </div>
          </footer>
        </div>
      </section>

      {/* PANEL DERECHO: Experiencia Visual Médica Inmersiva & Animada */}
      <ClinicalBiometricVisualizer />

      {/* Modal QR Ampliado */}
      <MfaQrModal
        isOpen={showQrModal}
        onClose={() => setShowQrModal(false)}
        secret={mfaSecret}
        otpauthUri={buildOtpAuthUri(
          mfaSecret,
          identifier || 'usuario@saludconecta.ips.gov.co',
          'SaludConecta IPS'
        )}
      />

      {/* Modal de Registro de Administrador de Centro de Salud */}
      <AdminRegisterModal
        isOpen={showAdminModal}
        onClose={() => setShowAdminModal(false)}
        onRegisterSuccess={(data) => {
          if (data?.user?.email) {
            setIdentifier(data.user.email);
            showStatus('Administrador registrado con éxito. Ingrese su contraseña para acceder.');
          }
        }}
      />

      {/* Modal Informativo: Restablecimiento de Credenciales ReTHUS */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-scale-in">
            <div className="px-5 py-4 bg-gradient-to-r from-teal-800 to-[#005c55] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Info className="w-5 h-5 text-emerald-300" />
                <h3 className="font-bold text-sm">Restablecimiento de Credencial ReTHUS</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="text-white/80 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3 text-xs text-slate-600 leading-relaxed">
              <p>
                Por mandatos de la <strong className="text-slate-800">Resolución 1995 de 1999</strong> y{' '}
                <strong className="text-slate-800">Ley 1581 de 2012</strong>, las credenciales
                médicas asistenciales no pueden autogestionarse por correo electrónico externo no
                certificado.
              </p>
              <p>
                Para restablecer su contraseña institucional o sincronizar un nuevo dispositivo con
                segundo factor TOTP, acérquese a la{' '}
                <strong className="text-slate-800">Dirección Médica</strong> o contacte al{' '}
                <strong className="text-slate-800">Administrador de Centro de Salud</strong> de su
                sede operativa.
              </p>
            </div>
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs rounded-lg cursor-pointer"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default AuthScreen;
