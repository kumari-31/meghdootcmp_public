import os
from pathlib import Path
from corsheaders.defaults import default_headers
from dotenv import load_dotenv

load_dotenv()  

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent


# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.getenv("SECRET_KEY")

# SECURITY WARNING: don't run with debug turned on in production!
# DEBUG = os.getenv("DEBUG", "False") == "True"
DEBUG = True

os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django.contrib.humanize",
    "rest_framework",
    "rest_framework_simplejwt.token_blacklist",
    "rest_framework.authtoken",
    "corsheaders",
    "django_extensions",
    'unifiedapiapp',
    
]

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "unifiedapiapp.authentication.CookieJWTAuthentication",  # ✅ Custom cookie JWT
        "rest_framework_simplejwt.authentication.JWTAuthentication",
        "rest_framework.authentication.SessionAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
}

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ALLOWED_HOSTS = os.getenv("ALLOWED_HOSTS", "").split(",")

# CORS_ALLOW_ALL_ORIGINS = True  # Or set to False and specify allowed origins
CORS_ALLOW_CREDENTIALS = True

CORS_ALLOWED_ORIGINS = os.getenv("CORS_ALLOWED_ORIGINS", "").split(",")

ROOT_URLCONF = "Unified_Proect_Api.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [os.path.join(BASE_DIR, "templates")],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "Unified_Proect_Api.wsgi.application"

from datetime import timedelta


SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=25),  # short-lived access token
    "REFRESH_TOKEN_LIFETIME": timedelta(minutes=30),  # longer refresh token
    "ROTATE_REFRESH_TOKENS": True,  # rotate refresh tokens
    "BLACKLIST_AFTER_ROTATION": True,  # blacklist old refresh tokens
    "UPDATE_LAST_LOGIN": True,  # optional
    "SIGNING_KEY": SECRET_KEY,
    "ALGORITHM": "HS256",
}

# Allow cookies to persist
SESSION_COOKIE_SECURE = False  # True only if using HTTPS
CSRF_COOKIE_SECURE = False


CORS_ALLOW_HEADERS = list(default_headers) + [
    "content-type",
]
CORS_ALLOW_METHODS = ["DELETE", "GET", "OPTIONS", "PATCH", "POST", "PUT"]

# Cookie config for tokens
REFRESH_COOKIE_NAME = "MDAUTH"
REFRESH_COOKIE_HTTPONLY = True
REFRESH_COOKIE_SECURE = False  # must be True when SameSite=None
REFRESH_COOKIE_SAMESITE = "Lax"  # or "None" if cross-site cookies are needed
REFRESH_COOKIE_PATH = "/"
REFRESH_COOKIE_AGE = 30 * 60  # 20 minutes

ACCESS_COOKIE_NAME = "MDSID"
ACCESS_COOKIE_HTTPONLY = True
ACCESS_COOKIE_SECURE = False
ACCESS_COOKIE_SAMESITE = "Lax"
ACCESS_COOKIE_PATH = "/"
ACCESS_COOKIE_AGE = 25 * 60  # 15 minutes


# settings.py
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.environ.get("DB_NAME"),
        "USER": os.environ.get("DB_USER"),
        "PASSWORD": os.environ.get("DB_PASSWORD"),
        "HOST": os.environ.get("DB_HOST", "localhost"),
        "PORT": os.environ.get("DB_PORT", "5432"),
    }
}


# Password validation
# https://docs.djangoproject.com/en/4.2/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]

# OTP_TEST_MODE = True
# MFA behavior
MFA_MODE = os.getenv("MFA_MODE", "NONE")
# EMAIL | TOTP | NONE



# Internationalization
# https://docs.djangoproject.com/en/4.2/topics/i18n/
LANGUAGE_CODE = "en-us"

TIME_ZONE = "UTC"

USE_I18N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/4.2/howto/static-files/

STATIC_URL = "/static/"

STATIC_ROOT = os.path.join(BASE_DIR, "staticfiles")

STATICFILES_DIRS = [
    os.path.join(
        BASE_DIR, "static"
    ),  # This should point to where your React build assets are
]

# Media files configuration
MEDIA_URL = "/media/"
MEDIA_ROOT = os.path.join(BASE_DIR, "media/")

# Default primary key field type
# https://docs.djangoproject.com/en/4.2/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"


# Email settings
EMAIL_BACKEND = os.getenv(
    "EMAIL_BACKEND",
    "django.core.mail.backends.smtp.EmailBackend"
)

