import React, { useState, useEffect, useContext, useCallback } from 'react';
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
    TrendingUp, DollarSign, ShoppingCart, Wrench,
    Download, Printer, RefreshCw, Loader2, AlertCircle,
    ArrowUpDown, ChevronUp, ChevronDown, BarChart3, Package
} from 'lucide-react';

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n) => new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ', minimumFractionDigits: 2 }).format(n ?? 0);
const fmtNum = (n) => new Intl.NumberFormat('es-GT').format(n ?? 0);
const fmtPct = (n) => `${(n ?? 0).toFixed(1)}%`;

const margenColor = (pct) => {
    if (pct >= 50) return 'bg-emerald-500';
    if (pct >= 30) return 'bg-blue-500';
    if (pct >= 15) return 'bg-amber-400';
    return 'bg-red-500';
};

const margenBadge = (pct) => {
    if (pct >= 50) return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    if (pct >= 30) return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
    if (pct >= 15) return 'bg-amber-400/15 text-amber-400 border-amber-400/30';
    return 'bg-red-500/15 text-red-400 border-red-500/30';
};

// Exportar a CSV
function exportCSV(repuestos) {
    const headers = ['Código', 'Producto', 'Categoría', 'Cantidad', 'Precio Compra', 'Precio Venta Prom.', 'Costo Total', 'Ingreso Total', 'Ganancia', 'Margen %'];
    const rows = repuestos.map(r => [
        r.codigo, r.nombre, r.categoria, r.cantidad_total,
        r.precio_compra, r.precio_venta_promedio, r.costo_total,
        r.ingreso_total, r.ganancia, r.margen_pct
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'reporte_utilidades.csv'; a.click();
    URL.revokeObjectURL(url);
}

// ── Componentes ───────────────────────────────────────────────────────────────
function SummaryCard({ icon, label, value, sub, accent }) {
    const { isDark } = useTheme();
    return (
        <div className={`rounded-2xl border p-5 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
            <div className="flex items-center justify-between mb-3">
                <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{label}</span>
                <div className={`p-2 rounded-xl ${accent}`}>{icon}</div>
            </div>
            <div className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{value}</div>
            {sub && <div className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{sub}</div>}
        </div>
    );
}

export default function ReporteUtilidades() {
    const { authTokens } = useContext(AuthContext);
    const { isDark } = useTheme();

    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const toISO = (d) => d.toISOString().split('T')[0];

    const [fechaInicio, setFechaInicio] = useState(toISO(firstDay));
    const [fechaFin, setFechaFin] = useState(toISO(today));

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Ordenamiento tabla repuestos
    const [sortKey, setSortKey] = useState('ganancia');
    const [sortDir, setSortDir] = useState('desc');

    const headers = { Authorization: `Bearer ${authTokens?.access}` };

    const fetchReporte = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const params = new URLSearchParams({ fecha_inicio: fechaInicio, fecha_fin: fechaFin });
            const res = await axios.get(`http://localhost:8000/api/v1/taller/reportes/utilidades/?${params}`, { headers });
            setData(res.data);
        } catch (e) {
            setError(e.response?.data?.error || 'Error al cargar el reporte.');
        }
        setLoading(false);
    }, [fechaInicio, fechaFin]);

    useEffect(() => { fetchReporte(); }, []);

    const toggleSort = (key) => {
        if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortKey(key); setSortDir('desc'); }
    };

    const sortedRepuestos = data?.repuestos ? [...data.repuestos].sort((a, b) => {
        const v = sortDir === 'asc' ? 1 : -1;
        return a[sortKey] > b[sortKey] ? v : -v;
    }) : [];

    // ── Estilos ──
    const pageBg  = isDark ? 'bg-slate-900' : 'bg-slate-50';
    const cardBg  = isDark ? 'bg-slate-800' : 'bg-white';
    const border  = isDark ? 'border-slate-700' : 'border-slate-200';
    const textPri = isDark ? 'text-white' : 'text-slate-900';
    const subText = isDark ? 'text-slate-400' : 'text-slate-500';
    const inputCls = `px-3 py-2 rounded-xl border text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/30 transition-all ${
        isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-200 text-slate-900'
    }`;
    const SortIcon = ({ col }) => {
        if (sortKey !== col) return <ArrowUpDown size={13} className="opacity-40" />;
        return sortDir === 'asc' ? <ChevronUp size={13} /> : <ChevronDown size={13} />;
    };
    const thCls = `px-4 py-3 text-left text-xs font-bold uppercase tracking-wider cursor-pointer select-none whitespace-nowrap ${subText}`;

    return (
        <div className={`flex-1 w-full ${pageBg} min-h-full`}>
            <div className="max-w-7xl mx-auto p-6">

                {/* ── Header ── */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className={`text-2xl font-black flex items-center gap-3 ${textPri}`}>
                            <div className="p-2.5 bg-emerald-500/15 rounded-xl">
                                <TrendingUp size={22} className="text-emerald-500" />
                            </div>
                            Reporte de Utilidades
                        </h1>
                        <p className={`text-sm mt-1 ml-14 ${subText}`}>
                            Precio de compra vs. precio de venta — basado en facturas emitidas
                        </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        <button onClick={() => window.print()}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-semibold transition-colors no-print ${isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-300 text-slate-600 hover:bg-slate-100'}`}>
                            <Printer size={15} /> Imprimir
                        </button>
                        {data?.repuestos?.length > 0 && (
                            <button onClick={() => exportCSV(data.repuestos)}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition-colors no-print">
                                <Download size={15} /> Exportar CSV
                            </button>
                        )}
                    </div>
                </div>

                {/* ── Filtros ── */}
                <div className={`${cardBg} rounded-2xl border ${border} p-5 mb-6 no-print`}>
                    <div className="flex flex-wrap items-end gap-4">
                        <div>
                            <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${subText}`}>Desde</label>
                            <input type="date" className={inputCls} value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} />
                        </div>
                        <div>
                            <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${subText}`}>Hasta</label>
                            <input type="date" className={inputCls} value={fechaFin} onChange={e => setFechaFin(e.target.value)} />
                        </div>
                        <button onClick={fetchReporte} disabled={loading}
                            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition-colors disabled:opacity-60">
                            {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                            {loading ? 'Calculando...' : 'Aplicar Filtros'}
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="flex items-center gap-3 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 mb-6">
                        <AlertCircle size={18} className="shrink-0" />
                        <span className="text-sm font-semibold">{error}</span>
                    </div>
                )}

                {loading && !data && (
                    <div className="flex items-center justify-center py-24">
                        <Loader2 className="animate-spin text-blue-500" size={40} />
                    </div>
                )}

                {data && (
                    <>
                        {/* ── Cards de Resumen ── */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                            <SummaryCard
                                label="Ingresos Totales"
                                value={fmt(data.resumen.total_ingresos)}
                                sub={`${data.resumen.total_facturas} facturas emitidas`}
                                accent="bg-blue-500/15"
                                icon={<DollarSign size={18} className="text-blue-400" />}
                            />
                            <SummaryCard
                                label="Costo Repuestos"
                                value={fmt(data.resumen.total_costo_repuestos)}
                                sub={`Ingreso repuestos: ${fmt(data.resumen.total_ingreso_repuestos)}`}
                                accent="bg-orange-500/15"
                                icon={<ShoppingCart size={18} className="text-orange-400" />}
                            />
                            <SummaryCard
                                label="Mano de Obra"
                                value={fmt(data.resumen.total_mano_obra)}
                                sub="Suma de citas completadas"
                                accent="bg-purple-500/15"
                                icon={<Wrench size={18} className="text-purple-400" />}
                            />
                            <SummaryCard
                                label="Ganancia Bruta"
                                value={fmt(data.resumen.ganancia_bruta)}
                                sub={`Margen global: ${fmtPct(data.resumen.margen_global_pct)}`}
                                accent="bg-emerald-500/15"
                                icon={<TrendingUp size={18} className="text-emerald-400" />}
                            />
                        </div>

                        {/* ── Tabla de Repuestos ── */}
                        <div className={`${cardBg} rounded-2xl border ${border} mb-6 overflow-hidden`}>
                            <div className={`flex items-center gap-3 px-6 py-4 border-b ${border}`}>
                                <Package size={18} className="text-orange-400" />
                                <h2 className={`font-bold ${textPri}`}>Utilidad por Repuesto</h2>
                                <span className={`ml-auto text-xs px-2.5 py-1 rounded-full ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                                    {data.repuestos.length} productos
                                </span>
                            </div>

                            {data.repuestos.length === 0 ? (
                                <div className={`flex flex-col items-center justify-center py-16 ${subText}`}>
                                    <BarChart3 size={40} className="mb-3 opacity-30" />
                                    <p className="font-semibold">Sin datos de repuestos en este período</p>
                                    <p className="text-xs mt-1">Verifica que existan facturas emitidas con repuestos asignados</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className={isDark ? 'bg-slate-700/50' : 'bg-slate-50'}>
                                            <tr>
                                                <th className={thCls} onClick={() => toggleSort('nombre')}>
                                                    <span className="flex items-center gap-1">Producto <SortIcon col="nombre" /></span>
                                                </th>
                                                <th className={thCls}>Categoría</th>
                                                <th className={`${thCls} text-right`} onClick={() => toggleSort('cantidad_total')}>
                                                    <span className="flex items-center gap-1 justify-end">Cant. <SortIcon col="cantidad_total" /></span>
                                                </th>
                                                <th className={`${thCls} text-right`} onClick={() => toggleSort('precio_compra')}>
                                                    <span className="flex items-center gap-1 justify-end">P. Compra <SortIcon col="precio_compra" /></span>
                                                </th>
                                                <th className={`${thCls} text-right`} onClick={() => toggleSort('precio_venta_promedio')}>
                                                    <span className="flex items-center gap-1 justify-end">P. Venta <SortIcon col="precio_venta_promedio" /></span>
                                                </th>
                                                <th className={`${thCls} text-right`} onClick={() => toggleSort('costo_total')}>
                                                    <span className="flex items-center gap-1 justify-end">Costo Total <SortIcon col="costo_total" /></span>
                                                </th>
                                                <th className={`${thCls} text-right`} onClick={() => toggleSort('ingreso_total')}>
                                                    <span className="flex items-center gap-1 justify-end">Ingreso Total <SortIcon col="ingreso_total" /></span>
                                                </th>
                                                <th className={`${thCls} text-right`} onClick={() => toggleSort('ganancia')}>
                                                    <span className="flex items-center gap-1 justify-end">Ganancia <SortIcon col="ganancia" /></span>
                                                </th>
                                                <th className={`${thCls} text-right`} onClick={() => toggleSort('margen_pct')}>
                                                    <span className="flex items-center gap-1 justify-end">Margen <SortIcon col="margen_pct" /></span>
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-700/30">
                                            {sortedRepuestos.map((r, i) => (
                                                <tr key={r.producto_id} className={`transition-colors ${isDark ? 'hover:bg-slate-700/30' : 'hover:bg-slate-50'}`}>
                                                    <td className={`px-4 py-3 ${textPri}`}>
                                                        <div className="font-semibold">{r.nombre}</div>
                                                        <div className={`text-xs font-mono ${subText}`}>{r.codigo}</div>
                                                    </td>
                                                    <td className={`px-4 py-3 text-xs ${subText}`}>{r.categoria}</td>
                                                    <td className={`px-4 py-3 text-right font-mono ${textPri}`}>{fmtNum(r.cantidad_total)}</td>
                                                    <td className={`px-4 py-3 text-right font-mono text-orange-400`}>{fmt(r.precio_compra)}</td>
                                                    <td className={`px-4 py-3 text-right font-mono text-blue-400`}>{fmt(r.precio_venta_promedio)}</td>
                                                    <td className={`px-4 py-3 text-right font-mono ${subText}`}>{fmt(r.costo_total)}</td>
                                                    <td className={`px-4 py-3 text-right font-mono ${textPri}`}>{fmt(r.ingreso_total)}</td>
                                                    <td className={`px-4 py-3 text-right font-bold ${r.ganancia >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                        {fmt(r.ganancia)}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex flex-col items-end gap-1">
                                                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${margenBadge(r.margen_pct)}`}>
                                                                {fmtPct(r.margen_pct)}
                                                            </span>
                                                            <div className={`w-16 h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}>
                                                                <div className={`h-full rounded-full ${margenColor(r.margen_pct)}`} style={{ width: `${Math.min(r.margen_pct, 100)}%` }} />
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        {/* Totales fila */}
                                        <tfoot className={isDark ? 'bg-slate-700/60 border-t border-slate-600' : 'bg-slate-100 border-t border-slate-200'}>
                                            <tr>
                                                <td colSpan={5} className={`px-4 py-3 text-xs font-bold uppercase ${subText}`}>Totales</td>
                                                <td className={`px-4 py-3 text-right font-bold font-mono ${subText}`}>{fmt(data.resumen.total_costo_repuestos)}</td>
                                                <td className={`px-4 py-3 text-right font-bold font-mono ${textPri}`}>{fmt(data.resumen.total_ingreso_repuestos)}</td>
                                                <td className="px-4 py-3 text-right font-black font-mono text-emerald-400">
                                                    {fmt(data.resumen.total_ingreso_repuestos - data.resumen.total_costo_repuestos)}
                                                </td>
                                                <td />
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            )}
                        </div>

                        {/* ── Tabla de Servicios / Mano de Obra ── */}
                        <div className={`${cardBg} rounded-2xl border ${border} overflow-hidden`}>
                            <div className={`flex items-center gap-3 px-6 py-4 border-b ${border}`}>
                                <Wrench size={18} className="text-purple-400" />
                                <h2 className={`font-bold ${textPri}`}>Mano de Obra por Servicio</h2>
                            </div>
                            {data.servicios.length === 0 ? (
                                <div className={`flex items-center justify-center py-10 ${subText} text-sm`}>
                                    Sin datos de servicios en este período
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className={isDark ? 'bg-slate-700/50' : 'bg-slate-50'}>
                                            <tr>
                                                <th className={thCls}>Tipo de Servicio</th>
                                                <th className={`${thCls} text-right`}>Órdenes</th>
                                                <th className={`${thCls} text-right`}>Ingreso Mano de Obra</th>
                                                <th className={`${thCls} text-right`}>Promedio por Orden</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-700/30">
                                            {data.servicios.map((s, i) => (
                                                <tr key={i} className={isDark ? 'hover:bg-slate-700/30' : 'hover:bg-slate-50'}>
                                                    <td className={`px-4 py-3 font-semibold ${textPri}`}>{s.servicio}</td>
                                                    <td className={`px-4 py-3 text-right ${textPri}`}>{s.cantidad_ordenes}</td>
                                                    <td className="px-4 py-3 text-right font-bold text-purple-400">{fmt(s.ingreso_mano_obra)}</td>
                                                    <td className={`px-4 py-3 text-right ${subText}`}>{fmt(s.ingreso_mano_obra / s.cantidad_ordenes)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot className={isDark ? 'bg-slate-700/60 border-t border-slate-600' : 'bg-slate-100 border-t border-slate-200'}>
                                            <tr>
                                                <td colSpan={2} className={`px-4 py-3 text-xs font-bold uppercase ${subText}`}>Total Mano de Obra</td>
                                                <td className="px-4 py-3 text-right font-black text-purple-400">{fmt(data.resumen.total_mano_obra)}</td>
                                                <td />
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* Estilos de impresión */}
            <style>{`
                @media print {
                    .no-print { display: none !important; }
                    body { background: white !important; }
                }
            `}</style>
        </div>
    );
}
