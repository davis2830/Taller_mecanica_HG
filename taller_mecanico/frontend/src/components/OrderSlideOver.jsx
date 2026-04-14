import React, { useState, useEffect, useContext, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X, Save, Search, PlusCircle, Package, Car, User, Wrench, Clock, CheckCircle, Truck, AlertCircle, Loader2 } from 'lucide-react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const STATE_BADGE = {
  EN_ESPERA:          { label: 'En Espera',          cls: 'bg-slate-700 text-slate-300' },
  EN_REVISION:        { label: 'En Revisión',         cls: 'bg-blue-800/70 text-blue-300' },
  ESPERANDO_REPUESTOS:{ label: 'Esp. Repuestos',      cls: 'bg-amber-800/70 text-amber-300' },
  LISTO:              { label: 'Listo para Entregar', cls: 'bg-emerald-800/70 text-emerald-300' },
  ENTREGADO:          { label: 'Entregado',           cls: 'bg-purple-800/70 text-purple-300' },
};

export default function OrderSlideOver({ orderId, isOpen, onClose, onUpdate }) {
  const { authTokens, logoutUser } = useContext(AuthContext);
  const { isDark } = useTheme();
  const [orderData, setOrderData] = useState(null);
  const [diagText, setDiagText] = useState('');
  const [savingDiag, setSavingDiag] = useState(false);
  const [inventario, setInventario] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [addingPart, setAddingPart] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      if (orderId) { setLoading(true); fetchOrderDetails(); }
      fetchFullInventory();
    }
  }, [isOpen, orderId]);

  const fetchOrderDetails = async () => {
    try {
      const res = await axios.get(`http://localhost:8000/api/v1/taller/orden/${orderId}/`, {
        headers: { Authorization: `Bearer ${authTokens.access}` }
      });
      setOrderData(res.data);
      setDiagText(res.data.diagnostico || '');
    } catch (e) {
      if (e.response?.status === 401) logoutUser();
      console.error(e);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const fetchFullInventory = async () => {
    try {
      const res = await axios.get(`http://localhost:8000/api/v1/taller/inventario/buscar/`, {
        headers: { Authorization: `Bearer ${authTokens.access}` }
      });
      setInventario(res.data);
    } catch (e) { console.error(e); }
  };

  const saveDiagnosis = async () => {
    setSavingDiag(true);
    try {
      await axios.patch(
        `http://localhost:8000/api/v1/taller/orden/${orderId}/diagnostico/`, 
        { diagnostico: diagText },
        { headers: { Authorization: `Bearer ${authTokens.access}` } }
      );
      onUpdate();
    } catch (e) { console.error(e); }
    setSavingDiag(false);
  };

  const addSelectedPart = async () => {
    if (!selectedProductId) return;
    setAddingPart(true);
    try {
      await axios.post(
        `http://localhost:8000/api/v1/taller/orden/${orderId}/repuesto/`,
        { producto_id: selectedProductId, cantidad: 1 },
        { headers: { Authorization: `Bearer ${authTokens.access}` } }
      );
      setSelectedProductId('');
      fetchOrderDetails();
      fetchFullInventory();
      onUpdate();
    } catch (e) {
      alert(e.response?.data?.error || "Error agregando repuesto");
    } finally {
      setAddingPart(false);
    }
  };

  const formatGTQ = (val) => val != null ? new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' }).format(val) : '—';
  const stateBadge = STATE_BADGE[orderData?.estado] ?? STATE_BADGE.EN_ESPERA;

  // Dynamic classes
  const panelBg = isDark ? 'bg-slate-900' : 'bg-white';
  const sectionBg = isDark ? 'bg-slate-800/60' : 'bg-slate-50';
  const borderCls = isDark ? 'border-white/10' : 'border-slate-200';
  const labelCls = `text-xs font-bold uppercase tracking-wider mb-2 block ${isDark ? 'text-slate-400' : 'text-slate-500'}`;
  const inputCls = `w-full rounded-xl border text-sm px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500/40 transition-colors ${isDark ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-white border-slate-300 text-slate-800'}`;

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>

        {/* Backdrop */}
        <Transition.Child
          as={Fragment}
          enter="ease-in-out duration-300" enterFrom="opacity-0" enterTo="opacity-100"
          leave="ease-in-out duration-300" leaveFrom="opacity-100" leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
              <Transition.Child
                as={Fragment}
                enter="transform transition ease-in-out duration-300"
                enterFrom="translate-x-full" enterTo="translate-x-0"
                leave="transform transition ease-in-out duration-300"
                leaveFrom="translate-x-0" leaveTo="translate-x-full"
              >
                <Dialog.Panel className="pointer-events-auto w-screen max-w-xl">
                  <div className={`flex h-full flex-col ${panelBg} shadow-2xl border-l ${borderCls}`}>

                    {/* ── HEADER ── */}
                    <div className={`shrink-0 px-6 py-5 border-b ${borderCls} ${isDark ? 'bg-slate-800/80' : 'bg-slate-50'}`}>
                      {loading ? (
                        <div className="flex items-center gap-3">
                          <Loader2 className="animate-spin text-blue-500" size={24} />
                          <span className={isDark ? 'text-slate-300' : 'text-slate-600'}>Cargando orden...</span>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <div className={`p-2.5 rounded-xl ${isDark ? 'bg-blue-500/15' : 'bg-blue-100'}`}>
                                <Car size={20} className="text-blue-500" />
                              </div>
                              <div>
                                <Dialog.Title className={`text-xl font-black uppercase tracking-widest ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                  {orderData?.vehiculo?.placa || 'ORDEN'}
                                </Dialog.Title>
                                <p className={`text-sm mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                  {orderData?.vehiculo?.marca} {orderData?.vehiculo?.modelo}
                                  {orderData?.vehiculo?.año && ` (${orderData.vehiculo.año})`}
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-200 text-slate-500'}`}
                              onClick={onClose}
                            >
                              <X size={20} />
                            </button>
                          </div>

                          {/* Meta badges */}
                          <div className="flex flex-wrap items-center gap-2 mt-4">
                            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${stateBadge.cls}`}>
                              {stateBadge.label}
                            </span>
                            {orderData?.mecanico_asignado && (
                              <span className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-600'}`}>
                                <User size={12} />
                                {orderData.mecanico_asignado.first_name} {orderData.mecanico_asignado.last_name || ''}
                              </span>
                            )}
                            {orderData?.cita?.servicio?.nombre && (
                              <span className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-600'}`}>
                                <Wrench size={12} />
                                {orderData.cita.servicio.nombre}
                              </span>
                            )}
                          </div>
                        </>
                      )}
                    </div>

                    {/* ── SCROLLABLE BODY ── */}
                    {!loading && (
                      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

                        {/* DIAGNÓSTICO */}
                        <section>
                          <label className={labelCls}>
                            <Wrench size={13} className="inline mr-1.5 mb-0.5" />
                            Diagnóstico del Mecánico
                          </label>
                          <textarea
                            className={`${inputCls} resize-none`}
                            rows={4}
                            value={diagText}
                            onChange={(e) => setDiagText(e.target.value)}
                            placeholder="Describe el diagnóstico, observaciones técnicas y plan de trabajo..."
                          />
                          <button
                            onClick={saveDiagnosis}
                            disabled={savingDiag}
                            className="mt-2.5 w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-500/25 transition-colors disabled:opacity-50"
                          >
                            {savingDiag ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                            {savingDiag ? 'Guardando...' : 'Guardar Diagnóstico'}
                          </button>
                        </section>

                        {/* REPUESTOS USADOS */}
                        <section className={`rounded-xl border ${borderCls} ${sectionBg} overflow-hidden`}>
                          <div className={`px-4 py-3 border-b ${borderCls} flex items-center gap-2`}>
                            <Package size={15} className="text-blue-400" />
                            <h3 className={`text-sm font-bold uppercase tracking-wide ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                              Repuestos Usados
                            </h3>
                          </div>

                          {!orderData?.repuestos?.length ? (
                            <div className={`text-center py-6 text-sm ${isDark ? 'text-slate-500' : 'text-slate-400'} italic`}>
                              Sin repuestos en esta orden
                            </div>
                          ) : (
                            <div className="divide-y divide-white/5">
                              {orderData.repuestos.map((rep) => (
                                <div key={rep.id} className="px-4 py-3 flex items-center justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className={`text-sm font-semibold truncate ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                                      {rep.producto.nombre}
                                    </p>
                                    <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                      {rep.cantidad} × {formatGTQ(rep.precio_unitario)}
                                    </p>
                                  </div>
                                  <span className={`text-sm font-black shrink-0 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                                    {formatGTQ(rep.subtotal)}
                                  </span>
                                </div>
                              ))}
                              {/* Total row */}
                              <div className={`px-4 py-3 flex items-center justify-between ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
                                <span className={`text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Total de Partes</span>
                                <span className={`text-base font-black ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                                  {formatGTQ(orderData.repuestos.reduce((acc, r) => acc + parseFloat(r.subtotal), 0))}
                                </span>
                              </div>
                            </div>
                          )}
                        </section>

                        {/* AGREGAR REPUESTO DESDE ALMACÉN */}
                        <section>
                          <label className={labelCls}>
                            <Search size={13} className="inline mr-1.5 mb-0.5" />
                            Agregar Refacción del Almacén
                          </label>
                          <div className="flex gap-2">
                            <select
                              className={`flex-1 ${inputCls}`}
                              value={selectedProductId}
                              onChange={(e) => setSelectedProductId(e.target.value)}
                            >
                              <option value="">-- Seleccionar pieza --</option>
                              {inventario.map((item) => (
                                <option key={item.id} value={item.id} disabled={item.stock_actual <= 0}>
                                  {item.nombre} (Stock: {item.stock_actual}) · {formatGTQ(item.precio_venta)}
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={addSelectedPart}
                              disabled={!selectedProductId || addingPart}
                              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-colors shrink-0 ${
                                selectedProductId && !addingPart
                                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20'
                                  : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                              }`}
                            >
                              {addingPart ? <Loader2 size={15} className="animate-spin" /> : <PlusCircle size={15} />}
                              Añadir
                            </button>
                          </div>
                        </section>

                      </div>
                    )}
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}
