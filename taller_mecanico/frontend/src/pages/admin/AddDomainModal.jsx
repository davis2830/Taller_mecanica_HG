import React, { useContext, useState } from 'react';
import axios from 'axios';
import { X, AlertCircle, Globe } from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';

/**
 * Modal para agregar un dominio (hostname) adicional a un tenant existente.
 *
 * django-tenants rutea por Host header → un mismo tenant puede responder en
 * múltiples dominios (ej. demo.localhost + 10.62.112.130).
 */
export default function AddDomainModal({ tenant, onClose, onSaved }) {
    const { authTokens } = useContext(AuthContext);
    const [domain, setDomain] = useState('');
    const [isPrimary, setIsPrimary] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        try {
            await axios.post('/api/v1/public-admin/domains/', {
                domain,
                is_primary: isPrimary,
                tenant: tenant.id,
            }, {
                headers: { Authorization: `Bearer ${authTokens?.access}` },
            });
            onSaved();
        } catch (err) {
            const detail = err.response?.data?.domain?.[0]
                || err.response?.data?.detail
                || 'No se pudo agregar el dominio.';
            setError(detail);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
                    <div>
                        <h2 className="text-lg font-semibold">Agregar dominio</h2>
                        <p className="text-xs text-slate-400">{tenant.nombre} · {tenant.slug}</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="flex items-start gap-2 rounded-lg bg-red-950/50 border border-red-900/50 p-3 text-sm text-red-200">
                            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                            <span>{error}</span>
                        </div>
                    )}

                    <label className="block">
                        <span className="mb-1 block text-sm font-medium text-slate-300">Hostname</span>
                        <div className="relative">
                            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                            <input
                                type="text"
                                value={domain}
                                onChange={(e) => setDomain(e.target.value)}
                                className="w-full rounded-lg border border-slate-700 bg-slate-950/60 pl-10 pr-3 py-2 text-sm font-mono focus:border-indigo-500 focus:outline-none"
                                placeholder="otro.localhost o 10.0.0.5"
                                required
                            />
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                            Sin puerto ni protocolo. Ejemplos: <span className="font-mono">demo.localhost</span>, <span className="font-mono">10.62.112.130</span>.
                        </p>
                    </label>

                    <label className="flex items-center gap-2 text-sm text-slate-300">
                        <input
                            type="checkbox"
                            checked={isPrimary}
                            onChange={(e) => setIsPrimary(e.target.checked)}
                            className="rounded border-slate-700 bg-slate-950 text-indigo-500 focus:ring-indigo-500"
                        />
                        Marcar como dominio primario
                    </label>

                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
                        >
                            {saving ? 'Guardando…' : 'Agregar dominio'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
