import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  UserPlus,
  AlertTriangle,
  X,
  Phone,
  Plus,
  Trash2,
  Loader2,
  ShieldAlert,
} from 'lucide-react';
import { apiClient } from '../services/api';
import { BLOOD_TYPES, DOCUMENT_TYPES, getErrorMessage } from '../utils/clinical';

const INITIAL_FORM = {
  document_type: 'CC',
  document_number: '',
  first_name: '',
  second_name: '',
  last_name: '',
  second_last_name: '',
  birth_date: '',
  gender: 'M',
  blood_type: 'O+',
  eps_name: '',
  affiliation_status: 'ACTIVO',
  phone: '',
  is_rural_zone: false,
};

const INITIAL_ALLERGY = { active_ingredient: '', severity: 'MODERADA', notes: '' };

const inputClass =
  'w-full h-9 px-3 rounded-lg border border-outline-variant bg-surface-container-low text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary';

const todayIso = () => new Date().toISOString().slice(0, 10);

/** Valida los campos del contrato POST /patients y devuelve un mapa campo -> mensaje. */
export const validatePatientForm = (form) => {
  const errors = {};
  if (!/^[A-Za-z0-9-]{3,20}$/.test(form.document_number.trim())) {
    errors.document_number = 'Ingrese un número de documento válido (3 a 20 caracteres alfanuméricos).';
  }
  if (!form.first_name.trim()) errors.first_name = 'El primer nombre es obligatorio.';
  if (!form.last_name.trim()) errors.last_name = 'El primer apellido es obligatorio.';
  if (!form.birth_date) {
    errors.birth_date = 'La fecha de nacimiento es obligatoria.';
  } else if (form.birth_date > todayIso()) {
    errors.birth_date = 'La fecha de nacimiento no puede ser futura.';
  }
  if (!form.eps_name.trim()) errors.eps_name = 'La EPS es obligatoria.';
  if (form.phone.trim() && !/^[0-9+\-\s]{7,15}$/.test(form.phone.trim())) {
    errors.phone = 'El teléfono debe tener entre 7 y 15 dígitos.';
  }
  return errors;
};

const FieldError = ({ id, message }) =>
  message ? (
    <p id={id} role="alert" className="mt-1 text-[11px] text-red-700">
      {message}
    </p>
  ) : null;

