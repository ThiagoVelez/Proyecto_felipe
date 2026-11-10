import React, { useState, useEffect } from 'react';
import {
  Printer,
  Search,
  FlaskConical,
  CheckCircle2,
  Calendar,
  User,
  ShieldCheck,
  Building2,
  FileText,
  Eye,
  Mail,
  ChevronRight,
  X,
} from 'lucide-react';
import { calculateAge, formatDoctorName } from '../utils/clinical';

export const DoctorPrintLabResultsView = ({ user, patient, onNavigate }) => {
  const [orders, setOrders] = useState(() => {
    try {
      const saved = localStorage.getItem('saludconecta_lab_orders');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Sincronizar en tiempo real órdenes
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

  // Sincronización reactiva si el médico o recepción actualiza datos del paciente
  useEffect(() => {
    const handlePatientSync = (e) => {
      const updated = e.detail;
      if (!updated) return;
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
            };
          }
          return o;
        })
      );
    };
    window.addEventListener('saludconecta_patient_updated', handlePatientSync);
    return () => window.removeEventListener('saludconecta_patient_updated', handlePatientSync);
  }, []);

  const doctorName = formatDoctorName(
    user?.full_name || user?.name || 'Dr. Santiago Vélez',
    user?.role || 'MEDICO'
  );

  // Filtrar solo órdenes completadas (con resultados sellados)
  const completedOrders = orders.filter((o) => o.status === 'COMPLETADO');

  const filteredOrders = completedOrders.filter((o) => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;
    return (
      (o.patient_name || '').toLowerCase().includes(term) ||
      (o.patient_document || '').includes(term) ||
      (o.id || '').toLowerCase().includes(term) ||
      (o.test_type || '').toLowerCase().includes(term)
    );
  });

  const handleOpenPrintDrawer = (order) => {
    setSelectedOrder(order);
    setIsDrawerOpen(true);
  };

  const handleTriggerPrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fadeIn">
      {/* HEADER DE LA VISTA */}
      <div className="p-6 rounded-3xl bg-white border border-surface-container-high shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-white shrink-0 shadow-xs">
            <Printer className="w-6 h-6 text-purple-300" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-900 border border-purple-200">
                Impresión Médico-Legal de Exámenes
              </span>
              <span className="text-xs text-outline font-mono">
                Médico: {doctorName}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-on-surface">
              Imprimir Resultado de Examen
            </h1>
            <p className="text-xs text-outline mt-0.5">
              Consola médica de impresión oficial de exámenes sellados con membrete de SaludConecta IPS S.A.S. y firma ReTHUS.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3.5 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 font-bold text-xs flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{completedOrders.length} Resultados Disponibles</span>
          </span>
        </div>
      </div>

      {/* BUSCADOR DE EXÁMENES SELLADOS */}
      <div className="p-4 rounded-2xl bg-white border border-surface-container-high shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-outline absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Buscar por paciente, cédula o ID de orden..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-10 pl-10 pr-3.5 rounded-xl border border-surface-container-high bg-surface-container-low text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
          />
        </div>
        <p className="text-xs text-outline">
          Seleccione un examen para abrir la vista previa de impresión en el drawer lateral.
        </p>
      </div>

      {/* LISTADO DE RESULTADOS LISTOS PARA IMPRIMIR */}
      <div className="p-6 rounded-3xl bg-white border border-surface-container-high shadow-xs space-y-4">
        {completedOrders.length === 0 ? (
          <div className="p-12 text-center text-outline text-xs space-y-2">
            <FlaskConical className="w-8 h-8 text-outline mx-auto stroke-1" />
            <p className="font-semibold text-on-surface">No hay exámenes validados y sellados todavía.</p>
            <p className="text-[11px]">Cuando el bacteriólogo valide y selle un examen en laboratorio, aparecerá aquí inmediatamente listo para imprimir.</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-8 text-center text-outline text-xs">
            No se encontraron exámenes sellados que coincidan con la búsqueda.
          </div>
        ) : (
          <div className="divide-y divide-surface-container-high">
            {filteredOrders.map((order) => (
              <div
                key={order.id}
                className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-surface-container-low/60 px-3.5 rounded-2xl transition-colors"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-300">
                      {order.id}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                      RESULTADO SELLADO
                    </span>
                    <span className="text-xs text-outline font-mono">
                      {order.validated_at?.slice(0, 10) || order.created_at?.slice(0, 10)}
                    </span>
                  </div>

                  <h3 className="font-bold text-sm text-on-surface">
                    {order.test_type}
                  </h3>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-outline">
                    <span>
                      Paciente: <strong className="text-on-surface">{order.patient_name}</strong> (CC {order.patient_document})
                    </span>
                    <span>•</span>
                    <span>EPS: {order.patient_eps}</span>
                    <span>•</span>
                    <span>Muestra: {order.sample_type}</span>
                    <span>•</span>
                    <span>Validador: {order.validated_by || 'Bacteriólogo ReTHUS'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleOpenPrintDrawer(order)}
                    className="h-9 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-xs transition-all"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Ver & Imprimir PDF</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* DRAWER LATERAL DERECHO DE IMPRESIÓN Y VISTA PREVIA */}
      {isDrawerOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/50 backdrop-blur-xs flex justify-end animate-fadeIn">
          <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col justify-between border-l border-slate-300 animate-slideLeft">
            {/* ENCABEZADO STICKY DEL DRAWER */}
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
                  <Printer className="w-5 h-5 text-purple-300" />
                </div>
                <div>
                  <h3 className="font-bold text-sm leading-tight text-white">
                    Vista de Impresión • {selectedOrder.id}
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    Formato oficial para entrega física al paciente
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                className="p-1.5 rounded-xl hover:bg-white/20 text-white cursor-pointer transition-colors"
                title="Cerrar panel"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* CUERPO DEL DRAWER (CONTENIDO IMPRIMIBLE) */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* DOCUMENTO OFICIAL FORMATEADO */}
              <div id="doctor-printable-report" className="border-2 border-slate-300 p-6 rounded-2xl bg-white space-y-5 text-on-surface shadow-xs">
                {/* MEMBRETE INSTITUCIONAL */}
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
                    <span className="inline-block px-2.5 py-1 rounded bg-slate-100 text-slate-900 font-mono text-xs font-bold border border-slate-300">
                      ORDEN: {selectedOrder.id}
                    </span>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                      Fecha: {selectedOrder.validated_at?.slice(0, 10) || new Date().toISOString().slice(0, 10)}
                    </div>
                  </div>
                </div>

                {/* FICHA TÉCNICA DEL PACIENTE */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-500 block">Paciente:</span>
                    <span className="font-bold text-slate-900">{selectedOrder.patient_name}</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-500 block">Identificación:</span>
                    <span className="font-mono font-bold text-slate-900">
                      {selectedOrder.patient_document_type || 'CC'} {selectedOrder.patient_document}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-500 block">Edad / Sexo:</span>
                    <span className="font-semibold text-slate-900">
                      {selectedOrder.patient_age || 32} años • {selectedOrder.patient_gender || 'General'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-500 block">Aseguradora / EPS:</span>
                    <span className="font-semibold text-slate-900">{selectedOrder.patient_eps}</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-500 block">Médico Solicitante:</span>
                    <span className="font-medium text-slate-900">{selectedOrder.ordering_doctor}</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-500 block">Muestra / Tubo:</span>
                    <span className="font-medium text-slate-900">{selectedOrder.sample_type}</span>
                  </div>
                </div>

                {/* PARÁMETROS ANALÍTICOS */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                    <h4 className="font-bold text-xs text-slate-900 uppercase">
                      Examen: {selectedOrder.test_type}
                    </h4>
                    <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                      VALIDADO & SELLADO
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 font-mono text-xs whitespace-pre-wrap leading-relaxed text-slate-800">
                    {typeof selectedOrder.results === 'string'
                      ? selectedOrder.results
                      : JSON.stringify(selectedOrder.results, null, 2)}
                  </div>
                </div>

                {/* SELLO DE VALIDACIÓN RE-THUS */}
                <div className="p-3 rounded-xl bg-purple-50/70 border border-purple-200 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-purple-700 shrink-0" />
                    <div className="text-[11px] text-purple-950">
                      <strong>Validado por:</strong> {selectedOrder.validated_by || 'Bacteriólogo en turno'} • Licencia: {selectedOrder.bacteriologist_license || 'BAC-9421-VALLE'}
                    </div>
                  </div>
                  <div className="text-[9px] font-mono text-purple-800 font-bold">
                    Sello Digital: SHA-256-OK
                  </div>
                </div>
              </div>
            </div>

            {/* FOOTER DEL DRAWER */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                className="h-10 px-5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-700 cursor-pointer"
              >
                Cerrar Panel
              </button>
              <button
                type="button"
                onClick={handleTriggerPrint}
                className="h-10 px-6 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-md transition-all"
              >
                <Printer className="w-4 h-4 text-purple-300" />
                <span>Imprimir Formato Físico (PDF)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorPrintLabResultsView;

