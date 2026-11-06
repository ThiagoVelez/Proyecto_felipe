import React, { useEffect, useState } from 'react';
import {
  HeartPulse,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Stethoscope,
  Send,
  ArrowRight,
  Loader2,
  Clock,
} from 'lucide-react';
import PatientPicker from '../components/PatientPicker';
import PatientBanner from '../components/PatientBanner';
import AllergyBanner from '../components/AllergyBanner';
import PainScaleSelector from '../components/PainScaleSelector';
import { apiClient } from '../services/api';
import {
  MANCHESTER_LEVELS,
  TRIAGE_STATUS_LABELS,
  formatDateTime,
  getErrorMessage,
  getManchesterInfo,
} from '../utils/clinical';

// Rangos plausibles definidos por el contrato de la API; el servidor los vuelve a validar
const VITAL_FIELDS = [
  { name: 'systolic_bp', label: 'Presión sistólica', unit: 'mmHg', min: 1, max: 300, step: 1 },
  { name: 'diastolic_bp', label: 'Presión diastólica', unit: 'mmHg', min: 1, max: 200, step: 1 },
  { name: 'heart_rate', label: 'Frecuencia cardíaca', unit: 'lpm', min: 1, max: 300, step: 1 },
  { name: 'respiratory_rate', label: 'Frecuencia respiratoria', unit: 'rpm', min: 1, max: 80, step: 1 },
  { name: 'oxygen_saturation', label: 'Saturación de O2', unit: '%', min: 0, max: 100, step: 1 },
  { name: 'body_temperature', label: 'Temperatura', unit: '°C', min: 20, max: 45, step: 0.1 },
  { name: 'glasgow_score', label: 'Escala de Glasgow', unit: '/ 15', min: 3, max: 15, step: 1 },
];

const INITIAL_FORM = {
  systolic_bp: '',
  diastolic_bp: '',
  heart_rate: '',
  respiratory_rate: '',
  oxygen_saturation: '',
  body_temperature: '',
  glasgow_score: '',
  reason_for_consultation: '',
  manchester_level: '',
  pain_scale_score: 0,
  pain_scale_observations: '',
};

/** Valida el formulario de triaje con los rangos del contrato y devuelve campo -> mensaje. */
export const validateTriageForm = (form) => {
  const errors = {};
  VITAL_FIELDS.forEach((field) => {
    const raw = String(form[field.name]).trim();
    const value = Number(raw);
    if (raw === '' || Number.isNaN(value)) {
      errors[field.name] = 'Valor obligatorio.';
    } else if (value < field.min || value > field.max) {
      errors[field.name] = `Rango válido: ${field.min} a ${field.max}.`;
    }
  });
  if (!form.reason_for_consultation.trim()) {
    errors.reason_for_consultation = 'El motivo de consulta es obligatorio.';
  }
  return errors;
};

