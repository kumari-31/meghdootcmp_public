# import requests
# import urllib3

# # Disable SSL warnings for self-signed certificates
# urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# # Kubernetes API URL (Update if using a different namespace)
# K8S_API_URL = "https://10.184.49.239:31113/api/v1/namespaces/kubernetes-dashboard/pods"

# # Generate token manually: kubectl -n kubernetes-dashboard create token admin-user
# TOKEN = "eyJhbGciOiJSUzI1NiIsImtpZCI6InpTaFpYbnNkS21tUVBheVNJcDk1Y19NVTlpR1FQZnJjUEpQWmgzUlBZWFUifQ.eyJhdWQiOlsiaHR0cHM6Ly9rdWJlcm5ldGVzLmRlZmF1bHQuc3ZjLmNsdXN0ZXIubG9jYWwiXSwiZXhwIjoxNzQxMDc0OTAzLCJpYXQiOjE3NDEwNzEzMDMsImlzcyI6Imh0dHBzOi8va3ViZXJuZXRlcy5kZWZhdWx0LnN2Yy5jbHVzdGVyLmxvY2FsIiwianRpIjoiYzVhMjE0ZDgtYTJlMy00ZTk0LWJmYmItZGYyZWJkNjAxMThlIiwia3ViZXJuZXRlcy5pbyI6eyJuYW1lc3BhY2UiOiJrdWJlcm5ldGVzLWRhc2hib2FyZCIsInNlcnZpY2VhY2NvdW50Ijp7Im5hbWUiOiJhZG1pbi11c2VyIiwidWlkIjoiNTkxZGIzOTgtNzVhZS00MDA1LTlmMDYtMGViZDYxODVkZTJhIn19LCJuYmYiOjE3NDEwNzEzMDMsInN1YiI6InN5c3RlbTpzZXJ2aWNlYWNjb3VudDprdWJlcm5ldGVzLWRhc2hib2FyZDphZG1pbi11c2VyIn0.MI6dZglrf7PvH6JLCybOncjrebFbtJugmtjNBR2uL2UAm_RydEMp3twAIzKJ4rPwLk6cIpZvgMl7BE8-3SZnyEUGBtN_jKEq6fnwBJO0cOmJL9-BjimkQ9Aoq7XRnzdE7CmqzS3OOdLoMNKP4X-vEZchKo7_QAfQpDI_TmCEozagIr42O_S8-DThIefzlxWPIWg_O-lEPcVqBd9Q1MPrc3vdvHeJtHs1IoQheADJ5deLhmslTzmNu0ddrBhMbfGrNcmXjxB5iEDzu1OpqLCByqpTw7CHhXgEn79xZlQ5RX0BRxf1bObvBc-3DrERZofCOUGUi-9_05Ocp6SSoamiEw"  # Replace with your generated token

# # API request headers
# HEADERS = {"Authorization": f"Bearer {TOKEN}", "Accept": "application/json"}


# def get_pods():
#     try:
#         response = requests.get(K8S_API_URL, headers=HEADERS, verify=False)
#         if response.status_code == 200:
#             pods = response.json()
#             for pod in pods.get("items", []):
#                 print(
#                     f"Pod Name: {pod['metadata']['name']}, Status: {pod['status']['phase']}"
#                 )
#         else:
#             print(f"Error {response.status_code}: {response.text}")
#     except requests.RequestException as e:
#         print(f"Error fetching pod details: {e}")


# if __name__ == "__main__":
#     get_pods()
