from openstack import connection
import os


def get_openstack_connection():
    """Establish a connection to OpenStack."""
    return connection.Connection(
        auth_url=os.getenv("AUTH_URL"),
        project_name=os.getenv("PROJECT_NAME"),
        username="admin",
        password=os.getenv("PASSWORD"),
        user_domain_name=os.getenv("USER_DOMAIN_NAME"),
        project_domain_name=os.getenv("PROJECT_DOMAIN_NAME"),
    )

# Establish OpenStack connection
conn = get_openstack_connection()
# Fetch and display image details
def get_image_details():
    image_list = []
    for image in conn.image.images():
        # Retrieve full details for each image
        image_details = conn.image.get_image(image.id)

        # Extract properties like os_hash_value and direct_url
        properties = image_details.properties if hasattr(image_details, 'properties') else {}

        image_list.append({
            'id': image.id,
            'name': image.name,
            'status': image.status,
            'visibility': image.visibility,
            'size': image.size,
            'min_disk': image.min_disk,
            'min_ram': image.min_ram,
            'created_at': image.created_at,
            'updated_at': image.updated_at,
            'disk_format': image.disk_format,
            'os_hash_algo': properties.get('os_hash_algo', 'Not available'),
            'os_hash_value': properties.get('os_hash_value', 'Not available'),
            'direct_url': properties.get('direct_url', 'Not available'),
        })

    return image_list


# Fetch and print image details
images = get_image_details()
for img in images:
    print(img)
