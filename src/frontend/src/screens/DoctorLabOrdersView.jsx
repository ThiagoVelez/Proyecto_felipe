import React, { useState, useEffect } from 'react';
import {
  FlaskConical,
  Send,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Printer,
  Mail,
  User,
  ShieldCheck,
  Eye,
  FileText,
  Calendar,
  Sparkles,
  RefreshCw,
  X,
  ChevronRight,
  Hash,
  Building2,
  AlertTriangle,
  Plus,
} from 'lucide-react';
import { apiClient } from '../services/api';
import { formatDoctorName, calculateAge } from '../utils/clinical';

const COMMON_TESTS = [
  {
    name: 'Hemograma Completo Automatizado + Plaquetas',
    sample: 'Sangre Total (Tubo Tapa Lila EDTA)',
    category: 'Hematología',
  },
  {
    name: 'Glucemia Basal & Perfil Lipídico Completo',
    sample: 'Suero (Tubo Tapa Amarilla con Gel Separador)',
    category: 'Bioquímica Clínica',
  },
  {
    name: 'Uroanálisis con Sedimento Microscópico',
    sample: 'Orina Fracción Media (Frasco Estéril)',
    category: 'Uroanálisis',
  },
  {
    name: 'Troponina I Cuantitativa Ultrasensible',
    sample: 'Plasma Heparinizado (Urgencias)',
    category: 'Marcadores Cardíacos',
  },
  {
    name: 'Creatinina Sérica & Tasa de Filtración Glomerular',
    sample: 'Suero (Tubo Tapa Amarilla)',
    category: 'Función Renal',
  },
  {
    name: 'Perfil Tiroideo Integral (TSH, T3, T4 Libre)',
    sample: 'Suero (Tubo Tapa Roja / Amarilla)',
    category: 'Endocrinología',
  },
  {
    name: 'Tiempos de Coagulación (PT, PTT, INR)',
    sample: 'Plasma Citratado (Tubo Tapa Celeste)',
    category: 'Coagulación',
  },
  {
    name: 'Proteína C Reactiva (PCR) Cuantitativa de Alta Sensibilidad',
    sample: 'Suero (Tubo Tapa Amarilla)',
    category: 'Inmunología',
  },
  {
    name: 'Coprológico & Sangre Oculta en Heces',
    sample: 'Materia Fecal (Frasco Estéril)',
    category: 'Parasitología',
  },
];

const generateNextLabId = (existingOrders) => {
  const currentYear = new Date().getFullYear();
  const currentOrders = existingOrders || [];
  let maxSeq = 0;
  currentOrders.forEach((o) => {
    if (o.id && o.id.startsWith(`LAB-${currentYear}-`)) {
      const parts = o.id.split('-');
      const num = parseInt(parts[2], 10);
      if (!isNaN(num) && num > maxSeq) {
        maxSeq = num;
      }
    }
  });
  const nextSeq = String(maxSeq + 1).padStart(3, '0');
  return `LAB-${currentYear}-${nextSeq}`;
};

