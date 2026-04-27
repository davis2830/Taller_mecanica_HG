import React from 'react';
import ReactDOM from 'react-dom';
import { Draggable } from '@hello-pangea/dnd';
import { Clock, Wrench, CheckCircle, User, Package, Truck, FileText } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import FlowTrail from './FlowTrail';

const STATE_CONFIG = {
  EN_ESPERA:           { bar: '#94a3b8', label: 'En Espera',     icon: <Clock size={11} />,       darkBadge: '#1e293b', darkText: '#94a3b8',   lightBadge: '#f1f5f9', lightText: '#475569'  },
  EN_REVISION:         { bar: '#3b82f6', label: 'En Revisión',   icon: <Wrench size={11} />,      darkBadge: '#172554', darkText: '#93c5fd',   lightBadge: '#dbeafe', lightText: '#1d4ed8'  },
  COTIZACION:          { bar: '#06b6d4', label: 'Cotización',    icon: <FileText size={11} />,    darkBadge: '#083344', darkText: '#67e8f9',   lightBadge: '#cffafe', lightText: '#155e75'  },
  ESPERANDO_REPUESTOS: { bar: '#f59e0b', label: 'Esp. Repuesto', icon: <Package size={11} />,     darkBadge: '#431407', darkText: '#fcd34d',   lightBadge: '#fef3c7', lightText: '#92400e'  },
  LISTO:               { bar: '#10b981', label: 'Listo',          icon: <CheckCircle size={11} />, darkBadge: '#022c22', darkText: '#6ee7b7',   lightBadge: '#d1fae5', lightText: '#065f46'  },
  ENTREGADO:           { bar: '#a855f7', label: 'Entregado',      icon: <Truck size={11} />,       darkBadge: '#2e1065', darkText: '#d8b4fe',   lightBadge: '#ede9fe', lightText: '#6d28d9'  },
};

/**
 * Get or create a portal container directly in document.body.
 * document.body never has CSS transforms, so position:fixed children
 * of this portal always use true viewport coordinates — fixing the
 * classic @hello-pangea/dnd offset bug caused by transformed ancestors.
 */
function getDragPortal() {
  let el = document.getElementById('kanban-drag-portal');
  if (!el) {
    el = document.createElement('div');
    el.id = 'kanban-drag-portal';
    document.body.appendChild(el);
  }
  return el;
}

