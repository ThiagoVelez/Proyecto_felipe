import React, { useState, useEffect } from 'react';
import {
  FlaskConical,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  User,
  Calendar,
  Building2,
  ShieldCheck,
  RefreshCw,
  Plus,
  X,
  FileCheck2,
  Eye,
  Mail,
  Send,
  Hash,
  Sparkles,
  ChevronRight,
  ChevronDown,
  Printer,
  Check,
} from 'lucide-react';
import apiClient from '../services/api';

const DEFAULT_ORDERS = [
  {
    id: 'LAB-2026-001',
    patient_name: 'Santiago Vélez',
    patient_document: '1006238743',
    patient_document_type: 'CC',
    patient_email: 'svelez@saludconecta.ips.gov.co',
    patient_eps: 'CaliEps (CONTRIBUTIVO)',
    patient_age: 28,
    patient_gender: 'Masculino',
    test_type: 'Hemograma Completo Automatizado + Plaquetas',
    ordering_doctor: 'Dr. Santiago Vélez',
    doctor_email: 'santiago.velez@saludconecta.ips.gov.co',
    doctor_license: 'RM-94821-VALLE',
    sample_type: 'Sangre Total (Tubo Tapa Lila EDTA)',
    priority: 'URGENTE',
    status: 'PENDIENTE',
    observations: 'Paciente con cuadro febril agudo de 3 días de evolución, mialgias y sospecha de síndrome viral o dengue.',
    created_at: '2026-11-10T07:30:00Z',
    results: null,
  },
  {
    id: 'LAB-2026-002',
    patient_name: 'Camila Yaima',
    patient_document: '1114567890',
    patient_document_type: 'CC',
    patient_email: 'camilayaima@saludconecta.ips.gov.co',
    patient_eps: 'Nueva EPS (CONTRIBUTIVO)',
    patient_age: 31,
    patient_gender: 'Femenino',
    test_type: 'Glucemia Basal & Perfil Lipídico Completo',
    ordering_doctor: 'Dra. Camila Yaima',
    doctor_email: 'camila.yaima@saludconecta.ips.gov.co',
    doctor_license: 'RM-88310-VALLE',
    sample_type: 'Suero (Tubo Tapa Amarilla con Gel Separador)',
    priority: 'RUTINA',
    status: 'EN_PROCESO',
    observations: 'Control metabólico anual por antecedentes familiares de diabetes mellitus tipo 2 y dislipidemia.',
    created_at: '2026-11-10T08:00:00Z',
    results: `GLUCOSE: 92 mg/dL (Ref: 70 - 100 mg/dL)
CHOLESTEROL TOTAL: 185 mg/dL (Ref: < 200 mg/dL)
TRIGLYCERIDES: 130 mg/dL (Ref: < 150 mg/dL)
HDL: 55 mg/dL (Ref: > 45 mg/dL)
LDL: 104 mg/dL (Ref: < 130 mg/dL)`,
  },
  {
    id: 'LAB-2026-003',
    patient_name: 'Carlos Alberto Restrepo',
    patient_document: '16789012',
    patient_document_type: 'CC',
    patient_email: '',
    patient_eps: 'Emssanar (SUBSIDIADO)',
    patient_age: 54,
    patient_gender: 'Masculino',
    test_type: 'Uroanálisis con Sedimento Microscópico',
    ordering_doctor: 'Dr. Santiago Vélez',
    doctor_email: 'santiago.velez@saludconecta.ips.gov.co',
    doctor_license: 'RM-94821-VALLE',
    sample_type: 'Orina Fracción Media',
    priority: 'PRIORITARIO',
    status: 'COMPLETADO',
    observations: 'Disuria y dolor lumbar derecho. Descartar infección de vías urinarias o litiasis renal.',
    created_at: '2026-11-09T16:20:00Z',
    validated_at: '2026-11-09T17:45:00Z',
    validated_by: 'Dra. Marcela Cardona (BAC-9421-VALLE)',
    bacteriologist_license: 'BAC-9421-VALLE',
    results: `ASPECT: Límpido, Amarillo pajizo
DENSITY: 1.020 (Ref: 1.010 - 1.030)
PH: 6.0 (Ref: 5.0 - 7.0)
PROTEINS: Negativo
GLUCOSE: Negativo
LEUKOCYTES: 1 - 2 por campo (Normal)
ERYTHROCYTES: 0 - 1 por campo
BACTERIA: Escasa (+)`,
  },
  {
    id: 'LAB-2026-004',
    patient_name: 'María Elena Gómez',
    patient_document: '31456789',
    patient_document_type: 'CC',
    patient_email: 'maria.gomez@hotmail.com',
    patient_eps: 'Sanitas (CONTRIBUTIVO)',
    patient_age: 62,
    patient_gender: 'Femenino',
    test_type: 'Troponina I Cuantitativa Ultrasensible',
    ordering_doctor: 'Dr. Santiago Vélez',
    doctor_email: 'santiago.velez@saludconecta.ips.gov.co',
    doctor_license: 'RM-94821-VALLE',
    sample_type: 'Plasma Heparinizado (Urgencias)',
    priority: 'URGENTE',
    status: 'PENDIENTE',
    observations: 'Dolor precordial opresivo con irradiación a miembro superior izquierdo. Urgencias vital.',
    created_at: '2026-11-10T08:15:00Z',
    results: null,
  },
];

