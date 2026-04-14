from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from .models import Cita, Vehiculo, TipoServicio, RecepcionVehiculo
from .api_serializers import (
    CitaSerializer, CitaCreacionSerializer,
    VehiculoSerializer, VehiculoWriteSerializer,
    TipoServicioSerializer, RecepcionSerializer,
)
from django.db.models import Q
from django.core.exceptions import ValidationError
from django.contrib.auth.models import User
from .tasks import enviar_correo_cita_task

# ===========================================================================
# SERVICIOS
# ===========================================================================

class ServiciosView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        q = request.query_params.get('q', '')
        categoria = request.query_params.get('categoria', '')
        
        filtros = Q()
        if q:
            filtros &= Q(nombre__icontains=q) | Q(descripcion__icontains=q)
        if categoria:
            filtros &= Q(categoria=categoria)
            
        servicios = TipoServicio.objects.filter(filtros).order_by('nombre')
        return Response(TipoServicioSerializer(servicios, many=True).data)

    def post(self, request):
        if not request.user.is_staff:
            return Response({'error': 'Solo el personal administrativo puede crear servicios.'}, status=status.HTTP_403_FORBIDDEN)
        
        serializer = TipoServicioSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class ServicioDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get_object(self, pk):
        try:
            return TipoServicio.objects.get(pk=pk)
        except TipoServicio.DoesNotExist:
            return None

    def get(self, request, pk):
        servicio = self.get_object(pk)
        if not servicio:
            return Response({'error': 'No encontrado'}, status=status.HTTP_404_NOT_FOUND)
        return Response(TipoServicioSerializer(servicio).data)

    def put(self, request, pk):
        if not request.user.is_staff:
            return Response({'error': 'Solo el personal administrativo puede modificar servicios.'}, status=status.HTTP_403_FORBIDDEN)
            
        servicio = self.get_object(pk)
        if not servicio:
            return Response({'error': 'No encontrado'}, status=status.HTTP_404_NOT_FOUND)
            
        serializer = TipoServicioSerializer(servicio, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        if not request.user.is_staff:
            return Response({'error': 'Solo el personal administrativo puede eliminar servicios.'}, status=status.HTTP_403_FORBIDDEN)
            
        servicio = self.get_object(pk)
        if not servicio:
            return Response({'error': 'No encontrado'}, status=status.HTTP_404_NOT_FOUND)
            
        servicio.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

# ===========================================================================
# CALENDARIO / CITAS
# ===========================================================================

class CalendarioCitasView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        citas = Cita.objects.select_related(
            'cliente', 'vehiculo', 'vehiculo__propietario',
            'servicio', 'atendida_por'
        ).all()
        return Response(CitaSerializer(citas, many=True).data)

class NuevaCitaView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        serializer = CitaCreacionSerializer(data=request.data)
        if serializer.is_valid():
            try:
                cita = serializer.save()
                enviar_correo_cita_task.delay(cita.id, 'confirmacion')
                return Response(CitaSerializer(cita).data, status=status.HTTP_201_CREATED)
            except ValidationError as e:
                error_msg = e.messages[0] if hasattr(e, 'messages') else str(e)
                return Response({'error': error_msg}, status=status.HTTP_400_BAD_REQUEST)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class MisCitasView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        citas = Cita.objects.filter(cliente=request.user).order_by('-fecha', '-hora_inicio')
        return Response(CitaSerializer(citas, many=True).data)

class CancelarCitaView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        if not pk:
            return Response({"error": "Debe proporcionar ID de cita."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            cita = Cita.objects.get(pk=pk)
            # Solo quien la creó o un staff puede borrar
            if cita.cliente != request.user and not request.user.is_staff:
                return Response(status=status.HTTP_403_FORBIDDEN)
            cita.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Cita.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)



# ===========================================================================
# VEHÍCULOS - CRUD
# ===========================================================================

class VehiculosView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        q = request.query_params.get('q', '')
        if request.user.is_staff:
            qs = Vehiculo.objects.select_related('propietario').all()
            if q:
                qs = qs.filter(
                    Q(placa__icontains=q) |
                    Q(marca__icontains=q) |
                    Q(modelo__icontains=q) |
                    Q(propietario__first_name__icontains=q) |
                    Q(propietario__last_name__icontains=q) |
                    Q(propietario__username__icontains=q)
                )
            propietario_id = request.query_params.get('propietario_id')
            if propietario_id:
                qs = qs.filter(propietario_id=propietario_id)
        else:
            qs = Vehiculo.objects.filter(propietario=request.user)
        return Response(VehiculoSerializer(qs, many=True).data)

    def post(self, request):
        if not request.user.is_staff:
            # Clientes solo pueden agregar sus propios vehículos
            data = request.data.copy()
            data['propietario_id'] = request.user.id
            serializer = VehiculoWriteSerializer(data=data)
        else:
            serializer = VehiculoWriteSerializer(data=request.data)
        if serializer.is_valid():
            vehiculo = serializer.save()
            return Response(VehiculoSerializer(vehiculo).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class VehiculoDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def _get_vehiculo(self, pk, user):
        try:
            v = Vehiculo.objects.select_related('propietario').get(pk=pk)
            if not user.is_staff and v.propietario != user:
                return None, Response({'error': 'No autorizado.'}, status=status.HTTP_403_FORBIDDEN)
            return v, None
        except Vehiculo.DoesNotExist:
            return None, Response({'error': 'Vehículo no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

    def get(self, request, pk):
        v, err = self._get_vehiculo(pk, request.user)
        if err: return err
        return Response(VehiculoSerializer(v).data)

    def put(self, request, pk):
        v, err = self._get_vehiculo(pk, request.user)
        if err: return err
        data = request.data.copy()
        if not request.user.is_staff:
            data['propietario_id'] = request.user.id
        serializer = VehiculoWriteSerializer(v, data=data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(VehiculoSerializer(v).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        v, err = self._get_vehiculo(pk, request.user)
        if err: return err
        try:
            from django.db.models.deletion import ProtectedError, RestrictedError
            v.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except (ProtectedError, RestrictedError) as e:
            return Response(
                {'error': f'No se puede eliminar el vehículo {v.placa} porque tiene Citas, Recepciones o Facturas atadas.'},
                status=status.HTTP_400_BAD_REQUEST
            )

    def delete(self, request, pk):
        if not request.user.is_staff:
            return Response({'error': 'Sin permisos.'}, status=status.HTTP_403_FORBIDDEN)
        v, err = self._get_vehiculo(pk, request.user)
        if err: return err
        v.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

class VehiculoHistorialView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            v = Vehiculo.objects.get(pk=pk)
            if not request.user.is_staff and v.propietario != request.user:
                return Response({'error': 'No autorizado.'}, status=status.HTTP_403_FORBIDDEN)
        except Vehiculo.DoesNotExist:
            return Response({'error': 'No encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        citas = Cita.objects.filter(vehiculo=v).select_related('servicio').order_by('-fecha')
        recepciones = RecepcionVehiculo.objects.filter(vehiculo=v).select_related('recibido_por').order_by('-fecha_ingreso')
        return Response({
            'vehiculo': VehiculoSerializer(v).data,
            'citas': CitaSerializer(citas, many=True).data,
            'recepciones': RecepcionSerializer(recepciones, many=True).data,
        })

# ===========================================================================
# RECEPCIÓN / CHECK-IN
# ===========================================================================

class RecepcionCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Listado de todas las recepciones (solo staff)"""
        if not request.user.is_staff:
            return Response({'error': 'Sin permisos.'}, status=status.HTTP_403_FORBIDDEN)
        qs = RecepcionVehiculo.objects.select_related(
            'vehiculo', 'vehiculo__propietario', 'recibido_por', 'cita'
        ).order_by('-fecha_ingreso')
        q = request.query_params.get('q', '')
        if q:
            qs = qs.filter(
                Q(vehiculo__placa__icontains=q) |
                Q(vehiculo__propietario__first_name__icontains=q) |
                Q(vehiculo__propietario__last_name__icontains=q) |
                Q(vehiculo__propietario__username__icontains=q)
            )
        return Response(RecepcionSerializer(qs[:50], many=True).data)

    def post(self, request):
        if not request.user.is_staff:
            return Response({'error': 'Solo el personal puede registrar recepciones.'}, status=status.HTTP_403_FORBIDDEN)

        import json
        
        # Convertir a dict estándar para evitar comportamientos del QueryDict con listas
        parsed_data = {}
        for k, v in request.data.items():
            parsed_data[k] = v
            
        # Arreglar booleanos
        for field in ['tiene_llanta_repuesto', 'tiene_gata_herramientas', 'tiene_radio', 'tiene_documentos']:
            val = parsed_data.get(field)
            if val in ['true', 'True', True, 1, '1']: parsed_data[field] = True
            elif val in ['false', 'False', False, 0, '0']: parsed_data[field] = False
            
        # Arreglar JSON fields
        for json_field in ['luces_tablero', 'estado_fluidos']:
            val = parsed_data.get(json_field)
            if isinstance(val, str):
                try:
                    parsed_data[json_field] = json.loads(val)
                except Exception:
                    parsed_data[json_field] = {}

        serializer = RecepcionSerializer(data=parsed_data)
        if serializer.is_valid():
            recepcion = serializer.save(recibido_por=request.user)
            
            # Guardar fotos si vinieron
            fotos = request.FILES.getlist('fotos_upload')
            if fotos:
                from .models import RecepcionFoto
                for foto in fotos:
                    RecepcionFoto.objects.create(recepcion=recepcion, imagen=foto)

            # Crear Orden de Trabajo automáticamente si hay cita vinculada
            if recepcion.cita:
                from taller.models import OrdenTrabajo
                if not hasattr(recepcion.cita, 'orden_trabajo'):
                    diagnostico = (
                        f"Ingreso #{recepcion.id} | Km: {recepcion.kilometraje} | "
                        f"Gasolina: {recepcion.gasolina_pct}%\n"
                        f"Motivo: {recepcion.motivo_ingreso}"
                    )
                    OrdenTrabajo.objects.create(
                        cita=recepcion.cita,
                        vehiculo=recepcion.vehiculo,
                        estado='EN_ESPERA',
                        diagnostico=diagnostico,
                    )

            return Response(RecepcionSerializer(recepcion, context={'request': request}).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class RecepcionDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            r = RecepcionVehiculo.objects.select_related(
                'vehiculo', 'vehiculo__propietario', 'recibido_por', 'cita'
            ).get(pk=pk)
            # Solo staff o el propietario del vehículo
            if not request.user.is_staff and r.vehiculo.propietario != request.user:
                return Response({'error': 'Sin permisos.'}, status=status.HTTP_403_FORBIDDEN)
            return Response(RecepcionSerializer(r, context={'request': request}).data)
        except RecepcionVehiculo.DoesNotExist:
            return Response({'error': 'No encontrado.'}, status=status.HTTP_404_NOT_FOUND)


class RecepcionEnviarBoletaView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            recepcion = RecepcionVehiculo.objects.get(pk=pk)
            # Solo staff
            if not request.user.is_staff:
                return Response({'error': 'Sin permisos.'}, status=status.HTTP_403_FORBIDDEN)
            
            destinatario = request.data.get('email') or (recepcion.vehiculo.propietario.email if recepcion.vehiculo.propietario else None)
            
            if not destinatario:
                return Response({'error': 'El propietario del vehículo no tiene un correo registrado y no se proporcionó uno.'}, status=status.HTTP_400_BAD_REQUEST)
            
            from django.core.mail import EmailMultiAlternatives
            from django.conf import settings
            import datetime
            
            asunto = f'Boleta de Recepción Digital #{str(recepcion.id).zfill(5)} - Taller Mecánico'
            v = recepcion.vehiculo
            enlace = request.data.get('url', f"{getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')}/citas/recepcion/{recepcion.id}/boleta")
            
            mensaje_html = f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                <h2>¡Hola {recepcion.vehiculo.propietario.first_name if recepcion.vehiculo.propietario else 'Cliente'}!</h2>
                <p>Adjunto a este correo compartimos el enlace directo a tu <strong>Boleta de Recepción Digital</strong> para tu vehículo <strong>{v.marca} {v.modelo}</strong> (Placas: {v.placa}).</p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{enlace}" style="background-color: #2b6cb0; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block;">
                        📄 Abrir mi Boleta de Ingreso
                    </a>
                </div>
                
                <p>Dentro de esta boleta podrás validar los daños visuales preexistentes, niveles de fluido, combustible al {recepcion.gasolina_pct}% y más detalles.</p>
                <p>Cualquier duda adicional, puedes responder a este correo o contactar con tu asesor.</p>
                
                <hr style="border: 1px solid #eee; margin-top: 30px;" />
                <p style="font-size: 12px; color: #888; text-align: center;">Taller Mecánico Profesional</p>
            </div>
            """
            
            mensaje_texto = f"Hola, puedes ver tu boleta de recepción en el siguiente enlace: {enlace}"
            email = EmailMultiAlternatives(asunto, mensaje_texto, getattr(settings, 'EMAIL_HOST_USER', 'info@taller.com'), [destinatario])
            email.attach_alternative(mensaje_html, "text/html")
            email.send()
            
            return Response({'mensaje': f'Correo enviado a {destinatario}'}, status=status.HTTP_200_OK)
        except RecepcionVehiculo.DoesNotExist:
            return Response({'error': 'Recepción no encontrada.'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ===========================================================================
# VEHÍCULOS - Vista searchable para dropdowns (compatibilidad)
# ===========================================================================

class MisVehiculosView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        if request.user.is_staff:
            q = request.query_params.get('q', '')
            if q:
                vehiculos = Vehiculo.objects.filter(Q(placa__icontains=q) | Q(propietario__username__icontains=q))[:15]
            else:
                vehiculos = Vehiculo.objects.all()[:20]
        else:
            vehiculos = Vehiculo.objects.filter(propietario=request.user)
        return Response(VehiculoSerializer(vehiculos, many=True).data)

# ===========================================================================
# CLIENTES (para SearchSelect)
# ===========================================================================

class ClientesListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not request.user.is_staff:
            return Response({'error': 'Sin permisos.'}, status=status.HTTP_403_FORBIDDEN)
        from .api_serializers import ClienteMiniSerializer
        q = request.query_params.get('q', '')
        qs = User.objects.filter(is_staff=False)
        if q:
            qs = qs.filter(
                Q(username__icontains=q) |
                Q(first_name__icontains=q) |
                Q(last_name__icontains=q) |
                Q(email__icontains=q)
            )
        qs = qs[:30]
        return Response(ClienteMiniSerializer(qs, many=True).data)
