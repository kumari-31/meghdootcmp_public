import json
import os
import subprocess
import time
import token

import requests
from django.core.exceptions import ValidationError
from django.core.mail import send_mail
from dotenv import load_dotenv
from openstack import connection
from openstack.exceptions import HttpException, ResourceNotFound
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from unifiedapiapp.models import VMInfo, VmRequest

load_dotenv()

guacamole_base_url = os.getenv("GUACAMOLE_BASE_URL")
guacamole_uname = os.getenv("GUACAMOLE_UNAME")
# guacamole_pwd = os.getenv('GUACAMOLE_PWD')
guacamole_pwd = "CHN@VL0987&*"

# Load environment variables from .env file
load_dotenv()

network_name = "demo_net"

conn = connection.Connection(
    auth_url=os.getenv("AUTH_URL"),
    project_name=os.getenv("PROJECT_NAME"),
    username="admin",
    password=os.getenv("PASSWORD"),
    user_domain_name=os.getenv("USER_DOMAIN_NAME"),
    project_domain_name=os.getenv("PROJECT_DOMAIN_NAME"),
)

def get_conn():
    return conn


def detach_volume(conn, server_id, volume_id):
    """
    Detach a volume from a VM in OpenStack.

    Parameters:
    - conn: OpenStack connection object.
    - server_id: The ID of the server (VM).
    - volume_id: The ID of the volume to be detached.
    """
    try:
        conn.compute.delete_volume_attachment(volume_id, server_id)
        print(f"Volume '{volume_id}' detached from VM '{server_id}'.")
    except Exception as e:
        print(f"Error detaching volume '{volume_id}' from VM '{server_id}': {e}")


def wait_for_volume_status(
    conn, volume_id, target_status="available", retries=300, delay=5
):
    """
    Wait for the volume to reach the target status.

    Parameters:
    - conn: OpenStack connection object.
    - volume_id: The ID of the volume.
    - target_status: The desired status (default is 'available').
    - retries: Number of retries before giving up (default is 10).
    - delay: Delay in seconds between retries (default is 5).
    """
    for attempt in range(retries):
        volume = conn.block_store.get_volume(volume_id)
        if volume.status == target_status:
            print(f"Volume '{volume_id}' is now in '{target_status}' state.")
            return True
        else:
            print(f"Volume '{volume_id}' is in '{volume.status}' state. Waiting...")
            time.sleep(delay)
    print(
        f"Volume '{volume_id}' did not reach '{target_status}' status after {retries} attempts."
    )
    return False


def delete_volume(conn, volume_id):
    """
    Delete a volume in OpenStack.

    Parameters:
    - conn: OpenStack connection object.
    - volume_id: The ID of the volume to be deleted.
    """
    try:
        if wait_for_volume_status(conn, volume_id, target_status="available"):
            conn.block_store.delete_volume(volume_id)
            print(f"Volume '{volume_id}' deleted successfully.")
        else:
            print(f"Volume '{volume_id}' is not in a deletable state.")
    except Exception as e:
        print(f"Error deleting volume '{volume_id}': {e}")


def create_vm1(
    conn, name, created_volume_id, flavor_id, image_id, network_name, timeout=600
):

    try:
        print(
            name,
            created_volume_id,
            flavor_id,
            image_id,
            network_name,
            timeout,
            "=====>",
        )
        network = conn.network.find_network(network_name)
        network_id = network.id
        server = conn.compute.create_server(
            name=name,
            flavor_id=flavor_id,
            block_device_mapping_v2=[
                {
                    "uuid": created_volume_id,
                    "source_type": "volume",
                    "destination_type": "volume",
                    "boot_index": 0,
                    "delete_on_termination": False,
                }
            ],
            # image_id=image_id,
            networks=[{"uuid": network_id}],
        )

        print(f"VM in create_vm1 '{name}' created successfully")

        # Wait for the VM to be active
        # Wait for the VM to be active
        conn.compute.wait_for_server(server, status="ACTIVE", wait=timeout)
        print(name, " is in the Active state")

        return {"server_id": server.id, "status": True}
    except Exception as e:
        print("An error occurred  create vm create_vm2:", str(e))
        return {"server_id": None, "status": False, "error": str(e)}


