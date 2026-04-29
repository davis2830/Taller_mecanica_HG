"""Helpers para que las Celery tasks preserven el contexto multi-tenant.

Sin esto, una task despachada con ``.delay()`` desde el schema ``taller_demo``
correría en el worker SIN saber qué tenant es — todas sus queries irían al
schema actual de la conexión del worker (random, posiblemente ``public``),
mezclando datos de varios talleres.

Solución: capturar ``connection.schema_name`` al despachar (en
``apply_async``) y restaurarlo con ``schema_context()`` al ejecutar (en
``__call__``). El schema viaja como ``header`` del mensaje Celery, no como
kwarg, así que no choca con la firma de la task.

Uso:

    from celery import shared_task
    from taller_mecanico.celery_helpers import TenantAwareTask

    @shared_task(base=TenantAwareTask)
    def enviar_correo(cita_id):
        # Adentro: ``connection.schema_name`` es el del tenant que despachó.
        ...

Llamada normal:

    enviar_correo.delay(cita_id)  # captura el tenant actual automáticamente

Para forzar un tenant específico (ej. desde un management command):

    from django_tenants.utils import schema_context
    with schema_context('taller_demo'):
        enviar_correo.delay(cita_id)
"""
from __future__ import annotations

from celery import Task
from django.db import connection
from django_tenants.utils import get_public_schema_name, schema_context


# Header del mensaje Celery donde viaja el schema. Headers no se validan
# contra la firma de la task, a diferencia de kwargs.
TENANT_SCHEMA_HEADER = '_tenant_schema'


class TenantAwareTask(Task):
    """Base class para tasks que necesitan ejecutarse en el schema del tenant.

    Override de ``apply_async`` para inyectar ``connection.schema_name`` como
    header del mensaje. Override de ``__call__`` para envolver la ejecución
    en ``schema_context(schema)``, leyendo el header de ``self.request.headers``.

    En modo EAGER (tests con ``CELERY_TASK_ALWAYS_EAGER=True``), Celery también
    setea ``self.request`` antes de invocar ``__call__``, así que los tests
    validan el mismo path que producción.
    """

    abstract = True  # No registrar este modelo base como task; solo subclases.

    def apply_async(self, args=None, kwargs=None, **options):
        # Capturar el schema del tenant que está despachando, salvo que el
        # caller ya haya puesto ``_tenant_schema`` explícitamente (uso
        # avanzado, ej. retry desde otro contexto).
        headers = dict(options.get('headers') or {})
        headers.setdefault(TENANT_SCHEMA_HEADER, connection.schema_name)
        options['headers'] = headers
        return super().apply_async(args=args, kwargs=kwargs, **options)

    def __call__(self, *args, **kwargs):
        # En workers reales Celery setea ``self.request.headers`` con los
        # headers del mensaje. En eager mode lo mismo. Si por algún motivo
        # el header falta (despacho legacy, retry de worker antiguo), caer
        # en el schema ``public`` — es seguro, no rompe.
        schema_name = None
        request = getattr(self, 'request', None)
        if request is not None:
            headers = getattr(request, 'headers', None) or {}
            schema_name = headers.get(TENANT_SCHEMA_HEADER)
        schema_name = schema_name or get_public_schema_name()
        with schema_context(schema_name):
            return self.run(*args, **kwargs)
