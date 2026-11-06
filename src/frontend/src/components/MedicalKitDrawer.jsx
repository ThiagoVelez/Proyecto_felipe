import React, { useState, useEffect } from 'react';
import {
  Activity,
  Layers,
  RotateCw,
  CheckCircle2,
  AlertCircle,
  Stethoscope,
  X,
  Plus,
  Trash2,
  Edit3,
  ArrowRight,
  ShieldCheck,
  Lock,
  User,
  Heart,
  FileText,
  BadgeAlert
} from 'lucide-react';
import api from '../services/api';

// Definicion del catalogo de estructuras anatomicas con semiologia y sugerencias CIE-11
const ANATOMICAL_STRUCTURES = {
  heart: {
    name: 'Corazón y Válvula Aórtica',
    layer: 'organs',
    view: 'anterior',
    semiology: 'Auscultar focos cardiacos, valorar soplos, ruidos agregados y descartar sindrome coronario agudo o disnea paroxistica.',
    cie11Hint: 'BA41 - Síndrome coronario agudo',
    cx: 200,
    cy: 165
  },
  lungs: {
    name: 'Pulmones y Parénquima Pleural',
    layer: 'organs',
    view: 'anterior',
    semiology: 'Inspeccionar expansion toracica, vibraciones vocales y descartar estertores, sibilancias o consolidacion basal.',
    cie11Hint: 'CA40 - Neumonía adquirida en comunidad',
    cx: 235,
    cy: 160
  },
  liver_gallbladder: {
    name: 'Hígado y Vesícula Biliar',
    layer: 'organs',
    view: 'anterior',
    semiology: 'Palpacion en hipocondrio derecho. Explorar Signo de Murphy, hepatomegalia y descartar colelitiasis/colecistitis.',
    cie11Hint: 'DC11 - Colelitiasis o colecistitis aguda',
    cx: 175,
    cy: 205
  },
  stomach: {
    name: 'Estómago y Epigastrio',
    layer: 'organs',
    view: 'anterior',
    semiology: 'Palpacion epigastrica profunda. Descartar dispepsia ulerosa, reflujo gastroesofagico o pirosis irradiada.',
    cie11Hint: 'DA42 - Gastritis o duodenitis aguda',
    cx: 215,
    cy: 205
  },
  appendix: {
    name: 'Apéndice Cecal (Fosa Ilíaca Derecha)',
    layer: 'organs',
    view: 'anterior',
    semiology: 'Punto de McBurney. Explorar signo de Blumberg, Rovsing y descompresion brusca para descartar abdomen agudo.',
    cie11Hint: 'DB10 - Apendicitis aguda',
    cx: 175,
    cy: 265
  },
  kidneys: {
    name: 'Riñones y Fosas Lumbares',
    layer: 'organs',
    view: 'posterior',
    semiology: 'Maniobra de Giordano (punopercusion lumbar bilateral) y exploracion de puntos ureterales.',
    cie11Hint: 'GB40 - Nefritis tubulointersticial o colico renal',
    cx: 170,
    cy: 215
  },
  trapezius: {
    name: 'Músculo Trapecio y Cervicodorsal',
    layer: 'muscle',
    view: 'posterior',
    semiology: 'Palpacion de bandas tensas y puntos gatillo miofasciales cervicales asociados a contractura por sobrecarga.',
    cie11Hint: 'MC80 - Mialgia o contractura muscular',
    cx: 200,
    cy: 110
  },
  biceps_anterior: {
    name: 'Músculo Bíceps Braquial',
    layer: 'muscle',
    view: 'anterior',
    semiology: 'Test de Speed y Yergason para evaluar tendinopatia bicipital o sobrecarga de manguito rotador.',
    cie11Hint: 'FB40 - Tendinopatía o tendinitis bicipital',
    cx: 130,
    cy: 175
  },
  quadriceps: {
    name: 'Músculo Cuádriceps Femoral',
    layer: 'muscle',
    view: 'anterior',
    semiology: 'Evaluacion de fuerza muscular segun escala Medical Research Council (0-5) y palpacion de rotula.',
    cie11Hint: 'FB52 - Desgarro o distensión muscular del muslo',
    cx: 180,
    cy: 350
  },
  femoral_artery: {
    name: 'Arteria Femoral y Paquete Vascular',
    layer: 'vascular',
    view: 'anterior',
    semiology: 'Palpacion de pulso femoral en triangulo de Scarpa, simetria periferica y llenado capilar distal.',
    cie11Hint: 'BD11 - Insuficiencia vascular arterial periférica',
    cx: 185,
    cy: 330
  },
  aorta_vena_cava: {
    name: 'Eje Aortocava y Grandes Vasos',
    layer: 'vascular',
    view: 'anterior',
    semiology: 'Auscultacion de soplos abdominales sobre linea media y evaluacion de reflujo hepatoyugular.',
    cie11Hint: 'BD54 - Aneurisma o ectasia de aorta abdominal',
    cx: 200,
    cy: 220
  },
  lumbar_spine: {
    name: 'Columna Lumbar (L1 - L5)',
    layer: 'bone',
    view: 'posterior',
    semiology: 'Prueba de Lasegue y Bragard para radicualgia lumbociatica y percusion de apofisis espinosas.',
    cie11Hint: 'FA80 - Lumbalgia mecánica o radiculopatía',
    cx: 200,
    cy: 245
  },
  femur_bone: {
    name: 'Hueso Fémur y Cuello Femoral',
    layer: 'bone',
    view: 'anterior',
    semiology: 'Rotacion interna y externa de cadera. Descartar bursitis trocanterea o microfractura osea.',
    cie11Hint: 'NC12 - Fractura o lesion ósea de fémur',
    cx: 175,
    cy: 375
  },
  skull_bone: {
    name: 'Bóveda Craneal y Región Occipital',
    layer: 'bone',
    view: 'posterior',
    semiology: 'Palpacion de suturas, eminencias oseas craneales y descartar cefalea tensional u occipital de Arnold.',
    cie11Hint: '8A80 - Cefalea tensional primaria',
    cx: 200,
    cy: 50
  }
};

