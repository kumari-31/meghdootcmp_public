import requests
from rest_framework.response import Response
from rest_framework.views import APIView

# ZABBIX API CREDENTIALS
ZABBIX_URL = "http://10.184.49.245/zabbix/api_jsonrpc.php"
ZABBIX_USER = "Admin"
ZABBIX_PASSWORD = "zabbix"


class HostAvailabilityDetailView(APIView):
    """Return availability status of each host individually from Zabbix."""

    def zabbix_login(self):
        payload = {
            "jsonrpc": "2.0",
            "method": "user.login",
            "params": {"user": ZABBIX_USER, "password": ZABBIX_PASSWORD},
            "id": 1,
            "auth": None,
        }
        response = requests.post(ZABBIX_URL, json=payload).json()
        return response.get("result")

    def get_hosts(self, auth_token):
        payload = {
            "jsonrpc": "2.0",
            "method": "host.get",
            "params": {
                "output": ["hostid", "host", "available"],
                "selectInterfaces": ["ip"],
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

        availability_map = {0: "Unknown", 1: "Available", 2: "Not available"}

        detailed_data = []
        for host in hosts:
            detailed_data.append(
                {
                    "host": host["host"],
                    "status": availability_map.get(int(host["available"]), "Unknown"),
                    "ip": (
                        host["interfaces"][0]["ip"] if host.get("interfaces") else "N/A"
                    ),
                }
            )

        return Response(detailed_data)
