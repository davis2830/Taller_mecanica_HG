import React, { useState, useEffect, useContext } from 'react';
import { X, Car, Loader2, AlertCircle, Wrench, Navigation, Fingerprint } from 'lucide-react';
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
        marca: '', modelo: '', año: new Date().getFullYear(), placa: '', color: '', propietario_id: '',
        vin_chasis: '', numero_motor: '', cilindrada_motor: '',
        tipo_combustible: '', transmision: '',
        kilometraje_actual: '', unidad_medida_kilometraje: 'KM'
    });
    
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const isEdit = !!vehiculo?.id;
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
                    vin_chasis: vehiculo.vin_chasis || '',
                    numero_motor: vehiculo.numero_motor || '',
                    cilindrada_motor: vehiculo.cilindrada_motor || '',
                    tipo_combustible: vehiculo.tipo_combustible || '',
                    transmision: vehiculo.transmision || '',
                    kilometraje_actual: vehiculo.kilometraje_actual || '',
                    unidad_medida_kilometraje: vehiculo.unidad_medida_kilometraje || 'KM'
                });
                if (p) {
                    setClienteSeleccionado({ value: p.id, label: `${p.full_name || p.username} (${p.username})` });
                }
            } else {
                setForm({ 
                    marca: '', modelo: '', año: new Date().getFullYear(), placa: '', color: '', propietario_id: '',
                    vin_chasis: '', numero_motor: '', cilindrada_motor: '', tipo_combustible: '', transmision: '',
                    kilometraje_actual: '', unidad_medida_kilometraje: 'KM'
                });
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

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(f => ({ ...f, [name]: value }));
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
            const payload = { 
                ...form, 
                propietario_id: Number(form.propietario_id),
                kilometraje_actual: form.kilometraje_actual ? parseInt(form.kilometraje_actual) : null
            };
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
    const inputCls = `w-full px-3 py-2 rounded-lg border text-sm font-medium transition-colors outline-none focus:ring-2 focus:ring-blue-500/40 ${
        isDark ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
    }`;
    const labelCls = `block text-[11px] font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`;
    const border = isDark ? 'border-slate-700' : 'border-slate-200';
    const sectionTitleCls = `flex items-center gap-2 text-sm font-bold uppercase tracking-wider mb-3 mt-5 pb-2 border-b ${isDark ? 'text-blue-400 border-slate-800' : 'text-blue-600 border-slate-100'}`;

    const selectStyles = {
        control: (b, s) => ({
            ...b,
            backgroundColor: isDark ? '#1e293b' : '#f8fafc',
            borderColor: s.isFocused ? '#3b82f6' : isDark ? '#334155' : '#e2e8f0',
            boxShadow: s.isFocused ? '0 0 0 2px rgba(59,130,246,0.3)' : 'none',
            borderRadius: '0.5rem',
            minHeight: '38px',
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className={`${bg} rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border ${border} animate-in fade-in zoom-in-95 duration-200 mt-10 mb-10`}>

                {/* Header */}
                <div className={`flex items-center justify-between px-6 py-4 border-b sticky top-0 z-10 ${border} ${isDark ? 'bg-slate-800' : 'bg-slate-50'}`}>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/15 rounded-xl">
                            <Car size={20} className="text-blue-500" />
                        </div>
                        <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            {isEdit ? 'Editar Vehículo' : 'Registrar Nuevo Vehículo'}
                        </h2>
                    </div>
                    <button onClick={onClose} type="button" className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>
                        <X size={20} />
                    </button>
                </div>

                {/* Form Body */}
                <div className="p-6 max-h-[70vh] overflow-y-auto">
                    <form id="vehiculo-form" onSubmit={handleSubmit} className="space-y-2">
                        {error && (
                            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm mb-4">
                                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        <div className="mb-4">
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
                                menuPortalTarget={document.body}
                            />
                        </div>

                        {/* SECCIÓN 1: Identificación */}
                        <h3 className={sectionTitleCls}><Fingerprint size={16}/> Identificación Básica y Legal</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
                            <div>
                                <label className={labelCls}>Placa *</label>
                                <input name="placa" className={`${inputCls} !uppercase tracking-widest font-mono text-center bg-blue-50/50 dark:bg-blue-900/10`} value={form.placa} onChange={e => handleChange({ target: { name: 'placa', value: e.target.value.toUpperCase() } })} placeholder="P123ABC" required />
                            </div>
                            <div>
                                <label className={labelCls}>VIN / Chasis</label>
                                <input name="vin_chasis" className={`${inputCls} !uppercase font-mono`} value={form.vin_chasis} onChange={e => handleChange({ target: { name: 'vin_chasis', value: e.target.value.toUpperCase() } })} placeholder="1HGCM82633A..." />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="md:col-span-2">
                                <label className={labelCls}>Marca *</label>
                                <input name="marca" className={inputCls} value={form.marca} onChange={handleChange} placeholder="Ej: Toyota" required />
                            </div>
                            <div>
                                <label className={labelCls}>Modelo *</label>
                                <input name="modelo" className={inputCls} value={form.modelo} onChange={handleChange} placeholder="Ej: Yaris" required />
                            </div>
                            <div>
                                <label className={labelCls}>Año *</label>
                                <input name="año" type="number" className={inputCls} value={form.año} onChange={handleChange} min="1950" max={new Date().getFullYear() + 1} required />
                            </div>
                        </div>

                        {/* SECCIÓN 2: Motorización y Técnica */}
                        <h3 className={sectionTitleCls}><Wrench size={16}/> Motorización y Ficha Técnica</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="md:col-span-2">
                                <label className={labelCls}>Cilindrada (Motor)</label>
                                <input name="cilindrada_motor" className={inputCls} value={form.cilindrada_motor} onChange={handleChange} placeholder="Ej: 2.0L o 2000cc" />
                            </div>
                            <div className="md:col-span-2">
                                <label className={labelCls}>Número de Motor</label>
                                <input name="numero_motor" className={inputCls} value={form.numero_motor} onChange={handleChange} placeholder="Ej: 2TR-FE-12..." />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                            <div>
                                <label className={labelCls}>Color Exterior *</label>
                                <input name="color" className={inputCls} value={form.color} onChange={handleChange} placeholder="Ej: Rojo Perlado" required />
                            </div>
                            <div>
                                <label className={labelCls}>Combustible</label>
                                <select name="tipo_combustible" className={inputCls} value={form.tipo_combustible} onChange={handleChange}>
                                    <option value="">(Desconocido)</option>
                                    <option value="GASOLINA">Gasolina</option>
                                    <option value="DIESEL">Diesel</option>
                                    <option value="HIBRIDO">Híbrido</option>
                                    <option value="ELECTRICO">Eléctrico</option>
                                </select>
                            </div>
                            <div>
                                <label className={labelCls}>Transmisión</label>
                                <select name="transmision" className={inputCls} value={form.transmision} onChange={handleChange}>
                                    <option value="">(Desconocida)</option>
                                    <option value="AUTOMATICA">Automática</option>
                                    <option value="MECANICA">Mecánica</option>
                                    <option value="CVT">CVT</option>
                                </select>
                            </div>
                        </div>

                        {/* SECCIÓN 3: Odómetro */}
                        <h3 className={sectionTitleCls}><Navigation size={16}/> Tablero y Odómetro</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={labelCls}>Unidad de Medida *</label>
                                <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                                    <label className={`flex-1 flex justify-center py-1.5 rounded-md text-sm font-bold cursor-pointer transition-colors ${form.unidad_medida_kilometraje === 'KM' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}>
                                        <input type="radio" name="unidad_medida_kilometraje" value="KM" checked={form.unidad_medida_kilometraje === 'KM'} onChange={handleChange} className="hidden" />
                                        Kilómetros (KM)
                                    </label>
                                    <label className={`flex-1 flex justify-center py-1.5 rounded-md text-sm font-bold cursor-pointer transition-colors ${form.unidad_medida_kilometraje === 'MI' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}>
                                        <input type="radio" name="unidad_medida_kilometraje" value="MI" checked={form.unidad_medida_kilometraje === 'MI'} onChange={handleChange} className="hidden" />
                                        Millas (MI)
                                    </label>
                                </div>
                            </div>
                            <div>
                                <label className={labelCls}>Lec. Odómetro (Opcional)</label>
                                <input name="kilometraje_actual" type="number" step="1" className={inputCls} value={form.kilometraje_actual} onChange={handleChange} placeholder={`Ej: 54000`} />
                            </div>
                        </div>
                    </form>
                </div>

                {/* Footer Buttons */}
                <div className={`p-4 border-t ${border} ${isDark ? 'bg-slate-800' : 'bg-slate-50'} flex justify-end gap-3`}>
                    <button type="button" onClick={onClose}
                        className={`px-5 py-2.5 rounded-xl border font-semibold text-sm transition-colors ${isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-300 text-slate-700 hover:bg-slate-100'}`}>
                        Cancelar
                    </button>
                    <button type="submit" form="vehiculo-form" disabled={loading}
                        className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-blue-500/25">
                        {loading ? <Loader2 size={16} className="animate-spin" /> : <Car size={16} />}
                        {loading ? 'Guardando...' : isEdit ? 'Guardar Cambios' : 'Registrar Vehículo'}
                    </button>
                </div>
            </div>
        </div>
    );
}
