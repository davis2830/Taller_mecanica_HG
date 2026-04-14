import React, { useState, useEffect, useContext } from 'react';
import {
  X, Car, Plus, Trash2, Edit2, Loader2, Navigation, Wrench,
  Settings2, Droplet, Fingerprint, History, Clock, CheckCircle, Package,
  Truck, XCircle, AlertCircle, ChevronRight, Receipt, User
} from 'lucide-react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import VehiculoFormModal from './VehiculoFormModal';
import OrderSlideOver from './OrderSlideOver';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const GTQ = (v) => v != null
  ? new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' }).format(v)
  : 'Q0.00';

const fmtDate = (d) => d
  ? new Date(d).toLocaleDateString('es-GT', { year: 'numeric', month: 'short', day: 'numeric' })
  : '—';

const ESTADO_CFG = {
  EN_ESPERA:           { label: 'En Espera',          icon: <Clock size={12} />,         dark: 'bg-amber-900/40 text-amber-300 border-amber-700/40',      light: 'bg-amber-100 text-amber-700 border-amber-300'      },
  EN_REVISION:         { label: 'En Revisión',        icon: <Wrench size={12} />,        dark: 'bg-blue-900/40 text-blue-300 border-blue-700/40',          light: 'bg-blue-100 text-blue-700 border-blue-300'         },
  ESPERANDO_REPUESTOS: { label: 'Esp. Repuestos',     icon: <Package size={12} />,       dark: 'bg-orange-900/40 text-orange-300 border-orange-700/40',    light: 'bg-orange-100 text-orange-700 border-orange-300'   },
  LISTO:               { label: 'Listo',              icon: <CheckCircle size={12} />,   dark: 'bg-emerald-900/40 text-emerald-300 border-emerald-700/40', light: 'bg-emerald-100 text-emerald-700 border-emerald-300'},
  ENTREGADO:           { label: 'Entregado',          icon: <Truck size={12} />,         dark: 'bg-purple-900/40 text-purple-300 border-purple-700/40',    light: 'bg-purple-100 text-purple-700 border-purple-300'   },
  CANCELADO:           { label: 'Cancelado',          icon: <XCircle size={12} />,       dark: 'bg-red-900/40 text-red-300 border-red-700/40',             light: 'bg-red-100 text-red-700 border-red-300'            },
};

