import React, { useState, useEffect, useContext } from 'react';
import { useLocation } from 'react-router-dom';
import { Search, UserPlus, FileEdit, CarFront, ShieldBan, ShieldCheck, Mail, Phone, Trash2, Calendar, Loader2, MessageCircle } from 'lucide-react';
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import ClienteFormModal from '../../components/ClienteFormModal';
import VehiculosClienteSlideOver from '../../components/VehiculosClienteSlideOver';

export default function ClientesList() {
    const { authTokens } = useContext(AuthContext);
    const { isDark } = useTheme();
    
    const [clientes, setClientes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    
    const [modalOpen, setModalOpen] = useState(false);
    const [clienteEdit, setClienteEdit] = useState(null);
    
    const [slideOverOpen, setSlideOverOpen] = useState(false);
    const [clienteSeleccionado, setClienteSeleccionado] = useState(null);

    const bgStr = isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200';
    const textStr = isDark ? 'text-slate-100' : 'text-slate-900';
    const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';

    useEffect(() => {
        fetchClientes();
    }, []);

    const fetchClientes = async () => {
        setLoading(true);
        try {
            const res = await axios.get('http://localhost:8000/api/v1/usuarios/clientes/', {
                headers: { Authorization: `Bearer ${authTokens?.access}` }
            });
            setClientes(res.data);
        } catch (error) {
            console.error('Error cargando clientes:', error);
        }
        setLoading(false);
    };

    const handleToggleStatus = async (cliente) => {
        try {
            await axios.post(`http://localhost:8000/api/v1/usuarios/clientes/${cliente.id}/toggle_estado/`, {}, {
                headers: { Authorization: `Bearer ${authTokens?.access}` }
            });
            fetchClientes();
        } catch (error) {
            alert(error.response?.data?.error || 'Error cambiando estado');
        }
    };

    const handleDelete = async (cliente) => {
        if(!window.confirm(`¿Seguro que deseas ELIMINAR a ${cliente.nombre_completo}?`)) return;
        try {
            await axios.delete(`http://localhost:8000/api/v1/usuarios/clientes/${cliente.id}/`, {
                headers: { Authorization: `Bearer ${authTokens?.access}` }
            });
            fetchClientes();
        } catch (error) {
            alert(error.response?.data?.error || 'Error eliminando cliente');
        }
    };

    const filtered = clientes.filter(c => 
        c.nombre_completo.toLowerCase().includes(searchQuery.toLowerCase()) || 
        c.email.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (c.perfil?.telefono && c.perfil.telefono.includes(searchQuery))
    );

    return (
        <div className={`min-h-full p-6 transition-colors ${isDark ? 'bg-slate-950' : 'bg-slate-50'}`}>
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className={`text-3xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-800'}`}>
                        Directorio de Clientes
                    </h1>
                    <p className={`mt-1 font-medium ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                        {clientes.length} clientes registrados en el sistema
                    </p>
                </div>
                
                <div className="flex gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-80">
                        <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${textMuted}`} size={20} />
                        <input 
                            type="text" 
                            placeholder="Buscar cliente..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className={`w-full pl-10 pr-4 py-2.5 rounded-xl border font-medium focus:ring-2 focus:ring-blue-500/50 outline-none transition-all ${
                                isDark ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500' : 'bg-white border-slate-200 text-slate-800'
                            }`}
                        />
                    </div>
                    <button 
                        onClick={() => { setClienteEdit(null); setModalOpen(true); }}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-blue-500/30 flex items-center gap-2"
                    >
                        <UserPlus size={20} /> <span className="hidden sm:inline">Nuevo Cliente</span>
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center min-h-[400px]">
                    <Loader2 className="animate-spin text-blue-500" size={48} />
                    <p className={`mt-4 font-medium ${textMuted}`}>Cargando directorio...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filtered.map(c => (
                        <div key={c.id} className={`rounded-2xl border ${bgStr} overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 group ${!c.is_active ? 'opacity-75' : ''}`}>
                            <div className="p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-14 h-14 rounded-full flex items-center justify-center text-xl font-black ${
                                            c.is_active ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400' : 'bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                                        }`}>
                                            {c.first_name?.charAt(0) || c.username?.charAt(0)}
                                        </div>
                                        <div>
                                            <h3 className={`font-bold text-lg leading-tight ${textStr} flex items-center gap-2`}>
                                                {c.nombre_completo}
                                                {!c.is_active && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 uppercase">Inactivo</span>}
                                            </h3>
                                            <p className={`text-sm ${textMuted}`}>@{c.username}</p>
                                        </div>
                                    </div>
                                    
                                    <button 
                                        onClick={() => handleToggleStatus(c)}
                                        title={c.is_active ? "Deshabilitar acceso" : "Habilitar cuenta"}
                                        className={`p-2 rounded-lg transition-colors ${
                                            c.is_active ? 'text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20' 
                                                      : 'text-red-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                                        }`}
                                    >
                                        {c.is_active ? <ShieldCheck size={20} className="text-emerald-500"/> : <ShieldBan size={20} />}
                                    </button>
                                </div>

                                <div className="space-y-3 mb-6">
                                    <div className={`flex items-center gap-3 text-sm ${textMuted}`}>
                                        <Mail size={16} /> <span className="truncate">{c.email}</span>
                                    </div>
                                    {c.perfil?.telefono && (
                                        <div className={`flex items-center gap-3 text-sm ${textMuted}`}>
                                            <Phone size={16} /> 
                                            <span>{c.perfil.telefono}</span>
                                            <a 
                                                href={`https://wa.me/${c.perfil.telefono.replace(/\D/g, '')}?text=Hola%20${c.nombre_completo},%20somos%20de%20Taller%20Mecánico`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="ml-auto flex items-center justify-center gap-1 bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-500 hover:text-white px-2.5 py-1 rounded-lg transition-colors font-medium"
                                                title="Enviar WhatsApp"
                                            >
                                                <MessageCircle size={14} /> WhatsApp
                                            </a>
                                        </div>
                                    )}
                                    <div className={`flex items-center gap-3 text-sm ${textMuted}`}>
                                        <Calendar size={16} /> <span>Registrado: {new Date(c.date_joined).toLocaleDateString()}</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 mt-auto">
                                    {/* Action Buttons */}
                                    <button 
                                        onClick={() => { setClienteEdit(c); setModalOpen(true); }}
                                        className={`flex items-center justify-center gap-2 py-2 rounded-xl border ${isDark ? 'border-slate-700 hover:bg-slate-800 text-slate-300' : 'border-slate-200 hover:bg-slate-50 text-slate-700'} transition-colors font-medium text-sm`}
                                    >
                                        <FileEdit size={16} /> Editar
                                    </button>
                                    <button 
                                        onClick={() => { setClienteSeleccionado(c); setSlideOverOpen(true); }}
                                        className={`flex items-center justify-center gap-2 py-2 rounded-xl border ${isDark ? 'border-blue-900/50 bg-blue-900/20 hover:bg-blue-900/40 text-blue-400' : 'border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700'} transition-colors font-medium text-sm`}
                                    >
                                        <CarFront size={16} /> Vehículos ({c.vehiculos_count})
                                    </button>
                                </div>

                                <div className="mt-4 flex justify-end">
                                    <button onClick={() => handleDelete(c)} className={`text-xs flex items-center gap-1 ${isDark ? 'text-slate-600 hover:text-red-400' : 'text-slate-400 hover:text-red-500'} transition-colors`}>
                                        <Trash2 size={12}/> Eliminar cliente
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                    
                    {filtered.length === 0 && (
                        <div className={`col-span-full py-20 text-center ${textMuted}`}>
                            <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Search size={32} />
                            </div>
                            <h3 className="text-xl font-bold mb-1">No hay coincidencias</h3>
                            <p>No se encontraron clientes con "{searchQuery}"</p>
                        </div>
                    )}
                </div>
            )}

            <ClienteFormModal 
                isOpen={modalOpen} 
                onClose={() => setModalOpen(false)} 
                cliente={clienteEdit} 
                onSaved={fetchClientes} 
            />
            
            <VehiculosClienteSlideOver 
                isOpen={slideOverOpen} 
                onClose={() => setSlideOverOpen(false)} 
                cliente={clienteSeleccionado} 
                onUpdate={fetchClientes}
            />

        </div>
    );
}
