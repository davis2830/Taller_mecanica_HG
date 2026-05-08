import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { Lock, Eye, EyeOff, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import AuthShell from '../components/auth/AuthShell';

export default function ResetPassword() {
    const navigate = useNavigate();
    const { uidb64, token } = useParams();
    const [password, setPassword] = useState('');
    const [passwordConfirm, setPasswordConfirm] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (password !== passwordConfirm) {
            setError('Las contraseñas no coinciden.');
            return;
        }

        setIsLoading(true);
        try {
            const res = await axios.post('/api/v1/usuarios/password-reset/confirmar/', {
                uidb64,
                token,
                password,
                password_confirm: passwordConfirm,
            });
            setSuccess(res.data?.message || 'Contraseña actualizada. Redirigiendo al inicio de sesión…');
            setTimeout(() => navigate('/login'), 3000);
        } catch (err) {
            const detail = err.response?.data?.error
                || err.response?.data?.detail
                || 'No pudimos cambiar tu contraseña. El enlace puede haber expirado.';
            setError(detail);
        }
        setIsLoading(false);
    };

    const disabled = isLoading || !!success;

    return (
        <AuthShell
            title="Elegí una contraseña nueva"
            subtitle="Tu contraseña debe tener al menos 8 caracteres."
        >
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
                <div>
                    <label htmlFor="password" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Contraseña nueva
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
                        Confirmar contraseña
                    </label>
                    <div className="group relative">
                        <Lock
                            size={17}
                            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 transition-colors group-focus-within:text-red-400"
                        />
                        <input
                            id="password_confirm"
                            type={showPasswordConfirm ? 'text' : 'password'}
                            required
                            value={passwordConfirm}
                            onChange={(e) => setPasswordConfirm(e.target.value)}
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

                <button
                    type="submit"
                    disabled={disabled}
                    className="group relative mt-2 flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-red-500 to-red-700 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-red-500/30 transition-all hover:from-red-600 hover:to-red-800 hover:shadow-xl hover:shadow-red-500/40 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
                >
                    <span>{isLoading ? 'Cambiando…' : success ? '¡Listo!' : 'Cambiar contraseña'}</span>
                    {!isLoading && !success && <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />}
                </button>

                <div className="pt-1 text-center text-sm">
                    <button
                        type="button"
                        onClick={() => navigate('/login')}
                        className="font-semibold text-red-400 hover:text-red-300"
                    >
                        Volver al inicio de sesión
                    </button>
                </div>
            </form>
        </AuthShell>
    );
}
