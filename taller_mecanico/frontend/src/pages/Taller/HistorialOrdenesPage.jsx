import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { AuthContext } from '../../context/AuthContext';
import OrderSlideOver from '../../components/OrderSlideOver';
import axios from 'axios';
import {
  Search, Filter, History, ChevronLeft, ChevronRight,
  Loader2, RefreshCw, Car, User, Wrench, Clock,
  CheckCircle, Package, Truck, XCircle, Eye, Calendar
} from 'lucide-react';

// ─── Config ───────────────────────────────────────────────────────────────────
const ESTADOS = [
  { value: '',                    label: 'Todos los estados' },
  { value: 'EN_ESPERA',           label: 'En Espera'           },
  { value: 'EN_REVISION',         label: 'En Revisión'         },
  { value: 'ESPERANDO_REPUESTOS', label: 'Esperando Repuestos' },
  { value: 'LISTO',               label: 'Listo para Entrega'  },
  { value: 'ENTREGADO',           label: 'Entregado'           },
  { value: 'CANCELADO',           label: 'Cancelado'           },
];

const STATE_CFG = {
  EN_ESPERA:           { icon: <Clock size={13} />,        label: 'En Espera',           dark: 'bg-amber-900/40 text-amber-300 border-amber-700/50',   light: 'bg-amber-100 text-amber-700 border-amber-300'   },
  EN_REVISION:         { icon: <Wrench size={13} />,       label: 'En Revisión',         dark: 'bg-blue-900/40 text-blue-300 border-blue-700/50',       light: 'bg-blue-100 text-blue-700 border-blue-300'      },
  ESPERANDO_REPUESTOS: { icon: <Package size={13} />,      label: 'Esp. Repuestos',      dark: 'bg-orange-900/40 text-orange-300 border-orange-700/50', light: 'bg-orange-100 text-orange-700 border-orange-300' },
  LISTO:               { icon: <CheckCircle size={13} />,  label: 'Listo',               dark: 'bg-emerald-900/40 text-emerald-300 border-emerald-700/50',light:'bg-emerald-100 text-emerald-700 border-emerald-300'},
  ENTREGADO:           { icon: <Truck size={13} />,        label: 'Entregado',           dark: 'bg-purple-900/40 text-purple-300 border-purple-700/50', light: 'bg-purple-100 text-purple-700 border-purple-300' },
  CANCELADO:           { icon: <XCircle size={13} />,      label: 'Cancelado',           dark: 'bg-red-900/40 text-red-300 border-red-700/50',         light: 'bg-red-100 text-red-700 border-red-300'         },
};

