from decimal import Decimal

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import serializers
from rest_framework.permissions import BasePermission
from django.db.models import Q
from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger
from django.shortcuts import get_object_or_404

from django.http import HttpResponse

from facturacion.models import Factura, ConfiguracionFacturacion, DocumentoElectronico
from facturacion.services.certificador import get_certificador
from facturacion.services.xml_dte import construir_xml_dte
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
            'dte': _serializar_dte_activo(factura),
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


def _serializar_dte(doc: DocumentoElectronico) -> dict:
    """Representación API de un DTE (sin XML crudo, para detail liviano)."""
    return {
        'id': doc.id,
        'tipo_dte': doc.tipo_dte,
        'tipo_dte_display': doc.get_tipo_dte_display(),
        'estado': doc.estado,
        'estado_display': doc.get_estado_display(),
        'uuid_sat': doc.uuid_sat,
        'serie': doc.serie,
        'numero_autorizacion': doc.numero_autorizacion,
        'serie_numero': doc.serie_numero,
        'certificador_usado': doc.certificador_usado,
        'ambiente': doc.ambiente,
        'errores': doc.errores,
        'motivo_anulacion': doc.motivo_anulacion,
        'documento_original_id': doc.documento_original_id,
        'fecha_creacion': doc.fecha_creacion.isoformat() if doc.fecha_creacion else None,
        'fecha_certificacion': doc.fecha_certificacion.isoformat() if doc.fecha_certificacion else None,
        'fecha_anulacion': doc.fecha_anulacion.isoformat() if doc.fecha_anulacion else None,
        'tiene_xml_certificado': bool(doc.xml_certificado),
    }


def _serializar_dte_activo(factura) -> dict | None:
    """Devuelve el DTE vigente más relevante: último CERTIFICADO, o último intento."""
    vigente = factura.documentos.filter(estado='CERTIFICADO').order_by('-fecha_certificacion', '-id').first()
    if not vigente:
        vigente = factura.documentos.order_by('-id').first()
    return _serializar_dte(vigente) if vigente else None


class FacturaCertificarAPIView(APIView):
    """
    POST /api/v1/facturacion/<id>/certificar/
    Body: { "tipo_dte": "FACT" | "NCRE", "motivo"?: str, "documento_original_id"?: int }

    Genera el XML DTE, llama al certificador (mock si no hay proveedor real)
    y guarda un DocumentoElectronico con el resultado.
    """
    permission_classes = [_EsAdministrador]

    def post(self, request, factura_id):
        factura = get_object_or_404(Factura, id=factura_id)

        if factura.estado == 'ANULADA':
            return Response({'error': 'La factura está anulada. No se puede certificar.'}, status=400)

        tipo_dte = request.data.get('tipo_dte', 'FACT')
        if tipo_dte not in dict(DocumentoElectronico.TIPO_CHOICES):
            return Response({'error': f'Tipo DTE inválido: {tipo_dte}.'}, status=400)

        documento_original = None
        if tipo_dte == 'NCRE':
            doc_original_id = request.data.get('documento_original_id')
            if not doc_original_id:
                # Por defecto usar el último FACT certificado de la misma factura.
                documento_original = factura.documentos.filter(
                    tipo_dte='FACT', estado='CERTIFICADO',
                ).order_by('-fecha_certificacion').first()
                if not documento_original:
                    return Response(
                        {'error': 'No hay FACT certificado previo para emitir una NCRE.'},
                        status=400,
                    )
            else:
                documento_original = get_object_or_404(DocumentoElectronico, id=doc_original_id)

        config = ConfiguracionFacturacion.get()

        # Crear el documento pendiente.
        doc = DocumentoElectronico.objects.create(
            factura=factura,
            tipo_dte=tipo_dte,
            estado='PENDIENTE',
            ambiente=config.ambiente,
            certificador_usado=config.certificador or 'MOCK',
            documento_original=documento_original,
            motivo_anulacion=request.data.get('motivo', '') if tipo_dte == 'NCRE' else '',
        )

        try:
            xml = construir_xml_dte(doc)
            doc.xml_generado = xml
            doc.save(update_fields=['xml_generado'])
        except Exception as e:
            doc.estado = 'ERROR'
            doc.errores = f'Error generando XML: {e}'
            doc.save(update_fields=['estado', 'errores'])
            return Response({'error': f'No se pudo generar el XML: {e}'}, status=500)

        cliente = get_certificador(config)
        resultado = cliente.certificar(doc)

        if resultado.ok:
            doc.estado = 'CERTIFICADO'
            doc.uuid_sat = resultado.uuid_sat
            doc.serie = resultado.serie
            doc.numero_autorizacion = resultado.numero_autorizacion
            doc.xml_certificado = resultado.xml_certificado or doc.xml_generado
            doc.fecha_certificacion = resultado.fecha_sat
            doc.errores = ''
            doc.save()
        else:
            doc.estado = 'RECHAZADO'
            doc.errores = resultado.error
            doc.save(update_fields=['estado', 'errores'])
            return Response(
                {'error': resultado.error or 'Certificación rechazada.', 'dte': _serializar_dte(doc)},
                status=400,
            )

        return Response({'ok': True, 'dte': _serializar_dte(doc)}, status=201)


