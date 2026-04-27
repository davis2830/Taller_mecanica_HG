import React, { useState, useEffect, useContext } from 'react';
import { X, Building2, Loader2, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const DIAS_CHOICES = [
    { value: 0, label: 'Contado (0 días)' },
    { value: 8, label: '8 días' },
    { value: 15, label: '15 días' },
    { value: 30, label: '30 días' },
    { value: 45, label: '45 días' },
    { value: 60, label: '60 días' },
    { value: 90, label: '90 días' },
];

const EMPTY = {
    nit: '', razon_social: '', nombre_comercial: '',
    direccion_fiscal: '', email_cobro: '',
    contacto_principal: '', telefono: '',
    dias_credito: 30, limite_credito: '0.00',
    recordatorios_activos: true, activo: true, notas: '',
};

export default function EmpresaFormModal({ isOpen, onClose, empresa, onSaved }) {
    const { authTokens } = useContext(AuthContext);
    const { isDark } = useTheme();
    const [form, setForm] = useState(EMPTY);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const isEdit = !!empresa;
    const headers = { Authorization: `Bearer ${authTokens?.access}` };

    useEffect(() => {
        if (!isOpen) return;
        if (empresa) {
            setForm({
                nit: empresa.nit || '',
                razon_social: empresa.razon_social || '',
                nombre_comercial: empresa.nombre_comercial || '',
                direccion_fiscal: empresa.direccion_fiscal || '',
                email_cobro: empresa.email_cobro || '',
                contacto_principal: empresa.contacto_principal || '',
                telefono: empresa.telefono || '',
                dias_credito: empresa.dias_credito ?? 30,
                limite_credito: String(empresa.limite_credito ?? '0.00'),
                recordatorios_activos: empresa.recordatorios_activos ?? true,
                activo: empresa.activo ?? true,
                notas: empresa.notas || '',
            });
        } else {
            setForm(EMPTY);
        }
        setError('');
    }, [isOpen, empresa]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const payload = { ...form, limite_credito: form.limite_credito || '0.00' };
            if (isEdit) {
                await axios.patch(`/api/v1/usuarios/empresas/${empresa.id}/`, payload, { headers });
            } else {
                await axios.post('/api/v1/usuarios/empresas/', payload, { headers });
            }
            onSaved();
            onClose();
        } catch (err) {
            const data = err.response?.data;
            if (!data) {
                setError(`Error de conexión (${err.message}).`);
            } else if (typeof data === 'object') {
                setError(Object.entries(data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' | '));
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
    const labelCls = `block text-xs font-bold uppercase tracking-wider mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`;
    const border = isDark ? 'border-slate-700' : 'border-slate-200';

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className={`${bg} rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border ${border}`}>
                <div className={`flex items-center justify-between px-6 py-4 border-b sticky top-0 z-10 ${border} ${isDark ? 'bg-slate-800' : 'bg-slate-50'}`}>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-500/15 rounded-xl">
                            <Building2 size={20} className="text-indigo-500" />
                        </div>
                        <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            {isEdit ? `Editar Empresa: ${empresa.razon_social}` : 'Nueva Empresa (CxC)'}
                        </h2>
                    </div>
                    <button type="button" onClick={onClose} className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {error && (
                        <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                            <AlertCircle size={16} className="mt-0.5 shrink-0" />
                            <span className="break-words">{error}</span>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className={labelCls}>NIT *</label>
                            <input className={inputCls} value={form.nit} onChange={e => setForm(f => ({ ...f, nit: e.target.value.toUpperCase().trim() }))} placeholder="1234567-8" required />
                        </div>
                        <div className="md:col-span-2">
                            <label className={labelCls}>Razón Social *</label>
                            <input className={inputCls} value={form.razon_social} onChange={e => setForm(f => ({ ...f, razon_social: e.target.value }))} placeholder="Distribuidora XYZ, S.A." required />
                        </div>
                    </div>

                    <div>
                        <label className={labelCls}>Nombre Comercial</label>
                        <input className={inputCls} value={form.nombre_comercial} onChange={e => setForm(f => ({ ...f, nombre_comercial: e.target.value }))} placeholder="(opcional)" />
                    </div>

                    <div>
                        <label className={labelCls}>Dirección Fiscal</label>
                        <input className={inputCls} value={form.direccion_fiscal} onChange={e => setForm(f => ({ ...f, direccion_fiscal: e.target.value }))} placeholder="Según RTU" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className={labelCls}>Email de Cobro</label>
                            <input type="email" className={inputCls} value={form.email_cobro} onChange={e => setForm(f => ({ ...f, email_cobro: e.target.value }))} placeholder="cobros@empresa.com" />
                        </div>
                        <div>
                            <label className={labelCls}>Teléfono</label>
                            <input className={inputCls} value={form.telefono} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} placeholder="+502 ..." />
                        </div>
                    </div>

                    <div>
                        <label className={labelCls}>Contacto Principal</label>
                        <input className={inputCls} value={form.contacto_principal} onChange={e => setForm(f => ({ ...f, contacto_principal: e.target.value }))} placeholder="Nombre del responsable de pagos" />
                    </div>

                    <div className={`pt-3 border-t ${border}`}>
                        <div className={`text-xs font-bold uppercase tracking-wider mb-3 ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                            Configuración de Crédito
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className={labelCls}>Días de Crédito *</label>
                                <select
                                    className={inputCls}
                                    value={form.dias_credito}
                                    onChange={e => setForm(f => ({ ...f, dias_credito: parseInt(e.target.value, 10) }))}
                                >
                                    {DIAS_CHOICES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className={labelCls}>Límite de Crédito (Q)</label>
                                <input
                                    type="number" step="0.01" min="0"
                                    className={inputCls}
                                    value={form.limite_credito}
                                    onChange={e => setForm(f => ({ ...f, limite_credito: e.target.value }))}
                                    placeholder="0.00 = sin límite"
                                />
                                <p className={`mt-1 text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>0 = sin límite. Si se excede, bloquea facturación a crédito.</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            <label className={`flex items-center gap-2 text-sm ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                <input
                                    type="checkbox"
                                    checked={form.recordatorios_activos}
                                    onChange={e => setForm(f => ({ ...f, recordatorios_activos: e.target.checked }))}
                                    className="w-4 h-4 rounded"
                                />
                                Recordatorios automáticos de cobro
                            </label>
                            <label className={`flex items-center gap-2 text-sm ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                <input
                                    type="checkbox"
                                    checked={form.activo}
                                    onChange={e => setForm(f => ({ ...f, activo: e.target.checked }))}
                                    className="w-4 h-4 rounded"
                                />
                                Empresa activa (puede facturar)
                            </label>
                        </div>
                    </div>

                    <div>
                        <label className={labelCls}>Notas internas</label>
                        <textarea
                            className={`${inputCls} resize-y`}
                            rows={2}
                            value={form.notas}
                            onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
                            placeholder="(opcional)"
                        />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose}
                            className={`flex-1 py-2.5 rounded-xl border font-semibold text-sm transition-colors ${isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-300 text-slate-700 hover:bg-slate-50'}`}>
                            Cancelar
                        </button>
                        <button type="submit" disabled={loading}
                            className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-indigo-500/25">
                            {loading && <Loader2 size={16} className="animate-spin" />}
                            {isEdit ? 'Guardar Cambios' : 'Crear Empresa'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
