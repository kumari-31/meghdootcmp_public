from django.apps import AppConfig
from django.db.models.signals import post_migrate

class UnifiedapiappConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "unifiedapiapp"


class AccountsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "accounts"

    def ready(self):
        from .signals import create_admin_user   # ← import here (important)
        post_migrate.connect(create_admin_user, sender=self)