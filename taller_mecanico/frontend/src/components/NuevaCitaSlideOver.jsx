import React, { useState, useEffect, useContext, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X, Calendar as CalIcon, CheckCircle, AlertCircle } from 'lucide-react';
import axios from 'axios';
import Select from 'react-select';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function NuevaCitaSlideOver({ isOpen, onClose, onCitaCreada, defaultDate }) {
  const { authTokens, logoutUser } = useContext(AuthContext);
  const { isDark } = useTheme();
  const [servicios, setServicios] = useState([]);
  const [vehiculos, setVehiculos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [vehiculoSeleccionado, setVehiculoSeleccionado] = useState(null);
  const [servicioSeleccionado, setServicioSeleccionado] = useState(null);
  const [fecha, setFecha] = useState('');
  const [horaInicio, setHoraInicio] = useState('');
  const [notas, setNotas] = useState('');

  const timeSlots = [
    "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", 
    "11:00", "11:30", "12:00", "12:30", "13:00", "13:30",
    "14:00", "14:30", "15:00", "15:30", "16:00", "16:30",
    "17:00", "17:30"
  ];

  // Estilos de react-select adaptados al tema
  const selectStyles = {
    control: (base, state) => ({
      ...base,
      backgroundColor: isDark ? '#1e293b' : '#ffffff',
      borderColor: state.isFocused ? '#3b82f6' : isDark ? '#334155' : '#d1d5db',
      borderRadius: '0.5rem',
      color: isDark ? '#f1f5f9' : '#1e293b',
      boxShadow: state.isFocused ? '0 0 0 2px rgba(59,130,246,0.4)' : 'none',
      minHeight: '44px',
      '&:hover': { borderColor: '#3b82f6' }
    }),
    menu: (base) => ({
      ...base,
      backgroundColor: isDark ? '#1e293b' : '#ffffff',
      border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
      boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
      zIndex: 9999,
    }),
    menuList: (base) => ({
      ...base,
      padding: '4px',
    }),
    option: (base, { isSelected, isFocused }) => ({
      ...base,
      backgroundColor: isSelected
        ? '#3b82f6'
        : isFocused
        ? isDark ? '#334155' : '#eff6ff'
        : 'transparent',
      color: isSelected ? '#ffffff' : isDark ? '#f1f5f9' : '#1e293b',
      borderRadius: '0.375rem',
      fontSize: '0.875rem',
      cursor: 'pointer',
      padding: '8px 12px',
    }),
    groupHeading: (base) => ({
      ...base,
      color: isDark ? '#94a3b8' : '#64748b',
      fontSize: '0.7rem',
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      padding: '8px 12px 4px',
    }),
    singleValue: (base) => ({
      ...base,
      color: isDark ? '#f1f5f9' : '#1e293b',
      fontSize: '0.875rem',
    }),
    placeholder: (base) => ({
      ...base,
      color: isDark ? '#64748b' : '#94a3b8',
      fontSize: '0.875rem',
    }),
    input: (base) => ({
      ...base,
      color: isDark ? '#f1f5f9' : '#1e293b',
    }),
    noOptionsMessage: (base) => ({
      ...base,
      color: isDark ? '#94a3b8' : '#64748b',
      fontSize: '0.875rem',
    }),
  };

  useEffect(() => {
    if (isOpen) {
      fetchData();
      setError('');
      if (defaultDate) {
        const tzoffset = (new Date()).getTimezoneOffset() * 60000;
        const localISOTime = (new Date(defaultDate.getTime() - tzoffset)).toISOString().slice(0, 10);
        setFecha(localISOTime);
        const hours = defaultDate.getHours().toString().padStart(2, '0');
        const mins = defaultDate.getMinutes().toString().padStart(2, '0');
        if (hours !== '00') setHoraInicio(`${hours}:${mins}`);
      }
    } else {
      setVehiculoSeleccionado(null);
      setServicioSeleccionado(null);
      setFecha('');
      setHoraInicio('');
      setNotas('');
      setError('');
    }
  }, [isOpen, defaultDate]);

  const fetchData = async () => {
    try {
      const [resServicios, resVehiculos] = await Promise.all([
        axios.get('http://localhost:8000/api/v1/citas/servicios/', { headers: { Authorization: `Bearer ${authTokens.access}` } }),
        axios.get('http://localhost:8000/api/v1/citas/vehiculos/', { headers: { Authorization: `Bearer ${authTokens.access}` } })
      ]);
      setServicios(resServicios.data);
      setVehiculos(resVehiculos.data);
    } catch (e) {
      if (e.response?.status === 401) logoutUser();
      console.error(e);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!vehiculoSeleccionado || !servicioSeleccionado || !horaInicio || !fecha) return;
    setLoading(true);
    setError('');
    try {
      await axios.post('http://localhost:8000/api/v1/citas/nueva/', {
        vehiculo: vehiculoSeleccionado.value,
        servicio: servicioSeleccionado.value,
        fecha: fecha,
        hora_inicio: horaInicio,
        notas: notas
      }, { headers: { Authorization: `Bearer ${authTokens.access}` } });
      onCitaCreada();
      onClose();
    } catch (e) {
      setError(e.response?.data?.error || "Error creando la cita. Verifica los datos.");
      console.error(e.response);
    }
    setLoading(false);
  };

  // Colores del panel adaptados al tema
  const panelBg = isDark ? 'bg-slate-900' : 'bg-white';
  const headerBg = isDark ? 'bg-slate-800' : 'bg-slate-800'; // siempre oscuro el header
  const contentBg = isDark ? 'bg-slate-900' : 'bg-slate-50';
  const labelClass = `block text-xs font-bold uppercase tracking-wider mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`;
  const inputClass = `w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
    isDark
      ? 'bg-slate-800 border-slate-600 text-slate-100 placeholder-slate-500 focus:border-blue-500'
      : 'bg-white border-slate-300 text-slate-800 placeholder-slate-400 focus:border-blue-500'
  }`;

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-[9999]" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-in-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in-out duration-300"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
              <Transition.Child
                as={Fragment}
                enter="transform transition ease-in-out duration-300 sm:duration-500"
                enterFrom="translate-x-full"
                enterTo="translate-x-0"
                leave="transform transition ease-in-out duration-300 sm:duration-500"
                leaveFrom="translate-x-0"
                leaveTo="translate-x-full"
              >
                <Dialog.Panel className={`pointer-events-auto w-screen max-w-md ${panelBg}`}>
                  <form onSubmit={handleSubmit} className="flex h-full flex-col shadow-2xl">
                    
                    {/* Header siempre oscuro */}
                    <div className={`${headerBg} px-6 py-5`}>
                      <div className="flex items-center justify-between">
                        <Dialog.Title className="text-lg font-bold leading-6 text-white flex items-center gap-2">
                           <CalIcon size={22} className="text-blue-400" /> Nueva Cita
                        </Dialog.Title>
                        <button type="button" className="rounded-md text-slate-400 hover:text-white transition-colors" onClick={onClose}>
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                      <p className="mt-1 text-xs text-slate-400">Agenda un vehículo con el taller.</p>
                    </div>

                    {/* Contenido con scroll */}
                    <div className={`relative flex-1 px-6 py-6 ${contentBg} overflow-y-auto flex flex-col gap-5`}>

                      {/* Error inline (no popup) */}
                      {error && (
                        <div className="flex items-start gap-2 bg-red-900/30 border border-red-500/50 rounded-lg px-4 py-3">
                          <AlertCircle size={16} className="text-red-400 mt-0.5 shrink-0" />
                          <p className="text-sm text-red-400">{error}</p>
                        </div>
                      )}

                      {/* Vehículo - Buscador */}
                      <div>
                        <label className={labelClass}>Vehículo del Cliente</label>
                        <Select
                          options={vehiculos.map(v => ({
                            value: v.id,
                            label: `${v.placa} — ${v.marca} ${v.modelo} (${v.propietario?.first_name || v.propietario?.username})`
                          }))}
                          value={vehiculoSeleccionado}
                          onChange={setVehiculoSeleccionado}
                          placeholder="Buscar por placa o cliente..."
                          isSearchable={true}
                          menuPosition="fixed"
                          noOptionsMessage={() => "Sin resultados"}
                          styles={selectStyles}
                        />
                      </div>

                      {/* Servicio - Agrupado por categoría */}
                      <div>
                        <label className={labelClass}>Tipo de Servicio</label>
                        <Select
                          options={[
                            {
                              label: '🔧 Mecánica',
                              options: servicios.filter(s => s.categoria !== 'CARWASH').map(s => ({
                                value: s.id,
                                label: `${s.nombre} — ${s.duracion}min · Q${s.precio}`
                              }))
                            },
                            {
                              label: '🚿 Carwash',
                              options: servicios.filter(s => s.categoria === 'CARWASH').map(s => ({
                                value: s.id,
                                label: `${s.nombre} — ${s.duracion}min · Q${s.precio}`
                              }))
                            }
                          ]}
                          value={servicioSeleccionado}
                          onChange={setServicioSeleccionado}
                          placeholder="Buscar servicio..."
                          isSearchable={true}
                          menuPosition="fixed"
                          noOptionsMessage={() => "Sin resultados"}
                          styles={selectStyles}
                        />
                      </div>

                      {/* Fecha — input nativo limpio */}
                      <div>
                        <label className={labelClass}>Fecha</label>
                        <input
                          type="date"
                          required
                          className={inputClass}
                          value={fecha}
                          onChange={(e) => setFecha(e.target.value)}
                          style={{ colorScheme: isDark ? 'dark' : 'light' }}
                        />
                      </div>

                      {/* Botonera de Horas */}
                      <div>
                        <label className={labelClass}>Hora Inicio</label>
                        <div className="grid grid-cols-4 gap-2">
                          {timeSlots.map(slot => (
                            <button
                              key={slot}
                              type="button"
                              onClick={() => setHoraInicio(slot)}
                              className={`py-2 text-sm font-semibold rounded-lg transition-all border ${
                                horaInicio === slot
                                  ? 'bg-blue-600 text-white border-blue-600 shadow-md scale-105'
                                  : isDark
                                  ? 'bg-slate-800 text-slate-300 border-slate-600 hover:bg-slate-700 hover:border-blue-500'
                                  : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50 hover:border-blue-400'
                              }`}
                            >
                              {slot}
                            </button>
                          ))}
                        </div>
                        {!horaInicio && (
                          <p className="text-xs text-amber-500 mt-2 flex items-center gap-1">
                            <AlertCircle size={12} /> Selecciona una franja horaria
                          </p>
                        )}
                      </div>

                      {/* Notas */}
                      <div>
                        <label className={labelClass}>Notas al Recepcionista</label>
                        <textarea
                          className={inputClass}
                          rows={3}
                          placeholder="Ej: Cliente pedirá revalúo general..."
                          value={notas}
                          onChange={(e) => setNotas(e.target.value)}
                        />
                      </div>

                    </div>

                    {/* Footer */}
                    <div className={`px-6 py-4 border-t ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} flex justify-end gap-3 shrink-0`}>
                      <button
                        type="button"
                        onClick={onClose}
                        className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                          isDark
                            ? 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                            : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={loading || !horaInicio || !vehiculoSeleccionado || !servicioSeleccionado || !fecha}
                        className="inline-flex justify-center items-center gap-2 rounded-lg bg-blue-600 px-6 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {loading ? 'Guardando...' : <><CheckCircle size={16} /> Confirmar Cita</>}
                      </button>
                    </div>

                  </form>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}
