# citas/management/commands/enviar_recordatorios.py
from django.core.management.base import BaseCommand
from django.core.mail import send_mail
from django.conf import settings
from citas.models import Cita, Notificacion
import datetime
import logging

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('recordatorios.log', encoding='utf-8'),
        logging.StreamHandler()
    ]
)

class Command(BaseCommand):
    help = 'Envía recordatorios por email para las citas próximas'

    def add_arguments(self, parser):
        parser.add_argument(
            '--fecha',
            type=str,
            help='Fecha para la cual enviar recordatorios (YYYY-MM-DD). Por defecto: mañana'
        )
        parser.add_argument(
            '--test',
            action='store_true',
            help='Modo de prueba - no envía emails reales'
        )

    def handle(self, *args, **options):
        logger = logging.getLogger(__name__)
        
        # Determinar la fecha para los recordatorios
        if options['fecha']:
            try:
                fecha_recordatorio = datetime.datetime.strptime(options['fecha'], '%Y-%m-%d').date()
            except ValueError:
                self.stdout.write(self.style.ERROR('Formato de fecha inválido. Use YYYY-MM-DD'))
                return
        else:
            # Por defecto, recordatorios para mañana
            fecha_recordatorio = datetime.date.today() + datetime.timedelta(days=1)
        
        modo_test = options['test']
        
        logger.info(f'Iniciando envío de recordatorios para {fecha_recordatorio}')
        logger.info(f'Modo de prueba: {"Sí" if modo_test else "No"}')
        
        # Buscar citas para la fecha específica
        citas_para_recordar = Cita.objects.filter(
            fecha=fecha_recordatorio,
            estado__in=['PENDIENTE', 'CONFIRMADA']
        ).select_related('cliente', 'vehiculo', 'servicio')
        
        total_citas = citas_para_recordar.count()
        logger.info(f'Encontradas {total_citas} citas para {fecha_recordatorio}')
        
        if total_citas == 0:
            logger.info('No hay citas para enviar recordatorios')
            return
        
        recordatorios_enviados = 0
        errores = 0
        ya_enviados = 0
        sin_email = 0
        canal_apagado = 0

        # Pre-chequeo del canal email para este evento. Si está apagado por
        # configuración, enviar_email_cita devolverá False sin error — no
        # queremos que eso se contabilice como falla ni que se cree un
        # Notificacion(enviado=False) que bloquee retries futuros.
        from taller_mecanico.notification_channels import canal_email, EVENTO_CITA_RECORDATORIO
        email_canal_activo = canal_email(EVENTO_CITA_RECORDATORIO)
        if not email_canal_activo:
            logger.info('[recordatorio] canal email deshabilitado por configuración del taller — WhatsApp seguirá disparándose si está activo.')

        # Procesar cada cita
        for cita in citas_para_recordar:
            try:
                # Dedup: solo bloqueamos si YA se envió con éxito (enviado=True).
                # Así los reintentos manuales tras re-activar el canal funcionan.
                recordatorio_existente = Notificacion.objects.filter(
                    cita=cita,
                    tipo='RECORDATORIO',
                    enviado=True,
                ).exists()
                
                if recordatorio_existente:
                    ya_enviados += 1
                    logger.info(f'Ya se envió recordatorio para la cita #{cita.id}')
                    continue

                # No saltamos las citas sin email — enviar_email_cita igual
                # despacha WhatsApp internamente para clientes con teléfono
                # pero sin correo. Solo lo recordamos para el resumen.
                cliente_sin_email = not cita.cliente.email

                if not modo_test:
                    # Enviar el email usando el nuevo sistema elegante
                    from citas.utils import enviar_email_cita

                    try:
                        if enviar_email_cita(cita, 'recordatorio'):
                            # Registrar la notificación
                            Notificacion.objects.create(
                                cita=cita,
                                tipo='RECORDATORIO',
                                mensaje=f'Recordatorio enviado a {cita.cliente.email}',
                                enviado=True
                            )

                            recordatorios_enviados += 1
                            logger.info(f'✓ Recordatorio enviado para la cita #{cita.id} ({cita.cliente.email})')
                        elif cliente_sin_email:
                            # Cliente sin email — WhatsApp se intentó dentro
                            # de enviar_email_cita si el canal estaba activo.
                            sin_email += 1
                            logger.info(
                                f'⏭ Cita #{cita.id}: cliente {cita.cliente.username} sin email; '
                                f'WhatsApp se disparó si el canal estaba activo.'
                            )
                        elif not email_canal_activo:
                            # No es error: el admin apagó el canal email a propósito.
                            # WhatsApp se intentó internamente; no creamos
                            # Notificacion para no bloquear retries futuros.
                            canal_apagado += 1
                            logger.info(f'⏭ Cita #{cita.id}: canal email apagado, sin notificación persistida.')
                        else:
                            raise Exception("No se pudo enviar el email")

                    except Exception as e:
                        errores += 1
                        logger.error(f'✗ Error al enviar recordatorio para la cita #{cita.id}: {e}')

                        # Registrar la notificación como fallida
                        Notificacion.objects.create(
                            cita=cita,
                            tipo='RECORDATORIO',
                            mensaje=f'Error al enviar a {cita.cliente.email or "(sin email)"}: {str(e)}',
                            enviado=False
                        )

                else:
                    # Modo de prueba - solo simular
                    destinatario = cita.cliente.email or '(sin email)'
                    logger.info(f'[PRUEBA] Recordatorio que se enviaría para la cita #{cita.id} ({destinatario})')
                    recordatorios_enviados += 1
                
            except Exception as e:
                errores += 1
                logger.error(f'✗ Error general para la cita #{cita.id}: {e}')
        
        # Resumen final
        logger.info('='*50)
        logger.info(f'✓ Recordatorios enviados: {recordatorios_enviados}')
        logger.info(f'📧 Ya enviados anteriormente: {ya_enviados}')
        logger.info(f'❌ Sin email: {sin_email}')
        if canal_apagado > 0:
            logger.info(f'⏭ Saltadas por canal email apagado: {canal_apagado}')
        if errores > 0:
            logger.error(f'✗ Errores: {errores}')
        logger.info('='*50)
        
        self.stdout.write(self.style.SUCCESS(f'Proceso completado. {recordatorios_enviados} recordatorios enviados.'))