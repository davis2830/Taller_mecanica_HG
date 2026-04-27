import React, { useState, useEffect, useContext } from 'react';
import { X, ArrowRightLeft, Loader2, Save, Search, Package } from 'lucide-react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function MovimientoFormModal({ isOpen, onClose, onSaved }) {
    const { authTokens } = useContext(AuthContext);
    const { isDark } = useTheme();

    const [loading, setLoading] = useState(false);
    const [fetchingProds, setFetchingProds] = useState(false);
    
    // Auto-complete custom logic
    const [searchQ, setSearchQ] = useState('');
    const [productos, setProductos] = useState([]);
    const [selectedProd, setSelectedProd] = useState(null);

    const [formData, setFormData] = useState({
        tipo: 'ENTRADA',
        motivo: 'COMPRA',
        cantidad: '',
        precio_unitario: '',
        observaciones: ''
    });

    useEffect(() => {
        if (!isOpen) {
            setSearchQ('');
            setProductos([]);
            setSelectedProd(null);
            setFormData({
                tipo: 'ENTRADA',
                motivo: 'COMPRA',
                cantidad: '',
                precio_unitario: '',
                observaciones: ''
            });
        }
    }, [isOpen]);

    useEffect(() => {
        if (searchQ && !selectedProd && isOpen) {
            const delay = setTimeout(async () => {
                setFetchingProds(true);
                try {
                    const res = await axios.get(`/api/v1/inventario/productos/?search=${searchQ}`, {
                        headers: { Authorization: `Bearer ${authTokens?.access}` }
                    });
                    setProductos(res.data);
                } catch (e) {
                    console.error(e);
                }
                setFetchingProds(false);
            }, 300);
            return () => clearTimeout(delay);
        } else {
            if (!selectedProd) setProductos([]);
        }
    }, [searchQ, selectedProd, isOpen, authTokens]);

    if (!isOpen) return null;

    const bg = isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200';
    const text = isDark ? 'text-white' : 'text-slate-900';
    const sub = isDark ? 'text-slate-400' : 'text-slate-500';
    const inputCls = `w-full rounded-xl border text-sm px-3 py-2.5 outline-none transition-colors ${isDark ? 'bg-slate-800 border-slate-700 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-500'}`;
    const labelCls = `block text-xs font-bold mb-1.5 ml-1 ${isDark ? 'text-slate-300' : 'text-slate-600'}`;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSelectProd = (p) => {
        setSelectedProd(p);
        setSearchQ(p.nombre);
        setProductos([]);
        // Si el precio unitario está vacío, se sugiere el precio del producto según el tipo
        if (!formData.precio_unitario) {
            setFormData(prev => ({
                ...prev,
                precio_unitario: prev.tipo === 'ENTRADA' ? p.precio_compra : p.precio_venta
            }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedProd) return alert("Debes seleccionar un producto válido.");
        
        setLoading(true);
        const payload = {
            ...formData,
            producto: selectedProd.id,
            cantidad: parseInt(formData.cantidad, 10),
            precio_unitario: parseFloat(formData.precio_unitario || selectedProd.precio_compra)
        };

        try {
            await axios.post('/api/v1/inventario/movimientos/', payload, {
                headers: { Authorization: `Bearer ${authTokens?.access}` }
            });
            onSaved();
            onClose();
        } catch (err) {
            console.error(err);
            alert("Error al registrar movimiento.");
        }
        setLoading(false);
    };

    // Ajustar motivos según tipo de movimiento
    let motivos = [];
    if (formData.tipo === 'ENTRADA') motivos = ['COMPRA', 'DEVOLUCION', 'AJUSTE_INVENTARIO', 'OTROS'];
    else if (formData.tipo === 'SALIDA') motivos = ['PERDIDA', 'DAÑADO', 'SERVICIO', 'AJUSTE_INVENTARIO', 'OTROS'];
    else motivos = ['AJUSTE_INVENTARIO', 'OTROS'];

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className={`w-full max-w-md rounded-2xl shadow-2xl flex flex-col max-h-[90vh] ${bg}`}>
                
                <div className="px-6 py-5 border-b flex justify-between items-center shrink-0"
                     style={{ borderColor: isDark ? '#1e293b' : '#e2e8f0' }}>
                    <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl ${isDark ? 'bg-indigo-500/15' : 'bg-indigo-100'}`}>
                            <ArrowRightLeft size={20} className="text-indigo-500" />
                        </div>
                        <div>
                            <h2 className={`text-lg font-black ${text}`}>Registrar Movimiento</h2>
                            <p className={`text-xs ${sub}`}>Entradas, Salidas o Ajustes de inventario</p>
                        </div>
                    </div>
                    <button onClick={onClose} className={`p-2 rounded-full transition-colors ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>
                        <X size={20} />
                    </button>
                </div>

                <form id="movimientoForm" onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5">
                    
                    {/* Búsqueda inteligente de producto */}
                    <div className="relative">
                        <label className={labelCls}>Producto *</label>
                        <div className="relative">
                            <Search size={15} className={`absolute left-3 top-1/2 -translate-y-1/2 ${sub}`} />
                            <input
                                required
                                type="text"
                                className={`${inputCls} pl-9`}
                                placeholder="Escribe el nombre o SKU para buscar..."
                                value={searchQ}
                                onChange={(e) => {
                                    setSearchQ(e.target.value);
                                    if (selectedProd && e.target.value !== selectedProd.nombre) {
                                        setSelectedProd(null);
                                    }
                                }}
                            />
                            {fetchingProds && (
                                <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-blue-500" />
                            )}
                        </div>
                        
                        {/* Dropdown de resultados */}
                        {productos.length > 0 && !selectedProd && (
                            <div className={`absolute z-10 w-full mt-1 rounded-xl shadow-lg border overflow-hidden max-h-48 overflow-y-auto ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                                {productos.map(p => (
                                    <div key={p.id} onClick={() => handleSelectProd(p)}
                                         className={`px-4 py-2.5 cursor-pointer flex justify-between items-center transition-colors ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-50'}`}>
                                        <div>
                                            <p className={`text-sm font-bold ${text}`}>{p.nombre}</p>
                                            <p className={`text-[10px] ${sub}`}>{p.codigo}</p>
                                        </div>
                                        <p className={`text-xs font-semibold ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>
                                            Stock: {p.stock_actual}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                        
                        {/* Chip producto seleccionado */}
                        {selectedProd && (
                            <div className={`mt-2 p-2 rounded-lg flex items-center justify-between border ${isDark ? 'bg-emerald-900/20 border-emerald-800 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`}>
                                <div className="flex items-center gap-2">
                                    <Package size={14} />
                                    <span className="text-xs font-bold">Stock actual: {selectedProd.stock_actual} {selectedProd.unidad_medida}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelCls}>Tipo de Operación *</label>
                            <select name="tipo" value={formData.tipo} onChange={handleChange} className={inputCls} required>
                                <option value="ENTRADA">Entrada (Suma)</option>
                                <option value="SALIDA">Salida (Resta)</option>
                                <option value="AJUSTE">Ajuste / Variación (+/-)</option>
                            </select>
                        </div>
                        <div>
                            <label className={labelCls}>Motivo *</label>
                            <select name="motivo" value={formData.motivo} onChange={handleChange} className={inputCls} required>
                                {motivos.map(m => (
                                    <option key={m} value={m}>{m.replace('_', ' ')}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelCls}>Cantidad *</label>
                            <input
                                required
                                name="cantidad"
                                type="number"
                                placeholder={formData.tipo === 'AJUSTE' ? 'Ej. -2 o 5' : 'Ej. 5'}
                                value={formData.cantidad}
                                onChange={handleChange}
                                className={inputCls}
                            />
                        </div>
                        <div>
                            <label className={labelCls}>Precio Unitario (Opcional)</label>
                            <input
                                name="precio_unitario"
                                type="number"
                                step="0.01"
                                placeholder={selectedProd?.precio_compra || '0.00'}
                                value={formData.precio_unitario}
                                onChange={handleChange}
                                className={inputCls}
                            />
                        </div>
                    </div>

                    <div>
                        <label className={labelCls}>Notas u Observaciones (Opcional)</label>
                        <textarea
                            name="observaciones"
                            value={formData.observaciones}
                            onChange={handleChange}
                            rows="2"
                            className={`${inputCls} resize-none`}
                        />
                    </div>
                </form>

                <div className="px-6 py-4 border-t flex justify-end gap-3 shrink-0"
                     style={{ borderColor: isDark ? '#1e293b' : '#e2e8f0' }}>
                    <button type="button" onClick={onClose} disabled={loading}
                        className={`px-4 py-2 text-sm font-semibold rounded-xl border transition-colors ${
                            isDark ? 'border-slate-700 text-slate-300 hover:bg-slate-800' 
                                   : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}>Cancelar</button>
                    <button type="submit" form="movimientoForm" disabled={loading || !selectedProd}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2 disabled:opacity-50">
                        {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} 
                        Registrar
                    </button>
                </div>
            </div>
        </div>
    );
}
