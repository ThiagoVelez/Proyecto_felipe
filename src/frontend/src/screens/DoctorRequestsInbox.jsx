import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Inbox,
  RefreshCw,
  CalendarCheck,
  XCircle,
  Mail,
  Phone,
  IdCard,
  Building2,
  Clock,
  AlertTriangle,
  CalendarDays,
} from 'lucide-react';
import { apiClient } from '../services/api';

export const REQUESTS_UPDATED_EVENT = 'saludconecta_requests_updated';

const TABS = [
  { id: 'PENDIENTE', label: 'Pendientes' },
  { id: 'AGENDADA', label: 'Agendadas' },
  { id: 'RECHAZADA', label: 'Rechazadas' },
];

const formatDateTime = (value) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
};

const ageFrom = (birth) => {
  const d = new Date(birth);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getUTCFullYear();
  if (now.getMonth() < d.getUTCMonth() || (now.getMonth() === d.getUTCMonth() && now.getDate() < d.getUTCDate())) age -= 1;
  return age;
};

const pad = (n) => String(n).padStart(2, '0');
const localDateStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// Horas de consulta en bloques de 20 minutos (7:00 a 17:40), igual que la agenda del médico
const TIME_SLOTS = Array.from({ length: 33 }, (_, i) => {
  const minutes = 7 * 60 + i * 20;
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
});