class FacturaAnularAPIView(APIView):
    """
    POST /api/v1/facturacion/<id>/anular/
    Body: { "motivo": "...", "documento_id"?: int }

    Anula ante SAT el último DTE certificado (o uno específico).
    """
    permission_classes = [_EsAdministrador]

    def post(self, request, factura_id):
        factura = get_object_or_404(Factura, id=factura_id)
        motivo = (request.data.get('motivo') or '').strip()
        if not motivo:
            return Response({'error': 'Debes indicar el motivo de la anulación.'}, status=400)

        doc_id = request.data.get('documento_id')
        if doc_id:
            doc = get_object_or_404(DocumentoElectronico, id=doc_id, factura=factura)
        else:
            doc = factura.documentos.filter(estado='CERTIFICADO').order_by('-fecha_certificacion').first()
            if not doc:
                return Response({'error': 'No hay DTE certificado para anular.'}, status=400)

        if doc.estado == 'ANULADO':
            return Response({'error': 'El DTE ya está anulado.'}, status=400)

        config = ConfiguracionFacturacion.get()
        cliente = get_certificador(config)
        resultado = cliente.anular(doc, motivo)

        if not resultado.ok:
            return Response({'error': resultado.error}, status=400)

        doc.estado = 'ANULADO'
        doc.motivo_anulacion = motivo
        doc.fecha_anulacion = resultado.fecha_sat
        doc.save(update_fields=['estado', 'motivo_anulacion', 'fecha_anulacion'])

        # También marcar la factura como ANULADA.
        factura.estado = 'ANULADA'
        factura.save(update_fields=['estado'])

        return Response({'ok': True, 'dte': _serializar_dte(doc)})


class FacturaDocumentosAPIView(APIView):
    """GET /api/v1/facturacion/<id>/documentos/ — historial DTE de la factura."""
    permission_classes = [IsAuthenticated]

    def get(self, request, factura_id):
        factura = get_object_or_404(Factura, id=factura_id)
        docs = factura.documentos.all().order_by('-fecha_creacion')
        return Response({'documentos': [_serializar_dte(d) for d in docs]})


class DocumentoXMLAPIView(APIView):
    """
    GET /api/v1/facturacion/documentos/<doc_id>/xml/?tipo=generado|certificado
    Devuelve el XML como application/xml descargable.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, doc_id):
        doc = get_object_or_404(DocumentoElectronico, id=doc_id)
        tipo = request.query_params.get('tipo', 'certificado')
        xml = doc.xml_certificado if tipo == 'certificado' else doc.xml_generado
        if not xml:
            return Response({'error': f'No hay XML {tipo} para este documento.'}, status=404)
        response = HttpResponse(xml, content_type='application/xml; charset=utf-8')
        filename = f"{doc.tipo_dte}-{doc.uuid_sat or doc.id}-{tipo}.xml"
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response


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
