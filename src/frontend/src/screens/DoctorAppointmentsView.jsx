import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  Mail,
  Phone,
  FileText,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  Sparkles,
} from 'lucide-react';
import { apiClient } from '../services/api';
import { formatDoctorName } from '../utils/clinical';

export const DoctorAppointmentsView = ({ user, onNavigate }) => {
  const [appointments, setAppointments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(new Date().getDate());

  // Estado del formulario
  const [patients, setPatients] = useState([]);
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [appointmentDate, setAppointmentDate] = useState('');
  const [observations, setObservations] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error', message }

  // Cargar citas y lista de pacientes
  const loadAppointments = async () => {
    setIsLoading(true);
    try {
      const data = await apiClient.getDoctorAppointments(user?.id);
      setAppointments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error cargando citas:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadPatients = async () => {
    try {
      const data = await apiClient.listPatients();
      setPatients(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error cargando pacientes:', err);
    }
  };

  useEffect(() => {
    loadAppointments();
    loadPatients();
  }, [user]);

  // Navegacion mensual
  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    setSelectedDay(1);
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    setSelectedDay(1);
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  // Calculos de cuadrícula de calendario
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 es Domingo
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // Ajuste para comenzar en Lunes (0 Lunes .. 6 Domingo)
  const startingCol = (firstDayIndex + 6) % 7;

  // Filtrar citas del mes
  const appointmentsInMonth = appointments.filter((app) => {
    const d = new Date(app.appointment_date);
    return d.getFullYear() === year && d.getMonth() === month;
  });

  // Mapear conteo de citas por dia
  const countByDay = {};
  appointmentsInMonth.forEach((app) => {
    const day = new Date(app.appointment_date).getDate();
    countByDay[day] = (countByDay[day] || 0) + 1;
  });

  // Citas del dia seleccionado
  const selectedDayAppointments = appointmentsInMonth.filter((app) => {
    const d = new Date(app.appointment_date);
    return d.getDate() === selectedDay;
  });

  // Filtrado de autocompletado de pacientes
  const filteredPatients = patients.filter((p) => {
    if (!patientSearch.trim()) return false;
    const term = patientSearch.toLowerCase();
    const fullName = `${p.first_name || ''} ${p.last_name || ''}`.toLowerCase();
    return fullName.includes(term) || (p.document_number && p.document_number.includes(term));
  });

  const handleSelectPatient = (p) => {
    setSelectedPatient(p);
    setPatientSearch(`${p.first_name} ${p.last_name} (${p.document_number})`);
  };

  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    setFeedback(null);

    if (!selectedPatient) {
      setFeedback({ type: 'error', message: 'Seleccione un paciente registrado en el sistema.' });
      return;
    }
    if (!appointmentDate) {
      setFeedback({ type: 'error', message: 'Indique la fecha y hora de la cita.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiClient.createAppointment({
        patient_id: selectedPatient.id,
        appointment_date: appointmentDate,
        observations: observations.trim() || 'Consulta médica programada',
      });

      setFeedback({
        type: 'success',
        message: 'Cita programada con éxito. El comprobante en PDF ha sido enviado al paciente por correo.',
      });

      // Limpiar formulario y recargar
      setSelectedPatient(null);
      setPatientSearch('');
      setAppointmentDate('');
      setObservations('');
      loadAppointments();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.data?.error || err.message || 'Error al programar la cita.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER DE LA VISTA */}
      <div className="bg-white rounded-2xl p-6 border border-surface-container-high shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-primary/10 text-primary">
              Módulo de Agendamiento
            </span>
            <span className="text-xs text-on-surface-variant font-mono">
              {formatDoctorName(user?.full_name || user?.name, user?.role)} • {user?.specialty || 'Medicina General'}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-on-surface flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-primary" />
            Agenda y Calendario Médico
          </h1>
          <p className="text-sm text-on-surface-variant mt-0.5">
            Planificación de consultas externas con generación automática de comprobante PDF y notificación al correo del paciente.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right hidden md:block">
            <span className="text-xs text-outline font-medium block">Total citas activas</span>
            <span className="text-xl font-bold text-primary font-mono">{appointments.length}</span>
          </div>
        </div>
      </div>

      {/* FEEDBACK TOAST / BANNER */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border flex items-start gap-3 transition-all ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 text-sm font-medium">{feedback.message}</div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-xs font-semibold hover:underline cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* GRID PRINCIPAL: 2 COLUMNAS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* COLUMNA IZQUIERDA: CALENDARIO Y AGENDA (lg:col-span-7) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-surface-container-high shadow-xs">
            {/* BARRA DE NAVEGACION DE MES */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-surface-container">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-on-surface">
                  {monthNames[month]} {year}
                </h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant font-medium">
                  {appointmentsInMonth.length} citas este mes
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={prevMonth}
                  className="p-2 rounded-xl hover:bg-surface-container text-outline hover:text-on-surface transition-colors cursor-pointer"
                  title="Mes anterior"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={nextMonth}
                  className="p-2 rounded-xl hover:bg-surface-container text-outline hover:text-on-surface transition-colors cursor-pointer"
                  title="Mes siguiente"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* DIAS DE LA SEMANA */}
            <div className="grid grid-cols-7 gap-1 mb-2 text-center">
              {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((d) => (
                <div key={d} className="text-xs font-bold text-outline uppercase tracking-wider py-1 font-mono">
                  {d}
                </div>
              ))}
            </div>

            {/* MATRIZ DE DIAS */}
            <div className="grid grid-cols-7 gap-1.5">
              {/* Espacios vacíos antes del primer día */}
              {Array.from({ length: startingCol }).map((_, i) => (
                <div key={`empty-${i}`} className="h-16 rounded-xl bg-surface/50 border border-transparent" />
              ))}

              {/* Días del mes */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const count = countByDay[dayNum] || 0;
                const isSelected = selectedDay === dayNum;
                const isToday =
                  new Date().getDate() === dayNum &&
                  new Date().getMonth() === month &&
                  new Date().getFullYear() === year;

                return (
                  <button
                    key={dayNum}
                    type="button"
                    onClick={() => setSelectedDay(dayNum)}
                    className={`h-16 p-1.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between relative ${
                      isSelected
                        ? 'border-primary bg-primary/5 ring-2 ring-primary/20 shadow-xs'
                        : 'border-surface-container hover:border-outline hover:bg-surface-container-low'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-semibold ${
                          isToday
                            ? 'w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center font-bold'
                            : isSelected
                            ? 'text-primary font-bold'
                            : 'text-on-surface'
                        }`}
                      >
                        {dayNum}
                      </span>
                      {count > 0 && (
                        <span className="w-2 h-2 rounded-full bg-emerald-500" title={`${count} citas`} />
                      )}
                    </div>
                    {count > 0 ? (
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/80 px-1 py-0.5 rounded truncate">
                        {count} {count === 1 ? 'cita' : 'citas'}
                      </span>
                    ) : (
                      <span className="text-[9px] text-outline/50 italic">Libre</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* LISTA DE CITAS DEL DIA SELECCIONADO */}
          <div className="bg-white rounded-2xl p-6 border border-surface-container-high shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-on-surface flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                Citas para el {selectedDay} de {monthNames[month]} de {year}
              </h3>
              <span className="text-xs text-outline">
                {selectedDayAppointments.length} programadas
              </span>
            </div>

            {selectedDayAppointments.length === 0 ? (
              <div className="py-8 text-center text-outline bg-surface rounded-xl border border-dashed border-surface-container-high">
                <CalendarIcon className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm font-medium">No hay citas programadas para este día.</p>
                <p className="text-xs text-on-surface-variant mt-1">
                  Utilice el formulario contiguo para agendar una consulta médica.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedDayAppointments.map((app) => {
                  const timeStr = new Date(app.appointment_date).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  });
                  return (
                    <div
                      key={app.id}
                      className="p-4 rounded-xl border border-surface-container bg-surface-container-lowest hover:border-primary/40 transition-all flex flex-col md:flex-row md:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-primary/10 text-primary font-mono text-xs font-bold">
                            {timeStr}
                          </span>
                          <span className="font-semibold text-sm text-on-surface">
                            {app.patient_name || 'Paciente'}
                          </span>
                          <span className="text-xs text-outline font-mono">
                            CC: {app.patient_document}
                          </span>
                        </div>
                        <p className="text-xs text-on-surface-variant line-clamp-1">
                          {app.observations || 'Sin observaciones adicionales'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">
                          {app.status}
                        </span>
                        {app.email_sent && (
                          <span className="text-[11px] text-outline flex items-center gap-1" title="PDF enviado por correo">
                            <Mail className="w-3.5 h-3.5 text-emerald-600" />
                            PDF Enviado
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* COLUMNA DERECHA: FORMULARIO DE AGENDAMIENTO (lg:col-span-5) */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-6 border border-surface-container-high shadow-xs space-y-5">
          <div className="pb-4 border-b border-surface-container">
            <h2 className="text-lg font-bold text-on-surface flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" />
              Agendar Nueva Cita
            </h2>
            <p className="text-xs text-on-surface-variant mt-1">
              Seleccione al paciente, defina el horario y despache automáticamente la confirmación con comprobante PDF.
            </p>
          </div>

          <form onSubmit={handleScheduleSubmit} className="space-y-4">
            {/* BUSCADOR DE PACIENTE */}
            <div className="space-y-1 relative">
              <label className="text-xs font-bold text-on-surface uppercase tracking-wider block">
                Paciente Registrado *
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={patientSearch}
                  onChange={(e) => {
                    setPatientSearch(e.target.value);
                    if (selectedPatient) setSelectedPatient(null);
                  }}
                  placeholder="Buscar por cédula o nombre completo..."
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-surface-container-high bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
                <Search className="w-4 h-4 text-outline absolute left-3 top-3" />
              </div>

              {/* DROPDOWN DE AUTOCOMPLETADO */}
              {!selectedPatient && filteredPatients.length > 0 && (
                <div className="absolute z-20 left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white rounded-xl border border-surface-container-high shadow-lg">
                  {filteredPatients.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectPatient(p)}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-surface-container cursor-pointer border-b border-surface-container last:border-b-0"
                    >
                      <div className="font-bold text-on-surface">
                        {p.first_name} {p.last_name}
                      </div>
                      <div className="text-outline text-[11px] font-mono">
                        {p.document_type || 'CC'}: {p.document_number} • EPS: {p.eps_name || 'Particular'}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* TARJETA DE PACIENTE SELECCIONADO */}
              {selectedPatient && (
                <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 text-xs space-y-1 mt-2">
                  <div className="flex items-center justify-between font-bold text-primary">
                    <span>
                      {selectedPatient.first_name} {selectedPatient.last_name}
                    </span>
                    <span className="font-mono">{selectedPatient.document_number}</span>
                  </div>
                  <div className="text-on-surface-variant flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Mail className="w-3 h-3 text-outline" /> {selectedPatient.email || 'paciente@saludconecta.local'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3 text-outline" /> {selectedPatient.phone || 'Sin registrar'}
                    </span>
                  </div>
                  <div className="text-[11px] font-medium text-emerald-800">
                    Aseguradora: {selectedPatient.eps_name || 'Particular'} ({selectedPatient.affiliation_type || 'CONTRIBUTIVO'})
                  </div>
                </div>
              )}
            </div>

            {/* FECHA Y HORA */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-on-surface uppercase tracking-wider block">
                Fecha y Hora de la Cita *
              </label>
              <input
                type="datetime-local"
                value={appointmentDate}
                onChange={(e) => setAppointmentDate(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
                required
                className="w-full px-3 py-2.5 rounded-xl border border-surface-container-high bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
              />
            </div>

            {/* OBSERVACIONES */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-on-surface uppercase tracking-wider block">
                Observaciones y Plan de la Cita
              </label>
              <textarea
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                rows={4}
                placeholder="Describa el motivo de consulta, preparación requerida o paraclínicos a traer por el paciente..."
                className="w-full p-3 rounded-xl border border-surface-container-high bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
              />
            </div>

            {/* BOTON PRIMARIO */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary/90 transition-all shadow-sm cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <span>Generando comprobante y enviando...</span>
              ) : (
                <>
                  <Mail className="w-4 h-4" />
                  Agendar y Enviar Confirmación por Correo (PDF)
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default DoctorAppointmentsView;

