"""Endpoint de healthcheck — usado por monitoreo externo (UptimeRobot, etc.).

Diseño:
    - Sin autenticación (público).
    - Sin rate limit (DRF) — si UptimeRobot pingea cada 5min, tampoco va a
      saturar nada.
    - Verifica conectividad a Postgres con un SELECT 1.
    - Devuelve 200 si DB responde, 503 si no.

Está montado en AMBOS URLconfs:
    - public_urls.py (admin.gctorque.com/api/v1/health/)
    - urls.py        (demo.gctorque.com/api/v1/health/)

Así monitoreás ambas capas con el mismo endpoint.
"""
from __future__ import annotations

from django.db import connection
from django.http import JsonResponse


def health(_request):
    """Healthcheck: 200 si la DB responde, 503 si no."""
    try:
        with connection.cursor() as cur:
            cur.execute('SELECT 1')
            cur.fetchone()
    except Exception as exc:  # pragma: no cover — caso de desastre
        return JsonResponse(
            {'status': 'unhealthy', 'error': str(exc)},
            status=503,
        )
    return JsonResponse({'status': 'ok'})
