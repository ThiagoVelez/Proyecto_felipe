import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  Smartphone,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  FileCheck2,
  Fingerprint,
  UserCheck,
  QrCode,
  X,
} from 'lucide-react';
import { generateQrDataUrl } from '../utils/totp';
import { apiClient } from '../services/api';
import MfaQrModal from '../components/MfaQrModal';

const CODE_LENGTH = 6;

/**
 * Seguridad de la cuenta y configuracion del segundo factor (TOTP).
 * El secreto, la URI otpauth y la verificacion de codigos provienen siempre del servidor.
 */
export const SecurityMfaScreen = ({ user, onUpdateUser }) => {
  const [setupData, setSetupData] = useState(null);
  const [qrUrl, setQrUrl] = useState('');
  const [currentCode, setCurrentCode] = useState('');
  const [confirmCode, setConfirmCode] = useState('');
  const [isStarting, setIsStarting] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [showQrModal, setShowQrModal] = useState(false);

  const mfaEnabled = Boolean(user?.mfa_enabled);

  useEffect(() => {
    if (!setupData?.otpauth_uri) {
      setQrUrl('');
      return undefined;
    }
    let cancelled = false;
    generateQrDataUrl(setupData.otpauth_uri).then((url) => {
      if (!cancelled) setQrUrl(url || '');
    });
    return () => {
      cancelled = true;
    };
  }, [setupData]);

  const handleRefreshStatus = async () => {
    setIsRefreshing(true);
    setFeedback(null);
    try {
      const fresh = await apiClient.me();
      if (fresh) onUpdateUser?.(fresh);
      setFeedback({ success: true, message: 'Estado de la cuenta actualizado desde el servidor.' });
    } catch (err) {
      setFeedback({ success: false, message: err.message });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleStartSetup = async (e) => {
    e.preventDefault();
    if (mfaEnabled && currentCode.length < CODE_LENGTH) {
      setFeedback({
        success: false,
        message: 'Ingrese el código vigente de 6 dígitos de su aplicación para reconfigurar el segundo factor.',
      });
      return;
    }

    setIsStarting(true);
    setFeedback(null);
    try {
      const res = await apiClient.setupMfa(mfaEnabled ? currentCode : undefined);
      if (!res?.secret || !res?.otpauth_uri) {
        throw new Error('El servidor no devolvió el secreto de configuración.');
      }
      setSetupData({ secret: res.secret, otpauth_uri: res.otpauth_uri });
      setConfirmCode('');
      setCurrentCode('');
      setFeedback({
        success: true,
        message: 'Escanee el QR con su aplicación autenticadora y confirme con el código de 6 dígitos que muestre.',
      });
    } catch (err) {
      setFeedback({ success: false, message: err.message });
    } finally {
      setIsStarting(false);
    }
  };

  const handleConfirmSetup = async (e) => {
    e.preventDefault();
    if (confirmCode.length < CODE_LENGTH) {
      setFeedback({ success: false, message: 'Ingrese los 6 dígitos mostrados por su aplicación.' });
      return;
    }

    setIsConfirming(true);
    setFeedback(null);
    try {
      await apiClient.enableMfa(confirmCode);
      setSetupData(null);
      setConfirmCode('');
      setShowQrModal(false);
      try {
        const fresh = await apiClient.me();
        if (fresh) onUpdateUser?.(fresh);
      } catch {
        onUpdateUser?.({ ...user, mfa_enabled: true });
      }
      setFeedback({ success: true, message: 'Segundo factor habilitado correctamente. Se solicitará en cada inicio de sesión.' });
    } catch (err) {
      setFeedback({ success: false, message: err.message });
    } finally {
      setIsConfirming(false);
    }
  };

  const handleCancelSetup = () => {
    setSetupData(null);
    setConfirmCode('');
    setShowQrModal(false);
    setFeedback(null);
  };

  const sanitizeCode = (value) => value.replace(/\D/g, '').slice(0, CODE_LENGTH);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-surface-container-high gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-bold uppercase tracking-wider font-mono">
              Gobernanza ISO/IEC 27001 & 25010
            </span>
          </div>
          <h1 className="text-2xl font-bold text-on-surface">
            Seguridad Asistencial, Credenciales y Segundo Factor (MFA)
          </h1>
          <p className="text-xs text-on-surface-variant">
            Administración del doble factor de autenticación (TOTP). Los códigos se verifican siempre en el servidor.
          </p>
        </div>

        <button
          type="button"
          onClick={handleRefreshStatus}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-surface-container-low hover:bg-surface-container-high text-on-surface text-xs font-semibold border border-outline-variant/40 transition-colors cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 text-primary ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Actualizando...' : 'Actualizar estado'}
        </button>
      </div>

      <div className="p-4 rounded-2xl bg-white border border-surface-container-high shadow-xs grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary text-white flex items-center justify-center shrink-0">
            <Fingerprint className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-on-surface truncate">{user?.full_name || 'Usuario'}</span>
              <UserCheck className="w-4 h-4 text-primary shrink-0" />
            </div>
            <p className="text-xs text-on-surface-variant truncate">{user?.email || 'Sin correo registrado'}</p>
            <p className="text-[11px] font-mono text-outline truncate">
              {[user?.professional_card, user?.specialty].filter(Boolean).join(' - ') || 'Sin tarjeta profesional'}
            </p>
          </div>
        </div>

        <div className="flex flex-col justify-center px-4 md:border-l md:border-r border-surface-container-high">
          <span className="text-[11px] font-bold uppercase tracking-wider text-outline">
            Sede Asistencial Asignada
          </span>
          <span className="text-xs font-semibold text-on-surface mt-0.5">
            {user?.branch || 'Sin sede asignada'}
          </span>
          <span className="text-[11px] text-on-surface-variant font-medium">Rol: {user?.role || 'No definido'}</span>
        </div>

        <div className="flex flex-col justify-center">
          <span className="text-[11px] font-bold uppercase tracking-wider text-outline">
            Segundo factor (TOTP)
          </span>
          <div className="flex items-center gap-1.5 mt-0.5">
            {mfaEnabled ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold text-emerald-800">Habilitado</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span className="text-xs font-bold text-amber-800">No habilitado</span>
              </>
            )}
          </div>
          <span className="text-[10px] text-outline">
            {mfaEnabled ? 'Se solicita código en cada inicio de sesión' : 'Configúrelo para proteger su cuenta'}
          </span>
        </div>
      </div>

      {feedback && (
        <div
          role={feedback.success ? 'status' : 'alert'}
          className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
            feedback.success
              ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
              : 'bg-red-50 text-red-900 border border-red-200'
          }`}
        >
          {feedback.success ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-primary/20 shadow-xs space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-surface-container-high">
            <div className="w-10 h-10 rounded-xl bg-primary-container text-white flex items-center justify-center">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-on-surface">
                {mfaEnabled ? 'Reconfigurar aplicación autenticadora' : 'Vincular aplicación autenticadora'}
              </h2>
              <p className="text-xs text-on-surface-variant">
                Compatible con Google Authenticator, Microsoft Authenticator y Authy
              </p>
            </div>
          </div>

          {!setupData ? (
            <form onSubmit={handleStartSetup} className="space-y-3">
              {mfaEnabled && (
                <div className="space-y-1">
                  <label htmlFor="mfa-current-code" className="text-xs font-semibold text-on-surface">
                    Código vigente de su aplicación actual
                  </label>
                  <input
                    id="mfa-current-code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={CODE_LENGTH}
                    value={currentCode}
                    onChange={(e) => setCurrentCode(sanitizeCode(e.target.value))}
                    placeholder="000000"
                    className="w-full h-10 px-3 rounded-lg border border-outline-variant text-center font-mono font-bold text-base tracking-widest focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                  <p className="text-[11px] text-on-surface-variant">
                    Por seguridad, el servidor exige el código vigente antes de emitir una nueva clave.
                  </p>
                </div>
              )}
              <button
                type="submit"
                disabled={isStarting}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary-container transition-colors cursor-pointer disabled:opacity-50"
              >
                <QrCode className="w-4 h-4" />
                {isStarting ? 'Solicitando clave...' : mfaEnabled ? 'Generar nueva clave' : 'Generar clave y QR'}
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                <div className="md:col-span-5 flex flex-col items-center">
                  <div className="p-2 bg-white rounded-xl border-2 border-primary/30 shadow-xs">
                    {qrUrl ? (
                      <img src={qrUrl} alt="Código QR TOTP" className="w-36 h-36 rounded-lg" />
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
                    Ampliar QR y ver clave manual
                  </button>
                </div>

                <form onSubmit={handleConfirmSetup} className="md:col-span-7 space-y-3">
                  <div className="space-y-1">
                    <label htmlFor="mfa-confirm-code" className="text-xs font-semibold text-on-surface">
                      Código de 6 dígitos que muestra su aplicación
                    </label>
                    <input
                      id="mfa-confirm-code"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={CODE_LENGTH}
                      value={confirmCode}
                      onChange={(e) => setConfirmCode(sanitizeCode(e.target.value))}
                      placeholder="000000"
                      className="w-full h-10 px-3 rounded-lg border border-outline-variant text-center font-mono font-bold text-base tracking-widest focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="submit"
                      disabled={isConfirming}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary-container transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      {isConfirming ? 'Verificando...' : 'Confirmar y habilitar'}
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelSetup}
                      disabled={isConfirming}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface-container-high text-on-surface text-xs font-semibold hover:bg-surface-container-highest transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <X className="w-4 h-4" />
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-surface-container-high shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-bold text-on-surface">Cómo funciona la verificación</h3>
            </div>
            <ul className="text-xs text-on-surface-variant space-y-2 list-disc list-inside">
              <li>El servidor genera el secreto y lo entrega una sola vez para vincular su aplicación.</li>
              <li>Cada código TOTP (RFC 6238, 30 s, 6 dígitos) es validado por el servidor, nunca por el navegador.</li>
              <li>Tras varios intentos fallidos el servidor bloquea temporalmente el acceso.</li>
            </ul>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-surface-container-high shadow-xs space-y-2">
            <div className="flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-bold text-on-surface">Trazabilidad</h3>
            </div>
            <p className="text-xs text-on-surface-variant">
              Los accesos y acciones de su cuenta quedan registrados en la bitácora de auditoría del servidor,
              consultable por el personal de administración y auditoría.
            </p>
          </div>
        </div>
      </div>

      <MfaQrModal
        isOpen={showQrModal && Boolean(setupData)}
        onClose={() => setShowQrModal(false)}
        secret={setupData?.secret ?? ''}
        otpauthUri={setupData?.otpauth_uri ?? ''}
      />
    </div>
  );
};

export default SecurityMfaScreen;
