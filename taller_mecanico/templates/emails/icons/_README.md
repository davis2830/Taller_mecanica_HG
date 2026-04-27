# Iconos SVG inline para correos

Cada archivo `.html` en este directorio es un fragmento SVG independiente,
diseñado para incluirse dentro de `<span>` u otros elementos inline en
correos transaccionales.

Uso desde un template:

```django
{% include 'emails/icons/clock.html' with size=14 color="#92400e" %}
```

Variables soportadas (con defaults):
  - `size`  : tamaño en px de ancho y alto (default 14)
  - `color` : color hex de stroke (default "currentColor")

Todos los iconos son del set Lucide (https://lucide.dev/) con licencia ISC,
copiados de su SVG fuente. stroke-width=2.

Iconos disponibles:
  - calendar.html       — Calendario
  - check-circle.html   — Confirmación / éxito
  - clock.html          — Tiempo / espera / recordatorio
  - clipboard.html      — Cambio de estado / actualización
  - file-text.html      — Cotización / documento
  - mail.html           — Correo / mensaje
  - package.html        — Repuestos / inventario
  - phone.html          — Contacto / teléfono
  - search.html         — Diagnóstico / revisión
  - star.html           — Encuesta / valoración
  - truck.html          — Entrega / vehículo listo
  - user.html           — Cliente / usuario
  - wrench.html         — Servicio / reparación
  - alert-triangle.html — Alerta / advertencia
  - dollar-sign.html    — Pago / cobro
  - shield.html         — Seguridad / verificación
  - info.html           — Información
