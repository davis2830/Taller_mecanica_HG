import React, { useContext, useEffect, useState } from 'react';
import axios from 'axios';
import { Building2, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';

/**
 * Dashboard resumen del panel superadmin SaaS.
 *
 * Muestra métricas básicas: total de tenants, activos, inactivos, en trial.
 */
export default function AdminDashboard() {
    const { authTokens } = useContext(AuthContext);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetch = async () => {
            try {
                const resp = await axios.get('/api/v1/public-admin/tenants/', {
                    headers: { Authorization: `Bearer ${authTokens?.access}` },
                });
                const tenants = resp.data.results || resp.data || [];
                const now = new Date();
                setStats({
                    total: tenants.length,
                    activos: tenants.filter((t) => t.activo).length,
                    inactivos: tenants.filter((t) => !t.activo).length,
                    enTrial: tenants.filter(
                        (t) => t.trial_hasta && new Date(t.trial_hasta) > now,
                    ).length,
                });
            } catch (err) {
                setError('No se pudieron cargar los datos.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetch();
    }, [authTokens]);

    const cards = stats ? [
        { label: 'Talleres totales', value: stats.total, icon: Building2, color: 'indigo' },
        { label: 'Activos', value: stats.activos, icon: CheckCircle2, color: 'emerald' },
        { label: 'Inactivos', value: stats.inactivos, icon: XCircle, color: 'red' },
        { label: 'En trial', value: stats.enTrial, icon: Clock, color: 'amber' },
    ] : [];

    return (
        <div>
            <h1 className="text-2xl font-bold mb-1">Resumen</h1>
            <p className="text-sm text-slate-400 mb-6">Vista general del SaaS.</p>

            {loading && <p className="text-slate-400">Cargando…</p>}
            {error && (
                <div className="rounded-lg bg-red-950/50 border border-red-900/50 p-4 text-sm text-red-200">
                    {error}
                </div>
            )}

            {stats && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {cards.map((card) => {
                        const CardIcon = card.icon;
                        return (
                            <div
                                key={card.label}
                                className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 backdrop-blur-sm"
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-xs uppercase tracking-wide text-slate-400">
                                        {card.label}
                                    </span>
                                    <CardIcon className={`h-4 w-4 text-${card.color}-400`} />
                                </div>
                                <p className="text-3xl font-bold">{card.value}</p>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
