"""
Comando para probar el envío de WhatsApp sin tener que disparar una cita real.

Uso:
    python manage.py test_whatsapp +50212345678
    python manage.py test_whatsapp +50212345678 --evento cita_recordatorio
    python manage.py test_whatsapp +50212345678 --sync   # ejecuta inline (sin Celery)

Ojo: si el backend está en 'twilio' y el número destino no hizo opt-in al
sandbox de Twilio (mandando "join <palabra-clave>" desde su WhatsApp), Twilio
rechaza el mensaje con código 63007/63016. Eso NO es un bug del código —
es restricción del sandbox. En producción con un número WhatsApp Business
propio + plantillas Meta aprobadas no aplica.
"""
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from taller_mecanico.whatsapp import (
    PLANTILLAS_WHATSAPP,
    enviar_whatsapp_task,
    renderizar_plantilla,
)


PARAMS_DEMO = {
    'cliente_nombre': 'Cliente Demo',
    'marca': 'AutoServi Pro',
    'servicio': 'Cambio de aceite',
    'cuando': 'mañana 10:00',
    'enlace_confirmar': 'https://ejemplo.com/confirmar/abc123',
    'cita_id': '42',
    'estado': 'CONFIRMADA',
    'vehiculo': 'Toyota Hilux P-123ABC',
    'total': '850.00',
    'url_encuesta': 'https://ejemplo.com/encuesta/abc',
    'numero_factura': 'F-001-0042',
    'saldo': '1,250.00',
    'fecha_venc': '30/04/2026',
}


class Command(BaseCommand):
    help = "Envía un WhatsApp de prueba al número indicado."

    def add_arguments(self, parser):
        parser.add_argument(
            'telefono',
            help="Número destino en formato E.164 (ej. +50212345678).",
        )
        parser.add_argument(
            '--evento',
            default='cita_recordatorio',
            choices=sorted(PLANTILLAS_WHATSAPP.keys()),
            help="Plantilla a usar (default: cita_recordatorio).",
        )
        parser.add_argument(
            '--sync',
            action='store_true',
            help="Ejecuta inline en vez de encolar en Celery.",
        )
        parser.add_argument(
            '--mensaje',
            default=None,
            help="Mensaje custom (sustituye el rendering de la plantilla).",
        )

    def handle(self, *args, **opts):
        telefono = opts['telefono']
        evento = opts['evento']
        sync = opts['sync']
        custom = opts['mensaje']

        backend = getattr(settings, 'WHATSAPP_BACKEND', 'mock')
        self.stdout.write(self.style.NOTICE(
            f"Backend: {backend}  |  evento: {evento}  |  destino: {telefono}"
        ))

        if custom:
            params = {'mensaje_custom': custom}
            self.stdout.write(self.style.NOTICE(f"Mensaje custom: {custom}"))
            mensaje = custom
        else:
            params = PARAMS_DEMO
            mensaje = renderizar_plantilla(evento, params)
            if mensaje is None:
                raise CommandError(f"Sin plantilla para {evento!r}")
            self.stdout.write(self.style.NOTICE(f"Mensaje renderizado:\n  {mensaje}"))

        if sync:
            # Ejecuta sin pasar por la cola — útil cuando no tenés worker corriendo.
            from taller_mecanico.whatsapp import _send_mock, _send_twilio
            try:
                if backend == 'twilio':
                    resultado = _send_twilio(evento, telefono, mensaje)
                else:
                    resultado = _send_mock(evento, telefono, mensaje)
            except Exception as exc:  # noqa: BLE001
                raise CommandError(f"Error enviando: {exc}") from exc
            self.stdout.write(self.style.SUCCESS(f"Resultado: {resultado}"))
        else:
            res = enviar_whatsapp_task.delay(evento, telefono, params)
            self.stdout.write(self.style.SUCCESS(
                f"Encolado en Celery — task_id={res.id}. "
                "Asegurate de tener el worker corriendo: "
                "celery -A taller_mecanico worker -l info --pool=solo"
            ))
