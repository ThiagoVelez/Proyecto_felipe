import React, { useState, useEffect } from 'react';
import {
  X,
  Mail,
  MapPin,
  Phone,
  Save,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  User,
} from 'lucide-react';
import { apiClient } from '../services/api';
import { getErrorMessage, getFullName } from '../utils/clinical';

/**
 * Drawer lateral derecho para la actualización de datos de contacto del paciente.
 * Conforme a la Ley 1581 de 2012 (Habeas Data) y Resolución 1995 de 1999:
 * Solo permite editar correo electrónico, dirección de residencia y celular.
 */
export default function PatientEditDrawer({ isOpen, onClose, patient, onUpdated }) {
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    if (patient) {
      setEmail(patient.email || '');
      setAddress(patient.address || '');
      setPhone(patient.phone || '');
      setErrors({});
      setSubmitError('');
      setSubmitSuccess(false);
    }
  }, [patient, isOpen]);

  // Cierre con la tecla Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen || !patient) return null;

  const validate = () => {
    const errs = {};
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errs.email = 'Ingrese un correo electrónico válido.';
    }
    if (phone.trim() && !/^[0-9+\-\s]{7,15}$/.test(phone.trim())) {
      errs.phone = 'El teléfono o celular debe tener entre 7 y 15 dígitos numéricos.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!validate()) {
      setSubmitError('Verifique los campos con error antes de guardar.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');
    setSubmitSuccess(false);

    try {
      const updated = await apiClient.updatePatientContact(patient.id, {
        email: email.trim(),
        address: address.trim(),
        phone: phone.trim(),
      });
      setSubmitSuccess(true);
      if (onUpdated) {
        onUpdated(updated);
      }
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err) {
      setSubmitError(getErrorMessage(err, 'No fue posible actualizar los datos de contacto del paciente.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const patientName = getFullName(patient) || patient.full_name || 'Paciente';

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
      {/* Fondo difuminado (Backdrop) */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={() => !isSubmitting && onClose()}
        aria-hidden="true"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl border-l border-surface-container-high flex flex-col transform transition-transform ease-out duration-300">
          {/* Cabecera del Drawer */}
          <div className="p-6 border-b border-surface-container-high bg-surface-container-low flex items-start justify-between">
            <div className="flex flex-col gap-1 pr-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary font-mono">
                Actualización de Localización & Contacto
              </span>
              <h2 id="drawer-title" className="text-lg font-bold text-on-surface leading-tight">
                Editar Datos de Paciente
              </h2>
              <div className="flex items-center gap-2 mt-1 text-xs text-on-surface-variant font-medium">
                <User className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="truncate">{patientName}</span>
                <span className="font-mono text-outline">
                  ({patient.document_type} {patient.document_number})
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="p-1.5 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer disabled:opacity-50"
              aria-label="Cerrar panel de edición"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Formulario editable */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* Aviso normativo de gobernanza de datos */}
            <div className="p-3.5 rounded-xl bg-teal-50/70 border border-teal-200/80 text-teal-900 text-xs flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed">
                <strong>Gobernanza de Datos (Ley 1581 de 2012):</strong> Solo se autoriza la modificación de los canales de localización y notificación. Los nombres, fecha de nacimiento y documento son inmutables por ley.
              </p>
            </div>

            {submitError && (
              <div role="alert" className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{submitError}</span>
              </div>
            )}

            {submitSuccess && (
              <div role="status" className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-semibold">Datos de contacto actualizados correctamente.</span>
              </div>
            )}

            {/* Campo 1: Correo Electrónico */}
            <div>
              <label htmlFor="edit-patient-email" className="block text-xs font-semibold text-on-surface mb-1.5">
                Correo Electrónico
              </label>
              <div className="relative flex items-center">
                <Mail className="w-4 h-4 text-outline absolute left-3 pointer-events-none" />
                <input
                  id="edit-patient-email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setErrors((prev) => ({ ...prev, email: undefined }));
                  }}
                  disabled={isSubmitting}
                  placeholder="ejemplo@correo.com"
                  className={`w-full h-11 pl-9 pr-3 rounded-xl border text-xs text-on-surface outline-none transition ${
                    errors.email
                      ? 'border-red-600 bg-red-50 focus:border-red-600'
                      : 'border-outline-variant/60 bg-surface-container-low focus:border-primary focus:bg-white'
                  }`}
                />
              </div>
              {errors.email && (
                <p role="alert" className="mt-1 text-[11px] font-semibold text-red-700">
                  {errors.email}
                </p>
              )}
            </div>

            {/* Campo 2: Dirección de Residencia */}
            <div>
              <label htmlFor="edit-patient-address" className="block text-xs font-semibold text-on-surface mb-1.5">
                Dirección de Residencia
              </label>
              <div className="relative flex items-center">
                <MapPin className="w-4 h-4 text-outline absolute left-3 pointer-events-none" />
                <input
                  id="edit-patient-address"
                  type="text"
                  value={address}
                  onChange={(e) => {
                    setAddress(e.target.value);
                    setErrors((prev) => ({ ...prev, address: undefined }));
                  }}
                  disabled={isSubmitting}
                  placeholder="Ej: Calle 10 # 5-20, Barrio El Prado, Cartago"
                  className="w-full h-11 pl-9 pr-3 rounded-xl border border-outline-variant/60 bg-surface-container-low text-xs text-on-surface outline-none transition focus:border-primary focus:bg-white"
                />
              </div>
              <span className="text-[10px] text-on-surface-variant block mt-1">
                Utilizada para remitir prescripciones o atención domiciliaria.
              </span>
            </div>

            {/* Campo 3: Celular / Teléfono de Contacto */}
            <div>
              <label htmlFor="edit-patient-phone" className="block text-xs font-semibold text-on-surface mb-1.5">
                Celular / Teléfono de Contacto
              </label>
              <div className="relative flex items-center">
                <Phone className="w-4 h-4 text-outline absolute left-3 pointer-events-none" />
                <input
                  id="edit-patient-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    setErrors((prev) => ({ ...prev, phone: undefined }));
                  }}
                  disabled={isSubmitting}
                  placeholder="Ej: 315 123 4567"
                  className={`w-full h-11 pl-9 pr-3 rounded-xl border text-xs text-on-surface outline-none transition ${
                    errors.phone
                      ? 'border-red-600 bg-red-50 focus:border-red-600'
                      : 'border-outline-variant/60 bg-surface-container-low focus:border-primary focus:bg-white'
                  }`}
                />
              </div>
              {errors.phone && (
                <p role="alert" className="mt-1 text-[11px] font-semibold text-red-700">
                  {errors.phone}
                </p>
              )}
            </div>
          </form>

          {/* Pie de acción del Drawer */}
          <div className="p-5 border-t border-surface-container-high bg-white flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-outline-variant/60 text-xs font-semibold text-on-surface hover:bg-surface-container-low transition cursor-pointer disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-container text-white text-xs font-bold shadow-xs flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Guardar Cambios</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
