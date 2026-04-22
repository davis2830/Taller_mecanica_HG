import React, { useState, useEffect, useContext } from 'react';
import { X, ShoppingCart, Loader2, Save, Search, Plus, Trash2, Package } from 'lucide-react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const GTQ = (v) => v != null ? new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' }).format(v) : 'Q0.00';

export default function OrdenCompraFormModal({ isOpen, onClose, onSaved }) {
    const { authTokens } = useContext(AuthContext);
    const { isDark } = useTheme();

    const [loading, setLoading] = useState(false);
    const [fetchingDeps, setFetchingDeps] = useState(false);
    
    const [proveedores, setProveedores] = useState([]);
    
    // Auto-complete custom logic para productos
    const [searchQ, setSearchQ] = useState('');
    const [productosBuscados, setProductosBuscados] = useState([]);
    const [fetchingProds, setFetchingProds] = useState(false);

    const [formData, setFormData] = useState({
        proveedor: '',
        fecha_esperada: '',
        observaciones: ''
    });

    const [detalles, setDetalles] = useState([]);

    useEffect(() => {
        if (isOpen) {
            fetchDependencies();
            setFormData({
                proveedor: '',
                fecha_esperada: '',
                observaciones: ''
            });
            setDetalles([]);
            setSearchQ('');
            setProductosBuscados([]);
        }
    }, [isOpen]);

    const fetchDependencies = async () => {
        setFetchingDeps(true);
        try {
            const res = await axios.get('http://localhost:8000/api/v1/inventario/proveedores-mini/', {
                headers: { Authorization: `Bearer ${authTokens?.access}` }
            });
            setProveedores(res.data);
        } catch (e) {
            console.error('Error fetching Proveedores', e);
        }
        setFetchingDeps(false);
    };

    useEffect(() => {
        if (searchQ && isOpen) {
            const delay = setTimeout(async () => {
                setFetchingProds(true);
                try {
                    const res = await axios.get(`http://localhost:8000/api/v1/inventario/productos/?search=${searchQ}`, {
                        headers: { Authorization: `Bearer ${authTokens?.access}` }
                    });
                    setProductosBuscados(res.data.results || res.data);
                } catch (e) {
                    console.error(e);
                }
                setFetchingProds(false);
            }, 300);
            return () => clearTimeout(delay);
        } else {
            setProductosBuscados([]);
        }
    }, [searchQ, isOpen, authTokens]);

    if (!isOpen) return null;

    const bg = isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200';
    const text = isDark ? 'text-white' : 'text-slate-900';
    const sub = isDark ? 'text-slate-400' : 'text-slate-500';
    const inputCls = `w-full rounded-xl border text-sm px-3 py-2.5 outline-none transition-colors ${isDark ? 'bg-slate-800 border-slate-700 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-500'}`;
    const labelCls = `block text-xs font-bold mb-1.5 ml-1 ${isDark ? 'text-slate-300' : 'text-slate-600'}`;

    const handleSelectProd = (p) => {
        // Evitar duplicados
        if (detalles.find(d => d.producto === p.id)) {
            setSearchQ('');
            setProductosBuscados([]);
            return;
        }

        setDetalles([
            ...detalles, 
            { 
                producto: p.id, 
                nombre: p.nombre, 
                codigo: p.codigo,
                cantidad_solicitada: 1, 
                precio_unitario: p.precio_compra 
            }
        ]);
        setSearchQ('');
        setProductosBuscados([]);
    };

    const updateDetalle = (index, field, val) => {
        const newD = [...detalles];
        newD[index][field] = val;
        setDetalles(newD);
    };

    const removeDetalle = (index) => {
        const newD = [...detalles];
        newD.splice(index, 1);
        setDetalles(newD);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (detalles.length === 0) return alert("Debes agregar al menos un producto a la orden.");
        
        setLoading(true);
        const payload = {
            ...formData,
            fecha_esperada: formData.fecha_esperada || null,
            detalles: detalles.map(d => ({
                producto: d.producto,
                cantidad_solicitada: parseInt(d.cantidad_solicitada, 10),
                precio_unitario: parseFloat(d.precio_unitario)
            }))
        };

        try {
            await axios.post('http://localhost:8000/api/v1/inventario/ordenes-compra/', payload, {
                headers: { Authorization: `Bearer ${authTokens?.access}` }
            });
            onSaved();
            onClose();
        } catch (err) {
            console.error(err);
            alert("Error al registrar la Orden de Compra.");
        }
        setLoading(false);
    };

    const granTotal = detalles.reduce((acc, d) => acc + (d.cantidad_solicitada * d.precio_unitario), 0);

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className={`w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] ${bg}`}>
                
                <div className="px-6 py-5 border-b flex justify-between items-center shrink-0"
                     style={{ borderColor: isDark ? '#1e293b' : '#e2e8f0' }}>
                    <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl ${isDark ? 'bg-orange-500/15' : 'bg-orange-100'}`}>
                            <ShoppingCart size={20} className="text-orange-500" />
                        </div>
                        <div>
                            <h2 className={`text-lg font-black ${text}`}>Crear Orden de Compra</h2>
                            <p className={`text-xs ${sub}`}>Solicitud de mercancía a proveedor</p>
                        </div>
                    </div>
                    <button onClick={onClose} className={`p-2 rounded-full transition-colors ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-3">
                    {/* General Info */}
                    <div className={`p-6 border-r overflow-y-auto space-y-5 ${isDark ? 'border-slate-800 bg-slate-900/50' : 'border-slate-200 bg-slate-50/50'}`}>
                        {fetchingDeps ? <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-orange-500"/></div> : (
                            <>
                                <div>
                                    <label className={labelCls}>Proveedor *</label>
                                    <select required name="proveedor" value={formData.proveedor} onChange={(e) => setFormData({...formData, proveedor: e.target.value})} className={inputCls}>
                                        <option value="">-- Seleccionar --</option>
                                        {proveedores.map(p => (
                                            <option key={p.id} value={p.id}>{p.nombre}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className={labelCls}>Fecha Esperada (Opcional)</label>
                                    <input type="date" name="fecha_esperada" value={formData.fecha_esperada} onChange={(e) => setFormData({...formData, fecha_esperada: e.target.value})} className={inputCls} />
                                </div>
                                <div>
                                    <label className={labelCls}>Observaciones (Opcional)</label>
                                    <textarea name="observaciones" value={formData.observaciones} onChange={(e) => setFormData({...formData, observaciones: e.target.value})} rows="4" className={`${inputCls} resize-none`} placeholder="Indicaciones para el proveedor..." />
                                </div>
                                
                                <div className={`p-4 rounded-xl mt-6 border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                                    <p className={`text-xs font-bold uppercase mb-1 ${sub}`}>Total Estimado</p>
                                    <p className={`text-3xl font-black ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>{GTQ(granTotal)}</p>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Detalles */}
                    <div className="col-span-2 p-6 flex flex-col h-full overflow-hidden">
                        
                        <div className="relative shrink-0 mb-4 z-20">
                            <label className={labelCls}>Buscar Producto</label>
                            <div className="relative">
                                <Search size={15} className={`absolute left-3 top-1/2 -translate-y-1/2 ${sub}`} />
                                <input
                                    type="text"
                                    className={`${inputCls} pl-9`}
                                    placeholder="Escribe para buscar y añadir a la orden..."
                                    value={searchQ}
                                    onChange={(e) => setSearchQ(e.target.value)}
                                />
                                {fetchingProds && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-orange-500" />}
                            </div>
                            
                            {productosBuscados.length > 0 && (
                                <div className={`absolute w-full mt-1 rounded-xl shadow-lg border overflow-hidden max-h-48 overflow-y-auto ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                                    {productosBuscados.map(p => (
                                        <div key={p.id} onClick={() => handleSelectProd(p)}
                                             className={`px-4 py-2.5 cursor-pointer flex justify-between items-center transition-colors ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-50'}`}>
                                            <div>
                                                <p className={`text-sm font-bold ${text}`}>{p.nombre}</p>
                                                <p className={`text-[10px] ${sub}`}>{p.codigo}</p>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className={`text-xs ${sub}`}>Stock: {p.stock_actual}</span>
                                                <Plus size={16} className={isDark ? 'text-orange-400' : 'text-orange-500'} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Listado de Detalles Agregados */}
                        <div className={`flex-1 overflow-auto rounded-xl border ${isDark ? 'border-slate-800 bg-slate-900/40' : 'border-slate-200 bg-slate-50/50'}`}>
                            {detalles.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full gap-3 opacity-50">
                                    <Package size={40} className={sub} />
                                    <p className={`text-sm font-medium ${sub}`}>Busca y agrega productos a la orden</p>
                                </div>
                            ) : (
                                <table className="w-full text-sm">
                                    <thead className={`sticky top-0 ${isDark ? 'bg-slate-800' : 'bg-slate-100'} border-b ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                                        <tr>
                                            <th className={`px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider ${sub}`}>Producto</th>
                                            <th className={`px-4 py-3 text-center text-[11px] font-bold uppercase tracking-wider ${sub}`}>Cantidad</th>
                                            <th className={`px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider ${sub}`}>Costo Unit. (Q)</th>
                                            <th className={`px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider ${sub}`}>Subtotal</th>
                                            <th className="px-4 py-3"></th>
                                        </tr>
                                    </thead>
                                    <tbody className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-slate-200'}`}>
                                        {detalles.map((d, index) => (
                                            <tr key={index} className={isDark ? 'bg-slate-900/50' : 'bg-white'}>
                                                <td className="px-4 py-3">
                                                    <p className={`font-bold ${text}`}>{d.nombre}</p>
                                                    <p className={`text-[10px] font-mono ${sub}`}>{d.codigo}</p>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <input 
                                                        type="number" min="1" required
                                                        value={d.cantidad_solicitada} 
                                                        onChange={(e)=>updateDetalle(index, 'cantidad_solicitada', e.target.value)}
                                                        className={`w-16 text-center py-1 rounded border ${isDark ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-slate-300'}`}
                                                    />
                                                </td>
                                                <td className="px-4 py-3">
                                                    <input 
                                                        type="number" min="0" step="0.01" required
                                                        value={d.precio_unitario} 
                                                        onChange={(e)=>updateDetalle(index, 'precio_unitario', e.target.value)}
                                                        className={`w-24 pl-2 py-1 rounded border ${isDark ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-slate-300'}`}
                                                    />
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <span className={`font-semibold ${text}`}>
                                                        {GTQ(d.cantidad_solicitada * d.precio_unitario)}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <button type="button" onClick={()=>removeDetalle(index)} className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>

                <div className="px-6 py-4 border-t flex justify-end gap-3 shrink-0 bg-black/5"
                     style={{ borderColor: isDark ? '#1e293b' : '#e2e8f0' }}>
                    <button type="button" onClick={onClose} disabled={loading}
                        className={`px-4 py-2 text-sm font-semibold rounded-xl border transition-colors ${
                            isDark ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}>Cancelar</button>
                    <button type="button" onClick={handleSubmit} disabled={loading || detalles.length===0 || !formData.proveedor}
                        className="px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-orange-500/20 transition-all flex items-center gap-2 disabled:opacity-50">
                        {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} 
                        Enviar Orden Proveedor
                    </button>
                </div>
            </div>
        </div>
    );
}
