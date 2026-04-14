import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import Select from 'react-select';
import { AuthContext } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
    Truck, Loader2, AlertCircle, CheckCircle2, ArrowLeft,
    Wrench, Package, FileText, ChevronDown, Car
} from 'lucide-react';

const NIVELES_GASOLINA = [
    { value: 'VACIO',       label: 'Reserva / Vacío',  pct: 5 },
    { value: 'CUARTO',      label: '1/4 de Tanque',    pct: 25 },
    { value: 'MEDIO',       label: '1/2 Tanque',       pct: 50 },
    { value: 'TRESCUARTOS', label: '3/4 de Tanque',    pct: 75 },
    { value: 'LLENO',       label: 'Tanque Lleno',     pct: 100 },
];

const fuelColor = (pct) => {
    if (pct <= 10) return 'bg-red-500';
    if (pct <= 30) return 'bg-orange-500';
    if (pct <= 55) return 'bg-yellow-400';
    return 'bg-emerald-500';
};

export default function NuevaRecepcionPage() {
    const { authTokens } = useContext(AuthContext);
    const { isDark } = useTheme();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const preVehiculoId = searchParams.get('vehiculo') || '';
    const preCitaId     = searchParams.get('cita') || '';

    // Estado del formulario
    const [vehiculoSeleccionado, setVehiculoSeleccionado] = useState(null);
    const [vehiculoOpciones, setVehiculoOpciones] = useState([]);
    const [loadingVehiculos, setLoadingVehiculos] = useState(false);

    const [loading, setLoading] = useState(false);
    const [recepcionId, setRecepcionId] = useState(null); // para redirigir a boleta
    const [error, setError] = useState('');

    const [form, setForm] = useState({
        cita: preCitaId,
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

    const headers = { Authorization: `Bearer ${authTokens?.access}` };

    // Carga inicial de vehículos (y preselección si viene en URL)
    useEffect(() => {
        buscarVehiculos('');
    }, []);

    const buscarVehiculos = async (q = '') => {
        setLoadingVehiculos(true);
        try {
            const res = await axios.get(`http://localhost:8000/api/v1/vehiculos/?q=${encodeURIComponent(q)}`, { headers });
            const opciones = res.data.map(v => ({
                value: v.id,
                label: `${v.placa} — ${v.marca} ${v.modelo} (${v.propietario?.full_name || v.propietario?.username})`,
                vehiculo: v,
            }));
            setVehiculoOpciones(opciones);

            // Preseleccionar si viene por query
            if (preVehiculoId && !vehiculoSeleccionado) {
                const pre = opciones.find(o => String(o.value) === String(preVehiculoId));
                if (pre) setVehiculoSeleccionado(pre);
            }
        } catch (e) {
            console.error('Error cargando vehículos:', e);
        }
        setLoadingVehiculos(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!vehiculoSeleccionado) { setError('Debes seleccionar un vehículo.'); return; }
        if (!form.kilometraje)     { setError('El kilometraje es obligatorio.'); return; }
        if (!form.motivo_ingreso.trim()) { setError('El motivo de ingreso es obligatorio.'); return; }

        setLoading(true);
        setError('');
        try {
            const payload = {
                ...form,
                vehiculo: vehiculoSeleccionado.value,
                cita: form.cita ? Number(form.cita) : null,
                kilometraje: Number(form.kilometraje),
            };
            const res = await axios.post('http://localhost:8000/api/v1/recepciones/', payload, { headers });
            setRecepcionId(res.data.id);
            // Pequeño delay para mostrar checkmark antes de navegar a la boleta
            setTimeout(() => navigate(`/citas/recepcion/${res.data.id}/boleta`), 1200);
        } catch (err) {
            console.error(err);
            const data = err.response?.data;
            if (!data) setError(`Error de conexión (${err.message})`);
            else if (typeof data === 'object') setError(Object.entries(data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' | '));
            else setError(String(data));
        }
        setLoading(false);
    };

    // ── Estilos ──
    const pageBg    = isDark ? 'bg-slate-900'  : 'bg-slate-50';
    const cardBg    = isDark ? 'bg-slate-800'  : 'bg-white';
    const border    = isDark ? 'border-slate-700' : 'border-slate-200';
    const textPri   = isDark ? 'text-white'    : 'text-slate-900';
    const subText   = isDark ? 'text-slate-400' : 'text-slate-500';
    const inputCls  = `w-full px-4 py-2.5 rounded-xl border text-sm font-medium transition-all outline-none focus:ring-2 focus:ring-blue-500/30 ${
        isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-500' : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'
    }`;
    const labelCls      = `block text-xs font-bold uppercase tracking-wider mb-2 ${subText}`;
    const sectionTitle  = `text-sm font-bold uppercase tracking-widest flex items-center gap-2 mb-5 pb-3 border-b ${border}`;

    const selectStyles = {
        control: (b, s) => ({
            ...b,
            backgroundColor: isDark ? '#334155' : '#fff',
            borderColor: s.isFocused ? '#3b82f6' : isDark ? '#475569' : '#e2e8f0',
            boxShadow: s.isFocused ? '0 0 0 2px rgba(59,130,246,0.25)' : 'none',
            borderRadius: '0.75rem',
            minHeight: '42px',
            fontSize: '0.875rem',
            '&:hover': { borderColor: '#3b82f6' },
        }),
        menu: b => ({ ...b, backgroundColor: isDark ? '#1e293b' : 'white', zIndex: 9999, borderRadius: '0.75rem' }),
        option: (b, s) => ({
            ...b,
            backgroundColor: s.isSelected ? '#3b82f6' : s.isFocused ? (isDark ? '#334155' : '#f1f5f9') : 'transparent',
            color: s.isSelected ? 'white' : isDark ? '#e2e8f0' : '#0f172a',
            fontSize: '0.8rem',
            padding: '8px 12px',
        }),
        singleValue: b => ({ ...b, color: isDark ? '#f1f5f9' : '#0f172a' }),
        input: b => ({ ...b, color: isDark ? '#f1f5f9' : '#0f172a' }),
        placeholder: b => ({ ...b, color: isDark ? '#64748b' : '#94a3b8' }),
        menuPortal: b => ({ ...b, zIndex: 9999 }),
    };

    const nivelActual = NIVELES_GASOLINA.find(n => n.value === form.nivel_gasolina) || NIVELES_GASOLINA[2];

    // ── Si ya se guardó, mostrar éxito ──
    if (recepcionId) {
        return (
            <div className={`flex-1 flex flex-col items-center justify-center ${pageBg} min-h-full`}>
                <CheckCircle2 size={72} className="text-emerald-500 mb-4 animate-bounce" />
                <h2 className={`text-2xl font-bold ${textPri}`}>¡Ingreso Registrado!</h2>
                <p className={`mt-2 ${subText}`}>Abriendo boleta de recepción...</p>
            </div>
        );
    }

    return (
        <div className={`flex-1 w-full ${pageBg} min-h-full`}>
            <div className="max-w-4xl mx-auto p-6">

                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <button onClick={() => navigate(-1)}
                        className={`p-2.5 rounded-xl border transition-colors ${isDark ? 'border-slate-700 hover:bg-slate-700 text-slate-300' : 'border-slate-200 hover:bg-slate-100 text-slate-600'}`}>
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className={`text-2xl font-bold flex items-center gap-3 ${textPri}`}>
                            <div className="p-2 bg-orange-500/15 rounded-xl">
                                <Truck size={22} className="text-orange-500" />
                            </div>
                            Nueva Recepción de Vehículo
                        </h1>
                        <p className={`text-sm mt-1 ml-14 ${subText}`}>Check-in oficial — al guardar se genera la boleta imprimible</p>
                    </div>
                </div>

                {error && (
                    <div className="flex items-start gap-3 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 mb-6">
                        <AlertCircle size={20} className="shrink-0 mt-0.5" />
                        <div>
                            <p className="font-bold text-sm">Error al guardar</p>
                            <p className="text-sm mt-0.5">{error}</p>
                        </div>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">

                    {/* ── Sección 1: Datos del Ingreso ── */}
                    <div className={`${cardBg} rounded-2xl border ${border} p-6`}>
                        <h2 className={`${sectionTitle} ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                            <Truck size={16} /> 1. Datos del Ingreso
                        </h2>

                        {/* Selector de Vehículo con búsqueda */}
                        <div className="mb-5">
                            <label className={labelCls}>Vehículo que ingresa *</label>
                            <Select
                                options={vehiculoOpciones}
                                value={vehiculoSeleccionado}
                                onChange={opt => setVehiculoSeleccionado(opt || null)}
                                onInputChange={(val) => buscarVehiculos(val)}
                                placeholder="Buscar por placa, marca, modelo o propietario..."
                                isClearable
                                isLoading={loadingVehiculos}
                                noOptionsMessage={() => 'Sin resultados — escribe para buscar'}
                                filterOption={() => true}
                                styles={selectStyles}
                                menuPortalTarget={document.body}
                                loadingMessage={() => 'Buscando...'}
                            />
                            {vehiculoSeleccionado && (
                                <div className={`mt-2 flex items-center gap-3 px-3 py-2 rounded-xl border ${border} ${isDark ? 'bg-slate-700/40' : 'bg-slate-50'}`}>
                                    <Car size={16} className="text-blue-400 shrink-0" />
                                    <div className="text-xs">
                                        <span className={`font-bold ${textPri}`}>{vehiculoSeleccionado.vehiculo?.marca} {vehiculoSeleccionado.vehiculo?.modelo} {vehiculoSeleccionado.vehiculo?.año}</span>
                                        <span className={`ml-2 font-mono px-1.5 py-0.5 rounded ${isDark ? 'bg-slate-900 text-slate-300' : 'bg-slate-200 text-slate-700'}`}>{vehiculoSeleccionado.vehiculo?.placa}</span>
                                        <span className={`ml-2 ${subText}`}>· {vehiculoSeleccionado.vehiculo?.propietario?.full_name || vehiculoSeleccionado.vehiculo?.propietario?.username}</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {/* Kilometraje */}
                            <div>
                                <label className={labelCls}>Kilometraje / Millaje Actual *</label>
                                <input
                                    type="number"
                                    className={inputCls}
                                    placeholder="Ej: 125000"
                                    value={form.kilometraje}
                                    onChange={e => setForm(f => ({ ...f, kilometraje: e.target.value }))}
                                    min="0"
                                    required
                                />
                            </div>

                            {/* Nivel de Gasolina */}
                            <div>
                                <label className={labelCls}>Nivel de Gasolina</label>
                                <div className="relative">
                                    <select
                                        value={form.nivel_gasolina}
                                        onChange={e => setForm(f => ({ ...f, nivel_gasolina: e.target.value }))}
                                        className={`${inputCls} appearance-none pr-10`}
                                    >
                                        {NIVELES_GASOLINA.map(n => (
                                            <option key={n.value} value={n.value}>{n.label}</option>
                                        ))}
                                    </select>
                                    <ChevronDown size={16} className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none ${subText}`} />
                                </div>
                                {/* Barra visual del tanque */}
                                <div className="mt-2 flex items-center gap-2">
                                    <span className="text-xs">🔴</span>
                                    <div className={`flex-1 h-3 rounded-full overflow-hidden ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}>
                                        <div
                                            className={`h-full rounded-full transition-all duration-500 ${fuelColor(nivelActual.pct)}`}
                                            style={{ width: `${nivelActual.pct}%` }}
                                        />
                                    </div>
                                    <span className="text-xs">💚</span>
                                </div>
                                <p className={`text-center text-xs mt-1 font-semibold ${subText}`}>{nivelActual.label}</p>
                            </div>
                        </div>
                    </div>

                    {/* ── Sección 2: Inventario a Bordo ── */}
                    <div className={`${cardBg} rounded-2xl border ${border} p-6`}>
                        <h2 className={`${sectionTitle} ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                            <Package size={16} /> 2. Inventario a Bordo
                        </h2>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                            {[
                                { key: 'tiene_llanta_repuesto',   label: 'Llanta de\nRepuesto',     emoji: '🔧' },
                                { key: 'tiene_gata_herramientas', label: 'Tricket /\nHerramienta',  emoji: '🛠️' },
                                { key: 'tiene_radio',              label: 'Stéreo /\nPantalla',      emoji: '📻' },
                                { key: 'tiene_documentos',         label: 'Documentos\nClave',       emoji: '📄' },
                            ].map(item => (
                                <label key={item.key} className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border cursor-pointer transition-all select-none text-center ${
                                    form[item.key]
                                        ? isDark ? 'border-emerald-600 bg-emerald-900/30 text-emerald-300' : 'border-emerald-300 bg-emerald-50 text-emerald-700'
                                        : isDark ? 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600' : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300'
                                }`}>
                                    <input type="checkbox" className="sr-only"
                                        checked={form[item.key]}
                                        onChange={e => setForm(f => ({ ...f, [item.key]: e.target.checked }))} />
                                    <div className={`w-11 h-5 rounded-full relative transition-colors ${form[item.key] ? 'bg-emerald-500' : isDark ? 'bg-slate-600' : 'bg-slate-300'}`}>
                                        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${form[item.key] ? 'left-6' : 'left-0.5'}`} />
                                    </div>
                                    <span className="text-2xl">{item.emoji}</span>
                                    <span className="text-xs font-bold leading-tight whitespace-pre-line">{item.label}</span>
                                </label>
                            ))}
                        </div>

                        <div>
                            <label className={labelCls}>Otros objetos de valor dejados por el cliente</label>
                            <input className={inputCls}
                                placeholder="Ej: Lentes de sol, cargador de celular, mochila..."
                                value={form.otros_objetos}
                                onChange={e => setForm(f => ({ ...f, otros_objetos: e.target.value }))} />
                        </div>
                    </div>

                    {/* ── Sección 3: Diagnóstico ── */}
                    <div className={`${cardBg} rounded-2xl border ${border} p-6`}>
                        <h2 className={`${sectionTitle} ${isDark ? 'text-orange-400' : 'text-orange-600'}`}>
                            <Wrench size={16} /> 3. Diagnóstico y Observaciones Visuales
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <label className={labelCls}>🔧 Falla Reportada por el Cliente *</label>
                                <textarea className={`${inputCls} resize-none`} rows={4}
                                    placeholder="Ej: Ruido en el motor al acelerar, frenos chirrían..."
                                    value={form.motivo_ingreso}
                                    onChange={e => setForm(f => ({ ...f, motivo_ingreso: e.target.value }))}
                                    required />
                            </div>
                            <div>
                                <label className={labelCls}>🔍 Observación Inicial (Mecánico/Recepción)</label>
                                <textarea className={`${inputCls} resize-none`} rows={4}
                                    placeholder="Ej: Fuga de aceite visible cerca del carter..."
                                    value={form.diagnostico_inicial}
                                    onChange={e => setForm(f => ({ ...f, diagnostico_inicial: e.target.value }))} />
                            </div>
                        </div>

                        <div className="mt-5">
                            <label className={`${labelCls} flex items-center gap-2`}>
                                <AlertCircle size={13} className="text-amber-500" />
                                Daños Previos / Golpes Visibles
                            </label>
                            <textarea className={`${inputCls} resize-none`} rows={3}
                                placeholder="Ej: Rayón en puerta trasera derecha, abolladura en capó..."
                                value={form.danos_previos}
                                onChange={e => setForm(f => ({ ...f, danos_previos: e.target.value }))} />
                        </div>
                    </div>

                    {/* ── Sección 4: Conformidad ── */}
                    <div className={`${cardBg} rounded-2xl border ${border} p-6`}>
                        <h2 className={`${sectionTitle} ${isDark ? 'text-purple-400' : 'text-purple-600'}`}>
                            <FileText size={16} /> 4. Conformidad del Cliente
                        </h2>
                        <div>
                            <label className={labelCls}>Nombre completo del cliente (como firma de conformidad)</label>
                            <input className={inputCls}
                                placeholder="Ej: Juan Carlos Pérez López"
                                value={form.firma_cliente_text}
                                onChange={e => setForm(f => ({ ...f, firma_cliente_text: e.target.value }))} />
                            <p className={`text-xs mt-2 ${subText}`}>
                                Al registrar este ingreso, el cliente acepta que el vehículo entra en las condiciones descritas arriba.
                            </p>
                        </div>
                    </div>

                    {/* Botones */}
                    <div className="flex flex-col sm:flex-row gap-3 pb-6">
                        <button type="button" onClick={() => navigate(-1)}
                            className={`flex-1 py-3 px-6 rounded-2xl border font-semibold text-sm transition-colors ${isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-800' : 'border-slate-300 text-slate-700 hover:bg-slate-100'}`}>
                            Cancelar
                        </button>
                        <button type="submit" disabled={loading}
                            className="flex-1 py-3 px-6 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2.5 disabled:opacity-50 shadow-xl shadow-orange-500/25">
                            {loading ? <Loader2 size={19} className="animate-spin" /> : <Truck size={19} />}
                            {loading ? 'Registrando ingreso...' : 'Registrar Ingreso y Ver Boleta'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
