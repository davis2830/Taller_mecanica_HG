import React, { useState, useEffect, useContext } from 'react';
import { X, Wrench, Loader2, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function ServicioFormModal({ isOpen, onClose, servicio, onSaved }) {
    const { authTokens } = useContext(AuthContext);
    const { isDark } = useTheme();
    
    const [form, setForm] = useState({
        nombre: '',
        descripcion: '',
        duracion: 60,
        precio: '',
        categoria: 'MECANICO'
    });
    
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const isEdit = !!servicio?.id;
    const headers = { Authorization: `Bearer ${authTokens?.access}` };

    useEffect(() => {
        if (isOpen) {
            if (servicio) {
                setForm({
                    nombre: servicio.nombre || '',
                    descripcion: servicio.descripcion || '',
                    duracion: servicio.duracion || 60,
                    precio: servicio.precio || '',
                    categoria: servicio.categoria || 'MECANICO'
                });
            } else {
                setForm({
                    nombre: '',
                    descripcion: '',
                    duracion: 60,
                    precio: '',
                    categoria: 'MECANICO'
                });
            }
            setError('');
        }
    }, [isOpen, servicio]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(f => ({ ...f, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        
        try {
            const payload = { 
                ...form, 
                duracion: parseInt(form.duracion),
                precio: parseFloat(form.precio)
            };
            
            if (isEdit) {
                await axios.put(`http://localhost:8000/api/v1/citas/servicios/${servicio.id}/`, payload, { headers });
            } else {
                await axios.post('http://localhost:8000/api/v1/citas/servicios/', payload, { headers });
            }
            onSaved();
            onClose();
        } catch (err) {
            console.error('Error guardando servicio:', err);
            const data = err.response?.data;
            if (!data) {
                setError(`Error de conexión (${err.message}). Verifica que el servidor esté activo.`);
            } else if (data.error) {
                setError(data.error);
            } else if (typeof data === 'object') {
                const msgs = Object.entries(data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' | ');
                setError(msgs);
            } else {
                setError(String(data));
            }
        }
        setLoading(false);
    };

    const bg = isDark ? 'bg-slate-900' : 'bg-white';
    const inputCls = `w-full px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors outline-none focus:ring-2 focus:ring-blue-500/40 ${
        isDark ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
    }`;
    const labelCls = `block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`;
    const border = isDark ? 'border-slate-700' : 'border-slate-200';

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className={`${bg} rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border ${border} animate-in fade-in zoom-in-95 duration-200`}>

                {/* Header */}
                <div className={`flex items-center justify-between px-6 py-4 border-b ${border} ${isDark ? 'bg-slate-800' : 'bg-slate-50'}`}>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/15 rounded-xl">
                            <Wrench size={20} className="text-blue-500" />
                        </div>
                        <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            {isEdit ? 'Editar Servicio' : 'Nuevo Servicio'}
                        </h2>
                    </div>
                    <button onClick={onClose} type="button" className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                            <AlertCircle size={16} className="mt-0.5 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    <div>
                        <label className={labelCls}>Nombre del Servicio *</label>
                        <input name="nombre" className={inputCls} value={form.nombre} onChange={handleChange} placeholder="Ej: Cambio de Aceite Premium" required />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelCls}>Categoría *</label>
                            <select name="categoria" className={inputCls} value={form.categoria} onChange={handleChange} required>
                                <option value="MECANICO">Servicio Mecánico</option>
                                <option value="CARWASH">Lavado / Detailing</option>
                            </select>
                        </div>
                        <div>
                            <label className={labelCls}>Duración (minutos) *</label>
                            <input type="number" name="duracion" className={inputCls} value={form.duracion} onChange={handleChange} min="5" step="5" required />
                        </div>
                    </div>

                    <div>
                        <label className={labelCls}>Precio Base *</label>
                        <div className="relative">
                            <span className="absolute left-3 top-2.5 font-bold text-slate-400">Q</span>
                            <input type="number" name="precio" className={`${inputCls} pl-8`} value={form.precio} onChange={handleChange} min="0" step="0.01" placeholder="0.00" required />
                        </div>
                    </div>

                    <div>
                        <label className={labelCls}>Descripción / Detalles</label>
                        <textarea name="descripcion" className={`${inputCls} resize-none h-20`} value={form.descripcion} onChange={handleChange} placeholder="Incluye revisión de 10 puntos, lubricante sintético..." />
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button type="button" onClick={onClose}
                            className={`flex-1 py-2.5 rounded-xl border font-semibold text-sm transition-colors ${isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-300 text-slate-700 hover:bg-slate-50'}`}>
                            Cancelar
                        </button>
                        <button type="submit" disabled={loading}
                            className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-blue-500/25">
                            {loading ? <Loader2 size={16} className="animate-spin" /> : <Wrench size={16} />}
                            {loading ? 'Guardando...' : 'Guardar Servicio'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
