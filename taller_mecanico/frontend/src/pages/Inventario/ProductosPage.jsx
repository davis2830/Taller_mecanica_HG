import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { AuthContext } from '../../context/AuthContext';
import axios from 'axios';
import { 
    Search, Filter, Plus, Package, DollarSign, AlertTriangle, 
    RefreshCw, Edit2, Loader2, Tag, Archive, CheckCircle, XCircle 
} from 'lucide-react';
import ProductoFormModal from '../../components/ProductoFormModal';
import AlertasWidget from '../../components/AlertasWidget';

// ─── Formatting helpers ───────────────────────────────────────────────────────
const GTQ = (v) => v != null ? new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' }).format(v) : 'Q0.00';

function StatCard({ label, value, icon, accent, isDark }) {
    return (
        <div className={`rounded-2xl border p-5 flex items-center gap-4 ${isDark ? 'bg-slate-800/70 border-slate-700' : 'bg-white border-slate-200'}`}>
            <div className={`p-3 rounded-xl ${isDark ? `${accent}/15` : `${accent}/10`}`}>
                <span className={`${accent}`}>{icon}</span>
            </div>
            <div>
                <p className={`text-xs font-bold uppercase tracking-wide ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{label}</p>
                <p className={`text-2xl font-black mt-0.5 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{value}</p>
            </div>
        </div>
    );
}

export default function ProductosPage() {
    const { isDark } = useTheme();
    const { authTokens } = useContext(AuthContext);

    const [productos, setProductos] = useState([]);
    const [resumen, setResumen] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadingResumen, setLoadingResumen] = useState(true);

    const [searchQ, setSearchQ] = useState('');
    const [inputQ, setInputQ] = useState('');
    const [filterStockBajo, setFilterStockBajo] = useState(false);

    // Modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [productoEdit, setProductoEdit] = useState(null);

    const headers = { Authorization: `Bearer ${authTokens?.access}` };

    const fetchResumen = useCallback(async () => {
        setLoadingResumen(true);
        try {
            const res = await axios.get('http://localhost:8000/api/v1/inventario/resumen/', { headers });
            setResumen(res.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingResumen(false);
        }
    }, [authTokens]);

    const fetchProductos = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (searchQ) params.append('search', searchQ);
            if (filterStockBajo) params.append('stock_bajo', 'true');
            // By default list only active unless told otherwise, handled by backend
            
            const res = await axios.get(`http://localhost:8000/api/v1/inventario/productos/?${params}`, { headers });
            setProductos(res.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [searchQ, filterStockBajo, authTokens]);

    useEffect(() => {
        fetchResumen();
    }, [fetchResumen]);

    useEffect(() => {
        fetchProductos();
    }, [fetchProductos]);

    useEffect(() => {
        const t = setTimeout(() => setSearchQ(inputQ), 400);
        return () => clearTimeout(t);
    }, [inputQ]);

    const handleOpenEdit = (producto) => {
        setProductoEdit(producto);
        setModalOpen(true);
    };

    const handleOpenNew = () => {
        setProductoEdit(null);
        setModalOpen(true);
    };

    // Theme values
    const pageBg   = isDark ? 'bg-[#0a0f1e]' : 'bg-slate-100';
    const cardBg   = isDark ? 'bg-slate-800/70' : 'bg-white';
    const borderC  = isDark ? 'border-slate-700' : 'border-slate-200';
    const txt      = isDark ? 'text-slate-100' : 'text-slate-900';
    const sub      = isDark ? 'text-slate-400' : 'text-slate-500';
    const thdBg    = isDark ? 'bg-slate-900' : 'bg-slate-50';
    const thdTxt   = isDark ? 'text-slate-400' : 'text-slate-500';
    const rowHov   = isDark ? 'hover:bg-slate-700/40' : 'hover:bg-slate-50';
    const inputCls = `w-full rounded-xl border text-sm px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500/50 transition-colors ${isDark ? 'bg-slate-800 border-slate-600 text-white placeholder-slate-500' : 'bg-white border-slate-300 text-slate-800 placeholder-slate-400'}`;

    return (
        <div className={`flex flex-col h-full ${pageBg}`}>
            
            {/* Header */}
            <div className={`shrink-0 px-6 py-5 border-b ${borderC} ${isDark ? 'bg-slate-900' : 'bg-white'} flex items-center justify-between gap-4`}>
                <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${isDark ? 'bg-blue-500/15' : 'bg-blue-100'}`}>
                        <Package size={21} className="text-blue-500" />
                    </div>
                    <div>
                        <h1 className={`text-xl font-extrabold tracking-tight ${txt}`}>Catálogo e Inventario</h1>
                        <p className={`text-sm mt-0.5 ${sub}`}>Gestión de almacén y valoración</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => { fetchResumen(); fetchProductos(); }}
                        className={`flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl transition-all border ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-600' : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200 shadow-sm'}`}
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <button
                        onClick={handleOpenNew}
                        className="flex items-center gap-2 text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl shadow-lg shadow-blue-500/20 transition-all"
                    >
                        <Plus size={16} /> Nuevo Producto
                    </button>
                </div>
            </div>

            {/* Alertas Globales Widget */}
            <div className="shrink-0 px-6 pt-4 pb-0">
                <AlertasWidget onAlertaResuelta={fetchResumen} />
            </div>

            {/* Smart Stats / Dashboard integration */}
            <div className="shrink-0 px-6 py-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard 
                    label="Stock Valorizado (Costo)" 
                    value={loadingResumen ? '...' : GTQ(resumen?.total_valorizado)} 
                    icon={<DollarSign size={20} />} 
                    accent="text-emerald-500" 
                    isDark={isDark} 
                />
                
                <StatCard 
                    label="Productos Activos" 
                    value={loadingResumen ? '...' : (resumen?.total_productos ?? 0)} 
                    icon={<Package size={20} />} 
                    accent="text-blue-500" 
                    isDark={isDark} 
                />
                
                <div 
                    onClick={() => setFilterStockBajo(!filterStockBajo)}
                    className={`rounded-2xl border p-5 flex items-center gap-4 cursor-pointer transition-all ${filterStockBajo ? (isDark ? 'bg-orange-900/30 border-orange-500/50 scale-[1.02] shadow-lg shadow-orange-900/20' : 'bg-orange-50 border-orange-300 scale-[1.02] shadow-md shadow-orange-100') : (isDark ? 'bg-slate-800/70 border-slate-700 hover:border-orange-500/30' : 'bg-white border-slate-200 hover:border-orange-300')}`}
                >
                    <div className={`p-3 rounded-xl ${filterStockBajo ? 'bg-orange-500/20' : isDark ? 'bg-orange-500/10' : 'bg-orange-100'}`}>
                        <AlertTriangle size={20} className={filterStockBajo ? 'text-orange-500' : 'text-orange-400'} />
                    </div>
                    <div>
                        <p className={`text-xs font-bold uppercase tracking-wide ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Críticos / Stock Bajo</p>
                        <div className="flex items-center gap-2">
                            <p className={`text-2xl font-black mt-0.5 ${filterStockBajo ? (isDark ? 'text-orange-400' : 'text-orange-600') : (isDark ? 'text-slate-100' : 'text-slate-900')}`}>
                                {loadingResumen ? '...' : (resumen?.productos_stock_bajo ?? 0)}
                            </p>
                            {filterStockBajo && <span className="text-[10px] font-bold bg-orange-500 text-white px-2 py-0.5 rounded-full">Filtro Activo</span>}
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className={`shrink-0 px-6 py-3 border-b ${borderC} ${isDark ? 'bg-slate-900/60' : 'bg-white/80'} flex flex-wrap gap-3 items-center`}>
                <div className="relative flex-1 min-w-[220px] max-w-md">
                    <Search size={15} className={`absolute left-3 top-1/2 -translate-y-1/2 ${sub} pointer-events-none`} />
                    <input
                        type="text"
                        className={`${inputCls} pl-9`}
                        placeholder="Buscar por código, nombre o categoría..."
                        value={inputQ}
                        onChange={(e) => setInputQ(e.target.value)}
                    />
                </div>
                
                {(searchQ || filterStockBajo) && (
                    <button
                        onClick={() => { setInputQ(''); setSearchQ(''); setFilterStockBajo(false); }}
                        className={`text-xs font-semibold px-3 py-2 rounded-lg border transition-colors ${isDark ? 'border-red-700/50 text-red-400 hover:bg-red-900/30' : 'border-red-200 text-red-500 hover:bg-red-50'}`}
                    >
                        Limpiar Filtros
                    </button>
                )}
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto px-6 py-5">
                <div className={`rounded-xl border ${borderC} ${cardBg} overflow-hidden shadow-sm`}>
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 size={32} className="animate-spin text-blue-500" />
                        </div>
                    ) : productos.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-3">
                            <Archive size={40} className={sub} />
                            <p className={`text-sm font-medium ${sub}`}>No se encontraron productos.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className={`border-b ${borderC} ${thdBg}`}>
                                        <th className={`px-4 py-3 text-left text-xs font-bold uppercase tracking-wider whitespace-nowrap ${thdTxt}`}>SKU</th>
                                        <th className={`px-4 py-3 text-left text-xs font-bold uppercase tracking-wider ${thdTxt}`}>Producto / Categoría</th>
                                        <th className={`px-4 py-3 text-left text-xs font-bold uppercase tracking-wider whitespace-nowrap ${thdTxt}`}>Stock Actual</th>
                                        <th className={`px-4 py-3 text-left text-xs font-bold uppercase tracking-wider whitespace-nowrap ${thdTxt}`}>Precio Costo</th>
                                        <th className={`px-4 py-3 text-left text-xs font-bold uppercase tracking-wider whitespace-nowrap ${thdTxt}`}>Precio Venta</th>
                                        <th className={`px-4 py-3 text-right text-xs font-bold uppercase tracking-wider ${thdTxt}`}>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className={`divide-y ${isDark ? 'divide-slate-700/50' : 'divide-slate-100'}`}>
                                    {productos.map(p => (
                                        <tr key={p.id} className={`${rowHov} transition-colors cursor-pointer`} onClick={() => handleOpenEdit(p)}>
                                            <td className="px-4 py-3.5 whitespace-nowrap">
                                                <span className={`font-mono text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                                                    <Tag size={10} className="inline mr-1 opacity-50" />
                                                    {p.codigo}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-col">
                                                    <span className={`font-bold ${txt}`}>{p.nombre}</span>
                                                    <span className={`text-[11px] font-semibold mt-0.5 ${p.categoria_nombre ? sub : 'text-orange-400/70 italic'}`}>
                                                        {p.categoria_nombre || 'Sin categoría'} • {p.tipo}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3.5 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-lg font-black ${p.necesita_reposicion ? 'text-red-500' : txt}`}>
                                                        {p.stock_actual}
                                                    </span>
                                                    <span className={`text-[10px] ${sub}`}>{p.unidad_medida}</span>
                                                    {p.necesita_reposicion && (
                                                        <AlertTriangle size={14} className="text-red-500 ml-1" title="Stock por debajo del mínimo" />
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3.5 whitespace-nowrap">
                                                <span className={`text-sm font-semibold ${sub}`}>{GTQ(p.precio_compra)}</span>
                                            </td>
                                            <td className="px-4 py-3.5 whitespace-nowrap">
                                                <span className={`text-sm font-black ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>{GTQ(p.precio_venta)}</span>
                                            </td>
                                            <td className="px-4 py-3.5 text-right whitespace-nowrap">
                                                <button onClick={(e) => { e.stopPropagation(); handleOpenEdit(p); }} 
                                                        className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-600 text-blue-400' : 'hover:bg-blue-50 text-blue-600'}`}>
                                                    <Edit2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            <ProductoFormModal 
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                producto={productoEdit}
                onSaved={() => {
                    fetchProductos();
                    fetchResumen();
                }}
            />
        </div>
    );
}
