import React, { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ShieldCheck, AlertCircle, Building2 } from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';

/**
 * Login del panel superadmin SaaS.
 *
 * - Entry point: admin.<dominio>/login (o ?mode=admin).
 * - Envía POST a /api/v1/public-admin/token/ con {email, password}.
 * - En éxito, AuthContext guarda el token en localStorage.adminAuthTokens y
 *   el App redirige a /.
 */
export default function AdminLogin() {
    const { loginUser } = useContext(AuthContext);
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        const ok = await loginUser(email, password);
        if (!ok) {
            setError('Credenciales inválidas o usuario desactivado.');
        } else {
            navigate('/');
        }
        setIsLoading(false);
    };

    return (
        <div className="relative min-h-screen w-full overflow-hidden bg-[#0a0f1a] text-slate-100 flex items-center justify-center p-6">
            <div className="absolute inset-0 bg-gradient-to-br from-[#0b1224] via-[#0f172a] to-[#040814]" />
            <div className="pointer-events-none absolute -top-32 -left-40 h-[560px] w-[560px] rounded-full bg-indigo-600/15 blur-[160px]" />
            <div className="pointer-events-none absolute top-1/3 -right-40 h-[480px] w-[480px] rounded-full bg-sky-700/12 blur-[160px]" />

            <div className="relative z-10 w-full max-w-md">
                <div className="mb-8 text-center">
                    <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-sky-600 shadow-lg shadow-indigo-500/30 mb-4">
                        <ShieldCheck className="h-7 w-7 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold">Panel SaaS Admin</h1>
                    <p className="text-sm text-slate-400 mt-1">Gestión de talleres cliente</p>
                </div>

                <form
                    onSubmit={handleSubmit}
                    className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8 backdrop-blur-sm shadow-2xl"
                >
                    {error && (
                        <div className="mb-4 flex items-start gap-2 rounded-lg bg-red-950/50 border border-red-900/50 p-3 text-sm text-red-200">
                            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                            <span>{error}</span>
                        </div>
                    )}

                    <label className="block mb-4">
                        <span className="mb-1 block text-sm font-medium text-slate-300">
                            Email
                        </span>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full rounded-lg border border-slate-700 bg-slate-950/60 py-2.5 pl-10 pr-3 text-sm text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                placeholder="superadmin@empresa.com"
                                autoComplete="email"
                                required
                            />
                        </div>
                    </label>

                    <label className="block mb-6">
                        <span className="mb-1 block text-sm font-medium text-slate-300">
                            Contraseña
                        </span>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full rounded-lg border border-slate-700 bg-slate-950/60 py-2.5 pl-10 pr-10 text-sm text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                placeholder="••••••••"
                                autoComplete="current-password"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                            >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                    </label>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full rounded-lg bg-gradient-to-r from-indigo-600 to-sky-600 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:from-indigo-500 hover:to-sky-500 disabled:opacity-60"
                    >
                        {isLoading ? 'Validando…' : 'Ingresar al panel'}
                    </button>

                    <p className="mt-6 text-center text-xs text-slate-500 flex items-center justify-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5" />
                        Acceso restringido al personal SaaS
                    </p>
                </form>
            </div>
        </div>
    );
}
