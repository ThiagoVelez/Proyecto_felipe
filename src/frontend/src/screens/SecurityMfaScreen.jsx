import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  Smartphone,
  KeyRound,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  History,
  FileCheck2,
  Fingerprint,
  Copy,
  ExternalLink,
  Laptop,
  Check,
  UserCheck,
  QrCode,
} from 'lucide-react';
import {
  buildOtpAuthUri,
  generateQrDataUrl,
  calculateTotpCode,
  getRemainingSeconds,
  generateBase32Secret,
} from '../utils/totp';
import MfaQrModal from '../components/MfaQrModal';

export const SecurityMfaScreen = ({ onLogout }) => {
  const [mfaSecret, setMfaSecret] = useState('JBSWY3DPEHPK3PXP');
  const [mfaTimer, setMfaTimer] = useState(getRemainingSeconds());
  const [totpCode, setTotpCode] = useState(['-', '-', '-', '-', '-', '-']);
  const [qrUrl, setQrUrl] = useState('');
  const [testInput, setTestInput] = useState('');
  const [testResult, setTestResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [lastRotated, setLastRotated] = useState('Sincronizado');
  const [showQrModal, setShowQrModal] = useState(false);

  // Sincroniza el codigo TOTP y genera el QR code
  const syncSecurityTotp = async (secret = mfaSecret) => {
    try {
      const code = await calculateTotpCode(secret);
      setTotpCode(code.split(''));

      const uri = buildOtpAuthUri(secret, 'sramirez@saludconecta.ips.gov.co', 'SaludConecta IPS');
      const dataUrl = await generateQrDataUrl(uri);
      if (dataUrl) setQrUrl(dataUrl);

      setLastRotated('Recien actualizado');
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    syncSecurityTotp(mfaSecret);

    const interval = setInterval(() => {
      const rem = getRemainingSeconds();
      setMfaTimer(rem);
      if (rem === 30 || rem === 29) {
        syncSecurityTotp(mfaSecret);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [mfaSecret]);

  const handleManualRefresh = () => {
    syncSecurityTotp(mfaSecret);
  };

  const handleRotateSecret = () => {
    const newSecret = generateBase32Secret(16);
    setMfaSecret(newSecret);
    syncSecurityTotp(newSecret);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(totpCode.join(''));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleVerifyTest = async (e) => {
    e.preventDefault();
    const cleanInput = testInput.trim();
    if (cleanInput.length < 6) {
      setTestResult({
        success: false,
        message: 'Ingrese los 6 digitos para validar.',
      });
      return;
    }

    const expected = await calculateTotpCode(mfaSecret);
    if (cleanInput === expected) {
      setTestResult({
        success: true,
        message: 'Token TOTP validado con exito. Firma biometrica sincronizada con el servidor.',
      });
    } else {
      setTestResult({
        success: false,
        message: `Codigo invalido. El token esperado era ${expected} o el de su app autenticadora.`,
      });
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* ENCABEZADO DEL MODULO DE SEGURIDAD */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-surface-container-high gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-bold uppercase tracking-wider font-mono">
              Gobernanza ISO/IEC 27001 & 25010
            </span>
            <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
              Sesion Activa Cifrada
            </span>
          </div>
          <h1 className="text-2xl font-bold text-on-surface">
            Seguridad Asistencial, Credenciales y Segundo Factor (MFA)
          </h1>
          <p className="text-xs text-on-surface-variant">
            Administracion del doble factor de autenticacion obligatorio (TOTP) y firma forense para personal de salud.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowQrModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary-container transition-colors shadow-xs cursor-pointer"
          >
            <QrCode className="w-4 h-4" />
            Escanear QR con Celular
          </button>
          <button
            type="button"
            onClick={handleManualRefresh}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-surface-container-low hover:bg-surface-container-high text-on-surface text-xs font-semibold border border-outline-variant/40 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-4 h-4 text-primary" />
            Sincronizar Reloj TOTP
          </button>
        </div>
      </div>

      {/* TARJETA DE IDENTIFICACION PROFESIONAL */}
      <div className="p-4 rounded-2xl bg-white border border-surface-container-high shadow-xs grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary text-white flex items-center justify-center font-bold text-base shrink-0">
            SR
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-on-surface truncate">Dra. Sofia Ramirez C.</span>
              <UserCheck className="w-4 h-4 text-primary shrink-0" />
            </div>
            <p className="text-xs text-on-surface-variant truncate">sramirez@saludconecta.ips.gov.co</p>
            <p className="text-[11px] font-mono text-outline">RM-76001-VALLE • Cirugia General</p>
          </div>
        </div>

        <div className="flex flex-col justify-center px-4 md:border-l md:border-r border-surface-container-high">
          <span className="text-[11px] font-bold uppercase tracking-wider text-outline">
            Sede Asistencial Asignada
          </span>
          <span className="text-xs font-semibold text-on-surface mt-0.5">
            Sede Cartago - Hospital Central (Nivel II)
          </span>
          <span className="text-[11px] text-emerald-700 font-medium">Turno Manana [07:00 - 13:00 COT]</span>
        </div>

        <div className="flex flex-col justify-center">
          <span className="text-[11px] font-bold uppercase tracking-wider text-outline">
            Validacion ReTHUS & MinSalud
          </span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-bold text-emerald-800">Profesional Habilitado Vigente</span>
          </div>
          <span className="text-[10px] text-outline font-mono">Registro Nacional: RTH-2026-VAL-88219</span>
        </div>
      </div>

      {/* GENERADOR EN VIVO DEL CODIGO TOTP DINAMICO Y QR INTEGRADO */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* PANEL IZQUIERDO: Token Dinamico + QR Code Escaneable */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-primary/20 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-surface-container-high">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-container text-white flex items-center justify-center">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-on-surface">Token Dinamico TOTP (RFC 6238)</h2>
                  <p className="text-xs text-on-surface-variant">
                    Escanee el QR con Google Authenticator, Microsoft Authenticator o Authy
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 px-3 py-1 bg-surface-container-low rounded-full border border-primary/20">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-xs font-mono font-bold text-primary">
                  00:{mfaTimer.toString().padStart(2, '0')}s
                </span>
              </div>
            </div>

            {/* SECCION CENTRAL: QR Y DIGITOS */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center py-2">
              {/* QR Escaneable */}
              <div className="md:col-span-5 flex flex-col items-center">
                <div className="p-2 bg-white rounded-xl border-2 border-primary/30 shadow-xs">
                  {qrUrl ? (
                    <img
                      src={qrUrl}
                      alt="Codigo QR TOTP"
                      className="w-36 h-36 rounded-lg cursor-pointer"
                      onClick={() => setShowQrModal(true)}
                      title="Haz clic para ampliar el QR"
                    />
                  ) : (
                    <div className="w-36 h-36 flex items-center justify-center text-xs text-outline">
                      Generando QR...
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setShowQrModal(true)}
                  className="mt-2 text-primary font-bold text-[11px] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  Ampliar QR
                </button>
              </div>

              {/* Digitos y Progreso */}
              <div className="md:col-span-7 flex flex-col justify-center space-y-3">
                <div className="text-[11px] font-semibold text-on-surface-variant">
                  Codigo sincronizado con tu movil:
                </div>
                <div className="flex items-center gap-1.5">
                  {totpCode.map((digit, idx) => (
                    <React.Fragment key={idx}>
                      {idx === 3 && <span className="text-lg font-bold text-outline">-</span>}
                      <div className="w-10 h-12 rounded-lg bg-surface-container-lowest border-2 border-primary flex items-center justify-center text-xl font-mono font-bold text-primary shadow-xs">
                        {digit}
                      </div>
                    </React.Fragment>
                  ))}
                </div>

                {/* Barra de expiracion */}
                <div className="w-full bg-surface-container-high rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-primary h-1.5 rounded-full transition-all duration-1000 ease-linear"
                    style={{ width: `${(mfaTimer / 30) * 100}%` }}
                  ></div>
                </div>
                <div className="flex items-center justify-between text-[10px] text-on-surface-variant font-mono">
                  <span>RFC 6238 (30s)</span>
                  <span>{lastRotated}</span>
                </div>
              </div>
            </div>

            {/* Metadatos de Semilla Criptografica */}
            <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/30 space-y-1.5 mt-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-on-surface">Semilla Secreta Asignada (Base32):</span>
                <span className="font-mono text-xs text-primary font-bold">{mfaSecret}</span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-on-surface-variant">
                <span>Cuenta URI:</span>
                <span className="font-mono text-outline">SaludConecta:sramirez@saludconecta.ips.gov.co</span>
              </div>
            </div>
          </div>

          <div className="pt-3 mt-3 border-t border-surface-container-high flex items-center justify-between">
            <button
              type="button"
              onClick={handleCopyCode}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-semibold transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copiado al portapapeles' : 'Copiar Codigo'}
            </button>

            <button
              type="button"
              onClick={handleRotateSecret}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-container text-white text-xs font-semibold hover:bg-primary transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Generar Nueva Semilla QR
            </button>
          </div>
        </div>

        {/* PANEL DERECHO: Simulador de Validacion de Factor & Auditoria */}
        <div className="lg:col-span-5 space-y-4">
          {/* Validador Interactivo de Token */}
          <div className="bg-white rounded-2xl p-5 border border-surface-container-high shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-bold text-on-surface">Probar Codigo de tu Celular</h3>
            </div>
            <p className="text-xs text-on-surface-variant">
              Escanea el QR en tu telefono y escribe aqui el codigo que muestra tu aplicacion para comprobar la sincronizacion en tiempo real.
            </p>

            <form onSubmit={handleVerifyTest} className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength={6}
                  value={testInput}
                  onChange={(e) => setTestInput(e.target.value.replace(/\D/g, ''))}
                  placeholder={`ej. ${totpCode.join('')}`}
                  className="flex-1 h-10 px-3 rounded-lg border border-outline-variant text-center font-mono font-bold text-base tracking-widest focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
                <button
                  type="submit"
                  className="px-4 h-10 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-colors cursor-pointer shrink-0"
                >
                  Validar
                </button>
              </div>

              {testResult && (
                <div
                  className={`p-2.5 rounded-lg text-xs flex items-start gap-2 ${
                    testResult.success
                      ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                      : 'bg-red-50 text-red-900 border border-red-200'
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  )}
                  <span>{testResult.message}</span>
                </div>
              )}
            </form>
          </div>

          {/* Historial de Auditoria de Accesos Recientes */}
          <div className="bg-white rounded-2xl p-5 border border-surface-container-high shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold text-on-surface">Bitacora de Acceso Forense</h3>
              </div>
              <span className="text-[10px] font-mono text-outline">Ley 1581 / Res. 1995</span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-2 rounded-lg bg-surface-container-low flex items-center justify-between">
                <div>
                  <div className="font-semibold text-on-surface">Inicio de Sesion Asistencial</div>
                  <div className="text-[11px] text-on-surface-variant font-mono">IP: 192.168.1.45 • Cartago</div>
                </div>
                <span className="text-[10px] font-mono text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded font-bold">
                  TOTP OK
                </span>
              </div>

              <div className="p-2 rounded-lg bg-surface-container-low flex items-center justify-between">
                <div>
                  <div className="font-semibold text-on-surface">Firma Digital de Folio HCE</div>
                  <div className="text-[11px] text-on-surface-variant font-mono">Hash SHA256-7a9f...c412</div>
                </div>
                <span className="text-[10px] font-mono text-primary bg-primary/10 px-2 py-0.5 rounded font-bold">
                  FIRMA OK
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL QR ESCANEABLE */}
      <MfaQrModal
        isOpen={showQrModal}
        onClose={() => setShowQrModal(false)}
        secret={mfaSecret}
        email="sramirez@saludconecta.ips.gov.co"
      />
    </div>
  );
};

export default SecurityMfaScreen;