def extract_volume_error(volume):
    fault = getattr(volume, "fault", None)
    if fault and fault.get("message"):
        return fault.get("message")

    if hasattr(volume, "error_reason") and volume.error_reason:
        return volume.error_reason

    if hasattr(volume, "metadata") and "error_message" in volume.metadata:
        return volume.metadata["error_message"]

    return "Volume failed due to backend storage error"


def create_bootable_volume(
    auth_url,
    project_name,
    username,
    password,
    volume_name,
    size_gb,
    volume_type,
    image_id,
    vm_name,
    flavor_id,
    vm_req_id,
):
    try:
        print("volume type in create boot volume", volume_type)

        # Get volume type object
        volume_service = conn.block_storage
        volume_types = list(volume_service.types())
        volume_type_obj = next(
            (vt for vt in volume_types if vt.name == volume_type), volume_types[0]
        )

        # Create the bootable volume
        volume = volume_service.create_volume(
            name=volume_name,
            size=size_gb,
            volume_type=volume_type_obj.id,
            imageRef=image_id,
        )
        created_volume_id = volume.id
        print(f"Volume Status: {volume.status}")

        # Wait for the volume to reach a final state
        wait_for_volume_status(conn, created_volume_id)
        volume = conn.block_storage.get_volume(created_volume_id)  # refresh volume info
        # volume = conn.block_store.get_volume(created_volume_id)

        # Handle error state
        if volume.status == "error":
            error_message = extract_volume_error(volume)
            print(f"Volume {created_volume_id} entered ERROR state: {error_message}")
            # Update VM request with error
            VmRequest.objects.filter(id=vm_req_id).update(
                creation_status="Failed", creation_error_message=error_message
            )
            return None, None, None, error_message


        # Volume ready, create VM
        if volume.status == "available":
            print(
                f"Bootable volume '{volume_name}' created successfully with ID: {created_volume_id}"
            )
            vm_instance = create_vm1(
                conn,
                vm_name,
                created_volume_id,
                flavor_id,
                image_id,
                network_name,
                timeout=600,
            )

            vm_req_obj = VmRequest.objects.get(id=vm_req_id)
            if vm_instance["status"]:
                vm_req_obj.creation_status = "Created"
                vm_req_obj.creation_error_message = None
                # vm_req_obj.save()
            else:
                vm_req_obj.creation_status = "Failed"
                vm_req_obj.creation_error_message = vm_instance.get(
                    "error", "Unknown VM error"
                )
                vm_req_obj.save()
                return None, None, vm_instance.get("error", "VM creation failed")
                        # ⭐⭐⭐ NEW CODE — Get Neutron port ID (connection_id)
            server_id = vm_instance["server_id"]
            ports = list(conn.network.ports(device_id=server_id))  # Convert generator to list
            connection_id = ports[0].id if ports else None
            print(f"Connection (Port) ID for VM '{vm_name}': {connection_id}")

            # Update request success
            vm_req_obj.creation_status = "Created"
            vm_req_obj.creation_error_message = None
            vm_req_obj.save()

            # Return connection_id now
            return created_volume_id, server_id, None, ""

        # Unexpected status
        print(f"Volume {created_volume_id} is in unexpected status: {volume.status}")
        return None, None, None, f"Volume in unexpected status: {volume.status}"


    except Exception as e:
        import traceback

        traceback.print_exc()
        print(f"Error creating bootable volume: {e}")
        VmRequest.objects.filter(id=vm_req_id).update(
            creation_status="Failed", creation_error_message=str(e)
        )
        return None, None, None, str(e)


def create_data_volume(size, volume_name, data_volume_type):
    print(volume_name)
    print("data volume type ---->", data_volume_type)

    volume = conn.block_store.create_volume(
        size=size, name=volume_name, volume_type=data_volume_type
    )
    print("data volume id--->", volume.id)
    return volume.id


