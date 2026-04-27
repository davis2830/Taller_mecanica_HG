import React, { useState, useEffect, useContext, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import Select from 'react-select';
import SignaturePad from 'react-signature-canvas';
import { AuthContext } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
    Truck, Loader2, AlertCircle, CheckCircle2, ArrowLeft,
    Wrench, Package, FileText, ChevronDown, Car, Camera, RefreshCw, PenTool
} from 'lucide-react';

const fuelColor = (pct) => {
    if (pct <= 10) return 'bg-red-500';
    if (pct <= 30) return 'bg-orange-500';
    if (pct <= 55) return 'bg-yellow-400';
    return 'bg-emerald-500';
};

const LUCES_TABLERO = ['Check Engine', 'ABS', 'Aceite', 'Batería', 'Bolsa de Aire'];
const FLUIDOS = ['Aceite Motor', 'Refrigerante', 'Liq. Frenos', 'Transmisión'];
const ESTADOS_FLUIDO = ['OK', 'Bajo', 'Sucio', 'Vaciando'];

export default function NuevaRecepcionPage() {
    const { authTokens } = useContext(AuthContext);
    const { isDark } = useTheme();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const signatureRef = useRef(null);
    const firmaMecanicoRef = useRef(null);
    const diagramRef = useRef(null);

    // Aceptamos `vehiculo` y `cita`/`cita_id` (los entrypoints del kanban y la
    // OT usan `cita_id`; conservamos `cita` por compatibilidad).
    const preVehiculoId = searchParams.get('vehiculo') || '';
    const preCitaId     = searchParams.get('cita_id') || searchParams.get('cita') || '';

    const [vehiculoSeleccionado, setVehiculoSeleccionado] = useState(null);
    const [vehiculoOpciones, setVehiculoOpciones] = useState([]);
    const [loadingVehiculos, setLoadingVehiculos] = useState(false);

    const [loading, setLoading] = useState(false);
    const [recepcionId, setRecepcionId] = useState(null);
    const [error, setError] = useState('');

    const [form, setForm] = useState({
        cita: preCitaId,
        kilometraje: '',
        unidad_distancia: 'km',
        gasolina_pct: 50,
        motivo_ingreso: '',
        diagnostico_inicial: '',
        danos_previos: '',
        tiene_llanta_repuesto: false,
        tiene_gata_herramientas: false,
        tiene_radio: true,
        tiene_documentos: false,
        otros_objetos: '',
        firma_cliente_text: '',
        estado_cristales: '',
        luces_tablero: {},
        estado_fluidos: {}
    });

    const [fotosArchivos, setFotosArchivos] = useState([]);
    const [fotosPreview, setFotosPreview] = useState([]);

    const headers = { Authorization: `Bearer ${authTokens?.access}` };

    useEffect(() => {
        // Si entramos desde una cita, traemos sus datos para precargar el
        // vehículo y el motivo de ingreso por defecto. Si no, simplemente
        // listamos vehículos para que el usuario escoja.
        if (preCitaId) {
            cargarDesdeCita(preCitaId);
        } else {
            buscarVehiculos('');
        }
    }, [preCitaId]);

    const cargarDesdeCita = async (citaId) => {
        setLoadingVehiculos(true);
        try {
            const [resCita, resVehs] = await Promise.all([
                axios.get(`/api/v1/citas/${citaId}/`, { headers }),
                axios.get(`/api/v1/vehiculos/?q=`, { headers }),
            ]);

            const opciones = resVehs.data.map(v => ({
                value: v.id,
                label: `${v.placa} — ${v.marca} ${v.modelo} (${v.propietario?.full_name || v.propietario?.username})`,
                vehiculo: v,
            }));
            setVehiculoOpciones(opciones);

            const cita = resCita.data;
            const vehId = cita?.vehiculo?.id;
            if (vehId) {
                const pre = opciones.find(o => String(o.value) === String(vehId));
                if (pre) {
                    setVehiculoSeleccionado(pre);
                } else {
                    // Si la lista no incluye el vehículo (filtros/paginación),
                    // construimos la opción a mano con los datos que vienen
                    // dentro de la cita.
                    const v = cita.vehiculo;
                    setVehiculoSeleccionado({
                        value: v.id,
                        label: `${v.placa} — ${v.marca} ${v.modelo}${v.propietario ? ` (${v.propietario.full_name || v.propietario.username})` : ''}`,
                        vehiculo: v,
                    });
                }
            }

            if (cita?.notas && !form.motivo_ingreso) {
                setForm(f => ({ ...f, motivo_ingreso: cita.notas }));
            }
        } catch (e) {
            console.error('Error cargando cita:', e);
            // Caemos al flujo normal si la cita no se pudo leer.
            buscarVehiculos('');
        }
        setLoadingVehiculos(false);
    };

    const buscarVehiculos = async (q = '') => {
        setLoadingVehiculos(true);
        try {
            const res = await axios.get(`/api/v1/vehiculos/?q=${encodeURIComponent(q)}`, { headers });
            const opciones = res.data.map(v => ({
                value: v.id,
                label: `${v.placa} — ${v.marca} ${v.modelo} (${v.propietario?.full_name || v.propietario?.username})`,
                vehiculo: v,
            }));
            setVehiculoOpciones(opciones);

            if (preVehiculoId && !vehiculoSeleccionado) {
                const pre = opciones.find(o => String(o.value) === String(preVehiculoId));
                if (pre) setVehiculoSeleccionado(pre);
            }
        } catch (e) {
            console.error('Error cargando vehículos:', e);
        }
        setLoadingVehiculos(false);
    };

    const handleFileChange = (e) => {
        if (e.target.files) {
            const filesArray = Array.from(e.target.files);
            setFotosArchivos([...fotosArchivos, ...filesArray]);
            
            const previews = filesArray.map(file => URL.createObjectURL(file));
            setFotosPreview([...fotosPreview, ...previews]);
        }
    };

    const toggleLuzTablero = (luz) => {
        setForm(f => ({
            ...f,
            luces_tablero: {
                ...f.luces_tablero,
                [luz]: !f.luces_tablero[luz]
            }
        }));
    };

    const selectEstadoFluido = (fluido, estado) => {
        setForm(f => ({
            ...f,
            estado_fluidos: {
                ...f.estado_fluidos,
                [fluido]: estado
            }
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!vehiculoSeleccionado) { setError('Debes seleccionar un vehículo.'); return; }
        if (!form.kilometraje)     { setError('El kilometraje es obligatorio.'); return; }
        if (!form.motivo_ingreso.trim()) { setError('El motivo de ingreso es obligatorio.'); return; }

        setLoading(true);
        setError('');
        
        try {
            const formData = new FormData();
            formData.append('vehiculo', vehiculoSeleccionado.value);
            if (form.cita) formData.append('cita', form.cita);
            formData.append('kilometraje', form.kilometraje);
            formData.append('gasolina_pct', form.gasolina_pct);
            formData.append('motivo_ingreso', form.motivo_ingreso);
            formData.append('diagnostico_inicial', form.diagnostico_inicial);
            formData.append('danos_previos', form.danos_previos);
            formData.append('tiene_llanta_repuesto', form.tiene_llanta_repuesto);
            formData.append('tiene_gata_herramientas', form.tiene_gata_herramientas);
            formData.append('tiene_radio', form.tiene_radio);
            formData.append('tiene_documentos', form.tiene_documentos);
            formData.append('otros_objetos', form.otros_objetos);
            formData.append('firma_cliente_text', form.firma_cliente_text);
            formData.append('estado_cristales', form.estado_cristales);
            
            formData.append('luces_tablero', JSON.stringify(form.luces_tablero));
            formData.append('estado_fluidos', JSON.stringify(form.estado_fluidos));

            if (signatureRef.current && !signatureRef.current.isEmpty()) {
                formData.append('firma_digital', signatureRef.current.toDataURL());
            }
            if (firmaMecanicoRef.current && !firmaMecanicoRef.current.isEmpty()) {
                formData.append('firma_mecanico', firmaMecanicoRef.current.toDataURL());
            }
            if (diagramRef.current && !diagramRef.current.isEmpty()) {
                formData.append('diagrama_danos', diagramRef.current.toDataURL());
            }

            fotosArchivos.forEach(file => {
                formData.append('fotos_upload', file); // Custom key to intercept in backend
            });

            const res = await axios.post('/api/v1/recepciones/', formData, {
                headers: {
                    ...headers,
                    'Content-Type': 'multipart/form-data'
                }
            });

            setRecepcionId(res.data.id);
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
        control: (b, s) => ({ ...b, backgroundColor: isDark ? '#334155' : '#fff', borderColor: s.isFocused ? '#3b82f6' : isDark ? '#475569' : '#e2e8f0', boxShadow: s.isFocused ? '0 0 0 2px rgba(59,130,246,0.25)' : 'none', borderRadius: '0.75rem', minHeight: '42px', fontSize: '0.875rem' }),
        menu: b => ({ ...b, backgroundColor: isDark ? '#1e293b' : 'white', zIndex: 9999, borderRadius: '0.75rem' }),
        option: (b, s) => ({ ...b, backgroundColor: s.isSelected ? '#3b82f6' : s.isFocused ? (isDark ? '#334155' : '#f1f5f9') : 'transparent', color: s.isSelected ? 'white' : isDark ? '#e2e8f0' : '#0f172a', fontSize: '0.8rem', padding: '8px 12px' }),
        singleValue: b => ({ ...b, color: isDark ? '#f1f5f9' : '#0f172a' }),
        input: b => ({ ...b, color: isDark ? '#f1f5f9' : '#0f172a' }),
    };

    if (recepcionId) {
        return (
            <div className={`flex-1 flex flex-col items-center justify-center ${pageBg} min-h-full`}>
                <CheckCircle2 size={72} className="text-emerald-500 mb-4 animate-bounce" />
                <h2 className={`text-2xl font-bold ${textPri}`}>¡Ingreso Registrado!</h2>
                <p className={`mt-2 ${subText}`}>Redirigiendo a la boleta...</p>
            </div>
        );
    }

    return (
        <div className={`flex-1 w-full ${pageBg} min-h-full`}>
            <div className="max-w-4xl mx-auto p-6">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <button onClick={() => navigate(-1)} className={`p-2.5 rounded-xl border transition-colors ${isDark ? 'border-slate-700 hover:bg-slate-700 text-slate-300' : 'border-slate-200 hover:bg-slate-100 text-slate-600'}`}>
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className={`text-2xl font-bold flex items-center gap-3 ${textPri}`}>
                            <div className="p-2 bg-orange-500/15 rounded-xl">
                                <Truck size={22} className="text-orange-500" />
                            </div>
                            Recepción de Vehículo Interactiva
                        </h1>
                        <p className={`text-sm mt-1 ml-14 ${subText}`}>Use la pantalla táctil para dibujar daños y capturar firma.</p>
                    </div>
                </div>

                {error && (
                    <div className="flex items-start gap-3 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 mb-6">
                        <AlertCircle size={20} className="shrink-0 mt-0.5" />
                        <div><p className="font-bold text-sm">Error al guardar</p><p className="text-sm mt-0.5">{error}</p></div>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">

                    {/* ── Sección 1: Datos del Ingreso ── */}
                    <div className={`${cardBg} rounded-2xl border ${border} p-6`}>
                        <h2 className={`${sectionTitle} ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                            <Truck size={16} /> 1. Datos del Vehículo
                        </h2>

                        <div className="mb-5">
                            <label className={labelCls}>Vehículo que ingresa *</label>
                            <Select 
                                options={vehiculoOpciones} 
                                value={vehiculoSeleccionado} 
                                onChange={opt => setVehiculoSeleccionado(opt || null)} 
                                onInputChange={(val, { action }) => { if (action === 'input-change') buscarVehiculos(val); }} 
                                placeholder="Buscar por placa, marca, modelo..." 
                                isClearable 
                                isLoading={loadingVehiculos} 
                                styles={selectStyles} 
                                menuPortalTarget={document.body} 
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <label className={labelCls}>Kilometraje / Millaje Actual *</label>
                                <div className="flex">
                                    <input type="number" className={`${inputCls} rounded-r-none w-2/3 border-r-0`} placeholder="Ej: 125000" value={form.kilometraje} onChange={e => setForm(f => ({ ...f, kilometraje: e.target.value }))} required />
                                    <select className={`${inputCls} rounded-l-none w-1/3 font-semibold`} value={form.unidad_distancia} onChange={e => setForm(f => ({...f, unidad_distancia: e.target.value}))}>
                                        <option value="km">km</option>
                                        <option value="mi">mi</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className={labelCls}>Nivel de Combustible ({form.gasolina_pct}%)</label>
                                <input 
                                    type="range" 
                                    min="0" max="100" 
                                    value={form.gasolina_pct} 
                                    onChange={e => setForm(f => ({...f, gasolina_pct: Number(e.target.value)}))}
                                    className="w-full h-2 rounded-lg appearance-none cursor-pointer my-3 bg-slate-300"
                                />
                                <div className={`h-3 rounded-full overflow-hidden ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}>
                                    <div className={`h-full rounded-full transition-all duration-300 ${fuelColor(form.gasolina_pct)}`} style={{ width: `${form.gasolina_pct}%` }} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── Sección 2: Estado Mecánico y Visual ── */}
                    <div className={`${cardBg} rounded-2xl border ${border} p-6`}>
                        <h2 className={`${sectionTitle} ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                            <Wrench size={16} /> 2. Tablero, Fluidos y Cristales
                        </h2>

                        <label className={labelCls}>Luces de Advertencia Encendidas en el Tablero</label>
                        <div className="flex flex-wrap gap-2 mb-6">
                            {LUCES_TABLERO.map(luz => (
                                <button type="button" key={luz} onClick={() => toggleLuzTablero(luz)}
                                    className={`px-4 py-2 rounded-xl text-sm font-bold border transition-colors flex gap-2 items-center ${
                                        form.luces_tablero[luz] 
                                            ? 'bg-red-500/10 border-red-500 text-red-500' 
                                            : isDark ? 'border-slate-700 text-slate-400 hover:border-slate-500' : 'border-slate-300 text-slate-500 hover:border-slate-400'
                                    }`}>
                                    <div className={`w-3 h-3 rounded-full ${form.luces_tablero[luz] ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]' : isDark ? 'bg-slate-700' : 'bg-slate-300'}`} />
                                    {luz}
                                </button>
                            ))}
                        </div>

                        <label className={labelCls}>Estado de Fluidos</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                            {FLUIDOS.map(fluido => (
                                <div key={fluido} className={`p-3 rounded-xl border ${border} ${isDark ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                                    <p className="text-xs font-bold mb-2">{fluido}</p>
                                    <div className="flex gap-1">
                                        {ESTADOS_FLUIDO.map(estado => (
                                            <button type="button" key={estado} onClick={() => selectEstadoFluido(fluido, estado)}
                                                className={`flex-1 text-[10px] py-1.5 px-1 font-bold rounded-lg border transition-all ${
                                                    form.estado_fluidos[fluido] === estado 
                                                        ? 'bg-blue-500 text-white border-blue-500 scale-105' 
                                                        : isDark ? 'border-slate-700 text-slate-400' : 'border-slate-200 text-slate-500'
                                                }`}>
                                                {estado}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div>
                            <label className={labelCls}>Estado de Cristales y Parabrisas</label>
                            <input className={inputCls} placeholder="Ej: Parabrisas estrellado lado conductor..." value={form.estado_cristales} onChange={e => setForm(f => ({ ...f, estado_cristales: e.target.value }))} />
                        </div>
                    </div>

                    {/* ── Sección 3: Diagrama de Daños & Fotos ── */}
                    <div className={`${cardBg} rounded-2xl border ${border} p-6`}>
                        <h2 className={`${sectionTitle} ${isDark ? 'text-red-400' : 'text-red-600'}`}>
                            <PenTool size={16} /> 3. Diagrama de Daños y Fotografías
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            {/* Fotos */}
                            <div>
                                <label className={labelCls}>Fotografías del Vehículo</label>
                                <label className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-2xl cursor-pointer transition-colors ${
                                    isDark ? 'border-slate-600 hover:border-blue-400 bg-slate-800' : 'border-slate-300 hover:border-blue-500 bg-slate-50'
                                }`}>
                                    <Camera size={32} className={`mb-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
                                    <span className={`text-sm font-bold ${textPri}`}>Tomar / Subir Fotos</span>
                                    <input type="file" multiple accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />
                                </label>
                                
                                {fotosPreview.length > 0 && (
                                    <div className="flex gap-2 mt-3 overflow-x-auto pb-2">
                                        {fotosPreview.map((src, i) => (
                                            <img key={i} src={src} className="h-16 w-16 object-cover rounded-lg border-2 border-slate-300 shadow-sm" alt="Preview preview" />
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Falla Cliente */}
                            <div>
                                <label className={labelCls}>🔧 Falla Reportada por el Cliente *</label>
                                <textarea className={`${inputCls} resize-none h-32`} placeholder="Ej: Ruido en el motor al acelerar..." value={form.motivo_ingreso} onChange={e => setForm(f => ({ ...f, motivo_ingreso: e.target.value }))} required />
                            </div>
                        </div>

                        {/* Diagrama Interactivo */}
                        <div>
                            <div className="flex justify-between items-end mb-2">
                                <label className={labelCls}>Diagrama Táctil de Daños (Dibuje rayones/golpes)</label>
                                <button type="button" onClick={() => diagramRef.current?.clear()} className="text-xs text-blue-500 flex gap-1 items-center font-bold hover:underline">
                                    <RefreshCw size={12} /> Limpiar
                                </button>
                            </div>
                            <div className={`relative w-full overflow-hidden rounded-xl border-2 ${isDark ? 'border-slate-600 bg-white' : 'border-slate-300 bg-white'}`} style={{ height: '300px' }}>
                                <img src="/car-diagram.png" alt="Auto Plantilla" className="absolute inset-0 w-full h-full object-contain opacity-40 pointer-events-none select-none" />
                                <SignaturePad 
                                    ref={diagramRef} 
                                    penColor="red"
                                    velocityFilterWeight={0.7}
                                    canvasProps={{className: "absolute inset-0 w-full h-full touch-none"}}
                                />
                            </div>
                        </div>
                    </div>

                    {/* ── Sección 4: Conformidad y Firma ── */}
                    <div className={`${cardBg} rounded-2xl border ${border} p-6`}>
                        <h2 className={`${sectionTitle} ${isDark ? 'text-purple-400' : 'text-purple-600'}`}>
                            <FileText size={16} /> 4. Conformidad y Firmas
                        </h2>
                        
                        <div className="grid grid-cols-1 xl:grid-cols-3 md:grid-cols-2 gap-6">
                            <div>
                                <label className={labelCls}>Nombre Completo Cliente *</label>
                                <input className={inputCls} placeholder="Nombre completo" value={form.firma_cliente_text} onChange={e => setForm(f => ({ ...f, firma_cliente_text: e.target.value }))} required />
                                <p className={`text-[11px] mt-3 ${subText}`}>
                                    Al firmar, el cliente acepta el inventario visual y que no dejará objetos de valor no declarados.
                                </p>
                            </div>

                            <div>
                                <div className="flex justify-between items-end mb-2">
                                    <label className={labelCls}>Firma Digital (Cliente)</label>
                                    <button type="button" onClick={() => signatureRef.current?.clear()} className="text-xs text-blue-500 font-bold hover:underline">
                                        Limpiar
                                    </button>
                                </div>
                                <div className="border-2 border-dashed border-slate-300 rounded-xl bg-white overflow-hidden shadow-inner" style={{ height: '150px' }}>
                                    <SignaturePad 
                                        ref={signatureRef} 
                                        penColor="black"
                                        canvasProps={{className: "w-full h-full touch-none cursor-crosshair"}}
                                    />
                                </div>
                            </div>

                            <div>
                                <div className="flex justify-between items-end mb-2">
                                    <label className={labelCls}>Firma Digital (Mecánico/Asesor)</label>
                                    <button type="button" onClick={() => firmaMecanicoRef.current?.clear()} className="text-xs text-blue-500 font-bold hover:underline">
                                        Limpiar
                                    </button>
                                </div>
                                <div className="border-2 border-dashed border-slate-300 rounded-xl bg-white overflow-hidden shadow-inner" style={{ height: '150px' }}>
                                    <SignaturePad 
                                        ref={firmaMecanicoRef} 
                                        penColor="#1d4ed8" /* blue */
                                        canvasProps={{className: "w-full h-full touch-none cursor-crosshair"}}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 pb-6">
                        <button type="button" onClick={() => navigate(-1)} className={`flex-1 py-4 px-6 rounded-2xl border font-bold text-sm transition-colors ${isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-800' : 'border-slate-300 text-slate-700 hover:bg-slate-100'}`}>
                            Cancelar Regreso
                        </button>
                        <button type="submit" disabled={loading} className="flex-1 py-4 px-6 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2.5 disabled:opacity-50 shadow-xl shadow-orange-500/25">
                            {loading ? <Loader2 size={19} className="animate-spin" /> : <Truck size={19} />}
                            {loading ? 'Generando Boleta...' : 'Guardar y Generar PDF'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
