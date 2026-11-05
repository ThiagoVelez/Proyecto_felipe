import React, { useState, useEffect, useRef } from 'react';
import {
  Inbox,
  Package,
  ScanLine,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  User,
  Building2,
  Pill,
  CreditCard,
  DollarSign,
  Camera,
  CameraOff,
  X,
  RefreshCw,
  Plus,
  SlidersHorizontal,
  Trash2,
  Edit3,
  AlertTriangle,
} from 'lucide-react';
import { BrowserPDF417Reader } from '@zxing/library';
import { apiClient } from '../services/api';
import { formatDoctorName } from '../utils/clinical';

const PRESENTATION_OPTIONS = [
  'Tableta',
  'Cápsula',
  'Jarabe',
  'Suspensión',
  'Ampolla / Inyectable',
  'Crema / Pomada',
  'Gotas / Solución Oftálmica',
  'Inhalador',
  'Óvulo',
  'Solución Oral',
  'Vial',
];

export const PharmacyDashboard = ({ user, initialTab = 'inbox' }) => {
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Buzón de Recetas
  const [inbox, setInbox] = useState([]);
  const [inboxFilter, setInboxFilter] = useState(''); // '' | 'PENDING' | 'DISPENSED'
  const [inboxSearch, setInboxSearch] = useState('');
  const [isLoadingInbox, setIsLoadingInbox] = useState(true);

  // Inventario
  const [inventory, setInventory] = useState([]);
  const [inventorySearch, setInventorySearch] = useState('');
  const [isLoadingInventory, setIsLoadingInventory] = useState(true);

  // Modal para Registrar Nuevo Medicamento
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    code_cum: '',
    generic_name: '',
    brand_name: '',
    dosage: '',
    presentation: 'Tableta',
    unit_price: '',
    stock_quantity: '',
    min_stock: '10',
    batch_number: '',
    expiry_date: '',
  });
  const [createError, setCreateError] = useState('');
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);

  // Modal para Ajustar Todos los Parámetros del Medicamento
  const [editModalItem, setEditModalItem] = useState(null);
  const [editForm, setEditForm] = useState({
    code_cum: '',
    generic_name: '',
    brand_name: '',
    dosage: '',
    presentation: 'Tableta',
    unit_price: '',
    stock_quantity: '',
    min_stock: '',
    batch_number: '',
    expiry_date: '',
  });
  const [editError, setEditError] = useState('');
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // Modal de Confirmación de Eliminación
  const [deleteModalItem, setDeleteModalItem] = useState(null);
  const [deleteError, setDeleteError] = useState('');
  const [isSubmittingDelete, setIsSubmittingDelete] = useState(false);

  // Modal de Dispensación Rápida con Escáner PDF417
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [manualDocument, setManualDocument] = useState('');
  const [scannedDocument, setScannedDocument] = useState('');
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [dispenseCoverage, setDispenseCoverage] = useState('EPS_PBS_100');
  const [dispensePaymentMethod, setDispensePaymentMethod] = useState('EPS_DIRECT');
  const [isDispensing, setIsDispensing] = useState(false);
  const [dispenseFeedback, setDispenseFeedback] = useState(null);

  const videoRef = useRef(null);
  const codeReaderRef = useRef(null);

  // Cargar datos
  const loadInbox = async () => {
    setIsLoadingInbox(true);
    try {
      const data = await apiClient.getPharmacyInbox(inboxFilter, inboxSearch);
      setInbox(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error cargando buzón de farmacia:', err);
    } finally {
      setIsLoadingInbox(false);
    }
  };

  const loadInventory = async () => {
    setIsLoadingInventory(true);
    try {
      const data = await apiClient.getPharmacyInventory();
      setInventory(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error cargando inventario:', err);
    } finally {
      setIsLoadingInventory(false);
    }
  };

  useEffect(() => {
    loadInbox();
  }, [inboxFilter, inboxSearch]);

  useEffect(() => {
    loadInventory();
  }, []);

  // Manejo de Cámara y Escáner PDF417
  const startScanner = async () => {
    setIsCameraActive(true);
    setCameraError('');
    try {
      const reader = new BrowserPDF417Reader();
      codeReaderRef.current = reader;

      const videoInputDevices = await reader.getVideoInputDevices();
      const selectedDeviceId = videoInputDevices.length > 0 ? videoInputDevices[0].deviceId : undefined;

      reader.decodeFromVideoDevice(selectedDeviceId, videoRef.current, (result) => {
        if (result) {
          const rawText = result.getText();
          // Extracción del documento de la cédula colombiana (secuencia numérica de 8 a 10 dígitos)
          const docMatch = rawText.match(/\b\d{8,10}\b/);
          const doc = docMatch ? docMatch[0] : rawText.trim();
          handleDocumentFound(doc);
          stopScanner();
        }
      });
    } catch (err) {
      console.warn('Cámara web no disponible o denegada:', err);
      setCameraError('No se pudo acceder a la cámara web. Utilice la entrada manual de contingencia.');
      setIsCameraActive(false);
    }
  };

  const stopScanner = () => {
    if (codeReaderRef.current) {
      try {
        codeReaderRef.current.reset();
      } catch (e) {
        // Ignorar
      }
      codeReaderRef.current = null;
    }
    setIsCameraActive(false);
  };

  // Al cerrar modal de escáner
  const closeScanModal = () => {
    stopScanner();
    setIsScanModalOpen(false);
    setSelectedPrescription(null);
    setScannedDocument('');
    setManualDocument('');
    setDispenseFeedback(null);
  };

  // Buscar prescripción al detectar documento (por cámara o manual)
  const handleDocumentFound = async (doc) => {
    const cleanDoc = doc.trim();
    if (!cleanDoc) return;

    setScannedDocument(cleanDoc);
    setDispenseFeedback(null);

    try {
      const presc = await apiClient.lookupPrescription(cleanDoc);
      setSelectedPrescription(presc);
      setDispenseCoverage(presc.coverage_type || 'EPS_PBS_100');
      setDispensePaymentMethod(presc.payment_method || 'EPS_DIRECT');
    } catch (err) {
      setSelectedPrescription(null);
      setDispenseFeedback({
        type: 'error',
        message: err.data?.error || `No se encontró ninguna receta pendiente para el documento ${cleanDoc}.`,
      });
    }
  };

  // Confirmar dispensación atómica
  const handleConfirmDispense = async () => {
    if (!selectedPrescription) return;

    setIsDispensing(true);
    setDispenseFeedback(null);

    try {
      const res = await apiClient.dispensePrescription({
        prescription_id: selectedPrescription.id,
        patient_document: scannedDocument || selectedPrescription.patient_document,
        coverage_type: dispenseCoverage,
        payment_method: dispensePaymentMethod,
      });

      setDispenseFeedback({
        type: 'success',
        message: 'Dispensación completada con éxito. El inventario fue descontado de forma atómica en MySQL.',
      });

      // Recargar datos
      loadInbox();
      loadInventory();
      setSelectedPrescription(res.prescription || null);
    } catch (err) {
      setDispenseFeedback({
        type: 'error',
        message: err.data?.error || err.message || 'Error en la dispensación.',
      });
    } finally {
      setIsDispensing(false);
    }
  };

  // Formulario de Creación de Nuevo Medicamento
  const resetCreateForm = () => {
    setCreateForm({
      code_cum: '',
      generic_name: '',
      brand_name: '',
      dosage: '',
      presentation: 'Tableta',
      unit_price: '',
      stock_quantity: '',
      min_stock: '10',
      batch_number: '',
      expiry_date: '',
    });
    setCreateError('');
  };

  const handleSaveNewMedication = async (e) => {
    e.preventDefault();
    setCreateError('');

    if (!createForm.code_cum.trim()) {
      setCreateError('El código CUM es obligatorio.');
      return;
    }
    if (!createForm.generic_name.trim()) {
      setCreateError('El principio activo (nombre genérico) es obligatorio.');
      return;
    }
    if (!createForm.dosage.trim()) {
      setCreateError('La concentración / dosis es obligatoria (ej: 500 mg, 1 g).');
      return;
    }
    if (!createForm.presentation.trim()) {
      setCreateError('La forma farmacéutica o presentación es obligatoria.');
      return;
    }
    if (!createForm.unit_price || parseFloat(createForm.unit_price) < 0) {
      setCreateError('El precio unitario en COP debe ser mayor o igual a 0.');
      return;
    }
    if (!createForm.stock_quantity || parseInt(createForm.stock_quantity, 10) < 0) {
      setCreateError('La cantidad inicial en stock debe ser mayor o igual a 0.');
      return;
    }
    if (!createForm.batch_number.trim()) {
      setCreateError('El número de lote es obligatorio.');
      return;
    }
    if (!createForm.expiry_date) {
      setCreateError('La fecha de vencimiento es obligatoria.');
      return;
    }

    setIsSubmittingCreate(true);
    try {
      const payload = {
        code_cum: createForm.code_cum.trim(),
        generic_name: createForm.generic_name.trim(),
        brand_name: createForm.brand_name.trim(),
        dosage: createForm.dosage.trim(),
        presentation: createForm.presentation.trim(),
        unit_price: parseFloat(createForm.unit_price),
        stock_quantity: parseInt(createForm.stock_quantity, 10),
        min_stock: parseInt(createForm.min_stock || '10', 10),
        batch_number: createForm.batch_number.trim(),
        expiry_date: `${createForm.expiry_date}T00:00:00Z`,
        is_active: true,
      };

      await apiClient.addInventoryItem(payload);
      setIsCreateModalOpen(false);
      resetCreateForm();
      loadInventory();
    } catch (err) {
      setCreateError(err.data?.error || err.message || 'Error al registrar el medicamento.');
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  // Apertura y Guardado de Ajuste Completo de Medicamento
  const openEditModal = (item) => {
    setEditModalItem(item);
    setEditError('');
    setEditForm({
      code_cum: item.code_cum || '',
      generic_name: item.generic_name || '',
      brand_name: item.brand_name || '',
      dosage: item.dosage || '',
      presentation: item.presentation || 'Tableta',
      unit_price: item.unit_price !== undefined ? String(item.unit_price) : '',
      stock_quantity: item.stock_quantity !== undefined ? String(item.stock_quantity) : '',
      min_stock: item.min_stock !== undefined ? String(item.min_stock) : '10',
      batch_number: item.batch_number || '',
      expiry_date: item.expiry_date ? String(item.expiry_date).slice(0, 10) : '',
    });
  };

  const handleSaveEditMedication = async (e) => {
    e.preventDefault();
    if (!editModalItem) return;
    setEditError('');

    if (!editForm.code_cum.trim()) {
      setEditError('El código CUM es obligatorio.');
      return;
    }
    if (!editForm.generic_name.trim()) {
      setEditError('El principio activo es obligatorio.');
      return;
    }
    if (!editForm.dosage.trim()) {
      setEditError('La concentración / dosis es obligatoria.');
      return;
    }
    if (!editForm.presentation.trim()) {
      setEditError('La presentación es obligatoria.');
      return;
    }
    if (editForm.unit_price === '' || parseFloat(editForm.unit_price) < 0) {
      setEditError('El precio unitario debe ser mayor o igual a 0.');
      return;
    }
    if (editForm.stock_quantity === '' || parseInt(editForm.stock_quantity, 10) < 0) {
      setEditError('La cantidad en stock no puede ser negativa.');
      return;
    }
    if (!editForm.batch_number.trim()) {
      setEditError('El número de lote es obligatorio.');
      return;
    }
    if (!editForm.expiry_date) {
      setEditError('La fecha de vencimiento es obligatoria.');
      return;
    }

    setIsSubmittingEdit(true);
    try {
      const payload = {
        id: editModalItem.id,
        code_cum: editForm.code_cum.trim(),
        generic_name: editForm.generic_name.trim(),
        brand_name: editForm.brand_name.trim(),
        dosage: editForm.dosage.trim(),
        presentation: editForm.presentation.trim(),
        unit_price: parseFloat(editForm.unit_price),
        stock_quantity: parseInt(editForm.stock_quantity, 10),
        min_stock: parseInt(editForm.min_stock || '10', 10),
        batch_number: editForm.batch_number.trim(),
        expiry_date: `${editForm.expiry_date}T00:00:00Z`,
        is_active: true,
      };

      await apiClient.updateInventoryItem(editModalItem.id, payload);
      setEditModalItem(null);
      loadInventory();
    } catch (err) {
      setEditError(err.data?.error || err.message || 'Error al actualizar medicamento.');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Eliminación de Medicamento
  const handleConfirmDelete = async () => {
    if (!deleteModalItem) return;
    setDeleteError('');
    setIsSubmittingDelete(true);

    try {
      await apiClient.deleteInventoryItem(deleteModalItem.id);
      setDeleteModalItem(null);
      loadInventory();
    } catch (err) {
      setDeleteError(
        err.data?.error ||
          'No se puede eliminar el medicamento porque ya está referenciado en prescripciones médicas o registros históricos.'
      );
    } finally {
      setIsSubmittingDelete(false);
    }
  };

  const filteredInventory = inventory.filter((it) => {
    if (!inventorySearch.trim()) return true;
    const term = inventorySearch.toLowerCase();
    return (
      it.generic_name.toLowerCase().includes(term) ||
      (it.brand_name && it.brand_name.toLowerCase().includes(term)) ||
      it.dosage.toLowerCase().includes(term) ||
      it.code_cum.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* HEADER DE FARMACIA ADAPTATIVO */}
      <div className="bg-white rounded-2xl p-6 border border-surface-container-high shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800">
              {activeTab === 'inbox' ? 'Dispensación Farmacéutica' : 'Gestión de Inventario'}
            </span>
            <span className="text-xs text-on-surface-variant font-mono">
              Operador: {formatDoctorName(user?.full_name, user?.role || user?.role_name)} • Sede Cartago
            </span>
          </div>
          <h1 className="text-2xl font-bold text-on-surface flex items-center gap-2">
            <Package className="w-6 h-6 text-primary" />
            Gestión Farmacéutica y Control de Stock
          </h1>
          <p className="text-sm text-on-surface-variant mt-0.5">
            {activeTab === 'inbox'
              ? 'Buzón de recetarios en tiempo real, liquidación de cobertura EPS y entrega atómica con lector PDF417.'
              : 'Inventario valorizado por concentración exacta, control de lotes y registro de medicamentos.'}
          </p>
        </div>

        {/* ACCIÓN PRINCIPAL SUPERIOR SEGÚN VISTA */}
        {activeTab === 'inbox' ? (
          <button
            type="button"
            onClick={() => {
              setIsScanModalOpen(true);
              startScanner();
            }}
            className="py-3 px-5 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary/90 transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer shrink-0"
          >
            <ScanLine className="w-5 h-5" />
            Escanear Cédula del Paciente (PDF417)
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              resetCreateForm();
              setIsCreateModalOpen(true);
            }}
            className="py-3 px-5 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary/90 transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer shrink-0"
          >
            <Plus className="w-5 h-5" />
            Registrar Nuevo Medicamento
          </button>
        )}
      </div>

      {/* CONTENIDO PESTAÑA 1: BUZON DE RECETAS */}
      {activeTab === 'inbox' && (
        <div className="bg-white rounded-2xl p-6 border border-surface-container-high shadow-xs space-y-4">
          {/* BARRA DE FILTROS Y BUSQUEDA */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-outline uppercase tracking-wider">Filtrar:</span>
              <button
                type="button"
                onClick={() => setInboxFilter('')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                  inboxFilter === '' ? 'bg-primary text-white' : 'bg-surface-container text-on-surface-variant'
                }`}
              >
                Todas ({inbox.length})
              </button>
              <button
                type="button"
                onClick={() => setInboxFilter('PENDING')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                  inboxFilter === 'PENDING'
                    ? 'bg-amber-600 text-white'
                    : 'bg-surface-container text-on-surface-variant'
                }`}
              >
                Pendientes ({inbox.filter((p) => p.status === 'PENDING').length})
              </button>
              <button
                type="button"
                onClick={() => setInboxFilter('DISPENSED')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                  inboxFilter === 'DISPENSED'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-surface-container text-on-surface-variant'
                }`}
              >
                Dispensadas ({inbox.filter((p) => p.status === 'DISPENSED').length})
              </button>
            </div>

            <div className="relative w-full md:w-80">
              <input
                type="text"
                value={inboxSearch}
                onChange={(e) => setInboxSearch(e.target.value)}
                placeholder="Buscar por código (RX-) o cédula..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-surface-container-high bg-surface text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium"
              />
              <Search className="w-4 h-4 text-outline absolute left-3 top-2.5" />
            </div>
          </div>

          {/* TABLA DE RECETAS */}
          {isLoadingInbox ? (
            <div className="py-12 text-center text-outline text-sm">Cargando buzón de farmacia...</div>
          ) : inbox.length === 0 ? (
            <div className="py-12 text-center text-outline bg-surface rounded-xl border border-dashed border-surface-container-high">
              <Inbox className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-medium">No hay recetas que coincidan con el filtro.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-surface-container">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-container-low text-on-surface-variant font-mono uppercase text-[10px]">
                  <tr>
                    <th className="px-3.5 py-3">Código Receta</th>
                    <th className="px-3.5 py-3">Fecha / Hora</th>
                    <th className="px-3.5 py-3">Paciente (Cédula)</th>
                    <th className="px-3.5 py-3">Aseguradora (EPS)</th>
                    <th className="px-3.5 py-3">Medicamentos & Dosis</th>
                    <th className="px-3.5 py-3 text-right">Subtotal</th>
                    <th className="px-3.5 py-3 text-center">Estado</th>
                    <th className="px-3.5 py-3 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container">
                  {inbox.map((p) => {
                    const isPending = p.status === 'PENDING';
                    const timeStr = new Date(p.created_at).toLocaleString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                    return (
                      <tr key={p.id} className="hover:bg-surface-container-lowest">
                        <td className="px-3.5 py-3 font-mono font-bold text-primary">{p.unique_code}</td>
                        <td className="px-3.5 py-3 text-outline font-mono">{timeStr}</td>
                        <td className="px-3.5 py-3">
                          <div className="font-semibold text-on-surface">{p.patient_name}</div>
                          <div className="text-[11px] font-mono text-outline">CC: {p.patient_document}</div>
                        </td>
                        <td className="px-3.5 py-3">
                          <span className="font-medium text-on-surface">{p.patient_eps || 'Particular'}</span>
                          <span className="block text-[10px] text-outline font-mono">{p.coverage_type}</span>
                        </td>
                        <td className="px-3.5 py-3 max-w-xs">
                          <ul className="space-y-0.5">
                            {p.items?.map((it, idx) => (
                              <li key={idx} className="truncate">
                                • <strong className="text-on-surface">{it.medication_name}</strong>{' '}
                                <span className="px-1 py-0.2 rounded bg-surface-container text-primary font-mono font-bold text-[10px]">
                                  {it.dosage}
                                </span>{' '}
                                ({it.quantity_prescribed} unds)
                              </li>
                            ))}
                          </ul>
                        </td>
                        <td className="px-3.5 py-3 text-right font-mono font-bold text-on-surface">
                          ${Number(p.subtotal_amount).toLocaleString('es-CO')}
                        </td>
                        <td className="px-3.5 py-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              isPending ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {isPending ? 'Pendiente' : 'Dispensada'}
                          </span>
                        </td>
                        <td className="px-3.5 py-3 text-center">
                          {isPending ? (
                            <button
                              type="button"
                              onClick={() => {
                                setScannedDocument(p.patient_document);
                                setSelectedPrescription(p);
                                setIsScanModalOpen(true);
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-primary text-white text-[11px] font-semibold hover:bg-primary/90 transition-all cursor-pointer"
                            >
                              Dispensar
                            </button>
                          ) : (
                            <span className="text-[11px] text-outline italic">Entregada</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* CONTENIDO PESTAÑA 2: INVENTARIO GENERAL */}
      {activeTab === 'inventory' && (
        <div className="bg-white rounded-2xl p-6 border border-surface-container-high shadow-xs space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <h2 className="text-base font-bold text-on-surface flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              Catálogo de Fármacos Diferenciados por Concentración ({filteredInventory.length})
            </h2>

            <div className="relative w-full md:w-80">
              <input
                type="text"
                value={inventorySearch}
                onChange={(e) => setInventorySearch(e.target.value)}
                placeholder="Buscar por fármaco, concentración o CUM..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-surface-container-high bg-surface text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium"
              />
              <Search className="w-4 h-4 text-outline absolute left-3 top-2.5" />
            </div>
          </div>

          {isLoadingInventory ? (
            <div className="py-12 text-center text-outline text-sm">Cargando catálogo de inventario...</div>
          ) : filteredInventory.length === 0 ? (
            <div className="py-12 text-center text-outline bg-surface rounded-xl border border-dashed border-surface-container-high">
              <Package className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-medium">No se encontraron medicamentos en el inventario.</p>
              <button
                type="button"
                onClick={() => {
                  resetCreateForm();
                  setIsCreateModalOpen(true);
                }}
                className="mt-3 px-3 py-1.5 rounded-xl bg-primary text-white text-xs font-semibold cursor-pointer"
              >
                + Registrar Primer Medicamento
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-surface-container">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-container-low text-on-surface-variant font-mono uppercase text-[10px]">
                  <tr>
                    <th className="px-3.5 py-3">Código CUM</th>
                    <th className="px-3.5 py-3">Principio Activo</th>
                    <th className="px-3.5 py-3">Nombre Comercial</th>
                    <th className="px-3.5 py-3">Concentración / Dosis</th>
                    <th className="px-3.5 py-3">Presentación</th>
                    <th className="px-3.5 py-3 text-right">Precio Unitario</th>
                    <th className="px-3.5 py-3 text-center">Stock Actual</th>
                    <th className="px-3.5 py-3">Lote y Vencimiento</th>
                    <th className="px-3.5 py-3 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container">
                  {filteredInventory.map((it) => {
                    const isLowStock = it.stock_quantity <= it.min_stock;
                    return (
                      <tr key={it.id} className="hover:bg-surface-container-lowest">
                        <td className="px-3.5 py-3 font-mono font-bold text-outline">{it.code_cum}</td>
                        <td className="px-3.5 py-3 font-semibold text-on-surface">{it.generic_name}</td>
                        <td className="px-3.5 py-3 text-on-surface-variant">{it.brand_name || '-'}</td>
                        <td className="px-3.5 py-3">
                          <span className="px-2 py-0.5 rounded bg-primary/10 text-primary font-bold font-mono">
                            {it.dosage}
                          </span>
                        </td>
                        <td className="px-3.5 py-3 text-outline">{it.presentation}</td>
                        <td className="px-3.5 py-3 text-right font-mono font-bold text-on-surface">
                          ${Number(it.unit_price).toLocaleString('es-CO')} COP
                        </td>
                        <td className="px-3.5 py-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full font-mono font-bold text-xs ${
                              isLowStock
                                ? 'bg-rose-100 text-rose-800 ring-1 ring-rose-300'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {it.stock_quantity} und
                          </span>
                          {isLowStock && (
                            <span className="block text-[9px] text-rose-600 font-bold uppercase mt-0.5">
                              Bajo Mínimo
                            </span>
                          )}
                        </td>
                        <td className="px-3.5 py-3 text-outline font-mono text-[11px]">
                          <div>Lote: {it.batch_number}</div>
                          <div>Vence: {it.expiry_date ? String(it.expiry_date).slice(0, 10) : '-'}</div>
                        </td>
                        <td className="px-3.5 py-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => openEditModal(it)}
                              className="px-2.5 py-1 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1"
                              title="Ajustar todos los parámetros del medicamento"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-primary" />
                              Ajustar
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setDeleteError('');
                                setDeleteModalItem(it);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1"
                              title="Eliminar medicamento"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                              Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: REGISTRAR NUEVO MEDICAMENTO */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 border border-surface-container-high shadow-2xl max-w-xl w-full space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-surface-container pb-3">
              <h3 className="font-bold text-base text-on-surface flex items-center gap-2">
                <Plus className="w-5 h-5 text-primary" />
                Registrar Nuevo Medicamento en Inventario
              </h3>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-lg text-outline hover:text-on-surface cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleSaveNewMedication} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {/* Principio Activo */}
                <div className="md:col-span-2">
                  <label className="font-bold text-on-surface uppercase tracking-wider block mb-1">
                    Principio Activo (Genérico) *
                  </label>
                  <input
                    type="text"
                    required
                    value={createForm.generic_name}
                    onChange={(e) => setCreateForm({ ...createForm, generic_name: e.target.value })}
                    placeholder="Ej: Amoxicilina, Risperidona, Ibuprofeno..."
                    className="w-full px-3 py-2 rounded-xl border border-surface-container-high text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium"
                  />
                </div>

                {/* Concentración / Dosis */}
                <div>
                  <label className="font-bold text-on-surface uppercase tracking-wider block mb-1">
                    Concentración / Dosis *
                  </label>
                  <input
                    type="text"
                    required
                    value={createForm.dosage}
                    onChange={(e) => setCreateForm({ ...createForm, dosage: e.target.value })}
                    placeholder="Ej: 250 mg, 500 mg, 1 mg, 3 mg..."
                    className="w-full px-3 py-2 rounded-xl border border-surface-container-high text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>

                {/* Nombre Comercial */}
                <div>
                  <label className="font-bold text-on-surface uppercase tracking-wider block mb-1">
                    Nombre Comercial (Opcional)
                  </label>
                  <input
                    type="text"
                    value={createForm.brand_name}
                    onChange={(e) => setCreateForm({ ...createForm, brand_name: e.target.value })}
                    placeholder="Ej: Amoxal, Motrin, Risperdal..."
                    className="w-full px-3 py-2 rounded-xl border border-surface-container-high text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>

                {/* Código CUM */}
                <div>
                  <label className="font-bold text-on-surface uppercase tracking-wider block mb-1">
                    Código CUM (Expediente INVIMA) *
                  </label>
                  <input
                    type="text"
                    required
                    value={createForm.code_cum}
                    onChange={(e) => setCreateForm({ ...createForm, code_cum: e.target.value })}
                    placeholder="Ej: CUM-199214-1"
                    className="w-full px-3 py-2 rounded-xl border border-surface-container-high text-xs font-mono uppercase focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>

                {/* Presentación */}
                <div>
                  <label className="font-bold text-on-surface uppercase tracking-wider block mb-1">
                    Presentación Farmacéutica *
                  </label>
                  <select
                    value={createForm.presentation}
                    onChange={(e) => setCreateForm({ ...createForm, presentation: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-surface-container-high text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                  >
                    {PRESENTATION_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Precio Unitario COP */}
                <div>
                  <label className="font-bold text-on-surface uppercase tracking-wider block mb-1">
                    Precio Unitario en COP ($) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    required
                    value={createForm.unit_price}
                    onChange={(e) => setCreateForm({ ...createForm, unit_price: e.target.value })}
                    placeholder="Ej: 1200"
                    className="w-full px-3 py-2 rounded-xl border border-surface-container-high text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>

                {/* Cantidad Inicial en Stock */}
                <div>
                  <label className="font-bold text-on-surface uppercase tracking-wider block mb-1">
                    Cantidad Inicial en Stock *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={createForm.stock_quantity}
                    onChange={(e) => setCreateForm({ ...createForm, stock_quantity: e.target.value })}
                    placeholder="Ej: 200"
                    className="w-full px-3 py-2 rounded-xl border border-surface-container-high text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>

                {/* Stock Mínimo de Alerta */}
                <div>
                  <label className="font-bold text-on-surface uppercase tracking-wider block mb-1">
                    Stock Mínimo de Alerta *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={createForm.min_stock}
                    onChange={(e) => setCreateForm({ ...createForm, min_stock: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-surface-container-high text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>

                {/* Número de Lote */}
                <div>
                  <label className="font-bold text-on-surface uppercase tracking-wider block mb-1">
                    Número de Lote *
                  </label>
                  <input
                    type="text"
                    required
                    value={createForm.batch_number}
                    onChange={(e) => setCreateForm({ ...createForm, batch_number: e.target.value })}
                    placeholder="Ej: LOT-AMX-2026A"
                    className="w-full px-3 py-2 rounded-xl border border-surface-container-high text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>

                {/* Fecha de Vencimiento */}
                <div className="md:col-span-2">
                  <label className="font-bold text-on-surface uppercase tracking-wider block mb-1">
                    Fecha de Vencimiento *
                  </label>
                  <input
                    type="date"
                    required
                    value={createForm.expiry_date}
                    onChange={(e) => setCreateForm({ ...createForm, expiry_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-surface-container-high text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-surface-container">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-outline hover:bg-surface-container cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCreate}
                  className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary/90 cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {isSubmittingCreate ? 'Guardando en BD...' : 'Guardar Medicamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: AJUSTAR TODOS LOS PARÁMETROS DEL MEDICAMENTO */}
      {editModalItem && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 border border-surface-container-high shadow-2xl max-w-xl w-full space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-surface-container pb-3">
              <h3 className="font-bold text-base text-on-surface flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-primary" />
                Ajustar Parámetros de Medicamento
              </h3>
              <button
                type="button"
                onClick={() => setEditModalItem(null)}
                className="p-1 rounded-lg text-outline hover:text-on-surface cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs space-y-0.5 bg-surface-container-lowest p-3 rounded-xl border border-surface-container">
              <div className="font-bold text-on-surface text-sm">
                Editando: {editModalItem.generic_name} [{editModalItem.dosage}]
              </div>
              <div className="text-outline font-mono text-[11px]">ID: {editModalItem.id}</div>
            </div>

            {editError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleSaveEditMedication} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {/* Principio Activo */}
                <div className="md:col-span-2">
                  <label className="font-bold text-on-surface uppercase tracking-wider block mb-1">
                    Principio Activo (Genérico) *
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.generic_name}
                    onChange={(e) => setEditForm({ ...editForm, generic_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-surface-container-high text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium"
                  />
                </div>

                {/* Concentración / Dosis */}
                <div>
                  <label className="font-bold text-on-surface uppercase tracking-wider block mb-1">
                    Concentración / Dosis *
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.dosage}
                    onChange={(e) => setEditForm({ ...editForm, dosage: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-surface-container-high text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>

                {/* Nombre Comercial */}
                <div>
                  <label className="font-bold text-on-surface uppercase tracking-wider block mb-1">
                    Nombre Comercial
                  </label>
                  <input
                    type="text"
                    value={editForm.brand_name}
                    onChange={(e) => setEditForm({ ...editForm, brand_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-surface-container-high text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>

                {/* Código CUM */}
                <div>
                  <label className="font-bold text-on-surface uppercase tracking-wider block mb-1">
                    Código CUM *
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.code_cum}
                    onChange={(e) => setEditForm({ ...editForm, code_cum: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-surface-container-high text-xs font-mono uppercase focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>

                {/* Presentación */}
                <div>
                  <label className="font-bold text-on-surface uppercase tracking-wider block mb-1">
                    Presentación *
                  </label>
                  <select
                    value={editForm.presentation}
                    onChange={(e) => setEditForm({ ...editForm, presentation: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-surface-container-high text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                  >
                    {PRESENTATION_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Precio Unitario COP */}
                <div>
                  <label className="font-bold text-on-surface uppercase tracking-wider block mb-1">
                    Precio Unitario en COP ($) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    required
                    value={editForm.unit_price}
                    onChange={(e) => setEditForm({ ...editForm, unit_price: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-surface-container-high text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>

                {/* Cantidad Física en Stock */}
                <div>
                  <label className="font-bold text-on-surface uppercase tracking-wider block mb-1">
                    Cantidad Física en Stock *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editForm.stock_quantity}
                    onChange={(e) => setEditForm({ ...editForm, stock_quantity: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-surface-container-high text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>

                {/* Stock Mínimo de Alerta */}
                <div>
                  <label className="font-bold text-on-surface uppercase tracking-wider block mb-1">
                    Stock Mínimo de Alerta *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={editForm.min_stock}
                    onChange={(e) => setEditForm({ ...editForm, min_stock: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-surface-container-high text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>

                {/* Número de Lote */}
                <div>
                  <label className="font-bold text-on-surface uppercase tracking-wider block mb-1">
                    Número de Lote *
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.batch_number}
                    onChange={(e) => setEditForm({ ...editForm, batch_number: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-surface-container-high text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>

                {/* Fecha de Vencimiento */}
                <div className="md:col-span-2">
                  <label className="font-bold text-on-surface uppercase tracking-wider block mb-1">
                    Fecha de Vencimiento *
                  </label>
                  <input
                    type="date"
                    required
                    value={editForm.expiry_date}
                    onChange={(e) => setEditForm({ ...editForm, expiry_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-surface-container-high text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-surface-container">
                <button
                  type="button"
                  onClick={() => setEditModalItem(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-outline hover:bg-surface-container cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary/90 cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {isSubmittingEdit ? 'Guardando Ajustes...' : 'Guardar Ajuste'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: CONFIRMAR ELIMINACIÓN DE MEDICAMENTO */}
      {deleteModalItem && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 border border-surface-container-high shadow-2xl max-w-md w-full space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 bg-rose-100 rounded-full">
                <AlertTriangle className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h3 className="font-bold text-base text-on-surface">Eliminar Medicamento</h3>
                <p className="text-xs text-outline">Esta acción retirará el fármaco del catálogo activo.</p>
              </div>
            </div>

            <div className="p-3 bg-surface rounded-xl border border-surface-container text-xs space-y-1">
              <div>
                <strong>Principio Activo:</strong> {deleteModalItem.generic_name}
              </div>
              <div>
                <strong>Dosis / Concentración:</strong> {deleteModalItem.dosage}
              </div>
              <div>
                <strong>Código CUM:</strong> {deleteModalItem.code_cum}
              </div>
              <div>
                <strong>Lote actual:</strong> {deleteModalItem.batch_number} ({deleteModalItem.stock_quantity} unds)
              </div>
            </div>

            {deleteError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-surface-container">
              <button
                type="button"
                onClick={() => setDeleteModalItem(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-outline hover:bg-surface-container cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isSubmittingDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                {isSubmittingDelete ? 'Eliminando...' : 'Eliminar Medicamento'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE DISPENSACION CON ESCANER DE CEDULA PDF417 */}
      {isScanModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 border border-surface-container-high shadow-2xl max-w-2xl w-full space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-surface-container pb-3">
              <div className="flex items-center gap-2">
                <ScanLine className="w-6 h-6 text-primary" />
                <h3 className="font-bold text-lg text-on-surface">
                  Dispensación Rápida con Lector de Cédula PDF417
                </h3>
              </div>
              <button
                type="button"
                onClick={closeScanModal}
                className="p-1.5 rounded-lg text-outline hover:text-on-surface cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* SECCION DE CAMARA / ESCANEO */}
            <div className="space-y-3">
              <div className="relative bg-black rounded-xl overflow-hidden aspect-video flex items-center justify-center border border-surface-container-high">
                <video
                  ref={videoRef}
                  className={`w-full h-full object-cover ${!isCameraActive ? 'hidden' : ''}`}
                  autoPlay
                  playsInline
                  muted
                />

                {/* GUIA VISUAL DE CODIGO PDF417 */}
                {isCameraActive && (
                  <div className="absolute inset-x-12 inset-y-16 border-2 border-dashed border-emerald-400 rounded-lg pointer-events-none flex items-center justify-center">
                    <span className="text-[11px] font-bold text-emerald-300 bg-black/60 px-2 py-1 rounded font-mono">
                      Alinee el código de barras PDF417 de la cédula
                    </span>
                  </div>
                )}

                {!isCameraActive && (
                  <div className="text-center p-6 text-white/70 space-y-2">
                    <CameraOff className="w-10 h-10 mx-auto opacity-50" />
                    <p className="text-xs">
                      {cameraError || 'La cámara se encuentra pausada o no está disponible.'}
                    </p>
                    <button
                      type="button"
                      onClick={startScanner}
                      className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary/90 cursor-pointer"
                    >
                      Activar Cámara
                    </button>
                  </div>
                )}
              </div>

              {/* ENTRADA MANUAL DE CONTINGENCIA Y SIMULACION */}
              <div className="p-3 bg-surface rounded-xl border border-surface-container space-y-2">
                <label className="text-[11px] font-bold text-outline uppercase tracking-wider block">
                  Entrada Manual de Contingencia (Cédula de Ciudadanía)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={manualDocument}
                    onChange={(e) => setManualDocument(e.target.value)}
                    placeholder="Número de cédula del paciente..."
                    className="flex-1 px-3 py-2 rounded-xl border border-surface-container-high bg-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={() => handleDocumentFound(manualDocument)}
                    className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary/90 cursor-pointer"
                  >
                    Buscar Receta
                  </button>
                </div>
              </div>
            </div>

            {/* FEEDBACK DEL ESCANEO / DISPENSACION */}
            {dispenseFeedback && (
              <div
                className={`p-3.5 rounded-xl border text-xs flex items-center gap-2.5 ${
                  dispenseFeedback.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900 font-semibold'
                    : 'bg-rose-50 border-rose-200 text-rose-900 font-semibold'
                }`}
              >
                {dispenseFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                )}
                <span>{dispenseFeedback.message}</span>
              </div>
            )}

            {/* DETALLE DE LA RECETA HALLADA */}
            {selectedPrescription && (
              <div className="space-y-4 p-4 rounded-xl bg-surface-container-lowest border border-surface-container">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-surface-container pb-2">
                  <div>
                    <span className="text-[10px] text-outline uppercase font-mono block">Receta Identificada:</span>
                    <span className="font-mono text-base font-bold text-primary">
                      {selectedPrescription.unique_code}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-outline uppercase block">Paciente Titular:</span>
                    <span className="font-bold text-sm text-on-surface">
                      {selectedPrescription.patient_name} (CC: {selectedPrescription.patient_document})
                    </span>
                  </div>
                </div>

                {/* LISTADO DE FARMACOS CON CONCENTRACIONES */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-outline uppercase tracking-wider block">
                    Fármacos Prescritos a Entregar
                  </span>
                  <div className="divide-y divide-surface-container border border-surface-container rounded-lg overflow-hidden">
                    {selectedPrescription.items?.map((it, idx) => (
                      <div key={idx} className="p-2.5 bg-white flex items-center justify-between text-xs">
                        <div>
                          <span className="font-semibold text-on-surface">{it.medication_name}</span>{' '}
                          <span className="px-1.5 py-0.2 rounded bg-primary/10 text-primary font-mono font-bold text-[10px]">
                            {it.dosage}
                          </span>
                          <div className="text-[11px] text-outline">
                            Cantidad: <strong>{it.quantity_prescribed} unds</strong> • Valor unit: $
                            {Number(it.unit_price).toLocaleString('es-CO')} COP
                          </div>
                        </div>
                        <div className="font-mono font-bold text-on-surface">
                          ${Number(it.total_item_price).toLocaleString('es-CO')} COP
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* SELECTOR DE COBERTURA Y METODO DE PAGO */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="text-[11px] font-bold text-on-surface uppercase tracking-wider block mb-1">
                      Esquema de Cobertura
                    </label>
                    <select
                      value={dispenseCoverage}
                      onChange={(e) => setDispenseCoverage(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-surface-container-high bg-white text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium"
                    >
                      <option value="EPS_PBS_100">Cubierto por EPS / Plan de Beneficios (PBS 100%)</option>
                      <option value="COPAY">Copago / Cuota Moderadora (15%)</option>
                      <option value="PARTICULAR">Venta Directa / Particular (100%)</option>
                    </select>
                  </div>

                  {dispenseCoverage !== 'EPS_PBS_100' && (
                    <div>
                      <label className="text-[11px] font-bold text-on-surface uppercase tracking-wider block mb-1">
                        Método de Recaudo
                      </label>
                      <select
                        value={dispensePaymentMethod}
                        onChange={(e) => setDispensePaymentMethod(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-surface-container-high bg-white text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium"
                      >
                        <option value="CASH">Efectivo en Ventanilla</option>
                        <option value="DEBIT_CARD">Tarjeta Débito</option>
                        <option value="CREDIT_CARD">Tarjeta de Crédito</option>
                        <option value="TRANSFER">Transferencia / QR</option>
                      </select>
                    </div>
                  )}
                </div>

                {/* TOTAL LIQUIDADO */}
                <div className="p-3 rounded-xl bg-surface flex items-center justify-between text-xs">
                  <div>
                    <span className="text-outline block">Total Acumulado:</span>
                    <span className="font-mono text-base font-bold text-on-surface">
                      ${Number(selectedPrescription.subtotal_amount).toLocaleString('es-CO')} COP
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-outline block">A pagar por paciente:</span>
                    <span className="font-mono text-lg font-bold text-primary">
                      {dispenseCoverage === 'EPS_PBS_100'
                        ? '$0 COP (Cubierto EPS)'
                        : dispenseCoverage === 'COPAY'
                        ? `$${(Number(selectedPrescription.subtotal_amount) * 0.15).toLocaleString('es-CO')} COP`
                        : `$${Number(selectedPrescription.subtotal_amount).toLocaleString('es-CO')} COP`}
                    </span>
                  </div>
                </div>

                {/* BOTON DE CONFIRMACION ATOMICA */}
                {selectedPrescription.status === 'PENDING' ? (
                  <button
                    type="button"
                    onClick={handleConfirmDispense}
                    disabled={isDispensing}
                    className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isDispensing ? (
                      <span>Procesando transacción ACID en MySQL...</span>
                    ) : (
                      <>
                        <CheckCircle2 className="w-5 h-5" />
                        Confirmar Entrega y Descontar de Inventario
                      </>
                    )}
                  </button>
                ) : (
                  <div className="p-3 text-center bg-emerald-100 text-emerald-900 rounded-xl font-bold text-xs">
                    Esta receta ya fue dispensada el {selectedPrescription.dispensed_at?.slice(0, 19) || 'hoy'}.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PharmacyDashboard;
