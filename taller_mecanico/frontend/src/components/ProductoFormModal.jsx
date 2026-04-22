import React, { useState, useEffect, useContext } from 'react';
import { X, Package, Tag, Loader2, Save, DollarSign, LayoutList, Truck } from 'lucide-react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function ProductoFormModal({ isOpen, onClose, producto, onSaved }) {
    const { authTokens } = useContext(AuthContext);
    const { isDark } = useTheme();

    const [loading, setLoading] = useState(false);
    const [fetchingDeps, setFetchingDeps] = useState(false);
    const [categorias, setCategorias] = useState([]);
    const [proveedores, setProveedores] = useState([]);

    const [formData, setFormData] = useState({
        codigo: '',
        nombre: '',
        descripcion: '',
        tipo: 'REPUESTO',
        categoria: '',
        proveedor_principal: '',
        precio_compra: 0,
        precio_venta: 0,
        stock_minimo: 5,
        stock_actual: 0,
        unidad_medida: 'Unidad',
        activo: true
    });

    useEffect(() => {
        if (isOpen) {
            fetchDependencies();
            if (producto) {
                setFormData({
                    ...producto,
                    categoria: producto.categoria || '',
                    proveedor_principal: producto.proveedor_principal || ''
                });
            } else {
                setFormData({
                    codigo: '',
                    nombre: '',
                    descripcion: '',
                    tipo: 'REPUESTO',
                    categoria: '',
                    proveedor_principal: '',
                    precio_compra: 0,
                    precio_venta: 0,
                    stock_minimo: 5,
                    stock_actual: 0,
                    unidad_medida: 'Unidad',
                    activo: true
                });
            }
        }
    }, [isOpen, producto]);

    const fetchDependencies = async () => {
        setFetchingDeps(true);
        try {
            const [catRes, provRes] = await Promise.all([
                axios.get('http://localhost:8000/api/v1/inventario/categorias/', {
                    headers: { Authorization: `Bearer ${authTokens?.access}` }
                }),
                axios.get('http://localhost:8000/api/v1/inventario/proveedores-mini/', {
                    headers: { Authorization: `Bearer ${authTokens?.access}` }
                })
            ]);
            setCategorias(catRes.data);
            setProveedores(provRes.data);
        } catch (e) {
            console.error('Error fetching dependencies', e);
        }
        setFetchingDeps(false);
    };

    if (!isOpen) return null;

    const bg = isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200';
    const text = isDark ? 'text-white' : 'text-slate-900';
    const sub = isDark ? 'text-slate-400' : 'text-slate-500';
    const inputCls = `w-full rounded-xl border text-sm px-3 py-2.5 outline-none transition-colors ${isDark ? 'bg-slate-800 border-slate-700 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-500'}`;

    const labelCls = `block text-xs font-bold mb-1.5 ml-1 ${isDark ? 'text-slate-300' : 'text-slate-600'}`;

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        const payload = { ...formData };
        if (!payload.categoria) payload.categoria = null;
        if (!payload.proveedor_principal) payload.proveedor_principal = null;

        try {
            if (producto?.id) {
                await axios.put(`http://localhost:8000/api/v1/inventario/productos/${producto.id}/`, payload, {
                    headers: { Authorization: `Bearer ${authTokens?.access}` }
                });
            } else {
                await axios.post('http://localhost:8000/api/v1/inventario/productos/', payload, {
                    headers: { Authorization: `Bearer ${authTokens?.access}` }
                });
            }
            onSaved();
            onClose();
        } catch (err) {
            console.error(err);
            alert("Error al guardar el producto. Verifica los datos ingresados.");
        }
        setLoading(false);
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className={`w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] ${bg}`}>
                
                {/* Header */}
                <div className="px-6 py-5 border-b flex justify-between items-center shrink-0"
                     style={{ borderColor: isDark ? '#1e293b' : '#e2e8f0' }}>
                    <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl ${isDark ? 'bg-blue-500/15' : 'bg-blue-100'}`}>
                            <Package size={20} className="text-blue-500" />
                        </div>
                        <div>
                            <h2 className={`text-lg font-black ${text}`}>
                                {producto ? 'Editar Producto' : 'Nuevo Producto'}
                            </h2>
                            <p className={`text-xs ${sub}`}>Detalles del catálogo e inventario</p>
                        </div>
                    </div>
                    <button onClick={onClose} className={`p-2 rounded-full transition-colors ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>
                        <X size={20} />
                    </button>
                </div>

                {/* Form Body */}
                <form id="productoForm" onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5">
                    {fetchingDeps ? (
                        <div className="flex justify-center p-10"><Loader2 className="animate-spin text-blue-500" /></div>
                    ) : (
                        <>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={labelCls}>Código / Referencia *</label>
                                    <div className="relative">
                                        <Tag size={15} className={`absolute left-3 top-1/2 -translate-y-1/2 ${sub}`} />
                                        <input
                                            required
                                            name="codigo"
                                            value={formData.codigo}
                                            onChange={handleChange}
                                            type="text"
                                            className={`${inputCls} pl-9 uppercase`}
                                            placeholder="Ej. FIL-001"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className={labelCls}>Nombre del Producto *</label>
                                    <input
                                        required
                                        name="nombre"
                                        value={formData.nombre}
                                        onChange={handleChange}
                                        type="text"
                                        className={inputCls}
                                        placeholder="Ej. Filtro de Aceite sintético"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={labelCls}>Categoría</label>
                                    <div className="relative">
                                        <LayoutList size={15} className={`absolute left-3 top-1/2 -translate-y-1/2 ${sub}`} />
                                        <select
                                            name="categoria"
                                            value={formData.categoria || ''}
                                            onChange={handleChange}
                                            className={`${inputCls} pl-9 appearance-none cursor-pointer`}
                                        >
                                            <option value="">-- Sin categoría --</option>
                                            {categorias.map(c => (
                                                <option key={c.id} value={c.id}>{c.nombre}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className={labelCls}>Tipo de Artículo *</label>
                                    <select
                                        required
                                        name="tipo"
                                        value={formData.tipo}
                                        onChange={handleChange}
                                        className={`${inputCls} appearance-none cursor-pointer`}
                                    >
                                        <option value="REPUESTO">Repuesto</option>
                                        <option value="HERRAMIENTA">Herramienta</option>
                                        <option value="CONSUMIBLE">Consumible</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className={labelCls}>Descripción (Opcional)</label>
                                <textarea
                                    name="descripcion"
                                    value={formData.descripcion || ''}
                                    onChange={handleChange}
                                    rows="2"
                                    className={`${inputCls} min-h-[80px] resize-y`}
                                />
                            </div>

                            {/* Precios */}
                            <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-800/50 border-slate-700/50' : 'bg-slate-50 border-slate-100'} grid grid-cols-2 gap-4`}>
                                <div>
                                    <label className={labelCls}>Precio de Costo (Q) *</label>
                                    <div className="relative">
                                        <DollarSign size={15} className={`absolute left-3 top-1/2 -translate-y-1/2 ${sub}`} />
                                        <input
                                            required
                                            name="precio_compra"
                                            value={formData.precio_compra}
                                            onChange={handleChange}
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            className={`${inputCls} pl-9`}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className={labelCls}>Precio de Venta (Q) *</label>
                                    <div className="relative">
                                        <DollarSign size={15} className={`absolute left-3 top-1/2 -translate-y-1/2 ${sub}`} />
                                        <input
                                            required
                                            name="precio_venta"
                                            value={formData.precio_venta}
                                            onChange={handleChange}
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            className={`${inputCls} pl-9 font-bold text-emerald-500`}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Controles de inventario */}
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className={labelCls}>Stock Inicial *</label>
                                    <input
                                        required
                                        name="stock_actual"
                                        value={formData.stock_actual}
                                        onChange={handleChange}
                                        type="number"
                                        min="0"
                                        className={inputCls}
                                        disabled={!!producto} // Normalmente no se edita directamente después de crearlo
                                        title={producto ? "Usa 'Ajuste de Inventario' para modificar el stock" : ""}
                                    />
                                </div>
                                <div>
                                    <label className={labelCls}>Stock Mínimo (Alerta) *</label>
                                    <input
                                        required
                                        name="stock_minimo"
                                        value={formData.stock_minimo}
                                        onChange={handleChange}
                                        type="number"
                                        min="0"
                                        className={inputCls}
                                    />
                                </div>
                                <div>
                                    <label className={labelCls}>Unidad Medida</label>
                                    <input
                                        name="unidad_medida"
                                        value={formData.unidad_medida}
                                        onChange={handleChange}
                                        type="text"
                                        className={inputCls}
                                        placeholder="Unidad, Galón, Kg"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className={labelCls}>Proveedor Principal (Aviso de Reposición)</label>
                                <div className="relative">
                                    <Truck size={15} className={`absolute left-3 top-1/2 -translate-y-1/2 ${sub}`} />
                                    <select
                                        name="proveedor_principal"
                                        value={formData.proveedor_principal || ''}
                                        onChange={handleChange}
                                        className={`${inputCls} pl-9 appearance-none cursor-pointer`}
                                    >
                                        <option value="">-- Sin proveedor --</option>
                                        {proveedores.map(p => (
                                            <option key={p.id} value={p.id}>{p.nombre}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <label className={`flex items-center gap-2 cursor-pointer mt-2`}>
                                <input
                                    type="checkbox"
                                    name="activo"
                                    checked={formData.activo}
                                    onChange={handleChange}
                                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className={`text-sm font-semibold ${text}`}>Producto Activo (Visible)</span>
                            </label>
                        </>
                    )}
                </form>

                {/* Footer */}
                <div className="px-6 py-4 border-t flex justify-end gap-3 shrink-0"
                     style={{ borderColor: isDark ? '#1e293b' : '#e2e8f0' }}>
                    <button
                        type="button"
                        onClick={onClose}
                        className={`px-4 py-2 text-sm font-semibold rounded-xl border transition-colors ${
                            isDark ? 'border-slate-700 text-slate-300 hover:bg-slate-800' 
                                   : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                        disabled={loading}
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        form="productoForm"
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
                        disabled={loading || fetchingDeps}
                    >
                        {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        Guardar Producto
                    </button>
                </div>
            </div>
        </div>
    );
}
