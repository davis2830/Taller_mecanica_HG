# usuarios/context_processors.py
from .models import Notificacion

def notificaciones(request):
    if request.user.is_authenticated:
        # Obtenemos las últimas 5 notificaciones para el dropdown
        nots = Notificacion.objects.filter(usuario=request.user).order_by('-fecha_creacion')[:5]
        # Conteo de no leídas
        nots_no_leidas = Notificacion.objects.filter(usuario=request.user, leida=False).count()
        return {
            'nots': nots,
            'nots_no_leidas': nots_no_leidas
        }
    return {}
