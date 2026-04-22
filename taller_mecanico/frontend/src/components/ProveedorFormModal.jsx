import React, { useState, useEffect, useContext } from 'react';
import { X, Truck, Loader2, Save, User, Phone, MapPin, Mail, Hash } from 'lucide-react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function ProveedorFormModal({ isOpen, onClose, proveedor, onSaved }) {
    const { authTokens } = useContext(AuthContext);
    const { isDark } = useTheme();
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        nombre: '',
        contacto: '',
        telefono: '',
        email: '',
        direccion: '',
        nit: '',
        activo: true
    });

    useEffect(() => {
        if (isOpen) {
            if (proveedor) {
                setFormData({
                    ...proveedor,
                    contacto: proveedor.contacto || '',
                    telefono: proveedor.telefono || '',
                    email: proveedor.email || '',
                    direccion: proveedor.direccion || '',
                    nit: proveedor.nit || '',
                });
            } else {
                setFormData({
                    nombre: '',
                    contacto: '',
                    telefono: '',
                    email: '',
                    direccion: '',
                    nit: '',
                    activo: true
                });
            }
        }
    }, [isOpen, proveedor]);

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

        try {
            if (proveedor?.id) {
                await axios.put(`http://localhost:8000/api/v1/inventario/proveedores/${proveedor.id}/`, formData, {
                    headers: { Authorization: `Bearer ${authTokens?.access}` }
                });
            } else {
                await axios.post('http://localhost:8000/api/v1/inventario/proveedores/', formData, {
                    headers: { Authorization: `Bearer ${authTokens?.access}` }
                });
            }
            onSaved();
            onClose();
        } catch (err) {
            console.error(err);
            alert("Error al guardar el proveedor.");
        }
        setLoading(false);
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className={`w-full max-w-xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] ${bg}`}>
                
                <div className="px-6 py-5 border-b flex justify-between items-center shrink-0"
                     style={{ borderColor: isDark ? '#1e293b' : '#e2e8f0' }}>
                    <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl ${isDark ? 'bg-teal-500/15' : 'bg-teal-100'}`}>
                            <Truck size={20} className="text-teal-500" />
                        </div>
                        <div>
                            <h2 className={`text-lg font-black ${text}`}>
                                {proveedor ? 'Editar Proveedor' : 'Nuevo Proveedor'}
                            </h2>
                            <p className={`text-xs ${sub}`}>Directorio de suplidores</p>
                        </div>
                    </div>
                    <button onClick={onClose} className={`p-2 rounded-full transition-colors ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>
                        <X size={20} />
                    </button>
                </div>

                <form id="proveedorForm" onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className={labelCls}>Nombre o Razón Social *</label>
                            <input required name="nombre" value={formData.nombre} onChange={handleChange} type="text" className={inputCls} placeholder="Ej. Repuestos El Automotor S.A." />
                        </div>
                        
                        <div>
                            <label className={labelCls}>NIT / RUC</label>
                            <div className="relative">
                                <Hash size={15} className={`absolute left-3 top-1/2 -translate-y-1/2 ${sub}`} />
                                <input name="nit" value={formData.nit} onChange={handleChange} type="text" className={`${inputCls} pl-9`} placeholder="Ej. 1234567-8" />
                            </div>
                        </div>

                        <div>
                            <label className={labelCls}>Nombre del Contacto</label>
                            <div className="relative">
                                <User size={15} className={`absolute left-3 top-1/2 -translate-y-1/2 ${sub}`} />
                                <input name="contacto" value={formData.contacto} onChange={handleChange} type="text" className={`${inputCls} pl-9`} placeholder="Ej. Roberto Martínez" />
                            </div>
                        </div>
                        
                        <div>
                            <label className={labelCls}>Teléfono</label>
                            <div className="relative">
                                <Phone size={15} className={`absolute left-3 top-1/2 -translate-y-1/2 ${sub}`} />
                                <input name="telefono" value={formData.telefono} onChange={handleChange} type="text" className={`${inputCls} pl-9`} placeholder="Ej. +502 1234 5678" />
                            </div>
                        </div>

                        <div>
                            <label className={labelCls}>Correo Electrónico</label>
                            <div className="relative">
                                <Mail size={15} className={`absolute left-3 top-1/2 -translate-y-1/2 ${sub}`} />
                                <input name="email" value={formData.email} onChange={handleChange} type="email" className={`${inputCls} pl-9`} placeholder="correo@empresa.com" />
                            </div>
                        </div>

                        <div className="col-span-2">
                            <label className={labelCls}>Dirección Física</label>
                            <div className="relative">
                                <MapPin size={15} className={`absolute left-3 top-1/2 -translate-y-1/2 ${sub}`} />
                                <input name="direccion" value={formData.direccion} onChange={handleChange} type="text" className={`${inputCls} pl-9`} placeholder="Dirección completa..." />
                            </div>
                        </div>
                    </div>

                    <label className={`flex items-center gap-2 cursor-pointer mt-2`}>
                        <input type="checkbox" name="activo" checked={formData.activo} onChange={handleChange} className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500" />
                        <span className={`text-sm font-semibold ${text}`}>Proveedor Activo</span>
                    </label>
                </form>

                <div className="px-6 py-4 border-t flex justify-end gap-3 shrink-0"
                     style={{ borderColor: isDark ? '#1e293b' : '#e2e8f0' }}>
                    <button type="button" onClick={onClose} disabled={loading}
                        className={`px-4 py-2 text-sm font-semibold rounded-xl border transition-colors ${
                            isDark ? 'border-slate-700 text-slate-300 hover:bg-slate-800' 
                                   : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}>Cancelar</button>
                    <button type="submit" form="proveedorForm" disabled={loading || !formData.nombre.trim()}
                        className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-teal-500/20 transition-all flex items-center gap-2 disabled:opacity-50">
                        {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} 
                        Guardar Proveedor
                    </button>
                </div>
            </div>
        </div>
    );
}