EMAIL_HOST = os.getenv("EMAIL_HOST")
EMAIL_PORT = int(os.getenv("EMAIL_PORT", 587))
EMAIL_USE_TLS = os.getenv("EMAIL_USE_TLS") == "True"
EMAIL_USE_SSL = os.getenv("EMAIL_USE_SSL") == "True"

EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER")
EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD")

DEFAULT_FROM_EMAIL = os.getenv("DEFAULT_FROM_EMAIL")
SERVER_EMAIL = os.getenv("SERVER_EMAIL")

# Zabbix settings
ZABBIX_URL = os.getenv("ZABBIX_URL")
ZABBIX_USER = os.getenv("ZABBIX_USER")
ZABBIX_PASSWORD = os.getenv("ZABBIX_PASSWORD")



# import os
# from pathlib import Path
# from corsheaders.defaults import default_headers
# from dotenv import load_dotenv

# load_dotenv()  

# # Build paths inside the project like this: BASE_DIR / 'subdir'.
# BASE_DIR = Path(__file__).resolve().parent.parent


# # SECURITY WARNING: keep the secret key used in production secret!
# SECRET_KEY = os.getenv("SECRET_KEY", "unsafe-build-key")

# # SECURITY WARNING: don't run with debug turned on in production!
# DEBUG = os.getenv("DEBUG", "False") == "True"

# os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# INSTALLED_APPS = [
#     "django.contrib.admin",
#     "django.contrib.auth",
#     "django.contrib.contenttypes",
#     "django.contrib.sessions",
#     "django.contrib.messages",
#     "django.contrib.staticfiles",
#     "django.contrib.humanize",
#     "rest_framework",
#     "rest_framework_simplejwt.token_blacklist",
#     "rest_framework.authtoken",
#     "corsheaders",
#     "django_extensions",
#     'unifiedapiapp',
    
# ]

# REST_FRAMEWORK = {
#     "DEFAULT_AUTHENTICATION_CLASSES": [
#         "unifiedapiapp.authentication.CookieJWTAuthentication",  # ✅ Custom cookie JWT
#         "rest_framework_simplejwt.authentication.JWTAuthentication",
#         "rest_framework.authentication.SessionAuthentication",
#     ],
#     "DEFAULT_PERMISSION_CLASSES": [
#         "rest_framework.permissions.IsAuthenticated",
#     ],
# }

# MIDDLEWARE = [
#     "django.middleware.security.SecurityMiddleware",
#     'whitenoise.middleware.WhiteNoiseMiddleware',
#     "django.contrib.sessions.middleware.SessionMiddleware",
#     "corsheaders.middleware.CorsMiddleware",
#     "django.middleware.common.CommonMiddleware",
#     "django.middleware.csrf.CsrfViewMiddleware",
#     "django.contrib.auth.middleware.AuthenticationMiddleware",
#     "django.contrib.messages.middleware.MessageMiddleware",
#     "django.middleware.clickjacking.XFrameOptionsMiddleware",
# ]

# raw_hosts = os.getenv("ALLOWED_HOSTS", "")
# ALLOWED_HOSTS = [h.strip() for h in raw_hosts.split(",") if h.strip()]


# # CORS_ALLOW_ALL_ORIGINS = True  # Or set to False and specify allowed origins
# CORS_ALLOW_CREDENTIALS = False

# raw_origins = os.getenv("CORS_ALLOWED_ORIGINS", "")
# CORS_ALLOWED_ORIGINS = [o.strip() for o in raw_origins.split(",") if o.strip()]

# SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
# USE_X_FORWARDED_HOST = True

# ROOT_URLCONF = "Unified_Proect_Api.urls"

# TEMPLATES = [
#     {
#         "BACKEND": "django.template.backends.django.DjangoTemplates",
#         "DIRS": [os.path.join(BASE_DIR, "templates")],
#         "APP_DIRS": True,
#         "OPTIONS": {
#             "context_processors": [
#                 "django.template.context_processors.debug",
#                 "django.template.context_processors.request",
#                 "django.contrib.auth.context_processors.auth",
#                 "django.contrib.messages.context_processors.messages",
#             ],
#         },
#     },
# ]

# WSGI_APPLICATION = "Unified_Proect_Api.wsgi.application"

# from datetime import timedelta


