import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  Building2,
  Mail,
  KeyRound,
  Eye,
  EyeOff,
  Smartphone,
  Timer,
  AlertTriangle,
  FileCheck2,
  PhoneCall,
  Scale,
  Contrast,
  CheckCircle2,
  RefreshCw,
  QrCode,
  UserPlus,
  ShieldAlert,
} from 'lucide-react';
import MfaQrModal from '../components/MfaQrModal';
import StaffRegisterModal from '../components/StaffRegisterModal';
import { apiClient } from '../services/api';
import {
  calculateTotpCode,
  getRemainingSeconds,
  generateBase32Secret,
  generateQrDataUrl,
  buildOtpAuthUri,
} from '../utils/totp';

export const AuthScreen = ({ onLoginSuccess }) => {
  const [identifier, setIdentifier] = useState('svelez@saludconecta.ips.gov.co');
  const [branch, setBranch] = useState('Sede Cartago - Hospital Central (Nivel II)');
  const [password, setPassword] = useState('Urgencias2026*');
  const [showPassword, setShowPassword] = useState(false);
  const [mfaSecret, setMfaSecret] = useState('JBSWY3DPEHPK3PXP');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [totp, setTotp] = useState(['', '', '', '', '', '']);
  const [mfaTimer, setMfaTimer] = useState(getRemainingSeconds());
  const [highContrast, setHighContrast] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [showQrModal, setShowQrModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Genera el codigo QR directamente para visualizacion inmediata
  const updateQrCode = async (secret = mfaSecret) => {
    try {
      const uri = buildOtpAuthUri(secret, identifier, 'SaludConecta IPS');
      const dataUrl = await generateQrDataUrl(uri, 130);
      if (dataUrl) setQrDataUrl(dataUrl);
    } catch (err) {
      console.error('Error generando QR directo:', err);
    }
  };

  // Inicializacion y sincronizacion del temporizador TOTP
  useEffect(() => {
    updateQrCode(mfaSecret);

    const timer = setInterval(() => {
      const rem = getRemainingSeconds();
      setMfaTimer(rem);
    }, 1000);

    return () => clearInterval(timer);
  }, [mfaSecret, identifier]);

  const handleManualRotate = () => {
    const newSecret = generateBase32Secret(16);
    setMfaSecret(newSecret);
    updateQrCode(newSecret);
    setTotp(['', '', '', '', '', '']);
    setStatusMessage('Nueva clave generada. Escanee el nuevo QR en su aplicacion.');
  };

  const handleDigitChange = (index, value) => {
    const sanitized = value.replace(/\D/g, '');
    const newTotp = [...totp];
    if (sanitized.length > 1) {
      newTotp[index] = sanitized.slice(-1);
    } else {
      newTotp[index] = sanitized;
    }
    setTotp(newTotp);

    // Auto-focus al siguiente input
    if (sanitized && index < 5) {
      const nextInput = document.getElementById(`totp-input-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !totp[index] && index > 0) {
      const prevInput = document.getElementById(`totp-input-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  // Ayudante de prueba: autocompleta con el codigo actual del segundo
  const handleAutofillTest = async () => {
    const currentCode = await calculateTotpCode(mfaSecret);
    setTotp(currentCode.split(''));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const code = totp.join('');
    if (code.length < 6) {
      setStatusMessage('Por favor ingrese los 6 digitos generados por su aplicacion Authenticator.');
      return;
    }

    // Validacion con tolerancia de +/- 1 ventana (30s) segun RFC 6238
    const now = Date.now();
    const currentCode = await calculateTotpCode(mfaSecret, now);
    const prevCode = await calculateTotpCode(mfaSecret, now - 30000);
    const nextCode = await calculateTotpCode(mfaSecret, now + 30000);

    const isValid = code === currentCode || code === prevCode || code === nextCode;

    if (!isValid) {
      setStatusMessage('Codigo TOTP incorrecto o expirado. Verifique el reloj de su telefono e intentelo de nuevo.');
      return;
    }

    setIsSubmitting(true);
    setStatusMessage('Verificando credenciales con servidor de gobernanza Go/Fiber...');

    try {
      const res = await apiClient.login({
        email: identifier,
        password: password,
        totp_code: code,
      });

      if (res && res.user) {
        setStatusMessage('Autenticación exitosa. Redirigiendo a interfaz autorizada...');
        setTimeout(() => {
          if (onLoginSuccess) {
            onLoginSuccess(res);
          }
        }, 200);
      } else {
        setStatusMessage('Credenciales inválidas o cuenta pendiente de habilitación ReTHUS.');
      }
    } catch (err) {
      setStatusMessage(err.message || 'Error en comunicación con el servicio de autenticación.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className={`relative min-h-screen w-full flex items-center justify-center p-2 sm:p-4 overflow-y-auto ${
        highContrast ? 'bg-black text-white' : 'bg-surface'
      }`}
    >
      {/* Video institucional de fondo en bucle continuo */}
      {!highContrast && (
        <>
          <video
            autoPlay
            loop
            muted
            playsInline
            className="fixed inset-0 w-full h-full object-cover -z-20 brightness-[0.65] contrast-[1.05]"
          >
            <source src="/videos/medicina.mp4" type="video/mp4" />
          </video>
          {/* Capa de contraste y difuminado estetico hospitalario */}
          <div className="fixed inset-0 bg-slate-950/45 backdrop-blur-[2px] -z-10" />
        </>
      )}

      <div className="w-full max-w-5xl my-auto shadow-2xl rounded-2xl overflow-hidden bg-white/95 backdrop-blur-md grid grid-cols-1 lg:grid-cols-12 border border-white/20">
        {/* PANEL IZQUIERDO: Identidad Institucional & Gobernanza Clinica */}
        <div className="lg:col-span-5 bg-gradient-to-b from-[#0F172A] via-[#132338] to-[#005c55] p-4 lg:p-6 text-white flex flex-col justify-between relative overflow-y-auto">
          <div className="relative z-10 space-y-3">
            {/* Encabezado con Logotipo Oficial */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-white p-1.5 shadow-md flex items-center justify-center font-bold text-primary text-base shrink-0">
                SC
              </div>
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

            {/* Disponibilidad de Red Asistencial */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-white/70">Disponibilidad Red Asistencial</span>
                <span className="flex items-center space-x-1 text-emerald-400 font-mono font-semibold text-[10px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>En Línea 99.98%</span>
                </span>
              </div>

              <div className="grid grid-cols-2 gap-1.5 text-[10px] text-white/80 font-mono">
                <div className="bg-white/5 p-1.5 rounded-lg border border-white/5 flex items-center justify-between">
                  <span className="truncate">Sede Cartago (H. Central)</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                </div>
                <div className="bg-white/5 p-1.5 rounded-lg border border-white/5 flex items-center justify-between">
                  <span className="truncate">Sede La Unión (Urgencias)</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                </div>
                <div className="bg-white/5 p-1.5 rounded-lg border border-white/5 flex items-center justify-between">
                  <span className="truncate">Sede Tuluá (Ambulatoria)</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                </div>
                <div className="bg-white/5 p-1.5 rounded-lg border border-white/5 flex items-center justify-between">
                  <span className="truncate">Brigada Rural (PWA Sync)</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                </div>
              </div>
            </div>
          </div>

          {/* Botón para abrir el registro de nuevo personal asistencial */}
          <div className="pt-3 border-t border-white/10 mt-3">
            <button
              type="button"
              onClick={() => setShowRegisterModal(true)}
              className="w-full h-9 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5 text-secondary-fixed" />
              <span>Solicitar Registro Asistencial (ReTHUS)</span>
            </button>
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
                  <label className="block text-[11px] font-semibold text-on-surface mb-1">
                    Correo Institucional
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      required
                      placeholder="usuario@saludconecta.ips.gov.co"
                      className="w-full h-8 pl-8 pr-3 text-xs bg-surface-container-low border border-outline-variant rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-on-surface"
                    />
                    <Mail className="w-3.5 h-3.5 text-outline absolute left-2.5 top-2.5" />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-on-surface mb-1">
                    Sede Operativa de Turno
                  </label>
                  <div className="relative">
                    <select
                      value={branch}
                      onChange={(e) => setBranch(e.target.value)}
                      className="w-full h-8 pl-8 pr-3 text-xs bg-surface-container-low border border-outline-variant rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-on-surface appearance-none"
                    >
                      <option value="Sede Cartago - Hospital Central (Nivel II)">
                        Sede Cartago - Hospital Central (Nivel II)
                      </option>
                      <option value="Sede La Unión (Urgencias)">
                        Sede La Unión (Urgencias)
                      </option>
                      <option value="Sede Tuluá (Ambulatoria)">
                        Sede Tuluá (Ambulatoria)
                      </option>
                      <option value="Brigada Rural (PWA Sync)">
                        Brigada Rural (PWA Sync)
                      </option>
                    </select>
                    <Building2 className="w-3.5 h-3.5 text-outline absolute left-2.5 top-2.5 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Contraseña */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold text-on-surface">
                    Contraseña Asistencial ReTHUS
                  </label>
                  <span className="text-[10px] text-primary font-mono font-medium">
                    Fortaleza: Alta (Médica)
                  </span>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••••••"
                    className="w-full h-8 pl-8 pr-9 text-xs bg-surface-container-low border border-outline-variant rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-on-surface"
                  />
                  <KeyRound className="w-3.5 h-3.5 text-outline absolute left-2.5 top-2.5" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-2 text-outline hover:text-on-surface cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* PASO 2: QR DIRECTAMENTE VISIBLE PARA ESCANEO + CASILLAS DE ENTRADA VACIAS */}
              <div className="p-2.5 rounded-xl bg-surface-container-low border border-primary/25 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 rounded-lg bg-primary-container text-white flex items-center justify-center shrink-0">
                      <Smartphone className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-on-surface">Segundo Factor Obligatorio (TOTP)</h3>
                      <p className="text-[10px] text-on-surface-variant">Escanee el QR con Google Authenticator o Authy</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1 px-2 py-0.5 bg-white rounded-full shadow-xs text-primary font-mono text-[11px]">
                    <Timer className="w-3 h-3" />
                    <span>Ventana: <strong>00:{mfaTimer.toString().padStart(2, '0')}s</strong></span>
                  </div>
                </div>

                {/* FILA PRINCIPAL: QR DIRECTO A LA IZQUIERDA Y CASILLAS VACIAS A LA DERECHA */}
                <div className="flex items-center justify-between gap-3 pt-1">
                  {/* CODIGO QR DIRECTAMENTE VISIBLE */}
                  <div className="flex flex-col items-center shrink-0">
                    <div className="p-1 bg-white rounded-xl border-2 border-primary shadow-xs">
                      {qrDataUrl ? (
                        <img
                          src={qrDataUrl}
                          alt="Codigo QR TOTP SaludConecta"
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

                  {/* CASILLAS VACIAS DONDE EL USUARIO ESCRIBE EL CODIGO */}
                  <div className="flex-1 flex flex-col justify-center space-y-1 min-w-0">
                    <label className="text-[10px] font-semibold text-on-surface leading-tight block">
                      Código de 6 dígitos de su aplicación:
                    </label>

                    <div className="flex items-center gap-1">
                      {totp.map((digit, idx) => (
                        <React.Fragment key={idx}>
                          {idx === 3 && <span className="text-outline font-bold text-xs">-</span>}
                          <input
                            id={`totp-input-${idx}`}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
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
                        title="Opcion de prueba: pega el codigo actual sincronizado"
                      >
                        Pegar código de prueba
                      </button>

                      <button
                        type="button"
                        onClick={handleManualRotate}
                        className="text-on-surface-variant hover:text-primary flex items-center gap-1 cursor-pointer"
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

              {statusMessage && (
                <div className="p-2 rounded-lg bg-primary/10 text-primary text-[11px] font-medium text-center">
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
                <span>{isSubmitting ? 'Verificando con Servidor...' : 'Verificar y Firmar Acceso Asistencial'}</span>
              </button>
            </form>
          </div>

          {/* Pie de Página */}
          <div className="pt-2 mt-2 border-t border-surface-container-high flex items-center justify-between text-[11px] text-on-surface-variant">
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setShowRegisterModal(true)}
                className="text-primary hover:underline font-semibold cursor-pointer text-[11px]"
              >
                Registrar Personal
              </button>
              <span className="text-outline">•</span>
              <span className="font-mono text-[9px] text-outline">Build 2026.02-prod</span>
            </div>

            {/* Switch Accesibilidad WCAG AAA */}
            <div className="flex items-center space-x-1.5 bg-surface-container-low px-2 py-0.5 rounded-full border border-outline-variant/30">
              <Contrast className="w-3 h-3 text-on-surface" />
              <span className="text-[9px] font-bold uppercase text-on-surface">Alto Contraste</span>
              <button
                type="button"
                onClick={() => setHighContrast(!highContrast)}
                className={`w-6 h-3.5 rounded-full relative transition-colors focus:outline-none p-0.5 flex items-center cursor-pointer ${
                  highContrast ? 'bg-primary' : 'bg-outline-variant'
                }`}
              >
                <div
                  className={`w-2.5 h-2.5 bg-white rounded-full shadow transition-transform ${
                    highContrast ? 'translate-x-2.5' : 'translate-x-0'
                  }`}
                ></div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL QR ESCANEABLE */}
      <MfaQrModal
        isOpen={showQrModal}
        onClose={() => setShowQrModal(false)}
        secret={mfaSecret}
        email={identifier}
      />

      {/* MODAL DE AUTORREGISTRO ASISTENCIAL RE-THUS */}
      <StaffRegisterModal
        isOpen={showRegisterModal}
        onClose={() => setShowRegisterModal(false)}
        onRegisterSuccess={() => {
          setStatusMessage('Registro enviado. Su cuenta está en cola de aprobación administrativa.');
        }}
      />
    </div>
  );
};

export default AuthScreen;
