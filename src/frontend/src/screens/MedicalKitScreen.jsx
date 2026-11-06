import React from 'react';
import {
  Stethoscope,
  Lock,
  FileText
} from 'lucide-react';
import MedicalKitDrawer from '../components/MedicalKitDrawer';
import PatientPicker from '../components/PatientPicker';

/**
 * Pantalla asistencial para el Kit Informático Médico (v2.4 Pro).
 * Proporciona acceso al modelo anatómico interactivo multicapa y a la escala EVA.
 * Permite a los médicos registrar hallazgos y a enfermería inspeccionar en modo de solo lectura.
 */
export const MedicalKitScreen = ({
  user,
  patient,
  onSelectPatient,
  onNavigate,
}) => {
  const isNurse =
    user?.role === 'ENFERMERO' ||
    user?.role === 'ENFERMERA' ||
    Number(user?.role_id) === 3 ||
    (user?.specialty || '').toLowerCase().includes('enferm');

  const handleInjectToHce = () => {
    if (typeof onNavigate === 'function') {
      onNavigate('hce');
    }
  };

  if (!patient) {
    return (
      <div className="flex flex-col gap-6 max-w-6xl mx-auto">
        <div className="pb-4 border-b border-surface-container-high flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold text-primary uppercase tracking-wider font-mono">
                Kit Informático Médico • v2.4 Pro
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-100 text-teal-800 border border-teal-300">
                Modelo 3D & Escala EVA
              </span>
              {isNurse && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                  <Lock className="w-3 h-3" /> Solo Lectura (Enfermería)
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-on-surface">
              Seleccione un paciente para ingresar al Kit Informático Médico
            </h1>
            <p className="text-xs text-on-surface-variant mt-1">
              {isNurse
                ? 'Inspección semiológica georreferenciada de órganos, huesos, músculos y sistema vascular en modo de solo lectura (Res. 1995/1999).'
                : 'Mapeo anatómico de 4 capas, registro georreferenciado de hallazgos clínicos y cuantificación del dolor nociceptivo (EVA 0–10).'}
            </p>
          </div>
        </div>

        <PatientPicker
          title="Buscar paciente para el Kit Informático Médico"
          onSelect={onSelectPatient}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      {/* Barra superior de contexto de paciente */}
      <div className="bg-white rounded-2xl p-4 shadow-xs border border-surface-container-high flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 font-bold shrink-0">
            <Stethoscope className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-on-surface">{patient.full_name}</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-surface-container text-on-surface-variant font-bold">
                {patient.document_type} {patient.document_number}
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-teal-50 text-teal-700 border border-teal-200">
                EPS: {patient.eps_name || 'Particular'}
              </span>
            </div>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Paciente activo en consulta • {isNurse ? 'Inspección de Enfermería (Solo Lectura)' : 'Mapeo Clínico Médico'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onSelectPatient(null)}
            className="px-3 py-1.5 rounded-lg border border-outline-variant/60 hover:bg-surface-container text-xs font-semibold text-on-surface transition cursor-pointer"
          >
            Cambiar Paciente
          </button>
          {!isNurse && typeof onNavigate === 'function' && (
            <button
              type="button"
              onClick={() => onNavigate('hce')}
              className="px-3.5 py-1.5 rounded-lg bg-primary hover:bg-primary-container text-white text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Ir a Historia Clínica (HCE)</span>
            </button>
          )}
        </div>
      </div>

      {/* Renderizado embebido del Kit Informático Médico */}
      <MedicalKitDrawer
        isOpen={true}
        embedded={true}
        patient={patient}
        readOnly={isNurse}
        onInjectToHCE={handleInjectToHce}
      />
    </div>
  );
};

export default MedicalKitScreen;
