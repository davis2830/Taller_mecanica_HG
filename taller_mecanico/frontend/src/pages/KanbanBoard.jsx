import React, { useState, useEffect, useContext, useRef, useMemo } from 'react';
import { DragDropContext } from '@hello-pangea/dnd';
import { useNavigate } from 'react-router-dom';
import KanbanColumn from '../components/KanbanColumn';
import OrderSlideOver from '../components/OrderSlideOver';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import axios from 'axios';
import { RefreshCw, Hammer, Loader2, Minimize2, Maximize2, ClipboardList, AlertTriangle, X } from 'lucide-react';

const COLLAPSED_STORAGE_KEY = 'kanban:collapsedColumns';

function KanbanBoard() {
  const { authTokens, logoutUser } = useContext(AuthContext);
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [data, setData] = useState({ tasks: {}, columns: {}, columnOrder: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorToast, setErrorToast] = useState(null);

  const [isSlideOpen, setIsSlideOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(null);

  // Configuración del taller (para el soft-gate de recepción).
  const [config, setConfig] = useState({ requerir_recepcion_antes_trabajo: true });
  // Diálogo de recepción faltante: { task, sourceColId, destColId, pendingResult }
  const [recepcionGate, setRecepcionGate] = useState(null);

  // Columnas colapsadas — persistido en localStorage. El usuario elige qué columnas
  // mantener angostas; también se auto-colapsan las vacías en el primer render.
  const hasSavedPrefRef = useRef(false);
  const [collapsedIds, setCollapsedIds] = useState(() => {
    try {
      const raw = localStorage.getItem(COLLAPSED_STORAGE_KEY);
      if (raw !== null) {
        hasSavedPrefRef.current = true;
        return new Set(JSON.parse(raw));
      }
    } catch { /* noop */ }
    return new Set();
  });
  const userCustomizedRef = useRef(false);

  // Sombras de scroll horizontal — indican que hay más columnas fuera de la vista.
  const scrollRef = useRef(null);
  const [scrollShadow, setScrollShadow] = useState({ left: false, right: false });
  // Índice de la columna "activa" visible en viewports angostos (mobile/tablet portrait),
  // para pintar los dots indicadores al pie del tablero.
  const [activeColumnIndex, setActiveColumnIndex] = useState(0);
  // Viewport actual — usamos matchMedia para decidir si mostramos el indicador de dots
  // y para el auto-colapso móvil. Sincronizado en el primer render para evitar flicker.
  const [isNarrow, setIsNarrow] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 767px)').matches : false
  );

  useEffect(() => {
    fetchBoard();
    // Config del taller (toggles de recepción). No bloquea si falla.
    axios
      .get('http://localhost:8000/api/v1/sistema/configuracion-taller/', {
        headers: { 'Authorization': `Bearer ${authTokens.access}` },
      })
      .then((r) => setConfig(r.data || {}))
      .catch(() => { /* usa default: requerir_recepcion_antes_trabajo=true */ });
  }, []);

  useEffect(() => {
    // Solo persistir cuando el usuario interactúa, para no enmascarar el auto-colapso
    // inicial con un "[]" guardado en el primer render.
    if (!userCustomizedRef.current) return;
    try {
      localStorage.setItem(COLLAPSED_STORAGE_KEY, JSON.stringify([...collapsedIds]));
    } catch { /* noop */ }
  }, [collapsedIds]);

  const fetchBoard = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const response = await axios.get('http://localhost:8000/api/v1/taller/kanban/', {
        headers: { 'Authorization': `Bearer ${authTokens.access}` }
      });
      setData(response.data);

      // Primera carga: auto-colapsar columnas vacías solo si el usuario no ha
      // guardado una preferencia previa (evita reaparecer columnas que expandió).
      if (!hasSavedPrefRef.current) {
        const emptyIds = response.data.columnOrder.filter(id => {
          const col = response.data.columns[id];
          return col && (col.taskIds?.length ?? 0) === 0;
        });
        if (emptyIds.length > 0) {
          setCollapsedIds(new Set(emptyIds));
        }
        hasSavedPrefRef.current = true;
      }
    } catch (error) {
      console.error('Error fetching board', error);
      if (error.response?.status === 401) logoutUser();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const showToast = (message) => {
    setErrorToast(message);
    setTimeout(() => setErrorToast(null), 4000);
  };

  const onDragEnd = async (result) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    // Soft-gate: si pasa de EN_ESPERA → EN_REVISION sin recepción registrada,
    // mostrar diálogo antes de completar el movimiento.
    const task = data.tasks[draggableId];
    if (
      config.requerir_recepcion_antes_trabajo !== false &&
      source.droppableId === 'EN_ESPERA' &&
      destination.droppableId === 'EN_REVISION' &&
      task && !task.recepcion_id
    ) {
      setRecepcionGate({ task, source, destination, draggableId });
      return; // Esperar respuesta del usuario; la tarjeta no se mueve todavía.
    }

    await commitMove({ source, destination, draggableId });
  };

  // Aplica el movimiento (optimistic + PATCH). Se separa para poder invocarlo
  // tanto desde onDragEnd directo como desde el diálogo de recepción.
  const commitMove = async ({ source, destination, draggableId }) => {
    const startColumn = data.columns[source.droppableId];
    const finishColumn = data.columns[destination.droppableId];

    // Mover dentro de misma columna
    if (startColumn === finishColumn) {
      const newTaskIds = Array.from(startColumn.taskIds);
      newTaskIds.splice(source.index, 1);
      newTaskIds.splice(destination.index, 0, draggableId);
      setData({ ...data, columns: { ...data.columns, [startColumn.id]: { ...startColumn, taskIds: newTaskIds } } });
      return;
    }

    // Mover a otra columna - OPTIMISTIC UPDATE
    const startTaskIds = Array.from(startColumn.taskIds);
    startTaskIds.splice(source.index, 1);
    const newStart = { ...startColumn, taskIds: startTaskIds };

    const finishTaskIds = Array.from(finishColumn.taskIds);
    finishTaskIds.splice(destination.index, 0, draggableId);
    const newFinish = { ...finishColumn, taskIds: finishTaskIds };

    const previousState = { ...data };

    setData({
      ...data,
      columns: { ...data.columns, [newStart.id]: newStart, [newFinish.id]: newFinish }
    });

    // Auto-expandir la columna destino si estaba colapsada (ahora tiene una tarjeta).
    if (collapsedIds.has(finishColumn.id)) {
      userCustomizedRef.current = true;
      setCollapsedIds(prev => {
        const next = new Set(prev);
        next.delete(finishColumn.id);
        return next;
      });
    }

    try {
      await axios.patch(
        `http://localhost:8000/api/v1/taller/orden/${draggableId}/mover/`,
        { nuevo_estado: finishColumn.id },
        { headers: { 'Authorization': `Bearer ${authTokens.access}` } }
      );
      // Refresh board after successful drag — ensures auto-assigned mechanic shows immediately
      fetchBoard(false);
    } catch (error) {
      // ROLLBACK si falla
      setData(previousState);
      const errorMsg = error.response?.data?.error || "Error de red moviendo la tarjeta";
      showToast(errorMsg);
    }
  };

  const toggleCollapse = (id) => {
    userCustomizedRef.current = true;
    setCollapsedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const collapseAllEmpty = () => {
    userCustomizedRef.current = true;
    const emptyIds = data.columnOrder.filter(id => {
      const col = data.columns[id];
      return col && (col.taskIds?.length ?? 0) === 0;
    });
    setCollapsedIds(new Set(emptyIds));
  };

  const expandAll = () => {
    userCustomizedRef.current = true;
    setCollapsedIds(new Set());
  };

  const updateScrollShadow = () => {
    const el = scrollRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    setScrollShadow({
      left: el.scrollLeft > 4,
      right: maxScroll > 4 && el.scrollLeft < maxScroll - 4,
    });
    // Calcular columna activa — tomamos el primer ancestro con data-kanban-column cuyo
    // left dentro del scroller cruza el centro del viewport del scroller.
    const cols = el.querySelectorAll('[data-kanban-column]');
    if (cols.length > 0) {
      const scrollerRect = el.getBoundingClientRect();
      const mid = scrollerRect.left + scrollerRect.width / 2;
      let bestIdx = 0;
      let bestDist = Infinity;
      cols.forEach((col, idx) => {
        const r = col.getBoundingClientRect();
        const center = r.left + r.width / 2;
        const dist = Math.abs(center - mid);
        if (dist < bestDist) { bestDist = dist; bestIdx = idx; }
      });
      setActiveColumnIndex(bestIdx);
    }
  };

  useEffect(() => {
    updateScrollShadow();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateScrollShadow, { passive: true });
    window.addEventListener('resize', updateScrollShadow);
    return () => {
      el.removeEventListener('scroll', updateScrollShadow);
      window.removeEventListener('resize', updateScrollShadow);
    };
  }, [data.columnOrder.length]);

  // Observar viewport para togglear el indicador de dots y la navegación compacta.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-width: 767px)');
    const handler = (e) => setIsNarrow(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Scroll suave a una columna por índice — usado por los dots / teclas flecha.
  const scrollToColumn = (idx) => {
    const el = scrollRef.current;
    if (!el) return;
    const cols = el.querySelectorAll('[data-kanban-column]');
    const target = cols[idx];
    if (!target) return;
    const scrollerRect = el.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    // Posicionar la columna al inicio del scroller (respeta el padding interno de 20px).
    const delta = targetRect.left - scrollerRect.left - 20;
    el.scrollBy({ left: delta, behavior: 'smooth' });
  };

  // Recalcula sombras cuando cambia el set de colapsadas (cambia el scrollWidth).
  useEffect(() => {
    const id = window.requestAnimationFrame(updateScrollShadow);
    return () => window.cancelAnimationFrame(id);
  }, [collapsedIds]);

  // Total active orders
  const totalOrdenes = Object.values(data.tasks || {}).length;

  const hasAnyCollapsed = collapsedIds.size > 0;
  const hasEmptyExpanded = useMemo(() => (
    data.columnOrder.some(id => {
      const col = data.columns[id];
      return col && (col.taskIds?.length ?? 0) === 0 && !collapsedIds.has(id);
    })
  ), [data, collapsedIds]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-full ${isDark ? 'bg-slate-900' : 'bg-slate-100'}`}>
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={40} className="animate-spin text-blue-500" />
          <p className="text-slate-400 font-medium">Cargando tablero en vivo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full ${isDark ? 'bg-[#0a0f1e]' : 'bg-slate-100'}`}>

      {/* Toast */}
      {errorToast && (
        <div className="fixed top-5 right-5 bg-red-600 text-white px-5 py-3.5 rounded-xl shadow-2xl z-[100] flex items-center gap-3 border border-red-500/50">
          <span className="font-bold">Error:</span> {errorToast}
        </div>
      )}

      {/* Header — no backdrop-filter: it creates a stacking context that traps position:fixed DnD elements */}
      <div className={`shrink-0 px-3 sm:px-6 py-3 sm:py-5 flex items-center justify-between gap-2 sm:gap-4 border-b ${isDark ? 'border-white/10 bg-slate-900' : 'border-slate-200 bg-white'}`}>
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className={`p-2 sm:p-2.5 rounded-xl shrink-0 ${isDark ? 'bg-blue-500/15' : 'bg-blue-100'}`}>
            <Hammer size={20} className="text-blue-500" />
          </div>
          <div className="min-w-0">
            <h1 className={`text-lg sm:text-2xl font-extrabold tracking-tight truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Tablero de Órdenes
            </h1>
            <p className={`text-xs sm:text-sm mt-0.5 truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              <span className="sm:hidden">{totalOrdenes} activa{totalOrdenes !== 1 ? 's' : ''}</span>
              <span className="hidden sm:inline">{totalOrdenes} orden{totalOrdenes !== 1 ? 'es' : ''} activa{totalOrdenes !== 1 ? 's' : ''} · Arrastra para cambiar estado</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {hasEmptyExpanded && (
            <button
              onClick={collapseAllEmpty}
              title="Colapsar columnas vacías"
              aria-label="Colapsar columnas vacías"
              className={`hidden sm:flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl transition-all active:scale-95 ${
                isDark
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/10'
                  : 'bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 shadow-sm'
              }`}
            >
              <Minimize2 size={16} />
              <span className="hidden md:inline">Colapsar vacías</span>
            </button>
          )}
          {hasAnyCollapsed && (
            <button
              onClick={expandAll}
              title="Expandir todas las columnas"
              aria-label="Expandir todas las columnas"
              className={`hidden sm:flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl transition-all active:scale-95 ${
                isDark
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/10'
                  : 'bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 shadow-sm'
              }`}
            >
              <Maximize2 size={16} />
              <span className="hidden md:inline">Expandir todo</span>
            </button>
          )}
          <button
            onClick={() => fetchBoard(true)}
            disabled={refreshing}
            title="Refrescar tablero"
            aria-label="Refrescar tablero"
            className={`grid place-items-center sm:flex sm:items-center sm:gap-2 text-sm font-semibold w-10 h-10 sm:w-auto sm:h-auto sm:px-4 sm:py-2 rounded-xl transition-all active:scale-95 ${
              isDark
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/10'
                : 'bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 shadow-sm'
            } disabled:opacity-50`}
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">{refreshing ? 'Actualizando...' : 'Refrescar'}</span>
          </button>
        </div>
      </div>

      {/* Board — overflow-x:auto for horizontal scroll, NOT overflow-y:hidden so drag clone isn't clipped */}
      <div className="relative" style={{ flex: 1, minHeight: 0 }}>
        {/* Sombras laterales indican scroll disponible */}
        <div
          aria-hidden
          className={`pointer-events-none absolute top-0 bottom-0 left-0 w-6 z-10 transition-opacity duration-200 ${
            scrollShadow.left ? 'opacity-100' : 'opacity-0'
          }`}
          style={{
            background: `linear-gradient(to right, ${isDark ? 'rgba(10,15,30,0.9)' : 'rgba(241,245,249,0.9)'}, transparent)`,
          }}
        />
        <div
          aria-hidden
          className={`pointer-events-none absolute top-0 bottom-0 right-0 w-6 z-10 transition-opacity duration-200 ${
            scrollShadow.right ? 'opacity-100' : 'opacity-0'
          }`}
          style={{
            background: `linear-gradient(to left, ${isDark ? 'rgba(10,15,30,0.9)' : 'rgba(241,245,249,0.9)'}, transparent)`,
          }}
        />

        <div
          ref={scrollRef}
          className="snap-x snap-mandatory sm:snap-none"
          style={{ height: '100%', overflowX: 'auto', overflowY: 'hidden', WebkitOverflowScrolling: 'touch' }}
        >
          <DragDropContext onDragEnd={onDragEnd}>
            <div style={{ display: 'flex', gap: 12, padding: 16, minWidth: 'max-content', alignItems: 'flex-start', minHeight: '100%' }}>
              {data.columnOrder.map(columnId => {
                const column = data.columns[columnId];
                if (!column) return null;
                const tasks = column.taskIds.map(taskId => data.tasks[taskId]).filter(t => t);
                return (
                  <KanbanColumn
                    key={column.id}
                    column={column}
                    tasks={tasks}
                    onOpen={(id) => { setSelectedOrderId(id); setIsSlideOpen(true); }}
                    collapsed={collapsedIds.has(column.id)}
                    onToggleCollapse={toggleCollapse}
                  />
                );
              })}
            </div>
          </DragDropContext>
        </div>

        {/* Indicador de columna activa — solo en viewports angostos donde 1 columna ≈ todo el ancho */}
        {isNarrow && data.columnOrder.length > 1 && (
          <div className="absolute bottom-2 left-0 right-0 flex items-center justify-center gap-1.5 pointer-events-none">
            {data.columnOrder.map((colId, idx) => (
              <button
                key={colId}
                type="button"
                onClick={() => scrollToColumn(idx)}
                aria-label={`Ir a columna ${data.columns[colId]?.title || idx + 1}`}
                className={`pointer-events-auto rounded-full transition-all ${
                  idx === activeColumnIndex
                    ? `w-6 h-2 ${isDark ? 'bg-blue-400' : 'bg-blue-500'}`
                    : `w-2 h-2 ${isDark ? 'bg-slate-600' : 'bg-slate-300'}`
                }`}
              />
            ))}
          </div>
        )}
      </div>

      <OrderSlideOver
        isOpen={isSlideOpen}
        orderId={selectedOrderId}
        onClose={() => setIsSlideOpen(false)}
        onUpdate={() => fetchBoard(true)}
      />

      {/* Soft-gate: recepción faltante al pasar EN_ESPERA → EN_REVISION */}
      {recepcionGate && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4"
          onClick={() => setRecepcionGate(null)}
        >
          <div
            className={`w-full max-w-md rounded-2xl shadow-2xl border ${isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`flex items-center justify-between px-5 py-4 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <div className="flex items-center gap-2">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center ${isDark ? 'bg-amber-500/15 text-amber-300' : 'bg-amber-100 text-amber-600'}`}>
                  <AlertTriangle size={18} />
                </div>
                <h3 className="font-bold text-base">Recepción pendiente</h3>
              </div>
              <button
                onClick={() => setRecepcionGate(null)}
                className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}
                aria-label="Cerrar"
              >
                <X size={16} />
              </button>
            </div>
            <div className="px-5 py-5 text-sm">
              Antes de empezar el trabajo conviene registrar la recepción del vehículo{' '}
              <span className="font-bold">{recepcionGate.task?.vehiculo?.placa?.toUpperCase()}</span>
              {' '}(kilometraje, combustible, daños previos y firma del cliente).
              <div className={`mt-3 text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Puedes desactivar este aviso en{' '}
                <span className="font-semibold">Sistema → Configuración del Taller</span>.
              </div>
            </div>
            <div className={`px-5 py-4 flex flex-col sm:flex-row gap-2 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <button
                onClick={() => {
                  const citaId = recepcionGate.task?.cita?.id || recepcionGate.task?.cita_id;
                  const vehId  = recepcionGate.task?.vehiculo?.id;
                  // Pasamos cita_id (para linkear) y vehiculo (fallback, por si
                  // la cita no se pudo leer y queremos al menos el dropdown
                  // ya seleccionado).
                  const params = new URLSearchParams();
                  if (citaId) params.set('cita_id', citaId);
                  if (vehId)  params.set('vehiculo', vehId);
                  const url = params.toString() ? `/citas/recepcion/nueva?${params}` : '/citas/recepcion/nueva';
                  setRecepcionGate(null);
                  navigate(url);
                }}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm shadow-sm"
              >
                <ClipboardList size={15} />
                Registrar recepción
              </button>
              <button
                onClick={async () => {
                  const g = recepcionGate;
                  setRecepcionGate(null);
                  await commitMove({ source: g.source, destination: g.destination, draggableId: g.draggableId });
                }}
                className={`flex-1 px-4 py-2.5 rounded-lg font-semibold text-sm border ${isDark ? 'border-slate-700 text-slate-200 hover:bg-slate-800' : 'border-slate-300 text-slate-700 hover:bg-slate-100'}`}
              >
                Continuar sin recepción
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default KanbanBoard;
