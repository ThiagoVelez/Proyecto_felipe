import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Hourglass,
  Stethoscope,
  AlertOctagon,
  Timer,
  Filter,
  UserSearch,
  RefreshCw,
  Clock,
  ArrowRight,
  FileText,
  HeartPulse,
  Building2,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { apiClient } from '../services/api';
import {
  TRIAGE_STATUS_LABELS,
  calculateAge,
  formatWait,
  getErrorMessage,
  getFullName,
  getManchesterInfo,
  minutesSince,
} from '../utils/clinical';

const CRITICAL_LEVELS = ['NIVEL_I', 'NIVEL_II'];

const percent = (value, total) => (total > 0 ? Math.round((value / total) * 100) : 0);

export const DashboardScreen = ({ onSelectPatient, onNavigate }) => {
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchFilter, setSearchFilter] = useState('');
  const [queue, setQueue] = useState([]);
  const [patientsById, setPatientsById] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [busyKey, setBusyKey] = useState('');
  const [now, setNow] = useState(() => Date.now());

  const loadQueue = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      // El triaje solo referencia patient_id: se resuelven los nombres con el listado de pacientes
      const [triages, patients] = await Promise.all([apiClient.getTriageQueue(), apiClient.listPatients({ limit: 200 })]);
      const byId = Object.fromEntries(patients.map((p) => [p.id, p]));
      const missingIds = [...new Set(triages.map((t) => t.patient_id))].filter((id) => !byId[id]);
      const extra = await Promise.allSettled(missingIds.map((id) => apiClient.getPatient(id)));
      extra.forEach((result) => {
        if (result.status === 'fulfilled' && result.value) byId[result.value.id] = result.value;
      });
      setPatientsById(byId);
      setQueue(triages);
      setNow(Date.now());
    } catch (err) {
      setLoadError(getErrorMessage(err, 'No fue posible cargar la cola de triaje.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  const openFor = async (item, view) => {
    const key = `${item.id}:${view}`;
    setBusyKey(key);
    setActionError('');
    try {
      let triage = item;
      if (view === 'hce' && item.status === 'PENDIENTE') {
        await apiClient.updateTriageStatus(item.id, 'EN_ATENCION');
        triage = { ...item, status: 'EN_ATENCION' };
      }
      // El detalle del paciente incluye alergias vigentes, requeridas por HCE y prescripcion
      const patient = await apiClient.getPatient(item.patient_id);
      onSelectPatient(patient, triage);
      onNavigate(view);
    } catch (err) {
      setActionError(getErrorMessage(err, 'No fue posible abrir el paciente seleccionado.'));
    } finally {
      setBusyKey('');
    }
  };

  const filtered = useMemo(() => {
    const term = searchFilter.trim().toLowerCase();
    return queue.filter((t) => {
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      if (!term) return true;
      const patient = patientsById[t.patient_id];
      return (
        getFullName(patient).toLowerCase().includes(term) ||
        String(patient?.document_number ?? '').toLowerCase().includes(term)
      );
    });
  }, [queue, patientsById, searchFilter, statusFilter]);

  const pendingCount = queue.filter((t) => t.status === 'PENDIENTE').length;
  const inAttentionCount = queue.filter((t) => t.status === 'EN_ATENCION').length;
  const criticalCount = queue.filter((t) => CRITICAL_LEVELS.includes(t.manchester_level)).length;
  const levelOneCount = queue.filter((t) => t.manchester_level === 'NIVEL_I').length;
  const waits = queue.filter((t) => t.status === 'PENDIENTE').map((t) => minutesSince(t.created_at, now));
  const averageWait = waits.length > 0 ? Math.round(waits.reduce((a, b) => a + b, 0) / waits.length) : 0;
  const branch = apiClient.user?.branch;

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-white rounded-2xl p-6 shadow-xs border border-surface-container-high flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 flex-wrap text-xs font-semibold">
            <span className="px-2 py-0.5 rounded bg-primary-fixed text-on-primary-fixed-variant uppercase tracking-wider font-bold">
              Módulo de Flujo Continuo
            </span>
            {branch && (
              <span className="text-secondary font-bold flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5" /> {branch}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-on-surface tracking-tight mt-1">
            Sala de Espera y Control de Demanda Asistencial
          </h1>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center bg-surface-container-low rounded-xl px-3 h-11 border border-outline-variant/30 text-xs font-semibold">
            <Filter className="w-4 h-4 text-outline mr-2" aria-hidden="true" />
            <label htmlFor="dash-status" className="sr-only">Filtrar por estado</label>
            <select
              id="dash-status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-on-surface outline-none cursor-pointer pr-2"
            >
              <option value="all">Todos los estados</option>
              <option value="PENDIENTE">{TRIAGE_STATUS_LABELS.PENDIENTE}</option>
              <option value="EN_ATENCION">{TRIAGE_STATUS_LABELS.EN_ATENCION}</option>
            </select>
          </div>

          <div className="flex items-center bg-surface-container-low rounded-xl px-3 h-11 border border-outline-variant/30 text-xs w-56">
            <UserSearch className="w-4 h-4 text-outline mr-2" aria-hidden="true" />
            <label htmlFor="dash-search" className="sr-only">Filtrar paciente o documento</label>
            <input
              id="dash-search"
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Filtrar paciente o documento..."
              className="w-full bg-transparent outline-none placeholder:text-outline text-xs text-on-surface"
            />
          </div>

          <button
            type="button"
            onClick={loadQueue}
            disabled={loading}
            className="h-11 px-4 rounded-xl bg-primary hover:bg-primary-container text-white font-semibold text-xs flex items-center gap-2 shadow-xs transition-all cursor-pointer active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refrescar Cola</span>
          </button>
        </div>
      </div>

      {loadError && (
        <div role="alert" className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{loadError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-xs border border-surface-container-high flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-wider text-outline font-mono">Demanda Inicial</span>
              <span className="text-sm font-bold text-on-surface mt-0.5">En Espera de Médico</span>
            </div>
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary"><Hourglass className="w-5 h-5" /></div>
          </div>
          <div className="mt-4 flex items-baseline gap-1.5">
            <span className="text-3xl font-extrabold text-on-surface">{pendingCount}</span>
            <span className="text-xs text-on-surface-variant font-medium">pacientes</span>
          </div>
          <div className="w-full bg-surface-container-low h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="bg-primary h-full rounded-full" style={{ width: `${percent(pendingCount, queue.length)}%` }}></div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-xs border border-surface-container-high flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-wider text-outline font-mono">Capacidad Operativa</span>
              <span className="text-sm font-bold text-on-surface mt-0.5">En Atención</span>
            </div>
            <div className="p-2.5 rounded-xl bg-secondary-fixed text-secondary"><Stethoscope className="w-5 h-5" /></div>
          </div>
          <div className="mt-4 flex items-baseline gap-1.5">
            <span className="text-3xl font-extrabold text-on-surface">{inAttentionCount}</span>
            <span className="text-xs text-on-surface-variant font-medium">pacientes</span>
          </div>
          <div className="w-full bg-surface-container-low h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="bg-secondary h-full rounded-full" style={{ width: `${percent(inAttentionCount, queue.length)}%` }}></div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-xs border border-surface-container-high flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-wider text-outline font-mono">Atención Inmediata</span>
              <span className="text-sm font-bold text-on-surface mt-0.5">Casos Críticos (Nivel I y II)</span>
            </div>
            <div className="p-2.5 rounded-xl bg-red-100 text-red-600"><AlertOctagon className="w-5 h-5" /></div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-extrabold text-red-600">{criticalCount}</span>
              <span className="text-xs text-red-700 font-medium">pacientes activos</span>
            </div>
            <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800">
              {levelOneCount} en reanimación
            </span>
          </div>
          <div className="w-full bg-surface-container-low h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="bg-red-600 h-full rounded-full" style={{ width: `${percent(criticalCount, queue.length)}%` }}></div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-xs border border-surface-container-high flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-wider text-outline font-mono">Calidad Asistencial</span>
              <span className="text-sm font-bold text-on-surface mt-0.5">Espera Promedio</span>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-600"><Timer className="w-5 h-5" /></div>
          </div>
          <div className="mt-4 flex items-baseline gap-1.5">
            <span className="text-3xl font-extrabold text-on-surface">{averageWait}</span>
            <span className="text-xs text-on-surface-variant font-medium">min (pacientes en espera)</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-xs border border-surface-container-high overflow-hidden">
        <div className="p-5 border-b border-surface-container-high flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-on-surface">Cola de Pacientes y Categorización Manchester</h2>
            <p className="text-xs text-on-surface-variant">
              Ordenada por el servidor según prioridad clínica y antigüedad
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onNavigate('triage')}
              className="px-3.5 py-2 rounded-xl bg-surface-container-low hover:bg-surface-container text-primary font-semibold text-xs flex items-center gap-1.5 border border-outline-variant/30 cursor-pointer"
            >
              <HeartPulse className="w-4 h-4" />
              <span>Nuevo Triaje</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('hce')}
              className="px-3.5 py-2 rounded-xl bg-primary hover:bg-primary-container text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              <span>Abrir Historia Clínica</span>
            </button>
          </div>
        </div>

        {actionError && (
          <div role="alert" className="m-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}

        {loading ? (
          <p role="status" className="p-5 text-xs text-on-surface-variant flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Cargando cola de triaje...
          </p>
        ) : filtered.length === 0 ? (
          <p className="p-5 text-xs text-on-surface-variant">
            {queue.length === 0
              ? 'No hay pacientes pendientes ni en atención en la cola de triaje.'
              : 'Ningún paciente coincide con los filtros aplicados.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-container-low text-outline font-mono uppercase text-[10px] tracking-wider border-b border-surface-container-high">
                <tr>
                  <th className="py-3 px-4">Prioridad / Nivel</th>
                  <th className="py-3 px-4">Paciente & Identificación</th>
                  <th className="py-3 px-4">Signos Vitales & Motivo</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4">Tiempo Espera</th>
                  <th className="py-3 px-4 text-right">Acción Asistencial</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-high">
                {filtered.map((item) => {
                  const level = getManchesterInfo(item.manchester_level);
                  const patient = patientsById[item.patient_id];
                  const age = calculateAge(patient?.birth_date);
                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-surface-container-low/50 transition-colors border-l-4 ${level.borderColor}`}
                    >
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider inline-block shadow-2xs ${level.color}`}>
                          {level.number} {level.name && `| ${level.name}`}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-sm text-on-surface">{getFullName(patient) || 'Paciente no disponible'}</div>
                        <div className="font-mono text-[11px] text-on-surface-variant">
                          {patient ? `${patient.document_type} ${patient.document_number}` : item.patient_id}
                          {age !== null ? ` | ${age} años` : ''}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="font-mono text-xs font-semibold text-on-surface">
                          PA {item.systolic_bp}/{item.diastolic_bp} | FC {item.heart_rate} | SpO2 {item.oxygen_saturation}%
                        </div>
                        <div className="text-[11px] text-on-surface-variant truncate" title={item.reason_for_consultation}>
                          {item.reason_for_consultation}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded bg-surface-container-high text-on-surface font-semibold text-[11px]">
                          {TRIAGE_STATUS_LABELS[item.status] ?? item.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-xs text-on-surface">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-outline" />
                          <span>{formatWait(minutesSince(item.created_at, now))}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openFor(item, 'triage')}
                            disabled={Boolean(busyKey)}
                            className="px-2.5 py-1.5 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface text-[11px] font-semibold border border-outline-variant/30 transition-all cursor-pointer disabled:opacity-50"
                          >
                            Ver Triaje
                          </button>
                          <button
                            type="button"
                            onClick={() => openFor(item, 'hce')}
                            disabled={Boolean(busyKey)}
                            className="px-3 py-1.5 rounded-lg bg-primary hover:bg-primary-container text-white text-[11px] font-bold shadow-xs transition-all flex items-center gap-1 cursor-pointer active:scale-95 disabled:opacity-50"
                          >
                            {busyKey === `${item.id}:hce` ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                            <span>Llamar HCE</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardScreen;