const GTQ = (v) => v != null ? new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' }).format(v) : 'Q0.00';
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('es-GT', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

function StateBadge({ estado, isDark }) {
  const cfg = STATE_CFG[estado] ?? STATE_CFG.EN_ESPERA;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${isDark ? cfg.dark : cfg.light}`}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function HistorialOrdenesPage() {
  const { isDark } = useTheme();
  const { authTokens } = useContext(AuthContext);

  const [results, setResults]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [count, setCount]           = useState(0);
  const [pages, setPages]           = useState(1);
  const [page, setPage]             = useState(1);

  // Filters
  const [searchQ, setSearchQ]       = useState('');
  const [inputQ, setInputQ]         = useState('');   // controlled input
  const [estadoFiltro, setEstado]   = useState('');

  // SlideOver
  const [slideOpen, setSlideOpen]   = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  const headers = { Authorization: `Bearer ${authTokens?.access}` };

  const fetchHistorial = useCallback(async (pg = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: pg, page_size: 20 });
      if (searchQ)     params.set('q', searchQ);
      if (estadoFiltro) params.set('estado', estadoFiltro);

      const res = await axios.get(
        `http://localhost:8000/api/v1/taller/historial/?${params}`,
        { headers }
      );
      setResults(res.data.results);
      setCount(res.data.count);
      setPages(res.data.pages);
      setPage(res.data.page);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [searchQ, estadoFiltro]);

  // Fetch when filters or page change
  useEffect(() => { fetchHistorial(1); }, [searchQ, estadoFiltro]);

  // Debounce input → searchQ
  useEffect(() => {
    const t = setTimeout(() => setSearchQ(inputQ), 400);
    return () => clearTimeout(t);
  }, [inputQ]);

  // ── Theme helpers ───────────────────────────────────────────────────────
  const pageBg   = isDark ? 'bg-[#0a0f1e]'       : 'bg-slate-100';
  const cardBg   = isDark ? 'bg-slate-800/70'    : 'bg-white';
  const borderC  = isDark ? 'border-slate-700'   : 'border-slate-200';
  const txt      = isDark ? 'text-slate-100'     : 'text-slate-900';
  const sub      = isDark ? 'text-slate-400'     : 'text-slate-500';
  const thdBg    = isDark ? 'bg-slate-900'       : 'bg-slate-50';
  const thdTxt   = isDark ? 'text-slate-400'     : 'text-slate-500';
  const rowHover = isDark ? 'hover:bg-slate-700/40' : 'hover:bg-slate-50';
  const inputCls = `w-full rounded-xl border text-sm px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500/50 transition-colors ${isDark ? 'bg-slate-800 border-slate-600 text-white placeholder-slate-500' : 'bg-white border-slate-300 text-slate-800 placeholder-slate-400'}`;

  return (
    <div className={`flex flex-col h-full ${pageBg}`}>

      {/* Header */}
      <div className={`shrink-0 px-6 py-5 border-b ${borderC} ${isDark ? 'bg-slate-900' : 'bg-white'} flex items-center justify-between gap-4`}>
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${isDark ? 'bg-blue-500/15' : 'bg-blue-100'}`}>
            <History size={21} className="text-blue-500" />
          </div>
          <div>
            <h1 className={`text-xl font-extrabold tracking-tight ${txt}`}>Historial de Órdenes</h1>
            <p className={`text-sm mt-0.5 ${sub}`}>
              {loading ? '...' : `${count} orden${count !== 1 ? 'es' : ''} encontrada${count !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>
        <button
          onClick={() => fetchHistorial(page)}
          className={`flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl transition-all border ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-600' : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200 shadow-sm'}`}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      {/* Filters bar */}
      <div className={`shrink-0 px-6 py-3 border-b ${borderC} ${isDark ? 'bg-slate-900/60' : 'bg-white/80'} flex flex-wrap gap-3 items-center`}>
        {/* Search input */}
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search size={15} className={`absolute left-3 top-1/2 -translate-y-1/2 ${sub} pointer-events-none`} />
          <input
            id="historial-search"
            type="text"
            className={`${inputCls} pl-9`}
            placeholder="Buscar por placa, cliente o diagnóstico..."
            value={inputQ}
            onChange={(e) => setInputQ(e.target.value)}
          />
        </div>

        {/* Estado filter */}
        <div className="relative">
          <Filter size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${sub} pointer-events-none`} />
          <select
            id="historial-estado"
            value={estadoFiltro}
            onChange={(e) => setEstado(e.target.value)}
            className={`${inputCls} pl-9 pr-8 appearance-none cursor-pointer min-w-[200px]`}
          >
            {ESTADOS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
          </select>
        </div>

        {/* Clear */}
        {(inputQ || estadoFiltro) && (
          <button
            onClick={() => { setInputQ(''); setSearchQ(''); setEstado(''); }}
            className={`text-xs font-semibold px-3 py-2 rounded-lg border transition-colors ${isDark ? 'border-red-700/50 text-red-400 hover:bg-red-900/30' : 'border-red-200 text-red-500 hover:bg-red-50'}`}
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Table area */}
      <div className="flex-1 overflow-auto px-6 py-5">
        <div className={`rounded-xl border ${borderC} ${cardBg} overflow-hidden`}>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={32} className="animate-spin text-blue-500" />
            </div>
          ) : results.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <History size={40} className={sub} />
              <p className={`text-sm font-medium ${sub}`}>No se encontraron órdenes</p>
              {(searchQ || estadoFiltro) && (
                <button
                  onClick={() => { setInputQ(''); setSearchQ(''); setEstado(''); }}
                  className="text-sm text-blue-500 hover:underline"
                >Limpiar filtros</button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className={`border-b ${borderC} ${thdBg}`}>
                    {['Orden', 'Vehículo', 'Cliente', 'Servicio', 'Mecánico', 'Estado', 'Costo', 'Fecha', ''].map(h => (
                      <th key={h} className={`px-4 py-3 text-left text-xs font-bold uppercase tracking-wider ${thdTxt}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? 'divide-slate-700/50' : 'divide-slate-100'}`}>
                  {results.map(orden => {
                    const cliente = orden.cita?.cliente;
                    const servicio = orden.cita?.servicio;
                    return (
                      <tr
                        key={orden.id}
                        className={`${rowHover} transition-colors cursor-pointer`}
                        onClick={() => { setSelectedId(orden.id); setSlideOpen(true); }}
                      >
                        {/* Orden # */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className={`font-black font-mono text-xs ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                            #{String(orden.id).padStart(5, '0')}
                          </span>
                        </td>

                        {/* Vehículo */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Car size={15} className={sub} />
                            <div>
                              <p className={`font-semibold ${txt}`}>{orden.vehiculo?.marca} {orden.vehiculo?.modelo}</p>
                              <p className={`text-xs font-mono font-bold ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                                {orden.vehiculo?.placa}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Cliente */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <User size={14} className={sub} />
                            <span className={txt}>
                              {cliente ? `${cliente.first_name} ${cliente.last_name}` : '—'}
                            </span>
                          </div>
                        </td>

                        {/* Servicio */}
                        <td className="px-4 py-3.5">
                          <span className={`text-sm ${sub} max-w-[160px] truncate block`}>
                            {servicio?.nombre || '—'}
                          </span>
                        </td>

                        {/* Mecánico */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Wrench size={14} className={sub} />
                            <span className={orden.mecanico_asignado ? txt : `italic ${sub}`}>
                              {orden.mecanico_asignado
                                ? `${orden.mecanico_asignado.first_name} ${orden.mecanico_asignado.last_name}`
                                : 'Sin asignar'}
                            </span>
                          </div>
                        </td>

                        {/* Estado */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <StateBadge estado={orden.estado} isDark={isDark} />
                        </td>

                        {/* Costo */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className={`font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                            {GTQ(orden.costo_total)}
                          </span>
                        </td>

                        {/* Fecha */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Calendar size={13} className={sub} />
                            <span className={`text-xs ${sub}`}>{fmtDate(orden.fecha_creacion)}</span>
                          </div>
                        </td>

                        {/* Action */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <button className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-600 text-slate-400' : 'hover:bg-slate-100 text-slate-400'}`}>
                            <Eye size={15} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {pages > 1 && !loading && (
          <div className="flex items-center justify-between mt-4 px-1">
            <p className={`text-xs ${sub}`}>
              Página {page} de {pages} · {count} resultados
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchHistorial(page - 1)}
                disabled={page <= 1}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-lg border transition-colors disabled:opacity-40 ${isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
              >
                <ChevronLeft size={15} /> Anterior
              </button>

              {/* Page numbers */}
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(pages, 5) }, (_, i) => {
                  const pg = page <= 3 ? i + 1 : page - 2 + i;
                  if (pg > pages || pg < 1) return null;
                  return (
                    <button
                      key={pg}
                      onClick={() => fetchHistorial(pg)}
                      className={`w-8 h-8 text-xs font-bold rounded-lg transition-colors ${pg === page ? 'bg-blue-600 text-white' : isDark ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-600 hover:bg-slate-100'}`}
                    >
                      {pg}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => fetchHistorial(page + 1)}
                disabled={page >= pages}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-lg border transition-colors disabled:opacity-40 ${isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
              >
                Siguiente <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Order detail slide-over */}
      <OrderSlideOver
        isOpen={slideOpen}
        orderId={selectedId}
        onClose={() => setSlideOpen(false)}
        onUpdate={() => fetchHistorial(page)}
      />
    </div>
  );
}
