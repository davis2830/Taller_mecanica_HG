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

  // ── Paleta (sigue el tema de la app en pantalla; al imprimir todo se fuerza a blanco/negro) ──
  const p = isDark
    ? {
      pageBg:        'bg-slate-950',
      cardBg:        'bg-slate-900',
      cardBorder:    'border-slate-800',
      surfaceAlt:    'bg-slate-800/60',
      surfaceAltBrd: 'border-slate-700',
      divider:       'border-slate-700',
      dividerSoft:   'border-slate-800',
      dividerDashed: 'border-dashed border-slate-700',
      textStrong:    'text-slate-50',
      text:          'text-slate-100',
      textMuted:     'text-slate-300',
      textSubtle:    'text-slate-400',
      textFaint:     'text-slate-500',
      tableHeadBg:   'bg-slate-800/80',
      tableHeadText: 'text-slate-300',
      statePill:     'bg-slate-800 text-slate-200 border border-slate-700',
      methodPill:    'bg-emerald-900/40 text-emerald-300 border border-emerald-700/50',
    }
    : {
      pageBg:        'bg-slate-100',
      cardBg:        'bg-white',
      cardBorder:    'border-slate-200',
      surfaceAlt:    'bg-slate-50',
      surfaceAltBrd: 'border-slate-200',
      divider:       'border-slate-200',
      dividerSoft:   'border-slate-100',
      dividerDashed: 'border-dashed border-slate-200',
      textStrong:    'text-slate-900',
      text:          'text-slate-900',
      textMuted:     'text-slate-700',
      textSubtle:    'text-slate-600',
      textFaint:     'text-slate-500',
      tableHeadBg:   'bg-slate-100',
      tableHeadText: 'text-slate-600',
      statePill:     'bg-slate-100 text-slate-700 border border-slate-200',
      methodPill:    'bg-emerald-50 text-emerald-700 border border-emerald-200',
    };

  return (
    <div className={`min-h-full ${p.pageBg} -m-4 sm:-m-6 lg:-m-8 p-4 sm:p-6 lg:p-8`}>
      <style>{`
        /* Solo al imprimir: oculta UI de la app y fuerza colores claros en la factura
           (una factura en papel no puede salir con fondo negro). */
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
            color: #0f172a !important;
          }
          /* Fondo blanco en todo el contenido (sin matar acentos naranja/verde/azul) */
          #factura-printable,
          #factura-printable .factura-surface,
          #factura-printable .factura-subsurface,
          #factura-printable .factura-table-head,
          #factura-printable .factura-pill {
            background: #fff !important;
          }
          #factura-printable .factura-subsurface,
          #factura-printable .factura-table-head {
            background: #f8fafc !important;
          }
          /* Texto oscuro en todo excepto los acentos (que llevan su propio color en hex) */
          #factura-printable .factura-text,
          #factura-printable .factura-text-strong { color: #0f172a !important; }
          #factura-printable .factura-text-muted  { color: #334155 !important; }
          #factura-printable .factura-text-subtle { color: #475569 !important; }
          #factura-printable .factura-text-faint  { color: #64748b !important; }
          #factura-printable .factura-divider,
          #factura-printable .factura-divider-soft,
          #factura-printable .factura-subsurface { border-color: #e2e8f0 !important; }
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
        <div className={`no-print max-w-[820px] mx-auto p-8 rounded-xl border ${p.cardBg} ${p.cardBorder} flex items-center justify-center gap-2 ${p.textSubtle}`}>
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

      {/* ── Factura (tema vivo en pantalla, blanco en impresión) ── */}
      {!loading && factura && (
        <div
          id="factura-printable"
          className={`factura-surface max-w-[820px] mx-auto rounded-xl border shadow-lg overflow-hidden ${p.cardBg} ${p.cardBorder}`}
        >
          <div className={`p-6 sm:p-10 ${p.cardBg} factura-surface factura-text ${p.text}`}>
            {/* Header */}
            <div className={`flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 border-b-2 pb-6 mb-8 factura-divider-soft ${p.dividerSoft}`}>
              <div>
                <h1 className={`text-3xl sm:text-4xl font-black tracking-tight uppercase factura-text-strong ${p.textStrong}`} style={{ fontFamily: "'Oswald', sans-serif" }}>
                  {factura.taller?.nombre?.split(' ')[0] || 'AutoServi'}
                  <span className="text-orange-500 ml-1" style={{ color: '#f97316' }}>
                    {factura.taller?.nombre?.split(' ').slice(1).join(' ') || 'Pro'}
                  </span>
                </h1>
                <div className={`text-sm mt-2 leading-relaxed factura-text-faint ${p.textFaint}`}>
                  {factura.taller?.direccion}<br />
                  Tel: {factura.taller?.telefono}<br />
                  NIT: {factura.taller?.nit}
                </div>
              </div>
              <div className="text-left sm:text-right">
                <div className="text-2xl font-bold uppercase" style={{ fontFamily: "'Oswald', sans-serif", color: '#f97316' }}>
                  Comprobante
                </div>
                <div className={`text-lg font-black mt-1 font-mono factura-text-strong ${p.textStrong}`}>
                  {factura.numero_factura || <span className={`italic font-sans factura-text-faint ${p.textFaint}`}>Borrador</span>}
                </div>
                <div className={`text-xs mt-1 factura-text-faint ${p.textFaint}`}>
                  Fecha: {fmtDate(factura.fecha_emision)}
                </div>
                <div className={`factura-pill mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${p.statePill}`}>
                  <FileText size={12} />
                  {factura.estado_display || factura.estado}
                </div>
              </div>
            </div>

            {/* Info cliente/vehículo */}
            <div className={`factura-subsurface grid grid-cols-1 md:grid-cols-2 gap-5 mb-8 rounded-lg p-5 border ${p.surfaceAlt} ${p.surfaceAltBrd}`}>
              <div>
                <div className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide mb-1 factura-text-subtle ${p.textSubtle}`}>
                  <User size={12} /> Facturado a
                </div>
                <div className={`text-base font-bold factura-text-strong ${p.textStrong}`}>
                  {factura.cliente?.nombre || '—'}
                </div>
                {factura.cliente?.email && (
                  <div className={`text-sm mt-0.5 factura-text-muted ${p.textMuted}`}>{factura.cliente.email}</div>
                )}
                {factura.cliente?.telefono && (
                  <div className={`text-sm factura-text-muted ${p.textMuted}`}>{factura.cliente.telefono}</div>
                )}
              </div>
              <div>
                <div className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide mb-1 factura-text-subtle ${p.textSubtle}`}>
                  <Car size={12} /> Vehículo atendido
                </div>
                <div className={`text-base font-bold factura-text-strong ${p.textStrong}`}>
                  {[factura.vehiculo?.marca, factura.vehiculo?.modelo].filter(Boolean).join(' ') || '—'}
                  {factura.vehiculo?.anio && (
                    <span className={`font-normal ml-1 factura-text-faint ${p.textFaint}`}>({factura.vehiculo.anio})</span>
                  )}
                </div>
                {factura.vehiculo?.placa && (
                  <div className={`text-sm mt-0.5 factura-text-muted ${p.textMuted}`}>
                    Placa:{' '}
                    <span className={`font-mono font-bold factura-text-strong ${p.textStrong}`}>
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
                  <tr className={`factura-table-head uppercase text-xs ${p.tableHeadBg} ${p.tableHeadText}`}>
                    <th className="text-left px-3 py-2.5 font-bold">Descripción</th>
                    <th className="text-right px-3 py-2.5 font-bold">P. Unit. (Q)</th>
                    <th className="text-right px-3 py-2.5 font-bold">Subtotal (Q)</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Mano de obra */}
                  <tr className={`border-b factura-divider-soft ${p.dividerSoft}`}>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <Wrench size={14} className="shrink-0" style={{ color: '#f97316' }} />
                        <div>
                          <div className={`font-bold factura-text-strong ${p.textStrong}`}>{factura.servicio?.nombre || 'Servicio'}</div>
                          <div className={`text-xs mt-0.5 factura-text-faint ${p.textFaint}`}>Servicio principal / mano de obra</div>
                        </div>
                      </div>
                    </td>
                    <td className={`px-3 py-3 text-right tabular-nums factura-text ${p.text}`}>
                      {Number(factura.costo_mano_obra || 0).toFixed(2)}
                    </td>
                    <td className={`px-3 py-3 text-right font-semibold tabular-nums factura-text-strong ${p.textStrong}`}>
                      {Number(factura.costo_mano_obra || 0).toFixed(2)}
                    </td>
                  </tr>

                  {/* Repuestos */}
                  {factura.repuestos?.map((r) => (
                    <tr key={r.id} className={`border-b factura-divider-soft ${p.dividerSoft}`}>
                      <td className="px-3 py-3">
                        <span className={`font-semibold mr-1 factura-text-strong ${p.textStrong}`}>{r.cantidad}x</span>
                        <span className={`factura-text-muted ${p.textMuted}`}>{r.producto_nombre}</span>
                      </td>
                      <td className={`px-3 py-3 text-right tabular-nums factura-text ${p.text}`}>
                        {Number(r.precio_unitario).toFixed(2)}
                      </td>
                      <td className={`px-3 py-3 text-right font-semibold tabular-nums factura-text-strong ${p.textStrong}`}>
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
                <div className={`flex justify-between text-sm factura-text-subtle ${p.textSubtle}`}>
                  <span>Subtotal general</span>
                  <span className="tabular-nums">{GTQ(factura.subtotal)}</span>
                </div>
                {Number(factura.descuento) > 0 && (
                  <div className="flex justify-between text-sm font-semibold" style={{ color: '#059669' }}>
                    <span>Descuento aplicado</span>
                    <span className="tabular-nums">- {GTQ(factura.descuento)}</span>
                  </div>
                )}
                <div className={`flex justify-between items-baseline border-t-2 pt-3 mt-1 factura-divider ${p.divider}`}>
                  <span className={`text-base font-bold uppercase tracking-wide factura-text-strong ${p.textStrong}`} style={{ fontFamily: "'Oswald', sans-serif" }}>
                    Total a pagar
                  </span>
                  <span className={`text-2xl font-black tabular-nums factura-text-strong ${p.textStrong}`} style={{ fontFamily: "'Oswald', sans-serif" }}>
                    {GTQ(factura.total_general)}
                  </span>
                </div>

                {factura.metodo_pago_display && (
                  <div className="flex justify-end pt-2">
                    <span className={`factura-pill inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${p.methodPill}`}>
                      {METODO_ICON[factura.metodo_pago] || <Receipt size={13} />}
                      Método: {factura.metodo_pago_display}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Notas */}
            {factura.notas_internas && (
              <div className={`mt-8 pt-5 border-t factura-divider-soft ${p.dividerDashed} text-sm factura-text-subtle ${p.textSubtle}`}>
                <div className={`font-bold mb-1 factura-text-muted ${p.textMuted}`}>Notas:</div>
                <p className="whitespace-pre-wrap">{factura.notas_internas}</p>
              </div>
            )}

            {/* Footer */}
            <div className={`mt-10 pt-5 border-t text-center text-xs factura-divider-soft ${p.dividerSoft} ${p.textFaint} factura-text-faint`}>
              Gracias por confiar en {factura.taller?.nombre || 'AutoServi Pro'}.{' '}
              Esta es una representación impresa de la factura electrónica.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
