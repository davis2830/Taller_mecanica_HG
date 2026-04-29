from pathlib import Path
from decouple import config, Csv

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent


# =====================================================================
# SEGURIDAD — Estas variables se leen del archivo .env
# NUNCA poner credenciales directamente aquí
# =====================================================================

SECRET_KEY = config('SECRET_KEY')
DEBUG = config('DEBUG', default=False, cast=bool)
ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='localhost', cast=Csv())

# URL Base del SPA React (NO del backend Django). Se usa en correos
# transaccionales, enlaces mágicos y redirects desde vistas Django legacy.
# En desarrollo el SPA corre con `npm run dev` (Vite) en :5173; en producción
# debe apuntar al dominio donde se sirve el bundle de React.
FRONTEND_URL = config('FRONTEND_URL', default='http://localhost:5173')

# URL Base del backend Django para enlaces de email que apuntan a vistas
# server-side (activación de cuenta, magic-link de confirmación de cita,
# verificación de cambio de correo). Como esos endpoints VIVEN en Django,
# necesitamos su propia URL pública, distinta de FRONTEND_URL cuando el SPA
# y el backend están en hosts/puertos diferentes (lo normal en dev).
BACKEND_URL = config('BACKEND_URL', default='http://localhost:8000')


# =====================================================================
# MULTI-TENANCY (django-tenants) — PR #41b
# =====================================================================
# Cada taller cliente vive en su propio schema Postgres. El schema `public`
# es compartido (modelos SaaS: Tenant, Domain, PublicUser).
#
# SHARED_APPS: modelos que viven en `public` (una sola tabla global).
# TENANT_APPS: modelos que viven en cada schema de taller (tabla por tenant).
#
# INSTALLED_APPS = SHARED_APPS + apps en TENANT_APPS que no estén ya en SHARED.
# django-tenants requiere que `django_tenants` sea la PRIMERA en SHARED_APPS.

SHARED_APPS = [
    'django_tenants',  # OBLIGATORIO primero.
    'tenancy',         # Modelos Tenant + Domain (SaaS).
    'public_admin',    # Modelo PublicUser (superadmin SaaS).
    # Django core que django-tenants recomienda compartir:
    'django.contrib.contenttypes',  # Obligatorio en SHARED (migrations framework).
]

TENANT_APPS = [
    # Django core que va por tenant:
    'django.contrib.admin',
    'django.contrib.auth',          # auth_user por tenant → cada taller sus usuarios.
    'django.contrib.sessions',      # Sesiones scoped al tenant.
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.humanize',
    # Apps de negocio del taller:
    'usuarios',
    'citas',
    'inventario',
    'taller',
    'facturacion',
    # Apps de terceros con modelos que necesitan estar por tenant
    # (ej. django_celery_results guarda resultados de tasks que son del tenant):
    'django_apscheduler',
    'django_celery_results',
]

# Apps sin modelos (o con modelos que no necesitan schema) pueden ir en
# ambos listados o solo en uno. Estas van sin migraciones problemáticas:
APPS_SIN_MODELOS = [
    'crispy_forms',
    'crispy_bootstrap4',
    'corsheaders',
    'rest_framework',
    'rest_framework_simplejwt',
]

INSTALLED_APPS = list(SHARED_APPS) + [
    app for app in TENANT_APPS if app not in SHARED_APPS
] + APPS_SIN_MODELOS

# django-tenants: qué modelo es el Tenant y cuál es el Domain.
TENANT_MODEL = 'tenancy.Tenant'
TENANT_DOMAIN_MODEL = 'tenancy.Domain'

# Cuando una request no matchea ningún dominio, por default django-tenants
# devuelve 404. En dev preferimos redirect al subdomain `public` para que
# el superadmin dashboard sea accesible en `localhost:8000` sin subdomain.
# (Futuro — por ahora dejamos el default 404).

# Router de base de datos: django-tenants elige el schema correcto según
# el middleware setee `connection.tenant`.
DATABASE_ROUTERS = ['django_tenants.routers.TenantSyncRouter']

CRISPY_ALLOWED_TEMPLATE_PACKS = "bootstrap4"
CRISPY_TEMPLATE_PACK = 'bootstrap4'

LOGIN_REDIRECT_URL = '/usuarios/dashboard/'
LOGIN_URL = '/usuarios/login/'
LOGOUT_REDIRECT_URL = '/usuarios/login/'

MIDDLEWARE = [
    # TenantMainMiddleware DEBE ir primero: resuelve el subdomain → tenant →
    # setea `connection.set_schema()` antes de cualquier otra lógica que
    # consulte modelos.
    'django_tenants.middleware.main.TenantMainMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'usuarios.tunnel_auth.XAuthorizationHeaderMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

AUTHENTICATION_BACKENDS = [
    'usuarios.backends.EmailAuthBackend',
    'django.contrib.auth.backends.ModelBackend',
]

ROOT_URLCONF = 'taller_mecanico.urls'

# URLconf usado cuando la request entra por el schema `public` (i.e. Host
# como `admin.localhost` o `localhost` sin Domain matcheado). Expone SOLO
# el panel superadmin SaaS + Django admin, nunca endpoints del taller.
# Ver `taller_mecanico/public_urls.py` para la lista completa.
PUBLIC_SCHEMA_URLCONF = 'taller_mecanico.public_urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
                'usuarios.context_processors.notificaciones',
            ],
        },
    },
]

WSGI_APPLICATION = 'taller_mecanico.wsgi.application'


