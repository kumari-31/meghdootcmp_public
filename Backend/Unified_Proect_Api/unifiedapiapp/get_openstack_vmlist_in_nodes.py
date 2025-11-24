import openstack
import os
from dotenv import load_dotenv
from openstack import connection

load_dotenv()  # This will load the environment variables from a .env file



# AUTH_URL = os.getenv("AUTH_URL")
# PROJECT_NAME = os.getenv("PROJECT_NAME")
# USERNAME = os.getenv("OPENSTACK_UNAME")
# PASSWORD = os.getenv("PASSWORD")
# USER_DOMAIN_NAME = os.getenv("USER_DOMAIN_NAME")
# PROJECT_DOMAIN_NAME = os.getenv("PROJECT_DOMAIN_NAME")
# SERVER_URL = os.getenv("SERVER_URL")




AUTH_URL = "http://10.184.43.17:5000/v3/"
PROJECT_NAME = "admin"
USERNAME = "admin"
PASSWORD = "Meghd@@t123"
USER_DOMAIN_NAME = "Default"
PROJECT_DOMAIN_NAME = "Default"
SERVER_URL = "http://10.184.43.17:5000/v3/"

def get_openstack_connection():
    """Establish a connection to OpenStack."""
    print("AUTH_URL:", AUTH_URL)
    return connection.Connection(
        auth_url=AUTH_URL,
        project_name=PROJECT_NAME,
        username="admin",
        password=PASSWORD,
        user_domain_name=USER_DOMAIN_NAME,
        project_domain_name=PROJECT_DOMAIN_NAME,
    )
    # return connection.Connection(
    #     auth_url=os.getenv("AUTH_URL"),
    #     project_name=os.getenv("PROJECT_NAME"),
    #     username="admin",
    #     password=os.getenv("PASSWORD"),
    #     user_domain_name=os.getenv("USER_DOMAIN_NAME"),
    #     project_domain_name=os.getenv("PROJECT_DOMAIN_NAME"),
    # )

def list_nodes_and_vms():
    conn = get_openstack_connection()
    
    # Get list of compute nodes
    compute_services = conn.compute.services()
    nodes = [service.host for service in compute_services if service.binary == "nova-compute"]
    
    node_vm_mapping = {}
    
    for node in nodes:
        # Get all VMs
        vms = conn.compute.servers()
        
        # Filter VMs running on this specific node
        node_vms = [vm.name for vm in vms if vm.hypervisor_hostname == node]
        node_vm_mapping[node] = node_vms
    
    return node_vm_mapping

if __name__ == "__main__":
    result = list_nodes_and_vms()
    for node, vms in result.items():
        print(f"Node: {node}")
        for vm in vms:
            print(f"  - VM: {vm}")
        print("\n")
