import React, { useState, useEffect } from 'react';
import {
  FileText,
  Pill,
  Plus,
  Trash2,
  DollarSign,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Download,
  Send,
  User,
  Building2,
  Calendar,
  Clock,
  Sparkles,
} from 'lucide-react';
import { apiClient } from '../services/api';
import { formatDoctorName } from '../utils/clinical';

export const TreatmentFollowUpView = ({ user, patient, onNavigate }) => {
  const [inventory, setInventory] = useState([]);
  const [patientsList, setPatientsList] = useState([]);
  const [currentPatient, setCurrentPatient] = useState(patient || null);
  const [patientSearch, setPatientSearch] = useState('');

  // Datos del tratamiento
  const [treatmentDuration, setTreatmentDuration] = useState('7 días');
  const [diagnosis, setDiagnosis] = useState('');
  const [treatmentNotes, setTreatmentNotes] = useState('');
  const [coverageType, setCoverageType] = useState('EPS_PBS_100');

  // Items formulados
  const [selectedItems, setSelectedItems] = useState([]);

  // Campos para agregar un item
  const [selectedInventoryId, setSelectedInventoryId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [instructions, setInstructions] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successResult, setSuccessResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Cargar inventario con concentraciones y pacientes
  useEffect(() => {
    apiClient
      .getPharmacyInventory()
      .then((data) => setInventory(Array.isArray(data) ? data : []))
      .catch((err) => console.error('Error cargando inventario:', err));

    apiClient
      .listPatients()
      .then((data) => setPatientsList(Array.isArray(data) ? data : []))
      .catch((err) => console.error('Error cargando pacientes:', err));
  }, []);

  useEffect(() => {
    if (patient) {
      setCurrentPatient(patient);
    }
  }, [patient]);

  // Medicamento actualmente seleccionado en el selector
  const activeMed = inventory.find((it) => it.id === selectedInventoryId);

  // Agregar item a la tabla de prescripcion
  const handleAddItem = (e) => {
    e.preventDefault();
    if (!activeMed) return;

    if (quantity <= 0) {
      setErrorMessage('La cantidad prescrita debe ser mayor a cero.');
      return;
    }

    const newItem = {
      inventory_item_id: activeMed.id,
      medication_name: `${activeMed.generic_name} (${activeMed.brand_name || activeMed.generic_name})`,
      dosage: activeMed.dosage,
      presentation: activeMed.presentation,
      unit_price: Number(activeMed.unit_price),
      quantity_prescribed: Number(quantity),
      total_item_price: Number(activeMed.unit_price) * Number(quantity),
      instructions: instructions.trim() || 'Tomar según prescripción médica',
      stock_quantity: activeMed.stock_quantity,
    };

    setSelectedItems([...selectedItems, newItem]);
    setSelectedInventoryId('');
    setQuantity(1);
    setInstructions('');
    setErrorMessage('');
  };

  const handleRemoveItem = (index) => {
    setSelectedItems(selectedItems.filter((_, i) => i !== index));
  };

  // Calculo de subtotales
  const subtotal = selectedItems.reduce((acc, it) => acc + it.total_item_price, 0);

  let epsCoverageAmount = 0;
  let patientPayableAmount = 0;

  if (coverageType === 'EPS_PBS_100') {
    epsCoverageAmount = subtotal;
    patientPayableAmount = 0;
  } else if (coverageType === 'COPAY') {
    epsCoverageAmount = subtotal * 0.85;
    patientPayableAmount = subtotal * 0.15;
  } else {
    // PARTICULAR
    epsCoverageAmount = 0;
    patientPayableAmount = subtotal;
  }

  // Despacho de prescripcion tripartita
  const handleDispatch = async () => {
    setErrorMessage('');
    setSuccessResult(null);

    if (!currentPatient) {
      setErrorMessage('Seleccione un paciente para vincular el tratamiento.');
      return;
    }
    if (selectedItems.length === 0) {
      setErrorMessage('Agregue al menos un medicamento formulado con su concentración.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        patient_id: currentPatient.id,
        patient_document: currentPatient.document_number,
        patient_name: `${currentPatient.first_name} ${currentPatient.last_name}`,
        patient_eps: currentPatient.eps_name || 'Particular',
        treatment_notes: `Duración: ${treatmentDuration}. Diagnóstico: ${diagnosis}. Notas: ${treatmentNotes}`.trim(),
        coverage_type: coverageType,
        items: selectedItems.map((it) => ({
          inventory_item_id: it.inventory_item_id,
          medication_name: it.medication_name,
          dosage: it.dosage,
          quantity_prescribed: it.quantity_prescribed,
          unit_price: it.unit_price,
          total_item_price: it.total_item_price,
          instructions: it.instructions,
        })),
      };

      const res = await apiClient.dispatchTreatment(payload);

      setSuccessResult(res);
      setSelectedItems([]);
      setDiagnosis('');
      setTreatmentNotes('');
    } catch (err) {
      setErrorMessage(err.data?.error || err.message || 'Error al emitir la prescripción.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredPatients = patientsList.filter((p) => {
    if (!patientSearch.trim()) return false;
    const term = patientSearch.toLowerCase();
    const name = `${p.first_name || ''} ${p.last_name || ''}`.toLowerCase();
    return name.includes(term) || (p.document_number && p.document_number.includes(term));
  });

  return (
    <div className="space-y-6">
      {/* HEADER DE LA VISTA */}
      <div className="bg-white rounded-2xl p-6 border border-surface-container-high shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800">
              Prescripción Tripartita
            </span>
            <span className="text-xs text-on-surface-variant font-mono">
              {formatDoctorName(user?.full_name || user?.name, user?.role)} • Sede Cartago
            </span>
          </div>
          <h1 className="text-2xl font-bold text-on-surface flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary" />
            Seguimiento de Tratamiento y Farmacología
          </h1>
          <p className="text-sm text-on-surface-variant mt-0.5">
            Registro clínico de evolución médica, cálculo de cobertura por EPS y emisión simultánea hacia paciente y buzón de farmacia.
          </p>
        </div>
      </div>

      {/* FEEDBACK DE EXITO */}
      {successResult && (
        <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 space-y-3 shadow-xs">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
            <div>
              <h3 className="font-bold text-base">Prescripción Tripartita Emitida Exitosamente</h3>
              <p className="text-xs text-emerald-800">
                Se guardó la orden en la HCE, se notificó al buzón de farmacia y se envió el recetario oficial en formato PDF al correo del paciente.
              </p>
            </div>
          </div>
          <div className="p-3 bg-white/80 rounded-xl border border-emerald-200 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div>
              <span className="text-outline font-medium block">Código Único de Identificación de Receta:</span>
              <span className="font-mono text-base font-bold text-primary">{successResult.unique_code}</span>
            </div>
            <div className="text-right">
              <span className="text-outline font-medium block">Estado en Farmacia:</span>
              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold uppercase text-[10px]">
                Pendiente de Entrega
              </span>
            </div>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 flex items-center gap-3 text-sm font-medium">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* TARJETA 1: IDENTIFICACION Y AFILIACION EPS DEL PACIENTE */}
      <div className="bg-white rounded-2xl p-6 border border-surface-container-high shadow-xs space-y-4">
        <h2 className="text-base font-bold text-on-surface flex items-center gap-2">
          <User className="w-5 h-5 text-primary" />
          1. Afiliación en Salud y Datos del Paciente
        </h2>

        {!currentPatient ? (
          <div className="space-y-2 relative">
            <label className="text-xs font-bold text-outline uppercase tracking-wider block">
              Buscar Paciente para el Tratamiento *
            </label>
            <input
              type="text"
              value={patientSearch}
              onChange={(e) => setPatientSearch(e.target.value)}
              placeholder="Escriba el nombre o cédula del paciente..."
              className="w-full px-3 py-2.5 rounded-xl border border-surface-container-high bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
            {filteredPatients.length > 0 && (
              <div className="absolute z-20 left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white rounded-xl border border-surface-container-high shadow-lg">
                {filteredPatients.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setCurrentPatient(p);
                      setPatientSearch('');
                    }}
                    className="w-full text-left px-3 py-2.5 text-xs hover:bg-surface-container cursor-pointer border-b border-surface-container last:border-b-0"
                  >
                    <div className="font-bold text-on-surface">
                      {p.first_name} {p.last_name}
                    </div>
                    <div className="text-outline text-[11px] font-mono">
                      CC: {p.document_number} • EPS: {p.eps_name || 'Particular'}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-surface-container-lowest border border-surface-container space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-surface-container pb-3">
              <div>
                <span className="text-xs text-outline uppercase tracking-wider block">Paciente Titular</span>
                <span className="text-base font-bold text-on-surface">
                  {currentPatient.first_name} {currentPatient.last_name}
                </span>
                <span className="text-xs text-outline font-mono ml-2">
                  CC: {currentPatient.document_number}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setCurrentPatient(null)}
                className="text-xs text-primary hover:underline font-semibold self-start md:self-auto cursor-pointer"
              >
                Cambiar paciente
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-outline block mb-0.5">Entidad Aseguradora (EPS/IPS):</span>
                <span className="font-bold text-on-surface flex items-center gap-1.5 text-sm text-primary">
                  <Building2 className="w-4 h-4" />
                  {currentPatient.eps_name || 'Particular'}
                </span>
              </div>
              <div>
                <span className="text-outline block mb-0.5">Régimen de Afiliación:</span>
                <span className="font-semibold text-on-surface uppercase px-2 py-0.5 rounded bg-surface-container inline-block">
                  {currentPatient.affiliation_type || 'CONTRIBUTIVO'}
                </span>
              </div>
              <div>
                <span className="text-outline block mb-0.5">Correo Electrónico Notificado:</span>
                <span className="font-mono text-on-surface">
                  {currentPatient.email || 'paciente@saludconecta.local'}
                </span>
              </div>
              <div>
                <span className="text-outline block mb-0.5">Teléfono de Contacto:</span>
                <span className="font-mono text-on-surface">
                  {currentPatient.phone || 'Sin registrar'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* CAMPOS CLINICOS ADICIONALES */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div>
            <label className="text-xs font-bold text-on-surface uppercase tracking-wider block mb-1">
              Tiempo de Duración del Tratamiento *
            </label>
            <input
              type="text"
              value={treatmentDuration}
              onChange={(e) => setTreatmentDuration(e.target.value)}
              placeholder="Ej: 7 días, 14 días, 1 mes de control..."
              className="w-full px-3 py-2 rounded-xl border border-surface-container-high bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-on-surface uppercase tracking-wider block mb-1">
              Diagnóstico Principal / Código CIE-11
            </label>
            <input
              type="text"
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              placeholder="Ej: Infección bacteriana, Hipertensión esencial..."
              className="w-full px-3 py-2 rounded-xl border border-surface-container-high bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
        </div>
      </div>

      {/* TARJETA 2: FORMULACION DIFERENCIADA POR CONCENTRACION Y PRECIO */}
      <div className="bg-white rounded-2xl p-6 border border-surface-container-high shadow-xs space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-on-surface flex items-center gap-2">
            <Pill className="w-5 h-5 text-primary" />
            2. Prescripción por Concentración / Dosis en Inventario
          </h2>
          <span className="text-xs text-outline">
            {inventory.length} fármacos y variantes valorizadas en catálogo
          </span>
        </div>

        {/* SELECTOR PARA AGREGAR ITEM */}
        <div className="p-4 rounded-xl bg-surface border border-surface-container-high space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <div className="md:col-span-5 space-y-1">
              <label className="text-[11px] font-bold text-on-surface uppercase tracking-wider block">
                Medicamento y Concentración Específica *
              </label>
              <select
                value={selectedInventoryId}
                onChange={(e) => setSelectedInventoryId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-surface-container-high bg-white text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium"
              >
                <option value="">-- Seleccione principio activo y dosis exacta --</option>
                {inventory.map((it) => (
                  <option key={it.id} value={it.id}>
                    {it.generic_name} [{it.dosage}] - {it.presentation} • Stock: {it.stock_quantity} und • $
                    {Number(it.unit_price).toLocaleString('es-CO')} COP
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2 space-y-1">
              <label className="text-[11px] font-bold text-on-surface uppercase tracking-wider block">
                Cantidad *
              </label>
              <input
                type="number"
                min="1"
                max={activeMed ? activeMed.stock_quantity : 999}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value || '1', 10)))}
                className="w-full px-3 py-2 rounded-xl border border-surface-container-high bg-white text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
              />
            </div>

            <div className="md:col-span-3 space-y-1">
              <label className="text-[11px] font-bold text-on-surface uppercase tracking-wider block">
                Posología / Instrucción
              </label>
              <input
                type="text"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Ej: 1 tableta cada 8 horas con comida"
                className="w-full px-3 py-2 rounded-xl border border-surface-container-high bg-white text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            <div className="md:col-span-2">
              <button
                type="button"
                onClick={handleAddItem}
                disabled={!activeMed}
                className="w-full py-2.5 px-3 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary/90 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                Agregar Ítem
              </button>
            </div>
          </div>

          {/* BADGE DEL MEDICAMENTO SELECCIONADO */}
          {activeMed && (
            <div className="flex items-center justify-between text-xs text-outline pt-1">
              <span>
                CUM: <strong className="font-mono text-on-surface">{activeMed.code_cum}</strong> • Lote:{' '}
                <strong className="font-mono text-on-surface">{activeMed.batch_number}</strong>
              </span>
              <span className="font-medium text-emerald-800">
                Subtotal Ítem: ${(Number(activeMed.unit_price) * quantity).toLocaleString('es-CO')} COP
              </span>
            </div>
          )}
        </div>

        {/* TABLA DE MEDICAMENTOS FORMULADOS (RECETARIO) */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-on-surface uppercase tracking-wider block">
            Detalle del Recetario Tripartito ({selectedItems.length} fármacos)
          </label>
          {selectedItems.length === 0 ? (
            <div className="py-8 text-center text-outline bg-surface rounded-xl border border-dashed border-surface-container-high">
              <Pill className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-medium">No se han formulado medicamentos aún.</p>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Utilice el selector superior para añadir variantes de concentración y dosis al recetario.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-surface-container">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-container-low text-on-surface-variant font-mono uppercase text-[10px]">
                  <tr>
                    <th className="px-3 py-2.5">Medicamento</th>
                    <th className="px-3 py-2.5">Concentración</th>
                    <th className="px-3 py-2.5 text-center">Cant.</th>
                    <th className="px-3 py-2.5 text-right">Valor Unit.</th>
                    <th className="px-3 py-2.5 text-right">Subtotal</th>
                    <th className="px-3 py-2.5">Instrucciones</th>
                    <th className="px-3 py-2.5 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container">
                  {selectedItems.map((it, idx) => (
                    <tr key={idx} className="hover:bg-surface-container-lowest">
                      <td className="px-3 py-2.5 font-semibold text-on-surface">{it.medication_name}</td>
                      <td className="px-3 py-2.5">
                        <span className="px-2 py-0.5 rounded bg-primary/10 text-primary font-bold font-mono">
                          {it.dosage}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-center font-mono font-bold">{it.quantity_prescribed}</td>
                      <td className="px-3 py-2.5 text-right font-mono text-outline">
                        ${it.unit_price.toLocaleString('es-CO')}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono font-bold text-on-surface">
                        ${it.total_item_price.toLocaleString('es-CO')}
                      </td>
                      <td className="px-3 py-2.5 text-on-surface-variant">{it.instructions}</td>
                      <td className="px-3 py-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1 text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                          title="Eliminar ítem"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* NOTAS MEDICAS ADICIONALES */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-on-surface uppercase tracking-wider block">
            Indicaciones Médicas y Signos de Alarma
          </label>
          <textarea
            value={treatmentNotes}
            onChange={(e) => setTreatmentNotes(e.target.value)}
            rows={2}
            placeholder="Recomendaciones alimentarias, pautas de hidratación o advertencias..."
            className="w-full p-3 rounded-xl border border-surface-container-high bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
          />
        </div>
      </div>

      {/* TARJETA 3: LIQUIDACION ECONOMICA Y DISPARO TRIPARTITO */}
      <div className="bg-white rounded-2xl p-6 border border-surface-container-high shadow-xs space-y-4">
        <h2 className="text-base font-bold text-on-surface flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-primary" />
          3. Cobertura en Salud y Liquidación Farmacéutica
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <label
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              coverageType === 'EPS_PBS_100'
                ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                : 'border-surface-container hover:bg-surface-container-low'
            }`}
          >
            <input
              type="radio"
              name="coverageType"
              value="EPS_PBS_100"
              checked={coverageType === 'EPS_PBS_100'}
              onChange={() => setCoverageType('EPS_PBS_100')}
              className="sr-only"
            />
            <div className="font-bold text-xs uppercase text-primary mb-1">
              Plan de Beneficios en Salud (PBS 100%)
            </div>
            <p className="text-[11px] text-on-surface-variant">
              Cubierto en su totalidad por la EPS del paciente. Costo al usuario: $0 COP.
            </p>
          </label>

          <label
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              coverageType === 'COPAY'
                ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                : 'border-surface-container hover:bg-surface-container-low'
            }`}
          >
            <input
              type="radio"
              name="coverageType"
              value="COPAY"
              checked={coverageType === 'COPAY'}
              onChange={() => setCoverageType('COPAY')}
              className="sr-only"
            />
            <div className="font-bold text-xs uppercase text-primary mb-1">
              Copago / Cuota Moderadora (15%)
            </div>
            <p className="text-[11px] text-on-surface-variant">
              La EPS asume el 85% y el paciente liquida el 15% restante en ventanilla de farmacia.
            </p>
          </label>

          <label
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              coverageType === 'PARTICULAR'
                ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                : 'border-surface-container hover:bg-surface-container-low'
            }`}
          >
            <input
              type="radio"
              name="coverageType"
              value="PARTICULAR"
              checked={coverageType === 'PARTICULAR'}
              onChange={() => setCoverageType('PARTICULAR')}
              className="sr-only"
            />
            <div className="font-bold text-xs uppercase text-primary mb-1">
              Venta Directa / Particular (100%)
            </div>
            <p className="text-[11px] text-on-surface-variant">
              El paciente asume el total acumulado en efectivo, tarjeta o transferencia.
            </p>
          </label>
        </div>

        {/* RESUMEN DE TOTALES */}
        <div className="p-4 rounded-xl bg-surface-container-lowest border border-surface-container flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs text-outline">Valor Total de Fármacos Calculado:</span>
            <div className="text-xl font-bold font-mono text-on-surface">
              ${subtotal.toLocaleString('es-CO')} COP
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-xs text-outline">Cobertura Asumida por EPS:</span>
            <div className="text-lg font-bold font-mono text-emerald-700">
              ${epsCoverageAmount.toLocaleString('es-CO')} COP
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-xs text-outline">Total a Pagar por el Paciente:</span>
            <div className="text-xl font-bold font-mono text-primary">
              ${patientPayableAmount.toLocaleString('es-CO')} COP
            </div>
          </div>
        </div>

        {/* BOTON DESTACADO DE DISPARO TRIPARTITO */}
        <button
          type="button"
          onClick={handleDispatch}
          disabled={isSubmitting || selectedItems.length === 0}
          className="w-full py-3.5 px-4 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary/90 transition-all shadow-md cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <span>Emitiendo y notificando a farmacia...</span>
          ) : (
            <>
              <Send className="w-5 h-5" />
              Guardar y Enviar Prescripción Tripartita (HCE + PDF Paciente + Buzón Farmacia)
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default TreatmentFollowUpView;

