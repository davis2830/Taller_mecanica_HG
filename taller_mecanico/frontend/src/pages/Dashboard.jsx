import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import {
    Wrench, CheckCircle2, DollarSign, ShoppingCart, Clock, Calendar,
    Package, AlertTriangle, RefreshCw, Loader2, TrendingUp, TrendingDown,
    ChevronRight, BarChart2, Truck, Activity, CreditCard
} from 'lucide-react';

const API = '/api/v1/taller/dashboard/';

const fmtQ = (v) =>
    new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ', maximumFractionDigits: 2 }).format(v || 0);

const ESTADO_COLOR = {
    PENDIENTE:   'bg-amber-400',
    CONFIRMADA:  'bg-blue-500',
    LISTO:       'bg-emerald-500',
};

const PIPELINE_COLORS = [
    { bg: 'bg-slate-500',    text: 'text-slate-400',   bar: 'bg-slate-500' },
    { bg: 'bg-blue-600',     text: 'text-blue-400',    bar: 'bg-blue-500' },
    { bg: 'bg-violet-600',   text: 'text-violet-400',  bar: 'bg-violet-500' },
    { bg: 'bg-amber-600',    text: 'text-amber-400',   bar: 'bg-amber-500' },
    { bg: 'bg-emerald-600',  text: 'text-emerald-400', bar: 'bg-emerald-500' },
];

/* ── Skeleton ─────────────────────────────────────────── */
function SkeletonCard() {
    return (
        <div className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-5 animate-pulse">
            <div className="h-3 w-24 bg-slate-700 rounded-full mb-4" />
            <div className="h-8 w-16 bg-slate-700 rounded-xl mb-2" />
            <div className="h-3 w-32 bg-slate-700/60 rounded-full" />
        </div>
    );
}

