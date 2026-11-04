import React, { useState } from 'react';
import {
  UserPlus,
  ShieldCheck,
  AlertTriangle,
  X,
  Building2,
  Lock,
  Mail,
  Phone,
  FileCheck2,
  CheckCircle2,
  QrCode,
  Copy,
  KeyRound,
  IdCard,
} from 'lucide-react';
import { apiClient } from '../services/api';
import { loadBranches } from '../services/branches';
import { generateQrDataUrl } from '../utils/totp';

export const AdminRegisterModal = ({ isOpen, onClose, onRegisterSuccess }) => {
  const branches = loadBranches();
  const [formData, setFormData] = useState({
    full_name: '',
    document_type: 'CC',
    document_number: '',
    email: '',
    phone: '',
    branch: branches[0]?.name || 'Sede Cartago - Hospital Central',
    custom_branch: '',
    professional_card: '',
    password: '',
    confirm_password: '',
  });

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successData, setSuccessData] = useState(null);
  const [qrUrl, setQrUrl] = useState('');
  const [copiedSecret, setCopiedSecret] = useState(false);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setErrorMsg('');
  };

  const handleCopySecret = async (secret) => {
    if (!secret) return;
    try {
      await navigator.clipboard.writeText(secret);
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    } catch {
      // Si el portapapeles falla en sandbox, ignorar silenciosamente
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (
      !formData.full_name.trim() ||
      !formData.email.trim() ||
      !formData.password.trim() ||
      !formData.document_number.trim()
    ) {
      setErrorMsg('Todos los campos con asterisco son obligatorios para el registro administrativo.');
      return;
    }

    if (formData.password.length < 8) {
      setErrorMsg('La contraseña maestra debe contener al menos 8 caracteres seguros.');
      return;
    }

    if (formData.password !== formData.confirm_password) {
      setErrorMsg('Las contraseñas ingresadas no coinciden. Verifíquelas.');
      return;
    }

    const effectiveBranch =
      formData.branch === 'OTRA' && formData.custom_branch.trim()
        ? formData.custom_branch.trim()
        : formData.branch;

    const payload = {
      full_name: formData.full_name.trim(),
      document_type: formData.document_type,
      document_number: formData.document_number.trim(),
      email: formData.email.trim().toLowerCase(),
      phone: formData.phone.trim(),
      branch: effectiveBranch,
      professional_card: formData.professional_card.trim() || `TI-ADMIN-${Date.now().toString().slice(-6)}`,
      password: formData.password,
    };

    setLoading(true);
    try {
      const res = await apiClient.registerAdmin(payload);
      if (res && res.user) {
        setSuccessData(res);
        if (res.otpauth_uri) {
          try {
            const url = await generateQrDataUrl(res.otpauth_uri, 180);
            if (url) setQrUrl(url);
          } catch {
            // El QR se omite si falla la generacion grafica
          }
        }
        if (onRegisterSuccess) {
          onRegisterSuccess(res);
        }
      } else {
        setErrorMsg('No fue posible procesar el registro del administrador.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Error de comunicación con el servicio de gobernanza institucional.');
    } finally {
      setLoading(false);
    }
  };

  const resetAndClose = () => {
    setSuccessData(null);
    setErrorMsg('');
    setQrUrl('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-surface-container-high overflow-hidden flex flex-col max-h-[92vh]">
        {/* Encabezado Institucional */}
        <div className="px-5 py-4 bg-gradient-to-r from-[#005c55] via-[#132338] to-[#0F172A] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
              <UserPlus className="w-4 h-4 text-secondary-fixed" />
            </div>
            <div>
              <h2 className="text-sm font-bold leading-tight">Registro de Administrador de Centro de Salud</h2>
              <p className="text-[11px] text-white/80">
                Gobernanza Institucional TI • Perfil Exclusivo Administrador (Rol ADMIN)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={resetAndClose}
            aria-label="Cerrar modal de registro"
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Contenido */}
        <div className="p-5 overflow-y-auto space-y-4">
          {successData ? (
            /* Pantalla de Éxito con QR de Segundo Factor */
            <div className="space-y-4 text-center animate-in fade-in duration-200">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-on-surface">
                  Administrador Registrado y Habilitado con Éxito
                </h3>
                <p className="text-xs text-on-surface-variant mt-1">
                  La cuenta administrativa ha sido aprovisionada con permisos de gobernanza sobre la sede.
                </p>
              </div>

              {/* Tarjeta de Resumen */}
              <div className="bg-surface-container-low p-4 rounded-xl text-left border border-outline-variant/30 text-xs space-y-1.5 font-mono">
                <div>
                  <span className="text-outline">Administrador:</span>{' '}
                  <strong className="text-on-surface">{successData.user?.full_name}</strong>
                </div>
                <div>
                  <span className="text-outline">Correo Institucional:</span>{' '}
                  <strong className="text-primary">{successData.user?.email}</strong>
                </div>
                <div>
                  <span className="text-outline">Centro de Salud / Sede:</span>{' '}
                  <strong className="text-on-surface">{successData.user?.branch}</strong>
                </div>
                <div>
                  <span className="text-outline">Rol en Plataforma:</span>{' '}
                  <span className="px-2 py-0.5 rounded bg-primary/10 text-primary font-bold text-[10px]">
                    ADMIN (Rol ID 1)
                  </span>
                </div>
              </div>

              {/* Aprovisionamiento QR de Segundo Factor (TOTP) */}
              {qrUrl && (
                <div className="p-4 rounded-xl bg-surface-container-lowest border border-primary/20 space-y-2.5">
                  <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-primary">
                    <QrCode className="w-4 h-4" />
                    <span>Vincular Segundo Factor Exclusivo (Authenticator)</span>
                  </div>
                  <p className="text-[11px] text-on-surface-variant max-w-md mx-auto">
                    Escanee este código QR único con <strong>Google Authenticator</strong> o <strong>Authy</strong>.
                    Esta semilla es exclusiva de su cuenta y generará sus códigos de acceso.
                  </p>
                  <div className="flex justify-center py-1">
                    <div className="p-2 bg-white rounded-xl border border-outline-variant shadow-xs">
                      <img src={qrUrl} alt="QR TOTP Administrador" className="w-36 h-36 rounded" />
                    </div>
                  </div>
                  {successData.mfa_secret && (
                    <div className="flex items-center justify-center gap-2 text-xs">
                      <span className="text-outline">Clave manual:</span>
                      <code className="bg-surface-container px-2 py-1 rounded font-mono font-bold text-on-surface text-[11px]">
                        {successData.mfa_secret}
                      </code>
                      <button
                        type="button"
                        onClick={() => handleCopySecret(successData.mfa_secret)}
                        className="text-primary hover:underline flex items-center gap-1 text-[11px] font-semibold cursor-pointer"
                      >
                        <Copy className="w-3 h-3" />
                        <span>{copiedSecret ? 'Copiada' : 'Copiar'}</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className="pt-2">
                <button
                  type="button"
                  onClick={resetAndClose}
                  className="w-full h-10 bg-primary hover:bg-primary-container text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Proceder al Inicio de Sesión
                </button>
              </div>
            </div>
          ) : (
            /* Formulario de Registro de Administrador */
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="p-3 bg-primary/5 rounded-xl border border-primary/15 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <div className="text-xs text-on-surface space-y-0.5">
                  <p className="font-bold text-primary">Aislamiento y Autonomía de Centro de Salud (Rol ADMIN):</p>
                  <p className="text-on-surface-variant text-[11px] leading-relaxed">
                    Este formulario permite habilitar al Administrador Oficial de un centro de salud o sede hospitalaria.
                    El usuario tendrá acceso exclusivo a gobernanza de personal, auditoría forense ISO 25010 y sedes,
                    con total aislamiento de registros clínicos protegidos (Ley 1581 de 2012).
                  </p>
                </div>
              </div>

              {errorMsg && (
                <div
                  role="alert"
                  className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2"
                >
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Datos de Identidad y Contacto */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label htmlFor="admin-full-name" className="block text-[11px] font-semibold text-on-surface mb-1">
                    Nombre Completo del Administrador *
                  </label>
                  <input
                    id="admin-full-name"
                    name="full_name"
                    type="text"
                    required
                    value={formData.full_name}
                    onChange={handleChange}
                    placeholder="Ej: Ing. Carlos Andrés Montoya"
                    className="w-full h-8 px-3 text-xs bg-surface-container-low border border-outline-variant rounded-lg focus:outline-none focus:border-primary text-on-surface"
                  />
                </div>

                <div>
                  <label htmlFor="admin-doc-type" className="block text-[11px] font-semibold text-on-surface mb-1">
                    Tipo de Documento *
                  </label>
                  <select
                    id="admin-doc-type"
                    name="document_type"
                    value={formData.document_type}
                    onChange={handleChange}
                    className="w-full h-8 px-2 text-xs bg-surface-container-low border border-outline-variant rounded-lg focus:outline-none focus:border-primary text-on-surface"
                  >
                    <option value="CC">Cédula de Ciudadanía (CC)</option>
                    <option value="CE">Cédula de Extranjería (CE)</option>
                    <option value="PA">Pasaporte (PA)</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="admin-doc-num" className="block text-[11px] font-semibold text-on-surface mb-1">
                    Número de Documento *
                  </label>
                  <input
                    id="admin-doc-num"
                    name="document_number"
                    type="text"
                    required
                    value={formData.document_number}
                    onChange={handleChange}
                    placeholder="Ej: 1118234567"
                    className="w-full h-8 px-3 text-xs bg-surface-container-low border border-outline-variant rounded-lg focus:outline-none focus:border-primary text-on-surface"
                  />
                </div>

                <div>
                  <label htmlFor="admin-email" className="block text-[11px] font-semibold text-on-surface mb-1">
                    Correo Institucional *
                  </label>
                  <div className="relative">
                    <input
                      id="admin-email"
                      name="email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="admin.sede@saludconecta.ips.gov.co"
                      className="w-full h-8 pl-8 pr-3 text-xs bg-surface-container-low border border-outline-variant rounded-lg focus:outline-none focus:border-primary text-on-surface"
                    />
                    <Mail className="w-3.5 h-3.5 text-outline absolute left-2.5 top-2.5" />
                  </div>
                </div>

                <div>
                  <label htmlFor="admin-phone" className="block text-[11px] font-semibold text-on-surface mb-1">
                    Teléfono Institucional
                  </label>
                  <div className="relative">
                    <input
                      id="admin-phone"
                      name="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="Ej: 3123456789"
                      className="w-full h-8 pl-8 pr-3 text-xs bg-surface-container-low border border-outline-variant rounded-lg focus:outline-none focus:border-primary text-on-surface"
                    />
                    <Phone className="w-3.5 h-3.5 text-outline absolute left-2.5 top-2.5" />
                  </div>
                </div>
              </div>

              {/* Sede y Centro de Salud */}
              <div className="space-y-2 pt-1 border-t border-surface-container-high">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="admin-branch" className="block text-[11px] font-semibold text-on-surface mb-1">
                      Centro de Salud / Sede Operativa *
                    </label>
                    <div className="relative">
                      <select
                        id="admin-branch"
                        name="branch"
                        value={formData.branch}
                        onChange={handleChange}
                        className="w-full h-8 pl-8 pr-3 text-xs bg-surface-container-low border border-outline-variant rounded-lg focus:outline-none focus:border-primary text-on-surface"
                      >
                        {branches.map((b) => (
                          <option key={b.name} value={b.name}>
                            {b.name}
                          </option>
                        ))}
                        <option value="OTRA">Registrar nuevo centro de salud...</option>
                      </select>
                      <Building2 className="w-3.5 h-3.5 text-outline absolute left-2.5 top-2.5 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="admin-card" className="block text-[11px] font-semibold text-on-surface mb-1">
                      Código Institucional / Credencial TI
                    </label>
                    <div className="relative">
                      <input
                        id="admin-card"
                        name="professional_card"
                        type="text"
                        value={formData.professional_card}
                        onChange={handleChange}
                        placeholder="Ej: TI-ADMIN-CARTAGO"
                        className="w-full h-8 pl-8 pr-3 text-xs bg-surface-container-low border border-outline-variant rounded-lg focus:outline-none focus:border-primary text-on-surface"
                      />
                      <IdCard className="w-3.5 h-3.5 text-outline absolute left-2.5 top-2.5" />
                    </div>
                  </div>
                </div>

                {formData.branch === 'OTRA' && (
                  <div className="animate-in fade-in duration-150">
                    <label htmlFor="admin-custom-branch" className="block text-[11px] font-semibold text-primary mb-1">
                      Nombre del Nuevo Centro de Salud / IPS *
                    </label>
                    <input
                      id="admin-custom-branch"
                      name="custom_branch"
                      type="text"
                      required
                      value={formData.custom_branch}
                      onChange={handleChange}
                      placeholder="Ej: Centro de Salud La Victoria - Nivel I"
                      className="w-full h-8 px-3 text-xs bg-surface-container-lowest border-2 border-primary/40 rounded-lg focus:outline-none focus:border-primary text-on-surface"
                    />
                  </div>
                )}
              </div>

              {/* Contraseña Maestra */}
              <div className="space-y-2 pt-1 border-t border-surface-container-high">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="admin-pwd" className="block text-[11px] font-semibold text-on-surface mb-1">
                      Contraseña Maestra * (Mínimo 8 caracteres)
                    </label>
                    <div className="relative">
                      <input
                        id="admin-pwd"
                        name="password"
                        type="password"
                        required
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="••••••••••••"
                        className="w-full h-8 pl-8 pr-3 text-xs bg-surface-container-low border border-outline-variant rounded-lg focus:outline-none focus:border-primary text-on-surface"
                      />
                      <Lock className="w-3.5 h-3.5 text-outline absolute left-2.5 top-2.5" />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="admin-pwd-confirm" className="block text-[11px] font-semibold text-on-surface mb-1">
                      Confirmar Contraseña *
                    </label>
                    <div className="relative">
                      <input
                        id="admin-pwd-confirm"
                        name="confirm_password"
                        type="password"
                        required
                        value={formData.confirm_password}
                        onChange={handleChange}
                        placeholder="••••••••••••"
                        className="w-full h-8 pl-8 pr-3 text-xs bg-surface-container-low border border-outline-variant rounded-lg focus:outline-none focus:border-primary text-on-surface"
                      />
                      <KeyRound className="w-3.5 h-3.5 text-outline absolute left-2.5 top-2.5" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Botón de Envío */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  aria-label="Confirmar registro de administrador"
                  className="w-full h-10 bg-primary hover:bg-primary-container text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <FileCheck2 className="w-4 h-4" />
                  <span>{loading ? 'Procesando Registro Institucional...' : 'Registrar Administrador de Centro de Salud'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminRegisterModal;
