import React from 'react';
import { AlertTriangle, ShieldCheck } from 'lucide-react';

/**
 * Resumen de alergias registradas del paciente. Muestra unicamente lo que
 * devuelve la API; si no hay alergias lo indica de forma explicita.
 */
export const AllergyBanner = ({ allergies = [], action }) => {
  if (allergies.length === 0) {
    return (
      <div className="w-full bg-emerald-50 border border-emerald-200 text-emerald-950 px-4 py-2.5 rounded-xl flex items-center gap-2.5">
        <ShieldCheck className="w-5 h-5 shrink-0 text-emerald-600" />
        <span className="text-xs font-semibold">Sin alergias registradas para este paciente.</span>
        {action}
      </div>
    );
  }

  return (
    <div role="alert" className="w-full bg-red-600 text-white px-4 py-2.5 rounded-xl flex items-center justify-between gap-3 shadow-xs">
      <div className="flex items-center gap-2.5 min-w-0">
        <AlertTriangle className="w-5 h-5 shrink-0 text-white" />
        <div className="flex flex-col min-w-0">
          <span className="font-bold text-xs uppercase tracking-wide">Alergias registradas</span>
          <ul className="text-[11px] opacity-95 leading-tight flex flex-wrap gap-x-4 gap-y-0.5">
            {allergies.map((a) => (
              <li key={a.id ?? a.active_ingredient}>
                <strong className="uppercase">{a.active_ingredient}</strong> ({a.severity})
                {a.notes ? `: ${a.notes}` : ''}
              </li>
            ))}
          </ul>
        </div>
      </div>
      {action}
    </div>
  );
};

export default AllergyBanner;
