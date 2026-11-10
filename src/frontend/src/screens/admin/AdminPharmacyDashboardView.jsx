import React, { useState, useEffect } from 'react';
import {
  Pill,
  Package,
  Boxes,
  TrendingUp,
  AlertTriangle,
  Search,
  RefreshCw,
  FileText,
  DollarSign,
  User,
  ShieldCheck,
  Calendar,
  CheckCircle2,
} from 'lucide-react';
import apiClient from '../../services/api';

export const AdminPharmacyDashboardView = () => {
  const [metrics, setMetrics] = useState({
    total_items: 12,
    total_stock: 2450,
    inventory_value: 18450000,
    low_stock_count: 2,
    out_of_stock_count: 0,
    total_dispensed: 18,
    total_dispensed_amount: 1420000,
    active_reports_count: 2,
  });
  const [inbox, setInbox] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('dispensations'); // 'dispensations' | 'inventory'
  const [notice, setNotice] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [metricsRes, inboxRes, invRes] = await Promise.allSettled([
        apiClient.getPharmacyMetrics(),
        apiClient.getPharmacyInbox(),
        apiClient.getPharmacyInventory(),
      ]);

      if (metricsRes.status === 'fulfilled' && metricsRes.value) {
        setMetrics((prev) => ({ ...prev, ...metricsRes.value }));
      }
      if (inboxRes.status === 'fulfilled' && Array.isArray(inboxRes.value)) {
        setInbox(inboxRes.value);
      }
      if (invRes.status === 'fulfilled' && Array.isArray(invRes.value)) {
        setInventory(invRes.value);
      }
    } catch (err) {
      // Ignorar fallos de red silenciosos
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const filteredInbox = inbox.filter((p) => {
    const term = searchTerm.toLowerCase();
    return (
      (p.patient_name || '').toLowerCase().includes(term) ||
      (p.patient_document || '').includes(term) ||
      (p.unique_code || '').toLowerCase().includes(term)
    );
  });

  const filteredInventory = inventory.filter((i) => {
    const term = searchTerm.toLowerCase();
    return (
      (i.generic_name || '').toLowerCase().includes(term) ||
      (i.dosage || '').toLowerCase().includes(term) ||
      (i.code_cum || '').toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* ENCABEZADO */}
      <div className="p-6 rounded-2xl bg-white border border-surface-container-high shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-teal-100 border border-teal-200 flex items-center justify-center text-teal-800 shrink-0">
            <Pill className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-on-surface">
                Dashboard de Farmacia y Control de Dispensación
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-100 text-teal-900 border border-teal-200">
                Monitoreo TI
              </span>
            </div>
            <p className="text-xs text-outline mt-0.5">
              Supervisión de Despachos Farmacéuticos, Trazabilidad CUM y Valorización de Inventario • ISO/IEC 25010
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            loadData();
            setNotice('Datos de farmacia actualizados.');
            setTimeout(() => setNotice(''), 3000);
          }}
          className="h-9 px-4 rounded-xl border border-surface-container-high bg-white hover:bg-surface-container-low text-xs font-semibold text-on-surface flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-outline ${loading ? 'animate-spin' : ''}`} />
          <span>Actualizar Datos</span>
        </button>
      </div>

      {notice && (
        <div className="p-3.5 rounded-xl bg-teal-50 border border-teal-200 text-teal-950 text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-teal-700 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* TARJETAS DE MÉTRICAS GLOBALES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white border border-surface-container-high shadow-xs">
          <div className="flex items-center justify-between text-xs text-outline font-semibold mb-1">
            <span>DISPENSACIONES COMPLETADAS</span>
            <Package className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-on-surface">
            {metrics.total_dispensed || inbox.filter((p) => p.status === 'DISPENSED').length}
          </div>
          <p className="text-[11px] text-outline mt-0.5">Recetas despachadas con lector PDF417</p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-surface-container-high shadow-xs">
          <div className="flex items-center justify-between text-xs text-outline font-semibold mb-1">
            <span>VALOR DISPENSADO (PBS / COPAGO)</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-800">
            {formatCurrency(metrics.total_dispensed_amount)}
          </div>
          <p className="text-[11px] text-outline mt-0.5">Liquidación económica acumulada</p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-surface-container-high shadow-xs">
          <div className="flex items-center justify-between text-xs text-outline font-semibold mb-1">
            <span>VALORIZACIÓN TOTAL DEL STOCK</span>
            <TrendingUp className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-bold font-mono text-primary">
            {formatCurrency(metrics.inventory_value)}
          </div>
          <p className="text-[11px] text-outline mt-0.5">
            {metrics.total_items || inventory.length} fármacos • {metrics.total_stock} unidades
          </p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-surface-container-high shadow-xs">
          <div className="flex items-center justify-between text-xs text-rose-800 font-semibold mb-1">
            <span>STOCK CRÍTICO / ALERTAS</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-rose-900">
            {metrics.low_stock_count || 0}
          </div>
          <p className="text-[11px] text-rose-700/80 mt-0.5">Medicamentos bajo el umbral mínimo</p>
        </div>
      </div>

      {/* PESTAÑAS DE NAVEGACIÓN DENTRO DEL DASHBOARD */}
      <div className="flex items-center justify-between border-b border-surface-container-high">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('dispensations')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'dispensations'
                ? 'border-teal-700 text-teal-800'
                : 'border-transparent text-outline hover:text-on-surface'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Registro de Dispensaciones ({inbox.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('inventory')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'inventory'
                ? 'border-teal-700 text-teal-800'
                : 'border-transparent text-outline hover:text-on-surface'
            }`}
          >
            <Boxes className="w-4 h-4" />
            <span>Inventario Valorizado ({inventory.length})</span>
          </button>
        </div>

        <div className="relative w-64 pb-2">
          <input
            type="text"
            placeholder="Buscar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-8 pl-8 pr-2.5 rounded-lg border border-outline-variant bg-surface-container-low text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-teal-700"
          />
          <Search className="w-3.5 h-3.5 text-outline absolute left-2.5 top-2" />
        </div>
      </div>

      {/* CONTENIDO: TABLA DE DISPENSACIONES */}
      {activeTab === 'dispensations' && (
        <div className="rounded-2xl bg-white border border-surface-container-high shadow-xs overflow-hidden">
          <div className="px-5 py-3.5 border-b border-surface-container-high flex items-center justify-between bg-surface-container-low/40">
            <h3 className="font-bold text-xs uppercase tracking-wider text-outline">
              Historial de Recetas y Entregas en Farmacia
            </h3>
            <span className="text-xs font-mono text-outline">
              Sede Cartago • Hospital Central
            </span>
          </div>

          {filteredInbox.length === 0 ? (
            <div className="p-10 text-center text-outline text-xs">
              No hay registros de dispensación disponibles en este momento.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-container-low border-b border-surface-container-high text-outline uppercase font-mono text-[10px]">
                  <tr>
                    <th className="py-2.5 px-4">Código / Receta</th>
                    <th className="py-2.5 px-4">Paciente Titular</th>
                    <th className="py-2.5 px-4">Documento</th>
                    <th className="py-2.5 px-4">Cobertura</th>
                    <th className="py-2.5 px-4">Monto Subtotal</th>
                    <th className="py-2.5 px-4">Estado</th>
                    <th className="py-2.5 px-4">Fecha Emisión</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container-high">
                  {filteredInbox.map((p) => {
                    const isDispensed = p.status === 'DISPENSED';
                    return (
                      <tr key={p.id} className="hover:bg-surface-container-low/50 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-teal-900">
                          {p.unique_code || p.id}
                        </td>
                        <td className="py-3 px-4 font-semibold text-on-surface">
                          {p.patient_name}
                        </td>
                        <td className="py-3 px-4 font-mono text-outline">
                          {p.patient_document}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-surface-container-high text-on-surface border">
                            {p.coverage_type || 'EPS_PBS_100'}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-on-surface">
                          {formatCurrency(p.subtotal_amount)}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              isDispensed
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                : 'bg-amber-100 text-amber-800 border-amber-300'
                            }`}
                          >
                            {isDispensed ? 'DISPENSADA' : 'PENDIENTE'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-outline font-mono text-[11px]">
                          {p.created_at ? new Date(p.created_at).toLocaleDateString('es-CO') : 'Reciente'}
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

      {/* CONTENIDO: TABLA DE INVENTARIO */}
      {activeTab === 'inventory' && (
        <div className="rounded-2xl bg-white border border-surface-container-high shadow-xs overflow-hidden">
          <div className="px-5 py-3.5 border-b border-surface-container-high flex items-center justify-between bg-surface-container-low/40">
            <h3 className="font-bold text-xs uppercase tracking-wider text-outline">
              Catálogo de Medicamentos por Dosis y Stock
            </h3>
            <span className="text-xs font-mono text-outline">
              Trazabilidad CUM • MinSalud Res. 2275
            </span>
          </div>

          {filteredInventory.length === 0 ? (
            <div className="p-10 text-center text-outline text-xs">
              No hay medicamentos en el inventario que coincidan con la búsqueda.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-container-low border-b border-surface-container-high text-outline uppercase font-mono text-[10px]">
                  <tr>
                    <th className="py-2.5 px-4">Principio Activo</th>
                    <th className="py-2.5 px-4">Concentración</th>
                    <th className="py-2.5 px-4">Código CUM</th>
                    <th className="py-2.5 px-4">Precio Unitario</th>
                    <th className="py-2.5 px-4">Stock Actual</th>
                    <th className="py-2.5 px-4">Mínimo</th>
                    <th className="py-2.5 px-4">Nivel de Seguridad</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container-high">
                  {filteredInventory.map((item) => {
                    const isLow = item.stock_quantity <= item.min_stock;
                    const isOut = item.stock_quantity === 0;

                    return (
                      <tr key={item.id} className="hover:bg-surface-container-low/50 transition-colors">
                        <td className="py-3 px-4 font-bold text-on-surface">
                          {item.generic_name}
                        </td>
                        <td className="py-3 px-4 font-mono font-semibold text-teal-800">
                          {item.dosage}
                        </td>
                        <td className="py-3 px-4 font-mono text-outline text-[11px]">
                          {item.code_cum || 'CUM-PENDIENTE'}
                        </td>
                        <td className="py-3 px-4 font-mono text-on-surface">
                          {formatCurrency(item.unit_price)}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-sm">
                          {item.stock_quantity}
                        </td>
                        <td className="py-3 px-4 font-mono text-outline">
                          {item.min_stock}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              isOut
                                ? 'bg-red-100 text-red-800 border-red-300'
                                : isLow
                                ? 'bg-amber-100 text-amber-800 border-amber-300'
                                : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            }`}
                          >
                            {isOut ? 'AGOTADO' : isLow ? 'STOCK CRÍTICO' : 'NORMAL'}
                          </span>
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
    </div>
  );
};

export default AdminPharmacyDashboardView;