// Escala Visual Analogica EVA 0-10 con clasificaciones clinicas
const PAIN_LEVELS = [
  { score: 0, label: '0: Sin dolor', desc: 'Paciente asintomático, sin molestia nociceptiva ni limitación funcional.', color: 'bg-emerald-500', text: 'text-emerald-400' },
  { score: 1, label: '1: Leve casi imperceptible', desc: 'Dolor mínimo, no interfiere en actividades ni sueño.', color: 'bg-emerald-400', text: 'text-emerald-400' },
  { score: 2, label: '2: Leve tolerable', desc: 'Molestia perceptible pero de fácil adaptación.', color: 'bg-emerald-400', text: 'text-emerald-300' },
  { score: 3, label: '3: Leve perceptible', desc: 'Molestia constante que puede ignorarse con concentración.', color: 'bg-lime-500', text: 'text-lime-400' },
  { score: 4, label: '4: Moderado tolerable', desc: 'Interfiere con tareas que exigen alta atención.', color: 'bg-yellow-500', text: 'text-yellow-400' },
  { score: 5, label: '5: Moderado limitante', desc: 'Afecta la marcha, prensión o movimientos habituales.', color: 'bg-amber-500', text: 'text-amber-400' },
  { score: 6, label: '6: Moderado persistente', desc: 'Dificulta la realización de labores del día a día.', color: 'bg-orange-500', text: 'text-orange-400' },
  { score: 7, label: '7: Severo limitante', desc: 'Dificulta el descanso y la concentración básica.', color: 'bg-red-500', text: 'text-red-400' },
  { score: 8, label: '8: Severo intenso', desc: 'Incapacitante, impide actividades cotidianas.', color: 'bg-red-600', text: 'text-red-400' },
  { score: 9, label: '9: Severo lacerante', desc: 'Dolor extremo, llanto o agitación psicomotriz.', color: 'bg-rose-600', text: 'text-rose-400' },
  { score: 10, label: '10: Dolor máximo insoportable', desc: 'Requiere analgesia mayor intravenosa de rescate.', color: 'bg-rose-700', text: 'text-rose-400' },
];

