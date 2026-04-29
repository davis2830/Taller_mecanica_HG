from django.apps import AppConfig


class TenancyConfig(AppConfig):
    """App con los modelos Tenant + Domain (viven en schema `public`).

    Es lo que django-tenants usa para identificar tenants por subdomain y
    para saber qué schemas tiene que migrar. No contiene lógica de negocio
    del taller.
    """

    default_auto_field = 'django.db.models.BigAutoField'
    name = 'tenancy'
    verbose_name = 'Multi-tenancy (SaaS)'
