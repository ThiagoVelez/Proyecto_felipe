const BRANCHES_STORAGE_KEY = 'saludconecta_admin_branches';

// Lista inicial de sedes institucionales
export const INITIAL_BRANCHES = [
  {
    id: 'br-01',
    name: 'Sede Cartago - Hospital Central',
    level: 'Nivel II • Hospitalario',
    municipality: 'Cartago, Valle del Cauca',
    capacity: '6/8 Consultorios • 2 Quirófanos',
    connectivity: '99.9%',
    staffCount: 12,
    status: 'Operativo',
    description: 'Centro de referencia regional. Servicio de Urgencias 24/7, Consulta Especializada y Quirófanos.',
  },
  {
    id: 'br-02',
    name: 'Sede La Unión - Urgencias',
    level: 'Nivel I • Trauma',
    municipality: 'La Unión, Valle del Cauca',
    capacity: '3/4 Boxes de Triaje',
    connectivity: '99.7%',
    staffCount: 6,
    status: 'Operativo',
    description: 'Unidad de Atención Rápida y Estabilización de Trauma. Triaje Manchester sincronizado.',
  },
  {
    id: 'br-03',
    name: 'Sede Tuluá - Ambulatoria',
    level: 'Ambulatorio • Promoción & Prevención',
    municipality: 'Tuluá, Valle del Cauca',
    capacity: '4/4 Consultorios Médicos',
    connectivity: '99.8%',
    staffCount: 5,
    status: 'Operativo',
    description: 'Centro de Atención Ambulatoria, Promoción de la Salud y Prevención de la Enfermedad.',
  },
  {
    id: 'br-04',
    name: 'Brigada Rural Desconectada',
    level: 'PWA Sync • Atención en Terreno',
    municipality: 'Zonas Rurales Valle Norte',
    capacity: 'Módulo Móvil • 0 Folios Pendientes',
    connectivity: 'Offline (Sync)',
    staffCount: 3,
    status: 'En Espera',
    description: 'Módulo de atención rural en veredas del norte del Valle. Almacenamiento IndexedDB y sincronización por lotes.',
  },
];

// Las sedes aun no tienen API: el CRUD del administrador las guarda en el almacenamiento de este navegador
export const loadBranches = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(BRANCHES_STORAGE_KEY));
    return Array.isArray(saved) ? saved : INITIAL_BRANCHES;
  } catch {
    return INITIAL_BRANCHES;
  }
};

export const saveBranches = (branches) => {
  localStorage.setItem(BRANCHES_STORAGE_KEY, JSON.stringify(branches));
};
