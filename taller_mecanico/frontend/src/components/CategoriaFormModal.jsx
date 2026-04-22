import React, { useState, useEffect, useContext } from 'react';
import { X, LayoutList, Loader2, Save } from 'lucide-react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function CategoriaFormModal({ isOpen, onClose, categoria, onSaved }) {
    const { authTokens } = useContext(AuthContext);
    const { isDark } = useTheme();
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        nombre: '',
        descripcion: ''
    });

    useEffect(() => {
        if (isOpen) {
            if (categoria) {
                setFormData({
                    nombre: categoria.nombre || '',
                    descripcion: categoria.descripcion || ''
                });
            } else {
                setFormData({ nombre: '', descripcion: '' });
            }
        }
    }, [isOpen, categoria]);

    if (!isOpen) return null;

    const bg = isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200';
    const text = isDark ? 'text-white' : 'text-slate-900';
    const sub = isDark ? 'text-slate-400' : 'text-slate-500';
    const inputCls = `w-full rounded-xl border text-sm px-3 py-2.5 outline-none transition-colors ${isDark ? 'bg-slate-800 border-slate-700 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-500'}`;
    const labelCls = `block text-xs font-bold mb-1.5 ml-1 ${isDark ? 'text-slate-300' : 'text-slate-600'}`;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (categoria?.id) {
                await axios.put(`http://localhost:8000/api/v1/inventario/categorias/${categoria.id}/`, formData, {
                    headers: { Authorization: `Bearer ${authTokens?.access}` }
                });
            } else {
                await axios.post('http://localhost:8000/api/v1/inventario/categorias/', formData, {
                    headers: { Authorization: `Bearer ${authTokens?.access}` }
                });
            }
            onSaved();
            onClose();
        } catch (err) {
            console.error(err);
            alert("Error al guardar la categoría. Asegúrate de que el nombre no esté duplicado.");
        }
        setLoading(false);
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className={`w-full max-w-md rounded-2xl shadow-2xl flex flex-col max-h-[90vh] ${bg}`}>
                
                <div className="px-6 py-5 border-b flex justify-between items-center shrink-0"
                     style={{ borderColor: isDark ? '#1e293b' : '#e2e8f0' }}>
                    <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl ${isDark ? 'bg-indigo-500/15' : 'bg-indigo-100'}`}>
                            <LayoutList size={20} className="text-indigo-500" />
                        </div>
                        <div>
                            <h2 className={`text-lg font-black ${text}`}>
                                {categoria ? 'Editar Categoría' : 'Nueva Categoría'}
                            </h2>
                            <p className={`text-xs ${sub}`}>Clasificación de inventario</p>
                        </div>
                    </div>
                    <button onClick={onClose} className={`p-2 rounded-full transition-colors ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>
                        <X size={20} />
                    </button>
                </div>

                <form id="categoriaForm" onSubmit={handleSubmit} className="p-6 space-y-5">
                    <div>
                        <label className={labelCls}>Nombre de la Categoría *</label>
                        <input
                            required
                            name="nombre"
                            value={formData.nombre}
                            onChange={handleChange}
                            type="text"
                            placeholder="Ej. Lubricantes, Filtros..."
                            className={inputCls}
                        />
                    </div>
                    <div>
                        <label className={labelCls}>Descripción (Opcional)</label>
                        <textarea
                            name="descripcion"
                            value={formData.descripcion}
                            onChange={handleChange}
                            rows="3"
                            placeholder="Breve descripción..."
                            className={`${inputCls} resize-none`}
                        />
                    </div>
                </form>

                <div className="px-6 py-4 border-t flex justify-end gap-3 shrink-0"
                     style={{ borderColor: isDark ? '#1e293b' : '#e2e8f0' }}>
                    <button type="button" onClick={onClose} disabled={loading}
                        className={`px-4 py-2 text-sm font-semibold rounded-xl border transition-colors ${
                            isDark ? 'border-slate-700 text-slate-300 hover:bg-slate-800' 
                                   : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}>
                        Cancelar
                    </button>
                    <button type="submit" form="categoriaForm" disabled={loading || !formData.nombre.trim()}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2 disabled:opacity-50">
                        {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} 
                        Guardar Categoría
                    </button>
                </div>
            </div>
        </div>
    );
}
