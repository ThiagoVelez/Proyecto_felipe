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
} from 'lucide-react';
import apiClient from '../services/api';

const DEFAULT_ORDERS = [
  {
    id: 'LAB-2026-001',
    patient_name: 'Santiago Vélez',
    patient_document: '1006238743',
    patient_eps: 'CaliEps (CONTRIBUTIVO)',
    test_type: 'Hemograma Completo Automatizado + Plaquetas',
    ordering_doctor: 'Dr. Santiago Vélez',
    sample_type: 'Sangre Total (Tubo Tapa Lila EDTA)',
    priority: 'URGENTE',
    status: 'PENDIENTE',
    created_at: '2026-11-10T07:30:00Z',
    results: null,
  },
  {
    id: 'LAB-2026-002',
    patient_name: 'Camila Yaima',
    patient_document: '1114567890',
    patient_eps: 'Nueva EPS (CONTRIBUTIVO)',
    test_type: 'Glucemia Basal & Perfil Lipídico Completo',
    ordering_doctor: 'Dra. Camila Yaima',
    sample_type: 'Suero (Tubo Tapa Amarilla con Gel Separador)',
    priority: 'RUTINA',
    status: 'EN_PROCESO',
    created_at: '2026-11-10T08:00:00Z',
    results: {
      glucose: '92 mg/dL (Ref: 70 - 100 mg/dL)',
      cholesterol_total: '185 mg/dL (Ref: < 200 mg/dL)',
      triglycerides: '130 mg/dL (Ref: < 150 mg/dL)',
      hdl: '55 mg/dL (Ref: > 45 mg/dL)',
      ldl: '104 mg/dL (Ref: < 130 mg/dL)',
    },
  },
  {
    id: 'LAB-2026-003',
    patient_name: 'Carlos Alberto Restrepo',
    patient_document: '16789012',
    patient_eps: 'Emssanar (SUBSIDIADO)',
    test_type: 'Uroanálisis con Sedimento Microscópico',
    ordering_doctor: 'Dr. Santiago Vélez',
    sample_type: 'Orina Fracción Media',
    priority: 'PRIORITARIO',
    status: 'COMPLETADO',
    created_at: '2026-11-09T16:20:00Z',
    validated_at: '2026-11-09T17:45:00Z',
    validated_by: 'Dra. Marcela Cardona (BAC-9421-VALLE)',
    results: {
      aspect: 'Límpido, Amarillo pajizo',
      density: '1.020 (Ref: 1.010 - 1.030)',
      ph: '6.0 (Ref: 5.0 - 7.0)',
      proteins: 'Negativo',
      glucose: 'Negativo',
      leukocytes: '1 - 2 por campo (Normal)',
      erythrocytes: '0 - 1 por campo',
      bacteria: 'Escasa (+)',
    },
  },
  {
    id: 'LAB-2026-004',
    patient_name: 'María Elena Gómez',
    patient_document: '31456789',
    patient_eps: 'Sanitas (CONTRIBUTIVO)',
    test_type: 'Troponina I Cuantitativa Ultrasensible',
    ordering_doctor: 'Dr. Santiago Vélez',
    sample_type: 'Plasma Heparinizado (Urgencias)',
    priority: 'URGENTE',
    status: 'PENDIENTE',
    created_at: '2026-11-10T08:15:00Z',
    results: null,
  },
];

