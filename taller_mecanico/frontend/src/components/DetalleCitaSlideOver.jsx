import React, { useState, useContext } from 'react';
import { X, Calendar, Clock, Loader2, Car, Wrench, Receipt, FileText, Ban, ClipboardCheck, ArrowRight } from 'lucide-react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function DetalleCitaSlideOver({ isOpen, onClose, cita, onUpdate }) {
    const { authTokens } = useContext(AuthContext);
    const { isDark } = useTheme();
    const [isCancelling, setIsCancelling] = useState(false);
    const [error, setError] = useState(null);

    // Si no está abierto o no hay cita, no renderizar funcionalidad
    if (!isOpen || !cita) {
        return null; // El backdrop de transición se puede manejar, pero devolvemos null por rapidez si no hay cita
    }

    const modalBg = isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200';
    const textPrimary = isDark ? 'text-white' : 'text-slate-900';
    const textSecondary = isDark ? 'text-slate-400' : 'text-slate-500';
    const sectionBg = isDark ? 'bg-slate-800' : 'bg-slate-50';
    const sectionBorder = isDark ? 'border-slate-700' : 'border-slate-200';

    const getBadgeStyle = (estado) => {
        switch (estado) {
            case 'PENDIENTE': return isDark ? 'bg-amber-900/40 text-amber-500 border-amber-800' : 'bg-amber-100 text-amber-800 border-amber-200';
            case 'CONFIRMADA': return isDark ? 'bg-blue-900/40 text-blue-400 border-blue-800' : 'bg-blue-100 text-blue-800 border-blue-200';
            case 'COMPLETADA': return isDark ? 'bg-emerald-900/40 text-emerald-400 border-emerald-800' : 'bg-emerald-100 text-emerald-800 border-emerald-200';
            case 'CANCELADA': return isDark ? 'bg-red-900/40 text-red-400 border-red-800' : 'bg-red-100 text-red-800 border-red-200';
            case 'LISTO': return isDark ? 'bg-purple-900/40 text-purple-400 border-purple-800' : 'bg-purple-100 text-purple-800 border-purple-200';
            default: return isDark ? 'bg-slate-700 text-slate-300 border-slate-600' : 'bg-slate-100 text-slate-800 border-slate-200';
        }
    };

    const handleCancelar = async () => {
        if (!window.confirm("¿Seguro que deseas anular esta cita? Esta acción notificará al cliente.")) return;
        
        setIsCancelling(true);
        setError(null);
        try {
            await axios.patch(`http://localhost:8000/api/v1/citas/${cita.id}/cancelar/`, {}, {
                headers: {
                    'Authorization': `Bearer ${authTokens.access}`
                }
            });
            onUpdate(); // Recarga la tabla de citas
            onClose(); // Cierra el modal
        } catch (err) {
            setError(err.response?.data?.error || "Ocurrió un error al cancelar la cita");
        } finally {
            setIsCancelling(false);
        }
    };

    const isCancelable = cita.estado !== 'COMPLETADA' && cita.estado !== 'CANCELADA';

    return (
        <div className="fixed inset-0 overflow-hidden z-[100]">
            <div className={`absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0'}`} onClick={onClose} />
            <div className="fixed inset-y-0 right-0 flex max-w-full pl-10 sm:pl-16">
                <div className={`w-screen max-w-xl transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                    <div className={`flex h-full flex-col shadow-2xl ${modalBg} border-l`}>
                        
                        {/* Header */}
                        <div className={`px-6 py-5 border-b ${sectionBorder} bg-gradient-to-r ${isDark ? 'from-slate-800 to-slate-900' : 'from-slate-50 to-white'} flex items-center justify-between`}>
                            <div>
                                <h2 className={`text-xl font-bold ${textPrimary}`}>Detalle de Cita #{cita.id}</h2>
                                <p className={`text-sm mt-1 flex items-center gap-2 ${textSecondary}`}>
                                    <Clock size={14} /> Creada el {new Date(cita.creada_el).toLocaleDateString()}
                                </p>
                            </div>
                            <button onClick={onClose} className={`rounded-full p-2 hover:bg-slate-500/10 transition-colors ${textSecondary} hover:${textPrimary}`}>
                                <X size={20} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6 flex flex-col">
                            
                            {error && (
                                <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg text-sm flex gap-3 items-start">
                                    <FileText className="shrink-0 mt-0.5" size={16} />
                                    <span>{error}</span>
                                </div>
                            )}

                            {/* Fila de Status y Fecha */}
                            <div className={`flex justify-between items-center p-4 rounded-xl border ${sectionBorder} ${sectionBg}`}>
                                <div>
                                    <p className={`text-xs uppercase font-bold tracking-wider mb-1 ${textSecondary}`}>Estado de Cita</p>
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getBadgeStyle(cita.estado)}`}>
                                        {cita.estado}
                                    </span>
                                </div>
                                <div className="text-right">
                                    <p className={`text-xs uppercase font-bold tracking-wider mb-1 ${textSecondary}`}>Agendada para</p>
                                    <h3 className={`font-bold ${textPrimary}`}>{new Date(cita.fecha + 'T00:00:00').toLocaleDateString()}</h3>
                                    <p className={`text-sm ${textSecondary}`}>{cita.hora_inicio.slice(0, 5)} a {cita.hora_fin.slice(0, 5)}</p>
                                </div>
                            </div>

                            {/* Grid 2 Columnas: Vehiculo y Servicio */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Vehículo */}
                                <div>
                                    <h4 className={`text-base font-bold flex items-center gap-2 mb-3 ${textPrimary}`}>
                                        <Car size={18} className="text-blue-500" /> Vehículo
                                    </h4>
                                    <div className={`border rounded-xl overflow-hidden ${sectionBorder}`}>
                                        <table className={`w-full text-sm divide-y ${sectionBorder}`}>
                                            <tbody className={`divide-y ${sectionBorder}`}>
                                                <tr className={`${isDark ? 'bg-slate-800/50' : 'bg-white'}`}>
                                                    <td className={`py-2 px-3 font-medium ${textSecondary}`}>Marca</td>
                                                    <td className={`py-2 px-3 font-semibold ${textPrimary}`}>{cita.vehiculo.marca}</td>
                                                </tr>
                                                <tr className={`${sectionBg}`}>
                                                    <td className={`py-2 px-3 font-medium ${textSecondary}`}>Modelo / Año</td>
                                                    <td className={`py-2 px-3 font-semibold ${textPrimary}`}>{cita.vehiculo.modelo} ({cita.vehiculo.año})</td>
                                                </tr>
                                                <tr className={`${isDark ? 'bg-slate-800/50' : 'bg-white'}`}>
                                                    <td className={`py-2 px-3 font-medium ${textSecondary}`}>Placa</td>
                                                    <td className={`py-2 px-3 font-bold text-blue-500`}>{cita.vehiculo.placa}</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className={`mt-3 flex items-center gap-2 text-sm ${textSecondary}`}>
                                        <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-[10px]">
                                            {cita.cliente?.first_name ? cita.cliente.first_name[0] : 'U'}
                                        </div>
                                        <span>Propietario: <span className={`font-medium ${textPrimary}`}>{cita.cliente?.first_name} {cita.cliente?.last_name}</span></span>
                                    </div>
                                </div>

                                {/* Servicio */}
                                <div>
                                    <h4 className={`text-base font-bold flex items-center gap-2 mb-3 ${textPrimary}`}>
                                        <Wrench size={18} className="text-orange-500" /> Detalle Servicio
                                    </h4>
                                    <div className={`border rounded-xl overflow-hidden ${sectionBorder}`}>
                                        <table className={`w-full text-sm divide-y ${sectionBorder}`}>
                                            <tbody className={`divide-y ${sectionBorder}`}>
                                                <tr className={`${isDark ? 'bg-slate-800/50' : 'bg-white'}`}>
                                                    <td className={`py-2 px-3 font-medium ${textSecondary}`}>Categoría</td>
                                                    <td className={`py-2 px-3 font-semibold ${textPrimary}`}>{cita.servicio.categoria_display}</td>
                                                </tr>
                                                <tr className={`${sectionBg}`}>
                                                    <td className={`py-2 px-3 align-top font-medium ${textSecondary}`}>Servicio</td>
                                                    <td className={`py-2 px-3 font-semibold ${textPrimary}`}>{cita.servicio.nombre}</td>
                                                </tr>
                                                <tr className={`${isDark ? 'bg-slate-800/50' : 'bg-white'}`}>
                                                    <td className={`py-2 px-3 font-medium ${textSecondary}`}>Precio Aprox.</td>
                                                    <td className={`py-2 px-3 font-bold text-emerald-500`}>Q{cita.servicio.precio}</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>

                            {/* Notas si existen */}
                            {cita.notas && (
                                <div>
                                    <h4 className={`text-sm font-bold flex items-center gap-2 mb-2 ${textSecondary}`}>
                                        <FileText size={16} /> Notas del Cliente / Adicionales
                                    </h4>
                                    <div className={`p-4 rounded-xl border ${sectionBorder} ${sectionBg} text-sm ${textPrimary}`}>
                                        {cita.notas}
                                    </div>
                                </div>
                            )}

                        </div>

                        {/* Footer (Acciones) */}
                        <div className={`border-t ${sectionBorder} ${sectionBg} p-4 sm:px-6 flex flex-col sm:flex-row gap-3 justify-between items-center shrink-0`}>
                            <div className="flex gap-2 w-full sm:w-auto">
                                <button
                                    onClick={onClose}
                                    className={`flex-1 sm:flex-none border rounded-lg px-4 py-2 font-semibold text-sm transition-colors ${
                                        isDark 
                                        ? 'border-slate-600 bg-slate-800 text-slate-300 hover:bg-slate-700' 
                                        : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                                    }`}
                                >
                                    Volver
                                </button>
                                
                                {isCancelable && (
                                    <button
                                        onClick={handleCancelar}
                                        disabled={isCancelling}
                                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 border border-red-500/30 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg px-4 py-2 font-semibold text-sm transition-colors disabled:opacity-50"
                                    >
                                        {isCancelling ? <Loader2 size={16} className="animate-spin" /> : <Ban size={16} />}
                                        Anular
                                    </button>
                                )}
                            </div>

                            {/* Botón Principal (CheckIn / Orden) */}
                            <div className="w-full sm:w-auto mt-2 sm:mt-0">
                                {!cita.tiene_orden ? (
                                    <button 
                                        onClick={() => window.location.href = `http://localhost:8000/taller/orden/crear-desde-cita/${cita.id}/`}
                                        className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-5 py-2 font-bold text-sm transition-colors shadow-sm"
                                    >
                                        <ClipboardCheck size={18} />
                                        Ingresar al Taller
                                        <ArrowRight size={16} className="ml-1 opacity-70" />
                                    </button>
                                ) : (
                                    <button 
                                        onClick={() => window.location.href = `http://localhost:8000/taller/orden/${cita.orden_trabajo_id}/`}
                                        className="w-full sm:w-auto flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-5 py-2 font-bold text-sm transition-colors shadow-sm"
                                    >
                                        <Receipt size={18} />
                                        Ver Orden de Trabajo
                                    </button>
                                )}
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}
