import React, { useCallback, useEffect, useState } from 'react';
import { Search, UserPlus, Users, Loader2, AlertTriangle, RefreshCw, ArrowRight } from 'lucide-react';
import { apiClient } from '../services/api';
import PatientRegisterModal from './PatientRegisterModal';
import { DOCUMENT_TYPES, calculateAge, getErrorMessage, getFullName } from '../utils/clinical';

/**
 * Selector de paciente respaldado por la API: busqueda exacta por documento,
 * listado reciente y registro de nuevos pacientes. Entrega el paciente completo
 * (con alergias) mediante onSelect.
 */
export const PatientPicker = ({ onSelect, title = 'Seleccionar paciente' }) => {
  const [documentType, setDocumentType] = useState('CC');
  const [documentNumber, setDocumentNumber] = useState('');
  const [patients, setPatients] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [selectingId, setSelectingId] = useState('');
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);

  const loadPatients = useCallback(async () => {
    setListLoading(true);
    setListError('');
    try {
      setPatients(await apiClient.listPatients({ limit: 50, offset: 0 }));
    } catch (err) {
      setListError(getErrorMessage(err, 'No fue posible cargar el listado de pacientes.'));
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPatients();
  }, [loadPatients]);

  const choosePatient = async (patient) => {
    setSelectingId(patient.id);
    setSearchError('');
    try {
      // El detalle incluye las alergias vigentes, necesarias para la seguridad farmacologica
      const detail = await apiClient.getPatient(patient.id);
      onSelect(detail);
    } catch (err) {
      setSearchError(getErrorMessage(err, 'No fue posible cargar el detalle del paciente.'));
    } finally {
      setSelectingId('');
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    const number = documentNumber.trim();
    if (!number) {
      setSearchError('Ingrese el número de documento a buscar.');
      return;
    }
    setSearching(true);
    setSearchError('');
    try {
      const found = await apiClient.lookupPatient(documentType, number);
      await choosePatient(found);
    } catch (err) {
      setSearchError(
        err?.status === 404
          ? 'No existe un paciente con ese documento. Puede registrarlo con el botón "Registrar paciente".'
          : getErrorMessage(err, 'No fue posible buscar al paciente.')
      );
    } finally {
      setSearching(false);
    }
  };

  const handleCreated = (patient) => {
    setIsRegisterOpen(false);
    loadPatients();
    choosePatient(patient);
  };

  const busy = searching || Boolean(selectingId);

  return (
    <section className="bg-white rounded-2xl p-6 shadow-xs border border-surface-container-high space-y-5" aria-labelledby="patient-picker-title">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-container-high pb-3">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <h2 id="patient-picker-title" className="text-base font-bold text-on-surface">
            {title}
          </h2>
        </div>
        <button
          type="button"
          onClick={() => setIsRegisterOpen(true)}
          className="h-9 px-4 rounded-xl bg-primary hover:bg-primary-container text-white font-semibold text-xs flex items-center gap-2 shadow-xs cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>Registrar paciente</span>
        </button>
      </div>

      <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
        <div className="md:col-span-4">
          <label htmlFor="picker-document-type" className="block text-xs font-semibold text-on-surface mb-1">
            Tipo de documento
          </label>
          <select
            id="picker-document-type"
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value)}
            disabled={busy}
            className="w-full h-10 px-3 rounded-xl border border-outline-variant/40 bg-surface-container-low text-xs font-medium"
          >
            {DOCUMENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-5">
          <label htmlFor="picker-document-number" className="block text-xs font-semibold text-on-surface mb-1">
            Número de documento
          </label>
          <input
            id="picker-document-number"
            type="text"
            value={documentNumber}
            onChange={(e) => {
              setDocumentNumber(e.target.value);
              setSearchError('');
            }}
            disabled={busy}
            className="w-full h-10 px-3 rounded-xl border border-outline-variant/40 bg-surface-container-low text-xs font-mono"
          />
        </div>
        <div className="md:col-span-3">
          <button
            type="submit"
            disabled={busy}
            className="w-full h-10 px-4 rounded-xl bg-secondary hover:opacity-90 text-white font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            <span>{searching ? 'Buscando...' : 'Buscar por documento'}</span>
          </button>
        </div>
      </form>

      {searchError && (
        <div role="alert" className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <span>{searchError}</span>
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-outline font-mono">Pacientes registrados</h3>
          <button
            type="button"
            onClick={loadPatients}
            disabled={listLoading}
            className="px-2.5 py-1.5 rounded-lg text-primary text-xs font-semibold flex items-center gap-1.5 hover:bg-primary/5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${listLoading ? 'animate-spin' : ''}`} />
            <span>Actualizar listado</span>
          </button>
        </div>

        {listLoading && (
          <p role="status" className="text-xs text-on-surface-variant flex items-center gap-2 py-3">
            <Loader2 className="w-4 h-4 animate-spin" /> Cargando pacientes...
          </p>
        )}

        {listError && (
          <div role="alert" className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>{listError}</span>
          </div>
        )}

        {!listLoading && !listError && patients.length === 0 && (
          <p className="text-xs text-on-surface-variant py-3">
            No hay pacientes registrados. Use "Registrar paciente" para crear el primero.
          </p>
        )}

        {patients.length > 0 && (
          <ul className="divide-y divide-surface-container-high rounded-xl border border-surface-container-high overflow-hidden">
            {patients.map((p) => {
              const age = calculateAge(p.birth_date);
              return (
                <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-surface-container-low/50">
                  <div className="min-w-0">
                    <div className="font-bold text-sm text-on-surface truncate">{getFullName(p)}</div>
                    <div className="font-mono text-[11px] text-on-surface-variant">
                      {p.document_type} {p.document_number}
                      {age !== null ? ` | ${age} años` : ''}
                      {p.eps_name ? ` | ${p.eps_name}` : ''}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => choosePatient(p)}
                    disabled={busy}
                    aria-label={`Seleccionar a ${getFullName(p)}`}
                    className="px-3 py-1.5 rounded-lg bg-primary hover:bg-primary-container text-white text-[11px] font-bold flex items-center gap-1 shrink-0 cursor-pointer disabled:opacity-50"
                  >
                    {selectingId === p.id ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                    <span>Seleccionar</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <PatientRegisterModal isOpen={isRegisterOpen} onClose={() => setIsRegisterOpen(false)} onCreated={handleCreated} />
    </section>
  );
};

export default PatientPicker;
