import React, { useState, useEffect, useContext, useCallback } from 'react';
import axios from 'axios';
import {
  FileText, Save, Loader2, AlertTriangle, Building2, Receipt, ServerCog, Lock,
  Mail, BellRing,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { AuthContext } from '../../context/AuthContext';

const API = '/api/v1/facturacion/configuracion/';

const CERTIFICADORES = [
  { val: '', label: 'Sin definir' },
  { val: 'INFILE', label: 'INFILE' },
  { val: 'DIGIFACT', label: 'Digifact' },
  { val: 'GUATEFACT', label: 'Guatefact' },
  { val: 'MEGAPRINT', label: 'Megaprint' },
  { val: 'OTRO', label: 'Otro' },
];

export default function ConfiguracionFacturacionPage() {
  const { isDark } = useTheme();
  const { authTokens } = useContext(AuthContext);
  const headers = { Authorization: `Bearer ${authTokens?.access}` };

  const [config, setConfig] = useState(null);
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [error, setError] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(API, { headers });
      setConfig(res.data);
      setForm(res.data);
      setError(null);
    } catch (e) {
      setError(e.response?.data?.detail || e.response?.data?.message || 'No se pudo cargar la configuración fiscal.');
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const save = async () => {
    setSaving(true);
    try {
      const res = await axios.patch(API, form, { headers });
      setConfig(res.data);
      setForm(res.data);
      showToast('Configuración fiscal guardada.', 'success');
    } catch (e) {
      const data = e.response?.data;
      const msg = typeof data === 'string'
        ? data
        : Object.values(data || {}).flat().join(' ') || 'Error al guardar.';
      showToast(msg, 'error');
    }
    setSaving(false);
  };

  const bg        = isDark ? 'bg-slate-900' : 'bg-slate-50';
  const cardBg    = isDark ? 'bg-slate-800' : 'bg-white';
  const cardBrdr  = isDark ? 'border-slate-700' : 'border-slate-200';
  const txt       = isDark ? 'text-slate-100' : 'text-slate-800';
  const sub       = isDark ? 'text-slate-400' : 'text-slate-500';
  const labelCls  = `block text-xs font-bold uppercase tracking-wider mb-1.5 ${sub}`;
  const inputCls  = `w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDark
    ? 'bg-slate-900 border-slate-600 text-slate-100'
    : 'bg-white border-slate-300 text-slate-800'}`;

  if (loading) {
    return (
      <div className={`min-h-[60vh] flex items-center justify-center ${bg}`}>
        <Loader2 className="animate-spin text-blue-500" size={32} />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-[60vh] flex items-center justify-center ${bg}`}>
        <div className="flex flex-col items-center gap-2 text-center max-w-md">
          <AlertTriangle className="text-amber-500" size={32} />
          <p className={txt}>{error}</p>
          <p className={`text-xs ${sub}`}>Solo los administradores pueden ver esta sección.</p>
        </div>
      </div>
    );
  }

  const dirty = JSON.stringify(form) !== JSON.stringify(config);
  const ambientePill = form.ambiente === 'PRODUCCION'
    ? { cls: 'bg-red-500/15 text-red-500 border-red-500/30', label: 'PRODUCCIÓN (facturas reales)' }
    : { cls: 'bg-amber-500/15 text-amber-500 border-amber-500/30', label: 'PRUEBAS (sandbox)' };

  return (
    <div className={`p-6 max-w-4xl mx-auto ${txt}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${isDark ? 'bg-orange-500/15' : 'bg-orange-50'}`}>
            <FileText className="text-orange-500" size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Configuración Fiscal</h1>
            <p className={`text-sm ${sub}`}>Datos del emisor (FEL SAT Guatemala) y certificador.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${ambientePill.cls}`}>
            {ambientePill.label}
          </span>
          <button
            onClick={save}
            disabled={!dirty || saving}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors"
          >
            {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
            Guardar cambios
          </button>
        </div>
      </div>

      {/* Card: Datos del emisor */}
      <div className={`rounded-xl border ${cardBg} ${cardBrdr} p-5 mb-5`}>
        <div className="flex items-center gap-2 mb-1">
          <Building2 size={18} className="text-blue-500" />
          <h2 className="font-bold">Datos del emisor</h2>
        </div>
        <p className={`text-xs mb-4 ${sub}`}>
          Exactos como aparecen en tu RTU (Registro Tributario Unificado) de SAT. Se imprimen en cada factura.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>NIT del emisor *</label>
            <input
              className={inputCls}
              value={form.nit_emisor || ''}
              onChange={e => setForm({ ...form, nit_emisor: e.target.value })}
              placeholder="1234567-8"
            />
          </div>
          <div>
            <label className={labelCls}>Código de establecimiento</label>
            <input
              type="number"
              min={1}
              className={inputCls}
              value={form.establecimiento_codigo || 1}
              onChange={e => setForm({ ...form, establecimiento_codigo: parseInt(e.target.value) || 1 })}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Razón social *</label>
            <input
              className={inputCls}
              value={form.nombre_fiscal || ''}
              onChange={e => setForm({ ...form, nombre_fiscal: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Nombre comercial</label>
            <input
              className={inputCls}
              value={form.nombre_comercial || ''}
              onChange={e => setForm({ ...form, nombre_comercial: e.target.value })}
              placeholder="(opcional) si es diferente de la razón social"
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Dirección fiscal</label>
            <input
              className={inputCls}
              value={form.direccion_fiscal || ''}
              onChange={e => setForm({ ...form, direccion_fiscal: e.target.value })}
            />
          </div>
          <div>
            <label className={labelCls}>Teléfono</label>
            <input
              className={inputCls}
              value={form.telefono || ''}
              onChange={e => setForm({ ...form, telefono: e.target.value })}
            />
          </div>
          <div>
            <label className={labelCls}>Correo</label>
            <input
              type="email"
              className={inputCls}
              value={form.correo || ''}
              onChange={e => setForm({ ...form, correo: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* Card: Afiliación SAT */}
      <div className={`rounded-xl border ${cardBg} ${cardBrdr} p-5 mb-5`}>
        <div className="flex items-center gap-2 mb-1">
          <Receipt size={18} className="text-blue-500" />
          <h2 className="font-bold">Afiliación ante SAT</h2>
        </div>
        <p className={`text-xs mb-4 ${sub}`}>
          Define la tasa de IVA que se sugerirá al crear nuevas facturas.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Tipo de contribuyente</label>
            <select
              className={inputCls}
              value={form.afiliacion_iva || 'GEN'}
              onChange={e => setForm({ ...form, afiliacion_iva: e.target.value })}
            >
              <option value="GEN">Contribuyente General — IVA 12%</option>
              <option value="PEQ">Pequeño Contribuyente — IVA 5%</option>
            </select>
            <p className={`text-xs mt-1 ${sub}`}>
              Tasa sugerida: <span className="font-bold">{form.afiliacion_iva === 'PEQ' ? '5%' : '12%'}</span>.
              Facturas existentes conservan su tasa.
            </p>
          </div>
          <div>
            <label className={labelCls}>Serie FEL</label>
            <input
              className={inputCls}
              value={form.serie_fel || 'A'}
              onChange={e => setForm({ ...form, serie_fel: e.target.value })}
              placeholder="A"
            />
            <p className={`text-xs mt-1 ${sub}`}>La define el certificador al enrolarte.</p>
          </div>
        </div>
      </div>

      {/* Card: Certificador */}
      <div className={`rounded-xl border ${cardBg} ${cardBrdr} p-5 mb-5`}>
        <div className="flex items-center gap-2 mb-1">
          <ServerCog size={18} className="text-blue-500" />
          <h2 className="font-bold">Proveedor certificador FEL</h2>
        </div>
        <p className={`text-xs mb-4 ${sub}`}>
          Estos datos los usaremos en la siguiente fase para enviar XML a SAT. Mantén el ambiente en{' '}
          <span className="font-bold">PRUEBAS</span> hasta que el certificador confirme.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Ambiente</label>
            <select
              className={inputCls}
              value={form.ambiente || 'PRUEBAS'}
              onChange={e => setForm({ ...form, ambiente: e.target.value })}
            >
              <option value="PRUEBAS">Pruebas (sandbox)</option>
              <option value="PRODUCCION">Producción (facturas reales)</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Certificador</label>
            <select
              className={inputCls}
              value={form.certificador || ''}
              onChange={e => setForm({ ...form, certificador: e.target.value })}
            >
              {CERTIFICADORES.map(c => (
                <option key={c.val} value={c.val}>{c.label}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>URL del API del certificador</label>
            <input
              className={inputCls}
              value={form.certificador_api_url || ''}
              onChange={e => setForm({ ...form, certificador_api_url: e.target.value })}
              placeholder="https://api-pruebas.certificador.com/fel"
            />
          </div>
          <div>
            <label className={labelCls}>Usuario</label>
            <input
              className={inputCls}
              value={form.certificador_usuario || ''}
              onChange={e => setForm({ ...form, certificador_usuario: e.target.value })}
            />
          </div>
          <div>
            <label className={labelCls}>
              <span className="inline-flex items-center gap-1">
                <Lock size={12} /> API key / Token
              </span>
            </label>
            <input
              className={inputCls}
              type="password"
              value={form.certificador_api_key || ''}
              onChange={e => setForm({ ...form, certificador_api_key: e.target.value })}
              placeholder="(sensible — en Fase 4 se cifra)"
            />
          </div>
        </div>
      </div>

      {/* Card: Automatizaciones */}
      <div className={`rounded-xl border ${cardBg} ${cardBrdr} p-5 mb-5`}>
        <div className="flex items-center gap-2 mb-1">
          <BellRing size={18} className="text-amber-500" />
          <h2 className="font-bold">Automatizaciones</h2>
        </div>
        <p className={`text-xs mb-4 ${sub}`}>
          Estas opciones controlan los correos que se envían sin intervención manual.
        </p>

        <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition ${cardBrdr} hover:bg-blue-500/5 mb-3`}>
          <input
            type="checkbox"
            className="mt-1 w-4 h-4 accent-blue-500"
            checked={form.envio_automatico_factura ?? true}
            onChange={e => setForm({ ...form, envio_automatico_factura: e.target.checked })}
          />
          <div className="flex-1">
            <div className="flex items-center gap-2 text-sm font-bold">
              <Mail size={14} className="text-blue-500" />
              Enviar la factura por correo al certificarla
            </div>
            <p className={`text-xs mt-0.5 ${sub}`}>
              Se envía al correo de la empresa (si la factura es a crédito) o al correo del cliente individual.
              Si no hay correo registrado, no se envía ni bloquea la certificación.
            </p>
          </div>
        </label>

        <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition ${cardBrdr} hover:bg-amber-500/5`}>
          <input
            type="checkbox"
            className="mt-1 w-4 h-4 accent-amber-500"
            checked={form.recordatorios_cobro_auto ?? true}
            onChange={e => setForm({ ...form, recordatorios_cobro_auto: e.target.checked })}
          />
          <div className="flex-1">
            <div className="flex items-center gap-2 text-sm font-bold">
              <BellRing size={14} className="text-amber-500" />
              Enviar recordatorios automáticos de cobro a empresas
            </div>
            <p className={`text-xs mt-0.5 ${sub}`}>
              Diariamente a las 08:00 (hora Guatemala) se revisan facturas a crédito con saldo y se envía:
              3 días antes del vencimiento, el día del vencimiento, y cada 7 días después.
              Solo a empresas con <code>recordatorios_activos=true</code>.
            </p>
          </div>
        </label>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 rounded-lg px-4 py-3 text-sm font-semibold shadow-lg border ${
            toast.type === 'error'
              ? 'bg-red-500/90 text-white border-red-400'
              : 'bg-emerald-500/90 text-white border-emerald-400'
          }`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}
