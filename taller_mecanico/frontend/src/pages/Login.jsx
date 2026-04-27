import React, { useContext, useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    Mail, Lock, Eye, EyeOff, ArrowRight, Wrench,
    CalendarClock, Kanban, CalendarRange, BarChart3, Trophy, AlertCircle, CheckCircle2
} from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { useMarca } from '../context/MarcaContext';

/* =============================================================================
 *   AutoServiPro · Login redesign
 *   Estilo: hero centrado a la izquierda + panel de features con iconos a la
 *   derecha, sobre un fondo oscuro con resplandor automotriz.
 * =========================================================================== */

const FEATURES = [
    {
        icon: CalendarClock,
        title: 'Gestión Inteligente de Citas',
        description: 'Agenda, recordatorios automáticos y vista calendario.',
    },
    {
        icon: Kanban,
        title: 'Visualización Kanban',
        description: 'Tablero en tiempo real del avance de cada orden de trabajo.',
    },
    {
        icon: CalendarRange,
        title: 'Planificación Integrada',
        description: 'Capacidad por mecánico y heatmap de carga semanal.',
    },
    {
        icon: BarChart3,
        title: 'Analítica y Reportes',
        description: 'Utilidades, inventario y cuentas por cobrar en un panel.',
    },
];

export default function Login() {
    const { loginUser } = useContext(AuthContext);
    const { marca } = useMarca();
    const nombreMarca = marca?.nombre_empresa || 'AutoServi Pro';
    const logoUrl = marca?.logo_url || null;
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [remember, setRemember] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        if (params.get('verificado') === 'true') {
            setSuccess('Tu cuenta ha sido activada. Inicia sesión para continuar.');
        } else if (params.get('verificado') === 'error') {
            setError('El enlace de activación es inválido o expiró.');
        } else if (params.get('email_actualizado') === 'true') {
            setSuccess('Correo actualizado. Inicia sesión con el nuevo correo.');
        }
    }, [location]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        const ok = await loginUser(username, password);
        if (!ok) setError('Credenciales incorrectas o cuenta inactiva.');
        setIsLoading(false);
    };

    return (
        <div className="relative min-h-screen w-full overflow-hidden bg-[#0a0f1a] text-slate-100">
            {/* === FONDO PROFESIONAL === */}
            {/* Base con gradiente diagonal */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#0b1224] via-[#0f172a] to-[#040814]" />
            {/* Resplandores suaves */}
            <div className="pointer-events-none absolute -top-32 -left-40 h-[560px] w-[560px] rounded-full bg-red-600/15 blur-[160px]" />
            <div className="pointer-events-none absolute top-1/3 -right-40 h-[480px] w-[480px] rounded-full bg-sky-700/12 blur-[160px]" />
            <div className="pointer-events-none absolute -bottom-44 left-1/3 h-[480px] w-[480px] rounded-full bg-indigo-700/10 blur-[160px]" />
            {/* Halo central sutil */}
            <div
                className="pointer-events-none absolute inset-0"
                style={{
                    background: 'radial-gradient(60% 50% at 50% 0%, rgba(255,255,255,0.04) 0%, transparent 70%)',
                }}
            />
            {/* Vignette para profundidad en bordes */}
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
                            <h2 className="mb-1 text-xl font-bold text-white">Bienvenido de vuelta</h2>
                            <p className="mb-6 text-sm text-slate-400">Ingresa tus credenciales para continuar</p>

                            {/* Alertas */}
                            {success && (
                                <div className="mb-4 flex items-start gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-sm text-emerald-300">
                                    <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
                                    <span>{success}</span>
                                </div>
                            )}
                            {error && (
                                <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-sm text-red-300">
                                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                                    <span>{error}</span>
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-4">
                                {/* Usuario / correo */}
                                <div>
                                    <label htmlFor="username" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                                        Usuario o correo
                                    </label>
                                    <div className="group relative">
                                        <Mail
                                            size={17}
                                            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 transition-colors group-focus-within:text-red-400"
                                        />
                                        <input
                                            id="username"
                                            type="text"
                                            required
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                            disabled={isLoading}
                                            placeholder="usuario@taller.com"
                                            autoComplete="username"
                                            className="w-full rounded-xl border border-slate-700/60 bg-slate-950/60 py-3 pl-11 pr-3 text-sm text-white placeholder-slate-500 outline-none transition-all focus:border-red-500/60 focus:bg-slate-950 focus:ring-2 focus:ring-red-500/20"
                                        />
                                    </div>
                                </div>

                                {/* Password */}
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
                                            type={showPassword ? 'text' : 'password'}
                                            required
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            disabled={isLoading}
                                            placeholder="••••••••••"
                                            autoComplete="current-password"
                                            className="w-full rounded-xl border border-slate-700/60 bg-slate-950/60 py-3 pl-11 pr-11 text-sm text-white placeholder-slate-500 outline-none transition-all focus:border-red-500/60 focus:bg-slate-950 focus:ring-2 focus:ring-red-500/20"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword((v) => !v)}
                                            tabIndex={-1}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-500 hover:text-slate-300"
                                            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                                        >
                                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                </div>

                                {/* Remember */}
                                <label className="flex cursor-pointer select-none items-center gap-2 text-sm text-slate-400">
                                    <input
                                        type="checkbox"
                                        checked={remember}
                                        onChange={(e) => setRemember(e.target.checked)}
                                        className="h-4 w-4 cursor-pointer rounded border-slate-600 bg-slate-800 text-red-500 focus:ring-red-500/30"
                                    />
                                    <span>Recuerda mis credenciales</span>
                                </label>

                                {/* Botón */}
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="group relative mt-2 flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-red-500 to-red-700 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-red-500/30 transition-all hover:from-red-600 hover:to-red-800 hover:shadow-xl hover:shadow-red-500/40 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    <span>{isLoading ? 'Iniciando sesión…' : 'Iniciar Sesión'}</span>
                                    {!isLoading && <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />}
                                </button>

                                <div className="pt-1 text-center text-sm">
                                    <span className="text-slate-500">¿No tienes cuenta? </span>
                                    <button
                                        type="button"
                                        onClick={() => navigate('/register')}
                                        className="font-semibold text-red-400 hover:text-red-300"
                                    >
                                        Regístrate aquí
                                    </button>
                                </div>
                            </form>
                        </div>

                        <p className="mt-6 text-center text-xs text-slate-500">
                            © {new Date().getFullYear()} {nombreMarca} · Sistema de Taller Mecánico
                        </p>
                    </div>
                </div>

                {/* ---------- LADO DERECHO: Features ---------- */}
                <div className="relative hidden flex-1 items-center justify-center px-12 lg:flex">
                    {/* Borde divisor sutil */}
                    <div className="absolute left-0 top-1/2 h-[70%] w-px -translate-y-1/2 bg-gradient-to-b from-transparent via-white/10 to-transparent" />

                    <div className="w-full max-w-lg">
                        {/* Premium badge */}
                        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-amber-300">
                            <Trophy size={14} />
                            <span>Premium</span>
                        </div>
                        <h2 className="mb-3 text-4xl font-black leading-tight tracking-tight text-white">
                            Solución <span className="bg-gradient-to-r from-red-400 to-red-600 bg-clip-text text-transparent">Completa</span>
                        </h2>
                        <p className="mb-10 max-w-md text-base leading-relaxed text-slate-400">
                            Todo lo que tu taller mecánico necesita para operar con eficiencia profesional, en una sola plataforma.
                        </p>

                        {/* Feature cards */}
                        <div className="space-y-3">
                            {FEATURES.map(({ icon: Icon, title, description }) => (
                                <div
                                    key={title}
                                    className="group flex items-start gap-4 rounded-2xl border border-slate-700/40 bg-slate-900/40 p-4 transition-all hover:border-red-500/40 hover:bg-slate-900/70"
                                >
                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-red-500/20 to-red-600/10 text-red-400 ring-1 ring-red-500/30 transition-all group-hover:from-red-500/30 group-hover:to-red-600/20 group-hover:text-red-300">
                                        <Icon size={20} strokeWidth={2.2} />
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="text-sm font-bold text-white">{title}</h3>
                                        <p className="mt-0.5 text-xs leading-relaxed text-slate-400">{description}</p>
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
