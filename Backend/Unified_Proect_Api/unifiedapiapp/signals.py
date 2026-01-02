import logging
from django.contrib.auth import get_user_model
import os

def create_admin_user(sender, **kwargs):
    User = get_user_model()

    username = os.getenv("DJANGO_ADMIN_USERNAME", "admin@cdac.in")
    password = os.getenv("DJANGO_ADMIN_PASSWORD", "Root1234#$")
    email = os.getenv("DJANGO_ADMIN_EMAIL", "admin@cdac.in")

    if not User.objects.filter(username=username).exists():
        User.objects.create_superuser(username, email, password)

        logging.info(f"Superuser created with email: {email}")
    else:
        logging.info(f"Superuser with email {email} already exists.")