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

from facturacion.models import Factura, ConfiguracionFacturacion, DocumentoElectronico, PagoFactura
from facturacion.services.certificador import get_certificador
from facturacion.services.xml_dte import construir_xml_dte
from facturacion.tasks import enviar_factura_task
from taller.models import OrdenTrabajo
from usuarios.models import Empresa


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

    # ── CxC ──
    empresa_id = serializers.IntegerField(source='empresa.id', read_only=True, allow_null=True)
    empresa_nombre = serializers.SerializerMethodField()
    empresa_nit = serializers.SerializerMethodField()
    condicion_pago_display = serializers.SerializerMethodField()
    pago_estado_display = serializers.SerializerMethodField()
    saldo_pendiente = serializers.SerializerMethodField()
    total_pagado = serializers.SerializerMethodField()
    dias_atraso = serializers.IntegerField(read_only=True)

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
            # CxC
            'empresa_id', 'empresa_nombre', 'empresa_nit',
            'condicion_pago', 'condicion_pago_display',
            'dias_credito', 'fecha_vencimiento',
            'pago_estado', 'pago_estado_display',
            'saldo_pendiente', 'total_pagado', 'dias_atraso',
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

    def get_empresa_nombre(self, obj):
        return obj.empresa.razon_social if obj.empresa else None

    def get_empresa_nit(self, obj):
        return obj.empresa.nit if obj.empresa else None

    def get_condicion_pago_display(self, obj):
        return obj.get_condicion_pago_display()

    def get_pago_estado_display(self, obj):
        return obj.get_pago_estado_display()

    def get_saldo_pendiente(self, obj):
        return str(obj.saldo_pendiente)

    def get_total_pagado(self, obj):
        return str(obj.total_pagado)


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
            # ── CxC ──
            'empresa': (
                {
                    'id': factura.empresa.id,
                    'nit': factura.empresa.nit,
                    'razon_social': factura.empresa.razon_social,
                    'nombre_comercial': factura.empresa.nombre_comercial,
                    'direccion_fiscal': factura.empresa.direccion_fiscal,
                    'email_cobro': factura.empresa.email_cobro,
                }
                if factura.empresa else None
            ),
            'condicion_pago': factura.condicion_pago,
            'condicion_pago_display': factura.get_condicion_pago_display(),
            'dias_credito': factura.dias_credito,
            'fecha_vencimiento': factura.fecha_vencimiento.isoformat() if factura.fecha_vencimiento else None,
            'pago_estado': factura.pago_estado,
            'pago_estado_display': factura.get_pago_estado_display(),
            'saldo_pendiente': str(factura.saldo_pendiente),
            'total_pagado': str(factura.total_pagado),
            'dias_atraso': factura.dias_atraso,
            'override_motivo': factura.override_motivo or '',
            'override_por_username': factura.override_por.username if factura.override_por else None,
            'override_at': factura.override_at.isoformat() if factura.override_at else None,
            'pagos': [
                {
                    'id': p.id,
                    'monto': str(p.monto),
                    'metodo': p.metodo,
                    'metodo_display': p.get_metodo_display(),
                    'referencia': p.referencia,
                    'fecha_pago': p.fecha_pago.isoformat(),
                    'nota': p.nota,
                    'registrado_por': p.registrado_por.username if p.registrado_por else None,
                    'fecha_creacion': p.fecha_creacion.isoformat(),
                }
                for p in factura.pagos.order_by('-fecha_pago', '-id')
            ],
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
            'envio_automatico_factura', 'recordatorios_cobro_auto',
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

            # Auto-envío de la factura por correo (si está habilitado y solo
            # para FACT — no para NCRE).
            if config.envio_automatico_factura and tipo_dte == 'FACT':
                destino = _resolver_email_factura(factura)
                if destino:
                    try:
                        enviar_factura_task.delay(factura.id, destino)
                    except Exception:
                        # No bloqueamos la certificación si falla el envío.
                        pass
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


def _resolver_email_factura(factura):
    """
    Devuelve el correo destino apropiado para una factura:
    - Si tiene empresa con email_cobro → ese (B2B).
    - Sino el correo del cliente individual de la cita.
    - None si no hay correo disponible.
    """
    empresa = getattr(factura, 'empresa', None)
    if empresa and getattr(empresa, 'email_cobro', ''):
        return empresa.email_cobro
    cliente = getattr(getattr(getattr(factura, 'orden', None), 'cita', None), 'cliente', None)
    return getattr(cliente, 'email', None) or None


