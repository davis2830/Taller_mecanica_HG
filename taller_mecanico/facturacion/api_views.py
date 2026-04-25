from decimal import Decimal

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import serializers
from rest_framework.permissions import BasePermission
from django.db.models import Q
from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger
from django.shortcuts import get_object_or_404

from facturacion.models import Factura, ConfiguracionFacturacion
from facturacion.tasks import enviar_factura_task
from taller.models import OrdenTrabajo


# ── Serializers ──────────────────────────────────────────────────────────────

class FacturaListSerializer(serializers.ModelSerializer):
    orden_id      = serializers.IntegerField(source='orden.id', read_only=True)
    cita_id       = serializers.SerializerMethodField()
    cliente_nombre = serializers.SerializerMethodField()
    cliente_email  = serializers.SerializerMethodField()
    vehiculo_placa = serializers.SerializerMethodField()
    vehiculo_desc  = serializers.SerializerMethodField()
    servicio_nombre = serializers.SerializerMethodField()
    subtotal       = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    total_sin_iva  = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    monto_iva      = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    total_general  = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    metodo_pago_display = serializers.SerializerMethodField()
    estado_display = serializers.SerializerMethodField()

    recepcion_id = serializers.SerializerMethodField()

    class Meta:
        model = Factura
        fields = [
            'id', 'numero_factura', 'orden_id', 'cita_id', 'recepcion_id',
            'cliente_nombre', 'cliente_email',
            'vehiculo_placa', 'vehiculo_desc', 'servicio_nombre',
            'costo_mano_obra', 'costo_repuestos', 'descuento',
            'iva_incluido', 'tasa_iva',
            'subtotal', 'total_sin_iva', 'monto_iva', 'total_general',
            'metodo_pago', 'metodo_pago_display',
            'estado', 'estado_display',
            'fecha_emision', 'fecha_pagada',
            'notas_internas',
        ]

    def _get_orden(self, obj):
        return obj.orden

    def get_cita_id(self, obj):
        try:
            return obj.orden.cita_id
        except Exception:
            return None

    def get_recepcion_id(self, obj):
        try:
            cita = obj.orden.cita
            if not cita:
                return None
            r = cita.recepciones.order_by('-fecha_ingreso').first()
            return r.id if r else None
        except Exception:
            return None

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


# ── Detalle de factura para vista imprimible en React ────────────────────────

