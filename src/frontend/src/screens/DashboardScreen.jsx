import React, { useState } from 'react';
import {
  Hourglass,
  DoorOpen,
  AlertOctagon,
  Award,
  Filter,
  UserSearch,
  RefreshCw,
  Clock,
  ArrowRight,
  Activity,
  FileText,
  HeartPulse,
  Building2,
  CheckCircle2,
} from 'lucide-react';

export const DashboardScreen = ({ onSelectPatient, onNavigate }) => {
  const [filterService, setFilterService] = useState('all');
  const [searchFilter, setSearchFilter] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const initialPatients = [
    {
      id: 'p-01',
      recordId: 'rec-01',
      name: 'Carlos Eduardo Mendoza Gomez',
      doc: 'CC 1.118.234.901',
      age: 47,
      vitals: 'PA 158/98 • FC 112 • SpO2 91%',
      discriminator: 'Dolor toracico opresivo / HTA Estadio 2',
      level: 'NIVEL II',
      levelName: 'MUY URGENTE',
      levelColor: 'bg-orange-500 text-white',
      borderColor: 'border-l-orange-500',
      waitTime: '06 min',
      box: 'Box Triage #02',
      status: 'En Espera de Medico',
    },
    {
      id: 'p-02',
      recordId: 'rec-02',
      name: 'Maria Helena Restrepo V.',
      doc: 'CC 31.984.112',
      age: 62,
      vitals: 'PA 85/50 • FC 142 • SpO2 86%',
      discriminator: 'Insuficiencia respiratoria aguda severa',
      level: 'NIVEL I',
      levelName: 'REANIMACION',
      levelColor: 'bg-red-600 text-white animate-pulse',
      borderColor: 'border-l-red-600',
      waitTime: '01 min',
      box: 'Box Reanimacion #01',
      status: 'Atencion Inmediata',
    },
    {
      id: 'p-03',
      recordId: 'rec-03',
      name: 'Juan Camilo Ortiz P.',
      doc: 'TI 1.098.455.102',
      age: 15,
      vitals: 'PA 118/74 • FC 88 • Temp 39.1°',
      discriminator: 'Dolor abdominal fosa iliaca derecha (EVA 6)',
      level: 'NIVEL III',
      levelName: 'URGENTE',
      levelColor: 'bg-amber-500 text-amber-950 font-bold',
      borderColor: 'border-l-amber-500',
      waitTime: '18 min',
      box: 'Consultorio #03',
      status: 'En Espera',
    },
    {
      id: 'p-04',
      recordId: 'rec-04',
      name: 'Rosa Ines Caicedo',
      doc: 'CC 29.871.309',
      age: 54,
      vitals: 'PA 122/80 • FC 76 • SpO2 98%',
      discriminator: 'Cefalea tensional sin signos de alarma (EVA 3)',
      level: 'NIVEL IV',
      levelName: 'MENOR URGENCIA',
      levelColor: 'bg-emerald-600 text-white',
      borderColor: 'border-l-emerald-600',
      waitTime: '24 min',
      box: 'Sala General',
      status: 'En Espera',
    },
    {
      id: 'p-05',
      recordId: 'rec-05',
      name: 'Andres Felipe Vargas',
      doc: 'CC 1.113.882.441',
      age: 31,
      vitals: 'PA 120/78 • FC 70 • Afebril',
      discriminator: 'Retiro de puntos sutura / Curacion menor',
      level: 'NIVEL V',
      levelName: 'NO URGENTE',
      levelColor: 'bg-blue-600 text-white',
      borderColor: 'border-l-blue-600',
      waitTime: '12 min',
      box: 'Procedimientos',
      status: 'En Espera',
    },
  ];

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 500);
  };

  const filtered = initialPatients.filter((p) => {
    if (searchFilter && !p.name.toLowerCase().includes(searchFilter.toLowerCase()) && !p.doc.includes(searchFilter)) {
      return false;
    }
    return true;
  });

  return (
    <div className="flex flex-col gap-6">
      {/* BANNER DE CONTEXTO ASISTENCIAL */}
      <div className="bg-white rounded-2xl p-6 shadow-xs border border-surface-container-high flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 flex-wrap text-xs font-semibold">
            <span className="px-2 py-0.5 rounded bg-primary-fixed text-on-primary-fixed-variant uppercase tracking-wider font-bold">
              Modulo de Flujo Continuo
            </span>
            <span className="text-outline">•</span>
            <span className="text-secondary font-bold flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5" /> Sede Cartago - Central
            </span>
            <span className="text-outline">•</span>
            <span className="text-on-surface-variant font-medium">Servicio de Urgencias & Consulta Prioritaria</span>
          </div>
          <div className="flex items-baseline gap-3 mt-1">
            <h1 className="text-2xl font-bold text-on-surface tracking-tight">
              Sala de Espera y Control de Demanda Asistencial
            </h1>
            <span className="font-mono text-xs text-on-surface-variant hidden md:inline">
              Turno Manana [07:00 - 13:00 COT]
            </span>
          </div>
        </div>

        {/* CONTROLES DE FILTRO Y REFRESH */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center bg-surface-container-low rounded-xl px-3 h-11 border border-outline-variant/30 text-xs font-semibold">
            <Filter className="w-4 h-4 text-outline mr-2" />
            <select
              value={filterService}
              onChange={(e) => setFilterService(e.target.value)}
              className="bg-transparent text-on-surface outline-none cursor-pointer pr-2"
            >
              <option value="all">Todos los servicios (Urg + Pri)</option>
              <option value="triage">Triage Urgencias</option>
              <option value="gen">Medicina General</option>
              <option value="ped">Pediatria Urgencias</option>
            </select>
          </div>

          <div className="flex items-center bg-surface-container-low rounded-xl px-3 h-11 border border-outline-variant/30 text-xs w-56">
            <UserSearch className="w-4 h-4 text-outline mr-2" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Filtrar paciente o CC..."
              className="w-full bg-transparent outline-none placeholder:text-outline text-xs text-on-surface"
            />
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            className="h-11 px-4 rounded-xl bg-primary hover:bg-primary-container text-white font-semibold text-xs flex items-center gap-2 shadow-xs transition-all cursor-pointer active:scale-95"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refrescar Cola</span>
          </button>
        </div>
      </div>

      {/* 4 TARJETAS KPI EN TIEMPO REAL */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* KPI 1: ESPERA TRIAGE */}
        <div className="bg-white rounded-2xl p-5 shadow-xs border border-surface-container-high relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-wider text-outline font-mono">
                Demanda Inicial
              </span>
              <span className="text-sm font-bold text-on-surface mt-0.5">En Espera de Triage</span>
            </div>
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <Hourglass className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-extrabold text-on-surface">14</span>
              <span className="text-xs text-on-surface-variant font-medium">pacientes</span>
            </div>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-primary-fixed text-on-primary-fixed-variant">
              8.2 min prom. (OPTIMO)
            </span>
          </div>
          <div className="w-full bg-surface-container-low h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="bg-primary h-full rounded-full" style={{ width: '58%' }}></div>
          </div>
        </div>

        {/* KPI 2: CONSULTORIOS ACTIVOS */}
        <div className="bg-white rounded-2xl p-5 shadow-xs border border-surface-container-high relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-wider text-outline font-mono">
                Capacidad Operativa
              </span>
              <span className="text-sm font-bold text-on-surface mt-0.5">Consultorios Activos</span>
            </div>
            <div className="p-2.5 rounded-xl bg-secondary-fixed text-secondary">
              <DoorOpen className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-extrabold text-on-surface">6<span className="text-lg text-outline font-normal">/8</span></span>
              <span className="text-xs text-on-surface-variant font-medium">en atencion</span>
            </div>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-surface-container-high text-on-surface">
              75% Ocupacion
            </span>
          </div>
          <div className="w-full bg-surface-container-low h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="bg-secondary h-full rounded-full" style={{ width: '75%' }}></div>
          </div>
        </div>

        {/* KPI 3: CASOS CRITICOS */}
        <div className="bg-white rounded-2xl p-5 shadow-xs border border-surface-container-high relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-wider text-outline font-mono">
                Atencion Inmediata
              </span>
              <span className="text-sm font-bold text-on-surface mt-0.5">Casos Criticos (Nivel I y II)</span>
            </div>
            <div className="p-2.5 rounded-xl bg-red-100 text-red-600">
              <AlertOctagon className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-extrabold text-red-600">3</span>
              <span className="text-xs text-red-700 font-medium">pacientes activos</span>
            </div>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800">
              0 en reanimacion libre
            </span>
          </div>
          <div className="w-full bg-surface-container-low h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="bg-red-600 h-full rounded-full" style={{ width: '100%' }}></div>
          </div>
        </div>

        {/* KPI 4: PUERTA-MEDICO */}
        <div className="bg-white rounded-2xl p-5 shadow-xs border border-surface-container-high relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-wider text-outline font-mono">
                Calidad Asistencial
              </span>
              <span className="text-sm font-bold text-on-surface mt-0.5">Cumplimiento Puerta-Medico</span>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-600">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-extrabold text-on-surface">96.4%</span>
              <span className="text-xs text-on-surface-variant font-medium">meta Res. 3100</span>
            </div>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
              Calidad Optima
            </span>
          </div>
          <div className="w-full bg-surface-container-low h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="bg-emerald-600 h-full rounded-full" style={{ width: '96%' }}></div>
          </div>
        </div>
      </div>

      {/* TABLA DE COLA MANCHESTER EN TIEMPO REAL */}
      <div className="bg-white rounded-2xl shadow-xs border border-surface-container-high overflow-hidden">
        <div className="p-5 border-b border-surface-container-high flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-on-surface">
              Cola de Pacientes y Categorizacion Manchester
            </h2>
            <p className="text-xs text-on-surface-variant">
              Ordenamiento dinamico por prioridad clinica internacional de 5 niveles
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
              <span>Abrir Historia Clinica</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-container-low text-outline font-mono uppercase text-[10px] tracking-wider border-b border-surface-container-high">
              <tr>
                <th className="py-3 px-4">Prioridad / Nivel</th>
                <th className="py-3 px-4">Paciente & Identificacion</th>
                <th className="py-3 px-4">Signos Vitales & Discriminador</th>
                <th className="py-3 px-4">Ubicacion / Box</th>
                <th className="py-3 px-4">Tiempo Espera</th>
                <th className="py-3 px-4 text-right">Accion Asistencial</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-high">
              {filtered.map((item) => (
                <tr
                  key={item.id}
                  className={`hover:bg-surface-container-low/50 transition-colors border-l-4 ${item.borderColor}`}
                >
                  <td className="py-3.5 px-4">
                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider inline-block shadow-2xs ${item.levelColor}`}>
                      {item.level} • {item.levelName}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-sm text-on-surface">{item.name}</div>
                    <div className="font-mono text-[11px] text-on-surface-variant">{item.doc} • {item.age} anos</div>
                  </td>
                  <td className="py-3.5 px-4 max-w-xs">
                    <div className="font-mono text-xs font-semibold text-on-surface">{item.vitals}</div>
                    <div className="text-[11px] text-on-surface-variant truncate" title={item.discriminator}>
                      {item.discriminator}
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded bg-surface-container-high text-on-surface font-semibold text-[11px]">
                      {item.box}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono font-bold text-xs text-on-surface">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-outline" />
                      <span>{item.waitTime}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          if (onSelectPatient) onSelectPatient(item);
                          onNavigate('triage');
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface text-[11px] font-semibold border border-outline-variant/30 transition-all cursor-pointer"
                      >
                        Ver Triage
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (onSelectPatient) onSelectPatient(item);
                          onNavigate('hce');
                        }}
                        className="px-3 py-1.5 rounded-lg bg-primary hover:bg-primary-container text-white text-[11px] font-bold shadow-xs transition-all flex items-center gap-1 cursor-pointer active:scale-95"
                      >
                        <span>Llamar HCE</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DashboardScreen;
