import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import { AuthContext } from '../../../context/AuthContext';
import axios from 'axios';
import { Plus, RefreshCw, Loader2, Download, PackageCheck, ShoppingCart, Calendar, User, Search, Filter, AlertTriangle, Ban } from 'lucide-react';
import OrdenCompraFormModal from '../../../components/OrdenCompraFormModal';

const GTQ = (v) => v != null ? new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' }).format(v) : 'Q0.00';
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('es-GT', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

export default function TabOrdenesCompra() {
    const { isDark } = useTheme();
    const { authTokens } = useContext(AuthContext);

    const [ordenes, setOrdenes] = useState([]);
    const [loading, setLoading] = useState(true);

    const [modalOpen, setModalOpen] = useState(false);
    const [expandedOrder, setExpandedOrder] = useState(null);
    
    // Filtros
    const [searchQ, setSearchQ] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');

    // Confirmación modal de Recepción
    const [confirmModalData, setConfirmModalData] = useState(null);
    const [receiving, setReceiving] = useState(null); // id of order being received

    // Confirmación modal de Cancelación
    const [cancelModalData, setCancelModalData] = useState(null);
    const [motivoCancelacion, setMotivoCancelacion] = useState('');
    const [canceling, setCanceling] = useState(null);

    const headers = { Authorization: `Bearer ${authTokens?.access}` };

    const fetchOrdenes = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axios.get('http://localhost:8000/api/v1/inventario/ordenes-compra/', { headers });
            setOrdenes(res.data.results || res.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [authTokens]);

    useEffect(() => {
        fetchOrdenes();
    }, [fetchOrdenes]);

    const promptRecepcionar = (e, id) => {
        e.stopPropagation();
        setConfirmModalData(id);
    };

    const handleRecepcionarConfirm = async () => {
        if (!confirmModalData) return;
        setReceiving(confirmModalData);
        try {
            await axios.post(`http://localhost:8000/api/v1/inventario/ordenes-compra/${confirmModalData}/recibir/`, {}, { headers });
            fetchOrdenes();
        } catch (error) {
            console.error(error);
            alert("Error al recepcionar la orden");
        }
        setReceiving(null);
        setConfirmModalData(null);
    };

    const promptCancelar = (e, id) => {
        e.stopPropagation();
        setCancelModalData(id);
        setMotivoCancelacion('');
    };

    const handleCancelarConfirm = async () => {
        if (!cancelModalData) return;
        if (!motivoCancelacion.trim()) return alert("Debe ingresar el motivo de anulación.");

        setCanceling(cancelModalData);
        try {
            await axios.post(`http://localhost:8000/api/v1/inventario/ordenes-compra/${cancelModalData}/cancelar/`, {
                motivo_cancelacion: motivoCancelacion
            }, { headers });
            fetchOrdenes();
        } catch (error) {
            console.error(error);
            alert("Error al anular la orden. Verifique consola.");
        }
        setCanceling(null);
        setCancelModalData(null);
    };

    const StatusBadge = ({ status }) => {
        let sc = 'bg-slate-100 text-slate-800 border-slate-200';
        if (isDark) sc = 'bg-slate-800 text-slate-300 border-slate-700';

        if (status === 'SOLICITADA') sc = isDark ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' : 'bg-orange-100 text-orange-800 border-orange-200';
        else if (status === 'PARCIAL') sc = isDark ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-blue-100 text-blue-800 border-blue-200';
        else if (status === 'COMPLETA') sc = isDark ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-emerald-100 text-emerald-800 border-emerald-200';
        else if (status === 'CANCELADA') sc = isDark ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-red-100 text-red-800 border-red-200';

        return <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider ${sc}`}>{status}</span>;
    };

    const borderC  = isDark ? 'border-slate-700' : 'border-slate-200';
    const bgCard   = isDark ? 'bg-slate-800/70' : 'bg-white';
    const thdBg    = isDark ? 'bg-slate-900' : 'bg-slate-50';
    const thdTxt   = isDark ? 'text-slate-400' : 'text-slate-500';
    const txt      = isDark ? 'text-slate-100' : 'text-slate-900';
    const sub      = isDark ? 'text-slate-400' : 'text-slate-500';

    const inputCls = `w-full max-w-[200px] rounded-xl border text-sm px-3 py-2.5 outline-none focus:ring-2 focus:ring-orange-500/50 transition-colors ${isDark ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400'}`;
    const selectCls = `rounded-xl border text-sm px-3 py-2.5 outline-none focus:ring-2 focus:ring-orange-500/50 transition-colors ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'}`;

    const filteredOrdenes = ordenes.filter(oc => {
        const matchesSearch = searchQ ? (
            oc.id.toString().includes(searchQ) ||
            oc.proveedor_nombre.toLowerCase().includes(searchQ.toLowerCase())
        ) : true;
        const matchesStatus = statusFilter !== 'ALL' ? oc.estado === statusFilter : true;
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="flex flex-col h-full absolute inset-0">
            <div className={`shrink-0 px-6 py-4 border-b ${borderC} flex justify-between items-center bg-transparent gap-4 flex-wrap`}>
                
                <div className="flex items-center gap-3 flex-1 min-w-[280px]">
                    <div className="relative flex-1 max-w-[240px]">
                        <Search size={15} className={`absolute left-3 top-1/2 -translate-y-1/2 ${sub}`} />
                        <input
                            type="text"
                            placeholder="Buscar OC o Proveedor..."
                            value={searchQ}
                            onChange={(e) => setSearchQ(e.target.value)}
                            className={`${inputCls} max-w-full pl-9`}
                        />
                    </div>
                    <div className="relative">
                        <Filter size={15} className={`absolute left-3 top-1/2 -translate-y-1/2 ${sub} pointer-events-none`} />
                        <select 
                            value={statusFilter} 
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className={`${selectCls} pl-9 pr-6 cursor-pointer`}
                        >
                            <option value="ALL">Todos los Estados</option>
                            <option value="SOLICITADA">Solicitadas</option>
                            <option value="PARCIAL">Parciales</option>
                            <option value="COMPLETA">Completas</option>
                            <option value="CANCELADA">Canceladas</option>
                        </select>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button onClick={fetchOrdenes} className={`p-2.5 rounded-xl border transition-colors ${isDark ? 'border-slate-700 text-slate-400 hover:bg-slate-800' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <button onClick={() => setModalOpen(true)} className="flex items-center gap-2 text-sm font-bold bg-orange-600 hover:bg-orange-700 text-white px-5 py-2.5 rounded-xl shadow-lg shadow-orange-500/20 transition-all">
                        <Plus size={16} /> Nueva Orden
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-auto p-6">
                {loading ? (
                     <div className="flex justify-center py-20"><Loader2 size={32} className="animate-spin text-orange-500" /></div>
                ) : filteredOrdenes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <ShoppingCart size={40} className={sub} />
                        <p className={`text-sm font-medium ${sub}`}>No hay órdenes de compra que coincidan con la búsqueda.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredOrdenes.map(oc => (
                            <div key={oc.id} className={`rounded-xl border ${borderC} ${bgCard} overflow-hidden shadow-sm transition-all`}>
                                <div 
                                    className={`p-4 flex items-center justify-between cursor-pointer ${isDark ? 'hover:bg-slate-700/50' : 'hover:bg-slate-50'} ${expandedOrder === oc.id ? (isDark ? 'bg-slate-800' : 'bg-slate-50') : ''}`}
                                    onClick={() => setExpandedOrder(expandedOrder === oc.id ? null : oc.id)}
                                >
                                    <div className="flex items-center gap-6">
                                        <div>
                                            <p className={`text-[10px] font-black uppercase ${sub}`}>OC-{oc.id.toString().padStart(4, '0')}</p>
                                            <p className={`font-bold text-lg ${txt}`}>{oc.proveedor_nombre}</p>
                                            {oc.cita_taller_descripcion && <p className={`text-xs mt-1 font-bold ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>{oc.cita_taller_descripcion}</p>}
                                        </div>
                                        <div className="hidden md:block">
                                            <p className={`text-[10px] uppercase font-bold ${sub}`}>Fecha Emisión</p>
                                            <div className={`flex items-center gap-1.5 text-sm font-semibold mt-0.5 ${txt}`}><Calendar size={13}/> {fmtDate(oc.fecha_creacion)}</div>
                                        </div>
                                        <div className="hidden md:block">
                                            <p className={`text-[10px] uppercase font-bold ${sub}`}>Creada por</p>
                                            <div className={`flex items-center gap-1.5 text-sm font-semibold mt-0.5 ${txt}`}><User size={13}/> {oc.creada_por_nombre}</div>
                                        </div>
                                        <div>
                                            <StatusBadge status={oc.estado} />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <p className={`text-[10px] font-bold uppercase ${sub}`}>Total Orden</p>
                                            <p className={`font-black text-lg ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>{GTQ(oc.total)}</p>
                                        </div>
                                    </div>
                                </div>

                                {expandedOrder === oc.id && (
                                    <div className={`border-t ${borderC} ${isDark ? 'bg-slate-900/50' : 'bg-slate-50/50'} p-4`}>
                                        <div className="flex justify-between items-center mb-4">
                                            <h4 className={`text-sm font-bold uppercase tracking-wider ${sub}`}>Detalle de Productos Solicitados</h4>
                                            
                                            <div className="flex items-center gap-2">
                                                {['SOLICITADA', 'PARCIAL', 'COMPLETA'].includes(oc.estado) && (
                                                    <button 
                                                        onClick={(e) => promptCancelar(e, oc.id)}
                                                        disabled={canceling === oc.id}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-md shadow-rose-500/20 disabled:opacity-50"
                                                    >
                                                        {canceling === oc.id ? <Loader2 size={14} className="animate-spin" /> : <Ban size={14} />}
                                                        Anular
                                                    </button>
                                                )}
                                                {['SOLICITADA', 'PARCIAL'].includes(oc.estado) && (
                                                    <button 
                                                        onClick={(e) => promptRecepcionar(e, oc.id)}
                                                        disabled={receiving === oc.id}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-md shadow-emerald-500/20 disabled:opacity-50"
                                                    >
                                                        {receiving === oc.id ? <Loader2 size={14} className="animate-spin" /> : <PackageCheck size={14} />}
                                                        Recibir Todo
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        <div className={`rounded-xl border ${borderC} overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
                                            <table className="w-full text-xs">
                                                <thead>
                                                    <tr className={`border-b ${borderC} ${thdBg}`}>
                                                        <th className={`px-4 py-2 text-left font-bold ${thdTxt}`}>SKU</th>
                                                        <th className={`px-4 py-2 text-left font-bold ${thdTxt}`}>Producto</th>
                                                        <th className={`px-4 py-2 text-center font-bold ${thdTxt}`}>Cant. Solicitada</th>
                                                        <th className={`px-4 py-2 text-center font-bold ${thdTxt}`}>Cant. Recibida</th>
                                                        <th className={`px-4 py-2 text-right font-bold ${thdTxt}`}>Costo Unit.</th>
                                                        <th className={`px-4 py-2 text-right font-bold ${thdTxt}`}>Subtotal</th>
                                                    </tr>
                                                </thead>
                                                <tbody className={`divide-y ${isDark ? 'divide-slate-700/50' : 'divide-slate-100'}`}>
                                                    {oc.detalles.map(d => (
                                                        <tr key={d.id} className={isDark ? 'hover:bg-slate-700/30' : 'hover:bg-slate-50'}>
                                                            <td className={`px-4 py-2 font-mono text-[10px] ${sub}`}>{d.producto_codigo}</td>
                                                            <td className={`px-4 py-2 font-bold ${txt}`}>{d.producto_nombre}</td>
                                                            <td className={`px-4 py-2 text-center font-semibold ${txt}`}>{d.cantidad_solicitada}</td>
                                                            <td className="px-4 py-2 text-center">
                                                                <span className={`font-bold ${d.cantidad_recibida === d.cantidad_solicitada ? 'text-emerald-500' : (isDark ? 'text-orange-400' : 'text-orange-600')}`}>
                                                                    {d.cantidad_recibida}
                                                                </span>
                                                            </td>
                                                            <td className={`px-4 py-2 text-right font-semibold ${sub}`}>{GTQ(d.precio_unitario)}</td>
                                                            <td className={`px-4 py-2 text-right font-bold ${txt}`}>{GTQ(d.subtotal)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>

                                        {oc.estado === 'CANCELADA' && oc.motivo_cancelacion && (
                                            <div className={`mt-4 p-3 rounded-lg text-xs font-semibold ${isDark ? 'bg-rose-500/10 text-rose-300' : 'bg-rose-50 text-rose-800'}`}>
                                                <span className="font-bold uppercase tracking-wider mr-2">Motivo Anulación:</span> {oc.motivo_cancelacion}
                                                <span className="ml-3 italic opacity-75">(Cancelado por {oc.cancelada_por_nombre || 'Sistema'})</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Custom Confirm Modal */}
            {confirmModalData && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                    <div className={`w-full max-w-sm rounded-2xl shadow-2xl p-6 relative ${isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white'}`}>
                        <div className="flex flex-col items-center text-center gap-4">
                            <div className={`p-4 rounded-full ${isDark ? 'bg-orange-500/20 text-orange-400' : 'bg-orange-100 text-orange-600'}`}>
                                <AlertTriangle size={36} />
                            </div>
                            <div>
                                <h3 className={`text-lg font-black ${txt}`}>¿Completar Recepción?</h3>
                                <p className={`mt-2 text-sm ${sub}`}>
                                    Confirma la recepción de la mercancía pendiente. Esto sumará el inventario físico actual y generará una cuenta por pagar al proveedor automáticamente.
                                </p>
                            </div>
                            <div className="flex gap-3 mt-4 w-full">
                                <button 
                                    onClick={() => setConfirmModalData(null)}
                                    className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
                                >
                                    Cancelar
                                </button>
                                <button 
                                    onClick={handleRecepcionarConfirm}
                                    className="flex-1 py-2 rounded-xl text-sm font-bold bg-orange-600 hover:bg-orange-700 text-white shadow-lg shadow-orange-500/20"
                                >
                                    Confirmar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Cancel Confirm Modal */}
            {cancelModalData && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                    <div className={`w-full max-w-md rounded-2xl shadow-2xl p-6 relative ${isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white'}`}>
                        <div className="flex flex-col items-center text-center gap-4">
                            <div className={`p-4 rounded-full ${isDark ? 'bg-rose-500/20 text-rose-400' : 'bg-rose-100 text-rose-600'}`}>
                                <Ban size={36} />
                            </div>
                            <div>
                                <h3 className={`text-lg font-black ${txt}`}>¿Anular Órden de Compra?</h3>
                                <p className={`mt-2 text-sm ${sub}`}>
                                    Esta acción es irreversible. Se liberará el stock ingresado si ya fue recibida.
                                </p>
                            </div>
                            <div className="w-full text-left mt-2">
                                <label className={`block text-xs font-bold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Motivo de la Anulación *</label>
                                <textarea 
                                    rows="3"
                                    value={motivoCancelacion}
                                    onChange={(e) => setMotivoCancelacion(e.target.value)}
                                    placeholder="Explica qué ocurrió..."
                                    className={`w-full rounded-xl border text-sm px-3 py-2.5 outline-none resize-none transition-colors ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`}
                                />
                            </div>
                            <div className="flex gap-3 mt-2 w-full">
                                <button 
                                    onClick={() => setCancelModalData(null)}
                                    className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
                                >
                                    Cancelar
                                </button>
                                <button 
                                    onClick={handleCancelarConfirm}
                                    disabled={!motivoCancelacion.trim()}
                                    className="flex-1 py-2 rounded-xl text-sm font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-500/20 disabled:opacity-50"
                                >
                                    Confirmar Anulación
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <OrdenCompraFormModal isOpen={modalOpen} onClose={() => setModalOpen(false)} onSaved={fetchOrdenes} />
        </div>
    );
}
