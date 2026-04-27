import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import { AuthContext } from '../../../context/AuthContext';
import axios from 'axios';
import { RefreshCw, Loader2, Target, Search } from 'lucide-react';

const GTQ = (v) => v != null ? new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' }).format(v) : '—';
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('es-GT', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

export default function TabCatalogoPrecios() {
    const { isDark } = useTheme();
    const { authTokens } = useContext(AuthContext);

    const [precios, setPrecios] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQ, setSearchQ] = useState('');
    const [inputQ, setInputQ] = useState('');

    const headers = { Authorization: `Bearer ${authTokens?.access}` };

    const fetchPrecios = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/v1/inventario/precios-proveedor/', { headers });
            // Agrupar por producto
            const agrupado = res.data.results || res.data;
            setPrecios(agrupado);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [authTokens]);

    useEffect(() => {
        fetchPrecios();
    }, [fetchPrecios]);

    useEffect(() => {
        const t = setTimeout(() => setSearchQ(inputQ.toLowerCase()), 300);
        return () => clearTimeout(t);
    }, [inputQ]);

    const borderC  = isDark ? 'border-slate-700' : 'border-slate-200';
    const bgCard   = isDark ? 'bg-slate-800/70' : 'bg-white';
    const txt      = isDark ? 'text-slate-100' : 'text-slate-900';
    const sub      = isDark ? 'text-slate-400' : 'text-slate-500';
    const inputCls = `w-full max-w-md rounded-xl border text-sm px-3 py-2.5 outline-none focus:ring-2 focus:ring-teal-500/50 transition-colors ${isDark ? 'bg-slate-800 border-slate-600 text-white placeholder-slate-500' : 'bg-white border-slate-300 text-slate-800 placeholder-slate-400'}`;

    // La API devuelve todo junto: hay que agrupar por producto_nombre
    const byProduct = {};
    precios.forEach(p => {
        if (!byProduct[p.producto_nombre]) {
            byProduct[p.producto_nombre] = [];
        }
        byProduct[p.producto_nombre].push(p);
    });

    const entries = Object.entries(byProduct).filter(([prodName, lista]) => {
        if (!searchQ) return true;
        return prodName.toLowerCase().includes(searchQ) || lista.some(l => l.proveedor_nombre.toLowerCase().includes(searchQ));
    });

    return (
        <div className="flex flex-col h-full absolute inset-0">
            <div className={`shrink-0 px-6 py-4 border-b ${borderC} flex justify-between items-center bg-transparent`}>
                <div className="relative w-full max-w-md">
                    <Search size={15} className={`absolute left-3 top-1/2 -translate-y-1/2 ${sub} pointer-events-none`} />
                    <input
                        type="text"
                        className={`${inputCls} pl-9`}
                        placeholder="Buscar por producto o proveedor..."
                        value={inputQ}
                        onChange={(e) => setInputQ(e.target.value)}
                    />
                </div>
                <button onClick={fetchPrecios} className={`p-2.5 rounded-xl border transition-colors ${isDark ? 'border-slate-700 text-slate-400 hover:bg-slate-800' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                    <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>

            <div className="flex-1 overflow-auto p-6">
                {loading ? (
                    <div className="flex justify-center py-20"><Loader2 size={32} className="animate-spin text-teal-500" /></div>
                ) : entries.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <Target size={40} className={sub} />
                        <p className={`text-sm font-medium ${sub}`}>No hay datos comparativos en el histórico de compras.</p>
                        <p className={`text-xs ${sub}`}>Estos datos se generan solos cuando confirmas la recepción de una Órden de Compra.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                        {entries.map(([prodName, proveedoresList], idx) => {
                            // proveedoresList ya viene ordenado por precio desde la API
                            const mejorOpcion = proveedoresList[0]; // El de menor precio
                            
                            return (
                                <div key={idx} className={`rounded-xl border ${borderC} ${bgCard} overflow-hidden flex flex-col`}>
                                    <div className={`p-4 border-b ${borderC} ${isDark ? 'bg-slate-900/40' : 'bg-slate-50'}`}>
                                        <h3 className={`font-bold text-lg ${txt}`}>{prodName}</h3>
                                        <p className={`text-[10px] uppercase font-bold tracking-wider mt-1 ${isDark ? 'text-teal-400' : 'text-teal-600'}`}>Mejor precio: {GTQ(mejorOpcion.precio_ofrecido)} ({mejorOpcion.proveedor_nombre})</p>
                                    </div>
                                    <div className="p-4 flex-1">
                                        <table className="w-full text-sm">
                                            <tbody>
                                                {proveedoresList.map((p, i) => (
                                                    <tr key={p.id} className={i !== proveedoresList.length -1 ? `border-b ${isDark ? 'border-slate-700/50' : 'border-slate-100'}` : ''}>
                                                        <td className={`py-3 ${i === 0 ? (isDark ? 'text-teal-400 font-bold' : 'text-teal-600 font-bold') : txt}`}>
                                                            {i === 0 && <span className="inline-block mr-2 px-1.5 py-0.5 rounded text-[9px] bg-teal-500 text-white">#1</span>}
                                                            {p.proveedor_nombre}
                                                        </td>
                                                        <td className={`py-3 text-right font-mono text-xs ${sub}`}>{fmtDate(p.fecha_actualizacion)}</td>
                                                        <td className={`py-3 text-right font-bold ${i === 0 ? (isDark ? 'text-teal-400' : 'text-teal-600') : txt}`}>
                                                            {GTQ(p.precio_ofrecido)}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
