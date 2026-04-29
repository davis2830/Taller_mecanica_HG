import React, { useContext, useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import {
    Plus, Building2, CheckCircle2, XCircle, Globe,
    AlertCircle, Power, PowerOff, Loader2,
} from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import TenantFormModal from './TenantFormModal';
import AddDomainModal from './AddDomainModal';

/**
 * Lista de tenants (talleres cliente) con CRUD básico.
 *
 * Features MVP:
 *   - Tabla con nombre, slug, dominio primario, fecha creación, activo/inactivo
 *   - Botón "Nuevo taller" → abre TenantFormModal
 *   - Toggle activar/desactivar por tenant
 *   - Botón "Agregar dominio" → abre AddDomainModal
 */
export default function TenantList() {
    const { authTokens } = useContext(AuthContext);
    const [tenants, setTenants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [addDomainFor, setAddDomainFor] = useState(null); // tenant object
    const [busy, setBusy] = useState(null); // tenant id con operación en curso

    const headers = { Authorization: `Bearer ${authTokens?.access}` };

    const fetchTenants = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const resp = await axios.get('/api/v1/public-admin/tenants/', { headers });
            setTenants(resp.data.results || resp.data || []);
        } catch (err) {
            console.error(err);
            setError('No se pudieron cargar los talleres.');
        } finally {
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [authTokens]);

    useEffect(() => { fetchTenants(); }, [fetchTenants]);

    const toggleActivo = async (tenant) => {
        setBusy(tenant.id);
        try {
            const action = tenant.activo ? 'desactivar' : 'activar';
            await axios.post(
                `/api/v1/public-admin/tenants/${tenant.id}/${action}/`,
                {},
                { headers },
            );
            await fetchTenants();
        } catch (err) {
            console.error(err);
            setError(`No se pudo ${tenant.activo ? 'desactivar' : 'activar'} el taller.`);
        } finally {
            setBusy(null);
        }
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold mb-1">Talleres</h1>
                    <p className="text-sm text-slate-400">
                        Clientes del SaaS. Cada uno tiene su propio schema aislado.
                    </p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition"
                >
                    <Plus className="h-4 w-4" /> Nuevo taller
                </button>
            </div>

            {error && (
                <div className="mb-4 flex items-start gap-2 rounded-lg bg-red-950/50 border border-red-900/50 p-3 text-sm text-red-200">
                    <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                    <span>{error}</span>
                </div>
            )}

            <div className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden">
                {loading ? (
                    <div className="flex items-center gap-2 p-6 text-slate-400">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Cargando…
                    </div>
                ) : tenants.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 p-12 text-center">
                        <Building2 className="h-10 w-10 text-slate-600" />
                        <p className="text-sm text-slate-400">
                            Todavía no hay talleres registrados.
                        </p>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="mt-2 flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition"
                        >
                            <Plus className="h-4 w-4" /> Crear el primero
                        </button>
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead className="bg-slate-800/40 text-xs uppercase tracking-wide text-slate-400">
                            <tr>
                                <th className="px-4 py-3 text-left">Taller</th>
                                <th className="px-4 py-3 text-left">Slug</th>
                                <th className="px-4 py-3 text-left">Dominio principal</th>
                                <th className="px-4 py-3 text-left">Creado</th>
                                <th className="px-4 py-3 text-left">Estado</th>
                                <th className="px-4 py-3 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {tenants.map((t) => (
                                <tr key={t.id} className="hover:bg-slate-800/30">
                                    <td className="px-4 py-3">
                                        <p className="font-medium">{t.nombre}</p>
                                        <p className="text-xs text-slate-500">{t.email_contacto}</p>
                                    </td>
                                    <td className="px-4 py-3 font-mono text-xs text-slate-300">
                                        {t.slug}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="flex items-center gap-1.5 text-slate-300">
                                            <Globe className="h-3.5 w-3.5 text-slate-500" />
                                            {t.dominio_principal || (
                                                <span className="italic text-slate-500">
                                                    sin dominio
                                                </span>
                                            )}
                                        </span>
                                        {t.dominios && t.dominios.length > 1 && (
                                            <span className="text-xs text-slate-500 ml-5">
                                                +{t.dominios.length - 1} más
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-xs text-slate-400">
                                        {new Date(t.fecha_creacion).toLocaleDateString()}
                                    </td>
                                    <td className="px-4 py-3">
                                        {t.activo ? (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-300 border border-emerald-500/30">
                                                <CheckCircle2 className="h-3 w-3" /> Activo
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2.5 py-0.5 text-xs font-medium text-red-300 border border-red-500/30">
                                                <XCircle className="h-3 w-3" /> Inactivo
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => setAddDomainFor(t)}
                                                className="text-xs text-slate-400 hover:text-indigo-300"
                                                title="Agregar dominio"
                                            >
                                                <Globe className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => toggleActivo(t)}
                                                disabled={busy === t.id}
                                                className={`text-xs ${
                                                    t.activo
                                                        ? 'text-slate-400 hover:text-red-300'
                                                        : 'text-slate-400 hover:text-emerald-300'
                                                } disabled:opacity-50`}
                                                title={t.activo ? 'Desactivar' : 'Activar'}
                                            >
                                                {busy === t.id ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : t.activo ? (
                                                    <PowerOff className="h-4 w-4" />
                                                ) : (
                                                    <Power className="h-4 w-4" />
                                                )}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {showCreateModal && (
                <TenantFormModal
                    onClose={() => setShowCreateModal(false)}
                    onSaved={() => { setShowCreateModal(false); fetchTenants(); }}
                />
            )}
            {addDomainFor && (
                <AddDomainModal
                    tenant={addDomainFor}
                    onClose={() => setAddDomainFor(null)}
                    onSaved={() => { setAddDomainFor(null); fetchTenants(); }}
                />
            )}
        </div>
    );
}
