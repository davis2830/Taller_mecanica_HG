import React, { useState, useEffect, useContext } from 'react';
import { X, DollarSign, Loader2, AlertCircle, Banknote, CreditCard, ArrowRightLeft, Receipt } from 'lucide-react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const METODOS = [
    { value: 'TRANSFERENCIA', label: 'Transferencia Bancaria', icon: <ArrowRightLeft size={14} /> },
    { value: 'EFECTIVO', label: 'Efectivo', icon: <Banknote size={14} /> },
    { value: 'CHEQUE', label: 'Cheque', icon: <Receipt size={14} /> },
    { value: 'DEPOSITO', label: 'Depósito Bancario', icon: <Receipt size={14} /> },
    { value: 'TARJETA', label: 'Tarjeta', icon: <CreditCard size={14} /> },
    { value: 'OTRO', label: 'Otro', icon: <Receipt size={14} /> },
];

const GTQ = (v) => new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' }).format(Number(v ?? 0));

export default function RegistrarPagoModal({ isOpen, onClose, factura, onSaved }) {
    const { authTokens } = useContext(AuthContext);
    const { isDark } = useTheme();

    const todayISO = new Date().toISOString().slice(0, 10);
    const [monto, setMonto] = useState('');
    const [metodo, setMetodo] = useState('TRANSFERENCIA');
    const [fechaPago, setFechaPago] = useState(todayISO);
    const [referencia, setReferencia] = useState('');
    const [nota, setNota] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const headers = { Authorization: `Bearer ${authTokens?.access}` };
    const saldo = Number(factura?.saldo_pendiente ?? 0);

    useEffect(() => {
        if (isOpen) {
            setMonto(saldo > 0 ? saldo.toFixed(2) : '');
            setMetodo('TRANSFERENCIA');
            setFechaPago(todayISO);
            setReferencia('');
            setNota('');
            setError('');
        }
    }, [isOpen, factura?.id]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        const m = Number(monto);
        if (!m || m <= 0) { setError('El monto debe ser mayor a 0.'); return; }
        if (m > saldo) { setError(`El monto excede el saldo pendiente de ${GTQ(saldo)}.`); return; }
        setLoading(true);
        try {
            const payload = { monto: m.toFixed(2), metodo, fecha_pago: fechaPago, referencia, nota };
            const res = await axios.post(`/api/v1/facturacion/${factura.id}/pagos/`, payload, { headers });
            onSaved(res.data);
            onClose();
        } catch (err) {
            const data = err.response?.data;
            setError(data?.error || data?.detail || err.message || 'Error registrando pago.');
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
            <div className={`${bg} rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border ${border}`}>
                <div className={`flex items-center justify-between px-6 py-4 border-b ${border} ${isDark ? 'bg-slate-800' : 'bg-slate-50'}`}>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-500/15 rounded-xl">
                            <DollarSign size={20} className="text-emerald-500" />
                        </div>
                        <div>
                            <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Registrar Pago</h2>
                            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{factura.numero_factura}</p>
                        </div>
                    </div>
                    <button type="button" onClick={onClose} className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className={`grid grid-cols-3 gap-2 p-3 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-slate-50'} border ${border}`}>
                        <div className="text-center">
                            <p className={`text-[10px] uppercase font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Total</p>
                            <p className={`text-sm font-extrabold tabular-nums ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>{GTQ(factura.total_general)}</p>
                        </div>
                        <div className="text-center">
                            <p className={`text-[10px] uppercase font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Pagado</p>
                            <p className="text-sm font-extrabold tabular-nums text-emerald-500">{GTQ(factura.total_pagado)}</p>
                        </div>
                        <div className="text-center">
                            <p className={`text-[10px] uppercase font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Saldo</p>
                            <p className="text-sm font-extrabold tabular-nums text-amber-500">{GTQ(saldo)}</p>
                        </div>
                    </div>

                    {error && (
                        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                            <AlertCircle size={16} className="mt-0.5 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelCls}>Monto (Q) *</label>
                            <input
                                type="number" step="0.01" min="0.01" max={saldo}
                                className={inputCls}
                                value={monto}
                                onChange={e => setMonto(e.target.value)}
                                required
                            />
                        </div>
                        <div>
                            <label className={labelCls}>Fecha de Pago *</label>
                            <input type="date" className={inputCls} value={fechaPago} onChange={e => setFechaPago(e.target.value)} required />
                        </div>
                    </div>

                    <div>
                        <label className={labelCls}>Método *</label>
                        <select className={inputCls} value={metodo} onChange={e => setMetodo(e.target.value)}>
                            {METODOS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className={labelCls}>Referencia</label>
                        <input
                            className={inputCls}
                            value={referencia}
                            onChange={e => setReferencia(e.target.value)}
                            placeholder="No. de transferencia / cheque / depósito"
                        />
                    </div>

                    <div>
                        <label className={labelCls}>Nota</label>
                        <textarea className={`${inputCls} resize-y`} rows={2} value={nota} onChange={e => setNota(e.target.value)} placeholder="(opcional)" />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose}
                            className={`flex-1 py-2.5 rounded-xl border font-semibold text-sm transition-colors ${isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-300 text-slate-700 hover:bg-slate-50'}`}>
                            Cancelar
                        </button>
                        <button type="submit" disabled={loading}
                            className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-emerald-500/25">
                            {loading && <Loader2 size={16} className="animate-spin" />}
                            Registrar Pago
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
