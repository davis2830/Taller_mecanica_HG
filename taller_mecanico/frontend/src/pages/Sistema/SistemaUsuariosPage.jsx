import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { AuthContext } from '../../context/AuthContext';
import axios from 'axios';
import {
    Users, RefreshCw, Loader2, Search, Shield, ShieldOff,
    Trash2, UserCheck, UserX, ChevronDown, X, Save, AlertTriangle
} from 'lucide-react';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('es-GT', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

export default function SistemaUsuariosPage() {
    const { isDark } = useTheme();
    const { authTokens } = useContext(AuthContext);
    const headers = { Authorization: `Bearer ${authTokens?.access}` };

    const [usuarios, setUsuarios] = useState([]);
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterRol, setFilterRol] = useState('');
    const [toast, setToast] = useState(null); // { msg, type }
    const [rolModal, setRolModal] = useState(null); // { usuario }

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

    const fetch = useCallback(async () => {
        setLoading(true);
        try {
            const [uRes, rRes] = await Promise.all([
                axios.get('http://localhost:8000/api/v1/usuarios/usuarios/', { headers }),
                axios.get('http://localhost:8000/api/v1/usuarios/roles/', { headers }),
            ]);
            setUsuarios(uRes.data.results || uRes.data);
            setRoles(rRes.data);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, [authTokens]);

    useEffect(() => { fetch(); }, [fetch]);

    const toggleEstado = async (u) => {
        try {
            await axios.post(`http://localhost:8000/api/v1/usuarios/usuarios/${u.id}/toggle_estado/`, {}, { headers });
            showToast(`${u.first_name || u.username} ${u.is_active ? 'deshabilitado' : 'habilitado'}.`);
            fetch();
        } catch (e) { showToast(e.response?.data?.error || 'Error', 'error'); }
    };

    const eliminar = async (u) => {
        if (!window.confirm(`¿Eliminar a ${u.first_name || u.username}? Esta acción no se puede deshacer.`)) return;
        try {
            await axios.delete(`http://localhost:8000/api/v1/usuarios/usuarios/${u.id}/`, { headers });
            showToast('Usuario eliminado.');
            fetch();
        } catch (e) { showToast(e.response?.data?.error || 'No se puede eliminar.', 'error'); }
    };

    const asignarRol = async (usuarioId, rolId) => {
        try {
            const res = await axios.post(`http://localhost:8000/api/v1/usuarios/usuarios/${usuarioId}/asignar_rol/`, { rol_id: rolId || null }, { headers });
            // Actualizar inmediatamente la fila en el estado local con los datos frescos del servidor
            setUsuarios(prev => prev.map(u => u.id === usuarioId ? res.data : u));
            showToast(`Rol actualizado correctamente.`);
            setRolModal(null);
            fetch(); // refetch completo como respaldo
        } catch (e) { showToast(e.response?.data?.error || 'Error', 'error'); }
    };

    // Filtros
    const filtered = usuarios.filter(u => {
        const q = search.toLowerCase();
        const matchSearch = !q || u.username?.toLowerCase().includes(q) ||
            u.email?.toLowerCase().includes(q) ||
            (u.first_name + ' ' + u.last_name).toLowerCase().includes(q);
        const matchRol = !filterRol || u.perfil?.rol?.nombre === filterRol;
        return matchSearch && matchRol;
    });

    // Clases base
    const bg    = isDark ? 'bg-slate-900'     : 'bg-slate-50';
    const card  = isDark ? 'bg-slate-800/70'  : 'bg-white';
    const bdr   = isDark ? 'border-slate-700' : 'border-slate-200';
    const txt   = isDark ? 'text-slate-100'   : 'text-slate-900';
    const sub   = isDark ? 'text-slate-400'   : 'text-slate-500';
    const inp   = `rounded-xl border text-sm px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/40 transition-colors ${isDark ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-white border-slate-300 text-slate-800'}`;

    const rolColor = (nombre) => {
        const map = {
            'Administrador': isDark ? 'bg-purple-900/40 text-purple-300 border-purple-700/50' : 'bg-purple-100 text-purple-700 border-purple-200',
            'Recepcionista': isDark ? 'bg-blue-900/40 text-blue-300 border-blue-700/50'       : 'bg-blue-100 text-blue-700 border-blue-200',
            'Mecánico':      isDark ? 'bg-orange-900/40 text-orange-300 border-orange-700/50' : 'bg-orange-100 text-orange-700 border-orange-200',
            'Cliente':       isDark ? 'bg-emerald-900/40 text-emerald-300 border-emerald-700/50': 'bg-emerald-100 text-emerald-700 border-emerald-200',
        };
        return map[nombre] || (isDark ? 'bg-slate-700 text-slate-300 border-slate-600' : 'bg-slate-100 text-slate-600 border-slate-200');
    };

    return (
        <div className={`flex flex-col h-full ${bg}`}>
            {/* Header */}
            <div className={`shrink-0 px-6 py-5 border-b ${bdr} flex items-center justify-between`}>
                <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${isDark ? 'bg-blue-500/15' : 'bg-blue-50'}`}>
                        <Users size={22} className="text-blue-500" />
                    </div>
                    <div>
                        <h1 className={`text-xl font-black ${txt}`}>Gestión de Usuarios</h1>
                        <p className={`text-xs ${sub}`}>{filtered.length} usuario{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}</p>
                    </div>
                </div>
                <button onClick={fetch} className={`p-2.5 rounded-xl border transition-colors ${isDark ? 'border-slate-700 text-slate-400 hover:bg-slate-800' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                    <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>

            {/* Filtros */}
            <div className={`shrink-0 px-6 py-3 border-b ${bdr} flex flex-wrap gap-3 items-center`}>
                <div className="relative flex-1 min-w-[200px]">
                    <Search size={15} className={`absolute left-3 top-1/2 -translate-y-1/2 ${sub}`} />
                    <input className={`${inp} w-full pl-9`} placeholder="Buscar nombre, usuario, email..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <select className={`${inp} pr-8`} value={filterRol} onChange={e => setFilterRol(e.target.value)}>
                    <option value="">Todos los roles</option>
                    {roles.map(r => <option key={r.id} value={r.nombre}>{r.nombre}</option>)}
                </select>
            </div>

            {/* Tabla */}
            <div className="flex-1 overflow-auto px-6 py-4">
                {loading ? (
                    <div className="flex justify-center py-20"><Loader2 size={32} className="animate-spin text-blue-500" /></div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <Users size={40} className={sub} />
                        <p className={`text-sm font-medium ${sub}`}>No se encontraron usuarios.</p>
                    </div>
                ) : (
                    <div className={`rounded-xl border ${bdr} overflow-hidden shadow-sm`}>
                        <table className="w-full text-sm">
                            <thead>
                                <tr className={`border-b ${bdr} ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
                                    <th className={`px-4 py-3 text-left text-xs font-bold uppercase tracking-wider ${sub}`}>Usuario</th>
                                    <th className={`px-4 py-3 text-left text-xs font-bold uppercase tracking-wider ${sub}`}>Correo</th>
                                    <th className={`px-4 py-3 text-left text-xs font-bold uppercase tracking-wider ${sub}`}>Rol</th>
                                    <th className={`px-4 py-3 text-left text-xs font-bold uppercase tracking-wider ${sub}`}>Estado</th>
                                    <th className={`px-4 py-3 text-left text-xs font-bold uppercase tracking-wider ${sub}`}>Registro</th>
                                    <th className={`px-4 py-3 text-right text-xs font-bold uppercase tracking-wider ${sub}`}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y ${isDark ? 'divide-slate-700/50' : 'divide-slate-100'}`}>
                                {filtered.map(u => (
                                    <tr key={u.id} className={`${card} ${isDark ? 'hover:bg-slate-700/40' : 'hover:bg-slate-50'} transition-colors`}>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
                                                    {(u.first_name?.[0] || u.username?.[0] || '?').toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className={`font-semibold ${txt}`}>{u.first_name} {u.last_name}</p>
                                                    <p className={`text-xs font-mono ${sub}`}>@{u.username}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className={`px-4 py-3 text-xs ${sub}`}>{u.email || '—'}</td>
                                        <td className="px-4 py-3">
                                            <button
                                                onClick={() => setRolModal(u)}
                                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-opacity hover:opacity-80 ${rolColor(u.perfil?.rol?.nombre)}`}
                                                title="Cambiar rol"
                                            >
                                                {u.perfil?.rol?.nombre || 'Sin rol'}
                                                <ChevronDown size={11} />
                                            </button>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${u.is_active ? (isDark ? 'bg-emerald-900/30 text-emerald-400 border-emerald-700/40' : 'bg-emerald-100 text-emerald-700 border-emerald-200') : (isDark ? 'bg-slate-700 text-slate-400 border-slate-600' : 'bg-slate-100 text-slate-500 border-slate-200')}`}>
                                                {u.is_active ? <><UserCheck size={11} /> Activo</> : <><UserX size={11} /> Inactivo</>}
                                            </span>
                                        </td>
                                        <td className={`px-4 py-3 text-xs font-mono ${sub}`}>{fmtDate(u.date_joined)}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => toggleEstado(u)}
                                                    title={u.is_active ? 'Deshabilitar' : 'Habilitar'}
                                                    className={`p-2 rounded-lg border transition-colors ${isDark ? 'border-slate-600 hover:bg-slate-700' : 'border-slate-200 hover:bg-slate-50'}`}
                                                >
                                                    {u.is_active ? <ShieldOff size={15} className="text-orange-400" /> : <Shield size={15} className="text-emerald-400" />}
                                                </button>
                                                <button
                                                    onClick={() => eliminar(u)}
                                                    title="Eliminar"
                                                    className={`p-2 rounded-lg border transition-colors ${isDark ? 'border-slate-600 hover:bg-rose-900/30' : 'border-slate-200 hover:bg-rose-50'}`}
                                                >
                                                    <Trash2 size={15} className="text-rose-400" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal Asignar Rol */}
            {rolModal && (
                <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
                    <div className={`w-full max-w-sm rounded-2xl shadow-2xl border ${bdr} ${isDark ? 'bg-slate-900' : 'bg-white'} p-6`}>
                        <div className="flex items-center justify-between mb-5">
                            <h3 className={`font-black text-lg ${txt}`}>Cambiar Rol</h3>
                            <button onClick={() => setRolModal(null)} className={`p-1.5 rounded-xl ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}><X size={18} /></button>
                        </div>
                        <p className={`text-sm mb-4 ${sub}`}>Usuario: <strong className={txt}>{rolModal.first_name} {rolModal.last_name}</strong></p>
                        <div className="space-y-2">
                            {roles.map(r => (
                                <button
                                    key={r.id}
                                    onClick={() => asignarRol(rolModal.id, r.id)}
                                    className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                                        rolModal.perfil?.rol?.nombre === r.nombre
                                            ? 'border-blue-500 bg-blue-500/10 text-blue-400 font-bold'
                                            : `border-transparent ${isDark ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-50 text-slate-700'}`
                                    }`}
                                >
                                    {r.nombre}
                                    {r.descripcion && <span className={`block text-xs font-normal mt-0.5 ${sub}`}>{r.descripcion}</span>}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Toast */}
            {toast && (
                <div className={`fixed bottom-6 right-6 z-[200] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl border text-sm font-semibold transition-all ${
                    toast.type === 'error'
                        ? 'bg-rose-600 border-rose-500 text-white'
                        : 'bg-emerald-600 border-emerald-500 text-white'
                }`}>
                    {toast.type === 'error' ? <AlertTriangle size={16} /> : <Save size={16} />}
                    {toast.msg}
                </div>
            )}
        </div>
    );
}
