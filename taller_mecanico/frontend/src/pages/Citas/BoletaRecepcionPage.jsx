import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';
import { Printer, ArrowLeft, Loader2, CheckSquare, Square, MessageCircle, Mail } from 'lucide-react';

export default function BoletaRecepcionPage() {
    const { pk } = useParams();
    const navigate = useNavigate();
    const { authTokens } = useContext(AuthContext);

    const [recepcion, setRecepcion] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [enviandoCorreo, setEnviandoCorreo] = useState(false);

    useEffect(() => {
        const fetch = async () => {
            try {
                const res = await axios.get(`/api/v1/recepciones/${pk}/`, {
                    headers: { Authorization: `Bearer ${authTokens?.access}` }
                });
                setRecepcion(res.data);
            } catch (e) {
                setError('No se pudo cargar la recepción.');
            }
            setLoading(false);
        };
        fetch();
    }, [pk, authTokens]);

    const handleSendEmail = async () => {
        setEnviandoCorreo(true);
        try {
            await axios.post(`/api/v1/recepciones/${pk}/enviar_boleta/`, { url: window.location.href }, {
                headers: { Authorization: `Bearer ${authTokens?.access}` }
            });
            alert('Boleta enviada por correo al cliente exitosamente.');
        } catch (e) {
            alert(e.response?.data?.error || 'Error enviando correo.');
        }
        setEnviandoCorreo(false);
    };

    if (loading) return (
        <div className="flex-1 flex items-center justify-center min-h-full">
            <Loader2 className="animate-spin text-blue-500" size={40} />
        </div>
    );

    if (error || !recepcion) return (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 min-h-full">
            <p className="text-red-400 font-semibold">{error || 'Boleta no encontrada.'}</p>
            <button onClick={() => navigate(-1)} className="text-blue-400 underline text-sm">Volver</button>
        </div>
    );

    const v = recepcion.vehiculo_info || recepcion.vehiculo;
    const propietario = v?.propietario;
    const pct = recepcion.gasolina_pct || 0;
    const numBoleta = String(recepcion.id).padStart(5, '0');
    const fechaIngreso = recepcion.fecha_ingreso
        ? new Date(recepcion.fecha_ingreso).toLocaleString('es-GT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
        : '—';

    const Checkbox = ({ checked }) => checked
        ? <CheckSquare size={16} className="inline text-gray-800" />
        : <Square size={16} className="inline text-gray-400" />;

    // Enlace de whatsapp
    const whatsappMsg = `🚗 Hola ${propietario?.first_name || ''}, te compartimos la *Boleta de Recepción #${numBoleta}* de tu vehículo ${v?.marca} ${v?.modelo} placas ${v?.placa}. Ingresa aquí para verla: ${window.location.href}`;
    const waLink = `https://wa.me/?text=${encodeURIComponent(whatsappMsg)}`;

    return (
        <>
            {/* Barra de acciones — se oculta al imprimir */}
            <div className="no-print flex items-center gap-3 px-6 py-3 bg-slate-800 border-b border-slate-700 sticky top-0 z-10 flex-wrap">
                <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-300 hover:text-white text-sm font-medium transition-colors">
                    <ArrowLeft size={16} /> Volver
                </button>
                <div className="flex-1 min-w-[20px]" />

                <button onClick={handleSendEmail} disabled={enviandoCorreo} className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 border border-slate-600 text-white font-bold text-sm px-4 py-2 rounded-xl transition-colors">
                    {enviandoCorreo ? <Loader2 size={17} className="animate-spin" /> : <Mail size={17} />} Email
                </button>

                <a href={waLink} target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-[#25D366] hover:bg-[#1ebe57] text-white font-bold text-sm px-4 py-2 rounded-xl transition-colors shadow-lg">
                    <MessageCircle size={17} /> Compartir por WhatsApp
                </a>

                <button onClick={() => window.print()} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-5 py-2 rounded-xl transition-colors shadow-lg">
                    <Printer size={17} /> Imprimir / PDF
                </button>
            </div>

            {/* ── HOJA DE IMPRESIÓN ── */}
            <div className="boleta-print-wrapper">
                <div className="boleta-hoja">
                    {/* CABECERA */}
                    <div className="boleta-header">
                        <div>
                            <div className="boleta-empresa">TALLER MASTER PRO</div>
                            <div className="boleta-sub">BOLETA DE RECEPCIÓN NRO: <strong>{numBoleta}</strong></div>
                            <div className="boleta-sub">FECHA/HORA INGRESO: <strong>{fechaIngreso}</strong></div>
                        </div>
                        <div className="boleta-generado">
                            Generado por:<br />
                            <strong>{recepcion.recibido_por_nombre || '—'}</strong>
                        </div>
                    </div>

                    {/* SECCIÓN 1: DATOS DEL VEHÍCULO */}
                    <div className="boleta-section-title">1. Datos del Vehículo y Propietario</div>
                    <div className="boleta-grid-2">
                        <div className="boleta-field">
                            <div className="boleta-label">Cliente / Propietario</div>
                            <div className="boleta-value">{propietario?.full_name || propietario?.username || '—'}</div>
                        </div>
                        <div className="boleta-field">
                            <div className="boleta-label">Teléfono / Correo</div>
                            <div className="boleta-value">{propietario?.email || 'Sin correo'}</div>
                        </div>
                    </div>
                    <div className="boleta-grid-4">
                        <div className="boleta-field">
                            <div className="boleta-label">Marca y Modelo</div>
                            <div className="boleta-value">{v?.marca} {v?.modelo}</div>
                        </div>
                        <div className="boleta-field">
                            <div className="boleta-label">Año</div>
                            <div className="boleta-value">{v?.año}</div>
                        </div>
                        <div className="boleta-field">
                            <div className="boleta-label">Placas</div>
                            <div className="boleta-value boleta-mono">{v?.placa}</div>
                        </div>
                        <div className="boleta-field">
                            <div className="boleta-label">Color</div>
                            <div className="boleta-value">{v?.color}</div>
                        </div>
                    </div>

                    {/* SECCIÓN 2: CONDICIÓN */}
                    <div className="boleta-section-title">2. Condición del Vehículo e Inspección</div>
                    <div className="boleta-grid-2" style={{ marginTop: '10px' }}>
                        <div className="boleta-field">
                            <div className="boleta-label">Kilometraje / Millaje Actual</div>
                            <div className="boleta-value boleta-km">{Number(recepcion.kilometraje || 0).toLocaleString()} {recepcion.unidad_distancia || 'km'}</div>
                        </div>
                        <div className="boleta-field">
                            <div className="boleta-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>Nivel de Gasolina</span>
                                <span style={{ fontWeight: 'normal' }}>{pct}%</span>
                            </div>
                            <div className="boleta-gas-meter">
                                <div className="boleta-gas-fill" style={{ width: `${pct}%`, WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }} />
                            </div>
                        </div>
                    </div>

                    <div className="boleta-field" style={{ marginTop: '12px' }}>
                        <div className="boleta-label">Estado de Luces de Tablero</div>
                        <div className="boleta-value" style={{ fontSize: '11px', minHeight: 'auto', paddingBottom: '0' }}>
                            {recepcion.luces_tablero && Object.keys(recepcion.luces_tablero).length > 0 
                                ? Object.entries(recepcion.luces_tablero).map(([key, val]) => (
                                    <span key={key} style={{ display: 'inline-block', marginRight: '15px' }}>
                                        <Checkbox checked={val} /> {key}
                                    </span>
                                ))
                                : "No se registraron alertas."}
                        </div>
                    </div>

                    <div className="boleta-field" style={{ marginTop: '12px' }}>
                        <div className="boleta-label">Estado de Fluidos y Batería</div>
                        <div className="boleta-value" style={{ fontSize: '11px', minHeight: 'auto', paddingBottom: '0' }}>
                            {recepcion.estado_fluidos && Object.keys(recepcion.estado_fluidos).length > 0 
                                ? Object.entries(recepcion.estado_fluidos).map(([key, val]) => (
                                    <span key={key} style={{ display: 'inline-block', marginRight: '15px' }}>
                                        <strong>{key}:</strong> {val}
                                    </span>
                                ))
                                : "No se registraron niveles al ingreso."}
                        </div>
                    </div>

                    <div className="boleta-field" style={{ marginTop: '12px' }}>
                        <div className="boleta-label">Estado de Cristales</div>
                        <div className="boleta-value">{recepcion.estado_cristales || 'Ok. No visualiza roturas.'}</div>
                    </div>

                    <div className="boleta-field" style={{ marginTop: '12px' }}>
                        <div className="boleta-label">Daños o Golpes Previos Observados</div>
                        {recepcion.diagrama_danos ? (
                            <div className="boleta-box" style={{ position: 'relative', width: '100%', maxWidth: '350px', height: '240px', padding: 0 }}>
                                <img src="/car-diagram.png" alt="Auto Base" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'contain', opacity: 0.25 }} />
                                <img src={recepcion.diagrama_danos} alt="Diagrama" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'contain' }} />
                            </div>
                        ) : (
                            <div className="boleta-box">
                                {recepcion.danos_previos || <em>Ningún daño visual reportado durante la inspección manual.</em>}
                            </div>
                        )}
                    </div>

                    {/* SECCIÓN 3: INVENTARIO */}
                    <div className="boleta-section-title">3. Inventario Abordo</div>
                    <div className="boleta-inventario">
                        <div><Checkbox checked={recepcion.tiene_llanta_repuesto} /> Llanta Repuesto</div>
                        <div><Checkbox checked={recepcion.tiene_gata_herramientas} /> Tricket/Herram.</div>
                        <div><Checkbox checked={recepcion.tiene_radio} /> Radio/Pantalla</div>
                        <div><Checkbox checked={recepcion.tiene_documentos} /> Documentos</div>
                    </div>
                    <div className="boleta-field" style={{ marginTop: '8px' }}>
                        <div className="boleta-label">Otros Objetos Relevantes Dejados</div>
                        <div className="boleta-value">{recepcion.otros_objetos || 'Ninguno'}</div>
                    </div>

                    {recepcion.fotos && recepcion.fotos.length > 0 && (
                        <div className="boleta-field" style={{ marginTop: '15px' }}>
                            <div className="boleta-label">Registro Fotográfico del Ingreso</div>
                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '10px' }}>
                                {recepcion.fotos.map(f => {
                                    const srcUrl = f.imagen.startsWith('http') ? f.imagen : `${f.imagen}`;
                                    return <img key={f.id} src={srcUrl} alt="Foto Ingreso" style={{ width: '130px', height: '100px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #ccc' }} />;
                                })}
                            </div>
                        </div>
                    )}

                    {/* SECCIÓN 4: MOTIVO */}
                    <div className="boleta-section-title">4. Motivo de Ingreso y Trabajo Solicitado</div>
                    <div className="boleta-field" style={{ marginTop: '10px' }}>
                        <div className="boleta-label" style={{ color: '#c0392b' }}>Falla Reportada por el Cliente / Solicitud:</div>
                        <div className="boleta-box">{recepcion.motivo_ingreso}</div>
                    </div>

                    {/* CLÁUSULA */}
                    <div className="boleta-clausula">
                        El cliente autoriza el ingreso del vehículo descrito para su respectivo diagnóstico y reparación.
                        El Taller no se hace responsable por objetos de valor no reportados en la sección "Inventario Abordo"
                        ni por daños mecánicos ocultos no relacionados con el motivo de ingreso. Declaro que el nivel de
                        gasolina, daños visuales en la inspección gráfica descrita y demás elementos concuerdan en este acto.
                    </div>

                    {/* FIRMAS */}
                    <div className="boleta-firmas">
                        <div className="boleta-firma-box">
                            {recepcion.firma_digital ? (
                                <img src={recepcion.firma_digital} alt="Firma Cliente" style={{ height: '60px', margin: '0 auto', objectFit: 'contain' }} />
                            ) : (
                                <div style={{ height: '60px' }} />
                            )}
                            <div className="boleta-firma-linea" />
                            <strong>Firma y Conformidad del Cliente</strong><br />
                            <span style={{ fontSize: '12px' }}>{recepcion.firma_cliente_text || '—'}</span>
                        </div>
                        <div className="boleta-firma-box">
                            {recepcion.firma_mecanico ? (
                                <img src={recepcion.firma_mecanico} alt="Firma Mecánico" style={{ height: '60px', margin: '0 auto', objectFit: 'contain' }} />
                            ) : (
                                <div style={{ height: '60px' }} />
                            )}
                            <div className="boleta-firma-linea" />
                            <strong>Recibido Por (Taller)</strong><br />
                            <span style={{ fontSize: '12px' }}>{recepcion.recibido_por_nombre || '—'}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Estilos de impresión */}
            <style>{`
                .boleta-print-wrapper {
                    background: #f4f6f9;
                    padding: 24px;
                    min-height: calc(100vh - 52px);
                }
                .boleta-hoja {
                    background: white; width: 21cm; min-height: 29.7cm; padding: 2cm; margin: 0 auto;
                    box-shadow: 0 0 16px rgba(0,0,0,0.12); border: 1px solid #ccc;
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 13px; color: #222;
                }
                .boleta-header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #2d6a4f; padding-bottom: 10px; margin-bottom: 16px; }
                .boleta-empresa { font-size: 22px; font-weight: bold; color: #2d6a4f; }
                .boleta-sub { font-size: 12px; color: #555; margin-top: 2px; }
                .boleta-generado { font-size: 11px; text-align: right; color: #555; }
                .boleta-section-title { font-size: 12px; font-weight: bold; background: #e9ecef; padding: 5px 10px; margin-top: 18px; text-transform: uppercase; letter-spacing: 0.05em; }
                .boleta-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 10px; }
                .boleta-grid-4 { display: grid; grid-template-columns: 3fr 1fr 2fr 2fr; gap: 12px; margin-top: 10px; }
                .boleta-label { font-weight: bold; font-size: 11px; color: #555; margin-bottom: 3px; }
                .boleta-value { font-size: 13px; border-bottom: 1px dashed #ccc; padding-bottom: 3px; min-height: 20px; }
                .boleta-mono { font-family: monospace; font-weight: bold; letter-spacing: 1px; }
                .boleta-km   { font-size: 16px; font-weight: bold; }
                .boleta-gas-meter { width: 100%; border: 1px solid #999; height: 14px; border-radius: 10px; overflow: hidden; margin-top: 6px; }
                .boleta-gas-fill { height: 100%; background-color: #2d6a4f !important; transition: width 0.4s; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                .boleta-box { border: 1px solid #ddd; padding: 8px; min-height: 48px; background: #f9f9f9; font-size: 12px; border-radius: 4px; white-space: pre-line; }
                .boleta-inventario { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-top: 10px; font-size: 13px; }
                .boleta-inventario div { display: flex; align-items: center; gap: 6px; }
                .boleta-clausula { margin-top: 30px; font-size: 10px; color: #555; line-height: 1.4; text-align: justify; }
                .boleta-firmas { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 48px; text-align: center; }
                .boleta-firma-box { font-size: 12px; }
                .boleta-firma-linea { border-top: 1px solid black; margin: 0 10%; padding-top: 6px; margin-bottom: 6px; }

                @media print {
                    .no-print { display: none !important; }
                    body { margin: 0; padding: 0; background: white; }
                    .boleta-print-wrapper { background: white; padding: 0; }
                    .boleta-hoja { box-shadow: none; border: none; width: 100%; min-height: auto; padding: 1cm; margin: 0; }
                }
            `}</style>
        </>
    );
}
