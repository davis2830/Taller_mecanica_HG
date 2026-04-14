import React, { useEffect, useContext } from 'react';
import { X, Calendar, Clock, Wrench, Truck, FileText, ExternalLink } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useNavigate } from 'react-router-dom';

const ESTADO_CONFIG = {
    PENDIENTE: { color: 'bg-amber-400', text: 'text-amber-500', label: 'Pendiente' },
    CONFIRMADA: { color: 'bg-blue-400', text: 'text-blue-400', label: 'Confirmada' },
    COMPLETADA: { color: 'bg-emerald-400', text: 'text-emerald-400', label: 'Completada' },
    CANCELADA: { color: 'bg-red-400', text: 'text-red-400', label: 'Cancelada' },
    LISTO: { color: 'bg-purple-400', text: 'text-purple-400', label: 'Listo' },
};

export default function HistorialVehiculoSlideOver({ isOpen, onClose, vehiculo, citas = [], recepciones = [] }) {
    const { isDark } = useTheme();
    const navigate = useNavigate();

    const bg = isDark ? 'bg-slate-900' : 'bg-white';
    const overlay = isDark ? 'bg-slate-900/60' : 'bg-black/30';
    const border = isDark ? 'border-slate-700' : 'border-slate-200';
    const textPrimary = isDark ? 'text-white' : 'text-slate-900';
    const subText = isDark ? 'text-slate-400' : 'text-slate-500';
    const sectionBg = isDark ? 'bg-slate-800' : 'bg-slate-50';

    // Combinar y ordenar eventos
    const timeline = [
        ...citas.map(c => ({
            type: 'cita',
            date: c.fecha,
            data: c,
        })),
        ...recepciones.map(r => ({
            type: 'recepcion',
            date: r.fecha_ingreso?.slice(0, 10),
            data: r,
        })),
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    return (
        <>
            <div
                className={`fixed inset-0 z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'} ${overlay}`}
                onClick={onClose}
            />
            <div className={`fixed right-0 top-0 h-full z-50 flex flex-col w-full max-w-xl shadow-2xl transition-transform duration-300 ease-out ${isOpen ? 'translate-x-0' : 'translate-x-full'} ${bg} border-l ${border}`}>
                
                {/* Header */}
                <div className={`shrink-0 px-6 py-5 border-b ${border} ${isDark ? 'bg-slate-800' : 'bg-slate-50'}`}>
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-purple-500/20 rounded-xl">
                                <FileText size={22} className="text-purple-400" />
                            </div>
                            <div>
                                <h2 className={`text-lg font-bold ${textPrimary}`}>Historial del Vehículo</h2>
                                {vehiculo && (
                                    <p className={`text-sm ${subText}`}>
                                        {vehiculo.marca} {vehiculo.modelo} — <span className="font-mono font-bold text-purple-400">{vehiculo.placa}</span>
                                    </p>
                                )}
                            </div>
                        </div>
                        <button onClick={onClose} className={`p-2 rounded-lg hover:bg-slate-700/30 transition-colors ${subText}`}>
                            <X size={20} />
                        </button>
                    </div>

                    {vehiculo && (
                        <div className={`mt-4 grid grid-cols-3 gap-3`}>
                            <div className={`${sectionBg} rounded-xl p-3 border ${border} text-center`}>
                                <p className={`text-xs ${subText}`}>Total Citas</p>
                                <p className={`text-xl font-bold ${textPrimary}`}>{citas.length}</p>
                            </div>
                            <div className={`${sectionBg} rounded-xl p-3 border ${border} text-center`}>
                                <p className={`text-xs ${subText}`}>Recepciones</p>
                                <p className={`text-xl font-bold ${textPrimary}`}>{recepciones.length}</p>
                            </div>
                            <div className={`${sectionBg} rounded-xl p-3 border ${border} text-center`}>
                                <p className={`text-xs ${subText}`}>Completadas</p>
                                <p className={`text-xl font-bold text-emerald-400`}>
                                    {citas.filter(c => c.estado === 'COMPLETADA').length}
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Timeline */}
                <div className="flex-1 overflow-y-auto p-6">
                    {timeline.length === 0 ? (
                        <div className={`flex flex-col items-center justify-center py-20 text-center`}>
                            <FileText className={`mb-3 opacity-30 ${isDark ? 'text-slate-500' : 'text-slate-300'}`} size={48} />
                            <p className={`font-semibold ${textPrimary}`}>Sin historial registrado</p>
                            <p className={`text-sm mt-1 ${subText}`}>Este vehículo no tiene visitas registradas aún.</p>
                        </div>
                    ) : (
                        <div className="relative">
                            {/* Línea vertical */}
                            <div className={`absolute left-5 top-2 bottom-2 w-0.5 ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`} />
                            
                            <div className="space-y-4">
                                {timeline.map((item, idx) => {
                                    if (item.type === 'cita') {
                                        const cita = item.data;
                                        const cfg = ESTADO_CONFIG[cita.estado] || ESTADO_CONFIG.PENDIENTE;
                                        return (
                                            <div key={`cita-${cita.id}`} className="relative flex gap-4 pl-12">
                                                {/* Ícono en timeline */}
                                                <div className={`absolute left-3 w-4 h-4 rounded-full border-2 border-white ${cfg.color}`} style={{ top: '10px' }} />
                                                
                                                <div className={`flex-1 rounded-xl border ${border} ${sectionBg} p-4`}>
                                                    <div className="flex items-start justify-between mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <Wrench size={14} className="text-orange-400" />
                                                            <span className={`text-sm font-bold ${textPrimary}`}>{cita.servicio?.nombre}</span>
                                                        </div>
                                                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                                                            isDark ? `border-slate-700 ${cfg.text}` : `border-slate-200 ${cfg.text}`
                                                        }`}>
                                                            {cfg.label}
                                                        </span>
                                                    </div>
                                                    <div className={`flex gap-3 text-xs ${subText}`}>
                                                        <span className="flex items-center gap-1">
                                                            <Calendar size={11} />
                                                            {new Date(cita.fecha + 'T00:00:00').toLocaleDateString('es-GT', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <Clock size={11} />
                                                            {cita.hora_inicio?.slice(0, 5)}
                                                        </span>
                                                    </div>
                                                    {cita.notas && (
                                                        <p className={`text-xs mt-2 italic ${subText}`}>"{cita.notas}"</p>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    } else {
                                        const r = item.data;
                                        return (
                                            <div key={`rec-${r.id}`} className="relative flex gap-4 pl-12">
                                                <div className={`absolute left-3 w-4 h-4 rounded-full border-2 border-white bg-blue-500`} style={{ top: '10px' }} />
                                                
                                                <div className={`flex-1 rounded-xl border ${border} ${isDark ? 'bg-blue-950/30 border-blue-900/50' : 'bg-blue-50 border-blue-200'} p-4`}>
                                                    <div className="flex items-center justify-between gap-2 mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <Truck size={14} className="text-blue-400" />
                                                            <span className={`text-sm font-bold ${textPrimary}`}>Recepción / Check-In</span>
                                                        </div>
                                                        <button
                                                            onClick={() => { onClose(); navigate(`/citas/recepcion/${r.id}/boleta`); }}
                                                            className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 font-semibold transition-colors"
                                                        >
                                                            <ExternalLink size={12} /> Ver Boleta
                                                        </button>
                                                    </div>
                                                    <div className={`text-xs ${subText} space-y-1`}>
                                                        <p className="flex items-center gap-1">
                                                            <Calendar size={11} />
                                                            {new Date(r.fecha_ingreso).toLocaleString('es-GT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                        </p>
                                                        {r.kilometraje && <p>🛣️ Km: <strong className={textPrimary}>{r.kilometraje.toLocaleString()}</strong></p>}
                                                        {r.nivel_gasolina && <p>⛽ Gasolina: <strong className={textPrimary}>{r.nivel_gasolina}</strong></p>}
                                                        {r.motivo_ingreso && <p className="mt-1 italic">"{r.motivo_ingreso}"</p>}
                                                        {r.recibido_por_nombre && <p>Recibido por: <strong className={textPrimary}>{r.recibido_por_nombre}</strong></p>}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    }
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
