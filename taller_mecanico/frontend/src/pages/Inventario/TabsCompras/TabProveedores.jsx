import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import { AuthContext } from '../../../context/AuthContext';
import axios from 'axios';
import { Plus, Search, MapPin, Phone, Mail, Edit2, Loader2, Building2 } from 'lucide-react';
import ProveedorFormModal from '../../../components/ProveedorFormModal';

export default function TabProveedores() {
    const { isDark } = useTheme();
    const { authTokens } = useContext(AuthContext);

    const [proveedores, setProveedores] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQ, setSearchQ] = useState('');
    const [inputQ, setInputQ] = useState('');

    const [modalOpen, setModalOpen] = useState(false);
    const [proveedorEdit, setProveedorEdit] = useState(null);

    const headers = { Authorization: `Bearer ${authTokens?.access}` };

    const fetchProveedores = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/v1/inventario/proveedores/', { headers });
            setProveedores(res.data.results || res.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [authTokens]);

    useEffect(() => {
        fetchProveedores();
    }, [fetchProveedores]);

    useEffect(() => {
        const t = setTimeout(() => setSearchQ(inputQ.toLowerCase()), 300);
        return () => clearTimeout(t);
    }, [inputQ]);

    const handleOpenEdit = (prov) => {
        setProveedorEdit(prov);
        setModalOpen(true);
    };

    const handleOpenNew = () => {
        setProveedorEdit(null);
        setModalOpen(true);
    };

    const filtered = proveedores.filter(p => 
        p.nombre.toLowerCase().includes(searchQ) || 
        (p.nit && p.nit.toLowerCase().includes(searchQ)) ||
        (p.contacto && p.contacto.toLowerCase().includes(searchQ))
    );

    const borderC  = isDark ? 'border-slate-700' : 'border-slate-200';
    const bgCard   = isDark ? 'bg-slate-800/70' : 'bg-white';
    const txt      = isDark ? 'text-slate-100' : 'text-slate-900';
    const sub      = isDark ? 'text-slate-400' : 'text-slate-500';
    const inputCls = `w-full rounded-xl border text-sm px-3 py-2.5 outline-none focus:ring-2 focus:ring-teal-500/50 transition-colors ${isDark ? 'bg-slate-800 border-slate-600 text-white placeholder-slate-500' : 'bg-white border-slate-300 text-slate-800 placeholder-slate-400'}`;

    return (
        <div className="flex flex-col h-full absolute inset-0">
            <div className={`shrink-0 px-6 py-4 border-b ${borderC} flex justify-between items-center bg-transparent`}>
                <div className="relative w-full max-w-md">
                    <Search size={15} className={`absolute left-3 top-1/2 -translate-y-1/2 ${sub} pointer-events-none`} />
                    <input
                        type="text"
                        className={`${inputCls} pl-9`}
                        placeholder="Buscar proveedor por nombre, nit o contacto..."
                        value={inputQ}
                        onChange={(e) => setInputQ(e.target.value)}
                    />
                </div>
                <button onClick={handleOpenNew} className="flex items-center gap-2 text-sm font-bold bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-xl shadow-lg shadow-teal-500/20 transition-all">
                    <Plus size={16} /> Agregar Proveedor
                </button>
            </div>

            <div className="flex-1 overflow-auto p-6">
                {loading ? (
                    <div className="flex justify-center py-20"><Loader2 size={32} className="animate-spin text-teal-500" /></div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <Building2 size={40} className={sub} />
                        <p className={`text-sm font-medium ${sub}`}>No hay proveedores registrados.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {filtered.map(p => (
                            <div key={p.id} className={`rounded-2xl border ${borderC} ${bgCard} p-5 flex flex-col justify-between hover:shadow-lg transition-all group relative overflow-hidden`}>
                                {!p.activo && (
                                    <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl z-10">
                                        INACTIVO
                                    </div>
                                )}
                                <div>
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <h3 className={`font-bold text-lg leading-tight ${txt} pr-8`} title={p.nombre}>{p.nombre}</h3>
                                            <p className={`text-xs font-mono mt-1 ${isDark ? 'text-teal-400' : 'text-teal-600'}`}>{p.nit || 'Sin NIT'}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="mt-5 space-y-2.5">
                                        <div className={`flex items-center gap-2 text-sm ${txt}`}>
                                            <div className="w-6 flex justify-center"><Phone size={14} className={sub}/></div>
                                            <span>{p.telefono || <span className="opacity-50 italic">No registrado</span>}</span>
                                        </div>
                                        <div className={`flex items-center gap-2 text-sm ${txt}`}>
                                            <div className="w-6 flex justify-center"><Mail size={14} className={sub}/></div>
                                            <span className="truncate">{p.email || <span className="opacity-50 italic">No registrado</span>}</span>
                                        </div>
                                        <div className={`flex items-center gap-2 text-sm ${txt}`}>
                                            <div className="w-6 flex justify-center"><MapPin size={14} className={sub}/></div>
                                            <span className="truncate">{p.direccion || <span className="opacity-50 italic">No registrado</span>}</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className={`mt-5 pt-4 border-t ${borderC} flex items-center justify-between`}>
                                    <div className="flex flex-col">
                                        <span className={`text-[10px] uppercase font-bold ${sub}`}>Contacto</span>
                                        <span className={`text-sm font-semibold ${txt}`}>{p.contacto || 'N/A'}</span>
                                    </div>
                                    <button onClick={() => handleOpenEdit(p)} className={`p-2 rounded-xl transition-colors ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}>
                                        <Edit2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <ProveedorFormModal 
                isOpen={modalOpen} 
                onClose={() => setModalOpen(false)} 
                proveedor={proveedorEdit} 
                onSaved={fetchProveedores} 
            />
        </div>
    );
}
