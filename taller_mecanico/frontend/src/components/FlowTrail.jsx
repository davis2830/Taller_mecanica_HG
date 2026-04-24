/**
 * FlowTrail — Cadena visual Cita → OT → Factura
 * 
 * Props:
 *   citaId       number | null
 *   ordenId      number | null
 *   facturaId    number | null
 *   facturaNum   string | null   (número legible, ej: "F-2026-000001")
 *   facturaEstado string | null  ('BORRADOR' | 'EMITIDA' | 'ANULADA')
 *   isDark       bool
 *   onOpenOrden  fn(ordenId)     → abre el SlideOver de OT
 *   onNavCalendar fn()           → navega al calendario de citas
 *   onNavFacturas fn()           → navega a facturación
 *   compact      bool            → versión pequeña (solo badges, sin labels)
 */
import React from 'react';
import { Calendar, Wrench, Receipt, ChevronRight } from 'lucide-react';

const FACTURA_COLOR = {
    BORRADOR: { dark: 'bg-amber-900/40 text-amber-300 border-amber-700/40',   light: 'bg-amber-50 text-amber-700 border-amber-200'   },
    EMITIDA:  { dark: 'bg-emerald-900/40 text-emerald-300 border-emerald-700/40', light: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    ANULADA:  { dark: 'bg-red-900/40 text-red-300 border-red-700/40',         light: 'bg-red-50 text-red-600 border-red-200'         },
};

function TrailBadge({ icon, label, value, onClick, isDark, colorClass, title }) {
    const base = `inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-xs font-bold transition-all ${colorClass}`;
    const interactive = onClick ? 'cursor-pointer hover:scale-105 hover:shadow-sm' : 'cursor-default';

    if (!value) {
        return (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-xs font-medium ${isDark ? 'border-slate-700 text-slate-600 bg-slate-800/40' : 'border-slate-200 text-slate-300 bg-slate-50'}`}>
                {icon}
                {!title || <span className="opacity-60">{label}: —</span>}
            </span>
        );
    }

    return (
        <button
            onClick={onClick}
            title={title}
            className={`${base} ${interactive}`}
        >
            {icon}
            {label && <span className="font-normal opacity-70 hidden sm:inline">{label}:</span>}
            <span>{value}</span>
        </button>
    );
}

export default function FlowTrail({
    citaId,
    ordenId,
    facturaId,
    facturaNum,
    facturaEstado,
    isDark,
    onOpenOrden,
    onNavCalendar,
    onNavFacturas,
    compact = false,
}) {
    const sep = (
        <ChevronRight
            size={11}
            className={isDark ? 'text-slate-600' : 'text-slate-300'}
        />
    );

    const facturaColor = FACTURA_COLOR[facturaEstado] || FACTURA_COLOR.BORRADOR;

    // Badge colors
    const citaColor  = isDark ? 'bg-blue-900/40 text-blue-300 border-blue-700/40'     : 'bg-blue-50 text-blue-700 border-blue-200';
    const ordenColor = isDark ? 'bg-violet-900/40 text-violet-300 border-violet-700/40' : 'bg-violet-50 text-violet-700 border-violet-200';
    const fColor     = isDark ? facturaColor.dark : facturaColor.light;

    return (
        <div className="flex items-center gap-1 flex-wrap">
            {/* Cita */}
            <TrailBadge
                icon={<Calendar size={10} />}
                label={compact ? '' : 'Cita'}
                value={citaId ? `#${citaId}` : null}
                onClick={citaId && onNavCalendar ? onNavCalendar : null}
                isDark={isDark}
                colorClass={citaColor}
                title={citaId ? `Ver Cita #${citaId} en el Calendario` : null}
            />
            {sep}
            {/* OT */}
            <TrailBadge
                icon={<Wrench size={10} />}
                label={compact ? '' : 'OT'}
                value={ordenId ? `#${String(ordenId).padStart(5, '0')}` : null}
                onClick={ordenId && onOpenOrden ? () => onOpenOrden(ordenId) : null}
                isDark={isDark}
                colorClass={ordenColor}
                title={ordenId ? `Ver Orden de Trabajo #${ordenId}` : null}
            />
            {sep}
            {/* Factura */}
            <TrailBadge
                icon={<Receipt size={10} />}
                label={compact ? '' : 'Factura'}
                value={facturaId ? (facturaNum || `#${facturaId}`) : null}
                onClick={facturaId && onNavFacturas ? onNavFacturas : null}
                isDark={isDark}
                colorClass={fColor}
                title={facturaId ? `Ver Factura ${facturaNum || facturaId} en Facturación` : null}
            />
        </div>
    );
}
