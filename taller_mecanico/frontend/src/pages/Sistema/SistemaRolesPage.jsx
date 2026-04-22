import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { AuthContext } from '../../context/AuthContext';
import axios from 'axios';
import { Shield, RefreshCw, Loader2, Plus, Pencil, Trash2, X, Save, AlertTriangle, Users } from 'lucide-react';

export default function SistemaRolesPage() {
    const { isDark } = useTheme();
    const { authTokens } = useContext(AuthContext);
    const headers = { Authorization: `Bearer ${authTokens?.access}` };

    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState(null); // null | { mode: 'create' | 'edit', rol?: {} }
    const [form, setForm] = useState({ nombre: '', descripcion: '' });
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState(null);

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const fetch = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axios.get('http://localhost:8000/api/v1/usuarios/roles/', { headers });
            setRoles(res.data);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, [authTokens]);

    useEffect(() => { fetch(); }, [fetch]);

    const openCreate = () => {
        setForm({ nombre: '', descripcion: '' });
        setModal({ mode: 'create' });
    };

    const openEdit = (rol) => {
        setForm({ nombre: rol.nombre, descripcion: rol.descripcion || '' });
        setModal({ mode: 'edit', rol });
    };

    const handleSave = async () => {
        if (!form.nombre.trim()) return;
        setSaving(true);
        try {
            if (modal.mode === 'create') {
                await axios.post('http://localhost:8000/api/v1/usuarios/roles/', form, { headers });
                showToast(`Rol "${form.nombre}" creado.`);
            } else {
                await axios.patch(`http://localhost:8000/api/v1/usuarios/roles/${modal.rol.id}/`, form, { headers });
                showToast(`Rol "${form.nombre}" actualizado.`);
            }
            setModal(null);
            fetch();
        } catch (e) {
            showToast(e.response?.data?.error || 'Error al guardar.', 'error');
        }
        setSaving(false);
    };

    const handleDelete = async (rol) => {
        if (!window.confirm(`¿Eliminar el rol "${rol.nombre}"? No se puede si hay usuarios asignados.`)) return;
        try {
            await axios.delete(`http://localhost:8000/api/v1/usuarios/roles/${rol.id}/`, { headers });
            showToast(`Rol "${rol.nombre}" eliminado.`);
            fetch();
        } catch (e) {
            showToast(e.response?.data?.error || 'No se puede eliminar.', 'error');
        }
    };

    const bg   = isDark ? 'bg-slate-900'     : 'bg-slate-50';
    const card = isDark ? 'bg-slate-800/70'  : 'bg-white';
    const bdr  = isDark ? 'border-slate-700' : 'border-slate-200';
    const txt  = isDark ? 'text-slate-100'   : 'text-slate-900';
    const sub  = isDark ? 'text-slate-400'   : 'text-slate-500';
    const inp  = `w-full rounded-xl border text-sm px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500/40 transition-colors ${isDark ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-white border-slate-300 text-slate-800'}`;

    const ROL_COLORS = {
        'Administrador': 'from-purple-600 to-purple-800',
        'Recepcionista': 'from-blue-600 to-blue-800',
        'Mecánico':      'from-orange-600 to-orange-800',
        'Cliente':       'from-emerald-600 to-emerald-800',
    };

    return (
        <div className={`flex flex-col h-full ${bg}`}>
            {/* Header */}
            <div className={`shrink-0 px-6 py-5 border-b ${bdr} flex items-center justify-between`}>
                <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${isDark ? 'bg-purple-500/15' : 'bg-purple-50'}`}>
                        <Shield size={22} className="text-purple-500" />
                    </div>
                    <div>
                        <h1 className={`text-xl font-black ${txt}`}>Gestión de Roles</h1>
                        <p className={`text-xs ${sub}`}>{roles.length} rol{roles.length !== 1 ? 'es' : ''} configurado{roles.length !== 1 ? 's' : ''}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={fetch} className={`p-2.5 rounded-xl border transition-colors ${isDark ? 'border-slate-700 text-slate-400 hover:bg-slate-800' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-purple-900/20 transition-all">
                        <Plus size={16} /> Nuevo Rol
                    </button>
                </div>
            </div>

            {/* Grid de roles */}
            <div className="flex-1 overflow-auto p-6">
                {loading ? (
                    <div className="flex justify-center py-20"><Loader2 size={32} className="animate-spin text-purple-500" /></div>
                ) : roles.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <Shield size={40} className={sub} />
                        <p className={`text-sm font-medium ${sub}`}>No hay roles configurados.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {roles.map(rol => {
                            const gradiente = ROL_COLORS[rol.nombre] || 'from-slate-600 to-slate-800';
                            return (
                                <div key={rol.id} className={`rounded-2xl border ${bdr} ${card} overflow-hidden shadow-sm hover:shadow-md transition-shadow`}>
                                    {/* Franja de color */}
                                    <div className={`h-2 bg-gradient-to-r ${gradiente}`}></div>
                                    <div className="p-5">
                                        <div className="flex items-start justify-between mb-3">
                                            <h3 className={`font-black text-lg ${txt}`}>{rol.nombre}</h3>
                                            <div className="flex gap-1.5">
                                                <button onClick={() => openEdit(rol)} className={`p-1.5 rounded-lg border transition-colors ${isDark ? 'border-slate-600 hover:bg-slate-700 text-slate-400' : 'border-slate-200 hover:bg-slate-100 text-slate-500'}`}>
                                                    <Pencil size={13} />
                                                </button>
                                                <button onClick={() => handleDelete(rol)} className={`p-1.5 rounded-lg border transition-colors ${isDark ? 'border-slate-600 hover:bg-rose-900/30 text-rose-400' : 'border-slate-200 hover:bg-rose-50 text-rose-500'}`}>
                                                    <Trash2 size={13} />
                                                </button>
                                            </div>
                                        </div>
                                        <p className={`text-xs ${sub} mb-4 min-h-[36px]`}>{rol.descripcion || 'Sin descripción.'}</p>
                                        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${isDark ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                                            <Users size={14} className="text-blue-400" />
                                            <span className={`text-xs font-bold ${txt}`}>{rol.total_usuarios ?? '—'}</span>
                                            <span className={`text-xs ${sub}`}>usuario{rol.total_usuarios !== 1 ? 's' : ''}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Modal Crear/Editar */}
            {modal && (
                <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
                    <div className={`w-full max-w-md rounded-2xl shadow-2xl border ${bdr} ${isDark ? 'bg-slate-900' : 'bg-white'} overflow-hidden`}>
                        <div className={`px-6 py-4 border-b ${bdr} flex items-center justify-between`}>
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-xl ${isDark ? 'bg-purple-500/15' : 'bg-purple-100'}`}>
                                    <Shield size={18} className="text-purple-500" />
                                </div>
                                <h3 className={`font-black ${txt}`}>{modal.mode === 'create' ? 'Nuevo Rol' : 'Editar Rol'}</h3>
                            </div>
                            <button onClick={() => setModal(null)} className={`p-1.5 rounded-xl ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>
                                <X size={18} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className={`block text-xs font-bold mb-1.5 ml-1 ${sub}`}>Nombre del Rol *</label>
                                <input
                                    className={inp}
                                    placeholder="Ej. Supervisor"
                                    value={form.nombre}
                                    onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))}
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className={`block text-xs font-bold mb-1.5 ml-1 ${sub}`}>Descripción (Opcional)</label>
                                <textarea
                                    className={`${inp} resize-none`}
                                    rows={3}
                                    placeholder="Describe las responsabilidades de este rol..."
                                    value={form.descripcion}
                                    onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))}
                                />
                            </div>
                        </div>
                        <div className={`px-6 py-4 border-t ${bdr} flex justify-end gap-3`}>
                            <button onClick={() => setModal(null)} className={`px-4 py-2 text-sm font-semibold rounded-xl border transition-colors ${isDark ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                                Cancelar
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving || !form.nombre.trim()}
                                className="flex items-center gap-2 px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-purple-900/20 transition-all disabled:opacity-50"
                            >
                                {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                                {saving ? 'Guardando…' : 'Guardar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast */}
            {toast && (
                <div className={`fixed bottom-6 right-6 z-[200] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl border text-sm font-semibold ${toast.type === 'error' ? 'bg-rose-600 border-rose-500 text-white' : 'bg-emerald-600 border-emerald-500 text-white'}`}>
                    {toast.type === 'error' ? <AlertTriangle size={16} /> : <Save size={16} />}
                    {toast.msg}
                </div>
            )}
        </div>
    );
}
