import React, { useId, useState } from 'react';
import { Building2, Check, ChevronDown } from 'lucide-react';

export const BranchAccordion = ({ label, branches, value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const baseId = useId();
  const labelId = `${baseId}-label`;
  const panelId = `${baseId}-panel`;

  const handleSelect = (name) => {
    onChange(name);
    setIsOpen(false);
  };

  return (
    <div>
      <span id={labelId} className="block text-[11px] font-semibold text-on-surface mb-1">
        {label}
      </span>
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={panelId}
        aria-labelledby={`${labelId} ${baseId}-value`}
        onClick={() => setIsOpen((open) => !open)}
        className="w-full h-8 pl-2.5 pr-2.5 flex items-center gap-2 text-xs bg-surface-container-low border border-outline-variant rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-on-surface cursor-pointer"
      >
        <Building2 className="w-3.5 h-3.5 text-outline shrink-0" />
        <span id={`${baseId}-value`} className={`flex-1 min-w-0 truncate text-left ${value ? '' : 'text-outline'}`}>
          {value || 'No hay sedes registradas'}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-outline shrink-0 transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* grid-rows anima la altura real del contenido; inert saca del tabulador las opciones ocultas */}
      <div
        id={panelId}
        role="region"
        aria-labelledby={labelId}
        inert={isOpen ? undefined : ''}
        className={`grid transition-[grid-template-rows] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none ${
          isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
      >
        <div className="overflow-hidden min-h-0">
          <ul className="mt-1 max-h-44 overflow-y-auto rounded-lg border border-outline-variant bg-surface-container-lowest divide-y divide-outline-variant/30">
            {branches.length === 0 && (
              <li className="px-2.5 py-2 text-[11px] text-outline">No hay sedes registradas</li>
            )}
            {branches.map((branch) => (
              <li key={branch.id}>
                <button
                  type="button"
                  aria-pressed={branch.name === value}
                  onClick={() => handleSelect(branch.name)}
                  className="w-full px-2.5 py-1.5 flex items-center gap-2 text-left hover:bg-surface-container-low focus:outline-none focus:bg-surface-container-low cursor-pointer"
                >
                  <span
                    title={branch.status}
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      branch.status === 'Operativo' ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                  />
                  <span className="flex-1 min-w-0">
                    <span className="block truncate text-xs font-semibold text-on-surface">{branch.name}</span>
                    <span className="block truncate text-[10px] text-outline">
                      {branch.municipality} • {branch.status}
                    </span>
                  </span>
                  {branch.name === value && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
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
