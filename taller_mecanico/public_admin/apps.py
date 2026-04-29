from django.apps import AppConfig


class PublicAdminConfig(AppConfig):
    """App del panel superadmin del SaaS (schema `public`).

    Contiene los modelos y vistas que usa *el dueño del SaaS*
    (ej. steed.galvez@gmail.com) para administrar tenants, suscripciones,
    facturación del SaaS y soporte. NO es parte del producto del taller.
    """

    default_auto_field = 'django.db.models.BigAutoField'
    name = 'public_admin'
    verbose_name = 'Superadmin SaaS'
