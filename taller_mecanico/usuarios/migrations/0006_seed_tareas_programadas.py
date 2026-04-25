"""
Data migration: siembra las 4 filas iniciales de TareaProgramada con los
valores por defecto.
"""
from django.db import migrations
from datetime import time


DEFAULTS = [
    {
        'tarea_id': 'citas_recordatorios_diario',
        'nombre': 'Recordatorios de citas',
        'descripcion': (
            'Envía un correo a cada cliente con cita CONFIRMADA o PENDIENTE '
            'para el día siguiente. Idempotente: no reenvía si ya se envió '
            'el recordatorio.'
        ),
        'hora': time(18, 0),
        'habilitada': True,
    },
    {
        'tarea_id': 'cxc_recordatorios_diario',
        'nombre': 'Recordatorios de cobro CxC',
        'descripcion': (
            'Marca facturas vencidas y envía recordatorios por correo a las '
            'empresas con facturas a crédito (3 días antes / día / cada 7 '
            'días post-vencimiento).'
        ),
        'hora': time(8, 0),
        'habilitada': True,
    },
    {
        'tarea_id': 'inventario_resumen_am',
        'nombre': 'Resumen de inventario (AM)',
        'descripcion': (
            'Genera alertas de stock bajo / vencimientos próximos y envía un '
            'resumen por correo a las personas configuradas en notificaciones '
            'de inventario.'
        ),
        'hora': time(7, 0),
        'habilitada': True,
    },
    {
        'tarea_id': 'inventario_resumen_pm',
        'nombre': 'Resumen de inventario (PM)',
        'descripcion': (
            'Misma lógica que el resumen AM — segundo envío al final del día '
            'para captar movimientos de la jornada.'
        ),
        'hora': time(17, 0),
        'habilitada': True,
    },
]


def seed_defaults(apps, schema_editor):
    TareaProgramada = apps.get_model('usuarios', 'TareaProgramada')
    for row in DEFAULTS:
        TareaProgramada.objects.update_or_create(
            tarea_id=row['tarea_id'],
            defaults={
                'nombre': row['nombre'],
                'descripcion': row['descripcion'],
                'hora': row['hora'],
                'habilitada': row['habilitada'],
            },
        )


def remove_defaults(apps, schema_editor):
    TareaProgramada = apps.get_model('usuarios', 'TareaProgramada')
    TareaProgramada.objects.filter(
        tarea_id__in=[r['tarea_id'] for r in DEFAULTS],
    ).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('usuarios', '0005_tareaprogramada'),
    ]

    operations = [
        migrations.RunPython(seed_defaults, remove_defaults),
    ]