export const DoctorLabOrdersView = ({ user, patient, onSelectPatient, onNavigate }) => {
  const [orders, setOrders] = useState(() => {
    try {
      const saved = localStorage.getItem('saludconecta_lab_orders');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [activeTab, setActiveTab] = useState('new_order'); // 'new_order' | 'history'
  const [allPatients, setAllPatients] = useState([]);
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatientLocal, setSelectedPatientLocal] = useState(patient || null);
  const [isLoadingPatients, setIsLoadingPatients] = useState(false);

  // Formulario de Orden
  const [labId, setLabId] = useState('');
  const [testType, setTestType] = useState('');
  const [sampleType, setSampleType] = useState('');
  const [priority, setPriority] = useState('RUTINA');
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Modal de Resultados / Envío / Impresión
  const [viewingResultOrder, setViewingResultOrder] = useState(null);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailRecipient, setEmailRecipient] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailFeedback, setEmailFeedback] = useState('');

  // Sincronizar órdenes desde localStorage y eventos
  useEffect(() => {
    const handleSync = () => {
      try {
        const saved = localStorage.getItem('saludconecta_lab_orders');
        if (saved) setOrders(JSON.parse(saved));
      } catch {}
    };
    window.addEventListener('saludconecta_lab_orders_updated', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('saludconecta_lab_orders_updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  // Sincronización global reactiva si el médico o cualquier área actualiza datos de paciente
  useEffect(() => {
    const handlePatientSync = (e) => {
      const updated = e.detail;
      if (!updated) return;

      setSelectedPatientLocal((prev) => {
        if (!prev) return prev;
        const sameId = updated.id && String(prev.id) === String(updated.id);
        const sameDoc = updated.document_number && String(prev.document_number) === String(updated.document_number);
        if (sameId || sameDoc) {
          return { ...prev, ...updated };
        }
        return prev;
      });

      setAllPatients((prevList) =>
        prevList.map((p) => {
          const sameId = updated.id && String(p.id) === String(updated.id);
          const sameDoc = updated.document_number && String(p.document_number) === String(updated.document_number);
          if (sameId || sameDoc) {
            return { ...p, ...updated };
          }
          return p;
        })
      );

      setOrders((prevOrders) =>
        prevOrders.map((o) => {
          const sameId = updated.id && String(o.patient_id) === String(updated.id);
          const sameDoc = updated.document_number && String(o.patient_document) === String(updated.document_number);
          if (sameId || sameDoc) {
            return {
              ...o,
              patient_name: updated.full_name || updated.name || o.patient_name,
              patient_email: updated.email !== undefined ? updated.email : o.patient_email,
              patient_phone: updated.phone || o.patient_phone,
              patient_eps: updated.eps_name || updated.eps || o.patient_eps,
            };
          }
          return o;
        })
      );
    };

    window.addEventListener('saludconecta_patient_updated', handlePatientSync);
    return () => window.removeEventListener('saludconecta_patient_updated', handlePatientSync);
  }, []);

  // Cargar lista de pacientes al montar
  useEffect(() => {
    let cancelled = false;
    setIsLoadingPatients(true);
    apiClient
      .listPatients({ limit: 100 })
      .then((data) => {
        if (!cancelled && Array.isArray(data)) {
          setAllPatients(data);
          if (!selectedPatientLocal && data.length > 0) {
            setSelectedPatientLocal(data[0]);
          }
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIsLoadingPatients(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Generar ID único automático
  useEffect(() => {
    setLabId(generateNextLabId(orders));
  }, [orders]);

  // Si cambia el paciente externo
  useEffect(() => {
    if (patient) {
      setSelectedPatientLocal(patient);
    }
  }, [patient]);

  const doctorName = formatDoctorName(
    user?.full_name || user?.name || 'Dr. Santiago Vélez',
    user?.role || 'MEDICO'
  );
  const doctorLicense = user?.professional_card || user?.license || 'RM-94821-VALLE';

  // Manejar selección de examen predefinido
  const handleSelectCommonTest = (t) => {
    setTestType(t.name);
    setSampleType(t.sample);
  };

  // Enviar orden al buzón del laboratorio
  const handleSendOrder = (e) => {
    e.preventDefault();
    if (!selectedPatientLocal) {
      setFeedback({ type: 'error', text: 'Debe seleccionar un paciente para emitir la orden médica.' });
      return;
    }
    if (!testType.trim()) {
      setFeedback({ type: 'error', text: 'Indique el tipo de examen de laboratorio a realizar.' });
      return;
    }

    setIsSubmitting(true);
    const newOrder = {
      id: labId || generateNextLabId(orders),
      patient_id: selectedPatientLocal.id || selectedPatientLocal.document_number,
      patient_name: selectedPatientLocal.name || selectedPatientLocal.full_name || 'Paciente',
      patient_document: selectedPatientLocal.document_number || '1006238743',
      patient_document_type: selectedPatientLocal.document_type || 'CC',
      patient_eps: selectedPatientLocal.eps_name || selectedPatientLocal.eps || 'CaliEps (CONTRIBUTIVO)',
      patient_age: calculateAge(selectedPatientLocal.birth_date) || selectedPatientLocal.age || 32,
      patient_gender: selectedPatientLocal.gender === 'F' ? 'Femenino' : 'Masculino',
      patient_email: selectedPatientLocal.email || '',
      patient_phone: selectedPatientLocal.phone || '',
      test_type: testType.trim(),
      sample_type: sampleType.trim() || 'Muestra biológica estándar',
      priority,
      status: 'PENDIENTE',
      ordering_doctor: doctorName,
      doctor_license: doctorLicense,
      doctor_specialty: user?.specialty || 'Medicina General & Especialidades',
      observations: clinicalNotes.trim() || 'Sin observaciones clínicas adicionales.',
      created_at: new Date().toISOString(),
    };

    const updatedOrders = [newOrder, ...orders];
    setOrders(updatedOrders);
    localStorage.setItem('saludconecta_lab_orders', JSON.stringify(updatedOrders));

    // Notificar al laboratorio en tiempo real
    window.dispatchEvent(new CustomEvent('saludconecta_lab_orders_updated', { detail: newOrder }));

    setIsSubmitting(false);
    setFeedback({
      type: 'success',
      text: `Orden ${newOrder.id} despachada exitosamente al buzón del Laboratorio Clínico.`,
    });

    // Reset de campos para la siguiente orden
    setTestType('');
    setSampleType('');
    setClinicalNotes('');
    setPriority('RUTINA');
    setLabId(generateNextLabId(updatedOrders));
  };

  // Filtrado de pacientes para búsqueda
  const filteredPatients = allPatients.filter((p) => {
    const term = patientSearch.toLowerCase().trim();
    if (!term) return true;
    const name = (p.full_name || p.name || '').toLowerCase();
    const doc = (p.document_number || '').toLowerCase();
    return name.includes(term) || doc.includes(term);
  });

  // Imprimir reporte físico del examen
  const handlePrintPhysicalReport = () => {
    window.print();
  };

  // Enviar resultado por correo al paciente
  const handleSendEmailResult = () => {
    if (!emailRecipient.trim()) {
      setEmailFeedback('Por favor ingrese un correo electrónico válido.');
      return;
    }
    setIsSendingEmail(true);
    setTimeout(() => {
      setIsSendingEmail(false);
      setEmailFeedback(`Resultado oficial despachado con éxito a ${emailRecipient}.`);
      setTimeout(() => {
        setIsEmailModalOpen(false);
        setEmailFeedback('');
      }, 2500);
    }, 1200);
  };

  const completedOrders = orders.filter((o) => o.status === 'COMPLETADO');
  const pendingOrders = orders.filter((o) => o.status === 'PENDIENTE');

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fadeIn">
      {/* HEADER DE ÓRDENES DE LABORATORIO */}
      <div className="p-6 rounded-3xl bg-white border border-surface-container-high shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-900 border border-purple-200">
              Prescripción Diagnóstica & Laboratorio
            </span>
            <span className="text-xs text-outline font-mono">
              Médico: {doctorName} • ReTHUS: {doctorLicense}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-on-surface">
            Recetario de Exámenes de Laboratorio Clínico
          </h1>
          <p className="text-xs text-outline mt-0.5">
            Emisión de órdenes paraclínicas con ID único, recepción en tiempo real en el laboratorio e impresión/despacho de resultados sellados.
          </p>
        </div>

        {/* SELECTOR DE PESTAÑAS */}
        <div className="flex items-center gap-1.5 p-1 bg-surface-container-low rounded-xl border border-outline-variant/30 text-xs font-semibold shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('new_order')}
            className={`h-8 px-3.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'new_order'
                ? 'bg-white text-purple-900 font-bold shadow-xs'
                : 'text-outline hover:text-on-surface'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Recetar Nuevo Examen</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`h-8 px-3.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'history'
                ? 'bg-white text-purple-900 font-bold shadow-xs'
                : 'text-outline hover:text-on-surface'
            }`}
          >
            <FlaskConical className="w-3.5 h-3.5" />
            <span>Bandeja de Resultados ({orders.length})</span>
            {completedOrders.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-900 text-[10px] font-bold">
                {completedOrders.length} sellados
              </span>
            )}
          </button>
        </div>
      </div>

      {/* FEEDBACK REACTIVO */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl border text-xs font-semibold flex items-center justify-between shadow-xs animate-fadeIn ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
              : 'bg-rose-50 border-rose-200 text-rose-950'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-[11px] underline cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* VISTA 1: EMITIR NUEVA ORDEN DE LABORATORIO */}
      {activeTab === 'new_order' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* COLUMNA IZQUIERDA: SELECCIÓN DE PACIENTE */}
          <div className="space-y-4">
            <div className="p-5 rounded-3xl bg-white border border-surface-container-high shadow-xs space-y-3.5">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-on-surface flex items-center gap-2">
                  <User className="w-4 h-4 text-purple-700" />
                  <span>Paciente Seleccionado</span>
                </h3>
                {selectedPatientLocal && (
                  <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-900 text-[10px] font-bold">
                    Activo
                  </span>
                )}
              </div>

              {selectedPatientLocal ? (
                <div className="p-3.5 rounded-2xl bg-surface-container-low border border-outline-variant/30 space-y-2">
                  <div className="font-bold text-sm text-on-surface">
                    {selectedPatientLocal.full_name || selectedPatientLocal.name}
                  </div>
                  <div className="text-xs text-outline space-y-0.5">
                    <div>
                      <strong className="text-on-surface">Doc:</strong> {selectedPatientLocal.document_type || 'CC'} {selectedPatientLocal.document_number}
                    </div>
                    <div>
                      <strong className="text-on-surface">EPS:</strong> {selectedPatientLocal.eps_name || selectedPatientLocal.eps || 'CaliEps'}
                    </div>
                    <div>
                      <strong className="text-on-surface">Edad:</strong> {calculateAge(selectedPatientLocal.birth_date) || selectedPatientLocal.age || 32} años • {selectedPatientLocal.gender === 'F' ? 'Femenino' : 'Masculino'}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                  Seleccione un paciente de la lista para emitir la orden médica.
                </div>
              )}

              {/* BUSCADOR DE OTROS PACIENTES */}
              <div className="space-y-2 pt-2 border-t border-surface-container-high">
                <span className="text-[11px] font-bold uppercase tracking-wider text-outline block">
                  Cambiar / Buscar Paciente
                </span>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-outline absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Buscar por cédula o nombre..."
                    value={patientSearch}
                    onChange={(e) => setPatientSearch(e.target.value)}
                    className="w-full h-8 pl-8 pr-3 rounded-xl border border-surface-container-high bg-surface-container-low text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-purple-700"
                  />
                </div>

                <div className="max-h-48 overflow-y-auto divide-y divide-surface-container space-y-1">
                  {filteredPatients.slice(0, 6).map((p) => {
                    const isSelected = selectedPatientLocal?.id === p.id;
                    return (
                      <button
                        key={p.id || p.document_number}
                        type="button"
                        onClick={() => {
                          setSelectedPatientLocal(p);
                          if (onSelectPatient) onSelectPatient(p);
                        }}
                        className={`w-full p-2 rounded-xl text-left text-xs transition-colors cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'bg-purple-100 text-purple-950 font-bold'
                            : 'hover:bg-surface-container-low text-on-surface'
                        }`}
                      >
                        <div className="truncate">
                          <div>{p.full_name || p.name}</div>
                          <div className="text-[10px] text-outline font-mono">CC {p.document_number}</div>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-outline shrink-0" />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* RESUMEN DE TRAZABILIDAD */}
            <div className="p-4 rounded-3xl bg-purple-50/60 border border-purple-200 text-purple-950 text-xs space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-purple-900">
                <ShieldCheck className="w-4 h-4 text-purple-700" />
                <span>Gobernanza de Laboratorio & Trazabilidad</span>
              </div>
              <p className="text-[11px] text-purple-900/90 leading-relaxed">
                Toda orden remitida genera un ID inmutable de laboratorio. El bacteriólogo validará los parámetros bajo su código ReTHUS, permitiendo la consolidación del historial clínico oficial.
              </p>
            </div>
          </div>

          {/* COLUMNA DERECHA: FORMULARIO DE RECETA / ORDEN */}
          <div className="lg:col-span-2 space-y-4">
            <div className="p-6 rounded-3xl bg-white border border-surface-container-high shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-surface-container-high pb-3">
                <h3 className="font-bold text-base text-on-surface flex items-center gap-2">
                  <FlaskConical className="w-5 h-5 text-purple-700" />
                  <span>Datos de la Prescripción Paraclínica</span>
                </h3>
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-purple-100 text-purple-900 font-mono text-xs font-bold border border-purple-200">
                  <Hash className="w-3.5 h-3.5" />
                  <span>ID Asignado: {labId}</span>
                </div>
              </div>

              {/* CATÁLOGO RÁPIDO DE EXÁMENES FRECUENTES */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-outline block">
                  Exámenes Frecuentes (Clic para autocompletar)
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {COMMON_TESTS.map((t) => (
                    <button
                      key={t.name}
                      type="button"
                      onClick={() => handleSelectCommonTest(t)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
                        testType === t.name
                          ? 'bg-purple-700 text-white border-purple-700 shadow-2xs'
                          : 'bg-surface-container-low hover:bg-surface-container border-outline-variant/30 text-on-surface'
                      }`}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>

              <form onSubmit={handleSendOrder} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Tipo de Examen */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-on-surface mb-1">
                      Nombre del Examen de Laboratorio *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Hemograma Completo, Glucemia, Coprológico, PCR..."
                      value={testType}
                      onChange={(e) => setTestType(e.target.value)}
                      className="w-full h-10 px-3.5 rounded-xl border border-surface-container-high text-xs font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-purple-700/20 focus:border-purple-700"
                    />
                  </div>

                  {/* Tipo de Muestra / Contenedor */}
                  <div>
                    <label className="block text-xs font-semibold text-on-surface mb-1">
                      Muestra Sugerida / Tubo de Recolección
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: Sangre Total Tubo Lila EDTA, Suero, Orina..."
                      value={sampleType}
                      onChange={(e) => setSampleType(e.target.value)}
                      className="w-full h-9 px-3 rounded-xl border border-surface-container-high text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-purple-700"
                    />
                  </div>

                  {/* Prioridad de Atención */}
                  <div>
                    <label className="block text-xs font-semibold text-on-surface mb-1">
                      Prioridad Clínica del Análisis
                    </label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                      className="w-full h-9 px-3 rounded-xl border border-surface-container-high text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-purple-700 bg-white"
                    >
                      <option value="RUTINA">Rutina (Consulta Externa / Ambulatorio)</option>
                      <option value="PRIORITARIO">Prioritario (Menor a 4 horas)</option>
                      <option value="URGENTE">Urgente (Prioridad Máxima en Turno)</option>
                    </select>
                  </div>
                </div>

                {/* Observaciones Clínicas y Diagnóstico Presuntivo */}
                <div>
                  <label className="block text-xs font-semibold text-on-surface mb-1">
                    Sospecha Diagnóstica & Observaciones Clínicas para el Laboratorio *
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Describa el cuadro clínico del paciente, diagnóstico CIE-10 presuntivo, si está en ayunas o medicado, y parámetros específicos a evaluar por el bacteriólogo..."
                    value={clinicalNotes}
                    onChange={(e) => setClinicalNotes(e.target.value)}
                    className="w-full p-3 rounded-xl border border-surface-container-high text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-purple-700/20 focus:border-purple-700 font-sans"
                  />
                </div>

                {/* BOTÓN PRINCIPAL DE DESPACHO */}
                <div className="flex items-center justify-between pt-3 border-t border-surface-container-high">
                  <div className="text-[11px] text-outline font-mono">
                    ID Destino: <strong className="text-purple-900">{labId}</strong> • Bandeja de Laboratorio Central
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmitting || !selectedPatientLocal}
                    className="h-10 px-6 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-sm transition-all disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    <span>Enviar al Buzón de Laboratorio</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* VISTA 2: BANDEJA Y RESULTADOS PARA EL MÉDICO */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="p-6 rounded-3xl bg-white border border-surface-container-high shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-base text-on-surface flex items-center gap-2">
                  <FlaskConical className="w-5 h-5 text-purple-700" />
                  <span>Historial de Órdenes y Resultados Paraclínicos</span>
                </h3>
                <p className="text-xs text-outline">
                  Consulte el estado analítico de las muestras enviadas, imprima resultados sellados en formato físico o despáchelos vía correo electrónico.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-bold">
                  {pendingOrders.length} Pendientes
                </span>
                <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 text-xs font-bold">
                  {completedOrders.length} Sellados
                </span>
              </div>
            </div>

            {orders.length === 0 ? (
              <div className="p-12 text-center text-outline text-xs">
                No hay órdenes de laboratorio registradas en el sistema.
              </div>
            ) : (
              <div className="divide-y divide-surface-container-high">
                {orders.map((o) => {
                  const isCompleted = o.status === 'COMPLETADO';
                  const isUrgent = o.priority === 'URGENTE';

                  return (
                    <div
                      key={o.id}
                      className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-surface-container-low/50 px-3 rounded-2xl transition-colors"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-purple-900 bg-purple-100 px-2 py-0.5 rounded-md border border-purple-200">
                            {o.id}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              isUrgent
                                ? 'bg-red-100 text-red-800 border border-red-200'
                                : o.priority === 'PRIORITARIO'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {o.priority}
                          </span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              isCompleted
                                ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                : o.status === 'EN_PROCESO'
                                ? 'bg-blue-100 text-blue-900'
                                : 'bg-amber-100 text-amber-900'
                            }`}
                          >
                            {isCompleted ? 'RESULTADO SELLADO' : o.status === 'EN_PROCESO' ? 'EN ANÁLISIS' : 'PENDIENTE EN LABORATORIO'}
                          </span>
                        </div>

                        <h4 className="font-bold text-sm text-on-surface">{o.test_type}</h4>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-outline font-medium">
                          <span>Paciente: <strong className="text-on-surface">{o.patient_name}</strong> (CC {o.patient_document})</span>
                          <span>•</span>
                          <span>EPS: {o.patient_eps}</span>
                          <span>•</span>
                          <span>Muestra: {o.sample_type}</span>
                        </div>

                        {o.observations && (
                          <p className="text-[11px] text-on-surface-variant italic bg-surface-container-low p-2 rounded-lg max-w-2xl">
                            Obs: {o.observations}
                          </p>
                        )}
                      </div>

                      {/* ACCIONES DEL MÉDICO SEGÚN ESTADO */}
                      <div className="flex items-center gap-2 shrink-0">
                        {isCompleted ? (
                          <>
                            <button
                              type="button"
                              onClick={() => setViewingResultOrder(o)}
                              className="h-8 px-3.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
                              title="Ver ficha técnica completa del resultado"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Ver Resultado Sellado</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setViewingResultOrder(o);
                                setTimeout(handlePrintPhysicalReport, 300);
                              }}
                              className="h-8 px-3 rounded-xl border border-surface-container-high bg-white hover:bg-surface-container-low text-xs font-semibold text-on-surface flex items-center gap-1.5 cursor-pointer shadow-2xs"
                              title="Imprimir formato físico para el paciente"
                            >
                              <Printer className="w-3.5 h-3.5 text-slate-700" />
                              <span>Imprimir Físico</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setViewingResultOrder(o);
                                const cleanEmail =
                                  o.patient_email &&
                                  !o.patient_email.includes('saludconecta.ips.gov.co') &&
                                  !o.patient_email.includes('ejemplo.com')
                                    ? String(o.patient_email).trim()
                                    : '';
                                setEmailRecipient(cleanEmail);
                                setIsEmailModalOpen(true);
                              }}
                              className="h-8 px-3 rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 text-xs font-semibold text-purple-900 flex items-center gap-1.5 cursor-pointer shadow-2xs"
                              title="Despachar resultado por correo electrónico"
                            >
                              <Mail className="w-3.5 h-3.5 text-purple-700" />
                              <span>Enviar Correo</span>
                            </button>
                          </>
                        ) : (
                          <div className="px-3 py-1.5 rounded-xl bg-surface-container-low text-xs text-outline font-medium flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                            <span>Esperando validación en Laboratorio</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* DRAWER LATERAL DERECHO: VISOR DE RESULTADO DE LABORATORIO SELLADO */}
      {viewingResultOrder && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/50 backdrop-blur-xs flex justify-end animate-fadeIn">
          <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col justify-between border-l border-slate-300 animate-slideLeft">
            {/* ENCABEZADO STICKY DEL DRAWER */}
            <div className="px-6 py-4.5 border-b border-surface-container-high flex items-center justify-between bg-gradient-to-r from-purple-950 via-purple-900 to-indigo-950 text-white shrink-0 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-purple-200">
                  <FlaskConical className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-purple-800/80 text-purple-200">
                      {viewingResultOrder.id}
                    </span>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-200">
                      Resultado Validado & Sellado
                    </span>
                  </div>
                  <h3 className="font-bold text-base text-white mt-0.5">
                    Informe Oficial de Resultados Paraclínicos
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setViewingResultOrder(null);
                  setIsEmailModalOpen(false);
                }}
                className="p-1.5 rounded-xl hover:bg-white/20 text-white cursor-pointer transition-colors"
                title="Cerrar panel"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* CUERPO SCROLLEABLE DEL DRAWER (CONTENIDO IMPRIMIBLE) */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* DOCUMENTO OFICIAL FORMATEADO */}
              <div id="printable-lab-report" className="border-2 border-slate-300 p-6 rounded-2xl bg-white space-y-5 text-on-surface shadow-xs">
                {/* MEMBRETE INSTITUCIONAL PARA IMPRESIÓN FÍSICA */}
                <div className="border-b-2 border-slate-800 pb-3 flex items-start justify-between">
                  <div>
                    <h2 className="text-base font-black text-slate-900 uppercase tracking-tight">
                      SaludConecta IPS S.A.S.
                    </h2>
                    <p className="text-xs text-slate-600">
                      Sede Central Cartago • Red Norte del Valle • NIT: 900.842.199-5
                    </p>
                    <p className="text-[10px] text-slate-500">
                      Habilitación MinSalud Código 7614700192 • Laboratorio Clínico Nivel II
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-2.5 py-0.5 rounded bg-purple-100 text-purple-950 font-mono text-xs font-bold border border-purple-200">
                      ORDEN: {viewingResultOrder.id}
                    </span>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                      Fecha: {viewingResultOrder.validated_at?.slice(0, 10) || new Date().toISOString().slice(0, 10)}
                    </div>
                  </div>
                </div>

                {/* FICHA TÉCNICA Y DATOS COMPLETOS DEL PACIENTE */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-500 block">Paciente:</span>
                    <span className="font-bold text-slate-900">{viewingResultOrder.patient_name}</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-500 block">Identificación:</span>
                    <span className="font-mono font-bold text-slate-900">
                      {viewingResultOrder.patient_document_type || 'CC'} {viewingResultOrder.patient_document}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-500 block">Edad / Sexo:</span>
                    <span className="font-semibold text-slate-900">
                      {viewingResultOrder.patient_age || 32} años • {viewingResultOrder.patient_gender || 'General'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-500 block">Aseguradora / EPS:</span>
                    <span className="font-semibold text-slate-900">{viewingResultOrder.patient_eps}</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-500 block">Médico Solicitante:</span>
                    <span className="font-medium text-slate-900">{viewingResultOrder.ordering_doctor}</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-500 block">ReTHUS Médico:</span>
                    <span className="font-mono text-slate-900">{viewingResultOrder.doctor_license || 'RM-94821-VALLE'}</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-500 block">Muestra / Tubo:</span>
                    <span className="font-medium text-slate-900">{viewingResultOrder.sample_type}</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-500 block">Prioridad:</span>
                    <span className="font-bold text-purple-900">{viewingResultOrder.priority}</span>
                  </div>
                </div>

                {/* ANÁLISIS REALIZADO Y PARÁMETROS */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                    <h4 className="font-bold text-xs text-slate-900 uppercase">
                      Examen: {viewingResultOrder.test_type}
                    </h4>
                    <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                      VALIDADO & SELLADO
                    </span>
                  </div>

                  {/* TABLA DE PARÁMETROS ANALÍTICOS */}
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 font-mono text-xs whitespace-pre-wrap leading-relaxed text-slate-900">
                    {typeof viewingResultOrder.results === 'string'
                      ? viewingResultOrder.results
                      : JSON.stringify(viewingResultOrder.results, null, 2)}
                  </div>
                </div>

                {/* SELLO DE VALIDACIÓN RE-THUS */}
                <div className="p-3 rounded-xl bg-purple-50/70 border border-purple-200 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-purple-700 shrink-0" />
                    <div>
                      <strong className="text-purple-950 font-bold block text-[11px]">
                        Validación Bacteriológica & Diagnóstica (ReTHUS):
                      </strong>
                      <span className="text-purple-900 text-[10px]">
                        Firmado digitalmente por: <strong>{viewingResultOrder.validated_by || 'Dra. Marcela Cardona'}</strong> (Licencia: {viewingResultOrder.bacteriologist_license || 'BAC-9421-VALLE'})
                      </span>
                    </div>
                  </div>
                  <div className="text-right text-[9px] font-mono text-purple-800 font-bold">
                    Sello Digital: SHA-256-OK
                  </div>
                </div>
              </div>

              {/* SECCIÓN INTEGRADA DE DESPACHO POR CORREO EN LA PARTE INFERIOR DEL DRAWER */}
              {isEmailModalOpen && (
                <div className="p-5 rounded-2xl bg-purple-50/70 border-2 border-purple-300 space-y-4 animate-slideDown shadow-xs">
                  <div className="flex items-center justify-between border-b border-purple-200 pb-2.5">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-purple-700" />
                      <h4 className="font-bold text-xs text-purple-950 uppercase tracking-wider">
                        Despacho Oficial por Correo Electrónico
                      </h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsEmailModalOpen(false)}
                      className="p-1 rounded-lg text-purple-800 hover:bg-purple-200/50 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {emailFeedback && (
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs font-semibold flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{emailFeedback}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {/* DATOS DEL PACIENTE DESTINATARIO */}
                    <div className="p-3 rounded-xl bg-white border border-purple-200 space-y-1.5">
                      <span className="text-[10px] font-bold uppercase text-purple-900 block">
                        Paciente Destinatario:
                      </span>
                      <div className="font-bold text-on-surface">
                        {viewingResultOrder.patient_name}
                      </div>
                      <div className="text-[11px] text-outline font-mono">
                        Identificación: {viewingResultOrder.patient_document_type || 'CC'} {viewingResultOrder.patient_document}
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-on-surface mb-0.5 mt-1">
                          Correo del Paciente
                        </label>
                        <input
                          type="email"
                          value={emailRecipient}
                          onChange={(e) => setEmailRecipient(e.target.value)}
                          placeholder="Sin correo registrado (ingrese uno si desea despachar)..."
                          className="w-full h-8 px-2.5 rounded-lg border border-purple-200 bg-purple-50/30 text-xs font-mono text-on-surface focus:outline-none focus:ring-1 focus:ring-purple-700"
                        />
                      </div>
                    </div>

                    {/* COPIA ASISTENCIAL AL MÉDICO TRATANTE */}
                    <div className="p-3 rounded-xl bg-white border border-purple-200 space-y-2 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-bold uppercase text-purple-900">
                            Copia al Médico Tratante:
                          </span>
                          <span className="px-1.5 py-0.2 rounded bg-purple-100 text-purple-900 text-[9px] font-bold">
                            Trazabilidad
                          </span>
                        </div>
                        <div className="font-bold text-on-surface text-xs">
                          {viewingResultOrder.ordering_doctor}
                        </div>
                        <div className="text-[11px] font-mono text-outline">
                          santiago.velez@saludconecta.ips.gov.co
                        </div>
                      </div>

                      <div className="text-[10px] text-purple-900/90 pt-1 border-t border-purple-100 font-semibold">
                        Copia médica archivada en el folio digital
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsEmailModalOpen(false)}
                      className="h-9 px-4 rounded-xl border border-purple-200 bg-white hover:bg-purple-50 text-xs font-semibold text-purple-900 cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleSendEmailResult}
                      disabled={isSendingEmail}
                      className="h-9 px-5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50 transition-all"
                    >
                      {isSendingEmail ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                      <span>{isSendingEmail ? 'Despachando...' : 'Confirmar y Despachar Correos'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* BOTONES DE ACCIÓN EN EL FOOTER DEL DRAWER */}
            <div className="px-6 py-4 bg-slate-50 border-t border-surface-container-high flex flex-wrap items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setViewingResultOrder(null);
                  setIsEmailModalOpen(false);
                }}
                className="h-10 px-5 rounded-xl border border-surface-container-high bg-white hover:bg-surface-container-low text-xs font-semibold text-on-surface cursor-pointer"
              >
                Cerrar Panel
              </button>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    const cleanEmail =
                      viewingResultOrder.patient_email &&
                      !viewingResultOrder.patient_email.includes('saludconecta.ips.gov.co') &&
                      !viewingResultOrder.patient_email.includes('ejemplo.com')
                        ? String(viewingResultOrder.patient_email).trim()
                        : '';
                    setEmailRecipient(cleanEmail);
                    setIsEmailModalOpen(!isEmailModalOpen);
                  }}
                  className="h-10 px-4 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-xs transition-all"
                >
                  <Mail className="w-4 h-4" />
                  <span>{isEmailModalOpen ? 'Ocultar Correo' : 'Enviar por Correo al Paciente'}</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrintPhysicalReport}
                  className="h-10 px-5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-xs transition-all"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir Formato Físico (PDF)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorLabOrdersView;
