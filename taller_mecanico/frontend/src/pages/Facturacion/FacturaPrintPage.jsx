import React, { useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Printer, Mail, ArrowLeft, Loader2, Receipt, Car, User,
  Wrench, AlertTriangle, CheckCircle2, Banknote, CreditCard,
  ArrowRightLeft, FileText, ShieldCheck, ShieldOff, Ban, Download,
  Building2, DollarSign, Calendar, Trash2,
} from 'lucide-react';

import { AuthContext } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import AsignarCreditoModal from '../../components/AsignarCreditoModal';
import RegistrarPagoModal from '../../components/RegistrarPagoModal';

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
  const { authTokens, user } = useContext(AuthContext);
  const { isDark } = useTheme();
  const isSuperAdmin = !!user?.is_superuser;

  const [factura, setFactura] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [resending, setResending] = useState(false);
  const [certifying, setCertifying] = useState(false);
  const [annulling, setAnnulling] = useState(false);
  const [toast, setToast] = useState(null);
  const [pagos, setPagos] = useState([]);
  const [modalCredito, setModalCredito] = useState(false);
  const [modalPago, setModalPago] = useState(false);

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

  const fetchPagos = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/${id}/pagos/`, { headers });
      setPagos(res.data?.pagos || []);
    } catch (err) {
      // Silencioso: si no es CREDITO no hay pagos.
      setPagos([]);
    }
  }, [id, headers]);

  useEffect(() => {
    fetchFactura();
  }, [fetchFactura]);

  useEffect(() => {
    if (factura?.condicion_pago === 'CREDITO') {
      fetchPagos();
    }
  }, [factura?.condicion_pago, fetchPagos]);

  const handleEliminarPago = async (pagoId) => {
    if (!isSuperAdmin) return;
    if (!window.confirm('¿Eliminar este pago? Esta acción no se puede deshacer y recalculará el estado de la factura.')) return;
    try {
      await axios.delete(`${API_BASE}/pagos/${pagoId}/`, { headers });
      setToast({ tipo: 'ok', msg: 'Pago eliminado correctamente.' });
      await fetchFactura();
      await fetchPagos();
    } catch (err) {
      setToast({ tipo: 'err', msg: err.response?.data?.error || err.message || 'Error eliminando pago.' });
    }
    setTimeout(() => setToast(null), 6000);
  };

  const handlePrint = () => window.print();

  const handleCertificar = async () => {
    if (!factura) return;
    if (!window.confirm(
      '¿Certificar este documento ante SAT?\n\n' +
      'Se generará el XML DTE y se enviará al certificador configurado.'
    )) return;
    setCertifying(true);
    setToast(null);
    try {
      const res = await axios.post(`${API_BASE}/${factura.id}/certificar/`, { tipo_dte: 'FACT' }, { headers });
      const dte = res.data?.dte;
      setToast({
        tipo: 'ok',
        msg: `DTE certificado. ${dte?.serie_numero ? `Serie-Número: ${dte.serie_numero}.` : ''} UUID: ${dte?.uuid_sat || '—'}`,
      });
      await fetchFactura();
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Error certificando el DTE.';
      setToast({ tipo: 'err', msg });
    } finally {
      setCertifying(false);
      setTimeout(() => setToast(null), 8000);
    }
  };

  const handleAnular = async () => {
    if (!factura) return;
    const motivo = window.prompt('Motivo de la anulación (obligatorio para SAT):');
    if (!motivo || !motivo.trim()) return;
    setAnnulling(true);
    setToast(null);
    try {
      await axios.post(`${API_BASE}/${factura.id}/anular/`, { motivo: motivo.trim() }, { headers });
      setToast({ tipo: 'ok', msg: 'DTE anulado correctamente ante SAT.' });
      await fetchFactura();
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Error anulando el DTE.';
      setToast({ tipo: 'err', msg });
    } finally {
      setAnnulling(false);
      setTimeout(() => setToast(null), 8000);
    }
  };

  const handleDescargarXML = (docId, tipo = 'certificado') => {
    if (!docId) return;
    const url = `${API_BASE}/documentos/${docId}/xml/?tipo=${tipo}`;
    // Abre el endpoint (requiere token; si no, la sesión no lo descargará).
    // Como axios con blob sería más limpio, lo implementamos así para simple:
    fetch(url, { headers })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.blob().then((blob) => ({ blob, filename: r.headers.get('Content-Disposition') }));
      })
      .then(({ blob, filename }) => {
        const href = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = href;
        const match = /filename="([^"]+)"/.exec(filename || '');
        a.download = match ? match[1] : `dte-${docId}-${tipo}.xml`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(href);
      })
      .catch((err) => setToast({ tipo: 'err', msg: `No se pudo descargar el XML: ${err.message}` }));
  };

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

        {factura?.dte?.estado !== 'CERTIFICADO' && factura?.estado !== 'ANULADA' && (
          <button
            type="button"
            onClick={handleCertificar}
            disabled={certifying || !factura}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-lg text-sm font-bold transition-colors shadow-sm"
            title="Genera el XML DTE y lo envía al certificador configurado."
          >
            {certifying ? <Loader2 size={15} className="animate-spin" /> : <ShieldCheck size={15} />}
            Certificar con SAT
          </button>
        )}

        {factura?.dte?.estado === 'CERTIFICADO' && (
          <button
            type="button"
            onClick={handleAnular}
            disabled={annulling || !factura}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white rounded-lg text-sm font-bold transition-colors shadow-sm"
          >
            {annulling ? <Loader2 size={15} className="animate-spin" /> : <Ban size={15} />}
            Anular DTE
          </button>
        )}

        {/* CxC: Asignar a Crédito (cuando es CONTADO + no anulada) */}
        {factura?.condicion_pago === 'CONTADO' && factura?.estado !== 'ANULADA' && (
          <button
            type="button"
            onClick={() => setModalCredito(true)}
            disabled={!factura}
            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white rounded-lg text-sm font-bold transition-colors shadow-sm"
            title="Convertir esta factura a crédito B2B con plazo de pago."
          >
            <CreditCard size={15} />
            Asignar a Crédito
          </button>
        )}

        {/* CxC: Registrar Pago (cuando es CREDITO + saldo > 0) */}
        {factura?.condicion_pago === 'CREDITO' && Number(factura?.saldo_pendiente ?? 0) > 0 && factura?.estado !== 'ANULADA' && (
          <button
            type="button"
            onClick={() => setModalPago(true)}
            disabled={!factura}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-lg text-sm font-bold transition-colors shadow-sm"
            title="Registrar pago parcial o total."
          >
            <DollarSign size={15} />
            Registrar Pago
          </button>
        )}

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
                {factura.taller?.ambiente === 'PRUEBAS' && (
                  <div
                    className="factura-pill mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide bg-amber-500/15 text-amber-600 border border-amber-500/30"
                    title="Ambiente de pruebas — no tiene validez fiscal ante SAT."
                  >
                    <AlertTriangle size={12} />
                    Ambiente de pruebas
                  </div>
                )}
                {factura.dte?.estado === 'CERTIFICADO' && (
                  <div
                    className="factura-pill mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide bg-emerald-500/15 text-emerald-600 border border-emerald-500/30"
                    title={`UUID SAT: ${factura.dte.uuid_sat}`}
                  >
                    <ShieldCheck size={12} />
                    DTE Certificado
                  </div>
                )}
                {factura.dte?.estado === 'ANULADO' && (
                  <div className="factura-pill mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide bg-red-500/15 text-red-600 border border-red-500/30">
                    <ShieldOff size={12} />
                    DTE Anulado
                  </div>
                )}
              </div>
            </div>

            {/* Flujo del trabajo: Cita → Recepción → OT → Factura */}
            <div className="mb-6 flex flex-wrap items-center gap-2 no-print-dim">
              <span className={`text-xs font-bold uppercase tracking-wide mr-1 factura-text-subtle ${p.textSubtle}`}>
                Flujo
              </span>
              <span className={`factura-pill inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono font-semibold border ${p.statePill}`}>
                Cita #{factura.cita_id ?? '—'}
              </span>
              <span className={`factura-text-faint ${p.textFaint}`}>›</span>
              {factura.recepcion ? (
                <span className={`factura-pill inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono font-semibold border ${p.methodPill}`}>
                  Recepción #{String(factura.recepcion.id).padStart(5, '0')}
                </span>
              ) : (
                <span className={`factura-pill inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono font-semibold border ${p.statePill}`} title="Esta OT no tuvo recepción registrada">
                  Sin recepción
                </span>
              )}
              <span className={`factura-text-faint ${p.textFaint}`}>›</span>
              <span className={`factura-pill inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono font-semibold border ${p.statePill}`}>
                OT #{String(factura.orden?.id ?? 0).padStart(5, '0')}
              </span>
              <span className={`factura-text-faint ${p.textFaint}`}>›</span>
              <span className={`factura-pill inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono font-semibold border ${p.statePill}`}>
                {factura.numero_factura || 'Borrador'}
              </span>
              {factura.dte?.serie_numero && (
                <>
                  <span className={`factura-text-faint ${p.textFaint}`}>›</span>
                  <span
                    className={`factura-pill inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono font-semibold border ${
                      factura.dte.estado === 'ANULADO'
                        ? 'bg-red-500/15 text-red-600 border-red-500/30'
                        : 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30'
                    }`}
                    title={`UUID SAT: ${factura.dte.uuid_sat}`}
                  >
                    DTE {factura.dte.serie_numero}
                  </span>
                </>
              )}
            </div>

            {/* Panel DTE: UUID, XML, estado */}
            {factura.dte && (
              <div
                className={`no-print-dim mb-6 rounded-lg p-4 border text-sm ${p.surfaceAlt} ${p.surfaceAltBrd}`}
              >
                <div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wide mb-2 factura-text-subtle ${p.textSubtle}`}>
                  {factura.dte.estado === 'CERTIFICADO' ? (
                    <ShieldCheck size={14} className="text-emerald-500" />
                  ) : factura.dte.estado === 'ANULADO' ? (
                    <ShieldOff size={14} className="text-red-500" />
                  ) : (
                    <AlertTriangle size={14} className="text-amber-500" />
                  )}
                  Documento Tributario Electrónico ({factura.dte.tipo_dte_display})
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                  <div>
                    <span className={`factura-text-faint ${p.textFaint}`}>Estado: </span>
                    <span className={`font-bold factura-text-strong ${p.textStrong}`}>{factura.dte.estado_display}</span>
                  </div>
                  {factura.dte.serie_numero && (
                    <div>
                      <span className={`factura-text-faint ${p.textFaint}`}>Serie-Número: </span>
                      <span className={`font-mono factura-text-strong ${p.textStrong}`}>{factura.dte.serie_numero}</span>
                    </div>
                  )}
                  {factura.dte.uuid_sat && (
                    <div className="sm:col-span-2 truncate">
                      <span className={`factura-text-faint ${p.textFaint}`}>UUID SAT: </span>
                      <span className={`font-mono text-xs factura-text-strong ${p.textStrong}`}>{factura.dte.uuid_sat}</span>
                    </div>
                  )}
                  {factura.dte.certificador_usado && (
                    <div>
                      <span className={`factura-text-faint ${p.textFaint}`}>Certificador: </span>
                      <span className={`factura-text-strong ${p.textStrong}`}>{factura.dte.certificador_usado}</span>
                    </div>
                  )}
                  <div>
                    <span className={`factura-text-faint ${p.textFaint}`}>Ambiente: </span>
                    <span className={`factura-text-strong ${p.textStrong}`}>{factura.dte.ambiente}</span>
                  </div>
                  {factura.dte.errores && (
                    <div className="sm:col-span-2 text-red-500">
                      <span className="font-bold">Errores: </span>
                      {factura.dte.errores}
                    </div>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap gap-2 no-print">
                  {factura.dte.tiene_xml_certificado && (
                    <button
                      type="button"
                      onClick={() => handleDescargarXML(factura.dte.id, 'certificado')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 transition-colors"
                    >
                      <Download size={12} />
                      XML Certificado
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDescargarXML(factura.dte.id, 'generado')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border ${
                      isDark ? 'border-slate-600 bg-slate-800 text-slate-200 hover:bg-slate-700' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Download size={12} />
                    XML Generado
                  </button>
                </div>
              </div>
            )}

            {/* Panel CxC: condición de pago, vencimiento, saldo, pagos */}
            {factura.condicion_pago === 'CREDITO' && (
              <CxcPanel
                factura={factura}
                pagos={pagos}
                isDark={isDark}
                p={p}
                isSuperAdmin={isSuperAdmin}
                onEliminarPago={handleEliminarPago}
              />
            )}

            {/* Info cliente/vehículo */}
            <div className={`factura-subsurface grid grid-cols-1 md:grid-cols-2 gap-5 mb-8 rounded-lg p-5 border ${p.surfaceAlt} ${p.surfaceAltBrd}`}>
              <div>
                <div className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide mb-1 factura-text-subtle ${p.textSubtle}`}>
                  {factura.empresa ? <Building2 size={12} /> : <User size={12} />} Facturado a
                </div>
                {factura.empresa ? (
                  <>
                    <div className={`text-base font-bold factura-text-strong ${p.textStrong}`}>
                      {factura.empresa.razon_social}
                    </div>
                    <div className={`text-sm mt-0.5 factura-text-muted ${p.textMuted}`}>
                      NIT: <span className={`font-mono font-bold factura-text-strong ${p.textStrong}`}>{factura.empresa.nit}</span>
                    </div>
                    {factura.empresa.direccion_fiscal && (
                      <div className={`text-sm factura-text-muted ${p.textMuted}`}>{factura.empresa.direccion_fiscal}</div>
                    )}
                    {factura.empresa.email_cobro && (
                      <div className={`text-sm factura-text-muted ${p.textMuted}`}>{factura.empresa.email_cobro}</div>
                    )}
                    <div className={`text-xs mt-1 factura-text-faint ${p.textFaint}`}>
                      A nombre de: {factura.cliente?.nombre || '—'}
                    </div>
                  </>
                ) : (
                  <>
                <div className={`text-base font-bold factura-text-strong ${p.textStrong}`}>
                  {factura.cliente?.nombre_fiscal || factura.cliente?.nombre || '—'}
                </div>
                {factura.cliente?.nit && (
                  <div className={`text-sm mt-0.5 factura-text-muted ${p.textMuted}`}>
                    NIT:{' '}
                    <span className={`font-mono font-bold factura-text-strong ${p.textStrong}`}>
                      {factura.cliente.nit}
                    </span>
                  </div>
                )}
                {factura.cliente?.direccion_fiscal && factura.cliente.direccion_fiscal !== 'Ciudad' && (
                  <div className={`text-sm factura-text-muted ${p.textMuted}`}>{factura.cliente.direccion_fiscal}</div>
                )}
                {factura.cliente?.email && (
                  <div className={`text-sm factura-text-muted ${p.textMuted}`}>{factura.cliente.email}</div>
                )}
                {factura.cliente?.telefono && (
                  <div className={`text-sm factura-text-muted ${p.textMuted}`}>{factura.cliente.telefono}</div>
                )}
                  </>
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
                {Number(factura.descuento) > 0 && (
                  <div className="flex justify-between text-sm font-semibold" style={{ color: '#059669' }}>
                    <span>Descuento aplicado</span>
                    <span className="tabular-nums">- {GTQ(factura.descuento)}</span>
                  </div>
                )}
                <div className={`flex justify-between text-sm factura-text-subtle ${p.textSubtle}`}>
                  <span>Subtotal (sin IVA)</span>
                  <span className="tabular-nums">{GTQ(factura.total_sin_iva)}</span>
                </div>
                <div className={`flex justify-between text-sm factura-text-subtle ${p.textSubtle}`}>
                  <span>
                    IVA {Number(factura.tasa_iva_pct ?? 12).toFixed(0)}%
                    {factura.iva_incluido ? ' (incluido)' : ''}
                  </span>
                  <span className="tabular-nums">{GTQ(factura.monto_iva)}</span>
                </div>
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

      {/* Modales CxC */}
      <AsignarCreditoModal
        isOpen={modalCredito}
        onClose={() => setModalCredito(false)}
        factura={factura}
        onSaved={(data) => {
          setToast({
            tipo: 'ok',
            msg: data.override_aplicado
              ? `Override aprobado. Factura asignada a crédito (${data.dias_credito}d).`
              : `Factura asignada a crédito (${data.dias_credito}d). Vence ${data.fecha_vencimiento || '—'}.`,
          });
          setTimeout(() => setToast(null), 6000);
          fetchFactura();
        }}
      />
      <RegistrarPagoModal
        isOpen={modalPago}
        onClose={() => setModalPago(false)}
        factura={factura}
        onSaved={(res) => {
          setToast({
            tipo: 'ok',
            msg: `Pago de ${GTQ(res?.pago?.monto)} registrado. Saldo ${GTQ(res?.factura?.saldo_pendiente)}.`,
          });
          setTimeout(() => setToast(null), 6000);
          fetchFactura();
          fetchPagos();
        }}
      />
    </div>
  );
}

// ─── CxC Panel Component ──────────────────────────────────────────────────────
function CxcPanel({ factura, pagos, isDark, p, isSuperAdmin, onEliminarPago }) {
  const saldo = Number(factura.saldo_pendiente ?? 0);
  const totalPagado = Number(factura.total_pagado ?? 0);
  const total = Number(factura.total_general ?? 0);
  const pct = total > 0 ? Math.min(100, (totalPagado / total) * 100) : 0;

  const pagoEstado = factura.pago_estado || 'PENDIENTE';
  const isVencida = pagoEstado === 'VENCIDA';
  const isPagada = pagoEstado === 'PAGADA';
  const isParcial = pagoEstado === 'PARCIAL';

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('es-GT', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  let badgeCls = 'bg-amber-500/15 text-amber-600 border-amber-500/30';
  let badgeTxt = 'Pendiente';
  if (isPagada) { badgeCls = 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30'; badgeTxt = 'Pagada'; }
  else if (isParcial) { badgeCls = 'bg-blue-500/15 text-blue-600 border-blue-500/30'; badgeTxt = 'Parcial'; }
  else if (isVencida) { badgeCls = 'bg-red-500/15 text-red-600 border-red-500/30'; badgeTxt = `Vencida +${factura.dias_atraso || 0}d`; }

  return (
    <div className={`no-print-dim mb-6 rounded-lg p-4 border text-sm ${p.surfaceAlt} ${p.surfaceAltBrd}`}>
      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wide factura-text-subtle ${p.textSubtle}`}>
          <CreditCard size={14} className="text-amber-500" />
          Cuenta por Cobrar (CxC) · {factura.condicion_pago_display || 'Crédito'}
        </div>
        <span className={`factura-pill inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${badgeCls}`}>
          {badgeTxt}
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
        <div>
          <p className={`text-[10px] uppercase font-bold factura-text-faint ${p.textFaint}`}>Plazo</p>
          <p className={`text-sm font-bold factura-text-strong ${p.textStrong}`}>{factura.dias_credito ?? 0} días</p>
        </div>
        <div>
          <p className={`text-[10px] uppercase font-bold factura-text-faint ${p.textFaint}`}>Vence</p>
          <p className={`text-sm font-bold ${isVencida ? 'text-red-500' : `factura-text-strong ${p.textStrong}`}`}>
            <Calendar size={11} className="inline -mt-0.5 mr-1" />
            {fmtDate(factura.fecha_vencimiento)}
          </p>
        </div>
        <div>
          <p className={`text-[10px] uppercase font-bold factura-text-faint ${p.textFaint}`}>Pagado</p>
          <p className={`text-sm font-extrabold tabular-nums text-emerald-500`}>{GTQ(totalPagado)}</p>
        </div>
        <div>
          <p className={`text-[10px] uppercase font-bold factura-text-faint ${p.textFaint}`}>Saldo Pendiente</p>
          <p className={`text-sm font-extrabold tabular-nums ${saldo > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>{GTQ(saldo)}</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className={`h-2 w-full rounded-full overflow-hidden ${isDark ? 'bg-slate-700' : 'bg-slate-200'} mb-3`}>
        <div
          className={`h-full transition-all ${isPagada ? 'bg-emerald-500' : isParcial ? 'bg-blue-500' : isVencida ? 'bg-red-500' : 'bg-amber-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Override info */}
      {factura.override_motivo && (
        <div className={`mb-3 p-3 rounded-md border text-xs ${isDark ? 'bg-amber-500/10 border-amber-500/40 text-amber-200' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
          <div className="font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <ShieldCheck size={12} /> Override aprobado
          </div>
          <p>{factura.override_motivo}</p>
          {(factura.override_por || factura.override_at) && (
            <p className="mt-1 opacity-75">
              Por: {factura.override_por || '—'} · {factura.override_at ? new Date(factura.override_at).toLocaleString('es-GT') : ''}
            </p>
          )}
        </div>
      )}

      {/* Historial de pagos */}
      {pagos.length > 0 && (
        <div>
          <div className={`text-[11px] font-bold uppercase tracking-wider mb-1.5 factura-text-faint ${p.textFaint}`}>
            Historial de pagos ({pagos.length})
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className={isDark ? 'bg-slate-800/50' : 'bg-slate-100/60'}>
                <tr className={`text-[10px] uppercase font-bold factura-text-faint ${p.textFaint}`}>
                  <th className="text-left px-2 py-1.5">Fecha</th>
                  <th className="text-left px-2 py-1.5">Método</th>
                  <th className="text-left px-2 py-1.5">Referencia</th>
                  <th className="text-right px-2 py-1.5">Monto</th>
                  <th className="text-left px-2 py-1.5 hidden md:table-cell">Registró</th>
                  {isSuperAdmin && <th className="px-2 py-1.5"></th>}
                </tr>
              </thead>
              <tbody>
                {pagos.map(pago => (
                  <tr key={pago.id} className={`border-t ${p.surfaceAltBrd}`}>
                    <td className={`px-2 py-1.5 factura-text-muted ${p.textMuted}`}>{fmtDate(pago.fecha_pago)}</td>
                    <td className={`px-2 py-1.5 factura-text-strong ${p.textStrong}`}>{pago.metodo_display}</td>
                    <td className={`px-2 py-1.5 font-mono factura-text-muted ${p.textMuted}`}>{pago.referencia || '—'}</td>
                    <td className={`px-2 py-1.5 text-right tabular-nums font-bold text-emerald-500`}>{GTQ(pago.monto)}</td>
                    <td className={`px-2 py-1.5 hidden md:table-cell factura-text-faint ${p.textFaint}`}>{pago.registrado_por || '—'}</td>
                    {isSuperAdmin && (
                      <td className="px-2 py-1.5 text-right">
                        <button
                          onClick={() => onEliminarPago(pago.id)}
                          title="Eliminar pago (solo superadmin)"
                          className="p-1 rounded text-red-500 hover:bg-red-500/10"
                        >
                          <Trash2 size={12} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
