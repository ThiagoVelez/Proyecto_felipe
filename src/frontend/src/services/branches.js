import { useCallback, useEffect, useState } from 'react';
import { apiClient } from './api';

// Lista inicial de sedes institucionales
export const INITIAL_BRANCHES = [
  {
    id: 'br-01',
    name: 'Sede Cartago - Hospital Central',
    level: 'Nivel II • Hospitalario',
    municipality: 'Cartago, Valle del Cauca',
    status: 'Operativo',
    description: 'Centro de referencia regional. Servicio de Urgencias 24/7, Consulta Especializada y Quirófanos.',
  },
  {
    id: 'br-02',
    name: 'Sede La Unión - Urgencias',
    level: 'Nivel I • Trauma',
    municipality: 'La Unión, Valle del Cauca',
    status: 'Operativo',
    description: 'Unidad de Atención Rápida y Estabilización de Trauma. Triaje Manchester sincronizado.',
  },
  {
    id: 'br-03',
    name: 'Sede Tuluá - Ambulatoria',
    level: 'Ambulatorio • Promoción & Prevención',
    municipality: 'Tuluá, Valle del Cauca',
    status: 'Operativo',
    description: 'Centro de Atención Ambulatoria, Promoción de la Salud y Prevención de la Enfermedad.',
  },
  {
    id: 'br-04',
    name: 'Brigada Rural Desconectada',
    level: 'PWA Sync • Atención en Terreno',
    municipality: 'Zonas Rurales Valle Norte',
    status: 'En Espera',
    description: 'Módulo de atención rural en veredas del norte del Valle. Almacenamiento IndexedDB y sincronización por lotes.',
  },
];

// Las sedes viven en el servidor (GET /api/v1/branches). INITIAL_BRANCHES solo se muestra mientras llega la
// respuesta o si el servidor no responde, para que el login siga siendo usable.
export const BRANCHES_UPDATED_EVENT = 'saludconecta_branches_updated';

export const notifyBranchesChanged = () => {
  window.dispatchEvent(new CustomEvent(BRANCHES_UPDATED_EVENT));
};

// Compatibilidad: devuelve la lista inicial (la vigente se obtiene con useBranches)
export const loadBranches = () => INITIAL_BRANCHES;

export const useBranches = () => {
  const [branches, setBranches] = useState(INITIAL_BRANCHES);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    try {
      const list = await apiClient.getBranches();
      setBranches(list);
      setError('');
    } catch (err) {
      setError(err.message || 'No fue posible consultar las sedes.');
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener(BRANCHES_UPDATED_EVENT, refresh);
    return () => window.removeEventListener(BRANCHES_UPDATED_EVENT, refresh);
  }, [refresh]);

  return { branches, loaded, error, refresh };
};
