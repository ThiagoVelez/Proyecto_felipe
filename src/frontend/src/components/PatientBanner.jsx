import React from 'react';
import { RefreshCw } from 'lucide-react';
import { calculateAge, getFullName, getInitials } from '../utils/clinical';

/** Cabecera de identidad del paciente seleccionado, alimentada solo con datos de la API. */
export const PatientBanner = ({ patient, onChangePatient, children }) => {
  const age = calculateAge(patient?.birth_date);

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-4 min-w-0">
        <div className="w-12 h-12 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center font-bold text-primary text-sm shrink-0">
          {getInitials(patient)}
        </div>
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg font-bold text-on-surface truncate">{getFullName(patient)}</h1>
            <span className="px-2 py-0.5 rounded bg-surface-container-high font-mono text-xs font-semibold text-on-surface-variant">
              {patient?.document_type} {patient?.document_number}
            </span>
            {patient?.blood_type && (
              <span className="px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-bold text-[10px] uppercase">
                RH {patient.blood_type}
              </span>
            )}
            {children}
          </div>
          <div className="flex items-center gap-2 text-xs text-on-surface-variant mt-0.5 flex-wrap">
            {age !== null && <span>{age} años</span>}
            {patient?.eps_name && (
              <>
                <span aria-hidden="true">|</span>
                <span className="font-semibold text-secondary">{patient.eps_name}</span>
              </>
            )}
            {patient?.affiliation_status && (
              <>
                <span aria-hidden="true">|</span>
                <span>Afiliación {patient.affiliation_status.toLowerCase()}</span>
              </>
            )}
          </div>
        </div>
      </div>
      {onChangePatient && (
        <button
          type="button"
          onClick={onChangePatient}
          className="px-3 py-1.5 rounded-xl bg-surface-container-low hover:bg-surface-container text-primary border border-outline-variant/30 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Cambiar paciente</span>
        </button>
      )}
    </div>
  );
};

export default PatientBanner;
