import React, { useState } from 'react';
import {
  Pill,
  Search,
  AlertTriangle,
  ShieldAlert,
  Clock,
  Plus,
  Trash2,
  CheckCircle2,
  Send,
  Database,
  History,
  FileCheck,
} from 'lucide-react';
import { AllergyAlertModal } from '../components/AllergyAlertModal';

export const PrescriptionScreen = () => {
  const [selectedMed, setSelectedMed] = useState('Amoxicilina 500 mg capsulas [CUM: 19934212-01]');
  const [dose, setDose] = useState('500 mg');
  const [route, setRoute] = useState('Via Oral (VO)');
  const [frequency, setFrequency] = useState('Cada 8 horas');
  const [duration, setDuration] = useState('7 dias');
  const [instructions, setInstructions] = useState('Tomar con abundante agua despues de las comidas.');

  // Estado del modal de intercepcion de alergias
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
  const [modalPayload, setModalPayload] = useState({
    activeIngredient: 'BETALACTAMICOS',
    severity: 'SEVERA',
    medicationName: 'Amoxicilina 500 mg capsulas [CUM: 19934212-01]',
  });

  const [prescriptions, setPrescriptions] = useState([
    {
      id: 1,
      medication: 'Paracetamol 1 g solucion inyectable',
      cum: '19984120-02',
      ingredient: 'Acetaminofen',
      dose: '1 g',
      route: 'Intravenosa (IV)',
      frequency: 'Cada 8 h si fiebre > 38°',
      duration: '3 dias',
      status: 'Aprobado',
    },
    {
      id: 2,
      medication: 'Omeprazol 40 mg liofilizado para solucion',
      cum: '19921045-01',
      ingredient: 'Omeprazol',
      dose: '40 mg',
      route: 'Intravenosa (IV)',
      frequency: 'Cada 24 h en ayunas',
      duration: '5 dias',
      status: 'Aprobado',
    },
  ]);

  const [notification, setNotification] = useState('');

  // Catalogo de muestra para prescripcion
  const catalog = [
    { name: 'Amoxicilina 500 mg capsulas [CUM: 19934212-01]', ingredient: 'BETALACTAMICOS', isContraindicated: true },
    { name: 'Ampicilina 1 g polvo esteril [CUM: 19912099-01]', ingredient: 'BETALACTAMICOS', isContraindicated: true },
    { name: 'Ceftriaxona 1 g IV [CUM: 19967812-03]', ingredient: 'BETALACTAMICOS', isContraindicated: true },
    { name: 'Azitromicina 500 mg tabletas [CUM: 19945112-01]', ingredient: 'Azitromicina (Macrolido)', isContraindicated: false },
    { name: 'Claritromicina 500 mg tabletas [CUM: 19932088-02]', ingredient: 'Claritromicina (Macrolido)', isContraindicated: false },
    { name: 'Dipirona 1 g / 2 mL ampolla [CUM: 19904512-01]', ingredient: 'Metamizol', isContraindicated: false },
  ];

  const handleSelectMedication = (medName) => {
    setSelectedMed(medName);
    const item = catalog.find((c) => c.name === medName);
    if (item && item.isContraindicated) {
      // Intercepcion inmediata en tiempo real (< 150 ms)
      setModalPayload({
        medicationName: item.name,
        activeIngredient: item.ingredient,
        severity: 'SEVERA',
      });
      setIsAlertModalOpen(true);
    }
  };

  const handleAddPrescription = (e) => {
    e.preventDefault();
    const item = catalog.find((c) => c.name === selectedMed);

    if (item && item.isContraindicated) {
      // Bloquear e interceptar
      setModalPayload({
        medicationName: item.name,
        activeIngredient: item.ingredient,
        severity: 'SEVERA',
      });
      setIsAlertModalOpen(true);
      return;
    }

    const newPresc = {
      id: Date.now(),
      medication: selectedMed,
      cum: '19999999-01',
      ingredient: item ? item.ingredient : 'Principio Generico',
      dose,
      route,
      frequency,
      duration,
      status: 'Aprobado',
    };

    setPrescriptions([...prescriptions, newPresc]);
    setNotification('Medicamento prescrito e incorporado al plan farmacoterapeutico exitosamente.');
    setTimeout(() => setNotification(''), 3000);
  };

  const handleRemovePrescription = (id) => {
    setPrescriptions(prescriptions.filter((p) => p.id !== id));
  };

  const handleOverrideAllergy = () => {
    setIsAlertModalOpen(false);
    const newPresc = {
      id: Date.now(),
      medication: `${selectedMed} (OMISION CONSCIENTE)`,
      cum: '19934212-01',
      ingredient: 'BETALACTAMICOS (Alerta Omitida)',
      dose,
      route,
      frequency,
      duration,
      status: 'Omitido con Firma',
    };
    setPrescriptions([...prescriptions, newPresc]);
    setNotification('Prescripcion registrada bajo omision clinica auditada.');
    setTimeout(() => setNotification(''), 3000);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* MODAL DE ALERTA DE ALERGIAS (INTERCEPTOR EN TIEMPO REAL) */}
      <AllergyAlertModal
        isOpen={isAlertModalOpen}
        medicationName={modalPayload.medicationName}
        activeIngredient={modalPayload.activeIngredient}
        severity={modalPayload.severity}
        onClose={() => setIsAlertModalOpen(false)}
        onOverride={handleOverrideAllergy}
      />

      {/* HEADER DE FORMULACION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-surface-container-high gap-3">
        <div>
          <span className="text-[10px] font-bold text-primary uppercase tracking-wider font-mono">
            MODULO ASISTENCIAL DE FARMACOTERAPIA
          </span>
          <h1 className="text-2xl font-bold text-on-surface">
            Prescripcion Electronica & Validacion Cruzada CUM
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-full bg-surface-container-low text-on-surface text-xs font-mono flex items-center gap-1.5 border border-outline-variant/30">
            <Database className="w-3.5 h-3.5 text-primary" />
            <span>INVIMA Vademecum Actualizado: Hoy 06:00</span>
          </span>
        </div>
      </div>

      {/* BANNER ROJO ALARMANTE DE ANTECEDENTE INMUNOLOGICO */}
      <div className="bg-red-600 text-white p-4 rounded-2xl flex items-center justify-between shadow-xs gap-4">
        <div className="flex items-center gap-3">
          <ShieldAlert className="w-8 h-8 text-white shrink-0 animate-pulse" />
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded text-white inline-block mb-1">
              Alerta Critica Inmunologica
            </span>
            <div className="font-bold text-sm uppercase">
              Alergia Documentada: Betalactamicos (Penicilinas / Cefalosporinas)
            </div>
            <p className="text-xs text-white/90 mt-0.5">
              Cualquier prescripcion de este grupo farmacologico sera interceptada de inmediato por el motor de seguridad clinica.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setModalPayload({
              medicationName: 'Amoxicilina 500 mg capsulas [CUM: 19934212-01]',
              activeIngredient: 'BETALACTAMICOS',
              severity: 'SEVERA',
            });
            setIsAlertModalOpen(true);
          }}
          className="px-3.5 py-2 bg-white text-red-700 hover:bg-red-50 text-xs font-bold uppercase rounded-xl transition-all shadow-sm shrink-0 cursor-pointer"
        >
          Probar Intercepcion
        </button>
      </div>

      {/* FORMULARIO DE BUSQUEDA Y CALCULADORA */}
      <form onSubmit={handleAddPrescription} className="bg-white rounded-2xl p-6 shadow-xs border border-surface-container-high space-y-5">
        <div className="border-b border-surface-container-high pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Pill className="w-5 h-5 text-primary" />
            <h2 className="text-base font-bold text-on-surface">Buscador Oficial INVIMA / CUM</h2>
          </div>
          <span className="text-xs font-semibold text-primary bg-primary-fixed px-2.5 py-0.5 rounded">
            Catalogo PBS 2026
          </span>
        </div>

        {/* Selector de Medicamento */}
        <div className="space-y-1">
          <label className="block text-xs font-bold text-on-surface">
            Seleccionar Medicamento o Principio Activo
          </label>
          <div className="relative">
            <select
              value={selectedMed}
              onChange={(e) => handleSelectMedication(e.target.value)}
              className="w-full h-11 px-3 rounded-xl bg-surface-container-low text-xs font-semibold border border-outline-variant/40 outline-none focus:border-primary cursor-pointer"
            >
              {catalog.map((med, idx) => (
                <option key={idx} value={med.name}>
                  {med.name} {med.isContraindicated ? '⚠️ [CONTRAINDICADO POR ALERGIA]' : '✅ [SEGURO]'}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Parametros de Posologia */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-on-surface mb-1">Dosis Prescrita</label>
            <input
              type="text"
              value={dose}
              onChange={(e) => setDose(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-outline-variant/40 bg-surface-container-low text-xs font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-on-surface mb-1">Via de Administracion</label>
            <select
              value={route}
              onChange={(e) => setRoute(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-outline-variant/40 bg-surface-container-low text-xs font-medium cursor-pointer"
            >
              <option>Via Oral (VO)</option>
              <option>Intravenosa (IV)</option>
              <option>Intramuscular (IM)</option>
              <option>Subcutanea (SC)</option>
              <option>Inhalatoria</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-on-surface mb-1">Frecuencia / Intervalo</label>
            <input
              type="text"
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-outline-variant/40 bg-surface-container-low text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-on-surface mb-1">Duracion Tratamiento</label>
            <input
              type="text"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-outline-variant/40 bg-surface-container-low text-xs"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-on-surface mb-1">Instrucciones al Paciente / Enfermeria</label>
          <input
            type="text"
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            className="w-full h-10 px-3 rounded-xl border border-outline-variant/40 bg-surface-container-low text-xs"
          />
        </div>

        {notification && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{notification}</span>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="px-5 py-2.5 bg-primary hover:bg-primary-container text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Agregar Medicamento a la Prescripcion</span>
          </button>
        </div>
      </form>

      {/* TABLA DE MEDICAMENTOS FORMULADOS */}
      <div className="bg-white rounded-2xl shadow-xs border border-surface-container-high overflow-hidden">
        <div className="p-5 border-b border-surface-container-high flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-on-surface">
              Plan Farmacoterapeutico Actual ({prescriptions.length} items formulados)
            </h2>
            <p className="text-xs text-on-surface-variant">
              Validacion de interacciones y firma criptografica activa
            </p>
          </div>
          <button
            type="button"
            onClick={() => alert('Prescripcion transmitida digitalmente a Farmacia Central.')}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>Dispensar en Farmacia</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-container-low text-outline font-mono uppercase text-[10px] tracking-wider border-b border-surface-container-high">
              <tr>
                <th className="py-3 px-4">Medicamento / Principio</th>
                <th className="py-3 px-4">Dosis</th>
                <th className="py-3 px-4">Via</th>
                <th className="py-3 px-4">Frecuencia</th>
                <th className="py-3 px-4">Duracion</th>
                <th className="py-3 px-4">Estado Seguridad</th>
                <th className="py-3 px-4 text-right">Accion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-high">
              {prescriptions.map((p) => (
                <tr key={p.id} className="hover:bg-surface-container-low/40">
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-sm text-on-surface">{p.medication}</div>
                    <div className="text-[11px] text-on-surface-variant font-mono">{p.ingredient} • CUM: {p.cum}</div>
                  </td>
                  <td className="py-3.5 px-4 font-mono font-semibold">{p.dose}</td>
                  <td className="py-3.5 px-4">{p.route}</td>
                  <td className="py-3.5 px-4">{p.frequency}</td>
                  <td className="py-3.5 px-4">{p.duration}</td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        p.status.includes('Omitido')
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => handleRemovePrescription(p.id)}
                      className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                      title="Eliminar de prescripcion"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
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

export default PrescriptionScreen;

