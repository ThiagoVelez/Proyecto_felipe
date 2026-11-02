import React, { useState, useEffect, useRef } from 'react';
import {
  QrCode,
  X,
  Smartphone,
  Copy,
  Check,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { generateQrDataUrl } from '../utils/totp';

/**
 * Muestra el QR y la clave manual de un secreto TOTP emitido por el servidor.
 * El componente no calcula ni valida codigos: la verificacion ocurre en el backend.
 */
export const MfaQrModal = ({ isOpen, onClose, secret, otpauthUri }) => {
  const [qrUrl, setQrUrl] = useState('');
  const [qrFailed, setQrFailed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState('');
  const closeButtonRef = useRef(null);

  useEffect(() => {
    if (!isOpen || !otpauthUri) return undefined;
    let cancelled = false;
    setQrUrl('');
    setQrFailed(false);

    generateQrDataUrl(otpauthUri).then((url) => {
      if (cancelled) return;
      if (url) setQrUrl(url);
      else setQrFailed(true);
    });

    return () => {
      cancelled = true;
    };
  }, [isOpen, otpauthUri]);

  useEffect(() => {
    if (!isOpen) return undefined;
    closeButtonRef.current?.focus();
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!copied) return undefined;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  if (!isOpen) return null;

  const handleCopySecret = async () => {
    try {
      await navigator.clipboard.writeText(secret);
      setCopyError('');
      setCopied(true);
    } catch {
      setCopyError('No fue posible copiar la clave. Seleccionela manualmente.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mfa-qr-title"
    >
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-surface-container-high overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-5 py-4 bg-primary text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              <QrCode className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 id="mfa-qr-title" className="text-sm font-bold leading-tight">Vincular Aplicacion Autenticadora (TOTP)</h2>
              <p className="text-[11px] text-white/80">Google Authenticator, Microsoft Authenticator o Authy</p>
            </div>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Cerrar ventana de vinculacion"
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4">
          <div className="bg-surface-container-low p-3 rounded-xl border border-outline-variant/30 text-xs space-y-1.5 text-on-surface">
            <div className="font-bold text-primary flex items-center gap-1.5">
              <Smartphone className="w-4 h-4" /> Instrucciones de escaneo en 3 pasos:
            </div>
            <ol className="list-decimal list-inside space-y-1 text-on-surface-variant text-[11px] pl-1">
              <li>Abre tu aplicacion autenticadora en tu celular.</li>
              <li>Toca el boton <strong>(+)</strong> o <strong>Agregar cuenta</strong> y selecciona <strong>Escanear codigo QR</strong>.</li>
              <li>Apunta la camara al codigo y escribe en la pantalla de seguridad el codigo de 6 digitos que muestre la aplicacion para confirmar.</li>
            </ol>
          </div>

          <div className="flex flex-col items-center justify-center py-2">
            <div className="p-3 bg-white rounded-2xl border-2 border-primary/30 shadow-md">
              {qrUrl ? (
                <img
                  src={qrUrl}
                  alt="Codigo QR TOTP SaludConecta"
                  className="w-48 h-48 rounded-lg"
                />
              ) : (
                <div className="w-48 h-48 flex items-center justify-center text-xs text-outline text-center">
                  {qrFailed ? 'No fue posible generar el QR. Use la clave manual.' : 'Generando codigo QR...'}
                </div>
              )}
            </div>
          </div>

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
            <div className="p-2 rounded bg-surface-container-high/60 font-mono text-center text-xs font-bold tracking-widest text-on-surface select-all break-all">
              {secret}
            </div>
            {copyError && (
              <p className="text-[10px] text-red-700 flex items-center justify-center gap-1" role="alert">
                <AlertTriangle className="w-3 h-3" /> {copyError}
              </p>
            )}
            <p className="text-[10px] text-outline text-center">
              Tipo: Basado en tiempo (TOTP), intervalo 30 s, 6 digitos
            </p>
          </div>
        </div>

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