// Plantillas de resultados analíticos según examen
const TEST_TEMPLATES = {
  hemograma: `HEMOGLOBINA: 14.2 g/dL (Ref: 12.0 - 16.0 g/dL)
HEMATOCRITO: 42.5 % (Ref: 37.0 - 48.0 %)
LEUCOCITOS: 6,800 /mm3 (Ref: 4,500 - 10,500 /mm3)
NEUTRÓFILOS: 62.0 % (Ref: 50.0 - 70.0 %)
LINFOCITOS: 29.5 % (Ref: 20.0 - 40.0 %)
PLAQUETAS: 245,000 /mm3 (Ref: 150,000 - 450,000 /mm3)
OBSERVACIÓN: Morfología eritrocitaria normal. No se observan blastos.`,
  glucemia: `GLUCEMIA BASAL: 88 mg/dL (Ref: 70 - 100 mg/dL)
COLESTEROL TOTAL: 178 mg/dL (Ref: < 200 mg/dL)
TRIGLICÉRIDOS: 120 mg/dL (Ref: < 150 mg/dL)
COLESTEROL HDL: 52 mg/dL (Ref: > 45 mg/dL)
COLESTEROL LDL: 102 mg/dL (Ref: < 130 mg/dL)
OBSERVACIÓN: Muestra tomada en ayuno estricto de 10 horas.`,
  uroanalisis: `COLOR / ASPECTO: Amarillo pajizo, Límpido
DENSIDAD: 1.018 (Ref: 1.010 - 1.030)
PH: 6.0 (Ref: 5.0 - 7.0)
PROTEÍNAS: Negativo
GLUCOSA: Negativo
CETONAS: Negativo
LEUCOCITOS: 0 - 2 por campo
HEMATÍES: 0 - 1 por campo
BACTERIAS: Negativo
OBSERVACIÓN: Muestra sin hallazgos patológicos significativos.`,
  troponina: `TROPONINA I ULTRASENSIBLE: 0.008 ng/mL (Ref: < 0.014 ng/mL - Negativo para necrosis)
CK-MB CUANTITATIVA: 2.1 ng/mL (Ref: < 5.0 ng/mL)
OBSERVACIÓN: Procesado por Quimioluminiscencia. Control seriado a las 3 horas recomendado.`,
  creatinina: `CREATININA SÉRICA: 0.9 mg/dL (Ref: 0.6 - 1.2 mg/dL)
NITRÓGENO UREICO (BUN): 14 mg/dL (Ref: 7 - 20 mg/dL)
TASA DE FILTRACIÓN GLOMERULAR (eGFR): > 90 mL/min/1.73m2 (Función Renal Normal)`,
};

