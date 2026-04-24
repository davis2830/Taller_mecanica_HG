"""
Middleware auxiliar usado solo cuando la app se sirve detrás de un proxy/tunnel
con HTTP Basic Auth (p. ej. el port forwarding de pruebas). En ese escenario el
header `Authorization` lo consume el proxy para validar el Basic Auth, así que
el frontend envía el JWT por `X-Authorization` y aquí lo copiamos al header
estándar antes de que DRF lo procese.

Es no-op en producción/local normal (no toca nada si `X-Authorization` no viene).
"""


class XAuthorizationHeaderMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        x_auth = request.META.get('HTTP_X_AUTHORIZATION')
        if x_auth:
            request.META['HTTP_AUTHORIZATION'] = x_auth
        return self.get_response(request)
