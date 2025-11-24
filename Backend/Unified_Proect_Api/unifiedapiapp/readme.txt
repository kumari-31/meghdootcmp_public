# Step 1: Create project directory
mkdir UNIFIED DASHBOARD API
cd UNIFIED DASHBOARD API

#Step 2: create venv 
python3 -m venv venv

#Step 3: activate the venv
source venv/bin/activate

#Step 4: install django 
pip install django

#Step 5: create a dango project
django-admin startproject Unified_Project_Api

#Step 6: create a django app
python manage.py startapp unifiedapiapp

# Step 7: Run development server
cd Unified_Proect_Api
python manage.py runserver

# Step 7: Install django Rest framework
pip install djangorestframework

#Add it to settings.py file
# Unified_Proect_Api/settings.py

INSTALLED_APPS = [
    # Other apps
    'rest_framework',
    'rest_framework.authtoken'
]

#Create serializers.py file in your app

from rest_framework import serializers
from .models import VMInfo, Registration

class VMInfoSerializer(serializers.ModelSerializer):
    class Meta:
        model = VMInfo
        fields = '__all__'  # Or specify the fields you want to include

class RegistrationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Registration
        fields = '__all__'  # Or specify the fields you want to include

#create api view in views.py
# myapp/views.py

from rest_framework import generics
from .models import VMInfo, Registration
from .serializers import VMInfoSerializer, RegistrationSerializer

# View to list and create VMInfo
class VMInfoListCreate(generics.ListCreateAPIView):
    queryset = VMInfo.objects.all()
    serializer_class = VMInfoSerializer

# View to list and create Registration
class RegistrationListCreate(generics.ListCreateAPIView):
    queryset = Registration.objects.all()
    serializer_class = RegistrationSerializer

# create the urls in myapp/urls.py

from django.urls import path
from .views import VMInfoListCreate, RegistrationListCreate

urlpatterns = [
    path('api/vminfo/', VMInfoListCreate.as_view(), name='vminfo-list-create'),
    path('api/registration/', RegistrationListCreate.as_view(), name='registration-list-create'),
]

#In Projects urls.py, include the app’s URLs
# myproject/urls.py

from django.urls import path, include

urlpatterns = [
    path('', include('myapp.urls')),  # Include app's URLs
]
