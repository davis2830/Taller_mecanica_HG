import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { AuthContext } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import OrderSlideOver from '../../components/OrderSlideOver';
import FlowTrail from '../../components/FlowTrail';
import axios from 'axios';
import {
  Search, Filter, Receipt, ChevronLeft, ChevronRight,
  Loader2, RefreshCw, Car, User, Wrench, TrendingUp,
  CheckCircle, Clock, XCircle, CreditCard, Banknote,
  ArrowRightLeft, BadgeCheck, Eye, Calendar, DollarSign
} from 'lucide-react';

// ─── Config ───────────────────────────────────────────────────────────────────
const ESTADOS = [
  { value: '',          label: 'Todos' },
  { value: 'BORRADOR',  label: 'Borrador' },
  { value: 'EMITIDA',   label: 'Emitida' },
  { value: 'ANULADA',   label: 'Anulada' },
];

const ESTADO_CFG = {
  BORRADOR: { label: 'Borrador',  dark: 'bg-amber-900/40 text-amber-300 border-amber-700/50',   light: 'bg-amber-100 text-amber-700 border-amber-300'   },
  EMITIDA:  { label: 'Emitida',   dark: 'bg-emerald-900/40 text-emerald-300 border-emerald-700/50', light: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
  ANULADA:  { label: 'Anulada',   dark: 'bg-red-900/40 text-red-300 border-red-700/50',         light: 'bg-red-100 text-red-700 border-red-300'         },
};

const METODO_ICON = {
  EFECTIVO:      <Banknote size={13} />,
  TARJETA:       <CreditCard size={13} />,
  TRANSFERENCIA: <ArrowRightLeft size={13} />,
  OTROS:         <Receipt size={13} />,
};

const GTQ = (v) => v != null
  ? new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' }).format(v)
  : 'Q0.00';

const fmtDate = (d) => d
  ? new Date(d).toLocaleDateString('es-GT', { year: 'numeric', month: 'short', day: 'numeric' })
  : '—';

function EstadoBadge({ estado, isDark }) {
  const cfg = ESTADO_CFG[estado] ?? ESTADO_CFG.BORRADOR;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${isDark ? cfg.dark : cfg.light}`}>
      {cfg.label}
    </span>
  );
}

// ─── Stats Card ───────────────────────────────────────────────────────────────
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

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function FacturasPage() {
  const { isDark } = useTheme();
  const { authTokens } = useContext(AuthContext);
  const navigate = useNavigate();

  const [results, setResults]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [count, setCount]               = useState(0);
  const [pages, setPages]               = useState(1);
  const [page, setPage]                 = useState(1);
  const [totalIngresos, setTotalIngresos] = useState(0);

  const [inputQ, setInputQ]             = useState('');
  const [searchQ, setSearchQ]           = useState('');
  const [estadoFiltro, setEstado]       = useState('');

  const [slideOpen, setSlideOpen]       = useState(false);
  const [selectedOrdenId, setSelectedOrdenId] = useState(null);

  const headers = { Authorization: `Bearer ${authTokens?.access}` };

  const fetchFacturas = useCallback(async (pg = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: pg, page_size: 20 });
      if (searchQ)      params.set('q', searchQ);
      if (estadoFiltro) params.set('estado', estadoFiltro);

      const res = await axios.get(
        `http://localhost:8000/api/v1/facturacion/?${params}`,
        { headers }
      );
      setResults(res.data.results);
      setCount(res.data.count);
      setPages(res.data.pages);
      setPage(res.data.page);
      setTotalIngresos(res.data.total_ingresos ?? 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [searchQ, estadoFiltro]);

  useEffect(() => { fetchFacturas(1); }, [searchQ, estadoFiltro]);

  useEffect(() => {
    const t = setTimeout(() => setSearchQ(inputQ), 400);
    return () => clearTimeout(t);
  }, [inputQ]);

  // ── Stats ──────────────────────────────────────────────────────────────────
  const emitidas = results.filter(f => f.estado === 'EMITIDA').length;
  const borradores = results.filter(f => f.estado === 'BORRADOR').length;

  // ── Theme ──────────────────────────────────────────────────────────────────
  const pageBg  = isDark ? 'bg-[#0a0f1e]'     : 'bg-slate-100';
  const cardBg  = isDark ? 'bg-slate-800/70'  : 'bg-white';
  const borderC = isDark ? 'border-slate-700' : 'border-slate-200';
  const txt     = isDark ? 'text-slate-100'   : 'text-slate-900';
  const sub     = isDark ? 'text-slate-400'   : 'text-slate-500';
  const thdBg   = isDark ? 'bg-slate-900'     : 'bg-slate-50';
  const thdTxt  = isDark ? 'text-slate-400'   : 'text-slate-500';
  const rowHov  = isDark ? 'hover:bg-slate-700/40' : 'hover:bg-slate-50';
  const inputCls = `w-full rounded-xl border text-sm px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500/50 transition-colors ${isDark ? 'bg-slate-800 border-slate-600 text-white placeholder-slate-500' : 'bg-white border-slate-300 text-slate-800 placeholder-slate-400'}`;

  return (
    <div className={`flex flex-col h-full ${pageBg}`}>

      {/* Header */}
      <div className={`shrink-0 px-6 py-5 border-b ${borderC} ${isDark ? 'bg-slate-900' : 'bg-white'} flex items-center justify-between gap-4`}>
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${isDark ? 'bg-emerald-500/15' : 'bg-emerald-100'}`}>
            <Receipt size={21} className="text-emerald-500" />
          </div>
          <div>
            <h1 className={`text-xl font-extrabold tracking-tight ${txt}`}>Facturación</h1>
            <p className={`text-sm mt-0.5 ${sub}`}>
              {loading ? '...' : `${count} factura${count !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>
        <button
          onClick={() => fetchFacturas(page)}
          className={`flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl transition-all border ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-600' : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200 shadow-sm'}`}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      {/* Stats */}
      {!loading && (
        <div className="shrink-0 px-6 py-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Total Ingresos" value={GTQ(totalIngresos)} icon={<TrendingUp size={20} />} accent="text-emerald-500" isDark={isDark} />
          <StatCard label="Facturas Totales" value={count} icon={<Receipt size={20} />} accent="text-blue-500" isDark={isDark} />
          <StatCard label="Emitidas (página)" value={emitidas} icon={<BadgeCheck size={20} />} accent="text-purple-500" isDark={isDark} />
          <StatCard label="Borradores (página)" value={borradores} icon={<Clock size={20} />} accent="text-amber-500" isDark={isDark} />
        </div>
      )}

      {/* Filters */}
      <div className={`shrink-0 px-6 py-3 border-b ${borderC} ${isDark ? 'bg-slate-900/60' : 'bg-white/80'} flex flex-wrap gap-3 items-center`}>
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search size={15} className={`absolute left-3 top-1/2 -translate-y-1/2 ${sub} pointer-events-none`} />
          <input
            id="facturas-search"
            type="text"
            className={`${inputCls} pl-9`}
            placeholder="Buscar por N° factura, placa o cliente..."
            value={inputQ}
            onChange={(e) => setInputQ(e.target.value)}
          />
        </div>

        <div className="relative">
          <Filter size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${sub} pointer-events-none`} />
          <select
            value={estadoFiltro}
            onChange={(e) => setEstado(e.target.value)}
            className={`${inputCls} pl-9 pr-8 appearance-none cursor-pointer min-w-[160px]`}
          >
            {ESTADOS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
          </select>
        </div>

        {(inputQ || estadoFiltro) && (
          <button
            onClick={() => { setInputQ(''); setSearchQ(''); setEstado(''); }}
            className={`text-xs font-semibold px-3 py-2 rounded-lg border transition-colors ${isDark ? 'border-red-700/50 text-red-400 hover:bg-red-900/30' : 'border-red-200 text-red-500 hover:bg-red-50'}`}
          >
            Limpiar
          </button>
        )}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto px-6 py-5">
        <div className={`rounded-xl border ${borderC} ${cardBg} overflow-hidden`}>
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={32} className="animate-spin text-emerald-500" />
            </div>
          ) : results.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Receipt size={40} className={sub} />
              <p className={`text-sm font-medium ${sub}`}>No se encontraron facturas</p>
              {(searchQ || estadoFiltro) && (
                <button onClick={() => { setInputQ(''); setSearchQ(''); setEstado(''); }}
                  className="text-sm text-blue-500 hover:underline">Limpiar filtros</button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className={`border-b ${borderC} ${thdBg}`}>
                    {['N° Factura', 'Flujo', 'Cliente', 'Vehículo', 'Servicio', 'Mano Obra', 'Repuestos', 'Descuento', 'Total', 'Método', 'Estado', 'Fecha', ''].map(h => (
                      <th key={h} className={`px-4 py-3 text-left text-xs font-bold uppercase tracking-wider whitespace-nowrap ${thdTxt}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? 'divide-slate-700/50' : 'divide-slate-100'}`}>
                  {results.map(f => (
                    <tr key={f.id}
                      className={`${rowHov} transition-colors cursor-pointer`}
                      onClick={() => { if (f.orden_id) { setSelectedOrdenId(f.orden_id); setSlideOpen(true); } }}
                    >
                      {/* N° Factura */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className={`font-black font-mono text-xs ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                          {f.numero_factura ?? <span className="italic opacity-60">Borrador</span>}
                        </span>
                      </td>

                      {/* Flow Trail */}
                      <td className="px-4 py-3.5 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                        <FlowTrail
                          citaId={f.cita_id}
                          ordenId={f.orden_id}
                          facturaId={f.id}
                          facturaNum={f.numero_factura}
                          facturaEstado={f.estado}
                          isDark={isDark}
                          compact
                          onOpenOrden={(id) => { setSelectedOrdenId(id); setSlideOpen(true); }}
                          onNavCalendar={() => navigate('/citas/calendario')}
                          onNavFacturas={null}
                        />
                      </td>

                      {/* Cliente */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <User size={13} className={sub} />
                          <span className={`text-sm ${txt}`}>{f.cliente_nombre || '—'}</span>
                        </div>
                      </td>

                      {/* Vehículo */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Car size={13} className={sub} />
                          <div>
                            <p className={`text-sm font-semibold ${txt}`}>{f.vehiculo_desc || '—'}</p>
                            {f.vehiculo_placa && (
                              <p className={`text-xs font-mono font-bold ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>{f.vehiculo_placa}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Servicio */}
                      <td className="px-4 py-3.5">
                        <span className={`text-xs ${sub} max-w-[120px] truncate block`}>{f.servicio_nombre || '—'}</span>
                      </td>

                      {/* Mano Obra */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className={`text-sm font-semibold ${txt}`}>{GTQ(f.costo_mano_obra)}</span>
                      </td>

                      {/* Repuestos */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className={`text-sm font-semibold ${txt}`}>{GTQ(f.costo_repuestos)}</span>
                      </td>

                      {/* Descuento */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className={`text-sm ${parseFloat(f.descuento) > 0 ? 'text-red-400 font-bold' : sub}`}>
                          {parseFloat(f.descuento) > 0 ? `- ${GTQ(f.descuento)}` : '—'}
                        </span>
                      </td>

                      {/* Total */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className={`text-base font-black ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                          {GTQ(f.total_general)}
                        </span>
                      </td>

                      {/* Método */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {f.metodo_pago ? (
                          <div className="flex items-center gap-1.5">
                            <span className={sub}>{METODO_ICON[f.metodo_pago]}</span>
                            <span className={`text-xs ${sub}`}>{f.metodo_pago_display}</span>
                          </div>
                        ) : <span className={`text-xs italic ${sub}`}>—</span>}
                      </td>

                      {/* Estado */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <EstadoBadge estado={f.estado} isDark={isDark} />
                      </td>

                      {/* Fecha */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={12} className={sub} />
                          <span className={`text-xs ${sub}`}>{fmtDate(f.fecha_emision)}</span>
                        </div>
                      </td>

                      {/* Eye */}
                      <td className="px-4 py-3.5">
                        <button className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-slate-600 text-slate-400' : 'hover:bg-slate-100 text-slate-400'}`}>
                          <Eye size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {pages > 1 && !loading && (
          <div className="flex items-center justify-between mt-4 px-1">
            <p className={`text-xs ${sub}`}>Página {page} de {pages} · {count} resultados</p>
            <div className="flex items-center gap-2">
              <button onClick={() => fetchFacturas(page - 1)} disabled={page <= 1}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-lg border transition-colors disabled:opacity-40 ${isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                <ChevronLeft size={15} /> Anterior
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(pages, 5) }, (_, i) => {
                  const pg = page <= 3 ? i + 1 : page - 2 + i;
                  if (pg > pages || pg < 1) return null;
                  return (
                    <button key={pg} onClick={() => fetchFacturas(pg)}
                      className={`w-8 h-8 text-xs font-bold rounded-lg transition-colors ${pg === page ? 'bg-emerald-600 text-white' : isDark ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-600 hover:bg-slate-100'}`}>
                      {pg}
                    </button>
                  );
                })}
              </div>
              <button onClick={() => fetchFacturas(page + 1)} disabled={page >= pages}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-lg border transition-colors disabled:opacity-40 ${isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                Siguiente <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Order detail slide-over */}
      <OrderSlideOver
        isOpen={slideOpen}
        orderId={selectedOrdenId}
        onClose={() => setSlideOpen(false)}
        onUpdate={() => fetchFacturas(page)}
      />
    </div>
  );
}