// Bandeja de solicitudes de primera cita: el médico revisa su agenda del día, agenda la cita (el sistema envía el
// comprobante PDF al correo del paciente) o rechaza la solicitud indicando el motivo.
export const DoctorRequestsInbox = ({ user, onNavigate }) => {
  const [tab, setTab] = useState('PENDIENTE');
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [date, setDate] = useState(() => localDateStr(new Date(Date.now() + 24 * 3600 * 1000)));
  const [time, setTime] = useState('08:00');
  const [note, setNote] = useState('');
  const [rejectNote, setRejectNote] = useState('');
  const [mode, setMode] = useState('schedule'); // 'schedule' | 'reject'
  const [dayAppointments, setDayAppointments] = useState([]);
  const [dayLoading, setDayLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await apiClient.getAppointmentRequests(tab);
      setRequests(list);
      setError('');
      setSelectedId((prev) => (list.some((r) => r.id === prev) ? prev : list[0]?.id ?? null));
    } catch (err) {
      setError(err.message || 'No fue posible cargar la bandeja.');
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    load();
  }, [load]);

  const selected = useMemo(() => requests.find((r) => r.id === selectedId) || null, [requests, selectedId]);

  // Agenda del día elegido: se piden tres días y se filtra por fecha local (las citas se guardan en UTC)
  useEffect(() => {
    if (!selected || selected.status !== 'PENDIENTE' || !date) return;
    const base = new Date(`${date}T00:00:00`);
    const start = localDateStr(new Date(base.getTime() - 24 * 3600 * 1000));
    const end = localDateStr(new Date(base.getTime() + 2 * 24 * 3600 * 1000));
    setDayLoading(true);
    apiClient
      .getAppointmentsByRange(user?.id, start, end)
      .then((list) => {
        const items = (Array.isArray(list) ? list : list?.appointments || [])
          .filter((a) => localDateStr(new Date(a.appointment_date)) === date && a.status !== 'CANCELADA')
          .sort((a, b) => new Date(a.appointment_date) - new Date(b.appointment_date));
        setDayAppointments(items);
      })
      .catch(() => setDayAppointments([]))
      .finally(() => setDayLoading(false));
  }, [selected, date, user?.id]);

  const busyTimes = useMemo(
    () => new Set(dayAppointments.map((a) => {
      const d = new Date(a.appointment_date);
      return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    })),
    [dayAppointments]
  );

  const notifyChange = () => window.dispatchEvent(new CustomEvent(REQUESTS_UPDATED_EVENT));

  const handleSchedule = async () => {
    if (!selected) return;
    const when = new Date(`${date}T${time}:00`);
    if (Number.isNaN(when.getTime())) {
      setFeedback({ type: 'error', text: 'Elija una fecha y una hora válidas.' });
      return;
    }
    setBusy(true);
    setFeedback(null);
    try {
      await apiClient.scheduleAppointmentRequest(selected.id, when.toISOString(), note.trim());
      setFeedback({
        type: 'success',
        text: `Cita agendada para ${selected.first_name} ${selected.last_name} el ${formatDateTime(when)}; el comprobante se envía a ${selected.email}.`,
      });
      setNote('');
      notifyChange();
      await load();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'No fue posible agendar la cita.' });
    } finally {
      setBusy(false);
    }
  };

  const handleReject = async () => {
    if (!selected) return;
    if (!rejectNote.trim()) {
      setFeedback({ type: 'error', text: 'Escriba el motivo del rechazo: se enviará al correo del paciente.' });
      return;
    }
    setBusy(true);
    setFeedback(null);
    try {
      await apiClient.rejectAppointmentRequest(selected.id, rejectNote.trim());
      setFeedback({ type: 'success', text: `Solicitud ${selected.code} rechazada. Se avisó al paciente por correo.` });
      setRejectNote('');
      setMode('schedule');
      notifyChange();
      await load();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'No fue posible rechazar la solicitud.' });
    } finally {
      setBusy(false);
    }
  };

  const age = selected ? ageFrom(selected.birth_date) : null;

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <div className="p-4 sm:p-6 rounded-2xl bg-white border border-surface-container-high shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="min-w-0">
          <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-teal-100 text-teal-800 mb-1">
            Portal del paciente
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-on-surface">Bandeja de Solicitudes de Cita</h1>
          <p className="text-xs sm:text-sm text-on-surface-variant mt-0.5">
            Solicitudes de primera cita que los pacientes envían desde la web. Revise su agenda, agende la cita y el
            sistema le enviará el comprobante al correo.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="h-9 px-3.5 rounded-xl border border-surface-container-high bg-white hover:bg-surface-container-low text-xs font-semibold text-on-surface flex items-center gap-1.5 cursor-pointer shrink-0 self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-outline ${loading ? 'animate-spin' : ''}`} />
          <span>Actualizar</span>
        </button>
      </div>

      <div className="flex items-center gap-2 p-1 bg-surface-container-low rounded-xl border border-outline-variant/30 text-xs font-semibold w-fit max-w-full overflow-x-auto" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => {
              setTab(t.id);
              setFeedback(null);
            }}
            className={`h-8 px-3 rounded-lg shrink-0 whitespace-nowrap cursor-pointer ${
              tab === t.id ? 'bg-white text-primary font-bold shadow-xs' : 'text-outline hover:text-on-surface'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {feedback && (
        <div
          role={feedback.type === 'error' ? 'alert' : 'status'}
          className={`p-3 rounded-xl text-xs sm:text-sm font-medium border ${
            feedback.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          {feedback.text}
        </div>
      )}
      {error && (
        <div role="alert" className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-4">
        {/* Lista */}
        <section className="rounded-2xl bg-white border border-surface-container-high shadow-xs overflow-hidden">
          {!loading && requests.length === 0 ? (
            <div className="p-10 text-center text-sm text-outline">
              <Inbox className="w-10 h-10 mx-auto mb-2 opacity-40" />
              No hay solicitudes {TABS.find((t) => t.id === tab)?.label.toLowerCase()}.
            </div>
          ) : (
            <ul className="divide-y divide-surface-container-high">
              {requests.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedId(r.id);
                      setFeedback(null);
                      setMode('schedule');
                    }}
                    className={`w-full text-left p-4 cursor-pointer transition-colors ${
                      r.id === selectedId ? 'bg-teal-50' : 'hover:bg-surface-container-low'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-sm text-on-surface truncate">
                        {r.first_name} {r.last_name}
                      </span>
                      <span className="font-mono text-[11px] text-outline shrink-0">{r.code}</span>
                    </div>
                    <p className="text-xs text-on-surface-variant line-clamp-2 mt-1">{r.observations}</p>
                    <p className="text-[11px] text-outline mt-1">Recibida {formatDateTime(r.created_at)}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Detalle */}
        {selected && (
          <section className="rounded-2xl bg-white border border-surface-container-high shadow-xs p-4 sm:p-6 space-y-5">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold text-on-surface">
                  {selected.first_name} {selected.last_name}
                </h2>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-surface-container text-on-surface">{selected.code}</span>
              </div>
              <p className="text-xs text-on-surface-variant">
                {age !== null ? `${age} años • ` : ''}
                {selected.gender === 'F' ? 'Femenino' : selected.gender === 'M' ? 'Masculino' : 'Otro'} • Grupo {selected.blood_type} •{' '}
                {selected.eps_name}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <p className="flex items-center gap-2 min-w-0"><IdCard className="w-4 h-4 text-outline shrink-0" />{selected.document_type} {selected.document_number}</p>
              <p className="flex items-center gap-2 min-w-0"><Phone className="w-4 h-4 text-outline shrink-0" />{selected.phone}</p>
              <p className="flex items-center gap-2 min-w-0 break-all"><Mail className="w-4 h-4 text-outline shrink-0" />{selected.email}</p>
              <p className="flex items-center gap-2 min-w-0"><Building2 className="w-4 h-4 text-outline shrink-0" />{selected.branch}</p>
            </div>

            <div className="p-3 rounded-xl bg-surface-container-low">
              <p className="text-[11px] font-bold uppercase tracking-wider text-outline mb-1">Motivo de la consulta</p>
              <p className="text-sm text-on-surface whitespace-pre-wrap">{selected.observations}</p>
            </div>

            {selected.status !== 'PENDIENTE' ? (
              <div className={`p-3 rounded-xl text-sm border ${selected.status === 'AGENDADA' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'}`}>
                <strong>{selected.status === 'AGENDADA' ? 'Cita agendada y enviada por correo.' : 'Solicitud rechazada.'}</strong>
                {selected.response_note && <p className="mt-1 text-xs">{selected.response_note}</p>}
                <p className="mt-1 text-[11px] opacity-80">Atendida {formatDateTime(selected.updated_at)}</p>
              </div>
            ) : mode === 'schedule' ? (
              <div className="space-y-4 border-t border-surface-container-high pt-4">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <CalendarCheck className="w-4 h-4 text-teal-700" />
                  Agendar la cita
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="req-date" className="block text-[11px] font-semibold mb-1">Fecha</label>
                    <input id="req-date" type="date" min={localDateStr(new Date())} value={date} onChange={(e) => setDate(e.target.value)} className="w-full h-10 px-3 rounded-xl border border-surface-container-high bg-surface text-sm" />
                  </div>
                  <div>
                    <label htmlFor="req-time" className="block text-[11px] font-semibold mb-1">Hora</label>
                    <select id="req-time" value={time} onChange={(e) => setTime(e.target.value)} className="w-full h-10 px-3 rounded-xl border border-surface-container-high bg-surface text-sm">
                      {TIME_SLOTS.map((t) => (
                        <option key={t} value={t} disabled={busyTimes.has(t)}>
                          {t}{busyTimes.has(t) ? ' (ocupada)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-surface-container-high">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <p className="text-xs font-bold flex items-center gap-1.5">
                      <CalendarDays className="w-4 h-4 text-outline" />
                      Su agenda ese día
                    </p>
                    {onNavigate && (
                      <button type="button" onClick={() => onNavigate('appointments')} className="text-xs font-semibold text-primary hover:underline cursor-pointer">
                        Ver calendario completo
                      </button>
                    )}
                  </div>
                  {dayLoading ? (
                    <p className="text-xs text-outline">Consultando agenda...</p>
                  ) : dayAppointments.length === 0 ? (
                    <p className="text-xs text-emerald-700">No tiene citas ese día.</p>
                  ) : (
                    <ul className="space-y-1">
                      {dayAppointments.map((a) => (
                        <li key={a.id} className="text-xs flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-outline shrink-0" />
                          <span className="font-mono">{new Date(a.appointment_date).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</span>
                          <span className="truncate">{a.patient_name || 'Paciente'}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div>
                  <label htmlFor="req-note" className="block text-[11px] font-semibold mb-1">Indicaciones para el paciente (opcional)</label>
                  <textarea id="req-note" rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ej: Llegar 15 minutos antes y traer exámenes previos" className="w-full px-3 py-2 rounded-xl border border-surface-container-high bg-surface text-sm" />
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <button type="button" disabled={busy || busyTimes.has(time)} onClick={handleSchedule} className="w-full sm:w-auto sm:flex-1 h-11 rounded-xl bg-primary hover:bg-primary-container text-white text-sm font-bold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50">
                    <Mail className="w-4 h-4" />
                    {busy ? 'Agendando...' : 'Agendar y enviar por correo'}
                  </button>
                  <button type="button" disabled={busy} onClick={() => { setMode('reject'); setFeedback(null); }} className="h-11 px-4 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer">
                    <XCircle className="w-4 h-4" />
                    Rechazar
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 border-t border-surface-container-high pt-4">
                <h3 className="text-sm font-bold text-rose-800">Rechazar la solicitud</h3>
                <label htmlFor="req-reject" className="block text-[11px] font-semibold">Motivo (se envía al correo del paciente) *</label>
                <textarea id="req-reject" rows={3} maxLength={500} value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} placeholder="Ej: Por sus síntomas debe acudir hoy mismo a urgencias" className="w-full px-3 py-2 rounded-xl border border-surface-container-high bg-surface text-sm" />
                <div className="flex flex-col sm:flex-row gap-2">
                  <button type="button" disabled={busy} onClick={handleReject} className="w-full sm:w-auto sm:flex-1 h-11 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-sm font-bold cursor-pointer disabled:opacity-50">
                    {busy ? 'Enviando...' : 'Confirmar rechazo'}
                  </button>
                  <button type="button" disabled={busy} onClick={() => setMode('schedule')} className="h-11 px-4 rounded-xl border border-surface-container-high bg-white text-sm font-semibold cursor-pointer">
                    Volver
                  </button>
                </div>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
};

export default DoctorRequestsInbox;
