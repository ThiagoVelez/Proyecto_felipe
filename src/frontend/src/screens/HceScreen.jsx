import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  FileText,
  Lock,
  Unlock,
  AlertTriangle,
  Stethoscope,
  Activity,
  ShieldCheck,
  CheckCircle2,
  FileCode,
  Download,
  PlusCircle,
  Copy,
  Loader2,
  Save,
} from 'lucide-react';
import PatientPicker from '../components/PatientPicker';
import PatientBanner from '../components/PatientBanner';
import AllergyBanner from '../components/AllergyBanner';
import SignFolioModal from '../components/SignFolioModal';
import { apiClient } from '../services/api';
import {
  downloadJson,
  formatDateTime,
  getErrorMessage,
  getManchesterInfo,
} from '../utils/clinical';

const NEW_FOLIO = 'new';

const INITIAL_FORM = {
  anamnesis: '',
  physical_exam: '',
  cie11_code: '',
  diagnosis_description: '',
  treatment_plan: '',
};

const REQUIRED_MESSAGES = {
  anamnesis: 'La anamnesis es obligatoria.',
  physical_exam: 'El examen físico es obligatorio.',
  cie11_code: 'El código CIE-11 es obligatorio.',
  diagnosis_description: 'La descripción diagnóstica es obligatoria.',
  treatment_plan: 'El plan de tratamiento es obligatorio.',
};

export const validateFolioForm = (form) => {
  const errors = {};
  Object.keys(REQUIRED_MESSAGES).forEach((key) => {
    if (!form[key].trim()) errors[key] = REQUIRED_MESSAGES[key];
  });
  return errors;
};

const TABS = [
  { id: 'anamnesis', label: '1. Anamnesis & Examen Físico', icon: Stethoscope },
  { id: 'diagnosis', label: '2. Diagnóstico CIE-11', icon: Activity },
  { id: 'plan', label: '3. Plan de Tratamiento', icon: FileText },
  { id: 'forensic', label: '4. Cadena Forense SHA-256', icon: ShieldCheck },
  { id: 'clarifications', label: '5. Notas Aclaratorias (Res. 1995)', icon: PlusCircle },
];

const inputClass = (readOnly) =>
  `w-full h-11 px-3.5 rounded-xl border text-sm ${
    readOnly ? 'bg-surface-container-low text-on-surface-variant border-outline-variant/30' : 'bg-white border-outline-variant'
  }`;

const textAreaClass = (readOnly) =>
  `w-full p-3.5 rounded-xl border text-sm outline-none transition-all ${
    readOnly
      ? 'bg-surface-container-low text-on-surface-variant border-outline-variant/30 cursor-not-allowed'
      : 'bg-white border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary'
  }`;

