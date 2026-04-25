import React, { useMemo } from 'react';
import { Calendar as BigCalendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, isBefore, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import '../styles/calendar-theme.css';

// ---------------------------------------------------------------------------
// Localizer es-ES — week starts on Monday.
// ---------------------------------------------------------------------------
const locales = { es };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (d) => startOfWeek(d, { weekStartsOn: 1 }),
  getDay,
  locales,
});

const messages = {
  date: 'Fecha',
  time: 'Hora',
  event: 'Cita',
  allDay: 'Todo el día',
  week: 'Semana',
  work_week: 'Semana laboral',
  day: 'Día',
  month: 'Mes',
  previous: '‹',
  next: '›',
  yesterday: 'Ayer',
  tomorrow: 'Mañana',
  today: 'Hoy',
  agenda: 'Agenda',
  noEventsInRange: 'No hay citas en este rango.',
  showMore: (n) => `+ ${n} más`,
};

// Colores por estado — mapean a las mismas paletas usadas en la tabla y el Kanban.
const estadoColor = (estado, isDark) => {
  switch (estado) {
    case 'PENDIENTE':
      return { bg: isDark ? '#78350f33' : '#fef3c7', border: '#f59e0b', text: isDark ? '#fde68a' : '#92400e' };
    case 'CONFIRMADA':
      return { bg: isDark ? '#1e3a8a66' : '#dbeafe', border: '#3b82f6', text: isDark ? '#bfdbfe' : '#1e40af' };
    case 'LISTO':
      return { bg: isDark ? '#064e3b66' : '#d1fae5', border: '#10b981', text: isDark ? '#a7f3d0' : '#065f46' };
    case 'COMPLETADA':
      return { bg: isDark ? '#33415566' : '#e2e8f0', border: '#64748b', text: isDark ? '#cbd5e1' : '#334155' };
    case 'CANCELADA':
      return { bg: isDark ? '#7f1d1d66' : '#fee2e2', border: '#ef4444', text: isDark ? '#fecaca' : '#991b1b' };
    default:
      return { bg: isDark ? '#33415566' : '#f1f5f9', border: '#94a3b8', text: isDark ? '#cbd5e1' : '#475569' };
  }
};

/**
 * Umbrales del heatmap por día. Conservadores: son por día total (todas las
 * categorías). Cuando PR #5 (ConfiguracionTaller) esté en main, se pueden
 * reemplazar por un cálculo contra `capacidad * horas laborables`.
 */
const HEATMAP_TIERS = [
  { min: 7, light: 'rgba(239,68,68,0.10)', dark: 'rgba(239,68,68,0.16)' },   // rojo
  { min: 4, light: 'rgba(245,158,11,0.10)', dark: 'rgba(245,158,11,0.16)' }, // amarillo
  { min: 1, light: 'rgba(16,185,129,0.08)', dark: 'rgba(16,185,129,0.14)' }, // verde
];

export default function CitasCalendarView({
  citas,
  isDark,
  onSelectSlot,
  onSelectEvent,
  defaultDate,
  onNavigate,
}) {
  // --- Eventos derivados de las citas -----------------------------------
  const events = useMemo(
    () =>
      citas
        .map((c) => {
          if (!c?.fecha || !c?.hora_inicio || !c?.hora_fin) return null;
          // Construimos Date local (sin Z) para evitar saltos de zona horaria.
          const start = new Date(`${c.fecha}T${c.hora_inicio}`);
          const end = new Date(`${c.fecha}T${c.hora_fin}`);
          if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
          const placa = c.vehiculo?.placa || '';
          const servicio = c.servicio?.nombre || 'Cita';
          return {
            id: c.id,
            title: placa ? `${servicio} · ${placa}` : servicio,
            start,
            end,
            resource: c,
          };
        })
        .filter(Boolean),
    [citas]
  );

  // --- Conteo por día para el heatmap ----------------------------------
  const countsByDay = useMemo(() => {
    const map = new Map();
    for (const c of citas) {
      if (!c?.fecha || c.estado === 'CANCELADA') continue;
      map.set(c.fecha, (map.get(c.fecha) || 0) + 1);
    }
    return map;
  }, [citas]);

  const today = useMemo(() => startOfDay(new Date()), []);

  const dayPropGetter = (date) => {
    const day = startOfDay(date);
    const isPast = isBefore(day, today);
    const key = format(day, 'yyyy-MM-dd');
    const count = countsByDay.get(key) || 0;

    if (isPast) {
      return {
        className: 'rbc-past-day',
        style: { opacity: 0.55, cursor: 'not-allowed' },
      };
    }

    for (const tier of HEATMAP_TIERS) {
      if (count >= tier.min) {
        return { style: { backgroundColor: isDark ? tier.dark : tier.light } };
      }
    }
    return {};
  };

  const eventPropGetter = (event) => {
    const c = estadoColor(event.resource?.estado, isDark);
    return {
      style: {
        backgroundColor: c.bg,
        borderLeft: `3px solid ${c.border}`,
        color: c.text,
        borderRadius: 4,
        padding: '2px 4px',
        fontSize: 12,
        fontWeight: 600,
      },
    };
  };

  const slotPropGetter = (date) => {
    if (isBefore(date, new Date())) {
      return { style: { opacity: 0.5 } };
    }
    return {};
  };

  return (
    <div className="rbc-autoservi" style={{ height: 720 }}>
      <BigCalendar
        localizer={localizer}
        messages={messages}
        culture="es"
        events={events}
        defaultView={Views.MONTH}
        views={[Views.MONTH, Views.WEEK, Views.DAY]}
        selectable
        popup
        defaultDate={defaultDate || new Date()}
        onNavigate={onNavigate}
        onSelectSlot={(slot) => {
          // Bloquear creación en el pasado.
          if (isBefore(startOfDay(slot.start), today)) return;
          onSelectSlot?.(slot);
        }}
        onSelectEvent={(event) => onSelectEvent?.(event.resource)}
        dayPropGetter={dayPropGetter}
        eventPropGetter={eventPropGetter}
        slotPropGetter={slotPropGetter}
        min={new Date(2000, 0, 1, 7, 0)}
        max={new Date(2000, 0, 1, 20, 0)}
        step={30}
        timeslots={2}
      />
    </div>
  );
}
