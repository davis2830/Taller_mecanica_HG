"""Configuración de Gunicorn para producción.

Este archivo se referencia desde el unit de systemd:
    ExecStart=...gunicorn -c gunicorn.conf.py taller_mecanico.wsgi

Tuneable según recursos de la VM. Los defaults aquí asumen una VM con
2-4 vCPU y 4-8GB RAM (e2-medium / e2-standard-2 en GCP).
"""
from __future__ import annotations

import multiprocessing
import os

# ---------------------------------------------------------------------------
# Networking — escucha en localhost; Nginx hace el reverse proxy en 443.
# ---------------------------------------------------------------------------
bind = '127.0.0.1:8000'
backlog = 2048

# ---------------------------------------------------------------------------
# Workers — fórmula recomendada por Gunicorn: (2 * CPU) + 1.
# Acotamos a 8 max para no saturar Postgres con conexiones (cada worker
# mantiene su propia connection pool).
# ---------------------------------------------------------------------------
workers = min((multiprocessing.cpu_count() * 2) + 1, 8)
worker_class = 'sync'              # `gthread` si tenés tareas I/O-bound.
worker_connections = 1000
threads = 1                         # solo aplica si worker_class='gthread'
max_requests = 1000                # reciclar workers cada N requests.
max_requests_jitter = 100
timeout = 60                       # segundos antes de matar un worker colgado
graceful_timeout = 30
keepalive = 5

# ---------------------------------------------------------------------------
# Logging — stdout/stderr capturados por systemd journald.
# ---------------------------------------------------------------------------
accesslog = '-'
errorlog = '-'
loglevel = os.environ.get('GUNICORN_LOGLEVEL', 'info')
access_log_format = (
    '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" '
    '%(D)sus host=%({host}i)s'
)

# ---------------------------------------------------------------------------
# Process naming — visible en `ps` y `htop`.
# ---------------------------------------------------------------------------
proc_name = 'taller-mecanico'

# ---------------------------------------------------------------------------
# Preload — hace fork() después de cargar la app. Pros: menos RAM (COW),
# arranque más rápido de workers. Contras: cualquier conexión global se
# rompe en cada worker. Para esta app está OK.
# ---------------------------------------------------------------------------
preload_app = True

# ---------------------------------------------------------------------------
# Forwarded headers — confiar en el X-Forwarded-* de Nginx.
# ---------------------------------------------------------------------------
forwarded_allow_ips = '127.0.0.1'
secure_scheme_headers = {'X-FORWARDED-PROTO': 'https'}
