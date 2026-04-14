import React, { useState, useEffect, useContext } from 'react';
import { X, Calendar, Clock, Wrench, Fuel, CheckSquare, ClipboardList, Loader2, AlertCircle, Truck } from 'lucide-react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const NIVELES_GASOLINA = [
    { value: 'VACIO', label: 'Reserva / Vacío', width: '5%', color: 'bg-red-500' },
    { value: 'CUARTO', label: '1/4 de Tanque', width: '25%', color: 'bg-orange-500' },
    { value: 'MEDIO', label: '1/2 Tanque', width: '50%', color: 'bg-yellow-400' },
    { value: 'TRESCUARTOS', label: '3/4 de Tanque', width: '75%', color: 'bg-emerald-400' },
    { value: 'LLENO', label: 'Tanque Lleno', width: '100%', color: 'bg-emerald-500' },
];

export default function NuevaRecepcionSlideOver({ isOpen, onClose, vehiculo, citaId, onRecepcionCreada }) {
    const { authTokens } = useContext(AuthContext);
    const { isDark } = useTheme();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [form, setForm] = useState({
        kilometraje: '',
        nivel_gasolina: 'MEDIO',
        motivo_ingreso: '',
        diagnostico_inicial: '',
        danos_previos: '',
        tiene_llanta_repuesto: false,
        tiene_gata_herramientas: false,
        tiene_radio: true,
        tiene_documentos: false,
        otros_objetos: '',
        firma_cliente_text: '',
    });

    useEffect(() => {
        if (isOpen) {
            setForm({
                kilometraje: '',
                nivel_gasolina: 'MEDIO',
                motivo_ingreso: '',
                diagnostico_inicial: '',
                danos_previos: '',
                tiene_llanta_repuesto: false,
                tiene_gata_herramientas: false,
                tiene_radio: true,
                tiene_documentos: false,
                otros_objetos: '',
                firma_cliente_text: '',
            });
            setError('');
        }
    }, [isOpen]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const payload = {
                ...form,
                vehiculo: vehiculo.id,
                cita: citaId || null,
            };
            const res = await axios.post('http://localhost:8000/api/v1/recepciones/', payload, {
                headers: { Authorization: `Bearer ${authTokens.access}` }
            });
            onRecepcionCreada && onRecepcionCreada(res.data);
            onClose();
        } catch (err) {
            const data = err.response?.data;
            if (typeof data === 'object') {
                setError(Object.values(data).flat().join(' | '));
            } else {
                setError('Ocurrió un error al registrar la recepción.');
            }
        }
        setLoading(false);
    };

    const bg = isDark ? 'bg-slate-900' : 'bg-white';
    const overlay = isDark ? 'bg-slate-800/50' : 'bg-black/30';
    const sectionBg = isDark ? 'bg-slate-800' : 'bg-slate-50';
    const border = isDark ? 'border-slate-700' : 'border-slate-200';
    const textPrimary = isDark ? 'text-white' : 'text-slate-900';
    const subText = isDark ? 'text-slate-400' : 'text-slate-500';
    const inputCls = `w-full px-3 py-2 rounded-lg border text-sm font-medium transition-all outline-none focus:ring-2 focus:ring-blue-500/40 ${
        isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-500' : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'
    }`;
    const labelCls = `block text-xs font-bold uppercase tracking-wider mb-1.5 ${subText}`;

    const nivelActual = NIVELES_GASOLINA.find(n => n.value === form.nivel_gasolina);

    return (
        <>
            {/* Overlay */}
            <div
                className={`fixed inset-0 z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'} ${overlay}`}
                onClick={onClose}
            />

            {/* Panel */}
            <div className={`fixed right-0 top-0 h-full z-50 flex flex-col w-full max-w-2xl shadow-2xl transition-transform duration-300 ease-out ${isOpen ? 'translate-x-0' : 'translate-x-full'} ${bg} border-l ${border}`}>

                {/* Header */}
                <div className={`flex items-center justify-between px-6 py-5 border-b ${border} ${isDark ? 'bg-slate-800' : 'bg-slate-50'} shrink-0`}>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-500/20 rounded-xl">
                            <Truck size={22} className="text-orange-500" />
                        </div>
                        <div>
                            <h2 className={`text-lg font-bold ${textPrimary}`}>Recepción de Vehículo</h2>
                            {vehiculo && (
                                <p className={`text-sm ${subText}`}>
                                    {vehiculo.marca} {vehiculo.modelo} — <span className="font-mono font-bold">{vehiculo.placa}</span>
                                </p>
                            )}
                        </div>
                    </div>
                    <button onClick={onClose} className={`p-2 rounded-lg hover:bg-slate-700/30 transition-colors ${subText}`}>
                        <X size={22} />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
                    <div className="p-6 space-y-6">
                        {error && (
                            <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                                {error}
                            </div>
                        )}

                        {/* ── 1. Datos de Ingreso ── */}
                        <section>
                            <h3 className={`text-sm font-bold uppercase tracking-widest flex items-center gap-2 mb-4 ${subText}`}>
                                <Wrench size={14} /> Datos de Ingreso
                            </h3>
                            <div className={`rounded-xl border ${border} ${sectionBg} p-4 space-y-4`}>
                                <div>
                                    <label className={labelCls}>Kilometraje Actual</label>
                                    <input
                                        type="number"
                                        className={inputCls}
                                        placeholder="Ej: 45200"
                                        value={form.kilometraje}
                                        onChange={e => setForm(f => ({ ...f, kilometraje: e.target.value }))}
                                        required
                                        min="0"
                                    />
                                </div>

                                {/* Nivel de Gasolina Visual */}
                                <div>
                                    <label className={labelCls}>Nivel de Gasolina</label>
                                    <div className="space-y-3">
                                        <div className={`h-6 rounded-full overflow-hidden ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}>
                                            <div
                                                className={`h-full rounded-full transition-all duration-500 ${nivelActual?.color}`}
                                                style={{ width: nivelActual?.width }}
                                            />
                                        </div>
                                        <div className="grid grid-cols-5 gap-1">
                                            {NIVELES_GASOLINA.map(n => (
                                                <button
                                                    key={n.value}
                                                    type="button"
                                                    onClick={() => setForm(f => ({ ...f, nivel_gasolina: n.value }))}
                                                    className={`py-2 px-1 rounded-lg text-[10px] font-bold transition-all border ${
                                                        form.nivel_gasolina === n.value
                                                            ? `${n.color} text-white border-transparent scale-105`
                                                            : `${isDark ? 'border-slate-600 text-slate-400 hover:border-slate-500' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`
                                                    }`}
                                                >
                                                    {n.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* ── 2. Motivo y Diagnóstico ── */}
                        <section>
                            <h3 className={`text-sm font-bold uppercase tracking-widest flex items-center gap-2 mb-4 ${subText}`}>
                                <ClipboardList size={14} /> Motivo y Diagnóstico
                            </h3>
                            <div className={`rounded-xl border ${border} ${sectionBg} p-4 space-y-4`}>
                                <div>
                                    <label className={labelCls}>Motivo del Ingreso *</label>
                                    <textarea
                                        className={`${inputCls} resize-none`}
                                        rows={3}
                                        placeholder="¿Qué reporta el cliente? Ej: Golpe en trompa delantera, revisión de frenos..."
                                        value={form.motivo_ingreso}
                                        onChange={e => setForm(f => ({ ...f, motivo_ingreso: e.target.value }))}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className={labelCls}>Diagnóstico Inicial (opcional)</label>
                                    <textarea
                                        className={`${inputCls} resize-none`}
                                        rows={2}
                                        placeholder="Observación del mecánico/recepcionista al recibir el auto..."
                                        value={form.diagnostico_inicial}
                                        onChange={e => setForm(f => ({ ...f, diagnostico_inicial: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <label className={labelCls}>Daños Previos / Golpes Visibles</label>
                                    <textarea
                                        className={`${inputCls} resize-none`}
                                        rows={2}
                                        placeholder="Rayones en puerta trasera derecha, abolladura en capó..."
                                        value={form.danos_previos}
                                        onChange={e => setForm(f => ({ ...f, danos_previos: e.target.value }))}
                                    />
                                </div>
                            </div>
                        </section>

                        {/* ── 3. Inventario ── */}
                        <section>
                            <h3 className={`text-sm font-bold uppercase tracking-widest flex items-center gap-2 mb-4 ${subText}`}>
                                <CheckSquare size={14} /> Inventario a Bordo
                            </h3>
                            <div className={`rounded-xl border ${border} ${sectionBg} p-4 space-y-3`}>
                                {[
                                    { key: 'tiene_llanta_repuesto', label: 'Llanta de Repuesto', emoji: '🔧' },
                                    { key: 'tiene_gata_herramientas', label: 'Gata / Herramientas', emoji: '🛠️' },
                                    { key: 'tiene_radio', label: 'Radio / Sistema de Audio', emoji: '📻' },
                                    { key: 'tiene_documentos', label: 'Documentos (Tarjeta, Revisión)', emoji: '📄' },
                                ].map(item => (
                                    <label key={item.key} className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                                        form[item.key]
                                            ? isDark ? 'bg-emerald-900/30 border border-emerald-700' : 'bg-emerald-50 border border-emerald-200'
                                            : isDark ? 'bg-slate-700/50 border border-slate-700' : 'bg-white border border-slate-200'
                                    }`}>
                                        <div className="flex items-center gap-3">
                                            <span className="text-lg">{item.emoji}</span>
                                            <span className={`text-sm font-semibold ${textPrimary}`}>{item.label}</span>
                                        </div>
                                        <div className="relative">
                                            <input
                                                type="checkbox"
                                                className="sr-only"
                                                checked={form[item.key]}
                                                onChange={e => setForm(f => ({ ...f, [item.key]: e.target.checked }))}
                                            />
                                            <div className={`w-11 h-6 rounded-full transition-colors ${form[item.key] ? 'bg-emerald-500' : isDark ? 'bg-slate-600' : 'bg-slate-300'}`}>
                                                <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${form[item.key] ? 'translate-x-5' : ''}`} />
                                            </div>
                                        </div>
                                    </label>
                                ))}
                                <div>
                                    <label className={labelCls}>Otros Objetos</label>
                                    <input
                                        className={inputCls}
                                        placeholder="Ej: Lentes de sol, cargador de teléfono..."
                                        value={form.otros_objetos}
                                        onChange={e => setForm(f => ({ ...f, otros_objetos: e.target.value }))}
                                    />
                                </div>
                            </div>
                        </section>

                        {/* ── 4. Firma ── */}
                        <section>
                            <h3 className={`text-sm font-bold uppercase tracking-widest flex items-center gap-2 mb-4 ${subText}`}>
                                <CheckSquare size={14} /> Conformidad del Cliente
                            </h3>
                            <div className={`rounded-xl border ${border} ${sectionBg} p-4`}>
                                <label className={labelCls}>Nombre Completo del Cliente (como firma de conformidad)</label>
                                <input
                                    className={inputCls}
                                    placeholder="Firma / Nombre del cliente que entrega"
                                    value={form.firma_cliente_text}
                                    onChange={e => setForm(f => ({ ...f, firma_cliente_text: e.target.value }))}
                                />
                                <p className={`text-xs mt-2 ${subText}`}>Al escribir su nombre, el cliente acepta que el vehículo ingresa en las condiciones descritas arriba.</p>
                            </div>
                        </section>
                    </div>
                </form>

                {/* Footer */}
                <div className={`shrink-0 px-6 py-4 border-t ${border} ${isDark ? 'bg-slate-800/50' : 'bg-slate-50'} flex gap-3`}>
                    <button type="button" onClick={onClose}
                        className={`flex-1 py-3 rounded-xl border font-semibold text-sm transition-colors ${isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-300 text-slate-600 hover:bg-slate-100'}`}>
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="flex-1 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60 shadow-lg shadow-orange-500/30"
                    >
                        {loading ? <Loader2 size={18} className="animate-spin" /> : <Truck size={18} />}
                        {loading ? 'Registrando...' : 'Registrar Ingreso'}
                    </button>
                </div>
            </div>
        </>
    );
}
