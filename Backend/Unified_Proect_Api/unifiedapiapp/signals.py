import logging
import os
from django.contrib.auth import get_user_model

def create_admin_user(sender, **kwargs):
    User = get_user_model()

    admin_email = os.getenv("DJANGO_ADMIN_EMAIL")
    admin_password = os.getenv("DJANGO_ADMIN_PASSWORD")

    if not admin_email or not admin_password:
        return  # fail silently if env vars not set

    if not User.objects.filter(email=admin_email).exists():
        User.objects.create_superuser(
            username=admin_email,   # IMPORTANT (email-based login)
            email=admin_email,
            password=admin_password,
        )
        logging.info(f"Superuser created with email: {admin_email}")
    else:
        logging.info(f"Superuser with email {admin_email} already exists.")