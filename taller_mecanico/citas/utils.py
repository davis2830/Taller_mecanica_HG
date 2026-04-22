# citas/utils.py
from django.core.mail import EmailMultiAlternatives
from django.conf import settings
import datetime

def_dias = {0: 'Lunes', 1: 'Martes', 2: 'Miércoles', 3: 'Jueves', 4: 'Viernes', 5: 'Sábado', 6: 'Domingo'}
def_meses = {1: 'enero', 2: 'febrero', 3: 'marzo', 4: 'abril', 5: 'mayo', 6: 'junio', 7: 'julio', 8: 'agosto', 9: 'septiembre', 10: 'octubre', 11: 'noviembre', 12: 'diciembre'}

def formato_fecha_es(fecha):
    """Traduce la fecha al idioma español para obviar el locale del sistema operativo"""
    return f"{def_dias[fecha.weekday()]}, {fecha.day} de {def_meses[fecha.month]} de {fecha.year}"

def enviar_email_cita(cita, tipo_email, destinatario_email=None):
    """
    Enviar email relacionado con una cita
    tipo_email: 'confirmacion', 'recordatorio', 'cambio_estado'
    """
    if not destinatario_email:
        destinatario_email = cita.cliente.email
    
    if not destinatario_email:
        return False
    
    # Configurar el contenido según el tipo de email
    boton_confirmar = ""
    
    if tipo_email == 'confirmacion':
        if cita.estado == 'PENDIENTE':
            emoji = '⏳'
            asunto = f'⏳ Solicitud Recibida: Confirma tu Cita - {cita.servicio.nombre}'
            titulo = 'Confirma tu Asistencia'
            mensaje_principal = 'Hemos recibido tu solicitud de cita. Para reservarla formalmente y confirmar tu asistencia, haz clic en el botón debajo.'
            color_principal = '#f59e0b'  # Naranja/Amarillo
            
            # Generar enlace mágico si pasaron el dominio
            from django.core.signing import Signer
            signer = Signer()
            token = signer.sign(str(cita.id))
            base_url = settings.FRONTEND_URL.rstrip('/')
            enlace = f"{base_url}/citas/confirmar-email/{token}/"
            boton_confirmar = f'''
            <div style="text-align: center; margin: 35px 0;">
                <a href="{enlace}" style="background-color: #22c55e; color: white; padding: 16px 32px; text-decoration: none; border-radius: 30px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 10px rgba(34, 197, 94, 0.3);">
                    ✅ Confirmar mi Cita Exactamente
                </a>
            </div>
            '''
        else:
            emoji = '✅'
            asunto = f'✅ Confirmación de Cita - {cita.servicio.nombre}'
            titulo = 'Confirmación de Cita'
            mensaje_principal = 'Tu cita ha sido <strong>confirmada exitosamente</strong>. ¡Te esperamos!'
            color_principal = '#22c55e'  # Verde nativo
            
        cuando = f"el {formato_fecha_es(cita.fecha)} a las {cita.hora_inicio.strftime('%H:%M')}"
        
    elif tipo_email == 'recordatorio':
        emoji = '🔔'
        asunto = f'🔔 Recordatorio de Cita - {cita.servicio.nombre}'
        titulo = 'Recordatorio de Cita'
        
        # Determinar si es hoy o mañana
        dias_diferencia = (cita.fecha - datetime.date.today()).days
        if dias_diferencia == 0:
            cuando_texto = "hoy"
        elif dias_diferencia == 1:
            cuando_texto = "mañana"
        else:
            cuando_texto = f"el {cita.fecha.strftime('%d/%m/%Y')}"
            
        mensaje_principal = f'Te recordamos que tienes una cita programada para <strong>{cuando_texto}</strong>.'
        color_principal = '#eab308'  # Amarillo
        cuando = f"el {formato_fecha_es(cita.fecha)} a las {cita.hora_inicio.strftime('%H:%M')}"
        
    elif tipo_email == 'cambio_estado':
        emoji = '📋'
        asunto = f'📋 Actualización de Cita - {cita.servicio.nombre}'
        titulo = 'Estado de Cita Actualizado'
        mensaje_principal = f'El estado de tu cita ha cambiado a: <strong>{cita.get_estado_display()}</strong>'
        color_principal = '#3b82f6'  # Azul
        cuando = f"el {formato_fecha_es(cita.fecha)} a las {cita.hora_inicio.strftime('%H:%M')}"

    elif tipo_email == 'en_revision':
        emoji = '🔍'
        asunto = f'🔍 Tu vehículo está en revisión — {cita.servicio.nombre}'
        titulo = 'Revisión en Progreso'
        mensaje_principal = (
            'Nuestro equipo de mecánicos ha comenzado la revisión de tu vehículo. '
            'Te notificaremos si se requieren refacciones adicionales o cuando esté listo para entrega.'
        )
        color_principal = '#8b5cf6'  # Violeta
        cuando = f"el {formato_fecha_es(cita.fecha)} a las {cita.hora_inicio.strftime('%H:%M')}"

    elif tipo_email == 'cotizacion':
        emoji = '📝'
        asunto = f'📝 Cotización de Reparación - Tu Vehículo en AutoServi Pro'
        titulo = 'Cotización Generada'
        mensaje_principal = (
            'Hemos finalizado el diagnóstico y elaborado la cotización de los repuestos necesarios '
            'para la reparación de tu vehículo. Te invitamos a revisarla y autorizarla para continuar.'
        )
        color_principal = '#0ea5e9'  # Cyan / Sky
        cuando = f"el {formato_fecha_es(cita.fecha)} a las {cita.hora_inicio.strftime('%H:%M')}"

    elif tipo_email == 'listo':
        emoji = '🚗'
        asunto = f'🚗 ¡Tu vehículo está listo para recoger! — {cita.servicio.nombre}'
        titulo = '¡Vehículo Listo!'
        mensaje_principal = (
            'El servicio de tu vehículo ha <strong>concluido satisfactoriamente</strong>. '
            'Ya puedes pasar a nuestras instalaciones a recogerlo y completar el pago en caja.'
        )
        color_principal = '#10b981'  # Verde esmeralda
        cuando = f"el {formato_fecha_es(cita.fecha)} a las {cita.hora_inicio.strftime('%H:%M')}"
        boton_confirmar = '''
        <div style="text-align: center; margin: 35px 0;">
            <p style="color:#6b7280;font-size:14px;margin-bottom:12px;">¿Tienes dudas sobre tu vehículo?</p>
            <a href="tel:+50212345678" style="background-color:#10b981;color:white;padding:14px 28px;text-decoration:none;border-radius:30px;font-weight:bold;font-size:15px;display:inline-block;box-shadow:0 4px 10px rgba(16,185,129,0.3);">
                📞 Llámanos al +502 1234-5678
            </a>
        </div>
        '''

    elif tipo_email == 'encuesta':
        emoji = '⭐'
        asunto = f'⭐ ¡Gracias por visitarnos! Cuéntanos tu experiencia'
        titulo = '¡Gracias por confiar en nosotros!'
        mensaje_principal = (
            'Fue un placer atenderte. Tu opinión es muy valiosa para seguir mejorando nuestro servicio. '
            '¿Podrías tomarte un momento para completar nuestra encuesta de satisfacción?'
        )
        color_principal = '#f59e0b'  # Ámbar
        cuando = f"el {formato_fecha_es(cita.fecha)}"
        boton_confirmar = '''
        <div style="text-align: center; margin: 35px 0;">
            <p style="color:#6b7280;font-size:14px;margin-bottom:12px;">Solo toma 1 minuto ⏱</p>
            <a href="#" style="background-color:#f59e0b;color:white;padding:16px 32px;text-decoration:none;border-radius:30px;font-weight:bold;font-size:16px;display:inline-block;box-shadow:0 4px 10px rgba(245,158,11,0.35);">
                ⭐ Llenar Encuesta de Satisfacción
            </a>
            <p style="margin-top:16px;font-size:12px;color:#9ca3af;">(Demo — próximamente disponible)</p>
        </div>
        '''

    else:
        return False

    
    # Determinar el color del estado
    color_estado = {
        'PENDIENTE': '#ffc107',
        'CONFIRMADA': '#28a745', 
        'COMPLETADA': '#17a2b8',
        'CANCELADA': '#dc3545'
    }.get(cita.estado, '#6c757d')
    
    # Calcular precio real estimado / cerrado (Tomando en cuenta repuestos del Taller si los hubiere)
    precio_mostrar = float(cita.servicio.precio)
    if hasattr(cita, 'orden_trabajo') and cita.orden_trabajo:
        try:
            precio_mostrar += float(cita.orden_trabajo.total_repuestos)
        except Exception:
            pass

    tabla_repuestos = ""
    if hasattr(cita, 'orden_trabajo') and cita.orden_trabajo and cita.orden_trabajo.repuestos.exists():
        filas = ""
        for r in cita.orden_trabajo.repuestos.all():
            filas += f'''
            <tr>
                <td style="padding: 8px; border-bottom: 1px solid #e9ecef; color: #212529;">{r.cantidad}x {r.producto.nombre}</td>
                <td style="padding: 8px; border-bottom: 1px solid #e9ecef; text-align: right; color: #212529;">Q{r.subtotal:.2f}</td>
            </tr>
            '''
        
        tabla_repuestos = f'''
        <div style="background-color: #fcfcfc; border: 1px solid #e9ecef; border-radius: 8px; padding: 20px; margin: 15px 0;">
            <h4 style="margin: 0 0 15px 0; color: #495057;">🛠 Detalle de Repuestos e Insumos</h4>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                {filas}
                <tr>
                    <td style="padding: 10px 8px 0 8px; font-weight: bold; text-align: right; color: #495057;">Mano de Obra:</td>
                    <td style="padding: 10px 8px 0 8px; font-weight: bold; text-align: right; color: #495057;">Q{cita.servicio.precio:.2f}</td>
                </tr>
                <tr>
                    <td style="padding: 4px 8px 0 8px; font-weight: bold; text-align: right; color: #495057;">Total a Pagar:</td>
                    <td style="padding: 4px 8px 0 8px; font-weight: bold; text-align: right; color: {color_principal};">Q{precio_mostrar:.2f}</td>
                </tr>
            </table>
        </div>
        '''
    
    mensaje_html = f"""
    <html>
    <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4;">
        <div style="max-width: 600px; margin: 20px auto; background-color: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            
            <!-- Header -->
            <div style="background: linear-gradient(135deg, {color_principal}, {color_principal}dd); color: white; padding: 30px 20px; text-align: center;">
                <h1 style="margin: 0; font-size: 28px; font-weight: 300;">
                    {emoji} {titulo}
                </h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9; font-size: 16px;">
                    Taller Mecánico Profesional
                </p>
            </div>
            
            <!-- Content -->
            <div style="padding: 30px;">
                <p style="font-size: 18px; margin-bottom: 25px;">
                    Hola <strong>{cita.cliente.first_name or cita.cliente.username}</strong>,
                </p>
                
                <p style="font-size: 16px; margin-bottom: 30px; color: #555;">
                    {mensaje_principal}
                </p>
                
                <!-- Cita Details Card -->
                <div style="background-color: #f8f9fa; border-radius: 8px; padding: 25px; margin: 25px 0; border-left: 5px solid {color_principal};">
                    <h3 style="margin: 0 0 20px 0; color: {color_principal}; font-size: 20px;">
                        📋 Detalles de la Cita
                    </h3>
                    
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 12px 0; border-bottom: 1px solid #e9ecef; font-weight: 600; color: #495057; width: 40%;">
                                📅 Fecha y Hora:
                            </td>
                            <td style="padding: 12px 0; border-bottom: 1px solid #e9ecef; color: #212529;">
                                {cuando}
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 12px 0; border-bottom: 1px solid #e9ecef; font-weight: 600; color: #495057;">
                                🔧 Servicio:
                            </td>
                            <td style="padding: 12px 0; border-bottom: 1px solid #e9ecef; color: #212529;">
                                {cita.servicio.nombre}
                                <div style="font-size: 14px; color: #6c757d; margin-top: 5px;">
                                    {cita.servicio.get_categoria_display()}
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 12px 0; border-bottom: 1px solid #e9ecef; font-weight: 600; color: #495057;">
                                🚗 Vehículo:
                            </td>
                            <td style="padding: 12px 0; border-bottom: 1px solid #e9ecef; color: #212529;">
                                {cita.vehiculo.marca} {cita.vehiculo.modelo} 
                                <span style="background-color: #e9ecef; padding: 2px 8px; border-radius: 12px; font-size: 12px; margin-left: 10px;">
                                    {cita.vehiculo.placa}
                                </span>
                                <div style="font-size: 14px; color: #6c757d; margin-top: 5px;">
                                    {cita.vehiculo.color} • {cita.vehiculo.año}
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 12px 0; border-bottom: 1px solid #e9ecef; font-weight: 600; color: #495057;">
                                💰 Valor Total Estimado:
                            </td>
                            <td style="padding: 12px 0; border-bottom: 1px solid #e9ecef; color: #212529;">
                                <span style="font-size: 18px; font-weight: 600; color: {color_principal};">
                                    Q{precio_mostrar:.2f}
                                </span>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 12px 0; font-weight: 600; color: #495057;">
                                📊 Estado:
                            </td>
                            <td style="padding: 12px 0; color: #212529;">
                                <span style="background-color: {color_estado}; color: white; padding: 6px 12px; border-radius: 20px; font-size: 14px; font-weight: 500;">
                                    {cita.get_estado_display()}
                                </span>
                            </td>
                        </tr>
                    </table>
                </div>
                
                {tabla_repuestos}
                
                {boton_confirmar}
                
                {f'''<div style="background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 8px; padding: 15px; margin: 20px 0; border-left: 4px solid #f59e0b;">
                    <h4 style="margin: 0 0 10px 0; color: #856404;">📝 Notas adicionales:</h4>
                    <p style="margin: 0; color: #856404;">{cita.notas}</p>
                </div>''' if cita.notas else ''}
                
                <!-- Info Box -->
                <div style="background: linear-gradient(135deg, #e8f5e8, #d4edda); border-radius: 8px; padding: 20px; margin: 25px 0;">
                    <h4 style="margin: 0 0 15px 0; color: #155724;">ℹ️ Información Importante</h4>
                    <ul style="margin: 0; padding-left: 20px; color: #155724;">
                        <li style="margin-bottom: 8px;">Por favor, llega <strong>15 minutos antes</strong> de tu cita</li>
                        <li style="margin-bottom: 8px;">Trae la <strong>documentación</strong> de tu vehículo</li>
                        <li style="margin-bottom: 8px;">Si necesitas <strong>cancelar o reprogramar</strong>, contáctanos con anticipación</li>
                        <li>Nuestro equipo estará listo para atenderte</li>
                    </ul>
                </div>
                
                <!-- Contact Info -->
                <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin-top: 30px; text-align: center;">
                    <h4 style="margin: 0 0 15px 0; color: #495057;">📞 ¿Necesitas ayuda?</h4>
                    <p style="margin: 0; color: #6c757d;">
                        Contáctanos si tienes alguna pregunta o necesitas hacer cambios
                    </p>
                    <div style="margin-top: 15px;">
                        <a href="tel:+50212345678" style="color: {color_principal}; text-decoration: none; font-weight: 600; margin-right: 20px;">
                            📞 +502 1234-5678
                        </a>
                        <a href="mailto:info@tallermecánico.gt" style="color: {color_principal}; text-decoration: none; font-weight: 600;">
                            ✉️ info@tallermecánico.gt
                        </a>
                    </div>
                </div>
            </div>
            
            <!-- Footer -->
            <div style="background-color: #343a40; color: white; padding: 20px; text-align: center;">
                <p style="margin: 0 0 10px 0; font-size: 16px; font-weight: 600;">
                    🔧 Taller Mecánico Profesional
                </p>
                <p style="margin: 0; opacity: 0.8; font-size: 14px;">
                    Tu taller de confianza • Servicio de calidad garantizado
                </p>
                <div style="margin-top: 15px; font-size: 12px; opacity: 0.6;">
                    Email generado automáticamente el {datetime.datetime.now().strftime('%d/%m/%Y a las %H:%M')}
                </div>
            </div>
            
        </div>
    </body>
    </html>
    """
    
    # Mensaje de texto alternativo
    mensaje_texto = f"""
🔧 TALLER MECÁNICO PROFESIONAL

{titulo.upper()}

Hola {cita.cliente.first_name or cita.cliente.username},

{mensaje_principal.replace('<strong>', '').replace('</strong>', '')}

DETALLES DE LA CITA:
📅 Fecha: {formato_fecha_es(cita.fecha)}
🕐 Hora: {cita.hora_inicio.strftime('%H:%M')} - {cita.hora_fin.strftime('%H:%M')}
🔧 Servicio: {cita.servicio.nombre} ({cita.servicio.get_categoria_display()})
🚗 Vehículo: {cita.vehiculo.marca} {cita.vehiculo.modelo} ({cita.vehiculo.placa})
💰 Valor Total Estimado: Q{precio_mostrar:.2f}
📊 Estado: {cita.get_estado_display()}

{f"📝 Notas: {cita.notas}" if cita.notas else ""}

INFORMACIÓN IMPORTANTE:
- Por favor, llega 15 minutos antes de tu cita
- Trae la documentación de tu vehículo
- Si necesitas cancelar o reprogramar, contáctanos con anticipación

¿NECESITAS AYUDA?
📞 +502 1234-5678
✉️ info@tallermecánico.gt

¡Te esperamos!

---
Taller Mecánico Profesional
Tu taller de confianza
    """.strip()
    
    try:
        # Crear y enviar email
        email = EmailMultiAlternatives(
            asunto,
            mensaje_texto,
            settings.EMAIL_HOST_USER,
            [destinatario_email]
        )
        email.attach_alternative(mensaje_html, "text/html")
        email.send()
        
        return True
        
    except Exception as e:
        print(f"Error al enviar email: {e}")
        return False