function KanbanTask({ task, index, onOpen }) {
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const cfg = STATE_CONFIG[task.estado] ?? STATE_CONFIG.EN_ESPERA;

  return (
    <Draggable draggableId={task.id.toString()} index={index}>
      {(provided, snapshot) => {
        // Enriquecer la animación sin pisar el transform que usa @hello-pangea/dnd
        // para seguir el cursor: concatenamos un rotate() mientras se arrastra y
        // un scale() durante la animación de soltado.
        const dndStyle = provided.draggableProps.style || {};
        let transform = dndStyle.transform;
        if (snapshot.isDragging && !snapshot.isDropAnimating && transform) {
          transform = `${transform} rotate(2.5deg)`;
        } else if (snapshot.isDropAnimating && transform) {
          transform = `${transform} scale(0.96)`;
        }
        // Solo transicionamos propiedades no-transform (el transform ya lo maneja
        // la librería con su curva de drop animation).
        const nonTransformTransition =
          'background-color 180ms ease, border-color 180ms ease, box-shadow 220ms ease';
        const mergedTransition = dndStyle.transition
          ? `${dndStyle.transition}, ${nonTransformTransition}`
          : nonTransformTransition;

        const card = (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            onClick={() => !snapshot.isDragging && onOpen(task.id)}
            style={{
              // Estilos base PRIMERO — así los dndStyle de la librería los sobreescriben
              // durante el drag. ⚠️ Crítico: NO forzar `position: 'relative'` después del
              // spread de dndStyle; durante el drag la librería emite `position: 'fixed'`
              // con coords de viewport, y si lo pisamos con 'relative' el clone portalizado
              // queda posicionado relativo a su nodo en el flow del body (fuera del viewport,
              // "al fondo de la página").
              position: 'relative', // para la accent bar cuando NO está arrastrando
              borderRadius: 10,
              marginBottom: 8,
              overflow: 'hidden',
              userSelect: 'none',
              cursor: snapshot.isDragging ? 'grabbing' : 'grab',
              backgroundColor: snapshot.isDragging
                ? (isDark ? '#0f172a' : '#e2e8f0')
                : (isDark ? '#1e293b' : '#ffffff'),
              border: snapshot.isDragging
                ? `1.5px solid ${isDark ? 'rgba(99,179,237,0.7)' : 'rgba(59,130,246,0.6)'}`
                : `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.09)'}`,
              boxShadow: snapshot.isDragging
                ? `0 24px 50px -10px ${isDark ? 'rgba(0,0,0,0.85)' : 'rgba(15,23,42,0.28)'},
                   0 0 0 3px ${isDark ? 'rgba(99,179,237,0.35)' : 'rgba(59,130,246,0.28)'}`
                : `0 1px 3px ${isDark ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.07)'}`,
              // dnd styles DESPUÉS: sobreescriben position/top/left/width/transform/etc.
              // durante el drag (position: 'fixed' gana sobre 'relative' de arriba).
              ...dndStyle,
              // Nuestras customizaciones de transform/transition ENCIMA del dnd transform
              // (ya incluyen el translate del dndStyle concatenado con rotate/scale).
              transform,
              transition: mergedTransition,
            }}
          >
            {/* Accent bar */}
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, backgroundColor: cfg.bar }} />

            <div style={{ paddingLeft: 13, paddingRight: 11, paddingTop: 11, paddingBottom: 10 }}>

              {/* Placa + badge */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginBottom: 6 }}>
                <span style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.07em', color: isDark ? '#f1f5f9' : '#0f172a' }}>
                  {task.vehiculo?.placa || 'S/N'}
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 9999, backgroundColor: isDark ? cfg.darkBadge : cfg.lightBadge, color: isDark ? cfg.darkText : cfg.lightText, whiteSpace: 'nowrap' }}>
                  {cfg.icon} {cfg.label}
                </span>
              </div>

              {/* Marca / Modelo */}
              <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.3, color: isDark ? '#cbd5e1' : '#334155' }}>
                {task.vehiculo?.marca || 'Marca'} {task.vehiculo?.modelo || ''}
                {task.vehiculo?.año && <span style={{ fontWeight: 400, marginLeft: 4, color: isDark ? '#64748b' : '#94a3b8' }}>({task.vehiculo.año})</span>}
              </div>

              {/* Servicio */}
              <div style={{ fontSize: 11, marginTop: 3, color: isDark ? '#64748b' : '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {task.cita?.servicio?.nombre || 'Diagnóstico General'}
              </div>

              {/* Footer */}
              <div style={{ marginTop: 9, paddingTop: 7, borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: isDark ? '#64748b' : '#94a3b8', minWidth: 0, flex: 1 }}>
                    <User size={11} style={{ flexShrink: 0 }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {task.mecanico_asignado
                        ? `${task.mecanico_asignado.first_name} ${task.mecanico_asignado.last_name || ''}`.trim()
                        : <span style={{ color: '#f59e0b', fontWeight: 600 }}>Sin asignar</span>
                      }
                    </span>
                  </div>
                  {task.repuestos?.length > 0 && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 700, color: '#10b981', flexShrink: 0 }}>
                      <Package size={10} /> {task.repuestos.length}
                    </span>
                  )}
                </div>
                {/* Flow Trail */}
                <div
                  style={{ marginTop: 7 }}
                  onClick={e => { e.stopPropagation(); }}
                >
                  <FlowTrail
                    citaId={task.cita?.id}
                    recepcionId={task.recepcion_id}
                    ordenId={task.id}
                    facturaId={task.factura_id}
                    facturaNum={task.factura_numero}
                    facturaEstado={task.factura_estado}
                    isDark={isDark}
                    compact
                    onOpenOrden={null}
                    onOpenRecepcion={(id) => navigate(`/citas/recepcion/${id}/boleta`)}
                    onNavCalendar={() => navigate('/citas/calendario')}
                    onNavFacturas={() => navigate('/facturacion')}
                  />
                </div>
              </div>
            </div>
          </div>
        );

        // Portal: when @hello-pangea/dnd sets position:'fixed' on the dragged
        // element, any CSS transform on an ancestor will trap it inside that
        // ancestor's coordinate system (CSS spec §9.6). Rendering via a direct
        // child of document.body guarantees true viewport coordinates.
        if (snapshot.isDragging) {
          return ReactDOM.createPortal(card, getDragPortal());
        }

        return card;
      }}
    </Draggable>
  );
}

export default KanbanTask;
