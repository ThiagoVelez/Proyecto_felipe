import React, { useState } from 'react';
import {
  HeartPulse,
  Activity,
  AlertTriangle,
  Clock,
  ShieldAlert,
  CheckCircle2,
  Stethoscope,
  Send,
  Building2,
  User,
  ArrowRight,
} from 'lucide-react';

export const TriageScreen = ({ onNavigate }) => {
  // Constantes vitales
  const [systolic, setSystolic] = useState('158');
  const [diastolic, setDiastolic] = useState('98');
  const [heartRate, setHeartRate] = useState('112');
  const [respRate, setRespRate] = useState('22');
  const [spO2, setSpO2] = useState('91');
  const [temp, setTemp] = useState('38.6');
  const [glycemia, setGlycemia] = useState('142');
  const [glasgow, setGlasgow] = useState('15');
  const [evaPain, setEvaPain] = useState('7');

  // Discriminador y categoria Manchester
  const [flowchart, setFlowchart] = useState('Dolor Toracico Agudo');
  const [selectedDiscriminator, setSelectedDiscriminator] = useState('Dolor irradiado a cuello/mandibula con diaforesis');
  const [triageSaved, setTriageSaved] = useState(false);

  // Validacion de valores limite de Glasgow [3, 15]
  const glasgowNum = parseInt(glasgow, 10);
  const isGlasgowInvalid = isNaN(glasgowNum) || glasgowNum < 3 || glasgowNum > 15;

  // Calculo automatico de prioridad Manchester
  let calculatedLevel = {
    number: 'NIVEL II',
    name: 'MUY URGENTE',
    maxWait: '15 minutos',
    color: 'bg-orange-500 text-white',
    badgeColor: 'bg-orange-100 text-orange-950 border-orange-300',
  };

  if (parseInt(spO2, 10) < 88 || parseInt(heartRate, 10) > 140 || glasgowNum < 9) {
    calculatedLevel = {
      number: 'NIVEL I',
      name: 'REANIMACION',
      maxWait: 'Inmediata (0 min)',
      color: 'bg-red-600 text-white',
      badgeColor: 'bg-red-100 text-red-950 border-red-300',
    };
  } else if (parseInt(systolic, 10) < 140 && parseInt(spO2, 10) >= 95 && parseInt(evaPain, 10) < 5) {
    calculatedLevel = {
      number: 'NIVEL III',
      name: 'URGENTE',
      maxWait: '30 minutos',
      color: 'bg-amber-500 text-amber-950',
      badgeColor: 'bg-amber-100 text-amber-950 border-amber-300',
    };
  }

  const handleSaveTriage = (e) => {
    e.preventDefault();
    if (isGlasgowInvalid) {
      alert('Error de valor limite: La escala de Glasgow debe encontrarse estrictamente entre 3 y 15 puntos.');
      return;
    }

    setTriageSaved(true);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* BANNER FIJO DEL PACIENTE EN VALORACION */}
      <section className="bg-white rounded-2xl p-5 shadow-xs border border-surface-container-high">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-2.5 h-12 rounded-full bg-orange-500 shrink-0"></div>
            <div className="flex flex-col">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-on-surface">Carlos Eduardo Mendoza Gomez</h1>
                <span className="px-2 py-0.5 rounded bg-surface-container-high text-on-surface-variant font-mono text-xs">
                  CC 1.118.234.901
                </span>
                <span className="px-2 py-0.5 rounded bg-orange-500 text-white font-bold text-[10px] uppercase tracking-wider">
                  TRIAGE II • EN PROCESO
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 text-xs text-on-surface-variant mt-1">
                <span><strong>47 anos</strong> (14/05/1977)</span>
                <span>•</span>
                <span className="font-semibold text-primary">Nueva EPS Contributivo Activo</span>
                <span>•</span>
                <span>Acomp: <strong>Maria Gomez</strong> (Conyuge - 315-7890123)</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 bg-surface-container-low px-4 py-2.5 rounded-xl border border-outline-variant/30 text-xs">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-outline" />
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-mono text-outline font-bold">Arribo</span>
                <span className="font-mono font-bold text-on-surface">08:14 AM</span>
              </div>
            </div>
            <div className="h-5 w-px bg-outline-variant/50"></div>
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-red-600 animate-pulse" />
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-mono text-red-700 font-bold">Espera Triaje</span>
                <span className="font-mono font-bold text-red-700">06 min</span>
              </div>
            </div>
            <div className="h-5 w-px bg-outline-variant/50"></div>
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" />
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-mono text-outline font-bold">Ubicacion</span>
                <span className="font-semibold text-primary">Box Triage #02</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ALERTA DINAMICA DE UMBRALES FISIOLOGICOS (INTERCEPTOR DE RIESGO) */}
      <div className="bg-red-50 border-l-4 border-red-600 p-4 rounded-xl flex items-start justify-between shadow-xs gap-3">
        <div className="flex items-center gap-3">
          <ShieldAlert className="w-6 h-6 text-red-600 shrink-0" />
          <div>
            <span className="font-bold text-xs uppercase tracking-wider text-red-900 block">
              Alerta Critica de Constantes Fisiologicas:
            </span>
            <p className="text-xs text-red-800 mt-0.5">
              Los valores registrados de <strong>SpO2 ({spO2}%)</strong> y <strong>Presion Arterial ({systolic}/{diastolic} mmHg)</strong> sobrepasan los umbrales seguros para Triage Nivel III/IV. Exige categorizacion prioritaria bajo Protocolo Valle-URG-102.
            </p>
          </div>
        </div>
        <span className="hidden md:inline-flex px-2 py-1 rounded bg-white text-red-700 font-mono text-[10px] font-bold tracking-tight shadow-xs border border-red-200 shrink-0">
          PROTOCOLO VALLE-URG-102
        </span>
      </div>

      {/* GRID BENTO: 2 COLUMNAS ERGONOMICAS */}
      <form onSubmit={handleSaveTriage} className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* COLUMNA IZQUIERDA: SIGNOS VITALES (7 COLS) */}
        <div className="xl:col-span-7 flex flex-col gap-6">
          <div className="bg-white rounded-2xl p-6 shadow-xs border border-surface-container-high flex flex-col gap-5">
            <div className="flex items-center justify-between border-b border-surface-container-high pb-3">
              <div className="flex items-center gap-2">
                <HeartPulse className="w-5 h-5 text-primary" />
                <h2 className="text-base font-bold text-on-surface">Captura de Signos Vitales y Parametros</h2>
              </div>
              <span className="text-xs font-mono text-outline">Entrada Digital Haptica</span>
            </div>

            {/* GRID DE ENTRADAS NUMERICAS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
              {/* Presion Arterial */}
              <div className="p-3.5 rounded-xl bg-surface-container-low border-2 border-red-500 shadow-2xs">
                <div className="flex justify-between items-start text-xs font-semibold mb-1">
                  <span>P. Arterial (Sist/Diast)</span>
                  <span className="px-1.5 py-0.2 rounded bg-red-600 text-white text-[10px] font-bold">HTA Est. 2</span>
                </div>
                <div className="flex items-baseline gap-1 my-1">
                  <input
                    type="number"
                    value={systolic}
                    onChange={(e) => setSystolic(e.target.value)}
                    className="w-16 bg-white font-bold text-base px-2 py-1 rounded border border-outline-variant/40 outline-none focus:border-primary text-center"
                  />
                  <span className="text-outline font-bold">/</span>
                  <input
                    type="number"
                    value={diastolic}
                    onChange={(e) => setDiastolic(e.target.value)}
                    className="w-16 bg-white font-bold text-base px-2 py-1 rounded border border-outline-variant/40 outline-none focus:border-primary text-center"
                  />
                  <span className="text-xs font-mono font-bold text-on-surface-variant ml-1">mmHg</span>
                </div>
                <div className="text-[10px] text-on-surface-variant">Norma: 90/60 - 120/80</div>
              </div>

              {/* Frecuencia Cardiaca */}
              <div className="p-3.5 rounded-xl bg-surface-container-low border-2 border-orange-500 shadow-2xs">
                <div className="flex justify-between items-start text-xs font-semibold mb-1">
                  <span>Frecuencia Cardiaca</span>
                  <span className="px-1.5 py-0.2 rounded bg-orange-600 text-white text-[10px] font-bold">Taquicardia</span>
                </div>
                <div className="flex items-baseline gap-1 my-1">
                  <input
                    type="number"
                    value={heartRate}
                    onChange={(e) => setHeartRate(e.target.value)}
                    className="w-20 bg-white font-bold text-base px-2 py-1 rounded border border-outline-variant/40 outline-none focus:border-primary text-center"
                  />
                  <span className="text-xs font-mono font-bold text-on-surface-variant ml-1">lpm</span>
                </div>
                <div className="text-[10px] text-on-surface-variant">Norma: 60 - 100 lpm</div>
              </div>

              {/* SpO2 */}
              <div className="p-3.5 rounded-xl bg-surface-container-low border-2 border-orange-500 shadow-2xs">
                <div className="flex justify-between items-start text-xs font-semibold mb-1">
                  <span>Saturacion O2</span>
                  <span className="px-1.5 py-0.2 rounded bg-orange-600 text-white text-[10px] font-bold">Hipoxemia</span>
                </div>
                <div className="flex items-baseline gap-1 my-1">
                  <input
                    type="number"
                    value={spO2}
                    onChange={(e) => setSpO2(e.target.value)}
                    className="w-20 bg-white font-bold text-base px-2 py-1 rounded border border-outline-variant/40 outline-none focus:border-primary text-center"
                  />
                  <span className="text-xs font-mono font-bold text-on-surface-variant ml-1">%</span>
                </div>
                <div className="text-[10px] text-on-surface-variant">Norma: &gt; 95% al aire ambiente</div>
              </div>

              {/* Frecuencia Respiratoria */}
              <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/30">
                <div className="flex justify-between items-start text-xs font-semibold mb-1">
                  <span>Frec. Respiratoria</span>
                  <span className="text-[10px] text-outline font-mono">FR</span>
                </div>
                <div className="flex items-baseline gap-1 my-1">
                  <input
                    type="number"
                    value={respRate}
                    onChange={(e) => setRespRate(e.target.value)}
                    className="w-20 bg-white font-bold text-base px-2 py-1 rounded border border-outline-variant/40 outline-none focus:border-primary text-center"
                  />
                  <span className="text-xs font-mono font-bold text-on-surface-variant ml-1">rpm</span>
                </div>
                <div className="text-[10px] text-on-surface-variant">Norma: 12 - 20 rpm</div>
              </div>

              {/* Temperatura */}
              <div className="p-3.5 rounded-xl bg-surface-container-low border-2 border-red-400 shadow-2xs">
                <div className="flex justify-between items-start text-xs font-semibold mb-1">
                  <span>Temperatura</span>
                  <span className="px-1.5 py-0.2 rounded bg-red-600 text-white text-[10px] font-bold">Febril</span>
                </div>
                <div className="flex items-baseline gap-1 my-1">
                  <input
                    type="number"
                    step="0.1"
                    value={temp}
                    onChange={(e) => setTemp(e.target.value)}
                    className="w-20 bg-white font-bold text-base px-2 py-1 rounded border border-outline-variant/40 outline-none focus:border-primary text-center"
                  />
                  <span className="text-xs font-mono font-bold text-on-surface-variant ml-1">°C</span>
                </div>
                <div className="text-[10px] text-on-surface-variant">Norma: 36.5 - 37.5 °C</div>
              </div>

              {/* Glucometria Capilar */}
              <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/30">
                <div className="flex justify-between items-start text-xs font-semibold mb-1">
                  <span>Glucometria</span>
                  <span className="text-[10px] text-outline font-mono">HGT</span>
                </div>
                <div className="flex items-baseline gap-1 my-1">
                  <input
                    type="number"
                    value={glycemia}
                    onChange={(e) => setGlycemia(e.target.value)}
                    className="w-20 bg-white font-bold text-base px-2 py-1 rounded border border-outline-variant/40 outline-none focus:border-primary text-center"
                  />
                  <span className="text-xs font-mono font-bold text-on-surface-variant ml-1">mg/dL</span>
                </div>
                <div className="text-[10px] text-on-surface-variant">Norma: 70 - 140 mg/dL</div>
              </div>

              {/* Escala de Glasgow con Validacion Estricta de Limites [3, 15] */}
              <div className={`p-3.5 rounded-xl bg-surface-container-low border-2 ${isGlasgowInvalid ? 'border-red-600 bg-red-50' : 'border-outline-variant/30'}`}>
                <div className="flex justify-between items-start text-xs font-semibold mb-1">
                  <span>Escala Glasgow</span>
                  <span className="text-[10px] font-mono font-bold text-outline">Particion [3, 15]</span>
                </div>
                <div className="flex items-baseline gap-1 my-1">
                  <input
                    type="number"
                    min="3"
                    max="15"
                    value={glasgow}
                    onChange={(e) => setGlasgow(e.target.value)}
                    className="w-20 bg-white font-bold text-base px-2 py-1 rounded border border-outline-variant/40 outline-none focus:border-primary text-center"
                  />
                  <span className="text-xs font-mono font-bold text-on-surface-variant ml-1">/ 15</span>
                </div>
                {isGlasgowInvalid ? (
                  <div className="text-[10px] font-bold text-red-700">Invalido: rango [3 a 15]</div>
                ) : (
                  <div className="text-[10px] text-emerald-700 font-semibold">Respuesta verbal/motora integra</div>
                )}
              </div>

              {/* Escala Visual Analogica del Dolor EVA */}
              <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/30 col-span-1 sm:col-span-2">
                <div className="flex justify-between items-start text-xs font-semibold mb-1">
                  <span>Escala de Dolor (EVA: {evaPain}/10)</span>
                  <span className="px-2 py-0.5 rounded bg-orange-100 text-orange-950 font-bold text-[10px]">
                    Dolor Severo
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={evaPain}
                  onChange={(e) => setEvaPain(e.target.value)}
                  className="w-full accent-primary cursor-pointer my-2"
                />
                <div className="flex justify-between text-[10px] font-mono text-outline">
                  <span>0 (Sin Dolor)</span>
                  <span>5 (Moderado)</span>
                  <span>10 (Maximo Insuperable)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* COLUMNA DERECHA: FLUJOGRAMA MANCHESTER Y CATEGORIZACION (5 COLS) */}
        <div className="xl:col-span-5 flex flex-col gap-6">
          <div className="bg-white rounded-2xl p-6 shadow-xs border border-surface-container-high flex flex-col gap-5">
            <div className="border-b border-surface-container-high pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-primary" />
                <h2 className="text-base font-bold text-on-surface">Flujograma y Discriminador</h2>
              </div>
              <span className="text-[11px] font-bold text-primary bg-primary-fixed px-2 py-0.5 rounded">
                Manchester v2.4
              </span>
            </div>

            {/* Selector de Flujograma */}
            <div>
              <label className="block text-xs font-semibold text-on-surface mb-1">
                Flujograma Sintomatico Principal
              </label>
              <select
                value={flowchart}
                onChange={(e) => setFlowchart(e.target.value)}
                className="w-full h-11 px-3 rounded-lg bg-surface-container-low text-xs font-semibold border border-outline-variant/40 outline-none focus:border-primary cursor-pointer"
              >
                <option>Dolor Toracico Agudo</option>
                <option>Dificultad Respiratoria en Adultos</option>
                <option>Cefalea y Signos Neurologicos</option>
                <option>Dolor Abdominal Agudo</option>
                <option>Trauma Mayor / Extremidades</option>
                <option>Sintomas Infecciosos / Sepsis</option>
              </select>
            </div>

            {/* Discriminadores Criticos */}
            <div>
              <label className="block text-xs font-semibold text-on-surface mb-1.5">
                Discriminador de Riesgo Clinico
              </label>
              <div className="space-y-2 text-xs">
                {[
                  'Compromiso evidente de via aerea o estridor (Nivel I)',
                  'Dolor irradiado a cuello/mandibula con diaforesis (Nivel II)',
                  'Dolor precordial pleuritico sin disnea en reposo (Nivel III)',
                  'Dolor muscular de pared toracica reproducible a la palpacion (Nivel IV)',
                ].map((disc, idx) => (
                  <label
                    key={idx}
                    className={`flex items-start gap-2.5 p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                      selectedDiscriminator === disc
                        ? 'bg-primary/10 border-primary font-semibold text-primary'
                        : 'bg-surface-container-low border-outline-variant/30 text-on-surface hover:bg-surface-container'
                    }`}
                  >
                    <input
                      type="radio"
                      name="discriminator"
                      checked={selectedDiscriminator === disc}
                      onChange={() => setSelectedDiscriminator(disc)}
                      className="mt-0.5 accent-primary"
                    />
                    <span>{disc}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* TARJETA DE RESULTADO DE CLASIFICACION */}
            <div className={`p-4 rounded-xl border-2 ${calculatedLevel.badgeColor} space-y-2 shadow-xs`}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider font-mono">
                  Categorizacion Determinada
                </span>
                <span className="text-xs font-bold font-mono">Tiempo Max: {calculatedLevel.maxWait}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className={`px-3 py-1.5 rounded-lg text-sm font-extrabold uppercase tracking-wide ${calculatedLevel.color}`}>
                  {calculatedLevel.number} • {calculatedLevel.name}
                </div>
              </div>
              <p className="text-[11px] text-on-surface-variant leading-relaxed">
                Derivacion obligatoria a <strong>Box de Atencion Medica Prioritaria</strong>. Parametros hemodinamicos transmitidos a central de monitoreo.
              </p>
            </div>

            {triageSaved ? (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 space-y-3">
                <div className="flex items-center gap-2 font-bold text-xs">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>Triaje Manchester Guardado y Manilla Digital Emitida</span>
                </div>
                <p className="text-xs text-emerald-900 leading-snug">
                  El paciente ha sido priorizado como {calculatedLevel.number} en la cola de atencion.
                </p>
                <button
                  type="button"
                  onClick={() => onNavigate('hce')}
                  className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-lg shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <span>Proceder a Historia Clinica (HCE)</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="submit"
                className="w-full h-12 bg-primary hover:bg-primary-container text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
              >
                <Send className="w-4 h-4" />
                <span>Confirmar Categorizacion Manchester & Manilla</span>
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};

export default TriageScreen;