class FacturaDetailAPIView(APIView):
    """
    GET /api/v1/facturacion/<id>/
    Devuelve datos completos de la factura para renderizar la vista imprimible
    en React (reemplazo del template Django `factura_print.html`).
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, factura_id):
        if not (request.user.is_staff or request.user.is_superuser):
            return Response({'error': 'Acceso restringido al personal administrativo.'}, status=403)

        factura = get_object_or_404(
            Factura.objects.select_related(
                'orden', 'orden__cita', 'orden__cita__cliente',
                'orden__cita__servicio', 'orden__vehiculo',
                'orden__vehiculo__propietario',
            ).prefetch_related('orden__repuestos__producto'),
            id=factura_id,
        )

        orden = factura.orden
        vehiculo = orden.vehiculo
        propietario = getattr(vehiculo, 'propietario', None)
        cita_obj = getattr(orden, 'cita', None)
        servicio = getattr(cita_obj, 'servicio', None)
        recepcion_obj = (
            cita_obj.recepciones.order_by('-fecha_ingreso').first()
            if cita_obj else None
        )

        def _nombre_completo(u):
            if not u:
                return ''
            full = f"{u.first_name} {u.last_name}".strip()
            return full or u.username

        perfil_cliente = getattr(propietario, 'perfil', None) if propietario else None
        config_fact = ConfiguracionFacturacion.get()

        repuestos = [
            {
                'id': r.id,
                'cantidad': r.cantidad,
                'producto_nombre': r.producto.nombre if r.producto else '—',
                'precio_unitario': str(r.precio_unitario),
                'subtotal': str(r.subtotal),
            }
            for r in orden.repuestos.all()
        ]

        payload = {
            'id': factura.id,
            'numero_factura': factura.numero_factura,
            'estado': factura.estado,
            'estado_display': factura.get_estado_display(),
            'metodo_pago': factura.metodo_pago,
            'metodo_pago_display': factura.get_metodo_pago_display() if factura.metodo_pago else None,
            'fecha_emision': factura.fecha_emision.isoformat() if factura.fecha_emision else None,
            'fecha_pagada': factura.fecha_pagada.isoformat() if factura.fecha_pagada else None,
            'costo_mano_obra': str(factura.costo_mano_obra),
            'costo_repuestos': str(factura.costo_repuestos),
            'descuento': str(factura.descuento),
            'iva_incluido': factura.iva_incluido,
            'tasa_iva': str(factura.tasa_iva),
            'tasa_iva_pct': str((factura.tasa_iva * 100).quantize(Decimal('0.01'))),
            'total_sin_iva': str(factura.total_sin_iva),
            'monto_iva': str(factura.monto_iva),
            'subtotal': str(factura.subtotal),
            'total_general': str(factura.total_general),
            'notas_internas': factura.notas_internas or '',
            'orden': {
                'id': orden.id,
                'estado': orden.estado,
            },
            'cita_id': getattr(cita_obj, 'id', None),
            'recepcion': {
                'id': recepcion_obj.id,
                'fecha_ingreso': recepcion_obj.fecha_ingreso.isoformat(),
                'kilometraje': recepcion_obj.kilometraje,
                'gasolina_pct': recepcion_obj.gasolina_pct,
            } if recepcion_obj else None,
            'servicio': {
                'nombre': servicio.nombre if servicio else '—',
                'duracion': getattr(servicio, 'duracion', None),
            },
            'cliente': {
                'id': getattr(propietario, 'id', None),
                'nombre': _nombre_completo(propietario),
                'email': getattr(propietario, 'email', '') or '',
                'telefono': (getattr(perfil_cliente, 'telefono', None) or '') if perfil_cliente else '',
                'nit': perfil_cliente.nit_normalizado if perfil_cliente else 'CF',
                'nombre_fiscal': (
                    perfil_cliente.nombre_fiscal_o_nombre if perfil_cliente
                    else _nombre_completo(propietario)
                ),
                'direccion_fiscal': (
                    perfil_cliente.direccion_fiscal_o_direccion if perfil_cliente else 'Ciudad'
                ),
            },
            'vehiculo': {
                'id': vehiculo.id,
                'marca': vehiculo.marca,
                'modelo': vehiculo.modelo,
                'anio': getattr(vehiculo, 'año', None),
                'placa': vehiculo.placa,
            },
            'repuestos': repuestos,
            'taller': {
                'nombre': config_fact.nombre_comercial or config_fact.nombre_fiscal,
                'nombre_fiscal': config_fact.nombre_fiscal,
                'direccion': config_fact.direccion_fiscal,
                'telefono': config_fact.telefono,
                'correo': config_fact.correo,
                'nit': config_fact.nit_emisor,
                'afiliacion_iva': config_fact.afiliacion_iva,
                'afiliacion_iva_display': config_fact.get_afiliacion_iva_display(),
                'serie_fel': config_fact.serie_fel,
                'ambiente': config_fact.ambiente,
                'establecimiento_codigo': config_fact.establecimiento_codigo,
            },
        }
        return Response(payload)


class _EsAdministrador(BasePermission):
    """Permite acceso solo a administradores (superuser/staff o Rol=Administrador)."""
    message = "Solo los administradores pueden ver o modificar la configuración fiscal."

    def has_permission(self, request, view):
        u = request.user
        if not (u and u.is_authenticated):
            return False
        if u.is_superuser or u.is_staff:
            return True
        rol = getattr(getattr(u, 'perfil', None), 'rol', None)
        return bool(rol and rol.nombre.lower() == 'administrador')


class ConfiguracionFacturacionSerializer(serializers.ModelSerializer):
    afiliacion_iva_display = serializers.CharField(source='get_afiliacion_iva_display', read_only=True)
    ambiente_display = serializers.CharField(source='get_ambiente_display', read_only=True)
    certificador_display = serializers.CharField(source='get_certificador_display', read_only=True)
    tasa_iva_sugerida = serializers.SerializerMethodField()

    class Meta:
        model = ConfiguracionFacturacion
        fields = [
            'nit_emisor', 'nombre_fiscal', 'nombre_comercial',
            'direccion_fiscal', 'telefono', 'correo',
            'afiliacion_iva', 'afiliacion_iva_display',
            'establecimiento_codigo', 'serie_fel',
            'ambiente', 'ambiente_display',
            'certificador', 'certificador_display',
            'certificador_api_url', 'certificador_usuario', 'certificador_api_key',
            'tasa_iva_sugerida',
            'actualizado_el',
        ]
        read_only_fields = ['actualizado_el']

    def get_tasa_iva_sugerida(self, obj):
        return str(obj.tasa_iva_default)


class ConfiguracionFacturacionView(APIView):
    """GET / PATCH singleton de configuración fiscal del emisor."""
    permission_classes = [_EsAdministrador]

    def get(self, request):
        config = ConfiguracionFacturacion.get()
        return Response(ConfiguracionFacturacionSerializer(config).data)

    def patch(self, request):
        config = ConfiguracionFacturacion.get()
        serializer = ConfiguracionFacturacionSerializer(config, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)


class FacturaReenviarCorreoAPIView(APIView):
    """
    POST /api/v1/facturacion/<id>/reenviar-correo/
    Reencola el envío de la factura al correo del cliente asociado.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, factura_id):
        if not (request.user.is_staff or request.user.is_superuser):
            return Response({'error': 'Acceso restringido al personal administrativo.'}, status=403)

        factura = get_object_or_404(Factura, id=factura_id)
        orden = factura.orden
        cliente = getattr(getattr(orden, 'cita', None), 'cliente', None)
        email = getattr(cliente, 'email', None)

        if not email:
            return Response(
                {'error': 'El cliente no tiene correo registrado.'},
                status=400,
            )

        enviar_factura_task.delay(factura.id, email)
        return Response({
            'ok': True,
            'email': email,
            'mensaje': f'Factura {factura.numero_factura or factura.id} encolada para reenvío a {email}.',
        })
