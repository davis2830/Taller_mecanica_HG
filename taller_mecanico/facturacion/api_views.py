from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import serializers
from django.db.models import Q
from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger

from facturacion.models import Factura
from taller.models import OrdenTrabajo


# ── Serializers ──────────────────────────────────────────────────────────────

class FacturaListSerializer(serializers.ModelSerializer):
    orden_id      = serializers.IntegerField(source='orden.id', read_only=True)
    cliente_nombre = serializers.SerializerMethodField()
    cliente_email  = serializers.SerializerMethodField()
    vehiculo_placa = serializers.SerializerMethodField()
    vehiculo_desc  = serializers.SerializerMethodField()
    servicio_nombre = serializers.SerializerMethodField()
    subtotal       = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    total_general  = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    metodo_pago_display = serializers.SerializerMethodField()
    estado_display = serializers.SerializerMethodField()

    class Meta:
        model = Factura
        fields = [
            'id', 'numero_factura', 'orden_id',
            'cliente_nombre', 'cliente_email',
            'vehiculo_placa', 'vehiculo_desc', 'servicio_nombre',
            'costo_mano_obra', 'costo_repuestos', 'descuento',
            'subtotal', 'total_general',
            'metodo_pago', 'metodo_pago_display',
            'estado', 'estado_display',
            'fecha_emision', 'fecha_pagada',
            'notas_internas',
        ]

    def _get_orden(self, obj):
        return obj.orden

    def get_cliente_nombre(self, obj):
        try:
            c = obj.orden.cita.cliente
            return f"{c.first_name} {c.last_name}".strip() if c else None
        except Exception:
            return None

    def get_cliente_email(self, obj):
        try:
            return obj.orden.cita.cliente.email
        except Exception:
            return None

    def get_vehiculo_placa(self, obj):
        try:
            return obj.orden.vehiculo.placa
        except Exception:
            return None

    def get_vehiculo_desc(self, obj):
        try:
            v = obj.orden.vehiculo
            return f"{v.marca} {v.modelo} {getattr(v, 'año', '')}".strip()
        except Exception:
            return None

    def get_servicio_nombre(self, obj):
        try:
            return obj.orden.cita.servicio.nombre
        except Exception:
            return None

    def get_metodo_pago_display(self, obj):
        return obj.get_metodo_pago_display() if obj.metodo_pago else None

    def get_estado_display(self, obj):
        return obj.get_estado_display()


# ── Views ─────────────────────────────────────────────────────────────────────

class ListaFacturasAPIView(APIView):
    """
    GET /api/v1/facturacion/
    Params: q, estado (BORRADOR|EMITIDA|ANULADA), page, page_size (default 20)
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not (request.user.is_staff or request.user.is_superuser):
            return Response({'error': 'Acceso restringido al personal administrativo.'}, status=403)

        qs = Factura.objects.select_related(
            'orden', 'orden__cita', 'orden__cita__cliente',
            'orden__cita__servicio', 'orden__vehiculo'
        ).order_by('-fecha_emision')

        q      = request.query_params.get('q', '')
        estado = request.query_params.get('estado', '')

        if estado:
            qs = qs.filter(estado=estado)

        if q:
            qs = qs.filter(
                Q(numero_factura__icontains=q)                   |
                Q(orden__vehiculo__placa__icontains=q)           |
                Q(orden__cita__cliente__first_name__icontains=q) |
                Q(orden__cita__cliente__last_name__icontains=q)
            )

        page_size = int(request.query_params.get('page_size', 20))
        paginator = Paginator(qs, page_size)
        page_num  = request.query_params.get('page', 1)
        try:
            page = paginator.page(page_num)
        except (EmptyPage, PageNotAnInteger):
            page = paginator.page(1)

        # Acumulados solo de facturas EMITIDAS en la vista (sin filtro de página)
        from django.db.models import Sum
        emitidas = qs.filter(estado='EMITIDA')
        total_ingresos = float(
            (emitidas.aggregate(
                t=Sum('costo_mano_obra') + Sum('costo_repuestos') - Sum('descuento')
            )['t'] or 0)
        )

        return Response({
            'count':          paginator.count,
            'pages':          paginator.num_pages,
            'page':           page.number,
            'total_ingresos': total_ingresos,
            'results':        FacturaListSerializer(page.object_list, many=True).data,
        })
