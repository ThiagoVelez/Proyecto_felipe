import React, { useState } from 'react';
import {
  UserPlus,
  ShieldCheck,
  AlertTriangle,
  X,
  Building2,
  Stethoscope,
  Lock,
  Mail,
  Phone,
  FileCheck2,
  CheckCircle2,
  BadgeAlert,
} from 'lucide-react';
import { apiClient } from '../services/api';

export const StaffRegisterModal = ({ isOpen, onClose, onRegisterSuccess }) => {
  const [formData, setFormData] = useState({
    role_id: 2, // 2: MEDICO, 3: ENFERMERO
    full_name: '',
    document_type: 'CC',
    document_number: '',
    phone: '',
    email: '',
    password: '',
    professional_card: '',
    specialty: 'Medicina de Urgencias',
    branch: 'Sede Cartago - Hospital Central (Nivel II)',
  });

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successData, setSuccessData] = useState(null);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'role_id' ? Number(value) : value,
    }));
    setErrorMsg('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    // Validacion de Tarjeta Profesional ReTHUS mandatoria segun Res. 1995 de 1999
    if ((formData.role_id === 2 || formData.role_id === 3) && !formData.professional_card.trim()) {
      setErrorMsg('La Tarjeta Profesional o registro ReTHUS es de carácter obligatorio para médicos y enfermeros.');
      return;
    }

    if (!formData.full_name.trim() || !formData.email.trim() || !formData.password.trim() || !formData.document_number.trim()) {
      setErrorMsg('Por favor complete todos los campos obligatorios del registro asistencial.');
      return;
    }

    setLoading(true);
    try {
      const res = await apiClient.registerStaff(formData);
      if (res && res.is_active === false) {
        setSuccessData(res);
        if (onRegisterSuccess) onRegisterSuccess(res);
      } else {
        setErrorMsg('No fue posible procesar la solicitud. Verifique que el correo no esté registrado.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Error de comunicación con el servicio de gobernanza.');
    } finally {
      setLoading(false);
    }
  };

  const resetAndClose = () => {
    setSuccessData(null);
    setErrorMsg('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-surface-container-high overflow-hidden flex flex-col max-h-[92vh]">
        {/* Encabezado */}
        <div className="px-5 py-4 bg-gradient-to-r from-[#005c55] to-[#132338] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
              <UserPlus className="w-4 h-4 text-secondary-fixed" />
            </div>
            <div>
              <h2 className="text-sm font-bold leading-tight">Autorregistro de Personal Asistencial</h2>
              <p className="text-[11px] text-white/80">Habilitación y Gobernanza ReTHUS • Res. MinSalud 1995 de 1999</p>
            </div>
          </div>
          <button
            type="button"
            onClick={resetAndClose}
            className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center transition-colors text-white/80 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Contenido / Formulario o Pantalla de Éxito */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {successData ? (
            <div className="py-6 px-4 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center border-2 border-emerald-300">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1.5 max-w-md mx-auto">
                <h3 className="text-base font-bold text-on-surface">Solicitud de Registro Enviada</h3>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Su cuenta institucional ha sido creada exitosamente bajo la política de seguridad estricta RBAC con estado <strong className="text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">PENDIENTE DE APROBACIÓN</strong>.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/30 text-left space-y-2 max-w-lg mx-auto">
                <div className="flex items-start gap-2 text-primary font-semibold">
                  <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>Protocolo de Validación Legal ReTHUS:</span>
                </div>
                <p className="text-[11px] text-on-surface-variant leading-normal">
                  De acuerdo con la Resolución 1995 de 1999 y la Ley 1581 de 2012, no se expedirá token de sesión clínica hasta que un Administrador del Sistema verifique formalmente su Tarjeta Profesional ante el registro nacional de talento humano en salud (ReTHUS).
                </p>
                <div className="pt-2 border-t border-outline-variant/20 flex items-center justify-between text-[11px] font-mono text-outline">
                  <span>Tarjeta: {formData.professional_card}</span>
                  <span>Rol: {formData.role_id === 2 ? 'MEDICO' : 'ENFERMERO'}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={resetAndClose}
                className="h-10 px-6 rounded-xl bg-primary text-white font-semibold hover:bg-primary-hover transition-colors cursor-pointer shadow-sm text-xs"
              >
                Entendido, volver al Portal de Acceso
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Aviso Normativo */}
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 flex items-start gap-2.5">
                <BadgeAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div className="space-y-0.5 text-[11px]">
                  <strong className="font-bold">Aviso de Responsabilidad Jurídica (Ley 1581 de 2012):</strong>
                  <p>
                    Las cuentas registradas quedan inactivas por defecto. La información de tarjeta profesional es inmutable tras la activación para garantizar no-repudio y validez legal de las atenciones asistenciales.
                  </p>
                </div>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Grid 2 Columnas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {/* Rol Asistencial */}
                <div>
                  <label className="block font-semibold text-on-surface mb-1">
                    Rol en la IPS *
                  </label>
                  <select
                    name="role_id"
                    value={formData.role_id}
                    onChange={handleChange}
                    className="w-full h-9 px-3 rounded-lg border border-outline-variant bg-surface-container-low text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value={2}>Médico Asistencial (General / Especialista)</option>
                    <option value={3}>Personal de Enfermería y Triaje</option>
                  </select>
                </div>

                {/* Tarjeta Profesional ReTHUS */}
                <div>
                  <label className="block font-semibold text-on-surface mb-1">
                    Tarjeta Profesional / Registro ReTHUS *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      name="professional_card"
                      placeholder="Ej: RM-94821-VALLE"
                      value={formData.professional_card}
                      onChange={handleChange}
                      required
                      className="w-full h-9 pl-8 pr-3 rounded-lg border border-outline-variant bg-surface-container-low text-xs text-on-surface font-mono uppercase focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <FileCheck2 className="w-3.5 h-3.5 text-outline absolute left-2.5 top-2.5" />
                  </div>
                </div>

                {/* Nombre Completo */}
                <div className="md:col-span-2">
                  <label className="block font-semibold text-on-surface mb-1">
                    Nombre Completo (como aparece en documento) *
                  </label>
                  <input
                    type="text"
                    name="full_name"
                    placeholder="Ej: Dr. Santiago Vélez"
                    value={formData.full_name}
                    onChange={handleChange}
                    required
                    className="w-full h-9 px-3 rounded-lg border border-outline-variant bg-surface-container-low text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                {/* Tipo de Documento */}
                <div>
                  <label className="block font-semibold text-on-surface mb-1">
                    Tipo de Documento *
                  </label>
                  <select
                    name="document_type"
                    value={formData.document_type}
                    onChange={handleChange}
                    className="w-full h-9 px-3 rounded-lg border border-outline-variant bg-surface-container-low text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="CC">Cédula de Ciudadanía (CC)</option>
                    <option value="CE">Cédula de Extranjería (CE)</option>
                    <option value="PA">Pasaporte (PA)</option>
                  </select>
                </div>

                {/* Número de Documento */}
                <div>
                  <label className="block font-semibold text-on-surface mb-1">
                    Número de Identificación *
                  </label>
                  <input
                    type="text"
                    name="document_number"
                    placeholder="Ej: 1118234567"
                    value={formData.document_number}
                    onChange={handleChange}
                    required
                    className="w-full h-9 px-3 rounded-lg border border-outline-variant bg-surface-container-low text-xs text-on-surface font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                {/* Correo Institucional */}
                <div>
                  <label className="block font-semibold text-on-surface mb-1">
                    Correo Electrónico Institucional *
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      name="email"
                      placeholder="usuario@saludconecta.ips.gov.co"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="w-full h-9 pl-8 pr-3 rounded-lg border border-outline-variant bg-surface-container-low text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <Mail className="w-3.5 h-3.5 text-outline absolute left-2.5 top-2.5" />
                  </div>
                </div>

                {/* Teléfono */}
                <div>
                  <label className="block font-semibold text-on-surface mb-1">
                    Teléfono Celular de Contacto *
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      name="phone"
                      placeholder="Ej: 3123456789"
                      value={formData.phone}
                      onChange={handleChange}
                      required
                      className="w-full h-9 pl-8 pr-3 rounded-lg border border-outline-variant bg-surface-container-low text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <Phone className="w-3.5 h-3.5 text-outline absolute left-2.5 top-2.5" />
                  </div>
                </div>

                {/* Especialidad */}
                <div>
                  <label className="block font-semibold text-on-surface mb-1">
                    Especialidad / Área Asistencial *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      name="specialty"
                      placeholder="Ej: Urgencias, Medicina General, Pediatría"
                      value={formData.specialty}
                      onChange={handleChange}
                      className="w-full h-9 pl-8 pr-3 rounded-lg border border-outline-variant bg-surface-container-low text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <Stethoscope className="w-3.5 h-3.5 text-outline absolute left-2.5 top-2.5" />
                  </div>
                </div>

                {/* Sede Operativa */}
                <div>
                  <label className="block font-semibold text-on-surface mb-1">
                    Sede Operativa Principal *
                  </label>
                  <div className="relative">
                    <select
                      name="branch"
                      value={formData.branch}
                      onChange={handleChange}
                      className="w-full h-9 pl-8 pr-3 rounded-lg border border-outline-variant bg-surface-container-low text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="Sede Cartago - Hospital Central (Nivel II)">Sede Cartago - Hospital Central (Nivel II)</option>
                      <option value="Sede La Unión (Urgencias)">Sede La Unión (Urgencias)</option>
                      <option value="Sede Tuluá (Ambulatoria)">Sede Tuluá (Ambulatoria)</option>
                      <option value="Brigada Rural (PWA Sync)">Brigada Rural (PWA Sync)</option>
                    </select>
                    <Building2 className="w-3.5 h-3.5 text-outline absolute left-2.5 top-2.5" />
                  </div>
                </div>

                {/* Contraseña */}
                <div className="md:col-span-2">
                  <label className="block font-semibold text-on-surface mb-1">
                    Contraseña de Acceso Asistencial (Mínimo 8 caracteres) *
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      name="password"
                      placeholder="••••••••••••"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      minLength={8}
                      className="w-full h-9 pl-8 pr-3 rounded-lg border border-outline-variant bg-surface-container-low text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <Lock className="w-3.5 h-3.5 text-outline absolute left-2.5 top-2.5" />
                  </div>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="pt-3 border-t border-surface-container-high flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={resetAndClose}
                  className="h-9 px-4 rounded-xl border border-outline-variant text-on-surface font-semibold hover:bg-surface-container-high transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="h-9 px-5 rounded-xl bg-primary text-white font-semibold hover:bg-primary-hover transition-colors cursor-pointer shadow-sm flex items-center gap-2 disabled:opacity-50"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{loading ? 'Procesando...' : 'Enviar Solicitud ReTHUS'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default StaffRegisterModal;

