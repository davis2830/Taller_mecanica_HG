import React, { useState, useEffect, useContext } from 'react';
import { X, Car, Plus, Trash2, Edit2, Loader2, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import VehiculoFormModal from './VehiculoFormModal';

export default function VehiculosClienteSlideOver({ isOpen, onClose, cliente, onUpdate }) {
    const { authTokens } = useContext(AuthContext);
    const { isDark } = useTheme();
    const [vehiculos, setVehiculos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [vehiculoEdit, setVehiculoEdit] = useState(null);

    const bg = isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200';
    const text = isDark ? 'text-white' : 'text-slate-900';
    const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';
    const border = isDark ? 'border-slate-800' : 'border-slate-200';

    useEffect(() => {
        if (isOpen && cliente) {
            fetchVehiculos();
        }
    }, [isOpen, cliente]);

    const fetchVehiculos = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`http://localhost:8000/api/v1/vehiculos/?propietario_id=${cliente.id}`, {
                headers: { Authorization: `Bearer ${authTokens?.access}` }
            });
            setVehiculos(res.data);
        } catch (error) {
            console.error('Error fetching vehiculos', error);
        }
        setLoading(false);
    };

    const handleDelete = async (id, placa) => {
        if (!window.confirm(`¿Seguro que deseas eliminar el vehículo placa ${placa}?`)) return;
        try {
            await axios.delete(`http://localhost:8000/api/v1/vehiculos/${id}/`, {
                headers: { Authorization: `Bearer ${authTokens?.access}` }
            });
            fetchVehiculos();
            if (onUpdate) onUpdate();
        } catch (error) {
            alert(error.response?.data?.error || 'Error al eliminar el vehículo');
        }
    };

    return (
        <>
            <div className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} onClick={onClose} />
            
            <div className={`fixed inset-y-0 right-0 w-full md:w-[500px] shadow-2xl z-50 transform transition-transform duration-300 flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'} ${bg}`}>
                
                {/* Header */}
                <div className={`px-6 py-5 border-b ${border} flex justify-between items-center bg-blue-600`}>
                    <div>
                        <h2 className="text-xl font-bold text-white">Vehículos Registrados</h2>
                        <p className="text-blue-100 text-sm mt-1">{cliente?.nombre_completo || cliente?.first_name}</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-white/20 text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    <button 
                        onClick={() => { setVehiculoEdit({ propietario: cliente }); setModalOpen(true); }}
                        className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-blue-400 text-blue-500 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors font-medium mb-6"
                    >
                        <Plus size={20} /> Registrar Nuevo Vehículo
                    </button>

                    {loading ? (
                        <div className="flex justify-center p-10"><Loader2 className="animate-spin text-blue-500" size={32} /></div>
                    ) : vehiculos.length === 0 ? (
                        <div className={`text-center p-10 border rounded-xl ${isDark ? 'border-slate-800 bg-slate-800/50' : 'border-slate-200 bg-slate-50'}`}>
                            <Car size={48} className="mx-auto text-slate-300 mb-3" />
                            <p className={textMuted}>Este cliente no tiene vehículos registrados.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {vehiculos.map(v => (
                                <div key={v.id} className={`p-5 rounded-xl border ${border} ${isDark ? 'bg-slate-800/80 hover:bg-slate-800' : 'bg-white hover:border-blue-300 hover:shadow-md'} transition-all group relative`}>
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-3">
                                            <div className="p-3 bg-blue-100 dark:bg-blue-900/40 text-blue-600 rounded-lg">
                                                <Car size={24} />
                                            </div>
                                            <div>
                                                <h3 className={`font-bold text-lg leading-tight uppercase ${text}`}>{v.placa}</h3>
                                                <p className={textMuted}>{v.marca} {v.modelo} - {v.año}</p>
                                                <p className={`text-xs mt-1 px-2 border rounded-full inline-block ${isDark ? 'border-slate-600' : 'border-slate-300'} font-medium`}>{v.color}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => { setVehiculoEdit({ ...v, propietario: cliente }); setModalOpen(true); }} className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-700 text-blue-400' : 'hover:bg-slate-100 text-blue-600'}`} title="Editar">
                                            <Edit2 size={16} />
                                        </button>
                                        <button onClick={() => handleDelete(v.id, v.placa)} className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-700 text-red-400' : 'hover:bg-red-50 text-red-600'}`} title="Eliminar">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Vehiculo Modal */}
            <VehiculoFormModal 
                isOpen={modalOpen} 
                onClose={() => setModalOpen(false)} 
                vehiculo={vehiculoEdit}
                onSaved={() => {
                    fetchVehiculos();
                    if (onUpdate) onUpdate();
                }}
            />
        </>
    );
}
