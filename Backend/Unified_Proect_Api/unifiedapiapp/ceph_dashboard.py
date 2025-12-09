import requests

BASE_URL = "https://10.184.43.52:8443"
LOGIN_ENDPOINT = f"{BASE_URL}/api/auth"
USERNAME = "admin"
PASSWORD = "Meghd@@t123"

# Login to get token
resp = requests.post(
    LOGIN_ENDPOINT,
    json={"username": USERNAME, "password": PASSWORD},
    headers={
        "Content-Type": "application/json",
        "Accept": "application/vnd.ceph.api.v1.0+json",
    },
    verify=False,
)
token = resp.json().get("token")
print(f"Token: {token}")

# Use token to call protected endpoint
headers = {
    "Authorization": f"Bearer {token}",
    "Accept": "application/vnd.ceph.api.v1.0+json",
}
health_resp = requests.get(
    f"{BASE_URL}/api/cluster/health", headers=headers, verify=False
)
print(health_resp.json())
