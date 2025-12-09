import os

import requests
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

# Load environment variables
CEPH_BASE_URL = os.getenv("CEPH_BASE_URL")
CEPH_USERNAME = os.getenv("CEPH_USERNAME")
CEPH_PASSWORD = os.getenv("CEPH_PASSWORD")

# Define fixed headers (instead of relying on os.getenv for a dictionary)
HEADERS = {
    "Content-Type": "application/json",
    "Accept": "application/vnd.ceph.api.v1.0+json",
}

# Disable SSL warnings for self-signed certs
requests.packages.urllib3.disable_warnings()


def get_ceph_token():
    """Authenticate with Ceph Dashboard and return JWT token"""
    try:
        resp = requests.post(
            f"{CEPH_BASE_URL}/api/auth",
            json={"username": CEPH_USERNAME, "password": CEPH_PASSWORD},
            headers=HEADERS,
            verify=False,
        )
        resp.raise_for_status()
        return resp.json().get("token")
    except Exception as e:
        print(f"Auth Error: {e}")
        return None


def fetch_ceph_data(endpoint, version="v1.0"):
    """Fetch data from a Ceph API endpoint using the token and proper API version"""
    token = get_ceph_token()
    if not token:
        return Response(
            {"error": "Authentication failed"}, status=status.HTTP_401_UNAUTHORIZED
        )

    auth_headers = {
        "Authorization": f"Bearer {token}",
        "Accept": f"application/vnd.ceph.api.{version}+json",
    }

    try:
        response = requests.get(
            f"{CEPH_BASE_URL}{endpoint}", headers=auth_headers, verify=False
        )
        response.raise_for_status()
        return Response(response.json())
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def fetch_ceph_data_inventory(endpoint, version="v1.0"):
    """Fetch data from a Ceph API endpoint using the token and proper API version"""
    token = get_ceph_token()
    if not token:
        return {"error": "Authentication failed"}

    auth_headers = {
        "Authorization": f"Bearer {token}",
        "Accept": f"application/vnd.ceph.api.{version}+json",
    }

    try:
        response = requests.get(
            f"{CEPH_BASE_URL}{endpoint}", headers=auth_headers, verify=False
        )
        response.raise_for_status()
        return response.json()  # ✅ Return parsed JSON dict
    except Exception as e:
        return {"error": str(e)}
