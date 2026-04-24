import React, { useState, useEffect, useContext, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import {
  X, Save, Search, PlusCircle, Package, Car, User, Wrench,
  Clock, CheckCircle, Truck, Loader2, MessageCircle, Phone,
  Mail, AlertTriangle, Minus, Plus, Trash2, Receipt,
  CreditCard, Banknote, ArrowRightLeft, BadgeCheck, ChevronDown
} from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import FlowTrail from './FlowTrail';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const GTQ = (val) => val != null
  ? new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' }).format(val)
  : 'Q0.00';

const STATE_BADGE = {
  EN_ESPERA:           { label: 'EN ESPERA',           cls: 'bg-amber-100 text-amber-700 border border-amber-300',     dark: 'bg-amber-900/40 text-amber-300 border border-amber-700/50'    },
  EN_REVISION:         { label: 'EN REVISIÓN',         cls: 'bg-blue-100 text-blue-700 border border-blue-300',        dark: 'bg-blue-900/40 text-blue-300 border border-blue-700/50'       },
  COTIZACION:          { label: 'COTIZACIÓN',          cls: 'bg-cyan-100 text-cyan-700 border border-cyan-300',        dark: 'bg-cyan-900/40 text-cyan-300 border border-cyan-700/50'       },
  ESPERANDO_REPUESTOS: { label: 'ESP. REPUESTOS',      cls: 'bg-orange-100 text-orange-700 border border-orange-300',  dark: 'bg-orange-900/40 text-orange-300 border border-orange-700/50' },
  LISTO:               { label: 'LISTO PARA ENTREGA',  cls: 'bg-emerald-100 text-emerald-700 border border-emerald-300',dark: 'bg-emerald-900/40 text-emerald-300 border border-emerald-700/50'},
  ENTREGADO:           { label: 'ENTREGADO',           cls: 'bg-purple-100 text-purple-700 border border-purple-300',  dark: 'bg-purple-900/40 text-purple-300 border border-purple-700/50'  },
  CANCELADO:           { label: 'CANCELADO',           cls: 'bg-red-100 text-red-700 border border-red-300',           dark: 'bg-red-900/40 text-red-300 border border-red-700/50'           },
};

const METODOS_PAGO = [
  { value: 'EFECTIVO',       label: 'Efectivo',                 icon: <Banknote size={16} /> },
  { value: 'TARJETA',        label: 'Tarjeta Crédito/Débito',   icon: <CreditCard size={16} /> },
  { value: 'TRANSFERENCIA',  label: 'Transferencia Bancaria',   icon: <ArrowRightLeft size={16} /> },
  { value: 'OTROS',          label: 'Otros (Cheque, etc.)',     icon: <Receipt size={16} /> },
];

// ─── Client Modal ─────────────────────────────────────────────────────────────
function ClientModal({ cliente, isOpen, onClose, isDark }) {
  if (!cliente) return null;
  const bg  = isDark ? 'bg-slate-800' : 'bg-white';
  const txt = isDark ? 'text-slate-100' : 'text-slate-900';
  const sub = isDark ? 'text-slate-400' : 'text-slate-500';
  const bd  = isDark ? 'border-slate-700' : 'border-slate-200';
  const rowBg = isDark ? 'bg-slate-700/50' : 'bg-slate-50';

  const whatsapp = cliente.telefono
    ? `https://wa.me/502${cliente.telefono.replace(/\D/g, '')}`
    : null;

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog onClose={onClose} className="relative z-[110]">
        <Transition.Child as={Fragment}
          enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100"
          leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        </Transition.Child>
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Transition.Child as={Fragment}
            enter="ease-out duration-200" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100"
            leave="ease-in duration-150" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95"
          >
            <Dialog.Panel className={`w-full max-w-sm rounded-2xl shadow-2xl ${bg} border ${bd} overflow-hidden`}>
              <div className={`px-5 py-4 border-b ${bd} flex items-center justify-between`}>
                <Dialog.Title className={`font-bold text-base ${txt}`}>Información del Cliente</Dialog.Title>
                <button onClick={onClose} className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>
                  <X size={18} />
                </button>
              </div>
              <div className="px-5 pt-5 pb-3 flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-xl shrink-0">
                  {(cliente.first_name?.[0] ?? '?').toUpperCase()}
                </div>
                <div>
                  <p className={`font-bold text-lg leading-tight ${txt}`}>{cliente.first_name} {cliente.last_name}</p>
                  <p className={`text-sm ${sub}`}>Cliente registrado</p>
                </div>
              </div>
              <div className={`mx-5 mb-5 rounded-xl border ${bd} overflow-hidden`}>
                {cliente.email && (
                  <div className={`flex items-center gap-3 px-4 py-3 border-b ${bd} ${rowBg}`}>
                    <Mail size={15} className="text-blue-400 shrink-0" />
                    <div>
                      <p className={`text-[10px] font-bold uppercase tracking-wide ${sub}`}>Correo</p>
                      <p className={`text-sm font-medium ${txt}`}>{cliente.email}</p>
                    </div>
                  </div>
                )}
                {cliente.telefono && (
                  <div className={`flex items-center gap-3 px-4 py-3 ${rowBg}`}>
                    <Phone size={15} className="text-emerald-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className={`text-[10px] font-bold uppercase tracking-wide ${sub}`}>Teléfono / WhatsApp</p>
                      <p className={`text-sm font-medium ${txt}`}>{cliente.telefono}</p>
                    </div>
                    {whatsapp && (
                      <a href={whatsapp} target="_blank" rel="noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg transition-colors shrink-0">
                        <MessageCircle size={13} /> WhatsApp
                      </a>
                    )}
                  </div>
                )}
                {!cliente.email && !cliente.telefono && (
                  <div className={`px-4 py-4 text-center text-sm ${sub} italic`}>Sin datos de contacto</div>
                )}
              </div>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition.Root>
  );
}

