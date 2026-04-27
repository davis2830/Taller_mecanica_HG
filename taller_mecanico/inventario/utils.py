# inventario/utils.py
from django.core.mail import EmailMultiAlternatives
from django.conf import settings
from django.contrib.auth.models import User
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from usuarios.models import Perfil
from taller_mecanico.email_helpers import get_email_context
from taller_mecanico.notification_channels import (
    canal_email,
    EVENTO_INVENTARIO_ALERTA_STOCK, EVENTO_INVENTARIO_RESUMEN_DIARIO,
)
import logging

logger = logging.getLogger(__name__)

_DIAS_ES = {0: 'lunes', 1: 'martes', 2: 'miércoles', 3: 'jueves', 4: 'viernes', 5: 'sábado', 6: 'domingo'}
_MESES_ES = {1: 'enero', 2: 'febrero', 3: 'marzo', 4: 'abril', 5: 'mayo', 6: 'junio', 7: 'julio', 8: 'agosto', 9: 'septiembre', 10: 'octubre', 11: 'noviembre', 12: 'diciembre'}


def _fecha_humana_es(fecha):
    return f"{_DIAS_ES[fecha.weekday()]}, {fecha.day} de {_MESES_ES[fecha.month]} de {fecha.year}"

def obtener_usuarios_notificacion():
    """Obtener usuarios que deben recibir notificaciones de inventario"""
    try:
        # Usuarios con roles de Administrador y Mecánico
        perfiles_notificar = Perfil.objects.filter(
            rol__nombre__in=['Administrador', 'Mecánico'],
            usuario__is_active=True,
            usuario__email__isnull=False
        ).exclude(usuario__email='')
        
        usuarios = [perfil.usuario for perfil in perfiles_notificar if perfil.usuario.email]
        
        # Agregar superusuarios que tengan email
        superusuarios = User.objects.filter(
            is_superuser=True,
            is_active=True,
            email__isnull=False
        ).exclude(email='')
        
        # Combinar y eliminar duplicados
        todos_usuarios = list(set(usuarios + list(superusuarios)))
        
        return todos_usuarios
    except Exception as e:
        logger.error(f"Error al obtener usuarios para notificación: {e}")
        return []

def enviar_alerta_email(alerta):
    """Enviar alerta de inventario.

    Crea SIEMPRE las notificaciones in-app (campanita web) — son un canal
    independiente del correo. Solo el envío por correo respeta el toggle
    `CanalNotificacion.email_activo` para el evento de stock.

    Retorna True si el correo se despachó (los callers usan este valor para
    marcar `notificado_por_email`). Retorna False si no había
    destinatarios, hubo un error, o el canal email está deshabilitado por
    configuración del taller — en ese último caso la in-app SÍ se creó pero
    no se marca `notificado_por_email` para que un futuro re-encendido del
    canal pueda volver a disparar el correo de esta alerta.
    """
    try:
        usuarios_destinatarios = obtener_usuarios_notificacion()

        if not usuarios_destinatarios:
            logger.warning("No hay usuarios configurados para recibir alertas de inventario")
            return False

        emails_destinatarios = [usuario.email for usuario in usuarios_destinatarios]

        # Color + texto de urgencia según tipo (sin emojis: el icono va en el header).
        tipo_meta = {
            'STOCK_AGOTADO': ('#dc2626', 'Urgente'),
            'STOCK_CRITICO': ('#ea580c', 'Crítico'),
            'STOCK_BAJO':    ('#f59e0b', 'Atención'),
        }
        color, urgencia = tipo_meta.get(alerta.tipo, ('#0ea5e9', 'Información'))

        asunto = f"{urgencia}: {alerta.get_tipo_display()} - {alerta.producto.nombre}"

        # ── In-app notifications (campanita) ──────────────────────────────
        # Independientes del canal email pero deduplicadas por alerta — solo
        # se crean la primera vez que se procesa la alerta. Si más adelante
        # el admin re-activa el correo, evaluar_stock_producto volverá a
        # llamar enviar_alerta_email pero NO se duplicarán las in-app.
        if not alerta.notificado_in_app:
            from usuarios.models import Notificacion
            for usuario in usuarios_destinatarios:
                Notificacion.objects.create(
                    usuario=usuario,
                    titulo=f"{urgencia}: {alerta.producto.nombre}",
                    mensaje=f"Stock Actual: {alerta.producto.stock_actual} | Mínimo: {alerta.producto.stock_minimo}",
                    tipo='WARNING' if alerta.tipo in ['STOCK_BAJO'] else 'CRITICAL',
                    enlace=f"/inventario/productos/?q={alerta.producto.codigo}"
                )
            alerta.notificado_in_app = True
            alerta.save(update_fields=['notificado_in_app'])

        # ── Correo ────────────────────────────────────────────────────────
        # Si el canal está apagado, salimos aquí — la in-app ya quedó creada.
        # Retornamos False (NO True) para que el caller no marque
        # `notificado_por_email = True`; queremos que si el admin re-activa
        # el canal más tarde, esta alerta vuelva a entrar al flujo de correo.
        if not canal_email(EVENTO_INVENTARIO_ALERTA_STOCK):
            logger.info("[inventario:alerta_stock] canal email deshabilitado por config; in-app creada, saltando correo.")
            return False

        contexto = get_email_context({
            'alerta': alerta,
            'urgencia': urgencia,
            'color': color,
        })
        try:
            mensaje_html = render_to_string('inventario/emails/alerta_stock.html', contexto)
        except Exception as exc:
            logger.exception(f"Error renderizando alerta_stock template: {exc}")
            return False
        mensaje_texto = strip_tags(mensaje_html)

        # Crear y enviar email asincrónicamente para no bloquear la aplicación
        import threading

        def send_email_async():
            try:
                email = EmailMultiAlternatives(
                    asunto,
                    mensaje_texto,
                    settings.EMAIL_HOST_USER,
                    emails_destinatarios
                )
                email.attach_alternative(mensaje_html, "text/html")
                email.send()
                logger.info(f"Hilo Async: Alerta enviada por email a {len(emails_destinatarios)} destinatarios")
            except Exception as e:
                logger.error(f"Hilo Async: Error al enviar email de alerta: {e}")

        # Iniciar el hilo y devolver True de inmediato
        thread = threading.Thread(target=send_email_async)
        thread.daemon = True
        thread.start()

        return True

    except Exception as e:
        logger.error(f"Error al procesar alerta/email: {e}")
        return False

