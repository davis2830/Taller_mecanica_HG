from celery import shared_task
from .models import Factura
from .utils import enviar_email_factura

@shared_task
def enviar_factura_task(factura_id, destinatario_email=None):
    try:
        factura = Factura.objects.get(id=factura_id)
        enviado = enviar_email_factura(factura, destinatario_email)
        return f"Factura #{factura.numero_factura} enviada a {destinatario_email or 'cliente predeterminado'}: {enviado}"
    except Factura.DoesNotExist:
        return f"Error: Factura {factura_id} no existe."
    except Exception as e:
        return f"Error enviando email para factura {factura_id}: {str(e)}"


@shared_task
def enviar_recordatorios_cobro_task(test_mode=False):
    """
    Recorre facturas a crédito con saldo pendiente y envía recordatorios al
    email de cobro de la empresa según una cadencia:

      - 3 días ANTES del vencimiento
      - el DÍA del vencimiento
      - cada 7 días DESPUÉS del vencimiento (7, 14, 21, ...)

    Solo se envía si la empresa tiene `recordatorios_activos=True`.
    `test_mode=True` no envía pero retorna la lista de candidatos (para debugging).
    """
    from datetime import date, timedelta
    from django.db.models import Q
    from .utils import enviar_email_recordatorio_cobro

    hoy = date.today()
    candidatos = []

    qs = Factura.objects.filter(
        estado='EMITIDA',
        condicion_pago='CREDITO',
        pago_estado__in=['PENDIENTE', 'PARCIAL', 'VENCIDA'],
        empresa__recordatorios_activos=True,
        empresa__email_cobro__isnull=False,
    ).exclude(empresa__email_cobro='').exclude(fecha_vencimiento__isnull=True)

    enviados = 0
    fallidos = 0
    for f in qs.select_related('empresa'):
        delta = (hoy - f.fecha_vencimiento).days  # negativo = aún no vence
        # Cadencia
        debe_enviar = (
            delta == -3
            or delta == 0
            or (delta > 0 and delta % 7 == 0)
        )
        if not debe_enviar:
            continue

        candidatos.append({
            'factura_id': f.id,
            'numero': f.numero_factura,
            'empresa': f.empresa.razon_social,
            'email': f.empresa.email_cobro,
            'dias_diferencia': delta,
            'saldo': str(f.saldo_pendiente),
        })

        if not test_mode:
            ok = enviar_email_recordatorio_cobro(f, dias_diferencia=delta)
            if ok:
                enviados += 1
            else:
                fallidos += 1

    return {
        'fecha': hoy.isoformat(),
        'candidatos': len(candidatos),
        'enviados': enviados,
        'fallidos': fallidos,
        'detalle': candidatos if test_mode else None,
    }


@shared_task
def actualizar_facturas_vencidas_task():
    """
    Marca como VENCIDA las facturas a crédito cuya fecha_vencimiento ya pasó
    pero siguen en PENDIENTE/PARCIAL. Idempotente.
    """
    from datetime import date

    hoy = date.today()
    qs = Factura.objects.filter(
        estado='EMITIDA',
        condicion_pago='CREDITO',
        pago_estado__in=['PENDIENTE', 'PARCIAL'],
        fecha_vencimiento__lt=hoy,
    )
    actualizadas = 0
    for f in qs:
        f.pago_estado = 'VENCIDA'
        f.save(update_fields=['pago_estado'])
        actualizadas += 1
    return {'fecha': hoy.isoformat(), 'actualizadas': actualizadas}
