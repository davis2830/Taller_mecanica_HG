import React, { useState, useEffect, useContext, useCallback } from 'react';
import axios from 'axios';
import {
  Clock, Save, Loader2, AlertTriangle, Play, CheckCircle2, XCircle, ToggleLeft, ToggleRight,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { AuthContext } from '../../context/AuthContext';

const API = 'http://localhost:8000/api/v1/usuarios/tareas-programadas/';

function fmtDateTime(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleString('es-GT', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function TareasProgramadasPage() {
  const { isDark } = useTheme();
  const { authTokens } = useContext(AuthContext);
  const headers = { Authorization: `Bearer ${authTokens?.access}` };

  const [tareas, setTareas] = useState([]);
  const [forms, setForms] = useState({});  // tarea_id -> {hora, habilitada}
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});  // id -> bool
  const [running, setRunning] = useState({});  // id -> bool
  const [toast, setToast] = useState(null);
  const [error, setError] = useState(null);
  const [confirmRun, setConfirmRun] = useState(null);  // tarea object

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchTareas = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(API, { headers });
      const list = Array.isArray(res.data) ? res.data : res.data.results || [];
      setTareas(list);
      const initialForms = {};
      list.forEach(t => {
        initialForms[t.tarea_id] = { hora: t.hora?.slice(0, 5), habilitada: t.habilitada };
      });
      setForms(initialForms);
      setError(null);
    } catch (e) {
      setError(e.response?.data?.detail || e.response?.data?.message || 'No se pudo cargar la lista de tareas programadas.');
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { fetchTareas(); }, [fetchTareas]);

  const setField = (tareaId, field, value) => {
    setForms(prev => ({
      ...prev,
      [tareaId]: { ...prev[tareaId], [field]: value },
    }));
  };

  const saveTarea = async (tarea) => {
    const form = forms[tarea.tarea_id];
    setSaving(s => ({ ...s, [tarea.id]: true }));
    try {
      const payload = { hora: form.hora, habilitada: form.habilitada };
      const res = await axios.patch(`${API}${tarea.id}/`, payload, { headers });
      setTareas(prev => prev.map(t => t.id === tarea.id ? res.data : t));
      showToast(`"${tarea.nombre}" guardado y reprogramado.`, 'success');
    } catch (e) {
      const data = e.response?.data;
      const msg = typeof data === 'string'
        ? data
        : Object.values(data || {}).flat().join(' ') || 'Error al guardar.';
      showToast(msg, 'error');
    }
    setSaving(s => ({ ...s, [tarea.id]: false }));
  };

  const runNow = async (tarea) => {
    setConfirmRun(null);
    setRunning(r => ({ ...r, [tarea.id]: true }));
    try {
      const res = await axios.post(`${API}${tarea.id}/run-now/`, {}, { headers });
      setTareas(prev => prev.map(t => t.id === tarea.id ? res.data : t));
      const status = res.data?.ultima_ejecucion_status;
      if (status === 'OK') {
        showToast(`"${tarea.nombre}" ejecutada correctamente.`, 'success');
      } else if (status === 'ERROR') {
        showToast(`"${tarea.nombre}" terminó con error: ${res.data.ultima_ejecucion_mensaje || 'sin detalle'}`, 'error');
      } else {
        showToast(`"${tarea.nombre}" ejecutada.`, 'success');
      }
    } catch (e) {
      const msg = e.response?.data?.error || e.response?.data?.detail || 'Error al ejecutar la tarea.';
      showToast(msg, 'error');
    }
    setRunning(r => ({ ...r, [tarea.id]: false }));
  };

  const bg        = isDark ? 'bg-slate-900' : 'bg-slate-50';
  const cardBg    = isDark ? 'bg-slate-800' : 'bg-white';
  const cardBrdr  = isDark ? 'border-slate-700' : 'border-slate-200';
  const txt       = isDark ? 'text-slate-100' : 'text-slate-800';
  const sub       = isDark ? 'text-slate-400' : 'text-slate-500';
  const labelCls  = `block text-xs font-bold uppercase tracking-wider mb-1.5 ${sub}`;
  const inputCls  = `rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDark
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

  return (
    <div className={`p-6 max-w-5xl mx-auto ${txt}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${isDark ? 'bg-blue-500/15' : 'bg-blue-50'}`}>
            <Clock className="text-blue-500" size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Tareas Programadas</h1>
            <p className={`text-sm ${sub}`}>Horarios de los recordatorios y resúmenes automáticos del sistema.</p>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 ${
          toast.type === 'success'
            ? 'bg-green-500 text-white'
            : 'bg-red-500 text-white'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
          <span className="text-sm font-medium">{toast.msg}</span>
        </div>
      )}

      {/* Lista de tareas */}
      <div className="space-y-4">
        {tareas.map(tarea => {
          const form = forms[tarea.tarea_id] || {};
          const dirty = (form.hora !== tarea.hora?.slice(0, 5)) || (form.habilitada !== tarea.habilitada);
          const isSaving = !!saving[tarea.id];
          const isRunning = !!running[tarea.id];

          const statusPill = tarea.ultima_ejecucion_status === 'OK'
            ? { cls: 'bg-green-500/15 text-green-500 border-green-500/30', label: 'Última: Éxito', icon: <CheckCircle2 size={12} /> }
            : tarea.ultima_ejecucion_status === 'ERROR'
            ? { cls: 'bg-red-500/15 text-red-500 border-red-500/30', label: 'Última: Error', icon: <XCircle size={12} /> }
            : { cls: `${isDark ? 'bg-slate-700/50 text-slate-400 border-slate-700' : 'bg-slate-100 text-slate-500 border-slate-200'}`, label: 'Sin ejecutar todavía', icon: null };

          return (
            <div key={tarea.id} className={`${cardBg} ${cardBrdr} border rounded-xl p-5`}>
              <div className="flex items-start justify-between flex-wrap gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-base">{tarea.nombre}</h3>
                  <p className={`text-xs mt-1 ${sub} max-w-2xl`}>{tarea.descripcion}</p>
                </div>
                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border flex items-center gap-1 ${statusPill.cls}`}>
                  {statusPill.icon}
                  {statusPill.label}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div>
                  <label className={labelCls}>Hora (GT)</label>
                  <input
                    type="time"
                    value={form.hora || ''}
                    onChange={e => setField(tarea.tarea_id, 'hora', e.target.value)}
                    className={`${inputCls} w-full`}
                    disabled={!form.habilitada}
                  />
                </div>

                <div>
                  <label className={labelCls}>Estado</label>
                  <button
                    type="button"
                    onClick={() => setField(tarea.tarea_id, 'habilitada', !form.habilitada)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border w-full text-sm font-medium transition-colors ${
                      form.habilitada
                        ? (isDark ? 'bg-green-500/15 border-green-500/30 text-green-400' : 'bg-green-50 border-green-200 text-green-700')
                        : (isDark ? 'bg-slate-700 border-slate-600 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-500')
                    }`}
                  >
                    {form.habilitada ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                    {form.habilitada ? 'Habilitada' : 'Deshabilitada'}
                  </button>
                </div>

                <div className={`${sub} text-xs`}>
                  <div className="font-bold uppercase tracking-wider mb-1.5">Última ejecución</div>
                  <div className={txt}>{fmtDateTime(tarea.ultima_ejecucion)}</div>
                  {tarea.ultima_ejecucion_mensaje && tarea.ultima_ejecucion_status === 'ERROR' && (
                    <div className="mt-1 text-red-400 text-[11px] truncate" title={tarea.ultima_ejecucion_mensaje}>
                      {tarea.ultima_ejecucion_mensaje}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => saveTarea(tarea)}
                    disabled={!dirty || isSaving}
                    className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg font-medium text-sm transition-colors ${
                      dirty && !isSaving
                        ? 'bg-blue-500 hover:bg-blue-600 text-white'
                        : (isDark ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-slate-200 text-slate-400 cursor-not-allowed')
                    }`}
                  >
                    {isSaving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                    Guardar
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmRun(tarea)}
                    disabled={isRunning}
                    className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg font-medium text-sm transition-colors ${
                      isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-100' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    {isRunning ? <Loader2 className="animate-spin" size={14} /> : <Play size={14} />}
                    Ejecutar ahora
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Confirmación "Ejecutar ahora" */}
      {confirmRun && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setConfirmRun(null)}>
          <div className={`${cardBg} ${cardBrdr} border rounded-xl shadow-xl max-w-md w-full p-6`} onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-amber-500/15 rounded-lg">
                <AlertTriangle className="text-amber-500" size={20} />
              </div>
              <h3 className="text-lg font-semibold">Confirmar ejecución</h3>
            </div>
            <p className={`text-sm ${sub} mb-4`}>
              Vas a ejecutar <span className={`font-semibold ${txt}`}>"{confirmRun.nombre}"</span> ahora mismo.
              Esto puede enviar correos reales a clientes / empresas. ¿Continuar?
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmRun(null)}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                Cancelar
              </button>
              <button
                onClick={() => runNow(confirmRun)}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-500 hover:bg-blue-600 text-white flex items-center gap-2"
              >
                <Play size={14} />
                Ejecutar ahora
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
