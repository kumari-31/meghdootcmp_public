import os
from kubernetes import client, config

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
KUBECONFIG_PATH = os.path.join(BASE_DIR, "admin.conf")

def get_k8s_client():
    try:
        config.load_incluster_config()
    except config.ConfigException:
        config.load_kube_config(config_file=KUBECONFIG_PATH)

    return client.CoreV1Api()
