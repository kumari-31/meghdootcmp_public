import os

from kubernetes import client, config


def deploy_nginx_pod(pod_name, port):
    # Get the directory where kubenetes.py is located
    current_dir = os.path.dirname(os.path.abspath(__file__))
    # Construct absolute path to admin.conf
    admin_conf_path = os.path.join(current_dir, "admin.conf")

    try:
        # Load kubeconfig with absolute path
        config.load_kube_config(config_file=admin_conf_path)
        v1 = client.CoreV1Api()
        apps_v1 = client.AppsV1Api()

        # Define pod spec
        pod = client.V1Pod(
            metadata=client.V1ObjectMeta(name=pod_name, labels={"app": "nginx"}),
            spec=client.V1PodSpec(
                containers=[
                    client.V1Container(
                        name="nginx",
                        image="nginx:latest",
                        ports=[client.V1ContainerPort(container_port=port)],
                    )
                ]
            ),
        )

        # Create pod in "default" namespace
        try:
            resp = v1.create_namespaced_pod(namespace="default", body=pod)
            print(f"Pod '{pod_name}' created successfully!")
            return True
        except client.exceptions.ApiException as e:
            if e.status == 409:
                print(f"Pod '{pod_name}' already exists.")
                return True
            else:
                print(f"Failed to create pod: {e}")
                return False
    except Exception as e:
        print(f"Error loading kubeconfig or creating pod: {e}")
        return False


# if __name__ == "__main__":
#     pod_name = input("Enter the pod name: ")
#     port_input = input("Enter the port number: ")

#     try:
#         port = int(port_input)
#         deploy_nginx_pod(pod_name, port)
#     except ValueError:
#         print("Invalid port. Please enter a number.")