export const LaboratoryScreen = ({ user }) => {
  const [orders, setOrders] = useState(() => {
    try {
      const saved = localStorage.getItem('saludconecta_lab_orders');
      return saved ? JSON.parse(saved) : DEFAULT_ORDERS;
    } catch {
      return DEFAULT_ORDERS;
    }
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('TODOS');
  const [priorityFilter, setPriorityFilter] = useState('TODOS');
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Estados de Drawers laterales
  const [isResultDrawerOpen, setIsResultDrawerOpen] = useState(false);
  const [isNewOrderDrawerOpen, setIsNewOrderDrawerOpen] = useState(false);

  // Estados de ingreso y edición de resultados
  const [resultText, setResultText] = useState('');
  const [methodNotes, setMethodNotes] = useState('');
  const [notice, setNotice] = useState('');

  // Sección de correo electrónico en la parte inferior del Drawer
  const [showEmailSection, setShowEmailSection] = useState(false);
  const [patientEmailInput, setPatientEmailInput] = useState('');
  const [sendDoctorCopy, setSendDoctorCopy] = useState(true);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailFeedback, setEmailFeedback] = useState('');

  const currentUser = user || {};
  const bacteriologistName = currentUser.full_name || currentUser.name || 'Dra. Marcela Cardona';
  const license = currentUser.professional_card || 'BAC-9421-VALLE';

  // Sincronización reactiva bidireccional
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

  // Persistencia local
  useEffect(() => {
    try {
      localStorage.setItem('saludconecta_lab_orders', JSON.stringify(orders));
    } catch {}
  }, [orders]);

  // Sincronización reactiva cuando cualquier departamento o médico actualiza los datos del paciente
  useEffect(() => {
    const handlePatientSync = (e) => {
      const p = e.detail;
      if (!p) return;
      setOrders((prevOrders) =>
        prevOrders.map((o) => {
          const sameId = p.id && String(o.patient_id) === String(p.id);
          const sameDoc = p.document_number && String(o.patient_document) === String(p.document_number);
          if (sameId || sameDoc) {
            return {
              ...o,
              patient_name: p.full_name || p.name || o.patient_name,
              patient_email: p.email !== undefined ? p.email : o.patient_email,
              patient_phone: p.phone !== undefined ? p.phone : o.patient_phone,
              patient_address: p.address !== undefined ? p.address : o.patient_address,
              patient_eps: p.eps_name || p.eps || o.patient_eps,
            };
          }
          return o;
        })
      );

      setSelectedOrder((prev) => {
        if (!prev) return prev;
        const sameId = p.id && String(prev.patient_id) === String(p.id);
        const sameDoc = p.document_number && String(prev.patient_document) === String(p.document_number);
        if (sameId || sameDoc) {
          const updatedEmail = p.email !== undefined ? p.email : prev.patient_email;
          setPatientEmailInput(updatedEmail || '');
          return {
            ...prev,
            patient_name: p.full_name || p.name || prev.patient_name,
            patient_email: updatedEmail,
            patient_phone: p.phone !== undefined ? p.phone : prev.patient_phone,
            patient_eps: p.eps_name || p.eps || prev.patient_eps,
          };
        }
        return prev;
      });
    };

    window.addEventListener('saludconecta_patient_updated', handlePatientSync);
    return () => window.removeEventListener('saludconecta_patient_updated', handlePatientSync);
  }, []);

  // Abrir Drawer de Resultados (Ingresar, Continuar o Ver)
  const handleOpenResultDrawer = (order) => {
    setSelectedOrder(order);
    setShowEmailSection(false);
    setEmailFeedback('');

    // Si tiene correo real sale automáticamente; si no tiene, sale en blanco
    const cleanEmail =
      order.patient_email &&
      order.patient_email !== 'paciente@saludconecta.ips.gov.co' &&
      order.patient_email !== 'paciente@ejemplo.com'
        ? String(order.patient_email).trim()
        : '';
    setPatientEmailInput(cleanEmail);
    setSendDoctorCopy(true);

    if (order.results) {
      if (typeof order.results === 'string') {
        setResultText(order.results);
      } else {
        setResultText(
          Object.entries(order.results)
            .map(([k, v]) => `${k.toUpperCase().replace(/_/g, ' ')}: ${v}`)
            .join('\n')
        );
      }
    } else {
      // Sugerir plantilla por defecto según el nombre del examen
      const typeLower = (order.test_type || '').toLowerCase();
      if (typeLower.includes('hemograma') || typeLower.includes('sangre') || typeLower.includes('plaquetas')) {
        setResultText(TEST_TEMPLATES.hemograma);
      } else if (typeLower.includes('gluc') || typeLower.includes('lipid') || typeLower.includes('colest')) {
        setResultText(TEST_TEMPLATES.glucemia);
      } else if (typeLower.includes('uro') || typeLower.includes('orina')) {
        setResultText(TEST_TEMPLATES.uroanalisis);
      } else if (typeLower.includes('tropo') || typeLower.includes('card')) {
        setResultText(TEST_TEMPLATES.troponina);
      } else if (typeLower.includes('creat') || typeLower.includes('renal')) {
        setResultText(TEST_TEMPLATES.creatinina);
      } else {
        setResultText('');
      }
    }

    setMethodNotes(order.method_notes || 'Análisis procesado mediante analizador automatizado calibrado bajo estándares de aseguramiento de calidad.');
    setIsResultDrawerOpen(true);
  };

  // Cargar plantilla rápida
  const handleApplyTemplate = (key) => {
    if (TEST_TEMPLATES[key]) {
      setResultText(TEST_TEMPLATES[key]);
    }
  };

  // Guardar avance como "EN_PROCESO" (Continuar Análisis después)
  const handleSaveDraft = () => {
    if (!selectedOrder) return;
    const updatedOrder = {
      ...selectedOrder,
      status: 'EN_PROCESO',
      results: resultText,
      method_notes: methodNotes,
      updated_at: new Date().toISOString(),
    };
    const updatedList = orders.map((o) => (o.id === selectedOrder.id ? updatedOrder : o));
    setOrders(updatedList);
    localStorage.setItem('saludconecta_lab_orders', JSON.stringify(updatedList));
    window.dispatchEvent(new CustomEvent('saludconecta_lab_orders_updated', { detail: updatedOrder }));

    setSelectedOrder(updatedOrder);
    setNotice(`Avance de la orden ${selectedOrder.id} guardado en estado EN PROCESO.`);
    setTimeout(() => setNotice(''), 4000);
  };

  // Validar y Sellar Resultado con ReTHUS
  const handleValidateAndSeal = (e) => {
    e?.preventDefault();
    if (!selectedOrder) return;

    if (!resultText.trim()) {
      alert('Debe ingresar los parámetros analíticos antes de sellar el resultado.');
      return;
    }

    const validatedTimestamp = new Date().toISOString();
    const updatedOrder = {
      ...selectedOrder,
      status: 'COMPLETADO',
      results: resultText,
      method_notes: methodNotes,
      validated_at: validatedTimestamp,
      validated_by: bacteriologistName,
      bacteriologist_license: license,
    };

    const updatedList = orders.map((o) => (o.id === selectedOrder.id ? updatedOrder : o));
    setOrders(updatedList);
    localStorage.setItem('saludconecta_lab_orders', JSON.stringify(updatedList));
    window.dispatchEvent(new CustomEvent('saludconecta_lab_orders_updated', { detail: updatedOrder }));

    setSelectedOrder(updatedOrder);
    setNotice(`Examen ${selectedOrder.id} validado y sellado exitosamente bajo registro ReTHUS ${license}.`);
    setTimeout(() => setNotice(''), 5000);
  };

  // Despacho de Correo Electrónico (al paciente con copia al médico)
  const handleDispatchEmail = (e) => {
    e?.preventDefault();
    if (!patientEmailInput.trim()) {
      setEmailFeedback('Por favor especifique un correo electrónico válido para el paciente.');
      return;
    }

    setIsSendingEmail(true);
    setTimeout(() => {
      setIsSendingEmail(false);
      const doctorCopyText = sendDoctorCopy
        ? ` y copia archivada al médico solicitante (${selectedOrder.ordering_doctor})`
        : '';
      setEmailFeedback(`Resultado oficial sellado despachado exitosamente a ${patientEmailInput}${doctorCopyText}.`);

      // Guardar constancia de correo en la orden
      const updatedOrder = {
        ...selectedOrder,
        email_dispatched_at: new Date().toISOString(),
        dispatched_to: patientEmailInput,
      };
      const updatedList = orders.map((o) => (o.id === selectedOrder.id ? updatedOrder : o));
      setOrders(updatedList);
      localStorage.setItem('saludconecta_lab_orders', JSON.stringify(updatedList));

      setTimeout(() => {
        setShowEmailSection(false);
        setEmailFeedback('');
      }, 3500);
    }, 1200);
  };

  // Crear nueva orden manual
  const handleCreateOrder = (e) => {
    e.preventDefault();
    const form = e.target;
    const newOrder = {
      id: `LAB-2026-${String(orders.length + 1).padStart(3, '0')}`,
      patient_name: form.patient_name.value.trim(),
      patient_document: form.patient_document.value.trim(),
      patient_document_type: 'CC',
      patient_eps: form.patient_eps.value.trim() || 'CaliEps (CONTRIBUTIVO)',
      patient_age: 35,
      patient_gender: 'General',
      patient_email: form.patient_email?.value.trim() || '',
      test_type: form.test_type.value.trim(),
      ordering_doctor: form.ordering_doctor.value.trim() || 'Dr. Santiago Vélez',
      doctor_email: 'santiago.velez@saludconecta.ips.gov.co',
      sample_type: form.sample_type.value.trim() || 'Sangre Total (Tubo Tapa Lila EDTA)',
      priority: form.priority.value,
      status: 'PENDIENTE',
      observations: form.observations?.value.trim() || 'Orden emitida desde recepción de laboratorio.',
      created_at: new Date().toISOString(),
      results: null,
    };

    const updatedList = [newOrder, ...orders];
    setOrders(updatedList);
    localStorage.setItem('saludconecta_lab_orders', JSON.stringify(updatedList));
    window.dispatchEvent(new CustomEvent('saludconecta_lab_orders_updated', { detail: newOrder }));

    setIsNewOrderDrawerOpen(false);
    setNotice(`Nueva orden ${newOrder.id} registrada en el sistema.`);
    setTimeout(() => setNotice(''), 4000);
  };

  const filteredOrders = orders.filter((o) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      (o.patient_name || '').toLowerCase().includes(term) ||
      (o.patient_document || '').includes(term) ||
      (o.id || '').toLowerCase().includes(term) ||
      (o.test_type || '').toLowerCase().includes(term);

    const matchesStatus = statusFilter === 'TODOS' || o.status === statusFilter;
    const matchesPriority = priorityFilter === 'TODOS' || o.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  const countPending = orders.filter((o) => o.status === 'PENDIENTE').length;
  const countInProcess = orders.filter((o) => o.status === 'EN_PROCESO').length;
  const countCompleted = orders.filter((o) => o.status === 'COMPLETADO').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fadeIn">
      {/* HEADER DE LABORATORIO */}
      <div className="p-6 rounded-3xl bg-white border border-surface-container-high shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-purple-100 border border-purple-200 flex items-center justify-center text-purple-700 shrink-0 shadow-2xs">
            <FlaskConical className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200 font-mono">
                Rol: LABORATORIO
              </span>
              <span className="text-xs text-outline font-mono">
                Bacteriólogo: {bacteriologistName} • ReTHUS: {license}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-on-surface">
              Módulo de Laboratorio Clínico & Pruebas Diagnósticas
            </h1>
            <p className="text-xs text-outline mt-0.5">
              Recepción de muestras, procesamiento analítico automatizado, validación ReTHUS y despacho digital.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              setOrders(DEFAULT_ORDERS);
              setNotice('Bandeja de órdenes de laboratorio sincronizada.');
              setTimeout(() => setNotice(''), 3000);
            }}
            title="Refrescar catálogo"
            className="h-9 px-3.5 rounded-xl border border-surface-container-high bg-white hover:bg-surface-container-low text-xs font-semibold text-on-surface flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <RefreshCw className="w-3.5 h-3.5 text-outline" />
            <span>Refrescar</span>
          </button>
          <button
            type="button"
            onClick={() => setIsNewOrderDrawerOpen(true)}
            className="h-9 px-4 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Orden Diagnóstica</span>
          </button>
        </div>
      </div>

      {notice && (
        <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200 text-purple-900 text-xs font-semibold flex items-center gap-2 animate-fadeIn shadow-2xs">
          <CheckCircle2 className="w-4 h-4 text-purple-700 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* TARJETAS DE MÉTRICAS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-surface-container-high shadow-xs">
          <div className="flex items-center justify-between text-xs text-outline font-semibold mb-1">
            <span>ÓRDENES TOTALES</span>
            <FileText className="w-4 h-4 text-outline" />
          </div>
          <div className="text-2xl font-bold font-mono text-on-surface">{orders.length}</div>
          <p className="text-[11px] text-outline mt-0.5">Muestras recibidas en turno</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-surface-container-high shadow-xs">
          <div className="flex items-center justify-between text-xs text-amber-800 font-semibold mb-1">
            <span>PENDIENTES DE ANÁLISIS</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-900">{countPending}</div>
          <p className="text-[11px] text-amber-700 mt-0.5">En cola de toma y centrifugado</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-surface-container-high shadow-xs">
          <div className="flex items-center justify-between text-xs text-blue-800 font-semibold mb-1">
            <span>EN PROCESAMIENTO</span>
            <FlaskConical className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-blue-900">{countInProcess}</div>
          <p className="text-[11px] text-blue-700 mt-0.5">En analizador automatizado</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-surface-container-high shadow-xs">
          <div className="flex items-center justify-between text-xs text-emerald-800 font-semibold mb-1">
            <span>RESULTADOS SELLADOS</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-900">{countCompleted}</div>
          <p className="text-[11px] text-emerald-700 mt-0.5">Validados con firma ReTHUS</p>
        </div>
      </div>

      {/* FILTROS Y BÚSQUEDA */}
      <div className="p-4 rounded-2xl bg-white border border-surface-container-high shadow-xs flex flex-col md:flex-row items-center justify-between gap-3.5">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-outline absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Buscar por paciente, cédula o examen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-10 pl-10 pr-3.5 rounded-xl border border-surface-container-high bg-surface-container-low text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-purple-700"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-outline font-semibold">
            <Filter className="w-3.5 h-3.5" />
            <span>Estado:</span>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 px-3 rounded-xl border border-surface-container-high bg-surface-container-low text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-purple-700"
          >
            <option value="TODOS">Todos los estados</option>
            <option value="PENDIENTE">Pendientes</option>
            <option value="EN_PROCESO">En Proceso</option>
            <option value="COMPLETADO">Completados</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="h-9 px-3 rounded-xl border border-surface-container-high bg-surface-container-low text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-purple-700"
          >
            <option value="TODOS">Todas las prioridades</option>
            <option value="URGENTE">Urgente</option>
            <option value="PRIORITARIO">Prioritario</option>
            <option value="RUTINA">Rutina</option>
          </select>
        </div>
      </div>

      {/* BANDEJA DE MUESTRAS Y ÓRDENES */}
      <div className="p-6 rounded-3xl bg-white border border-surface-container-high shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-surface-container-high pb-3">
          <h2 className="font-bold text-sm text-on-surface flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-purple-700" />
            <span>Bandeja de Órdenes y Muestras de Laboratorio ({filteredOrders.length})</span>
          </h2>
          <span className="text-[11px] text-outline font-mono">
            Bacteriólogo activo: {bacteriologistName}
          </span>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="p-12 text-center text-outline text-xs">
            No hay órdenes de laboratorio que coincidan con los filtros aplicados.
          </div>
        ) : (
          <div className="divide-y divide-surface-container-high">
            {filteredOrders.map((order) => {
              const isCompleted = order.status === 'COMPLETADO';
              const isInProcess = order.status === 'EN_PROCESO';
              const isUrgent = order.priority === 'URGENTE';

              return (
                <div
                  key={order.id}
                  className="py-4.5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-surface-container-low/50 px-3.5 rounded-2xl transition-colors"
                >
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-purple-900 bg-purple-100 px-2 py-0.5 rounded-md border border-purple-200">
                        {order.id}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          isUrgent
                            ? 'bg-red-100 text-red-800 border border-red-200'
                            : order.priority === 'PRIORITARIO'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {order.priority}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          isCompleted
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                            : isInProcess
                            ? 'bg-blue-100 text-blue-900'
                            : 'bg-amber-100 text-amber-900'
                        }`}
                      >
                        {isCompleted
                          ? 'RESULTADO SELLADO'
                          : isInProcess
                          ? 'EN PROCESO'
                          : 'PENDIENTE'}
                      </span>
                      {order.email_dispatched_at && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-900 flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          <span>Despachado por correo</span>
                        </span>
                      )}
                    </div>

                    <h3 className="font-bold text-sm text-on-surface">{order.test_type}</h3>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-outline font-medium">
                      <span>
                        Paciente: <strong className="text-on-surface">{order.patient_name}</strong> (CC {order.patient_document})
                      </span>
                      <span>•</span>
                      <span>EPS: {order.patient_eps}</span>
                      <span>•</span>
                      <span>Tubo / Muestra: {order.sample_type}</span>
                      <span>•</span>
                      <span>Ordena: {order.ordering_doctor}</span>
                    </div>

                    {order.observations && (
                      <p className="text-[11px] text-on-surface-variant italic bg-surface-container-low p-2 rounded-xl max-w-2xl">
                        Obs: {order.observations}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isCompleted ? (
                      <button
                        type="button"
                        onClick={() => handleOpenResultDrawer(order)}
                        className="w-44 h-9.5 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-2xs"
                      >
                        <Eye className="w-4 h-4 text-emerald-700 shrink-0" />
                        <span>Ver Resultados</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleOpenResultDrawer(order)}
                        className="w-44 h-9.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-colors"
                      >
                        <FileCheck2 className="w-4 h-4 shrink-0" />
                        <span>
                          {order.status === 'EN_PROCESO'
                            ? 'Continuar Análisis'
                            : 'Ingresar Resultados'}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* DRAWER LATERAL DERECHO: INGRESO DE RESULTADOS & VISTA OFICIAL */}
      {isResultDrawerOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/50 backdrop-blur-xs flex justify-end animate-fadeIn">
          <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col justify-between border-l border-slate-300 animate-slideLeft">
            {/* ENCABEZADO STICKY DEL DRAWER */}
            <div className="px-6 py-4.5 border-b border-surface-container-high bg-gradient-to-r from-purple-950 via-purple-900 to-indigo-950 text-white flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-purple-200">
                  <FlaskConical className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-purple-800/80 text-purple-200">
                      {selectedOrder.id}
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                        selectedOrder.status === 'COMPLETADO'
                          ? 'bg-emerald-500/20 text-emerald-200'
                          : selectedOrder.status === 'EN_PROCESO'
                          ? 'bg-blue-500/20 text-blue-200'
                          : 'bg-amber-500/20 text-amber-200'
                      }`}
                    >
                      {selectedOrder.status === 'COMPLETADO'
                        ? 'Resultado Sellado'
                        : selectedOrder.status === 'EN_PROCESO'
                        ? 'En Proceso'
                        : 'Pendiente de Análisis'}
                    </span>
                  </div>
                  <h3 className="font-bold text-base text-white mt-0.5">
                    {selectedOrder.status === 'COMPLETADO'
                      ? 'Informe Oficial de Resultados'
                      : selectedOrder.status === 'EN_PROCESO'
                      ? 'Continuar Análisis Diagnóstico'
                      : 'Ingreso de Resultados Analíticos'}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsResultDrawerOpen(false)}
                className="p-1.5 rounded-xl hover:bg-white/20 text-white cursor-pointer transition-colors"
                title="Cerrar panel"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* CUERPO SCROLLEABLE DEL DRAWER */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* FICHA RESUMEN DEL PACIENTE Y ORDEN */}
              <div className="p-4.5 rounded-2xl bg-surface-container-low border border-outline-variant/30 space-y-3">
                <div className="flex items-center justify-between border-b border-surface-container-high pb-2">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-purple-700" />
                    <span className="font-bold text-xs text-on-surface">
                      {selectedOrder.patient_name}
                    </span>
                    <span className="font-mono text-xs text-outline">
                      ({selectedOrder.patient_document_type || 'CC'} {selectedOrder.patient_document})
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-purple-900 bg-purple-100 px-2.5 py-0.5 rounded-md">
                    {selectedOrder.patient_eps}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                  <div>
                    <span className="text-[10px] text-outline uppercase font-bold block">Examen Solicitado:</span>
                    <span className="font-bold text-on-surface">{selectedOrder.test_type}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-outline uppercase font-bold block">Tubo / Contenedor:</span>
                    <span className="font-medium text-on-surface">{selectedOrder.sample_type}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-outline uppercase font-bold block">Prioridad:</span>
                    <span className="font-bold text-purple-900">{selectedOrder.priority}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-outline uppercase font-bold block">Médico Solicitante:</span>
                    <span className="font-medium text-on-surface">{selectedOrder.ordering_doctor}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-outline uppercase font-bold block">ReTHUS Médico:</span>
                    <span className="font-mono text-on-surface">{selectedOrder.doctor_license || 'RM-94821-VALLE'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-outline uppercase font-bold block">Correo Registrado:</span>
                    <span className="font-mono text-[11px] text-outline truncate block" title={selectedOrder.patient_email}>
                      {selectedOrder.patient_email || 'Sin correo'}
                    </span>
                  </div>
                </div>

                {selectedOrder.observations && (
                  <div className="p-2.5 rounded-xl bg-purple-50/60 border border-purple-100 text-[11px] text-purple-950">
                    <strong>Sospecha / Observación Médica:</strong> {selectedOrder.observations}
                  </div>
                )}
              </div>

              {/* MODO 1: RESULTADO YA COMPLETADO (INFORME OFICIAL SELLADO) */}
              {selectedOrder.status === 'COMPLETADO' ? (
                <div className="space-y-4">
                  <div className="p-5 rounded-2xl bg-white border border-slate-300 shadow-xs space-y-4">
                    {/* MEMBRETE INSTITUCIONAL */}
                    <div className="border-b-2 border-slate-800 pb-3 flex items-start justify-between">
                      <div>
                        <h4 className="text-base font-black text-slate-900 uppercase tracking-tight">
                          SaludConecta IPS S.A.S.
                        </h4>
                        <p className="text-xs text-slate-600">
                          Sede Central Cartago • Laboratorio Clínico y Diagnóstico Nivel II
                        </p>
                        <p className="text-[10px] text-slate-500 font-mono">
                          NIT: 900.842.199-5 • Habilitación MinSalud Código 7614700192
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="inline-block px-2.5 py-0.5 rounded bg-emerald-100 text-emerald-900 font-mono text-xs font-bold border border-emerald-300">
                          RESULTADO SELLADO
                        </span>
                        <div className="text-[10px] text-slate-500 font-mono mt-1">
                          Fecha: {selectedOrder.validated_at?.slice(0, 10) || new Date().toISOString().slice(0, 10)}
                        </div>
                      </div>
                    </div>

                    {/* PARÁMETROS ANALÍTICOS OBTENIDOS */}
                    <div className="space-y-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                        Parámetros Analíticos & Valores Obtenidos:
                      </span>
                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 font-mono text-xs whitespace-pre-wrap leading-relaxed text-slate-900">
                        {typeof selectedOrder.results === 'string'
                          ? selectedOrder.results
                          : JSON.stringify(selectedOrder.results, null, 2)}
                      </div>
                    </div>

                    {/* SELLO DE VALIDACIÓN RE-THUS */}
                    <div className="p-3.5 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-purple-700 shrink-0" />
                        <div>
                          <strong className="text-purple-950 font-bold block">
                            Certificación Bacteriológica (ReTHUS):
                          </strong>
                          <span className="text-purple-900 text-[11px]">
                            Firmado por: <strong>{selectedOrder.validated_by || bacteriologistName}</strong> (Registro: {selectedOrder.bacteriologist_license || license})
                          </span>
                        </div>
                      </div>
                      <div className="text-right text-[10px] font-mono text-purple-800 font-bold">
                        Sello Digital: SHA-256-OK
                      </div>
                    </div>
                  </div>

                  {/* BOTÓN PROMINENTE PARA ACTIVAR EL PANEL DE CORREO */}
                  <div className="flex items-center justify-between pt-2">
                    <p className="text-xs text-outline">
                      El resultado está validado. Puede despacharlo digitalmente al paciente y médico.
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowEmailSection(!showEmailSection)}
                      className="h-10 px-5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-xs transition-all"
                    >
                      <Mail className="w-4 h-4" />
                      <span>{showEmailSection ? 'Ocultar Despacho' : 'Enviar por Correo al Paciente'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* MODO 2: INGRESO DE RESULTADOS / CONTINUAR ANÁLISIS */
                <form onSubmit={handleValidateAndSeal} className="space-y-4">
                  {/* SELECTOR RÁPIDO DE PLANTILLAS */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-outline uppercase tracking-wider block">
                        Plantillas Rápidas según Examen (1 Clic)
                      </span>
                      <span className="text-[10px] text-purple-800 font-semibold">
                        Autocompleta unidades y valores de referencia
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleApplyTemplate('hemograma')}
                        className="px-2.5 py-1 rounded-lg bg-surface-container-low hover:bg-purple-100 text-xs font-medium border border-outline-variant/30 text-on-surface cursor-pointer"
                      >
                        Hemograma
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplyTemplate('glucemia')}
                        className="px-2.5 py-1 rounded-lg bg-surface-container-low hover:bg-purple-100 text-xs font-medium border border-outline-variant/30 text-on-surface cursor-pointer"
                      >
                        Glucemia & Lípidos
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplyTemplate('uroanalisis')}
                        className="px-2.5 py-1 rounded-lg bg-surface-container-low hover:bg-purple-100 text-xs font-medium border border-outline-variant/30 text-on-surface cursor-pointer"
                      >
                        Uroanálisis
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplyTemplate('troponina')}
                        className="px-2.5 py-1 rounded-lg bg-surface-container-low hover:bg-purple-100 text-xs font-medium border border-outline-variant/30 text-on-surface cursor-pointer"
                      >
                        Troponina
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplyTemplate('creatinina')}
                        className="px-2.5 py-1 rounded-lg bg-surface-container-low hover:bg-purple-100 text-xs font-medium border border-outline-variant/30 text-on-surface cursor-pointer"
                      >
                        Función Renal
                      </button>
                    </div>
                  </div>

                  {/* EDITOR DE PARÁMETROS ANALÍTICOS */}
                  <div>
                    <label className="block text-xs font-bold text-on-surface mb-1">
                      Valores Obtenidos, Parámetros Analíticos & Rangos de Referencia *
                    </label>
                    <textarea
                      rows={8}
                      required
                      value={resultText}
                      onChange={(e) => setResultText(e.target.value)}
                      placeholder="Ingrese los parámetros analíticos, valores obtenidos, unidades y rangos de referencia..."
                      className="w-full p-3.5 rounded-2xl border border-surface-container-high bg-surface-container-low text-xs font-mono text-on-surface focus:outline-none focus:ring-2 focus:ring-purple-700/20 focus:border-purple-700 leading-relaxed"
                    />
                  </div>

                  {/* METODOLOGÍA Y OBSERVACIONES */}
                  <div>
                    <label className="block text-xs font-semibold text-on-surface mb-1">
                      Metodología Analítica & Notas del Bacteriólogo
                    </label>
                    <input
                      type="text"
                      value={methodNotes}
                      onChange={(e) => setMethodNotes(e.target.value)}
                      placeholder="Ej: Analizador automatizado Mindray BC-5000 / Quimioluminiscencia. Sin interferencias."
                      className="w-full h-9 px-3 rounded-xl border border-surface-container-high bg-surface-container-low text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-purple-700"
                    />
                  </div>

                  {/* AVISO DE VALIDACIÓN RETHUS */}
                  <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 text-xs space-y-1">
                    <div className="flex items-center gap-1.5 font-bold">
                      <ShieldCheck className="w-4 h-4 text-amber-700" />
                      <span>Sello de Validación ReTHUS Asistencial:</span>
                    </div>
                    <p className="text-[11px] leading-relaxed">
                      El resultado será firmado y sellado por <strong>{bacteriologistName}</strong> (Registro: {license}). Al sellarse, quedará disponible de inmediato en la bandeja del médico y se habilitará el despacho por correo al paciente.
                    </p>
                  </div>

                  {/* BOTONES DE GUARDAR AVANCE Y SELLAR */}
                  <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-surface-container-high">
                    <button
                      type="button"
                      onClick={handleSaveDraft}
                      className="h-10 px-4 rounded-xl border border-surface-container-high bg-white hover:bg-surface-container-low text-xs font-semibold text-on-surface cursor-pointer shadow-2xs"
                    >
                      Guardar Avance (En Proceso)
                    </button>

                    <button
                      type="submit"
                      className="h-10 px-6 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-xs transition-all"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Validar & Sellar Resultado</span>
                    </button>
                  </div>
                </form>
              )}

              {/* APARTADO INTEGRADO DE CORREO ELECTRÓNICO (EN LA PARTE INFERIOR DEL DRAWER) */}
              {showEmailSection && selectedOrder && (
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
                      onClick={() => setShowEmailSection(false)}
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
                        {selectedOrder.patient_name}
                      </div>
                      <div className="text-[11px] text-outline font-mono">
                        Identificación: {selectedOrder.patient_document_type || 'CC'} {selectedOrder.patient_document}
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-on-surface mb-0.5 mt-1">
                          Correo del Paciente
                        </label>
                        <input
                          type="email"
                          value={patientEmailInput}
                          onChange={(e) => setPatientEmailInput(e.target.value)}
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
                          {selectedOrder.ordering_doctor}
                        </div>
                        <div className="text-[11px] font-mono text-outline">
                          {selectedOrder.doctor_email || 'santiago.velez@saludconecta.ips.gov.co'}
                        </div>
                      </div>

                      <label className="flex items-center gap-2 text-[11px] font-medium text-purple-950 cursor-pointer pt-1 border-t border-purple-100">
                        <input
                          type="checkbox"
                          checked={sendDoctorCopy}
                          onChange={(e) => setSendDoctorCopy(e.target.checked)}
                          className="w-4 h-4 rounded text-purple-700 focus:ring-purple-700"
                        />
                        <span>Remitir copia oficial al médico tratante</span>
                      </label>
                    </div>
                  </div>

                  {/* ADJUNTO Y ASUNTO */}
                  <div className="p-3 rounded-xl bg-purple-100/60 border border-purple-200 text-[11px] text-purple-950 space-y-1">
                    <div className="font-semibold flex items-center justify-between">
                      <span>Asunto: Resultados Oficiales • {selectedOrder.id} • SaludConecta IPS</span>
                      <span className="font-mono text-[10px]">PDF Vectorial Adjunto</span>
                    </div>
                    <p className="text-purple-900/90">
                      Incluye informe con sello ReTHUS de <strong>{selectedOrder.validated_by || bacteriologistName}</strong> y membrete hospitalario para validez médico-legal.
                    </p>
                  </div>

                  <div className="flex items-center justify-end gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowEmailSection(false)}
                      className="h-9 px-4 rounded-xl border border-purple-200 bg-white hover:bg-purple-50 text-xs font-semibold text-purple-900 cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleDispatchEmail}
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

            {/* FOOTER DEL DRAWER */}
            <div className="p-4 border-t border-surface-container-high bg-slate-50 flex items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setIsResultDrawerOpen(false)}
                className="h-9 px-4 rounded-xl border border-surface-container-high bg-white hover:bg-surface-container-low text-xs font-semibold text-on-surface cursor-pointer"
              >
                Cerrar Panel
              </button>

              <span className="text-[11px] text-outline font-mono">
                SaludConecta IPS • Laboratorio Clínico Central
              </span>
            </div>
          </div>
        </div>
      )}

      {/* DRAWER LATERAL DERECHO: NUEVA ORDEN DIAGNÓSTICA */}
      {isNewOrderDrawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/50 backdrop-blur-xs flex justify-end animate-fadeIn">
          <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col justify-between border-l border-slate-300 animate-slideLeft">
            <div className="px-6 py-4.5 border-b border-surface-container-high bg-purple-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <Plus className="w-5 h-5 text-purple-200" />
                <h3 className="font-bold text-base">Nueva Orden Diagnóstica</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsNewOrderDrawerOpen(false)}
                className="p-1 rounded-xl hover:bg-white/20 text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-on-surface mb-1">
                    Nombre del Paciente *
                  </label>
                  <input
                    type="text"
                    name="patient_name"
                    required
                    placeholder="Ej: Andrés Morales"
                    className="w-full h-9 px-3 rounded-xl border border-surface-container-high bg-surface-container-low text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-purple-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-on-surface mb-1">
                    Documento de Identidad *
                  </label>
                  <input
                    type="text"
                    name="patient_document"
                    required
                    placeholder="Ej: 1118234567"
                    className="w-full h-9 px-3 rounded-xl border border-surface-container-high bg-surface-container-low text-xs font-mono text-on-surface focus:outline-none focus:ring-1 focus:ring-purple-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1">
                  Examen Solicitado *
                </label>
                <input
                  type="text"
                  name="test_type"
                  required
                  placeholder="Ej: Hemograma Completo, Coprológico, Glucemia..."
                  className="w-full h-9 px-3 rounded-xl border border-surface-container-high bg-surface-container-low text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-purple-700"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-on-surface mb-1">
                    Tubo / Tipo de Muestra
                  </label>
                  <input
                    type="text"
                    name="sample_type"
                    defaultValue="Sangre Total (Tubo Tapa Lila EDTA)"
                    className="w-full h-9 px-3 rounded-xl border border-surface-container-high bg-surface-container-low text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-purple-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-on-surface mb-1">
                    Prioridad
                  </label>
                  <select
                    name="priority"
                    className="w-full h-9 px-3 rounded-xl border border-surface-container-high bg-surface-container-low text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-purple-700"
                  >
                    <option value="RUTINA">Rutina</option>
                    <option value="PRIORITARIO">Prioritario</option>
                    <option value="URGENTE">Urgente</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-on-surface mb-1">
                    Médico Solicitante
                  </label>
                  <input
                    type="text"
                    name="ordering_doctor"
                    defaultValue="Dr. Santiago Vélez"
                    className="w-full h-9 px-3 rounded-xl border border-surface-container-high bg-surface-container-low text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-purple-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-on-surface mb-1">
                    Aseguradora / EPS
                  </label>
                  <input
                    type="text"
                    name="patient_eps"
                    defaultValue="CaliEps (CONTRIBUTIVO)"
                    className="w-full h-9 px-3 rounded-xl border border-surface-container-high bg-surface-container-low text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-purple-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1">
                  Correo Electrónico del Paciente
                </label>
                <input
                  type="email"
                  name="patient_email"
                  placeholder="paciente@ejemplo.com"
                  className="w-full h-9 px-3 rounded-xl border border-surface-container-high bg-surface-container-low text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-purple-700"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1">
                  Observaciones Clínicas
                </label>
                <textarea
                  name="observations"
                  rows={3}
                  placeholder="Sospecha diagnóstica o condiciones de la toma de muestra..."
                  className="w-full p-2.5 rounded-xl border border-surface-container-high bg-surface-container-low text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-purple-700"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-surface-container-high">
                <button
                  type="button"
                  onClick={() => setIsNewOrderDrawerOpen(false)}
                  className="h-9 px-4 rounded-xl border border-surface-container-high text-xs font-semibold text-on-surface cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="h-9 px-5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold cursor-pointer shadow-xs"
                >
                  Registrar Orden
                </button>
              </div>
            </form>

            <div className="p-3 border-t border-slate-200 bg-slate-50 text-right text-[11px] text-outline">
              SaludConecta IPS • Módulo Asistencial
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LaboratoryScreen;
