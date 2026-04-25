import React, { useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Printer, Mail, ArrowLeft, Loader2, Receipt, Car, User,
  Wrench, AlertTriangle, CheckCircle2, Banknote, CreditCard,
  ArrowRightLeft, FileText,
} from 'lucide-react';

import { AuthContext } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const GTQ = (v) => {
  const n = Number(v ?? 0);
  return new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' }).format(isFinite(n) ? n : 0);
};

const fmtDate = (d) => {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('es-GT', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch {
    return '—';
  }
};

const METODO_ICON = {
  EFECTIVO: <Banknote size={14} />,
  TARJETA: <CreditCard size={14} />,
  TRANSFERENCIA: <ArrowRightLeft size={14} />,
  OTROS: <Receipt size={14} />,
};

const API_BASE = 'http://localhost:8000/api/v1/facturacion';

// ─── Component ────────────────────────────────────────────────────────────────
export default function FacturaPrintPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { authTokens } = useContext(AuthContext);
  const { isDark } = useTheme();

  const [factura, setFactura] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [resending, setResending] = useState(false);
  const [toast, setToast] = useState(null);

  const headers = useMemo(
    () => (authTokens?.access ? { Authorization: `Bearer ${authTokens.access}` } : {}),
    [authTokens]
  );

  const fetchFactura = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${API_BASE}/${id}/`, { headers });
      setFactura(res.data);
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.detail ||
        err.message ||
        'No se pudo cargar la factura.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [id, headers]);

  useEffect(() => {
    fetchFactura();
  }, [fetchFactura]);

  const handlePrint = () => window.print();

  const handleReenviar = async () => {
    if (!factura) return;
    setResending(true);
    setToast(null);
    try {
      const res = await axios.post(`${API_BASE}/${factura.id}/reenviar-correo/`, {}, { headers });
      setToast({ tipo: 'ok', msg: res.data?.mensaje || 'Factura reenviada al correo.' });
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.detail ||
        err.message ||
        'Error al reenviar la factura.';
      setToast({ tipo: 'err', msg });
    } finally {
      setResending(false);
      setTimeout(() => setToast(null), 6000);
    }
  };

  // ── Estilos dependientes del tema (fuera de área imprimible) ──
  const pageBg = isDark ? 'bg-slate-950' : 'bg-slate-100';
  const cardBg = isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200';
  const sub = isDark ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className={`min-h-full ${pageBg} -m-4 sm:-m-6 lg:-m-8 p-4 sm:p-6 lg:p-8`}>
      <style>{`
        /* Estilos solo para impresión: oculta la UI de la app y el chrome del navegador */
        @media print {
          html, body { background: #fff !important; }
          body * { visibility: hidden !important; }
          #factura-printable, #factura-printable * { visibility: visible !important; }
          #factura-printable {
            position: absolute !important;
            left: 0; top: 0;
            width: 100%;
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
            background: #fff !important;
          }
          .no-print { display: none !important; }
          @page { size: A4; margin: 16mm; }
        }
      `}</style>

      {/* ── Botonera (no se imprime) ───────────────────────────── */}
      <div className="no-print max-w-[820px] mx-auto mb-5 flex flex-wrap items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold border transition-colors ${
            isDark
              ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
              : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <ArrowLeft size={15} />
          Volver
        </button>

        <div className="flex-1" />

        <button
          type="button"
          onClick={handleReenviar}
          disabled={resending || !factura}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg text-sm font-bold transition-colors shadow-sm"
        >
          {resending ? <Loader2 size={15} className="animate-spin" /> : <Mail size={15} />}
          Re-enviar por correo
        </button>

        <button
          type="button"
          onClick={handlePrint}
          disabled={!factura}
          className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white rounded-lg text-sm font-bold transition-colors shadow-sm"
        >
          <Printer size={15} />
          Imprimir / Descargar PDF
        </button>
      </div>

      {/* ── Toast ─────────────────────────────────────────────── */}
      {toast && (
        <div
          className={`no-print max-w-[820px] mx-auto mb-4 px-4 py-3 rounded-lg text-sm font-semibold flex items-center gap-2 ${
            toast.tipo === 'ok'
              ? isDark
                ? 'bg-emerald-900/40 border border-emerald-700 text-emerald-200'
                : 'bg-emerald-100 border border-emerald-300 text-emerald-800'
              : isDark
                ? 'bg-red-900/40 border border-red-700 text-red-200'
                : 'bg-red-100 border border-red-300 text-red-800'
          }`}
        >
          {toast.tipo === 'ok' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          {toast.msg}
        </div>
      )}

      {/* ── Estado: cargando ─────────────────────────────────── */}
      {loading && (
        <div className={`no-print max-w-[820px] mx-auto p-8 rounded-xl border ${cardBg} flex items-center justify-center gap-2 ${sub}`}>
          <Loader2 size={18} className="animate-spin" />
          <span>Cargando factura...</span>
        </div>
      )}

      {/* ── Estado: error ────────────────────────────────────── */}
      {!loading && error && (
        <div className={`no-print max-w-[820px] mx-auto p-6 rounded-xl border ${isDark ? 'bg-red-900/30 border-red-700 text-red-200' : 'bg-red-50 border-red-200 text-red-800'}`}>
          <div className="flex items-start gap-2">
            <AlertTriangle size={18} className="mt-0.5" />
            <div>
              <p className="font-bold mb-1">No se pudo cargar la factura</p>
              <p className="text-sm opacity-90">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Alerta si la orden no está LISTO/ENTREGADO ──────── */}
      {!loading && factura && factura.orden?.estado && !['LISTO', 'ENTREGADO'].includes(factura.orden.estado) && (
        <div className={`no-print max-w-[820px] mx-auto mb-4 px-4 py-3 rounded-lg text-sm font-semibold flex items-center gap-2 ${
          isDark ? 'bg-amber-900/30 border border-amber-700 text-amber-200' : 'bg-amber-50 border border-amber-300 text-amber-800'
        }`}>
          <AlertTriangle size={16} />
          Alerta operativa: estás viendo una factura cuya orden aún no está marcada como LISTA.
        </div>
      )}

      {/* ── Factura imprimible ───────────────────────────────── */}
      {!loading && factura && (
        <div
          id="factura-printable"
          className={`max-w-[820px] mx-auto rounded-xl border shadow-lg overflow-hidden ${cardBg}`}
          style={{ colorScheme: 'light' }}
        >
          <div className="p-6 sm:p-10 bg-white text-slate-900">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 border-b-2 border-slate-100 pb-6 mb-8">
              <div>
                <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 uppercase" style={{ fontFamily: "'Oswald', sans-serif" }}>
                  {factura.taller?.nombre?.split(' ')[0] || 'AutoServi'}
                  <span className="text-orange-500 ml-1">
                    {factura.taller?.nombre?.split(' ').slice(1).join(' ') || 'Pro'}
                  </span>
                </h1>
                <div className="text-sm text-slate-500 mt-2 leading-relaxed">
                  {factura.taller?.direccion}<br />
                  Tel: {factura.taller?.telefono}<br />
                  NIT: {factura.taller?.nit}
                </div>
              </div>
              <div className="text-left sm:text-right">
                <div className="text-2xl font-bold text-orange-500 uppercase" style={{ fontFamily: "'Oswald', sans-serif" }}>
                  Comprobante
                </div>
                <div className="text-lg font-black text-slate-900 mt-1 font-mono">
                  {factura.numero_factura || <span className="italic text-slate-400 font-sans">Borrador</span>}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Fecha: {fmtDate(factura.fecha_emision)}
                </div>
                <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide bg-slate-100 text-slate-700">
                  <FileText size={12} />
                  {factura.estado_display || factura.estado}
                </div>
              </div>
            </div>

            {/* Info cliente/vehículo */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8 bg-slate-50 rounded-lg p-5 border border-slate-200">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
                  <User size={12} /> Facturado a
                </div>
                <div className="text-base font-bold text-slate-900">
                  {factura.cliente?.nombre || '—'}
                </div>
                {factura.cliente?.email && (
                  <div className="text-sm text-slate-600 mt-0.5">{factura.cliente.email}</div>
                )}
                {factura.cliente?.telefono && (
                  <div className="text-sm text-slate-600">{factura.cliente.telefono}</div>
                )}
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
                  <Car size={12} /> Vehículo atendido
                </div>
                <div className="text-base font-bold text-slate-900">
                  {[factura.vehiculo?.marca, factura.vehiculo?.modelo].filter(Boolean).join(' ') || '—'}
                  {factura.vehiculo?.anio && (
                    <span className="text-slate-400 font-normal ml-1">({factura.vehiculo.anio})</span>
                  )}
                </div>
                {factura.vehiculo?.placa && (
                  <div className="text-sm text-slate-600 mt-0.5">
                    Placa:{' '}
                    <span className="font-mono font-bold text-slate-900">
                      {factura.vehiculo.placa.toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Items */}
            <div className="mb-6 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 uppercase text-xs">
                    <th className="text-left px-3 py-2.5 font-bold">Descripción</th>
                    <th className="text-right px-3 py-2.5 font-bold">P. Unit. (Q)</th>
                    <th className="text-right px-3 py-2.5 font-bold">Subtotal (Q)</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Mano de obra */}
                  <tr className="border-b border-slate-100">
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <Wrench size={14} className="text-orange-500 shrink-0" />
                        <div>
                          <div className="font-bold text-slate-900">{factura.servicio?.nombre || 'Servicio'}</div>
                          <div className="text-xs text-slate-500 mt-0.5">Servicio principal / mano de obra</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {Number(factura.costo_mano_obra || 0).toFixed(2)}
                    </td>
                    <td className="px-3 py-3 text-right font-semibold tabular-nums">
                      {Number(factura.costo_mano_obra || 0).toFixed(2)}
                    </td>
                  </tr>

                  {/* Repuestos */}
                  {factura.repuestos?.map((r) => (
                    <tr key={r.id} className="border-b border-slate-100">
                      <td className="px-3 py-3">
                        <span className="font-semibold text-slate-900 mr-1">{r.cantidad}x</span>
                        <span className="text-slate-700">{r.producto_nombre}</span>
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums">
                        {Number(r.precio_unitario).toFixed(2)}
                      </td>
                      <td className="px-3 py-3 text-right font-semibold tabular-nums">
                        {Number(r.subtotal).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totales */}
            <div className="flex justify-end">
              <div className="w-full sm:w-80 space-y-2">
                <div className="flex justify-between text-sm text-slate-600">
                  <span>Subtotal general</span>
                  <span className="tabular-nums">{GTQ(factura.subtotal)}</span>
                </div>
                {Number(factura.descuento) > 0 && (
                  <div className="flex justify-between text-sm text-emerald-600 font-semibold">
                    <span>Descuento aplicado</span>
                    <span className="tabular-nums">- {GTQ(factura.descuento)}</span>
                  </div>
                )}
                <div className="flex justify-between items-baseline border-t-2 border-slate-200 pt-3 mt-1">
                  <span className="text-base font-bold text-slate-900 uppercase tracking-wide" style={{ fontFamily: "'Oswald', sans-serif" }}>
                    Total a pagar
                  </span>
                  <span className="text-2xl font-black text-slate-900 tabular-nums" style={{ fontFamily: "'Oswald', sans-serif" }}>
                    {GTQ(factura.total_general)}
                  </span>
                </div>

                {factura.metodo_pago_display && (
                  <div className="flex justify-end pt-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {METODO_ICON[factura.metodo_pago] || <Receipt size={13} />}
                      Método: {factura.metodo_pago_display}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Notas */}
            {factura.notas_internas && (
              <div className="mt-8 pt-5 border-t border-dashed border-slate-200 text-sm text-slate-600">
                <div className="font-bold text-slate-700 mb-1">Notas:</div>
                <p className="whitespace-pre-wrap">{factura.notas_internas}</p>
              </div>
            )}

            {/* Footer */}
            <div className="mt-10 pt-5 border-t border-slate-100 text-center text-xs text-slate-400">
              Gracias por confiar en {factura.taller?.nombre || 'AutoServi Pro'}.{' '}
              Esta es una representación impresa de la factura electrónica.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