def attach_volume_to_vm(instance_name, volume_id, retries=10, delay=5):
    try:
        # Find the server (VM) by instance name
        server = conn.compute.find_server(instance_name)
        if not server:
            print(f"Server with instance name '{instance_name}' not found.")
            return ""

        # Wait for the server to be in the ACTIVE state
        if not wait_for_server_status(server, "ACTIVE"):
            print(
                f"Server {instance_name} is not in ACTIVE state, cannot attach volume."
            )
            return ""

        for attempt in range(retries):
            try:
                # Attach the volume to the server
                attachment = conn.compute.create_volume_attachment(
                    server.id, volume_id=volume_id
                )

                print(
                    f"Volume {volume_id} attached to server {instance_name} with attachment ID {attachment.id}."
                )
                return volume_id
            except HttpException as e:
                if "504" in str(e) or "400" in str(e):
                    print(
                        f"Attempt {attempt + 1} failed with 504 Gateway Timeout. Retrying in {delay} seconds..."
                    )
                    time.sleep(delay)
                else:
                    raise

    except ResourceNotFound as e:
        print(f"Resource not found: {e}")
    except HttpException as e:
        print(f"HTTP error occurred: {e}")
    except Exception as e:
        print(f"An error occurred attaching data volume: {e}")
    return ""


def wait_for_server_status(server, target_status="ACTIVE", retries=300, delay=5):
    """Wait for the server to reach the target status."""
    for attempt in range(retries):
        print("before status check=====")
        server = conn.compute.get_server(server.id)
        print(server.status, "===> server status")
        if server.status == target_status:
            print(f"Server {server.name} is now {target_status}.")
            return True
        else:
            print(
                f"Server {server.name} is in {server.status} state. Waiting...: attempt: {attempt}"
            )
            time.sleep(delay)
    print(
        f"Server {server.name} did not reach {target_status} status after {retries} attempts."
    )
    return False


def get_guac_user(username, token):
    """Return True if Guacamole user exists, else False."""
    try:
        url = f"{guacamole_base_url}/session/data/mysql/users/{username}?token={token}"
        resp = requests.get(url)
        return resp.status_code == 200
    except:
        return False


