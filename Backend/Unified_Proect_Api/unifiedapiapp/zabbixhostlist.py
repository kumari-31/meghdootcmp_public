import requests
from rest_framework.response import Response
from rest_framework.views import APIView

# ZABBIX API CREDENTIALS
ZABBIX_URL = "http://10.184.49.247:9008/api_jsonrpc.php"
ZABBIX_USER = "Admin"
ZABBIX_PASSWORD = "zabbix"


class HostAvailabilityDetailView(APIView):
    """Return availability status of each host individually from Zabbix."""

    def zabbix_login(self):
        payload = {
            "jsonrpc": "2.0",
            "method": "user.login",
            "params": {
                "username": ZABBIX_USER,   # ✅ MUST be username
                "password": ZABBIX_PASSWORD
            },
            "id": 1
        }

        response = requests.post(ZABBIX_URL, json=payload).json()
        return response.get("result")

    def get_hosts(self, auth_token):
        payload = {
            "jsonrpc": "2.0",
            "method": "host.get",
            "params": {
                "output": ["hostid", "host"],
                "selectInterfaces": ["ip", "available"],
                "selectGroups": ["groupid", "name"],
            },
            "auth": auth_token,
            "id": 2,
        }
        response = requests.post(ZABBIX_URL, json=payload).json()
        return response.get("result", [])


    def get(self, request, *args, **kwargs):
        auth_token = self.zabbix_login()
        if not auth_token:
            return Response({"error": "Authentication failed"}, status=401)

        hosts = self.get_hosts(auth_token)
        print(hosts)

        availability_map = {
            "0": "Unknown",
            "1": "Available",
            "2": "Not available",
        }

        detailed_data = []

        for host in hosts:
            iface = host["interfaces"][0] if host.get("interfaces") else {}

            detailed_data.append({
                "host": host["host"],
                "groups": [g["name"] for g in host.get("groups", [])],
                "ip": iface.get("ip", "N/A"),
                "status": availability_map.get(
                    str(iface.get("available", "0")), "Unknown"
                ),
            })

        return Response(detailed_data)