export default function MedicalKitDrawer({
  isOpen,
  onClose,
  patient,
  recordId,
  readOnly = false,
  onInjectToHCE,
  embedded = false,
}) {
  const [activeLayer, setActiveLayer] = useState('organs'); // bone | muscle | organs | vascular
  const [viewOrientation, setViewOrientation] = useState('anterior'); // anterior | posterior
  const [painLevel, setPainLevel] = useState(0);
  const [selectedStructureKey, setSelectedStructureKey] = useState(null);
  const [observationModalOpen, setObservationModalOpen] = useState(false);
  const [observationText, setObservationText] = useState('');
  const [preliminaryCIE11, setPreliminaryCIE11] = useState('');
  const [structurePainScore, setStructurePainScore] = useState(5);
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [notesList, setNotesList] = useState([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  // Cargar notas al abrir el drawer o cambiar de paciente/folio
  useEffect(() => {
    if (!isOpen && !embedded) return;
    loadNotes();
  }, [isOpen, embedded, patient?.id, recordId]);

  const loadNotes = async () => {
    try {
      setLoadingNotes(true);
      let items = [];
      if (recordId) {
        items = await api.getRecordAnatomicalNotes(recordId);
      } else if (patient?.id) {
        items = await api.getPatientAnatomicalNotes(patient.id);
      }
      setNotesList(Array.isArray(items) ? items : []);
    } catch (err) {
      // Si falla en modo offline o demo, mantener lista local
      console.warn('Carga de notas anatómicas:', err);
    } finally {
      setLoadingNotes(false);
    }
  };

  if (!isOpen && !embedded) return null;

  const currentPainMeta = PAIN_LEVELS[painLevel] || PAIN_LEVELS[0];

  // Seleccionar estructura en el modelo
  const handleSelectStructure = (structureKey) => {
    const struct = ANATOMICAL_STRUCTURES[structureKey];
    if (!struct) return;

    setSelectedStructureKey(structureKey);
    setObservationText('');
    setPreliminaryCIE11(struct.cie11Hint || '');
    setStructurePainScore(painLevel > 0 ? painLevel : 5);
    setEditingNoteId(null);
    setObservationModalOpen(true);
  };

  // Abrir edicion de nota existente
  const handleEditNote = (note) => {
    if (readOnly) return;
    setSelectedStructureKey(note.structure_key);
    setObservationText(note.doctor_observation);
    setPreliminaryCIE11(note.preliminary_cie11 || '');
    setStructurePainScore(note.pain_level || 5);
    setEditingNoteId(note.id);
    setObservationModalOpen(true);
  };

  // Eliminar nota
  const handleDeleteNote = async (noteId) => {
    if (readOnly) return;
    try {
      await api.deleteAnatomicalNote(noteId);
      setNotesList(prev => prev.filter(n => n.id !== noteId));
      setStatusMessage('Nota anatómica eliminada.');
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err) {
      // Fallback local
      setNotesList(prev => prev.filter(n => n.id !== noteId));
    }
  };

  // Guardar observacion clínica
  const handleSaveObservation = async (e) => {
    e.preventDefault();
    if (readOnly || !selectedStructureKey) return;

    const struct = ANATOMICAL_STRUCTURES[selectedStructureKey];
    if (!struct) return;

    if (!observationText.trim()) {
      alert('La observación clínica o semiológica es obligatoria.');
      return;
    }

    try {
      setSavingNote(true);
      const notePayload = {
        clinical_record_id: recordId || null,
        patient_id: patient?.id,
        structure_key: selectedStructureKey,
        structure_name: struct.name,
        layer: struct.layer.toUpperCase(),
        view_orientation: struct.view.toUpperCase(),
        coordinates_x: struct.cx,
        coordinates_y: struct.cy,
        pain_level: Number(structurePainScore),
        doctor_observation: observationText.trim(),
        preliminary_cie11: preliminaryCIE11.trim(),
      };

      if (editingNoteId) {
        await api.updateAnatomicalNote(editingNoteId, notePayload);
        setNotesList(prev => prev.map(n => n.id === editingNoteId ? { ...n, ...notePayload, id: editingNoteId } : n));
        setStatusMessage('Observación clínica actualizada.');
      } else {
        const saved = await api.createAnatomicalNote(notePayload);
        const newItem = saved && saved.id ? saved : { ...notePayload, id: 'temp-' + Date.now() };
        setNotesList(prev => [newItem, ...prev]);
        setStatusMessage('Observación anatómica registrada exitosamente.');
      }

      setObservationModalOpen(false);
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err) {
      console.warn('Error guardando nota anatómica:', err);
      // Fallback local reactivo para no trabar al usuario
      const fallbackItem = {
        id: editingNoteId || 'local-' + Date.now(),
        patient_id: patient?.id,
        structure_key: selectedStructureKey,
        structure_name: struct.name,
        layer: struct.layer.toUpperCase(),
        view_orientation: struct.view.toUpperCase(),
        coordinates_x: struct.cx,
        coordinates_y: struct.cy,
        pain_level: Number(structurePainScore),
        doctor_observation: observationText.trim(),
        preliminary_cie11: preliminaryCIE11.trim(),
        created_at: new Date().toISOString(),
      };
      if (editingNoteId) {
        setNotesList(prev => prev.map(n => n.id === editingNoteId ? fallbackItem : n));
      } else {
        setNotesList(prev => [fallbackItem, ...prev]);
      }
      setObservationModalOpen(false);
      setStatusMessage('Observación vinculada localmente.');
      setTimeout(() => setStatusMessage(null), 3000);
    } finally {
      setSavingNote(false);
    }
  };

  // Transferencia de hallazgos a la consulta HCE
  const handleTransferToHCE = () => {
    if (readOnly || typeof onInjectToHCE !== 'function') return;

    // Compilar texto semiologico del examen fisico
    const findingsSummary = notesList.map(n => 
      `• [${n.structure_name}]: Dolor EVA ${n.pain_level}/10. ${n.doctor_observation}${n.preliminary_cie11 ? ` (Presunción: ${n.preliminary_cie11})` : ''}`
    ).join('\n');

    const generatedText = `[EXPLORACIÓN ANATÓMICA GEORREFERENCIADA - ESCALA EVA ${painLevel}/10]\n${findingsSummary}`;

    // CIE-11 sugerido principal
    const firstCIE = notesList.find(n => n.preliminary_cie11)?.preliminary_cie11 || '';

    onInjectToHCE({
      painScaleScore: painLevel,
      painScaleObservations: currentPainMeta.desc,
      anatomicalMapping: JSON.stringify(notesList),
      generatedPhysicalExamText: generatedText,
      suggestedCIE11: firstCIE.split(' - ')[0] || firstCIE
    });

    onClose();
  };

  // Filtrar notas visibles segun orientacion actual para los pines del visor
  const currentViewPoints = notesList.filter(n => 
    (n.view_orientation || '').toLowerCase() === viewOrientation.toLowerCase()
  );

  const drawerCard = (
    <div className={`w-full ${embedded ? 'bg-slate-900 border border-slate-800 rounded-2xl shadow-xl' : 'max-w-4xl bg-slate-900 border-l border-slate-800 h-full shadow-2xl animate-in slide-in-from-right duration-300'} flex flex-col overflow-hidden text-slate-100`}>
      
      {/* Cabecera del Drawer */}
      <div className="p-4 bg-slate-900/95 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
            <Stethoscope className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-wide">
                Kit Informático Médico
              </h2>
              <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-teal-950 text-teal-300 border border-teal-800/80">
                v2.4 Pro
              </span>
              {readOnly && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-950/80 text-amber-300 border border-amber-800">
                  <Lock className="w-3 h-3" /> Modo Solo Lectura (Enfermería)
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              Modelo Anatómico Interactivo & Escala Visual Analógica (EVA) • Res. 1995/1999
            </p>
          </div>
        </div>

        {onClose && (
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              title="Cerrar visor"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

        {/* Tarjeta de Paciente Activo */}
        {patient && (
          <div className="px-5 py-2.5 bg-slate-800/40 border-b border-slate-800/80 flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center font-bold text-slate-300 text-[11px]">
                {patient.full_name ? patient.full_name.charAt(0) : 'P'}
              </div>
              <div>
                <span className="font-semibold text-slate-200">{patient.full_name || 'Paciente'}</span>
                <span className="mx-2 text-slate-500">•</span>
                <span className="font-mono text-slate-400">{patient.document_type || 'CC'} {patient.document_number}</span>
                <span className="mx-2 text-slate-500">•</span>
                <span className="text-slate-400">EPS: <strong className="text-slate-300">{patient.eps_name || 'No registrada'}</strong></span>
                <span className="mx-2 text-slate-500">•</span>
                <span className="px-1.5 py-0.2 rounded bg-slate-700 text-slate-300 text-[10px] font-mono">
                  {patient.blood_type || 'O+'}
                </span>
              </div>
            </div>
            <div className="text-[11px] font-mono text-slate-400">
              {patient.affiliation_type || 'CONTRIBUTIVO'}
            </div>
          </div>
        )}

        {statusMessage && (
          <div className="px-4 py-2 bg-teal-900/60 border-b border-teal-700/80 text-teal-200 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Contenido Principal con Scroll */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          
          {/* SECCIÓN 1: ESCALA VISUAL ANALÓGICA (EVA 0-10) */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-rose-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Escala Visual Analógica del Dolor (EVA 0–10)
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Puntaje global:</span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold text-white ${currentPainMeta.color}`}>
                  {painLevel} / 10
                </span>
              </div>
            </div>

            {/* Selector de nivel 0-10 */}
            <div className="grid grid-cols-11 gap-1.5 mb-3">
              {PAIN_LEVELS.map((lvl) => (
                <button
                  key={lvl.score}
                  type="button"
                  disabled={readOnly}
                  onClick={() => setPainLevel(lvl.score)}
                  className={`py-2 rounded text-xs font-bold font-mono transition-all flex flex-col items-center justify-center ${
                    painLevel === lvl.score
                      ? `${lvl.color} text-white ring-2 ring-white/50 scale-105 shadow-md`
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                  } ${readOnly ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'}`}
                >
                  <span>{lvl.score}</span>
                </button>
              ))}
            </div>

            {/* Descripcion semiologica del nivel seleccionado */}
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-2.5 flex items-start gap-2.5 text-xs">
              <div className={`w-2.5 h-2.5 rounded-full ${currentPainMeta.color} shrink-0 mt-0.5`} />
              <div>
                <p className={`font-semibold ${currentPainMeta.text}`}>{currentPainMeta.label}</p>
                <p className="text-slate-400 text-[11px] leading-relaxed mt-0.5">{currentPainMeta.desc}</p>
              </div>
            </div>
          </div>

          {/* SECCIÓN 2: VISOR ANATÓMICO INTERACTIVO */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
            
            {/* Controles del Visor (Capas y Orientación) */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              {/* Selector de Capas */}
              <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
                <span className="text-[11px] font-bold text-slate-400 px-2 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5" /> Capa:
                </span>
                {[
                  { id: 'organs', label: 'Órganos' },
                  { id: 'muscle', label: 'Muscular' },
                  { id: 'bone', label: 'Ósea' },
                  { id: 'vascular', label: 'Vascular' }
                ].map((capa) => (
                  <button
                    key={capa.id}
                    type="button"
                    onClick={() => setActiveLayer(capa.id)}
                    className={`px-3 py-1 rounded text-xs font-medium transition ${
                      activeLayer === capa.id
                        ? 'bg-teal-600 text-white font-bold shadow'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    {capa.label}
                  </button>
                ))}
              </div>

              {/* Selector de Orientacion */}
              <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
                <span className="text-[11px] font-bold text-slate-400 px-2 flex items-center gap-1">
                  <RotateCw className="w-3.5 h-3.5" /> Vista:
                </span>
                {[
                  { id: 'anterior', label: 'Anterior (Frontal)' },
                  { id: 'posterior', label: 'Posterior (Dorsal)' }
                ].map((vista) => (
                  <button
                    key={vista.id}
                    type="button"
                    onClick={() => setViewOrientation(vista.id)}
                    className={`px-3 py-1 rounded text-xs font-medium transition ${
                      viewOrientation === vista.id
                        ? 'bg-teal-600 text-white font-bold shadow'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    {vista.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Lienzo SVG Interactivo */}
            <div className="relative bg-gradient-to-b from-slate-950 to-slate-900 border border-slate-800/80 rounded-xl flex items-center justify-center p-4 overflow-hidden min-h-[460px]">
              
              <svg 
                viewBox="0 0 400 520" 
                className="w-full max-w-[340px] h-auto select-none"
              >
                {/* Cuadrícula de calibración de fondo */}
                <defs>
                  <pattern id="gridPattern" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1E293B" strokeWidth="0.5" strokeOpacity="0.4" />
                  </pattern>
                  <radialGradient id="organGlow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#2DD4BF" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#0F766E" stopOpacity="0.2" />
                  </radialGradient>
                </defs>
                <rect width="400" height="520" fill="url(#gridPattern)" />

                {/* Silueta Humana Base */}
                <g fill="#1E293B" stroke="#334155" strokeWidth="1.5" opacity="0.6">
                  {/* Cabeza */}
                  <ellipse cx="200" cy="55" rx="30" ry="38" />
                  {/* Cuello */}
                  <rect x="188" y="90" width="24" height="25" rx="3" />
                  {/* Tronco */}
                  <path d="M 140 115 L 260 115 L 245 280 L 155 280 Z" />
                  {/* Hombros y Brazos */}
                  <path d="M 140 115 L 110 220 L 125 225 L 150 145 Z" />
                  <path d="M 260 115 L 290 220 L 275 225 L 250 145 Z" />
                  {/* Antebrazos y Manos */}
                  <rect x="100" y="220" width="16" height="70" rx="6" />
                  <rect x="284" y="220" width="16" height="70" rx="6" />
                  {/* Pelvis */}
                  <path d="M 155 280 L 245 280 L 230 320 L 170 320 Z" />
                  {/* Pierna Izquierda */}
                  <path d="M 165 320 L 188 320 L 180 440 L 160 440 Z" />
                  <rect x="160" y="440" width="18" height="60" rx="5" />
                  {/* Pierna Derecha */}
                  <path d="M 212 320 L 235 320 L 240 440 L 220 440 Z" />
                  <rect x="222" y="440" width="18" height="60" rx="5" />
                </g>

                {/* 1. CAPA ÓSEA */}
                {activeLayer === 'bone' && (
                  <g>
                    {viewOrientation === 'anterior' ? (
                      <>
                        {/* Parrilla Costal */}
                        <path d="M 165 140 Q 200 130 235 140 M 160 160 Q 200 150 240 160 M 165 180 Q 200 170 235 180 M 170 200 Q 200 190 230 200" stroke="#CBD5E1" strokeWidth="2.5" fill="none" opacity="0.75" />
                        <line x1="200" y1="130" x2="200" y2="210" stroke="#E2E8F0" strokeWidth="6" strokeLinecap="round" />
                        {/* Pelvis Ósea */}
                        <path d="M 160 280 Q 200 295 240 280 L 230 315 Q 200 330 170 315 Z" fill="#94A3B8" opacity="0.6" stroke="#E2E8F0" strokeWidth="1.5" />
                        {/* Fémur interactivo */}
                        <g className="cursor-pointer group" onClick={() => handleSelectStructure('femur_bone')}>
                          <line x1="175" y1="330" x2="170" y2="430" stroke="#E2E8F0" strokeWidth="10" strokeLinecap="round" className="group-hover:stroke-teal-300 transition-colors" />
                          <circle cx="175" cy="330" r="8" fill="#CBD5E1" />
                          <circle cx="170" cy="430" r="7" fill="#CBD5E1" />
                        </g>
                        <line x1="225" y1="330" x2="230" y2="430" stroke="#E2E8F0" strokeWidth="10" strokeLinecap="round" opacity="0.8" />
                      </>
                    ) : (
                      <>
                        {/* Bóveda craneal posterior */}
                        <ellipse 
                          cx="200" cy="50" rx="26" ry="30" 
                          fill="#E2E8F0" opacity="0.8" 
                          className="cursor-pointer hover:fill-teal-300 transition-colors"
                          onClick={() => handleSelectStructure('skull_bone')}
                        />
                        {/* Columna Vertebral Cervical y Dorsal */}
                        <line x1="200" y1="90" x2="200" y2="235" stroke="#94A3B8" strokeWidth="8" strokeDasharray="4 2" />
                        {/* Columna Lumbar interactiva */}
                        <g className="cursor-pointer group" onClick={() => handleSelectStructure('lumbar_spine')}>
                          <rect x="192" y="240" width="16" height="45" rx="3" fill="#E2E8F0" className="group-hover:fill-teal-300 transition-colors" />
                          <line x1="190" y1="250" x2="210" y2="250" stroke="#64748B" strokeWidth="1" />
                          <line x1="190" y1="265" x2="210" y2="265" stroke="#64748B" strokeWidth="1" />
                          <line x1="190" y1="278" x2="210" y2="278" stroke="#64748B" strokeWidth="1" />
                        </g>
                      </>
                    )}
                  </g>
                )}

                {/* 2. CAPA MUSCULAR */}
                {activeLayer === 'muscle' && (
                  <g>
                    {viewOrientation === 'anterior' ? (
                      <>
                        {/* Pectorales */}
                        <path d="M 155 130 Q 185 145 200 135 L 200 165 Q 170 170 150 145 Z" fill="#DC2626" opacity="0.75" />
                        <path d="M 245 130 Q 215 145 200 135 L 200 165 Q 230 170 250 145 Z" fill="#DC2626" opacity="0.75" />
                        {/* Bíceps interactivo */}
                        <ellipse 
                          cx="130" cy="175" rx="10" ry="24" 
                          fill="#EF4444" opacity="0.85" 
                          className="cursor-pointer hover:fill-amber-300 transition-colors"
                          onClick={() => handleSelectStructure('biceps_anterior')}
                        />
                        <ellipse cx="270" cy="175" rx="10" ry="24" fill="#DC2626" opacity="0.75" />
                        {/* Recto Abdominal */}
                        <rect x="180" y="175" width="40" height="90" rx="6" fill="#B91C1C" opacity="0.7" />
                        {/* Cuádriceps interactivo */}
                        <rect 
                          x="165" y="330" width="25" height="75" rx="6" 
                          fill="#EF4444" opacity="0.85" 
                          className="cursor-pointer hover:fill-amber-300 transition-colors"
                          onClick={() => handleSelectStructure('quadriceps')}
                        />
                        <rect x="210" y="330" width="25" height="75" rx="6" fill="#DC2626" opacity="0.75" />
                      </>
                    ) : (
                      <>
                        {/* Trapecio interactivo posterior */}
                        <path 
                          d="M 200 85 L 245 125 L 200 160 L 155 125 Z" 
                          fill="#DC2626" opacity="0.85" 
                          className="cursor-pointer hover:fill-amber-300 transition-colors"
                          onClick={() => handleSelectStructure('trapezius')}
                        />
                        {/* Dorsal Ancho */}
                        <path d="M 155 160 L 200 160 L 195 240 L 150 210 Z" fill="#B91C1C" opacity="0.75" />
                        <path d="M 245 160 L 200 160 L 205 240 L 250 210 Z" fill="#B91C1C" opacity="0.75" />
                        {/* Glúteos */}
                        <ellipse cx="178" cy="300" rx="20" ry="22" fill="#DC2626" opacity="0.75" />
                        <ellipse cx="222" cy="300" rx="20" ry="22" fill="#DC2626" opacity="0.75" />
                      </>
                    )}
                  </g>
                )}

                {/* 3. CAPA DE ÓRGANOS */}
                {activeLayer === 'organs' && (
                  <g>
                    {viewOrientation === 'anterior' ? (
                      <>
                        {/* Pulmones */}
                        <g className="cursor-pointer group" onClick={() => handleSelectStructure('lungs')}>
                          <path d="M 160 135 C 150 160, 155 190, 175 195 C 185 190, 185 150, 175 135 Z" fill="#0EA5E9" opacity="0.7" className="group-hover:opacity-100 transition-opacity" />
                          <path d="M 240 135 C 250 160, 245 190, 225 195 C 215 190, 215 150, 225 135 Z" fill="#0EA5E9" opacity="0.7" className="group-hover:opacity-100 transition-opacity" />
                        </g>

                        {/* Corazón interactivo */}
                        <circle 
                          cx="200" cy="165" r="18" 
                          fill="#E11D48" opacity="0.9" 
                          className="cursor-pointer hover:scale-110 origin-center transition-transform stroke-white stroke-1"
                          onClick={() => handleSelectStructure('heart')}
                        />

                        {/* Hígado y Vesícula Biliar */}
                        <path 
                          d="M 160 195 C 190 190, 210 200, 210 220 C 180 230, 160 215, 160 195 Z" 
                          fill="#92400E" opacity="0.8" 
                          className="cursor-pointer hover:fill-amber-500 transition-colors"
                          onClick={() => handleSelectStructure('liver_gallbladder')}
                        />
                        <circle 
                          cx="175" cy="218" r="6" 
                          fill="#84CC16" 
                          className="cursor-pointer hover:scale-125 origin-center transition-transform stroke-slate-900 stroke-1"
                          onClick={() => handleSelectStructure('liver_gallbladder')}
                        />

                        {/* Estómago */}
                        <path 
                          d="M 210 200 C 235 200, 235 225, 215 235 C 205 225, 205 205, 210 200 Z" 
                          fill="#F97316" opacity="0.8" 
                          className="cursor-pointer hover:fill-amber-400 transition-colors"
                          onClick={() => handleSelectStructure('stomach')}
                        />

                        {/* Apéndice Cecal */}
                        <ellipse 
                          cx="175" cy="265" rx="5" ry="9" 
                          fill="#F43F5E" 
                          className="cursor-pointer hover:scale-150 origin-center transition-transform stroke-white stroke-1"
                          onClick={() => handleSelectStructure('appendix')}
                        />
                      </>
                    ) : (
                      <>
                        {/* Riñones posteriores */}
                        <g className="cursor-pointer group" onClick={() => handleSelectStructure('kidneys')}>
                          <ellipse cx="170" cy="215" rx="10" ry="15" fill="#7C2D12" opacity="0.85" className="group-hover:fill-amber-400 transition-colors" />
                          <ellipse cx="230" cy="215" rx="10" ry="15" fill="#7C2D12" opacity="0.85" className="group-hover:fill-amber-400 transition-colors" />
                        </g>
                      </>
                    )}
                  </g>
                )}

                {/* 4. CAPA VASCULAR */}
                {activeLayer === 'vascular' && (
                  <g>
                    {viewOrientation === 'anterior' ? (
                      <>
                        {/* Arteria Aorta y Grandes Vasos */}
                        <g className="cursor-pointer group" onClick={() => handleSelectStructure('aorta_vena_cava')}>
                          <path d="M 197 140 L 197 270" stroke="#EF4444" strokeWidth="6" strokeLinecap="round" className="group-hover:stroke-rose-300 transition-colors" />
                          <path d="M 205 140 L 205 270" stroke="#3B82F6" strokeWidth="6" strokeLinecap="round" className="group-hover:stroke-sky-300 transition-colors" />
                        </g>

                        {/* Arterias Ilíacas y Femorales */}
                        <g className="cursor-pointer group" onClick={() => handleSelectStructure('femoral_artery')}>
                          <path d="M 197 270 Q 185 300 180 410" stroke="#EF4444" strokeWidth="4" strokeLinecap="round" className="group-hover:stroke-rose-300 transition-colors" />
                          <path d="M 205 270 Q 215 300 220 410" stroke="#3B82F6" strokeWidth="4" strokeLinecap="round" />
                        </g>
                      </>
                    ) : (
                      <>
                        <line x1="200" y1="100" x2="200" y2="280" stroke="#991B1B" strokeWidth="4" strokeDasharray="3 3" />
                      </>
                    )}
                  </g>
                )}

                {/* PINES Y FOCOS DE DOLOR MAPEADOS */}
                {currentViewPoints.map((pt, i) => (
                  <g key={pt.id || i} className="cursor-pointer">
                    <circle cx={pt.coordinates_x} cy={pt.coordinates_y} r="8" fill="#F43F5E" className="animate-ping" opacity="0.6" />
                    <circle cx={pt.coordinates_x} cy={pt.coordinates_y} r="6" fill="#E11D48" stroke="#FFFFFF" strokeWidth="1.5" />
                    <text x={pt.coordinates_x + 9} y={pt.coordinates_y + 4} fill="#F87171" fontSize="10" fontWeight="bold" fontFamily="monospace">
                      {pt.pain_level}
                    </text>
                  </g>
                ))}
              </svg>

              {/* Leyenda flotante */}
              <div className="absolute top-3 left-3 bg-slate-900/90 backdrop-blur px-3 py-1.5 rounded-lg border border-slate-700/80 text-[11px] font-mono text-slate-300 space-y-0.5">
                <div>Capa: <span className="text-teal-400 uppercase font-bold">{activeLayer}</span></div>
                <div>Vista: <span className="text-teal-400 uppercase font-bold">{viewOrientation}</span></div>
                <div className="text-[10px] text-slate-400">Clic en una estructura para registrar hallazgo</div>
              </div>

              {/* Botón rápido para cambiar de vista */}
              <button
                type="button"
                onClick={() => setViewOrientation(prev => prev === 'anterior' ? 'posterior' : 'anterior')}
                className="absolute bottom-3 right-3 px-3 py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center gap-1.5 shadow"
              >
                <RotateCw className="w-3.5 h-3.5 text-teal-400" />
                Girar a vista {viewOrientation === 'anterior' ? 'Posterior' : 'Anterior'}
              </button>
            </div>
          </div>

          {/* SECCIÓN 3: LISTADO DE OBSERVACIONES Y NOTAS REGISTRADAS */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-teal-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Hallazgos y Observaciones Georreferenciadas ({notesList.length})
                </h3>
              </div>
              <span className="text-[11px] text-slate-400">
                Inmutables al cerrar el folio • Res. 1995/1999
              </span>
            </div>

            {loadingNotes ? (
              <div className="p-6 text-center text-xs text-slate-500">Cargando observaciones clínicas...</div>
            ) : notesList.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-lg">
                No hay observaciones registradas. Haz clic en una estructura del modelo anatómico para abrir el formulario clínico.
              </div>
            ) : (
              <div className="space-y-2.5">
                {notesList.map((n) => {
                  const painMeta = PAIN_LEVELS[n.pain_level] || PAIN_LEVELS[0];
                  return (
                    <div 
                      key={n.id}
                      className="bg-slate-950/70 border border-slate-800/90 rounded-lg p-3 hover:border-slate-700 transition"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-xs text-slate-200">{n.structure_name}</span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                              {n.layer}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                              {n.view_orientation}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold text-white ${painMeta.color}`}>
                              EVA {n.pain_level}/10
                            </span>
                          </div>

                          <p className="text-xs text-slate-300 leading-relaxed pt-1">
                            {n.doctor_observation}
                          </p>

                          {n.preliminary_cie11 && (
                            <div className="text-[11px] text-teal-400 font-mono flex items-center gap-1 pt-0.5">
                              <span>Presunción CIE-11:</span>
                              <strong className="text-teal-300">{n.preliminary_cie11}</strong>
                            </div>
                          )}

                          {n.doctor_name && (
                            <div className="text-[10px] text-slate-500">
                              Registrado por: {n.doctor_name}
                            </div>
                          )}
                        </div>

                        {!readOnly && (
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleEditNote(n)}
                              className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition"
                              title="Editar observación"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteNote(n.id)}
                              className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition"
                              title="Eliminar observación"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
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

        {/* Barra de Acciones Inferior */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            {notesList.length} estructura(s) registrada(s) • Nivel EVA: <strong className="text-slate-200">{painLevel}/10</strong>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
            >
              Cerrar
            </button>

            {!readOnly && (
              <button
                type="button"
                onClick={handleTransferToHCE}
                disabled={notesList.length === 0 && painLevel === 0}
                className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg flex items-center gap-2 transition"
              >
                <CheckCircle2 className="w-4 h-4" />
                Transferir Hallazgos a Historia Clínica
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

      </div>
  );

  const observationModal = (observationModalOpen && selectedStructureKey) ? (
        <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            
            <div className="p-4 bg-slate-800/80 border-b border-slate-700/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-teal-400" />
                <h4 className="text-sm font-bold text-white">
                  {readOnly ? 'Detalle Semiológico' : (editingNoteId ? 'Editar Observación' : 'Nueva Observación Clínica')}
                </h4>
              </div>
              <button
                onClick={() => setObservationModalOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-700 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveObservation} className="p-5 space-y-4">
              
              {/* Estructura seleccionada */}
              <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800">
                <div className="text-xs font-bold text-teal-300">
                  {ANATOMICAL_STRUCTURES[selectedStructureKey]?.name}
                </div>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  <strong>Pauta Semiológica:</strong> {ANATOMICAL_STRUCTURES[selectedStructureKey]?.semiology}
                </p>
              </div>

              {/* Datos del Paciente Auto-Completados */}
              {patient && (
                <div className="bg-slate-800/40 p-2.5 rounded-lg border border-slate-700/60 text-[11px] grid grid-cols-2 gap-2 text-slate-300">
                  <div>
                    <span className="text-slate-500">Paciente:</span>{' '}
                    <strong>{patient.full_name}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Identificación:</span>{' '}
                    <strong>{patient.document_type} {patient.document_number}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Aseguradora:</span>{' '}
                    <strong>{patient.eps_name || 'Particular'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Régimen:</span>{' '}
                    <strong>{patient.affiliation_type || 'CONTRIBUTIVO'}</strong>
                  </div>
                </div>
              )}

              {/* Intensidad de Dolor en la Estructura */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Nivel de dolor localizado (EVA: {structurePainScore}/10)
                </label>
                <div className="grid grid-cols-11 gap-1">
                  {PAIN_LEVELS.map((lvl) => (
                    <button
                      key={lvl.score}
                      type="button"
                      disabled={readOnly}
                      onClick={() => setStructurePainScore(lvl.score)}
                      className={`py-1 rounded text-[11px] font-mono font-bold transition ${
                        structurePainScore === lvl.score
                          ? `${lvl.color} text-white ring-1 ring-white/60`
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-400'
                      }`}
                    >
                      {lvl.score}
                    </button>
                  ))}
                </div>
              </div>

              {/* Observación y Hallazgos Clínicos */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Hallazgos y Semiología Facultativa *
                </label>
                <textarea
                  rows="3"
                  value={observationText}
                  disabled={readOnly}
                  onChange={(e) => setObservationText(e.target.value)}
                  placeholder="Ej: Dolor a la palpación profunda en punto de McBurney con signo de descompresión positivo..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 disabled:opacity-60"
                  required
                />
              </div>

              {/* Sugerencia CIE-11 */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Código CIE-11 Sugerido o Presuntivo
                </label>
                <input
                  type="text"
                  value={preliminaryCIE11}
                  disabled={readOnly}
                  onChange={(e) => setPreliminaryCIE11(e.target.value)}
                  placeholder="Ej: DB10 - Apendicitis aguda"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 disabled:opacity-60"
                />
              </div>

              {/* Botones del Modal */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setObservationModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                >
                  {readOnly ? 'Cerrar' : 'Cancelar'}
                </button>
                {!readOnly && (
                  <button
                    type="submit"
                    disabled={savingNote}
                    className="px-4 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {savingNote ? 'Guardando...' : (editingNoteId ? 'Actualizar Nota' : 'Guardar Observación')}
                  </button>
                )}
              </div>

            </form>
          </div>
        </div>
  ) : null;

  if (embedded) {
    return (
      <div className="w-full">
        {drawerCard}
        {observationModal}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/80 backdrop-blur-sm flex justify-end transition-opacity">
      {drawerCard}
      {observationModal}
    </div>
  );
}

