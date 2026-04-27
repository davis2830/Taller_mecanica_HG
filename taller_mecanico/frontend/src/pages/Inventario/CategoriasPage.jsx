import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { AuthContext } from '../../context/AuthContext';
import axios from 'axios';
import { 
    Search, Plus, RefreshCw, Loader2, Edit2, LayoutList, Archive
} from 'lucide-react';
import CategoriaFormModal from '../../components/CategoriaFormModal';

export default function CategoriasPage() {
    const { isDark } = useTheme();
    const { authTokens } = useContext(AuthContext);

    const [categorias, setCategorias] = useState([]);
    const [loading, setLoading] = useState(true);

    const [searchQ, setSearchQ] = useState('');
    const [inputQ, setInputQ] = useState('');

    // Modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [categoriaEdit, setCategoriaEdit] = useState(null);

    const headers = { Authorization: `Bearer ${authTokens?.access}` };

    const fetchCategorias = useCallback(async () => {
        setLoading(true);
        try {
            // Note: El endpoint CategoriaViewSet no tiene search por defecto activado en Django en la clase que creaste,
            // Pero trae todas las categorias rápido de todos modos para filtrar en frontend si se desea, 
            // o lo devolvemos tal cual para mostrar todo (no suele haber cientos de categorías).
            const res = await axios.get(`/api/v1/inventario/categorias/`, { headers });
            setCategorias(res.data.results || res.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [authTokens]);

    useEffect(() => {
        fetchCategorias();
    }, [fetchCategorias]);

    useEffect(() => {
        const t = setTimeout(() => setSearchQ(inputQ.toLowerCase()), 300);
        return () => clearTimeout(t);
    }, [inputQ]);

    const handleOpenEdit = (categoria) => {
        setCategoriaEdit(categoria);
        setModalOpen(true);
    };

    const handleOpenNew = () => {
        setCategoriaEdit(null);
        setModalOpen(true);
    };

    const filteredCategorias = categorias.filter(c => 
        c.nombre.toLowerCase().includes(searchQ) || 
        (c.descripcion && c.descripcion.toLowerCase().includes(searchQ))
    );

    // Theme values
    const pageBg   = isDark ? 'bg-[#0a0f1e]' : 'bg-slate-100';
    const cardBg   = isDark ? 'bg-slate-800/70' : 'bg-white';
    const borderC  = isDark ? 'border-slate-700' : 'border-slate-200';
    const txt      = isDark ? 'text-slate-100' : 'text-slate-900';
    const sub      = isDark ? 'text-slate-400' : 'text-slate-500';
    const rowHov   = isDark ? 'hover:bg-slate-700/40' : 'hover:bg-slate-50';
    const inputCls = `w-full rounded-xl border text-sm px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500/50 transition-colors ${isDark ? 'bg-slate-800 border-slate-600 text-white placeholder-slate-500' : 'bg-white border-slate-300 text-slate-800 placeholder-slate-400'}`;

    return (
        <div className={`flex flex-col h-full ${pageBg}`}>
            
            {/* Header */}
            <div className={`shrink-0 px-6 py-5 border-b ${borderC} ${isDark ? 'bg-slate-900' : 'bg-white'} flex items-center justify-between gap-4`}>
                <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${isDark ? 'bg-indigo-500/15' : 'bg-indigo-100'}`}>
                        <LayoutList size={21} className="text-indigo-500" />
                    </div>
                    <div>
                        <h1 className={`text-xl font-extrabold tracking-tight ${txt}`}>Categorías de Productos</h1>
                        <p className={`text-sm mt-0.5 ${sub}`}>Administra grupos para organizar inventario</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={fetchCategorias} className={`flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl transition-all border ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-600' : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200 shadow-sm'}`}>
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <button onClick={handleOpenNew} className="flex items-center gap-2 text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-500/20 transition-all">
                        <Plus size={16} /> Nueva Categoría
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className={`shrink-0 px-6 py-3 border-b ${borderC} ${isDark ? 'bg-slate-900/60' : 'bg-white/80'} flex flex-wrap gap-3 items-center`}>
                <div className="relative flex-1 min-w-[220px] max-w-md">
                    <Search size={15} className={`absolute left-3 top-1/2 -translate-y-1/2 ${sub} pointer-events-none`} />
                    <input
                        type="text"
                        className={`${inputCls} pl-9`}
                        placeholder="Buscar categoría por nombre..."
                        value={inputQ}
                        onChange={(e) => setInputQ(e.target.value)}
                    />
                </div>
            </div>

            {/* Table / Grid */}
            <div className="flex-1 overflow-auto px-6 py-5">
                {loading ? (
                    <div className="flex justify-center py-20"><Loader2 size={32} className="animate-spin text-indigo-500" /></div>
                ) : filteredCategorias.length === 0 ? (
                    <div className={`rounded-xl border ${borderC} ${cardBg} flex flex-col items-center justify-center py-20 gap-3`}>
                        <Archive size={40} className={sub} />
                        <p className={`text-sm font-medium ${sub}`}>No se encontraron categorías.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filteredCategorias.map(c => (
                            <div key={c.id} 
                                onClick={() => handleOpenEdit(c)}
                                className={`rounded-xl border p-5 cursor-pointer flex flex-col justify-between transition-all group ${isDark ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 hover:border-slate-600' : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-md'}`}>
                                
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${isDark ? 'bg-slate-700 text-indigo-400' : 'bg-slate-100 text-indigo-500'}`}>
                                            <LayoutList size={22} />
                                        </div>
                                        <div>
                                            <h3 className={`font-bold text-lg ${txt}`}>{c.nombre}</h3>
                                        </div>
                                    </div>
                                    <button className={`p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity ${isDark ? 'hover:bg-slate-600 text-slate-300' : 'hover:bg-slate-100 text-slate-600'}`}>
                                        <Edit2 size={15} />
                                    </button>
                                </div>
                                
                                {c.descripcion ? (
                                    <p className={`text-sm mt-4 line-clamp-3 ${sub}`}>{c.descripcion}</p>
                                ) : (
                                    <p className={`text-sm mt-4 italic opacity-50 ${sub}`}>Sin descripción</p>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <CategoriaFormModal 
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                categoria={categoriaEdit}
                onSaved={fetchCategorias}
            />
        </div>
    );
}
