import React, { useState, useEffect, useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    TrendingUp, AlertTriangle, RefreshCw, Building2, Loader2,
    ChevronRight, BarChart3,
} from 'lucide-react';
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const GTQ = (v) => new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' }).format(Number(v ?? 0));
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('es-GT', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const BUCKETS = [
    { key: 'vigente', label: 'Vigente', color: 'emerald' },
    { key: '1-30',    label: '1–30 días', color: 'amber' },
    { key: '31-60',   label: '31–60 días', color: 'orange' },
    { key: '61-90',   label: '61–90 días', color: 'red' },
    { key: '90+',     label: '+90 días', color: 'rose' },
];

export default function CuentasPorCobrarPage() {
    const { authTokens } = useContext(AuthContext);
    const { isDark } = useTheme();
    const navigate = useNavigate();

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const headers = useMemo(
        () => ({ Authorization: `Bearer ${authTokens?.access}` }),
        [authTokens]
    );

    const fetch = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await axios.get('/api/v1/facturacion/reportes/cuentas-por-cobrar/', { headers });
            setData(res.data);
        } catch (err) {
            setError(err.response?.data?.error || err.message || 'No se pudo cargar el reporte.');
        }
        setLoading(false);
    };

    useEffect(() => { fetch(); /* eslint-disable-next-line */ }, []);

    const pageBg = isDark ? 'bg-[#0a0f1e]' : 'bg-slate-100';
    const cardBg = isDark ? 'bg-slate-800/70' : 'bg-white';
    const borderC = isDark ? 'border-slate-700' : 'border-slate-200';
    const txt = isDark ? 'text-slate-100' : 'text-slate-900';
    const sub = isDark ? 'text-slate-400' : 'text-slate-500';

    if (loading) {
        return (
            <div className={`min-h-full flex items-center justify-center ${pageBg}`}>
                <Loader2 size={28} className={`animate-spin ${sub}`} />
            </div>
        );
    }
    if (error || !data) {
        return (
            <div className={`min-h-full p-8 ${pageBg}`}>
                <div className={`max-w-2xl mx-auto p-5 rounded-xl border ${isDark ? 'bg-red-900/30 border-red-700 text-red-200' : 'bg-red-50 border-red-200 text-red-800'}`}>
                    <div className="flex items-start gap-2"><AlertTriangle size={18} className="mt-0.5" /><span>{error || 'Sin datos.'}</span></div>
                </div>
            </div>
        );
    }

    const totalGlobal = Number(data.total_pendiente || 0);
    const aging = data.aging;

    return (
        <div className={`min-h-full ${pageBg}`}>
            {/* Header */}
            <div className={`px-6 py-5 border-b ${borderC} ${isDark ? 'bg-slate-900' : 'bg-white'} flex items-center justify-between gap-4`}>
                <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${isDark ? 'bg-amber-500/15' : 'bg-amber-100'}`}>
                        <BarChart3 size={21} className="text-amber-500" />
                    </div>
                    <div>
                        <h1 className={`text-xl font-extrabold tracking-tight ${txt}`}>Cuentas por Cobrar</h1>
                        <p className={`text-xs ${sub}`}>Resumen global · Corte al {fmtDate(data.fecha_corte)}</p>
                    </div>
                </div>
                <button
                    onClick={fetch}
                    className={`flex items-center gap-2 text-sm font-semibold px-3 py-2 rounded-xl transition-all border ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-600' : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200'}`}
                >
                    <RefreshCw size={14} /> Actualizar
                </button>
            </div>

            <div className="px-6 py-5 space-y-5 max-w-7xl mx-auto">

                {/* Totales por bucket */}
                <div className={`rounded-2xl border ${cardBg} ${borderC} overflow-hidden`}>
                    <div className={`px-5 py-3 border-b ${borderC} flex items-center justify-between`}>
                        <h2 className={`text-sm font-extrabold uppercase tracking-wider ${txt}`}>Aging Global</h2>
                        <span className={`text-xs ${sub}`}>Total: <span className="font-bold text-amber-500">{GTQ(totalGlobal)}</span></span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-5 divide-x divide-y md:divide-y-0 divide-slate-200 dark:divide-slate-700">
                        {BUCKETS.map(b => {
                            const v = aging[b.key] || { count: 0, monto: '0' };
                            const monto = Number(v.monto);
                            const pct = totalGlobal > 0 ? (monto / totalGlobal) * 100 : 0;
                            return (
                                <div key={b.key} className="p-4 text-center">
                                    <p className={`text-[10px] uppercase font-bold tracking-wider ${sub}`}>{b.label}</p>
                                    <p className={`text-2xl font-black tabular-nums mt-1 text-${b.color}-500`}>{GTQ(monto)}</p>
                                    <p className={`text-[11px] mt-0.5 ${sub}`}>{v.count} factura(s) · {pct.toFixed(0)}%</p>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Top empresas */}
                <div className={`rounded-2xl border ${cardBg} ${borderC} overflow-hidden`}>
                    <div className={`px-5 py-3 border-b ${borderC}`}>
                        <h2 className={`text-sm font-extrabold uppercase tracking-wider ${txt}`}>Top Empresas con mayor saldo</h2>
                    </div>
                    {data.top_empresas_saldo.length === 0 ? (
                        <div className={`p-6 text-center text-sm ${sub}`}>No hay saldos pendientes en este momento.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className={isDark ? 'bg-slate-900/60' : 'bg-slate-50'}>
                                    <tr className={`text-[11px] uppercase font-bold ${sub}`}>
                                        <th className="text-left px-4 py-2.5">Empresa</th>
                                        <th className="text-left px-4 py-2.5">NIT</th>
                                        <th className="text-right px-4 py-2.5">Saldo</th>
                                        <th className="text-center px-4 py-2.5">Facturas</th>
                                        <th className="text-center px-4 py-2.5">Días Máx Atraso</th>
                                        <th className="text-center px-4 py-2.5">Estado</th>
                                        <th className="px-2 py-2.5"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.top_empresas_saldo.map(e => (
                                        <tr key={e.id} onClick={() => navigate(`/finanzas/empresas/${e.id}/estado-cuenta`)}
                                            className={`border-t ${borderC} cursor-pointer hover:bg-slate-500/5`}>
                                            <td className={`px-4 py-3 font-bold ${txt}`}>
                                                <div className="flex items-center gap-2">
                                                    <Building2 size={14} className="text-indigo-500" />
                                                    {e.razon_social}
                                                </div>
                                            </td>
                                            <td className={`px-4 py-3 font-mono ${sub}`}>{e.nit}</td>
                                            <td className={`px-4 py-3 text-right tabular-nums font-extrabold text-amber-500`}>{GTQ(e.saldo)}</td>
                                            <td className={`px-4 py-3 text-center ${sub}`}>{e.facturas_count}</td>
                                            <td className={`px-4 py-3 text-center text-xs font-bold ${e.dias_max_atraso > 0 ? 'text-red-500' : sub}`}>
                                                {e.dias_max_atraso > 0 ? `+${e.dias_max_atraso}d` : 'Vigente'}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {e.tiene_vencimientos ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-red-500/15 text-red-500 border border-red-500/30">
                                                        <AlertTriangle size={10} /> Vencida
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                                                        Al día
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-2 py-3 text-right text-slate-400"><ChevronRight size={14} /></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Empresas con vencimientos */}
                {data.empresas_con_vencimientos.length > 0 && (
                    <div className={`rounded-2xl border ${cardBg} ${borderC} overflow-hidden`}>
                        <div className={`px-5 py-3 border-b ${borderC} bg-red-500/5`}>
                            <h2 className={`text-sm font-extrabold uppercase tracking-wider text-red-500 flex items-center gap-2`}>
                                <AlertTriangle size={14} /> Empresas con Vencimientos · {data.empresas_con_vencimientos.length}
                            </h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className={isDark ? 'bg-slate-900/60' : 'bg-slate-50'}>
                                    <tr className={`text-[11px] uppercase font-bold ${sub}`}>
                                        <th className="text-left px-4 py-2.5">Empresa</th>
                                        <th className="text-right px-4 py-2.5">Saldo Vencido</th>
                                        <th className="text-center px-4 py-2.5">Atraso Máx.</th>
                                        <th className="text-center px-4 py-2.5">Facturas</th>
                                        <th className="px-2 py-2.5"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.empresas_con_vencimientos.map(e => (
                                        <tr key={e.id} onClick={() => navigate(`/finanzas/empresas/${e.id}/estado-cuenta`)}
                                            className={`border-t ${borderC} cursor-pointer hover:bg-slate-500/5`}>
                                            <td className={`px-4 py-3 font-bold ${txt}`}>{e.razon_social}<span className={`ml-2 font-mono text-xs ${sub}`}>NIT {e.nit}</span></td>
                                            <td className={`px-4 py-3 text-right tabular-nums font-extrabold text-red-500`}>{GTQ(e.saldo)}</td>
                                            <td className={`px-4 py-3 text-center font-bold text-red-500`}>+{e.dias_max_atraso}d</td>
                                            <td className={`px-4 py-3 text-center ${sub}`}>{e.facturas_count}</td>
                                            <td className="px-2 py-3 text-right text-slate-400"><ChevronRight size={14} /></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
