import React, { useEffect, useRef, useState } from 'react';
import { Lock, X, AlertTriangle, Loader2 } from 'lucide-react';

/**
 * Confirmacion de cierre y firma digital del folio. El cierre es irreversible
 * (Res. 1995 de 1999), por lo que se exige reescribir el identificador de firma del medico.
 */
export const SignFolioModal = ({ isOpen, expectedSignature, loading, error, onClose, onConfirm }) => {
  const [typed, setTyped] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    setTyped('');
    inputRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape' && !loading) onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, loading, onClose]);

  if (!isOpen) return null;

  const expected = expectedSignature.trim().toLowerCase();
  const matches = expected !== '' && typed.trim().toLowerCase() === expected;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (matches && !loading) onConfirm();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="sign-folio-title"
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-surface-container-high overflow-hidden"
      >
        <div className="px-5 py-4 bg-gradient-to-r from-[#005c55] to-[#132338] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Lock className="w-4 h-4" />
            <h2 id="sign-folio-title" className="text-sm font-bold">
              Cerrar y firmar folio
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            aria-label="Cerrar confirmación de firma"
            className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center text-white/80 hover:text-white cursor-pointer disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs">
          <p className="text-on-surface-variant leading-relaxed">
            Al cerrar, el folio se sella con SHA-256 y queda inmutable. Cualquier precisión posterior solo podrá
            registrarse como nota aclaratoria.
          </p>

          {error && (
            <div role="alert" className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label htmlFor="sign-folio-input" className="block font-semibold text-on-surface mb-1">
              Escriba su identificador de firma ({expectedSignature}) para confirmar
            </label>
            <input
              id="sign-folio-input"
              ref={inputRef}
              type="text"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              disabled={loading}
              autoComplete="off"
              className="w-full h-10 px-3 rounded-lg border border-outline-variant bg-surface-container-low font-mono uppercase focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="pt-3 border-t border-surface-container-high flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="h-9 px-4 rounded-xl border border-outline-variant text-on-surface font-semibold hover:bg-surface-container-high cursor-pointer disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!matches || loading}
              className="h-9 px-5 rounded-xl bg-primary text-white font-semibold hover:bg-primary-container shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
              <span>{loading ? 'Sellando...' : 'Cerrar y Sellar Folio'}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default SignFolioModal;
