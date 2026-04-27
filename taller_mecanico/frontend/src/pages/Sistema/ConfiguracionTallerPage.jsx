import React, { useState, useEffect, useContext, useCallback } from 'react';
import axios from 'axios';
import { SlidersHorizontal, Save, Loader2, AlertTriangle, Users, Sun, Clock, CalendarDays, ClipboardList, Image as ImageIcon, Upload, Trash2 } from 'lucide-react';
import { refreshMarca } from '../../context/MarcaContext';
import { useTheme } from '../../context/ThemeContext';
import { AuthContext } from '../../context/AuthContext';
import CanalesNotificacionCard from './CanalesNotificacionCard';

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
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [toast, setToast] = useState(null);
    const [error, setError] = useState(null);

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

    const fetchConfig = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/v1/sistema/configuracion-taller/', { headers });
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
            // No mandamos el campo `logo` ni `logo_url` por JSON (logo es write-only via multipart).
            const { logo, logo_url, ...payload } = form;
            const res = await axios.patch(
                '/api/v1/sistema/configuracion-taller/',
                payload,
                { headers },
            );
            setConfig(res.data);
            setForm(res.data);
            await refreshMarca();
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

    const onLogoFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) {
            showToast('El logo no puede pesar más de 2MB.', 'error');
            return;
        }
        setUploadingLogo(true);
        try {
            const fd = new FormData();
            fd.append('logo', file);
            const res = await axios.patch(
                '/api/v1/sistema/configuracion-taller/',
                fd,
                { headers: { ...headers, 'Content-Type': 'multipart/form-data' } },
            );
            setConfig(res.data);
            setForm(res.data);
            await refreshMarca();
            showToast('Logo actualizado correctamente.', 'success');
        } catch (err) {
            showToast('No se pudo subir el logo. Intenta con un PNG o JPG.', 'error');
        }
        setUploadingLogo(false);
        e.target.value = ''; // permite re-elegir el mismo archivo
    };

    const removeLogo = async () => {
        if (!confirm('¿Quitar el logo del taller?')) return;
        setUploadingLogo(true);
        try {
            const res = await axios.delete(
                '/api/v1/sistema/configuracion-taller/',
                { headers },
            );
            setConfig(res.data);
            setForm(res.data);
            await refreshMarca();
            showToast('Logo eliminado.', 'success');
        } catch (err) {
            showToast('No se pudo eliminar el logo.', 'error');
        }
        setUploadingLogo(false);
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

            {/* Card: Marca / Branding */}
            <div className={`rounded-xl border ${cardBg} ${cardBorder} p-5 mb-5`}>
                <div className="flex items-center gap-2 mb-1">
                    <ImageIcon size={18} className="text-blue-500" />
                    <h2 className="font-bold">Marca de la empresa</h2>
                </div>
                <p className={`text-xs mb-4 ${sub}`}>
                    El logo y nombre se muestran en el sidebar, login, facturas y correos.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-[160px_1fr] gap-5 items-start">
                    {/* Logo preview + upload */}
                    <div>
                        <label className={labelCls}>Logo</label>
                        <div className={`w-32 h-32 rounded-xl border-2 border-dashed flex items-center justify-center overflow-hidden ${isDark ? 'border-slate-600 bg-slate-900' : 'border-slate-300 bg-slate-50'}`}>
                            {config?.logo_url ? (
                                <img src={config.logo_url} alt="Logo" className="max-w-full max-h-full object-contain" />
                            ) : (
                                <ImageIcon size={36} className={isDark ? 'text-slate-600' : 'text-slate-400'} />
                            )}
                        </div>
                        <div className="mt-2 flex flex-col gap-1.5">
                            <label className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg cursor-pointer transition-colors ${isDark ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'} ${uploadingLogo ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                {uploadingLogo ? <Loader2 className="animate-spin" size={14} /> : <Upload size={14} />}
                                {config?.logo_url ? 'Cambiar' : 'Subir'}
                                <input
                                    type="file"
                                    accept="image/png,image/jpeg,image/svg+xml,image/webp"
                                    onChange={onLogoFileChange}
                                    disabled={uploadingLogo}
                                    className="hidden"
                                />
                            </label>
                            {config?.logo_url && (
                                <button
                                    type="button"
                                    onClick={removeLogo}
                                    disabled={uploadingLogo}
                                    className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${isDark ? 'bg-rose-500/15 text-rose-300 hover:bg-rose-500/25' : 'bg-rose-50 text-rose-700 hover:bg-rose-100'}`}
                                >
                                    <Trash2 size={14} /> Quitar
                                </button>
                            )}
                        </div>
                        <p className={`text-[11px] mt-2 ${sub}`}>PNG, JPG, SVG o WebP. Máx. 2MB.</p>
                    </div>
                    {/* Nombre */}
                    <div>
                        <label className={labelCls}>Nombre comercial</label>
                        <input
                            type="text"
                            className={inputCls}
                            placeholder="Ej. Taller HG, AutoServi Pro, etc."
                            value={form.nombre_empresa || ''}
                            onChange={e => setForm({ ...form, nombre_empresa: e.target.value })}
                            maxLength={120}
                        />
                        <p className={`text-xs mt-1 ${sub}`}>Reemplaza la palabra "AutoServi" en sidebar, login y facturas. Si lo dejas vacío se usa el default.</p>
                    </div>
                </div>
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

            {/* Card: Recepción del vehículo */}
            <div className={`rounded-xl border ${cardBg} ${cardBorder} p-5 mb-5`}>
                <div className="flex items-center gap-2 mb-1">
                    <ClipboardList size={18} className="text-blue-500" />
                    <h2 className="font-bold">Recepción del vehículo</h2>
                </div>
                <p className={`text-xs mb-4 ${sub}`}>
                    Controla cómo se integra la recepción del vehículo al flujo de trabajo.
                </p>
                <div className="space-y-3">
                    <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${isDark ? 'border-slate-700 hover:bg-slate-900/50' : 'border-slate-200 hover:bg-slate-50'}`}>
                        <input
                            type="checkbox"
                            className="mt-0.5 h-4 w-4 accent-blue-600 cursor-pointer"
                            checked={!!form.requerir_recepcion_antes_trabajo}
                            onChange={e => setForm({ ...form, requerir_recepcion_antes_trabajo: e.target.checked })}
                        />
                        <div>
                            <div className="font-semibold text-sm">Pedir recepción antes de iniciar el trabajo</div>
                            <div className={`text-xs mt-0.5 ${sub}`}>
                                Al mover una OT de <strong>En Espera</strong> a <strong>En Revisión</strong> sin recepción registrada, se muestra un aviso con opción de continuar.
                            </div>
                        </div>
                    </label>
                    <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${isDark ? 'border-slate-700 hover:bg-slate-900/50' : 'border-slate-200 hover:bg-slate-50'}`}>
                        <input
                            type="checkbox"
                            className="mt-0.5 h-4 w-4 accent-blue-600 cursor-pointer"
                            checked={!!form.permitir_re_recepcion}
                            onChange={e => setForm({ ...form, permitir_re_recepcion: e.target.checked })}
                        />
                        <div>
                            <div className="font-semibold text-sm">Permitir re-recepción en la misma cita</div>
                            <div className={`text-xs mt-0.5 ${sub}`}>
                                Si el vehículo vuelve a ingresar por la misma cita (p. ej. trabajo adicional), permite registrar una nueva recepción. Déjalo desactivado para evitar duplicados accidentales.
                            </div>
                        </div>
                    </label>
                </div>
            </div>

            {/* Card: Canales de notificación (correo / WhatsApp por evento) */}
            <CanalesNotificacionCard />

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
