import React from 'react';
import { Droppable } from '@hello-pangea/dnd';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import KanbanTask from './KanbanTask';
import { useTheme } from '../context/ThemeContext';

// Config de cada columna — colores separados para dark y light
const COLUMN_CONFIG = {
  EN_ESPERA: {
    headerDark: 'bg-slate-700',
    headerLight: 'bg-slate-300',
    dotDark: 'bg-slate-400',
    dotLight: 'bg-slate-500',
    labelDark: 'text-white',
    labelLight: 'text-slate-700',
    countDark: 'bg-slate-600 text-slate-200',
    countLight: 'bg-slate-400 text-white',
    columnBgDark: 'bg-slate-800/60',
    columnBgLight: 'bg-slate-100',
    borderDark: 'border-white/10',
    borderLight: 'border-slate-300',
    dragOverDark: 'bg-slate-900/30',
    dragOverLight: 'bg-slate-200/60',
  },
  EN_REVISION: {
    headerDark: 'bg-blue-700',
    headerLight: 'bg-blue-500',
    dotDark: 'bg-blue-300',
    dotLight: 'bg-blue-200',
    labelDark: 'text-white',
    labelLight: 'text-white',
    countDark: 'bg-blue-600 text-blue-100',
    countLight: 'bg-blue-400 text-white',
    columnBgDark: 'bg-slate-800/60',
    columnBgLight: 'bg-white',
    borderDark: 'border-blue-700/30',
    borderLight: 'border-blue-300',
    dragOverDark: 'bg-blue-900/20',
    dragOverLight: 'bg-blue-50',
  },
  COTIZACION: {
    headerDark: 'bg-cyan-700',
    headerLight: 'bg-cyan-500',
    dotDark: 'bg-cyan-300',
    dotLight: 'bg-cyan-200',
    labelDark: 'text-white',
    labelLight: 'text-white',
    countDark: 'bg-cyan-600 text-cyan-100',
    countLight: 'bg-cyan-400 text-white',
    columnBgDark: 'bg-slate-800/60',
    columnBgLight: 'bg-white',
    borderDark: 'border-cyan-700/30',
    borderLight: 'border-cyan-300',
    dragOverDark: 'bg-cyan-900/20',
    dragOverLight: 'bg-cyan-50',
  },
  ESPERANDO_REPUESTOS: {
    headerDark: 'bg-amber-600',
    headerLight: 'bg-amber-500',
    dotDark: 'bg-amber-300',
    dotLight: 'bg-amber-200',
    labelDark: 'text-white',
    labelLight: 'text-white',
    countDark: 'bg-amber-500 text-amber-100',
    countLight: 'bg-amber-400 text-white',
    columnBgDark: 'bg-slate-800/60',
    columnBgLight: 'bg-white',
    borderDark: 'border-amber-600/30',
    borderLight: 'border-amber-300',
    dragOverDark: 'bg-amber-900/20',
    dragOverLight: 'bg-amber-50',
  },
  LISTO: {
    headerDark: 'bg-emerald-700',
    headerLight: 'bg-emerald-500',
    dotDark: 'bg-emerald-300',
    dotLight: 'bg-emerald-200',
    labelDark: 'text-white',
    labelLight: 'text-white',
    countDark: 'bg-emerald-600 text-emerald-100',
    countLight: 'bg-emerald-400 text-white',
    columnBgDark: 'bg-slate-800/60',
    columnBgLight: 'bg-white',
    borderDark: 'border-emerald-700/30',
    borderLight: 'border-emerald-300',
    dragOverDark: 'bg-emerald-900/20',
    dragOverLight: 'bg-emerald-50',
  },
  ENTREGADO: {
    headerDark: 'bg-purple-700',
    headerLight: 'bg-purple-500',
    dotDark: 'bg-purple-300',
    dotLight: 'bg-purple-200',
    labelDark: 'text-white',
    labelLight: 'text-white',
    countDark: 'bg-purple-600 text-purple-100',
    countLight: 'bg-purple-400 text-white',
    columnBgDark: 'bg-slate-800/60',
    columnBgLight: 'bg-white',
    borderDark: 'border-purple-700/30',
    borderLight: 'border-purple-300',
    dragOverDark: 'bg-purple-900/20',
    dragOverLight: 'bg-purple-50',
  },
};

