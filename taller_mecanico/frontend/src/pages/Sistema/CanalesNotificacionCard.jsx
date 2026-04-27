import React, { useState, useEffect, useContext, useCallback } from 'react';
import axios from 'axios';
import { Mail, MessageCircle, Bell, Loader2, Lock, Info } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { AuthContext } from '../../context/AuthContext';

/**
 * Card "Canales de notificación" — toggle por evento (email / WhatsApp).
 *
 * Se monta dentro de Configuración del Taller. Hace un GET al cargar y
 * un PATCH atómico cuando el admin cambia un toggle.
 *
 * Eventos sensibles (cuentas: activación, cambio de correo, etc.) muestran
 * el toggle de WhatsApp deshabilitado con un candado, y el toggle de
 * correo bloqueado en activado (no se puede apagar por seguridad).
 */
export default function CanalesNotificacionCard() {
    const { isDark } = useTheme();
    const { authTokens } = useContext(AuthContext);
    const headers = { Authorization: `Bearer ${authTokens?.access}` };

    const [canales, setCanales] = useState(null);
    const [loading, setLoading] = useState(true);
    const [savingId, setSavingId] = useState(null);
    const [error, setError] = useState(null);

    const cardBg = isDark ? 'bg-slate-800' : 'bg-white';
    const cardBorder = isDark ? 'border-slate-700' : 'border-slate-200';
    const sub = isDark ? 'text-slate-400' : 'text-slate-500';
    const rowHover = isDark ? 'hover:bg-slate-900/40' : 'hover:bg-slate-50';
    const head = isDark ? 'bg-slate-900/60 text-slate-300' : 'bg-slate-50 text-slate-600';
    const grupoLabel = isDark ? 'text-slate-300 bg-slate-700/40' : 'text-slate-700 bg-slate-100';

    const fetchCanales = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/v1/sistema/canales-notificacion/', { headers });
            setCanales(res.data);
            setError(null);
        } catch (e) {
            setError(e.response?.data?.detail || 'No se pudo cargar la configuración de canales.');
        }
        setLoading(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => { fetchCanales(); }, [fetchCanales]);

    const toggle = async (canal, key) => {
        if (savingId) return;
        // No-op si el campo está bloqueado.
        if (key === 'email_activo' && canal.email_obligatorio) return;
        if (key === 'whatsapp_activo' && canal.solo_email) return;

        setSavingId(canal.evento);
        const next = !canal[key];
        // Optimistic
        setCanales(prev => prev.map(c =>
            c.evento === canal.evento ? { ...c, [key]: next } : c
        ));
        try {
            await axios.patch(
                `/api/v1/sistema/canales-notificacion/${canal.evento}/`,
                { [key]: next },
                { headers },
            );
        } catch (e) {
            // Revertir si el server lo rechazó
            setCanales(prev => prev.map(c =>
                c.evento === canal.evento ? { ...c, [key]: !next } : c
            ));
        }
        setSavingId(null);
    };

    if (loading) {
        return (
            <div className={`rounded-xl border ${cardBg} ${cardBorder} p-5 mb-5`}>
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="animate-spin text-blue-500" size={22} />
                </div>
            </div>
        );
    }

    if (error || !canales) {
        return (
            <div className={`rounded-xl border ${cardBg} ${cardBorder} p-5 mb-5`}>
                <p className="text-sm text-rose-500">{error || 'Sin datos.'}</p>
            </div>
        );
    }

    // Agrupar por `grupo`
    const grupos = canales.reduce((acc, c) => {
        (acc[c.grupo] = acc[c.grupo] || []).push(c);
        return acc;
    }, {});

    return (
        <div className={`rounded-xl border ${cardBg} ${cardBorder} p-5 mb-5`}>
            <div className="flex items-center gap-2 mb-1">
                <Bell size={18} className="text-blue-500" />
                <h2 className="font-bold">Canales de notificación</h2>
            </div>
            <p className={`text-xs mb-4 ${sub}`}>
                Define por evento si el sistema envía correo, WhatsApp o ambos. El cliente
                no puede sobreescribir esta configuración.
            </p>

            <div className={`flex items-start gap-2 rounded-lg p-3 mb-4 text-xs ${isDark ? 'bg-blue-500/10 text-blue-200' : 'bg-blue-50 text-blue-800'}`}>
                <Info size={14} className="mt-0.5 shrink-0" />
                <span>
                    WhatsApp todavía está en modo <strong>simulación</strong> (mock): si lo
                    activas, el sistema registra el mensaje en los logs pero aún no lo envía
                    realmente. Cuando se complete la integración con Twilio, los toggles
                    activos empezarán a despachar mensajes reales sin necesidad de tocar nada
                    más aquí.
                </span>
            </div>

            <div className={`overflow-hidden rounded-lg border ${cardBorder}`}>
                <table className="w-full text-sm">
                    <thead>
                        <tr className={`text-xs uppercase tracking-wider ${head}`}>
                            <th className="text-left font-semibold px-4 py-2.5">Evento</th>
                            <th className="text-center font-semibold px-3 py-2.5 w-28">
                                <div className="inline-flex items-center gap-1.5 justify-center">
                                    <Mail size={14} /> Correo
                                </div>
                            </th>
                            <th className="text-center font-semibold px-3 py-2.5 w-28">
                                <div className="inline-flex items-center gap-1.5 justify-center">
                                    <MessageCircle size={14} /> WhatsApp
                                </div>
                            </th>
                        </tr>
                    </thead>
                    {Object.entries(grupos).map(([grupo, items]) => (
                        <tbody key={grupo}>
                            <tr>
                                <td colSpan={3} className={`text-[11px] uppercase font-bold tracking-wider px-4 py-1.5 ${grupoLabel}`}>
                                    {grupo}
                                </td>
                            </tr>
                            {items.map(canal => (
                                <tr key={canal.evento} className={`border-t ${cardBorder} ${rowHover}`}>
                                    <td className="px-4 py-3 align-top">
                                        <div className="font-semibold">{canal.label}</div>
                                        {canal.descripcion && (
                                            <div className={`text-xs mt-0.5 ${sub}`}>{canal.descripcion}</div>
                                        )}
                                    </td>
                                    <td className="px-3 py-3 text-center">
                                        <ToggleCell
                                            checked={canal.email_activo}
                                            disabled={canal.email_obligatorio}
                                            onChange={() => toggle(canal, 'email_activo')}
                                            saving={savingId === canal.evento}
                                            lockReason={canal.email_obligatorio ? 'Obligatorio por seguridad' : null}
                                            isDark={isDark}
                                        />
                                    </td>
                                    <td className="px-3 py-3 text-center">
                                        <ToggleCell
                                            checked={canal.whatsapp_activo}
                                            disabled={canal.solo_email}
                                            onChange={() => toggle(canal, 'whatsapp_activo')}
                                            saving={savingId === canal.evento}
                                            lockReason={canal.solo_email ? 'No disponible para este evento' : null}
                                            isDark={isDark}
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    ))}
                </table>
            </div>
        </div>
    );
}


function ToggleCell({ checked, disabled, onChange, saving, lockReason, isDark }) {
    const onColor = isDark ? 'bg-emerald-500' : 'bg-emerald-500';
    const offColor = isDark ? 'bg-slate-600' : 'bg-slate-300';

    if (disabled) {
        return (
            <div className="inline-flex items-center gap-1.5" title={lockReason || ''}>
                <div className={`w-9 h-5 rounded-full ${checked ? onColor : offColor} relative opacity-50`}>
                    <div className={`absolute top-0.5 ${checked ? 'right-0.5' : 'left-0.5'} w-4 h-4 bg-white rounded-full shadow-sm`} />
                </div>
                <Lock size={12} className={isDark ? 'text-slate-500' : 'text-slate-400'} />
            </div>
        );
    }

    return (
        <button
            type="button"
            onClick={onChange}
            disabled={saving}
            className={`w-9 h-5 rounded-full relative transition-colors ${checked ? onColor : offColor} ${saving ? 'opacity-60 cursor-wait' : 'cursor-pointer'}`}
            aria-pressed={checked}
        >
            <div className={`absolute top-0.5 transition-all ${checked ? 'right-0.5' : 'left-0.5'} w-4 h-4 bg-white rounded-full shadow-sm`} />
        </button>
    );
}
