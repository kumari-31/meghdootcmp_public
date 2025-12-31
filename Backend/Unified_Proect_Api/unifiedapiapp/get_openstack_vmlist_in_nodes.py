import os
from dotenv import load_dotenv
from openstack import connection

load_dotenv()  

def get_openstack_connection():
    """Establish a connection to OpenStack."""
    return connection.Connection(
        auth_url=os.getenv("AUTH_URL"),
        project_name=os.getenv("PROJECT_NAME"),
        username=os.getenv("OPENSTACK_UNAME"),
        password=os.getenv("PASSWORD"),
        user_domain_name=os.getenv("USER_DOMAIN_NAME"),
        project_domain_name=os.getenv("PROJECT_DOMAIN_NAME"),
    )

def list_nodes_and_vms():
    conn = get_openstack_connection()

    # Get list of compute nodes
    compute_services = conn.compute.services()
    nodes = [
        service.host for service in compute_services if service.binary == "nova-compute"
    ]

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