// ─── Billing Modal ────────────────────────────────────────────────────────────
function BillingModal({ orderData, isOpen, onClose, onSuccess, isDark, headers }) {
  const [metodo, setMetodo] = useState('EFECTIVO');
  const [descuento, setDescuento] = useState('0');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  const bg  = isDark ? 'bg-slate-800' : 'bg-white';
  const txt = isDark ? 'text-slate-100' : 'text-slate-900';
  const sub = isDark ? 'text-slate-400' : 'text-slate-500';
  const bd  = isDark ? 'border-slate-700' : 'border-slate-200';
  const inputC = `w-full rounded-lg border text-sm px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/50 ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-300'}`;

  const totalRepuestos = orderData?.repuestos?.reduce((s, r) => s + (r.cantidad * parseFloat(r.precio_unitario)), 0) ?? 0;
  const precioServicio = parseFloat(orderData?.cita?.servicio?.precio ?? 0);
  const subtotal = totalRepuestos + precioServicio;
  const descuentoNum = parseFloat(descuento) || 0;
  const total = subtotal - descuentoNum;

  const handleEmitir = async () => {
    setError('');
    setProcessing(true);
    try {
      const res = await axios.post(
        `http://localhost:8000/api/v1/taller/orden/${orderData.id}/facturar/`,
        { metodo_pago: metodo, descuento: descuentoNum },
        { headers }
      );
      onSuccess(res.data);
    } catch (e) {
      setError(e.response?.data?.error || 'Error al emitir la factura');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog onClose={onClose} className="relative z-[110]">
        <Transition.Child as={Fragment}
          enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100"
          leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" />
        </Transition.Child>
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Transition.Child as={Fragment}
            enter="ease-out duration-200" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100"
            leave="ease-in duration-150" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95"
          >
            <Dialog.Panel className={`w-full max-w-md rounded-2xl shadow-2xl ${bg} border ${bd} overflow-hidden`}>
              {/* Header */}
              <div className={`px-6 py-4 border-b ${bd} flex items-center gap-3`}>
                <div className="p-2 rounded-xl bg-emerald-500/15">
                  <Receipt size={18} className="text-emerald-500" />
                </div>
                <div className="flex-1">
                  <Dialog.Title className={`font-bold text-base ${txt}`}>Procesar Facturación</Dialog.Title>
                  <p className={`text-xs ${sub}`}>Orden #{String(orderData?.id ?? '').padStart(5, '0')}</p>
                </div>
                <button onClick={onClose} className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>
                  <X size={18} />
                </button>
              </div>

              <div className="px-6 py-5 space-y-5">
                {/* Resumen de costos */}
                <div className={`rounded-xl border ${bd} overflow-hidden`}>
                  <div className={`px-4 py-3 space-y-2 ${isDark ? 'bg-slate-700/30' : 'bg-slate-50'}`}>
                    <div className="flex justify-between text-sm">
                      <span className={sub}>Mano de obra: {orderData?.cita?.servicio?.nombre}</span>
                      <span className={`font-semibold ${txt}`}>{GTQ(precioServicio)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className={sub}>Repuestos e insumos</span>
                      <span className={`font-semibold ${txt}`}>{GTQ(totalRepuestos)}</span>
                    </div>
                    {descuentoNum > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-red-400">Descuento</span>
                        <span className="text-red-400 font-semibold">- {GTQ(descuentoNum)}</span>
                      </div>
                    )}
                  </div>
                  <div className={`flex justify-between px-4 py-3 ${isDark ? 'bg-slate-950' : 'bg-slate-900'}`}>
                    <span className="text-sm font-black text-white uppercase tracking-wide">Total a Cobrar</span>
                    <span className="text-xl font-black text-white">{GTQ(total)}</span>
                  </div>
                </div>

                {/* Método de pago */}
                <div>
                  <label className={`text-xs font-bold uppercase tracking-wide mb-2 block ${sub}`}>
                    Método de Pago
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {METODOS_PAGO.map(m => (
                      <button key={m.value}
                        onClick={() => setMetodo(m.value)}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                          metodo === m.value
                            ? 'border-emerald-500 bg-emerald-500/15 text-emerald-400'
                            : isDark
                              ? 'border-slate-600 text-slate-400 hover:border-slate-500 hover:bg-slate-700'
                              : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {m.icon} {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Descuento opcional */}
                <div>
                  <label className={`text-xs font-bold uppercase tracking-wide mb-2 block ${sub}`}>
                    Descuento (GTQ) — Opcional
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={descuento}
                    onChange={e => setDescuento(e.target.value)}
                    className={inputC}
                    placeholder="0.00"
                  />
                </div>

                {error && (
                  <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 text-sm">
                    <AlertTriangle size={15} className="shrink-0" />
                    {error}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                  <button onClick={onClose}
                    className={`flex-1 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-colors ${isDark ? 'border-slate-600 text-slate-400 hover:bg-slate-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                    Cancelar
                  </button>
                  <button
                    onClick={handleEmitir}
                    disabled={processing}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition-colors disabled:opacity-50"
                  >
                    {processing ? <Loader2 size={15} className="animate-spin" /> : <BadgeCheck size={15} />}
                    {processing ? 'Procesando...' : 'Emitir Factura'}
                  </button>
                </div>
              </div>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition.Root>
  );
}

// ─── Billing Success Banner ───────────────────────────────────────────────────
function BillingSuccess({ data, onClose, isDark }) {
  return (
    <div className={`mx-5 mt-4 rounded-2xl border p-5 ${isDark ? 'bg-emerald-900/30 border-emerald-700/50' : 'bg-emerald-50 border-emerald-200'}`}>
      <div className="flex items-center gap-3 mb-3">
        <BadgeCheck size={22} className="text-emerald-500" />
        <div>
          <p className={`font-bold text-sm ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>
            Factura Emitida Exitosamente
          </p>
          <p className={`text-xs ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
            {data.numero_factura} · {data.metodo_pago}
          </p>
        </div>
        <button onClick={onClose} className="ml-auto text-emerald-400 hover:text-emerald-300">
          <X size={16} />
        </button>
      </div>
      <div className={`rounded-xl p-3 text-center ${isDark ? 'bg-emerald-900/50' : 'bg-emerald-100'}`}>
        <p className={`text-xs ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>Total Cobrado</p>
        <p className={`text-2xl font-black ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>
          {GTQ(data.total_general)}
        </p>
      </div>
      <div className="mt-4 flex gap-2">
        <a 
          href={`http://localhost:8000/facturacion/imprimir/${data.id}/`} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold transition-colors"
        >
          <Receipt size={15} /> Ver y Descargar Factura
        </a>
      </div>
    </div>
  );
}

// ─── Main OrderSlideOver ──────────────────────────────────────────────────────
export default function OrderSlideOver({ orderId, isOpen, onClose, onUpdate }) {
  const { authTokens, logoutUser, user } = useContext(AuthContext);
  const { isDark } = useTheme();
  const navigate = useNavigate();

  const [orderData, setOrderData]       = useState(null);
  const [diagText, setDiagText]         = useState('');
  const [savingDiag, setSavingDiag]     = useState(false);
  const [loading, setLoading]           = useState(true);
  const [deletingId, setDeletingId]     = useState(null);

  // Inventory search
  const [searchQuery, setSearchQuery]   = useState('');
  const [inventario, setInventario]     = useState([]);
  const [searchOpen, setSearchOpen]     = useState(false);
  const [searching, setSearching]       = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [cantidad, setCantidad]         = useState(1);
  const [addingPart, setAddingPart]     = useState(false);

  // Modals
  const [clientModal, setClientModal]   = useState(false);
  const [billingModal, setBillingModal] = useState(false);
  const [billingResult, setBillingResult] = useState(null);

  const headers = { Authorization: `Bearer ${authTokens?.access}` };
  const isStaff = user?.is_staff || user?.is_superuser;
  const canAddParts = orderData && !['ENTREGADO', 'CANCELADO'].includes(orderData.estado);
  const canBill     = orderData?.estado === 'LISTO' && isStaff;

  // ── Fetch ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen && orderId) {
      setLoading(true);
      setBillingResult(null);
      resetSearch();
      fetchOrder();
    }
  }, [isOpen, orderId]);

  // Debounced inventory search — triggers on query change OR on focus (empty query = show all with stock)
  useEffect(() => {
    if (!isOpen || selectedItem) return;
    const t = setTimeout(() => fetchInventory(searchQuery), searchQuery ? 350 : 0);
    return () => clearTimeout(t);
  }, [searchQuery, isOpen]);

  const resetSearch = () => {
    setSearchQuery('');
    setInventario([]);
    setSelectedItem(null);
    setCantidad(1);
    setSearchOpen(false);
  };

  const fetchOrder = async () => {
    try {
      const res = await axios.get(`http://localhost:8000/api/v1/taller/orden/${orderId}/`, { headers });
      setOrderData(res.data);
      setDiagText(res.data.diagnostico || '');
    } catch (e) {
      if (e.response?.status === 401) logoutUser();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const fetchInventory = async (q) => {
    setSearching(true);
    setSearchOpen(true);
    try {
      const res = await axios.get(`http://localhost:8000/api/v1/taller/inventario/buscar/?q=${encodeURIComponent(q)}`, { headers });
      setInventario(res.data);
    } catch (e) { console.error(e); }
    finally { setSearching(false); }
  };

  const saveDiagnosis = async () => {
    setSavingDiag(true);
    try {
      await axios.patch(`http://localhost:8000/api/v1/taller/orden/${orderId}/diagnostico/`,
        { diagnostico: diagText }, { headers });
      onUpdate();
    } catch (e) { console.error(e); }
    setSavingDiag(false);
  };

  const addPart = async () => {
    if (!selectedItem) return;
    setAddingPart(true);
    try {
      const res = await axios.post(
        `http://localhost:8000/api/v1/taller/orden/${orderId}/repuesto/`,
        { producto_id: selectedItem.id, cantidad },
        { headers }
      );
      setOrderData(res.data);
      resetSearch();
      onUpdate();
    } catch (e) {
      alert(e.response?.data?.error || 'Error al agregar repuesto');
    }
    setAddingPart(false);
  };

  const deletePart = async (repId) => {
    if (!window.confirm('¿Eliminar este repuesto? El stock será devuelto.')) return;
    setDeletingId(repId);
    try {
      const res = await axios.delete(
        `http://localhost:8000/api/v1/taller/orden/${orderId}/repuesto/${repId}/`,
        { headers }
      );
      setOrderData(res.data);
      onUpdate();
    } catch (e) {
      alert(e.response?.data?.error || 'Error al eliminar repuesto');
    }
    setDeletingId(null);
  };

  const handleBillingSuccess = (data) => {
    setBillingResult(data);
    setBillingModal(false);
    fetchOrder();
    onUpdate();
  };

  // ── Derived ─────────────────────────────────────────────────────────────────
  const totalRepuestos = orderData?.repuestos?.reduce((s, r) => s + (r.cantidad * parseFloat(r.precio_unitario)), 0) ?? 0;
  const precioServicio = parseFloat(orderData?.cita?.servicio?.precio ?? 0);
  const totalNeto = totalRepuestos + precioServicio;
  const badge = STATE_BADGE[orderData?.estado] ?? STATE_BADGE.EN_ESPERA;

  // ── Theme ────────────────────────────────────────────────────────────────────
  const panelBg = isDark ? 'bg-slate-900'     : 'bg-slate-50';
  const cardBg  = isDark ? 'bg-slate-800/70'  : 'bg-white';
  const borderC = isDark ? 'border-slate-700' : 'border-slate-200';
  const txt     = isDark ? 'text-slate-100'   : 'text-slate-900';
  const sub     = isDark ? 'text-slate-400'   : 'text-slate-500';
  const labelC  = `text-[10px] font-bold uppercase tracking-wider mb-1.5 block ${sub}`;
  const inputC  = `w-full rounded-lg border text-sm px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/50 transition-colors ${isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-slate-300 text-slate-800'}`;

  return (
    <>
      {/* Modals */}
      <ClientModal
        cliente={orderData?.cita?.cliente}
        isOpen={clientModal}
        onClose={() => setClientModal(false)}
        isDark={isDark}
      />
      <BillingModal
        orderData={orderData}
        isOpen={billingModal}
        onClose={() => setBillingModal(false)}
        onSuccess={handleBillingSuccess}
        isDark={isDark}
        headers={headers}
      />

      {/* SlideOver */}
      <Transition.Root show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-[100]" onClose={onClose}>
          <Transition.Child as={Fragment}
            enter="ease-in-out duration-300" enterFrom="opacity-0" enterTo="opacity-100"
            leave="ease-in-out duration-300" leaveFrom="opacity-100" leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/70" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-hidden">
            <div className="absolute inset-0 overflow-hidden">
              <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
                <Transition.Child as={Fragment}
                  enter="transform transition ease-in-out duration-300"
                  enterFrom="translate-x-full" enterTo="translate-x-0"
                  leave="transform transition ease-in-out duration-300"
                  leaveFrom="translate-x-0" leaveTo="translate-x-full"
                >
                  <Dialog.Panel className={`pointer-events-auto w-screen max-w-2xl border-l ${borderC} ${panelBg} flex flex-col`}>
                    {loading ? (
                      <div className="flex-1 flex items-center justify-center">
                        <Loader2 size={36} className="animate-spin text-blue-500" />
                      </div>
                    ) : (
                      <>
                        {/* HEADER */}
                        <div className={`shrink-0 px-6 py-5 border-b ${borderC} ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <p className={`text-xs font-bold uppercase tracking-widest ${sub}`}>
                                ORDEN #{String(orderData?.id).padStart(5, '0')}
                              </p>
                              <Dialog.Title className={`text-2xl font-black mt-0.5 ${txt}`}>
                                {orderData?.vehiculo?.marca} {orderData?.vehiculo?.modelo}
                              </Dialog.Title>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-black px-3 py-1.5 rounded-full border ${isDark ? badge.dark : badge.cls}`}>
                                {badge.label}
                              </span>
                              <button onClick={onClose} className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>
                                <X size={20} />
                              </button>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500 text-white text-xs font-black tracking-widest font-mono">
                              {orderData?.vehiculo?.placa || 'S/N'}
                            </span>
                            <button
                              onClick={() => setClientModal(true)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
                            >
                              <User size={13} className="text-blue-400" />
                              {orderData?.cita?.cliente
                                ? `${orderData.cita.cliente.first_name} ${orderData.cita.cliente.last_name}`
                                : 'Sin cliente'}
                            </button>
                            {orderData?.mecanico_asignado && (
                              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold ${isDark ? 'bg-emerald-900/40 text-emerald-300 border border-emerald-700/50' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                                <Wrench size={13} />
                                {orderData.mecanico_asignado.first_name} {orderData.mecanico_asignado.last_name}
                                <span className="opacity-60">· Mecánico</span>
                              </span>
                            )}
                          </div>

                          {/* Flow Trail: Cita → OT → Factura */}
                          <div className={`mt-3 pt-3 border-t ${borderC}`}>
                            <FlowTrail
                              citaId={orderData?.cita?.id}
                              ordenId={orderData?.id}
                              facturaId={orderData?.factura_id}
                              facturaNum={orderData?.factura_numero}
                              facturaEstado={orderData?.factura_estado}
                              isDark={isDark}
                              onOpenOrden={null}
                              onNavCalendar={() => { onClose(); navigate('/citas/calendario'); }}
                              onNavFacturas={() => { onClose(); navigate('/facturacion'); }}
                            />
                          </div>
                        </div>

                        {/* Billing success banner */}
                        {billingResult && (
                          <BillingSuccess
                            data={billingResult}
                            onClose={() => setBillingResult(null)}
                            isDark={isDark}
                          />
                        )}

                        {/* BODY */}
                        <div className="flex-1 overflow-y-auto">
                          <div className="grid grid-cols-1 md:grid-cols-2 h-full">

                            {/* LEFT */}
                            <div className={`p-5 space-y-5 border-r ${borderC}`}>

                              {/* Reporte del cliente */}
                              <section className={`rounded-xl border ${borderC} ${cardBg} overflow-hidden`}>
                                <div className={`flex items-center gap-2 px-4 py-3 border-b ${borderC}`}>
                                  <Receipt size={15} className="text-slate-400" />
                                  <h3 className={`text-sm font-bold ${txt}`}>Reporte Original del Cliente</h3>
                                </div>
                                <div className="px-4 py-3 space-y-1.5">
                                  {orderData?.cita?.servicio && (
                                    <p className={`text-sm ${txt}`}>
                                      <span className={sub}>Servicio: </span>
                                      <span className="font-semibold">{orderData.cita.servicio.nombre}</span>
                                    </p>
                                  )}
                                  <p className={`text-sm italic ${sub} ${orderData?.cita?.notas ? `border-l-2 border-slate-400/40 pl-3` : ''}`}>
                                    {orderData?.cita?.notas ? `"${orderData.cita.notas}"` : 'Sin notas del cliente'}
                                  </p>
                                </div>
                              </section>

                              {/* Diagnóstico */}
                              <section className={`rounded-xl border ${borderC} ${cardBg} overflow-hidden`}>
                                <div className={`flex items-center gap-2 px-4 py-3 border-b ${borderC}`}>
                                  <Wrench size={15} className="text-blue-400" />
                                  <h3 className={`text-sm font-bold ${txt}`}>Diagnóstico Técnico</h3>
                                </div>
                                <div className="px-4 py-4 space-y-3">
                                  <label className={labelC}>Anotaciones del Mecánico:</label>
                                  <textarea
                                    className={`${inputC} resize-none`}
                                    rows={5}
                                    value={diagText}
                                    onChange={(e) => setDiagText(e.target.value)}
                                    placeholder="Describe hallazgos, reparaciones y observaciones técnicas..."
                                    disabled={['ENTREGADO', 'CANCELADO'].includes(orderData?.estado)}
                                  />
                                  <button onClick={saveDiagnosis} disabled={savingDiag || ['ENTREGADO', 'CANCELADO'].includes(orderData?.estado)}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition-colors disabled:opacity-50">
                                    {savingDiag ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                                    {savingDiag ? 'Guardando...' : 'Guardar Diagnóstico'}
                                  </button>
                                </div>
                              </section>
                            </div>

                            {/* RIGHT */}
                            <div className="p-5 space-y-5">

                              {/* Repuestos */}
                              <section className={`rounded-xl border ${borderC} ${cardBg} overflow-visible`}>
                                <div className={`flex items-center justify-between px-4 py-3 border-b ${borderC}`}>
                                  <div className="flex items-center gap-2">
                                    <Package size={15} className="text-blue-400" />
                                    <h3 className={`text-sm font-bold ${txt}`}>Repuestos e Insumos</h3>
                                  </div>
                                  {orderData?.repuestos?.length > 0 && (
                                    <span className="text-xs font-black px-2 py-0.5 rounded-full bg-blue-600 text-white">
                                      {orderData.repuestos.length}
                                    </span>
                                  )}
                                </div>

                                {/* Parts list */}
                                <div className={`divide-y ${isDark ? 'divide-slate-700/50' : 'divide-slate-100'}`}>
                                  {!orderData?.repuestos?.length && (
                                    <p className={`px-4 py-4 text-sm italic text-center ${sub}`}>Sin repuestos agregados</p>
                                  )}
                                  {orderData?.repuestos?.map((rep) => (
                                    <div key={rep.id} className="px-4 py-3 flex items-center gap-3">
                                      <span className={`text-xs font-bold min-w-[28px] text-center py-1 px-2 rounded ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                                        {rep.cantidad}x
                                      </span>
                                      <div className="flex-1 min-w-0">
                                        <p className={`text-sm font-semibold truncate ${txt}`}>{rep.producto.nombre}</p>
                                        <div className="flex items-center gap-2">
                                            <p className={`text-xs ${sub}`}>{GTQ(rep.precio_unitario)} c/u</p>
                                            {rep.en_transito && (
                                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-orange-100/80 text-orange-600 border border-orange-200">
                                                    📦 PENDIENTE OC
                                                </span>
                                            )}
                                        </div>
                                      </div>
                                      <span className={`text-sm font-black shrink-0 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                                        {GTQ(rep.cantidad * parseFloat(rep.precio_unitario))}
                                      </span>
                                      {canAddParts && (
                                        <button
                                          onClick={() => deletePart(rep.id)}
                                          disabled={deletingId === rep.id || rep.en_transito}
                                          className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/15 transition-colors disabled:opacity-40"
                                        >
                                          {deletingId === rep.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                                        </button>
                                      )}
                                    </div>
                                  ))}
                                </div>

                                {/* Add part area — always visible when order is active */}
                                {canAddParts && (
                                  <div className={`px-4 py-4 border-t ${borderC} space-y-3 overflow-visible`}>
                                    <p className={`flex items-center gap-1.5 text-sm font-bold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                                      <PlusCircle size={15} /> Agregar Repuesto del Inventario
                                    </p>

                                    {/* Search with inline dropdown */}
                                    <div className="relative">
                                      <Search size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${sub} pointer-events-none`} />
                                      <input
                                        type="text"
                                        className={`${inputC} pl-8 pr-8`}
                                        placeholder="Buscar repuesto por nombre..."
                                        value={searchQuery}
                                        onChange={(e) => {
                                          setSearchQuery(e.target.value);
                                          setSelectedItem(null);
                                          if (!e.target.value) setSearchOpen(false);
                                        }}
                                       onFocus={() => {
                                          if (!selectedItem) {
                                            setSearchOpen(true);
                                            if (inventario.length === 0) fetchInventory(searchQuery);
                                          }
                                        }}
                                        onBlur={(e) => {
                                          // Delay closing to allow click on dropdown items
                                          setTimeout(() => setSearchOpen(false), 200);
                                        }}
                                      />
                                      {searching && (
                                        <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-blue-400" />
                                      )}

                                      {/* Dropdown — rendered in normal flow but with absolute positioning */}
                                      {searchOpen && searchQuery && inventario.length > 0 && !selectedItem && (
                                        <div className={`absolute left-0 right-0 top-[calc(100%+4px)] rounded-xl border shadow-2xl z-50 max-h-48 overflow-y-auto ${isDark ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-200'}`}>
                                          {inventario.map(item => (
                                            <button key={item.id}
                                              onClick={() => { setSelectedItem(item); setCantidad(1); setSearchOpen(false); }}
                                              disabled={item.stock_actual <= 0}
                                              className={`w-full text-left px-4 py-3 text-sm flex items-center justify-between gap-2 transition-colors disabled:opacity-40 first:rounded-t-xl last:rounded-b-xl ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-50'} border-b last:border-b-0 ${isDark ? 'border-slate-700' : 'border-slate-100'}`}
                                            >
                                              <span className={`font-medium ${txt} truncate`}>{item.nombre}</span>
                                              <span className={`text-xs shrink-0 ${sub}`}>
                                                {GTQ(item.precio_venta)} · Stock {item.stock_actual}
                                              </span>
                                            </button>
                                          ))}
                                        </div>
                                      )}
                                      {searchOpen && searchQuery && !searching && inventario.length === 0 && (
                                        <div className={`absolute left-0 right-0 top-[calc(100%+4px)] rounded-xl border shadow-lg z-[100] px-4 py-3 text-sm text-center ${isDark ? 'bg-slate-800 border-slate-600 text-slate-400' : 'bg-white border-slate-200 text-slate-500'}`}>
                                          Sin resultados para «{searchQuery}»
                                        </div>
                                      )}
                                    </div>

                                    {/* Selected item card — premium redesign */}
                                    {selectedItem && (
                                      <div className={`rounded-2xl border-2 ${isDark ? 'border-blue-500/40 bg-slate-800' : 'border-blue-200 bg-blue-50/50'} overflow-hidden`}>
                                        {/* Product header */}
                                        <div className={`px-4 pt-3 pb-2 flex items-start justify-between gap-2 border-b ${isDark ? 'border-slate-700' : 'border-blue-100'}`}>
                                          <div className="min-w-0">
                                            <p className={`text-sm font-black leading-tight ${txt} truncate`}>{selectedItem.nombre}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                              <span className={`text-xs font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>{GTQ(selectedItem.precio_venta)} c/u</span>
                                              <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-600'}`}>
                                                <Package size={10} /> Stock: {selectedItem.stock_actual}
                                              </span>
                                            </div>
                                          </div>
                                          <button onClick={resetSearch}
                                            className={`shrink-0 p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-blue-100 text-slate-400'}`}>
                                            <X size={15} />
                                          </button>
                                        </div>

                                        {/* Quantity + Add row */}
                                        <div className="px-4 py-3 flex items-center gap-3">
                                          {/* Qty stepper */}
                                          <div className={`flex items-center rounded-xl border-2 overflow-hidden ${isDark ? 'border-slate-600 bg-slate-900' : 'border-slate-200 bg-white'}`}>
                                            <button
                                              onClick={() => setCantidad(c => Math.max(1, c - 1))}
                                              className={`w-9 h-9 flex items-center justify-center text-lg font-black transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-50 text-slate-500'}`}
                                            >−</button>
                                            <span className={`w-10 h-9 flex items-center justify-center text-base font-black border-x-2 ${isDark ? 'border-slate-600 text-white bg-slate-800' : 'border-slate-200 text-slate-800 bg-white'}`}>
                                              {cantidad}
                                            </span>
                                            <button
                                              onClick={() => setCantidad(c => Math.min(selectedItem.stock_actual, c + 1))}
                                              className={`w-9 h-9 flex items-center justify-center text-lg font-black transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-50 text-slate-500'}`}
                                            >+</button>
                                          </div>

                                          {/* Subtotal preview */}
                                          <div className="flex-1 text-center">
                                            <p className={`text-xs ${sub}`}>Subtotal</p>
                                            <p className={`text-base font-black ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                                              {GTQ(cantidad * parseFloat(selectedItem.precio_venta))}
                                            </p>
                                          </div>

                                          {/* Add button */}
                                          <button
                                            onClick={addPart}
                                            disabled={addingPart}
                                            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white text-sm font-black rounded-xl transition-all shadow-md shadow-emerald-900/20 disabled:opacity-50"
                                          >
                                            {addingPart ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
                                            Añadir
                                          </button>
                                        </div>

                                        {/* Warning */}
                                        <div className={`px-4 pb-3 flex items-center gap-1.5 text-xs ${isDark ? 'text-amber-400/70' : 'text-amber-600/80'}`}>
                                          <AlertTriangle size={11} className="shrink-0" />
                                          Se descontará automáticamente del stock del taller.
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </section>

                              {/* Cost summary */}
                              <section className={`rounded-xl border ${borderC} overflow-hidden`}>
                                <div className={`px-4 py-3 space-y-2 ${isDark ? 'bg-slate-800/70' : 'bg-white'}`}>
                                  {orderData?.cita?.servicio && (
                                    <div className="flex items-center justify-between text-sm">
                                      <span className={sub}>Mano de Obra: {orderData.cita.servicio.nombre}</span>
                                      <span className={`font-semibold ${txt}`}>{GTQ(precioServicio)}</span>
                                    </div>
                                  )}
                                  <div className="flex items-center justify-between text-sm">
                                    <span className={sub}>Repuestos e Insumos</span>
                                    <span className={`font-semibold ${txt}`}>{GTQ(totalRepuestos)}</span>
                                  </div>
                                </div>
                                <div className={`flex items-center justify-between px-4 py-3 ${isDark ? 'bg-slate-950' : 'bg-slate-900'}`}>
                                  <span className="text-sm font-black text-white tracking-wide uppercase">Costo Total Neto</span>
                                  <span className="text-xl font-black text-white">{GTQ(totalNeto)}</span>
                                </div>
                              </section>

                              {/* Facturar button — only when LISTO and is staff */}
                              {canBill && !billingResult && (
                                <button
                                  onClick={() => setBillingModal(true)}
                                  className="w-full flex items-center justify-center gap-2.5 px-5 py-4 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white font-black text-base shadow-lg shadow-emerald-900/30 transition-all"
                                >
                                  <Receipt size={18} />
                                  Procesar Facturación y Cobro
                                </button>
                              )}

                              {/* Already billed notice */}
                              {orderData?.estado === 'ENTREGADO' && !billingResult && (
                                <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${isDark ? 'border-purple-700/40 bg-purple-900/20 text-purple-300' : 'border-purple-200 bg-purple-50 text-purple-700'}`}>
                                  <BadgeCheck size={18} />
                                  <p className="text-sm font-semibold">Esta orden ya fue facturada y entregada.</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </Dialog.Panel>
                </Transition.Child>
              </div>
            </div>
          </div>
        </Dialog>
      </Transition.Root>
    </>
  );
}
