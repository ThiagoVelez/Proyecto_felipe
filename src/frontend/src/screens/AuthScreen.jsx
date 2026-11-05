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
  FileCheck2,
  Scale,
  QrCode,
  Timer,
  RefreshCw,
  UserPlus,
} from 'lucide-react';
import LoginBackground from '../components/LoginBackground';
import BranchAccordion from '../components/BranchAccordion';
import MfaQrModal from '../components/MfaQrModal';
import AdminRegisterModal from '../components/AdminRegisterModal';
import BrandLogo from '../components/BrandLogo';
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
        const url = await generateQrDataUrl(uri, 130);
        if (isMounted && url) {
          setQrDataUrl(url);
        }
      } catch {
        if (!isMounted) return;
        const fallbackUri = buildOtpAuthUri(mfaSecret, targetEmail, 'SaludConecta IPS');
        generateQrDataUrl(fallbackUri, 130).then((url) => {
          if (isMounted && url) setQrDataUrl(url);
        });
      }
    }, 250);

    return () => {
      isMounted = false;
      clearTimeout(debounce);
    };
  }, [identifier]);

  // Rotación manual de semilla para pruebas
  const handleManualRotate = async () => {
    const newSecret = generateBase32Secret(16);
    setMfaSecret(newSecret);
    const targetEmail = identifier.trim().toLowerCase() || 'usuario@saludconecta.ips.gov.co';
    const uri = buildOtpAuthUri(newSecret, targetEmail, 'SaludConecta IPS');
    const url = await generateQrDataUrl(uri, 130);
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

  // Ayudante de pruebas de laboratorio: calcula el código vigente del segundo
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
    const code = totp.join('');

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
    <div className="relative min-h-screen w-full flex items-center justify-center p-2 sm:p-4 overflow-y-auto bg-slate-950">
      <LoginBackground />

      <div className="relative z-10 w-full max-w-5xl my-auto shadow-2xl rounded-2xl overflow-hidden bg-white/95 backdrop-blur-md grid grid-cols-1 lg:grid-cols-12 border border-white/20">
        {/* PANEL IZQUIERDO: Identidad Institucional & Gobernanza Clínica */}
        <div className="lg:col-span-5 bg-gradient-to-b from-[#0F172A] via-[#132338] to-[#005c55] p-4 lg:p-6 text-white flex flex-col justify-between relative overflow-y-auto">
          <div className="relative z-10 space-y-3">
            {/* Encabezado con Logotipo Oficial */}
            <div className="flex items-center space-x-3">
              <BrandLogo size="md" />
              <div className="min-w-0">
                <span className="inline-block px-2 py-0.2 rounded-full bg-secondary-fixed text-on-secondary-fixed text-[9px] font-bold uppercase tracking-wider">
                  Red Integrada Valle del Cauca
                </span>
                <h1 className="text-lg font-bold text-white leading-tight">
                  SaludConecta IPS
                </h1>
                <p className="text-[10px] text-secondary-fixed-dim">
                  Portal Clínico Asistencial y Gobernanza Hospitalaria
                </p>
              </div>
            </div>

            {/* Sello de Calidad ISO/IEC 25010 */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 space-y-1 border border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5">
                  <FileCheck2 className="w-4 h-4 text-secondary-container" />
                  <span className="font-semibold text-xs text-white">
                    Certificado ISO/IEC 25010
                  </span>
                </div>
                <span className="px-1.5 py-0.2 bg-primary-container text-on-primary-container text-[9px] font-bold rounded">
                  Grado Médico
                </span>
              </div>
              <p className="text-[11px] text-white/80 leading-normal">
                Protocolo de auditoría continua y trazabilidad inmutable mediante funciones resumen hash SHA-256 según estándar MinSalud.
              </p>
            </div>

            {/* Advertencia Legal & Forense */}
            <div className="bg-red-950/40 border border-red-500/30 rounded-xl p-3 space-y-1">
              <div className="flex items-center space-x-1.5 text-red-200">
                <Scale className="w-4 h-4" />
                <span className="font-bold text-[11px] uppercase tracking-wider">
                  Advertencia Jurídica y Forense
                </span>
              </div>
              <p className="text-[11px] text-red-100/80 leading-tight">
                Acceso restringido exclusivamente a profesionales autorizados por ReTHUS y MinSalud. Toda acción queda registrada bajo bitácora inalterable (Ley 1581 de 2012 y Res. 1995 de 1999).
              </p>
            </div>
          </div>
        </div>

        {/* PANEL DERECHO: Formulario de Autenticación y Firma Biométrica/TOTP */}
        <div className="lg:col-span-7 p-4 lg:p-6 flex flex-col justify-between bg-surface-container-lowest">
          <div className="space-y-3">
            {/* Header del Formulario de Autenticación */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-surface-container pb-2.5">
              <div>
                <h2 className="text-base font-bold text-on-surface">
                  Inicio de Sesión y Firma Biométrica
                </h2>
                <p className="text-[11px] text-on-surface-variant">
                  Ingrese credenciales habilitadas ante el ReTHUS y MinSalud
                </p>
              </div>

              <div className="flex items-center gap-1.5 text-[11px] text-primary font-semibold bg-primary/5 px-2.5 py-1 rounded-lg border border-primary/10">
                <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                <span>Acceso Seguro TLS 1.3</span>
              </div>
            </div>

            {/* Formulario */}
            <form onSubmit={handleSubmit} className="space-y-3">
              {/* Identificador y Sede Operativa */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label htmlFor="login-email" className="block text-[11px] font-semibold text-on-surface mb-1">
                    Correo Institucional
                  </label>
                  <div className="relative">
                    <input
                      id="login-email"
                      type="email"
                      autoComplete="username"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      required
                      placeholder="Ej: usuario@saludconecta.ips.gov.co"
                      className="w-full h-8 pl-8 pr-3 text-xs bg-surface-container-low border border-outline-variant rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-on-surface"
                    />
                    <Mail className="w-3.5 h-3.5 text-outline absolute left-2.5 top-2.5" />
                  </div>
                </div>

                <BranchAccordion
                  label="Sede Operativa de Turno"
                  branches={branches}
                  value={branch}
                  onChange={setBranch}
                />
              </div>

              {/* Contraseña */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="login-password" className="text-[11px] font-semibold text-on-surface">
                    Contraseña Asistencial ReTHUS
                  </label>
                </div>
                <div className="relative">
                  <input
                    id="login-password"
                    autoComplete="current-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Ej: MiClave2026*"
                    className="w-full h-8 pl-8 pr-9 text-xs bg-surface-container-low border border-outline-variant rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-on-surface"
                  />
                  <KeyRound className="w-3.5 h-3.5 text-outline absolute left-2.5 top-2.5" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    className="absolute right-2.5 top-2 text-outline hover:text-on-surface cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* SEGUNDO FACTOR (MFA TOTP) CON CÓDIGO QR Y CASILLAS DIRECTAS */}
              <div className="p-2.5 rounded-xl bg-surface-container-low border border-primary/25 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 rounded-lg bg-primary text-white flex items-center justify-center shrink-0">
                      <Smartphone className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-on-surface">Segundo Factor Obligatorio (TOTP)</h3>
                      <p className="text-[10px] text-on-surface-variant">
                        Escanee el QR con Google Authenticator, Microsoft Authenticator o Authy
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1 px-2 py-0.5 bg-white rounded-full shadow-xs text-primary font-mono text-[11px]">
                    <Timer className="w-3 h-3" />
                    <span>
                      Ventana: <strong>00:{mfaTimer.toString().padStart(2, '0')}s</strong>
                    </span>
                  </div>
                </div>

                {/* FILA: QR A LA IZQUIERDA Y CASILLAS DE 6 DÍGITOS A LA DERECHA */}
                <div className="flex items-center justify-between gap-3 pt-0.5">
                  {/* CÓDIGO QR DIRECTO */}
                  <div className="flex flex-col items-center shrink-0">
                    <div className="p-1 bg-white rounded-xl border-2 border-primary shadow-xs">
                      {qrDataUrl ? (
                        <img
                          src={qrDataUrl}
                          alt="Código QR TOTP SaludConecta"
                          className="w-20 h-20 rounded cursor-pointer transition-transform hover:scale-105"
                          title="Haz clic para ampliar QR"
                          onClick={() => setShowQrModal(true)}
                        />
                      ) : (
                        <div className="w-20 h-20 flex items-center justify-center text-[10px] text-outline">
                          Generando QR...
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowQrModal(true)}
                      className="text-[9px] font-bold text-primary hover:underline mt-0.5 flex items-center gap-0.5 cursor-pointer"
                    >
                      <QrCode className="w-2.5 h-2.5" />
                      Ampliar QR
                    </button>
                  </div>

                  {/* CASILLAS VACÍAS PARA LOS 6 DÍGITOS */}
                  <div className="flex-1 flex flex-col justify-center space-y-1 min-w-0">
                    <label id="totp-group-label" className="text-[10px] font-semibold text-on-surface leading-tight block">
                      Código de 6 dígitos de su aplicación:
                    </label>

                    <div className="flex items-center gap-1">
                      {totp.map((digit, idx) => (
                        <React.Fragment key={idx}>
                          {idx === 3 && <span className="text-outline font-bold text-xs">-</span>}
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
                            className="w-7 h-8 text-center text-xs font-bold rounded-lg bg-white border border-outline-variant focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-primary shadow-xs"
                          />
                        </React.Fragment>
                      ))}
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-on-surface-variant pt-0.5">
                      <button
                        type="button"
                        onClick={handleAutofillTest}
                        className="text-primary hover:underline font-medium text-[10px] cursor-pointer"
                        title="Opción de prueba: pega el código actual sincronizado"
                      >
                        Pegar código de prueba
                      </button>

                      <button
                        type="button"
                        onClick={handleManualRotate}
                        className="text-on-surface-variant hover:text-primary flex items-center gap-1 cursor-pointer"
                        title="Generar nueva clave aleatoria"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Rotar QR</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Advertencia de Bloqueo */}
              <div className="p-2 bg-amber-50 rounded-lg flex items-center space-x-2 border border-amber-200">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                <p className="text-[10px] text-amber-900 leading-tight">
                  <strong>Control de Acceso:</strong> Bloqueo preventivo tras 5 intentos fallidos (Res. 1995 de 1999).
                </p>
              </div>

              {sessionNotice && !statusMessage && (
                <div role="alert" className="p-2 rounded-lg bg-amber-50 text-amber-900 border border-amber-200 text-[11px] font-medium text-center">
                  {sessionNotice}
                </div>
              )}

              {statusMessage && (
                <div
                  role={isError ? 'alert' : 'status'}
                  className={`p-2 rounded-lg text-[11px] font-medium text-center ${
                    isError ? 'bg-red-50 text-red-800 border border-red-200' : 'bg-primary/10 text-primary'
                  }`}
                >
                  {statusMessage}
                </div>
              )}

              {/* Botón Principal */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-10 bg-primary hover:bg-primary-container text-white font-bold text-xs rounded-xl shadow-sm hover:shadow-md flex items-center justify-center space-x-1.5 transition-all cursor-pointer active:scale-[0.99] disabled:opacity-50"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Verificando con Servidor...' : 'Iniciar Sesión y Firmar'}</span>
              </button>
            </form>
          </div>

          {/* Pie de Página: Botón de Registro de Administrador y Versión */}
          <div className="pt-2 mt-2 border-t border-surface-container-high flex items-center justify-between text-[11px] text-on-surface-variant">
            <button
              type="button"
              onClick={() => setShowAdminModal(true)}
              className="text-primary hover:underline font-semibold cursor-pointer text-[11px] flex items-center gap-1.5"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Registrar Administrador de Centro de Salud</span>
            </button>

            <span className="font-mono text-[9px] text-outline">Build 2026.02-prod</span>
          </div>
        </div>
      </div>

      {/* Modal QR Ampliado */}
      <MfaQrModal
        isOpen={showQrModal}
        onClose={() => setShowQrModal(false)}
        secret={mfaSecret}
        otpauthUri={buildOtpAuthUri(mfaSecret, identifier || 'usuario@saludconecta.ips.gov.co', 'SaludConecta IPS')}
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
    </div>
  );
};

export default AuthScreen;
