"""
Scheduler compartido para tareas programadas (APScheduler).

Cada módulo (citas, facturacion, inventario) registra su callback aquí en
lugar de levantar su propio BackgroundScheduler. Esto permite que el endpoint
`/api/v1/usuarios/tareas-programadas/` reprograme o ejecute jobs en caliente
sin reiniciar Django.

Patrón de uso:
    1. App.ready() llama a `register_callback(tarea_id, callback)` y
       `schedule_when_ready(tarea_id)` por cada job que registra.
    2. La inicialización real del scheduler (consulta DB + start) ocurre
       en un thread daemon que arranca tras un breve delay para evitar
       acceder a la DB durante AppConfig.ready() y que el autoreload del
       dev server pueda terminar de levantarse.
    3. Las vistas pueden llamar `apply_db_config(tarea_id)` para reprogramar
       o `run_now(tarea_id)` para forzar ejecución manual.
"""
import logging
import threading

from apscheduler.schedulers.background import BackgroundScheduler

logger = logging.getLogger(__name__)


_scheduler = None
_started = False
_pending_tarea_ids = set()
_callbacks = {}  # tarea_id -> wrapped callable
_lock = threading.RLock()
_init_thread = None


def get_scheduler():
    """
    BackgroundScheduler con jobstore en memoria. La persistencia real (hora,
    habilitada, ultima_ejecucion) vive en la tabla `TareaProgramada`; los
    jobs se reconstruyen desde DB al arrancar el servidor.
    """
    global _scheduler
    with _lock:
        if _scheduler is None:
            _scheduler = BackgroundScheduler(timezone="America/Guatemala")
        return _scheduler


def _wrap_callback(tarea_id, raw_callback):
    def wrapped():
        from django.utils import timezone
        from .models import TareaProgramada
        try:
            raw_callback()
            TareaProgramada.objects.filter(tarea_id=tarea_id).update(
                ultima_ejecucion=timezone.now(),
                ultima_ejecucion_status=TareaProgramada.STATUS_OK,
                ultima_ejecucion_mensaje='',
            )
            logger.info("Tarea %s ejecutada OK.", tarea_id)
        except Exception as e:
            logger.exception("Tarea %s falló: %s", tarea_id, e)
            try:
                TareaProgramada.objects.filter(tarea_id=tarea_id).update(
                    ultima_ejecucion=timezone.now(),
                    ultima_ejecucion_status=TareaProgramada.STATUS_ERROR,
                    ultima_ejecucion_mensaje=str(e)[:500],
                )
            except Exception:
                pass
    return wrapped


def register_callback(tarea_id, callback):
    """Registra el callable que se invocará cuando dispare el job."""
    _callbacks[tarea_id] = _wrap_callback(tarea_id, callback)


def apply_db_config(tarea_id):
    """
    Lee la fila TareaProgramada y agrega/actualiza/remueve el job en
    consecuencia. Llamar después de modificar la fila para reprogramar
    en caliente.
    """
    from .models import TareaProgramada
    callback = _callbacks.get(tarea_id)
    if not callback:
        logger.warning("Callback %s no registrado.", tarea_id)
        return False

    try:
        tp = TareaProgramada.objects.filter(tarea_id=tarea_id).first()
    except Exception as e:
        logger.warning(
            "No se pudo leer TareaProgramada(%s): %s", tarea_id, e,
        )
        return False
    if not tp:
        return False

    s = get_scheduler()
    if not tp.habilitada:
        try:
            s.remove_job(tarea_id)
        except Exception:
            pass
        return True

    s.add_job(
        callback,
        trigger="cron",
        hour=tp.hora.hour,
        minute=tp.hora.minute,
        id=tarea_id,
        max_instances=1,
        replace_existing=True,
    )
    logger.info(
        "Tarea %s programada %02d:%02d.",
        tarea_id, tp.hora.hour, tp.hora.minute,
    )
    return True


def schedule_when_ready(tarea_id):
    """
    Apunta este tarea_id como "pendiente de programar". El thread de
    inicialización (lanzado por start_deferred_init) lee la lista al
    arrancar y aplica `apply_db_config` para cada uno.
    """
    _pending_tarea_ids.add(tarea_id)


def start_deferred_init(delay=2.5):
    """
    Lanza un único thread daemon (idempotente) que tras `delay` segundos:
      1. Aplica apply_db_config a cada tarea_id pendiente.
      2. Arranca el scheduler global.

    Este wiring vive separado de los AppConfig.ready() para que la DB no
    se consulte durante el boot de Django (lo que provoca colgues con
    autoreload + SQLite).
    """
    global _init_thread
    with _lock:
        if _init_thread is not None:
            return
        t = threading.Thread(
            target=_deferred_runner,
            args=(delay,),
            daemon=True,
            name="scheduler-deferred-init",
        )
        _init_thread = t
        t.start()


def _deferred_runner(delay):
    import time
    from django import db
    time.sleep(delay)
    try:
        for tarea_id in list(_pending_tarea_ids):
            try:
                apply_db_config(tarea_id)
            except Exception as e:
                logger.exception("Error programando %s: %s", tarea_id, e)
        _do_start()
    finally:
        # Cerrar conexiones DB del thread daemon (evita locks de SQLite).
        db.connections.close_all()


def _do_start():
    global _started
    with _lock:
        if _started:
            return
        s = get_scheduler()
        s.start()
        _started = True
        logger.info("Scheduler global iniciado (America/Guatemala).")


def run_now(tarea_id):
    """
    Dispara el callback ahora mismo (síncrono). Usado por el botón
    "Ejecutar ahora" desde la UI.
    """
    callback = _callbacks.get(tarea_id)
    if not callback:
        raise ValueError(f"Tarea '{tarea_id}' no tiene callback registrado.")
    callback()


def get_next_run_time(tarea_id):
    """Devuelve datetime del próximo trigger o None si no está programado."""
    if not _started:
        return None
    s = get_scheduler()
    try:
        job = s.get_job(tarea_id)
    except Exception:
        return None
    return job.next_run_time if job else None
