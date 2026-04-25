from django.core.management.base import BaseCommand

from facturacion.tasks import (
    actualizar_facturas_vencidas_task,
    enviar_recordatorios_cobro_task,
)


class Command(BaseCommand):
    help = (
        "Marca facturas como VENCIDA si pasaron su fecha_vencimiento y "
        "envía recordatorios de cobro a empresas (3 días antes / el día / "
        "cada 7 días post-vencimiento). Pensado para correrse en cron diario."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Lista candidatos sin enviar correos.',
        )
        parser.add_argument(
            '--skip-marcado',
            action='store_true',
            help='Solo enviar recordatorios; no actualizar pago_estado a VENCIDA.',
        )

    def handle(self, *args, **opts):
        if not opts['skip_marcado']:
            r1 = actualizar_facturas_vencidas_task.apply().get()
            self.stdout.write(self.style.SUCCESS(
                f"Actualizadas a VENCIDA: {r1.get('actualizadas', 0)}"
            ))

        r2 = enviar_recordatorios_cobro_task.apply(
            kwargs={'test_mode': opts['dry_run']}
        ).get()

        if opts['dry_run']:
            self.stdout.write(self.style.WARNING(
                f"[DRY-RUN] Candidatos a recordatorio: {r2.get('candidatos', 0)}"
            ))
            for c in r2.get('detalle') or []:
                self.stdout.write(
                    f"  - F#{c['factura_id']} {c['numero']} "
                    f"empresa={c['empresa']} email={c['email']} "
                    f"diff={c['dias_diferencia']} saldo=Q{c['saldo']}"
                )
        else:
            self.stdout.write(self.style.SUCCESS(
                f"Recordatorios → enviados={r2.get('enviados', 0)} "
                f"fallidos={r2.get('fallidos', 0)} "
                f"candidatos={r2.get('candidatos', 0)}"
            ))
