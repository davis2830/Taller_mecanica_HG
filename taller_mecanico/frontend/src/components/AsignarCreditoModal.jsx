import React, { useState, useEffect, useContext, useMemo } from 'react';
import { X, CreditCard, Loader2, AlertCircle, AlertTriangle, ShieldCheck, Search, Building2 } from 'lucide-react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const DIAS_CHOICES = [0, 8, 15, 30, 45, 60, 90];
const GTQ = (v) => new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' }).format(Number(v ?? 0));

export default function AsignarCreditoModal({ isOpen, onClose, factura, onSaved }) {
    const { authTokens, user } = useContext(AuthContext);
    const { isDark } = useTheme();
    const isSuperAdmin = !!user?.is_superuser;

    const [empresas, setEmpresas] = useState([]);
    const [loadingEmpresas, setLoadingEmpresas] = useState(false);
    const [searchQ, setSearchQ] = useState('');
    const [empresaSel, setEmpresaSel] = useState(null);
    const [diasCredito, setDiasCredito] = useState(30);
    const [overrideMotivo, setOverrideMotivo] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [bloqueoInfo, setBloqueoInfo] = useState(null); // {motivo, requiere_override}

    const headers = useMemo(
        () => ({ Authorization: `Bearer ${authTokens?.access}` }),
        [authTokens]
    );

    useEffect(() => {
        if (!isOpen) return;
        setEmpresaSel(null);
        setSearchQ('');
        setDiasCredito(30);
        setOverrideMotivo('');
        setError('');
        setBloqueoInfo(null);
        (async () => {
            setLoadingEmpresas(true);
            try {
                const res = await axios.get('/api/v1/usuarios/empresas/?activo=true', { headers });
                const list = Array.isArray(res.data) ? res.data : (res.data.results || []);
                setEmpresas(list);
            } catch (err) {
                setError('No se pudieron cargar las empresas.');
            }
            setLoadingEmpresas(false);
        })();
    }, [isOpen, headers]);

    useEffect(() => {
        if (empresaSel) setDiasCredito(empresaSel.dias_credito ?? 30);
    }, [empresaSel]);

    const filtered = useMemo(() => {
        const q = searchQ.trim().toLowerCase();
        if (!q) return empresas;
        return empresas.filter(e =>
            (e.razon_social || '').toLowerCase().includes(q) ||
            (e.nombre_comercial || '').toLowerCase().includes(q) ||
            (e.nit || '').toLowerCase().includes(q)
        );
    }, [empresas, searchQ]);

    const empresaBloqueada = empresaSel && (
        empresaSel.tiene_vencimientos || empresaSel.excede_limite || empresaSel.activo === false
    );

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!empresaSel) { setError('Selecciona una empresa.'); return; }
        setError('');
        setBloqueoInfo(null);
        setLoading(true);
        try {
            const payload = {
                empresa_id: empresaSel.id,
                dias_credito: diasCredito,
            };
            if (empresaBloqueada && isSuperAdmin) {
                if (!overrideMotivo.trim()) {
                    setLoading(false);
                    setError('Debes registrar un motivo para autorizar el override.');
                    return;
                }
                payload.override_motivo = overrideMotivo.trim();
            }
            const res = await axios.post(
                `/api/v1/facturacion/${factura.id}/asignar-credito/`,
                payload,
                { headers }
            );
            onSaved(res.data);
            onClose();
        } catch (err) {
            const data = err.response?.data;
            if (data?.requiere_override_superadmin || data?.empresa_bloqueada) {
                setBloqueoInfo({
                    motivo: data?.error || 'La empresa está bloqueada para nuevo crédito.',
                    requiereOverride: true,
                });
                setError('');
            } else {
                setError(data?.error || data?.detail || err.message || 'Error asignando crédito.');
            }
        }
        setLoading(false);
    };

    const bg = isDark ? 'bg-slate-900' : 'bg-white';
    const inputCls = `w-full px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors outline-none focus:ring-2 focus:ring-blue-500/40 ${
        isDark ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
    }`;
    const labelCls = `block text-xs font-bold uppercase tracking-wider mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`;
    const border = isDark ? 'border-slate-700' : 'border-slate-200';

    if (!isOpen || !factura) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className={`${bg} rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto border ${border}`}>
                <div className={`flex items-center justify-between px-6 py-4 border-b sticky top-0 z-10 ${border} ${isDark ? 'bg-slate-800' : 'bg-slate-50'}`}>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-500/15 rounded-xl">
                            <CreditCard size={20} className="text-amber-500" />
                        </div>
                        <div>
                            <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Asignar a Crédito (B2B)</h2>
                            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{factura.numero_factura} · Total {GTQ(factura.total_general)}</p>
                        </div>
                    </div>
                    <button type="button" onClick={onClose} className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {error && (
                        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                            <AlertCircle size={16} className="mt-0.5 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    <div>
                        <label className={labelCls}>1. Empresa cliente</label>
                        <div className="relative mb-2">
                            <Search size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                            <input
                                className={`${inputCls} pl-9`}
                                placeholder="Buscar por NIT, razón social o nombre comercial..."
                                value={searchQ}
                                onChange={e => setSearchQ(e.target.value)}
                            />
                        </div>
                        <div className={`max-h-48 overflow-y-auto rounded-xl border ${border}`}>
                            {loadingEmpresas ? (
                                <div className={`p-6 text-center text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                    <Loader2 size={20} className="animate-spin mx-auto mb-2" />
                                    Cargando empresas...
                                </div>
                            ) : filtered.length === 0 ? (
                                <div className={`p-6 text-center text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                    Ninguna empresa coincide. Crea una desde Finanzas → Empresas.
                                </div>
                            ) : (
                                <ul>
                                    {filtered.map(e => {
                                        const sel = empresaSel?.id === e.id;
                                        const blocked = e.tiene_vencimientos || e.excede_limite || !e.activo;
                                        return (
                                            <li key={e.id}>
                                                <button
                                                    type="button"
                                                    onClick={() => setEmpresaSel(e)}
                                                    className={`w-full text-left px-3 py-2.5 flex items-center gap-3 transition-colors ${
                                                        sel
                                                            ? (isDark ? 'bg-amber-500/10 ring-1 ring-amber-500/40' : 'bg-amber-50 ring-1 ring-amber-300')
                                                            : (isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-50')
                                                    }`}
                                                >
                                                    <Building2 size={16} className={isDark ? 'text-slate-400' : 'text-slate-500'} />
                                                    <div className="flex-1 min-w-0">
                                                        <p className={`text-sm font-bold truncate ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                                                            {e.razon_social}
                                                        </p>
                                                        <p className={`text-xs truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                                            NIT {e.nit} · {e.dias_credito}d · saldo {GTQ(e.saldo_pendiente_total)}
                                                        </p>
                                                    </div>
                                                    {blocked && (
                                                        <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-red-500/15 text-red-500 border border-red-500/30 uppercase tracking-wide">
                                                            Bloqueada
                                                        </span>
                                                    )}
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>
                    </div>

                    {empresaSel && empresaBloqueada && (
                        <div className={`p-4 rounded-xl border ${isDark ? 'bg-red-500/10 border-red-500/40 text-red-300' : 'bg-red-50 border-red-200 text-red-800'}`}>
                            <div className="flex items-start gap-2.5">
                                <AlertTriangle size={18} className="mt-0.5 shrink-0" />
                                <div className="text-sm">
                                    <p className="font-bold mb-1">Empresa bloqueada para nuevo crédito</p>
                                    <ul className="list-disc list-inside space-y-0.5">
                                        {empresaSel.tiene_vencimientos && <li>Tiene factura(s) vencida(s) sin pagar.</li>}
                                        {empresaSel.excede_limite && <li>Excede su límite de crédito (saldo {GTQ(empresaSel.saldo_pendiente_total)} sobre límite {GTQ(empresaSel.limite_credito)}).</li>}
                                        {!empresaSel.activo && <li>Empresa marcada como inactiva.</li>}
                                    </ul>
                                    <p className="mt-2">
                                        {isSuperAdmin
                                            ? 'Como superadmin puedes autorizar el override registrando un motivo abajo.'
                                            : 'Solo un superadmin puede autorizar el override. Pide aprobación a tu gerente.'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {bloqueoInfo?.requiereOverride && !isSuperAdmin && (
                        <div className={`p-4 rounded-xl border ${isDark ? 'bg-red-500/10 border-red-500/40 text-red-300' : 'bg-red-50 border-red-200 text-red-800'}`}>
                            <p className="text-sm font-semibold flex items-start gap-2"><AlertTriangle size={16} className="mt-0.5 shrink-0" />{bloqueoInfo.motivo}</p>
                        </div>
                    )}

                    <div>
                        <label className={labelCls}>2. Días de Crédito</label>
                        <select className={inputCls} value={diasCredito} onChange={e => setDiasCredito(parseInt(e.target.value, 10))}>
                            {DIAS_CHOICES.map(d => <option key={d} value={d}>{d === 0 ? 'Contado (0 días)' : `${d} días`}</option>)}
                        </select>
                        <p className={`mt-1 text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                            Por defecto se usa el plazo configurado en la empresa.
                        </p>
                    </div>

                    {empresaBloqueada && isSuperAdmin && (
                        <div>
                            <label className={`${labelCls} flex items-center gap-1.5`}>
                                <ShieldCheck size={12} className="text-amber-500" /> 3. Motivo de Override (obligatorio)
                            </label>
                            <textarea
                                className={`${inputCls} resize-y`}
                                rows={3}
                                value={overrideMotivo}
                                onChange={e => setOverrideMotivo(e.target.value)}
                                placeholder="Ej. Cliente comprometió pago el viernes 30. Aprobado por gerencia."
                                required
                            />
                            <p className={`mt-1 text-xs ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                                Tu nombre y la fecha quedarán registrados con la factura para auditoría.
                            </p>
                        </div>
                    )}

                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose}
                            className={`flex-1 py-2.5 rounded-xl border font-semibold text-sm transition-colors ${isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-300 text-slate-700 hover:bg-slate-50'}`}>
                            Cancelar
                        </button>
                        <button type="submit" disabled={loading || !empresaSel || (empresaBloqueada && !isSuperAdmin)}
                            className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-amber-500/25">
                            {loading && <Loader2 size={16} className="animate-spin" />}
                            {empresaBloqueada && isSuperAdmin ? 'Aprobar Override y Asignar' : 'Asignar Crédito'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
