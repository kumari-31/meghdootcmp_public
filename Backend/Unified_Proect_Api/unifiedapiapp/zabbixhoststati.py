import json
import os
import requests

# Zabbix credentials and URL
ZABBIX_URL = os.getenv("ZABBIX_URL")
ZABBIX_USER = os.getenv("ZABBIX_USER")
ZABBIX_PASSWORD = os.getenv("ZABBIX_PASSWORD")


# Authenticate and get token
def zabbix_login():
    payload = {
        "jsonrpc": "2.0",
        "method": "user.login",
        "params": {"username": ZABBIX_USER, "password": ZABBIX_PASSWORD},
        "id": 1,
        "auth": None,
    }
    response = requests.post(ZABBIX_URL, json=payload)
    return response.json().get("result")


# Get all host availability status
def get_host_availability(auth_token):
    payload = {
        "jsonrpc": "2.0",
        "method": "host.get",
        "params": {
            "output": ["hostid", "name", "available"],
        },
        "auth": auth_token,
        "id": 2,
    }
    response = requests.post(ZABBIX_URL, json=payload)
    return response.json().get("result", [])


# Main logic
def main():
    token = zabbix_login()
    if not token:
        print("Login failed.")
        return

    hosts = get_host_availability(token)
    if not hosts:
        print("No host data found.")
        return

    # Count statuses
    availability_map = {"1": "Available", "2": "Not available", "0": "Unknown"}
    status_count = {"Available": 0, "Not available": 0, "Unknown": 0}

    for host in hosts:
        status = availability_map.get(str(host["available"]), "Unknown")
        status_count[status] += 1

    total = sum(status_count.values())
    print(f"Host Availability:")
    print(f"Available: {status_count['Available']}")
    print(f"Not Available: {status_count['Not available']}")
    print(f"Unknown: {status_count['Unknown']}")
    print(f"Total: {total}")


if __name__ == "__main__":
    main()
