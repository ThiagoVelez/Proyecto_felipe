import React, { useState } from 'react';
import { AlertTriangle, ShieldAlert, X, CheckSquare, Square, CornerDownRight } from 'lucide-react';

/**
 * AllergyAlertModal - Modal de intercepcion y seguridad farmacologica
 * Cumple con la especificacion BDD del RF05 y el estandar ISO/IEC 25010.
 */
export const AllergyAlertModal = ({
  isOpen,
  activeIngredient = 'BETALACTAMICOS',
  severity = 'SEVERA',
  medicationName = 'Amoxicilina 500 mg capsulas [CUM: 19934212-01]',
  onClose,
  onOverride,
}) => {
  const [confirmedRisk, setConfirmedRisk] = useState(false);

  if (!isOpen) return null;

  const isSevere = severity === 'SEVERA';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="allergy-alert-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <div
        className={`w-full max-w-xl p-6 rounded-2xl shadow-2xl border-2 transition-all ${
          isSevere
            ? 'bg-red-50 border-red-600 text-red-900'
            : 'bg-yellow-50 border-yellow-600 text-yellow-900'
        }`}
        data-testid="allergy-modal-card"
      >
        {/* Cabecera del Modal con Iconografia y Titulo Accesible */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-red-200">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-600 text-white shrink-0 shadow-sm">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <div>
              <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-red-200 text-red-950 mb-1">
                Intercepcion Inmediata (&lt; 150 ms)
              </span>
              <h2 id="allergy-alert-title" className="text-xl font-bold uppercase tracking-tight text-red-950">
                Alerta Critica: Contraindicacion Farmacologica
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar alerta"
            className="p-1 rounded-lg text-red-800 hover:bg-red-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Informacion Clinica del Conflicto */}
        <div className="mt-4 space-y-3 text-sm">
          <div className="p-3.5 rounded-xl bg-white/80 border border-red-200 space-y-2 shadow-xs">
            <p className="flex justify-between items-baseline">
              <span className="font-semibold text-red-950">Medicamento recetado:</span>
              <span className="font-mono font-medium text-red-900 text-right">{medicationName}</span>
            </p>
            <p className="flex justify-between items-baseline">
              <span className="font-semibold text-red-950">Principio activo conflictivo:</span>
              <span className="font-bold text-red-700 uppercase">{activeIngredient}</span>
            </p>
            <p className="flex justify-between items-baseline">
              <span className="font-semibold text-red-950">Severidad del riesgo:</span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                  isSevere ? 'bg-red-200 text-red-950 ring-1 ring-red-400' : 'bg-yellow-200 text-yellow-950'
                }`}
              >
                {severity}
              </span>
            </p>
            <p className="flex justify-between items-baseline text-xs text-red-800 pt-1 border-t border-red-100">
              <span className="font-semibold">Reaccion previa registrada:</span>
              <span>Choque Anafilactico documentado en UCI Cartago (2022)</span>
            </p>
          </div>

          {/* Alternativas Terapeuticas Sugeridas */}
          <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-950 text-xs space-y-1.5">
            <div className="font-bold flex items-center gap-1.5 text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              Alternativas Terapeuticas Seguras (No Betalactamicos):
            </div>
            <ul className="pl-5 space-y-1 list-disc text-amber-900">
              <li>
                <strong>Azitromicina 500 mg</strong> VO cada 24 h (Macrolido - CUM: 19945112)
              </li>
              <li>
                <strong>Claritromicina 500 mg</strong> VO cada 12 h (Macrolido - CUM: 19932088)
              </li>
              <li>
                <strong>Levofloxacino 500 mg</strong> IV/VO cada 24 h (Fluoroquinolona - CUM: 19981240)
              </li>
            </ul>
          </div>

          {/* Checkbox de Confirmacion de Riesgo Bajo Responsabilidad Medica */}
          <label className="flex items-start gap-2.5 p-3 rounded-xl bg-white/70 border border-red-200 text-xs text-red-950 cursor-pointer hover:bg-white select-none">
            <button
              type="button"
              role="checkbox"
              aria-checked={confirmedRisk}
              onClick={() => setConfirmedRisk(!confirmedRisk)}
              className="mt-0.5 text-red-700 hover:text-red-900 focus:outline-none"
            >
              {confirmedRisk ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
            </button>
            <span>
              Certifico que he evaluado el historial clinico y asumo la responsabilidad deontologica de la formulacion bajo <strong>Firma Forense SHA-256 (Ley 527 de 1999)</strong>.
            </span>
          </label>
        </div>

        {/* Acciones del Modal */}
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-end gap-3 pt-3 border-t border-red-200">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 bg-red-700 hover:bg-red-800 text-white font-semibold text-sm rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
          >
            Entendido / Cancelar Prescripcion
          </button>
          {onOverride && (
            <button
              type="button"
              disabled={!confirmedRisk}
              onClick={() => {
                if (confirmedRisk) onOverride();
              }}
              className={`w-full sm:w-auto px-4 py-2.5 rounded-xl font-semibold text-sm transition-all border ${
                confirmedRisk
                  ? 'bg-white hover:bg-red-100 text-red-900 border-red-300 shadow-sm cursor-pointer active:scale-95'
                  : 'bg-red-100/50 text-red-400 border-red-200 cursor-not-allowed'
              }`}
            >
              Omitir Alerta bajo Criterio
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AllergyAlertModal;