/* ── KPI Card ─────────────────────────────────────────── */
function KpiCard({ icon, label, value, sub, accent, isDark, onClick }) {
    const accents = {
        blue:    { icon: isDark ? 'bg-blue-500/15 text-blue-400'     : 'bg-blue-50 text-blue-600',     border: isDark ? 'border-blue-500/20'    : 'border-blue-100' },
        emerald: { icon: isDark ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-50 text-emerald-600', border: isDark ? 'border-emerald-500/20' : 'border-emerald-100' },
        violet:  { icon: isDark ? 'bg-violet-500/15 text-violet-400' : 'bg-violet-50 text-violet-600', border: isDark ? 'border-violet-500/20'  : 'border-violet-100' },
        amber:   { icon: isDark ? 'bg-amber-500/15 text-amber-400'   : 'bg-amber-50 text-amber-600',   border: isDark ? 'border-amber-500/20'   : 'border-amber-100'  },
        rose:    { icon: isDark ? 'bg-rose-500/15 text-rose-400'     : 'bg-rose-50 text-rose-600',     border: isDark ? 'border-rose-500/20'    : 'border-rose-100'   },
        slate:   { icon: isDark ? 'bg-slate-500/15 text-slate-400'   : 'bg-slate-100 text-slate-600',  border: isDark ? 'border-slate-600'      : 'border-slate-200'  },
    };
    const a = accents[accent] || accents.slate;
    return (
        <div
            onClick={onClick}
            className={`rounded-2xl border ${a.border} p-5 flex flex-col gap-3 transition-all ${
                isDark ? 'bg-slate-800/60' : 'bg-white'
            } ${onClick ? 'cursor-pointer hover:scale-[1.02] hover:shadow-lg' : ''} shadow-sm`}
        >
            <div className="flex items-center justify-between">
                <div className={`p-2.5 rounded-xl ${a.icon}`}>{icon}</div>
                {onClick && <ChevronRight size={15} className={isDark ? 'text-slate-600' : 'text-slate-300'} />}
            </div>
            <div>
                <p className={`text-2xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>{value}</p>
                <p className={`text-[11px] font-bold uppercase tracking-widest mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{label}</p>
                {sub && <p className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{sub}</p>}
            </div>
        </div>
    );
}

/* ── Section wrapper ──────────────────────────────────── */
function Panel({ title, icon, extra, children, isDark }) {
    return (
        <div className={`rounded-2xl border shadow-sm overflow-hidden ${isDark ? 'bg-slate-800/60 border-slate-700/50' : 'bg-white border-slate-200'}`}>
            <div className={`flex items-center justify-between px-5 py-4 border-b ${isDark ? 'border-slate-700/50' : 'border-slate-100'}`}>
                <div className="flex items-center gap-2.5">
                    <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>{icon}</span>
                    <h2 className={`text-sm font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{title}</h2>
                </div>
                {extra}
            </div>
            <div className="p-5">{children}</div>
        </div>
    );
}

/* ── Main Dashboard ───────────────────────────────────── */
export default function Dashboard() {
    const { isDark } = useTheme();
    const { authTokens } = useContext(AuthContext);
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [lastUpdate, setLastUpdate] = useState(null);

    const headers = { Authorization: `Bearer ${authTokens?.access}` };

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axios.get(API, { headers });
            setData(res.data);
            setLastUpdate(new Date());
        } catch (e) {
            console.error('Dashboard error', e);
        } finally {
            setLoading(false);
        }
    }, [authTokens]);

    useEffect(() => {
        fetchData();
        // Auto-refresh cada 60 segundos
        const timer = setInterval(fetchData, 60_000);
        return () => clearInterval(timer);
    }, [fetchData]);

    const bg  = isDark ? 'bg-slate-900'   : 'bg-slate-50';
    const sub = isDark ? 'text-slate-400' : 'text-slate-500';
    const txt = isDark ? 'text-white'     : 'text-slate-900';

    const kpis = data?.kpis || {};
    const pipeline = data?.pipeline || [];
    const pipelineMax = Math.max(...pipeline.map(p => p.total), 1);

    return (
        <div className={`flex flex-col h-full ${bg} overflow-auto`}>
            {/* ── Header ─────────────────────────────────────── */}
            <div className={`shrink-0 px-6 py-5 border-b flex items-center justify-between ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                <div>
                    <h1 className={`text-xl font-black ${txt}`}>Centro de Operaciones</h1>
                    <p className={`text-xs ${sub}`}>
                        {lastUpdate
                            ? `Actualizado ${lastUpdate.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' })} · Auto-refresh 60s`
                            : 'Cargando datos…'}
                    </p>
                </div>
                <button
                    onClick={fetchData}
                    disabled={loading}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-semibold transition-all ${
                        isDark
                            ? 'border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-white'
                            : 'border-slate-200 text-slate-500 hover:bg-slate-100'
                    }`}
                >
                    <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
                    Actualizar
                </button>
            </div>

            {/* ── Contenido ──────────────────────────────────── */}
            <div className="flex-1 p-6 space-y-6">

                {/* ── ROW 1: KPI Cards ─────────────────────── */}
                {loading && !data ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                        {Array.from({length: 5}).map((_,i) => <SkeletonCard key={i} />)}
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                        <KpiCard
                            icon={<Wrench size={20} />}
                            label="Activas en Taller"
                            value={kpis.ordenes_activas ?? '—'}
                            sub={`${kpis.listos_entrega ?? 0} lista${kpis.listos_entrega !== 1 ? 's' : ''} para entrega`}
                            accent="blue"
                            isDark={isDark}
                            onClick={() => navigate('/kanban')}
                        />
                        <KpiCard
                            icon={<CheckCircle2 size={20} />}
                            label="Listos para Entrega"
                            value={kpis.listos_entrega ?? '—'}
                            sub="Esperando al cliente"
                            accent="emerald"
                            isDark={isDark}
                            onClick={() => navigate('/kanban')}
                        />
                        <KpiCard
                            icon={<DollarSign size={20} />}
                            label="Ingresos del Mes"
                            value={fmtQ(kpis.ingresos_mes)}
                            sub={`Facturas emitidas · ${data?.meta?.mes ?? ''}`}
                            accent="violet"
                            isDark={isDark}
                            onClick={() => navigate('/facturacion')}
                        />
                        <KpiCard
                            icon={<Clock size={20} />}
                            label="Promedio en Taller"
                            value={`${kpis.promedio_dias ?? 0}d`}
                            sub="Días promedio por OT activa"
                            accent={kpis.promedio_dias > 5 ? 'amber' : 'slate'}
                            isDark={isDark}
                        />
                        <KpiCard
                            icon={<Calendar size={20} />}
                            label="Citas Hoy"
                            value={kpis.citas_hoy_count ?? '—'}
                            sub="Pendientes y confirmadas"
                            accent="amber"
                            isDark={isDark}
                            onClick={() => navigate('/citas/calendario')}
                        />
                    </div>
                )}

                {/* ── ROW 2: Pipeline + Citas de hoy ───────── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                    {/* Pipeline OT */}
                    <Panel
                        title="Pipeline del Taller"
                        icon={<Activity size={16} />}
                        isDark={isDark}
                        extra={
                            <button
                                onClick={() => navigate('/kanban')}
                                className={`text-xs font-semibold flex items-center gap-1 transition-colors ${isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}
                            >
                                Ver Kanban <ChevronRight size={13} />
                            </button>
                        }
                    >
                        {loading && !data ? (
                            <div className="space-y-3">
                                {Array.from({length: 5}).map((_,i) => (
                                    <div key={i} className="h-10 rounded-xl bg-slate-700/30 animate-pulse" />
                                ))}
                            </div>
                        ) : pipeline.length === 0 ? (
                            <p className={`text-sm text-center py-6 ${sub}`}>No hay órdenes activas</p>
                        ) : (
                            <div className="space-y-3">
                                {pipeline.map((p, idx) => {
                                    const col = PIPELINE_COLORS[idx] || PIPELINE_COLORS[0];
                                    const pct = Math.max((p.total / pipelineMax) * 100, p.total > 0 ? 8 : 0);
                                    return (
                                        <div key={p.estado}>
                                            <div className="flex items-center justify-between mb-1">
                                                <span className={`text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{p.label}</span>
                                                <span className={`text-xs font-black tabular-nums ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{p.total}</span>
                                            </div>
                                            <div className={`w-full h-2 rounded-full ${isDark ? 'bg-slate-700/50' : 'bg-slate-100'} overflow-hidden`}>
                                                <div
                                                    className={`h-full rounded-full ${col.bar} transition-all duration-700`}
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                                <div className={`mt-4 pt-4 border-t flex justify-between text-xs ${isDark ? 'border-slate-700/50 text-slate-400' : 'border-slate-100 text-slate-500'}`}>
                                    <span>Total activas: <strong className={txt}>{kpis.ordenes_activas + kpis.listos_entrega}</strong></span>
                                    <span>Listos: <strong className="text-emerald-400">{kpis.listos_entrega}</strong></span>
                                </div>
                            </div>
                        )}
                    </Panel>

                    {/* Citas de Hoy */}
                    <Panel
                        title={`Citas de Hoy`}
                        icon={<Calendar size={16} />}
                        isDark={isDark}
                        extra={
                            <button
                                onClick={() => navigate('/citas/calendario')}
                                className={`text-xs font-semibold flex items-center gap-1 transition-colors ${isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}
                            >
                                Ver calendario <ChevronRight size={13} />
                            </button>
                        }
                    >
                        {loading && !data ? (
                            <div className="space-y-3">
                                {Array.from({length: 3}).map((_,i) => (
                                    <div key={i} className="h-14 rounded-xl bg-slate-700/30 animate-pulse" />
                                ))}
                            </div>
                        ) : (data?.citas_hoy || []).length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-8 gap-2">
                                <Calendar size={28} className={sub} />
                                <p className={`text-sm ${sub}`}>No hay citas programadas para hoy</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {(data?.citas_hoy || []).map(c => (
                                    <div
                                        key={c.id}
                                        className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${isDark ? 'bg-slate-700/30 hover:bg-slate-700/60' : 'bg-slate-50 hover:bg-slate-100'}`}
                                    >
                                        {/* Hora */}
                                        <div className={`text-xs font-black tabular-nums w-10 shrink-0 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                            {c.hora}
                                        </div>
                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-xs font-bold truncate ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{c.cliente}</p>
                                            <p className={`text-[11px] truncate ${sub}`}>{c.vehiculo} · {c.servicio}</p>
                                        </div>
                                        {/* Estado badge */}
                                        <span className={`shrink-0 w-2 h-2 rounded-full ${ESTADO_COLOR[c.estado] || 'bg-slate-500'}`} />
                                    </div>
                                ))}
                            </div>
                        )}
                    </Panel>
                </div>

                {/* ── ROW 3: Stock bajo + Balance financiero ── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                    {/* Alertas de Stock */}
                    <Panel
                        title={`Alertas de Stock${kpis.alertas_stock > 0 ? ` (${kpis.alertas_stock})` : ''}`}
                        icon={<AlertTriangle size={16} className={kpis.alertas_stock > 0 ? 'text-amber-400' : ''} />}
                        isDark={isDark}
                        extra={
                            <button
                                onClick={() => navigate('/inventario/productos')}
                                className={`text-xs font-semibold flex items-center gap-1 transition-colors ${isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}
                            >
                                Ver inventario <ChevronRight size={13} />
                            </button>
                        }
                    >
                        {loading && !data ? (
                            <div className="space-y-2">
                                {Array.from({length: 4}).map((_,i) => (
                                    <div key={i} className="h-10 rounded-xl bg-slate-700/30 animate-pulse" />
                                ))}
                            </div>
                        ) : (data?.stock_bajo || []).length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-8 gap-2">
                                <Package size={28} className="text-emerald-400" />
                                <p className={`text-sm ${sub}`}>Stock en niveles óptimos ✓</p>
                            </div>
                        ) : (
                            <div className="space-y-2.5">
                                {(data?.stock_bajo || []).map(p => (
                                    <div key={p.codigo}>
                                        <div className="flex items-center justify-between mb-1">
                                            <span className={`text-xs font-semibold truncate max-w-[200px] ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{p.nombre}</span>
                                            <span className={`text-[11px] font-black tabular-nums ${p.stock_actual === 0 ? 'text-rose-400' : 'text-amber-400'}`}>
                                                {p.stock_actual}/{p.stock_minimo} {p.unidad}
                                            </span>
                                        </div>
                                        <div className={`w-full h-1.5 rounded-full ${isDark ? 'bg-slate-700' : 'bg-slate-100'} overflow-hidden`}>
                                            <div
                                                className={`h-full rounded-full transition-all duration-700 ${
                                                    p.stock_actual === 0 ? 'bg-rose-500' : p.pct < 50 ? 'bg-amber-500' : 'bg-yellow-400'
                                                }`}
                                                style={{ width: `${Math.min(p.pct, 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                                {kpis.alertas_stock > (data?.stock_bajo || []).length && (
                                    <p className={`text-xs text-center pt-2 ${sub}`}>
                                        +{kpis.alertas_stock - (data?.stock_bajo || []).length} más con stock bajo
                                    </p>
                                )}
                            </div>
                        )}
                    </Panel>

                    {/* Balance Financiero */}
                    <Panel
                        title="Balance Financiero"
                        icon={<CreditCard size={16} />}
                        isDark={isDark}
                    >
                        {loading && !data ? (
                            <div className="space-y-3">
                                {Array.from({length: 4}).map((_,i) => (
                                    <div key={i} className="h-12 rounded-xl bg-slate-700/30 animate-pulse" />
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {/* Ingresos del mes */}
                                <div className={`flex items-center justify-between p-3 rounded-xl ${isDark ? 'bg-emerald-900/20 border border-emerald-700/30' : 'bg-emerald-50 border border-emerald-100'}`}>
                                    <div className="flex items-center gap-2.5">
                                        <TrendingUp size={16} className="text-emerald-400" />
                                        <div>
                                            <p className={`text-xs font-bold ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>Ingresos del Mes</p>
                                            <p className={`text-[11px] ${isDark ? 'text-emerald-500' : 'text-emerald-500'}`}>Facturas EMITIDAS · {data?.meta?.mes}</p>
                                        </div>
                                    </div>
                                    <p className={`text-sm font-black tabular-nums ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>{fmtQ(kpis.ingresos_mes)}</p>
                                </div>

                                {/* OC Pendientes */}
                                <div className={`flex items-center justify-between p-3 rounded-xl ${isDark ? 'bg-violet-900/20 border border-violet-700/30' : 'bg-violet-50 border border-violet-100'}`}>
                                    <div className="flex items-center gap-2.5">
                                        <ShoppingCart size={16} className="text-violet-400" />
                                        <div>
                                            <p className={`text-xs font-bold ${isDark ? 'text-violet-300' : 'text-violet-700'}`}>OC Pendientes</p>
                                            <p className={`text-[11px] ${isDark ? 'text-violet-500' : 'text-violet-500'}`}>{kpis.oc_count} órden{kpis.oc_count !== 1 ? 'es' : ''} en proceso</p>
                                        </div>
                                    </div>
                                    <p className={`text-sm font-black tabular-nums ${isDark ? 'text-violet-300' : 'text-violet-700'}`}>{fmtQ(kpis.oc_valor)}</p>
                                </div>

                                {/* Deuda a proveedores */}
                                <div className={`flex items-center justify-between p-3 rounded-xl ${
                                    kpis.deuda_proveedores > 0
                                        ? isDark ? 'bg-rose-900/20 border border-rose-700/30' : 'bg-rose-50 border border-rose-100'
                                        : isDark ? 'bg-slate-700/30 border border-slate-600/30' : 'bg-slate-50 border border-slate-200'
                                }`}>
                                    <div className="flex items-center gap-2.5">
                                        <TrendingDown size={16} className={kpis.deuda_proveedores > 0 ? 'text-rose-400' : sub} />
                                        <div>
                                            <p className={`text-xs font-bold ${kpis.deuda_proveedores > 0 ? (isDark ? 'text-rose-300' : 'text-rose-700') : sub}`}>Deuda a Proveedores</p>
                                            <p className={`text-[11px] ${isDark ? 'text-rose-500' : 'text-rose-400'}`}>Cuentas PENDIENTE + PARCIAL</p>
                                        </div>
                                    </div>
                                    <p className={`text-sm font-black tabular-nums ${kpis.deuda_proveedores > 0 ? (isDark ? 'text-rose-300' : 'text-rose-700') : sub}`}>{fmtQ(kpis.deuda_proveedores)}</p>
                                </div>

                                {/* Valor en bodega */}
                                <div className={`flex items-center justify-between p-3 rounded-xl ${isDark ? 'bg-slate-700/30 border border-slate-600/30' : 'bg-slate-50 border border-slate-200'}`}>
                                    <div className="flex items-center gap-2.5">
                                        <Package size={16} className={sub} />
                                        <div>
                                            <p className={`text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Valor en Bodega</p>
                                            <p className={`text-[11px] ${sub}`}>Stock × Precio Compra</p>
                                        </div>
                                    </div>
                                    <p className={`text-sm font-black tabular-nums ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{fmtQ(kpis.valor_inventario)}</p>
                                </div>
                            </div>
                        )}
                    </Panel>
                </div>

            </div>
        </div>
    );
}