# SIMPLE_JWT = {
#     "ACCESS_TOKEN_LIFETIME": timedelta(minutes=25),  # short-lived access token
#     "REFRESH_TOKEN_LIFETIME": timedelta(minutes=30),  # longer refresh token
#     "ROTATE_REFRESH_TOKENS": True,  # rotate refresh tokens
#     "BLACKLIST_AFTER_ROTATION": True,  # blacklist old refresh tokens
#     "UPDATE_LAST_LOGIN": True,  # optional
#     "SIGNING_KEY": SECRET_KEY,
#     "ALGORITHM": "HS256",
# }

# # Allow cookies to persist
# SESSION_COOKIE_SECURE = False  # True only if using HTTPS
# CSRF_COOKIE_SECURE = False
# SECURE_SSL_REDIRECT = True

# SECURE_HSTS_SECONDS = 31536000
# SECURE_HSTS_INCLUDE_SUBDOMAINS = True
# SECURE_HSTS_PRELOAD = True

# CORS_ALLOW_HEADERS = list(default_headers) + [
#     "content-type",
# ]
# CORS_ALLOW_METHODS = ["DELETE", "GET", "OPTIONS", "PATCH", "POST", "PUT"]

# # Cookie config for tokens
# REFRESH_COOKIE_NAME = "MDAUTH"
# REFRESH_COOKIE_HTTPONLY = True
# REFRESH_COOKIE_SECURE = False  # must be True when SameSite=None
# REFRESH_COOKIE_SAMESITE = "Lax"  # or "None" if cross-site cookies are needed
# REFRESH_COOKIE_PATH = "/"
# REFRESH_COOKIE_AGE = 30 * 60  # 20 minutes

# ACCESS_COOKIE_NAME = "MDSID"
# ACCESS_COOKIE_HTTPONLY = True
# ACCESS_COOKIE_SECURE = False
# ACCESS_COOKIE_SAMESITE = "Lax"
# ACCESS_COOKIE_PATH = "/"
# ACCESS_COOKIE_AGE = 25 * 60  # 15 minutes


# # settings.py
# DATABASES = {
#     "default": {
#         "ENGINE": "django.db.backends.postgresql",
#         "NAME": os.environ.get("DB_NAME"),
#         "USER": os.environ.get("DB_USER"),
#         "PASSWORD": os.environ.get("DB_PASSWORD"),
#         "HOST": os.environ.get("DB_HOST", "db"),
#         "PORT": os.environ.get("DB_PORT", "5432"),
#     }
# }


# # Password validation
# # https://docs.djangoproject.com/en/4.2/ref/settings/#auth-password-validators

# AUTH_PASSWORD_VALIDATORS = [
#     {
#         "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
#     },
#     {
#         "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
#     },
#     {
#         "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
#     },
#     {
#         "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
#     },
# ]

# OTP_TEST_MODE = True

# # Internationalization
# # https://docs.djangoproject.com/en/4.2/topics/i18n/
# LANGUAGE_CODE = "en-us"

# TIME_ZONE = "UTC"

# USE_I18N = True

# USE_TZ = True


# # Static files (CSS, JavaScript, Images)
# # https://docs.djangoproject.com/en/4.2/howto/static-files/

# STATIC_URL = "/static/"

# STATIC_ROOT = os.path.join(BASE_DIR, "staticfiles")

# # Enable WhiteNoise compression and caching support
# STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# # Media files configuration
# MEDIA_URL = "/media/"
# MEDIA_ROOT = os.path.join(BASE_DIR, "media/")

# # Default primary key field type
# # https://docs.djangoproject.com/en/4.2/ref/settings/#default-auto-field

# DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"


# # Email settings
# EMAIL_BACKEND = os.getenv(
#     "EMAIL_BACKEND",
#     "django.core.mail.backends.smtp.EmailBackend"
# )

# EMAIL_HOST = os.getenv("EMAIL_HOST")
# EMAIL_PORT = int(os.getenv("EMAIL_PORT", 587))
# EMAIL_USE_TLS = os.getenv("EMAIL_USE_TLS") == "True"
# EMAIL_USE_SSL = os.getenv("EMAIL_USE_SSL") == "True"

# EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER")
# EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD")

# DEFAULT_FROM_EMAIL = os.getenv("DEFAULT_FROM_EMAIL")
# SERVER_EMAIL = os.getenv("SERVER_EMAIL")

# # Zabbix settings
# ZABBIX_URL = os.getenv("ZABBIX_URL")
# ZABBIX_USER = os.getenv("ZABBIX_USER")
# ZABBIX_PASSWORD = os.getenv("ZABBIX_PASSWORD")