def run_shell_script_to_save_vm_details(vms, creation=True):
    print("vms in run shell script", vms)
    if not vms:
        print("Empty VM list provided")
        return {"status": False, "message": "Empty VM list provided"}

    vm_names = [vm["vm_name"] for vm in vms]
    print("vmname++++++", vm_names)
    # base_path = os.getenv('BASE_DIR', '/Desktop/SDC_Portal')
    base_path = (
        "/home/rakshana/Desktop/Unified Dashboard API/Unified_Proect_Api/unifiedapiapp"
    )
    shell_script_path = os.path.join(base_path, "script.sh")
    # shell_script_path = os.path.join(os.getcwd(), 'vdiapp', 'script.sh')
    print("shell script path================>>>>>>>", shell_script_path)

    # PRE-DEFINE VARIABLES SO THEY EXIST EVEN IF EXCEPTION OCCURS
    host_name = instance_name = vnc_display = u_name = None

    try:
        # lines=[]
        api_url = "http://10.184.49.18:8001/fetch-vm-info"  # Change this to the actual URL of your Flask API

        # Prepare the data to send in the POST request
        payload = {"vms": vm_names}
        response = requests.post(api_url, json=payload)

        # Print the response from the API
        print("API response:", response.json())

        if response.status_code != 200:
            print(f"API call failed with status code {response.status_code}")
            return {"status": False, "message": f"API error: {response.text}"}

        # Get the CSV content from the API response
        api_response = response.json()
        if "output_csv" in api_response:
            lines = api_response["output_csv"].strip().split("\n")[1:]
            print("lines=--==--=-=-==-", lines)
        else:
            print("API response did not include CSV content.")
            return {
                "status": False,
                "message": "API response did not include expected data.",
            }

        # ----------------------------
        # 2️⃣ GET GUACAMOLE AUTH TOKEN
        # -------------------------------
        authToken = get_guac_token()

        if not authToken:
            print("Failed to get Guacamole token")
            return {"status": False, "message": "Failed to get token"}

        print("AUTHtoken===========>", authToken)

        guac_connections = {}

        for line, vmtime in zip(lines, vms):
            fields = line.split(",")
            if len(fields) != 4:
                print("Invalid CSV line format")
                continue

            vm_name, host_raw, parsed_instance_name, vnc_raw = fields

            host_name = "10.184.43.17" if host_raw == "fspcloud" else "10.184.49.18"
            vnc_display = f"59{vnc_raw}" if len(vnc_raw) == 2 else f"590{vnc_raw}"
            u_name = vmtime.get("username")
            user_mail = vmtime.get("email")
            print(
                f"Parsed → Host:{host_name}, Instance:{parsed_instance_name}, VNC:{vnc_display}, User:{u_name}"
            )

            # -------------------------------
            # 4️⃣ CREATE GUACAMOLE CONNECTION
            # -------------------------------
            conn = create_connection(vm_name, vnc_display, host_name, authToken)
            if conn.status_code != 200:
                print(f"Failed to create connection for {vm_name}")
                continue

            con_identifier = conn.json().get("identifier")
            print("Connection ID:", con_identifier)

            guac_connections[vm_name] = con_identifier

            # -------------------------------
            # 5️⃣ CREATE GUACAMOLE USER
            # -------------------------------
            user_exists = get_guac_user(u_name, authToken)

            if user_exists:
                print(f"User '{u_name}' already exists → will reuse this user.")
                user_created = False
            else:
                user = create_user(u_name, u_name, authToken, vmtime)
                user_created = user.status_code == 200
                if user_created:
                    print(f"New Guacamole user '{u_name}' created.")
                else:
                    print("User creation failed:", getattr(user, "text", user))

            # -------------------------------
            # 6️⃣ MAP USER ↔ CONNECTION
            # -------------------------------
            map_resp = map_user_conn(con_identifier, u_name, authToken)

            if map_resp.status_code in [200, 204]:
                print(f"Mapped VM → User '{u_name}' successfully.")
            else:
                print("User mapping failed:", getattr(map_resp, "text", map_resp))


            instance_name = parsed_instance_name
            # -------------------------------
            # 7️⃣ SAVE VM DETAILS IN DATABASE
            # -------------------------------
            vm_info_obj, created = VMInfo.objects.update_or_create(
                vm_name=vm_name,
                defaults={
                    "host_name": host_name,
                    "instance_name": parsed_instance_name,
                    "vnc_display": vnc_display,
                    "username": u_name,
                    "vm_access_from_date": vmtime.get("vm_access_from_date"),
                    "vm_access_to_date": vmtime.get("vm_access_to_date"),
                    "vm_access_from_time": vmtime.get("vm_access_from_time"),
                    "vm_access_to_time": vmtime.get("vm_access_to_time"),
                    "email": user_mail,
                    "volume_id": vmtime.get("volume_id"),
                    "data_volume_id": vmtime.get("data_volume_id"),
                    "vm_id": vmtime.get("vm_id"),
                    "connection_id": con_identifier,
                },
            )

            print(">>> Saved VMInfo:", vm_info_obj)

            update_ip_by_vmname(vm_name)    

            # -------------------------------
            # 8️⃣ SEND EMAIL
            # -------------------------------
            try:
                subject = "VM Creation Successful"
                message = f"""
Dear {u_name},

Your VM has been successfully created.

Access link:
https://virtuallab.bosschn.in/

Login:
Username: {u_name}
Password: {u_name}

Thanks & Regards,
Cloud Team
                """

                if user_created:
                    send_mail(subject, message, "noreply@cloud.com", [user_mail])
                    print("Email sent.")
                else:
                    print(f"No email sent because '{u_name}' already existed.")

            except Exception as e:
                print(f"Error sending email: {e}")

    except Exception as e:
        traceback.print_exc()
        print(f"Error in run_shell_script_to_save_vm_details: {e}")
        return {"status": False, "message": str(e)}

    return {
        "status": True,
        "message": "VMs Created Successfully",
        "host_name": host_name,
        "instance_name": instance_name,
        "vnc_display": vnc_display,
        "username": u_name,
        "connections": guac_connections,
    }


def update_ip_by_vmname(vm_name):
    try:
        print("Fetching server by VM Name:", vm_name)

        server = conn.compute.find_server(vm_name)
        if not server:
            print("No server found with name:", vm_name)
            return ""

        ip = ""
        for net, addrs in server.addresses.items():
            for addr in addrs:
                ip = addr["addr"]
                print("IP:", ip)

        # update DB
        VMInfo.objects.filter(vm_name=vm_name).update(ip=ip)

        return ip

    except Exception as e:
        print("Error in update_ip_by_vmname:", e)
        return ""


