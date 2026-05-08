import React from 'react';
import { Wrench } from 'lucide-react';
import { useMarca } from '../../context/MarcaContext';

/* =============================================================================
 *   AuthShell
 *   Wrapper visual compartido por las páginas de auth secundarias
 *   (forgot-password, reset-password, resend-activation).
 *
 *   Mantiene el mismo lenguaje visual del Login redesign: fondo oscuro con
 *   gradiente + resplandores radiales rojo/azul/índigo, logo centrado con
 *   marca AutoServi Pro, card glass-morphism para el contenido del form.
 *
 *   Uso:
 *     <AuthShell title="..." subtitle="..."> <form ... /> </AuthShell>
 * =========================================================================== */

export default function AuthShell({ title, subtitle, children }) {
    const { marca } = useMarca();
    const nombreMarca = marca?.nombre_empresa || 'AutoServi Pro';
    const logoUrl = marca?.logo_url || null;

    return (
        <div className="relative min-h-screen w-full overflow-hidden bg-[#0a0f1a] text-slate-100">
            {/* Fondo profesional (mismo que Login/Register) */}
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

            <div className="relative z-10 flex min-h-screen w-full items-center justify-center px-4 py-10 sm:px-8">
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

                    {/* Card */}
                    <div className="rounded-3xl border border-slate-700/40 bg-slate-900/60 p-7 shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-8">
                        {title && (
                            <h2 className="mb-1 text-xl font-bold text-white">{title}</h2>
                        )}
                        {subtitle && (
                            <p className="mb-6 text-sm text-slate-400">{subtitle}</p>
                        )}
                        {children}
                    </div>

                    <p className="mt-6 text-center text-xs text-slate-500">
                        © {new Date().getFullYear()} {nombreMarca} · Sistema de Taller Mecánico
                    </p>
                </div>
            </div>
        </div>
    );
}
