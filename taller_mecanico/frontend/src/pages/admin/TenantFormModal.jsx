import React, { useContext, useState } from 'react';
import axios from 'axios';
import { X, AlertCircle } from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';

/**
 * Modal para crear un nuevo tenant (taller cliente).
 *
 * Campos:
 *   - nombre: nombre comercial del taller
 *   - slug: identificador URL-safe (derivado de nombre como default)
 *   - email_contacto: email del dueño/admin
 *   - dominio_inicial: opcional, hostname inicial (ej. taller.localhost)
 */
export default function TenantFormModal({ onClose, onSaved }) {
    const { authTokens } = useContext(AuthContext);
    const [nombre, setNombre] = useState('');
    const [slug, setSlug] = useState('');
    const [emailContacto, setEmailContacto] = useState('');
    const [dominioInicial, setDominioInicial] = useState('');
    const [slugEditedManually, setSlugEditedManually] = useState(false);
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState({});

    // Slugifica un texto: lowercase, sin caracteres especiales, espacios → '-'.
    // Adicionalmente strippea el prefijo redundante "taller-" / "taller " que
    // el usuario tiende a tipear en el nombre comercial. El backend agrega
    // "taller_" al schema_name automáticamente, por lo que repetirlo en el
    // slug deriva en "taller_taller_<slug>" (feo y validamos contra eso).
    const slugify = (text) =>
        text.toLowerCase()
            .trim()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^taller[-_]+/, '');

    const handleNombreChange = (e) => {
        const val = e.target.value;
        setNombre(val);
        if (!slugEditedManually) setSlug(slugify(val));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setErrors({});
        try {
            await axios.post('/api/v1/public-admin/tenants/', {
                nombre,
                slug,
                email_contacto: emailContacto,
                ...(dominioInicial ? { dominio_inicial: dominioInicial } : {}),
            }, {
                headers: { Authorization: `Bearer ${authTokens?.access}` },
            });
            onSaved();
        } catch (err) {
            if (err.response?.data) {
                setErrors(typeof err.response.data === 'object'
                    ? err.response.data
                    : { detail: err.response.data });
            } else {
                setErrors({ detail: 'Error de conexión.' });
            }
        } finally {
            setSaving(false);
        }
    };

    const fieldError = (name) => {
        const val = errors[name];
        if (!val) return null;
        return Array.isArray(val) ? val.join(', ') : String(val);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
                    <h2 className="text-lg font-semibold">Nuevo taller</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {errors.detail && (
                        <div className="flex items-start gap-2 rounded-lg bg-red-950/50 border border-red-900/50 p-3 text-sm text-red-200">
                            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                            <span>{errors.detail}</span>
                        </div>
                    )}

                    <label className="block">
                        <span className="mb-1 block text-sm font-medium text-slate-300">Nombre del taller</span>
                        <input
                            type="text"
                            value={nombre}
                            onChange={handleNombreChange}
                            className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                            placeholder="Taller Mecánico Demo"
                            required
                        />
                        {fieldError('nombre') && <p className="mt-1 text-xs text-red-300">{fieldError('nombre')}</p>}
                    </label>

                    <label className="block">
                        <span className="mb-1 block text-sm font-medium text-slate-300">
                            Slug <span className="text-xs text-slate-500">(identificador URL)</span>
                        </span>
                        <input
                            type="text"
                            value={slug}
                            onChange={(e) => { setSlug(slugify(e.target.value)); setSlugEditedManually(true); }}
                            className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm font-mono focus:border-indigo-500 focus:outline-none"
                            placeholder="taller-demo"
                            pattern="[a-z0-9-]+"
                            required
                        />
                        <p className="mt-1 text-xs text-slate-500">
                            Schema en Postgres: <span className="font-mono">taller_{slug.replace(/-/g, '_') || '…'}</span>
                        </p>
                        {/^taller[-_]/.test(slug) && (
                            <p className="mt-1 text-xs text-amber-300">
                                No incluir "taller-" en el slug — ya se agrega al schema.
                            </p>
                        )}
                        {fieldError('slug') && <p className="mt-1 text-xs text-red-300">{fieldError('slug')}</p>}
                    </label>

                    <label className="block">
                        <span className="mb-1 block text-sm font-medium text-slate-300">Email de contacto</span>
                        <input
                            type="email"
                            value={emailContacto}
                            onChange={(e) => setEmailContacto(e.target.value)}
                            className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                            placeholder="admin@tallerdemo.com"
                            required
                        />
                        {fieldError('email_contacto') && <p className="mt-1 text-xs text-red-300">{fieldError('email_contacto')}</p>}
                    </label>

                    <label className="block">
                        <span className="mb-1 block text-sm font-medium text-slate-300">
                            Dominio inicial <span className="text-xs text-slate-500">(opcional)</span>
                        </span>
                        <input
                            type="text"
                            value={dominioInicial}
                            onChange={(e) => setDominioInicial(e.target.value)}
                            className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm font-mono focus:border-indigo-500 focus:outline-none"
                            placeholder="demo.localhost"
                        />
                        <p className="mt-1 text-xs text-slate-500">
                            Se puede agregar después desde la lista.
                        </p>
                        {fieldError('dominio_inicial') && <p className="mt-1 text-xs text-red-300">{fieldError('dominio_inicial')}</p>}
                    </label>

                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
                        >
                            {saving ? 'Creando…' : 'Crear taller'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
