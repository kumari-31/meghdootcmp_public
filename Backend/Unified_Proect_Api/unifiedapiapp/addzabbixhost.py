import json

import requests

# Zabbix API credentials
ZABBIX_URL = "http://10.184.49.245/zabbix/api_jsonrpc.php"
ZABBIX_USER = "Admin"
ZABBIX_PASSWORD = "zabbix"


# Function to authenticate with Zabbix API
def zabbix_login():
    payload = {
        "jsonrpc": "2.0",
        "method": "user.login",
        "params": {"user": ZABBIX_USER, "password": ZABBIX_PASSWORD},
        "id": 1,
        "auth": None,
    }
    response = requests.post(ZABBIX_URL, json=payload)
    return response.json().get("result")


# Function to get the host group ID
def get_hostgroup_id(auth_token, group_name="Linux servers"):
    payload = {
        "jsonrpc": "2.0",
        "method": "hostgroup.get",
        "params": {"filter": {"name": group_name}},
        "auth": auth_token,
        "id": 2,
    }
    response = requests.post(ZABBIX_URL, json=payload)
    groups = response.json().get("result", [])
    return groups[0]["groupid"] if groups else None


# Function to get the template ID
def get_template_id(auth_token, template_name="Template OS Linux"):
    payload = {
        "jsonrpc": "2.0",
        "method": "template.get",
        "params": {"filter": {"host": template_name}},
        "auth": auth_token,
        "id": 3,
    }
    response = requests.post(ZABBIX_URL, json=payload)
    templates = response.json().get("result", [])
    return templates[0]["templateid"] if templates else None


# Function to add a new host (VM)
def add_host(auth_token, vm_name, vm_ip):
    hostgroup_id = get_hostgroup_id(auth_token)
    template_id = get_template_id(auth_token)

    if not hostgroup_id or not template_id:
        print("Error: Host group or template not found.")
        return None

    payload = {
        "jsonrpc": "2.0",
        "method": "host.create",
        "params": {
            "host": vm_name,
            "interfaces": [
                {
                    "type": 1,  # Agent interface
                    "main": 1,
                    "useip": 1,
                    "ip": vm_ip,
                    "dns": "",
                    "port": "10050",
                }
            ],
            "groups": [{"groupid": hostgroup_id}],
            "templates": [{"templateid": template_id}],
        },
        "auth": auth_token,
        "id": 4,
    }
    response = requests.post(ZABBIX_URL, json=payload)
    return response.json()


# Main script execution
if __name__ == "__main__":
    auth_token = zabbix_login()
    if auth_token:
        vm_name = "347997_test-vm-rakshana-2"
        vm_ip = "10.184.53.210"  # Replace with the actual VM IP

        result = add_host(auth_token, vm_name, vm_ip)
        print("Zabbix Response:", json.dumps(result, indent=4))
    else:
        print("Failed to authenticate with Zabbix API.")