export const TriageScreen = ({ patient, onPatientChange, triage, onTriageSaved, onNavigate }) => {
  const [form, setForm] = useState(INITIAL_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [savedTriage, setSavedTriage] = useState(null);

  useEffect(() => {
    setForm(INITIAL_FORM);
    setFieldErrors({});
    setSubmitError('');
    setSavedTriage(null);
  }, [patient?.id]);

  if (!patient) {
    return (
      <div className="flex flex-col gap-6">
        <div className="pb-2 border-b border-surface-container-high">
          <span className="text-[10px] font-bold text-primary uppercase tracking-wider font-mono">
            Módulo de triaje Manchester
          </span>
          <h1 className="text-2xl font-bold text-on-surface">Seleccione el paciente a valorar</h1>
        </div>
        <PatientPicker title="Paciente en valoración" onSelect={onPatientChange} />
      </div>
    );
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    setSubmitError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    const errors = validateTriageForm(form);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setSubmitError('Corrija los campos marcados antes de confirmar el triaje.');
      return;
    }

    // El nivel Manchester lo calcula el servidor; solo se envia si el clinico escala manualmente
    const payload = {
      patient_id: patient.id,
      reason_for_consultation: form.reason_for_consultation.trim(),
      pain_scale_score: Number(form.pain_scale_score || 0),
      pain_scale_observations: form.pain_scale_observations ? form.pain_scale_observations.trim() : '',
    };
    VITAL_FIELDS.forEach((field) => {
      payload[field.name] = Number(form[field.name]);
    });
    if (form.manchester_level) payload.manchester_level = form.manchester_level;

    setSubmitting(true);
    setSubmitError('');
    try {
      const created = await apiClient.createTriage(payload);
      setSavedTriage(created);
      if (onTriageSaved) onTriageSaved(created);
    } catch (err) {
      setSubmitError(getErrorMessage(err, 'No fue posible registrar el triaje.'));
    } finally {
      setSubmitting(false);
    }
  };

  const activeTriage = triage && triage.patient_id === patient.id ? triage : null;
  const activeLevel = activeTriage ? getManchesterInfo(activeTriage.manchester_level) : null;
  const savedLevel = savedTriage ? getManchesterInfo(savedTriage.manchester_level) : null;

  return (
    <div className="flex flex-col gap-6">
      <section className="bg-white rounded-2xl p-5 shadow-xs border border-surface-container-high space-y-3">
        <PatientBanner patient={patient} onChangePatient={() => onPatientChange(null)} />
        <AllergyBanner allergies={patient.allergies} />
      </section>

      {activeTriage && (
        <section
          aria-label="Triaje vigente del paciente"
          className={`bg-white rounded-2xl p-5 shadow-xs border border-surface-container-high border-l-4 ${activeLevel.borderColor}`}
        >
          <div className="flex flex-wrap items-center gap-3">
            <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${activeLevel.color}`}>
              {activeLevel.number} {activeLevel.name && `| ${activeLevel.name}`}
            </span>
            <span className="text-xs font-semibold text-on-surface">
              {TRIAGE_STATUS_LABELS[activeTriage.status] ?? activeTriage.status}
            </span>
            <span className="text-xs text-on-surface-variant flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> {formatDateTime(activeTriage.created_at)}
            </span>
          </div>
          <p className="mt-2 text-xs font-mono text-on-surface">
            PA {activeTriage.systolic_bp}/{activeTriage.diastolic_bp} | FC {activeTriage.heart_rate} | FR{' '}
            {activeTriage.respiratory_rate} | SpO2 {activeTriage.oxygen_saturation}% | Temp {activeTriage.body_temperature}°C | Glasgow{' '}
            {activeTriage.glasgow_score}
            {activeTriage.pain_scale_score !== undefined && (
              <> | Dolor EVA <strong>{activeTriage.pain_scale_score}/10</strong></>
            )}
          </p>
          <p className="mt-1 text-xs text-on-surface-variant">{activeTriage.reason_for_consultation}</p>
          {activeTriage.pain_scale_observations && (
            <p className="mt-1 text-xs text-rose-700 bg-rose-50 p-2 rounded-lg border border-rose-200">
              <strong>Observación de dolor (EVA):</strong> {activeTriage.pain_scale_observations}
            </p>
          )}
        </section>
      )}

      <form onSubmit={handleSubmit} noValidate className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-7 flex flex-col gap-6">
          <div className="bg-white rounded-2xl p-6 shadow-xs border border-surface-container-high flex flex-col gap-5">
            <div className="flex items-center gap-2 border-b border-surface-container-high pb-3">
              <HeartPulse className="w-5 h-5 text-primary" />
              <h2 className="text-base font-bold text-on-surface">Captura de Signos Vitales</h2>
            </div>

            <fieldset disabled={submitting || Boolean(savedTriage)} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 min-w-0">
              <legend className="sr-only">Signos vitales</legend>
              {VITAL_FIELDS.map((field) => (
                <div
                  key={field.name}
                  className={`p-3.5 rounded-xl bg-surface-container-low border-2 ${
                    fieldErrors[field.name] ? 'border-red-600 bg-red-50' : 'border-outline-variant/30'
                  }`}
                >
                  <label htmlFor={`triage-${field.name}`} className="block text-xs font-semibold mb-1">
                    {field.label}
                  </label>
                  <div className="flex items-baseline gap-1 my-1">
                    <input
                      id={`triage-${field.name}`}
                      type="number"
                      name={field.name}
                      min={field.min}
                      max={field.max}
                      step={field.step}
                      value={form[field.name]}
                      onChange={handleChange}
                      aria-invalid={Boolean(fieldErrors[field.name])}
                      aria-describedby={fieldErrors[field.name] ? `triage-${field.name}-error` : undefined}
                      className="w-24 bg-white font-bold text-base px-2 py-1 rounded border border-outline-variant/40 outline-none focus:border-primary text-center"
                    />
                    <span className="text-xs font-mono font-bold text-on-surface-variant ml-1">{field.unit}</span>
                  </div>
                  {fieldErrors[field.name] ? (
                    <div id={`triage-${field.name}-error`} role="alert" className="text-[10px] font-bold text-red-700">
                      {fieldErrors[field.name]}
                    </div>
                  ) : (
                    <div className="text-[10px] text-on-surface-variant">
                      Rango: {field.min} - {field.max}
                    </div>
                  )}
                </div>
              ))}
            </fieldset>
          </div>

          {/* ESCALA VISUAL ANALÓGICA DEL DOLOR (EVA 0–10) */}
          <PainScaleSelector
            value={Number(form.pain_scale_score || 0)}
            onChange={(val) => setForm((prev) => ({ ...prev, pain_scale_score: val }))}
            observations={form.pain_scale_observations || ''}
            onObservationsChange={(obs) => setForm((prev) => ({ ...prev, pain_scale_observations: obs }))}
            readOnly={submitting || Boolean(savedTriage)}
            showObservationsField={true}
            theme="light"
          />
        </div>

        <div className="xl:col-span-5 flex flex-col gap-6">
          <div className="bg-white rounded-2xl p-6 shadow-xs border border-surface-container-high flex flex-col gap-5">
            <div className="flex items-center gap-2 border-b border-surface-container-high pb-3">
              <Stethoscope className="w-5 h-5 text-primary" />
              <h2 className="text-base font-bold text-on-surface">Motivo y Categorización</h2>
            </div>

            <div>
              <label htmlFor="triage-reason" className="block text-xs font-semibold text-on-surface mb-1">
                Motivo de consulta
              </label>
              <textarea
                id="triage-reason"
                name="reason_for_consultation"
                rows={4}
                value={form.reason_for_consultation}
                onChange={handleChange}
                disabled={submitting || Boolean(savedTriage)}
                aria-invalid={Boolean(fieldErrors.reason_for_consultation)}
                aria-describedby={fieldErrors.reason_for_consultation ? 'triage-reason-error' : undefined}
                className="w-full p-3 rounded-xl border border-outline-variant text-xs outline-none focus:border-primary disabled:bg-surface-container-low"
              />
              {fieldErrors.reason_for_consultation && (
                <p id="triage-reason-error" role="alert" className="mt-1 text-[11px] text-red-700">
                  {fieldErrors.reason_for_consultation}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="triage-escalation" className="block text-xs font-semibold text-on-surface mb-1">
                Escalamiento clínico (opcional)
              </label>
              <select
                id="triage-escalation"
                name="manchester_level"
                value={form.manchester_level}
                onChange={handleChange}
                disabled={submitting || Boolean(savedTriage)}
                className="w-full h-10 px-3 rounded-lg bg-surface-container-low text-xs font-semibold border border-outline-variant/40 outline-none focus:border-primary cursor-pointer"
              >
                <option value="">Sin escalamiento (nivel calculado por el servidor)</option>
                {Object.entries(MANCHESTER_LEVELS).map(([key, info]) => (
                  <option key={key} value={key}>
                    {info.number} - {info.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-on-surface-variant">
                El servidor determina el nivel Manchester a partir de los signos vitales. Solo se acepta un nivel
                igual o más urgente que el calculado.
              </p>
            </div>

            {submitError && (
              <div role="alert" className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{submitError}</span>
              </div>
            )}

            {savedTriage ? (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 space-y-3">
                <div className="flex items-center gap-2 font-bold text-xs">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>Triaje registrado</span>
                </div>
                <div className={`p-3 rounded-xl border-2 ${savedLevel.badgeColor} space-y-1`}>
                  <span className="text-[10px] font-bold uppercase tracking-wider font-mono block">
                    Nivel determinado por el servidor
                  </span>
                  <span
                    data-testid="triage-server-level"
                    className={`inline-block px-3 py-1.5 rounded-lg text-sm font-extrabold uppercase ${savedLevel.color}`}
                  >
                    {savedLevel.number} {savedLevel.name && `| ${savedLevel.name}`}
                  </span>
                  {savedLevel.maxWait && (
                    <p className="text-[11px] font-mono font-bold">Tiempo máximo de espera: {savedLevel.maxWait}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('hce')}
                  className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-lg shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <span>Proceder a Historia Clínica (HCE)</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSavedTriage(null);
                    setForm(INITIAL_FORM);
                  }}
                  className="w-full py-2 bg-white hover:bg-surface-container text-primary border border-primary/30 font-bold text-xs rounded-lg cursor-pointer"
                >
                  Registrar un nuevo triaje
                </button>
              </div>
            ) : (
              <button
                type="submit"
                disabled={submitting}
                className="w-full h-12 bg-primary hover:bg-primary-container text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span>{submitting ? 'Registrando triaje...' : 'Confirmar Triaje Manchester'}</span>
              </button>
            )}

            <div className="flex items-center gap-2 text-[11px] text-on-surface-variant">
              <Activity className="w-4 h-4 text-outline" />
              <span>El triaje queda registrado a nombre del profesional autenticado.</span>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default TriageScreen;
