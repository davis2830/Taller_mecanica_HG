import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { AuthContext } from '../../context/AuthContext';
import axios from 'axios';
import { 
    Search, Filter, Plus, ArrowRightLeft, ArrowDownCircle, ArrowUpCircle, AlertCircle, RefreshCw, Loader2, Calendar, User, Package
} from 'lucide-react';
import MovimientoFormModal from '../../components/MovimientoFormModal';

const GTQ = (v) => v != null ? new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' }).format(v) : 'Q0.00';
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('es-GT', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' }) : '—';

export default function MovimientosPage() {
    const { isDark } = useTheme();
    const { authTokens } = useContext(AuthContext);

    const [movimientos, setMovimientos] = useState([]);
    const [loading, setLoading] = useState(true);

    const [filterTipo, setFilterTipo] = useState('');
    
    // Modal
    const [modalOpen, setModalOpen] = useState(false);

    const headers = { Authorization: `Bearer ${authTokens?.access}` };

    const fetchMovimientos = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filterTipo) params.append('tipo', filterTipo);
            
            // Asumiendo que el viewset tiene paginación por defecto si es muy largo, pero por ahora tomemos la data directa
            const res = await axios.get(`http://localhost:8000/api/v1/inventario/movimientos/?${params}`, { headers });
            
            // Si el backend usa PageNumberPagination retorna count, results... Asumiremos res.data.results o res.data
            setMovimientos(res.data.results || res.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [filterTipo, authTokens]);

    useEffect(() => {
        fetchMovimientos();
    }, [fetchMovimientos]);

    const pageBg   = isDark ? 'bg-[#0a0f1e]' : 'bg-slate-100';
    const cardBg   = isDark ? 'bg-slate-800/70' : 'bg-white';
    const borderC  = isDark ? 'border-slate-700' : 'border-slate-200';
    const txt      = isDark ? 'text-slate-100' : 'text-slate-900';
    const sub      = isDark ? 'text-slate-400' : 'text-slate-500';
    const thdBg    = isDark ? 'bg-slate-900' : 'bg-slate-50';
    const thdTxt   = isDark ? 'text-slate-400' : 'text-slate-500';
    const rowHov   = isDark ? 'hover:bg-slate-700/40' : 'hover:bg-slate-50';
    const inputCls = `rounded-xl border text-sm px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500/50 transition-colors ${isDark ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-slate-300 text-slate-800'}`;

    const renderIconTipo = (tipo) => {
        if (tipo === 'ENTRADA') return <ArrowDownCircle size={16} className="text-emerald-500" />;
        if (tipo === 'SALIDA') return <ArrowUpCircle size={16} className="text-red-500" />;
        return <AlertCircle size={16} className="text-indigo-500" />;
    };

    return (
        <div className={`flex flex-col h-full ${pageBg}`}>
            
            {/* Header */}
            <div className={`shrink-0 px-6 py-5 border-b ${borderC} ${isDark ? 'bg-slate-900' : 'bg-white'} flex items-center justify-between gap-4`}>
                <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${isDark ? 'bg-indigo-500/15' : 'bg-indigo-100'}`}>
                        <ArrowRightLeft size={21} className="text-indigo-500" />
                    </div>
                    <div>
                        <h1 className={`text-xl font-extrabold tracking-tight ${txt}`}>Movimientos de Inventario</h1>
                        <p className={`text-sm mt-0.5 ${sub}`}>Historial de entradas, salidas y ajustes</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={fetchMovimientos} className={`p-2.5 rounded-xl border transition-colors ${isDark ? 'border-slate-700 text-slate-400 hover:bg-slate-800' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <button onClick={() => setModalOpen(true)} className="flex items-center gap-2 text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-500/20 transition-all">
                        <Plus size={16} /> Registrar Movimiento
                    </button>
                </div>
            </div>

            {/* Fltros */}
            <div className={`shrink-0 px-6 py-3 border-b ${borderC} ${isDark ? 'bg-slate-900/60' : 'bg-white/80'} flex gap-3 items-center`}>
                <div className="relative">
                    <Filter size={15} className={`absolute left-3 top-1/2 -translate-y-1/2 ${sub} pointer-events-none`} />
                    <select
                        className={`${inputCls} pl-9 appearance-none cursor-pointer min-w-[200px]`}
                        value={filterTipo}
                        onChange={(e) => setFilterTipo(e.target.value)}
                    >
                        <option value="">Todas las operaciones</option>
                        <option value="ENTRADA">Solo Entradas</option>
                        <option value="SALIDA">Solo Salidas</option>
                        <option value="AJUSTE">Solo Ajustes</option>
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto px-6 py-5">
                <div className={`rounded-xl border ${borderC} ${cardBg} overflow-hidden shadow-sm`}>
                    {loading ? (
                        <div className="flex justify-center py-20"><Loader2 size={32} className="animate-spin text-indigo-500" /></div>
                    ) : movimientos.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-3">
                            <ArrowRightLeft size={40} className={sub} />
                            <p className={`text-sm font-medium ${sub}`}>No hay movimientos registrados.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className={`border-b ${borderC} ${thdBg}`}>
                                        <th className={`px-4 py-3 text-left text-xs font-bold uppercase ${thdTxt}`}>Fecha</th>
                                        <th className={`px-4 py-3 text-left text-xs font-bold uppercase ${thdTxt}`}>Producto</th>
                                        <th className={`px-4 py-3 text-left text-xs font-bold uppercase ${thdTxt}`}>Operación</th>
                                        <th className={`px-4 py-3 text-center text-xs font-bold uppercase ${thdTxt}`}>Cant</th>
                                        <th className={`px-4 py-3 text-left text-xs font-bold uppercase ${thdTxt}`}>Stock Actualizado</th>
                                        <th className={`px-4 py-3 text-left text-xs font-bold uppercase ${thdTxt}`}>Valor Total</th>
                                        <th className={`px-4 py-3 text-left text-xs font-bold uppercase ${thdTxt}`}>Usuario</th>
                                    </tr>
                                </thead>
                                <tbody className={`divide-y ${isDark ? 'divide-slate-700/50' : 'divide-slate-100'}`}>
                                    {movimientos.map(m => (
                                        <tr key={m.id} className={`${rowHov} transition-colors`}>
                                            <td className="px-4 py-3.5 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <Calendar size={13} className={sub}/>
                                                    <span className={`text-xs ${txt}`}>{fmtDate(m.fecha)}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <div className="flex flex-col">
                                                    <span className={`font-bold ${txt}`}>{m.producto_nombre}</span>
                                                    <span className={`text-[10px] font-mono ${sub}`}>SKU: {m.producto_codigo}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3.5 whitespace-nowrap">
                                                <div className="flex items-center gap-1.5">
                                                    {renderIconTipo(m.tipo)}
                                                    <div>
                                                        <p className={`text-xs font-black ${isDark?'text-slate-200':'text-slate-800'}`}>{m.tipo}</p>
                                                        <p className={`text-[10px] ${sub} uppercase`}>{m.motivo.replace('_', ' ')}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3.5 text-center whitespace-nowrap">
                                                <span className={`text-sm font-black ${
                                                    m.tipo === 'ENTRADA' ? 'text-emerald-500' : m.tipo === 'SALIDA' ? 'text-red-500' : 'text-indigo-500'
                                                }`}>
                                                    {m.tipo === 'ENTRADA' ? '+' : m.tipo === 'SALIDA' ? '-' : ''}{m.cantidad}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3.5 whitespace-nowrap">
                                                <div className={`text-xs ${sub} flex items-center gap-2`}>
                                                    <span className="line-through opacity-70">{m.stock_anterior}</span>
                                                    <span className="font-black text-sm text-blue-500">{m.stock_nuevo}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3.5 whitespace-nowrap">
                                                <span className={`text-sm font-semibold ${sub}`}>{GTQ(m.valor_total)}</span>
                                            </td>
                                            <td className="px-4 py-3.5 whitespace-nowrap">
                                                <div className={`flex items-center gap-1.5 text-xs ${txt}`}>
                                                    <User size={12} className={sub}/>
                                                    {m.usuario_nombre}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            <MovimientoFormModal 
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onSaved={fetchMovimientos}
            />
        </div>
    );
}
