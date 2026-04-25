import React, { useState, useEffect, useContext, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Building2, ArrowLeft, Loader2, AlertTriangle, FileText,
    Calendar, ShieldOff, Mail, RefreshCw, ChevronRight,
} from 'lucide-react';
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const GTQ = (v) => new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' }).format(Number(v ?? 0));
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('es-GT', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const BUCKET_CFG = {
    vigente: { label: 'Vigente', color: 'emerald', desc: 'Sin atraso' },
    '1-30':  { label: '1–30 días', color: 'amber', desc: 'Atraso temprano' },
    '31-60': { label: '31–60 días', color: 'orange', desc: 'Atraso medio' },
    '61-90': { label: '61–90 días', color: 'red', desc: 'Atraso prolongado' },
    '90+':   { label: '+90 días', color: 'rose', desc: 'Crítico' },
};

const PAGO_BADGE = {
    PENDIENTE: { txt: 'Pendiente', cls: 'bg-amber-500/15 text-amber-500 border-amber-500/30' },
    PARCIAL:   { txt: 'Parcial',   cls: 'bg-blue-500/15 text-blue-500 border-blue-500/30' },
    PAGADA:    { txt: 'Pagada',    cls: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30' },
    VENCIDA:   { txt: 'Vencida',   cls: 'bg-red-500/15 text-red-500 border-red-500/30' },
    NO_APLICA: { txt: 'Contado',   cls: 'bg-slate-500/15 text-slate-500 border-slate-500/30' },
};

export default function EmpresaEstadoCuentaPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { authTokens } = useContext(AuthContext);
    const { isDark } = useTheme();

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
            const res = await axios.get(`http://localhost:8000/api/v1/facturacion/empresas/${id}/estado-cuenta/`, { headers });
            setData(res.data);
        } catch (err) {
            setError(err.response?.data?.error || err.message || 'No se pudo cargar el estado de cuenta.');
        }
        setLoading(false);
    };

    useEffect(() => { fetch(); /* eslint-disable-next-line */ }, [id]);

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

    if (error) {
        return (
            <div className={`min-h-full p-8 ${pageBg}`}>
                <div className={`max-w-2xl mx-auto p-5 rounded-xl border ${isDark ? 'bg-red-900/30 border-red-700 text-red-200' : 'bg-red-50 border-red-200 text-red-800'}`}>
                    <div className="flex items-start gap-2">
                        <AlertTriangle size={18} className="mt-0.5" />
                        <div>
                            <p className="font-bold mb-1">No se pudo cargar el estado de cuenta</p>
                            <p className="text-sm opacity-90">{error}</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const empresa = data.empresa;
    const aging = data.aging;

    return (
        <div className={`min-h-full ${pageBg}`}>
            {/* Header */}
            <div className={`px-6 py-5 border-b ${borderC} ${isDark ? 'bg-slate-900' : 'bg-white'} flex items-center justify-between gap-4`}>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate('/finanzas/empresas')}
                        className={`p-2 rounded-lg transition-colors ${isDark ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-100'}`}
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <div className={`p-2.5 rounded-xl ${isDark ? 'bg-indigo-500/15' : 'bg-indigo-100'}`}>
                        <Building2 size={21} className="text-indigo-500" />
                    </div>
                    <div>
                        <h1 className={`text-xl font-extrabold tracking-tight ${txt}`}>{empresa.razon_social}</h1>
                        <p className={`text-xs ${sub}`}>NIT {empresa.nit} · Corte al {fmtDate(data.fecha_corte)}</p>
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

                {/* Alerts */}
                {(empresa.tiene_vencimientos || empresa.excede_limite || !empresa.activo) && (
                    <div className={`p-4 rounded-xl border ${isDark ? 'bg-red-500/10 border-red-500/40 text-red-300' : 'bg-red-50 border-red-200 text-red-800'}`}>
                        <div className="flex items-start gap-2.5">
                            <AlertTriangle size={18} className="mt-0.5 shrink-0" />
                            <div className="text-sm">
                                <p className="font-bold mb-1">Empresa bloqueada para nuevo crédito</p>
                                <ul className="list-disc list-inside space-y-0.5">
                                    {empresa.tiene_vencimientos && <li>Tiene factura(s) vencida(s) sin pagar.</li>}
                                    {empresa.excede_limite && <li>Excede su límite de crédito ({GTQ(empresa.limite_credito)}).</li>}
                                    {!empresa.activo && <li>Empresa marcada como inactiva.</li>}
                                </ul>
                            </div>
                        </div>
                    </div>
                )}

                {/* Resumen */}
                <div className={`grid grid-cols-2 md:grid-cols-4 gap-3`}>
                    <div className={`rounded-2xl border p-4 ${cardBg} ${borderC}`}>
                        <p className={`text-xs font-bold uppercase tracking-wide ${sub}`}>Saldo Pendiente</p>
                        <p className="text-2xl font-black mt-1 text-amber-500 tabular-nums">{GTQ(data.total_pendiente)}</p>
                    </div>
                    <div className={`rounded-2xl border p-4 ${cardBg} ${borderC}`}>
                        <p className={`text-xs font-bold uppercase tracking-wide ${sub}`}>Pagado Histórico</p>
                        <p className={`text-2xl font-black mt-1 text-emerald-500 tabular-nums`}>{GTQ(data.total_pagado_historico)}</p>
                    </div>
                    <div className={`rounded-2xl border p-4 ${cardBg} ${borderC}`}>
                        <p className={`text-xs font-bold uppercase tracking-wide ${sub}`}>Plazo</p>
                        <p className={`text-2xl font-black mt-1 ${txt}`}>{empresa.dias_credito} días</p>
                    </div>
                    <div className={`rounded-2xl border p-4 ${cardBg} ${borderC}`}>
                        <p className={`text-xs font-bold uppercase tracking-wide ${sub}`}>Límite Crédito</p>
                        <p className={`text-2xl font-black mt-1 ${txt}`}>
                            {Number(empresa.limite_credito) > 0 ? GTQ(empresa.limite_credito) : 'Sin límite'}
                        </p>
                    </div>
                </div>

                {/* Aging buckets */}
                <div className={`rounded-2xl border ${cardBg} ${borderC} overflow-hidden`}>
                    <div className={`px-5 py-3 border-b ${borderC}`}>
                        <h2 className={`text-sm font-extrabold uppercase tracking-wider ${txt}`}>Aging — Por antigüedad</h2>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-5 divide-x divide-slate-200 dark:divide-slate-700">
                        {Object.entries(BUCKET_CFG).map(([key, cfg]) => {
                            const b = aging[key] || { count: 0, monto: '0' };
                            return (
                                <div key={key} className={`p-4 text-center`}>
                                    <p className={`text-[10px] uppercase font-bold tracking-wider ${sub}`}>{cfg.label}</p>
                                    <p className={`text-2xl font-black tabular-nums mt-1 text-${cfg.color}-500`}>{GTQ(b.monto)}</p>
                                    <p className={`text-[11px] mt-0.5 ${sub}`}>{b.count} factura(s)</p>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Facturas pendientes por bucket */}
                {Object.entries(BUCKET_CFG).map(([key, cfg]) => {
                    const bucket = aging[key];
                    if (!bucket || bucket.facturas.length === 0) return null;
                    return (
                        <div key={key} className={`rounded-2xl border ${cardBg} ${borderC} overflow-hidden`}>
                            <div className={`px-5 py-3 border-b ${borderC} flex items-center justify-between`}>
                                <h3 className={`text-sm font-bold ${txt}`}>
                                    <span className={`text-${cfg.color}-500`}>{cfg.label}</span> · {cfg.desc}
                                </h3>
                                <span className={`text-sm font-bold tabular-nums text-${cfg.color}-500`}>{GTQ(bucket.monto)}</span>
                            </div>
                            <FacturasTable facturas={bucket.facturas} isDark={isDark} navigate={navigate} txt={txt} sub={sub} borderC={borderC} />
                        </div>
                    );
                })}

                {/* Facturas pagadas */}
                {aging.pagadas?.facturas?.length > 0 && (
                    <div className={`rounded-2xl border ${cardBg} ${borderC} overflow-hidden`}>
                        <div className={`px-5 py-3 border-b ${borderC} flex items-center justify-between`}>
                            <h3 className={`text-sm font-bold ${txt}`}>
                                <span className="text-emerald-500">Pagadas</span> · Facturas saldadas
                            </h3>
                            <span className={`text-sm font-bold tabular-nums text-emerald-500`}>{GTQ(aging.pagadas.monto)}</span>
                        </div>
                        <FacturasTable facturas={aging.pagadas.facturas} isDark={isDark} navigate={navigate} txt={txt} sub={sub} borderC={borderC} />
                    </div>
                )}

                {/* Empty state */}
                {data.total_pendiente === '0.00' && aging.pagadas?.count === 0 && (
                    <div className={`rounded-2xl border ${cardBg} ${borderC} p-10 text-center`}>
                        <FileText size={40} className={`mx-auto opacity-30 mb-3 ${sub}`} />
                        <p className={`font-semibold ${txt}`}>Esta empresa aún no tiene facturas a crédito.</p>
                        <p className={`text-sm mt-1 ${sub}`}>Asigna una factura existente desde la página de la factura → "Asignar a Crédito".</p>
                    </div>
                )}
            </div>
        </div>
    );
}

function FacturasTable({ facturas, isDark, navigate, txt, sub, borderC }) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead className={isDark ? 'bg-slate-900/60' : 'bg-slate-50'}>
                    <tr className={`text-[11px] uppercase font-bold ${sub}`}>
                        <th className="text-left px-4 py-2.5">Factura</th>
                        <th className="text-left px-4 py-2.5 hidden md:table-cell">Emitida</th>
                        <th className="text-left px-4 py-2.5">Vence</th>
                        <th className="text-right px-4 py-2.5">Total</th>
                        <th className="text-right px-4 py-2.5">Pagado</th>
                        <th className="text-right px-4 py-2.5">Saldo</th>
                        <th className="text-center px-4 py-2.5">Atraso</th>
                        <th className="text-center px-4 py-2.5">Estado</th>
                        <th className="px-2 py-2.5"></th>
                    </tr>
                </thead>
                <tbody>
                    {facturas.map(f => {
                        const badge = PAGO_BADGE[f.pago_estado] || PAGO_BADGE.PENDIENTE;
                        return (
                            <tr key={f.id} className={`border-t ${borderC} hover:bg-slate-500/5 cursor-pointer`} onClick={() => navigate(`/facturacion/${f.id}/imprimir`)}>
                                <td className={`px-4 py-3 font-mono font-bold ${txt}`}>{f.numero_factura || `BORR-${f.id}`}</td>
                                <td className={`px-4 py-3 hidden md:table-cell ${sub}`}>{fmtDate(f.fecha_emision)}</td>
                                <td className={`px-4 py-3 ${sub}`}>{fmtDate(f.fecha_vencimiento)}</td>
                                <td className={`px-4 py-3 text-right tabular-nums ${txt}`}>{GTQ(f.total_general)}</td>
                                <td className={`px-4 py-3 text-right tabular-nums text-emerald-500`}>{GTQ(f.total_pagado)}</td>
                                <td className={`px-4 py-3 text-right tabular-nums font-bold text-amber-500`}>{GTQ(f.saldo_pendiente)}</td>
                                <td className={`px-4 py-3 text-center text-xs font-bold ${f.dias_atraso > 0 ? 'text-red-500' : sub}`}>
                                    {f.dias_atraso > 0 ? `+${f.dias_atraso}d` : '—'}
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <span className={`inline-flex px-2 py-0.5 text-[10px] font-bold uppercase rounded-full border ${badge.cls}`}>
                                        {badge.txt}
                                    </span>
                                </td>
                                <td className="px-2 py-3 text-right text-slate-400"><ChevronRight size={14} /></td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
