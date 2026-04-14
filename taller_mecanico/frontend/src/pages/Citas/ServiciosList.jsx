import React, { useState, useEffect, useContext } from 'react';
import { Search, Plus, Filter, Wrench, Droplets, Clock, Trash2, Edit2, Loader2, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import ServicioFormModal from '../../components/ServicioFormModal';

export default function ServiciosList() {
    const { authTokens, user } = useContext(AuthContext);
    const { isDark } = useTheme();
    const [servicios, setServicios] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [busqueda, setBusqueda] = useState('');
    const [filtroCategoria, setFiltroCategoria] = useState(''); // '' | 'MECANICO' | 'CARWASH'
    
    // Modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [servicioEdit, setServicioEdit] = useState(null);
    const [deleteLoading, setDeleteLoading] = useState(null);

    const formatGTQ = (val) => new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' }).format(val);

    const fetchServicios = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (busqueda) params.append('q', busqueda);
            if (filtroCategoria) params.append('categoria', filtroCategoria);
            
            const res = await axios.get(`http://localhost:8000/api/v1/citas/servicios/?${params.toString()}`, {
                headers: { Authorization: `Bearer ${authTokens?.access}` }
            });
            setServicios(res.data);
            setError(null);
        } catch (err) {
            console.error('Error fetching servicios', err);
            setError('Error al cargar servicios. Verifica la conexión con el servidor.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            fetchServicios();
        }, 300);
        return () => clearTimeout(timeoutId);
    }, [busqueda, filtroCategoria, authTokens]);

    const handleEliminar = async (servicio) => {
        if (!window.confirm(`¿Estás seguro de que deseas eliminar el servicio: "${servicio.nombre}"?`)) return;
        setDeleteLoading(servicio.id);
        
        try {
            await axios.delete(`http://localhost:8000/api/v1/citas/servicios/${servicio.id}/`, {
                headers: { Authorization: `Bearer ${authTokens?.access}` }
            });
            fetchServicios();
        } catch (err) {
            console.error('Error al eliminar', err);
            const msg = err.response?.data?.error || err.response?.data?.detail || 'Error al eliminar el servicio. Puede que existan citas usando este servicio.';
            alert(msg);
        } finally {
            setDeleteLoading(null);
        }
    };

    const openCreateModal = () => {
        setServicioEdit(null);
        setModalOpen(true);
    };

    const openEditModal = (s) => {
        setServicioEdit(s);
        setModalOpen(true);
    };

    // Estilos base
    const bg = isDark ? 'bg-[#0f172a]' : 'bg-slate-50';
    const cardBg = isDark ? 'bg-slate-800' : 'bg-white';
    const text = isDark ? 'text-white' : 'text-slate-900';
    const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';
    const border = isDark ? 'border-slate-800' : 'border-slate-200';

    return (
        <div className={`flex flex-col h-full ${bg} overflow-hidden font-sans relative`}>
            
            {/* Header Area */}
            <div className={`shrink-0 p-6 sm:px-10 flex flex-col sm:flex-row sm:items-end justify-between gap-6 relative z-10 
                ${isDark ? 'bg-slate-900/50' : 'bg-white/50'} border-b ${border}`}>
                <div>
                    <h1 className={`text-3xl font-extrabold ${text} tracking-tight`}>Catálogo de Servicios</h1>
                    <p className={`mt-2 ${textMuted} flex items-center gap-2`}>
                        Mecánica General y Lava Autos
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                    {/* Barra de Búsqueda */}
                    <div className="relative group min-w-[260px]">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500">
                            <Search size={18} />
                        </div>
                        <input
                            type="text"
                            placeholder="Buscar en el catálogo..."
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm font-medium transition-colors outline-none focus:ring-2 focus:ring-blue-500/40 ${
                                isDark 
                                ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' 
                                : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                            }`}
                        />
                    </div>
                    
                    {user?.is_staff && (
                        <button
                            onClick={openCreateModal}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-5 rounded-xl transition-all shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2"
                        >
                            <Plus size={18} /> Nuevo Servicio
                        </button>
                    )}
                </div>
            </div>

            {/* Filter Content */}
            <div className="shrink-0 p-6 sm:px-10 pb-0">
                <div className="flex gap-2 p-1 bg-slate-200/50 dark:bg-slate-800/50 rounded-xl w-fit">
                    <button 
                        onClick={() => setFiltroCategoria('')}
                        className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-colors ${filtroCategoria === '' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'}`}>
                        Todos
                    </button>
                    <button 
                        onClick={() => setFiltroCategoria('MECANICO')}
                        className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-colors flex items-center gap-1.5 ${filtroCategoria === 'MECANICO' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-500 hover:text-amber-600 dark:text-slate-400 dark:hover:text-amber-500'}`}>
                        <Wrench size={14} /> Mecánica
                    </button>
                    <button 
                        onClick={() => setFiltroCategoria('CARWASH')}
                        className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-colors flex items-center gap-1.5 ${filtroCategoria === 'CARWASH' ? 'bg-cyan-500 text-white shadow-sm' : 'text-slate-500 hover:text-cyan-600 dark:text-slate-400 dark:hover:text-cyan-500'}`}>
                        <Droplets size={14} /> Carwash
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto p-6 sm:px-10">
                {error ? (
                    <div className="flex flex-col items-center justify-center h-40 text-red-500 gap-3 border border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-900/10 rounded-2xl p-6 text-center">
                        <AlertCircle size={32} />
                        <span className="font-semibold">{error}</span>
                    </div>
                ) : loading ? (
                    <div className="flex justify-center h-40 items-center">
                        <Loader2 className="animate-spin text-blue-500" size={40} />
                    </div>
                ) : servicios.length === 0 ? (
                    <div className="flex justify-center items-center h-64 flex-col text-center border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-3xl">
                        <Filter size={48} className="text-slate-300 dark:text-slate-600 mb-4" />
                        <h3 className={`text-xl font-bold ${text}`}>No hay servicios disponibles</h3>
                        <p className={`mt-2 ${textMuted} max-w-sm`}>
                            {busqueda || filtroCategoria ? "No pudimos encontrar nada con esos filtros." : "Agrega el primer servicio al catálogo para comenzar."}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
                        {servicios.map((s) => {
                            const isCarwash = s.categoria === 'CARWASH';
                            // Dynamic color matching
                            const bgAccent = isCarwash 
                                ? 'bg-cyan-50 dark:bg-cyan-900/20' 
                                : 'bg-amber-50 dark:bg-amber-900/20';
                            const textAccent = isCarwash 
                                ? 'text-cyan-600 dark:text-cyan-400' 
                                : 'text-amber-600 dark:text-amber-500';
                            
                            return (
                                <div key={s.id} className={`${cardBg} rounded-2xl border ${border} shadow-sm hover:shadow-md transition-all overflow-hidden relative group p-6 flex flex-col h-full`}>
                                    <div className="flex justify-between items-start gap-4">
                                        <div className={`p-3 rounded-xl shrink-0 ${bgAccent} ${textAccent}`}>
                                            {isCarwash ? <Droplets size={24} /> : <Wrench size={24} />}
                                        </div>
                                        <div className="text-right">
                                            <span className={`text-lg font-black tracking-tight ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                                                {formatGTQ(s.precio)}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    <div className="mt-4 flex-1">
                                        <h3 className={`font-bold text-lg leading-tight ${text} mb-1`}>{s.nombre}</h3>
                                        <p className={`text-sm ${textMuted} line-clamp-2`}>
                                            {s.descripcion || "Sin descripción adicional."}
                                        </p>
                                    </div>
                                    
                                    <div className={`mt-5 pt-4 border-t ${border} flex items-center justify-between`}>
                                        <div className={`flex items-center gap-1.5 text-xs font-bold uppercase ${textMuted}`}>
                                            <Clock size={14} /> {s.duracion} MIN
                                        </div>

                                        {user?.is_staff && (
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => openEditModal(s)} className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700 text-blue-400' : 'hover:bg-slate-100 text-blue-600'}`} title="Editar">
                                                    <Edit2 size={16} />
                                                </button>
                                                <button onClick={() => handleEliminar(s)} disabled={deleteLoading === s.id} className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700 text-red-400' : 'hover:bg-red-50 text-red-600'} disabled:opacity-50`} title="Eliminar">
                                                    {deleteLoading === s.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <ServicioFormModal isOpen={modalOpen} onClose={() => setModalOpen(false)} servicio={servicioEdit} onSaved={fetchServicios} />
        </div>
    );
}
