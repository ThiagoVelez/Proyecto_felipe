import React, { useState, useEffect } from 'react';
import {
  QrCode,
  X,
  Smartphone,
  Copy,
  Check,
  CheckCircle2,
  Timer,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';
import {
  buildOtpAuthUri,
  generateQrDataUrl,
  calculateTotpCode,
  getRemainingSeconds,
} from '../utils/totp';

export const MfaQrModal = ({ isOpen, onClose, secret = 'JBSWY3DPEHPK3PXP', email = 'svelez@saludconecta.ips.gov.co' }) => {
  const [qrUrl, setQrUrl] = useState('');
  const [currentCode, setCurrentCode] = useState('------');
  const [remaining, setRemaining] = useState(getRemainingSeconds());
  const [copied, setCopied] = useState(false);

  // Generar QR y sincronizar TOTP al abrir
  useEffect(() => {
    if (!isOpen) return;

    const uri = buildOtpAuthUri(secret, email, 'SaludConecta IPS');
    generateQrDataUrl(uri).then((url) => {
      if (url) setQrUrl(url);
    });

    const updateCode = async () => {
      const code = await calculateTotpCode(secret);
      setCurrentCode(code);
      setRemaining(getRemainingSeconds());
    };

    updateCode();

    const interval = setInterval(() => {
      const rem = getRemainingSeconds();
      setRemaining(rem);
      if (rem === 30 || rem === 29) {
        updateCode();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, secret, email]);

  if (!isOpen) return null;

  const handleCopySecret = () => {
    navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-surface-container-high overflow-hidden flex flex-col max-h-[90vh]">
        {/* ENCABEZADO */}
        <div className="px-5 py-4 bg-primary text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              <QrCode className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold leading-tight">Vincular Aplicacion Autenticadora (TOTP)</h2>
              <p className="text-[11px] text-white/80">Google Authenticator • Microsoft Authenticator • Authy</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CONTENIDO PRINCIPAL */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* PASOS DE CONFIGURACION */}
          <div className="bg-surface-container-low p-3 rounded-xl border border-outline-variant/30 text-xs space-y-1.5 text-on-surface">
            <div className="font-bold text-primary flex items-center gap-1.5">
              <Smartphone className="w-4 h-4" /> Instrucciones de escaneo en 3 pasos:
            </div>
            <ol className="list-decimal list-inside space-y-1 text-on-surface-variant text-[11px] pl-1">
              <li>Abre tu aplicacion autenticadora en tu celular (Google Authenticator, Microsoft Authenticator o Authy).</li>
              <li>Toca el boton <strong>(+)</strong> o <strong>Agregar cuenta</strong> y selecciona <strong>Escanear codigo QR</strong>.</li>
              <li>Apunta la camara al codigo que aparece a continuacion.</li>
            </ol>
          </div>

          {/* CODIGO QR CENTRADO */}
          <div className="flex flex-col items-center justify-center py-2">
            <div className="p-3 bg-white rounded-2xl border-2 border-primary/30 shadow-md">
              {qrUrl ? (
                <img
                  src={qrUrl}
                  alt="Codigo QR TOTP SaludConecta"
                  className="w-48 h-48 rounded-lg"
                />
              ) : (
                <div className="w-48 h-48 flex items-center justify-center text-xs text-outline">
                  Generando codigo QR...
                </div>
              )}
            </div>

            {/* Temporizador sincronizado con el telefono */}
            <div className="mt-3 flex items-center gap-2 px-3 py-1 bg-surface-container-low rounded-full text-xs font-mono">
              <Timer className="w-3.5 h-3.5 text-primary" />
              <span className="text-on-surface-variant">Ventana TOTP:</span>
              <span className="font-bold text-primary">00:{remaining.toString().padStart(2, '0')}s</span>
            </div>
          </div>

          {/* CLAVE MANUAL DE CONFIGURACION */}
          <div className="p-3 rounded-xl bg-surface-container-lowest border border-outline-variant/40 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-on-surface">Clave de entrada manual (Base32):</span>
              <button
                type="button"
                onClick={handleCopySecret}
                className="text-primary hover:underline font-bold text-[11px] flex items-center gap-1 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copiada' : 'Copiar Clave'}
              </button>
            </div>
            <div className="p-2 rounded bg-surface-container-high/60 font-mono text-center text-xs font-bold tracking-widest text-on-surface select-all">
              {secret}
            </div>
            <p className="text-[10px] text-outline text-center">
              Tipo: Basado en tiempo (TOTP) • Intervalo: 30s • Digitos: 6
            </p>
          </div>

          {/* CODIGO ACTUAL EN TIEMPO REAL */}
          <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold text-primary">Codigo en tu celular en este momento:</div>
              <div className="text-[10px] text-on-surface-variant">Verifica que coincida con tu aplicacion</div>
            </div>
            <div className="text-xl font-mono font-bold text-primary tracking-widest bg-white px-3 py-1 rounded-lg border border-primary/30 shadow-xs">
              {currentCode}
            </div>
          </div>
        </div>

        {/* PIE DE ACCIONES */}
        <div className="p-4 bg-surface-container-low border-t border-surface-container-high flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-primary hover:bg-primary-container text-white text-xs font-bold transition-all shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            Listo, ya escanee el codigo
          </button>
        </div>
      </div>
    </div>
  );
};

export default MfaQrModal;

