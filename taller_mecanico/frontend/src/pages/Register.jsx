import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
    Mail, Lock, Eye, EyeOff, ArrowRight, Wrench, User,
    Car, History, BellRing, ShieldCheck, AlertCircle, CheckCircle2,
} from 'lucide-react';
import { useMarca } from '../context/MarcaContext';

/* =============================================================================
 *   AutoServiPro · Register redesign
 *   Mantiene identidad visual del Login: hero + form a la izquierda,
 *   panel de beneficios para el cliente a la derecha. Mobile: solo form.
 * =========================================================================== */

const FEATURES = [
    {
        icon: Car,
        title: 'Estado de tu vehículo en vivo',
        description: 'Seguí el avance del servicio en tiempo real desde tu celular.',
    },
    {
        icon: History,
        title: 'Historial de servicios',
        description: 'Acceso a todas tus citas, facturas y mantenimientos previos.',
    },
    {
        icon: BellRing,
        title: 'Notificaciones automáticas',
        description: 'Recordatorios por correo cuando se acerca tu próxima visita.',
    },
    {
        icon: ShieldCheck,
        title: 'Datos seguros',
        description: 'Tu información está cifrada y solo vos podés acceder a ella.',
    },
];

export default function Register() {
    const navigate = useNavigate();
    const { marca } = useMarca();
    const nombreMarca = marca?.nombre_empresa || 'AutoServi Pro';
    const logoUrl = marca?.logo_url || null;

    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        email: '',
        password: '',
        password_confirm: '',
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);

    const handleChange = (e) => {
        setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (formData.password !== formData.password_confirm) {
            setError('Las contraseñas no coinciden.');
            return;
        }

        setIsLoading(true);
        try {
            const res = await axios.post('/api/v1/usuarios/registro/', formData);
            if (res.data.success) {
                setSuccess(res.data.message || '¡Cuenta creada! Revisa tu correo para activarla.');
                setTimeout(() => navigate('/login'), 5000);
            }
        } catch (err) {
            if (err.response?.data?.details) {
                const firstErr = Object.values(err.response.data.details)[0];
                setError(Array.isArray(firstErr) ? firstErr[0] : firstErr);
            } else {
                setError(err.response?.data?.error || 'Error al registrarse. Verifica tus datos.');
            }
        }
        setIsLoading(false);
    };

    const disabled = isLoading || !!success;

    return (
        <div className="relative min-h-screen w-full overflow-hidden bg-[#0a0f1a] text-slate-100">
            {/* === FONDO PROFESIONAL === */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#0b1224] via-[#0f172a] to-[#040814]" />
            <div className="pointer-events-none absolute -top-32 -left-40 h-[560px] w-[560px] rounded-full bg-red-600/15 blur-[160px]" />
            <div className="pointer-events-none absolute top-1/3 -right-40 h-[480px] w-[480px] rounded-full bg-sky-700/12 blur-[160px]" />
            <div className="pointer-events-none absolute -bottom-44 left-1/3 h-[480px] w-[480px] rounded-full bg-indigo-700/10 blur-[160px]" />
            <div
                className="pointer-events-none absolute inset-0"
                style={{
                    background: 'radial-gradient(60% 50% at 50% 0%, rgba(255,255,255,0.04) 0%, transparent 70%)',
                }}
            />
            <div
                className="pointer-events-none absolute inset-0"
                style={{
                    background: 'radial-gradient(120% 80% at 50% 50%, transparent 55%, rgba(0,0,0,0.55) 100%)',
                }}
            />

            {/* === LAYOUT === */}
            <div className="relative z-10 flex min-h-screen w-full">
                {/* ---------- LADO IZQUIERDO: Hero + Form ---------- */}
                <div className="flex w-full items-center justify-center px-4 py-10 sm:px-8 lg:w-1/2 lg:px-12">
                    <div className="w-full max-w-md">
                        {/* Logo */}
                        <div className="mb-8 flex flex-col items-center">
                            <div className="relative mb-5 flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-red-500 to-red-700 shadow-2xl shadow-red-500/30 overflow-hidden">
                                {logoUrl ? (
                                    <img src={logoUrl} alt={nombreMarca} className="max-h-[78%] max-w-[78%] object-contain" />
                                ) : (
                                    <Wrench size={44} className="text-white" strokeWidth={2.5} />
                                )}
                                <div className="absolute inset-0 rounded-3xl bg-white/10 mix-blend-overlay pointer-events-none" />
                                <div className="absolute -inset-1 rounded-3xl border border-red-400/30" />
                            </div>
                            <h1 className="text-center text-3xl font-black tracking-tight text-white sm:text-4xl">
                                {marca?.nombre_empresa
                                    ? marca.nombre_empresa
                                    : (<>AutoServi <span className="text-red-500">Pro</span></>)}
                            </h1>
                            <p className="mt-2 text-sm text-slate-400">Sistema de gestión integral del taller</p>
                        </div>

                        {/* Card del form */}
                        <div className="rounded-3xl border border-slate-700/40 bg-slate-900/60 p-7 shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-8">
                            <h2 className="mb-1 text-xl font-bold text-white">Crear Cuenta</h2>
                            <p className="mb-6 text-sm text-slate-400">Únete al portal cliente para seguir tus servicios</p>

                            {/* Alertas */}
                            {success && (
                                <div className="mb-4 flex items-start gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-sm text-emerald-300">
                                    <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
                                    <span>{success} Redirigiendo al inicio de sesión…</span>
                                </div>
                            )}
                            {error && (
                                <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-sm text-red-300">
                                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                                    <span>{error}</span>
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-4">
                                {/* Nombre + Apellido */}
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <div>
                                        <label htmlFor="first_name" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                                            Nombre
                                        </label>
                                        <div className="group relative">
                                            <User
                                                size={17}
                                                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 transition-colors group-focus-within:text-red-400"
                                            />
                                            <input
                                                id="first_name"
                                                name="first_name"
                                                type="text"
                                                required
                                                value={formData.first_name}
                                                onChange={handleChange}
                                                disabled={disabled}
                                                placeholder="Juan"
                                                autoComplete="given-name"
                                                className="w-full rounded-xl border border-slate-700/60 bg-slate-950/60 py-3 pl-11 pr-3 text-sm text-white placeholder-slate-500 outline-none transition-all focus:border-red-500/60 focus:bg-slate-950 focus:ring-2 focus:ring-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label htmlFor="last_name" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                                            Apellido
                                        </label>
                                        <div className="group relative">
                                            <User
                                                size={17}
                                                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 transition-colors group-focus-within:text-red-400"
                                            />
                                            <input
                                                id="last_name"
                                                name="last_name"
                                                type="text"
                                                required
                                                value={formData.last_name}
                                                onChange={handleChange}
                                                disabled={disabled}
                                                placeholder="Pérez"
                                                autoComplete="family-name"
                                                className="w-full rounded-xl border border-slate-700/60 bg-slate-950/60 py-3 pl-11 pr-3 text-sm text-white placeholder-slate-500 outline-none transition-all focus:border-red-500/60 focus:bg-slate-950 focus:ring-2 focus:ring-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Email */}
                                <div>
                                    <label htmlFor="email" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                                        Correo electrónico
                                    </label>
                                    <div className="group relative">
                                        <Mail
                                            size={17}
                                            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 transition-colors group-focus-within:text-red-400"
                                        />
                                        <input
                                            id="email"
                                            name="email"
                                            type="email"
                                            required
                                            value={formData.email}
                                            onChange={handleChange}
                                            disabled={disabled}
                                            placeholder="juan@ejemplo.com"
                                            autoComplete="email"
                                            className="w-full rounded-xl border border-slate-700/60 bg-slate-950/60 py-3 pl-11 pr-3 text-sm text-white placeholder-slate-500 outline-none transition-all focus:border-red-500/60 focus:bg-slate-950 focus:ring-2 focus:ring-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                                        />
                                    </div>
                                </div>

                                {/* Password + Confirm */}
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <div>
                                        <label htmlFor="password" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                                            Contraseña
                                        </label>
                                        <div className="group relative">
                                            <Lock
                                                size={17}
                                                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 transition-colors group-focus-within:text-red-400"
                                            />
                                            <input
                                                id="password"
                                                name="password"
                                                type={showPassword ? 'text' : 'password'}
                                                required
                                                value={formData.password}
                                                onChange={handleChange}
                                                disabled={disabled}
                                                placeholder="••••••••"
                                                autoComplete="new-password"
                                                className="w-full rounded-xl border border-slate-700/60 bg-slate-950/60 py-3 pl-11 pr-10 text-sm text-white placeholder-slate-500 outline-none transition-all focus:border-red-500/60 focus:bg-slate-950 focus:ring-2 focus:ring-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                                            />
                                            <button
                                                type="button"
                                                tabIndex={-1}
                                                onClick={() => setShowPassword((v) => !v)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                                                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                                            >
                                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label htmlFor="password_confirm" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                                            Confirmar
                                        </label>
                                        <div className="group relative">
                                            <Lock
                                                size={17}
                                                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 transition-colors group-focus-within:text-red-400"
                                            />
                                            <input
                                                id="password_confirm"
                                                name="password_confirm"
                                                type={showPasswordConfirm ? 'text' : 'password'}
                                                required
                                                value={formData.password_confirm}
                                                onChange={handleChange}
                                                disabled={disabled}
                                                placeholder="••••••••"
                                                autoComplete="new-password"
                                                className="w-full rounded-xl border border-slate-700/60 bg-slate-950/60 py-3 pl-11 pr-10 text-sm text-white placeholder-slate-500 outline-none transition-all focus:border-red-500/60 focus:bg-slate-950 focus:ring-2 focus:ring-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                                            />
                                            <button
                                                type="button"
                                                tabIndex={-1}
                                                onClick={() => setShowPasswordConfirm((v) => !v)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                                                aria-label={showPasswordConfirm ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                                            >
                                                {showPasswordConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Botón */}
                                <button
                                    type="submit"
                                    disabled={disabled}
                                    className="group relative mt-2 flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-red-500 to-red-700 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-red-500/30 transition-all hover:from-red-600 hover:to-red-800 hover:shadow-xl hover:shadow-red-500/40 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    <span>
                                        {isLoading
                                            ? 'Creando cuenta…'
                                            : success
                                                ? '¡Cuenta creada!'
                                                : 'Registrarse'}
                                    </span>
                                    {!isLoading && !success && (
                                        <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
                                    )}
                                </button>

                                <div className="pt-1 text-center text-sm">
                                    <span className="text-slate-500">¿Ya tienes cuenta? </span>
                                    <button
                                        type="button"
                                        onClick={() => navigate('/login')}
                                        className="font-semibold text-red-400 hover:text-red-300"
                                    >
                                        Inicia Sesión aquí
                                    </button>
                                </div>
                            </form>
                        </div>

                        <p className="mt-6 text-center text-xs text-slate-500">
                            © {new Date().getFullYear()} {nombreMarca} · Sistema de Taller Mecánico
                        </p>
                    </div>
                </div>

                {/* ---------- LADO DERECHO: Beneficios cliente ---------- */}
                <div className="relative hidden flex-1 items-center justify-center px-12 lg:flex">
                    <div className="absolute left-0 top-1/2 h-[70%] w-px -translate-y-1/2 bg-gradient-to-b from-transparent via-white/10 to-transparent" />

                    <div className="w-full max-w-lg">
                        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-red-400/30 bg-red-500/10 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-red-300">
                            <Car size={14} />
                            <span>Portal Cliente</span>
                        </div>
                        <h2 className="mb-3 text-4xl font-black leading-tight tracking-tight text-white">
                            Tu Taller, <span className="bg-gradient-to-r from-red-400 to-red-600 bg-clip-text text-transparent">Tu Portal</span>
                        </h2>
                        <p className="mb-10 max-w-md text-base leading-relaxed text-slate-400">
                            Crea tu cuenta para dar seguimiento en tiempo real al estado de tu vehículo, gestionar citas y revisar tu historial de servicios.
                        </p>

                        <div className="space-y-3">
                            {FEATURES.map(({ icon: Icon, title, description }) => (
                                <div
                                    key={title}
                                    className="group flex items-start gap-4 rounded-2xl border border-slate-700/40 bg-slate-900/40 p-4 transition-all hover:border-red-500/40 hover:bg-slate-900/70"
                                >
                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-red-500/20 to-red-600/10 text-red-400 ring-1 ring-red-500/30 transition-all group-hover:from-red-500/30 group-hover:to-red-600/20 group-hover:text-red-300">
                                        <Icon size={20} />
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="text-sm font-bold text-white">{title}</h3>
                                        <p className="mt-0.5 text-sm text-slate-400">{description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
