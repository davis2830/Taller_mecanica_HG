import React, { useContext, useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { Users, CheckCircle2, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';

/**
 * Lista read-only de usuarios SaaS (PublicUser).
 *
 * MVP: solo listado. La creación/edición queda en Django admin por ahora;
 * cuando haya feature request podemos extender a CRUD completo igual que tenants.
 */
export default function PublicUserList() {
    const { authTokens } = useContext(AuthContext);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const resp = await axios.get('/api/v1/public-admin/users/', {
                headers: { Authorization: `Bearer ${authTokens?.access}` },
            });
            setUsers(resp.data.results || resp.data || []);
        } catch (err) {
            console.error(err);
            setError('No se pudieron cargar los usuarios.');
        } finally {
            setLoading(false);
        }
    }, [authTokens]);

    useEffect(() => { fetchUsers(); }, [fetchUsers]);

    return (
        <div>
            <h1 className="text-2xl font-bold mb-1">Usuarios SaaS</h1>
            <p className="text-sm text-slate-400 mb-6">
                Equipo interno con acceso al panel. Se gestionan desde Django admin.
            </p>

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
                ) : users.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 p-12 text-center">
                        <Users className="h-10 w-10 text-slate-600" />
                        <p className="text-sm text-slate-400">No hay usuarios registrados.</p>
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead className="bg-slate-800/40 text-xs uppercase tracking-wide text-slate-400">
                            <tr>
                                <th className="px-4 py-3 text-left">Usuario</th>
                                <th className="px-4 py-3 text-left">Rol</th>
                                <th className="px-4 py-3 text-left">Último login</th>
                                <th className="px-4 py-3 text-left">Estado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {users.map((u) => (
                                <tr key={u.id} className="hover:bg-slate-800/30">
                                    <td className="px-4 py-3">
                                        <p className="font-medium">{u.nombre}</p>
                                        <p className="text-xs text-slate-500">{u.email}</p>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="inline-flex items-center rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-xs font-medium text-indigo-300 border border-indigo-500/30 capitalize">
                                            {u.rol}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-xs text-slate-400">
                                        {u.ultimo_login ? new Date(u.ultimo_login).toLocaleString() : '—'}
                                    </td>
                                    <td className="px-4 py-3">
                                        {u.activo ? (
                                            <span className="inline-flex items-center gap-1 text-emerald-300 text-xs">
                                                <CheckCircle2 className="h-3 w-3" /> Activo
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 text-red-300 text-xs">
                                                <XCircle className="h-3 w-3" /> Inactivo
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
