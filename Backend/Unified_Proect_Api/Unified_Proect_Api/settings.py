from dotenv import load_dotenv
from pathlib import Path
import os
from corsheaders.defaults import default_headers

load_dotenv()  # Load environment variables from .env file

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent


# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/4.2/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = 'django-insecure-6k%sb6((@n*9s((tz(5e^nu@br^a=*-puuxw8(flw)z!biw&45'

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True

os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# Application definition

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'rest_framework_simplejwt.token_blacklist',
    'rest_framework.authtoken',
    'corsheaders',
    "django_extensions",
    'unifiedapiapp'
]

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'unifiedapiapp.authentication.CookieJWTAuthentication',  # ✅ Custom cookie JWT
        'rest_framework_simplejwt.authentication.JWTAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
}

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ALLOWED_HOSTS = ['*']

# CORS_ALLOW_ALL_ORIGINS = True  # Or set to False and specify allowed origins
CORS_ALLOW_CREDENTIALS = True

CORS_ALLOWED_ORIGINS = os.getenv("CORS_ALLOWED_ORIGINS", "").split(",")


ROOT_URLCONF = 'Unified_Proect_Api.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [os.path.join(BASE_DIR, 'templates')],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'Unified_Proect_Api.wsgi.application'

from datetime import timedelta

# SIMPLE_JWT = {
#     'ACCESS_TOKEN_LIFETIME': timedelta(hours=1),
#     'REFRESH_TOKEN_LIFETIME': timedelta(days=1),
#     'ROTATE_REFRESH_TOKENS': False,
#     'BLACKLIST_AFTER_ROTATION': True,
#     'UPDATE_LAST_LOGIN': False,
# }

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=15),       # short-lived access token
    'REFRESH_TOKEN_LIFETIME': timedelta(minutes=20),          # longer refresh token
    'ROTATE_REFRESH_TOKENS': True,                        # rotate refresh tokens
    'BLACKLIST_AFTER_ROTATION': True,                     # blacklist old refresh tokens
    'UPDATE_LAST_LOGIN': True,                             # optional
    'SIGNING_KEY': SECRET_KEY,
    'ALGORITHM': 'HS256',
}

# Allow cookies to persist
SESSION_COOKIE_SECURE = False  # True only if using HTTPS
CSRF_COOKIE_SECURE = False



CORS_ALLOW_HEADERS = list(default_headers) + [
    'content-type',
]
CORS_ALLOW_METHODS = ["DELETE", "GET", "OPTIONS", "PATCH", "POST", "PUT"]

# Cookie config for tokens
REFRESH_COOKIE_NAME = "MDAUTH"
REFRESH_COOKIE_HTTPONLY = True
REFRESH_COOKIE_SECURE = False     # must be True when SameSite=None
REFRESH_COOKIE_SAMESITE = "Lax"  # or "None" if cross-site cookies are needed
REFRESH_COOKIE_PATH = "/"
REFRESH_COOKIE_AGE = 20 * 60  # 20 minutes

ACCESS_COOKIE_NAME = "MDSID"
ACCESS_COOKIE_HTTPONLY = True
ACCESS_COOKIE_SECURE = False
ACCESS_COOKIE_SAMESITE = "Lax"
ACCESS_COOKIE_PATH = "/"
ACCESS_COOKIE_AGE = 15 * 60  # 15 minutes

# Database
# https://docs.djangoproject.com/en/4.2/ref/settings/#databases

# DATABASES = {
#     'default': {
#         'ENGINE': 'django.db.backends.sqlite3',
#         'NAME': BASE_DIR / 'db.sqlite3',
#     }
# }

# settings.py
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ.get('DB_NAME'),
        'USER': os.environ.get('DB_USER'),
        'PASSWORD': os.environ.get('DB_PASSWORD'),
        'HOST': os.environ.get('DB_HOST','localhost'),
        'PORT': os.environ.get('DB_PORT','5432'),
    }
}


