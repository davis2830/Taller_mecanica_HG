import React, { useState, useEffect, useContext } from 'react';
import { X, HandCoins, Loader2, Save, AlignLeft } from 'lucide-react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const GTQ = (v) => v != null ? new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' }).format(v) : 'Q0.00';

export default function PagoProveedorFormModal({ isOpen, onClose, cuenta, onSaved }) {
    const { authTokens } = useContext(AuthContext);
    const { isDark } = useTheme();
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        monto: '',
        metodo_pago: 'EFECTIVO',
        referencia: ''
    });

    useEffect(() => {
        if (isOpen && cuenta) {
            setFormData({
                monto: cuenta.saldo_pendiente, // Sugerir pago total por defecto
                metodo_pago: 'EFECTIVO',
                referencia: ''
            });
        }
    }, [isOpen, cuenta]);

    if (!isOpen || !cuenta) return null;

    const bg = isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200';
    const text = isDark ? 'text-white' : 'text-slate-900';
    const sub = isDark ? 'text-slate-400' : 'text-slate-500';
    const inputCls = `w-full rounded-xl border text-sm px-3 py-2.5 outline-none transition-colors ${isDark ? 'bg-slate-800 border-slate-700 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-500'}`;
    const labelCls = `block text-xs font-bold mb-1.5 ml-1 ${isDark ? 'text-slate-300' : 'text-slate-600'}`;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        const abonar = parseFloat(formData.monto);
        if (abonar > parseFloat(cuenta.saldo_pendiente)) {
            return alert(`El monto ingresado ${GTQ(abonar)} excede el saldo pendiente ${GTQ(cuenta.saldo_pendiente)}`);
        }

        setLoading(true);

        try {
            await axios.post(`http://localhost:8000/api/v1/inventario/cuentas-pagar/${cuenta.id}/registrar_pago/`, formData, {
                headers: { Authorization: `Bearer ${authTokens?.access}` }
            });
            onSaved();
            onClose();
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.error || "Error al registrar el pago.");
        }
        setLoading(false);
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className={`w-full max-w-md rounded-2xl shadow-2xl flex flex-col max-h-[90vh] ${bg}`}>
                
                <div className="px-6 py-5 border-b flex justify-between items-center shrink-0"
                     style={{ borderColor: isDark ? '#1e293b' : '#e2e8f0' }}>
                    <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl ${isDark ? 'bg-rose-500/15' : 'bg-rose-100'}`}>
                            <HandCoins size={20} className="text-rose-500" />
                        </div>
                        <div>
                            <h2 className={`text-lg font-black ${text}`}>Abonar a Deuda</h2>
                            <p className={`text-xs ${sub}`}>Cuenta: {cuenta.orden_compra_codigo} - {cuenta.proveedor_nombre}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className={`p-2 rounded-full transition-colors ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>
                        <X size={20} />
                    </button>
                </div>

                <form id="pagoProvForm" onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5">
                    
                    <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-rose-50 border-rose-100'}`}>
                        <div className="flex justify-between items-center">
                            <span className={`text-xs font-bold uppercase ${sub}`}>Saldo Pendiente</span>
                            <span className={`text-2xl font-black ${isDark ? 'text-rose-400' : 'text-rose-600'}`}>{GTQ(cuenta.saldo_pendiente)}</span>
                        </div>
                    </div>

                    <div>
                        <label className={labelCls}>Monto a Abonar (Q) *</label>
                        <input
                            required
                            name="monto"
                            value={formData.monto}
                            onChange={handleChange}
                            type="number"
                            step="0.01"
                            min="0.01"
                            max={cuenta.saldo_pendiente}
                            className={`${inputCls} font-bold text-lg`}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelCls}>Método de Pago *</label>
                            <select
                                required
                                name="metodo_pago"
                                value={formData.metodo_pago}
                                onChange={handleChange}
                                className={inputCls}
                            >
                                <option value="EFECTIVO">Efectivo</option>
                                <option value="TRANSFERENCIA">Transferencia</option>
                                <option value="CHEQUE">Cheque</option>
                                <option value="TARJETA">Tarjeta</option>
                                <option value="OTRO">Otro</option>
                            </select>
                        </div>
                        <div>
                            <label className={labelCls}>Referencia (Opcional)</label>
                            <div className="relative">
                                <AlignLeft size={15} className={`absolute left-3 top-1/2 -translate-y-1/2 ${sub}`} />
                                <input
                                    name="referencia"
                                    value={formData.referencia}
                                    onChange={handleChange}
                                    type="text"
                                    className={`${inputCls} pl-9`}
                                    placeholder="Nro Cheque/Ticket..."
                                />
                            </div>
                        </div>
                    </div>
                </form>

                <div className="px-6 py-4 border-t flex justify-end gap-3 shrink-0"
                     style={{ borderColor: isDark ? '#1e293b' : '#e2e8f0' }}>
                    <button type="button" onClick={onClose} disabled={loading}
                        className={`px-4 py-2 text-sm font-semibold rounded-xl border transition-colors ${
                            isDark ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}>Cancelar</button>
                    <button type="submit" form="pagoProvForm" disabled={loading}
                        className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-rose-500/20 transition-all flex items-center gap-2">
                        {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} 
                        Registrar Abono
                    </button>
                </div>
            </div>
        </div>
    );
}