export const HceScreen = ({ patient, onPatientChange, triage, onNavigate }) => {
  const [activeTab, setActiveTab] = useState('anamnesis');
  const [records, setRecords] = useState([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [selectedId, setSelectedId] = useState(NEW_FOLIO);
  const [form, setForm] = useState(INITIAL_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const [isSignOpen, setIsSignOpen] = useState(false);
  const [signing, setSigning] = useState(false);
  const [signError, setSignError] = useState('');
  const [verification, setVerification] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [copiedHash, setCopiedHash] = useState(false);
  const [exporting, setExporting] = useState('');
  const [clarificationText, setClarificationText] = useState('');
  const [clarifying, setClarifying] = useState(false);
  const loadSeq = useRef(0);

  const patientId = patient?.id;

  const loadRecords = useCallback(
    async (preferredId) => {
      if (!patientId) return;
      const seq = ++loadSeq.current;
      setLoadingRecords(true);
      setLoadError('');
      try {
        const list = await apiClient.getPatientRecords(patientId);
        if (seq !== loadSeq.current) return;
        setRecords(list);
        setSelectedId((current) => {
          const wanted = preferredId ?? current;
          return wanted !== NEW_FOLIO && list.some((r) => r.id === wanted) ? wanted : (list[0]?.id ?? NEW_FOLIO);
        });
      } catch (err) {
        if (seq !== loadSeq.current) return;
        setLoadError(getErrorMessage(err, 'No fue posible cargar los folios del paciente.'));
      } finally {
        if (seq === loadSeq.current) setLoadingRecords(false);
      }
    },
    [patientId]
  );

  useEffect(() => {
    setRecords([]);
    setSelectedId(NEW_FOLIO);
    setForm(INITIAL_FORM);
    setFieldErrors({});
    setActionError('');
    setNotice('');
    setVerification(null);
    setActiveTab('anamnesis');
    loadRecords();
    return () => {
      loadSeq.current += 1;
    };
  }, [loadRecords]);

  useEffect(() => {
    setVerification(null);
    setClarificationText('');
  }, [selectedId]);

  if (!patient) {
    return (
      <div className="flex flex-col gap-6">
        <div className="pb-2 border-b border-surface-container-high">
          <span className="text-[10px] font-bold text-primary uppercase tracking-wider font-mono">
            Historia clínica electrónica
          </span>
          <h1 className="text-2xl font-bold text-on-surface">Seleccione el paciente para abrir su historia clínica</h1>
        </div>
        <PatientPicker title="Paciente de la consulta" onSelect={onPatientChange} />
      </div>
    );
  }

  const isNew = selectedId === NEW_FOLIO;
  const record = isNew ? null : records.find((r) => r.id === selectedId) ?? null;
  const isClosed = Boolean(record?.is_closed);
  const readOnly = !isNew;
  const view = isNew ? form : (record ?? INITIAL_FORM);
  const matchingTriage = triage && triage.patient_id === patient.id ? triage : null;
  const triageLevel = matchingTriage ? getManchesterInfo(matchingTriage.manchester_level) : null;
  const sessionUser = apiClient.user;
  const signatureId = sessionUser?.professional_card || sessionUser?.email || '';

  const handleFieldChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    setActionError('');
  };

  const handleSaveDraft = async () => {
    if (saving) return;
    const errors = validateFolioForm(form);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setActionError('Complete los campos obligatorios del folio antes de guardarlo.');
      return;
    }
    setSaving(true);
    setActionError('');
    setNotice('');
    try {
      const payload = {
        patient_id: patient.id,
        anamnesis: form.anamnesis.trim(),
        physical_exam: form.physical_exam.trim(),
        cie11_code: form.cie11_code.trim().toUpperCase(),
        diagnosis_description: form.diagnosis_description.trim(),
        treatment_plan: form.treatment_plan.trim(),
      };
      if (matchingTriage) payload.triage_id = matchingTriage.id;
      const created = await apiClient.saveClinicalDraft(payload);
      setForm(INITIAL_FORM);
      await loadRecords(created.id);
      setNotice('Folio guardado como borrador. Revíselo y ciérrelo con su firma para sellarlo.');
    } catch (err) {
      setActionError(getErrorMessage(err, 'No fue posible guardar el folio.'));
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmSign = async () => {
    if (!record || signing) return;
    setSigning(true);
    setSignError('');
    try {
      const closed = await apiClient.closeClinicalRecord(record.id, {
        signature_token: `FIRMA:${signatureId}:${new Date().toISOString()}`,
      });
      setRecords((prev) => prev.map((r) => (r.id === closed.id ? { ...r, ...closed } : r)));
      setIsSignOpen(false);
      setActiveTab('forensic');
      setNotice('Folio cerrado y sellado con SHA-256.');
    } catch (err) {
      setSignError(getErrorMessage(err, 'No fue posible cerrar el folio.'));
      // Un 409 indica que otro proceso ya lo cerro: se resincroniza para mostrar el estado real
      if (err?.status === 409) loadRecords(record.id);
    } finally {
      setSigning(false);
    }
  };

  const handleVerify = async () => {
    if (!record || verifying) return;
    setVerifying(true);
    setActionError('');
    try {
      setVerification(await apiClient.verifyClinicalRecord(record.id));
    } catch (err) {
      setActionError(getErrorMessage(err, 'No fue posible verificar la integridad del folio.'));
    } finally {
      setVerifying(false);
    }
  };

  const handleCopyHash = async () => {
    if (!record?.hash_sha256) return;
    try {
      await navigator.clipboard.writeText(record.hash_sha256);
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 2000);
    } catch {
      setActionError('El navegador no permitió copiar el hash al portapapeles.');
    }
  };

  const handleExport = async (format) => {
    if (!record || exporting) return;
    setExporting(format);
    setActionError('');
    try {
      const data = await apiClient.exportClinicalRecord(record.id, format);
      downloadJson(`${format}-${record.id}.json`, data);
      setNotice(`Exportación ${format.toUpperCase()} generada por el servidor.`);
    } catch (err) {
      setActionError(getErrorMessage(err, `No fue posible exportar el folio en formato ${format.toUpperCase()}.`));
    } finally {
      setExporting('');
    }
  };

  const handleAddClarification = async (e) => {
    e.preventDefault();
    const note = clarificationText.trim();
    if (!record || !note || clarifying) return;
    setClarifying(true);
    setActionError('');
    try {
      await apiClient.addClarification(record.id, note);
      setClarificationText('');
      await loadRecords(record.id);
      setNotice('Nota aclaratoria registrada.');
    } catch (err) {
      setActionError(getErrorMessage(err, 'No fue posible registrar la nota aclaratoria.'));
    } finally {
      setClarifying(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <SignFolioModal
        isOpen={isSignOpen}
        expectedSignature={signatureId}
        loading={signing}
        error={signError}
        onClose={() => setIsSignOpen(false)}
        onConfirm={handleConfirmSign}
      />

      <section className="bg-white rounded-2xl p-5 shadow-xs border border-surface-container-high sticky top-20 z-20">
        <div className="flex flex-col gap-3">
          <PatientBanner patient={patient} onChangePatient={() => onPatientChange(null)}>
            {triageLevel && (
              <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${triageLevel.color}`}>
                {triageLevel.number} {triageLevel.name && `| ${triageLevel.name}`}
              </span>
            )}
          </PatientBanner>

          {matchingTriage && (
            <div
              aria-label="Signos vitales del triaje"
              className="flex flex-wrap items-center gap-x-5 gap-y-1 bg-surface-container-low px-3.5 py-1.5 rounded-xl border border-outline-variant/30 text-xs font-mono"
            >
              <span>PA <strong>{matchingTriage.systolic_bp}/{matchingTriage.diastolic_bp}</strong></span>
              <span>FC <strong>{matchingTriage.heart_rate}</strong></span>
              <span>FR <strong>{matchingTriage.respiratory_rate}</strong></span>
              <span>SpO2 <strong>{matchingTriage.oxygen_saturation}%</strong></span>
              <span>TEMP <strong>{matchingTriage.body_temperature}°</strong></span>
              <span>GLASGOW <strong>{matchingTriage.glasgow_score}</strong></span>
            </div>
          )}

          <AllergyBanner
            allergies={patient.allergies}
            action={
              <button
                type="button"
                onClick={() => onNavigate('prescription')}
                className="px-3 py-1 bg-white text-red-700 hover:bg-red-50 border border-red-200 font-bold text-[10px] uppercase rounded-lg shrink-0 transition-all cursor-pointer ml-auto"
              >
                Ver Prescripción
              </button>
            }
          />
        </div>
      </section>

      {notice && (
        <div role="status" className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {actionError && (
        <div role="alert" className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <span>{actionError}</span>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-xs border border-surface-container-high overflow-hidden">
        <div className="px-4 py-3 border-b border-surface-container-high bg-surface-container-low flex flex-wrap items-center gap-2" aria-label="Folios del paciente">
          <span className="text-[10px] font-bold uppercase tracking-wider text-outline font-mono mr-2">Folios</span>
          <button
            type="button"
            onClick={() => setSelectedId(NEW_FOLIO)}
            aria-pressed={isNew}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer border ${
              isNew ? 'bg-primary text-white border-primary' : 'bg-white text-primary border-primary/30 hover:bg-primary/5'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Nuevo folio</span>
          </button>
          {records.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setSelectedId(r.id)}
              aria-pressed={selectedId === r.id}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer border ${
                selectedId === r.id
                  ? 'bg-primary-container text-white border-primary-container'
                  : 'bg-white text-on-surface border-outline-variant/40 hover:bg-surface-container'
              }`}
            >
              {r.is_closed ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
              <span>
                {formatDateTime(r.created_at)} | {r.cie11_code}
              </span>
            </button>
          ))}
          {loadingRecords && (
            <span role="status" className="text-xs text-on-surface-variant flex items-center gap-1.5">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Cargando folios...
            </span>
          )}
          {loadError && (
            <span role="alert" className="text-xs text-red-700 flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5" /> {loadError}
              <button
                type="button"
                onClick={() => loadRecords()}
                className="underline font-semibold cursor-pointer"
              >
                Reintentar
              </button>
            </span>
          )}
        </div>

        <div role="tablist" aria-label="Secciones del folio" className="flex items-center border-b border-surface-container-high bg-surface-container-low px-4 pt-2 overflow-x-auto gap-2">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold rounded-t-xl transition-all cursor-pointer whitespace-nowrap border-b-2 ${
                  isActive
                    ? 'bg-white text-primary border-primary font-bold shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface border-transparent hover:bg-surface-container'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-primary' : 'text-outline'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="p-6" role="tabpanel">
          {activeTab === 'anamnesis' && (
            <div className="space-y-5">
              <div>
                <label htmlFor="hce-anamnesis" className="block text-xs font-bold text-on-surface uppercase mb-1">
                  Motivo de Consulta y Enfermedad Actual
                </label>
                <textarea
                  id="hce-anamnesis"
                  name="anamnesis"
                  rows={4}
                  readOnly={readOnly}
                  value={view.anamnesis ?? ''}
                  onChange={handleFieldChange}
                  aria-invalid={Boolean(fieldErrors.anamnesis)}
                  className={textAreaClass(readOnly)}
                />
                {fieldErrors.anamnesis && <p role="alert" className="mt-1 text-[11px] text-red-700">{fieldErrors.anamnesis}</p>}
              </div>
              <div>
                <label htmlFor="hce-physical-exam" className="block text-xs font-bold text-on-surface uppercase mb-1">
                  Examen Físico Detallado por Sistemas
                </label>
                <textarea
                  id="hce-physical-exam"
                  name="physical_exam"
                  rows={4}
                  readOnly={readOnly}
                  value={view.physical_exam ?? ''}
                  onChange={handleFieldChange}
                  aria-invalid={Boolean(fieldErrors.physical_exam)}
                  className={textAreaClass(readOnly)}
                />
                {fieldErrors.physical_exam && <p role="alert" className="mt-1 text-[11px] text-red-700">{fieldErrors.physical_exam}</p>}
              </div>
            </div>
          )}

          {activeTab === 'diagnosis' && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label htmlFor="hce-cie11" className="block text-xs font-bold text-on-surface uppercase mb-1">
                  Código CIE-11
                </label>
                <input
                  id="hce-cie11"
                  type="text"
                  name="cie11_code"
                  readOnly={readOnly}
                  value={view.cie11_code ?? ''}
                  onChange={handleFieldChange}
                  aria-invalid={Boolean(fieldErrors.cie11_code)}
                  className={`${inputClass(readOnly)} font-mono font-bold`}
                />
                {fieldErrors.cie11_code && <p role="alert" className="mt-1 text-[11px] text-red-700">{fieldErrors.cie11_code}</p>}
              </div>
              <div className="md:col-span-3">
                <label htmlFor="hce-diagnosis" className="block text-xs font-bold text-on-surface uppercase mb-1">
                  Descripción Diagnóstica Principal
                </label>
                <input
                  id="hce-diagnosis"
                  type="text"
                  name="diagnosis_description"
                  readOnly={readOnly}
                  value={view.diagnosis_description ?? ''}
                  onChange={handleFieldChange}
                  aria-invalid={Boolean(fieldErrors.diagnosis_description)}
                  className={inputClass(readOnly)}
                />
                {fieldErrors.diagnosis_description && (
                  <p role="alert" className="mt-1 text-[11px] text-red-700">{fieldErrors.diagnosis_description}</p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'plan' && (
            <div>
              <label htmlFor="hce-plan" className="block text-xs font-bold text-on-surface uppercase mb-1">
                Conducta Médica, Órdenes y Plan Terapéutico
              </label>
              <textarea
                id="hce-plan"
                name="treatment_plan"
                rows={6}
                readOnly={readOnly}
                value={view.treatment_plan ?? ''}
                onChange={handleFieldChange}
                aria-invalid={Boolean(fieldErrors.treatment_plan)}
                className={`${textAreaClass(readOnly)} font-mono`}
              />
              {fieldErrors.treatment_plan && <p role="alert" className="mt-1 text-[11px] text-red-700">{fieldErrors.treatment_plan}</p>}
            </div>
          )}

          {activeTab === 'forensic' && (
            <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/40 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-primary" />
                  <span className="font-bold text-xs uppercase tracking-wide text-on-surface">
                    Sellado Criptográfico e Integridad de Folio
                  </span>
                </div>
                <span
                  className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                    isClosed ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {isClosed ? 'Bloque Cerrado e Inmutable' : record ? 'Borrador Sin Sellar' : 'Sin folio seleccionado'}
                </span>
              </div>

              {record ? (
                <>
                  <div className="space-y-2 font-mono text-xs">
                    <div>
                      <span className="text-outline text-[11px] block">Hash del Bloque Previo (PreviousHash):</span>
                      <span className="text-on-surface-variant break-all text-[11px]">
                        {record.previous_hash || (isClosed ? 'Primer bloque de la cadena' : 'Se asigna al cerrar el folio')}
                      </span>
                    </div>
                    <div>
                      <span className="text-outline text-[11px] block">Hash SHA-256 del Folio (calculado por el servidor):</span>
                      <div className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-outline-variant/40 mt-1 gap-2">
                        <span data-testid="record-hash" className="text-primary font-bold break-all text-xs">
                          {record.hash_sha256 || 'Borrador editable en proceso (No sellado)'}
                        </span>
                        {isClosed && record.hash_sha256 && (
                          <button
                            type="button"
                            onClick={handleCopyHash}
                            className="px-2 py-1 bg-surface-container text-xs rounded hover:bg-surface-container-high cursor-pointer flex items-center gap-1 shrink-0"
                          >
                            <Copy className="w-3 h-3" />
                            <span>{copiedHash ? 'Copiado' : 'Copiar'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 text-xs text-on-surface-variant border-t border-outline-variant/30 flex flex-wrap items-center justify-between gap-2">
                    <span>Autor: {record.doctor_name || record.doctor_id}</span>
                    <span className="font-mono">
                      {isClosed ? `Fecha cierre: ${formatDateTime(record.closed_at)}` : `Creado: ${formatDateTime(record.created_at)}`}
                    </span>
                  </div>

                  {isClosed && (
                    <div className="pt-2 flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={handleVerify}
                        disabled={verifying}
                        className="px-3.5 py-2 rounded-xl bg-white hover:bg-surface-container text-primary border border-primary/30 text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                        <span>{verifying ? 'Verificando...' : 'Verificar integridad en el servidor'}</span>
                      </button>
                      {verification && (
                        <span
                          role="status"
                          className={`text-xs font-bold flex items-center gap-1.5 ${
                            verification.integrity_valid && verification.cryptographic_ok ? 'text-emerald-700' : 'text-red-700'
                          }`}
                        >
                          {verification.integrity_valid && verification.cryptographic_ok ? (
                            <>
                              <CheckCircle2 className="w-4 h-4" /> Integridad verificada: la cadena SHA-256 es consistente.
                            </>
                          ) : (
                            <>
                              <AlertTriangle className="w-4 h-4" /> Alerta: el folio no supera la verificación de integridad.
                            </>
                          )}
                        </span>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <p className="text-xs text-on-surface-variant">
                  Seleccione un folio guardado para consultar su sello criptográfico.
                </p>
              )}
            </div>
          )}

          {activeTab === 'clarifications' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-950">
                <strong>Resolución 1995 de 1999 (Artículo 8):</strong> Una vez cerrado el folio clínico, queda estrictamente prohibida toda modificación o supresión del texto original. Cualquier observación posterior debe registrarse como nota aclaratoria con su propio sello temporal y firma digital.
              </div>

              {!isClosed ? (
                <p className="text-xs text-on-surface-variant">
                  Las notas aclaratorias solo están disponibles sobre folios cerrados.
                </p>
              ) : (
                <>
                  <div className="space-y-3">
                    {(record.clarifications ?? []).length === 0 && (
                      <p className="text-xs text-on-surface-variant">Este folio no tiene notas aclaratorias.</p>
                    )}
                    {(record.clarifications ?? []).map((cl) => (
                      <div key={cl.id} className="p-4 rounded-xl bg-white border border-surface-container-high shadow-xs space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-primary">{cl.doctor_name || cl.doctor_id}</span>
                          <span className="font-mono text-[11px] text-outline">{formatDateTime(cl.created_at)}</span>
                        </div>
                        <p className="text-xs text-on-surface leading-relaxed">{cl.note}</p>
                      </div>
                    ))}
                  </div>

                  <form onSubmit={handleAddClarification} className="pt-2 space-y-3 border-t border-surface-container-high">
                    <label htmlFor="hce-clarification" className="block text-xs font-bold text-on-surface">
                      Redactar Nueva Nota Aclaratoria
                    </label>
                    <textarea
                      id="hce-clarification"
                      rows={3}
                      value={clarificationText}
                      onChange={(e) => setClarificationText(e.target.value)}
                      disabled={clarifying}
                      placeholder="Escriba la adición o precisión clínica correspondiente..."
                      className="w-full p-3 rounded-xl border border-outline-variant text-xs outline-none focus:border-primary"
                    />
                    <button
                      type="submit"
                      disabled={clarifying || !clarificationText.trim()}
                      className="px-4 py-2 bg-primary hover:bg-primary-container text-white font-semibold text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {clarifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
                      <span>{clarifying ? 'Registrando...' : 'Anexar Nota Aclaratoria Inmutable'}</span>
                    </button>
                  </form>
                </>
              )}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-surface-container-high bg-surface-container-low flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleExport('rips')}
              disabled={!isClosed || Boolean(exporting)}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-surface-container text-on-surface border border-outline-variant/30 text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exporting === 'rips' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileCode className="w-4 h-4 text-primary" />}
              <span>Exportar RIPS JSON</span>
            </button>
            <button
              type="button"
              onClick={() => handleExport('fhir')}
              disabled={!isClosed || Boolean(exporting)}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-surface-container text-on-surface border border-outline-variant/30 text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exporting === 'fhir' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4 text-secondary" />}
              <span>Exportar HL7 FHIR</span>
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            {isNew && (
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={saving}
                className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-container text-white text-xs font-bold shadow-md cursor-pointer flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>{saving ? 'Guardando...' : 'Guardar Folio como Borrador'}</span>
              </button>
            )}
            {record && !isClosed && (
              <button
                type="button"
                onClick={() => {
                  setSignError('');
                  setIsSignOpen(true);
                }}
                disabled={!signatureId}
                title={signatureId ? undefined : 'Su cuenta no tiene identificador de firma profesional'}
                className="px-5 py-2 rounded-xl bg-primary hover:bg-primary-container text-white text-xs font-bold shadow-md cursor-pointer flex items-center gap-2 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Lock className="w-4 h-4" />
                <span>Cerrar y Sellar Folio (SHA-256)</span>
              </button>
            )}
            {isClosed && (
              <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-100 text-emerald-950 font-bold text-xs border border-emerald-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                <span>Folio Cerrado Inmutable (Bloqueado)</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HceScreen;