class FacturaReenviarCorreoAPIView(APIView):
    """
    POST /api/v1/facturacion/<id>/reenviar-correo/
    Body opcional: { "email": "destino@..." } para sobrescribir el destino.
    Reencola el envío de la factura al correo del cliente o empresa asociada.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, factura_id):
        if not (request.user.is_staff or request.user.is_superuser):
            return Response({'error': 'Acceso restringido al personal administrativo.'}, status=403)

        factura = get_object_or_404(Factura, id=factura_id)
        email = (request.data.get('email') or '').strip() or _resolver_email_factura(factura)

        if not email:
            return Response(
                {'error': 'No hay correo registrado para esta factura (ni del cliente ni de la empresa).'},
                status=400,
            )

        enviar_factura_task.delay(factura.id, email)
        return Response({
            'ok': True,
            'email': email,
            'mensaje': f'Factura {factura.numero_factura or factura.id} encolada para reenvío a {email}.',
        })


# ─── Cuentas por Cobrar (B2B) ─────────────────────────────────────────────────

class _EsAdminOSecretaria(BasePermission):
    """Personal del taller: admin, secretaria/recepcionista, mecánico."""
    message = "Solo el personal del taller puede gestionar cuentas por cobrar."

    def has_permission(self, request, view):
        u = request.user
        if not (u and u.is_authenticated):
            return False
        if u.is_superuser or u.is_staff:
            return True
        rol = getattr(getattr(u, 'perfil', None), 'rol', None)
        return bool(rol and rol.nombre.lower() in ('administrador', 'recepcionista', 'mecánico', 'mecanico'))


class _EsSuperadmin(BasePermission):
    """Solo superusuario (no basta con rol Administrador). Para overrides de crédito."""
    message = "Solo un superadministrador puede aprobar este override."

    def has_permission(self, request, view):
        u = request.user
        return bool(u and u.is_authenticated and u.is_superuser)


def _es_superadmin(user):
    return bool(user and user.is_authenticated and user.is_superuser)


class FacturaAsignarCreditoAPIView(APIView):
    """
    POST /api/v1/facturacion/<id>/asignar-credito/
    Body: {
      "empresa_id": 5,
      "dias_credito": 30,             # opcional, default = empresa.dias_credito
      "override_motivo": "...",       # requerido si la empresa está bloqueada
    }

    Convierte una factura BORRADOR/EMITIDA a CREDITO B2B asignándole una empresa.
    Aplica gating: si la empresa no puede facturar a crédito (vencimientos, límite,
    inactiva), solo un superadmin puede aprobar el override con motivo.
    """
    permission_classes = [_EsAdminOSecretaria]

    def post(self, request, factura_id):
        factura = get_object_or_404(Factura, id=factura_id)

        if factura.estado == 'ANULADA':
            return Response({'error': 'La factura está anulada.'}, status=400)

        empresa_id = request.data.get('empresa_id')
        if not empresa_id:
            return Response({'error': 'empresa_id es requerido.'}, status=400)
        empresa = get_object_or_404(Empresa, id=empresa_id)

        puede, motivo = empresa.puede_facturar_a_credito()
        override_motivo = (request.data.get('override_motivo') or '').strip()

        if not puede:
            if not _es_superadmin(request.user):
                return Response(
                    {
                        'error': motivo,
                        'requiere_override_superadmin': True,
                        'empresa_bloqueada': True,
                    },
                    status=403,
                )
            if not override_motivo:
                return Response(
                    {
                        'error': (
                            f"La empresa está bloqueada ({motivo}). "
                            "Como superadmin debes registrar un motivo de override."
                        ),
                        'requiere_override_motivo': True,
                    },
                    status=400,
                )

        # Snapshot de días de crédito (puede sobreescribirse en la petición).
        dias = request.data.get('dias_credito')
        if dias is None:
            dias = empresa.dias_credito
        try:
            dias = int(dias)
            if dias < 0:
                raise ValueError()
        except (TypeError, ValueError):
            return Response({'error': 'dias_credito debe ser un entero >= 0.'}, status=400)

        from django.utils import timezone as _tz
        factura.empresa = empresa
        factura.condicion_pago = 'CREDITO'
        factura.dias_credito = dias
        factura.calcular_fecha_vencimiento()
        if not puede:
            factura.override_motivo = override_motivo
            factura.override_por = request.user
            factura.override_at = _tz.now()
        factura.save(update_fields=[
            'empresa', 'condicion_pago', 'dias_credito', 'fecha_vencimiento',
            'override_motivo', 'override_por', 'override_at',
        ])
        # Si está EMITIDA, recalcular pago_estado para que pase a PENDIENTE.
        if factura.estado == 'EMITIDA':
            factura.recalcular_pago_estado(save=True)

        return Response({
            'ok': True,
            'factura_id': factura.id,
            'empresa_id': empresa.id,
            'condicion_pago': factura.condicion_pago,
            'dias_credito': factura.dias_credito,
            'fecha_vencimiento': factura.fecha_vencimiento.isoformat() if factura.fecha_vencimiento else None,
            'pago_estado': factura.pago_estado,
            'override_aplicado': not puede,
        })


class FacturaPagosAPIView(APIView):
    """
    GET  /api/v1/facturacion/<id>/pagos/   → lista de pagos de la factura
    POST /api/v1/facturacion/<id>/pagos/   → registrar nuevo pago

    Body POST: {
      "monto": "500.00",
      "metodo": "TRANSFERENCIA" | "EFECTIVO" | "CHEQUE" | "DEPOSITO" | "TARJETA" | "OTRO",
      "fecha_pago": "2026-04-25",   # opcional, default hoy
      "referencia": "TRX-12345",    # opcional
      "nota": "..."                 # opcional
    }
    """
    permission_classes = [_EsAdminOSecretaria]

    def get(self, request, factura_id):
        factura = get_object_or_404(Factura, id=factura_id)
        pagos = factura.pagos.order_by('-fecha_pago', '-id')
        return Response({
            'factura_id': factura.id,
            'total_general': str(factura.total_general),
            'total_pagado': str(factura.total_pagado),
            'saldo_pendiente': str(factura.saldo_pendiente),
            'pago_estado': factura.pago_estado,
            'pagos': [
                {
                    'id': p.id,
                    'monto': str(p.monto),
                    'metodo': p.metodo,
                    'metodo_display': p.get_metodo_display(),
                    'referencia': p.referencia,
                    'fecha_pago': p.fecha_pago.isoformat(),
                    'nota': p.nota,
                    'registrado_por': p.registrado_por.username if p.registrado_por else None,
                    'fecha_creacion': p.fecha_creacion.isoformat(),
                }
                for p in pagos
            ],
        })

    def post(self, request, factura_id):
        factura = get_object_or_404(Factura, id=factura_id)
        if factura.estado == 'ANULADA':
            return Response({'error': 'La factura está anulada.'}, status=400)
        if factura.condicion_pago != 'CREDITO':
            return Response(
                {'error': 'Solo se registran pagos parciales en facturas a crédito.'},
                status=400,
            )

        try:
            monto = Decimal(str(request.data.get('monto', '0')))
        except Exception:
            return Response({'error': 'Monto inválido.'}, status=400)
        if monto <= 0:
            return Response({'error': 'El monto debe ser mayor a 0.'}, status=400)

        # No permitir pagar más del saldo
        if monto > factura.saldo_pendiente:
            return Response(
                {
                    'error': (
                        f'El monto Q{monto} excede el saldo pendiente '
                        f'Q{factura.saldo_pendiente}.'
                    )
                },
                status=400,
            )

        metodo = request.data.get('metodo', 'TRANSFERENCIA')
        if metodo not in dict(PagoFactura.METODOS):
            return Response({'error': f'Método inválido: {metodo}.'}, status=400)

        from django.utils import timezone as _tz
        from datetime import date
        fecha_str = request.data.get('fecha_pago')
        if fecha_str:
            try:
                from datetime import datetime
                fecha = datetime.strptime(fecha_str, '%Y-%m-%d').date()
            except Exception:
                return Response({'error': 'Formato de fecha_pago inválido. Usa YYYY-MM-DD.'}, status=400)
        else:
            fecha = _tz.now().date()

        pago = PagoFactura.objects.create(
            factura=factura,
            monto=monto,
            metodo=metodo,
            fecha_pago=fecha,
            referencia=(request.data.get('referencia') or '').strip(),
            nota=(request.data.get('nota') or '').strip(),
            registrado_por=request.user if request.user.is_authenticated else None,
        )

        factura.refresh_from_db()
        return Response({
            'ok': True,
            'pago': {
                'id': pago.id,
                'monto': str(pago.monto),
                'metodo': pago.metodo,
                'metodo_display': pago.get_metodo_display(),
                'referencia': pago.referencia,
                'fecha_pago': pago.fecha_pago.isoformat(),
                'nota': pago.nota,
            },
            'factura': {
                'id': factura.id,
                'total_pagado': str(factura.total_pagado),
                'saldo_pendiente': str(factura.saldo_pendiente),
                'pago_estado': factura.pago_estado,
                'pago_estado_display': factura.get_pago_estado_display(),
            },
        }, status=201)


class PagoFacturaDetailAPIView(APIView):
    """
    DELETE /api/v1/facturacion/pagos/<pago_id>/
    Reversa un pago ya registrado (solo superadmin para evitar manipulación).
    """
    permission_classes = [_EsSuperadmin]

    def delete(self, request, pago_id):
        pago = get_object_or_404(PagoFactura, id=pago_id)
        factura = pago.factura
        pago.delete()
        return Response({
            'ok': True,
            'factura': {
                'id': factura.id,
                'total_pagado': str(factura.total_pagado),
                'saldo_pendiente': str(factura.saldo_pendiente),
                'pago_estado': factura.pago_estado,
            },
        })


class EmpresaEstadoCuentaAPIView(APIView):
    """
    GET /api/v1/facturacion/empresas/<empresa_id>/estado-cuenta/

    Devuelve estado de cuenta agrupado por aging buckets:
    { vigente, 1-30, 31-60, 61-90, 90+ }
    """
    permission_classes = [_EsAdminOSecretaria]

    def get(self, request, empresa_id):
        empresa = get_object_or_404(Empresa, id=empresa_id)
        from django.utils import timezone as _tz
        hoy = _tz.now().date()

        facturas = Factura.objects.filter(
            empresa=empresa,
            estado='EMITIDA',
        ).order_by('fecha_emision')

        buckets = {
            'vigente': {'count': 0, 'monto': Decimal('0.00'), 'facturas': []},
            '1-30':    {'count': 0, 'monto': Decimal('0.00'), 'facturas': []},
            '31-60':   {'count': 0, 'monto': Decimal('0.00'), 'facturas': []},
            '61-90':   {'count': 0, 'monto': Decimal('0.00'), 'facturas': []},
            '90+':     {'count': 0, 'monto': Decimal('0.00'), 'facturas': []},
            'pagadas': {'count': 0, 'monto': Decimal('0.00'), 'facturas': []},
        }

        total_pendiente = Decimal('0.00')
        total_pagado_global = Decimal('0.00')

        for f in facturas:
            saldo = f.saldo_pendiente
            pagado = f.total_pagado
            total_pagado_global += pagado

            entry = {
                'id': f.id,
                'numero_factura': f.numero_factura,
                'fecha_emision': f.fecha_emision.date().isoformat() if f.fecha_emision else None,
                'fecha_vencimiento': f.fecha_vencimiento.isoformat() if f.fecha_vencimiento else None,
                'total_general': str(f.total_general),
                'total_pagado': str(pagado),
                'saldo_pendiente': str(saldo),
                'pago_estado': f.pago_estado,
                'pago_estado_display': f.get_pago_estado_display(),
                'dias_atraso': f.dias_atraso,
            }

            if f.pago_estado in ('PAGADA', 'NO_APLICA'):
                buckets['pagadas']['count'] += 1
                buckets['pagadas']['monto'] += pagado
                buckets['pagadas']['facturas'].append(entry)
                continue

            total_pendiente += saldo
            atraso = f.dias_atraso
            if atraso == 0:
                key = 'vigente'
            elif atraso <= 30:
                key = '1-30'
            elif atraso <= 60:
                key = '31-60'
            elif atraso <= 90:
                key = '61-90'
            else:
                key = '90+'
            buckets[key]['count'] += 1
            buckets[key]['monto'] += saldo
            buckets[key]['facturas'].append(entry)

        # Convertir Decimals a string para JSON
        for k, v in buckets.items():
            v['monto'] = str(v['monto'])

        return Response({
            'empresa': {
                'id': empresa.id,
                'nit': empresa.nit,
                'razon_social': empresa.razon_social,
                'nombre_comercial': empresa.nombre_comercial,
                'direccion_fiscal': empresa.direccion_fiscal,
                'email_cobro': empresa.email_cobro,
                'dias_credito': empresa.dias_credito,
                'limite_credito': str(empresa.limite_credito),
                'activo': empresa.activo,
                'tiene_vencimientos': empresa.tiene_vencimientos,
                'excede_limite': empresa.excede_limite,
            },
            'fecha_corte': hoy.isoformat(),
            'total_pendiente': str(total_pendiente),
            'total_pagado_historico': str(total_pagado_global),
            'aging': buckets,
        })


class CuentasPorCobrarReporteAPIView(APIView):
    """
    GET /api/v1/facturacion/reportes/cuentas-por-cobrar/

    Resumen global de CxC:
    - Total pendiente
    - Aging por bucket (totales)
    - Top 10 empresas con mayor saldo pendiente
    - Lista de empresas con vencimientos
    """
    permission_classes = [_EsAdminOSecretaria]

    def get(self, request):
        from django.utils import timezone as _tz
        hoy = _tz.now().date()

        facturas = Factura.objects.filter(
            estado='EMITIDA',
            condicion_pago='CREDITO',
            pago_estado__in=['PENDIENTE', 'PARCIAL', 'VENCIDA'],
        ).select_related('empresa')

        bucket_totales = {
            'vigente': Decimal('0.00'),
            '1-30':    Decimal('0.00'),
            '31-60':   Decimal('0.00'),
            '61-90':   Decimal('0.00'),
            '90+':     Decimal('0.00'),
        }
        bucket_counts = {k: 0 for k in bucket_totales}

        empresa_saldos = {}  # empresa_id -> {empresa, saldo, facturas_pendientes, dias_max_atraso}
        total_global = Decimal('0.00')

        for f in facturas:
            saldo = f.saldo_pendiente
            total_global += saldo
            atraso = f.dias_atraso
            if atraso == 0:
                k = 'vigente'
            elif atraso <= 30:
                k = '1-30'
            elif atraso <= 60:
                k = '31-60'
            elif atraso <= 90:
                k = '61-90'
            else:
                k = '90+'
            bucket_totales[k] += saldo
            bucket_counts[k] += 1

            if f.empresa:
                eid = f.empresa.id
                if eid not in empresa_saldos:
                    empresa_saldos[eid] = {
                        'id': f.empresa.id,
                        'nit': f.empresa.nit,
                        'razon_social': f.empresa.razon_social,
                        'saldo': Decimal('0.00'),
                        'facturas_count': 0,
                        'dias_max_atraso': 0,
                        'tiene_vencimientos': False,
                    }
                empresa_saldos[eid]['saldo'] += saldo
                empresa_saldos[eid]['facturas_count'] += 1
                empresa_saldos[eid]['dias_max_atraso'] = max(
                    empresa_saldos[eid]['dias_max_atraso'], atraso
                )
                if atraso > 0:
                    empresa_saldos[eid]['tiene_vencimientos'] = True

        # Top 10 empresas con mayor saldo
        top_empresas = sorted(
            empresa_saldos.values(),
            key=lambda e: e['saldo'],
            reverse=True,
        )[:10]
        for e in top_empresas:
            e['saldo'] = str(e['saldo'])

        # Empresas con vencimientos (todas)
        con_vencimientos = [
            {
                'id': e['id'],
                'nit': e['nit'],
                'razon_social': e['razon_social'],
                'saldo': str(e['saldo']) if isinstance(e['saldo'], Decimal) else e['saldo'],
                'dias_max_atraso': e['dias_max_atraso'],
                'facturas_count': e['facturas_count'],
            }
            for e in empresa_saldos.values()
            if e['tiene_vencimientos']
        ]

        return Response({
            'fecha_corte': hoy.isoformat(),
            'total_pendiente': str(total_global),
            'aging': {
                k: {'count': bucket_counts[k], 'monto': str(bucket_totales[k])}
                for k in bucket_totales
            },
            'top_empresas_saldo': top_empresas,
            'empresas_con_vencimientos': con_vencimientos,
        })
