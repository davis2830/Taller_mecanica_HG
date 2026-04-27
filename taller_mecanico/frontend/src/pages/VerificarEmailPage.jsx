import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function VerificarEmailPage() {
    const { token } = useParams();
    const { isDark } = useTheme();
    const [estado, setEstado] = useState('loading'); // loading | ok | error
    const [mensaje, setMensaje] = useState('');

    useEffect(() => {
        const verificar = async () => {
            try {
                const res = await axios.post(`/api/v1/usuarios/me/email/verificar/${token}/`);
                setEstado('ok');
                setMensaje(res.data.detail || 'Correo confirmado.');
            } catch (e) {
                setEstado('error');
                setMensaje(e.response?.data?.error || 'No se pudo verificar el correo.');
            }
        };
        verificar();
    }, [token]);

    const wrapCls = isDark
        ? 'bg-slate-950 text-slate-100'
        : 'bg-slate-50 text-slate-900';
    const cardCls = isDark
        ? 'bg-slate-900 border-slate-800'
        : 'bg-white border-slate-200';

    return (
        <div className={`min-h-screen flex items-center justify-center px-4 ${wrapCls}`}>
            <div className={`max-w-md w-full rounded-xl border ${cardCls} p-8 text-center`}>
                {estado === 'loading' && (
                    <>
                        <Loader2 className="animate-spin mx-auto mb-3 text-teal-500" size={40} />
                        <h2 className="text-lg font-semibold">Verificando tu correo...</h2>
                    </>
                )}
                {estado === 'ok' && (
                    <>
                        <CheckCircle2 className="mx-auto mb-3 text-emerald-500" size={48} />
                        <h2 className="text-xl font-bold mb-2">Correo confirmado</h2>
                        <p className="text-sm opacity-75 mb-5">{mensaje}</p>
                        <Link
                            to="/"
                            className="inline-block px-5 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm"
                        >
                            Ir al inicio
                        </Link>
                    </>
                )}
                {estado === 'error' && (
                    <>
                        <AlertTriangle className="mx-auto mb-3 text-rose-500" size={48} />
                        <h2 className="text-xl font-bold mb-2">No pudimos verificar el correo</h2>
                        <p className="text-sm opacity-75 mb-5">{mensaje}</p>
                        <Link
                            to="/perfil"
                            className="inline-block px-5 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm"
                        >
                            Volver a Mi Perfil
                        </Link>
                    </>
                )}
            </div>
        </div>
    );
}