# Password validation
# https://docs.djangoproject.com/en/4.2/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# Internationalization
# https://docs.djangoproject.com/en/4.2/topics/i18n/

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/4.2/howto/static-files/

STATIC_URL = 'static/'

STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')

STATICFILES_DIRS = [
    os.path.join(BASE_DIR, 'static'),  # This should point to where your React build assets are
]

# Media files configuration
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media/')

# Default primary key field type
# https://docs.djangoproject.com/en/4.2/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

OPENSTACK_MEMBER_ROLE = "member"  # Replace "member" with the actual role in your OpenStack setup


EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST = "smtp.gmail.com"
EMAIL_USE_TLS = False
EMAIL_USE_SSL = True
EMAIL_PORT = 465
EMAIL_HOST_USER = "rakshanavg20@gmail.com"
EMAIL_HOST_PASSWORD = "irhz wkcy gtav eocb "

DEFAULT_FROM_EMAIL = 'rakshanavg20@gmail.com'
SERVER_EMAIL = 'rakshanavg20@gmail.com'


ZABBIX_URL = "http://10.184.49.245/zabbix/api_jsonrpc.php"
ZABBIX_USER = "Admin"
ZABBIX_PASSWORD = "zabbix"




# """
# Django settings for Unified_Proect_Api project.
# Production-ready, using .env for all secrets.
# """

# from pathlib import Path
# import os
# from dotenv import load_dotenv
# from datetime import timedelta

# # Load .env
# load_dotenv()

# BASE_DIR = Path(__file__).resolve().parent.parent

# os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# # --------------------------------------------------------------------
# # 🔐 SECURITY SETTINGS
# # --------------------------------------------------------------------
# SECRET_KEY = os.getenv("SECRET_KEY")  # MUST be in .env
# DEBUG = True

# ALLOWED_HOSTS = os.getenv("ALLOWED_HOSTS", "*").split(",")

# # --------------------------------------------------------------------
# # 🚫 CORS + COOKIE SECURITY
# # --------------------------------------------------------------------
# CORS_ALLOW_CREDENTIALS = True
# CORS_ALLOWED_ORIGINS = [
   
#     "http://localhost:3000",
#     "http://10.184.40.211:3000",
#     "http://10.184.39.33:8002",  # Add your production origin if necessary 
# ]
# # CORS_ALLOW_ALL_ORIGINS = True

# # CORS_ALLOWED_ORIGINS = os.getenv("CORS_ALLOWED_ORIGINS", "*").split(",")


# # SESSION_COOKIE_SECURE = os.getenv("SESSION_COOKIE_SECURE", "True") == "True"
# # CSRF_COOKIE_SECURE = os.getenv("CSRF_COOKIE_SECURE", "True") == "True"

# ACCESS_COOKIE_NAME = "MDSID"
# REFRESH_COOKIE_NAME = "MDAUTH"

# ACCESS_COOKIE_HTTPONLY = True
# REFRESH_COOKIE_HTTPONLY = True

# ACCESS_COOKIE_SECURE = False
# REFRESH_COOKIE_SECURE = False

# ACCESS_COOKIE_SAMESITE = "Lax"
# REFRESH_COOKIE_SAMESITE = "Lax"

# ACCESS_COOKIE_PATH = "/"
# REFRESH_COOKIE_PATH = "/"

# ACCESS_COOKIE_AGE = 15 * 60
# REFRESH_COOKIE_AGE = 20 * 60


# # --------------------------------------------------------------------
# # 📦 INSTALLED APPS
# # --------------------------------------------------------------------
# INSTALLED_APPS = [
#     "django.contrib.admin",
#     "django.contrib.auth",
#     "django.contrib.contenttypes",
#     "django.contrib.sessions",
#     "django.contrib.messages",
#     "django.contrib.staticfiles",

#     "rest_framework",
#     "rest_framework_simplejwt.token_blacklist",
#     "rest_framework.authtoken",
#     "corsheaders",
#     "django_extensions",

#     "unifiedapiapp",
# ]


