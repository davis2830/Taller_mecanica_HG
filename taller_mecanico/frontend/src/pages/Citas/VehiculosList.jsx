import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
    Car, Search, Plus, Edit3, Trash2, History, Truck,
    User, Loader2, RefreshCw
} from 'lucide-react';
import VehiculoFormModal from '../../components/VehiculoFormModal';
import HistorialVehiculoSlideOver from '../../components/HistorialVehiculoSlideOver';

export default function VehiculosList() {
    const { authTokens, user, logoutUser } = useContext(AuthContext);
    const { isDark } = useTheme();
    const navigate = useNavigate();

    const [vehiculos, setVehiculos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState('');
    const [deleting, setDeleting] = useState(null);

    // Modales
    const [formOpen, setFormOpen] = useState(false);
    const [vehiculoEdit, setVehiculoEdit] = useState(null);
    const [historialData, setHistorialData] = useState(null);

    const headers = { Authorization: `Bearer ${authTokens.access}` };

    useEffect(() => {
        fetchVehiculos();
    }, []);

    const fetchVehiculos = async (q = '') => {
        setLoading(true);
        try {
            const res = await axios.get(`http://localhost:8000/api/v1/vehiculos/?q=${q}`, { headers });
            setVehiculos(res.data);
        } catch (e) {
            if (e.response?.status === 401) logoutUser();
        }
        setLoading(false);
    };

    const handleSearch = (e) => {
        const v = e.target.value;
        setQuery(v);
        fetchVehiculos(v);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('¿Seguro que deseas eliminar este vehículo? Esta acción no se puede deshacer.')) return;
        setDeleting(id);
        try {
            await axios.delete(`http://localhost:8000/api/v1/vehiculos/${id}/`, { headers });
            setVehiculos(vs => vs.filter(v => v.id !== id));
        } catch (e) {
            alert(e.response?.data?.error || 'No se pudo eliminar el vehículo (puede tener citas u órdenes asociadas).');
        }
        setDeleting(null);
    };

    const handleHistorial = async (vehiculo) => {
        try {
            const res = await axios.get(`http://localhost:8000/api/v1/vehiculos/${vehiculo.id}/historial/`, { headers });
            setHistorialData(res.data);
        } catch (e) {
            alert('No se pudo cargar el historial.');
        }
    };

    // ── Estilos ──
    const pageBg = isDark ? 'bg-slate-900' : 'bg-slate-50';
    const cardBg = isDark ? 'bg-slate-800' : 'bg-white';
    const border = isDark ? 'border-slate-700' : 'border-slate-200';
    const textPrimary = isDark ? 'text-white' : 'text-slate-900';
    const subText = isDark ? 'text-slate-400' : 'text-slate-500';
    const inputCls = `flex-1 min-w-0 px-4 py-2.5 rounded-xl border text-sm font-medium outline-none transition-all focus:ring-2 focus:ring-blue-500/30 ${
        isDark ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'
    }`;

    const COLOR_PALETTE = {
        rojo: '#ef4444', azul: '#3b82f6', negro: '#1e293b', blanco: '#f8fafc',
        gris: '#6b7280', verde: '#22c55e', amarillo: '#eab308', plata: '#94a3b8',
    };
    const getColorDot = (color) => {
        const match = Object.entries(COLOR_PALETTE).find(([key]) => color.toLowerCase().includes(key));
        return match ? match[1] : '#94a3b8';
    };

    return (
        <div className={`flex-1 w-full ${pageBg} p-6 flex flex-col min-h-full`}>

            {/* Header */}
            <div className="mb-8 flex flex-col sm:flex-row justify-between sm:items-end gap-4 shrink-0">
                <div>
                    <h2 className={`text-2xl font-bold tracking-tight flex items-center gap-2 ${textPrimary}`}>
                        <Car className="text-blue-500" /> Directorio y Clínica
                    </h2>
                    <p className={`text-sm mt-1 ${subText}`}>Gestiona los vehículos registrados, su historial y recepción.</p>
                </div>
                <button
                    onClick={() => { setVehiculoEdit(null); setFormOpen(true); }}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-5 rounded-xl shadow-md shadow-blue-500/20 text-sm transition-colors"
                >
                    <Plus size={18} /> Registrar Vehículo
                </button>
            </div>

            {/* Search */}
            <div className={`flex items-center gap-3 mb-6 p-2 rounded-2xl border ${border} ${isDark ? 'bg-slate-800/50' : 'bg-white'} shadow-sm shrink-0`}>
                <Search size={18} className={`ml-2 shrink-0 ${subText}`} />
                <input
                    type="text"
                    className={inputCls}
                    placeholder="Buscar por placa, marca, modelo o propietario..."
                    value={query}
                    onChange={handleSearch}
                />
                <button
                    onClick={() => fetchVehiculos(query)}
                    className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}
                    title="Actualizar"
                >
                    <RefreshCw size={16} />
                </button>
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex-1 flex items-center justify-center">
                    <Loader2 className="animate-spin text-blue-500" size={36} />
                </div>
            ) : vehiculos.length === 0 ? (
                <div className={`flex-1 flex flex-col items-center justify-center py-20 border-2 border-dashed ${border} rounded-2xl`}>
                    <Car className={`mb-4 opacity-30 ${isDark ? 'text-slate-500' : 'text-slate-300'}`} size={64} />
                    <h3 className={`text-xl font-bold ${textPrimary}`}>Sin vehículos registrados</h3>
                    <p className={`mt-2 ${subText}`}>Comienza registrando el primer vehículo del sistema.</p>
                    <button onClick={() => { setVehiculoEdit(null); setFormOpen(true); }}
                        className="mt-6 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors">
                        Registrar Ahora
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {vehiculos.map(v => {
                        const dotColor = getColorDot(v.color || '');
                        return (
                            <div key={v.id} className={`${cardBg} border ${border} rounded-2xl overflow-hidden flex flex-col transition-all hover:shadow-lg hover:-translate-y-0.5 duration-200`}>

                                {/* Card top bar (color del auto) */}
                                <div className="h-1.5" style={{ backgroundColor: dotColor }} />

                                {/* Card Body */}
                                <div className="p-5 flex flex-col gap-4 flex-1">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-3 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
                                                <Car size={24} className="text-blue-400" />
                                            </div>
                                            <div>
                                                <p className={`font-bold text-base leading-tight ${textPrimary}`}>{v.marca} {v.modelo}</p>
                                                <p className={`text-xs ${subText}`}>{v.año}</p>
                                            </div>
                                        </div>
                                        <span className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-bold font-mono border ${isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-slate-100 border-slate-300 text-slate-800'}`}>
                                            {v.placa}
                                        </span>
                                    </div>

                                    {/* Propietario */}
                                    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${border} ${isDark ? 'bg-slate-700/30' : 'bg-slate-50'}`}>
                                        <User size={14} className="text-emerald-400 shrink-0" />
                                        <div className="min-w-0">
                                            <p className={`text-xs ${subText}`}>Propietario</p>
                                            <p className={`text-sm font-semibold truncate ${textPrimary}`}>{v.propietario?.full_name || v.propietario?.username}</p>
                                        </div>
                                    </div>

                                    {/* Stats */}
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className={`p-2 rounded-lg border ${border} ${isDark ? 'bg-slate-700/30' : 'bg-slate-50'} text-center`}>
                                            <p className={`text-lg font-bold ${textPrimary}`}>{v.total_citas ?? 0}</p>
                                            <p className={`text-[10px] ${subText}`}>Citas totales</p>
                                        </div>
                                        <div className={`p-2 rounded-lg border ${border} ${isDark ? 'bg-slate-700/30' : 'bg-slate-50'} text-center`}>
                                            <p className={`text-lg font-bold ${v.ultima_visita ? 'text-emerald-400' : subText}`}>{v.ultima_visita ? new Date(v.ultima_visita + 'T00:00:00').toLocaleDateString('es-GT', { day: '2-digit', month: 'short' }) : '—'}</p>
                                            <p className={`text-[10px] ${subText}`}>Última visita</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className={`px-5 py-3 border-t ${border} ${isDark ? 'bg-slate-800/50' : 'bg-slate-50'} flex items-center justify-between gap-2`}>
                                    {/* Recepción (solo staff) */}
                                    {user?.is_staff && (
                                        <button
                                            onClick={() => navigate(`/citas/recepcion/nueva?vehiculo=${v.id}`)}
                                            className="flex items-center gap-1.5 text-xs font-bold text-orange-500 hover:text-orange-400 transition-colors"
                                            title="Registrar Ingreso"
                                        >
                                            <Truck size={15} /> Recepción
                                        </button>
                                    )}

                                    <div className="flex items-center gap-1 ml-auto">
                                        {/* Historial */}
                                        <button
                                            onClick={() => handleHistorial(v)}
                                            className={`p-2 rounded-lg transition-colors text-purple-400 hover:bg-purple-500/10`}
                                            title="Ver Historial"
                                        >
                                            <History size={17} />
                                        </button>

                                        {/* Editar */}
                                        <button
                                            onClick={() => { setVehiculoEdit(v); setFormOpen(true); }}
                                            className={`p-2 rounded-lg transition-colors ${isDark ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-500 hover:bg-slate-200'}`}
                                            title="Editar"
                                        >
                                            <Edit3 size={17} />
                                        </button>

                                        {/* Eliminar (solo staff) */}
                                        {user?.is_staff && (
                                            <button
                                                onClick={() => handleDelete(v.id)}
                                                disabled={deleting === v.id}
                                                className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40"
                                                title="Eliminar"
                                            >
                                                {deleting === v.id ? <Loader2 size={17} className="animate-spin" /> : <Trash2 size={17} />}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modales */}
            <VehiculoFormModal
                isOpen={formOpen}
                onClose={() => setFormOpen(false)}
                vehiculo={vehiculoEdit}
                onSaved={() => fetchVehiculos(query)}
            />

            {historialData && (
                <HistorialVehiculoSlideOver
                    isOpen={!!historialData}
                    onClose={() => setHistorialData(null)}
                    vehiculo={historialData.vehiculo}
                    citas={historialData.citas}
                    recepciones={historialData.recepciones}
                />
            )}
        </div>
    );
}
