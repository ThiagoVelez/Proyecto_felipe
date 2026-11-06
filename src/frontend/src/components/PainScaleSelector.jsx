import React from 'react';
import { Activity } from 'lucide-react';

export const PAIN_LEVELS = [
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

/**
 * Componente interactivo para la Escala Visual Analógica del Dolor (EVA 0–10).
 * Diseñado conforme a la Resolución 1995 de 1999 y estándares semiológicos hospitalarios.
 */
export default function PainScaleSelector({
  value = 0,
  onChange,
  observations = '',
  onObservationsChange,
  readOnly = false,
  showObservationsField = true,
  theme = 'light', // 'light' | 'dark'
}) {
  const currentMeta = PAIN_LEVELS[value] || PAIN_LEVELS[0];

  const isDark = theme === 'dark';

  return (
    <div
      className={`rounded-2xl border p-6 shadow-xs transition-all ${
        isDark
          ? 'bg-slate-900/90 border-slate-800 text-slate-100'
          : 'bg-white border-surface-container-high text-on-surface'
      }`}
    >
      {/* Cabecera de la Escala EVA */}
      <div className="flex items-center justify-between mb-4 border-b border-surface-container-high pb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          <h3 className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-200' : 'text-on-surface'}`}>
            Escala Visual Analógica del Dolor (EVA 0–10)
          </h3>
        </div>
        <div className="flex items-center gap-2 font-mono">
          <span className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-on-surface-variant'}`}>Puntaje global:</span>
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold text-white shadow-xs ${currentMeta.color}`}>
            {value} / 10
          </span>
        </div>
      </div>

      {/* Botones numéricos 0 a 10 */}
      <div className="grid grid-cols-11 gap-1.5 mb-3.5">
        {PAIN_LEVELS.map((lvl) => {
          const isSelected = value === lvl.score;
          return (
            <button
              key={lvl.score}
              type="button"
              disabled={readOnly}
              onClick={() => onChange && onChange(lvl.score)}
              className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer disabled:cursor-not-allowed ${
                isSelected
                  ? `${lvl.color} text-white shadow-md scale-105 ring-2 ring-primary/20`
                  : isDark
                  ? 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 disabled:opacity-40'
                  : 'bg-surface-container-low hover:bg-surface-container text-on-surface border border-outline-variant/30 hover:border-primary/50 disabled:opacity-40'
              }`}
            >
              {lvl.score}
            </button>
          );
        })}
      </div>

      {/* Tarjeta de descripción semiológica del dolor */}
      <div
        className={`p-3.5 rounded-xl border text-xs ${
          isDark
            ? 'bg-slate-950/70 border-slate-800 text-slate-300'
            : 'bg-surface-container-low border-surface-container-high text-on-surface'
        }`}
      >
        <div className="flex items-center gap-2 mb-1">
          <span className={`w-2 h-2 rounded-full ${currentMeta.color}`} />
          <span className={`font-bold ${isDark ? currentMeta.text : 'text-on-surface'}`}>
            {currentMeta.label}
          </span>
        </div>
        <p className={`text-[11px] leading-relaxed ${isDark ? 'text-slate-400' : 'text-on-surface-variant'}`}>
          {currentMeta.desc}
        </p>
      </div>

      {/* Campo opcional de observaciones del dolor */}
      {showObservationsField && (
        <div className="mt-4">
          <label className={`block text-xs font-semibold mb-1.5 ${isDark ? 'text-slate-300' : 'text-on-surface'}`}>
            Observaciones Clínicas del Dolor (Semiología, Irradiación y Respuesta)
          </label>
          <textarea
            rows={2}
            disabled={readOnly}
            value={observations}
            onChange={(e) => onObservationsChange && onObservationsChange(e.target.value)}
            placeholder="Ej: Dolor urente en fosa ilíaca derecha, agudizado a la palpación profunda y marcha..."
            className={`w-full p-3 rounded-xl text-xs leading-relaxed outline-none transition ${
              isDark
                ? 'bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:border-teal-500 disabled:opacity-60'
                : 'bg-white border border-outline-variant/50 text-on-surface placeholder-on-surface-variant/50 focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-60'
            }`}
          />
        </div>
      )}
    </div>
  );
}

