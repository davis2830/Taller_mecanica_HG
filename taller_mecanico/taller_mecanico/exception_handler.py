"""
Manejador global de excepciones para DRF.

Por defecto DRF solo convierte a 400 sus propias excepciones (rest_framework.exceptions).
Cuando un Model.clean() o Model.save() lanza django.core.exceptions.ValidationError,
DRF lo deja pasar como 500 Internal Server Error y Django responde con la página
HTML del debugger (o el "Something went wrong" en producción).

Este handler traduce esas validaciones Django al formato estándar DRF (400 JSON)
para que el frontend pueda parsearlas con la misma lógica que el resto de errores.
"""
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_default_exception_handler


def custom_exception_handler(exc, context):
    # Primero dejar que DRF maneje sus propias excepciones.
    response = drf_default_exception_handler(exc, context)
    if response is not None:
        return response

    # Traducir ValidationError de Django a 400 con payload legible.
    if isinstance(exc, DjangoValidationError):
        if hasattr(exc, 'message_dict'):
            data = exc.message_dict
        elif hasattr(exc, 'messages'):
            data = {'detail': exc.messages}
        else:
            data = {'detail': [str(exc)]}
        return Response(data, status=status.HTTP_400_BAD_REQUEST)

    return None