function KanbanColumn({ column, tasks, onOpen, collapsed = false, onToggleCollapse }) {
  const { isDark } = useTheme();
  const c = COLUMN_CONFIG[column.id] ?? COLUMN_CONFIG.EN_ESPERA;

  const header    = isDark ? c.headerDark    : c.headerLight;
  const dot       = isDark ? c.dotDark       : c.dotLight;
  const label     = isDark ? c.labelDark     : c.labelLight;
  const count     = isDark ? c.countDark     : c.countLight;
  const colBg     = isDark ? c.columnBgDark  : c.columnBgLight;
  const border    = isDark ? c.borderDark    : c.borderLight;
  const dragOver  = isDark ? c.dragOverDark  : c.dragOverLight;
  const emptyText = isDark ? 'text-slate-600 border-slate-700/50' : 'text-slate-400 border-slate-300';

  // Columna colapsada: header vertical angosto con conteo y botón para expandir.
  // Sigue siendo drop target (se ensancha visualmente al arrastrar encima).
  if (collapsed) {
    return (
      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            className={`flex flex-col shrink-0 rounded-xl border ${border} ${colBg} shadow-lg transition-all duration-200 snap-start ${
              snapshot.isDraggingOver ? 'w-56' : 'w-14'
            }`}
            ref={provided.innerRef}
            {...provided.droppableProps}
          >
            <button
              type="button"
              onClick={() => onToggleCollapse?.(column.id)}
              title={`Expandir ${column.title}`}
              className={`${header} rounded-t-xl flex flex-col items-center justify-start gap-2 py-3 hover:brightness-110 active:brightness-95 transition ${label}`}
              style={{ minHeight: 180, minWidth: 44 }}
            >
              <ChevronRight size={16} />
              <span className={`text-xs font-black px-2 py-0.5 rounded-full ${count}`}>
                {tasks.length}
              </span>
              <span
                className="font-bold text-xs tracking-wide mt-1"
                style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', whiteSpace: 'nowrap' }}
              >
                {column.title}
              </span>
            </button>
            <div
              className={`flex-1 min-h-[40px] rounded-b-xl transition-colors duration-150 ${snapshot.isDraggingOver ? dragOver : ''}`}
            >
              {/* Placeholder oculto — mantiene DnD funcional aunque no se vean tareas */}
              <div style={{ display: 'none' }}>{provided.placeholder}</div>
            </div>
          </div>
        )}
      </Droppable>
    );
  }

  return (
    <Droppable droppableId={column.id}>
      {(provided, snapshot) => (
        <div
          data-kanban-column
          className={`flex flex-col shrink-0 rounded-xl border ${border} ${colBg} shadow-lg transition-all duration-200 snap-start
            w-[85vw] max-w-[340px] sm:w-72 sm:max-w-none
            ${snapshot.isDraggingOver ? 'scale-[1.01]' : ''}`}
          style={{
            boxShadow: snapshot.isDraggingOver
              ? `0 10px 30px -8px ${isDark ? 'rgba(0,0,0,0.7)' : 'rgba(15,23,42,0.18)'}, 0 0 0 2px rgba(59,130,246,0.35)`
              : undefined,
          }}
        >
          {/* Header */}
          <div className={`${header} rounded-t-xl px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between gap-2`}>
            <div className="flex items-center gap-2.5 min-w-0">
              <span className={`w-2.5 h-2.5 rounded-full ${dot} shrink-0`} />
              <h3 className={`font-bold text-sm tracking-wide truncate ${label}`}>{column.title}</h3>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <span className={`text-xs font-black px-2.5 py-0.5 rounded-full ${count}`}>
                {tasks.length}
              </span>
              {onToggleCollapse && (
                <button
                  type="button"
                  onClick={() => onToggleCollapse(column.id)}
                  title={`Colapsar ${column.title}`}
                  aria-label={`Colapsar ${column.title}`}
                  className={`grid place-items-center w-9 h-9 sm:w-7 sm:h-7 rounded-md hover:bg-black/10 active:bg-black/20 transition ${label}`}
                >
                  <ChevronLeft size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Drop zone */}
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 min-h-[200px] p-2 rounded-b-xl transition-colors duration-150 ${snapshot.isDraggingOver ? dragOver : ''}`}
          >
            {tasks.length === 0 && (
              <div
                className={`flex items-center justify-center h-24 text-xs font-medium italic border-2 border-dashed rounded-lg mx-1 transition-all duration-150 ${
                  snapshot.isDraggingOver
                    ? (isDark ? 'text-blue-300 border-blue-500/70 bg-blue-500/5' : 'text-blue-600 border-blue-400 bg-blue-50')
                    : emptyText
                }`}
              >
                {snapshot.isDraggingOver ? 'Suelta aquí' : 'Sin órdenes aquí'}
              </div>
            )}
            {tasks.map((task, index) => (
              <KanbanTask key={task.id} task={task} index={index} onOpen={onOpen} />
            ))}
            {provided.placeholder}
          </div>
        </div>
      )}
    </Droppable>
  );
}

export default KanbanColumn;
