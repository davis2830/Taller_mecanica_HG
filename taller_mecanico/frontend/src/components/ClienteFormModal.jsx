import React, { useState, useEffect, useContext } from 'react';
import { X, UserPlus, UserCog, Loader2, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function ClienteFormModal({ isOpen, onClose, cliente, onSaved }) {
    const { authTokens } = useContext(AuthContext);
    const { isDark } = useTheme();
    const [form, setForm] = useState({
        first_name: '', last_name: '', email: '', telefono: '',
        nit: 'CF', nombre_fiscal: '', direccion_fiscal: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const isEdit = !!cliente;
    const headers = { Authorization: `Bearer ${authTokens?.access}` };

    useEffect(() => {
        if (isOpen) {
            if (cliente) {
                setForm({
                    first_name: cliente.first_name || '',
                    last_name: cliente.last_name || '',
                    email: cliente.email || '',
                    telefono: cliente.perfil?.telefono || '',
                    nit: cliente.perfil?.nit || 'CF',
                    nombre_fiscal: cliente.perfil?.nombre_fiscal || '',
                    direccion_fiscal: cliente.perfil?.direccion_fiscal || '',
                });
            } else {
                setForm({
                    first_name: '', last_name: '', email: '', telefono: '',
                    nit: 'CF', nombre_fiscal: '', direccion_fiscal: ''
                });
            }
            setError('');
        }
    }, [isOpen, cliente]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            if (isEdit) {
                await axios.put(`/api/v1/usuarios/clientes/${cliente.id}/`, form, { headers });
            } else {
                await axios.post('/api/v1/usuarios/clientes/', form, { headers });
            }
            onSaved();
            onClose();
        } catch (err) {
            console.error('Error guardando cliente:', err);
            const data = err.response?.data;
            if (!data) {
                setError(`Error de conexión (${err.message}). Verifica que el servidor esté activo.`);
            } else if (typeof data === 'object') {
                const msgs = Object.entries(data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' | ');
                setError(msgs);
            } else {
                setError(String(data));
            }
        }
        setLoading(false);
    };

    // Estilos
    const bg = isDark ? 'bg-slate-900' : 'bg-white';
    const inputCls = `w-full px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors outline-none focus:ring-2 focus:ring-blue-500/40 ${
        isDark ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
    }`;
    const labelCls = `block text-xs font-bold uppercase tracking-wider mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`;
    const border = isDark ? 'border-slate-700' : 'border-slate-200';

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className={`${bg} rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border ${border} animate-in fade-in zoom-in-95 duration-200`}>

                {/* Header */}
                <div className={`flex items-center justify-between px-6 py-4 border-b ${border} ${isDark ? 'bg-slate-800' : 'bg-slate-50'}`}>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/15 rounded-xl">
                            {isEdit ? <UserCog size={20} className="text-blue-500" /> : <UserPlus size={20} className="text-blue-500" />}
                        </div>
                        <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            {isEdit ? 'Editar Datos del Cliente' : 'Registrar Nuevo Cliente'}
                        </h2>
                    </div>
                    <button type="button" onClick={onClose} className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>
                        <X size={20} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {error && (
                        <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                            <AlertCircle size={16} className="mt-0.5 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelCls}>Nombres *</label>
                            <input className={inputCls} value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} placeholder="Ej. Juan Carlos" required />
                        </div>
                        <div>
                            <label className={labelCls}>Apellidos *</label>
                            <input className={inputCls} value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} placeholder="Ej. Pérez" required />
                        </div>
                    </div>

                    <div>
                        <label className={labelCls}>Correo Electrónico *</label>
                        <input type="email" className={inputCls} value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="correo@ejemplo.com" required />
                        <p className={`mt-1 text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>El sistema usará esto para crear su usuario.</p>
                    </div>

                    <div>
                        <label className={labelCls}>Teléfono / Whatsapp</label>
                        <input className={inputCls} value={form.telefono} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} placeholder="+123456789" />
                    </div>

                    {/* Datos fiscales (SAT Guatemala) */}
                    <div className={`pt-2 mt-2 border-t ${border}`}>
                        <div className={`text-xs font-bold uppercase tracking-wider mb-3 ${isDark ? 'text-orange-400' : 'text-orange-600'}`}>
                            Datos fiscales (FEL SAT)
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={labelCls}>NIT</label>
                                <input
                                    className={inputCls}
                                    value={form.nit}
                                    onChange={e => setForm(f => ({ ...f, nit: e.target.value.toUpperCase() }))}
                                    placeholder="CF o 1234567-8"
                                />
                                <p className={`mt-1 text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Usa <span className="font-mono font-bold">CF</span> para Consumidor Final.</p>
                            </div>
                            <div>
                                <label className={labelCls}>Nombre Fiscal</label>
                                <input
                                    className={inputCls}
                                    value={form.nombre_fiscal}
                                    onChange={e => setForm(f => ({ ...f, nombre_fiscal: e.target.value }))}
                                    placeholder="(opcional) Razón social"
                                />
                            </div>
                        </div>
                        <div className="mt-4">
                            <label className={labelCls}>Dirección Fiscal</label>
                            <input
                                className={inputCls}
                                value={form.direccion_fiscal}
                                onChange={e => setForm(f => ({ ...f, direccion_fiscal: e.target.value }))}
                                placeholder="(opcional) Dirección según RTU"
                            />
                        </div>
                    </div>

                    {/* Botones */}
                    <div className="flex gap-3 pt-4">
                        <button type="button" onClick={onClose}
                            className={`flex-1 py-2.5 rounded-xl border font-semibold text-sm transition-colors ${isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-300 text-slate-700 hover:bg-slate-50'}`}>
                            Cancelar
                        </button>
                        <button type="submit" disabled={loading}
                            className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-blue-500/25">
                            {loading && <Loader2 size={16} className="animate-spin" />}
                            {!loading && (isEdit ? <UserCog size={16} /> : <UserPlus size={16} />)}
                            {loading ? 'Guardando...' : (isEdit ? 'Guardar Cambios' : 'Registrar Cliente')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
