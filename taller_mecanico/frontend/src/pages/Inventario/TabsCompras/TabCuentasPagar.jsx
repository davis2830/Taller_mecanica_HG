import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import { AuthContext } from '../../../context/AuthContext';
import axios from 'axios';
import { RefreshCw, Loader2, DollarSign, HandCoins, Building2, Calendar } from 'lucide-react';
import PagoProveedorFormModal from '../../../components/PagoProveedorFormModal';

const GTQ = (v) => v != null ? new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' }).format(v) : 'Q0.00';
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('es-GT', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

export default function TabCuentasPagar() {
    const { isDark } = useTheme();
    const { authTokens } = useContext(AuthContext);

    const [cuentas, setCuentas] = useState([]);
    const [loading, setLoading] = useState(true);

    const [modalOpen, setModalOpen] = useState(false);
    const [cuentaToPay, setCuentaToPay] = useState(null);
    const [expandedCuenta, setExpandedCuenta] = useState(null);

    const headers = { Authorization: `Bearer ${authTokens?.access}` };

    const fetchCuentas = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/v1/inventario/cuentas-pagar/', { headers });
            setCuentas(res.data.results || res.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [authTokens]);

    useEffect(() => {
        fetchCuentas();
    }, [fetchCuentas]);

    const handleOpenPago = (e, cuenta) => {
        e.stopPropagation();
        setCuentaToPay(cuenta);
        setModalOpen(true);
    };

    // Calcular deuda total de las pendientes/parciales
    const totalDeuda = cuentas
        .filter(c => ['PENDIENTE', 'PARCIAL'].includes(c.estado))
        .reduce((acc, c) => acc + parseFloat(c.saldo_pendiente), 0);

    const StatusBadge = ({ status }) => {
        let sc = 'bg-slate-100 text-slate-800 border-slate-200';
        if (isDark) sc = 'bg-slate-800 text-slate-300 border-slate-700';

        if (status === 'PENDIENTE') sc = isDark ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' : 'bg-rose-100 text-rose-800 border-rose-200';
        else if (status === 'PARCIAL') sc = isDark ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' : 'bg-orange-100 text-orange-800 border-orange-200';
        else if (status === 'PAGADO') sc = isDark ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-emerald-100 text-emerald-800 border-emerald-200';
        else if (status === 'CANCELADO') sc = isDark ? 'bg-slate-500/20 text-slate-400 border-slate-500/30' : 'bg-slate-200 text-slate-600 border-slate-300';

        return <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider ${sc}`}>{status}</span>;
    };

    const borderC  = isDark ? 'border-slate-700' : 'border-slate-200';
    const bgCard   = isDark ? 'bg-slate-800/70' : 'bg-white';
    const thdBg    = isDark ? 'bg-slate-900' : 'bg-slate-50';
    const thdTxt   = isDark ? 'text-slate-400' : 'text-slate-500';
    const txt      = isDark ? 'text-slate-100' : 'text-slate-900';
    const sub      = isDark ? 'text-slate-400' : 'text-slate-500';

    return (
        <div className="flex flex-col h-full absolute inset-0">
            {/* Header / Stats */}
            <div className={`shrink-0 px-6 py-4 border-b ${borderC} flex justify-between items-center bg-transparent`}>
                <div className="flex items-center gap-4">
                    <div className={`px-5 py-3 rounded-2xl border ${isDark ? 'bg-rose-900/20 border-rose-800/50' : 'bg-rose-50 border-rose-200'}`}>
                        <p className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-rose-400' : 'text-rose-600'}`}>Total Deuda Actual</p>
                        <p className={`text-2xl font-black ${txt}`}>{loading ? '...' : GTQ(totalDeuda)}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={fetchCuentas} className={`p-2.5 rounded-xl border transition-colors ${isDark ? 'border-slate-700 text-slate-400 hover:bg-slate-800' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-auto p-6">
                {loading ? (
                     <div className="flex justify-center py-20"><Loader2 size={32} className="animate-spin text-rose-500" /></div>
                ) : cuentas.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <HandCoins size={40} className={sub} />
                        <p className={`text-sm font-medium ${sub}`}>No hay cuentas por pagar registradas.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {cuentas.map(c => (
                            <div key={c.id} className={`rounded-xl border ${borderC} ${bgCard} overflow-hidden shadow-sm transition-all`}>
                                <div 
                                    className={`p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer ${isDark ? 'hover:bg-slate-700/50' : 'hover:bg-slate-50'} ${expandedCuenta === c.id ? (isDark ? 'bg-slate-800' : 'bg-slate-50') : ''}`}
                                    onClick={() => setExpandedCuenta(expandedCuenta === c.id ? null : c.id)}
                                >
                                    <div className="flex items-center gap-6">
                                        <div className="min-w-[120px]">
                                            <p className={`text-[10px] font-black uppercase ${sub}`}>Cuenta N°</p>
                                            <p className={`font-bold text-lg ${txt}`}>{c.id}</p>
                                            <p className={`text-[10px] font-mono mt-1 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>{c.orden_compra_codigo}</p>
                                        </div>
                                        <div className="min-w-[200px]">
                                            <p className={`text-[10px] uppercase font-bold ${sub}`}>Proveedor</p>
                                            <div className={`flex items-center gap-1.5 font-bold mt-0.5 ${txt}`}><Building2 size={14}/> {c.proveedor_nombre}</div>
                                        </div>
                                        <div>
                                            <p className={`text-[10px] uppercase font-bold ${sub}`}>Fecha Emisión</p>
                                            <div className={`flex items-center gap-1.5 text-sm font-semibold mt-0.5 ${txt}`}><Calendar size={13}/> {fmtDate(c.fecha_emision)}</div>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center justify-between md:justify-end gap-6 md:gap-8 border-t md:border-none pt-4 md:pt-0 mt-2 md:mt-0" style={{ borderColor: isDark ? '#334155' : '#e2e8f0' }}>
                                        <div>
                                            <p className={`text-[10px] font-bold uppercase ${sub}`}>Total Facturado</p>
                                            <p className={`text-sm font-semibold ${txt}`}>{GTQ(c.monto_total)}</p>
                                        </div>
                                        <div>
                                            <StatusBadge status={c.estado} />
                                        </div>
                                        <div className="text-right">
                                            <p className={`text-[10px] font-bold uppercase ${sub}`}>Saldo Pendiente</p>
                                            <p className={`font-black text-lg ${c.estado === 'PAGADO' ? 'text-emerald-500' : (isDark ? 'text-rose-400' : 'text-rose-600')}`}>
                                                {GTQ(c.saldo_pendiente)}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {expandedCuenta === c.id && (
                                    <div className={`border-t flex flex-col md:flex-row gap-6 ${borderC} ${isDark ? 'bg-slate-900/50' : 'bg-slate-50/50'} p-4`}>
                                        
                                        {/* Historial de Pagos */}
                                        <div className="flex-1">
                                            <div className="flex justify-between items-center mb-3">
                                                <h4 className={`text-sm font-bold uppercase tracking-wider ${sub}`}>Historial de Pagos</h4>
                                                {['PENDIENTE', 'PARCIAL'].includes(c.estado) && (
                                                    <button 
                                                        onClick={(e) => handleOpenPago(e, c)}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-md shadow-rose-500/20"
                                                    >
                                                        <DollarSign size={14} /> Registrar Abono
                                                    </button>
                                                )}
                                            </div>
                                            
                                            {c.pagos.length === 0 ? (
                                                <p className={`text-xs italic ${sub}`}>No hay abonos registrados en esta cuenta.</p>
                                            ) : (
                                                <div className={`rounded-lg border ${borderC} overflow-hidden ${isDark ? 'bg-slate-800/80' : 'bg-white'}`}>
                                                    <table className="w-full text-xs">
                                                        <thead>
                                                            <tr className={`border-b ${borderC} ${thdBg}`}>
                                                                <th className={`px-4 py-2 text-left font-bold ${thdTxt}`}>Fecha</th>
                                                                <th className={`px-4 py-2 text-left font-bold ${thdTxt}`}>Método</th>
                                                                <th className={`px-4 py-2 text-left font-bold ${thdTxt}`}>Referencia</th>
                                                                <th className={`px-4 py-2 text-right font-bold ${thdTxt}`}>Monto</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className={`divide-y ${isDark ? 'divide-slate-700/50' : 'divide-slate-100'}`}>
                                                            {c.pagos.map(p => (
                                                                <tr key={p.id} className={isDark ? 'hover:bg-slate-700/30' : 'hover:bg-slate-50'}>
                                                                    <td className={`px-4 py-2 font-mono text-[10px] ${sub}`}>{fmtDate(p.fecha_pago)}</td>
                                                                    <td className={`px-4 py-2 font-bold ${txt}`}>{p.metodo_pago}</td>
                                                                    <td className={`px-4 py-2 ${sub}`}>{p.referencia || 'N/A'}</td>
                                                                    <td className={`px-4 py-2 text-right font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>{GTQ(p.monto)}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <PagoProveedorFormModal isOpen={modalOpen} onClose={() => setModalOpen(false)} cuenta={cuentaToPay} onSaved={fetchCuentas} />
        </div>
    );
}