# # --------------------------------------------------------------------
# # 🔐 REST + JWT AUTH
# # --------------------------------------------------------------------
# REST_FRAMEWORK = {
#     "DEFAULT_AUTHENTICATION_CLASSES": [
#         "unifiedapiapp.authentication.CookieJWTAuthentication",
#         "rest_framework_simplejwt.authentication.JWTAuthentication",
#         "rest_framework.authentication.SessionAuthentication",
#     ],
#     "DEFAULT_PERMISSION_CLASSES": [
#         "rest_framework.permissions.IsAuthenticated",
#     ],
# }

# SIMPLE_JWT = {
#     "ACCESS_TOKEN_LIFETIME": timedelta(minutes=15),
#     "REFRESH_TOKEN_LIFETIME": timedelta(minutes=20),
#     "ROTATE_REFRESH_TOKENS": True,
#     "BLACKLIST_AFTER_ROTATION": True,
#     "UPDATE_LAST_LOGIN": True,
#     "SIGNING_KEY": os.getenv("SECRET_KEY"),
#     "ALGORITHM": "HS256",
# }


# # --------------------------------------------------------------------
# # 🌍 MIDDLEWARE
# # --------------------------------------------------------------------
# MIDDLEWARE = [
#     "django.middleware.security.SecurityMiddleware",
#     "django.contrib.sessions.middleware.SessionMiddleware",
#     "corsheaders.middleware.CorsMiddleware",
#     "django.middleware.common.CommonMiddleware",
#     "django.middleware.csrf.CsrfViewMiddleware",
#     "django.contrib.auth.middleware.AuthenticationMiddleware",
#     "django.contrib.messages.middleware.MessageMiddleware",
#     "django.middleware.clickjacking.XFrameOptionsMiddleware",
# ]


# # --------------------------------------------------------------------
# # 📁 TEMPLATES
# # --------------------------------------------------------------------
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


# # --------------------------------------------------------------------
# # 🗄 DATABASE (PostgreSQL)
# # --------------------------------------------------------------------
# DATABASES = {
#     "default": {
#         "ENGINE": "django.db.backends.postgresql",
#         "NAME": os.getenv("DB_NAME"),
#         "USER": os.getenv("DB_USER"),
#         "PASSWORD": os.getenv("DB_PASSWORD"),
#         "HOST": os.getenv("DB_HOST", "localhost"),
#         "PORT": os.getenv("DB_PORT", "5432"),
#     }
# }


# # --------------------------------------------------------------------
# # 📂 STATIC & MEDIA
# # --------------------------------------------------------------------
# STATIC_URL = '/static/'

# STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')

# STATICFILES_DIRS = [
#     os.path.join(BASE_DIR, 'static'),  # This should point to where your React build assets are
# ]

# # Media files configuration
# MEDIA_URL = '/media/'
# MEDIA_ROOT = os.path.join(BASE_DIR, 'media/')


# # --------------------------------------------------------------------
# # ✉ EMAIL SETTINGS (from .env)
# # --------------------------------------------------------------------
# EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
# EMAIL_HOST = os.getenv("EMAIL_HOST")
# EMAIL_PORT = os.getenv("EMAIL_PORT")
# EMAIL_USE_TLS = os.getenv("EMAIL_USE_TLS", "False") == "True"
# EMAIL_USE_SSL = os.getenv("EMAIL_USE_SSL", "True") == "True"
# EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER")
# EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD")
# DEFAULT_FROM_EMAIL = os.getenv("DEFAULT_FROM_EMAIL")
# SERVER_EMAIL = os.getenv("SERVER_EMAIL")


# # --------------------------------------------------------------------
# # 🟦 ZABBIX
# # --------------------------------------------------------------------
# ZABBIX_URL = os.getenv("ZABBIX_URL")
# ZABBIX_USER = os.getenv("ZABBIX_USER")
# ZABBIX_PASSWORD = os.getenv("ZABBIX_PASSWORD")


# # --------------------------------------------------------------------
# # 🔧 DEFAULTS
# # --------------------------------------------------------------------
# DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"


