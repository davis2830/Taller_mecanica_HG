import React, { useState, useEffect, useContext } from 'react';
import { X, Car, Loader2, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import Select from 'react-select';

export default function VehiculoFormModal({ isOpen, onClose, vehiculo, onSaved }) {
    const { authTokens } = useContext(AuthContext);
    const { isDark } = useTheme();
    const [clientes, setClientes] = useState([]);
    const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
    const [form, setForm] = useState({
        marca: '', modelo: '', año: new Date().getFullYear(), placa: '', color: '', propietario_id: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const isEdit = !!vehiculo;
    const headers = { Authorization: `Bearer ${authTokens?.access}` };

    useEffect(() => {
        if (isOpen) {
            fetchClientes('');
            if (vehiculo) {
                const p = vehiculo.propietario;
                setForm({
                    marca: vehiculo.marca || '',
                    modelo: vehiculo.modelo || '',
                    año: vehiculo.año || new Date().getFullYear(),
                    placa: vehiculo.placa || '',
                    color: vehiculo.color || '',
                    propietario_id: p?.id || '',
                });
                if (p) {
                    setClienteSeleccionado({ value: p.id, label: `${p.full_name || p.username} (${p.username})` });
                }
            } else {
                setForm({ marca: '', modelo: '', año: new Date().getFullYear(), placa: '', color: '', propietario_id: '' });
                setClienteSeleccionado(null);
            }
            setError('');
        }
    }, [isOpen, vehiculo]);

    const fetchClientes = async (q = '') => {
        try {
            const res = await axios.get(`http://localhost:8000/api/v1/clientes/?q=${encodeURIComponent(q)}`, { headers });
            setClientes(res.data.map(c => ({
                value: c.id,
                label: `${c.full_name || c.username} (${c.username})`,
            })));
        } catch (e) {
            console.error('Error cargando clientes:', e);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.propietario_id) {
            setError('Debes seleccionar un propietario.');
            return;
        }
        setLoading(true);
        setError('');
        try {
            const payload = { ...form, propietario_id: Number(form.propietario_id) };
            if (isEdit) {
                await axios.put(`http://localhost:8000/api/v1/vehiculos/${vehiculo.id}/`, payload, { headers });
            } else {
                await axios.post('http://localhost:8000/api/v1/vehiculos/', payload, { headers });
            }
            onSaved();
            onClose();
        } catch (err) {
            console.error('Error guardando vehículo:', err);
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

    const selectStyles = {
        control: (b, s) => ({
            ...b,
            backgroundColor: isDark ? '#1e293b' : '#f8fafc',
            borderColor: s.isFocused ? '#3b82f6' : isDark ? '#334155' : '#e2e8f0',
            boxShadow: s.isFocused ? '0 0 0 2px rgba(59,130,246,0.3)' : 'none',
            borderRadius: '0.5rem',
            minHeight: '40px',
            fontSize: '0.875rem',
            '&:hover': { borderColor: s.isFocused ? '#3b82f6' : isDark ? '#475569' : '#cbd5e1' },
        }),
        menu: b => ({ ...b, backgroundColor: isDark ? '#1e293b' : 'white', zIndex: 9999 }),
        option: (b, s) => ({
            ...b,
            backgroundColor: s.isSelected ? '#3b82f6' : s.isFocused ? (isDark ? '#334155' : '#f1f5f9') : 'transparent',
            color: s.isSelected ? 'white' : isDark ? '#e2e8f0' : '#0f172a',
            cursor: 'pointer',
        }),
        singleValue: b => ({ ...b, color: isDark ? '#f1f5f9' : '#0f172a' }),
        input: b => ({ ...b, color: isDark ? '#f1f5f9' : '#0f172a' }),
        placeholder: b => ({ ...b, color: isDark ? '#64748b' : '#94a3b8' }),
        menuPortal: b => ({ ...b, zIndex: 9999 }),
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className={`${bg} rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border ${border} animate-in fade-in slide-in-from-bottom-4 duration-200`}>

                {/* Header */}
                <div className={`flex items-center justify-between px-6 py-4 border-b ${border} ${isDark ? 'bg-slate-800' : 'bg-slate-50'}`}>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/15 rounded-xl">
                            <Car size={20} className="text-blue-500" />
                        </div>
                        <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            {isEdit ? 'Editar Vehículo' : 'Registrar Nuevo Vehículo'}
                        </h2>
                    </div>
                    <button onClick={onClose} className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>
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

                    {/* Propietario */}
                    <div>
                        <label className={labelCls}>Propietario / Cliente *</label>
                        <Select
                            options={clientes}
                            value={clienteSeleccionado}
                            onChange={opt => {
                                setClienteSeleccionado(opt || null);
                                setForm(f => ({ ...f, propietario_id: opt ? opt.value : '' }));
                            }}
                            onInputChange={(v) => { if (v.length >= 0) fetchClientes(v); }}
                            placeholder="Buscar por nombre o usuario..."
                            isClearable
                            styles={selectStyles}
                            noOptionsMessage={() => 'Sin resultados - escribe para buscar'}
                            filterOption={() => true}
                            menuPortalTarget={document.body}
                        />
                    </div>

                    {/* Marca / Modelo */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelCls}>Marca *</label>
                            <input className={inputCls} value={form.marca} onChange={e => setForm(f => ({ ...f, marca: e.target.value }))} placeholder="Toyota, Honda..." required />
                        </div>
                        <div>
                            <label className={labelCls}>Modelo *</label>
                            <input className={inputCls} value={form.modelo} onChange={e => setForm(f => ({ ...f, modelo: e.target.value }))} placeholder="Corolla, Civic..." required />
                        </div>
                    </div>

                    {/* Año / Placa */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelCls}>Año *</label>
                            <input type="number" className={inputCls} value={form.año} onChange={e => setForm(f => ({ ...f, año: parseInt(e.target.value) || '' }))} min="1950" max={new Date().getFullYear() + 1} required />
                        </div>
                        <div>
                            <label className={labelCls}>Placa *</label>
                            <input className={`${inputCls} !uppercase tracking-widest font-mono`} value={form.placa} onChange={e => setForm(f => ({ ...f, placa: e.target.value.toUpperCase() }))} placeholder="P123ABC" required />
                        </div>
                    </div>

                    {/* Color */}
                    <div>
                        <label className={labelCls}>Color *</label>
                        <input className={inputCls} value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} placeholder="Blanco, Negro, Rojo..." required />
                    </div>

                    {/* Botones */}
                    <div className="flex gap-3 pt-1">
                        <button type="button" onClick={onClose}
                            className={`flex-1 py-2.5 rounded-xl border font-semibold text-sm transition-colors ${isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-300 text-slate-700 hover:bg-slate-50'}`}>
                            Cancelar
                        </button>
                        <button type="submit" disabled={loading}
                            className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-blue-500/25">
                            {loading ? <Loader2 size={16} className="animate-spin" /> : <Car size={16} />}
                            {loading ? 'Guardando...' : isEdit ? 'Guardar Cambios' : 'Registrar Vehículo'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
