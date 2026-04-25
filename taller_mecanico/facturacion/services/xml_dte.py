"""
Generador de XML DTE (Documento Tributario Electrónico) para SAT Guatemala.

Implementa la estructura básica del XSD v0.5. No firma el documento — eso
lo hace el certificador.

La función principal `construir_xml_dte(documento)` devuelve un string XML listo
para enviar. Usamos xml.etree de la stdlib para no agregar dependencias.
"""
from __future__ import annotations

from decimal import Decimal
from xml.etree import ElementTree as ET
from xml.dom import minidom


NS_DTE = "http://www.sat.gob.gt/dte/fel/0.2.0"
NS_CAF = "http://www.sat.gob.gt/face2/ComplementoFacturaEspecial/0.1.0"

ET.register_namespace('dte', NS_DTE)


def _D(v) -> str:
    """Formatea un Decimal con 2 decimales, tal como lo espera SAT."""
    if v is None:
        return '0.00'
    return f"{Decimal(v):.2f}"


def construir_xml_dte(documento) -> str:
    """
    Construye el XML DTE a partir de un DocumentoElectronico (con su factura).
    El XML es estructuralmente válido contra el XSD 0.5 pero NO está firmado.

    Args:
        documento: instancia de DocumentoElectronico (unsaved OK).

    Returns:
        string XML con BOM removido y prettified.
    """
    from facturacion.models import ConfiguracionFacturacion

    factura = documento.factura
    orden = factura.orden
    cita = getattr(orden, 'cita', None)
    cliente = getattr(cita, 'cliente', None)
    perfil_cliente = getattr(cliente, 'perfil', None) if cliente else None
    vehiculo = getattr(cita, 'vehiculo', None)
    servicio = getattr(cita, 'servicio', None)
    config = ConfiguracionFacturacion.get()

    root = ET.Element(f"{{{NS_DTE}}}GTDocumento", attrib={'Version': '0.1'})
    sat = ET.SubElement(root, f"{{{NS_DTE}}}SAT", attrib={'ClaseDocumento': 'dte'})
    dte = ET.SubElement(sat, f"{{{NS_DTE}}}DTE", attrib={'ID': 'DatosCertificados'})
    datos_emision = ET.SubElement(dte, f"{{{NS_DTE}}}DatosEmision", attrib={'ID': 'DatosEmision'})

    # ── DatosGenerales ──────────────────────────────────────────────
    fecha_emision = (
        factura.fecha_emision.isoformat(timespec='seconds')
        if factura.fecha_emision else ''
    )
    ET.SubElement(
        datos_emision,
        f"{{{NS_DTE}}}DatosGenerales",
        attrib={
            'Tipo': documento.tipo_dte,
            'FechaHoraEmision': fecha_emision,
            'CodigoMoneda': 'GTQ',
        },
    )

    # ── Emisor ──────────────────────────────────────────────────────
    emisor = ET.SubElement(
        datos_emision,
        f"{{{NS_DTE}}}Emisor",
        attrib={
            'NITEmisor': (config.nit_emisor or '').replace('-', ''),
            'NombreEmisor': config.nombre_fiscal,
            'CodigoEstablecimiento': str(config.establecimiento_codigo),
            'NombreComercial': config.nombre_comercial or config.nombre_fiscal,
            'AfiliacionIVA': config.afiliacion_iva,
        },
    )
    direccion_emisor = ET.SubElement(emisor, f"{{{NS_DTE}}}DireccionEmisor")
    ET.SubElement(direccion_emisor, f"{{{NS_DTE}}}Direccion").text = config.direccion_fiscal
    ET.SubElement(direccion_emisor, f"{{{NS_DTE}}}CodigoPostal").text = '01001'
    ET.SubElement(direccion_emisor, f"{{{NS_DTE}}}Municipio").text = 'Guatemala'
    ET.SubElement(direccion_emisor, f"{{{NS_DTE}}}Departamento").text = 'Guatemala'
    ET.SubElement(direccion_emisor, f"{{{NS_DTE}}}Pais").text = 'GT'

    # ── Receptor ────────────────────────────────────────────────────
    nit_rec = perfil_cliente.nit_normalizado if perfil_cliente else 'CF'
    nombre_rec = (
        perfil_cliente.nombre_fiscal_o_nombre
        if perfil_cliente
        else (
            f"{cliente.first_name} {cliente.last_name}".strip()
            if cliente else 'Consumidor Final'
        )
    )
    receptor = ET.SubElement(
        datos_emision,
        f"{{{NS_DTE}}}Receptor",
        attrib={
            'IDReceptor': nit_rec.replace('-', ''),
            'NombreReceptor': nombre_rec or 'Consumidor Final',
            'TipoEspecial': 'CF' if nit_rec == 'CF' else '',
        },
    )
    direccion_receptor = ET.SubElement(receptor, f"{{{NS_DTE}}}DireccionReceptor")
    ET.SubElement(direccion_receptor, f"{{{NS_DTE}}}Direccion").text = (
        perfil_cliente.direccion_fiscal_o_direccion if perfil_cliente else 'Ciudad'
    )
    ET.SubElement(direccion_receptor, f"{{{NS_DTE}}}CodigoPostal").text = '01001'
    ET.SubElement(direccion_receptor, f"{{{NS_DTE}}}Municipio").text = 'Guatemala'
    ET.SubElement(direccion_receptor, f"{{{NS_DTE}}}Departamento").text = 'Guatemala'
    ET.SubElement(direccion_receptor, f"{{{NS_DTE}}}Pais").text = 'GT'

    # ── Items ───────────────────────────────────────────────────────
    items = ET.SubElement(datos_emision, f"{{{NS_DTE}}}Items")

    tasa = Decimal(factura.tasa_iva or 0)
    iva_incluido = factura.iva_incluido
    items_lista = []  # (descripcion, qty, precio_unitario_sin_iva, total_sin_iva, iva_item)

    # 1) Servicio / mano de obra
    if factura.costo_mano_obra and factura.costo_mano_obra > 0:
        mo_bruto = Decimal(factura.costo_mano_obra)
        if iva_incluido:
            mo_sin_iva = (mo_bruto / (Decimal('1') + tasa)).quantize(Decimal('0.01'))
        else:
            mo_sin_iva = mo_bruto
        iva_mo = (mo_sin_iva * tasa).quantize(Decimal('0.01'))
        items_lista.append({
            'descripcion': (servicio.nombre if servicio else 'Servicio'),
            'cantidad': 1,
            'precio_unitario': mo_sin_iva,
            'total_sin_iva': mo_sin_iva,
            'iva': iva_mo,
            'bien_o_servicio': 'S',
        })

    # 2) Repuestos detallados (si existen); si no, una línea única.
    repuestos_qs = orden.repuestos.all() if hasattr(orden, 'repuestos') else []
    for r in repuestos_qs:
        sub = Decimal(r.subtotal or 0)
        if iva_incluido:
            sub_sin_iva = (sub / (Decimal('1') + tasa)).quantize(Decimal('0.01'))
        else:
            sub_sin_iva = sub
        iva_rep = (sub_sin_iva * tasa).quantize(Decimal('0.01'))
        pu = Decimal(r.precio_unitario or 0)
        pu_sin_iva = (pu / (Decimal('1') + tasa)).quantize(Decimal('0.01')) if iva_incluido else pu
        items_lista.append({
            'descripcion': r.producto.nombre if r.producto else 'Repuesto',
            'cantidad': r.cantidad,
            'precio_unitario': pu_sin_iva,
            'total_sin_iva': sub_sin_iva,
            'iva': iva_rep,
            'bien_o_servicio': 'B',
        })

    # Si no hubo detalle de repuestos pero sí costo_repuestos > 0, línea única.
    if not repuestos_qs and factura.costo_repuestos and factura.costo_repuestos > 0:
        rb = Decimal(factura.costo_repuestos)
        if iva_incluido:
            rb_sin_iva = (rb / (Decimal('1') + tasa)).quantize(Decimal('0.01'))
        else:
            rb_sin_iva = rb
        iva_rep = (rb_sin_iva * tasa).quantize(Decimal('0.01'))
        items_lista.append({
            'descripcion': 'Repuestos y materiales',
            'cantidad': 1,
            'precio_unitario': rb_sin_iva,
            'total_sin_iva': rb_sin_iva,
            'iva': iva_rep,
            'bien_o_servicio': 'B',
        })

    for idx, it in enumerate(items_lista, start=1):
        item_elem = ET.SubElement(
            items,
            f"{{{NS_DTE}}}Item",
            attrib={
                'BienOServicio': it['bien_o_servicio'],
                'NumeroLinea': str(idx),
            },
        )
        ET.SubElement(item_elem, f"{{{NS_DTE}}}Cantidad").text = _D(it['cantidad'])
        ET.SubElement(item_elem, f"{{{NS_DTE}}}UnidadMedida").text = 'UND'
        ET.SubElement(item_elem, f"{{{NS_DTE}}}Descripcion").text = it['descripcion'][:200]
        ET.SubElement(item_elem, f"{{{NS_DTE}}}PrecioUnitario").text = _D(it['precio_unitario'])
        ET.SubElement(item_elem, f"{{{NS_DTE}}}Precio").text = _D(it['total_sin_iva'] + it['iva'])
        ET.SubElement(item_elem, f"{{{NS_DTE}}}Descuento").text = '0.00'

        impuestos_item = ET.SubElement(item_elem, f"{{{NS_DTE}}}Impuestos")
        impuesto_item = ET.SubElement(impuestos_item, f"{{{NS_DTE}}}Impuesto")
        ET.SubElement(impuesto_item, f"{{{NS_DTE}}}NombreCorto").text = 'IVA'
        ET.SubElement(impuesto_item, f"{{{NS_DTE}}}CodigoUnidadGravable").text = '1'
        ET.SubElement(impuesto_item, f"{{{NS_DTE}}}MontoGravable").text = _D(it['total_sin_iva'])
        ET.SubElement(impuesto_item, f"{{{NS_DTE}}}MontoImpuesto").text = _D(it['iva'])

        ET.SubElement(item_elem, f"{{{NS_DTE}}}Total").text = _D(it['total_sin_iva'] + it['iva'])

    # ── Totales ─────────────────────────────────────────────────────
    totales = ET.SubElement(datos_emision, f"{{{NS_DTE}}}Totales")
    imp_totales = ET.SubElement(totales, f"{{{NS_DTE}}}TotalImpuestos")
    imp_total = ET.SubElement(
        imp_totales,
        f"{{{NS_DTE}}}TotalImpuesto",
        attrib={
            'NombreCorto': 'IVA',
            'TotalMontoImpuesto': _D(factura.monto_iva),
        },
    )
    ET.SubElement(totales, f"{{{NS_DTE}}}GranTotal").text = _D(factura.total_general)

    # ── Complemento Referencia (para NCRE) ──
    if documento.tipo_dte == 'NCRE' and documento.documento_original:
        complementos = ET.SubElement(datos_emision, f"{{{NS_DTE}}}Complementos")
        complemento = ET.SubElement(
            complementos,
            f"{{{NS_DTE}}}Complemento",
            attrib={
                'IDComplemento': 'ReferenciasNota',
                'NombreComplemento': 'Referencias Nota de Crédito',
                'URIComplemento': '#ReferenciasNota',
            },
        )
        ref = ET.SubElement(
            complemento,
            f"{{{NS_DTE}}}ReferenciasNota",
            attrib={
                'NumeroAutorizacionDocumentoOrigen': documento.documento_original.uuid_sat or '',
                'SerieDocumentoOrigen': documento.documento_original.serie or '',
                'NumeroDocumentoOrigen': documento.documento_original.numero_autorizacion or '',
                'FechaEmisionDocumentoOrigen': (
                    documento.documento_original.fecha_certificacion.isoformat(timespec='seconds')
                    if documento.documento_original.fecha_certificacion else ''
                ),
                'MotivoAjuste': documento.motivo_anulacion or 'Nota de crédito',
            },
        )

    xml_bytes = ET.tostring(root, encoding='UTF-8', xml_declaration=True)
    # Pretty-print (útil para mostrar al usuario y debug).
    return minidom.parseString(xml_bytes).toprettyxml(indent='  ', encoding='UTF-8').decode('utf-8')