def evaluar_stock_producto(producto):
    """Evalúa el umbral de un producto individual post-consumo y dispara alerta asíncrona inmediata si cae en umbral Crítico o Agotado."""
    from .models import AlertaInventario
    if not producto.activo:
        return
        
    if producto.stock_actual == 0:
        tipo_alerta = 'STOCK_AGOTADO'
        prioridad = 'CRITICA'
        mensaje = f'CRÍTICO: El producto {producto.nombre} (código: {producto.codigo}) está AGOTADO. Stock actual: 0'
    elif producto.stock_actual <= (producto.stock_minimo * 0.3):
        tipo_alerta = 'STOCK_CRITICO'
        prioridad = 'ALTA'
        mensaje = f'URGENTE: El producto {producto.nombre} (código: {producto.codigo}) tiene stock CRÍTICO: {producto.stock_actual} unidades (mínimo: {producto.stock_minimo})'
    elif producto.stock_actual <= producto.stock_minimo:
        tipo_alerta = 'STOCK_BAJO'
        prioridad = 'MEDIA'
        mensaje = f'ATENCIÓN: El producto {producto.nombre} (código: {producto.codigo}) tiene stock bajo: {producto.stock_actual} unidades (mínimo: {producto.stock_minimo})'
    else:
        # Stock sano. Si había alerta resuélvela.
        AlertaInventario.objects.filter(producto=producto, activa=True).update(activa=False)
        return

    alerta, creada = AlertaInventario.objects.get_or_create(
        producto=producto,
        tipo=tipo_alerta,
        activa=True,
        defaults={'prioridad': prioridad, 'mensaje': mensaje}
    )

    if creada or not alerta.notificado_por_email:
        # Disparamos de inmediato
        alerta.enviar_notificacion_email()

def enviar_resumen_alertas_diario():
    """Enviar resumen diario de alertas activas"""
    from .models import AlertaInventario
    from django.utils import timezone

    if not canal_email(EVENTO_INVENTARIO_RESUMEN_DIARIO):
        logger.info("[inventario:resumen_diario] canal email deshabilitado por config; saltando.")
        return False

    try:
        alertas_activas = AlertaInventario.objects.filter(activa=True).order_by('-prioridad', '-fecha_creacion')
        
        if not alertas_activas:
            return True  # No hay alertas, no enviar resumen
        
        usuarios_destinatarios = obtener_usuarios_notificacion()
        if not usuarios_destinatarios:
            return False
        
        emails_destinatarios = [usuario.email for usuario in usuarios_destinatarios]
        
        # Contar alertas por tipo
        alertas_por_tipo = {}
        for alerta in alertas_activas:
            tipo = alerta.get_tipo_display()
            if tipo not in alertas_por_tipo:
                alertas_por_tipo[tipo] = 0
            alertas_por_tipo[tipo] += 1
        
        asunto = f"Resumen diario de alertas de inventario - {timezone.now().strftime('%d/%m/%Y')}"
        contexto = get_email_context({
            'alertas_activas': list(alertas_activas),
            'alertas_por_tipo': alertas_por_tipo,
            'total': alertas_activas.count(),
            'fecha_humana': _fecha_humana_es(timezone.now().date()),
        })
        try:
            mensaje_html = render_to_string('inventario/emails/resumen_alertas.html', contexto)
        except Exception as exc:
            logger.exception(f"Error renderizando resumen_alertas template: {exc}")
            return False
        
        # Crear y enviar email
        email = EmailMultiAlternatives(
            asunto,
            f"Resumen diario de alertas de inventario - {alertas_activas.count()} alertas activas",
            settings.EMAIL_HOST_USER,
            emails_destinatarios
        )
        email.attach_alternative(mensaje_html, "text/html")
        email.send()
        
        logger.info(f"Resumen diario de alertas enviado a {len(emails_destinatarios)} destinatarios")
        return True
        
    except Exception as e:
        logger.error(f"Error al enviar resumen diario de alertas: {e}")
        return False