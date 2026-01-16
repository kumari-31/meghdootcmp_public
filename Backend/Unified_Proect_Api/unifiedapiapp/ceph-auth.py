import os
import requests
from dotenv import load_dotenv

load_dotenv()  

def get_auth_token(base_url, username, password, verify_ssl=False):
    """
    Authenticate with the Ceph API and return the JWT token.

    Args:
        base_url (str): Base URL of the Ceph API (e.g., 'https://ceph.example.com')
        username (str): Admin username
        password (str): Admin password
        verify_ssl (bool): Whether to verify SSL certificates (default: False)

    Returns:
        str: Authentication token if successful
        None: If authentication fails

    Raises:
        requests.exceptions.RequestException: For network-related errors
    """
    auth_endpoint = f"{base_url}/api/auth"

    headers = {
        "Content-Type": "application/json",
        "Accept": "application/vnd.ceph.api.v1.0+json",
    }

    payload = {"username": username, "password": password}

    try:
        response = requests.post(
            auth_endpoint, json=payload, headers=headers, verify=verify_ssl
        )

        response.raise_for_status()  # Raise exception for 4XX/5XX responses

        return response.json().get("token")

    except requests.exceptions.RequestException as e:
        print(f"Authentication error: {e}")
        return None


# Example usage
if __name__ == "__main__":
    BASE_URL = os.getenv("CEPH_BASE_URL")
    USERNAME = os.getenv("CEPH_USERNAME")
    PASSWORD = os.getenv("CEPH_PASSWORD")

    token = get_auth_token(BASE_URL, USERNAME, PASSWORD)

    if token:
        print(f"Token: {token}")
    else:
        print("Authentication failed.")