def get_guac_token():
    url = f"{guacamole_base_url}/tokens"
    print("guacamole uname and pwd", guacamole_uname, guacamole_pwd)
    print("url in get token", url)
    # payload=f"username={guacamole_uname}&password={guacamole_pwd}"
    payload = {"username": guacamole_uname, "password": guacamole_pwd}
    headers = {"Content-Type": "application/x-www-form-urlencoded"}
    print("HEADERS SENT:", headers)
    print("PAYLOAD SENT:", payload)
    # response = requests.request("POST", url, headers=headers, data=payload)
    response = requests.post(url, data=payload, headers=headers)
    print("Token response code:", response.status_code)
    print("Token response body:", response.text)

    if response.status_code != 200:
        return None # Failed to get token
    return response.json().get("authToken")

# def get_guac_token():

#     print("GUAC URL:", guacamole_base_url)
#     print("GUAC USER:", guacamole_uname)
#     print("GUAC PWD:", guacamole_pwd)
    
#     url = f"{guacamole_base_url}/tokens"
#     payload = {"username": guacamole_uname, "password": guacamole_pwd}
#     headers = {"Content-Type": "application/x-www-form-urlencoded"}

#     try:
#         response = requests.post(url, data=payload, headers=headers)
#         print("Token response code:", response.status_code)
#         print("Token response body:", response.text)

#         if response.status_code == 200:
#             # Return only the token string
#             return response.json().get("authToken")
#         else:
#             print("Failed to get Guacamole token")
#             return None

#     except Exception as e:
#         print("Exception while getting Guacamole token:", e)
#         return None




def delete_connection(connection_id, authToken):
    url = f"{guacamole_base_url}/session/data/mysql/connections/{connection_id}?token={authToken}"
    headers = {"X-Guacamole-Token": authToken}  # optional
    response = requests.delete(url, headers=headers)
    return response


def delete_guac_user(username, authToken):
    url = f"{guacamole_base_url}/session/data/mysql/users/{username}?token={authToken}"
    headers = {"X-Guacamole-Token": authToken}  # optional
    response = requests.delete(url, headers=headers)
    return response



def create_connection(name, port, hostname, authToken):
    url = f"{guacamole_base_url}/session/data/mysql/connections?token=" + authToken

    payload = json.dumps(
        {
            "parentIdentifier": "ROOT",
            "name": name,
            "protocol": "vnc",
            "parameters": {
                "port": port,
                "read-only": "",
                "swap-red-blue": "",
                "cursor": "",
                "color-depth": "",
                "clipboard-encoding": "",
                "disable-copy": "",
                "disable-paste": "",
                "dest-port": "",
                "recording-exclude-output": "",
                "recording-exclude-mouse": "",
                "recording-include-keys": "",
                "create-recording-path": "",
                "enable-sftp": "false",
                "sftp-port": "",
                "sftp-server-alive-interval": "",
                "enable-audio": "",
                "audio-servername": "",
                "sftp-directory": "",
                "sftp-root-directory": "",
                "sftp-passphrase": "",
                "sftp-private-key": "",
                "sftp-username": "",
                "sftp-password": "",
                "sftp-host-key": "",
                "sftp-hostname": "",
                "recording-name": "",
                "recording-path": "",
                "dest-host": "",
                "password": "",
                "username": "",
                "hostname": hostname,
            },
            "attributes": {
                "max-connections": "5",
                "max-connections-per-user": "5",
                "weight": "",
                "failover-only": "",
                "guacd-port": "",
                "guacd-encryption": "",
                "guacd-hostname": "",
            },
        }
    )
    headers = {"Content-Type": "application/json"}

    response = requests.request("POST", url, headers=headers, data=payload)

    return response


