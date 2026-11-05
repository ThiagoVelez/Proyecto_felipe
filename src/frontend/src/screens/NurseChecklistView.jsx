import React, { useState, useEffect } from 'react';
import {
  ClipboardList,
  CheckCircle2,
  Clock,
  User,
  Pill,
  AlertTriangle,
  Plus,
  Trash2,
  Save,
  RotateCcw,
  ShieldCheck,
  HeartPulse,
  Droplets,
  Activity,
  FileText,
  Search,
  Sparkles,
} from 'lucide-react';
import { apiClient } from '../services/api';
import { calculateAge, formatDoctorName, getFullName } from '../utils/clinical';

export const NurseChecklistView = ({ user, patient, onSelectPatient, onNavigate }) => {
  const [patientsList, setPatientsList] = useState(() => (patient ? [patient] : []));
  const [nurseOrders, setNurseOrders] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState(patient?.id || '');
  const [searchTerm, setSearchTerm] = useState('');

  // Estados de tareas por paciente: { [patientId]: { duties: [...], notes: [...] } }
  const [checklists, setChecklists] = useState({});
  const [newDutyText, setNewDutyText] = useState('');
  const [newDutyCategory, setNewDutyCategory] = useState('MEDICAMENTOS');
  const [currentNoteText, setCurrentNoteText] = useState('');
  const [saveSuccessMessage, setSaveSuccessMessage] = useState('');

  const nurseDisplayName = formatDoctorName(user?.full_name || user?.name || 'Enf. Elizabeth', 'ENFERMERO');

  // Cargar pacientes y órdenes médicas
  useEffect(() => {
    const init = async () => {
      try {
        const patients = await apiClient.listPatients();
        const pList = Array.isArray(patients) ? patients : [];
        setPatientsList(pList);

        let storedOrders = [];
        try {
          storedOrders = JSON.parse(localStorage.getItem('saludconecta_nurse_orders') || '[]');
        } catch {
          storedOrders = [];
        }
        setNurseOrders(storedOrders);

        // Cargar listas de chequeo persistidas
        const loadedChecklists = {};
        pList.forEach((p) => {
          const key = `saludconecta_nurse_checklist_${p.id}`;
          const saved = localStorage.getItem(key);
          if (saved) {
            try {
              loadedChecklists[p.id] = JSON.parse(saved);
            } catch {
              loadedChecklists[p.id] = null;
            }
          }

          // Si no existe checklist para este paciente, inicializarla con sus deberes
          if (!loadedChecklists[p.id]) {
            const pOrder = storedOrders.find((o) => o.patient_id === p.id);
            const medDuties = (pOrder?.items || []).map((med, idx) => ({
              id: `med-${idx}-${Date.now()}`,
              category: 'MEDICAMENTOS',
              label: `Administrar ${med.medication_name} ${med.dosage} (${med.presentation || 'Tableta'})`,
              instructions: med.instructions,
              completed: false,
              completedAt: null,
              completedBy: null,
            }));

            loadedChecklists[p.id] = {
              duties: [
                {
                  id: 'id-verify',
                  category: 'SEGURIDAD',
                  label: 'Verificar identificación: brazalete, cédula y entidad de salud (EPS)',
                  instructions: 'Comprobar datos cruzados con el paciente antes de cualquier procedimiento',
                  completed: false,
                  completedAt: null,
                  completedBy: null,
                },
                {
                  id: 'allergy-check',
                  category: 'SEGURIDAD',
                  label: 'Revisión y confirmación de alergias farmacológicas conocidas',
                  instructions: p.allergies ? `Alerta reportada: ${p.allergies}` : 'Preguntar al paciente por reacciones adversas a medicamentos',
                  completed: false,
                  completedAt: null,
                  completedBy: null,
                },
                ...medDuties,
                {
                  id: 'vital-signs',
                  category: 'MONITOREO',
                  label: 'Monitoreo horario de signos vitales (PA, FC, FR, SpO2, Temperatura)',
                  instructions: 'Registrar en curva térmica asistencial',
                  completed: false,
                  completedAt: null,
                  completedBy: null,
                },
                {
                  id: 'iv-line',
                  category: 'ACCESOS',
                  label: 'Inspección de vía venosa periférica / permeabilidad de catéter',
                  instructions: 'Descartar signos de flebitis, extravasación o dolor en sitio de punción',
                  completed: false,
                  completedAt: null,
                  completedBy: null,
                },
                {
                  id: 'diet-intake',
                  category: 'NUTRICION',
                  label: 'Control de tolerancia oral, ingesta de líquidos y dieta asistencial',
                  instructions: 'Confirmar recepción y tolerancia de alimentación programada',
                  completed: false,
                  completedAt: null,
                  completedBy: null,
                },
                {
                  id: 'comfort-safety',
                  category: 'CONFORT',
                  label: 'Medidas de seguridad física: barandas elevadas y timbre al alcance',
                  instructions: 'Prevención activa de caídas según protocolo institucional',
                  completed: false,
                  completedAt: null,
                  completedBy: null,
                },
              ],
              notes: [],
            };

            localStorage.setItem(key, JSON.stringify(loadedChecklists[p.id]));
          }
        });

        setChecklists(loadedChecklists);

        // Seleccionar paciente
        if (patient?.id) {
          setSelectedPatientId(patient.id);
        } else if (pList.length > 0) {
          setSelectedPatientId(pList[0].id);
        }
      } catch (err) {
        console.error('Error inicializando lista de chequeo de enfermería:', err);
      }
    };

    init();
  }, [patient]);

  const activePatient =
    patientsList.find((p) => p.id === selectedPatientId) || patient || patientsList[0];
  const activeOrder = nurseOrders.find((o) => o.patient_id === selectedPatientId);
  const activeChecklist = (activePatient && checklists[activePatient.id]) || { duties: [], notes: [] };

  // Guardar cambios del paciente activo en estado y localStorage
  const persistChecklist = (patientId, updatedData) => {
    setChecklists((prev) => {
      const next = { ...prev, [patientId]: updatedData };
      try {
        localStorage.setItem(`saludconecta_nurse_checklist_${patientId}`, JSON.stringify(updatedData));
      } catch (e) {
        console.error('Error persistiendo checklist:', e);
      }
      return next;
    });
  };

  // Alternar estado de una tarea
  const handleToggleDuty = (dutyId) => {
    if (!activePatient) return;
    const nowIso = new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
    const updatedDuties = activeChecklist.duties.map((d) => {
      if (d.id === dutyId) {
        const nextState = !d.completed;
        return {
          ...d,
          completed: nextState,
          completedAt: nextState ? nowIso : null,
          completedBy: nextState ? nurseDisplayName : null,
        };
      }
      return d;
    });

    persistChecklist(activePatient.id, {
      ...activeChecklist,
      duties: updatedDuties,
    });
  };

  // Agregar deber personalizado
  const handleAddCustomDuty = (e) => {
    e.preventDefault();
    if (!newDutyText.trim() || !activePatient) return;

    const newDuty = {
      id: `custom-${Date.now()}`,
      category: newDutyCategory,
      label: newDutyText.trim(),
      instructions: 'Deber adicional agregado por enfermería en turno',
      completed: false,
      completedAt: null,
      completedBy: null,
    };

    const updatedDuties = [...activeChecklist.duties, newDuty];
    persistChecklist(activePatient.id, {
      ...activeChecklist,
      duties: updatedDuties,
    });

    setNewDutyText('');
    setSaveSuccessMessage('Deber añadido a la lista del paciente.');
    setTimeout(() => setSaveSuccessMessage(''), 3000);
  };

  // Eliminar un deber personalizado
  const handleDeleteDuty = (dutyId) => {
    if (!activePatient) return;
    const updatedDuties = activeChecklist.duties.filter((d) => d.id !== dutyId);
    persistChecklist(activePatient.id, {
      ...activeChecklist,
      duties: updatedDuties,
    });
  };

  // Guardar nota de evolución de enfermería
  const handleSaveNote = (e) => {
    e.preventDefault();
    if (!currentNoteText.trim() || !activePatient) return;

    const newNote = {
      id: `note-${Date.now()}`,
      timestamp: new Date().toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' }),
      author: nurseDisplayName,
      content: currentNoteText.trim(),
    };

    const updatedNotes = [newNote, ...(activeChecklist.notes || [])];
    persistChecklist(activePatient.id, {
      ...activeChecklist,
      notes: updatedNotes,
    });

    setCurrentNoteText('');
    setSaveSuccessMessage('Nota de evolución guardada en el historial de enfermería.');
    setTimeout(() => setSaveSuccessMessage(''), 3500);
  };

  // Reiniciar lista para un nuevo turno
  const handleResetShift = () => {
    if (!activePatient) return;
    const confirmReset = window.confirm(
      '¿Desea reiniciar las casillas de verificación para iniciar un nuevo turno de enfermería? Las notas de evolución se conservarán intactas.'
    );
    if (!confirmReset) return;

    const resetDuties = activeChecklist.duties.map((d) => ({
      ...d,
      completed: false,
      completedAt: null,
      completedBy: null,
    }));

    persistChecklist(activePatient.id, {
      ...activeChecklist,
      duties: resetDuties,
    });

    setSaveSuccessMessage('Lista de chequeo reiniciada para el nuevo turno asistencial.');
    setTimeout(() => setSaveSuccessMessage(''), 3000);
  };

  // Estadísticas del paciente activo
  const totalDuties = activeChecklist.duties.length;
  const completedDuties = activeChecklist.duties.filter((d) => d.completed).length;
  const progressPercent = totalDuties > 0 ? Math.round((completedDuties / totalDuties) * 100) : 0;

  // Estadísticas globales de todos los pacientes
  const allPatientsTotalDuties = Object.values(checklists).reduce(
    (acc, c) => acc + (c?.duties?.length || 0),
    0
  );
  const allPatientsCompletedDuties = Object.values(checklists).reduce(
    (acc, c) => acc + (c?.duties?.filter((d) => d.completed).length || 0),
    0
  );
  const globalProgress =
    allPatientsTotalDuties > 0
      ? Math.round((allPatientsCompletedDuties / allPatientsTotalDuties) * 100)
      : 0;

  // Filtrado de pacientes
  const filteredPatients = patientsList.filter((p) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const fullName = `${p.first_name || ''} ${p.last_name || ''}`.toLowerCase();
    const doc = p.document_number ? String(p.document_number) : '';
    return fullName.includes(term) || doc.includes(term);
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fade-in">
      {/* HEADER PRINCIPAL */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-surface-container-high shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
              Protocolo Asistencial MinSalud
            </span>
            <span className="text-xs text-outline font-medium">
              Turno: <strong className="text-on-surface">{nurseDisplayName}</strong> • Sede Cartago
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-on-surface flex items-center gap-2.5">
            <ClipboardList className="w-7 h-7 text-primary" />
            <span>Lista de Chequeo y Deberes de Enfermería</span>
          </h1>
          <p className="text-xs sm:text-sm text-on-surface-variant mt-1 max-w-3xl">
            Control nominal de administración de medicamentos, verificación de brazaletes, monitoreo de signos vitales y notas de evolución de turno.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleResetShift}
            className="px-3.5 py-2.5 rounded-2xl bg-surface-container-low hover:bg-surface-container border border-surface-container-high text-xs font-semibold text-on-surface flex items-center gap-2 transition-all cursor-pointer shadow-xs"
            title="Reiniciar casillas para el siguiente turno asistencial"
          >
            <RotateCcw className="w-4 h-4 text-outline" />
            <span>Reiniciar Turno</span>
          </button>
        </div>
      </div>

      {/* MENSAJE DE CONFIRMACIÓN */}
      {saveSuccessMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center gap-2 shadow-xs animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{saveSuccessMessage}</span>
        </div>
      )}

      {/* RESUMEN DE INDICADORES ASISTENCIALES */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-surface-container-high shadow-xs">
          <span className="text-[10px] font-bold uppercase text-outline block">Pacientes Asignados</span>
          <div className="text-2xl font-bold text-on-surface mt-1">{patientsList.length}</div>
          <span className="text-[11px] text-outline">En censo asistencial</span>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-surface-container-high shadow-xs">
          <span className="text-[10px] font-bold uppercase text-outline block">Deberes Totales (Sala)</span>
          <div className="text-2xl font-bold text-on-surface mt-1">{allPatientsTotalDuties}</div>
          <span className="text-[11px] text-outline">Protocolos activos</span>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-surface-container-high shadow-xs">
          <span className="text-[10px] font-bold uppercase text-outline block">Deberes Cumplidos</span>
          <div className="text-2xl font-bold text-emerald-700 mt-1">{allPatientsCompletedDuties}</div>
          <span className="text-[11px] text-outline">Marcados con verificación</span>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-surface-container-high shadow-xs">
          <span className="text-[10px] font-bold uppercase text-outline block">Cumplimiento Global</span>
          <div className="text-2xl font-bold text-primary mt-1">{globalProgress}%</div>
          <div className="w-full bg-surface-container-high h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-primary h-full transition-all duration-500 rounded-full"
              style={{ width: `${globalProgress}%` }}
            />
          </div>
        </div>
      </div>

      {/* SELECTOR DE PACIENTES */}
      <div className="bg-white rounded-2xl p-4 border border-surface-container-high shadow-xs space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-xs font-bold text-outline uppercase tracking-wider">
            <User className="w-4 h-4 text-primary" />
            <span>Pacientes Registrados con Lista de Chequeo</span>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-outline absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filtrar por cédula o nombre..."
              className="w-full h-8 pl-8 pr-3 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        {/* Carrusel de chips con porcentaje de avance por paciente */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1">
          {filteredPatients.map((p) => {
            const isSelected = p.id === selectedPatientId;
            const pChecklist = checklists[p.id] || { duties: [] };
            const pTotal = pChecklist.duties.length;
            const pDone = pChecklist.duties.filter((d) => d.completed).length;
            const pPct = pTotal > 0 ? Math.round((pDone / pTotal) * 100) : 0;

            return (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setSelectedPatientId(p.id);
                  if (onSelectPatient) onSelectPatient(p);
                }}
                className={`px-3.5 py-2.5 rounded-2xl text-xs font-semibold shrink-0 transition-all cursor-pointer border flex items-center gap-3 ${
                  isSelected
                    ? 'bg-primary text-white border-primary shadow-xs'
                    : 'bg-surface-container-low hover:bg-surface-container text-on-surface border-surface-container-high'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    isSelected ? 'bg-white text-primary' : 'bg-primary/10 text-primary'
                  }`}
                >
                  {(p.first_name || 'P')[0]}
                </div>
                <div className="text-left">
                  <div className="font-bold truncate max-w-[130px]">{getFullName(p)}</div>
                  <div className={`text-[10px] ${isSelected ? 'text-white/80' : 'text-outline'}`}>
                    {pDone}/{pTotal} completados ({pPct}%)
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ÁREA DE TRABAJO DEL PACIENTE SELECCIONADO */}
      {activePatient ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* COLUMNA 1 Y 2: LISTA DE CHEQUEO INTERACTIVA */}
          <div className="space-y-6 lg:col-span-2">
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-surface-container-high shadow-xs space-y-6">
              {/* Cabecera del Paciente con barra de progreso */}
              <div className="space-y-3 pb-5 border-b border-surface-container">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-outline block">
                      Lista de Chequeo Activa
                    </span>
                    <h2 className="text-xl font-bold text-on-surface flex items-center gap-2">
                      <span>{getFullName(activePatient)}</span>
                      <span className="font-mono text-xs font-bold text-outline">
                        ({activePatient.document_type || 'CC'} {activePatient.document_number})
                      </span>
                    </h2>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-mono font-bold text-primary">
                      {completedDuties} de {totalDuties} cumplidos ({progressPercent}%)
                    </span>
                    <div className="w-48 bg-surface-container-high h-2 rounded-full mt-1.5 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 rounded-full ${
                          progressPercent === 100 ? 'bg-emerald-500' : 'bg-primary'
                        }`}
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Alerta de Alergias si existen */}
                {(activePatient.allergies || activeOrder?.allergies) && (
                  <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 text-xs flex items-center gap-2 font-medium">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      Alerta alérgica: <strong>{activePatient.allergies || activeOrder?.allergies}</strong>
                    </span>
                  </div>
                )}
              </div>

              {/* LISTADO DE DEBERES CON CASILLAS DE VERIFICACIÓN */}
              <div className="space-y-3">
                {activeChecklist.duties.map((duty) => {
                  const isChecked = duty.completed;
                  return (
                    <div
                      key={duty.id}
                      onClick={() => handleToggleDuty(duty.id)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                        isChecked
                          ? 'bg-emerald-50/60 border-emerald-300'
                          : 'bg-surface-container-low hover:bg-surface-container border-surface-container-high'
                      }`}
                    >
                      <div className="flex items-start gap-3.5">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}} // Manejado por onClick del contenedor
                          className="mt-1 w-5 h-5 rounded-md text-emerald-600 focus:ring-emerald-500 cursor-pointer shrink-0"
                        />
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                duty.category === 'MEDICAMENTOS'
                                  ? 'bg-emerald-100 text-emerald-900 font-mono'
                                  : duty.category === 'SEGURIDAD'
                                  ? 'bg-blue-100 text-blue-900'
                                  : duty.category === 'MONITOREO'
                                  ? 'bg-amber-100 text-amber-900'
                                  : 'bg-slate-100 text-slate-800'
                              }`}
                            >
                              {duty.category}
                            </span>
                            <span
                              className={`text-xs font-bold ${
                                isChecked ? 'text-slate-800 line-through' : 'text-on-surface'
                              }`}
                            >
                              {duty.label}
                            </span>
                          </div>
                          {duty.instructions && (
                            <p className="text-xs text-outline">{duty.instructions}</p>
                          )}
                          {isChecked && duty.completedAt && (
                            <div className="flex items-center gap-1.5 text-[11px] text-emerald-800 font-mono font-semibold pt-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>
                                Verificado a las {duty.completedAt} por {duty.completedBy}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Botón para eliminar tareas personalizadas */}
                      {duty.id.startsWith('custom-') && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteDuty(duty.id);
                          }}
                          className="p-1 rounded-lg text-outline hover:text-red-600 transition-colors"
                          title="Eliminar este deber adicional"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* FORMULARIO PARA AGREGAR NUEVO DEBER PERSONALIZADO */}
              <form onSubmit={handleAddCustomDuty} className="pt-4 border-t border-surface-container space-y-3">
                <span className="text-xs font-bold text-outline uppercase tracking-wider block">
                  + Agregar Cuidado o Deber Específico para este Paciente
                </span>
                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    value={newDutyCategory}
                    onChange={(e) => setNewDutyCategory(e.target.value)}
                    className="h-10 px-3 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs font-semibold text-on-surface shrink-0"
                  >
                    <option value="MEDICAMENTOS">Medicamentos</option>
                    <option value="MONITOREO">Monitoreo</option>
                    <option value="CURACION">Curación / Procedimiento</option>
                    <option value="ACCESOS">Accesos Vasculares</option>
                    <option value="CONFORT">Confort y Seguridad</option>
                  </select>
                  <input
                    type="text"
                    value={newDutyText}
                    onChange={(e) => setNewDutyText(e.target.value)}
                    placeholder="Escriba la acción requerida (ej. Curación de herida quirúrgica, sonda Folley)..."
                    className="flex-1 h-10 px-3.5 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer shadow-2xs"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Agregar</span>
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* COLUMNA 3: NOTAS DE EVOLUCIÓN DE ENFERMERÍA Y PROTOCOLO */}
          <div className="space-y-6 lg:col-span-1">
            {/* Registro de Notas de Evolución */}
            <div className="bg-white rounded-3xl p-6 border border-surface-container-high shadow-xs space-y-4">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                <h3 className="text-sm font-bold text-on-surface">Notas de Evolución de Turno</h3>
              </div>
              <p className="text-xs text-outline leading-tight">
                Registro asistencial legal bajo Resolución 1995 de 1999. Quedará fechado y firmado por el personal en turno.
              </p>

              <form onSubmit={handleSaveNote} className="space-y-3">
                <textarea
                  rows={4}
                  value={currentNoteText}
                  onChange={(e) => setCurrentNoteText(e.target.value)}
                  placeholder="Describa el estado actual del paciente, tolerancia a los fármacos administrados, balance de diuresis o novedades clínicas..."
                  className="w-full p-3.5 rounded-2xl bg-surface-container-low border border-outline-variant/40 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary resize-none leading-relaxed"
                />
                <button
                  type="submit"
                  disabled={!currentNoteText.trim()}
                  className="w-full py-2.5 rounded-2xl bg-primary hover:bg-primary-hover disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
                >
                  <Save className="w-4 h-4" />
                  <span>Guardar Nota de Evolución</span>
                </button>
              </form>

              {/* Historial de Notas */}
              <div className="space-y-3 pt-4 border-t border-surface-container max-h-80 overflow-y-auto">
                <span className="text-[10px] font-bold uppercase tracking-wider text-outline block">
                  Historial de Notas Registradas ({activeChecklist.notes?.length || 0})
                </span>

                {activeChecklist.notes && activeChecklist.notes.length > 0 ? (
                  activeChecklist.notes.map((note) => (
                    <div
                      key={note.id}
                      className="p-3 rounded-2xl bg-surface-container-low border border-surface-container-high text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between text-[11px] text-outline font-mono">
                        <span>{note.timestamp}</span>
                        <strong className="text-primary">{note.author}</strong>
                      </div>
                      <p className="text-on-surface leading-snug">{note.content}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-outline italic text-center py-4">
                    Sin notas de evolución registradas en este turno.
                  </p>
                )}
              </div>
            </div>

            {/* Enlace rápido a la HCE básica */}
            <div className="bg-primary/5 rounded-3xl p-5 border border-primary/20 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary block">
                Consulta Rápida
              </span>
              <h4 className="text-xs font-bold text-on-surface">
                ¿Necesita revisar la formulación médica completa o el diagnóstico?
              </h4>
              <p className="text-xs text-outline">
                Consulte las observaciones médicas y concentraciones en el Resumen Clínico Asistencial.
              </p>
              <button
                type="button"
                onClick={() => onNavigate && onNavigate('nurse_summary')}
                className="w-full mt-2 py-2 rounded-xl bg-white border border-primary/30 hover:bg-primary/10 text-primary text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <span>Ver Resumen Clínico Asistencial</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-12 text-center bg-white rounded-3xl border border-surface-container-high shadow-xs space-y-3">
          <User className="w-10 h-10 text-outline mx-auto" />
          <h2 className="text-base font-bold text-on-surface">No hay pacientes seleccionados</h2>
          <p className="text-xs text-outline max-w-sm mx-auto">
            Seleccione un paciente de la barra superior para abrir su lista de chequeo de cuidados.
          </p>
        </div>
      )}
    </div>
  );
};

export default NurseChecklistView;