# =====================================================================
# BASE DE DATOS — Configurada desde el archivo .env
# =====================================================================

# PostgreSQL es el motor oficial del proyecto (requerido para django-tenants
# en PR #41b — usa schemas de Postgres para aislar tenants). Los defaults
# apuntan al docker-compose de `../infra/postgres/` para dev local; en prod
# se sobrescriben desde el .env del servidor.
DATABASES = {
    'default': {
        # django_tenants.postgresql_backend es un wrapper del backend oficial
        # de Postgres que hace `SET search_path` automático según el tenant
        # actual. Para tests con pytest-django también funciona correctamente.
        'ENGINE': config('DB_ENGINE', default='django_tenants.postgresql_backend'),
        'NAME': config('DB_NAME', default='taller_mecanico'),
        'USER': config('DB_USER', default='taller_meca'),
        'PASSWORD': config('DB_PASSWORD', default='taller_meca_dev'),
        'HOST': config('DB_HOST', default='localhost'),
        'PORT': config('DB_PORT', default='5432'),
    }
}


# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]


# Internationalization
LANGUAGE_CODE = 'es'
TIME_ZONE = 'America/Guatemala'
USE_I18N = True
USE_TZ = True


# Static files
STATIC_URL = '/static/'
STATICFILES_DIRS = [BASE_DIR / 'static']

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'


# =====================================================================
# EMAIL / SMTP — Configurado desde el archivo .env
# =====================================================================

EMAIL_BACKEND = config(
    'EMAIL_BACKEND',
    default='django.core.mail.backends.smtp.EmailBackend',
)
EMAIL_HOST = config('EMAIL_HOST', default='smtp.gmail.com')
EMAIL_PORT = config('EMAIL_PORT', default=587, cast=int)
EMAIL_USE_TLS = config('EMAIL_USE_TLS', default=True, cast=bool)
EMAIL_HOST_USER = config('EMAIL_HOST_USER', default='')
EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD', default='')
DEFAULT_FROM_EMAIL = config('DEFAULT_FROM_EMAIL', default=EMAIL_HOST_USER)
# Evita que un SMTP inalcanzable bloquee al worker de Celery indefinidamente
# (con --pool=solo un email colgado detiene toda la cola).
EMAIL_TIMEOUT = config('EMAIL_TIMEOUT', default=15, cast=int)

# =====================================================================
# WHATSAPP (Twilio) — Configurado desde el archivo .env
# =====================================================================
# Backend de envío:
#   - 'mock'   → solo loguea, no envía nada (default — útil en dev / CI)
#   - 'twilio' → envía vía Twilio REST API (requiere las 3 variables de abajo)
WHATSAPP_BACKEND = config('WHATSAPP_BACKEND', default='mock')
TWILIO_ACCOUNT_SID = config('TWILIO_ACCOUNT_SID', default='')
TWILIO_AUTH_TOKEN = config('TWILIO_AUTH_TOKEN', default='')
# Número WhatsApp en formato E.164 (ej. '+14155238886' para sandbox compartido).
TWILIO_WHATSAPP_FROM = config('TWILIO_WHATSAPP_FROM', default='')
# Código de país por defecto para teléfonos guardados sin '+' ni código.
WHATSAPP_DEFAULT_COUNTRY_CODE = config('WHATSAPP_DEFAULT_COUNTRY_CODE', default='502')

# =====================================================================
# CELERY — Configuración
# =====================================================================
CELERY_BROKER_URL = 'amqp://guest:guest@localhost:5672//'
CELERY_ACCEPT_CONTENT = ['application/json']
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TASK_SERIALIZER = 'json'
CELERY_TIMEZONE = TIME_ZONE
CELERY_RESULT_BACKEND = 'django-db'
CELERY_CACHE_BACKEND = 'django-cache'
# Desactiva las colas temporales de control y eventos (Sintaxis Celery 5+)
CELERY_WORKER_ENABLE_REMOTE_CONTROL = False
CELERY_WORKER_SEND_TASK_EVENTS = False

# Agrega esta también para evitar el warning amarillo de reconexión
CELERY_BROKER_CONNECTION_RETRY_ON_STARTUP = True

# =====================================================================
# REST FRAMEWORK Y JWT
# =====================================================================
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        # PublicAdmin primero: si el token trae user_type='public_admin' lo
        # resuelve a PublicUser; si no, lanza InvalidToken y el siguiente
        # backend lo procesa como auth.User del taller.
        'public_admin.auth.PublicAdminJWTAuthentication',
        'rest_framework_simplejwt.authentication.JWTAuthentication',
        'rest_framework.authentication.SessionAuthentication', # Para la web actual
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'EXCEPTION_HANDLER': 'taller_mecanico.exception_handler.custom_exception_handler',
}

from datetime import timedelta
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(days=1), # Usar token más largo en dev
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
}

# =====================================================================
# CORS (CORS-HEADERS)
# =====================================================================
# Permite conexiones cruzadas desde React / app movil local
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",  # Puerto por defecto de Vite
    "http://127.0.0.1:5173",
    "http://localhost:3000",  # Alternativo
]
CORS_ALLOWED_ORIGIN_REGEXES = [
    r"^https://.*\.devinapps\.com$",
    # Subdomains de tenants en dev (admin.localhost, demo.localhost, etc.)
    r"^http://[a-z0-9-]+\.localhost(:\d+)?$",
]
CORS_ALLOW_CREDENTIALS = True

CSRF_TRUSTED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:8000",
    "https://*.devinapps.com",
]