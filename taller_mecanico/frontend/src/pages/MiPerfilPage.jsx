import React, { useState, useEffect, useContext, useCallback } from 'react';
import axios from 'axios';
import {
    User, Save, Loader2, Camera, Trash2, KeyRound, Mail, Phone,
    MapPin, Hash, Building2, Shield, AlertTriangle, CheckCircle2,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { AuthContext } from '../context/AuthContext';

const API = 'http://localhost:8000/api/v1/usuarios/me';

export default function MiPerfilPage() {
    const { isDark } = useTheme();
    const { authTokens } = useContext(AuthContext);
    const headers = { Authorization: `Bearer ${authTokens?.access}` };

    const [tab, setTab] = useState('datos'); // datos | password | email
    const [perfil, setPerfil] = useState(null);
    const [form, setForm] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState(null);
    const [pwForm, setPwForm] = useState({ password_actual: '', password_nueva: '', password_nueva_confirm: '' });
    const [emailForm, setEmailForm] = useState({ email_nuevo: '', password_actual: '' });

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 4000);
    };

    const fetchPerfil = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API}/perfil/`, { headers });
            setPerfil(res.data);
            setForm(res.data);
        } catch (e) {
            showToast('No se pudo cargar el perfil.', 'error');
        }
        setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => { fetchPerfil(); }, [fetchPerfil]);

    const guardarDatos = async () => {
        setSaving(true);
        try {
            const payload = {
                first_name: form.first_name || '',
                last_name: form.last_name || '',
                telefono: form.telefono || '',
                direccion: form.direccion || '',
                nit: form.nit || '',
                nombre_fiscal: form.nombre_fiscal || '',
                direccion_fiscal: form.direccion_fiscal || '',
            };
            const res = await axios.patch(`${API}/perfil/`, payload, { headers });
            setPerfil(res.data);
            setForm(res.data);
            showToast('Datos guardados.');
        } catch (e) {
            showToast(e.response?.data?.error || 'Error al guardar.', 'error');
        }
        setSaving(false);
    };

    const cambiarPassword = async (e) => {
        e?.preventDefault();
        setSaving(true);
        try {
            const res = await axios.post(`${API}/cambiar-password/`, pwForm, { headers });
            showToast(res.data.detail || 'Contraseña actualizada.');
            setPwForm({ password_actual: '', password_nueva: '', password_nueva_confirm: '' });
        } catch (err) {
            showToast(err.response?.data?.error || 'Error al cambiar contraseña.', 'error');
        }
        setSaving(false);
    };

    const solicitarCambioEmail = async (e) => {
        e?.preventDefault();
        setSaving(true);
        try {
            const res = await axios.post(`${API}/email/solicitar/`, emailForm, { headers });
            showToast(res.data.detail || 'Verifica tu correo nuevo.');
            setEmailForm({ email_nuevo: '', password_actual: '' });
            fetchPerfil();
        } catch (err) {
            showToast(err.response?.data?.error || 'Error al solicitar cambio.', 'error');
        }
        setSaving(false);
    };

    const subirAvatar = async (file) => {
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) {
            showToast('La imagen no puede pesar más de 2 MB.', 'error');
            return;
        }
        const fd = new FormData();
        fd.append('avatar', file);
        setSaving(true);
        try {
            const res = await axios.post(`${API}/avatar/`, fd, {
                headers: { ...headers, 'Content-Type': 'multipart/form-data' },
            });
            setPerfil(res.data);
            setForm(res.data);
            showToast('Foto actualizada.');
        } catch (err) {
            showToast(err.response?.data?.error || 'Error al subir foto.', 'error');
        }
        setSaving(false);
    };

    const eliminarAvatar = async () => {
        setSaving(true);
        try {
            const res = await axios.delete(`${API}/avatar/`, { headers });
            setPerfil(res.data);
            setForm(res.data);
            showToast('Foto eliminada.');
        } catch {
            showToast('Error al eliminar foto.', 'error');
        }
        setSaving(false);
    };

    if (loading) {
        return (
            <div className={`p-8 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                <Loader2 className="animate-spin inline mr-2" size={20} /> Cargando perfil...
            </div>
        );
    }

    if (!form) return null;

    const cardCls = isDark
        ? 'bg-slate-900/60 border-slate-800'
        : 'bg-white border-slate-200';
    const inputCls = isDark
        ? 'bg-slate-950 border-slate-700 text-slate-100 placeholder-slate-500 focus:border-teal-500'
        : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-teal-500';
    const labelCls = `text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-slate-400' : 'text-slate-600'}`;
    const tabCls = (active) => `px-4 py-2 text-sm font-semibold rounded-lg transition border ${
        active
            ? (isDark ? 'bg-teal-600 text-white border-teal-600' : 'bg-teal-600 text-white border-teal-600')
            : (isDark ? 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-600' : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400')
    }`;

    const initials = (form.first_name || form.username || '?').slice(0, 1).toUpperCase();

    return (
        <div className={`max-w-5xl mx-auto p-6 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
            {toast && (
                <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium flex items-center gap-2 ${
                    toast.type === 'error'
                        ? 'bg-rose-600 text-white'
                        : 'bg-emerald-600 text-white'
                }`}>
                    {toast.type === 'error' ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
                    {toast.msg}
                </div>
            )}

            <div className="flex items-center gap-3 mb-6">
                <User size={28} className="text-teal-500" />
                <div>
                    <h1 className="text-2xl font-bold">Mi Perfil</h1>
                    <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Edita tus datos personales, foto, correo y contraseña.
                    </p>
                </div>
            </div>

            {/* Header card with avatar */}
            <div className={`rounded-xl border ${cardCls} p-6 mb-6 flex flex-col sm:flex-row items-center gap-5`}>
                <div className="relative">
                    {form.avatar_url ? (
                        <img
                            src={form.avatar_url}
                            alt="Avatar"
                            className="w-24 h-24 rounded-full object-cover border-2 border-teal-500"
                        />
                    ) : (
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 text-white flex items-center justify-center text-3xl font-bold">
                            {initials}
                        </div>
                    )}
                    <label
                        title="Cambiar foto"
                        className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-teal-600 hover:bg-teal-700 text-white flex items-center justify-center cursor-pointer shadow-md"
                    >
                        <Camera size={14} />
                        <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            className="hidden"
                            onChange={(e) => subirAvatar(e.target.files?.[0])}
                            disabled={saving}
                        />
                    </label>
                </div>
                <div className="flex-1 text-center sm:text-left">
                    <div className="text-lg font-semibold">
                        {(form.first_name || form.last_name) ? `${form.first_name} ${form.last_name}`.trim() : form.username}
                    </div>
                    <div className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        @{form.username} · {form.rol || (form.is_superuser ? 'Superusuario' : '—')}
                    </div>
                    <div className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'} flex items-center justify-center sm:justify-start gap-1.5 mt-1`}>
                        <Mail size={13} /> {form.email || '— sin correo —'}
                        {form.email_pendiente && (
                            <span className="ml-2 text-amber-500 text-xs italic">
                                (pendiente: {form.email_pendiente} — revisa tu correo)
                            </span>
                        )}
                    </div>
                </div>
                {form.avatar_url && (
                    <button
                        onClick={eliminarAvatar}
                        disabled={saving}
                        className={`text-xs flex items-center gap-1 px-3 py-1.5 rounded-lg border ${isDark ? 'border-rose-800 text-rose-300 hover:bg-rose-950/30' : 'border-rose-200 text-rose-600 hover:bg-rose-50'}`}
                    >
                        <Trash2 size={12} /> Quitar foto
                    </button>
                )}
            </div>

            {/* Tabs */}
            <div className="flex flex-wrap gap-2 mb-4">
                <button className={tabCls(tab === 'datos')} onClick={() => setTab('datos')}>
                    <User className="inline mr-1.5" size={14} /> Datos personales
                </button>
                <button className={tabCls(tab === 'email')} onClick={() => setTab('email')}>
                    <Mail className="inline mr-1.5" size={14} /> Cambiar correo
                </button>
                <button className={tabCls(tab === 'password')} onClick={() => setTab('password')}>
                    <KeyRound className="inline mr-1.5" size={14} /> Cambiar contraseña
                </button>
            </div>

            {tab === 'datos' && (
                <div className={`rounded-xl border ${cardCls} p-6`}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className={labelCls}>Nombre</label>
                            <input
                                className={`mt-1 w-full px-3 py-2 rounded-lg border ${inputCls} focus:outline-none`}
                                value={form.first_name || ''}
                                onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                                placeholder="Tu nombre"
                            />
                        </div>
                        <div>
                            <label className={labelCls}>Apellido</label>
                            <input
                                className={`mt-1 w-full px-3 py-2 rounded-lg border ${inputCls} focus:outline-none`}
                                value={form.last_name || ''}
                                onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                                placeholder="Tu apellido"
                            />
                        </div>
                        <div>
                            <label className={labelCls}><Phone className="inline" size={11} /> Teléfono</label>
                            <input
                                className={`mt-1 w-full px-3 py-2 rounded-lg border ${inputCls} focus:outline-none`}
                                value={form.telefono || ''}
                                onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                                placeholder="+502 1234 5678"
                            />
                        </div>
                        <div>
                            <label className={labelCls}><Shield className="inline" size={11} /> Usuario</label>
                            <input
                                className={`mt-1 w-full px-3 py-2 rounded-lg border ${inputCls} opacity-60 cursor-not-allowed`}
                                value={form.username}
                                disabled
                            />
                        </div>
                        <div className="sm:col-span-2">
                            <label className={labelCls}><MapPin className="inline" size={11} /> Dirección</label>
                            <input
                                className={`mt-1 w-full px-3 py-2 rounded-lg border ${inputCls} focus:outline-none`}
                                value={form.direccion || ''}
                                onChange={(e) => setForm({ ...form, direccion: e.target.value })}
                                placeholder="Tu dirección"
                            />
                        </div>
                    </div>

                    <div className={`mt-6 pt-5 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                        <div className={`text-sm font-semibold mb-3 ${isDark ? 'text-slate-300' : 'text-slate-700'} flex items-center gap-1.5`}>
                            <Building2 size={14} /> Datos fiscales (SAT)
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className={labelCls}><Hash className="inline" size={11} /> NIT</label>
                                <input
                                    className={`mt-1 w-full px-3 py-2 rounded-lg border ${inputCls} focus:outline-none`}
                                    value={form.nit || ''}
                                    onChange={(e) => setForm({ ...form, nit: e.target.value })}
                                    placeholder="CF (Consumidor Final)"
                                />
                            </div>
                            <div>
                                <label className={labelCls}>Nombre fiscal / Razón social</label>
                                <input
                                    className={`mt-1 w-full px-3 py-2 rounded-lg border ${inputCls} focus:outline-none`}
                                    value={form.nombre_fiscal || ''}
                                    onChange={(e) => setForm({ ...form, nombre_fiscal: e.target.value })}
                                    placeholder="Como aparece en tu RTU"
                                />
                            </div>
                            <div className="sm:col-span-2">
                                <label className={labelCls}>Dirección fiscal</label>
                                <input
                                    className={`mt-1 w-full px-3 py-2 rounded-lg border ${inputCls} focus:outline-none`}
                                    value={form.direccion_fiscal || ''}
                                    onChange={(e) => setForm({ ...form, direccion_fiscal: e.target.value })}
                                    placeholder="Dirección que aparece en tu RTU"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 flex justify-end">
                        <button
                            onClick={guardarDatos}
                            disabled={saving}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white font-semibold text-sm shadow-sm"
                        >
                            {saving ? <Loader2 className="animate-spin" size={15} /> : <Save size={15} />} Guardar
                        </button>
                    </div>
                </div>
            )}

            {tab === 'email' && (
                <form onSubmit={solicitarCambioEmail} className={`rounded-xl border ${cardCls} p-6 max-w-2xl`}>
                    <p className={`text-sm mb-4 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                        Tu correo actual es <strong className={isDark ? 'text-slate-200' : 'text-slate-900'}>{form.email || '— sin correo —'}</strong>.
                        Por seguridad, cualquier cambio requiere tu contraseña actual y debe confirmarse desde un link
                        que enviamos al correo nuevo. Hasta que confirmes, tu correo actual sigue siendo el válido.
                    </p>
                    {form.email_pendiente && (
                        <div className="mb-4 p-3 rounded-lg bg-amber-100 text-amber-900 text-sm border border-amber-300">
                            Hay un cambio pendiente a <strong>{form.email_pendiente}</strong>. Revisa la bandeja de ese correo
                            (o solicita uno nuevo).
                        </div>
                    )}
                    <div className="space-y-4">
                        <div>
                            <label className={labelCls}>Nuevo correo</label>
                            <input
                                type="email"
                                required
                                className={`mt-1 w-full px-3 py-2 rounded-lg border ${inputCls} focus:outline-none`}
                                value={emailForm.email_nuevo}
                                onChange={(e) => setEmailForm({ ...emailForm, email_nuevo: e.target.value })}
                                placeholder="nuevo@correo.com"
                            />
                        </div>
                        <div>
                            <label className={labelCls}>Contraseña actual</label>
                            <input
                                type="password"
                                required
                                className={`mt-1 w-full px-3 py-2 rounded-lg border ${inputCls} focus:outline-none`}
                                value={emailForm.password_actual}
                                onChange={(e) => setEmailForm({ ...emailForm, password_actual: e.target.value })}
                                autoComplete="current-password"
                            />
                        </div>
                    </div>
                    <div className="mt-5 flex justify-end">
                        <button
                            type="submit"
                            disabled={saving}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white font-semibold text-sm"
                        >
                            {saving ? <Loader2 className="animate-spin" size={15} /> : <Mail size={15} />} Enviar verificación
                        </button>
                    </div>
                </form>
            )}

            {tab === 'password' && (
                <form onSubmit={cambiarPassword} className={`rounded-xl border ${cardCls} p-6 max-w-2xl`}>
                    <p className={`text-sm mb-4 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                        Para cambiar tu contraseña necesitas escribir la contraseña actual.
                    </p>
                    <div className="space-y-4">
                        <div>
                            <label className={labelCls}>Contraseña actual</label>
                            <input
                                type="password"
                                required
                                autoComplete="current-password"
                                className={`mt-1 w-full px-3 py-2 rounded-lg border ${inputCls} focus:outline-none`}
                                value={pwForm.password_actual}
                                onChange={(e) => setPwForm({ ...pwForm, password_actual: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className={labelCls}>Contraseña nueva</label>
                            <input
                                type="password"
                                required
                                autoComplete="new-password"
                                className={`mt-1 w-full px-3 py-2 rounded-lg border ${inputCls} focus:outline-none`}
                                value={pwForm.password_nueva}
                                onChange={(e) => setPwForm({ ...pwForm, password_nueva: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className={labelCls}>Confirmar contraseña nueva</label>
                            <input
                                type="password"
                                required
                                autoComplete="new-password"
                                className={`mt-1 w-full px-3 py-2 rounded-lg border ${inputCls} focus:outline-none`}
                                value={pwForm.password_nueva_confirm}
                                onChange={(e) => setPwForm({ ...pwForm, password_nueva_confirm: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="mt-5 flex justify-end">
                        <button
                            type="submit"
                            disabled={saving}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white font-semibold text-sm"
                        >
                            {saving ? <Loader2 className="animate-spin" size={15} /> : <KeyRound size={15} />} Cambiar
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
}
