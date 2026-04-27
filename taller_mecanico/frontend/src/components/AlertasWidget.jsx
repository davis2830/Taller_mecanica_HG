import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AlertTriangle, CheckCircle, Clock, Loader2, Package } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { AuthContext } from '../context/AuthContext';

export default function AlertasWidget({ onAlertaResuelta }) {
    const { isDark } = useTheme();
    const { authTokens } = useContext(AuthContext);
    
    const [alertas, setAlertas] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchAlertas = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/v1/inventario/alertas/', {
                headers: { Authorization: `Bearer ${authTokens?.access}` }
            });
            setAlertas(res.data.results || res.data);
        } catch (error) {
            console.error('Error fetching alertas', error);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchAlertas();
    }, [authTokens]);

    const handleResolver = async (id) => {
        try {
            await axios.patch(`/api/v1/inventario/alertas/${id}/resolver/`, {}, {
                headers: { Authorization: `Bearer ${authTokens?.access}` }
            });
            fetchAlertas();
            if (onAlertaResuelta) onAlertaResuelta();
        } catch (error) {
            console.error('Error al resolver alerta', error);
        }
    };

    if (loading) {
        return (
            <div className={`p-5 rounded-2xl border ${isDark ? 'bg-slate-800/70 border-slate-700' : 'bg-white border-slate-200'} flex justify-center`}>
                <Loader2 className="animate-spin text-orange-500" />
            </div>
        );
    }

    if (alertas.length === 0) return null;

    return (
        <div className={`rounded-2xl border overflow-hidden ${isDark ? 'bg-slate-800/70 border-slate-700' : 'bg-white border-slate-200'}`}>
            <div className={`px-5 py-3 border-b flex justify-between items-center ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex items-center gap-2 text-rose-500 font-bold">
                    <AlertTriangle size={18} />
                    <span>Alertas Críticas de Inventario ({alertas.length})</span>
                </div>
            </div>
            
            <div className="max-h-64 overflow-y-auto p-4 space-y-3">
                {alertas.map(a => (
                    <div key={a.id} className={`p-4 rounded-xl border flex items-center justify-between gap-4 ${isDark ? (a.tipo === 'STOCK_AGOTADO' ? 'bg-rose-900/20 border-rose-800/50' : 'bg-orange-900/20 border-orange-800/50') : (a.tipo === 'STOCK_AGOTADO' ? 'bg-rose-50 border-rose-200' : 'bg-orange-50 border-orange-200')}`}>
                        
                        <div className="flex items-start gap-3">
                            <div className={`mt-0.5 p-2 rounded-lg ${isDark ? 'bg-white/10 text-rose-400' : 'bg-white text-rose-500'}`}>
                                <Package size={18} />
                            </div>
                            <div>
                                <h4 className={`text-sm font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                                    {a.producto_nombre} <span className="opacity-50 text-[10px] ml-1">({a.producto_codigo})</span>
                                </h4>
                                <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{a.mensaje}</p>
                                <div className="flex items-center gap-1 mt-1.5 opacity-60 text-[10px] font-semibold">
                                    <Clock size={10} /> {new Date(a.fecha_creacion).toLocaleDateString('es-GT', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>
                        </div>

                        <button 
                            onClick={() => handleResolver(a.id)}
                            className="shrink-0 flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/40 transition-colors shadow-sm border border-black/5"
                        >
                            <CheckCircle size={14} /> Marcar resuelta
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