export const PatientRegisterModal = ({ isOpen, onClose, onCreated }) => {
  const [form, setForm] = useState(INITIAL_FORM);
  const [allergies, setAllergies] = useState([]);
  const [allergyDraft, setAllergyDraft] = useState(INITIAL_ALLERGY);
  const [allergyError, setAllergyError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  // El paciente se crea una sola vez; si fallan alergias el reintento solo envia las pendientes
  const [createdPatient, setCreatedPatient] = useState(null);
  const firstFieldRef = useRef(null);

  const resetState = useCallback(() => {
    setForm(INITIAL_FORM);
    setAllergies([]);
    setAllergyDraft(INITIAL_ALLERGY);
    setAllergyError('');
    setFieldErrors({});
    setErrorMsg('');
    setCreatedPatient(null);
  }, []);

  const handleClose = useCallback(() => {
    if (loading) return;
    resetState();
    onClose();
  }, [loading, onClose, resetState]);

  useEffect(() => {
    if (isOpen) firstFieldRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    setErrorMsg('');
  };

  const handleAddAllergy = () => {
    const ingredient = allergyDraft.active_ingredient.trim();
    if (!ingredient) {
      setAllergyError('Indique el principio activo de la alergia.');
      return;
    }
    if (allergies.some((a) => a.active_ingredient.toLowerCase() === ingredient.toLowerCase())) {
      setAllergyError('Esa alergia ya fue agregada a la lista.');
      return;
    }
    setAllergies((prev) => [...prev, { ...allergyDraft, active_ingredient: ingredient, notes: allergyDraft.notes.trim() }]);
    setAllergyDraft(INITIAL_ALLERGY);
    setAllergyError('');
  };

  const handleRemoveAllergy = (ingredient) => {
    setAllergies((prev) => prev.filter((a) => a.active_ingredient !== ingredient));
  };

  const buildPayload = () => {
    const payload = {
      document_type: form.document_type,
      document_number: form.document_number.trim(),
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      birth_date: form.birth_date,
      gender: form.gender,
      blood_type: form.blood_type,
      eps_name: form.eps_name.trim(),
      affiliation_status: form.affiliation_status,
      is_rural_zone: form.is_rural_zone,
    };
    if (form.second_name.trim()) payload.second_name = form.second_name.trim();
    if (form.second_last_name.trim()) payload.second_last_name = form.second_last_name.trim();
    if (form.phone.trim()) payload.phone = form.phone.trim();
    return payload;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    if (!createdPatient) {
      const errors = validatePatientForm(form);
      setFieldErrors(errors);
      if (Object.keys(errors).length > 0) {
        setErrorMsg('Corrija los campos marcados antes de registrar al paciente.');
        return;
      }
    }

    setLoading(true);
    setErrorMsg('');
    let patient = createdPatient;
    try {
      if (!patient) {
        patient = await apiClient.createPatient(buildPayload());
        setCreatedPatient(patient);
      }
    } catch (err) {
      setErrorMsg(getErrorMessage(err, 'No fue posible registrar al paciente.'));
      setLoading(false);
      return;
    }

    const pending = [...allergies];
    for (const allergy of allergies) {
      try {
        await apiClient.addPatientAllergy(patient.id, {
          active_ingredient: allergy.active_ingredient,
          severity: allergy.severity,
          ...(allergy.notes ? { notes: allergy.notes } : {}),
        });
        pending.shift();
      } catch (err) {
        setAllergies(pending);
        setErrorMsg(
          `El paciente quedó registrado, pero no se pudo guardar la alergia "${allergy.active_ingredient}": ${getErrorMessage(err)}`
        );
        setLoading(false);
        return;
      }
    }

    setLoading(false);
    resetState();
    onCreated(patient);
  };

  const submitLabel = createdPatient ? 'Reintentar alergias pendientes' : 'Registrar Paciente';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="patient-register-title"
        className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-surface-container-high overflow-hidden flex flex-col max-h-[92vh]"
      >
        <div className="px-5 py-4 bg-gradient-to-r from-[#005c55] to-[#132338] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
              <UserPlus className="w-4 h-4 text-secondary-fixed" />
            </div>
            <div>
              <h2 id="patient-register-title" className="text-sm font-bold leading-tight">
                Registro de Paciente
              </h2>
              <p className="text-[11px] text-white/80">Admisión de usuarios | Res. MinSalud 1995 de 1999</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Cerrar registro de paciente"
            className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center transition-colors text-white/80 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="p-5 overflow-y-auto space-y-4 text-xs">
          {errorMsg && (
            <div role="alert" className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <fieldset disabled={Boolean(createdPatient) || loading} className="grid grid-cols-1 md:grid-cols-3 gap-3.5 min-w-0">
            <legend className="sr-only">Datos de identificación y afiliación</legend>
            <div>
              <label htmlFor="pr-document-type" className="block font-semibold text-on-surface mb-1">
                Tipo de Documento *
              </label>
              <select
                id="pr-document-type"
                ref={firstFieldRef}
                name="document_type"
                value={form.document_type}
                onChange={handleChange}
                className={inputClass}
              >
                {DOCUMENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label htmlFor="pr-document-number" className="block font-semibold text-on-surface mb-1">
                Número de Documento *
              </label>
              <input
                id="pr-document-number"
                type="text"
                name="document_number"
                value={form.document_number}
                onChange={handleChange}
                aria-invalid={Boolean(fieldErrors.document_number)}
                aria-describedby={fieldErrors.document_number ? 'pr-document-number-error' : undefined}
                className={`${inputClass} font-mono`}
              />
              <FieldError id="pr-document-number-error" message={fieldErrors.document_number} />
            </div>

            <div>
              <label htmlFor="pr-first-name" className="block font-semibold text-on-surface mb-1">
                Primer Nombre *
              </label>
              <input
                id="pr-first-name"
                type="text"
                name="first_name"
                value={form.first_name}
                onChange={handleChange}
                aria-invalid={Boolean(fieldErrors.first_name)}
                aria-describedby={fieldErrors.first_name ? 'pr-first-name-error' : undefined}
                className={inputClass}
              />
              <FieldError id="pr-first-name-error" message={fieldErrors.first_name} />
            </div>

            <div>
              <label htmlFor="pr-second-name" className="block font-semibold text-on-surface mb-1">
                Segundo Nombre
              </label>
              <input
                id="pr-second-name"
                type="text"
                name="second_name"
                value={form.second_name}
                onChange={handleChange}
                className={inputClass}
              />
            </div>

            <div className="hidden md:block" aria-hidden="true" />

            <div>
              <label htmlFor="pr-last-name" className="block font-semibold text-on-surface mb-1">
                Primer Apellido *
              </label>
              <input
                id="pr-last-name"
                type="text"
                name="last_name"
                value={form.last_name}
                onChange={handleChange}
                aria-invalid={Boolean(fieldErrors.last_name)}
                aria-describedby={fieldErrors.last_name ? 'pr-last-name-error' : undefined}
                className={inputClass}
              />
              <FieldError id="pr-last-name-error" message={fieldErrors.last_name} />
            </div>

            <div>
              <label htmlFor="pr-second-last-name" className="block font-semibold text-on-surface mb-1">
                Segundo Apellido
              </label>
              <input
                id="pr-second-last-name"
                type="text"
                name="second_last_name"
                value={form.second_last_name}
                onChange={handleChange}
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="pr-birth-date" className="block font-semibold text-on-surface mb-1">
                Fecha de Nacimiento *
              </label>
              <input
                id="pr-birth-date"
                type="date"
                name="birth_date"
                max={todayIso()}
                value={form.birth_date}
                onChange={handleChange}
                aria-invalid={Boolean(fieldErrors.birth_date)}
                aria-describedby={fieldErrors.birth_date ? 'pr-birth-date-error' : undefined}
                className={inputClass}
              />
              <FieldError id="pr-birth-date-error" message={fieldErrors.birth_date} />
            </div>

            <div>
              <label htmlFor="pr-gender" className="block font-semibold text-on-surface mb-1">
                Sexo *
              </label>
              <select id="pr-gender" name="gender" value={form.gender} onChange={handleChange} className={inputClass}>
                <option value="M">Masculino</option>
                <option value="F">Femenino</option>
                <option value="OTRO">Otro</option>
              </select>
            </div>

            <div>
              <label htmlFor="pr-blood-type" className="block font-semibold text-on-surface mb-1">
                Grupo Sanguíneo y RH *
              </label>
              <select
                id="pr-blood-type"
                name="blood_type"
                value={form.blood_type}
                onChange={handleChange}
                className={inputClass}
              >
                {BLOOD_TYPES.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label htmlFor="pr-eps" className="block font-semibold text-on-surface mb-1">
                EPS / Aseguradora *
              </label>
              <input
                id="pr-eps"
                type="text"
                name="eps_name"
                value={form.eps_name}
                onChange={handleChange}
                aria-invalid={Boolean(fieldErrors.eps_name)}
                aria-describedby={fieldErrors.eps_name ? 'pr-eps-error' : undefined}
                className={inputClass}
              />
              <FieldError id="pr-eps-error" message={fieldErrors.eps_name} />
            </div>

            <div>
              <label htmlFor="pr-affiliation" className="block font-semibold text-on-surface mb-1">
                Estado de Afiliación
              </label>
              <select
                id="pr-affiliation"
                name="affiliation_status"
                value={form.affiliation_status}
                onChange={handleChange}
                className={inputClass}
              >
                <option value="ACTIVO">Activo</option>
                <option value="INACTIVO">Inactivo</option>
                <option value="SUSPENDIDO">Suspendido</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label htmlFor="pr-phone" className="block font-semibold text-on-surface mb-1">
                Teléfono de Contacto
              </label>
              <div className="relative">
                <input
                  id="pr-phone"
                  type="tel"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  aria-invalid={Boolean(fieldErrors.phone)}
                  aria-describedby={fieldErrors.phone ? 'pr-phone-error' : undefined}
                  className={`${inputClass} pl-8`}
                />
                <Phone className="w-3.5 h-3.5 text-outline absolute left-2.5 top-2.5" />
              </div>
              <FieldError id="pr-phone-error" message={fieldErrors.phone} />
            </div>

            <label htmlFor="pr-rural" className="flex items-center gap-2 font-semibold text-on-surface self-end h-9 cursor-pointer">
              <input
                id="pr-rural"
                type="checkbox"
                name="is_rural_zone"
                checked={form.is_rural_zone}
                onChange={handleChange}
                className="accent-primary w-4 h-4"
              />
              Zona rural
            </label>
          </fieldset>

          <section className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/30 space-y-3" aria-labelledby="pr-allergies-title">
            <div className="flex items-center gap-2 text-on-surface">
              <ShieldAlert className="w-4 h-4 text-red-600" />
              <h3 id="pr-allergies-title" className="font-bold">
                Alergias conocidas
              </h3>
            </div>

            {allergies.length > 0 && (
              <ul className="space-y-1.5">
                {allergies.map((a) => (
                  <li
                    key={a.active_ingredient}
                    className="flex items-center justify-between gap-2 p-2 rounded-lg bg-white border border-outline-variant/30"
                  >
                    <span className="min-w-0">
                      <strong className="uppercase">{a.active_ingredient}</strong>
                      <span className="ml-2 px-1.5 py-0.5 rounded bg-red-100 text-red-900 text-[10px] font-bold uppercase">
                        {a.severity}
                      </span>
                      {a.notes && <span className="block text-[11px] text-on-surface-variant truncate">{a.notes}</span>}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveAllergy(a.active_ingredient)}
                      disabled={loading}
                      aria-label={`Quitar alergia ${a.active_ingredient}`}
                      className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 cursor-pointer disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
              <div className="md:col-span-4">
                <label htmlFor="pr-allergy-ingredient" className="block font-semibold text-on-surface mb-1">
                  Principio activo
                </label>
                <input
                  id="pr-allergy-ingredient"
                  type="text"
                  value={allergyDraft.active_ingredient}
                  onChange={(e) => {
                    setAllergyDraft((prev) => ({ ...prev, active_ingredient: e.target.value }));
                    setAllergyError('');
                  }}
                  disabled={loading}
                  placeholder="Ej: Penicilina"
                  className={inputClass}
                />
              </div>
              <div className="md:col-span-3">
                <label htmlFor="pr-allergy-severity" className="block font-semibold text-on-surface mb-1">
                  Severidad
                </label>
                <select
                  id="pr-allergy-severity"
                  value={allergyDraft.severity}
                  onChange={(e) => setAllergyDraft((prev) => ({ ...prev, severity: e.target.value }))}
                  disabled={loading}
                  className={inputClass}
                >
                  <option value="LEVE">Leve</option>
                  <option value="MODERADA">Moderada</option>
                  <option value="SEVERA">Severa</option>
                </select>
              </div>
              <div className="md:col-span-3">
                <label htmlFor="pr-allergy-notes" className="block font-semibold text-on-surface mb-1">
                  Observaciones
                </label>
                <input
                  id="pr-allergy-notes"
                  type="text"
                  value={allergyDraft.notes}
                  onChange={(e) => setAllergyDraft((prev) => ({ ...prev, notes: e.target.value }))}
                  disabled={loading}
                  className={inputClass}
                />
              </div>
              <div className="md:col-span-2">
                <button
                  type="button"
                  onClick={handleAddAllergy}
                  disabled={loading}
                  className="w-full h-9 px-3 rounded-lg border border-primary/40 text-primary font-semibold hover:bg-primary/5 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  <span>Agregar</span>
                </button>
              </div>
            </div>
            <FieldError id="pr-allergy-error" message={allergyError} />
          </section>

          <div className="pt-3 border-t border-surface-container-high flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="h-9 px-4 rounded-xl border border-outline-variant text-on-surface font-semibold hover:bg-surface-container-high transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="h-9 px-5 rounded-xl bg-primary text-white font-semibold hover:bg-primary-container transition-colors cursor-pointer shadow-sm flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              <span>{loading ? 'Procesando...' : submitLabel}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PatientRegisterModal;
