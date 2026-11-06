import React, { useState, useEffect } from 'react';
import {
  FileText,
  User,
  HeartPulse,
  Pill,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Calendar,
  Clock,
  Search,
  Stethoscope,
  Activity,
  Droplets,
  Layers,
  Thermometer,
  ShieldAlert,
  ClipboardList,
} from 'lucide-react';
import { apiClient } from '../services/api';
import {
  calculateAge,
  formatDoctorName,
  getManchesterInfo,
  getFullName,
} from '../utils/clinical';

export const NurseSummaryView = ({ user, patient, onNavigate, onSelectPatient }) => {
  const [patientsList, setPatientsList] = useState(() => (patient ? [patient] : []));
  const [nurseOrders, setNurseOrders] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState(patient?.id || '');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  // Carga pacientes y órdenes de cuidado asistencial
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const patients = await apiClient.listPatients();
        const pList = Array.isArray(patients) ? patients : [];
        setPatientsList(pList);

        // Órdenes emitidas por médicos guardadas en localStorage
        let storedOrders = [];
        try {
          storedOrders = JSON.parse(localStorage.getItem('saludconecta_nurse_orders') || '[]');
        } catch {
          storedOrders = [];
        }

        // Si no hay órdenes guardadas, inicializar con prescripciones de ejemplo para los pacientes registrados
        if (storedOrders.length === 0 && pList.length > 0) {
          const defaultOrders = pList.slice(0, 3).map((p, idx) => ({
            id: `ORD-2026-${p.id.slice(0, 4)}`,
            unique_code: `RX-2026-${10000 + idx * 142}`,
            created_at: new Date().toISOString(),
            patient_id: p.id,
            patient_document: p.document_number,
            patient_name: `${p.first_name} ${p.last_name}`,
            patient_eps: p.eps_name || 'Nueva EPS',
            birth_date: p.birth_date,
            gender: p.gender,
            blood_type: p.blood_type || 'O+',
            allergies: p.allergies || (idx === 0 ? 'Penicilina, Betalactámicos' : 'Ninguna conocida'),
            diagnosis: idx === 0
              ? 'Neumonía adquirida en la comunidad (CIE-11: CA40)'
              : idx === 1
              ? 'Crisis Hipertensiva Grado II (CIE-11: BA00)'
              : 'Gastroenteritis aguda con deshidratación leve',
            duration: idx === 0 ? '7 días' : '10 días',
            doctor_notes: idx === 0
              ? 'Iniciar antibioterapia endovenosa. Vigilar mecánica ventilatoria y curvas térmicas cada 4 horas. Dieta blanda normosódica.'
              : idx === 1
              ? 'Monitorear presión arterial cada 2 horas. Restricción estricta de sodio. Administrar dosis matutina con alimentos.'
              : 'Hidratación oral guiada según tolerancia. Vigilar diuresis y signos de deshidratación.',
            doctor_name: 'Dr. Santiago Vélez',
            items: idx === 0
              ? [
                  {
                    medication_name: 'Amoxicilina + Ácido Clavulánico (Amoxal)',
                    dosage: '500 mg',
                    presentation: 'Tableta',
                    quantity_prescribed: 21,
                    instructions: 'Tomar 1 tableta cada 8 horas por 7 días con los alimentos',
                  },
                  {
                    medication_name: 'Acetaminofén (Dolex Forte)',
                    dosage: '1000 mg',
                    presentation: 'Tableta',
                    quantity_prescribed: 14,
                    instructions: 'Tomar 1 tableta cada 8 horas si hay fiebre > 38°C o dolor pleurítico',
                  },
                ]
              : [
                  {
                    medication_name: 'Losartán Potásico (Cozaar)',
                    dosage: '50 mg',
                    presentation: 'Tableta',
                    quantity_prescribed: 30,
                    instructions: 'Tomar 1 tableta diaria en ayunas. Control de PA matutino.',
                  },
                ],
            status: 'ASIGNADO_ENFERMERIA',
          }));

          localStorage.setItem('saludconecta_nurse_orders', JSON.stringify(defaultOrders));
          storedOrders = defaultOrders;
        }

        setNurseOrders(storedOrders);

        // Seleccionar paciente por defecto
        if (patient?.id) {
          setSelectedPatientId(patient.id);
        } else if (storedOrders.length > 0) {
          setSelectedPatientId(storedOrders[0].patient_id);
        } else if (pList.length > 0) {
          setSelectedPatientId(pList[0].id);
        }
      } catch (err) {
        console.error('Error cargando datos de enfermería:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [patient]);

  // Paciente seleccionado actualmente
  const activePatient =
    patientsList.find((p) => p.id === selectedPatientId) || patient || patientsList[0];
  const activeOrder = nurseOrders.find((o) => o.patient_id === selectedPatientId);

  const patientAge = activePatient ? calculateAge(activePatient.birth_date) : null;
  const nurseDisplayName = formatDoctorName(user?.full_name || user?.name || 'Enf. Elizabeth', 'ENFERMERO');

  // Filtrado de pacientes en el selector
  const filteredPatients = patientsList.filter((p) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const fullName = `${p.first_name || ''} ${p.last_name || ''}`.toLowerCase();
    const doc = p.document_number ? String(p.document_number) : '';
    return fullName.includes(term) || doc.includes(term);
  });

  const handleSelectPatientClick = (p) => {
    setSelectedPatientId(p.id);
    if (onSelectPatient) {
      onSelectPatient(p);
    }
  };

  const handleGoToChecklist = () => {
    if (activePatient && onSelectPatient) {
      onSelectPatient(activePatient);
    }
    if (onNavigate) {
      onNavigate('nurse_checklist');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fade-in">
      {/* HEADER DE CABECERA ASISTENCIAL */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-surface-container-high shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
              Módulo Asistencial de Enfermería
            </span>
            <span className="text-xs text-outline font-medium">
              Operador: <strong className="text-on-surface">{nurseDisplayName}</strong> • Sede Cartago
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-on-surface flex items-center gap-2.5">
            <FileText className="w-7 h-7 text-primary" />
            <span>Resumen Clínico Asistencial (HCE Básica)</span>
          </h1>
          <p className="text-xs sm:text-sm text-on-surface-variant mt-1 max-w-3xl">
            Visor de evolución clínica, diagnóstico médico, antecedentes alérgicos y plan farmacológico activo para el personal de enfermería.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleGoToChecklist}
            className="px-4 py-2.5 rounded-2xl bg-primary hover:bg-primary-hover text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-all cursor-pointer"
          >
            <ClipboardList className="w-4 h-4" />
            <span>Ir a Lista de Chequeo</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* BARRA DE SELECCIÓN RÁPIDA DE PACIENTES */}
      <div className="bg-white rounded-2xl p-4 border border-surface-container-high shadow-xs space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-xs font-bold text-outline uppercase tracking-wider">
            <User className="w-4 h-4 text-primary" />
            <span>Seleccionar Paciente para Consulta Asistencial ({patientsList.length} registrados)</span>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-outline absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por cédula o nombre..."
              className="w-full h-8 pl-8 pr-3 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        {/* Carrusel de chips de pacientes */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1">
          {filteredPatients.map((p) => {
            const isSelected = p.id === selectedPatientId;
            const hasOrder = nurseOrders.some((o) => o.patient_id === p.id);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handleSelectPatientClick(p)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold shrink-0 transition-all cursor-pointer border flex items-center gap-2 ${
                  isSelected
                    ? 'bg-primary text-white border-primary shadow-xs'
                    : 'bg-surface-container-low hover:bg-surface-container text-on-surface border-surface-container-high'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    isSelected ? 'bg-white text-primary' : 'bg-primary/10 text-primary'
                  }`}
                >
                  {(p.first_name || 'P')[0]}
                </div>
                <span>{getFullName(p)}</span>
                {hasOrder && (
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isSelected ? 'bg-amber-300' : 'bg-emerald-500'
                    }`}
                    title="Tiene orden médica activa"
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* DETALLE PRINCIPAL DEL PACIENTE SELECCIONADO */}
      {activePatient ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* COLUMNA 1: FICHA DE DATOS BÁSICOS Y ANTECEDENTES */}
          <div className="space-y-6 lg:col-span-1">
            {/* Tarjeta de Identidad */}
            <div className="bg-white rounded-3xl p-6 border border-surface-container-high shadow-xs space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary font-bold text-lg flex items-center justify-center">
                  {(activePatient.first_name || 'P')[0]}
                  {(activePatient.last_name || 'C')[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-base font-bold text-on-surface truncate">
                    {getFullName(activePatient)}
                  </h2>
                  <div className="flex items-center gap-1.5 text-xs text-outline font-mono">
                    <span>{activePatient.document_type || 'CC'}</span>
                    <span>{activePatient.document_number}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-surface-container text-xs">
                <div>
                  <span className="text-outline block text-[11px] font-semibold">Edad Calculada</span>
                  <span className="font-bold text-on-surface">
                    {patientAge !== null ? `${patientAge} años` : 'No registrada'}
                  </span>
                </div>
                <div>
                  <span className="text-outline block text-[11px] font-semibold">Género</span>
                  <span className="font-bold text-on-surface">{activePatient.gender || 'No especificado'}</span>
                </div>
                <div>
                  <span className="text-outline block text-[11px] font-semibold">Grupo Sanguíneo</span>
                  <span className="font-mono font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded inline-block">
                    {activePatient.blood_type || activeOrder?.blood_type || 'O+'}
                  </span>
                </div>
                <div>
                  <span className="text-outline block text-[11px] font-semibold">Entidad / EPS</span>
                  <span className="font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded inline-block truncate max-w-full">
                    {activePatient.eps_name || activeOrder?.patient_eps || 'Particular'}
                  </span>
                </div>
              </div>

              {activePatient.phone && (
                <div className="pt-2 border-t border-surface-container text-xs">
                  <span className="text-outline block text-[11px]">Teléfono de Contacto</span>
                  <span className="font-mono font-medium text-on-surface">{activePatient.phone}</span>
                </div>
              )}
            </div>

            {/* Tarjeta de Alertas y Alergias (Crítico para Enfermería) */}
            <div className="bg-white rounded-3xl p-6 border border-surface-container-high shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-outline flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                  <span>Alergias & Contraindicaciones</span>
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-100 text-amber-800">
                  Verificación Obligatoria
                </span>
              </div>

              {activePatient.allergies || activeOrder?.allergies ? (
                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-amber-900">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Reacciones Farmacológicas Reportadas:</span>
                  </div>
                  <p className="font-medium pl-5 text-amber-900">
                    {activePatient.allergies || activeOrder?.allergies}
                  </p>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Sin alergias reportadas en el registro asistencial.</span>
                </div>
              )}
            </div>

            {/* Tarjeta de Signos Vitales y Triaje */}
            <div className="bg-white rounded-3xl p-6 border border-surface-container-high shadow-xs space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-outline flex items-center gap-2">
                <HeartPulse className="w-4 h-4 text-primary" />
                <span>Signos Vitales de Referencia (Triaje)</span>
              </h3>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-2xl bg-surface-container-low border border-surface-container-high">
                  <span className="text-[10px] font-bold uppercase text-outline block">Tensión Arterial</span>
                  <span className="font-mono text-sm font-bold text-on-surface">120/80 mmHg</span>
                </div>
                <div className="p-3 rounded-2xl bg-surface-container-low border border-surface-container-high">
                  <span className="text-[10px] font-bold uppercase text-outline block">Frecuencia Cardíaca</span>
                  <span className="font-mono text-sm font-bold text-on-surface">76 lpm</span>
                </div>
                <div className="p-3 rounded-2xl bg-surface-container-low border border-surface-container-high">
                  <span className="text-[10px] font-bold uppercase text-outline block">Saturación O2</span>
                  <span className="font-mono text-sm font-bold text-emerald-700">98 %</span>
                </div>
                <div className="p-3 rounded-2xl bg-surface-container-low border border-surface-container-high">
                  <span className="text-[10px] font-bold uppercase text-outline block">Temperatura</span>
                  <span className="font-mono text-sm font-bold text-on-surface">36.7 °C</span>
                </div>
              </div>
            </div>
          </div>

          {/* COLUMNA 2 Y 3: DIAGNÓSTICO, OBSERVACIONES MÉDICAS Y MEDICAMENTOS */}
          <div className="space-y-6 lg:col-span-2">
            {/* Evolución Médica y Diagnóstico */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-surface-container-high shadow-xs space-y-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
                  <Stethoscope className="w-5 h-5 text-primary" />
                  <span>Diagnóstico y Observaciones de la Historia Clínica</span>
                </h3>
                <div className="flex items-center gap-2">
                  {(activeOrder?.pain_scale_score !== undefined || activePatient?.pain_scale_score !== undefined) && (
                    <div className="px-3 py-1.5 rounded-xl bg-teal-50 border border-teal-200 text-teal-900 font-bold text-xs flex items-center gap-1.5 shadow-xs">
                      <Activity className="w-3.5 h-3.5 text-teal-700" />
                      <span>EVA Dolor: {activeOrder?.pain_scale_score ?? activePatient?.pain_scale_score ?? 0}/10</span>
                    </div>
                  )}
                  {activeOrder?.doctor_name && (
                    <span className="text-xs font-medium text-outline">
                      Médico: <strong className="text-on-surface">{activeOrder.doctor_name}</strong>
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-2xl bg-primary/5 border border-primary/15 sm:col-span-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary block">
                    Diagnóstico Principal
                  </span>
                  <p className="text-xs font-bold text-on-surface mt-0.5">
                    {activeOrder?.diagnosis || 'Consulta Externa / Valoración de Urgencias General'}
                  </p>
                </div>
                <div className="p-3.5 rounded-2xl bg-surface-container-low border border-surface-container-high">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-outline block">
                    Duración Tratamiento
                  </span>
                  <p className="text-xs font-bold text-on-surface mt-0.5">
                    {activeOrder?.duration || '7 días continuos'}
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-surface-container-low border border-surface-container-high space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-outline block">
                  Observaciones Clínicas del Médico
                </span>
                <p className="text-xs text-on-surface leading-relaxed">
                  {activeOrder?.doctor_notes ||
                    'Paciente en observación clínica. Cumplir administración horaria de fármacos prescritos, vigilar signos de alarma y registrar evolución asistencial en la lista de chequeo de enfermería.'}
                </p>
              </div>
            </div>

            {/* Plan Farmacológico y Medicamentos Activos */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-surface-container-high shadow-xs space-y-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
                    <Pill className="w-5 h-5 text-emerald-600" />
                    <span>Plan Farmacológico y Medicamentos Asignados</span>
                  </h3>
                  <p className="text-xs text-outline mt-0.5">
                    Concentraciones exactas y posología indicadas por el facultativo
                  </p>
                </div>
                {activeOrder?.unique_code && (
                  <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-xl">
                    {activeOrder.unique_code}
                  </span>
                )}
              </div>

              {activeOrder?.items && activeOrder.items.length > 0 ? (
                <div className="space-y-3">
                  {activeOrder.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl bg-surface-container-low hover:bg-surface-container border border-surface-container-high transition-all space-y-2"
                    >
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <span className="font-bold text-sm text-on-surface">
                            {item.medication_name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-primary/10 text-primary">
                            {item.dosage}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white border border-surface-container-high text-on-surface">
                            {item.presentation || 'Tableta'}
                          </span>
                        </div>
                      </div>

                      <div className="pl-8 text-xs space-y-1">
                        <div className="text-on-surface font-medium flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-outline" />
                          <span>Instrucción / Posología: <strong className="text-primary">{item.instructions}</strong></span>
                        </div>
                        <div className="text-outline text-[11px]">
                          Cantidad prescrita: <strong>{item.quantity_prescribed} unidades</strong>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 rounded-2xl bg-surface-container-low border border-dashed border-outline-variant/40 text-center space-y-2">
                  <Pill className="w-8 h-8 text-outline mx-auto" />
                  <p className="text-xs font-semibold text-on-surface">
                    No hay medicamentos formulados recientemente para este paciente.
                  </p>
                  <p className="text-[11px] text-outline max-w-md mx-auto">
                    Cuando el médico emita la prescripción tripartita desde el módulo de tratamiento, los medicamentos y concentraciones se reflejarán automáticamente aquí.
                  </p>
                </div>
              )}

              {/* Botón de acceso directo a la lista de chequeo */}
              <div className="pt-3 border-t border-surface-container flex justify-end">
                <button
                  type="button"
                  onClick={handleGoToChecklist}
                  className="px-5 py-2.5 rounded-2xl bg-primary hover:bg-primary-hover text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-all cursor-pointer"
                >
                  <ClipboardList className="w-4 h-4" />
                  <span>Gestionar Lista de Chequeo de {getFullName(activePatient)}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-12 text-center bg-white rounded-3xl border border-surface-container-high shadow-xs space-y-3">
          <User className="w-10 h-10 text-outline mx-auto" />
          <h2 className="text-base font-bold text-on-surface">No hay pacientes disponibles</h2>
          <p className="text-xs text-outline max-w-sm mx-auto">
            Registre o admita pacientes en el sistema para visualizar su resumen asistencial.
          </p>
        </div>
      )}
    </div>
  );
};

export default NurseSummaryView;

