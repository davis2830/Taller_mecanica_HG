import React, { useState, useEffect, useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Building2, Plus, Search, Loader2, Edit3, Trash2, AlertTriangle,
    FileText, Phone, Mail, RefreshCw, ShieldOff, Ban, Eye
} from 'lucide-react';
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import EmpresaFormModal from '../../components/EmpresaFormModal';

const GTQ = (v) => new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' }).format(Number(v ?? 0));

export default function EmpresasPage() {
    const { authTokens } = useContext(AuthContext);
    const { isDark } = useTheme();
    const navigate = useNavigate();

    const [empresas, setEmpresas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQ, setSearchQ] = useState('');
    const [filtroActivo, setFiltroActivo] = useState(''); // '' | 'true' | 'false'
    const [modalOpen, setModalOpen] = useState(false);
    const [empresaEdit, setEmpresaEdit] = useState(null);

    const headers = useMemo(
        () => ({ Authorization: `Bearer ${authTokens?.access}` }),
        [authTokens]
    );

    const fetchEmpresas = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (searchQ) params.set('q', searchQ);
            if (filtroActivo) params.set('activo', filtroActivo);
            const res = await axios.get(`http://localhost:8000/api/v1/usuarios/empresas/?${params}`, { headers });
            const list = Array.isArray(res.data) ? res.data : (res.data.results || []);
            setEmpresas(list);
        } catch (err) {
            console.error('Error cargando empresas:', err);
        }
        setLoading(false);
    };

    useEffect(() => { fetchEmpresas(); /* eslint-disable-next-line */ }, []);
    useEffect(() => {
        const t = setTimeout(fetchEmpresas, 350);
        return () => clearTimeout(t);
        /* eslint-disable-next-line */
    }, [searchQ, filtroActivo]);

    const handleDelete = async (empresa) => {
        if (!window.confirm(`¿Eliminar "${empresa.razon_social}"? Solo es posible si no tiene facturas asociadas.`)) return;
        try {
            await axios.delete(`http://localhost:8000/api/v1/usuarios/empresas/${empresa.id}/`, { headers });
            fetchEmpresas();
        } catch (err) {
            alert(err.response?.data?.error || 'Error eliminando empresa.');
        }
    };

    // Stats
    const totalSaldo = empresas.reduce((acc, e) => acc + Number(e.saldo_pendiente_total || 0), 0);
    const conVencimientos = empresas.filter(e => e.tiene_vencimientos).length;
    const excedenLimite = empresas.filter(e => e.excede_limite).length;

    const pageBg = isDark ? 'bg-[#0a0f1e]' : 'bg-slate-100';
    const cardBg = isDark ? 'bg-slate-800/70' : 'bg-white';
    const borderC = isDark ? 'border-slate-700' : 'border-slate-200';
    const txt = isDark ? 'text-slate-100' : 'text-slate-900';
    const sub = isDark ? 'text-slate-400' : 'text-slate-500';
    const inputCls = `w-full rounded-xl border text-sm px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500/50 transition-colors ${
        isDark ? 'bg-slate-800 border-slate-600 text-white placeholder-slate-500' : 'bg-white border-slate-300 text-slate-800 placeholder-slate-400'
    }`;

    return (
        <div className={`flex flex-col min-h-full ${pageBg}`}>

            {/* Header */}
            <div className={`shrink-0 px-6 py-5 border-b ${borderC} ${isDark ? 'bg-slate-900' : 'bg-white'} flex items-center justify-between gap-4`}>
                <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${isDark ? 'bg-indigo-500/15' : 'bg-indigo-100'}`}>
                        <Building2 size={21} className="text-indigo-500" />
                    </div>
                    <div>
                        <h1 className={`text-xl font-extrabold tracking-tight ${txt}`}>Empresas (Cuentas por Cobrar)</h1>
                        <p className={`text-sm mt-0.5 ${sub}`}>
                            {loading ? '...' : `${empresas.length} empresa${empresas.length !== 1 ? 's' : ''}`}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={fetchEmpresas}
                        className={`flex items-center gap-2 text-sm font-semibold px-3 py-2 rounded-xl transition-all border ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-600' : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200'}`}
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                        Actualizar
                    </button>
                    <button
                        onClick={() => navigate('/finanzas/cuentas-por-cobrar')}
                        className={`flex items-center gap-2 text-sm font-semibold px-3 py-2 rounded-xl transition-all border ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-600' : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200'}`}
                    >
                        <FileText size={14} />
                        Reporte CxC
                    </button>
                    <button
                        onClick={() => { setEmpresaEdit(null); setModalOpen(true); }}
                        className="flex items-center gap-2 text-sm font-bold px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/30"
                    >
                        <Plus size={16} /> Nueva Empresa
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="shrink-0 px-6 py-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className={`rounded-2xl border p-4 ${cardBg} ${borderC}`}>
                    <p className={`text-xs font-bold uppercase tracking-wide ${sub}`}>Total Empresas</p>
                    <p className={`text-2xl font-black mt-1 ${txt}`}>{empresas.length}</p>
                </div>
                <div className={`rounded-2xl border p-4 ${cardBg} ${borderC}`}>
                    <p className={`text-xs font-bold uppercase tracking-wide ${sub}`}>Saldo Pendiente</p>
                    <p className={`text-2xl font-black mt-1 text-amber-500`}>{GTQ(totalSaldo)}</p>
                </div>
                <div className={`rounded-2xl border p-4 ${cardBg} ${borderC}`}>
                    <p className={`text-xs font-bold uppercase tracking-wide ${sub}`}>Con vencimientos</p>
                    <p className={`text-2xl font-black mt-1 text-red-500`}>{conVencimientos}</p>
                </div>
                <div className={`rounded-2xl border p-4 ${cardBg} ${borderC}`}>
                    <p className={`text-xs font-bold uppercase tracking-wide ${sub}`}>Exceden límite</p>
                    <p className={`text-2xl font-black mt-1 text-red-500`}>{excedenLimite}</p>
                </div>
            </div>

            {/* Filters */}
            <div className={`shrink-0 px-6 py-3 border-b ${borderC} ${isDark ? 'bg-slate-900/60' : 'bg-white/80'} flex flex-wrap gap-3 items-center`}>
                <div className="relative flex-1 min-w-[220px] max-w-sm">
                    <Search size={15} className={`absolute left-3 top-1/2 -translate-y-1/2 ${sub} pointer-events-none`} />
                    <input
                        type="text"
                        className={`${inputCls} pl-9`}
                        placeholder="Buscar por NIT o razón social..."
                        value={searchQ}
                        onChange={e => setSearchQ(e.target.value)}
                    />
                </div>
                <select className={inputCls + ' w-auto'} value={filtroActivo} onChange={e => setFiltroActivo(e.target.value)}>
                    <option value="">Todas</option>
                    <option value="true">Solo activas</option>
                    <option value="false">Solo inactivas</option>
                </select>
            </div>

            {/* Body */}
            <div className="flex-1 px-6 py-5">
                {loading ? (
                    <div className={`flex items-center justify-center py-20 ${sub}`}>
                        <Loader2 size={28} className="animate-spin" />
                    </div>
                ) : empresas.length === 0 ? (
                    <div className={`text-center py-16 ${sub}`}>
                        <Building2 size={48} className="mx-auto opacity-30 mb-3" />
                        <p className="font-semibold">Aún no hay empresas registradas.</p>
                        <p className="text-sm mt-1">Las empresas son tus clientes B2B que pagan a crédito.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                        {empresas.map(e => {
                            const blocked = !e.activo || e.tiene_vencimientos || e.excede_limite;
                            return (
                                <div key={e.id} className={`rounded-2xl border ${cardBg} ${borderC} p-5 hover:shadow-xl transition-all ${!e.activo ? 'opacity-70' : ''}`}>
                                    <div className="flex items-start justify-between gap-3 mb-3">
                                        <div className="flex items-start gap-3 min-w-0">
                                            <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${isDark ? 'bg-indigo-500/15' : 'bg-indigo-100'}`}>
                                                <Building2 size={20} className="text-indigo-500" />
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className={`text-base font-bold truncate ${txt}`}>{e.nombre_mostrar || e.razon_social}</h3>
                                                <p className={`text-xs font-mono ${sub}`}>NIT {e.nit}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 flex-shrink-0">
                                            <button
                                                onClick={() => navigate(`/finanzas/empresas/${e.id}/estado-cuenta`)}
                                                title="Ver estado de cuenta"
                                                className={`p-2 rounded-lg transition-colors ${isDark ? 'text-blue-400 hover:bg-slate-700' : 'text-blue-600 hover:bg-blue-50'}`}
                                            >
                                                <Eye size={15} />
                                            </button>
                                            <button
                                                onClick={() => { setEmpresaEdit(e); setModalOpen(true); }}
                                                title="Editar"
                                                className={`p-2 rounded-lg transition-colors ${isDark ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-500 hover:bg-slate-100'}`}
                                            >
                                                <Edit3 size={15} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(e)}
                                                title="Eliminar"
                                                className={`p-2 rounded-lg transition-colors ${isDark ? 'text-red-400 hover:bg-red-900/30' : 'text-red-500 hover:bg-red-50'}`}
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Badges */}
                                    <div className="flex flex-wrap gap-1.5 mb-3">
                                        {!e.activo && (
                                            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-500/15 text-slate-500 border border-slate-500/30 uppercase flex items-center gap-1">
                                                <Ban size={10} /> Inactiva
                                            </span>
                                        )}
                                        {e.tiene_vencimientos && (
                                            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-red-500/15 text-red-500 border border-red-500/30 uppercase flex items-center gap-1">
                                                <AlertTriangle size={10} /> Vencida
                                            </span>
                                        )}
                                        {e.excede_limite && (
                                            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-orange-500/15 text-orange-500 border border-orange-500/30 uppercase flex items-center gap-1">
                                                <ShieldOff size={10} /> Excede límite
                                            </span>
                                        )}
                                        {!blocked && (
                                            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 uppercase">
                                                Al día
                                            </span>
                                        )}
                                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-500/15 text-blue-500 border border-blue-500/30 uppercase">
                                            {e.dias_credito === 0 ? 'Contado' : `${e.dias_credito}d`}
                                        </span>
                                    </div>

                                    {/* Stats */}
                                    <div className={`grid grid-cols-2 gap-2 p-3 rounded-xl mb-3 ${isDark ? 'bg-slate-900/60' : 'bg-slate-50'}`}>
                                        <div>
                                            <p className={`text-[10px] uppercase font-bold ${sub}`}>Saldo Pendiente</p>
                                            <p className="text-base font-extrabold tabular-nums text-amber-500">{GTQ(e.saldo_pendiente_total)}</p>
                                        </div>
                                        <div>
                                            <p className={`text-[10px] uppercase font-bold ${sub}`}>Límite</p>
                                            <p className={`text-base font-extrabold tabular-nums ${txt}`}>
                                                {Number(e.limite_credito) > 0 ? GTQ(e.limite_credito) : '—'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Contact */}
                                    <div className={`text-xs space-y-1 ${sub}`}>
                                        {e.telefono && <p className="flex items-center gap-2"><Phone size={11} /> {e.telefono}</p>}
                                        {e.email_cobro && <p className="flex items-center gap-2 truncate"><Mail size={11} /> <span className="truncate">{e.email_cobro}</span></p>}
                                        <p className="flex items-center gap-2">
                                            <FileText size={11} /> {e.facturas_count || 0} factura(s) · {e.vehiculos_count || 0} vehículo(s)
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <EmpresaFormModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                empresa={empresaEdit}
                onSaved={fetchEmpresas}
            />
        </div>
    );
}
