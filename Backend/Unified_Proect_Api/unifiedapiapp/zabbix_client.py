
import requests
from django.conf import settings


class ZabbixClient:
    def __init__(self):
        self.url = settings.ZABBIX_URL
        self.auth = self.login()

    def login(self):
        payload = {
            "jsonrpc": "2.0",
            "method": "user.login",
            "params": {
                "username": settings.ZABBIX_USER,
                "username": settings.ZABBIX_USER,
                "password": settings.ZABBIX_PASSWORD,
            },
            "id": 1,
        }
        res = requests.post(self.url, json=payload).json()
        return res.get("result")

    def call(self, method, params):
        payload = {
            "jsonrpc": "2.0",
            "method": method,
            "params": params,
            "auth": self.auth,
            "id": 2,
        }
        res = requests.post(self.url, json=payload).json()
        return res.get("result", [])
