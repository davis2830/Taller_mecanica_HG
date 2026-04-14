import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Calendar, Clock, Car, Wrench, Ban, HelpCircle, CheckCircle2 } from 'lucide-react';
import NuevaCitaSlideOver from '../../components/NuevaCitaSlideOver';

export default function MisCitasList() {
    const { authTokens, logoutUser } = useContext(AuthContext);
    const { isDark } = useTheme();
    const [citas, setCitas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isNuevoOpen, setIsNuevoOpen] = useState(false);

    useEffect(() => {
        fetchMisCitas();
    }, []);

    const fetchMisCitas = async () => {
        try {
            const res = await axios.get('http://localhost:8000/api/v1/citas/mis/', {
                headers: { Authorization: `Bearer ${authTokens.access}` }
            });
            setCitas(res.data);
            setLoading(false);
        } catch (e) {
            if (e.response?.status === 401) logoutUser();
            console.error(e);
        }
    };

    const handleCancelar = async (citaId) => {
        if (!window.confirm("¿Seguro que deseas anular esta cita?")) return;
        try {
            await axios.patch(`http://localhost:8000/api/v1/citas/${citaId}/cancelar/`, {}, {
                headers: { 'Authorization': `Bearer ${authTokens.access}` }
            });
            fetchMisCitas();
        } catch (err) {
            alert(err.response?.data?.error || "Ocurrió un error al cancelar la cita");
        }
    };

    const pageBg     = isDark ? 'bg-slate-900'  : 'bg-slate-50';
    const cardBg     = isDark ? 'bg-slate-800'  : 'bg-white';
    const cardBorder = isDark ? 'border-slate-700' : 'border-slate-200';
    const textPrimary= isDark ? 'text-white' : 'text-slate-900';
    const subText    = isDark ? 'text-slate-400' : 'text-slate-500';

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

    return (
        <div className={`flex-1 w-full ${pageBg} p-6 flex flex-col min-h-full`}>
            
            {/* Header */}
            <div className={`mb-8 flex flex-col sm:flex-row justify-between sm:items-end shrink-0 gap-4`}>
                <div>
                  <h2 className={`text-2xl font-bold tracking-tight flex items-center gap-2 ${textPrimary}`}>
                     <Calendar className="text-blue-500" /> Mis Citas
                  </h2>
                  <p className={`text-sm mt-1 ${subText}`}>Administra tus visitas al taller y sus estados.</p>
                </div>
                
                <button 
                    onClick={() => setIsNuevoOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-6 rounded-lg shadow-md text-sm transition-colors"
                >
                    Agendar Nueva Cita
                </button>
            </div>

            {loading ? (
                <div className="flex-1 flex justify-center items-center">
                    <p className={`animate-pulse ${subText}`}>Cargando tus citas...</p>
                </div>
            ) : citas.length === 0 ? (
                <div className={`flex flex-col items-center justify-center py-20 border-2 border-dashed ${cardBorder} rounded-2xl`}>
                    <Calendar className={`mb-4 opacity-50 ${isDark ? 'text-slate-500' : 'text-slate-300'}`} size={64} />
                    <h3 className={`text-xl font-bold ${textPrimary}`}>No tienes citas programadas</h3>
                    <p className={`mt-2 text-center max-w-sm ${subText}`}>
                        Aún no nos has visitado o no has agendado tu primer servicio. ¡Programa una cita hoy mismo!
                    </p>
                    <button 
                        onClick={() => setIsNuevoOpen(true)}
                        className={`mt-6 border ${isDark ? 'border-slate-600 bg-slate-700 hover:bg-slate-600 text-white' : 'border-slate-300 bg-white hover:bg-slate-50 text-slate-900'} px-6 py-2 rounded-lg font-semibold transition-colors`}
                    >
                        Comenzar
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {citas.map(cita => {
                        const isCancelable = cita.estado !== 'COMPLETADA' && cita.estado !== 'CANCELADA';
                        return (
                            <div key={cita.id} className={`${cardBg} border ${cardBorder} rounded-xl shadow-sm overflow-hidden flex flex-col transition-all hover:shadow-md`}>
                                {/* Card Header */}
                                <div className={`p-4 border-b ${cardBorder} flex justify-between items-center bg-gradient-to-r ${isDark ? 'from-slate-800 to-slate-900' : 'from-slate-50 to-white'}`}>
                                    <div className="flex items-center gap-2">
                                        <Clock size={16} className="text-blue-500" />
                                        <span className={`font-semibold ${textPrimary}`}>
                                            {new Date(cita.fecha + 'T00:00:00').toLocaleDateString()}
                                        </span>
                                    </div>
                                    <span className={`px-2.5 py-1 text-[10px] uppercase font-bold rounded-full border tracking-wide whitespace-nowrap ${getBadgeStyle(cita.estado)}`}>
                                        {cita.estado}
                                    </span>
                                </div>
                                
                                {/* Card Body */}
                                <div className="p-5 flex-1 flex flex-col gap-4">
                                    <div className="flex items-start gap-4">
                                        <div className={`p-3 rounded-full ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
                                            <Car size={24} className="text-emerald-500" />
                                        </div>
                                        <div>
                                            <p className={`text-xs uppercase font-bold tracking-wider ${subText}`}>Tu Vehículo</p>
                                            <p className={`font-bold ${textPrimary}`}>{cita.vehiculo.marca} {cita.vehiculo.modelo}</p>
                                            <span className={`inline-block mt-1 px-2 py-0.5 text-xs font-mono font-bold rounded border ${isDark ? 'bg-slate-900 border-slate-700 text-slate-300' : 'bg-slate-200 border-slate-300 text-slate-800'}`}>
                                                {cita.vehiculo.placa}
                                            </span>
                                        </div>
                                    </div>

                                    <div className={`mt-2 p-3 rounded-lg border ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-100'} flex items-start gap-3`}>
                                        <Wrench size={16} className={`mt-0.5 ${cita.servicio.categoria === 'CARWASH' ? 'text-blue-400' : 'text-orange-500'}`} />
                                        <div>
                                            <p className={`text-sm font-semibold ${textPrimary}`}>{cita.servicio.nombre}</p>
                                            <p className={`text-xs mt-0.5 ${subText}`}>{cita.hora_inicio.slice(0, 5)} - {cita.hora_fin.slice(0, 5)}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Card Footer Actions */}
                                <div className={`px-5 py-3 border-t ${cardBorder} ${isDark ? 'bg-slate-800/50' : 'bg-slate-50'} flex justify-between items-center`}>
                                    <div className={`text-xs font-medium flex items-center gap-1.5 ${subText}`}>
                                        <HelpCircle size={14} /> 
                                        {cita.estado === 'PENDIENTE' ? 'Esperando confirmación' : cita.estado === 'CANCELADA' ? 'Anulada por usuario' : 'Todo en orden'}
                                    </div>
                                    
                                    {isCancelable && (
                                        <button 
                                            onClick={() => handleCancelar(cita.id)}
                                            className="text-xs font-bold text-red-500 hover:text-red-700 transition-colors flex items-center gap-1"
                                        >
                                            <Ban size={14} /> Anular
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal para Crear Nueva (Reutilizamos la misma pero se asignará automáticamente al cliente autenticado vía API) */}
            <NuevaCitaSlideOver 
               isOpen={isNuevoOpen}
               onClose={() => setIsNuevoOpen(false)}
               onCitaCreada={() => {
                   fetchMisCitas();
               }}
            />
        </div>
    );
}
