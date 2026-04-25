import React, { useState, useEffect, useContext, useCallback } from 'react';
import axios from 'axios';
import { SlidersHorizontal, Save, Loader2, AlertTriangle, Users, Sun, Clock, CalendarDays } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { AuthContext } from '../../context/AuthContext';

const DIAS = [
    { val: 0, label: 'Lunes' },
    { val: 1, label: 'Martes' },
    { val: 2, label: 'Miércoles' },
    { val: 3, label: 'Jueves' },
    { val: 4, label: 'Viernes' },
    { val: 5, label: 'Sábado' },
    { val: 6, label: 'Domingo' },
];

export default function ConfiguracionTallerPage() {
    const { isDark } = useTheme();
    const { authTokens } = useContext(AuthContext);
    const headers = { Authorization: `Bearer ${authTokens?.access}` };

    const [config, setConfig] = useState(null);
    const [form, setForm] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState(null);
    const [error, setError] = useState(null);

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

    const fetchConfig = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axios.get('http://localhost:8000/api/v1/sistema/configuracion-taller/', { headers });
            setConfig(res.data);
            setForm(res.data);
            setError(null);
        } catch (e) {
            setError(e.response?.data?.detail || e.response?.data?.message || 'No se pudo cargar la configuración.');
        }
        setLoading(false);
    }, []);

    useEffect(() => { fetchConfig(); }, [fetchConfig]);

    const toggleDia = (val) => {
        setForm(f => {
            const cur = new Set(f.dias_laborales || []);
            if (cur.has(val)) cur.delete(val); else cur.add(val);
            return { ...f, dias_laborales: Array.from(cur).sort() };
        });
    };

    const save = async () => {
        setSaving(true);
        try {
            const res = await axios.patch(
                'http://localhost:8000/api/v1/sistema/configuracion-taller/',
                form,
                { headers },
            );
            setConfig(res.data);
            setForm(res.data);
            showToast('Configuración guardada correctamente.', 'success');
        } catch (e) {
            const data = e.response?.data;
            const msg = typeof data === 'string'
                ? data
                : Object.values(data || {}).flat().join(' ') || 'Error al guardar.';
            showToast(msg, 'error');
        }
        setSaving(false);
    };

    const bg = isDark ? 'bg-slate-900' : 'bg-slate-50';
    const cardBg = isDark ? 'bg-slate-800' : 'bg-white';
    const cardBorder = isDark ? 'border-slate-700' : 'border-slate-200';
    const txt = isDark ? 'text-slate-100' : 'text-slate-800';
    const sub = isDark ? 'text-slate-400' : 'text-slate-500';
    const labelCls = `block text-xs font-bold uppercase tracking-wider mb-1.5 ${sub}`;
    const inputCls = `w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDark
        ? 'bg-slate-900 border-slate-600 text-slate-100'
        : 'bg-white border-slate-300 text-slate-800'}`;

    if (loading) {
        return (
            <div className={`min-h-[60vh] flex items-center justify-center ${bg}`}>
                <Loader2 className="animate-spin text-blue-500" size={32} />
            </div>
        );
    }

    if (error) {
        return (
            <div className={`min-h-[60vh] flex items-center justify-center ${bg}`}>
                <div className="flex flex-col items-center gap-2 text-center max-w-md">
                    <AlertTriangle className="text-amber-500" size={32} />
                    <p className={txt}>{error}</p>
                    <p className={`text-xs ${sub}`}>Solo los administradores pueden ver esta sección.</p>
                </div>
            </div>
        );
    }

    const dirty = JSON.stringify(form) !== JSON.stringify(config);

    return (
        <div className={`p-6 max-w-4xl mx-auto ${txt}`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${isDark ? 'bg-blue-500/15' : 'bg-blue-50'}`}>
                        <SlidersHorizontal className="text-blue-500" size={22} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">Configuración del Taller</h1>
                        <p className={`text-sm ${sub}`}>Capacidad, horarios y días laborales del taller.</p>
                    </div>
                </div>
                <button
                    onClick={save}
                    disabled={!dirty || saving}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors"
                >
                    {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                    Guardar cambios
                </button>
            </div>

            {/* Card: Capacidad */}
            <div className={`rounded-xl border ${cardBg} ${cardBorder} p-5 mb-5`}>
                <div className="flex items-center gap-2 mb-1">
                    <Users size={18} className="text-blue-500" />
                    <h2 className="font-bold">Capacidad paralela</h2>
                </div>
                <p className={`text-xs mb-4 ${sub}`}>
                    Cantidad de vehículos que pueden atenderse al mismo tiempo (uno por cada mecánico/carril disponible).
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className={labelCls}>Mecánicos disponibles</label>
                        <input
                            type="number"
                            min={1}
                            className={inputCls}
                            value={form.capacidad_mecanico}
                            onChange={e => setForm({ ...form, capacidad_mecanico: parseInt(e.target.value) || 1 })}
                        />
                        <p className={`text-xs mt-1 ${sub}`}>Citas de mecánica simultáneas permitidas.</p>
                    </div>
                    <div>
                        <label className={labelCls}>Carriles de carwash</label>
                        <input
                            type="number"
                            min={1}
                            className={inputCls}
                            value={form.capacidad_carwash}
                            onChange={e => setForm({ ...form, capacidad_carwash: parseInt(e.target.value) || 1 })}
                        />
                        <p className={`text-xs mt-1 ${sub}`}>Vehículos en lavado simultáneos.</p>
                    </div>
                </div>
            </div>

            {/* Card: Horario */}
            <div className={`rounded-xl border ${cardBg} ${cardBorder} p-5 mb-5`}>
                <div className="flex items-center gap-2 mb-1">
                    <Clock size={18} className="text-blue-500" />
                    <h2 className="font-bold">Horario de atención</h2>
                </div>
                <p className={`text-xs mb-4 ${sub}`}>Las citas deben iniciar dentro de este rango. La última cita permitida empezará antes del cierre según su duración.</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                        <label className={labelCls}>Apertura</label>
                        <input
                            type="time"
                            className={inputCls}
                            value={form.hora_apertura}
                            onChange={e => setForm({ ...form, hora_apertura: e.target.value })}
                            style={{ colorScheme: isDark ? 'dark' : 'light' }}
                        />
                    </div>
                    <div>
                        <label className={labelCls}>Cierre</label>
                        <input
                            type="time"
                            className={inputCls}
                            value={form.hora_cierre}
                            onChange={e => setForm({ ...form, hora_cierre: e.target.value })}
                            style={{ colorScheme: isDark ? 'dark' : 'light' }}
                        />
                    </div>
                    <div>
                        <label className={labelCls}>Granularidad del slot</label>
                        <select
                            className={inputCls}
                            value={form.granularidad_slot}
                            onChange={e => setForm({ ...form, granularidad_slot: parseInt(e.target.value) })}
                        >
                            <option value={15}>Cada 15 min</option>
                            <option value={30}>Cada 30 min</option>
                            <option value={60}>Cada 60 min</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Card: Días laborales */}
            <div className={`rounded-xl border ${cardBg} ${cardBorder} p-5 mb-5`}>
                <div className="flex items-center gap-2 mb-1">
                    <CalendarDays size={18} className="text-blue-500" />
                    <h2 className="font-bold">Días laborales</h2>
                </div>
                <p className={`text-xs mb-4 ${sub}`}>Los días NO seleccionados no aparecerán como disponibles para agendar.</p>
                <div className="flex flex-wrap gap-2">
                    {DIAS.map(d => {
                        const active = (form.dias_laborales || []).includes(d.val);
                        return (
                            <button
                                key={d.val}
                                type="button"
                                onClick={() => toggleDia(d.val)}
                                className={`px-3 py-1.5 text-sm font-semibold rounded-lg border transition-colors ${active
                                    ? 'bg-blue-600 border-blue-600 text-white'
                                    : isDark
                                        ? 'bg-slate-900 border-slate-600 text-slate-300 hover:bg-slate-700'
                                        : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                                    }`}
                            >
                                {d.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {config?.actualizado_el && (
                <p className={`text-xs ${sub}`}>
                    Última actualización: {new Date(config.actualizado_el).toLocaleString('es-GT')}
                </p>
            )}

            {toast && (
                <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 text-sm font-semibold text-white ${toast.type === 'error' ? 'bg-red-600' : 'bg-emerald-600'}`}>
                    {toast.msg}
                </div>
            )}
        </div>
    );
}
