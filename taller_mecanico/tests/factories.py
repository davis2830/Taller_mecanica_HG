"""
Factories con `factory_boy` para los modelos del dominio.

Evitan que cada test tenga que construir manualmente un Cliente + Perfil +
Vehículo + Servicio + Cita (son 5+ objetos interdependientes). Una factory
crea el objeto + sus dependencias con valores por defecto razonables.

Convenciones:
  - Los nombres terminan en `Factory`.
  - `Meta.model` apunta al modelo Django.
  - Campos con `factory.Faker(...)` generan datos realistas pero determinísticos
    (por seed) — útil para debug sin colisiones de unicidad.
  - Sub-factories (`factory.SubFactory`) crean dependencias on-demand.
  - `factory.RelatedFactory` crea objetos que dependen del padre (ej. Perfil
    se crea DESPUÉS del User).
"""
from __future__ import annotations

import datetime

import factory
from django.contrib.auth.models import User
from factory.django import DjangoModelFactory


# ───────────────────────────────────────────────────────────────────────────
# Usuarios / Perfil
# ───────────────────────────────────────────────────────────────────────────

class RolFactory(DjangoModelFactory):
    class Meta:
        model = 'usuarios.Rol'
        django_get_or_create = ('nombre',)

    nombre = 'Cliente'
    descripcion = 'Rol default para clientes en tests.'


class ClienteFactory(DjangoModelFactory):
    """
    Cliente (User de Django) con Perfil asociado.

    El modelo `usuarios.Perfil` se crea automáticamente por un `post_save`
    signal en ``usuarios/signals.py`` — por eso NO lo creamos en esta factory.
    En su lugar, el parámetro `perfil__telefono=...` permite configurar
    campos del perfil auto-creado sin duplicarlo.

    Uso típico:
        cliente = ClienteFactory()                            # email + teléfono default
        cliente = ClienteFactory(email='')                    # sin email
        cliente = ClienteFactory(perfil__telefono='')         # sin teléfono
        cliente = ClienteFactory(perfil__telefono='+50251...') # teléfono específico
    """
    class Meta:
        model = User
        django_get_or_create = ('username',)
        skip_postgeneration_save = True

    username = factory.Sequence(lambda n: f'cliente{n:05d}')
    first_name = factory.Faker('first_name', locale='es_ES')
    last_name = factory.Faker('last_name', locale='es_ES')
    email = factory.LazyAttribute(lambda o: f'{o.username}@test.taller')
    is_active = True

    @factory.post_generation
    def perfil(self, create, extracted, **kwargs):
        """
        Ajusta los campos del Perfil auto-creado por el signal. `kwargs`
        son los valores `perfil__XXX` pasados al llamar a la factory.
        """
        if not create:
            return
        from usuarios.models import Perfil
        perfil, _ = Perfil.objects.get_or_create(usuario=self)
        # Default sensato de teléfono — salvo que el test lo sobrescriba.
        telefono = kwargs.pop(
            'telefono',
            f'+502540000{self.pk or 0:02d}',
        )
        perfil.telefono = telefono
        for campo, valor in kwargs.items():
            setattr(perfil, campo, valor)
        perfil.save()
        # Invalidar el Perfil cacheado en el User (el signal creó una instancia
        # antes de que nosotros pusiéramos telefono → `self.perfil` apunta al
        # cache viejo con telefono=None). Sin esto, `cita.cliente.perfil.telefono`
        # devuelve None en los tests.
        if hasattr(self, '_perfil_cache'):
            delattr(self, '_perfil_cache')
        self.refresh_from_db()


# ───────────────────────────────────────────────────────────────────────────
# Catálogo de servicios y vehículos
# ───────────────────────────────────────────────────────────────────────────

class TipoServicioFactory(DjangoModelFactory):
    class Meta:
        model = 'citas.TipoServicio'

    nombre = factory.Sequence(lambda n: f'Servicio Test {n}')
    descripcion = 'Servicio generado por factory para tests.'
    duracion = 60  # minutos
    precio = 500
    categoria = 'MECANICO'


class VehiculoFactory(DjangoModelFactory):
    class Meta:
        model = 'citas.Vehiculo'

    propietario = factory.SubFactory(ClienteFactory)
    marca = factory.Faker('random_element', elements=['Toyota', 'Honda', 'Mazda', 'Kia', 'Ford'])
    modelo = factory.Faker('random_element', elements=['Corolla', 'Civic', '3', 'Rio', 'Focus'])
    año = factory.Faker('random_int', min=2010, max=2024)
    placa = factory.Sequence(lambda n: f'P{n:06d}')
    color = 'Blanco'
    tipo_combustible = 'GASOLINA'
    transmision = 'AUTOMATICA'


# ───────────────────────────────────────────────────────────────────────────
# Citas
# ───────────────────────────────────────────────────────────────────────────

def _proxima_cita_fecha():
    """Devuelve una fecha hábil dentro de los próximos 7 días."""
    hoy = datetime.date.today()
    for delta in range(1, 8):
        candidato = hoy + datetime.timedelta(days=delta)
        if candidato.weekday() < 6:  # no domingo
            return candidato
    return hoy + datetime.timedelta(days=1)


class CitaFactory(DjangoModelFactory):
    class Meta:
        model = 'citas.Cita'
        skip_postgeneration_save = True

    cliente = factory.SubFactory(ClienteFactory)
    vehiculo = factory.SubFactory(
        VehiculoFactory,
        propietario=factory.SelfAttribute('..cliente'),
    )
    servicio = factory.SubFactory(TipoServicioFactory)
    fecha = factory.LazyFunction(_proxima_cita_fecha)
    hora_inicio = datetime.time(10, 0)
    hora_fin = datetime.time(11, 0)
    estado = 'PENDIENTE'
    notas = ''


# ───────────────────────────────────────────────────────────────────────────
# Orden de Trabajo (kanban)
# ───────────────────────────────────────────────────────────────────────────

class OrdenTrabajoFactory(DjangoModelFactory):
    class Meta:
        model = 'taller.OrdenTrabajo'

    cita = factory.SubFactory(CitaFactory, estado='CONFIRMADA')
    vehiculo = factory.SelfAttribute('cita.vehiculo')
    estado = 'EN_ESPERA'
    diagnostico = ''