def create_user(username, password, authToken, vmvalidity):

    check_url = f"{guacamole_base_url}/session/data/mysql/users/{username}?token=" + authToken
    check_resp = requests.get(check_url)

    if check_resp.status_code == 200:
        print(f"User '{username}' already exists in Guacamole → SKIPPING creation")
        return check_resp

    url = f"{guacamole_base_url}/session/data/mysql/users?token={authToken}"

    payload = {
        "username": username,
        "password": password,
        "attributes": {
            "disabled": "",
            "expired": "",
            "access-window-start": vmvalidity["vm_access_from_time"],
            "access-window-end": vmvalidity["vm_access_to_time"],
            "valid-from": vmvalidity["vm_access_from_date"],
            "valid-until": vmvalidity["vm_access_to_date"],
            "timezone": "Asia/Kolkata",
            "guac-full-name": "",
            "guac-organization": "",
            "guac-organizational-role": "",
        },
    }

    headers = {"Content-Type": "application/json"}
    response = requests.post(url, json=payload, headers=headers)

    return response


def map_user_conn(con_identifier, username, authToken):
    # print(type(con_identifier))

    url = (
        f"{guacamole_base_url}/session/data/mysql/users/"
        + username
        + "/permissions?token="
        + authToken
    )

    payload = [
        {
            "op": "add",
            "path": "/connectionPermissions/" + con_identifier,
            "value": "READ",
        }
    ]
    headers = {"Content-Type": "application/json"}

    response = requests.patch(url, headers=headers, json=payload)

    return response


def get_connections_list():

    authToken = get_guac_token()
    if not authToken:
        print("Failed to get Guacamole token")
        return {}

    url = f"{guacamole_base_url}//session/data/mysql/connections?token=" + authToken
    response = requests.get(url)

    # Check if the request was successful (status code 200)
    if response.status_code == 200:
        # Parse the JSON response into a dictionary
        api_connection_data = response.json()

        # Display the dictionary
        print(api_connection_data)
        return api_connection_data
    else:
        print(f"API request failed with status code: {response.status_code}")
        return {}


def update_connection(connection_id, update_data):
    """
    Update the connection with the given ID using the provided update_data.

    Args:
        connection_id (str): The identifier of the connection to update.
        update_data (dict): The data to update the connection.

    Returns:
        dict: The response JSON from the API.
    """
    try:
        # API endpoint for updating a connection
        api_url = f"{guacamole_base_url}/session/data/mysql/connections/{connection_id}"

        # Make a PATCH request to update the connection
        response = requests.patch(api_url, json=update_data)

        # Check if the request was successful (status code 200)
        response.raise_for_status()

        # Parse the JSON response into a dictionary
        result = response.json()

        return result
    except requests.exceptions.RequestException as e:
        # Handle any request-related exceptions (e.g., network errors)
        print(f"Request failed: {e}")
        return {"error": f"Request failed: {e}"}
    except Exception as e:
        # Handle other unexpected exceptions
        print(f"An unexpected error occurred: {e}")
        return {"error": f"An unexpected error occurred: {e}"}


def update_guacamole_user_date_time(username, from_date, to_date, from_time, to_time):
    print("updating", username, from_date, to_date, from_time, to_time)
    authToken = get_guac_token()
    if not authToken:
        print("Failed to get Guacamole token")
        return
    
    print(authToken)
    url = f"{guacamole_base_url}/session/data/mysql/users/{username}?token=" + authToken

    headers = {
        "Content-Type": "application/json",
    }

    payload = {
        "username": username,
        "attributes": {
            "guac-email-address": None,
            "guac-organizational-role": None,
            "guac-full-name": None,
            "expired": "",
            "timezone": None,
            "access-window-start": from_time + ":00",
            "guac-organization": None,
            "access-window-end": to_time + ":00",
            "disabled": "",
            "valid-until": to_date,
            "valid-from": from_date,
        },
    }

    response = requests.put(url, json=payload, headers=headers)

    if response.status_code == 200:
        print(f"Successfully updated user {username} data in guacamole.")
    else:
        print(
            f"Failed to update user {username} data in guacamole. Status code: {response.status_code}"
        )
        print(response.text)


#

############
import csv
import sys
import traceback


