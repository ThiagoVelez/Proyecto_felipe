import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Pill,
  Search,
  AlertTriangle,
  Plus,
  Trash2,
  CheckCircle2,
  Send,
  Loader2,
  FileText,
} from 'lucide-react';
import AllergyAlertModal from '../components/AllergyAlertModal';
import AllergyBanner from '../components/AllergyBanner';
import PatientBanner from '../components/PatientBanner';
import PatientPicker from '../components/PatientPicker';
import { apiClient } from '../services/api';
import { formatDateTime, getErrorMessage } from '../utils/clinical';

const INITIAL_ITEM_FORM = {
  dosage: '',
  frequency_hours: '',
  duration_days: '',
  total_quantity: '',
  indication_notes: '',
};

const inputClass =
  'w-full h-10 px-3 rounded-xl border border-outline-variant/40 bg-surface-container-low text-xs disabled:opacity-60';

const getMedicationLabel = (m) =>
  [m.commercial_name, m.concentration, m.pharmaceutical_form].filter(Boolean).join(' ');

/** Valida un item de prescripcion con los rangos enteros del contrato. */
export const validatePrescriptionItem = (itemForm, medication) => {
  const errors = {};
  if (!medication) errors.medication = 'Seleccione un medicamento del catálogo.';
  if (!itemForm.dosage.trim()) errors.dosage = 'La dosis es obligatoria.';
  const integerFields = [
    ['frequency_hours', 'La frecuencia', 1, 168],
    ['duration_days', 'La duración', 1, 365],
    ['total_quantity', 'La cantidad total', 1, 100000],
  ];
  integerFields.forEach(([name, label, min, max]) => {
    const value = Number(itemForm[name]);
    if (itemForm[name] === '' || !Number.isInteger(value) || value < min || value > max) {
      errors[name] = `${label} debe ser un entero entre ${min} y ${max}.`;
    }
  });
  return errors;
};

