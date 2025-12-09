from .models import Project  # Replace 'your_app' with your app's name

# List of projects to add
project_names = ["BOSS Linux", "Indian Army OS", "Indian Navy OS"]

# Create project instances
project_objects = [Project(name=name) for name in project_names]

# Bulk create the projects
Project.objects.bulk_create(project_objects)

print("Projects added successfully!")
