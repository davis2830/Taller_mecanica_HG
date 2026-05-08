import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Mail, ArrowRight, ArrowLeft, AlertCircle, CheckCircle2 } from 'lucide-react';
import AuthShell from '../components/auth/AuthShell';

export default function ForgotPassword() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setIsLoading(true);
        try {
            const res = await axios.post('/api/v1/usuarios/password-reset/solicitar/', { email });
            setSuccess(res.data?.message || 'Si el correo está registrado, te enviaremos un enlace para restablecer tu contraseña.');
        } catch (err) {
            const detail = err.response?.data?.error
                || err.response?.data?.detail
                || 'No pudimos procesar tu solicitud. Intenta de nuevo en unos minutos.';
            setError(detail);
        }
        setIsLoading(false);
    };

    const disabled = isLoading || !!success;

    return (
        <AuthShell
            title="¿Olvidaste tu contraseña?"
            subtitle="Ingresa tu correo y te enviaremos un enlace para restablecerla."
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
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={disabled}
                            placeholder="usuario@taller.com"
                            autoComplete="email"
                            className="w-full rounded-xl border border-slate-700/60 bg-slate-950/60 py-3 pl-11 pr-3 text-sm text-white placeholder-slate-500 outline-none transition-all focus:border-red-500/60 focus:bg-slate-950 focus:ring-2 focus:ring-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={disabled}
                    className="group relative mt-2 flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-red-500 to-red-700 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-red-500/30 transition-all hover:from-red-600 hover:to-red-800 hover:shadow-xl hover:shadow-red-500/40 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
                >
                    <span>{isLoading ? 'Enviando…' : success ? 'Enlace enviado' : 'Enviar enlace'}</span>
                    {!isLoading && !success && <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />}
                </button>

                <button
                    type="button"
                    onClick={() => navigate('/login')}
                    className="flex w-full items-center justify-center gap-2 text-sm font-semibold text-slate-400 hover:text-slate-200"
                >
                    <ArrowLeft size={14} />
                    <span>Volver al inicio de sesión</span>
                </button>
            </form>
        </AuthShell>
    );
}