export const LaboratoryScreen = ({ user }) => {
  const [orders, setOrders] = useState(() => {
    const saved = localStorage.getItem('saludconecta_lab_orders');
    return saved ? JSON.parse(saved) : DEFAULT_ORDERS;
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('TODOS');
  const [priorityFilter, setPriorityFilter] = useState('TODOS');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [showNewOrderModal, setShowNewOrderModal] = useState(false);
  const [resultData, setResultData] = useState('');
  const [notice, setNotice] = useState('');

  const currentUser = user || {};
  const bacteriologistName = currentUser.full_name || currentUser.name || 'Dra. Marcela Cardona';
  const license = currentUser.professional_card || 'BAC-9421-VALLE';

  // Guardar cambios en persistencia local
  useEffect(() => {
    localStorage.setItem('saludconecta_lab_orders', JSON.stringify(orders));
  }, [orders]);

  const handleOpenResultModal = (order) => {
    setSelectedOrder(order);
    if (order.results) {
      if (typeof order.results === 'string') {
        setResultData(order.results);
      } else {
        setResultData(
          Object.entries(order.results)
            .map(([k, v]) => `${k.toUpperCase().replace(/_/g, ' ')}: ${v}`)
            .join('\n')
        );
      }
    } else {
      setResultData('');
    }
    setShowResultModal(true);
  };

  const handleSaveResult = (e) => {
    e.preventDefault();
    if (!selectedOrder) return;

    const updated = orders.map((o) => {
      if (o.id === selectedOrder.id) {
        return {
          ...o,
          status: 'COMPLETADO',
          results: resultData,
          validated_at: new Date().toISOString(),
          validated_by: `${bacteriologistName} (${license})`,
        };
      }
      return o;
    });

    setOrders(updated);
    setShowResultModal(false);
    setSelectedOrder(null);
    setNotice(`Resultados de la orden ${selectedOrder.id} validados y sellados digitalmente.`);
    setTimeout(() => setNotice(''), 4000);
  };

  const handleCreateOrder = (e) => {
    e.preventDefault();
    const form = e.target;
    const newOrder = {
      id: `LAB-2026-${String(orders.length + 1).padStart(3, '0')}`,
      patient_name: form.patient_name.value.trim(),
      patient_document: form.patient_document.value.trim(),
      patient_eps: form.patient_eps.value.trim() || 'CaliEps (CONTRIBUTIVO)',
      test_type: form.test_type.value.trim(),
      ordering_doctor: form.ordering_doctor.value.trim() || 'Médico de Turno',
      sample_type: form.sample_type.value.trim() || 'Muestra Biológica',
      priority: form.priority.value,
      status: 'PENDIENTE',
      created_at: new Date().toISOString(),
      results: null,
    };

    setOrders([newOrder, ...orders]);
    setShowNewOrderModal(false);
    setNotice(`Nueva orden de laboratorio ${newOrder.id} registrada correctamente.`);
    setTimeout(() => setNotice(''), 4000);
  };

  const filteredOrders = orders.filter((o) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      o.patient_name.toLowerCase().includes(term) ||
      o.patient_document.includes(term) ||
      o.id.toLowerCase().includes(term) ||
      o.test_type.toLowerCase().includes(term);

    const matchesStatus = statusFilter === 'TODOS' || o.status === statusFilter;
    const matchesPriority = priorityFilter === 'TODOS' || o.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  const countPending = orders.filter((o) => o.status === 'PENDIENTE').length;
  const countInProcess = orders.filter((o) => o.status === 'EN_PROCESO').length;
  const countCompleted = orders.filter((o) => o.status === 'COMPLETADO').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* HEADER DE LABORATORIO */}
      <div className="p-6 rounded-2xl bg-white border border-surface-container-high shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-purple-100 border border-purple-200 flex items-center justify-center text-purple-700 shrink-0">
            <FlaskConical className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-on-surface">
                Módulo de Laboratorio Clínico y Pruebas Diagnósticas
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200 font-mono">
                Rol: LABORATORIO
              </span>
            </div>
            <p className="text-xs text-outline mt-0.5">
              Recepción de Muestras Biológicas, Procesamiento Analítico y Validación ReTHUS • Res. MinSalud 1995/1999
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              setOrders(DEFAULT_ORDERS);
              setNotice('Catálogo de órdenes de laboratorio sincronizado.');
              setTimeout(() => setNotice(''), 3000);
            }}
            title="Refrescar bandeja"
            className="h-9 px-3 rounded-xl border border-surface-container-high bg-white hover:bg-surface-container-low text-xs font-semibold text-on-surface flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <RefreshCw className="w-3.5 h-3.5 text-outline" />
            <span>Refrescar</span>
          </button>
          <button
            type="button"
            onClick={() => setShowNewOrderModal(true)}
            className="h-9 px-4 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Orden Diagnóstica</span>
          </button>
        </div>
      </div>

      {notice && (
        <div className="p-3.5 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 text-xs font-medium flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-purple-700 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* TARJETAS DE MÉTRICAS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white border border-surface-container-high shadow-xs">
          <div className="flex items-center justify-between text-xs text-outline font-semibold mb-1">
            <span>ÓRDENES TOTALES</span>
            <FileText className="w-4 h-4 text-outline" />
          </div>
          <div className="text-2xl font-bold font-mono text-on-surface">{orders.length}</div>
          <p className="text-[11px] text-outline mt-0.5">Muestras recibidas en turno</p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-surface-container-high shadow-xs">
          <div className="flex items-center justify-between text-xs text-amber-800 font-semibold mb-1">
            <span>PENDIENTES DE ANÁLISIS</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-900">{countPending}</div>
          <p className="text-[11px] text-amber-700/80 mt-0.5">En cola de toma y centrifugado</p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-surface-container-high shadow-xs">
          <div className="flex items-center justify-between text-xs text-blue-800 font-semibold mb-1">
            <span>EN PROCESAMIENTO</span>
            <FlaskConical className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-blue-900">{countInProcess}</div>
          <p className="text-[11px] text-blue-700/80 mt-0.5">En analizador automatizado</p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-surface-container-high shadow-xs">
          <div className="flex items-center justify-between text-xs text-emerald-800 font-semibold mb-1">
            <span>RESULTADOS SELLADOS</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-900">{countCompleted}</div>
          <p className="text-[11px] text-emerald-700/80 mt-0.5">Validados con firma ReTHUS</p>
        </div>
      </div>

      {/* FILTROS Y BÚSQUEDA */}
      <div className="p-4 rounded-xl bg-white border border-surface-container-high shadow-xs flex flex-col md:flex-row items-center justify-between gap-3.5">
        <div className="relative w-full md:w-80">
          <input
            type="text"
            placeholder="Buscar por paciente, cédula o examen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-outline-variant bg-surface-container-low text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-purple-700"
          />
          <Search className="w-4 h-4 text-outline absolute left-2.5 top-2.5" />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-outline font-semibold">
            <Filter className="w-3.5 h-3.5" />
            <span>Estado:</span>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-8 px-2.5 rounded-lg border border-outline-variant bg-surface-container-low text-xs text-on-surface focus:outline-none"
          >
            <option value="TODOS">Todos los estados</option>
            <option value="PENDIENTE">Pendientes</option>
            <option value="EN_PROCESO">En Proceso</option>
            <option value="COMPLETADO">Completados</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="h-8 px-2.5 rounded-lg border border-outline-variant bg-surface-container-low text-xs text-on-surface focus:outline-none"
          >
            <option value="TODOS">Todas las prioridades</option>
            <option value="URGENTE">Urgente</option>
            <option value="PRIORITARIO">Prioritario</option>
            <option value="RUTINA">Rutina</option>
          </select>
        </div>
      </div>

      {/* BANDEJA DE ÓRDENES */}
      <div className="rounded-2xl bg-white border border-surface-container-high shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-surface-container-high flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-purple-700" />
            <h2 className="font-bold text-sm text-on-surface">
              Bandeja de Órdenes y Muestras de Laboratorio ({filteredOrders.length})
            </h2>
          </div>
          <span className="text-xs text-outline font-mono">
            Bacteriólogo activo: {bacteriologistName}
          </span>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="p-12 text-center text-outline text-xs">
            No se encontraron órdenes de laboratorio con los criterios especificados.
          </div>
        ) : (
          <div className="divide-y divide-surface-container-high">
            {filteredOrders.map((order) => {
              const isUrgent = order.priority === 'URGENTE';
              const isPriority = order.priority === 'PRIORITARIO';
              const isCompleted = order.status === 'COMPLETADO';

              return (
                <div
                  key={order.id}
                  className="p-5 hover:bg-surface-container-low/50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-mono font-bold text-purple-800 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                        {order.id}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          isUrgent
                            ? 'bg-rose-100 text-rose-800 border-rose-300'
                            : isPriority
                            ? 'bg-amber-100 text-amber-800 border-amber-300'
                            : 'bg-surface-container-high text-on-surface border-outline-variant/30'
                        }`}
                      >
                        {order.priority}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          isCompleted
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : order.status === 'EN_PROCESO'
                            ? 'bg-blue-100 text-blue-800 border-blue-300'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}
                      >
                        {order.status === 'COMPLETADO' ? 'RESULTADO SELLADO' : order.status}
                      </span>
                    </div>

                    <h3 className="font-bold text-sm text-on-surface">{order.test_type}</h3>

                    <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-outline">
                      <span className="flex items-center gap-1 font-semibold text-on-surface">
                        <User className="w-3.5 h-3.5 text-outline" />
                        {order.patient_name} ({order.patient_document})
                      </span>
                      <span>EPS: {order.patient_eps}</span>
                      <span>Tubo / Muestra: {order.sample_type}</span>
                      <span>Ordena: {order.ordering_doctor}</span>
                    </div>

                    {isCompleted && order.validated_by && (
                      <div className="text-[11px] text-emerald-800 font-medium flex items-center gap-1 pt-0.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Validado por: {order.validated_by}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isCompleted ? (
                      <button
                        type="button"
                        onClick={() => handleOpenResultModal(order)}
                        className="h-8 px-3 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Ver Resultados</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleOpenResultModal(order)}
                        className="h-8 px-3.5 rounded-lg bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                      >
                        <FileCheck2 className="w-3.5 h-3.5" />
                        <span>{order.status === 'EN_PROCESO' ? 'Continuar Análisis' : 'Ingresar Resultados'}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL PARA INGRESAR O VER RESULTADOS */}
      {showResultModal && selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full border border-surface-container-high shadow-xl overflow-hidden animate-scaleIn">
            <div className="px-5 py-4 border-b border-surface-container-high flex items-center justify-between bg-purple-50">
              <div className="flex items-center gap-2">
                <FlaskConical className="w-5 h-5 text-purple-700" />
                <div>
                  <h3 className="font-bold text-sm text-purple-950">
                    Resultados de Laboratorio Clínico • {selectedOrder.id}
                  </h3>
                  <p className="text-[11px] text-purple-800">
                    {selectedOrder.patient_name} • CC: {selectedOrder.patient_document}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowResultModal(false)}
                className="p-1 rounded-lg hover:bg-purple-200/60 text-purple-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveResult} className="p-5 space-y-4">
              <div>
                <span className="text-xs font-semibold text-outline block mb-1">
                  Examen Solicitado:
                </span>
                <p className="text-sm font-bold text-on-surface bg-surface-container-low p-2.5 rounded-lg border border-outline-variant/30">
                  {selectedOrder.test_type}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1">
                  Valores Obtenidos, Parámetros Analíticos & Observaciones *
                </label>
                <textarea
                  rows={6}
                  value={resultData}
                  onChange={(e) => setResultData(e.target.value)}
                  placeholder="Ej:
HEMOGLOBINA: 14.5 g/dL (Ref: 13.0 - 17.0 g/dL)
HEMATOCRITO: 43.5 % (Ref: 40.0 - 52.0 %)
LEUCOCITOS: 7,200 /mm3 (Ref: 4,500 - 11,000 /mm3)
PLAQUETAS: 240,000 /mm3 (Ref: 150,000 - 450,000 /mm3)
Observación: Muestra sin hemólisis ni lipemia."
                  required
                  className="w-full p-3 rounded-xl border border-outline-variant bg-surface-container-low text-xs font-mono text-on-surface focus:outline-none focus:ring-1 focus:ring-purple-700"
                />
              </div>

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 text-[11px] space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <ShieldCheck className="w-4 h-4 text-amber-700" />
                  <span>Sello de Validación ReTHUS Asistencial:</span>
                </div>
                <p>
                  El resultado será firmado por <strong>{bacteriologistName}</strong> (Registro: {license}). Al sellarse, quedará registrado en el historial del paciente con validez médico-legal.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowResultModal(false)}
                  className="h-9 px-4 rounded-xl border border-surface-container-high bg-white hover:bg-surface-container-low text-xs font-semibold text-on-surface cursor-pointer"
                >
                  Cerrar
                </button>
                <button
                  type="submit"
                  className="h-9 px-4 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Validar & Sellar Resultado</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PARA CREAR NUEVA ORDEN */}
      {showNewOrderModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-surface-container-high shadow-xl overflow-hidden animate-scaleIn">
            <div className="px-5 py-4 border-b border-surface-container-high flex items-center justify-between bg-purple-50">
              <h3 className="font-bold text-sm text-purple-950">
                Registrar Nueva Orden de Laboratorio
              </h3>
              <button
                type="button"
                onClick={() => setShowNewOrderModal(false)}
                className="p-1 rounded-lg hover:bg-purple-200/60 text-purple-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="p-5 space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-on-surface mb-1">
                    Nombre del Paciente *
                  </label>
                  <input
                    type="text"
                    name="patient_name"
                    required
                    placeholder="Ej: Santiago Vélez"
                    className="w-full h-8 px-2.5 rounded-lg border border-outline-variant bg-surface-container-low text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-purple-700"
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
                    placeholder="Ej: 1006238743"
                    className="w-full h-8 px-2.5 rounded-lg border border-outline-variant bg-surface-container-low text-xs font-mono text-on-surface focus:outline-none focus:ring-1 focus:ring-purple-700"
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
                  placeholder="Ej: Cuadro Hemático Automatizado o Perfil Tiroideo TSH/T4"
                  className="w-full h-8 px-2.5 rounded-lg border border-outline-variant bg-surface-container-low text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-purple-700"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-on-surface mb-1">
                    Tipo de Muestra
                  </label>
                  <input
                    type="text"
                    name="sample_type"
                    defaultValue="Sangre Total EDTA"
                    className="w-full h-8 px-2.5 rounded-lg border border-outline-variant bg-surface-container-low text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-purple-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-on-surface mb-1">
                    Prioridad
                  </label>
                  <select
                    name="priority"
                    className="w-full h-8 px-2.5 rounded-lg border border-outline-variant bg-surface-container-low text-xs text-on-surface focus:outline-none"
                  >
                    <option value="RUTINA">Rutina</option>
                    <option value="PRIORITARIO">Prioritario</option>
                    <option value="URGENTE">Urgente</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-on-surface mb-1">
                    Médico Solicitante
                  </label>
                  <input
                    type="text"
                    name="ordering_doctor"
                    defaultValue="Dr. Santiago Vélez"
                    className="w-full h-8 px-2.5 rounded-lg border border-outline-variant bg-surface-container-low text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-purple-700"
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
                    className="w-full h-8 px-2.5 rounded-lg border border-outline-variant bg-surface-container-low text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-purple-700"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-surface-container-high">
                <button
                  type="button"
                  onClick={() => setShowNewOrderModal(false)}
                  className="h-8 px-3 rounded-lg border border-surface-container-high text-xs font-semibold text-on-surface cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="h-8 px-4 rounded-lg bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold cursor-pointer shadow-xs"
                >
                  Crear Orden
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LaboratoryScreen;

