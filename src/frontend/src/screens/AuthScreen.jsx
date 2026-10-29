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
} from 'lucide-react';

export const AuthScreen = ({ onLoginSuccess }) => {
  const [identifier, setIdentifier] = useState('sramirez@saludconecta.ips.gov.co');
  const [branch, setBranch] = useState('Sede Cartago - Hospital Central (Nivel II)');
  const [password, setPassword] = useState('ValleSalud2025*!Clinico');
  const [showPassword, setShowPassword] = useState(false);
  const [totp, setTotp] = useState(['4', '8', '2', '9', '1', '6']);
  const [mfaTimer, setMfaTimer] = useState(23);
  const [highContrast, setHighContrast] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  // Contador de expiracion de token TOTP (30s de ventana)
  useEffect(() => {
    const timer = setInterval(() => {
      setMfaTimer((prev) => (prev <= 1 ? 30 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleDigitChange = (index, value) => {
    if (value.length > 1) value = value.slice(-1);
    const newTotp = [...totp];
    newTotp[index] = value;
    setTotp(newTotp);

    // Auto-focus al siguiente input
    if (value && index < 5) {
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
    }, 400);
  };

  return (
    <div className={`min-h-screen w-full flex items-center justify-center p-4 md:p-8 ${highContrast ? 'bg-black text-white' : 'bg-surface'}`}>
      <div className="w-full max-w-7xl shadow-2xl rounded-2xl overflow-hidden bg-white grid grid-cols-1 lg:grid-cols-12 border border-surface-container-high">
        {/* PANEL IZQUIERDO: Identidad Institucional & Gobernanza Clinica */}
        <div className="lg:col-span-5 bg-gradient-to-b from-[#0F172A] via-[#132338] to-[#005c55] p-6 lg:p-10 text-white flex flex-col justify-between relative overflow-hidden">
          <div className="relative z-10 space-y-6">
            {/* Encabezado con Logotipo Oficial */}
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 rounded-2xl bg-white p-2 shadow-md flex items-center justify-center font-bold text-primary text-xl shrink-0">
                SC
              </div>
              <div className="min-w-0">
                <span className="inline-block px-2.5 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed text-[11px] font-bold uppercase tracking-wider mb-1">
                  Red Integrada Valle del Cauca
                </span>
                <h1 className="text-2xl font-bold text-white leading-tight">
                  SaludConecta IPS
                </h1>
                <p className="text-xs text-secondary-fixed-dim">
                  Portal Clinico Asistencial e Historia de Salud
                </p>
              </div>
            </div>

            {/* Sello de Calidad ISO/IEC 25010 */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 space-y-2 border border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FileCheck2 className="w-5 h-5 text-secondary-container" />
                  <span className="font-semibold text-xs text-white">
                    Certificado ISO/IEC 25010
                  </span>
                </div>
                <span className="px-2 py-0.5 bg-primary-container text-on-primary-container text-[10px] font-bold rounded">
                  Grado Medico Clase II
                </span>
              </div>
              <p className="text-xs text-white/80 leading-relaxed">
                Protocolo de auditoria continua y trazabilidad inmutable mediante funciones resumen hash SHA-256 segun estandar MinSalud.
              </p>
              <div className="pt-1 flex items-center space-x-1.5 font-mono text-[11px] text-tertiary-fixed">
                <Lock className="w-3.5 h-3.5" />
                <span className="truncate">SHA256: 7f83b165...e92f18</span>
                <span className="text-secondary-fixed ml-auto font-bold cursor-pointer hover:underline">
                  VERIFICAR
                </span>
              </div>
            </div>

            {/* Advertencia Juridica y Forense */}
            <div className="bg-red-500/15 rounded-xl p-4 space-y-2 border border-red-400/20">
              <div className="flex items-center space-x-2 text-red-200">
                <Scale className="w-4 h-4" />
                <span className="font-bold text-xs uppercase tracking-wide">
                  Advertencia Juridica & Forense
                </span>
              </div>
              <p className="text-xs text-white/90 leading-relaxed text-justify">
                Acceso restringido exclusivamente a profesionales de salud autorizados por el ReTHUS y MinSalud. Toda consulta o modificacion queda registrada bajo bitacora inalterable (<strong>Ley 1581 de 2012</strong> y <strong>Res. 1995 de 1999</strong>).
              </p>
            </div>

            {/* Indicador de Disponibilidad de Redes */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs font-semibold text-white">
                <span>Disponibilidad de Red Asistencial</span>
                <span className="flex items-center text-emerald-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 mr-1.5 animate-pulse"></span>
                  En Linea 99.98%
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-white/5 p-2.5 rounded-lg flex items-center justify-between">
                  <span className="text-white/80 truncate">Sede Cartago (H. Central)</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"></span>
                </div>
                <div className="bg-white/5 p-2.5 rounded-lg flex items-center justify-between">
                  <span className="text-white/80 truncate">Sede La Union (Urgencias)</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"></span>
                </div>
                <div className="bg-white/5 p-2.5 rounded-lg flex items-center justify-between">
                  <span className="text-white/80 truncate">Sede Tulua (Ambulatoria)</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"></span>
                </div>
                <div className="bg-white/5 p-2.5 rounded-lg flex items-center justify-between">
                  <span className="text-white/80 truncate">Brigada Rural (PWA Sync)</span>
                  <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" title="Modo Desconectado Sincronizado"></span>
                </div>
              </div>
            </div>
          </div>

          {/* Pie del Panel Izquierdo */}
          <div className="relative z-10 pt-4 mt-6 border-t border-white/10 flex items-center justify-between text-xs text-white/70">
            <div className="flex items-center space-x-2">
              <PhoneCall className="w-4 h-4 text-secondary-fixed" />
              <div>
                <div className="font-semibold text-white">Mesa de Ayuda Asistencial 24/7</div>
                <div className="font-mono text-[11px] text-tertiary-fixed">(+57) 602 211 0090 / Ext. 104</div>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded bg-white/10 font-mono text-[10px] text-white">
              Nodo: V-NORTE-01
            </span>
          </div>
        </div>

        {/* PANEL DERECHO: Formulario de Acceso Clinico de Doble Paso */}
        <div className="lg:col-span-7 p-6 lg:p-10 bg-white flex flex-col justify-between">
          <div>
            {/* Encabezado del Formulario */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 mb-6 border-b border-surface-container-high gap-2">
              <div>
                <h2 className="text-xl font-bold text-on-surface">Inicio de Sesion y Firma Biometrica</h2>
                <p className="text-xs text-on-surface-variant">Ingrese sus credenciales registradas ante el ReTHUS y MinSalud</p>
              </div>
              <div className="flex items-center space-x-1.5 px-3 py-1 bg-surface-container-low rounded-full self-start sm:self-auto">
                <ShieldCheck className="w-4 h-4 text-primary" />
                <span className="text-[11px] font-mono font-medium text-on-surface-variant">TLS 1.3 / E2EE</span>
              </div>
            </div>

            {/* Barra de Progreso de Pasos Asistenciales */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="flex items-center space-x-2.5 p-2.5 rounded-xl bg-surface-container-low border border-outline-variant/30">
                <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xs">
                  1
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-xs text-on-surface truncate">Credenciales & Sede</div>
                  <div className="text-[11px] text-primary flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-primary" /> Verificado
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2.5 p-2.5 rounded-xl bg-primary/10 border border-primary/20">
                <div className="w-6 h-6 rounded-full bg-primary-container text-white flex items-center justify-center font-bold text-xs ring-2 ring-primary">
                  2
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-xs text-primary truncate">Segundo Factor MFA</div>
                  <div className="text-[11px] text-primary font-medium">En validacion activa</div>
                </div>
              </div>
            </div>

            {/* Formulario */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Identificacion */}
                <div>
                  <label className="block text-xs font-semibold text-on-surface mb-1">
                    Correo Institucional o C.C.
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
                    <input
                      type="text"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="ej. 1113845920"
                      className="w-full h-11 pl-9 pr-3 rounded-lg bg-surface-container-lowest text-on-surface text-sm border border-outline-variant focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-xs"
                    />
                  </div>
                </div>

                {/* Sede Operativa */}
                <div>
                  <label className="block text-xs font-semibold text-on-surface mb-1">
                    Sede Operativa de Turno
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
                    <select
                      value={branch}
                      onChange={(e) => setBranch(e.target.value)}
                      className="w-full h-11 pl-9 pr-8 rounded-lg bg-surface-container-lowest text-on-surface text-xs font-medium border border-outline-variant focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-xs appearance-none cursor-pointer"
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
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-on-surface">
                    Contrasena Asistencial ReTHUS
                  </label>
                  <span className="font-mono text-[11px] text-primary font-semibold">Fortaleza: Alta (Medica)</span>
                </div>
                <div className="relative">
                  <KeyRound className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-11 pl-9 pr-10 rounded-lg bg-surface-container-lowest text-on-surface text-sm border border-outline-variant focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface p-1 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {/* Medidor de Fortaleza */}
                <div className="grid grid-cols-4 gap-1.5 mt-1.5">
                  <div className="h-1 rounded-full bg-primary"></div>
                  <div className="h-1 rounded-full bg-primary"></div>
                  <div className="h-1 rounded-full bg-primary"></div>
                  <div className="h-1 rounded-full bg-primary-container"></div>
                </div>
              </div>

              {/* PASO 2: MFA / TOTP OBLIGATORIO */}
              <div className="p-4 rounded-xl bg-surface-container-low border border-primary/25 space-y-3 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-lg bg-primary-container text-white flex items-center justify-center shrink-0">
                      <Smartphone className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-on-surface">Segundo Factor Obligatorio (TOTP)</h3>
                      <p className="text-[11px] text-on-surface-variant">Google Authenticator, Authy o Microsoft Authenticator</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1.5 px-3 py-1 bg-white rounded-full shadow-xs text-primary font-mono text-xs self-start sm:self-auto">
                    <Timer className="w-3.5 h-3.5" />
                    <span>Expira en <strong>00:{mfaTimer.toString().padStart(2, '0')}s</strong></span>
                  </div>
                </div>

                {/* Casillas de 6 Digitos */}
                <div className="py-1">
                  <div className="flex justify-between items-center max-w-sm mx-auto gap-2">
                    {totp.map((digit, idx) => (
                      <React.Fragment key={idx}>
                        {idx === 3 && <span className="text-outline font-bold">-</span>}
                        <input
                          id={`totp-input-${idx}`}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleDigitChange(idx, e.target.value)}
                          onKeyDown={(e) => handleKeyDown(idx, e)}
                          className="w-11 h-12 text-center text-lg font-bold rounded-lg bg-white border-2 border-primary text-primary focus:outline-none focus:ring-2 focus:ring-primary shadow-xs"
                        />
                      </React.Fragment>
                    ))}
                  </div>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-center justify-between text-xs text-on-surface-variant border-t border-surface-container-high/60 gap-2">
                  <span className="text-primary font-medium cursor-pointer hover:underline text-[11px]">
                    Acceso de contingencia: Llave FIDO2 / Token Criptografico
                  </span>
                  <span className="text-[10px] text-outline font-mono">Hash Semilla: SHA256-RTH-994</span>
                </div>
              </div>

              {/* Advertencia de Bloqueo */}
              <div className="p-3 bg-amber-50 rounded-xl flex items-start space-x-2 border border-amber-200">
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-900 leading-snug">
                  <strong>Control de Acceso Asistencial:</strong> Bloqueo preventivo de credenciales tras 5 intentos fallidos consecutivos segun politica de seguridad Res. 1995 de 1999.
                </p>
              </div>

              {statusMessage && (
                <div className="p-2.5 rounded-lg bg-primary/10 text-primary text-xs font-medium text-center">
                  {statusMessage}
                </div>
              )}

              {/* Boton Principal */}
              <button
                type="submit"
                className="w-full h-12 bg-primary hover:bg-primary-container text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg flex items-center justify-center space-x-2 transition-all cursor-pointer active:scale-[0.99]"
              >
                <Lock className="w-4 h-4" />
                <span>Verificar y Firmar Sesion Clinica</span>
              </button>
            </form>
          </div>

          {/* Pie de Pagina */}
          <div className="pt-4 mt-6 border-t border-surface-container-high flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-on-surface-variant">
            <div className="flex items-center space-x-3">
              <span className="text-primary hover:underline font-semibold cursor-pointer">
                Recuperar Contrasena o Token MFA
              </span>
              <span className="text-outline">•</span>
              <span className="font-mono text-[10px] text-outline">Build 2026.02-prod-valle</span>
            </div>

            {/* Switch Accesibilidad WCAG AAA */}
            <div className="flex items-center space-x-2 bg-surface-container-low px-3 py-1.5 rounded-full border border-outline-variant/30">
              <Contrast className="w-3.5 h-3.5 text-on-surface" />
              <span className="text-[10px] font-bold uppercase text-on-surface">Alto Contraste WCAG AAA</span>
              <button
                type="button"
                onClick={() => setHighContrast(!highContrast)}
                className={`w-7 h-4 rounded-full relative transition-colors focus:outline-none p-0.5 flex items-center cursor-pointer ${
                  highContrast ? 'bg-primary' : 'bg-outline-variant'
                }`}
              >
                <div
                  className={`w-3 h-3 bg-white rounded-full shadow transition-transform ${
                    highContrast ? 'translate-x-3' : 'translate-x-0'
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

