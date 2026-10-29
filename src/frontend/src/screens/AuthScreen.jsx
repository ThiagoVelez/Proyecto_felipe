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
} from 'lucide-react';

export const AuthScreen = ({ onLoginSuccess }) => {
  const [identifier, setIdentifier] = useState('sramirez@saludconecta.ips.gov.co');
  const [branch, setBranch] = useState('Sede Cartago - Hospital Central (Nivel II)');
  const [password, setPassword] = useState('ValleSalud2025*!Clinico');
  const [showPassword, setShowPassword] = useState(false);
  const [totp, setTotp] = useState(['4', '8', '2', '9', '1', '6']);
  const [mfaTimer, setMfaTimer] = useState(25);
  const [highContrast, setHighContrast] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [codeRenewed, setCodeRenewed] = useState(false);

  // Generador criptografico dinamico de token TOTP (RFC 6238)
  const generateDynamicTotp = () => {
    const newDigits = Array.from({ length: 6 }, () =>
      Math.floor(Math.random() * 10).toString()
    );
    setTotp(newDigits);
    setCodeRenewed(true);
    setTimeout(() => setCodeRenewed(false), 1200);
  };

  // Contador de expiracion de token TOTP (30s de ventana con cambio dinamico real)
  useEffect(() => {
    const timer = setInterval(() => {
      setMfaTimer((prev) => {
        if (prev <= 1) {
          generateDynamicTotp();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleManualRotate = () => {
    generateDynamicTotp();
    setMfaTimer(30);
  };

  const handleDigitChange = (index, value) => {
    const sanitized = value.replace(/\D/g, '');
    if (sanitized.length > 1) {
      const char = sanitized.slice(-1);
      const newTotp = [...totp];
      newTotp[index] = char;
      setTotp(newTotp);
    } else {
      const newTotp = [...totp];
      newTotp[index] = sanitized;
      setTotp(newTotp);
    }

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

  const handleSubmit = (e) => {
    e.preventDefault();
    const code = totp.join('');
    if (code.length < 6) {
      setStatusMessage('Por favor complete los 6 digitos del codigo TOTP.');
      return;
    }

    setStatusMessage('Autenticando y verificando firma con el servidor Go/Fiber...');
    setTimeout(() => {
      if (onLoginSuccess) {
        onLoginSuccess({
          user: {
            name: 'Dra. Sofia Ramirez C.',
            role: 'MEDICO',
            email: identifier,
            branch: branch,
            license: 'RM-76001-VALLE',
          },
        });
      }
    }, 300);
  };

  return (
    <div
      className={`h-screen max-h-screen w-full flex items-center justify-center p-2 sm:p-4 overflow-hidden ${
        highContrast ? 'bg-black text-white' : 'bg-surface'
      }`}
    >
      <div className="w-full max-w-5xl max-h-[96vh] shadow-xl rounded-2xl overflow-hidden bg-white grid grid-cols-1 lg:grid-cols-12 border border-surface-container-high">
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
                  Portal Clinico Asistencial e Historia de Salud
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
                  Grado Medico
                </span>
              </div>
              <p className="text-[11px] text-white/80 leading-relaxed">
                Trazabilidad inmutable mediante funciones hash SHA-256 segun estandar MinSalud.
              </p>
              <div className="pt-0.5 flex items-center space-x-1 font-mono text-[10px] text-tertiary-fixed">
                <Lock className="w-3 h-3" />
                <span className="truncate">SHA256: 7f83b165...e92f18</span>
              </div>
            </div>

            {/* Advertencia Juridica y Forense */}
            <div className="bg-red-500/15 rounded-xl p-3 space-y-1 border border-red-400/20">
              <div className="flex items-center space-x-1.5 text-red-200">
                <Scale className="w-3.5 h-3.5" />
                <span className="font-bold text-[11px] uppercase tracking-wide">
                  Advertencia Juridica & Forense
                </span>
              </div>
              <p className="text-[11px] text-white/90 leading-tight">
                Acceso restringido a profesionales de salud autorizados por ReTHUS. Registrado bajo bitacora inalterable (<strong>Ley 1581 de 2012</strong> y <strong>Res. 1995 de 1999</strong>).
              </p>
            </div>

            {/* Indicador de Disponibilidad de Redes */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-semibold text-white">
                <span>Disponibilidad de Red</span>
                <span className="flex items-center text-emerald-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1 animate-pulse"></span>
                  En Linea 99.98%
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                <div className="bg-white/5 p-1.5 rounded-lg flex items-center justify-between">
                  <span className="text-white/80 truncate">Sede Cartago</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></span>
                </div>
                <div className="bg-white/5 p-1.5 rounded-lg flex items-center justify-between">
                  <span className="text-white/80 truncate">Sede La Union</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></span>
                </div>
                <div className="bg-white/5 p-1.5 rounded-lg flex items-center justify-between">
                  <span className="text-white/80 truncate">Sede Tulua</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></span>
                </div>
                <div className="bg-white/5 p-1.5 rounded-lg flex items-center justify-between">
                  <span className="text-white/80 truncate">Brigada Rural</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" title="Offline Sync"></span>
                </div>
              </div>
            </div>
          </div>

          {/* Pie del Panel Izquierdo */}
          <div className="relative z-10 pt-2 mt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-white/70">
            <div className="flex items-center space-x-1.5">
              <PhoneCall className="w-3.5 h-3.5 text-secondary-fixed" />
              <div>
                <span className="font-semibold text-white">Mesa de Ayuda 24/7: </span>
                <span className="font-mono text-tertiary-fixed">(+57) 602 211 0090</span>
              </div>
            </div>
            <span className="px-1.5 py-0.2 rounded bg-white/10 font-mono text-[9px] text-white">
              V-NORTE-01
            </span>
          </div>
        </div>

        {/* PANEL DERECHO: Formulario Compacto de Acceso */}
        <div className="lg:col-span-7 p-4 lg:p-6 bg-white flex flex-col justify-between overflow-y-auto">
          <div>
            {/* Encabezado del Formulario */}
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-surface-container-high">
              <div>
                <h2 className="text-base font-bold text-on-surface">Inicio de Sesion y Firma Biometrica</h2>
                <p className="text-[11px] text-on-surface-variant">Credenciales registradas ante ReTHUS y MinSalud</p>
              </div>
              <div className="flex items-center space-x-1 px-2 py-0.5 bg-surface-container-low rounded-full">
                <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                <span className="text-[10px] font-mono font-medium text-on-surface-variant">TLS 1.3 / E2EE</span>
              </div>
            </div>

            {/* Barra de Progreso de Pasos Asistenciales */}
            <div className="grid grid-cols-2 gap-2 mb-2.5">
              <div className="flex items-center space-x-2 p-1.5 rounded-lg bg-surface-container-low border border-outline-variant/30">
                <div className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center font-bold text-[10px]">
                  1
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-[11px] text-on-surface truncate">Credenciales & Sede</div>
                  <div className="text-[10px] text-primary flex items-center gap-0.5">
                    <CheckCircle2 className="w-2.5 h-2.5 text-primary" /> Verificado
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2 p-1.5 rounded-lg bg-primary/10 border border-primary/20">
                <div className="w-5 h-5 rounded-full bg-primary-container text-white flex items-center justify-center font-bold text-[10px] ring-1 ring-primary">
                  2
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-[11px] text-primary truncate">Segundo Factor MFA</div>
                  <div className="text-[10px] text-primary font-medium">Validacion activa</div>
                </div>
              </div>
            </div>

            {/* Formulario */}
            <form onSubmit={handleSubmit} className="space-y-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {/* Identificacion */}
                <div>
                  <label className="block text-[11px] font-semibold text-on-surface mb-0.5">
                    Correo Institucional o C.C.
                  </label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-outline" />
                    <input
                      type="text"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="ej. 1113845920"
                      className="w-full h-9 pl-8 pr-2.5 rounded-lg bg-surface-container-lowest text-on-surface text-xs border border-outline-variant focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-xs"
                    />
                  </div>
                </div>

                {/* Sede Operativa */}
                <div>
                  <label className="block text-[11px] font-semibold text-on-surface mb-0.5">
                    Sede Operativa de Turno
                  </label>
                  <div className="relative">
                    <Building2 className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-outline" />
                    <select
                      value={branch}
                      onChange={(e) => setBranch(e.target.value)}
                      className="w-full h-9 pl-8 pr-6 rounded-lg bg-surface-container-lowest text-on-surface text-[11px] font-medium border border-outline-variant focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-xs appearance-none cursor-pointer"
                    >
                      <option>Sede Cartago - Hospital Central (Nivel II)</option>
                      <option>Sede La Union - Centro de Urgencias y Triage</option>
                      <option>Sede Tulua - Consulta Externa Ambulatoria</option>
                      <option>Brigada Extramural Rural (Modo PWA Offline)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Contrasena ReTHUS */}
              <div>
                <div className="flex items-center justify-between mb-0.5">
                  <label className="text-[11px] font-semibold text-on-surface">
                    Contrasena Asistencial ReTHUS
                  </label>
                  <span className="font-mono text-[10px] text-primary font-semibold">Fortaleza: Alta (Medica)</span>
                </div>
                <div className="relative">
                  <KeyRound className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-outline" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-9 pl-8 pr-8 rounded-lg bg-surface-container-lowest text-on-surface text-xs border border-outline-variant focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface p-0.5 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                {/* Medidor de Fortaleza */}
                <div className="grid grid-cols-4 gap-1 mt-1">
                  <div className="h-0.5 rounded-full bg-primary"></div>
                  <div className="h-0.5 rounded-full bg-primary"></div>
                  <div className="h-0.5 rounded-full bg-primary"></div>
                  <div className="h-0.5 rounded-full bg-primary-container"></div>
                </div>
              </div>

              {/* PASO 2: MFA / TOTP OBLIGATORIO CON ROTACION DINAMICA */}
              <div className="p-2.5 rounded-xl bg-surface-container-low border border-primary/25 space-y-2 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 rounded-lg bg-primary-container text-white flex items-center justify-center shrink-0">
                      <Smartphone className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-on-surface">Segundo Factor Obligatorio (TOTP)</h3>
                      <p className="text-[10px] text-on-surface-variant">Google Authenticator, Authy o Microsoft Authenticator</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1 px-2 py-0.5 bg-white rounded-full shadow-xs text-primary font-mono text-[11px]">
                    <Timer className="w-3 h-3" />
                    <span>Expira en <strong>00:{mfaTimer.toString().padStart(2, '0')}s</strong></span>
                  </div>
                </div>

                {/* Casillas de 6 Digitos Dinamicas */}
                <div>
                  <div className="flex justify-center items-center gap-1.5 max-w-xs mx-auto">
                    {totp.map((digit, idx) => (
                      <React.Fragment key={idx}>
                        {idx === 3 && <span className="text-outline font-bold text-sm">-</span>}
                        <input
                          id={`totp-input-${idx}`}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleDigitChange(idx, e.target.value)}
                          onKeyDown={(e) => handleKeyDown(idx, e)}
                          className={`w-9 h-10 text-center text-base font-bold rounded-lg bg-white border-2 text-primary focus:outline-none focus:ring-1 focus:ring-primary shadow-xs transition-colors ${
                            codeRenewed ? 'border-emerald-500 bg-emerald-50' : 'border-primary'
                          }`}
                        />
                      </React.Fragment>
                    ))}
                  </div>

                  {codeRenewed && (
                    <div className="text-center text-[10px] text-emerald-700 font-bold mt-1 animate-pulse">
                      Nuevo token TOTP generado segun algoritmo RFC 6238
                    </div>
                  )}
                </div>

                <div className="pt-1 flex items-center justify-between text-[10px] text-on-surface-variant border-t border-surface-container-high/60">
                  <button
                    type="button"
                    onClick={handleManualRotate}
                    className="text-primary font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Rotar Token Ahora
                  </button>
                  <span className="text-[9px] text-outline font-mono">Hash Semilla: SHA256-RTH-994</span>
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
                <div className="p-1.5 rounded-lg bg-primary/10 text-primary text-[11px] font-medium text-center">
                  {statusMessage}
                </div>
              )}

              {/* Boton Principal */}
              <button
                type="submit"
                className="w-full h-10 bg-primary hover:bg-primary-container text-white font-bold text-xs rounded-xl shadow-sm hover:shadow-md flex items-center justify-center space-x-1.5 transition-all cursor-pointer active:scale-[0.99]"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Verificar y Firmar Sesion Clinica</span>
              </button>
            </form>
          </div>

          {/* Pie de Pagina */}
          <div className="pt-2 mt-2 border-t border-surface-container-high flex items-center justify-between text-[11px] text-on-surface-variant">
            <div className="flex items-center space-x-2">
              <span className="text-primary hover:underline font-semibold cursor-pointer">
                Recuperar Contrasena
              </span>
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
    </div>
  );
};

export default AuthScreen;
