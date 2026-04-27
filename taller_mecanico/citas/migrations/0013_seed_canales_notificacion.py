from django.db import migrations


def seed_canales(apps, schema_editor):
    CanalNotificacion = apps.get_model('citas', 'CanalNotificacion')

    # NOTA: se replica el listado de notification_channels.EVENTOS_REGISTRADOS
    # aquí inline para que la migración sea hermética y no dependa de imports
    # externos que puedan cambiar después.
    eventos = [
        ('cita_pendiente_confirmar', 'Confirmar cita pendiente',
         'Cuando el cliente solicita una cita: se le manda un link mágico para confirmarla.',
         'Citas', 10, True, False),
        ('cita_confirmada', 'Cita confirmada',
         'Cuando una cita se marca como confirmada (manual o por click del cliente).',
         'Citas', 20, True, False),
        ('cita_recordatorio', 'Recordatorio de cita',
         'El día anterior a la cita (job programado).',
         'Citas', 30, True, True),
        ('cita_cambio_estado', 'Cambio de estado de la cita',
         'Cuando una cita cambia entre estados (genérico).',
         'Citas', 40, True, False),
        ('cita_en_revision', 'OT pasó a En Revisión',
         'Cuando la OT del cliente entra a inspección/diagnóstico.',
         'Citas', 50, True, False),
        ('cita_cotizacion', 'OT pasó a Cotización',
         'Cuando se le manda al cliente la cotización del trabajo (incluye precios).',
         'Citas', 60, True, False),
        ('cita_listo', 'Vehículo listo para entregar',
         'Cuando la OT pasa a Listo / Esperando entrega.',
         'Citas', 70, True, True),
        ('cita_encuesta', 'Encuesta post-servicio',
         'Después de entregar el vehículo, se invita al cliente a calificar el servicio.',
         'Citas', 80, True, False),

        ('ot_esperando_repuestos_taller', 'OT en Esperando Repuestos (taller)',
         'Aviso INTERNO al admin/recepción cuando la OT pasa a Esperando Repuestos. Incluye lista de piezas y OC asociadas.',
         'Repuestos', 10, True, False),
        ('ot_esperando_repuestos_cliente', 'OT en Esperando Repuestos (cliente)',
         'Aviso al cliente — solo nombre y cantidad de piezas, sin precios.',
         'Repuestos', 20, True, True),

        ('factura_emitida', 'Factura emitida',
         'Al certificar una factura, se le manda al cliente con el detalle.',
         'Facturación', 10, True, False),
        ('recordatorio_cobro', 'Recordatorio de cobro (CxC)',
         'Recordatorios automáticos de saldos pendientes (pre-vencimiento, vencimiento, vencidos).',
         'Facturación', 20, True, True),

        ('inventario_alerta_stock', 'Alerta de stock (individual)',
         'Cuando un producto cruza umbral de stock crítico/bajo/agotado.',
         'Inventario', 10, True, False),
        ('inventario_resumen_diario', 'Resumen diario de inventario',
         'Reporte diario con todas las alertas activas.',
         'Inventario', 20, True, False),

        ('usuario_activacion', 'Activación de cuenta',
         'Email enviado al registrar un nuevo usuario para activar la cuenta.',
         'Cuentas', 10, True, False),
        ('usuario_cambio_correo_verificacion', 'Verificación de cambio de correo',
         'Cuando un usuario cambia su correo, link de confirmación al correo nuevo.',
         'Cuentas', 20, True, False),
        ('usuario_cambio_correo_aviso', 'Aviso al correo viejo (cambio)',
         'Cuando un usuario cambia su correo, aviso de seguridad al correo anterior.',
         'Cuentas', 30, True, False),
    ]

    for evento, label, desc, grupo, orden, email_on, wa_on in eventos:
        CanalNotificacion.objects.update_or_create(
            evento=evento,
            defaults={
                'label': label,
                'descripcion': desc,
                'grupo': grupo,
                'orden': orden,
                'email_activo': email_on,
                # whatsapp_activo: en este PR inicialmente en False para todos los
                # eventos. El admin lo activa desde Configuración del Taller cuando
                # PR F (Twilio) esté en producción. El parámetro `wa_on` queda
                # documentado en el seed como sugerencia (eventos donde WhatsApp
                # aporta más valor que el correo: recordatorios, "listo para
                # recoger", etc.), pero no se aplica de entrada para no
                # sorprender al usuario.
                'whatsapp_activo': False,
            },
        )


def reverse_seed(apps, schema_editor):
    CanalNotificacion = apps.get_model('citas', 'CanalNotificacion')
    CanalNotificacion.objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ('citas', '0012_canalnotificacion'),
    ]

    operations = [
        migrations.RunPython(seed_canales, reverse_seed),
    ]
