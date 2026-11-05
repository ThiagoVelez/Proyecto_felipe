import React, { useId, useState } from 'react';
import { Building2, Check, ChevronDown } from 'lucide-react';

export const BranchAccordion = ({ label, branches = [], value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const baseId = useId();
  const labelId = `${baseId}-label`;
  const panelId = `${baseId}-panel`;

  const handleSelect = (name) => {
    onChange?.(name);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <span id={labelId} className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
        {label}
      </span>
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={panelId}
        aria-labelledby={`${labelId} ${baseId}-value`}
        onClick={() => setIsOpen((open) => !open)}
        className="w-full h-10 px-3.5 flex items-center gap-2.5 text-sm font-medium bg-slate-50/50 hover:bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#005c55] focus:ring-2 focus:ring-teal-500/20 text-slate-800 cursor-pointer shadow-2xs transition-all text-left"
      >
        <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
        <span id={`${baseId}-value`} className={`flex-1 min-w-0 truncate ${value ? 'text-slate-800' : 'text-slate-400'}`}>
          {value || 'Seleccione sede operativa...'}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Menú desplegable animado */}
      <div
        id={panelId}
        role="region"
        aria-labelledby={labelId}
        inert={isOpen ? undefined : ''}
        className={`absolute left-0 right-0 z-30 mt-1 grid transition-[grid-template-rows,opacity] duration-200 ease-out ${
          isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 pointer-events-none'
        }`}
      >
        <div className="overflow-hidden min-h-0 shadow-xl rounded-xl">
          <ul className="max-h-52 overflow-y-auto rounded-xl border border-slate-200 bg-white divide-y divide-slate-100 shadow-lg">
            {branches.length === 0 && (
              <li className="px-3 py-2 text-xs text-slate-400">No hay sedes registradas</li>
            )}
            {branches.map((branch) => (
              <li key={branch.id || branch.name}>
                <button
                  type="button"
                  aria-pressed={branch.name === value}
                  onClick={() => handleSelect(branch.name)}
                  className="w-full px-3.5 py-2 flex items-center gap-2.5 text-left hover:bg-teal-50/60 focus:outline-none focus:bg-teal-50/60 cursor-pointer transition-colors"
                >
                  <span
                    title={branch.status}
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      branch.status === 'Operativo' ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                  />
                  <span className="flex-1 min-w-0">
                    <span className="block truncate text-xs font-semibold text-slate-800">{branch.name}</span>
                    <span className="block truncate text-[10px] text-slate-400">
                      {branch.municipality || 'Valle del Cauca'} • {branch.status || 'Operativo'}
                    </span>
                  </span>
                  {branch.name === value && <Check className="w-4 h-4 text-[#005c55] shrink-0" />}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default BranchAccordion;