function OrderStateBadge({ estado, isDark }) {
  const cfg = ESTADO_CFG[estado] ?? ESTADO_CFG.EN_ESPERA;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${isDark ? cfg.dark : cfg.light}`}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

// ─── Historial Tab ─────────────────────────────────────────────────────────────
function HistorialTab({ vehiculoId, isDark, onOpenOrder }) {
  const { authTokens } = useContext(AuthContext);
  const [ordenes, setOrdenes] = useState([]);
  const [loading, setLoading] = useState(true);

  const border = isDark ? 'border-slate-700' : 'border-slate-200';
  const txt    = isDark ? 'text-slate-100'   : 'text-slate-900';
  const sub    = isDark ? 'text-slate-400'   : 'text-slate-500';

  useEffect(() => {
    if (!vehiculoId) return;
    setLoading(true);
    axios.get(`http://localhost:8000/api/v1/taller/vehiculo/${vehiculoId}/historial/`, {
      headers: { Authorization: `Bearer ${authTokens?.access}` }
    }).then(r => setOrdenes(r.data))
      .catch(e => console.error(e))
      .finally(() => setLoading(false));
  }, [vehiculoId]);

  if (loading) return (
    <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-blue-500" /></div>
  );

  if (!ordenes.length) return (
    <div className={`text-center py-16 border-2 border-dashed rounded-2xl ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
      <History size={36} className={`mx-auto mb-3 ${sub}`} />
      <p className={`font-semibold ${sub}`}>Sin historial de servicio</p>
      <p className={`text-xs mt-1 ${sub}`}>Este vehículo no tiene órdenes de trabajo registradas.</p>
    </div>
  );

  return (
    <div className="space-y-3">
      {ordenes.map((orden, idx) => {
        const totalRep = orden.repuestos?.reduce((s, r) => s + parseFloat(r.subtotal || 0), 0) ?? 0;
        const precioMO = parseFloat(orden.cita?.servicio?.precio ?? 0);
        const total = totalRep + precioMO;

        return (
          <div key={orden.id} className="relative flex gap-4">
            {/* Timeline line */}
            {idx < ordenes.length - 1 && (
              <div className={`absolute left-[19px] top-10 bottom-0 w-0.5 ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`} />
            )}

            {/* Timeline dot */}
            <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-xs font-black mt-1 ${
              orden.estado === 'ENTREGADO' ? 'bg-purple-600 text-white' :
              orden.estado === 'LISTO'     ? 'bg-emerald-600 text-white' :
              orden.estado === 'CANCELADO' ? 'bg-red-600 text-white' :
              isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-600'
            }`}>
              #{String(orden.id).padStart(2, '0')}
            </div>

            {/* Card */}
            <button
              onClick={() => onOpenOrder(orden.id)}
              className={`flex-1 text-left rounded-xl border p-4 transition-all ${isDark ? `bg-slate-800 border-slate-700 hover:bg-slate-750 hover:border-slate-600` : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-sm'}`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <p className={`text-xs font-bold ${sub}`}>{fmtDate(orden.fecha_creacion)}</p>
                  <p className={`text-sm font-bold mt-0.5 ${txt}`}>
                    {orden.cita?.servicio?.nombre || 'Servicio sin especificar'}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <OrderStateBadge estado={orden.estado} isDark={isDark} />
                  <ChevronRight size={14} className={sub} />
                </div>
              </div>

              {/* Mecánico */}
              {orden.mecanico_asignado && (
                <div className={`flex items-center gap-1.5 text-xs ${sub} mb-2`}>
                  <Wrench size={11} />
                  {orden.mecanico_asignado.first_name} {orden.mecanico_asignado.last_name}
                </div>
              )}

              {/* Diagnóstico preview */}
              {orden.diagnostico && (
                <p className={`text-xs ${sub} italic line-clamp-2 mb-3`}>"{orden.diagnostico}"</p>
              )}

              {/* Repuestos pills */}
              {orden.repuestos?.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {orden.repuestos.slice(0, 3).map(r => (
                    <span key={r.id} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                      {r.cantidad}× {r.producto.nombre}
                    </span>
                  ))}
                  {orden.repuestos.length > 3 && (
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                      +{orden.repuestos.length - 3} más
                    </span>
                  )}
                </div>
              )}

              {/* Total */}
              <div className={`flex items-center justify-between pt-2 border-t ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
                <span className={`text-xs ${sub}`}>Total</span>
                <span className={`text-sm font-black ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>{GTQ(total)}</span>
              </div>
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function VehiculosClienteSlideOver({ isOpen, onClose, cliente, onUpdate }) {
  const { authTokens } = useContext(AuthContext);
  const { isDark } = useTheme();

  const [vehiculos, setVehiculos]       = useState([]);
  const [loading, setLoading]           = useState(false);
  const [modalOpen, setModalOpen]       = useState(false);
  const [vehiculoEdit, setVehiculoEdit] = useState(null);

  // Tab: 'vehiculos' | 'historial'
  const [tab, setTab]                   = useState('vehiculos');
  // For historial tab — which vehicle to show history for
  const [historialVehiculo, setHistorialVehiculo] = useState(null);

  // Order detail slide-over
  const [orderOpen, setOrderOpen]       = useState(false);
  const [orderSelectedId, setOrderSelectedId] = useState(null);

  const bg     = isDark ? 'bg-slate-900' : 'bg-white';
  const text   = isDark ? 'text-white'      : 'text-slate-900';
  const sub    = isDark ? 'text-slate-400'  : 'text-slate-500';
  const border = isDark ? 'border-slate-800' : 'border-slate-200';
  const borderHi = isDark ? 'border-slate-700' : 'border-slate-200';

  useEffect(() => {
    if (isOpen && cliente) {
      fetchVehiculos();
      setTab('vehiculos');
      setHistorialVehiculo(null);
    }
  }, [isOpen, cliente]);

  const fetchVehiculos = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`http://localhost:8000/api/v1/vehiculos/?propietario_id=${cliente.id}`, {
        headers: { Authorization: `Bearer ${authTokens?.access}` }
      });
      setVehiculos(res.data);
    } catch (e) {
      console.error('Error fetching vehiculos', e);
    }
    setLoading(false);
  };

  const handleDelete = async (id, placa) => {
    if (!window.confirm(`¿Seguro que deseas eliminar el vehículo placa ${placa}?`)) return;
    try {
      await axios.delete(`http://localhost:8000/api/v1/vehiculos/${id}/`, {
        headers: { Authorization: `Bearer ${authTokens?.access}` }
      });
      fetchVehiculos();
      if (onUpdate) onUpdate();
    } catch (e) {
      alert(e.response?.data?.error || 'Error al eliminar el vehículo');
    }
  };

  const openHistorial = (v) => {
    setHistorialVehiculo(v);
    setTab('historial');
  };

  const openOrder = (id) => {
    setOrderSelectedId(id);
    setOrderOpen(true);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Panel */}
      <div className={`fixed inset-y-0 right-0 w-full md:w-[520px] shadow-2xl z-50 transform transition-transform duration-300 flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'} ${bg} border-l ${border}`}>

        {/* Header */}
        <div className="px-6 py-5 bg-blue-600 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-extrabold text-white">
              {tab === 'historial' && historialVehiculo ? (
                <button onClick={() => setTab('vehiculos')} className="flex items-center gap-2">
                  <span className="text-blue-200 text-sm">← Vehículos /</span>
                  <span>Historial</span>
                </button>
              ) : 'Vehículos Registrados'}
            </h2>
            <p className="text-blue-100 text-sm mt-0.5">
              {tab === 'historial' && historialVehiculo
                ? `${historialVehiculo.marca} ${historialVehiculo.modelo} · ${historialVehiculo.placa}`
                : `${cliente?.first_name ?? ''} ${cliente?.last_name ?? ''}`.trim()
              }
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/20 text-white transition-colors">
            <X size={22} />
          </button>
        </div>

        {/* Tabs — only show when on vehiculos tab */}
        {tab === 'vehiculos' && (
          <div className={`shrink-0 flex border-b ${borderHi} px-6`}>
            <button
              onClick={() => setTab('vehiculos')}
              className={`py-3.5 px-4 text-sm font-bold border-b-2 transition-colors ${tab === 'vehiculos' ? 'border-blue-500 text-blue-500' : `border-transparent ${sub} hover:text-blue-400`}`}
            >
              <span className="flex items-center gap-2"><Car size={15} /> Vehículos ({vehiculos.length})</span>
            </button>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* VEHICULOS TAB */}
          {tab === 'vehiculos' && (
            <>
              <button
                onClick={() => { setVehiculoEdit({ propietario: cliente }); setModalOpen(true); }}
                className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-blue-400 text-blue-500 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors font-semibold mb-5"
              >
                <Plus size={18} /> Registrar Nuevo Vehículo
              </button>

              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 size={28} className="animate-spin text-blue-500" />
                </div>
              ) : vehiculos.length === 0 ? (
                <div className={`text-center py-12 border-2 border-dashed rounded-2xl ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                  <Car size={40} className={`mx-auto mb-3 ${sub}`} />
                  <p className={sub}>Sin vehículos registrados</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {vehiculos.map(v => (
                    <div key={v.id}
                      className={`p-5 rounded-2xl border ${borderHi} ${isDark ? 'bg-slate-800/80 hover:bg-slate-800' : 'bg-slate-50 hover:bg-white hover:border-blue-300 hover:shadow-md'} transition-all group relative`}
                    >
                      {/* Header row */}
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-blue-500/15 text-blue-500 rounded-xl shrink-0">
                          <Car size={22} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className={`font-black text-lg tracking-widest uppercase ${text}`}>{v.placa}</h3>
                            {v.kilometraje_actual && (
                              <span className="text-[10px] font-bold text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <Navigation size={9} /> {v.kilometraje_actual.toLocaleString()} {v.unidad_medida_kilometraje}
                              </span>
                            )}
                          </div>
                          <p className={`text-sm ${sub} mt-0.5`}>{v.marca} {v.modelo} · {v.año} {v.color && `· ${v.color}`}</p>

                          {/* Tech pills */}
                          {(v.cilindrada_motor || v.tipo_combustible || v.transmision || v.vin_chasis) && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {v.vin_chasis && (
                                <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded flex items-center gap-1 ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-600'}`}>
                                  <Fingerprint size={9} /> VIN ···{v.vin_chasis.slice(-6)}
                                </span>
                              )}
                              {v.cilindrada_motor && (
                                <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded flex items-center gap-1 ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-600'}`}>
                                  <Wrench size={9} /> {v.cilindrada_motor}
                                </span>
                              )}
                              {v.tipo_combustible && (
                                <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded flex items-center gap-1 ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-600'}`}>
                                  <Droplet size={9} /> {v.tipo_combustible}
                                </span>
                              )}
                              {v.transmision && (
                                <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded flex items-center gap-1 ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-600'}`}>
                                  <Settings2 size={9} /> {v.transmision === 'MECANICA' ? 'MEC' : v.transmision === 'AUTOMATICA' ? 'AUT' : v.transmision}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className={`mt-4 pt-3 border-t ${borderHi} flex items-center justify-between`}>
                        <button
                          onClick={() => openHistorial(v)}
                          className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}
                        >
                          <History size={13} /> Ver historial de servicio
                        </button>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => { setVehiculoEdit({ ...v, propietario: cliente }); setModalOpen(true); }}
                            className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-700 text-blue-400' : 'hover:bg-slate-100 text-blue-600'}`}
                            title="Editar"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            onClick={() => handleDelete(v.id, v.placa)}
                            className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-700 text-red-400' : 'hover:bg-red-50 text-red-600'}`}
                            title="Eliminar"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* HISTORIAL TAB */}
          {tab === 'historial' && historialVehiculo && (
            <HistorialTab
              vehiculoId={historialVehiculo.id}
              isDark={isDark}
              onOpenOrder={openOrder}
            />
          )}
        </div>
      </div>

      {/* Modals */}
      <VehiculoFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        vehiculo={vehiculoEdit}
        onSaved={() => { fetchVehiculos(); if (onUpdate) onUpdate(); }}
      />

      <OrderSlideOver
        isOpen={orderOpen}
        orderId={orderSelectedId}
        onClose={() => setOrderOpen(false)}
        onUpdate={() => {
          setOrderOpen(false);
          // Trigger historial refresh by toggling vehiculo
          if (historialVehiculo) {
            const v = historialVehiculo;
            setHistorialVehiculo(null);
            setTimeout(() => setHistorialVehiculo(v), 50);
          }
        }}
      />
    </>
  );
}