export const PrescriptionScreen = ({ patient, onPatientChange, onNavigate }) => {
  const [records, setRecords] = useState([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [recordId, setRecordId] = useState('');

  const [query, setQuery] = useState('');
  const [medications, setMedications] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [selectedMed, setSelectedMed] = useState(null);

  const [itemForm, setItemForm] = useState(INITIAL_ITEM_FORM);
  const [itemErrors, setItemErrors] = useState({});
  const [observations, setObservations] = useState('');
  const [items, setItems] = useState([]);
  const [issued, setIssued] = useState([]);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [notice, setNotice] = useState('');
  const [allergyAlert, setAllergyAlert] = useState(null);
  const [conflictName, setConflictName] = useState('');
  const loadSeq = useRef(0);

  const patientId = patient?.id;
  const hasPatient = Boolean(patient);

  const loadRecords = useCallback(async () => {
    if (!patientId) return;
    const seq = ++loadSeq.current;
    setLoadingRecords(true);
    setLoadError('');
    try {
      const list = await apiClient.getPatientRecords(patientId);
      if (seq !== loadSeq.current) return;
      setRecords(list);
      setRecordId(list[0]?.id ?? '');
    } catch (err) {
      if (seq !== loadSeq.current) return;
      setLoadError(getErrorMessage(err, 'No fue posible cargar los folios del paciente.'));
    } finally {
      if (seq === loadSeq.current) setLoadingRecords(false);
    }
  }, [patientId]);

  useEffect(() => {
    setRecords([]);
    setRecordId('');
    setItems([]);
    setIssued([]);
    setNotice('');
    setSubmitError('');
    loadRecords();
    return () => {
      loadSeq.current += 1;
    };
  }, [loadRecords]);

  // Busqueda con retardo para no saturar la API mientras el medico escribe
  useEffect(() => {
    if (!hasPatient) return undefined;
    let cancelled = false;
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const list = await apiClient.searchMedications(query.trim());
        if (cancelled) return;
        setMedications(list);
        setSearchError('');
      } catch (err) {
        if (!cancelled) setSearchError(getErrorMessage(err, 'No fue posible consultar el catálogo de medicamentos.'));
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, query.trim() ? 300 : 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, hasPatient]);

  if (!patient) {
    return (
      <div className="flex flex-col gap-6">
        <div className="pb-2 border-b border-surface-container-high">
          <span className="text-[10px] font-bold text-primary uppercase tracking-wider font-mono">
            Módulo asistencial de farmacoterapia
          </span>
          <h1 className="text-2xl font-bold text-on-surface">Seleccione el paciente a formular</h1>
        </div>
        <PatientPicker title="Paciente a formular" onSelect={onPatientChange} />
      </div>
    );
  }

  const medicationOptions =
    selectedMed && !medications.some((m) => m.id === selectedMed.id) ? [selectedMed, ...medications] : medications;

  const handleItemChange = (e) => {
    const { name, value } = e.target;
    setItemForm((prev) => ({ ...prev, [name]: value }));
    setItemErrors((prev) => ({ ...prev, [name]: undefined }));
    setSubmitError('');
  };

  const handleAddItem = (e) => {
    e.preventDefault();
    const errors = validatePrescriptionItem(itemForm, selectedMed);
    if (!errors.medication && items.some((it) => it.medication.id === selectedMed.id)) {
      errors.medication = 'Ese medicamento ya está en la prescripción.';
    }
    setItemErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setItems((prev) => [
      ...prev,
      {
        medication: selectedMed,
        dosage: itemForm.dosage.trim(),
        frequency_hours: Number(itemForm.frequency_hours),
        duration_days: Number(itemForm.duration_days),
        total_quantity: Number(itemForm.total_quantity),
        indication_notes: itemForm.indication_notes.trim(),
      },
    ]);
    setItemForm(INITIAL_ITEM_FORM);
    setSelectedMed(null);
    setSubmitError('');
    setNotice('');
  };

  const handleRemoveItem = (medicationId) => {
    setItems((prev) => prev.filter((it) => it.medication.id !== medicationId));
    setConflictName('');
  };

  const handleIssue = async () => {
    if (submitting || items.length === 0 || !recordId) return;
    setSubmitting(true);
    setSubmitError('');
    setNotice('');
    try {
      const payload = {
        clinical_record_id: recordId,
        items: items.map((it) => ({
          medication_id: it.medication.id,
          dosage: it.dosage,
          frequency_hours: it.frequency_hours,
          duration_days: it.duration_days,
          total_quantity: it.total_quantity,
          ...(it.indication_notes ? { indication_notes: it.indication_notes } : {}),
        })),
      };
      if (observations.trim()) payload.observations = observations.trim();

      const created = await apiClient.createPrescription(payload);
      setIssued((prev) => [{ ...created, localItems: items }, ...prev]);
      setItems([]);
      setConflictName('');
      setObservations('');
      setNotice(`Prescripción emitida correctamente (ID ${created.id}).`);
    } catch (err) {
      if (err?.status === 422 && err.data?.allergy_conflict) {
        const conflictMedication =
          typeof err.data.medication === 'object' && err.data.medication
            ? getMedicationLabel(err.data.medication)
            : (err.data.medication ?? '');
        setConflictName(conflictMedication.toLowerCase());
        setAllergyAlert({
          activeIngredient: err.data.active_ingredient,
          severity: err.data.severity,
          medication: conflictMedication,
          message: err.data.error,
        });
      } else {
        setSubmitError(getErrorMessage(err, 'No fue posible emitir la prescripción.'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const isConflictItem = (it) =>
    conflictName !== '' &&
    [it.medication.commercial_name, it.medication.generic_name, getMedicationLabel(it.medication)].some(
      (name) => name && name.toLowerCase() === conflictName
    );

  return (
    <div className="flex flex-col gap-6">
      <AllergyAlertModal
        isOpen={Boolean(allergyAlert)}
        medicationName={allergyAlert?.medication ?? ''}
        activeIngredient={allergyAlert?.activeIngredient ?? ''}
        severity={allergyAlert?.severity ?? 'SEVERA'}
        message={allergyAlert?.message ?? ''}
        onClose={() => setAllergyAlert(null)}
      />

      <div className="pb-2 border-b border-surface-container-high">
        <span className="text-[10px] font-bold text-primary uppercase tracking-wider font-mono">
          Módulo asistencial de farmacoterapia
        </span>
        <h1 className="text-2xl font-bold text-on-surface">Prescripción Electrónica & Validación de Alergias</h1>
      </div>

      <section className="bg-white rounded-2xl p-5 shadow-xs border border-surface-container-high space-y-3">
        <PatientBanner patient={patient} onChangePatient={() => onPatientChange(null)} />
        <AllergyBanner allergies={patient.allergies} />
      </section>

      <section className="bg-white rounded-2xl p-5 shadow-xs border border-surface-container-high space-y-3" aria-labelledby="rx-record-title">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          <h2 id="rx-record-title" className="text-base font-bold text-on-surface">
            Folio de la prescripción
          </h2>
        </div>
        {loadingRecords && (
          <p role="status" className="text-xs text-on-surface-variant flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Cargando folios...
          </p>
        )}
        {loadError && (
          <div role="alert" className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{loadError}</span>
            <button type="button" onClick={loadRecords} className="underline font-semibold cursor-pointer ml-auto">
              Reintentar
            </button>
          </div>
        )}
        {!loadingRecords && !loadError && records.length === 0 && (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 text-xs flex items-center justify-between gap-3">
            <span>El paciente no tiene folios de historia clínica. La prescripción requiere un folio del cual es autor el médico.</span>
            <button
              type="button"
              onClick={() => onNavigate('hce')}
              className="px-3 py-1.5 rounded-lg bg-primary text-white font-semibold shrink-0 cursor-pointer"
            >
              Ir a Historia Clínica
            </button>
          </div>
        )}
        {records.length > 0 && (
          <div>
            <label htmlFor="rx-record" className="block text-xs font-semibold text-on-surface mb-1">
              Folio de historia clínica
            </label>
            <select
              id="rx-record"
              value={recordId}
              onChange={(e) => setRecordId(e.target.value)}
              disabled={submitting}
              className={inputClass}
            >
              {records.map((r) => (
                <option key={r.id} value={r.id}>
                  {formatDateTime(r.created_at)} | {r.cie11_code} | {r.diagnosis_description} | {r.is_closed ? 'Cerrado' : 'Borrador'}
                </option>
              ))}
            </select>
          </div>
        )}
      </section>

      <form onSubmit={handleAddItem} noValidate className="bg-white rounded-2xl p-6 shadow-xs border border-surface-container-high space-y-5">
        <div className="border-b border-surface-container-high pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Pill className="w-5 h-5 text-primary" />
            <h2 className="text-base font-bold text-on-surface">Catálogo de medicamentos (CUM)</h2>
          </div>
          <span className="text-xs font-semibold text-primary bg-primary-fixed px-2.5 py-0.5 rounded">
            {searching ? 'Consultando...' : `${medications.length} resultados`}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="rx-query" className="block text-xs font-bold text-on-surface mb-1">
              Buscar por nombre comercial o principio activo
            </label>
            <div className="relative">
              <input
                id="rx-query"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className={`${inputClass} pl-9`}
              />
              <Search className="w-4 h-4 text-outline absolute left-3 top-3" />
            </div>
          </div>
          <div>
            <label htmlFor="rx-medication" className="block text-xs font-bold text-on-surface mb-1">
              Medicamento
            </label>
            <select
              id="rx-medication"
              value={selectedMed?.id ?? ''}
              onChange={(e) => {
                setSelectedMed(medicationOptions.find((m) => m.id === e.target.value) ?? null);
                setItemErrors((prev) => ({ ...prev, medication: undefined }));
              }}
              aria-invalid={Boolean(itemErrors.medication)}
              className={`${inputClass} font-semibold`}
            >
              <option value="">Seleccione un medicamento...</option>
              {medicationOptions.map((m) => (
                <option key={m.id} value={m.id}>
                  {getMedicationLabel(m)} [CUM: {m.cum_code}] - {m.active_ingredient} (stock {m.stock_quantity})
                </option>
              ))}
            </select>
            {itemErrors.medication && <p role="alert" className="mt-1 text-[11px] text-red-700">{itemErrors.medication}</p>}
          </div>
        </div>

        {searchError && (
          <div role="alert" className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{searchError}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label htmlFor="rx-dosage" className="block text-xs font-semibold text-on-surface mb-1">Dosis prescrita</label>
            <input id="rx-dosage" type="text" name="dosage" value={itemForm.dosage} onChange={handleItemChange} aria-invalid={Boolean(itemErrors.dosage)} className={`${inputClass} font-mono`} />
            {itemErrors.dosage && <p role="alert" className="mt-1 text-[11px] text-red-700">{itemErrors.dosage}</p>}
          </div>
          <div>
            <label htmlFor="rx-frequency" className="block text-xs font-semibold text-on-surface mb-1">Cada cuántas horas</label>
            <input id="rx-frequency" type="number" min="1" max="168" name="frequency_hours" value={itemForm.frequency_hours} onChange={handleItemChange} aria-invalid={Boolean(itemErrors.frequency_hours)} className={inputClass} />
            {itemErrors.frequency_hours && <p role="alert" className="mt-1 text-[11px] text-red-700">{itemErrors.frequency_hours}</p>}
          </div>
          <div>
            <label htmlFor="rx-duration" className="block text-xs font-semibold text-on-surface mb-1">Duración (días)</label>
            <input id="rx-duration" type="number" min="1" max="365" name="duration_days" value={itemForm.duration_days} onChange={handleItemChange} aria-invalid={Boolean(itemErrors.duration_days)} className={inputClass} />
            {itemErrors.duration_days && <p role="alert" className="mt-1 text-[11px] text-red-700">{itemErrors.duration_days}</p>}
          </div>
          <div>
            <label htmlFor="rx-quantity" className="block text-xs font-semibold text-on-surface mb-1">Cantidad total</label>
            <input id="rx-quantity" type="number" min="1" name="total_quantity" value={itemForm.total_quantity} onChange={handleItemChange} aria-invalid={Boolean(itemErrors.total_quantity)} className={inputClass} />
            {itemErrors.total_quantity && <p role="alert" className="mt-1 text-[11px] text-red-700">{itemErrors.total_quantity}</p>}
          </div>
        </div>

        <div>
          <label htmlFor="rx-indication" className="block text-xs font-semibold text-on-surface mb-1">
            Indicaciones al paciente / Enfermería
          </label>
          <input id="rx-indication" type="text" name="indication_notes" value={itemForm.indication_notes} onChange={handleItemChange} className={inputClass} />
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="px-5 py-2.5 bg-primary hover:bg-primary-container text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Agregar Medicamento a la Prescripción</span>
          </button>
        </div>
      </form>

      <div className="bg-white rounded-2xl shadow-xs border border-surface-container-high overflow-hidden">
        <div className="p-5 border-b border-surface-container-high">
          <h2 className="text-base font-bold text-on-surface">
            Plan Farmacoterapéutico en Edición ({items.length} {items.length === 1 ? 'item' : 'items'})
          </h2>
          <p className="text-xs text-on-surface-variant">
            El servidor valida alergias, stock y autoría del folio al emitir la prescripción.
          </p>
        </div>

        {items.length === 0 ? (
          <p className="p-5 text-xs text-on-surface-variant">Aún no ha agregado medicamentos a la prescripción.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-container-low text-outline font-mono uppercase text-[10px] tracking-wider border-b border-surface-container-high">
                <tr>
                  <th className="py-3 px-4">Medicamento / Principio</th>
                  <th className="py-3 px-4">Dosis</th>
                  <th className="py-3 px-4">Frecuencia</th>
                  <th className="py-3 px-4">Duración</th>
                  <th className="py-3 px-4">Cantidad</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-high">
                {items.map((it) => (
                  <tr key={it.medication.id} className="hover:bg-surface-container-low/40">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-sm text-on-surface">{getMedicationLabel(it.medication)}</div>
                      <div className="text-[11px] text-on-surface-variant font-mono">
                        {it.medication.active_ingredient} | CUM: {it.medication.cum_code}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-semibold">{it.dosage}</td>
                    <td className="py-3.5 px-4">Cada {it.frequency_hours} h</td>
                    <td className="py-3.5 px-4">{it.duration_days} días</td>
                    <td className="py-3.5 px-4">{it.total_quantity}</td>
                    <td className="py-3.5 px-4">
                      {isConflictItem(it) ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-red-100 text-red-900 border border-red-300">
                          Conflicto de alergia
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-surface-container-high text-on-surface">
                          Pendiente de emisión
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(it.medication.id)}
                        disabled={submitting}
                        aria-label={`Quitar ${getMedicationLabel(it.medication)} de la prescripción`}
                        className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="p-5 border-t border-surface-container-high space-y-3">
          <div>
            <label htmlFor="rx-observations" className="block text-xs font-semibold text-on-surface mb-1">
              Observaciones generales (opcional)
            </label>
            <input
              id="rx-observations"
              type="text"
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              disabled={submitting}
              className={inputClass}
            />
          </div>

          {submitError && (
            <div role="alert" className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{submitError}</span>
            </div>
          )}
          {notice && (
            <div role="status" className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{notice}</span>
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleIssue}
              disabled={submitting || items.length === 0 || !recordId}
              className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span>{submitting ? 'Emitiendo...' : 'Emitir Prescripción'}</span>
            </button>
          </div>
        </div>
      </div>

      {issued.length > 0 && (
        <section className="bg-white rounded-2xl shadow-xs border border-surface-container-high p-5 space-y-3" aria-labelledby="rx-issued-title">
          <h2 id="rx-issued-title" className="text-base font-bold text-on-surface">Prescripciones emitidas en esta sesión</h2>
          <ul className="space-y-2">
            {issued.map((rx) => (
              <li key={rx.id} className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/50 text-xs">
                <div className="flex items-center justify-between font-mono text-[11px] text-on-surface-variant">
                  <span>ID {rx.id}</span>
                  <span>{formatDateTime(rx.created_at)}</span>
                </div>
                <ul className="mt-1 list-disc pl-5 text-on-surface">
                  {(rx.items?.length ? rx.items : rx.localItems).map((it, idx) => (
                    <li key={it.id ?? `${rx.id}-${idx}`}>
                      {it.medication ? getMedicationLabel(it.medication) : it.medication_id}: {it.dosage}, cada {it.frequency_hours} h por {it.duration_days} días
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
};

export default PrescriptionScreen;
