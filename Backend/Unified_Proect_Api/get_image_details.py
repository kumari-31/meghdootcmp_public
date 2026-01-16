# import requests

# # OpenStack credentials
# auth_url = "http://10.184.43.17:5000/v3/auth/tokens"
# username = "admin"
# password = "Meghd@@t123"
# project_name = "admin"
# user_domain_name = "Default"
# project_domain_name = "Default"


# # Get the authentication token
# def get_token():
#     headers = {"Content-Type": "application/json"}
#     data = {
#         "auth": {
#             "identity": {
#                 "methods": ["password"],
#                 "password": {
#                     "user": {
#                         "name": username,
#                         "domain": {"name": user_domain_name},
#                         "password": password,
#                     }
#                 },
#             },
#             "scope": {
#                 "project": {
#                     "name": project_name,
#                     "domain": {"name": project_domain_name},
#                 }
#             },
#         }
#     }

#     response = requests.post(auth_url, json=data, headers=headers)
#     response.raise_for_status()  # Raise an error if the request failed
#     return response.headers["X-Subject-Token"]


# # Get the image details
# def get_image_details(image_id):
#     glance_url = f"http://10.184.43.17/api/glance/images/{image_id}"
#     token = get_token()
#     headers = {"X-Auth-Token": token}

#     response = requests.get(glance_url, headers=headers)
#     response.raise_for_status()  # Raise an error if the request failed
#     return response.json()


# # Image ID
# image_id = "54ffe87f-89dd-48e1-b5c7-1c307cf6bedc"

# # Fetch the image details and extract os_hash_value
# image_details = get_image_details(image_id)
# os_hash_value = image_details.get("os_hash_value")

# if os_hash_value:
#     print(f"os_hash_value: {os_hash_value}")
# else:
#     print("os_hash_value not found in the image metadata")
