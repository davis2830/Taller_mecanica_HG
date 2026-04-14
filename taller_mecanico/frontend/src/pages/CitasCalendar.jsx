import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Calendar, Hourglass, CheckCircle2, Key, Flag, Ban, Eye, ClipboardCheck } from 'lucide-react';
import NuevaCitaSlideOver from '../components/NuevaCitaSlideOver';
import DetalleCitaSlideOver from '../components/DetalleCitaSlideOver';

export default function CitasCalendar() {
  const { authTokens, logoutUser } = useContext(AuthContext);
  const { isDark } = useTheme();
  const [citasRaw, setCitasRaw] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // States Modal Nueva Cita
  const [isNuevoOpen, setIsNuevoOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  
  // States Modal Detalle
  const [isDetalleOpen, setIsDetalleOpen] = useState(false);
  const [selectedDetalleCita, setSelectedDetalleCita] = useState(null);

  // Filters state
  const [fechaFiltro, setFechaFiltro] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState('');

  useEffect(() => {
    fetchCitas();
  }, []);

  const fetchCitas = async () => {
    try {
      const res = await axios.get('http://localhost:8000/api/v1/citas/calendario/', {
        headers: { Authorization: `Bearer ${authTokens.access}` }
      });
      setCitasRaw(res.data);
      setLoading(false);
    } catch (e) {
      if (e.response?.status === 401) logoutUser();
      console.error(e);
    }
  };

  // Filtrado local (ya que el backend mandaba todo)
  const citasFiltradas = citasRaw.filter(cita => {
      let match = true;
      if (fechaFiltro && cita.fecha !== fechaFiltro) match = false;
      if (categoriaFiltro && cita.servicio.categoria !== categoriaFiltro) match = false;
      if (estadoFiltro && cita.estado !== estadoFiltro) match = false;
      return match;
  });

  const getBadgeStyle = (estado) => {
      switch (estado) {
          case 'PENDIENTE': return 'bg-amber-100 text-amber-800 border-amber-200';
          case 'CONFIRMADA': return 'bg-blue-100 text-blue-800 border-blue-200';
          case 'LISTO': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
          case 'COMPLETADA': return 'bg-slate-100 text-slate-800 border-slate-200';
          case 'CANCELADA': return 'bg-red-100 text-red-800 border-red-200';
          default: return 'bg-gray-100 text-gray-800 border-gray-200';
      }
  };
  
  const getBadgeIcon = (estado) => {
      switch (estado) {
          case 'PENDIENTE': return <Hourglass size={14} className="mr-1 inline" />;
          case 'CONFIRMADA': return <CheckCircle2 size={14} className="mr-1 inline" />;
          case 'LISTO': return <Key size={14} className="mr-1 inline" />;
          case 'COMPLETADA': return <Flag size={14} className="mr-1 inline" />;
          case 'CANCELADA': return <Ban size={14} className="mr-1 inline" />;
          default: return null;
      }
  };

  const handleOpenNuevo = () => {
      setSelectedDate(new Date());
      setIsNuevoOpen(true);
  };
  
  const handleOpenDetalle = (cita) => {
      setSelectedDetalleCita(cita);
      setIsDetalleOpen(true);
  };
  
  const handleCheckInAction = (cita) => {
      if (cita.tiene_orden) {
          window.location.href = `http://localhost:8000/taller/orden/${cita.orden_trabajo_id}/`;
      } else {
          window.location.href = `http://localhost:8000/taller/orden/crear-desde-cita/${cita.id}/`;
      }
  };

  const pageBg     = isDark ? 'bg-slate-900'  : 'bg-slate-50';
  const cardBg     = isDark ? 'bg-slate-800'  : 'bg-white';
  const cardBorder = isDark ? 'border-slate-700' : 'border-slate-200';
  const theadBg    = isDark ? 'bg-slate-700'  : 'bg-slate-50';
  const tbodyBg    = isDark ? 'bg-slate-800'  : 'bg-white';
  const rowHover   = isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-50';
  const divider    = isDark ? 'divide-slate-700' : 'divide-slate-200';
  const thText     = isDark ? 'text-slate-400' : 'text-slate-500';
  const cellText   = isDark ? 'text-slate-100' : 'text-slate-900';
  const subText    = isDark ? 'text-slate-400' : 'text-slate-500';
  const labelText  = isDark ? 'text-slate-400' : 'text-slate-500';
  const inputCls   = `rounded-md px-3 py-2 text-sm border focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
    isDark
      ? 'bg-slate-700 border-slate-600 text-slate-100'
      : 'bg-white border-slate-300 text-slate-700'}`;
  const placa      = isDark
    ? 'bg-slate-700 text-slate-200 border-slate-600'
    : 'bg-slate-100 text-slate-800 border-slate-300';

  return (
    <div className={`flex-1 w-full ${pageBg} p-6 flex flex-col min-h-full`}>

        {/* Header Hero */}
        <div className="mb-6 flex flex-col sm:flex-row justify-between sm:items-end shrink-0 gap-4">
            <div>
              <h2 className={`text-2xl font-bold tracking-tight flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                 <Calendar className="text-blue-500" /> Agenda Maestra
              </h2>
              <p className={`text-sm mt-1 ${subText}`}>Revisa y gestiona todas las citas programadas en el taller.</p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className={`border-2 rounded-xl px-5 py-2 text-center shadow-sm ${isDark ? 'bg-orange-900/30 border-orange-700' : 'bg-orange-50 border-orange-200'}`}>
                    <div className="text-2xl font-black text-orange-500 leading-tight">{citasFiltradas.length}</div>
                    <div className={`text-[0.65rem] uppercase font-bold tracking-wider ${subText}`}>Citas</div>
                </div>
                <button 
                    onClick={handleOpenNuevo}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-5 rounded-lg shadow-sm text-sm transition-colors"
                >
                    + Agendar Cita
                </button>
            </div>
        </div>

        {/* Filtros */}
        <div className={`${cardBg} border ${cardBorder} p-4 rounded-xl shadow-sm mb-6 flex flex-wrap gap-4 items-end`}>
            <div className="flex flex-col gap-1.5 w-full sm:w-[180px]">
                <label className={`text-xs font-semibold uppercase tracking-wide ${labelText}`}>Día Específico</label>
                <input 
                    type="date" 
                    value={fechaFiltro}
                    onChange={(e) => setFechaFiltro(e.target.value)}
                    className={inputCls}
                    style={{ colorScheme: isDark ? 'dark' : 'light' }}
                />
            </div>
            
            <div className="flex flex-col gap-1.5 w-full sm:w-[200px]">
                <label className={`text-xs font-semibold uppercase tracking-wide ${labelText}`}>Categoría</label>
                <select 
                    value={categoriaFiltro}
                    onChange={(e) => setCategoriaFiltro(e.target.value)}
                    className={inputCls}
                >
                    <option value="">— Todas —</option>
                    <option value="MECANICO">🔧 Mecánica General</option>
                    <option value="CARWASH">🚿 Carwash / Estética</option>
                </select>
            </div>

            <div className="flex flex-col gap-1.5 w-full sm:w-[200px]">
                <label className={`text-xs font-semibold uppercase tracking-wide ${labelText}`}>Estado</label>
                <select 
                    value={estadoFiltro}
                    onChange={(e) => setEstadoFiltro(e.target.value)}
                    className={inputCls}
                >
                    <option value="">— Activas (todas) —</option>
                    <option value="PENDIENTE">⏳ Pendiente</option>
                    <option value="CONFIRMADA">✅ Confirmada</option>
                    <option value="LISTO">🔑 Listo para recoger</option>
                    <option value="COMPLETADA">🏁 Completada</option>
                    <option value="CANCELADA">🚫 Cancelada</option>
                </select>
            </div>

            <button 
                onClick={() => { setFechaFiltro(''); setCategoriaFiltro(''); setEstadoFiltro(''); }}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
                Limpiar
            </button>
        </div>
        
        {/* Tabla */}
        <div className={`${cardBg} border ${cardBorder} rounded-xl shadow-sm overflow-hidden flex-1 flex flex-col`}>
            <div className="overflow-x-auto">
                <table className={`min-w-full divide-y ${divider}`}>
                    <thead className={theadBg}>
                        <tr>
                            <th scope="col" className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${thText}`}>Fecha y Hora</th>
                            <th scope="col" className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${thText}`}>Cliente</th>
                            <th scope="col" className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${thText}`}>Vehículo</th>
                            <th scope="col" className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${thText}`}>Servicio</th>
                            <th scope="col" className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${thText}`}>Estado</th>
                            <th scope="col" className={`px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider ${thText}`}>Acciones</th>
                        </tr>
                    </thead>
                    <tbody className={`${tbodyBg} divide-y ${divider}`}>
                        {loading && (
                            <tr><td colSpan="6" className={`px-6 py-10 text-center ${subText}`}>Cargando agenda...</td></tr>
                        )}
                        {!loading && citasFiltradas.length === 0 && (
                            <tr>
                                <td colSpan="6" className="px-6 py-16 text-center">
                                    <div className="flex flex-col items-center justify-center">
                                        <Calendar className={`mb-3 ${isDark ? 'text-slate-600' : 'text-slate-300'}`} size={48} />
                                        <h3 className={`text-lg font-medium ${cellText}`}>Sin citas encontradas</h3>
                                        <p className={`mt-1 max-w-sm ${subText}`}>No hay citas que coincidan con los filtros seleccionados.</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                        {!loading && citasFiltradas.map((cita) => (
                            <tr key={cita.id} className={`${rowHover} transition-colors`}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className={`text-sm font-bold ${cellText}`}>
                                        {new Date(cita.fecha + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric'})}
                                    </div>
                                    <div className={`text-xs mt-1 ${subText}`}>
                                        {cita.hora_inicio.slice(0, 5)} — {cita.hora_fin.slice(0, 5)}
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                        <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs uppercase ${isDark ? 'bg-slate-600 text-slate-200' : 'bg-slate-200 text-slate-600'}`}>
                                            {cita.cliente?.first_name ? cita.cliente.first_name[0] : (cita.cliente?.username?.[0] || 'U')}
                                        </div>
                                        <div className={`ml-3 text-sm font-semibold ${cellText}`}>
                                            {cita.cliente?.first_name ? `${cita.cliente.first_name} ${cita.cliente.last_name || ''}` : cita.cliente?.username}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className={`text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{cita.vehiculo.marca} {cita.vehiculo.modelo}</div>
                                    <span className={`inline-flex items-center px-2 py-0.5 mt-1 rounded text-xs font-bold border tracking-wider ${placa}`}>
                                        {cita.vehiculo.placa}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className={`text-sm font-medium ${cellText}`}>{cita.servicio.nombre}</div>
                                    <div className={`text-xs mt-1 font-medium ${cita.servicio.categoria === 'CARWASH' ? 'text-blue-400' : subText}`}>
                                        {cita.servicio.categoria === 'CARWASH' ? '💧 Carwash' : '🔧 Mecánica'}
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${getBadgeStyle(cita.estado)}`}>
                                        {getBadgeIcon(cita.estado)}
                                        {cita.estado.charAt(0).toUpperCase() + cita.estado.slice(1).toLowerCase()}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <div className="flex justify-end gap-2">
                                        <button 
                                            onClick={() => handleOpenDetalle(cita)}
                                            className={`p-1.5 rounded border transition-colors ${isDark ? 'bg-slate-700 border-slate-600 text-slate-400 hover:text-blue-400 hover:border-blue-500' : 'bg-white border-slate-200 text-slate-400 hover:text-blue-600'}`}
                                            title="Ver Detalles"
                                        >
                                            <Eye size={15} />
                                        </button>
                                        {cita.estado !== 'CANCELADA' && (
                                            <button 
                                                onClick={() => handleCheckInAction(cita)}
                                                className={`p-1.5 rounded border transition-colors ${isDark ? 'bg-slate-700 border-slate-600 text-slate-400 hover:text-emerald-400 hover:border-emerald-500' : 'bg-white border-slate-200 text-slate-400 hover:text-emerald-600'}`}
                                                title={cita.tiene_orden ? "Ver Orden" : "Ingresar Vehículo"}
                                            >
                                                <ClipboardCheck size={15} />
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
        
        <NuevaCitaSlideOver 
           isOpen={isNuevoOpen}
           onClose={() => setIsNuevoOpen(false)}
           defaultDate={selectedDate}
           onCitaCreada={() => {
               fetchCitas();
           }}
        />
        
        <DetalleCitaSlideOver
           isOpen={isDetalleOpen}
           onClose={() => setIsDetalleOpen(false)}
           cita={selectedDetalleCita}
           onUpdate={fetchCitas}
        />
    </div>
  );
}