def read_csv_file(csv_file_path):
    try:
        authToken = get_guac_token()
        if not authToken:
            print("Failed to get Guacamole token")
            return
        with open(csv_file_path, "r") as file:
            csv_reader = csv.DictReader(file)

            # Print the headers
            print("VM , Hostname, VNC Display, Username")

            # Iterate over each row in the CSV file"
            for row in csv_reader:
                vm = row["VMname"]
                hostname = (
                    "10.184.43.17" if row["Hostname"] == "fspcloud" else "10.184.49.18"
                )
                vnc_display = f"59{row['VNC Display']}"
                username = row["username"]
 

                conn = create_connection(username, vnc_display, hostname, authToken)
                con_identifier = conn.json()["identifier"]
                if conn.status_code == 200:
                    print("connection created")
                        # print(conn.json())
                        # con_identifier = conn.json()['identifier']

                else:
                    print(conn)
                user = create_user(username, username, authToken)
                if user.status_code == 200:
                    print("user created")
                        # print(user.json())
                    username = user.json()["username"]

                else:
                    print("status code", user)

                map_user = map_user_conn(con_identifier, username, authToken)
                    # print(map_user.json())
                con_identifier = conn.json()["identifier"]
                print("connection identifier", con_identifier)
                if map_user.status_code == 204:
                    print("map_user done")
                        # print(map_user.json())

                else:
                    print(map_user)
            else:
                print("No token")

                # Print the extracted values
                print(f"{vm}, {hostname}, {vnc_display}, {username}")
    except FileNotFoundError:
        print("File not found.")
    except Exception as e:
        print(f"An error occurred: {e}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python script.py <csv_file_path>")
    else:
        csv_file_path = sys.argv[1]
        read_csv_file(csv_file_path)


# def create_vm1(conn, name, created_volume_id,flavor_id, image_id, network_name,timeout=600):

#     try:
#         print("created_volume_id",created_volume_id)
#         print(name,created_volume_id,flavor_id, image_id, network_name,timeout, "=====>")
#         # Find the network by name
#         network = conn.network.find_network(network_name)
#         network_id = network.id
#         print("network id",network_id)
#         server = conn.compute.create_server(
#             name=name,
#             flavor_id=flavor_id,
#             block_device_mapping_v2=[
#                 {
#                     'uuid': created_volume_id,
#                     'source_type': 'volume',
#                     'destination_type': 'volume',
#                     'boot_index': 0,
#                     'delete_on_termination': False,
#                 }
#             ],
#             # image_id=image_id,
#             networks=[{"uuid": network_id}]
#         )


#         # Wait for the VM to be active
#           # Wait for the VM to be active
#         conn.compute.wait_for_server(server,status='ACTIVE', wait=timeout)
#         print(name," is in the Active state")
#         print(f"VM ----->'{name}' created successfully")
#         return {'server_id': server.id, 'status': True}
#     except Exception as e:
#         print("An error occurred  create vm openstackoperations:", str(e))
#         return {'server_id': None, 'status': False, 'error': str(e)}

# def create_vm1(conn, name, created_volume_id, flavor_id, image_id, network_name, timeout=600):
#     try:
#         print("created_volume_id:", created_volume_id)
#         print("name ---", name, "created volume is ---",created_volume_id, "flavor_id is ---", flavor_id, "image_id is ---", image_id, "network_name is ---", network_name, "timeout is ---", timeout)

#         # Find the network by name
#         network = conn.network.find_network(network_name)
#         network_id = network.id
#         print("Network ID:", network_id)

#         # Check volume status
#         volume = conn.block_storage.get_volume(created_volume_id)
#         print("Volume Status:", volume.status)
#         if volume.status != 'available':
#             raise Exception(f"Volume {created_volume_id} is not available. Current status: {volume.status}")

#         server = conn.compute.create_server(
#             name=name,
#             flavor_id=flavor_id,
#             block_device_mapping_v2=[
#                 {
#                     'uuid': created_volume_id,
#                     'source_type': 'volume',
#                     'destination_type': 'volume',
#                     'boot_index': 0,
#                     'delete_on_termination': False,
#                 }
#             ],
#             networks=[{"uuid": network_id}]
#         )

#         # Wait for the VM to be active
#         conn.compute.wait_for_server(server, status='ACTIVE', wait=timeout)
#         print(name, "is in the Active state")
#         print(f"VM -----> '{name}' created successfully")
#         return {'server_id': server.id, 'status': True}
#     except Exception as e:
#         print("An error occurred while creating VM in OpenStack operations:", str(e))
#         return {'server_id': None, 'status': False, 'error': str(e)}
