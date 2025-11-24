import requests

guacamole_base_url = "https://virtuallab.bosschn.in/api"
guacamole_username = "guacadmin"
guacamole_password = "CHN@VL2025"

def get_token():
    url = f"{guacamole_base_url}/tokens"
    data = {
        "username": guacamole_username,
        "password": guacamole_password
    }
    response = requests.post(url, data=data)
    if response.status_code == 200:
        return response.json()["authToken"]
    else:
        raise Exception("Failed to authenticate with Guacamole API")

def get_connections_list():
    token = get_token()
    url = f"{guacamole_base_url}/session/data/mysql/connections?token={token}"
    response = requests.get(url)
    if response.status_code == 200:
        return response.json(), token
    else:
        print(f"API request failed with status code: {response.status_code}")
        return {}, None

def delete_connection_by_name(names_to_delete):
    connections, token = get_connections_list()
    if not token:
        return

    for conn_id, conn_info in connections.items():
        if conn_info.get("name") in names_to_delete:
            url = f"{guacamole_base_url}/session/data/mysql/connections/{conn_id}?token={token}"
            response = requests.delete(url)
            if response.status_code == 204:
                print(f"✅ Deleted connection: {conn_info['name']}")
                
            else:
                print(f"❌ Failed to delete {conn_info['name']}. Status code: {response.status_code}")
        # else:
        #     print(f"ℹ️ Skipping: {conn_info.get('name')}")
        #     continue

# 🧪 Example usage
names = ["102235_cdac-1", "346814_newvm-1"]
delete_connection_by_name(names)
