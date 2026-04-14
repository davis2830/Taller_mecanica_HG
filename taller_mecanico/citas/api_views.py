from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
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

class ServicioListView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        servicios = TipoServicio.objects.all()
        return Response(TipoServicioSerializer(servicios, many=True).data)

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
        try:
            cita = Cita.objects.get(pk=pk)
            if cita.estado in ['COMPLETADA', 'CANCELADA']:
                return Response({'error': f'No se puede cancelar una cita en estado {cita.estado}'}, status=status.HTTP_400_BAD_REQUEST)
            cita.estado = 'CANCELADA'
            cita.save()
            enviar_correo_cita_task.delay(cita.id, 'cambio_estado')
            return Response(CitaSerializer(cita).data, status=status.HTTP_200_OK)
        except Cita.DoesNotExist:
            return Response({'error': 'Cita no encontrada.'}, status=status.HTTP_404_NOT_FOUND)

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

        serializer = RecepcionSerializer(data=request.data)
        if serializer.is_valid():
            recepcion = serializer.save(recibido_por=request.user)

            # Crear Orden de Trabajo automáticamente si hay cita vinculada
            if recepcion.cita:
                from taller.models import OrdenTrabajo
                if not hasattr(recepcion.cita, 'orden_trabajo'):
                    diagnostico = (
                        f"Ingreso #{recepcion.id} | Km: {recepcion.kilometraje} | "
                        f"Gasolina: {recepcion.get_nivel_gasolina_display()}\n"
                        f"Motivo: {recepcion.motivo_ingreso}"
                    )
                    OrdenTrabajo.objects.create(
                        cita=recepcion.cita,
                        vehiculo=recepcion.vehiculo,
                        estado='EN_ESPERA',
                        diagnostico=diagnostico,
                    )

            return Response(RecepcionSerializer(recepcion).data, status=status.HTTP_201_CREATED)
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
            return Response(RecepcionSerializer(r).data)
        except RecepcionVehiculo.DoesNotExist:
            return Response({'error': 'No encontrado.'}, status=status.HTTP_404_NOT_FOUND)


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
