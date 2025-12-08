from django.shortcuts import render
import jwt
import re
import random
from .table_imp import *
from rest_framework import generics
from .models import CdacProject, VMInfo, Registration,Metric,Employee,VmRequest,CdVerifierAndNonce,ImageRecord,Ticket
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken, TokenError

from rest_framework import status
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.authentication import SessionAuthentication, TokenAuthentication
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.contrib.auth.models import User
from rest_framework.authtoken.models import Token
from .serializers import CustomTokenObtainPairSerializer, ProjectSerializer, UserSerializer
from .serializers import VMInfoSerializer, RegistrationSerializer, CombinedFormSerializer, MetricSerializer,FlavorSerializer,TicketSerializer,CombinedDataSerializer,EmployeeSerializer,EmployeeUpdateSerializer,VmRequestSerializer
from django.http import JsonResponse
import json
from django.core.paginator import Paginator
from rest_framework.pagination import PageNumberPagination  
from django.views.decorators.csrf import csrf_exempt
import os
from django.views import View
import openstack
from dotenv import load_dotenv
from datetime import datetime, timedelta, timezone
from openstack import connection
from rest_framework.parsers import MultiPartParser, FormParser
from django.core.files.storage import default_storage
from django.conf import settings
from django.core.files.storage import default_storage
from django.http import FileResponse, HttpResponseNotFound
from keystoneauth1 import loading, session
from keystoneclient.v3 import client
from django.core.mail import send_mail
from django.http import HttpResponse
from .launchvm import vm_approve_request
from .ceph import *
from kubernetes import client, config
from time import sleep
import datetime
from datetime import datetime
from django.db import models
from rest_framework import status
from django.views.decorators.http import require_GET
import urllib.parse
from django.utils import timezone
from kubernetes.client.exceptions import ApiException
from openstack.exceptions import SDKException,ResourceNotFound  # Import SDKException if using it
import logging
load_dotenv()  # This will load the environment variables from a .env file


# OIDC Integration
import string
import http
import hmac
import hashlib
import base64
import json
from jwcrypto import jwk, jwe
import secrets, uuid, pkce, requests, json
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import BasePermission  # Add this import
from .models import CdVerifierAndNonce
from cryptography.x509 import load_pem_x509_certificate
from Crypto.Cipher import AES
from Crypto.Util.Padding import pad
import requests   # run command pip install requests
from cryptography.hazmat.primitives import serialization

from rest_framework.response import Response
from rest_framework import status
from django.core.mail import send_mail
from django.conf import settings
import pyotp
from datetime import datetime, timedelta
from django.core.cache import cache
from django.contrib.auth import authenticate
from openstack.exceptions import HttpException  # Import OpenStack exceptions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.contrib.auth.hashers import make_password
from .models import ServiceRequest, Employee,UserRegistrationRequest
from .serializers import ServiceRequestSerializer
from .kubenetes import deploy_nginx_pod
from rest_framework.decorators import api_view
from rest_framework import status
from datetime import datetime, timezone as dt_timezone
import base64
import binascii  # for decoding safety




# HMAC Hashing
def hashHMAChex(key, value):
    message = bytes(value, 'utf-8')
    secret = bytes(key, 'utf-8')
    hash = hmac.new(secret, message, hashlib.sha256)
    return base64.urlsafe_b64encode(hash.digest()).decode()

# Decrypt JWE Token
def decrypt_jwe_token(jweToken, nonce):
    # Generate decryption key
    base64urlencodedkey = base64.urlsafe_b64encode(hashlib.sha256(nonce.encode('utf-8')).digest()).decode()
    finalKey = jwk.JWK.from_json(f'{{"kty":"oct","k":"{base64urlencodedkey}"}}')

    # Decrypt JWE
    jwe_token = jwe.JWE()
    jwe_token.deserialize(jweToken)
    jwe_token.decrypt(finalKey)

    return json.loads(jwe_token.payload.decode())


# Constants
token_request_uri = "https://epstg.meripehchaan.gov.in/openid/jwt/processJwtTokenRequest.do"
authGrantRequestUrl = "https://epstg.meripehchaan.gov.in/openid/jwt/processJwtAuthGrantRequest.do"
client_id = "100001316"  # Your Service ID
aesKey = "d873efc3-b483-4094-9007-01d5c442b2b4"  # Your AES Key
redirectionUri = "http://10.184.39.33:8002/processAuthCodeAndGetToken"
grant_type = "authorization_code"
scope = "openid"
certificate = os.path.join(os.path.dirname(__file__), "epramaan.crt") # Your path of certficate


# OIDC Authentication Initiation
@api_view(['GET'])
def oidc_auth_code(request):
    state = ''.join(secrets.choice(string.ascii_uppercase + string.ascii_lowercase) for _ in range(16))
    nonce = uuid.uuid4().hex
    code_verifier = pkce.generate_code_verifier(length=64)
    cdVerifierAndNonce = CdVerifierAndNonce(code_verifier = code_verifier , nonce = nonce , stateId = state)  # Store the values in your DB
    cdVerifierAndNonce.save()
    code_challenge = pkce.get_code_challenge(code_verifier)

    # # Save state, nonce, and code_verifier in the DB
    # CdVerifierAndNonce.objects.create(stateId=state, code_verifier=code_verifier, nonce=nonce)

    # Construct OIDC URL
    inputValue = f"{client_id}{aesKey}{state}{nonce}{redirectionUri}{scope}{code_challenge}"
    apiHmac = hashHMAChex(aesKey, inputValue)
    authRequestUrl = (
        f"{authGrantRequestUrl}?scope={scope}&response_type=code&redirect_uri={redirectionUri}"
        f"&state={state}&code_challenge_method=S256&nonce={nonce}"
        f"&client_id={client_id}&code_challenge={code_challenge}&apiHmac={apiHmac}"
    )

    return Response({'auth_url': authRequestUrl})

@api_view(['GET'])
def processAuthCodeAndGetToken(request):
    code = request.GET.get('code')
    state = request.GET.get('state')

    if not code or not state:
        return Response({'error': 'Missing code or state'}, status=status.HTTP_400_BAD_REQUEST)

    # Fetch state details
    try:
        cdVerifierAndNonce = CdVerifierAndNonce.objects.get(stateId=state)
        code_verifier = cdVerifierAndNonce.code_verifier
        nonce = cdVerifierAndNonce.nonce
    except CdVerifierAndNonce.DoesNotExist:
        return Response({'error': 'Invalid state'}, status=status.HTTP_400_BAD_REQUEST)

    # Prepare token request
    url = "epstg.meripehchaan.gov.in"
    payload = json.dumps({
        "code": [code],
        "grant_type": [grant_type],
        "scope": [scope],
        "redirect_uri": [redirectionUri],
        "request_uri": [redirectionUri],
        "code_verifier": [code_verifier],
        "client_id": [client_id],
    })

    # Make token request
    conn = http.client.HTTPSConnection(url)
    headers = {'Content-Type': 'application/json'}
    conn.request("POST", "/openid/jwt/processJwtTokenRequest.do", payload, headers)
    response = conn.getresponse()
    data = response.read()
    jweToken = data.decode('utf-8')

    # Decrypt JWE Token
    base64urlencodedkey = base64.urlsafe_b64encode(hashlib.sha256(nonce.encode('utf-8')).digest()).decode()
    jwkobjectkey = f'{{"kty":"oct","k":"{base64urlencodedkey}"}}'
    finalKey = jwk.JWK.from_json(jwkobjectkey)
    jwe_token = jwe.JWE()
    jwe_token.deserialize(jweToken)
    jwe_token.decrypt(finalKey)
    decrypted_payload = jwe_token.payload.decode()

    # Verify JWT
    certificateData = open(certificate, "r").read().encode()
    cert = load_pem_x509_certificate(certificateData).public_key()
    key_str = cert.public_bytes(encoding=serialization.Encoding.PEM, format=serialization.PublicFormat.SubjectPublicKeyInfo).decode('utf-8')

    jsonData = jwt.decode(decrypted_payload, key_str, algorithms=['RS256'], options={"verify_exp": True, "verify_aud": False})

    # Extract user information
    user_data = {
        'name': jsonData.get('name'),
        'username': jsonData.get('username'),
        'mobile_number': jsonData.get('mobile_number'),
        'email': jsonData.get('email'),
        'service_user_id': jsonData.get('service_user_id'),
    }

    return Response({'user': user_data})

# OIDC Integration

AUTH_URL = os.getenv("AUTH_URL")
PROJECT_NAME = os.getenv("PROJECT_NAME")
USERNAME = os.getenv("OPENSTACK_UNAME")
PASSWORD = os.getenv("PASSWORD")
USER_DOMAIN_NAME = os.getenv("USER_DOMAIN_NAME")
PROJECT_DOMAIN_NAME = os.getenv("PROJECT_DOMAIN_NAME")
SERVER_URL = os.getenv("SERVER_URL")


CEPH_BASE_URL = os.getenv("CEPH_BASE_URL")
CEPH_USERNAME = os.getenv("CEPH_USERNAME")
CEPH_PASSWORD = os.getenv("CEPH_PASSWORD")
HEADERS = os.getenv("HEADERS")



class IsAdminUserPermission(BasePermission):
    """
    Custom permission to allow only admin users to perform certain actions.
    """
    def has_permission(self, request, view):
        # Assuming the role is stored in the request's auth object
        return request.auth.get('role', '').upper() == 'ADMIN'


def get_openstack_connection():
    """Establish a connection to OpenStack."""
    print("AUTH_URL:", os.getenv("AUTH_URL"))
    return connection.Connection(
        auth_url=os.getenv("AUTH_URL"),
        project_name=os.getenv("PROJECT_NAME"),
        username="admin",
        password=os.getenv("PASSWORD"),
        user_domain_name=os.getenv("USER_DOMAIN_NAME"),
        project_domain_name=os.getenv("PROJECT_DOMAIN_NAME"),
    )


# print("AUTH_URL:", os.getenv('AUTH_URL'))
# print("PROJECT_NAME:", os.getenv('PROJECT_NAME'))
# print("USERNAME:", os.getenv("OPENSTACK_UNAME"))
# print("PASSWORD:", os.getenv("PASSWORD"))
# print("USER_DOMAIN_NAME:", os.getenv('USER_DOMAIN_NAME'))
# print("PROJECT_DOMAIN_NAME:", os.getenv('PROJECT_DOMAIN_NAME'))

class CombinedFormView(APIView):
    def post(self, request):
        serializer = CombinedFormSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({"message": "Data saved successfully"}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# View to list and create VMInfo
class VMInfoListCreate(generics.ListCreateAPIView):
    queryset = VMInfo.objects.all()
    serializer_class = VMInfoSerializer

# View to list and create Registration
class RegistrationListCreate(generics.ListCreateAPIView):
    queryset = Registration.objects.all()
    serializer_class = RegistrationSerializer



@api_view(['POST'])
def signup(request):
    serializer = UserSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        user = User.objects.get(username=request.data['username'])
        user.set_password(request.data['password'])
        user.save()
        token = Token.objects.create(user=user)
        return Response({'token': token.key, 'user': serializer.data})
    return Response(serializer.errors, status=status.HTTP_200_OK)


@api_view(['POST'])
def login(request):
    
    user = get_object_or_404(User, username=request.data['username'])
    if not user.check_password(request.data['password']):
        return Response("missing user", status=status.HTTP_404_NOT_FOUND)
    token, created = Token.objects.get_or_create(user=user)
    serializer = UserSerializer(user)
    return Response({'token': token.key, 'user': serializer.data})

@api_view(['GET'])
@authentication_classes([SessionAuthentication, TokenAuthentication])
@permission_classes([IsAuthenticated])
def test_token(request):
    return Response("passed for {}".format(request.user.email))




# API to receive metrics from collectd
@api_view(['POST'])
def receive_metrics(request):
    metrics_data = request.data
    print(request.data)
    if isinstance(metrics_data, dict):
        for metric_name, value in metrics_data.items():
            Metric.objects.create(name=metric_name, value=value)
        return Response(status=status.HTTP_201_CREATED)
    return Response(status=status.HTTP_400_BAD_REQUEST)

# API to fetch metrics to display in React app
@api_view(['GET'])
def get_metrics(request):
    metrics = Metric.objects.all()
    serializer = MetricSerializer(metrics, many=True)
    return Response(serializer.data)


def parse_metrics(data):
    # Initialize metrics
    cpu_usage = None
    memory_usage = None
    storage_usage = None
    
    # Loop through each metric entry
    for metric in data:
        plugin = metric.get('plugin')
        plugin_instance = metric.get('plugin_instance')
        metric_type = metric.get('type')
        values = metric.get('values')

        # CPU Usage - usually found under the 'cpu' plugin
        if plugin == 'cpu' and metric_type == 'cpu':
            cpu_total = sum(values)
            cpu_usage = f"{cpu_total}%"  # Adjust as per the metric calculation logic
        
        # Memory Usage - usually found under the 'memory' plugin
        elif plugin == 'memory' and metric_type == 'memory':
            memory_used = values[0]  # Assuming the first value represents memory usage
            memory_usage = f"{memory_used / (1024 * 1024)} GB"  # Convert from bytes to GB
        
        # Storage Usage - usually found under the 'disk' plugin
        elif plugin == 'disk' and metric_type == 'disk_octets' and plugin_instance:
            read_bytes = values[0]
            write_bytes = values[1]
            storage_usage = f"Read: {read_bytes / (1024 * 1024)} MB, Write: {write_bytes / (1024 * 1024)} MB"

    return {
        'cpu_usage': cpu_usage,
        'memory_usage': memory_usage,
        'storage_usage': storage_usage,
    }

@api_view(['POST'])
def metrics_view(request):
    if request.method == 'POST':
        try:
            # Load the JSON data
            data = json.loads(request.body)

            # Parse the metrics
            metrics = parse_metrics(data)

            print(metrics)

            # Send the response
            return JsonResponse({
                'CPU Usage': metrics['cpu_usage'],
                'Memory Usage': metrics['memory_usage'],
                'Storage Usage': metrics['storage_usage'],
            })
        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON'}, status=400)

    return JsonResponse({'error': 'Invalid request method'}, status=405)


class UserRegistrationAPIView(APIView):

    def post(self, request, *args, **kwargs):
        # Create a registration entry
        serializer = RegistrationSerializer(data=request.data)
        
        if serializer.is_valid():
            try:
                data = serializer.validated_data

                # Convert login enable/disable datetime fields
                login_enable_time = data.get('login_enable_time')
                login_disable_time = data.get('login_disable_time')

                login_enable_datetime = datetime.strptime(login_enable_time, '%Y-%m-%dT%H:%M') if login_enable_time else None
                login_disable_datetime = datetime.strptime(login_disable_time, '%Y-%m-%dT%H:%M') if login_disable_time else None

                login_enable_date = login_enable_datetime.date() if login_enable_datetime else None
                login_disable_date = login_disable_datetime.date() if login_disable_datetime else None

                # Extract time part and store in separate variables
                login_enable_time_value = login_enable_datetime.time().strftime('%H:%M') if login_enable_datetime else None
                login_disable_time_value = login_disable_datetime.time().strftime('%H:%M') if login_disable_datetime else None

                # Save registration to the database
                registration = Registration.objects.create(
                    full_name=data['full_name'],
                    organization=data['organization'],
                    designation=data['designation'],
                    email=data['email'],
                    phone_number=data['phone_number'],
                    password=data['password'],
                    confirm_password=data['confirm_password'],
                    vdi_required=data['vdi_required'],
                    image=data.get('image'),
                    flavor=data.get('flavor'),
                    login_enable_date=login_enable_date,
                    login_disable_date=login_disable_date,
                    login_enable_time=login_enable_time_value,
                    login_disable_time=login_disable_time_value,
                    storage_required=data['storage_required'],
                    additional_storage=data.get('additional_storage')
                )

                # Simulating user creation (use your function for real cases)
                # For example, create_user_with_details(full_name, email, password)
                print(f"User {data['full_name']} created")

                # Save VM information to the VMInfo model
                VMInfo.objects.create(
                    vm_name=data['full_name'],
                    vm_access_from_date=login_enable_date,
                    vm_access_to_date=login_disable_date,
                    vm_access_from_time=login_enable_time_value,
                    vm_access_to_time=login_disable_time_value,
                    email=data['email'],
                    creation_status='Requested'
                )
                
                return Response({"message": "VM Requested successfully"}, status=status.HTTP_201_CREATED)

            except Exception as e:
                return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)






# -------------------------------------------------------------------#

class RegistrationListCreateAPIView(APIView):
    permission_classes = [IsAuthenticated]
    # Handle POST request to create a new registration
    def post(self, request):
        email = request.data.get('email')
        phone_number = request.data.get('phone_number')
        full_name = request.data.get('full_name')  # Get full_name from the request data
        login_enable_date_value = request.data.get('login_enable_date')  # Assuming this field exists
        login_disable_date_value = request.data.get('login_disable_date')  # Assuming this field exists
        login_enable_time = request.data.get('login_enable_time')  # Assuming this field exists
        login_disable_time = request.data.get('login_disable_time')  # Assuming this field exists

        # Check if a registration with the same email or phone number already exists
        if Registration.objects.filter(email=email).exists():
            return Response({"error": "A registration with this email already exists."}, status=status.HTTP_400_BAD_REQUEST)
        
        if Registration.objects.filter(phone_number=phone_number).exists():
            return Response({"error": "A registration with this phone number already exists."}, status=status.HTTP_400_BAD_REQUEST)
        
        # Proceed with the normal registration process if no duplicate found
        serializer = RegistrationSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()

            # Create a corresponding VMInfo entry
            VMInfo.objects.create(
                vm_name=full_name,
                vm_access_from_date=login_enable_date_value,
                vm_access_to_date=login_disable_date_value,
                vm_access_from_time=login_enable_time,
                vm_access_to_time=login_disable_time,
                email=email,
                creation_status='Requested'
            )

            return Response({"message": "Registration created successfully", "data": serializer.data}, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # Handle GET request to list all registrations with pagination
    def get(self, request):
        paginator = PageNumberPagination()
        paginator.page_size = request.GET.get('page_size', 10)

        registrations = Registration.objects.all()
        paginated_registrations = paginator.paginate_queryset(registrations, request)

        serializer = RegistrationSerializer(paginated_registrations, many=True)
        return paginator.get_paginated_response(serializer.data)


class ListFlavors(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # try:
            # Initialize OpenStack connection
            conn = openstack.connect(
                auth_url=os.getenv('AUTH_URL'),
                project_name=os.getenv('PROJECT_NAME'),
                username=os.getenv("OPENSTACK_UNAME"),
                password=os.getenv('PASSWORD'),
                user_domain_name=os.getenv('USER_DOMAIN_NAME'),
                project_domain_name=os.getenv('PROJECT_DOMAIN_NAME')
            )
            print(conn)
            # Fetch the list of flavors
            flavors = conn.compute.flavors()
            print("flavors",flavors)
            flavor_list = []

            # Get the 'name' query parameter if provided
            flavor_name = request.query_params.get('name', None)
            print("flavor_name",flavor_name)

            for flavor in flavors:
                # If flavor_name is provided, filter by name
                if flavor_name and flavor_name.lower() not in flavor.name.lower():
                    continue  # Skip this flavor if it doesn't match

                flavor_list.append({
                    'id': flavor.id,
                    'name': flavor.name,
                    'ram': f"{flavor.ram // 1024} GB ({flavor.ram} MB) RAM",
                    'vcpus': flavor.vcpus,
                    'disk': flavor.disk,
                    'swap': flavor.swap,
                    'ephemeral': flavor.ephemeral,
                    'public': flavor.is_public,
                    'metadata': getattr(flavor, 'metadata', {}),
                    # 'metadata': flavor.metadata if flavor.metadata else "No Metadata"
                })

            # Serialize the flavor data
            serializer = FlavorSerializer(flavor_list, many=True)

            return Response(serializer.data, status=status.HTTP_200_OK)

        # except Exception as e:
        #     return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# -------------------------------4 june 2025---------------------------

class FlavorListAPIView(APIView):
    def get(self, request):
        try:
            conn = get_openstack_connection()
            flavors = conn.compute.flavors()

            flavor_data = []
            for flavor in flavors:
                flavor_data.append({
                    "flavor_name": flavor.name,
                    "vcpus": flavor.vcpus,
                    "ram": flavor.ram,
                    "root_disk": flavor.disk
                })

            return Response(flavor_data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# --------------------------11 feb 2025----------------------

class UpdateFlavorMetadataAPIView(APIView):
    """
    API to update metadata (extra specs) for a specific flavor in OpenStack.
    """
    permission_classes = [IsAuthenticated]

    def put(self, request, flavor_id):
        conn = get_openstack_connection()

        # Extract metadata from request body
        metadata = request.data.get("metadata", {})
        if not metadata:
            return Response({"error": "Metadata is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Find the flavor
            flavor = conn.compute.find_flavor(flavor_id)
            if not flavor:
                return Response({"error": "Flavor not found"}, status=status.HTTP_404_NOT_FOUND)

            # Update only the extra specs (metadata)
            conn.compute.create_flavor_extra_specs(flavor.id, metadata)

            return Response(
                {
                    "message": f"Metadata updated successfully for flavor {flavor_id}",
                    "updated_metadata": metadata
                },
                status=status.HTTP_200_OK
            )

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ListImages(APIView):
    permission_classes = [IsAuthenticated]
    # permission_classes = []

    def get(self, request):
        token_payload = request.auth  # This contains the decoded token payload

        role = token_payload.get('role', 'Unknown')
        print("===Role===",role)
        try:
            # Initialize OpenStack connection
            conn = openstack.connect(
                auth_url=os.getenv('AUTH_URL'),
                project_name=os.getenv('PROJECT_NAME'),
                # username=os.getenv("OPENSTACK_UNAME"),
                username="admin",
                password=os.getenv('PASSWORD'),
                user_domain_name=os.getenv('USER_DOMAIN_NAME'),
                project_domain_name=os.getenv('PROJECT_DOMAIN_NAME')
            )
            print(AUTH_URL)
            # Fetch the list of images (adjust project_id as necessary)
            # project_id = '4e58cc2addbc4f228f3993ed381cf21c'
            images = conn.image.images()
            print("===Images===",images)
            # Get the 'name' query parameter if provided
            name_query = request.query_params.get('name', None)
            image_list = []

            for image in images:
                # Filter by name if a query parameter is provided
                if name_query is None or name_query.lower() in image.name.lower():
                    # Handle the case where image.size might be None
                    if image.size is not None:
                        image_size_gb = round(image.size / (1024 ** 3), 2)
                        image_size_mb = round(image.size / (1024 ** 2), 2)
                        size_formatted = f"{image_size_gb} GB ({image_size_mb} MB)"
                    else:
                        size_formatted = "N/A"  # Or handle as you prefer

                    image_list.append({
                        'id': image.id,
                        'name': image.name,
                        'status': image.status,
                        'visibility': image.visibility,
                        'size': size_formatted,  # Size in GB and MB or "N/A"
                        'min_disk': image.min_disk,
                        'min_ram': image.min_ram,
                        'created_at': image.created_at,
                        'updated_at': image.updated_at,
                        'os_hash_value': getattr(image, 'os_hash_value', 'N/A'),  # Add os_hash_value, fallback to 'N/A' if not available
                        'disk_format': getattr(image, 'disk_format', 'N/A')  # Add disk format, fallback to 'N/A' if not available

                    })

            return Response(image_list, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)



class CombinedView(APIView):
    def get(self, request):
        try:
            # Fetch all registrations
            registrations = Registration.objects.all()

            combined_data = []
            for registration in registrations:
                # Get related VMInfo entries by email
                vm_infos = VMInfo.objects.filter(email=registration.email, creation_status='Requested')

                for vm_info in vm_infos:
                    combined_data.append({
                        'id': f"{vm_info.id}_{registration.id}",
                        'name': registration.full_name,
                        'email': registration.email,
                        'designation': registration.designation,
                        'image': registration.image,
                        'flavor': registration.flavor,
                        'vdi_required': registration.vdi_required,
                        'creation_status': vm_info.creation_status
                    })

            # Serialize the combined data
            serializer = CombinedDataSerializer(combined_data, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# from rest_framework.response import Response
# from rest_framework.views import APIView
# from openstack import connection

class CreateHostView(APIView):
    def post(self, request):
        # Get the OpenStack connection parameters from the request
        auth_url = request.data.get('auth_url')
        username = request.data.get('username')
        password = request.data.get('password')
        project_name = request.data.get('project_name')
        domain_name = request.data.get('domain_name')

        # Create an OpenStack connection
        conn = connection.Connection(
            auth_url=auth_url,
            username=username,
            password=password,
            project_name=project_name,
            domain_name=domain_name
        )

        # Get the host data from the request
        host_name = request.data.get('host_name')
        host_service = request.data.get('host_service')
        host_zone = request.data.get('host_zone')

        # Create a new host in OpenStack
        host = conn.compute.create_host(
            name=host_name,
            service=host_service,
            zone=host_zone
        )

        # Return the created host data
        return Response({'host': host})
    
    
from django.shortcuts import render
import jwt
from .table_imp import *
from rest_framework import generics
from .models import CdacProject, VMInfo, Registration,Metric,Employee,VmRequest,CdVerifierAndNonce,ImageRecord
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.authentication import SessionAuthentication, TokenAuthentication
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.contrib.auth.models import User
from rest_framework.authtoken.models import Token
from .serializers import CustomTokenObtainPairSerializer, ProjectSerializer, UserSerializer
from .serializers import VMInfoSerializer, RegistrationSerializer, CombinedFormSerializer, MetricSerializer,FlavorSerializer,CombinedDataSerializer,EmployeeSerializer,EmployeeUpdateSerializer,VmRequestSerializer
from django.http import JsonResponse
import json
from django.core.paginator import Paginator
from rest_framework.pagination import PageNumberPagination  
from django.views.decorators.csrf import csrf_exempt
import os
from django.views import View
import openstack
from dotenv import load_dotenv
from datetime import datetime, timedelta, timezone
from openstack import connection
from rest_framework.parsers import MultiPartParser, FormParser
from django.core.files.storage import default_storage
from django.conf import settings
from django.core.files.storage import default_storage
from django.http import FileResponse, HttpResponseNotFound
from keystoneauth1 import loading, session
from keystoneclient.v3 import client
from django.core.mail import send_mail
from django.http import HttpResponse
from .launchvm import vm_approve_request
from .ceph import *
from kubernetes import client, config
from time import sleep
import datetime
from datetime import datetime




from django.utils import timezone
from kubernetes.client.exceptions import ApiException
from openstack.exceptions import SDKException,ResourceNotFound  # Import SDKException if using it
import logging
load_dotenv()  # This will load the environment variables from a .env file


# OIDC Integration
import string
import http
import hmac
import hashlib
import base64
import json
from jwcrypto import jwk, jwe
import secrets, uuid, pkce, requests, json
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import BasePermission  # Add this import
from .models import CdVerifierAndNonce
from cryptography.x509 import load_pem_x509_certificate
from Crypto.Cipher import AES
from Crypto.Util.Padding import pad
import requests   # run command pip install requests
from cryptography.hazmat.primitives import serialization

from rest_framework.response import Response
from rest_framework import status
from django.core.mail import send_mail
from django.conf import settings
import pyotp
from datetime import datetime, timedelta
from django.core.cache import cache
from django.contrib.auth import authenticate
from openstack.exceptions import HttpException  # Import OpenStack exceptions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.contrib.auth.hashers import make_password
from .models import ServiceRequest, Employee,UserRegistrationRequest
from .serializers import ServiceRequestSerializer
from .kubenetes import deploy_nginx_pod


# HMAC Hashing
def hashHMAChex(key, value):
    message = bytes(value, 'utf-8')
    secret = bytes(key, 'utf-8')
    hash = hmac.new(secret, message, hashlib.sha256)
    return base64.urlsafe_b64encode(hash.digest()).decode()

# Decrypt JWE Token
def decrypt_jwe_token(jweToken, nonce):
    # Generate decryption key
    base64urlencodedkey = base64.urlsafe_b64encode(hashlib.sha256(nonce.encode('utf-8')).digest()).decode()
    finalKey = jwk.JWK.from_json(f'{{"kty":"oct","k":"{base64urlencodedkey}"}}')

    # Decrypt JWE
    jwe_token = jwe.JWE()
    jwe_token.deserialize(jweToken)
    jwe_token.decrypt(finalKey)

    return json.loads(jwe_token.payload.decode())


# Constants
token_request_uri = "https://epstg.meripehchaan.gov.in/openid/jwt/processJwtTokenRequest.do"
authGrantRequestUrl = "https://epstg.meripehchaan.gov.in/openid/jwt/processJwtAuthGrantRequest.do"
client_id = "100001316"  # Your Service ID
aesKey = "d873efc3-b483-4094-9007-01d5c442b2b4"  # Your AES Key
redirectionUri = "http://10.184.39.33:8002/processAuthCodeAndGetToken"
grant_type = "authorization_code"
scope = "openid"
certificate = os.path.join(os.path.dirname(__file__), "epramaan.crt") # Your path of certficate


# OIDC Authentication Initiation
@api_view(['GET'])
def oidc_auth_code(request):
    state = ''.join(secrets.choice(string.ascii_uppercase + string.ascii_lowercase) for _ in range(16))
    nonce = uuid.uuid4().hex
    code_verifier = pkce.generate_code_verifier(length=64)
    cdVerifierAndNonce = CdVerifierAndNonce(code_verifier = code_verifier , nonce = nonce , stateId = state)  # Store the values in your DB
    cdVerifierAndNonce.save()
    code_challenge = pkce.get_code_challenge(code_verifier)

    # # Save state, nonce, and code_verifier in the DB
    # CdVerifierAndNonce.objects.create(stateId=state, code_verifier=code_verifier, nonce=nonce)

    # Construct OIDC URL
    inputValue = f"{client_id}{aesKey}{state}{nonce}{redirectionUri}{scope}{code_challenge}"
    apiHmac = hashHMAChex(aesKey, inputValue)
    authRequestUrl = (
        f"{authGrantRequestUrl}?scope={scope}&response_type=code&redirect_uri={redirectionUri}"
        f"&state={state}&code_challenge_method=S256&nonce={nonce}"
        f"&client_id={client_id}&code_challenge={code_challenge}&apiHmac={apiHmac}"
    )

    return Response({'auth_url': authRequestUrl})

@api_view(['GET'])
def processAuthCodeAndGetToken(request):
    code = request.GET.get('code')
    state = request.GET.get('state')

    if not code or not state:
        return Response({'error': 'Missing code or state'}, status=status.HTTP_400_BAD_REQUEST)

    # Fetch state details
    try:
        cdVerifierAndNonce = CdVerifierAndNonce.objects.get(stateId=state)
        code_verifier = cdVerifierAndNonce.code_verifier
        nonce = cdVerifierAndNonce.nonce
    except CdVerifierAndNonce.DoesNotExist:
        return Response({'error': 'Invalid state'}, status=status.HTTP_400_BAD_REQUEST)

    # Prepare token request
    url = "epstg.meripehchaan.gov.in"
    payload = json.dumps({
        "code": [code],
        "grant_type": [grant_type],
        "scope": [scope],
        "redirect_uri": [redirectionUri],
        "request_uri": [redirectionUri],
        "code_verifier": [code_verifier],
        "client_id": [client_id],
    })

    # Make token request
    conn = http.client.HTTPSConnection(url)
    headers = {'Content-Type': 'application/json'}
    conn.request("POST", "/openid/jwt/processJwtTokenRequest.do", payload, headers)
    response = conn.getresponse()
    data = response.read()
    jweToken = data.decode('utf-8')

    # Decrypt JWE Token
    base64urlencodedkey = base64.urlsafe_b64encode(hashlib.sha256(nonce.encode('utf-8')).digest()).decode()
    jwkobjectkey = f'{{"kty":"oct","k":"{base64urlencodedkey}"}}'
    finalKey = jwk.JWK.from_json(jwkobjectkey)
    jwe_token = jwe.JWE()
    jwe_token.deserialize(jweToken)
    jwe_token.decrypt(finalKey)
    decrypted_payload = jwe_token.payload.decode()

    # Verify JWT
    certificateData = open(certificate, "r").read().encode()
    cert = load_pem_x509_certificate(certificateData).public_key()
    key_str = cert.public_bytes(encoding=serialization.Encoding.PEM, format=serialization.PublicFormat.SubjectPublicKeyInfo).decode('utf-8')

    jsonData = jwt.decode(decrypted_payload, key_str, algorithms=['RS256'], options={"verify_exp": True, "verify_aud": False})

    # Extract user information
    user_data = {
        'name': jsonData.get('name'),
        'username': jsonData.get('username'),
        'mobile_number': jsonData.get('mobile_number'),
        'email': jsonData.get('email'),
        'service_user_id': jsonData.get('service_user_id'),
    }

    return Response({'user': user_data})

# OIDC Integration

AUTH_URL = os.getenv("AUTH_URL")
PROJECT_NAME = os.getenv("PROJECT_NAME")
USERNAME = os.getenv("OPENSTACK_UNAME")
PASSWORD = os.getenv("PASSWORD")
USER_DOMAIN_NAME = os.getenv("USER_DOMAIN_NAME")
PROJECT_DOMAIN_NAME = os.getenv("PROJECT_DOMAIN_NAME")
SERVER_URL = os.getenv("SERVER_URL")


CEPH_BASE_URL = os.getenv("CEPH_BASE_URL")
CEPH_USERNAME = os.getenv("CEPH_USERNAME")
CEPH_PASSWORD = os.getenv("CEPH_PASSWORD")
HEADERS = os.getenv("HEADERS")



class IsAdminUserPermission(BasePermission):
    """
    Custom permission to allow only admin users to perform certain actions.
    """
    def has_permission(self, request, view):
        role = None

        # Case 1: If already attached to user
        role = getattr(request.user, "role", None)

        # Case 2: If token is raw string, decode it
        if not role and isinstance(request.auth, str):
            try:
                decoded_token = AccessToken(request.auth)
                role = decoded_token.get("role", None)
            except Exception as e:
                print("⚠️ Failed to decode token:", str(e))

        # Case 3: If token is dict-like
        if not role and hasattr(request.auth, "get"):
            role = request.auth.get("role", None)

        
        return str(role).upper() == "ADMIN"


def get_openstack_connection():
    """Establish a connection to OpenStack."""
    print("AUTH_URL:", os.getenv("AUTH_URL"))
    return connection.Connection(
        auth_url=os.getenv("AUTH_URL"),
        project_name=os.getenv("PROJECT_NAME"),
        username="admin",
        password=os.getenv("PASSWORD"),
        user_domain_name=os.getenv("USER_DOMAIN_NAME"),
        project_domain_name=os.getenv("PROJECT_DOMAIN_NAME"),
    )


# print("AUTH_URL:", os.getenv('AUTH_URL'))
# print("PROJECT_NAME:", os.getenv('PROJECT_NAME'))
# print("USERNAME:", os.getenv("OPENSTACK_UNAME"))
# print("PASSWORD:", os.getenv("PASSWORD"))
# print("USER_DOMAIN_NAME:", os.getenv('USER_DOMAIN_NAME'))
# print("PROJECT_DOMAIN_NAME:", os.getenv('PROJECT_DOMAIN_NAME'))

class CombinedFormView(APIView):
    def post(self, request):
        serializer = CombinedFormSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({"message": "Data saved successfully"}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# View to list and create VMInfo
class VMInfoListCreate(generics.ListCreateAPIView):
    queryset = VMInfo.objects.all()
    serializer_class = VMInfoSerializer

# View to list and create Registration
class RegistrationListCreate(generics.ListCreateAPIView):
    queryset = Registration.objects.all()
    serializer_class = RegistrationSerializer



@api_view(['POST'])
def signup(request):
    serializer = UserSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        user = User.objects.get(username=request.data['username'])
        user.set_password(request.data['password'])
        user.save()
        token = Token.objects.create(user=user)
        return Response({'token': token.key, 'user': serializer.data})
    return Response(serializer.errors, status=status.HTTP_200_OK)


@api_view(['POST'])
def login(request):
    
    user = get_object_or_404(User, username=request.data['username'])
    if not user.check_password(request.data['password']):
        return Response("missing user", status=status.HTTP_404_NOT_FOUND)
    token, created = Token.objects.get_or_create(user=user)
    serializer = UserSerializer(user)
    return Response({'token': token.key, 'user': serializer.data})

@api_view(['GET'])
@authentication_classes([SessionAuthentication, TokenAuthentication])
@permission_classes([IsAuthenticated])
def test_token(request):
    return Response("passed for {}".format(request.user.email))




# API to receive metrics from collectd
@api_view(['POST'])
def receive_metrics(request):
    metrics_data = request.data
    print(request.data)
    if isinstance(metrics_data, dict):
        for metric_name, value in metrics_data.items():
            Metric.objects.create(name=metric_name, value=value)
        return Response(status=status.HTTP_201_CREATED)
    return Response(status=status.HTTP_400_BAD_REQUEST)

# API to fetch metrics to display in React app
@api_view(['GET'])
def get_metrics(request):
    metrics = Metric.objects.all()
    serializer = MetricSerializer(metrics, many=True)
    return Response(serializer.data)


def parse_metrics(data):
    # Initialize metrics
    cpu_usage = None
    memory_usage = None
    storage_usage = None
    
    # Loop through each metric entry
    for metric in data:
        plugin = metric.get('plugin')
        plugin_instance = metric.get('plugin_instance')
        metric_type = metric.get('type')
        values = metric.get('values')

        # CPU Usage - usually found under the 'cpu' plugin
        if plugin == 'cpu' and metric_type == 'cpu':
            cpu_total = sum(values)
            cpu_usage = f"{cpu_total}%"  # Adjust as per the metric calculation logic
        
        # Memory Usage - usually found under the 'memory' plugin
        elif plugin == 'memory' and metric_type == 'memory':
            memory_used = values[0]  # Assuming the first value represents memory usage
            memory_usage = f"{memory_used / (1024 * 1024)} GB"  # Convert from bytes to GB
        
        # Storage Usage - usually found under the 'disk' plugin
        elif plugin == 'disk' and metric_type == 'disk_octets' and plugin_instance:
            read_bytes = values[0]
            write_bytes = values[1]
            storage_usage = f"Read: {read_bytes / (1024 * 1024)} MB, Write: {write_bytes / (1024 * 1024)} MB"

    return {
        'cpu_usage': cpu_usage,
        'memory_usage': memory_usage,
        'storage_usage': storage_usage,
    }

@api_view(['POST'])
def metrics_view(request):
    if request.method == 'POST':
        try:
            # Load the JSON data
            data = json.loads(request.body)

            # Parse the metrics
            metrics = parse_metrics(data)

            print(metrics)

            # Send the response
            return JsonResponse({
                'CPU Usage': metrics['cpu_usage'],
                'Memory Usage': metrics['memory_usage'],
                'Storage Usage': metrics['storage_usage'],
            })
        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON'}, status=400)

    return JsonResponse({'error': 'Invalid request method'}, status=405)


class UserRegistrationAPIView(APIView):

    def post(self, request, *args, **kwargs):
        # Create a registration entry
        serializer = RegistrationSerializer(data=request.data)
        
        if serializer.is_valid():
            try:
                data = serializer.validated_data

                # Convert login enable/disable datetime fields
                login_enable_time = data.get('login_enable_time')
                login_disable_time = data.get('login_disable_time')

                login_enable_datetime = datetime.strptime(login_enable_time, '%Y-%m-%dT%H:%M') if login_enable_time else None
                login_disable_datetime = datetime.strptime(login_disable_time, '%Y-%m-%dT%H:%M') if login_disable_time else None

                login_enable_date = login_enable_datetime.date() if login_enable_datetime else None
                login_disable_date = login_disable_datetime.date() if login_disable_datetime else None

                # Extract time part and store in separate variables
                login_enable_time_value = login_enable_datetime.time().strftime('%H:%M') if login_enable_datetime else None
                login_disable_time_value = login_disable_datetime.time().strftime('%H:%M') if login_disable_datetime else None

                # Save registration to the database
                registration = Registration.objects.create(
                    full_name=data['full_name'],
                    organization=data['organization'],
                    designation=data['designation'],
                    email=data['email'],
                    phone_number=data['phone_number'],
                    password=data['password'],
                    confirm_password=data['confirm_password'],
                    vdi_required=data['vdi_required'],
                    image=data.get('image'),
                    flavor=data.get('flavor'),
                    login_enable_date=login_enable_date,
                    login_disable_date=login_disable_date,
                    login_enable_time=login_enable_time_value,
                    login_disable_time=login_disable_time_value,
                    storage_required=data['storage_required'],
                    additional_storage=data.get('additional_storage')
                )

                # Simulating user creation (use your function for real cases)
                # For example, create_user_with_details(full_name, email, password)
                print(f"User {data['full_name']} created")

                # Save VM information to the VMInfo model
                VMInfo.objects.create(
                    vm_name=data['full_name'],
                    vm_access_from_date=login_enable_date,
                    vm_access_to_date=login_disable_date,
                    vm_access_from_time=login_enable_time_value,
                    vm_access_to_time=login_disable_time_value,
                    email=data['email'],
                    creation_status='Requested'
                )
                
                return Response({"message": "VM Requested successfully"}, status=status.HTTP_201_CREATED)

            except Exception as e:
                return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)






# -------------------------------------------------------------------#

class RegistrationListCreateAPIView(APIView):
    permission_classes = [IsAuthenticated]
    # Handle POST request to create a new registration
    def post(self, request):
        email = request.data.get('email')
        phone_number = request.data.get('phone_number')
        full_name = request.data.get('full_name')  # Get full_name from the request data
        login_enable_date_value = request.data.get('login_enable_date')  # Assuming this field exists
        login_disable_date_value = request.data.get('login_disable_date')  # Assuming this field exists
        login_enable_time = request.data.get('login_enable_time')  # Assuming this field exists
        login_disable_time = request.data.get('login_disable_time')  # Assuming this field exists

        # Check if a registration with the same email or phone number already exists
        if Registration.objects.filter(email=email).exists():
            return Response({"error": "A registration with this email already exists."}, status=status.HTTP_400_BAD_REQUEST)
        
        if Registration.objects.filter(phone_number=phone_number).exists():
            return Response({"error": "A registration with this phone number already exists."}, status=status.HTTP_400_BAD_REQUEST)
        
        # Proceed with the normal registration process if no duplicate found
        serializer = RegistrationSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()

            # Create a corresponding VMInfo entry
            VMInfo.objects.create(
                vm_name=full_name,
                vm_access_from_date=login_enable_date_value,
                vm_access_to_date=login_disable_date_value,
                vm_access_from_time=login_enable_time,
                vm_access_to_time=login_disable_time,
                email=email,
                creation_status='Requested'
            )

            return Response({"message": "Registration created successfully", "data": serializer.data}, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # Handle GET request to list all registrations with pagination
    def get(self, request):
        paginator = PageNumberPagination()
        paginator.page_size = request.GET.get('page_size', 10)

        registrations = Registration.objects.all()
        paginated_registrations = paginator.paginate_queryset(registrations, request)

        serializer = RegistrationSerializer(paginated_registrations, many=True)
        return paginator.get_paginated_response(serializer.data)


class ListFlavors(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # try:
            # Initialize OpenStack connection
            conn = openstack.connect(
                auth_url=os.getenv('AUTH_URL'),
                project_name=os.getenv('PROJECT_NAME'),
                username=os.getenv("OPENSTACK_UNAME"),
                password=os.getenv('PASSWORD'),
                user_domain_name=os.getenv('USER_DOMAIN_NAME'),
                project_domain_name=os.getenv('PROJECT_DOMAIN_NAME')
            )
            print(conn)
            # Fetch the list of flavors
            flavors = conn.compute.flavors()
            print("flavors",flavors)
            flavor_list = []

            # Get the 'name' query parameter if provided
            flavor_name = request.query_params.get('name', None)
            print("flavor_name",flavor_name)

            for flavor in flavors:
                # If flavor_name is provided, filter by name
                if flavor_name and flavor_name.lower() not in flavor.name.lower():
                    continue  # Skip this flavor if it doesn't match

                flavor_list.append({
                    'id': flavor.id,
                    'name': flavor.name,
                    'ram': f"{flavor.ram // 1024} GB ({flavor.ram} MB) RAM",
                    'vcpus': flavor.vcpus,
                    'disk': flavor.disk,
                    'swap': flavor.swap,
                    'ephemeral': flavor.ephemeral,
                    'public': flavor.is_public,
                    'metadata': getattr(flavor, 'metadata', {}),
                    # 'metadata': flavor.metadata if flavor.metadata else "No Metadata"
                })

            # Serialize the flavor data
            serializer = FlavorSerializer(flavor_list, many=True)

            return Response(serializer.data, status=status.HTTP_200_OK)

        # except Exception as e:
        #     return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# -------------------------------4 june 2025---------------------------

class FlavorListAPIView(APIView):
    def get(self, request):
        try:
            conn = get_openstack_connection()
            flavors = conn.compute.flavors()

            flavor_data = []
            for flavor in flavors:
                flavor_data.append({
                    "flavor_name": flavor.name,
                    "vcpus": flavor.vcpus,
                    "ram": flavor.ram,
                    "root_disk": flavor.disk
                })

            return Response(flavor_data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# --------------------------11 feb 2025----------------------

class UpdateFlavorMetadataAPIView(APIView):
    """
    API to update metadata (extra specs) for a specific flavor in OpenStack.
    """
    permission_classes = [IsAuthenticated]

    def put(self, request, flavor_id):
        conn = get_openstack_connection()

        # Extract metadata from request body
        metadata = request.data.get("metadata", {})
        if not metadata:
            return Response({"error": "Metadata is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Find the flavor
            flavor = conn.compute.find_flavor(flavor_id)
            if not flavor:
                return Response({"error": "Flavor not found"}, status=status.HTTP_404_NOT_FOUND)

            # Update only the extra specs (metadata)
            conn.compute.create_flavor_extra_specs(flavor.id, metadata)

            return Response(
                {
                    "message": f"Metadata updated successfully for flavor {flavor_id}",
                    "updated_metadata": metadata
                },
                status=status.HTTP_200_OK
            )

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ListImages(APIView):
    permission_classes = [IsAuthenticated]
    # permission_classes = []

    def get(self, request):
        token_payload = request.auth  # This contains the decoded token payload

        role = token_payload.get('role', 'Unknown')
        print("===Role===",role)
        try:
            # Initialize OpenStack connection
            conn = openstack.connect(
                auth_url=os.getenv('AUTH_URL'),
                project_name=os.getenv('PROJECT_NAME'),
                # username=os.getenv("OPENSTACK_UNAME"),
                username="admin",
                password=os.getenv('PASSWORD'),
                user_domain_name=os.getenv('USER_DOMAIN_NAME'),
                project_domain_name=os.getenv('PROJECT_DOMAIN_NAME')
            )
            print(AUTH_URL)
            # Fetch the list of images (adjust project_id as necessary)
            # project_id = '4e58cc2addbc4f228f3993ed381cf21c'
            images = conn.image.images()
            print("===Images===",images)
            # Get the 'name' query parameter if provided
            name_query = request.query_params.get('name', None)
            image_list = []

            for image in images:
                print("image--->",image)
                # Filter by name if a query parameter is provided
                if name_query is None or name_query.lower() in image.name.lower():
                    # Handle the case where image.size might be None
                    if image.size is not None:
                        image_size_gb = round(image.size / (1024 ** 3), 2)
                        image_size_mb = round(image.size / (1024 ** 2), 2)
                        size_formatted = f"{image_size_gb} GB ({image_size_mb} MB)"
                    else:
                        size_formatted = "N/A"  # Or handle as you prefer

                    image_list.append({
                        'id': image.id,
                        'name': image.name,
                        'type': image.properties.get('image_type', 'Image'),  # 👈 Type here
                        'status': image.status,
                        'visibility': image.visibility,
                        'size': size_formatted,  # Size in GB and MB or "N/A"
                        'min_disk': image.min_disk,
                        'min_ram': image.min_ram,
                        'created_at': image.created_at,
                        'updated_at': image.updated_at,
                        'os_hash_value': getattr(image, 'os_hash_value', 'N/A'),  # Add os_hash_value, fallback to 'N/A' if not available
                        'disk_format': getattr(image, 'disk_format', 'N/A')  # Add disk format, fallback to 'N/A' if not available

                    })

            return Response(image_list, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)



class CombinedView(APIView):
    def get(self, request):
        try:
            # Fetch all registrations
            registrations = Registration.objects.all()

            combined_data = []
            for registration in registrations:
                # Get related VMInfo entries by email
                vm_infos = VMInfo.objects.filter(email=registration.email, creation_status='Requested')

                for vm_info in vm_infos:
                    combined_data.append({
                        'id': f"{vm_info.id}_{registration.id}",
                        'name': registration.full_name,
                        'email': registration.email,
                        'designation': registration.designation,
                        'image': registration.image,
                        'flavor': registration.flavor,
                        'vdi_required': registration.vdi_required,
                        'creation_status': vm_info.creation_status
                    })

            # Serialize the combined data
            serializer = CombinedDataSerializer(combined_data, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# from rest_framework.response import Response
# from rest_framework.views import APIView
# from openstack import connection

class CreateHostView(APIView):
    def post(self, request):
        # Get the OpenStack connection parameters from the request
        auth_url = request.data.get('auth_url')
        username = request.data.get('username')
        password = request.data.get('password')
        project_name = request.data.get('project_name')
        domain_name = request.data.get('domain_name')

        # Create an OpenStack connection
        conn = connection.Connection(
            auth_url=auth_url,
            username=username,
            password=password,
            project_name=project_name,
            domain_name=domain_name
        )

        # Get the host data from the request
        host_name = request.data.get('host_name')
        host_service = request.data.get('host_service')
        host_zone = request.data.get('host_zone')

        # Create a new host in OpenStack
        host = conn.compute.create_host(
            name=host_name,
            service=host_service,
            zone=host_zone
        )

        # Return the created host data
        return Response({'host': host})
    
    
class CreateUserView(APIView):
    def post(self, request):
        try:
            # Get the OpenStack connection parameters from the request
            auth_url = request.data.get('auth_url')
            username = request.data.get('username')
            password = request.data.get('password')
            project_name = request.data.get('project_name')
            domain_name = request.data.get('domain_name')
            user_name = request.data.get('user_name')
            user_password = request.data.get('user_password')
            user_email = request.data.get('user_email')
            num_vms = int(request.data.get('num_vms'))

            # Create an OpenStack connection
            conn = connection.Connection(
                auth_url=auth_url,
                username=username,
                password=password,
                project_name=project_name,
                domain_name=domain_name
            )

            # Create a new user in OpenStack
            user = conn.identity.create_user(
                name=user_name,
                password=user_password,
                email=user_email,
                domain_id=conn.identity.get_domain(domain_name).id
            )

            # Create a new project in OpenStack
            project = conn.identity.create_project(
                name=project_name,
                domain_id=conn.identity.get_domain(domain_name).id
            )

            # Add the user to the project as a member
            conn.identity.add_user_to_project(project.id, user.id)

            # Create vms inside the project
            image = conn.image.find_image("ubuntu-latest")
            flavor = conn.compute.find_flavor("medium")
            network = conn.network.find_network("ext-net")

            for i in range(num_vms):
                vm_name = f"{project_name}-{user_name}-{i}"
                server = conn.compute.create_server(
                    name=vm_name,
                    image_id=image.id,
                    flavor_id=flavor.id,
                    networks=[{"uuid": network.id}]
                )

            # Return the created user, project and vms data
            return Response({'user': user, 'project': project, 'vms': [s.id for s in conn.compute.servers()]})

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
def list_hypervisors(request):
    conn = connection.Connection(
        auth_url=request.user.openstack_auth_url,
        username=request.user.openstack_username,
        password=request.user.openstack_password,
        project_name=request.user.openstack_project_name,
        domain_name=request.user.openstack_domain_name
    )

    hypervisors = conn.compute.hypervisors()
    return Response({'hypervisors': [{'id': h.id, 'name': h.name} for h in hypervisors]})


# -----------------------------6 Dec 2024-------------------------------------------

class OpenStackOverviewAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Authenticate with OpenStack
        conn = connection.Connection(
            auth_url=os.getenv('AUTH_URL'),
            project_name=os.getenv('PROJECT_NAME'),
            username="admin",
            password=os.getenv('PASSWORD'),
            user_domain_name=os.getenv('USER_DOMAIN_NAME'),
            project_domain_name=os.getenv('PROJECT_DOMAIN_NAME')
        )

        print("auth url =", os.getenv('AUTH_URL'))
        print("project_name=", os.getenv('PROJECT_NAME'))
        print("username=", "admin")
        print("password=", os.getenv('PASSWORD'))
        print("user_domain_name=", os.getenv('USER_DOMAIN_NAME'))
        print("project_domain_name=", os.getenv('PROJECT_DOMAIN_NAME'))

        try:
            # Compute details
            # hypervisors = conn.compute.hypervisors()
            instances = list(conn.compute.servers())  # Get all the instances
            total_instances = len(instances)  # Total number of instances
            print("total instances",total_instances)
           
            hypervisors = list(conn.compute.hypervisors()) # Convert generator to list
            print("hypervisors",hypervisors)
            # print("attribute of hypervisor [0]",dir(hypervisors[0]))
            
            count_of_hypervisors = len(hypervisors)    
            # Print the count of hypervisors
            print("Count of Hypervisors:", count_of_hypervisors)

            hypervisor_names = [hypervisor.name for hypervisor in hypervisors] # Extract the hypervisor hostnames
            # Print the list of hypervisor names
            print("Hypervisor Names:", hypervisor_names)
           
           
            # Get resource usage
            usage = conn.compute.get_limits()
            print(f"vCPUs Used: {usage['absolute']['totalCoresUsed']}")
            print(f"vCPUs Total: {usage['absolute']['maxTotalCores']}")
            print(f"RAM Used: {usage['absolute']['totalRAMUsed']} MB")
            print(f"RAM Total: {usage['absolute']['maxTotalRAMSize']} MB")
            
            
            vcpu_total = {usage['absolute']['maxTotalCores']}
            vcpu_used = {usage['absolute']['totalCoresUsed']}
            ram_used = {usage['absolute']['totalRAMUsed']}
            ram_total = {usage['absolute']['maxTotalRAMSize']}
            
            overview_data = {
                "total_instances": total_instances,
                "total_vcpus": vcpu_total,
                "used_vcpus": vcpu_used,
                "total_memory_mb": ram_total,
                "used_memory_mb": ram_used,
                "total_storage_gb": "80000",
                "used_storage_gb": "20000",
            }
            print("overview data",overview_data)
        except Exception as e:
            # Handle any unexpected errors
            return Response({"error": str(e)}, status=500)

        # Return the data as JSON
        return Response(overview_data)

def get_openstack_connection1(project_name=None):
    """
    Establish an OpenStack connection with a dynamic project name.
    If no project name is provided, default to the environment variable.
    """
    return connection.Connection(
        auth_url=os.getenv('AUTH_URL'),
        project_name=project_name or os.getenv('PROJECT_NAME'),
        username="admin",
        password=os.getenv('PASSWORD'),
        user_domain_name=os.getenv('USER_DOMAIN_NAME'),
        project_domain_name=os.getenv('PROJECT_DOMAIN_NAME'),
    )

from openstack import connection
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
import os

def get_openstack_connection(project_name=None):
    """
    Establish an OpenStack connection with a dynamic project name.
    If no project name is provided, default to the environment variable.
    """
    return connection.Connection(
        auth_url=os.getenv('AUTH_URL'),
        project_name=project_name or os.getenv('PROJECT_NAME'),
        username="admin",
        password=os.getenv('PASSWORD'),
        user_domain_name=os.getenv('USER_DOMAIN_NAME'),
        project_domain_name=os.getenv('PROJECT_DOMAIN_NAME'),
    )

class OpenStackOverviewAPIView1(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        project_name = request.query_params.get('project_name', os.getenv('PROJECT_NAME'))
        try:
            # OpenStack connection
            conn = get_openstack_connection1(project_name)
            print("Connected to project:", project_name)

            # Fetch instances
            instances = list(conn.compute.servers())
            total_instances = len(instances)

            # Fetch resource usage (vCPUs, RAM, etc.)
            usage = conn.compute.get_limits()
            vcpu_total = usage['absolute']['maxTotalCores']
            vcpu_used = usage['absolute']['totalCoresUsed']
            ram_total = usage['absolute']['maxTotalRAMSize']
            ram_used = usage['absolute']['totalRAMUsed']

            # Volumes (Make sure to fetch volumes specific to the project)
            volumes = list(conn.block_storage.volumes())  # You may add filters for specific project here
            total_volumes = len(volumes)  # Count of total volumes
            total_volume_size_gb = sum(volume.size for volume in volumes)  # Sum the size of the volumes

            # Floating IPs: Get all floating IPs and filter by project
            floating_ips = list(conn.network.ips())
            used_fips = sum(1 for ip in floating_ips if ip.fixed_ip_address)  # Count allocated IPs
            total_floating_ips = len(floating_ips)

            # Security Groups: Get all security groups and filter if needed
            security_groups = list(conn.network.security_groups())
            used_sg = len(security_groups)

            # Initialize response data
            overview_data = {
                "project_name": project_name,
                "total_instances": total_instances,
                "total_vcpus": vcpu_total,
                "used_vcpus": vcpu_used,
                "total_memory_mb": ram_total,
                "used_memory_mb": ram_used,
                "total_storage_gb": 80000,  # Mocked, adjust according to actual data
                "used_storage_gb": 20000,   # Mocked, adjust according to actual data
                "total_volumes": total_volumes,
                "total_volume_size_gb": total_volume_size_gb,
                "total_floating_ips": total_floating_ips,
                "used_floating_ips": used_fips,
                "total_security_groups": len(security_groups),
                "used_security_groups": used_sg,
            }

        except Exception as e:
            return Response({"error": str(e)}, status=500)

        return Response(overview_data)


def create_user_with_details(first_name, email, password):
    """
    Create a user with first name, email, and password in Django.

    Parameters:
    - first_name: First name of the user.
    - email: Email address of the user.
    - password: Password for the user.

    Returns:
    - User object if successful, None otherwise.
    """
    try:
        # Create a new user using the create_user method
        user = User.objects.create_user(
            username=email,  # Using email as the username
            email=email,
            password=password,
            first_name=first_name
        )

        print(f"User '{email}' created successfully with ID: {user.id}")
        return user

    except Exception as e:
        print(f"Error creating user: {e}")
        return None
    
# class EmployeeRegisterAPIView(APIView):
#     permission_classes = []
#     def post(self, request, employee_id):
#         try:
#             password = request.data['password']
#             # Get the employee by employee_id
#             employee = Employee.objects.get(employee_id=employee_id)
#             create_user_with_details(employee.name,employee.email,password)
#         except Employee.DoesNotExist:
#             return Response(
#                 {"error": f"Employee with ID {employee_id} not found."},
#                 status=status.HTTP_404_NOT_FOUND
#             )
        
#         # Serialize and validate the data
#         serializer = EmployeeUpdateSerializer(employee, data=request.data, partial=True)
#         if serializer.is_valid():
#             # Save the updated employee instance
#             serializer.save()
#             return Response(
#                 {
#                     "message": f"Employee Registered successfully!",
#                     "employee_id": employee.employee_id,
#                     "employee_name": employee.name,
#                     # "data": serializer.data,
#                 },
#                 status=status.HTTP_200_OK
#             )
#         return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class EmployeeRegisterAPIView(APIView):
    permission_classes = []

    def post(self, request, employee_id):
        try:
            password = request.data.get('password', None)
            
            # Get the employee by employee_id
            employee = Employee.objects.get(employee_id=employee_id)
            
            # Call the function to create the user if required
            if password:
                create_user_with_details(employee.name, employee.email, password)

        except Employee.DoesNotExist:
            return Response(
                {"error": f"Employee with ID {employee_id} not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        # Serialize and validate the data
        serializer = EmployeeUpdateSerializer(employee, data=request.data, partial=True)
        if serializer.is_valid():
            new_fields = {}
            updated_fields = {}

            # Check for fields that are being registered or updated
            for field, value in serializer.validated_data.items():
                current_value = getattr(employee, field, None)
                if not current_value:  # Field is empty, so it's being registered
                    new_fields[field] = value
                elif current_value != value:  # Field already has a value and it's being updated
                    updated_fields[field] = value

            if new_fields or updated_fields:
                # Save the updated employee instance
                serializer.save()
                response_message = "Employee details processed successfully!"

                if new_fields and updated_fields:
                    response_message = "Employee registered and updated successfully!"
                elif new_fields:
                    response_message = "Employee registered successfully!"
                elif updated_fields:
                    response_message = "Employee updated successfully!"

                return Response(
                    {
                        "message": response_message,
                        "new_fields": new_fields,
                        "updated_fields": updated_fields,
                        "employee_id": employee.employee_id,
                        "employee_name": employee.name,
                    },
                    status=status.HTTP_200_OK
                )
            else:
                return Response(
                    {
                        "message": "No changes detected. Data already up-to-date.",
                        "employee_id": employee.employee_id,
                        "employee_name": employee.name,
                    },
                    status=status.HTTP_200_OK
                )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class NewEmployeeRegisterAPIView(APIView):
    permission_classes = []

    def post(self, request, employee_id):
        try:
            password = request.data.get('password', None)
            
            # Get the employee by employee_id
            employee = Employee.objects.get(employee_id=employee_id)

            # Check if employee is FLA by checking if any employees have this employee as their FLA
            is_fla = Employee.objects.filter(fla_employee_id=employee_id).exists()

            # Create registration request based on employee type
            registration_data = {
                'employee_id': employee_id,
                'name': employee.name,
                'email': employee.email,
                'user_type': 'FLA' if is_fla else 'Employee',
                'fla_employee_id': employee.fla_employee_id,
                'request_timestamp': timezone.now()
            }

            # Check if a pending request already exists
            existing_request = UserRegistrationRequest.objects.filter(
                employee_id=employee_id,
                admin_status='Pending'
            ).first()

            if existing_request:
                return Response({
                    "error": "A registration request is already pending for this employee.",
                    "request_id": existing_request.id,
                    "status": {
                        "fla_status": existing_request.fla_status,
                        "admin_status": existing_request.admin_status
                    }
                }, status=status.HTTP_400_BAD_REQUEST)

            # Create the registration request
            registration_request = UserRegistrationRequest.objects.create(**registration_data)

            # If the user is a FLA, automatically set FLA status to accepted
            if registration_data['user_type'] == 'FLA':
                registration_request.fla_status = 'Accepted'
                registration_request.fla_approved_timestamp = timezone.now()
                registration_request.save()
                response_message = "FLA registration request sent for admin approval"
            else:
                response_message = "Registration request sent for FLA approval"

            # Store password temporarily (encrypted)
            if password:
                registration_request.temporary_password = make_password(password)
                registration_request.save()

            # Return detailed response
            return Response({
                "message": response_message,
                "request_details": {
                    "request_id": registration_request.id,
                    "employee_id": employee.employee_id,
                    "name": employee.name,
                    "user_type": registration_data['user_type'],
                    "status": {
                        "fla_status": registration_request.fla_status,
                        "admin_status": registration_request.admin_status
                    }
                },
                "next_step": "Awaiting admin approval" if is_fla else "Awaiting FLA approval"
            }, status=status.HTTP_200_OK)

        except Employee.DoesNotExist:
            return Response({
                "error": f"Employee with ID {employee_id} not found."
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({
                "error": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ApproveRegistrationRequestAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            request_id = request.data.get('request_id')
            user_role = request.auth.get('role')

            registration_request = UserRegistrationRequest.objects.get(id=request_id)
            print(request.auth.get('employee_id'), registration_request.fla_employee_id,"=======")

            if user_role == 'FLA':
                if registration_request.user_type == 'FLA':
                    return Response({
                        "error": "FLAs cannot approve FLA registration requests"
                    }, status=status.HTTP_403_FORBIDDEN)
                    
                if registration_request.fla_employee_id != request.auth.get('employee_id'):
                    return Response({
                        "error": "You are not authorized to approve this registration request"
                    }, status=status.HTTP_403_FORBIDDEN)

                registration_request.fla_status = 'Accepted'
                registration_request.fla_approved_timestamp = timezone.now()
                registration_request.save()

                return Response({
                    "message": "Registration request approved by FLA",
                    "next_step": "Awaiting admin approval",
                    "status": {
                        "fla_status": "Accepted",
                        "admin_status": "Pending"
                    }
                })

            elif user_role == 'ADMIN':
                # For employee registrations, check FLA approval
                if (registration_request.user_type == 'Employee' and 
                    registration_request.fla_status != 'Accepted'):
                    return Response({
                        "error": "Employee registration must be approved by FLA first",
                        "current_status": {
                            "fla_status": registration_request.fla_status,
                            "admin_status": registration_request.admin_status
                        }
                    }, status=status.HTTP_400_BAD_REQUEST)

                registration_request.admin_status = 'Accepted'
                registration_request.admin_approved_timestamp = timezone.now()
                registration_request.save()

                # Here you would typically create the user account
                # create_user_with_details(registration_request.name, 
                #                         registration_request.email, 
                #                         decrypt_password(registration_request.temporary_password))

                return Response({
                    "message": "Registration request approved by admin",
                    "status": "Registration completed",
                    "user_details": {
                        "employee_id": registration_request.employee_id,
                        "name": registration_request.name,
                        "email": registration_request.email,
                        "user_type": registration_request.user_type
                    }
                })

            else:
                return Response({
                    "error": "Unauthorized role for approval"
                }, status=status.HTTP_403_FORBIDDEN)

        except UserRegistrationRequest.DoesNotExist:
            return Response({
                "error": "Registration request not found"
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({
                "error": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PendingRegistrationRequestsAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            user_role = request.auth.get('role')
            employee_id = request.auth.get('employee_id')

            if user_role == 'FLA':
                # Get requests from employees where this user is the FLA
                pending_requests = UserRegistrationRequest.objects.filter(
                    fla_employee_id=employee_id,
                    fla_status='Pending'
                )
            elif user_role == 'ADMIN':
                # Get FLA requests or employee requests approved by FLA
                pending_requests = UserRegistrationRequest.objects.filter(
                    models.Q(user_type='FLA', admin_status='Pending') |
                    models.Q(user_type='Employee', fla_status='Accepted', admin_status='Pending')
                )
            else:
                return Response({
                    "error": "Unauthorized role"
                }, status=status.HTTP_403_FORBIDDEN)

            requests_data = [{
                "request_id": req.id,
                "employee_id": req.employee_id,
                "name": req.name,
                "email": req.email,
                "user_type": req.user_type,
                "status": {
                    "fla_status": req.fla_status,
                    "admin_status": req.admin_status
                },
                "request_timestamp": req.request_timestamp
            } for req in pending_requests]

            return Response({
                "pending_requests": requests_data,
                "count": len(requests_data)
            })

        except Exception as e:
            return Response({
                "error": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# --------------------------6 June 2025--------------------------

class AcceptedByFLARegistrationRequestsAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            user_role = request.auth.get('role', None)

            if user_role != 'ADMIN':
                return Response({"error": "Access denied. Only admins can view this data."},
                                status=status.HTTP_403_FORBIDDEN)

            # Get only requests where FLA has accepted
            requests = UserRegistrationRequest.objects.filter(
                Q(user_type='Employee') & Q(fla_status='Accepted')
            ).order_by('-request_timestamp')

            data = [{
                "request_id": req.id,
                "employee_id": req.employee_id,
                "name": req.name,
                "email": req.email,
                "user_type": req.user_type,
                "status": {
                    "fla_status": req.fla_status,
                    "admin_status": req.admin_status
                },
                "request_timestamp": req.request_timestamp
            } for req in requests]

            return Response({
                "accepted_by_fla_requests": data,
                "count": len(data)
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)






def get_employee_details(request):
    # import_data()
    permission_classes = [IsAuthenticated]

    employee_id = request.GET.get('employee_id')
    
    if not employee_id:
        return JsonResponse({'error': 'Employee ID is required'}, status=400)
    
    try:
        # Fetch employee details
        employee = Employee.objects.get(employee_id=employee_id)
        data = {
            'name': employee.name,
            'email': employee.email,
            'group': employee.group,
            'fla_name': employee.fla_name,
        }
        print("Employee data Returned successfully",data)
        return JsonResponse(data, status=200)
    except Employee.DoesNotExist:
        return JsonResponse({'error': 'Employee not found'}, status=404)
    
    
class EmployeeCreateAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        # Deserialize and validate data
        serializer = EmployeeSerializer(data=request.data)
        if serializer.is_valid():
            # Save the validated data to the database
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        else:
            # Return validation errors if any
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)



class AllRegistrationRequestsAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            registration_requests = UserRegistrationRequest.objects.all().order_by('-request_timestamp')
            user_role = request.auth.get('role', None)
            print("user role",user_role)
            if user_role != 'ADMIN':
                return Response({"error": "Access denied"}, status=status.HTTP_403_FORBIDDEN)
            data = [{
                "request_id": req.id,
                "employee_id": req.employee_id,
                "name": req.name,
                "email": req.email,
                "user_type": req.user_type,
                "status": {
                    "fla_status": req.fla_status,
                    "admin_status": req.admin_status
                },
                "request_timestamp": req.request_timestamp
            } for req in registration_requests]

            return Response({
                "total_requests": len(data),
                "requests": data
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# -----------------------------4 june 2025---------------------
class EmployeeDeleteAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, employee_id):
        try:
            employee = Employee.objects.get(employee_id=employee_id)
            employee_name = employee.name
            employee.delete()
            return Response(
                {"message": f"{employee_name} Employee with ID {employee_id} deleted successfully."},
                status=status.HTTP_204_NO_CONTENT
            )
        except Employee.DoesNotExist:
            return Response(
                {"error": f"Employee with ID {employee_id} not found."},
                status=status.HTTP_404_NOT_FOUND
            )
class EmployeeUpdateAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def put(self, request, employee_id):
        try:
            employee = Employee.objects.get(employee_id=employee_id)
        except Employee.DoesNotExist:
            return Response(
                {"error": "Employee not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        # Store original data for comparison
        original_data = EmployeeSerializer(employee).data

        # Check if email is being updated to a different value
        new_email = request.data.get('email')
        if new_email and new_email != employee.email:
            # Check if the new email exists for any other employee
            if Employee.objects.exclude(employee_id=employee_id).filter(email=new_email).exists():
                return Response(
                    {"error": "Email already exists for another employee"},
                    status=status.HTTP_400_BAD_REQUEST
                )

        serializer = EmployeeSerializer(employee, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()

            # Get updated data
            updated_data = serializer.data

            # Compare original and updated to find changed fields
            changed_fields = [
                field for field in updated_data
                if updated_data[field] != original_data.get(field)
            ]

            return Response({
                "message": "Employee updated successfully",
                "updated_fields": changed_fields
            }, status=status.HTTP_200_OK)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    
# class InstanceDetailsAPIView(APIView):
#     permission_classes = []

    # def get(self, request):
#         try:
#             # Initialize the OpenStack connection
#             conn = connection.Connection(
#             auth_url=os.getenv('AUTH_URL'),
#             project_name=os.getenv('PROJECT_NAME'),
#             username="admin",
#             password=os.getenv('PASSWORD'),
#             user_domain_name=os.getenv('USER_DOMAIN_NAME'),
#             project_domain_name=os.getenv('PROJECT_DOMAIN_NAME')
#         )


#             # Fetch server (instance) details
#             servers = conn.compute.servers(details=True)
#             instances = []

#             for server in servers:
#                 # Add fallback values for fields that might not exist
#                 flavor = conn.compute.find_flavor(server.flavor['id']) if server.flavor else None
#                 image = conn.compute.find_image(server.image['id']) if server.image else None
#                 key_pair = server.key_name if server.key_name else "-"
#                 ip_address = (
#                     list(server.addresses.values())[0][0]['addr']
#                     if server.addresses and list(server.addresses.values())[0]
#                     else "-"
#                 )
#                 availability_zone = server.availability_zone if server.availability_zone else "-"
#                 server_status = server.status if server.status else "Unknown"
#                 task = server.task_state if server.task_state else "None"
#                 power_state = "Running" if server.power_state == 1 else "Stopped"
#                 created_at = server.created_at if server.created_at else None
#                 age = self.calculate_age(created_at) if created_at else "Unknown"

#                 # Add instance details to the list
#                 instances.append({
#                     "Instance ID": server.id if server.id else "Unknown",  # Add Instance ID
#                     "Instance Name": server.name if server.name else "Unknown",
#                     "Image Name": image.name if image else "-",
#                     "IP Address": ip_address,
#                     "Flavor": flavor.name if flavor else "-",
#                     "Key Pair": key_pair,
#                     "Status": server_status,
#                     "Availability Zone": availability_zone,
#                     "Task": task,
#                     "Power State": power_state,
#                     "Age": age,
#                 })

#             return Response(instances, status=status.HTTP_200_OK)
#         except Exception as e:
#             return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# class InstanceDetailsAPIView(APIView):
#     permission_classes = [IsAuthenticated]

#     def get(self, request):
#         try:
#             # Get the selected project from the request
#             selected_project = request.query_params.get('project_name')
#             print("selected_project",selected_project)
#             # Initialize the OpenStack connection for the selected project
#             conn = get_openstack_connection()
#             # Fetch server (instance) details
#             servers = conn.compute.servers(details=True)
#             instances = []

#             for server in servers:
#                 # Add fallback values for fields that might not exist
#                 flavor = conn.compute.find_flavor(server.flavor['id']) if server.flavor else None
#                 image = conn.compute.find_image(server.image['id']) if server.image else None
#                 key_pair = server.key_name if server.key_name else "-"
#                 ip_address = (
#                     list(server.addresses.values())[0][0]['addr']
#                     if server.addresses and list(server.addresses.values())[0]
#                     else "-"
#                 )
#                 availability_zone = server.availability_zone if server.availability_zone else "-"
#                 server_status = server.status if server.status else "Unknown"
#                 task = server.task_state if server.task_state else "None"
#                 power_state = "Running" if server.power_state == 1 else "Stopped"
#                 created_at = server.created_at if server.created_at else None
#                 age = self.calculate_age(created_at) if created_at else "Unknown"

#                 # Add instance details to the list
#                 instances.append({
#                     "Instance ID": server.id if server.id else "Unknown",  # Add Instance ID
#                     "Instance Name": server.name if server.name else "Unknown",
#                     "Image Name": image.name if image else "-",
#                     "IP Address": ip_address,
#                     "Flavor": flavor.name if flavor else "-",
#                     "Key Pair": key_pair,
#                     "Status": server_status,
#                     "Availability Zone": availability_zone,
#                     "Task": task,
#                     "Power State": power_state,
#                     "Age": age,
#                 })

#             return Response(instances, status=status.HTTP_200_OK)
#         except Exception as e:
#             return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class InstanceDetailsAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            POWER_STATE_MAP = {
                0: "NOSTATE",
                1: "Running",
                3: "Paused",
                4: "Shutdown",
                6: "Crashed",
                7: "Suspended"
            }
            # Initialize the OpenStack connection
            conn = get_openstack_connection()
            # print("conn---->",conn)
            # Fetch all server (instance) details
            servers = conn.compute.servers(details=True)
            instances = []
            # print("instance")
            for server in servers:
                print("server------->",server)
                # Get flavor details
                flavor_id = server.flavor['id'] if server.flavor else None
                # print("flavor_id",flavor_id)
                flavor = conn.compute.find_flavor(flavor_id) if flavor_id else None
                # print("flavor",flavor)
                # Get image details
               
                image_name ="N/A"
                # Case 1: Instance booted from image
                # --- Case 1: Booted from an image ---
                image_info = getattr(server, "image", None)
                image_id = image_info.get("id") if isinstance(image_info, dict) else None

                if image_id:
                    try:
                        image = conn.compute.get_image(image_id)
                        if image:
                            image_name = image.name or "N/A"
                    except Exception:
                        image_name = "N/A"

                # Case 2: Instance booted from volume
                # --- Case 2: Booted from volume ---
                if image_name == "N/A":
                     attached_vols = getattr(server, "attached_volumes", [])

                     if attached_vols:
                        volume_id = attached_vols[0].get("id")

                        if volume_id:
                            volume = conn.block_storage.get_volume(volume_id)

                            if volume:
                                meta = getattr(volume, "volume_image_metadata", {}) or {}

                                if "image_name" in meta:
                                    image_name = meta["image_name"]

                                elif "image_id" in meta:
                                    try:
                                        img = conn.compute.get_image(meta["image_id"])
                                        image_name = img.name or "N/A"
                                    except:
                                        image_name = f"Volume ({volume_id})"
                                else:
                                    image_name = f"Volume ({volume_id})"

                # print("image_name",image_name)
                # Get security groups
                security_groups = [sg['name'] for sg in server.security_groups] if hasattr(server, 'security_groups') else []

                # Get IP addresses
                ip_addresses = {}
                if server.addresses:
                    for network, address_list in server.addresses.items():
                        ip_addresses[network] = [addr['addr'] for addr in address_list]
                power_state_num = getattr(server, 'power_state', None)
                power_state_str = POWER_STATE_MAP.get(power_state_num, str(power_state_num))
                # Construct instance details
                instances.append({
                    "Instance ID": server.id if server.id else "Unknown",
                    "Instance Name": server.name if server.name else "Unknown",
                    "Image Name": image_name,  # Now handles cases where booted from volume
                    "Flavor Name": flavor.name if flavor else "-",
                    "RAM": f"{flavor.ram} MB" if flavor else "-",
                    "VCPUs": flavor.vcpus if flavor else "-",
                    "Disk": f"{flavor.disk} GB" if flavor else "-",
                    "IP Addresses": ip_addresses,
                    "status": server.status,
                    "Age": server.created_at,
                    "power_state": getattr(server, 'power_state', None),
                    "power_state_str": power_state_str,
                    "Security Groups": security_groups,
                    "Volumes Attached": [vol['id'] for vol in server.attached_volumes] if hasattr(server, 'attached_volumes') else [],
                })
                print(instances)
            return Response(instances, status=200)
        except Exception as e:
            return Response({"error": str(e)}, status=500)
    
    def calculate_age(self, created_at):
        """Calculate the age of the instance."""
        created_time = datetime.strptime(created_at, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)
        now = datetime.now(timezone.utc)
        age = now - created_time
        days = age.days
        hours = age.seconds // 3600
        return f"{days} days, {hours} hours"


    # def calculate_age(self, created_at):
    #     """Calculate the age of the instance."""
    #     created_time = datetime.strptime(created_at, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)
    #     now = datetime.now(timezone.utc)
    #     age = now - created_time
    #     days = age.days
    #     hours = age.seconds // 3600
    #     return f"{days} days, {hours} hours"
   
# class InstanceDetailsAPIViewDetails(APIView):
   
#     permission_classes = [IsAuthenticated]

#     def get(self, request):
#         try:
#             # Initialize OpenStack connection
#             conn = get_openstack_connection()

#             # Fetch all instances
#             servers = conn.compute.servers(details=True)
#             instances = []

#             for server in servers:
#                 # Get instance details
#                 instance_id = server.id
#                 instance_name = server.name if server.name else "Unknown"
#                 status = server.status if server.status else "Unknown"
#                 power_state = "Running" if server.power_state == 1 else "Stopped"
#                 availability_zone = server.availability_zone if server.availability_zone else "-"
#                 task = server.task_state if server.task_state else "None"
#                 created_at = server.created_at if server.created_at else None
#                 updated_at = server.updated_at if server.updated_at else None
#                 age = self.calculate_age(created_at) if created_at else "Unknown"

#                 # Get image details
#                 image_id = server.image['id'] if server.image else None
#                 image_name = "-"
#                 if image_id:
#                     image = conn.compute.find_image(image_id)
#                     image_name = image.name if image else "-"

#                 # Get flavor details
#                 flavor_id = server.flavor['id'] if server.flavor else None
#                 flavor_name, ram, vcpus, disk = "-", "-", "-", "-"
#                 if flavor_id:
#                     flavor = conn.compute.find_flavor(flavor_id)
#                     print("flavor",flavor)
#                     if flavor:
#                         flavor_name = flavor.name
#                         print("flavor_name",flavor_name)
#                         ram = f"{flavor.ram} MB"
#                         vcpus = flavor.vcpus
#                         disk = f"{flavor.disk} GB"

#                 # Handle boot from volume case
#                 boot_volume_id = None
#                 if hasattr(server, "os-extended-volumes:volumes_attached"):
#                     attached_volumes = server.get("os-extended-volumes:volumes_attached", [])
#                     if attached_volumes:
#                         boot_volume_id = attached_volumes[0].get("id")

#                 if not image_name and boot_volume_id:
#                     image_name = f"Booted from Volume ({boot_volume_id})"

#                 # Get security groups
#                 security_groups = [sg['name'] for sg in server.security_groups] if hasattr(server, 'security_groups') else []

#                 # Get IP addresses
#                 ip_addresses = {}
#                 if server.addresses:
#                     for network, address_list in server.addresses.items():
#                         ip_addresses[network] = [addr['addr'] for addr in address_list]

#                 # Get metadata
#                 metadata = server.metadata if hasattr(server, "metadata") else {}

#                 # Get attached volumes
#                 volumes_attached = [vol['id'] for vol in server.attached_volumes] if hasattr(server, 'attached_volumes') else []

#                 # Get extra details
#                 host = getattr(server, 'OS-EXT-SRV-ATTR:host', None)
#                 launch_index = getattr(server, 'OS-EXT-SRV-ATTR:launch_index', 0)
#                 hostname = getattr(server, 'OS-EXT-SRV-ATTR:hostname', instance_name)
#                 reservation_id = getattr(server, 'OS-EXT-SRV-ATTR:reservation_id', "-")
#                 kernel_id = getattr(server, 'OS-EXT-SRV-ATTR:kernel_id', "-")
#                 ramdisk_id = getattr(server, 'OS-EXT-SRV-ATTR:ramdisk_id', "-")
#                 device_name = getattr(server, 'OS-EXT-SRV-ATTR:root_device_name', "-")
#                 user_data = getattr(server, 'OS-EXT-SRV-ATTR:user_data', None)

#                 # Construct instance details
#                 instances.append({
#                     "Instance ID": instance_id,
#                     "Instance Name": instance_name,
#                     "Image Name": image_name,
#                     "Image ID": image_id if image_id else "-",
#                     "Flavor Name": flavor_name,
#                     "Flavor ID": flavor_id if flavor_id else "-",
#                     "RAM": ram,
#                     "VCPUs": vcpus,
#                     "Disk": disk,
#                     "Key Pair": server.key_name if server.key_name else "None",
#                     "Status": status,
#                     "Availability Zone": availability_zone,
#                     "Task": task,
#                     "Power State": power_state,
#                     "Age": age,
#                     "Created At": created_at,
#                     "Updated At": updated_at,
#                     "Host": host,
#                     "Launch Index": launch_index,
#                     "Hostname": hostname,
#                     "Reservation ID": reservation_id,
#                     "Kernel ID": kernel_id,
#                     "Ramdisk ID": ramdisk_id,
#                     "Device Name": device_name,
#                     "User Data": user_data,
#                     "IP Addresses": ip_addresses,
#                     "Security Groups": security_groups,
#                     "Volumes Attached": volumes_attached,
#                     "Metadata": metadata,
#                 })

#             return Response(instances, status=200)
#         except Exception as e:
#             return Response({"error": str(e)}, status=500)

#     def calculate_age(self, created_at):
#         if not created_at:
#             return "Unknown"
#         created_time = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
#         now = datetime.now(timezone.utc)
#         age = now - created_time
#         days = age.days
#         hours = age.seconds // 3600
#         return f"{days} days, {hours} hours"

class InstanceDetailsAPIViewDetails(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            # Initialize OpenStack connection
            conn = get_openstack_connection()

            # Fetch all flavors once and store them in a dictionary
            flavors = {flv.id: flv for flv in conn.compute.flavors()}

            # Fetch all instances
            servers = conn.compute.servers(details=True)
            instances = []

            for server in servers:
                # Get instance details
                instance_id = server.id
                instance_name = server.name if server.name else "Unknown"
                status = server.status if server.status else "Unknown"
                power_state = "Running" if server.power_state == 1 else "Stopped"
                availability_zone = server.availability_zone if server.availability_zone else "-"
                task = server.task_state if server.task_state else "None"
                created_at = server.created_at if server.created_at else None
                updated_at = server.updated_at if server.updated_at else None
                age = self.calculate_age(created_at) if created_at else "Unknown"

                # Get image details
                image_id = server.image['id'] if server.image else None
                image_name = "-"
                if image_id:
                    image = conn.compute.find_image(image_id)
                    image_name = image.name if image else "-"

                # Get flavor details
                flavor_id = server.flavor['id'] if server.flavor else None
                flavor_name, ram, vcpus, disk = "-", "-", "-", "-"

                if flavor_id and flavor_id in flavors:
                    flavor = flavors[flavor_id]
                    flavor_name = flavor.name
                    ram = f"{flavor.ram} MB"
                    vcpus = flavor.vcpus
                    disk = f"{flavor.disk} GB"

                # Handle boot from volume case
                boot_volume_id = None
                if hasattr(server, "os-extended-volumes:volumes_attached"):
                    attached_volumes = server.get("os-extended-volumes:volumes_attached", [])
                    if attached_volumes:
                        boot_volume_id = attached_volumes[0].get("id")

                if boot_volume_id:
                    # Get volume details to fetch image name
                    volume = conn.block_storage.get_volume(boot_volume_id)
                    if volume and volume.volume_image_metadata:
                        image_name = volume.volume_image_metadata.get("image_name", f"Booted from Volume ({boot_volume_id})")

                # Get security groups
                security_groups = [sg['name'] for sg in server.security_groups] if hasattr(server, 'security_groups') else []

                # Get IP addresses
                ip_addresses = {}
                if server.addresses:
                    for network, address_list in server.addresses.items():
                        ip_addresses[network] = [addr['addr'] for addr in address_list]

                # Get metadata
                metadata = server.metadata if hasattr(server, "metadata") else {}

                # Get attached volumes
                volumes_attached = [vol['id'] for vol in server.attached_volumes] if hasattr(server, 'attached_volumes') else []

                # Get extra details
                host = getattr(server, 'OS-EXT-SRV-ATTR:host', None)
                launch_index = getattr(server, 'OS-EXT-SRV-ATTR:launch_index', 0)
                hostname = getattr(server, 'OS-EXT-SRV-ATTR:hostname', instance_name)
                reservation_id = getattr(server, 'OS-EXT-SRV-ATTR:reservation_id', "-")
                kernel_id = getattr(server, 'OS-EXT-SRV-ATTR:kernel_id', "-")
                ramdisk_id = getattr(server, 'OS-EXT-SRV-ATTR:ramdisk_id', "-")
                device_name = getattr(server, 'OS-EXT-SRV-ATTR:root_device_name', "-")
                user_data = getattr(server, 'OS-EXT-SRV-ATTR:user_data', None)

                # Construct instance details
                instances.append({
                    "Instance ID": instance_id,
                    "Instance Name": instance_name,
                    "Image Name": image_name,
                    "Image ID": image_id if image_id else "-",
                    "Flavor Name": flavor_name,
                    "Flavor ID": flavor_id if flavor_id else "-",
                    "RAM": ram,
                    "VCPUs": vcpus,
                    "Disk": disk,
                    "Key Pair": server.key_name if server.key_name else "None",
                    "Status": status,
                    "Availability Zone": availability_zone,
                    "Task": task,
                    "Power State": power_state,
                    "Age": age,
                    "Created At": created_at,
                    "Updated At": updated_at,
                    "Host": host,
                    "Launch Index": launch_index,
                    "Hostname": hostname,
                    "Reservation ID": reservation_id,
                    "Kernel ID": kernel_id,
                    "Ramdisk ID": ramdisk_id,
                    "Device Name": device_name,
                    "User Data": user_data,
                    "IP Addresses": ip_addresses,
                    "Security Groups": security_groups,
                    "Volumes Attached": volumes_attached,
                    "Metadata": metadata,
                })

            return Response(instances, status=200)
        except Exception as e:
            return Response({"error": str(e)}, status=500)

    def calculate_age(self, created_at):
        if not created_at:
            return "Unknown"
        created_time = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
        now = datetime.now(timezone.utc)
        age = now - created_time
        days = age.days
        hours = age.seconds // 3600
        return f"{days} days, {hours} hours"

    
    
# ---------------------------12 feb 2025---------------------------------------------

class VMDetailAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, instance_id):
        try:
            conn = get_openstack_connection()
            server = conn.compute.get_server(instance_id)

            if not server:
                return Response({"error": "Instance not found"}, status=404)

            # Compute age
            created_at = server.created_at if server.created_at else None
            age = self.calculate_age(created_at) if created_at else "Unknown"

            # Get image details
            image_id = server.image['id'] if server.image else None
            image_name = "-"
            if image_id:
                image = conn.compute.find_image(image_id)
                image_name = image.name if image else "-"

            # Get flavor details
            flavor_id = server.flavor['id'] if server.flavor else None
            flavor_name = "Not available"
            if flavor_id:
                flavor = conn.compute.find_flavor(flavor_id)
                flavor_name = flavor.name if flavor else "Not available"

            # Get security groups
            security_groups = []
            if hasattr(server, 'security_groups'):
                for sg in server.security_groups:
                    security_groups.append({
                        "name": sg["name"],
                        "rules": [
                            "ALLOW IPv4 udp to 0.0.0.0/0",
                            "ALLOW IPv4 udp from 0.0.0.0/0",
                            "ALLOW IPv4 tcp to 0.0.0.0/0",
                            "ALLOW IPv6 to ::/0",
                            "ALLOW IPv4 from default",
                            "ALLOW IPv6 from default",
                            "ALLOW IPv4 icmp to 0.0.0.0/0",
                            "ALLOW IPv4 tcp from 0.0.0.0/0",
                            "ALLOW IPv4 icmp from 0.0.0.0/0",
                            "ALLOW IPv4 to 0.0.0.0/0",
                            "ALLOW IPv4 22/tcp from 0.0.0.0/0"
                        ]  # Mock rules (adjust as needed)
                    })

            # Get IP addresses
            ip_addresses = {}
            if server.addresses:
                for network, address_list in server.addresses.items():
                    ip_addresses[network] = [addr['addr'] for addr in address_list]

            # Get attached volumes
            attached_volumes = []
            if hasattr(server, "os-extended-volumes:volumes_attached"):
                for vol in server.get("os-extended-volumes:volumes_attached", []):
                    volume_id = vol.get("id")
                    if volume_id:
                        volume = conn.block_storage.get_volume(volume_id)
                        attached_volumes.append({
                            "name": volume.name if volume else "Unknown",
                            "device": "/dev/vda"  # Assuming default, adjust as needed
                        })
                        # If booted from volume, update image name from volume metadata
                        if volume and volume.volume_image_metadata:
                            image_name = volume.volume_image_metadata.get("image_name", f"Booted from Volume ({volume_id})")

            # Get metadata
            metadata = server.metadata if hasattr(server, "metadata") else {}

            # Get extra details
            host = getattr(server, 'OS-EXT-SRV-ATTR:host', None)
            launch_index = getattr(server, 'OS-EXT-SRV-ATTR:launch_index', 0)
            hostname = getattr(server, 'OS-EXT-SRV-ATTR:hostname', server.name)
            reservation_id = getattr(server, 'OS-EXT-SRV-ATTR:reservation_id', "-")
            kernel_id = getattr(server, 'OS-EXT-SRV-ATTR:kernel_id', "-")
            ramdisk_id = getattr(server, 'OS-EXT-SRV-ATTR:ramdisk_id', "-")
            device_name = getattr(server, 'OS-EXT-SRV-ATTR:root_device_name', "/dev/vda")
            user_data = getattr(server, 'OS-EXT-SRV-ATTR:user_data', None)

            vm_details = {
                "Name": server.name,
                "ID": server.id,
                "Description": server.description if hasattr(server, "description") else "-",
                "Project ID": server.project_id,
                "Status": server.status,
                "Locked": getattr(server, "locked", False),
                "Availability Zone": server.availability_zone,
                "Created": created_at,
                "Age": age,
                "Host": host,
                "Instance Name": getattr(server, "OS-EXT-SRV-ATTR:instance_name", "-"),
                "Reservation ID": reservation_id,
                "Launch Index": launch_index,
                "Hostname": hostname,
                "Kernel ID": kernel_id,
                "Ramdisk ID": ramdisk_id,
                "Device Name": device_name,
                "User Data": user_data,
                "Specs": {
                    "Flavor": flavor_name
                },
                "IP Addresses": ip_addresses,
                "Security Groups": security_groups,
                "Metadata": {
                    "Key Name": server.key_name if server.key_name else "None",
                    "Image Name": image_name,
                    "Image ID": image_id if image_id else "-"
                },
                "Volumes Attached": attached_volumes
            }

            return Response(vm_details, status=200)

        except Exception as e:
            return Response({"error": str(e)}, status=500)

    def calculate_age(self, created_at):
        if not created_at:
            return "Unknown"
        created_time = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
        now = datetime.now(timezone.utc)
        age = now - created_time
        days = age.days
        hours = age.seconds // 3600
        return f"{days} days, {hours} hours"



# --------------------------9 Dec 2024-------------------------------------------

class VMActionAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            # Initialize the OpenStack connection
            conn = connection.Connection(
                auth_url=os.getenv('AUTH_URL'),
                project_name=os.getenv('PROJECT_NAME'),
                username="admin",
                password=os.getenv('PASSWORD'),
                user_domain_name=os.getenv('USER_DOMAIN_NAME'),
                project_domain_name=os.getenv('PROJECT_DOMAIN_NAME')
            )
            print("password",os.getenv('PASSWORD'))

            # Extract data from the request
            instance_ids = request.data.get("instance_ids")
            action = request.data.get("action")

            # Validate input
            if not instance_ids or not action:
                return Response({"error": "Both 'instance_ids' and 'action' are required."},
                                status=status.HTTP_400_BAD_REQUEST)

            if not isinstance(instance_ids, list):
                return Response({"error": "'instance_ids' should be a list."},
                                status=status.HTTP_400_BAD_REQUEST)

            # Action responses
            results = []

            for instance_id in instance_ids:
                try:
                    server = conn.compute.get_server(instance_id)

                    # Check current status before performing actions
                    current_state = server.status.lower()  # Example: 'active', 'stopped'

                    # Determine if the action is valid for the current state
                    if action == "pause" and current_state == "paused":
                        results.append({"instance_id": instance_id, "status": "Already Paused"})
                        continue
                    elif action == "suspend" and current_state == "suspended":
                        results.append({"instance_id": instance_id, "status": "Already Suspended"})
                        continue
                    elif action == "shutoff" and current_state == "stopped":
                        results.append({"instance_id": instance_id, "status": "Already Stopped"})
                        continue
                    elif action == "start" and current_state == "active":
                        results.append({"instance_id": instance_id, "status": "Already Running"})
                        continue
                    elif action == "delete" and current_state == "deleted":
                        results.append({"instance_id": instance_id, "status": "Already Deleted"})
                        continue

                    # Perform action based on the input
                    if action == "pause":
                        conn.compute.pause_server(server)
                    elif action == "suspend":
                        conn.compute.suspend_server(server)
                    elif action == "soft_reboot":
                        conn.compute.reboot_server(server, reboot_type="SOFT")
                    elif action == "hard_reboot":
                        conn.compute.reboot_server(server, reboot_type="HARD")
                    elif action == "shutoff":
                        conn.compute.stop_server(server)
                    elif action == "start":
                        conn.compute.start_server(server)
                    elif action == "delete":
                        conn.compute.delete_server(server)
                    else:
                        results.append({
                            "instance_id": instance_id,
                            "status": "Failed",
                            "error": f"Invalid action: {action}"
                        })
                        continue

                    # Append successful result
                    results.append({
                        "instance_id": instance_id,
                        "status": "Success"
                    })
                except Exception as e:
                    results.append({
                        "instance_id": instance_id,
                        "status": "Failed",
                        "error": str(e)
                    })

            return Response(results, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)




class DeleteImageAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, image_id):
        try:
            # Initialize OpenStack connection
            conn = connection.Connection(
                auth_url=os.getenv('AUTH_URL'),
                project_name=os.getenv('PROJECT_NAME'),
                username="admin",
                password=os.getenv('PASSWORD'),
                user_domain_name=os.getenv('USER_DOMAIN_NAME'),
                project_domain_name=os.getenv('PROJECT_DOMAIN_NAME'),
            )
            
            # Find the image
            image = conn.image.get_image(image_id)
            if image:
                # Delete the image
                conn.image.delete_image(image_id)
                return Response({"message": "Image deleted successfully"}, status=status.HTTP_200_OK)
            else:
                return Response({"error": "Image not found"}, status=status.HTTP_404_NOT_FOUND)
        
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class CreateImageAPIView(APIView):
    parser_classes = (MultiPartParser, FormParser)

    def post(self, request):
        try:
            # Parse parameters
            name = request.data.get('name')
            disk_format = request.data.get('disk_format', 'qcow2')
            container_format = request.data.get('container_format', 'bare')
            visibility = request.data.get('visibility', 'public')
            min_disk = int(request.data.get('min_disk', 0))
            min_ram = int(request.data.get('min_ram', 0))
            image_file = request.FILES.get('file')

            if not name or not file:
                return Response({"error": "Name and file are required"}, status=status.HTTP_400_BAD_REQUEST)

            

            # Save the uploaded file temporarily
            image_path = f"/tmp/{image_file.name}"
            with open(image_path, 'wb+') as destination:
                for chunk in image_file.chunks():
                    destination.write(chunk)

            # Connect to OpenStack
            conn = connection.Connection(
                auth_url=os.getenv('AUTH_URL'),
                project_name=os.getenv('PROJECT_NAME'),
                username="admin",
                password=os.getenv('PASSWORD'),
                user_domain_name=os.getenv('USER_DOMAIN_NAME'),
                project_domain_name=os.getenv('PROJECT_DOMAIN_NAME'),
            )

            # Create the image in OpenStack
            print("[DEBUG] Creating image in OpenStack...")
            image = conn.image.create_image(
                name=name,
                disk_format=disk_format,
                container_format=container_format,
                visibility=visibility,
                min_disk=min_disk,
                min_ram=min_ram,
            )

            print("[DEBUG] Uploading image data...")
            with open(image_path, 'rb') as image_data:
                conn.image.upload_image(image, image_data)
            
            # Clean up the temporary file
            os.remove(image_path)

            return Response(
                {"message": "Image created successfully", "image_id": image.id},
                status=status.HTTP_201_CREATED
            )
        
        except Exception as e:
            print(f"[ERROR] {str(e)}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class CreateFlavorAPIView(APIView):
    permission_classes = [IsAuthenticated]

    # POST method to create a flavor
    def post(self, request):
        try:
            conn = get_openstack_connection()

            # Extract flavor details from request data
            name = request.data.get("name")
            vcpus = request.data.get("vcpus")
            ram = request.data.get("ram")
            disk = request.data.get("disk")
            
            # Validate the inputs
            if not name or not vcpus or not ram or not disk:
                return Response(
                    {"error": "All fields (name, vcpus, ram, disk) are required"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Check if a flavor with the same name already exists
            existing_flavor = conn.compute.find_flavor(name)
            if existing_flavor:
                return Response(
                    {"error": f"Flavor with name '{name}' already exists"},
                    status=status.HTTP_409_CONFLICT,
                )

            # Create the new flavor
            flavor = conn.compute.create_flavor(
                name=name,
                vcpus=vcpus,
                ram=ram,
                disk=disk
            )

            # Return the created flavor details
            return Response(
                {"message": f"Flavor '{name}' created successfully", "flavor_id": flavor.id},
                status=status.HTTP_201_CREATED,
            )
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


  # DELETE method to delete a flavor
class DeleteFlavorAPIView(APIView):
    permission_classes = [IsAuthenticated]
    # print("delete flavors")
    # DELETE method to delete a flavor
    def delete(self, request):
        try:
            conn = get_openstack_connection()

            # Get the flavor_id from the request data
            flavor_id = request.data.get("flavor_id")
            if not flavor_id:
                return Response(
                    {"error": "Flavor ID is required"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Find the flavor by ID
            flavor = conn.compute.find_flavor(flavor_id)
            if not flavor:
                return Response(
                    {"error": f"Flavor with ID {flavor_id} not found"},
                    status=status.HTTP_404_NOT_FOUND,
                )

            # Delete the flavor
            conn.compute.delete_flavor(flavor)
            return Response(
                {"message": "Flavor deleted successfully"},
                status=status.HTTP_200_OK,
            )
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# Working code for create project
# class CreateProjectAPIView(APIView):
#     """
#     API to create a new project in OpenStack.
#     """
#     permission_classes = [IsAuthenticated, IsAdminUserPermission]

#     def post(self, request):
#         try:
#             conn = get_openstack_connection()

#             # Get the required parameters from the request
#             project_name = request.data.get("project_name")
#             description = request.data.get("description", "New Project")  # Optional description
#             enabled = request.data.get("enabled", True)  # Whether the project is enabled or not

#             # Validate the inputs
#             if not project_name:
#                 return Response(
#                     {"error": "'project_name' is required"},
#                     status=status.HTTP_400_BAD_REQUEST,
#                 )

#             # Check if project already exists
#             existing_project = conn.identity.find_project(project_name)
#             if existing_project:
#                 return Response(
#                     {"error": f"Project '{project_name}' already exists."},
#                     status=status.HTTP_409_CONFLICT,
#                 )

#             # Create the new project
#             project = conn.identity.create_project(
#                 name=project_name, description=description, enabled=enabled
#             )
#             project_id = project.id

#             # Return the response
#             return Response(
#                 {
#                     "message": f"Project '{project_name}' created successfully",
#                     "project_id": project_id,
#                 },
#                 status=status.HTTP_201_CREATED,
#             )

#         except Exception as e:
#             return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)



class CreateProjectAPIView(APIView):
    """
    API to create a new project in OpenStack and assign users and groups.
    """
    permission_classes = [IsAuthenticated, IsAdminUserPermission]

    def post(self, request):
        try:
            conn = get_openstack_connection()

            # Extract parameters
            project_name = request.data.get("project_name")
            description = request.data.get("description", "New Project")
            enabled = request.data.get("enabled", True)
            user_roles = request.data.get("user_roles", [])  # [{ "username": "glance", "role": "member" }]
            group_names = request.data.get("group_names", [])  # ["dev-group", "qa-group"]

            if not project_name:
                return Response({"error": "'project_name' is required"}, status=status.HTTP_400_BAD_REQUEST)

            # Check if project exists
            existing_project = conn.identity.find_project(project_name)
            if existing_project:
                return Response({"error": f"Project '{project_name}' already exists."}, status=status.HTTP_409_CONFLICT)

            # Create project
            project = conn.identity.create_project(
                name=project_name,
                description=description,
                enabled=enabled
            )

            # Assign users to project
            for user_info in user_roles:
                user = conn.identity.find_user(user_info["username"])
                role = conn.identity.find_role(user_info.get("role", "member"))

                if user and role:
                    conn.identity.assign_project_role_to_user(project=project, user=user, role=role)
                else:
                    return Response(
                        {"error": f"Invalid user or role: {user_info}"},
                        status=status.HTTP_400_BAD_REQUEST
                    )

            # Assign groups to project
            for group_name in group_names:
                group = conn.identity.find_group(group_name)
                role = conn.identity.find_role("member")  # default role for group

                if group and role:
                    conn.identity.assign_project_role_to_group(project=project, group=group, role=role)
                else:
                    return Response(
                        {"error": f"Invalid group or role for group: {group_name}"},
                        status=status.HTTP_400_BAD_REQUEST
                    )

            return Response(
                {
                    "message": f"Project '{project_name}' created successfully.",
                    "project_id": project.id
                },
                status=status.HTTP_201_CREATED
            )

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        
class CreateUserAPIView(APIView):
    """
    API to create a new user in OpenStack.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            conn = get_openstack_connection()

            # Extract parameters
            username = request.data.get("username")
            password = request.data.get("password")
            email = request.data.get("email")
            project_id = request.data.get("project_id")
            role = request.data.get("role", "member")  # Default role

            # Validate required fields
            if not username or not password or not email or not project_id:
                return Response(
                    {"error": "'username', 'password', 'email', and 'project_id' are required"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Check if user exists
            existing_user = conn.identity.find_user(username)
            if existing_user:
                return Response(
                    {"error": f"User '{username}' already exists."},
                    status=status.HTTP_409_CONFLICT,
                )

            # Create user
            user = conn.identity.create_user(
                name=username,
                password=password,
                email=email,
                project_id=project_id,
                domain_id="default",
                enabled=True,
            )

            # Assign role
            project = conn.identity.get_project(project_id)
            if not project:
                return Response(
                    {"error": f"Project with ID '{project_id}' not found."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            role_obj = conn.identity.find_role(role)
            if not role_obj:
                return Response(
                    {"error": f"Role '{role}' not found."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # ✅ Correct SDK call
            conn.identity.assign_project_role_to_user(
                project=project,
                user=user,
                role=role_obj
            )

            return Response(
                {
                    "message": f"User '{username}' created and assigned to project '{project.name}'",
                    "user_id": user.id,
                    "project_id": project_id,
                    "role": role,
                },
                status=status.HTTP_201_CREATED,
            )

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)



# ------------------------------10 feb 2025-------------------------

class ListUsersAPIView(APIView):
    """
    API to list all users in OpenStack.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            conn = get_openstack_connection()
            users = conn.identity.users()

            user_list = []
            for user in users:
                user_data = user.to_dict()  # Convert to dictionary to avoid attribute errors
                user_list.append(
                    {
                        "id": user_data.get("id"),
                        "name": user_data.get("name"),
                        "email": user_data.get("email"),
                        "enabled": user_data.get("is_enabled"),  # Corrected attribute
                        "domain_id": user_data.get("domain_id"),
                        "default_project_id": user_data.get("default_project_id"),
                    }
                )

            return Response({"users": user_list}, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class DeleteUserAPIView(APIView):
    """
    API to delete a user in OpenStack.
    """
    permission_classes = [IsAuthenticated]

    def delete(self, request, user_id):
        try:
            conn = get_openstack_connection()

            user = conn.identity.find_user(user_id)
            if not user:
                return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

            conn.identity.delete_user(user)
            return Response({"message": f"User {user_id} deleted successfully"}, status=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class UpdateUserAPIView(APIView):
    """
    API to update user details in OpenStack.
    """
    permission_classes = [IsAuthenticated]

    def patch(self, request, user_id):
        try:
            conn = get_openstack_connection()

            user = conn.identity.find_user(user_id)
            if not user:
                return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

            user_data = user.to_dict()  # Convert to dictionary

            updated_fields = {}
            if "name" in request.data:
                updated_fields["name"] = request.data["name"]
            if "email" in request.data:
                updated_fields["email"] = request.data["email"]
            if "enabled" in request.data:
                updated_fields["is_enabled"] = request.data["enabled"]  # Corrected attribute

            updated_user = conn.identity.update_user(user, **updated_fields)

            return Response(
                {
                    "message": f"User {user_id} updated successfully",
                    "updated_user": {
                        "id": updated_user.id,
                        "name": updated_user.name,
                        "email": updated_user.email,
                        "enabled": updated_user.is_enabled,  # Corrected
                    },
                },
                status=status.HTTP_200_OK,
            )

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class OpenStackImageCreateView(APIView):
    permission_classes = [IsAuthenticated]

    # permission_classes = []
    parser_classes = (MultiPartParser, FormParser)

    def post(self, request, *args, **kwargs):
        file_obj = request.FILES['file']
        image_name = request.data.get('image_name', 'default_image_name')
        file_path = default_storage.save(file_obj.name, file_obj)
        full_path = os.path.join(settings.MEDIA_ROOT, file_path)

        # Establish OpenStack connection
        conn = connection.Connection(
            auth_url=os.getenv('AUTH_URL'),
            project_name=os.getenv('PROJECT_NAME'),
            username='admin',
            password=os.getenv('PASSWORD'),
            user_domain_name=os.getenv('USER_DOMAIN_NAME'),
            project_domain_name=os.getenv('PROJECT_DOMAIN_NAME')
        )

        # Create image in OpenStack
        with open(full_path, 'rb') as image_data:
            conn.image.upload_image(name=image_name, data=image_data, disk_format='qcow2', container_format='bare')

        # Remove the local file after upload
        os.remove(full_path)

        return Response({'message': 'Image created successfully in OpenStack'}, status=status.HTTP_201_CREATED)

    def get(self, request, *args, **kwargs):
        return Response({'message': 'Use POST to upload and create images in OpenStack'})


class CreateNetworkAPIView(APIView):
    """
    API to create a network with a subnet in OpenStack.
    """
    # permission_classes = []  # Add appropriate permissions if needed
    permission_classes = [IsAuthenticated]

    def post(self, request):
        conn = get_openstack_connection()
        if not conn:
            return Response({"error": "Failed to connect to OpenStack"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        try:
            # Parse input data
            network_name = request.data.get("name")
            subnet_name = request.data.get("subnet_name")
            network_address = request.data.get("network_address")
            gateway_ip = request.data.get("gateway_ip")

            # Validate input data
            if not all([network_name, subnet_name, network_address, gateway_ip]):
                return Response(
                    {"error": "All fields (name, subnet_name, network_address, gateway_ip) are required."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Create network
            network = conn.network.create_network(name=network_name, is_shared=True)
            if not network:
                return Response({"error": "Failed to create network."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            # Create subnet
            subnet = conn.network.create_subnet(
                name=subnet_name,
                network_id=network.id,
                cidr=network_address,
                gateway_ip=gateway_ip,
                ip_version=4
            )
            if not subnet:
                # Rollback network if subnet creation fails
                conn.network.delete_network(network.id)
                return Response(
                    {"error": "Failed to create subnet. Network creation rolled back."},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

            # Return success response
            return Response({
                "message": "Network and subnet created successfully.",
                "network": {
                    "id": network.id,
                    "name": network.name,
                    "subnet": {
                        "id": subnet.id,
                        "name": subnet.name,
                        "network_address": subnet.cidr,
                        "gateway_ip": subnet.gateway_ip
                    }
                }
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ---------------------------18 March 2025----------------------------------

# class CreateNetworkAPIViewUpdated(APIView):
#     """
#     API to create a network with a subnet in OpenStack with advanced admin options.
#     """
#     permission_classes = [IsAuthenticated]
    
#     def post(self, request):
#         conn = get_openstack_connection()
#         if not conn:
#             return Response({"error": "Failed to connect to OpenStack"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
#         try:
#             # Parse basic input data
#             network_name = request.data.get("name")
#             project_id = request.data.get("project_id")
            
#             # Provider network options
#             provider_network_type = request.data.get("provider_network_type")  # local, flat, vxlan, vlan
#             physical_network = request.data.get("physical_network")
#             segmentation_id = request.data.get("segmentation_id")
            
#             # Network status and attributes
#             admin_state_up = request.data.get("admin_state_up", True)
#             shared = request.data.get("shared", False)
#             external = request.data.get("external", False)
            
#             # Subnet options
#             create_subnet = request.data.get("create_subnet", True)
#             subnet_name = request.data.get("subnet_name")
#             network_address = request.data.get("network_address")
#             gateway_ip = request.data.get("gateway_ip")
#             disable_gateway = request.data.get("disable_gateway", False)
#             ip_version = request.data.get("ip_version", 4)
#             enable_dhcp = request.data.get("enable_dhcp", True)
            
#             # Validate basic input data
#             if not network_name:
#                 return Response(
#                     {"error": "Network name is required."},
#                     status=status.HTTP_400_BAD_REQUEST
#                 )
            
#             # Validate provider network options based on type
#             if provider_network_type:
#                 if provider_network_type == "flat" and not physical_network:
#                     return Response(
#                         {"error": "Physical network is required for flat provider network type."},
#                         status=status.HTTP_400_BAD_REQUEST
#                     )
#                 elif provider_network_type == "vxlan" and not segmentation_id:
#                     return Response(
#                         {"error": "Segmentation ID is required for VXLAN provider network type."},
#                         status=status.HTTP_400_BAD_REQUEST
#                     )
#                 elif provider_network_type == "vlan" and (not physical_network or not segmentation_id):
#                     return Response(
#                         {"error": "Both physical network and segmentation ID are required for VLAN provider network type."},
#                         status=status.HTTP_400_BAD_REQUEST
#                     )
            
#             # Validate subnet data if subnet creation is requested
#             if create_subnet:
#                 if not all([subnet_name, network_address]):
#                     return Response(
#                         {"error": "Subnet name and network address are required when creating a subnet."},
#                         status=status.HTTP_400_BAD_REQUEST
#                     )
#                 if not disable_gateway and not gateway_ip:
#                     return Response(
#                         {"error": "Gateway IP is required when gateway is not disabled."},
#                         status=status.HTTP_400_BAD_REQUEST
#                     )
            
#             # Prepare network create arguments
#             network_args = {
#                 "name": network_name,
#                 "admin_state_up": admin_state_up,
#                 "shared": shared,
#                 "is_router_external": external
#             }
            
#             # Add project ID if provided
#             if project_id:
#                 network_args["project_id"] = project_id
            
#             # Add provider network options if provided
#             if provider_network_type:
#                 provider_args = {"network_type": provider_network_type}
                
#                 if physical_network:
#                     provider_args["physical_network"] = physical_network
                
#                 if segmentation_id:
#                     provider_args["segmentation_id"] = segmentation_id
                
#                 network_args["provider:network_type"] = provider_args["network_type"]
                
#                 if "physical_network" in provider_args:
#                     network_args["provider:physical_network"] = provider_args["physical_network"]
                
#                 if "segmentation_id" in provider_args:
#                     network_args["provider:segmentation_id"] = provider_args["segmentation_id"]
            
#             # Create network
#             network = conn.network.create_network(**network_args)
            
#             if not network:
#                 return Response({"error": "Failed to create network."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
#             subnet = None
#             # Create subnet if requested
#             if create_subnet:
#                 subnet_args = {
#                     "name": subnet_name,
#                     "network_id": network.id,
#                     "cidr": network_address,
#                     "ip_version": ip_version,
#                     "enable_dhcp": enable_dhcp
#                 }
                
#                 if not disable_gateway:
#                     subnet_args["gateway_ip"] = gateway_ip
                
#                 subnet = conn.network.create_subnet(**subnet_args)
                
#                 if not subnet:
#                     # Rollback network if subnet creation fails
#                     conn.network.delete_network(network.id)
#                     return Response(
#                         {"error": "Failed to create subnet. Network creation rolled back."},
#                         status=status.HTTP_500_INTERNAL_SERVER_ERROR
#                     )
            
#             # Prepare response
#             response_data = {
#                 "message": "Network created successfully.",
#                 "network": {
#                     "id": network.id,
#                     "name": network.name,
#                     "provider_network_type": provider_network_type if provider_network_type else "local",
#                     "physical_network": physical_network,
#                     "segmentation_id": segmentation_id,
#                     "admin_state_up": admin_state_up,
#                     "shared": shared,
#                     "external": external,
#                     "project_id": network.project_id
#                 }
#             }
            
#             if subnet:
#                 response_data["message"] = "Network and subnet created successfully."
#                 response_data["network"]["subnet"] = {
#                     "id": subnet.id,
#                     "name": subnet.name,
#                     "network_address": subnet.cidr,
#                     "gateway_ip": subnet.gateway_ip if not disable_gateway else None,
#                     "ip_version": subnet.ip_version,
#                     "enable_dhcp": subnet.enable_dhcp
#                 }
            
#             return Response(response_data, status=status.HTTP_201_CREATED)
            
#         except Exception as e:
#             return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class CreateNetworkAPIViewUpdated(APIView):
    """
    API to create a network with a subnet in OpenStack with advanced admin options.
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        conn = get_openstack_connection()
        if not conn:
            return Response({"error": "Failed to connect to OpenStack"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        try:
            # Parse basic input data
            network_name = request.data.get("name")
            project_id = request.data.get("project_id")
            
            # Provider network options
            provider_network_type = request.data.get("provider_network_type")  # local, flat, vxlan, vlan
            physical_network = request.data.get("physical_network")
            segmentation_id = request.data.get("segmentation_id")
            
            # Network status and attributes
            admin_state_up = request.data.get("admin_state_up", True)
            shared = request.data.get("shared", False)
            external = request.data.get("external", False)
            
            # Subnet options
            create_subnet = request.data.get("create_subnet", True)
            subnet_name = request.data.get("subnet_name")
            network_address = request.data.get("network_address")
            gateway_ip = request.data.get("gateway_ip")
            disable_gateway = request.data.get("disable_gateway", False)
            ip_version = request.data.get("ip_version", 4)
            enable_dhcp = request.data.get("enable_dhcp", True)
            
            # Validate input data
            if not network_name:
                return Response({"error": "Network name is required."}, status=status.HTTP_400_BAD_REQUEST)
            
            # Check if the network already exists
            existing_networks = list(conn.network.networks())
            for network in existing_networks:
                if network.name == network_name:
                    return Response({"error": "Network name already exists."}, status=status.HTTP_409_CONFLICT)
            
            # Validate provider network options
            if provider_network_type:
                if provider_network_type == "flat" and not physical_network:
                    return Response({"error": "Physical network is required for flat provider network type."}, status=status.HTTP_400_BAD_REQUEST)
                elif provider_network_type == "vxlan" and not segmentation_id:
                    return Response({"error": "Segmentation ID is required for VXLAN provider network type."}, status=status.HTTP_400_BAD_REQUEST)
                elif provider_network_type == "vlan" and (not physical_network or not segmentation_id):
                    return Response({"error": "Both physical network and segmentation ID are required for VLAN provider network type."}, status=status.HTTP_400_BAD_REQUEST)
            
            # Validate subnet data if subnet creation is requested
            if create_subnet:
                if not all([subnet_name, network_address]):
                    return Response({"error": "Subnet name and network address are required when creating a subnet."}, status=status.HTTP_400_BAD_REQUEST)
                if not disable_gateway and not gateway_ip:
                    return Response({"error": "Gateway IP is required when gateway is not disabled."}, status=status.HTTP_400_BAD_REQUEST)
            
            # Prepare network create arguments
            network_args = {
                "name": network_name,
                "admin_state_up": admin_state_up,
                "shared": shared,
                "is_router_external": external
            }
            
            if project_id:
                network_args["project_id"] = project_id
            
            if provider_network_type:
                provider_args = {"network_type": provider_network_type}
                if physical_network:
                    provider_args["physical_network"] = physical_network
                if segmentation_id:
                    provider_args["segmentation_id"] = segmentation_id
                
                network_args["provider:network_type"] = provider_args["network_type"]
                if "physical_network" in provider_args:
                    network_args["provider:physical_network"] = provider_args["physical_network"]
                if "segmentation_id" in provider_args:
                    network_args["provider:segmentation_id"] = provider_args["segmentation_id"]
            
            # Create network
            network = conn.network.create_network(**network_args)
            if not network:
                return Response({"error": "Failed to create network."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            subnet = None
            # Create subnet if requested
            if create_subnet:
                subnet_args = {
                    "name": subnet_name,
                    "network_id": network.id,
                    "cidr": network_address,
                    "ip_version": ip_version,
                    "enable_dhcp": enable_dhcp
                }
                if not disable_gateway:
                    subnet_args["gateway_ip"] = gateway_ip
                
                subnet = conn.network.create_subnet(**subnet_args)
                # print(vars(subnet))

                
                if not subnet:
                    conn.network.delete_network(network.id)
                    return Response({"error": "Failed to create subnet. Network creation rolled back."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            # Prepare response
            response_data = {
                "message": "Network created successfully.",
                "network": {
                    "id": network.id,
                    "name": network.name,
                    "provider_network_type": provider_network_type if provider_network_type else "local",
                    "physical_network": physical_network,
                    "segmentation_id": segmentation_id,
                    "admin_state_up": admin_state_up,
                    "shared": shared,
                    "external": external,
                    "project_id": network.project_id
                }
            }
            
            if subnet:
                response_data["message"] = "Network and subnet created successfully."
                response_data["network"]["subnet"] = {
                    "id": subnet.id,
                    "name": subnet.name,
                    "network_address": subnet.cidr,
                    "gateway_ip": subnet.gateway_ip if not disable_gateway else None,
                    "ip_version": subnet.ip_version,
                    "enable_dhcp": subnet.is_dhcp_enabled if hasattr(subnet, 'is_dhcp_enabled') else enable_dhcp
                }
            
            return Response(response_data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# --------------------------10 Dec 2024---------------------------------

class ListNetworksAPIView(APIView):
    """
    API to list networks in OpenStack with full details.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        conn = get_openstack_connection()
        
        if not conn:
            return Response({"error": "Failed to connect to OpenStack"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        try:
            # Optional name filter
            network_name = request.query_params.get('name', None)

            # List networks
            if network_name:
                networks = list(conn.network.networks(name=network_name))
            else:
                networks = list(conn.network.networks())

            if not networks:
                return Response({"error": "No networks found"}, status=status.HTTP_404_NOT_FOUND)

            network_data = []

            for network in networks:
                # Get subnets info
                subnets = []
                for subnet_id in network.subnet_ids:
                    try:
                        subnet = conn.network.get_subnet(subnet_id)
                        subnets.append(subnet.name)
                    except Exception:
                        subnets.append(subnet_id)  # fallback to ID

                # Get DHCP agents associated
                try:
                    dhcp_agents = [agent.name for agent in conn.network.dhcp_agents(hosting_network=network.id)]
                except Exception:
                    dhcp_agents = []

                # Get availability zones (OpenStack networks usually belong to regions)
                try:
                    azs = [az['name'] for az in conn.network.availability_zones()]
                except Exception:
                    azs = []

                # Get project info
                try:
                    project = conn.identity.get_project(network.project_id)
                    project_name = project.name
                except Exception:
                    project_name = network.project_id

                network_data.append({
                    "project": project_name,
                    "network_name": network.name,
                    "subnets": subnets,
                    "dhcp_agents": dhcp_agents,
                    "shared": network.is_shared,
                    "external": network.is_router_external,
                    "status": network.status,
                    "admin_state_up": network.is_admin_state_up,
                    "availability_zones": azs,
                    "id": network.id  # Include ID for actions like edit/delete
                })

            return Response(network_data, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class DeleteNetworkAPIView(APIView):
    """
    API to delete a network in OpenStack.
    """
    # permission_classes = []  # Add appropriate permissions if needed
    permission_classes = [IsAuthenticated]

    def delete(self, request, network_id):
        conn = get_openstack_connection()
        if not conn:
            return Response({"error": "Failed to connect to OpenStack"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        try:
            # Fetch the network by ID
            network = conn.network.get_network(network_id)
            if not network:
                return Response({"error": "Network not found"}, status=status.HTTP_404_NOT_FOUND)

            # Delete the network
            conn.network.delete_network(network)
            return Response({"message": f"Network {network_id} deleted successfully"}, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({"error": f"Failed to delete network: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# class EditNetworkAndSubnetAPIView(APIView):
#     """
#     API to edit a network and its subnet in OpenStack.
#     """
#     # permission_classes = []  # Add appropriate permissions if needed
#     permission_classes = [IsAuthenticated]

#     def put(self, request, network_id):
#         conn = get_openstack_connection()
#         if not conn:
#             return Response({"error": "Failed to connect to OpenStack"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

#         try:
#             # Get data from the request
#             network_name = request.data.get('network_name')
#             is_shared = request.data.get('is_shared', False)
#             subnet_name = request.data.get('subnet_name')
#             gateway_ip = request.data.get('gateway_ip')
#             cidr = request.data.get('cidr')

#             # Fetch the network to be updated
#             network = conn.network.find_network(network_id)
#             if not network:
#                 return Response({"error": "Network not found"}, status=status.HTTP_404_NOT_FOUND)

#             # Update network details
#             updated_network = conn.network.update_network(
#                 network,
#                 name=network_name,
#                 is_shared=is_shared
#             )

#             # Fetch existing subnets for the network
#             subnets = list(conn.network.subnets(network_id=network.id))

#             if subnets:
#                 # Check if the subnet CIDR is different, and recreate the subnet if necessary
#                 subnet = subnets[0]
#                 if subnet.cidr != cidr:
#                     # Delete the existing subnet
#                     conn.network.delete_subnet(subnet)

#                     # Create a new subnet with the updated CIDR
#                     new_subnet = conn.network.create_subnet(
#                         network_id=network.id,
#                         name=subnet_name,
#                         cidr=cidr,
#                         gateway_ip=gateway_ip,
#                         ip_version=4
#                     )
#                     subnet_message = "Subnet CIDR updated, new subnet created."
#                 else:
#                     # Update the subnet attributes that are allowed to be modified (like gateway_ip)
#                     updated_subnet = conn.network.update_subnet(
#                         subnet,
#                         name=subnet_name,
#                         gateway_ip=gateway_ip
#                     )
#                     subnet_message = "Existing subnet updated successfully"
#             else:
#                 # Create a new subnet if no subnet exists for the network
#                 if not cidr or not gateway_ip:
#                     return Response({"error": "CIDR and Gateway IP are required to create a new subnet"}, status=status.HTTP_400_BAD_REQUEST)

#                 new_subnet = conn.network.create_subnet(
#                     network_id=network.id,
#                     name=subnet_name,
#                     cidr=cidr,
#                     gateway_ip=gateway_ip,
#                     ip_version=4
#                 )
#                 subnet_message = "New subnet created successfully"

#             return Response({
#                 "message": "Network and subnet updated successfully",
#                 "network": {
#                     "id": updated_network.id,
#                     "name": updated_network.name,
#                     "is_shared": updated_network.is_shared
#                 },
#                 "subnet_message": subnet_message,
#             }, status=status.HTTP_200_OK)

#         except Exception as e:
#             return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
class EditNetworkAndSubnetAPIView(APIView):
    """
    API to edit a network and its subnet in OpenStack.
    """
    permission_classes = [IsAuthenticated]

    def put(self, request, network_id):
        conn = get_openstack_connection()
        if not conn:
            return Response({"error": "Failed to connect to OpenStack"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        try:
            # Get data from the request
            network_name = request.data.get('network_name')
            is_shared = request.data.get('is_shared', None)  # Optional update
            subnet_name = request.data.get('subnet_name')
            gateway_ip = request.data.get('gateway_ip')
            cidr = request.data.get('cidr')

            # Fetch the network to be updated
            network = conn.network.find_network(network_id)
            if not network:
                return Response({"error": "Network not found"}, status=status.HTTP_404_NOT_FOUND)

            # Handle is_shared update
            if is_shared is not None and is_shared != network.is_shared:
                # Check if the network is being used by multiple tenants
                if network.is_shared:
                    return Response(
                        {"error": f"Network '{network.name}' is shared by multiple tenants and cannot be updated."},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                elif is_shared:
                    return Response(
                        {"error": f"Changing the sharing state to shared is restricted for network '{network.name}'."},
                        status=status.HTTP_400_BAD_REQUEST
                    )

            # Update network details
            updated_network = conn.network.update_network(
                network,
                name=network_name,
            )

            # Fetch existing subnets for the network
            subnets = list(conn.network.subnets(network_id=network.id))

            if subnets:
                # Handle existing subnet
                subnet = subnets[0]

                # Check if the subnet is shared with other networks
                # if subnet.shared:
                #     return Response(
                #         {"error": f"Subnet '{subnet.name}' is shared with other networks and cannot be updated."},
                #         status=status.HTTP_400_BAD_REQUEST
                #     )

                # Check if the subnet CIDR is different, and recreate the subnet if necessary
                if subnet.cidr != cidr:
                    # Delete the existing subnet
                    conn.network.delete_subnet(subnet)

                    # Create a new subnet with the updated CIDR
                    new_subnet = conn.network.create_subnet(
                        network_id=network.id,
                        name=subnet_name,
                        cidr=cidr,
                        gateway_ip=gateway_ip,
                        ip_version=4
                    )
                    subnet_message = "Subnet CIDR updated, new subnet created."
                else:
                    # Update the subnet attributes that are allowed to be modified (like gateway_ip)
                    updated_subnet = conn.network.update_subnet(
                        subnet,
                        name=subnet_name,
                        gateway_ip=gateway_ip
                    )
                    subnet_message = "Existing subnet updated successfully"
            else:
                # Create a new subnet if no subnet exists for the network
                if not cidr or not gateway_ip:
                    return Response(
                        {"error": "CIDR and Gateway IP are required to create a new subnet"},
                        status=status.HTTP_400_BAD_REQUEST
                    )

                new_subnet = conn.network.create_subnet(
                    network_id=network.id,
                    name=subnet_name,
                    cidr=cidr,
                    gateway_ip=gateway_ip,
                    ip_version=4
                )
                subnet_message = "New subnet created successfully"

            return Response({
                "message": "Network and subnet updated successfully",
                "network": {
                    "id": updated_network.id,
                    "name": updated_network.name,
                    "is_shared": updated_network.is_shared
                },
                "subnet_message": subnet_message,
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

#--------------------Login-------------------------

# from rest_framework.response import Response
# from rest_framework.views import APIView
# from .serializers import LoginSerializer

# class LoginView(APIView):
#     def post(self, request):
#         serializer = LoginSerializer(data=request.data)
#         serializer.is_valid(raise_exception=True)
#         return Response(serializer.validated_data)

from rest_framework_simplejwt.views import TokenObtainPairView
from .serializers import CustomTokenObtainPairSerializer


# class CustomTokenObtainPairView(TokenObtainPairView):
#     permission_classes = []
#     serializer_class = CustomTokenObtainPairSerializer

class CustomTokenObtainPairView(TokenObtainPairView):
    permission_classes = []
    # serializer_class = None
    serializer_class = CustomTokenObtainPairSerializer
    
    TEST_MODE_ALLOW_ANY_OTP = True

# ---------------------- COOKIE HELPER ----------------------
    def _set_auth_cookies(self, response, access_token_str, refresh_token_str=None, user_data=None):
        """Helper to set both access, refresh, and user_data cookies."""
        # Access cookie
        response.set_cookie(
            getattr(settings, 'ACCESS_COOKIE_NAME', 'MDSID'),
            access_token_str,
            max_age=getattr(settings, 'ACCESS_COOKIE_AGE', 15 * 60),
            httponly=getattr(settings, 'ACCESS_COOKIE_HTTPONLY', True),
            secure=getattr(settings, 'ACCESS_COOKIE_SECURE', False),
            samesite=getattr(settings, 'ACCESS_COOKIE_SAMESITE', 'Lax'),
            path=getattr(settings, 'ACCESS_COOKIE_PATH', '/'),
        )

        # Refresh cookie
        if refresh_token_str:
            response.set_cookie(
                getattr(settings, 'REFRESH_COOKIE_NAME', 'MDAUTH'),
                refresh_token_str,
                max_age=getattr(settings, 'REFRESH_COOKIE_AGE', 20 * 60),
                httponly=getattr(settings, 'REFRESH_COOKIE_HTTPONLY', True),
                secure=getattr(settings, 'REFRESH_COOKIE_SECURE', False),
                samesite=getattr(settings, 'REFRESH_COOKIE_SAMESITE', 'Lax'),
                path=getattr(settings, 'REFRESH_COOKIE_PATH', '/'),
            )
# Readable user_data cookie for frontend
        if user_data:
            response.set_cookie(
                "UD",
                urllib.parse.quote(json.dumps(user_data)),
                max_age=getattr(settings, 'REFRESH_COOKIE_AGE', 20 * 60),
                httponly=False,  # must be readable by JS
                secure=getattr(settings, 'REFRESH_COOKIE_SECURE', False),
                samesite=getattr(settings, 'REFRESH_COOKIE_SAMESITE', 'Lax'),
                path="/",
            )
        return response
# ---------------------- OTP GENERATION & EMAIL ----------------------
    def generate_otp(self):
        secret = pyotp.random_base32()
        totp = pyotp.TOTP(secret, interval=300)  # 5 minutes validity
        otp = totp.now()
        print(f"DEBUG 🔢 Generated OTP: {otp} (valid 5 min)")
        return otp, secret

    def send_otp_email(self, email, otp, username):
        
        subject = "Your Meghdoot CMP Login Verification Code"
        message = f'''Dear {username},

        Your One-Time Password (OTP) to access the Meghdoot CMP Dashboard is: **{otp}**

        This code is valid for **5 minutes** and can be used only once.

        ⚠️ For your security, please do not share this OTP with anyone. 
        The Meghdoot CMP team will never ask for your OTP or password.

        If you did not request this login, please ignore this message.

        Best regards,  
        Meghdoot CMP Security Team'''

                
        try:
            print(f"DEBUG send_otp_email() got email --> [{email}]")
            send_mail(
                subject=subject,
                message=message,
                from_email=settings.EMAIL_HOST_USER,
                recipient_list=[email],
                fail_silently=False
            )
            print(f"OTP email sent successfully to {email}")
            return True
        except Exception as e:
            print(f"Error sending OTP email: {e}")
            return False
        

    # ---------------------- MAIN POST METHOD ----------------------

    def post(self, request, *args, **kwargs):
        encoded_username = request.data.get('username')
        encoded_password = request.data.get('password')
        otp = request.data.get('otp')
        resend_otp = request.data.get('resend_otp')
        
    # --- Decode Base64 credentials safely ---
        try:
            username = (
                base64.b64decode(encoded_username).decode('utf-8')
                if encoded_username else None
            )
            password = (
                base64.b64decode(encoded_password).decode('utf-8')
                if encoded_password else None
            )
            print(f"DEBUG 🔐 Decoded username: {username}, password: {'*' * len(password) if password else None}")
        except (binascii.Error, UnicodeDecodeError) as e:
            print(f"ERROR ⚠️ Failed to decode credentials: {e}")
            return Response({'detail': 'Invalid encoded credentials'}, status=400)
        
        
        # ====================================================
        # ✅ Input Validation Section
        # ====================================================
        if not username:
            return Response({'error': 'Username is required'}, status=400)
        
        # --- Username (email format) ---
        email_pattern = r"^[A-Za-z0-9._%+-]+@cdac\.in$"
        if username and not re.match(email_pattern, username):
            return Response({'error': 'Username must be a valid CDAC email (e.g., user@cdac.in).'}, status=400)

        # --- Password strength ---
        password_pattern = r'^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{6,}$'
        if password and not re.match(password_pattern, password):
            return Response({
                'error': (
                    'Password must be at least 6 characters long, '
                    'contain one uppercase letter, one number, and one special character.'
                )
            }, status=400)

        # --- OTP (must be 6 digits) ---
        if otp and not re.fullmatch(r'\d{6}', otp):
            return Response({'error': 'OTP must be exactly 6 digits.'}, status=400)

        # ---------- OTP RESEND ----------
        if resend_otp:
            stored_data = cache.get(f'credentials_{username}')
            if not stored_data:
                return Response({'error': 'No active session found. Please login again.'},
                                status=status.HTTP_400_BAD_REQUEST)

            otp, secret = self.generate_otp()
            user = authenticate(username=username, password=stored_data['password'])
            recipient_email = "ptejas@cdac.in" if username.lower() == "admin" else user.email
            self.send_otp_email(recipient_email, otp, username)

            cache.set(f'otp_{username}', {
                'otp': otp,
                'secret': secret,
                'credentials': stored_data
            }, timeout=300)

            return Response({
                'message': 'New OTP generated successfully',
                'username': username,
                'require_otp': True,
                'test_otp': otp  # REMOVE in production
            })

        # ---------- OTP VERIFICATION ----------
        # if otp:
        #     stored_data = cache.get(f'otp_{username}')
        #     if not stored_data:
        #         return Response({'detail': 'OTP expired or invalid'}, status=status.HTTP_400_BAD_REQUEST)

        #     if otp != stored_data['otp']:
        #         return Response({'detail': 'Invalid OTP. Please try again.'}, status=status.HTTP_400_BAD_REQUEST)

        # ----------Test OTP VERIFICATION ----------
        if otp:
            stored_data = cache.get(f'otp_{username}')
            if not stored_data:
                return Response({'detail': 'OTP expired or invalid'}, status=status.HTTP_400_BAD_REQUEST)

            # TEST MODE: Allow ANY OTP
            if getattr(settings, 'OTP_TEST_MODE', False):
                print("⚠️ SECURITY WARNING: OTP validation bypassed from settings.")
            else:
                if otp != stored_data['otp']:
                    return Response({'detail': 'Invalid OTP. Please try again.'}, status=status.HTTP_400_BAD_REQUEST)

            # ✅ OTP correct — delete cache and authenticate
            cache.delete(f'otp_{username}')
            cache.delete(f'credentials_{username}')
            # OTP correct — continue to generate tokens
            try:
                request.data.update(stored_data['credentials'])
                response = super().post(request, *args, **kwargs)
            except Exception as e:
                if settings.DEBUG:
                    print("ERROR generating tokens:", e)
                return Response({'detail': 'Failed to generate tokens.'}, status=500)
            # Check the token_response
            if response.status_code != 200:
                return response
            
            access = response.data.get('access')
            refresh = response.data.get('refresh')

            # Authenticate user object and attach user_data cookie
            from django.contrib.auth import get_user_model
            User = get_user_model()
            try:

                user = authenticate(username=username, password=stored_data['credentials']['password'])
                if user is None:
                    return Response({'detail': 'Authentication failed after OTP.'}, status=401)
            except Exception:
                return Response({'detail': 'Authentication failed.'}, status=401)
            
            # Use the same serializer logic
            serializer = CustomTokenObtainPairSerializer()
            token = serializer.get_token(user)
            
            user_data = {
            "username": user.username,
            "email": user.email,
            "role": token['role'],          # Uses same logic as serializer
            "employee_id": token.get('employee_id')
            }
            print(f"DEBUG 🧾 user_data being sent in cookie: {user_data}")

        # Clean response body and set cookies
            response.data = {"detail": "Login successful"}
            self._set_auth_cookies(response, access, refresh, user_data)
            return response

          

        # ---------- Handle initial login (username/password) ----------

        if not password:
            return Response({'error': 'Password is required'}, status=400)

        user = authenticate(username=username, password=password)
        if not user:
            # CLEARLY return 401 with message (no token code should be reached)
            return Response({'error': 'Invalid username or password'}, status=401)

        cache.set(f'credentials_{username}', {'username': username, 'password': password}, timeout=300)

        otp, secret = self.generate_otp()
        self.send_otp_email(user.email, otp, username)

        cache.set(f'otp_{username}', {
            'otp': otp,
            'secret': secret,
            'credentials': {'username': username, 'password': password}
        }, timeout=300)

        return Response({
            'message': 'OTP generated successfully',
            'username': username,
            'require_otp': True,
            'test_otp': otp  # REMOVE in production!
        }, status=status.HTTP_200_OK)
#------------------Cookie----------------------------------

class CookieTokenRefreshView(APIView):
    permission_classes = []
    authentication_classes = []

    def post(self, request):
        refresh_cookie_name = getattr(settings, 'REFRESH_COOKIE_NAME', 'MDAUTH')
        refresh_token = request.COOKIES.get(refresh_cookie_name)
        if not refresh_token:
            print("DEBUG ❌ No refresh token cookie found")
            return Response({'detail': 'No refresh token cookie found.'}, status=status.HTTP_401_UNAUTHORIZED)
        print(f"DEBUG 🧩 Raw Refresh Token: {refresh_token[:50]}...")
        try:
            # ✅ Step 1: Decode refresh token payload manually
            decoded_payload = jwt.decode(
                refresh_token,
                settings.SECRET_KEY,
                algorithms=["HS256"],
            )
            print(f"DEBUG 🔍 Decoded Refresh Token Payload: {decoded_payload}")

            # ✅ Step 2: Get user_id from payload and fetch from DB
            user_id = decoded_payload.get("user_id")
            if not user_id:
                return Response({'detail': 'Invalid token payload.'}, status=status.HTTP_400_BAD_REQUEST)

            from django.contrib.auth import get_user_model
            User = get_user_model()
            try:
                user = User.objects.get(id=user_id)
            except User.DoesNotExist:
                return Response({'detail': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

            # ✅ Step 3: Generate new tokens
            serializer = CustomTokenObtainPairSerializer()
            custom_token = serializer.get_token(user)
            access_token = str(custom_token.access_token)  # This preserves custom claims
            refresh_token = str(custom_token)   # Optional: use this if rotating refresh tokens

            user_data = {
                "username": user.username,
                "email": user.email,
                "role": custom_token.get('role'),
                "employee_id": custom_token.get('employee_id'),
            }

            # ✅ Step 5: Build response with cookies
            response = Response({'detail': 'Token refreshed successfully'}, status=status.HTTP_200_OK)
            CustomTokenObtainPairView()._set_auth_cookies(response, access_token, refresh_token, user_data)

            print("DEBUG ✅ Set new cookies successfully for:", user.username)
            return response

        except TokenError as e:
            print(f"DEBUG ❌ TokenError: {e}")
            return Response({'detail': 'Invalid or expired refresh token.'}, status=status.HTTP_401_UNAUTHORIZED)

        except Exception as e:
            print(f"DEBUG 💥 Unexpected error during refresh: {e}")
            return Response({'detail': 'Internal server error.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        

from django.shortcuts import redirect
   


def helpdesk_redirect(request):
    if not request.user.is_authenticated:
        return redirect("/")

    role = get_user_role(request.user)

    if role == "admin":
        return redirect("/helpdesk/dashboard/")
    else:
        return redirect("/helpdesk/tickets/submit/")
        
# =========================================================
# Logout View (Deletes Cookies + Optional Blacklist)
# =========================================================
class LogoutView(APIView):
    permission_classes = []
    authentication_classes = []

    def post(self, request):
        response = Response({'message': 'Logged out successfully'}, status=status.HTTP_204_NO_CONTENT)

        # Delete cookies
        response.delete_cookie('MDSID', path='/')
        response.delete_cookie('MDAUTH', path='/')
        response.delete_cookie('UD', path='/')

        # Optional: Blacklist refresh token
        refresh_token = request.COOKIES.get('MDAUTH')
        if refresh_token:
            try:
                token = RefreshToken(refresh_token)
                token.blacklist()  # Works only if blacklist app is enabled
            except Exception:
                pass

        return response
    
# ------------------------Forgot Password-----------------------

class ForgotPasswordView(APIView):
    permission_classes = []

    def post(self, request):
        email = request.data.get("email")
        if not email:
            return Response({"error": "Email is required"}, status=400)

        user = authenticate(username=email, password=None)

        from django.contrib.auth import get_user_model

        User = get_user_model()

        try:
            user = User.objects.get(username=email)
        except User.DoesNotExist:
            return Response({"error": "No account found with this email."}, status=404)

        otp, secret = CustomTokenObtainPairView().generate_otp()
        print(f"🔐 Password Reset OTP for {email} → {otp}, secret: {secret}")
        CustomTokenObtainPairView().send_otp_email(user.email, otp, user.username)

        cache.set(f"reset_otp_{email}", {
            "otp": otp,
            "secret": secret
        }, timeout=300)

        return Response({
            "message": "OTP sent to your email for password reset.",
            "require_otp": True
        }, status=200)


class ResetPasswordView(APIView):
    permission_classes = []

    def post(self, request):
        email = request.data.get("email")
        otp = request.data.get("otp")
        new_password = request.data.get("new_password")
        confirm_password = request.data.get("confirm_password")

        if not (email and otp and new_password and confirm_password):
            return Response({"error": "All fields are required"}, status=400)

        if new_password != confirm_password:
            return Response({"error": "Passwords do not match"}, status=400)

        if not re.fullmatch(r'\d{6}', otp):
            return Response({"error": "OTP must be 6 digits"}, status=400)

        stored_data = cache.get(f"reset_otp_{email}")
        if not stored_data:
            return Response({"error": "OTP expired or invalid"}, status=400)

        if getattr(settings, 'OTP_TEST_MODE', False) is False:
            if otp != stored_data["otp"]:
                return Response({"error": "Invalid OTP"}, status=400)

        # OK → Update password
        from django.contrib.auth import get_user_model
        User = get_user_model()
        try:
            user = User.objects.get(username=email)
        except User.DoesNotExist:
            return Response({"error": "Invalid email"}, status=404)

        user.set_password(new_password)  # <- securely updates password
        user.save()

        # Remove OTP
        cache.delete(f"reset_otp_{email}")

        return Response({"message": "Password reset successful!"}, status=200)


# ------------------------12 Dec 2024-----------------------

class ListVolumesAPIView(APIView):
    """
    API to list all volumes in OpenStack.
    """
    permission_classes = []  # Add permissions as needed

    def get(self, request):
        conn = get_openstack_connection()
        if not conn:
            return Response({"error": "Failed to connect to OpenStack"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        try:
            # Get the 'name' query parameter if provided
            volume_name = request.query_params.get('name', None)

            # Fetch volumes
            if volume_name:
                # If 'name' is provided, filter volumes by name
                volumes = list(conn.block_storage.volumes(details=True, name=volume_name))
            else:
                # Fetch all volumes
                volumes = list(conn.block_storage.volumes(details=True))

            # If no volumes found
            if not volumes:
                return Response({"error": "No volumes found"}, status=status.HTTP_404_NOT_FOUND)

            # Prepare response data
            volume_data = [
                {
                    "id": volume.id,
                    "name": volume.name,
                    "status": volume.status,
                    "size": volume.size,
                    "description": volume.description,
                    "created_at": volume.created_at,
                    "attachments": volume.attachments
                }
                for volume in volumes
            ]

            return Response(volume_data, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)




# class VmRequestAPIView(APIView):
#     permission_classes = []  # Add permissions as needed

#     def get(self, request):
#         """
#         Fetch all VM request details
#         """
#         try:
#             vm_requests = VmRequest.objects.all()
#             serializer = VmRequestSerializer(vm_requests, many=True)
#             return Response(serializer.data, status=status.HTTP_200_OK)
#         except Exception as e:
#             return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

#     def post(self, request):
#         """
#         Store VM request details in the database
#         """
#         try:
#             serializer = VmRequestSerializer(data=request.data)
#             if serializer.is_valid():
#                 serializer.save()
#                 return Response({"message": "VM request stored successfully!", "data": serializer.data}, status=status.HTTP_201_CREATED)
#             return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
#         except Exception as e:
#             return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        

class VmRequestAPIView(APIView):
    permission_classes = [IsAuthenticated]  # Add permissions as needed

    def get(self, request):
        """
        Fetch all VM request details
        """
        try:
            role = request.auth.get('role', None)
            employee_id = request.auth.get('employee_id', None)
            
            if role == 'ADMIN':
                vm_requests = VmRequest.objects.all()
            elif role == 'FLA':
                employee_ids = Employee.objects.filter(fla_employee_id=employee_id).values_list('employee_id', flat=True)
                vm_requests = VmRequest.objects.filter(employee_id__in=employee_ids) | VmRequest.objects.filter(employee_id=employee_id)
            else:
                vm_requests = VmRequest.objects.filter(employee_id=Employee.objects.get(email=request.user))
            
            # Implement pagination
            page = int(request.GET.get('page', 1))
            size = int(request.GET.get('size', 1))
            total_records = vm_requests.count()
            start = (page - 1) * size
            end = start + size
            vm_requests = vm_requests[start:end]
            serializer = VmRequestSerializer(vm_requests, many=True)
            return Response(
                {
                    "totalRecords": total_records,
                    "page": page,
                    "size": size,
                    "data": serializer.data
                },
                status=status.HTTP_200_OK
            )
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def post(self, request):
        """
        Store VM request details in the database
        """
        try:
            role = request.auth.get('role', None)
            # Extract only the allowed fields from the request data
            allowed_fields = [
                "employee_id",
                "count_of_vms",
                "vm_name",
                "purpose",
                "project_name",
                "vdi_required",
                "designation",
                "image",
                "flavor",
                "login_enable_date",
                "login_disable_date",
                "login_enable_time",
                "login_disable_time",
                "storage_required",
                "additional_storage",
                "name",  # New field
                "email",  # New field
                "purpose_of_request",  # New field
            ]
            data = {key: value for key, value in request.data.items() if key in allowed_fields}

            # Add default values for admin_status and fla_status
            data["admin_status"] = "Pending"
            data["fla_status"] = "Accepted" if role == "FLA" else "Pending"
            
            # Add timestamp for request creation
            data["request_timestamp"] = timezone.now()
            data["fla_approved_timestamp"] = None
            data["admin_approved_timestamp"] = None
            
            print("vm-name before concat---->",data['vm_name'])

            data["vm_name"] = f"{data['employee_id']}_{data['vm_name']}"  # Concatenate employee_id and vm_name
            print("vm-name---->",data['vm_name'])
            # Serialize and save the data
            serializer = VmRequestSerializer(data=data)
            if serializer.is_valid():
                serializer.save()
                vm_name = f"{data['vm_name']}"  # Concatenate employee_id and vm_name
                print("vm-name---->",vm_name)
                
                # VMInfo.objects.create(
                # vm_name=vm_name,
                # vm_access_from_date=data.get("login_enable_date"),
                # vm_access_to_date=data.get("login_disable_date"),
                # vm_access_from_time=data.get("login_enable_time"),
                # vm_access_to_time=data.get("login_disable_time"),
                # email=request.user.email,  # Assuming `request.user` has an `email` attribute
                # creation_status="Requested"
                # )
                # print("SAVED TO VMInfo MODEL")
                
                
                employee = Employee.objects.get(employee_id=data["employee_id"])
                mail_data = {
                            'name': employee.name,
                                'email': employee.email,
                                    'fla_name': employee.fla_name,
                                        'fla_email': employee.fla_email
                            }
                
                print("mail_data---->",mail_data)
                subject = 'VM creation Request'
                message = f'Dear {employee.fla_name},\n\nVm request has been raised by {employee.name}\n\nKindly approve the request.\n\nThanks & Regards \n\nCloud Team'
                from_email = 'rakshanavg20@gmail.com'
                to_email = [employee.fla_email]
                
                try:
                    # send_mail(subject, message, from_email, to_email, fail_silently=False)
                    print("email sent successfully on request",data['vm_name'])
                except Exception as e:
                    print(f"Error in sending email: {e}")
                    
                    
                return Response(
                    {"message": "VM request stored successfully!", "data": serializer.data},
                    status=status.HTTP_201_CREATED,
                )
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)




# -------------------------13 Feb 2025 ----------------------------
class VmRequestUpdateAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def put(self, request, request_id):
        """
        Update VM request details if the FLA status is pending.
        """
        try:
            vm_request = VmRequest.objects.get(id=request_id)

            # Check if FLA status is already accepted
            if vm_request.fla_status == "Accepted":
                return Response(
                    {"message": "Already approved by FLA, updates not allowed."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Check if Admin & FLA status are still Pending
            if vm_request.admin_status == "Pending" and vm_request.fla_status == "Pending":
                allowed_fields = [
                    "vm_name", "purpose", "project_name", "vdi_required", "designation",
                    "image", "flavor", "login_enable_date", "login_disable_date",
                    "login_enable_time", "login_disable_time", "storage_required",
                    "additional_storage", "name", "email", "purpose_of_request"
                ]
                data = {key: value for key, value in request.data.items() if key in allowed_fields}

                serializer = VmRequestSerializer(vm_request, data=data, partial=True)
                if serializer.is_valid():
                    serializer.save()
                    return Response(
                        {"message": "VM request updated successfully!", "data": serializer.data},
                        status=status.HTTP_200_OK
                    )
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

            return Response(
                {"message": "VM request update not allowed at this stage."},
                status=status.HTTP_400_BAD_REQUEST
            )

        except VmRequest.DoesNotExist:
            return Response(
                {"error": "VM request not found."}, status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )





# ------------------------11 feb 2025-----------------------------

class CheckVMNameAPIView(APIView):
    """
    API to check if a VM instance name already exists in OpenStack.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        conn = get_openstack_connection()

        # Get VM name from request parameters
        vm_name = request.query_params.get("vm_name")
        print("vm_name---->", vm_name)
        if not vm_name:
            return Response({"error": "VM name is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # ✅ Get all VM names from VMRequest model
            existing_vm_names = list(VmRequest.objects.values_list("vm_name", flat=True))  # Fetch all names
            print("existing vm names ---->", existing_vm_names)
            
            
            # ✅ Extract the part after the last underscore
            stripped_vm_names = [name.split("_")[-1].lower() for name in existing_vm_names]

            print("Stripped VM names---->", stripped_vm_names)
            
            # ✅ Check if the given VM name exists in the stripped list
            if vm_name.lower() in stripped_vm_names:
                return Response(
                    {"exists": True, "message": f"VM name '{vm_name}' already exists."},
                    status=status.HTTP_200_OK
                )

            # ✅ If not found in VMRequest, check in OpenStack
            conn = get_openstack_connection()
            existing_vms = conn.compute.servers()
            print("existing_vms---->", existing_vms)
            for vm in existing_vms:
                print(vm.name)
                if vm.name.lower() == vm_name.lower():
                    return Response(
                        {"exists": True, "message": f"VM name '{vm_name}' already exists in OpenStack."},
                        status=status.HTTP_200_OK
                    )

            # ✅ If not found in either, VM name is available
            return Response({"exists": False, "message": "VM name is available."}, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


       
# class VmRequestAPIViewAdmin(APIView):
#     permission_classes = [IsAuthenticated]  # Add permissions as needed

#     def get(self, request):
#         """
#         Fetch VM request details. 
#         If the `approved_by_fla` query parameter is present, list VM requests approved by FLA.
#         """
#         try:
#             # Fetch role and employee ID from the token or request
#             role = request.auth.get('role', None)
#             employee_id = request.auth.get('employee_id', None)
            
#             # Check if we need to filter for FLA-approved VMs
#             approved_by_fla = request.GET.get('approved_by_fla', None)
#             print("approved_by_fla", approved_by_fla)
#             if role == 'ADMIN' and approved_by_fla == "true":
#                 # Filter VMs approved by FLA
#                 vm_requests = VmRequest.objects.filter(fla_status="Accepted")
#                 print("vm_requests admin", vm_requests)
#             elif role == 'ADMIN':
#                 vm_requests = VmRequest.objects.all()
#             elif role == 'FLA':
#                 # Fetch employee IDs associated with this FLA
#                 employee_ids = Employee.objects.filter(fla_employee_id=employee_id).values_list('employee_id', flat=True)
#                 vm_requests = VmRequest.objects.filter(employee_id__in=employee_ids) | VmRequest.objects.filter(employee_id=employee_id)
#             else:
#                 # Default behavior for regular users
#                 vm_requests = VmRequest.objects.filter(employee_id=Employee.objects.get(email=request.user))
            
#             # Implement pagination
#             page = int(request.GET.get('page', 1))
#             size = int(request.GET.get('size', 10))  # Default to 10 items per page
#             total_records = vm_requests.count()
#             start = (page - 1) * size
#             end = start + size
#             vm_requests = vm_requests[start:end]
            
#             # Serialize the results
#             serializer = VmRequestSerializer(vm_requests, many=True)
#             return Response(
#                 {
#                     "totalRecords": total_records,
#                     "page": page,
#                     "size": size,
#                     "data": serializer.data
#                 },
#                 status=status.HTTP_200_OK
#             )
#         except Exception as e:
#             return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
   
   
# ----------------------------------------6 Feb 2025--------------------------------


class VmRequestPendingAdminAPIView(APIView):
    """
    API to list VM requests where FLA has approved (fla_status='Accepted')
    but Admin status is still pending (admin_status='Pending').
    """
    permission_classes = [IsAuthenticated, IsAdminUserPermission]

    def get(self, request):
        try:
            # Ensure the user has admin role
            role = getattr(request.user, "role", None)
            print("Role from user:", role)

            # print(role)
            # if role != 'ADMIN':
            #     return Response({"error": "Only admins can access this API."}, status=status.HTTP_403_FORBIDDEN)

            # Filter VM requests where FLA has accepted but Admin has not yet approved
            vm_requests = VmRequest.objects.filter(fla_status="Accepted", admin_status="Pending")

            # Implement pagination
            page = int(request.GET.get('page', 1))
            size = int(request.GET.get('size', 10))  # Default 10 items per page
            total_records = vm_requests.count()
            start = (page - 1) * size
            end = start + size
            vm_requests = vm_requests[start:end]

            # Serialize the results
            serializer = VmRequestSerializer(vm_requests, many=True)

            return Response(
                {
                    "totalRecords": total_records,
                    "page": page,
                    "size": size,
                    "data": serializer.data,
                },
                status=status.HTTP_200_OK
            )
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
   
  
class FlaVmRequestAPIView(APIView):
    permission_classes = [IsAuthenticated]  # Add permissions as needed

    def get(self, request):
        """
        Fetch all VM request details related to FLA
        """
        try:
            print(request.user)
            current_emp_id = Employee.objects.get(email=request.user)
            fla_related_emp_ids = Employee.objects.filter(fla_employee_id=current_emp_id).values_list('employee_id', flat=True)
            print(fla_related_emp_ids, "========")
            vm_requests = VmRequest.objects.filter(employee_id__in=fla_related_emp_ids)
            serializer = VmRequestSerializer(vm_requests, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            print("Error in fla vm requests", e)
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        

# ===========================27 Jan 2025====================
# class EmployeeVmRequestAPIView(APIView):
#     permission_classes = [IsAuthenticated]  # Ensures only authenticated users can access the view

#     def get(self, request):
#         """
#         Fetch all VM requests for the logged-in employee.
#         """
#         try:
#             # Fetch the employee object for the currently logged-in user
#             current_employee = Employee.objects.get(email=request.user.email)
            
#             # Fetch VM requests associated with the current employee's ID
#             vm_requests = VmRequest.objects.filter(employee_id=current_employee.employee_id)
            
#             # Serialize the VM requests data
#             serializer = VmRequestSerializer(vm_requests, many=True)
            
#             # Return serialized data with HTTP 200 response
#             return Response(serializer.data, status=status.HTTP_200_OK)
        
#         except Employee.DoesNotExist:
#             # If the employee is not found in the Employee model, return an error response
#             return Response(
#                 {"error": "Employee not found."}, 
#                 status=status.HTTP_404_NOT_FOUND
#             )
#         except Exception as e:
#             # Handle any other exceptions and log the error
#             print("Error in fetching VM requests:", e)
#             return Response(
#                 {"error": str(e)}, 
#                 status=status.HTTP_500_INTERNAL_SERVER_ERROR
#             )

class EmployeeVmRequestAPIView(APIView):
    permission_classes = [IsAuthenticated]  # Ensures only authenticated users can access the view

    def get(self, request):
        """
        Fetch selected fields of VM requests for the logged-in employee.
        """
        try:
            # Fetch the employee object for the currently logged-in user
            current_employee = Employee.objects.get(email=request.user.email)

            # Fetch VM requests associated with the current employee's ID
            vm_requests = VmRequest.objects.filter(employee_id=current_employee.employee_id)
            
            # Select only the required fields for the response
            filtered_data = vm_requests.values(
                'id',
                'vm_name',
                'count_of_vms',
                'project_name',
                'purpose',
                'fla_status',
                'admin_status',
                
                
            )
            
            # Return the filtered data with HTTP 200 response
            return Response(filtered_data, status=status.HTTP_200_OK)

        except Employee.DoesNotExist:
            # If the employee is not found in the Employee model, return an error response
            return Response(
                {"error": "Employee not found."}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            # Handle any other exceptions and log the error
            print("Error in fetching VM requests:", e)
            return Response(
                {"error": str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

# 
class VmRequestRejectionReasonAPIView(APIView):
    """
    API to update rejection reason based on role detected from token (FLA or ADMIN).
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            vm_request_id = request.data.get("vm_request_id")
            rejection_reason = request.data.get("rejection_reason")

            if not vm_request_id or not rejection_reason:
                return Response(
                    {"error": "vm_request_id and rejection_reason are required."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Role from token
            token_role = request.auth.get('role', None)

            # Optional role from request for validation (frontend hint only)
            rejected_by = request.data.get("rejected_by", None)

            if token_role not in ["FLA", "ADMIN"]:
                return Response({"error": "Unauthorized role."}, status=status.HTTP_403_FORBIDDEN)

            if rejected_by and token_role != rejected_by:
                return Response({"error": f"Token role {token_role} does not match rejected_by {rejected_by}."},
                                status=status.HTTP_400_BAD_REQUEST)

            vm_request = VmRequest.objects.get(id=vm_request_id)

            if token_role == "FLA":
                vm_request.fla_status = "Rejected"
                vm_request.fla_rejection_reason = rejection_reason
                vm_request.fla_approved_timestamp = timezone.now()
            elif token_role == "ADMIN":
                if vm_request.fla_status in ["Pending", "Rejected"]:
                    return Response(
                        {"error": f"Cannot reject. FLA status is {vm_request.fla_status}. Contact your FLA."},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                vm_request.admin_status = "Rejected"
                vm_request.admin_rejection_reason = rejection_reason
                vm_request.admin_approved_timestamp = timezone.now()

            vm_request.save()

            return Response({"message": f"VM request rejected successfully by {token_role}."},
                            status=status.HTTP_200_OK)

        except VmRequest.DoesNotExist:
            return Response({"error": "VM Request not found."}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)




class ServiceRequestRejectionAPIView(APIView):
    """
    API to reject a service request based on the user's role (FLA or ADMIN).
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            service_request_id = request.data.get("service_request_id")
            rejection_reason = request.data.get("rejection_reason")

            if not service_request_id or not rejection_reason:
                return Response(
                    {"error": "service_request_id and rejection_reason are required."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Get role from token
            token_role = request.auth.get('role', None)

            if token_role not in ["FLA", "ADMIN"]:
                return Response({"error": "Unauthorized role."}, status=status.HTTP_403_FORBIDDEN)

            service_request = ServiceRequest.objects.get(id=service_request_id)

            if token_role == "FLA":
                service_request.fla_status = "Rejected"
                service_request.fla_rejection_reason = rejection_reason
                service_request.fla_action_timestamp = timezone.now() # Assumes this field exists
            
            elif token_role == "ADMIN":
                # Admin can only reject a request if the FLA has already approved it.
                if service_request.fla_status != 'Accepted':
                    return Response(
                        {"error": f"Admin cannot reject this request because its FLA status is '{service_request.fla_status}'. It must be 'Accepted'."},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                service_request.admin_status = "Rejected"
                service_request.admin_rejection_reason = rejection_reason
                service_request.admin_action_timestamp = timezone.now() # Assumes this field exists

            service_request.save()

            return Response({"message": f"Service request rejected successfully by {token_role}."},
                            status=status.HTTP_200_OK)

        except ServiceRequest.DoesNotExist:
            return Response({"error": "Service Request not found."}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)






class VmRequestStatusUpdateAPIView(APIView):
    permission_classes = [IsAuthenticated]  # Add authentication permission

    def post(self, request):
        """
        Update the status of a VM request
        """
        try:
            print("====================>")
            # Extract the VM request ID and new status from the request data
            vm_request_id = request.data.get("vm_request_id")
            print("vm_request_id",vm_request_id)
            new_status = request.data.get("status")
            vm_creation_status = ""

            # Check if the VM request ID and new status are provided
            if not vm_request_id or not new_status:
                return Response({"error 1": "VM request ID and status are required"}, status=status.HTTP_400_BAD_REQUEST)

            # Validate the new status
            if new_status not in ["Accepted", "Rejected"]:
                return Response({"error 2": "Invalid status. Only 'Accepted' or 'Rejected' are allowed"}, status=status.HTTP_400_BAD_REQUEST)
 
            # Fetch the VM request
            vm_request = VmRequest.objects.get(id=vm_request_id)

            # Check if the VM request exists
            if not vm_request:
                return Response({"error 3": "VM request not found"}, status=status.HTTP_404_NOT_FOUND)
            
            fla_status = vm_request.fla_status
            print("fla_status",fla_status)
            if request.user.username == "admin@cdac.in":
                print(request.user.username,"<----------")
                if fla_status == "Pending" or fla_status == "Rejected":
                    return Response({"error": f"Your VM Request is {fla_status} contact your FLA."}, status=status.HTTP_404_NOT_FOUND)
                if new_status == "Accepted":
                    vm_response = vm_approve_request(vm_request_id)

                    if not vm_response["status"]:
                        # VM creation failed, keep pending and store error
                        vm_request.creation_status = "Failed"
                        vm_request.creation_error_message = vm_response.get("message", "Unknown error")
                        vm_request.save()
                        return Response({
                            "error": "VM provisioning failed",
                            "details": vm_response.get("message")
                        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

                    # VM created successfully
                    vm_request.admin_status = "Accepted"
                    vm_request.creation_status = "Success"
                    vm_request.creation_error_message = None
                    vm_request.admin_approved_timestamp = timezone.now()
                    vm_request.save()

                    return Response({"message": "VM status updated and VM created successfully."}, status=status.HTTP_200_OK)

                else:
                    vm_request.admin_status = new_status
                    vm_request.admin_approved_timestamp = timezone.now()
                vm_request.save()
                
            else:
                vm_request.fla_status = new_status
                vm_request.fla_approved_timestamp = timezone.now()
            
            vm_request.save()

            # Return the updated VM request
            return Response({"message": "VM status updated successfully."}, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({"error in admin": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
    # fetch All details of vm request with counts and pagination #-------------------------------------
    
class VmRequestOverviewAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            role = request.auth.get("role")
            employee_id = request.auth.get("employee_id")

            # -------------------------------------------------------
            # ROLE-WISE BASE QUERYSET (UNFILTERED DATA)
            # -------------------------------------------------------
            if role == "ADMIN":
                queryset = VmRequest.objects.filter(fla_status="Accepted")

                status_counts = {
                    "pending": queryset.filter(admin_status="Pending").count(),
                    "accepted": queryset.filter(admin_status="Accepted").count(),
                    "rejected": queryset.filter(admin_status="Rejected").count(),
                    "failed": queryset.filter(creation_status="Failed").count(),
                }

            elif role == "FLA":
                related_emp_ids = Employee.objects.filter(
                    fla_employee_id=employee_id
                ).values_list("employee_id", flat=True)

                queryset = VmRequest.objects.filter(
                    Q(employee_id__in=related_emp_ids) | Q(employee_id=employee_id)
                )

                status_counts = {
                    "pending": queryset.filter(fla_status="Pending").count(),
                    "accepted": queryset.filter(fla_status="Accepted").count(),
                    "rejected": queryset.filter(fla_status="Rejected").count(),
                }

            else:
                queryset = VmRequest.objects.filter(employee_id=employee_id)

                status_counts = {
                    "pending": queryset.filter(fla_status="Pending").count(),
                    "accepted": queryset.filter(
                        fla_status="Accepted", admin_status="Accepted"
                    ).count(),
                    "rejected": queryset.filter(
                        Q(fla_status="Rejected") | Q(admin_status="Rejected")
                    ).count(),
                }

            # -------------------------------------------------------
            # PAGINATION (on full dataset)
            # -------------------------------------------------------
            queryset = queryset.order_by("-request_timestamp")
            total_records = queryset.count() 

            # -------------------------------------------------------
            # SERIALIZE DATA
            # -------------------------------------------------------
            data = []
            for vm in queryset:
                data.append({
                    "id": vm.id,
                    "name": vm.name,
                    "email": vm.email,
                    "employee_id": vm.employee_id,
                    "count_of_vms": vm.count_of_vms,
                    "vm_name": vm.vm_name,
                    "purpose": vm.purpose,
                    "designation": vm.designation,
                    "project_name": vm.project_name,
                    "vdi_required": vm.vdi_required,
                    "image": vm.image,
                    "flavor": vm.flavor,
                    "login_enable_date": vm.login_enable_date,
                    "login_disable_date": vm.login_disable_date,
                    "login_enable_time": vm.login_enable_time,
                    "login_disable_time": vm.login_disable_time,
                    "storage_required": vm.storage_required,
                    "additional_storage": vm.additional_storage,
                    "admin_status": vm.admin_status,
                    "fla_status": vm.fla_status,
                    "purpose_of_request": vm.purpose_of_request,
                    "request_timestamp": vm.request_timestamp,
                    "fla_approved_timestamp": vm.fla_approved_timestamp,
                    "admin_approved_timestamp": vm.admin_approved_timestamp,
                    "creation_status": getattr(vm, "creation_status", None),
                    "fla_rejection_reason": getattr(vm, "fla_rejection_reason", None),
                    "admin_rejection_reason": getattr(vm, "admin_rejection_reason", None),
                    "creation_error_message": getattr(vm, "creation_error_message", None),

                })

            return Response(
                {
                    "role": role,
                    "total_records": total_records,
                    "status_counts": status_counts,
                    "data": data,  # FULL DATA (not filtered)
                },
                status=200,
            )

        except Exception as e:
            return Response({"error": str(e)}, status=500)






        
class ProjectListAPIView(APIView):
    """
    API to list all projects.
    """
    permission_classes = [IsAuthenticated] 
    # cdacprojects()
    # print("called cdacprojects")
    def get(self, request):
        projects = CdacProject.objects.all()
        serializer = ProjectSerializer(projects, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
# ----------------------------2 june 2025--------------------------------------

class CreateCdacProjectAPIView(APIView):
    """
    API to create a new CDAC project.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ProjectSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class DeleteCdacProjectAPIView(APIView):
    """
    API to delete a CDAC project.
    """
    permission_classes = [IsAuthenticated]

    def delete(self, request, project_id):
        try:
            project = CdacProject.objects.get(id=project_id)
            project.delete()
            return Response(
                {"message": "Project deleted successfully"}, 
                status=status.HTTP_204_NO_CONTENT
            )
        except CdacProject.DoesNotExist:
            return Response(
                {"error": "Project not found"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {"error": str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
# ---------------------------16 Dec 2024--------------------------------------

# class OpenStackProjectsAPIView(APIView):
#     """
#     API to list OpenStack projects
#     """
#     permission_classes = [IsAuthenticated]
#     def get(self, request):
#         try:
#             # Load credentials from environment variables or config
#             auth_url = AUTH_URL
#             username = USERNAME
#             password = PASSWORD
#             project_name = PROJECT_NAME
#             user_domain_name = USER_DOMAIN_NAME
#             project_domain_name = PROJECT_DOMAIN_NAME

#             # Authenticate with OpenStack
#             loader = loading.get_plugin_loader("password")
#             auth = loader.load_from_options(
#                 auth_url=auth_url,
#                 username=username,
#                 password=password,
#                 project_name=project_name,
#                 user_domain_name=user_domain_name,
#                 project_domain_name=project_domain_name,
#             )
#             sess = session.Session(auth=auth)
#             keystone = client.Client(session=sess)

#             # Fetch all projects
#             projects = keystone.projects.list()
#             project_list = [{"id": project.id, "name": project.name, "description": project.description, "enabled": project.enabled} for project in projects]

#             return Response(project_list, status=status.HTTP_200_OK)

#         except Exception as e:
#             return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)



class OpenStackProjectsAPIView(APIView):
    """
    API to list OpenStack projects.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            # Get OpenStack connection object
            conn = get_openstack_connection()

            # Fetch all projects
            projects = conn.identity.projects()

            # Format project data
            project_list = [
                {
                    "id": project.id,
                    "name": project.name,
                    "description": project.description,
                    "enabled": project.is_enabled,
                }
                for project in projects
            ]

            return Response(project_list, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)




# ----------------------------27 Jan 2025------------------------------

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from openstack.exceptions import ResourceNotFound  # For handling non-existent resources

class UpdateProjectAPIView(APIView):
    """
    API to update an existing project in OpenStack.
    """
    permission_classes = [IsAuthenticated]

    def put(self, request, project_id):
        try:
            conn = get_openstack_connection()

            # Get the project by ID
            project = conn.identity.get_project(project_id)
            old_name = project.name
            if not project:
                return Response(
                    {"error": f"Project with ID '{project_id}' not found."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            # Get the fields to update
            name = request.data.get("name")
            description = request.data.get("description")
            enabled = request.data.get("enabled")

            # Update the project
            updated_project = conn.identity.update_project(
                project, name=name, description=description, enabled=enabled
            )

            # Return the response
            return Response(
                {
                    "message": f"Project '{old_name}' updated successfully",
                    "project_id": updated_project.id,
                    "new_name": updated_project.name,
                    "previous_name": old_name,
                },
                status=status.HTTP_200_OK,
            )

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)





class DeleteProjectAPIView(APIView):
    """
    API to delete an existing project in OpenStack.
    """
    # permission_classes = [IsAuthenticated]
    permission_classes = [IsAuthenticated, IsAdminUserPermission]


    def delete(self, request, project_id):
        try:
            conn = get_openstack_connection()

            # Get the project by ID
            project = conn.identity.get_project(project_id)
            if not project:
                return Response(
                    {"error": f"Project with ID '{project_id}' not found."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            # Delete the project
            conn.identity.delete_project(project)

            # Return the response
            return Response(
                {"message": f"Project with ID '{project_id}' deleted successfully"},
                status=status.HTTP_200_OK,
            )

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)



class OpenStackProjectUserAPIView(APIView):
    """
    Create a new project and user in OpenStack based on VmRequest data
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, vm_request_id):
        try:
            # Get the VM request
            vm_request = VmRequest.objects.get(id=vm_request_id)
            project_name = vm_request.project_name
            employee_id = vm_request.employee_id

            # Validate project_name and employee_id
            if not project_name or not employee_id:
                return Response(
                    {"error": "project_name and employee_id are required in the VM request."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Step 1: Fetch the employee name based on employee_id
            try:
                employee = Employee.objects.get(employee_id=employee_id)
                employee_name = employee.name  # Get the employee name
                print(employee_name,"<==========")
            except Employee.DoesNotExist:
                return Response(
                    {"error": f"Employee with employee_id {employee_id} not found."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            # Connect to OpenStack
            conn = get_openstack_connection()

            # Step 2: Check if the project already exists
            project = conn.identity.find_project(project_name)
            if not project:
                # Create a new project
                project = conn.identity.create_project(name=project_name)
                vm_request.admin_status = "Project Created"
            else:
                vm_request.admin_status = "Project Already Exists"

            # Step 3: Check if the user already exists
            user = conn.identity.find_user(employee_id)
            if not user:
                # Create a new user
                user = conn.identity.create_user(
                    name=employee_id,  # Use employee's name for the OpenStack user
                    password="default_password123",  # Replace with a secure password
                    default_project_id=project.id,
                )
                vm_request.fla_status = "User Created"
            else:
                vm_request.fla_status = "User Already Exists"

            # Step 4: Assign "member" role to the user for the project
            member_role = conn.identity.find_role(settings.OPENSTACK_MEMBER_ROLE)
            if not member_role:
                return Response(
                    {"error": f"Member role '{settings.OPENSTACK_MEMBER_ROLE}' not found in OpenStack."},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

            conn.identity.assign_project_role_to_user(
                project=project,
                user=user,
                role=member_role,
            )

            # Step 5: Update the VmRequest table
            vm_request.save()

            # Return a success response
            return Response(
                {
                    "message": "Project and user setup complete.",
                    "project_id": project.id,
                    "user_id": user.id,
                },
                status=status.HTTP_201_CREATED,
            )

        except VmRequest.DoesNotExist:
            return Response(
                {"error": "VM request not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


# ----------------------------------------Dec 23 -----------------------

class CreateRouterAPIView(APIView):
    """
    API to create a router in OpenStack.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            # Initialize OpenStack connection
            conn = get_openstack_connection()

            # Parse form data
            router_name = request.data.get('name')
            project_id = request.data.get('project_id')  # Get selected project name
            admin_state_up = request.data.get('admin_state_up', True)
            external_network_name = request.data.get('external_network_name')  # Get selected network name
            enable_snat = request.data.get('enable_snat', True)  # Default SNAT to True
            availability_zones = request.data.get('availability_zones', ['nova'])  # Optional

            print("Form Data: ", external_network_name, enable_snat, availability_zones,project_id)

            if not router_name:
                return Response({"error": "Router name is required."}, status=status.HTTP_400_BAD_REQUEST)

            if not external_network_name:
                return Response({"error": "External network is required."}, status=status.HTTP_400_BAD_REQUEST)

            # Resolve external network name to ID
            external_network = conn.network.find_network(external_network_name)
            if not external_network:
                return Response(
                    {"error": f"Network '{external_network_name}' not found."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Set external gateway info
            gateway_info = {
                'network_id': external_network.id,
                'enable_snat': enable_snat
            }

            # Create the router
            router = conn.network.create_router(
                name=router_name,
                project_id=project_id,  # Use project name
                admin_state_up=admin_state_up,
                external_gateway_info=gateway_info,
                availability_zone_hints=availability_zones
            )

            # Response
            return Response(
                {
                    "id": router.id,
                    "name": router.name,
                    "project_id": project_id,
                    "status": router.status,
                    "external_gateway_info": router.external_gateway_info,
                    "admin_state_up": router.is_admin_state_up,
                },
                status=status.HTTP_201_CREATED
            )
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        
        
        
# -------------------------24 Jan 2025----------------------------


class EditRouterAPIView(APIView):
    """
    API to edit a router in OpenStack.
    """
    permission_classes = [IsAuthenticated]

    def put(self, request, router_id):
        try:
            # Initialize OpenStack connection
            conn = get_openstack_connection()

            # Parse form data
            new_router_name = request.data.get('name')
            admin_state_up = request.data.get('admin_state_up')
            print("new_router_name",new_router_name)
            # Validate the router ID
            router = conn.network.get_router(router_id)
            if not router:
                return Response(
                    {"error": f"Router with ID '{router_id}' not found."},
                    status=status.HTTP_404_NOT_FOUND
                )

            # Update the router's fields
            update_data = {}
            if new_router_name:
                update_data['name'] = new_router_name
            if admin_state_up is not None:
                update_data['admin_state_up'] = admin_state_up

            # Apply the updates
            updated_router = conn.network.update_router(router, **update_data)

            # Response with updated data
            return Response(
                
                {   "message" : "Router updated successfully",
                    "id": updated_router.id,
                    "name": updated_router.name,
                    "admin_state_up": updated_router.is_admin_state_up,
                    "status": updated_router.status,
                },
                status=status.HTTP_200_OK
            )
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ------------------------2 Jan 2025-----------------------------

# class ListRoutersView(APIView):
#     def get(self, request):
#         try:
#             # Initialize OpenStack connection
#             conn = get_openstack_connection()
#             print("inside list router")
#             # Fetch all routers
#             routers = conn.network.routers()
#             print("routers",routers)
#             # Prepare response data
#             router_list = []
#             for router in routers:
#                 print("router",router)
#                 # Get associated network details
#                 external_gateway_info = router.external_gateway_info or {}
#                 network_id = external_gateway_info.get('network_id')
#                 network_name = None
#                 subnets = []
#                 shared = False
#                 is_external = False

#                 if network_id:
#                     # Get network details
#                     network = conn.network.get_network(network_id)
#                     if network:
#                         network_name = network.name
#                         # Retrieve subnets associated with the network
#                         for subnet_id in network.subnet_ids:
#                             subnet = conn.network.get_subnet(subnet_id)
#                             if subnet:
#                                 subnets.append(f"{subnet.name} {subnet.cidr}")
#                         shared = network.is_shared
#                         is_external = network.is_router_external
#                 # Get project name from project ID
#                 project_name = None
#                 # if router.project_id:
#                 #     print("router.project_id",router.project_id)
#                 #     project = conn.identity.get_project(router.project_id)
#                 #     if project:
#                 #         project_name = project.name
                

#                 # Get availability zones
#                 availability_zones = router.availability_zones or []

#                 # Append router details
#                 router_list.append({
#                     "Router Name": router.name,
#                     "Router ID": router.id,
#                     "Project ID": router.project_id,
#                     "Project Name": project_name,
#                     "Network Name": network_name,
#                     "Subnets Associated": subnets,
#                     "DHCP Agents": "Not Supported in SDK",
#                     "Shared": shared,
#                     "External": is_external,
#                     "Status": router.status,
#                     "Admin State": router.is_admin_state_up,
#                     "Availability Zones": availability_zones,
#                     "Actions": "N/A",
#                 })

#             # Return response
#             return Response(router_list, status=status.HTTP_200_OK)

#         except Exception as e:
#             return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ListRoutersView(APIView):
    def get(self, request):
        try:
            # Initialize OpenStack connection
            conn = get_openstack_connection()
            print("Inside list router")

            # Fetch all routers
            routers = conn.network.routers()
            print("routers", routers)

            # Prepare response data
            router_list = []
            for router in routers:
                print("router", router)

                # Get associated network details
                external_gateway_info = router.external_gateway_info or {}
                network_id = external_gateway_info.get('network_id')
                network_name = None
                subnets = []
                shared = False
                is_external = False

                if network_id:
                    # Get network details
                    network = conn.network.get_network(network_id)
                    if network:
                        network_name = network.name
                        # Retrieve subnets associated with the network
                        for subnet_id in network.subnet_ids:
                            subnet = conn.network.get_subnet(subnet_id)
                            if subnet:
                                subnets.append(f"{subnet.name} {subnet.cidr}")
                        shared = network.is_shared
                        is_external = network.is_router_external

                # Get project name from project ID
                project_name = None
                if router.project_id:
                    print("router.project_id", router.project_id)
                    try:
                        # Attempt to fetch the project using the project_id
                        project = conn.identity.get_project(router.project_id)
                        if project:
                            project_name = project.name
                        else:
                            project_name = "Unknown Project"  # Default value if project fetch fails silently
                    except Exception as e:
                        # Handle case where the project does not exist or cannot be retrieved
                        print(f"Error fetching project for ID {router.project_id}: {str(e)}")
                        project_name = "Deleted Project"  # Default value for deleted or inaccessible projects
                else:
                    project_name = "No Project Assigned"  # Default if no project_id is associated

                # Get availability zones
                availability_zones = router.availability_zones or []

                # Append router details
                router_list.append({
                    "Router Name": router.name,
                    "Router ID": router.id,
                    "Project ID": router.project_id,
                    "Project Name": project_name,
                    "Network Name": network_name,
                    "Subnets Associated": subnets,
                    "DHCP Agents": "Not Supported in SDK",
                    "Shared": shared,
                    "External": is_external,
                    "Status": router.status,
                    "Admin State": router.is_admin_state_up,
                    "Availability Zones": availability_zones,
                    "Actions": "N/A",
                })

            # Return response
            return Response(router_list, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# -----------------------3 Jan 2024 ------------------
class DeleteRouterAPIView(APIView):
    """
    API to delete multiple routers in OpenStack by a list of IDs passed in the URL path.
    """
    permission_classes = [IsAuthenticated]

    def delete(self, request, router_ids):
        print("router_ids", router_ids)
        try:
            # Validate the router IDs
            if not router_ids:
                return Response({"error": "Router IDs are required."}, status=status.HTTP_400_BAD_REQUEST)

            # Split the router IDs from the URL into a list
            router_id_list = router_ids.split(',')

            # Establish OpenStack connection
            conn = get_openstack_connection()

            # Initialize a list to keep track of results
            delete_results = []

            # Iterate over each router ID
            for router_id in router_id_list:
                # Find the router by ID
                router = conn.network.get_router(router_id)

                if not router:
                    delete_results.append({"router_id": router_id, "error": f"Router not found."})
                else:
                    # Delete the router
                    conn.network.delete_router(router)
                    delete_results.append({"router_id": router_id, "message": "Deleted successfully."})

            # Response
            return Response(delete_results, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


 

# -----------------------24 Dec 2024 -------------------------
class CreateSnapshotAPIView(APIView):
    """
    API to create a snapshot (image) of a VM in OpenStack.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        # Get the VM ID and snapshot name from the request
        vm_id = request.data.get("vm_id")
        snapshot_name = request.data.get("snapshot_name")
        
        if not vm_id or not snapshot_name:
            return Response({"error": "VM ID and Snapshot Name are required."}, status=status.HTTP_400_BAD_REQUEST)

        # Get OpenStack connection
        conn = self.get_openstack_connection()
        
        if not conn:
            return Response({"error": "Failed to connect to OpenStack"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        try:
            # Get the server instance from OpenStack
            server = conn.compute.get_server(vm_id)
            
            if not server:
                return Response({"error": f"VM with ID {vm_id} not found."}, status=status.HTTP_404_NOT_FOUND)

            # Create image (snapshot) of the server
            image = conn.compute.create_server_image(
                server,
                name=snapshot_name,
                metadata={"created_by": "API"}
            )
            # print("image", image)

            # Return success response
            return Response({
                "message": "Snapshot created successfully.",
                "snapshot": {
                    "id": image.id,
                    "name": image.name,
                    "status": image.status
                }
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def get_openstack_connection(self):
        """Helper method to establish a connection to OpenStack"""
        try:
            conn = get_openstack_connection()
            return conn
        except Exception as e:
            return None




# ----------------------------- 27 Dec 2024------------------------------


class ProjectUsageAPIView(APIView):
    """
    API to show usage statistics for active instances, RAM, and project resource usage.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        conn = get_openstack_connection()
        if not conn:
            return Response({"error": "Failed to connect to OpenStack"}, status=500)

        try:
            # Initialize response data
            usage_data = []

            # Get start and end date for usage calculations (e.g., this month's usage)
            # end_date = datetime.utcnow()
            # start_date = end_date.replace(day=1)
            start_date = datetime(2024, 12, 28)
            end_date = datetime(2024, 12, 29)
            
            print("start_date",start_date)
            print("end_date",end_date)

            # Iterate over all projects
            for project in conn.identity.projects():
                project_usage = {
                    "project_name": project.name,
                    "vcpus": 0,
                    "disk": 0,
                    "ram": 0,
                    "vcpu_hours": 0,
                    "disk_gb_hours": 0,
                    "memory_gb_hours": 0,
                }

                # Fetch usage data for the project
                usage = conn.compute.get_usage(project=project.id, start=start_date, end=end_date)
                
                # Log the usage object for debugging
                # print(usage)

                if usage:
                    # Use default values of 0 if the attributes are None
                    total_vcpus_usage = usage.total_vcpus_usage or 0
                    total_local_gb_usage = usage.total_local_gb_usage or 0
                    total_memory_mb_usage = usage.total_memory_mb_usage or 0
                    total_hours = usage.total_hours or 0

                    # Set the project usage stats
                    project_usage["vcpus"] = total_vcpus_usage
                    project_usage["disk"] = total_local_gb_usage
                    project_usage["ram"] = total_memory_mb_usage // 1024  # Convert MB to GB
                    project_usage["vcpu_hours"] = total_vcpus_usage * total_hours
                    project_usage["disk_gb_hours"] = total_local_gb_usage * total_hours
                    project_usage["memory_gb_hours"] = (total_memory_mb_usage / 1024) * total_hours

                    # Adjust the values to match the expected behavior (e.g., not cumulative over all servers)
                    project_usage["vcpus"] = project_usage["vcpus"] / len(usage.server_usages) if usage.server_usages else project_usage["vcpus"]
                    project_usage["disk"] = project_usage["disk"] / len(usage.server_usages) if usage.server_usages else project_usage["disk"]
                    project_usage["ram"] = project_usage["ram"] / len(usage.server_usages) if usage.server_usages else project_usage["ram"]

                usage_data.append(project_usage)

            # Calculate overall active instances and RAM
            active_instances = sum(1 for instance in conn.compute.servers() if instance.status == "ACTIVE")
            active_ram = sum((instance.flavor["ram"] for instance in conn.compute.servers() if instance.status == "ACTIVE"))

            # Return the response
            return Response({
                "active_instances": active_instances,
                "active_ram": active_ram // 1024,  # Convert MB to GB
                "projects": usage_data,
            }, status=200)

        except Exception as e:
            return Response({"error": str(e)}, status=500)


# # Helper function to connect to OpenStack
# def get_openstack_connection():
#     try:
#         return connection.Connection(
#             auth_url="http://your-openstack-auth-url",
#             project_name="admin",
#             username="admin",
#             password="your-password",
#             user_domain_id="default",
#             project_domain_id="default"
#         )
#     except Exception as e:
#         print(f"Error connecting to OpenStack: {e}")
#         return None


# class CreateRBACPolicyAPIView(APIView):
#     """
#     API to create an RBAC policy in OpenStack.
#     """
#     permission_classes = [IsAuthenticated]

#     def post(self, request):
#         conn = get_openstack_connection()
#         if not conn:
#             return Response({"error": "Failed to connect to OpenStack"}, status=500)

#         try:
#             target_project_id = request.data.get("target_project_id")
#             action = request.data.get("action")
#             network_id = request.data.get("network_id")

#             # Validate input data
#             if not target_project_id or not action or not network_id:
#                 return Response({"error": "All fields are required (target_project_id, action, network_id)."}, status=400)

#             if action not in ["access_as_shared", "access_as_external"]:
#                 return Response({"error": f"Invalid action '{action}'. Valid actions are 'access_as_shared' or 'access_as_external'."}, status=400)

#             # Create RBAC policy
#             rbac_policy = conn.network.create_rbac_policy(
#                 object_type="network",
#                 target_project_id=target_project_id,
#                 action=action,
#                 object_id=network_id
#             )

#             return Response({
#                 "message": "RBAC policy created successfully.",
#                 "rbac_policy": {
#                     "id": rbac_policy.id,
#                     "target_project_id": rbac_policy.target_project_id,
#                     "action": rbac_policy.action,
#                     "object_id": rbac_policy.object_id
#                 }
#             }, status=201)

#         except Exception as e:
#             return Response({"error": str(e)}, status=500)

class CreateRBACPolicyAPIView(APIView):
    """
    API to create an RBAC policy in OpenStack.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        conn = get_openstack_connection()
        if not conn:
            return Response({"error": "Failed to connect to OpenStack"}, status=500)

        try:
            target_project_id = request.data.get("target_project_id")
            action = request.data.get("action")
            network_id = request.data.get("network_id")

            # Validate input data
            if not target_project_id or not action or not network_id:
                return Response({"error": "All fields are required (target_project_id, action, network_id)."}, status=400)

            if action not in ["access_as_shared", "access_as_external"]:
                return Response({
                    "error": f"Invalid action '{action}'. Valid actions are 'access_as_shared' or 'access_as_external'."
                }, status=400)

            # Verify network exists
            try:
                network = conn.network.get_network(network_id)
                if not network:
                    return Response({
                        "error": "Network not found",
                        "details": f"Network with ID {network_id} does not exist."
                    }, status=404)
            except ResourceNotFound:
                return Response({
                    "error": "Network not found",
                    "details": f"Network with ID {network_id} does not exist."
                }, status=404)

            # Verify target project exists
            try:
                project = conn.identity.get_project(target_project_id)
                if not project:
                    return Response({
                        "error": "Target project not found",
                        "details": f"Project with ID {target_project_id} does not exist."
                    }, status=404)
            except ResourceNotFound:
                return Response({
                    "error": "Target project not found",
                    "details": f"Project with ID {target_project_id} does not exist."
                }, status=404)

            # Create RBAC policy
            try:
                rbac_policy = conn.network.create_rbac_policy(
                    object_type="network",
                    target_project_id=target_project_id,
                    action=action,
                    object_id=network_id
                )

                return Response({
                    "message": "RBAC policy created successfully.",
                    "rbac_policy": {
                        "id": rbac_policy.id,
                        "target_project_id": rbac_policy.target_project_id,
                        "action": rbac_policy.action,
                        "object_id": rbac_policy.object_id
                    }
                }, status=201)

            except HttpException as e:
                # Check for quota exceeded error
                if 'Quota exceeded' in str(e) or 'quota exceeded' in str(e).lower():
                    return Response({
                        "error": "Quota exceeded for RBAC policies. Maximum limit of 10 policies reached.",
                        "details": str(e),
                        "quota_exceeded": True
                    }, status=403)
                
                # Handle other HTTP exceptions
                return Response({
                    "error": "Failed to create RBAC policy",
                    "details": str(e)
                }, status=400)

        except Exception as e:
            return Response({
                "error": "An unexpected error occurred",
                "details": str(e)
            }, status=500)

# Update RBAC Policy
class UpdateRBACPolicyAPIView(APIView):
    """
    API to update the target_project_id field of an existing RBAC policy in OpenStack.
    """
    permission_classes = [IsAuthenticated]

    def patch(self, request, rbac_policy_id):
        conn = get_openstack_connection()
        if not conn:
            return Response({"error": "Failed to connect to OpenStack"}, status=500)

        try:
            target_project_id = request.data.get("target_project_id")

            # Validate input data
            if not target_project_id:
                return Response({"error": "The 'target_project_id' field is required."}, status=400)

            # Fetch the existing RBAC policy
            rbac_policy = conn.network.get_rbac_policy(rbac_policy_id)
            if not rbac_policy:
                return Response({"error": "RBAC policy not found."}, status=404)

            # Update the RBAC policy's target_project_id
            updated_policy = conn.network.update_rbac_policy(
                rbac_policy=rbac_policy_id,  # Pass the policy ID or object
                target_project_id=target_project_id
            )

            return Response({
                "message": "RBAC policy updated successfully.",
                "rbac_policy": {
                    "id": updated_policy.id,
                    "target_project_id": updated_policy.target_project_id,
                    "action": updated_policy.action,
                    "object_id": updated_policy.object_id
                }
            }, status=200)

        except Exception as e:
            return Response({"error": str(e)}, status=500)


# =================================22 jan 2025 ============================


class ListRBACPoliciesAPIView(APIView):
    """
    API to list all RBAC policies in OpenStack.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        conn = get_openstack_connection()
        if not conn:
            return Response({"error": "Failed to connect to OpenStack"}, status=500)

        try:
            # Fetch all RBAC policies
            rbac_policies = conn.network.rbac_policies()

            # Serialize RBAC policies
            policies_data = [
                {
                    "id": policy.id,
                    "object_type": policy.object_type,
                    "object_id": policy.object_id,
                    "target_project_id": policy.target_project_id,
                    "action": policy.action,
                    # "created_at": policy.created_at,
                    # "updated_at": policy.updated_at,
                }
                for policy in rbac_policies
            ]

            return Response({"rbac_policies": policies_data}, status=200)

        except SDKException as sdk_error:
            return Response({"error": f"OpenStack SDK Error: {str(sdk_error)}"}, status=500)
        except Exception as e:
            return Response({"error": str(e)}, status=500)

class DeleteRBACPolicyAPIView(APIView):
    """
    API to delete an RBAC policy in OpenStack.
    """
    permission_classes = [IsAuthenticated]

    def delete(self, request, rbac_policy_id):
        conn = get_openstack_connection()
        if not conn:
            return Response({"error": "Failed to connect to OpenStack"}, status=500)

        try:
            # Find the RBAC policy to be deleted
            rbac_policy = conn.network.find_rbac_policy(rbac_policy_id)

            if not rbac_policy:
                return Response({"error": "RBAC policy not found"}, status=404)

            # Delete the RBAC policy
            conn.network.delete_rbac_policy(rbac_policy)

            return Response({"message": "RBAC policy deleted successfully"}, status=200)

        except ResourceNotFound:
            return Response({"error": "RBAC policy not found"}, status=404)

        except SDKException as sdk_error:
            return Response({"error": f"SDK error: {str(sdk_error)}"}, status=500)

        except Exception as e:
            return Response({"error": f"An unexpected error occurred: {str(e)}"}, status=500)




# class VmApproveAPIView(APIView):
#     def post(self, request, id):
#         try:
#             vmid, regid = id.split('_')  # Split the ID parameter
#             vm_info = get_object_or_404(VMInfo, id=int(vmid))
#             reg = get_object_or_404(Registration, id=int(regid))

#             conn = get_openstack_connection()
#             # OpenStack details
#             flv_id = conn.compute.find_flavor(reg.flavor)
#             img_id = conn.compute.find_image(reg.image)
#             flavor_id = flv_id.id
#             image_id = img_id.id
#             network_name = "private"

#             current_date = datetime.now()
#             vm_details = [
#                 {
#                     "vm_name": reg.full_name,
#                     "username": reg.full_name,
#                     "vm_access_from_date": vm_info.vm_access_from_date,
#                     "vm_access_to_date": vm_info.vm_access_to_date,
#                     "vm_access_from_time": vm_info.vm_access_from_time,
#                     "vm_access_to_time": vm_info.vm_access_to_time,
#                     "email": reg.email,
#                 }
#             ]

#             if reg.designation != "Student":
#                 # Process bootable volumes for non-student users
#                 volume_name = f"{reg.full_name}_volume"
#                 size_gb = 20
#                 volume_type = "CEPH" if reg.designation in ["HR", "Finance", "Senior Management"] else "__DEFAULT__"
                
#                 created_bootable, vm_instance_id = create_bootable_volume(
#                     os.getenv("AUTH_URL"),
#                     os.getenv("PROJECT_NAME"),
#                     os.getenv("USERNAME"),
#                     os.getenv("PASSWORD"),
#                     volume_name,
#                     size_gb,
#                     volume_type,
#                     image_id,
#                     reg.full_name,
#                     flavor_id,
#                 )

#                 volume_id = ""
#                 if created_bootable and reg.storage_required and int(reg.additional_storage) > 0:
#                     data_volume_type = "CEPH" if reg.designation in ["HR", "Finance", "Senior Management"] else "__DEFAULT__"
#                     volume_id = create_data_volume(int(reg.additional_storage), f"{reg.full_name}_data_volume", data_volume_type)
#                     attach_volume_to_vm(reg.full_name, volume_id)

#                 res = run_shell_script_to_save_vm_details(vm_details, False)
#                 if res["status"]:
#                     vm_info.creation_status = "Approved"
#                     vm_info.host_name = res["host_name"]
#                     vm_info.username = res["username"]
#                     vm_info.instance_name = res["instance_name"]
#                     vm_info.vnc_display = res["vnc_display"]
#                     vm_info.ip = update_ip_by_vmname(vm_info.vm_name)
#                     vm_info.data_volume_id = volume_id
#                     vm_info.volume_id = created_bootable
#                     vm_info.vm_id = vm_instance_id
#                     vm_info.save()
#                     return Response({"status": "success", "message": res["message"]}, status=status.HTTP_200_OK)
#                 return Response({"status": "error", "message": res["message"]}, status=status.HTTP_400_BAD_REQUEST)

#             else:
#                 # Process VMs for students
#                 for vm_detail in vm_details:
#                     server = create_vm(conn, vm_detail["vm_name"], flavor_id, image_id, network_name)
#                     print(server, "VM created for:", vm_detail["vm_name"])

#                 res = run_shell_script_to_save_vm_details(vm_details, False)
#                 if res["status"]:
#                     vm_info.creation_status = "Approved"
#                     vm_info.host_name = res["host_name"]
#                     vm_info.instance_name = res["instance_name"]
#                     vm_info.vnc_display = res["vnc_display"]
#                     vm_info.username = res["username"]
#                     vm_info.ip = update_ip_by_vmname(vm_info.vm_name)
#                     vm_info.save()
#                     return Response({"status": "success", "message": res["message"]}, status=status.HTTP_200_OK)
#                 return Response({"status": "error", "message": res["message"]}, status=status.HTTP_400_BAD_REQUEST)

#         except Exception as e:
#             print(f"Error processing approval: {e}")
#             return Response({"status": "error", "message": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# -----------------------7 Jan 2025-----------------------------


class CreateGroupWithMembersAPIView(APIView):
    """
    API to create a group and map multiple members to it in OpenStack.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        try:
            # Parse the request data
            group_name = request.data.get('group_name')
            description = request.data.get('description')
            member_ids = request.data.get('member_ids', [])

            if not group_name:
                return Response({"error": "Group name is required."}, status=status.HTTP_400_BAD_REQUEST)

            if not isinstance(member_ids, list) or len(member_ids) == 0:
                return Response({"error": "A list of member IDs is required."}, status=status.HTTP_400_BAD_REQUEST)

            # Establish OpenStack connection
            conn = get_openstack_connection()

            # Create the group
            group = conn.identity.create_group(name=group_name,description=description)

            if not group:
                return Response({"error": "Failed to create group."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            # Map members to the group
            assigned_members = []
            errors = []

            for member_id in member_ids:
                try:
                    user = conn.identity.get_user(member_id)
                    if not user:
                        errors.append(f"User with ID '{member_id}' not found.")
                        continue

                    conn.identity.add_user_to_group(group=group, user=user)
                    assigned_members.append(member_id)
                except Exception as e:
                    errors.append(f"Failed to add user with ID '{member_id}' to group: {str(e)}")

            # Build the response
            response_data = {
                "group_id": group.id,
                "description": group.description,
                "group_name": group.name,
                "assigned_members": assigned_members,
                "errors": errors,
            }

            return Response(response_data, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ---------------------------17 Mar 2025--------------------------
class ListRolesAPIView(APIView):
    """
    API to list all roles in OpenStack.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            conn = get_openstack_connection()

            # Fetch all roles
            roles = conn.identity.roles()
            role_list = [{"id": role.id, "name": role.name} for role in roles]

            return Response(role_list, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class DeleteRoleAPIView(APIView):
    """
    API to delete a role in OpenStack.
    """
    permission_classes = [IsAuthenticated]

    def delete(self, request, role_id):
        try:
            conn = get_openstack_connection()

            # Check if role exists
            role = conn.identity.find_role(role_id)
            if not role:
                return Response({"error": "Role not found"}, status=status.HTTP_404_NOT_FOUND)

            # Delete role
            conn.identity.delete_role(role_id)

            return Response({"message": "Role deleted successfully"}, status=status.HTTP_204_NO_CONTENT)

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class CreateRoleAPIView(APIView):
    """
    API to create a role in OpenStack.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            conn = get_openstack_connection()

            role_name = request.data.get("name")
            if not role_name:
                return Response({"error": "Role name is required"}, status=status.HTTP_400_BAD_REQUEST)

            # Check if the role already exists
            existing_roles = list(conn.identity.roles())
            for role in existing_roles:
                if role.name == role_name:
                    return Response({"error": "Role already exists"}, status=status.HTTP_400_BAD_REQUEST)

            # Create role if it doesn't exist
            new_role = conn.identity.create_role(name=role_name)

            return Response(
                {"message": "Role created successfully", "role_id": new_role.id,"role_name": new_role.name},
                status=status.HTTP_201_CREATED
            )

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ---------------------------18 March 2025-----------------------------


class EditRoleAPIView(APIView):
    """
    API to edit an existing role in OpenStack.
    """
    permission_classes = [IsAuthenticated]
    
    def put(self, request, role_id):
        try:
            conn = get_openstack_connection()
            new_name = request.data.get("name")
            
            if not new_name:
                return Response({"error": "New role name is required"}, status=status.HTTP_400_BAD_REQUEST)
            
            # Check if role exists
            role = conn.identity.find_role(role_id)
            if not role:
                return Response({"error": "Role not found"}, status=status.HTTP_404_NOT_FOUND)
            
            # Check if new name already exists
            existing_roles = list(conn.identity.roles())
            for existing_role in existing_roles:
                if existing_role.name == new_name and existing_role.id != role_id:
                    return Response({"error": "Role name already exists"}, status=status.HTTP_409_CONFLICT)
            
            # Update role
            conn.identity.update_role(role, name=new_name)
            return Response({"message": "Role updated successfully"}, status=status.HTTP_200_OK)
        
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)



class ServiceMonitorView(APIView):
    """
    API to edit an existing role in OpenStack.
    """
    permission_classes = [IsAuthenticated]
    """
    REST API endpoint that proxies requests to the OpenStack service monitor
    and returns the response.
    """
    def get(self, request):
        # URL of the service monitor
        SERVICE_MONITOR_URL = f"{SERVER_URL}/service-monitor"
        print(SERVICE_MONITOR_URL)
        try:
            logger.info(f"Sending request to {SERVICE_MONITOR_URL}")
            
            # Set a timeout to avoid hanging if the service is unresponsive
            response = requests.get(SERVICE_MONITOR_URL, timeout=30)
            
            # Log the status code
            logger.info(f"Received response with status code: {response.status_code}")
            
            # Return the response with the same status code
            return Response(response.json(), status=response.status_code)
            
        except requests.exceptions.ConnectionError as e:
            logger.error(f"Connection error: {str(e)}")
            return Response({
                "error": "Failed to connect to the service monitor",
                "details": str(e)
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
            
        except requests.exceptions.Timeout as e:
            logger.error(f"Request timed out: {str(e)}")
            return Response({
                "error": "Request to service monitor timed out",
                "details": str(e)
            }, status=status.HTTP_504_GATEWAY_TIMEOUT)
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Request exception: {str(e)}")
            return Response({
                "error": "An error occurred while communicating with the service monitor",
                "details": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
        except Exception as e:
            logger.error(f"Unexpected error: {str(e)}")
            return Response({
                "error": "An unexpected error occurred",
                "details": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ListGroupsAPIView(APIView):
    """
    API to list all groups.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            # Initialize OpenStack connection
            conn = get_openstack_connection()

            # Fetch all groups
            groups = conn.identity.groups()
            group_list = [{"id": group.id, "name": group.name, "description": group.description} for group in groups]

            return Response(group_list, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# -------------------------------------------7 Apr 2025----------------------------

class UpdateGroupAPIView(APIView):
    """
    API to update an OpenStack group name.
    """
    permission_classes = [IsAuthenticated]

    def put(self, request, group_id):
        new_name = request.data.get("name")
        new_description = request.data.get("description")
        if not new_name:
            return Response({"error": "New group name is required."}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            conn = get_openstack_connection()
            group = conn.identity.find_group(group_id)

            if not group:
                return Response({"error": "Group not found."}, status=status.HTTP_404_NOT_FOUND)

            updated_group = conn.identity.update_group(group, name=new_name,description=new_description)
            return Response({
                "message": "Group updated successfully.",
                "group": {"id": updated_group.id, "name": updated_group.name, "description": updated_group.description}
            })

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class DeleteGroupAPIView(APIView):
    """
    API to delete an OpenStack group.
    """
    permission_classes = [IsAuthenticated]

    def delete(self, request, group_id):
        try:
            conn = get_openstack_connection()
            group = conn.identity.find_group(group_id)

            if not group:
                return Response({"error": "Group not found."}, status=status.HTTP_404_NOT_FOUND)

            conn.identity.delete_group(group)
            return Response({"message": "Group deleted successfully."}, status=status.HTTP_204_NO_CONTENT)

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)






# class ListGroupMembersAPIView(APIView):
#     """
#     API to list all groups.
#     """
#     permission_classes = [IsAuthenticated]

#     def get(self, request, group_id):
#         try:
#             # Initialize OpenStack connection
#             conn = get_openstack_connection()

#             # Fetch the group details
#             group = conn.identity.get_group(group_id)
#             if not group:
#                 return Response({"error": f"Group with ID '{group_id}' not found."}, status=status.HTTP_404_NOT_FOUND)

#             # Fetch all users
#             all_users = conn.identity.users()

#             # Filter users by group membership
#             members = []
#             for user in all_users:
#                 # Using list_groups_for_user (if available)
#                 user_groups = conn.identity.list_groups_for_user(user.id)
#                 if any(g.id == group_id for g in user_groups):
#                     members.append({"id": user.id, "name": user.name, "email": user.email})

#             # Return the list of members
#             return Response(
#                 {"group": group.name, "members": members},
#                 status=status.HTTP_200_OK
#             )

#         except Exception as e:
#             return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ListGroupMembersAPIView(APIView):
    """
    API to list all members of a given group.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, group_id):
        try:
            conn = get_openstack_connection()

            # Fetch group details
            group = conn.identity.get_group(group_id)
            if not group:
                return Response(
                    {"error": f"Group with ID '{group_id}' not found."},
                    status=status.HTTP_404_NOT_FOUND
                )

            members = []

            try:
                # Fetch all users
                users = list(conn.identity.users())
            except Exception as users_error:
                return Response(
                    {"error": f"Failed to fetch users: {users_error}"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

            # Check if each user is a member of the group
            for user in users:
                try:
                    if conn.identity.check_user_in_group(user.id, group_id):
                        members.append({
                            "id": user.id,
                            "name": user.name,
                            "email": getattr(user, "email", "N/A")  # Handle missing emails
                        })
                except Exception as check_error:
                    print(f"Error checking user {user.id}: {check_error}")

            return Response(
                {"group": group.name, "members": members},
                status=status.HTTP_200_OK
            )

        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# class ListGroupMembersAPIView(APIView):
#     """
#     API to list all members of a given group.
#     """
#     permission_classes = [IsAuthenticated]

#     def get(self, request, group_id):
#         try:
#             # Initialize OpenStack connection
#             conn = get_openstack_connection()

#             # Fetch the group details
#             group = conn.identity.get_group(group_id)
#             if not group:
#                 return Response({"error": f"Group with ID '{group_id}' not found."}, status=status.HTTP_404_NOT_FOUND)

#             try:
#                 # Fetch all users
#                 all_users = conn.identity.users()

#                 # Filter users based on group membership
#                 members = []
#                 for user in all_users:
#                     try:
#                         user_groups = list(conn.identity.groups(user=user.id))  # Fetch groups for the user
#                         if any(g.id == group_id for g in user_groups):  # Check if user belongs to the group
#                             members.append({
#                                 "id": user.id,
#                                 "name": user.name,
#                                 "email": getattr(user, "email", "N/A")  # Handle missing email field
#                             })
#                     except Exception as user_group_error:
#                         print(f"Error fetching groups for user {user.id}: {user_group_error}")

#             except Exception as users_error:
#                 return Response({"error": f"Failed to fetch users: {users_error}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

#             if not members:
#                 return Response(
#                     {"message": f"No users found in the group '{group.name}'."},
#                     status=status.HTTP_404_NOT_FOUND
#                 )

#             return Response(
#                 {"group": group.name, "members": members},
#                 status=status.HTTP_200_OK
#             )

#         except Exception as e:
#             return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ComputeServicesView(APIView):
    def get(self, request, *args, **kwargs):
        try:
            conn = get_openstack_connection()

            # Fetch compute service details
            services = conn.compute.services()

            # Prepare response data
            service_list = []
            for service in services:
                print(service)
                service_list.append({
                    'Name': service.binary,
                    'Host': service.host,
                    'Zone': service.location.zone,  # Access zone from location                    'Status': service.status,
                    'Status': service.status,
                    'State': service.state,
                    'Last Updated': service.updated_at
                })

            return JsonResponse({
                'success': True,
                'data': service_list
            }, status=200)

        except Exception as e:
            return JsonResponse({
                'success': False,
                'error': str(e)
            }, status=500)

class BlockStorageServicesView(APIView):
    def get(self, request, *args, **kwargs):
        try:
            conn = get_openstack_connection()

            # Fetch block storage service details
            services = conn.block_storage.services()
            print(services)
            # Prepare response data
            service_list = []
            for service in services:
                print(service)
                service_list.append({
                    'Name': service.binary,
                    'Host': service.host,
                    'Zone': service.location.zone,
                    'Status': service.status,
                    'State': service.state,
                    'Last Updated': service.updated_at
                })

            return JsonResponse({
                'success': True,
                'data': service_list
            }, status=200)

        except Exception as e:
            return JsonResponse({
                'success': False,
                'error': str(e)
            }, status=500)
            
            
            
            
# class NetworkAgentsView(APIView):
#     def get(self, request, *args, **kwargs):
#         try:
#             conn = get_openstack_connection()

#             # Fetch network agent details
#             agents = conn.network.agents()
#             print(agents)
#             # Prepare response data
            
            
#             agent_list = []
#             for agent in agents:
#                 print(dir(agent))
#                 agent_list.append({
#                     'Type': agent.agent_type,
#                     'Name': agent.binary,
#                     'Host': agent.host,
#                     'Zone': agent.availability_zone or '-',
#                     # 'Status': agent.created_at,
#                     # # 'State': agent.alive and 'Up' or 'Down',
#                     # 'Last Updated': agent.heartbeat_timestamp,

#                 })
#                 if hasattr(agent, 'configurations'):
#                     agent_list.update({
#                         'Networks': agent.configurations.get('networks', '-'),
#                         'Ports': agent.configurations.get('ports', '-'),
#                         'Subnets': agent.configurations.get('subnets', '-')
#                     })
                
#                 agent_list.append(agent_list)

#             return JsonResponse({
#                 'success': True,
#                 'data': agent_list
#             }, status=200)

#         except Exception as e:
#             return JsonResponse({
#                 'success': False,
#                 'error': str(e)
#             }, status=500)
            
class NetworkAgentsView(APIView):
    def get(self, request, *args, **kwargs):
        try:
            conn = get_openstack_connection()
            # Fetch network agent details
            agents = conn.network.agents()
            
            # Prepare response data
            agent_list = []
            for agent in agents:
                print(agent)
                # Create a base dictionary for each agent
                agent_data = {
                    'Type': agent.agent_type,
                    'Name': agent.binary,
                    'Host': agent.host,
                    'Zone': agent.availability_zone or '-',
                    'AdminStateUp': agent.is_admin_state_up,
                    'HeartbeatTimestamp': agent.last_heartbeat_at,
                }
                
                # Add network configuration details if they exist
                # Using .get() method to avoid KeyError if keys don't exist
                if hasattr(agent, 'configurations'):
                    agent_data.update({
                        'Networks': agent.configurations.get('networks', '-'),
                        'Ports': agent.configurations.get('ports', '-'),
                        'Subnets': agent.configurations.get('subnets', '-')
                    })
                
                agent_list.append(agent_data)
                
            return JsonResponse({
                'success': True,
                'data': agent_list
            }, status=200)
        except Exception as e:
            return JsonResponse({
                'success': False,
                'error': str(e)
            }, status=500)
            
            
# ----------------------------23 jan 2025----------------------------------------



class ListVmRequestsByEmployeeAPIView(APIView):
    """
    API to list VM requests made by a specific employee.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, employee_id):
        try:
            # Fetch all VM requests for the given employee_id
            vm_requests = VmRequest.objects.filter(employee_id=employee_id)

            if not vm_requests.exists():
                return Response(
                    {"message": f"No VM requests found for employee ID {employee_id}"},
                    status=status.HTTP_404_NOT_FOUND
                )

            # Serialize the data
            serializer = VmRequestSerializer(vm_requests, many=True)

            return Response(serializer.data, status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {"error": f"An error occurred: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
            
            
            
# --------------------------------15 March 2025---------------------------------

class ApprovedVMsAPIView(APIView):
    permission_classes = [IsAuthenticated]

    """
    Fetch approved VM requests based on user role:
    - ADMIN: All approved requests.
    - FLA: Own + employees’ approved requests.
    - USER: Only own approved requests.
    """

    def get(self, request):
        try:
            role = request.auth.get("role", None)
            employee_id = request.auth.get("employee_id", None)

            # --- Determine dataset based on role ---
            if role == "ADMIN":
                queryset = VmRequest.objects.filter(
                    fla_status="Accepted", admin_status="Accepted"
                )
            elif role == "FLA":
                # Fetch all employees managed by this FLA
                related_emp_ids = Employee.objects.filter(
                    fla_employee_id=employee_id
                ).values_list("employee_id", flat=True)
                queryset = VmRequest.objects.filter(
                    Q(employee_id__in=related_emp_ids) | Q(employee_id=employee_id),
                    fla_status="Accepted",
                    admin_status="Accepted",
                )
            else:
                # Regular user → only their own accepted requests
                queryset = VmRequest.objects.filter(
                    employee_id=employee_id,
                    fla_status="Accepted",
                    admin_status="Accepted",
                )

            # --- Pagination ---
            page = int(request.GET.get("page", 1))
            size = int(request.GET.get("size", 10))
            total_records = queryset.count()
            start = (page - 1) * size
            end = start + size
            queryset = queryset.order_by("-admin_approved_timestamp")[start:end]

            # --- Prepare Response Data ---
            data = []
            for vm in queryset:
                emp = Employee.objects.filter(employee_id=vm.employee_id).values(
                    "name", "fla_name", "fla_employee_id"
                ).first()

                vm_info = VMInfo.objects.filter(vm_name__startswith=vm.vm_name).values(
                    "ip", "username"
                )

                # Aggregate IPs
                ip_list = [vmi["ip"] for vmi in vm_info]
                username = vm_info[0]["username"] if vm_info else "Not Available"

                data.append({
                    "id": vm.id,
                    "vm_name": vm.vm_name,
                    "employee_id": vm.employee_id,
                    "name": emp["name"] if emp else "Unknown",
                    "fla_name": emp["fla_name"] if emp else "Unknown",
                    "fla_employee_id": emp["fla_employee_id"] if emp else "Unknown",
                    "project_name": vm.project_name,
                    "purpose": vm.purpose,
                    "image": vm.image,
                    "flavor": vm.flavor,
                    "purpose_of_request": vm.purpose_of_request,
                    "count_of_vms": vm.count_of_vms,
                    "ip": ", ".join(ip_list) if ip_list else "Not Available",
                    "username": username,
                    "admin_status": vm.admin_status,
                    "fla_status": vm.fla_status,
                    "admin_approved_timestamp": vm.admin_approved_timestamp,
                })

            return Response(
                {
                    "role": role,
                    "total_records": total_records,
                    "page": page,
                    "size": size,
                    "data": data,
                },
                status=status.HTTP_200_OK,
            )

        except Exception as e:
            print(f"❌ Error in ApprovedVMsAPIView: {str(e)}")
            return Response(
                {"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )



# class ApprovedVMsAPIView(APIView):
#     permission_classes = [IsAuthenticated]  # Only authenticated users can access this API

#     def get(self, request):
#         """
#         Fetch VM requests based on user role:
#         - If admin: Show all approved VM requests.
#         - If FLA: Show own VM requests + requests of employees they are responsible for.
#         - If normal user: Show only their own approved VM requests.
#         """
#         try:
#             is_admin = True if request.user.is_superuser else False
#             # Fetch the employee based on the authenticated user's email
#             print(f"🔍 Fetching employee for user: {request.user.email}", is_admin)
#             if not is_admin:
#                 current_employee = Employee.objects.filter(email=request.user.email).first()

#                 if not current_employee:
#                     return Response(
#                         {"error": "Employee record not found."},
#                         status=status.HTTP_404_NOT_FOUND
#                     )

#                 print(f"✅ Employee found: {current_employee}")

#             # Check if the user is an Admin
#                 # is_admin = current_employee.group.lower() == "admin"
#                 is_fla = Employee.objects.filter(fla_employee_id=current_employee.employee_id).exists()  # Check if they are a FLA

#             # Fetch VM requests based on user role
#             if is_admin:
#                 # Admin: Get all VM requests where both FLA and Admin status are accepted
#                 approved_vms = VmRequest.objects.filter(
#                     fla_status="Accepted",
#                     admin_status="Accepted"
#                 ).values(
#                     'id',
#                     'vm_name',
#                     'count_of_vms',
#                     'employee_id',
#                     'project_name',
#                     'purpose',
#                     'image',
#                     'flavor',
#                     'purpose_of_request',
#                     'admin_status'
#                 )
#                 print("approved vms",approved_vms)
#                 # Fetch details for each VM request
#                 for vm in approved_vms:
#                     emp = Employee.objects.filter(employee_id=vm['employee_id']).values('name', 'fla_name', 'fla_employee_id').first()
#                     if emp:
#                         vm['name'] = emp['name']
#                         vm['fla_name'] = emp['fla_name']
#                         vm['fla_employee_id'] = emp['fla_employee_id']
#                     else:
#                         vm['name'] = "Unknown"
#                         vm['fla_name'] = "Unknown"
#                         vm['fla_employee_id'] = "Unknown"
#                 for vm in approved_vms:
#                     # vm_info = VMInfo.objects.filter(vm_name=vm['vm_name']).values('ip', 'username').first()
#                     # print(vm_info)
#                     # if vm_info:
#                     #     vm['ip'] = vm_info['ip']
#                     #     vm['username'] = vm_info['username']
#                     # else:
#                     #     vm['ip'] = "Not Available"
#                     #     vm['username'] = "Not Available"
#                     vm_info = VMInfo.objects.filter(vm_name__startswith=vm['vm_name']).values('ip', 'username')

#                     # Initialize the IP and username fields
#                     vm['ip'] = ''
#                     vm['username'] = ''

#                     # Collect IPs and get username (assuming all entries have same username)
#                     ip_list = []
#                     for vmi in vm_info:
#                         ip_list.append(vmi['ip'])
#                         vm['username'] = vmi['username']  # Last one will be set; change logic if needed

#                     # Join all IPs with commas
#                     vm['ip'] = ','.join(ip_list)

#                     # Optional: strip trailing comma if exists (just to be safe)
#                     vm['ip'] = vm['ip'].strip(',')



#             elif is_fla:
#                 # FLA: Get their own requests + requests of employees they manage
#                 fla_related_emp_ids = Employee.objects.filter(fla_employee_id=current_employee.employee_id).values_list('employee_id', flat=True)
#                 print(f"🔹 Employees managed by FLA: {list(fla_related_emp_ids)}")

#                 approved_vms = VmRequest.objects.filter(
#                     employee_id__in=[current_employee.employee_id] + list(fla_related_emp_ids),
#                     fla_status="Accepted",
#                     admin_status="Accepted"
#                 ).values(
#                     'id',
#                     'vm_name',
#                     'count_of_vms',
#                     'employee_id',
#                     'project_name',
#                     'purpose',
#                     'image',
#                     'flavor',
#                     'purpose_of_request',
#                     'admin_status'
#                 )
                
#                 # for vm in approved_vms:
#                 #     emp = Employee.objects.filter(employee_id=vm['employee_id']).values('name').first()
#                 #     if emp:
#                 #         vm['name'] = emp['name']
                       
#                 #     else:
#                 #         vm['name'] = "Unknown"
#                 #         # Fetch VMInfo details (IP & username) using vm_name
#                 for vm in approved_vms:
#                     # vm_info = VMInfo.objects.filter(vm_name=vm['vm_name']).values('ip', 'username').first()
#                     # print(vm_info)
#                     # if vm_info:
#                     #     vm['ip'] = vm_info['ip']
#                     #     vm['username'] = vm_info['username']
#                     # else:
#                     #     vm['ip'] = "Not Available"
#                     #     vm['username'] = "Not Available"
#                     vm_info = VMInfo.objects.filter(vm_name__startswith=vm['vm_name']).values('ip', 'username')

#                     # Initialize the IP and username fields
#                     vm['ip'] = ''
#                     vm['username'] = ''

#                     # Collect IPs and get username (assuming all entries have same username)
#                     ip_list = []
#                     for vmi in vm_info:
#                         ip_list.append(vmi['ip'])
#                         vm['username'] = vmi['username']  # Last one will be set; change logic if needed

#                     # Join all IPs with commas
#                     vm['ip'] = ','.join(ip_list)

#                     # Optional: strip trailing comma if exists (just to be safe)
#                     vm['ip'] = vm['ip'].strip(',')

#             else:
#                 # Normal User: Get only their own VM requests that are accepted
#                 approved_vms = VmRequest.objects.filter(
#                     employee_id=current_employee.employee_id,
#                     fla_status="Accepted",
#                     admin_status="Accepted"
#                 ).values(
#                     'id',
#                     'vm_name',
#                     'count_of_vms',
#                     'project_name',
#                     'purpose',
#                     'fla_status',
#                     'admin_status'
#                 )
#                 for vm in approved_vms:
#                     vm_info = VMInfo.objects.filter(vm_name=vm['vm_name']).values('ip', 'username').first()
#                     print(vm_info)
#                     if vm_info:
#                         vm['ip'] = vm_info['ip']
#                         vm['username'] = vm_info['username']
#                     else:
#                         vm['ip'] = "Not Available"
#                         vm['username'] = "Not Available"

#             # Check if any results exist
#             if not approved_vms.exists():
#                 return Response(
#                     {"message": "No VM requests found for the current user."},
#                     status=status.HTTP_404_NOT_FOUND
#                 )

#             return Response(list(approved_vms), status=status.HTTP_200_OK)

#         except Exception as e:
#             print(f"❌ Error: {str(e)}")
#             return Response(
#                 {"error": "An unexpected error occurred."},
#                 status=status.HTTP_500_INTERNAL_SERVER_ERROR
#             )




            
            
            

# -------------------------------7 Feb 2025----------------------------------


class ImageDetailAPIView(APIView):
    """
    API to fetch details of a selected image and create a bootable volume with it.
    """
    # print("ImageDetailAPIView")
    permission_classes = [IsAuthenticated]

    def get(self, request, image_id):
        """
        Fetch details of an image using image_id.
        """
        try:
            conn = get_openstack_connection()
            image = conn.image.get_image(image_id)

            if not image:
                return Response({"error": "Image not found."}, status=status.HTTP_404_NOT_FOUND)

            image_details = {
                "id": image.id,
                "name": image.name,
                "size": image.size,
                "status": image.status,
                "disk_format": image.disk_format,
                "visibility": image.visibility
            }
            return Response(image_details, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def post(self, request, image_id):
        # """
        # Create a bootable volume from the selected image with user-defined fields.
        # """
        try:
            conn = get_openstack_connection()
            
            # Validate if the image exists
            image = conn.image.get_image(image_id)
            if not image:
                return Response({"error": "Image not found."}, status=status.HTTP_404_NOT_FOUND)

            # Extract required fields from request
            volume_name = request.data.get("name")
            volume_type = request.data.get("type", "default")
            volume_size = int(request.data.get("size", image.size // (1024 * 1024 * 1024)))  # Default to image size in GB
            availability_zone = request.data.get("availability_zone", "nova")  # Default availability zone

            if not volume_name:
                return Response({"error": "Volume name is required."}, status=status.HTTP_400_BAD_REQUEST)

            # Create bootable volume
            volume = conn.block_storage.create_volume(
                name=volume_name,
                size=volume_size,
                volume_type=volume_type,
                availability_zone=availability_zone,
                # bootable=True,
                image_id=image.id
            )

            return Response(
                {
                    "message": f"Bootable volume '{volume_name}' created successfully",
                    "volume_id": volume.id,
                    "size": volume.size,
                    "availability_zone": volume.availability_zone
                },
                status=status.HTTP_201_CREATED
            )

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)



IMAGE_STORAGE_PATH = "/home/rakshana/Documents/images/"  # Directory to store images

class OpenStackImageCreateViewUpdated(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser)

    def post(self, request, *args, **kwargs):
        file_obj = request.FILES['file']
        image_name = request.data.get('image_name', file_obj.name)

        # Save the image locally
        if not os.path.exists(IMAGE_STORAGE_PATH):
            os.makedirs(IMAGE_STORAGE_PATH)
        
        local_file_path = os.path.join(IMAGE_STORAGE_PATH, file_obj.name)
        with open(local_file_path, 'wb') as f:
            for chunk in file_obj.chunks():
                f.write(chunk)

        # Establish OpenStack connection
        conn = connection.Connection(
            auth_url=os.getenv('AUTH_URL'),
            project_name=os.getenv('PROJECT_NAME'),
            username='admin',
            password=os.getenv('PASSWORD'),
            user_domain_name=os.getenv('USER_DOMAIN_NAME'),
            project_domain_name=os.getenv('PROJECT_DOMAIN_NAME')
        )

        # Upload image to OpenStack
        with open(local_file_path, 'rb') as image_data:
            image = conn.image.upload_image(name=image_name, data=image_data, disk_format='qcow2', container_format='bare')

        # Save record in database
        ImageRecord.objects.create(name=image_name, file_path=local_file_path, image_id=image.id)

        return Response({'message': 'Image created successfully in OpenStack', 'image_id': image.id}, status=201)




# ------------------------15 may 2025 -------------------------

class OpenStackImageCreateViewUpdated1(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser)

    def post(self, request, *args, **kwargs):
        file_obj = request.FILES['file']
        image_name = request.data.get('image_name', file_obj.name)

        # Additional fields
        image_description = request.data.get('image_description', '')
        # image_source = request.data.get('image_source', '')
        disk_format = request.data.get('disk_format', 'qcow2').lower()  # e.g., qcow2, iso, raw
        container_format = 'bare'  # usually 'bare', can be changed if needed
        kernel_id = request.data.get('kernel', None)
        ramdisk_id = request.data.get('ramdisk', None)
        architecture = request.data.get('architecture', None)
        min_disk = int(request.data.get('min_disk', 0))
        min_ram = int(request.data.get('min_ram', 0))
        visibility = request.data.get('image_sharing', 'private').lower()  # private/shared/public/community
        protected = request.data.get('protected', 'no').lower() == 'yes'

        # Save the image locally
        if not os.path.exists(IMAGE_STORAGE_PATH):
            os.makedirs(IMAGE_STORAGE_PATH)
        
        local_file_path = os.path.join(IMAGE_STORAGE_PATH, file_obj.name)
        with open(local_file_path, 'wb') as f:
            for chunk in file_obj.chunks():
                f.write(chunk)

        # Establish OpenStack connection
        conn = connection.Connection(
            auth_url=os.getenv('AUTH_URL'),
            project_name=os.getenv('PROJECT_NAME'),
            username='admin',
            password=os.getenv('PASSWORD'),
            user_domain_name=os.getenv('USER_DOMAIN_NAME'),
            project_domain_name=os.getenv('PROJECT_DOMAIN_NAME')
        )

        # Prepare metadata dictionary
        image_metadata = {
            'name': image_name,
            'data': open(local_file_path, 'rb'),
            'disk_format': disk_format,
            'container_format': container_format,
            'visibility': visibility,
            'min_disk': min_disk,
            'min_ram': min_ram,
            'protected': protected,
            'description': image_description,
            'architecture': architecture
        }

        if kernel_id:
            image_metadata['kernel_id'] = kernel_id

        if ramdisk_id:
            image_metadata['ramdisk_id'] = ramdisk_id

        # Upload image to OpenStack
        image = conn.image.upload_image(**image_metadata)

        # Save record in your database (you can add these new fields in your ImageRecord model)
        ImageRecord.objects.create(
            name=image_name,
            file_path=local_file_path,
            image_id=image.id,
            description=image_description,
            # source=image_source,
            disk_format=disk_format,
            container_format=container_format,
            min_disk=min_disk,
            min_ram=min_ram,
            protected=protected,
            architecture=architecture,
            visibility=visibility,
        )

        return Response({
            'message': 'Image created successfully in OpenStack',
            'image_id': image.id
        }, status=201)


# field required are
# image name - name of image
# image description - description of image
# image source - source of image
# disk format - qcow2, iso, raw
# kernnel - default with text choose a image
# ramdisk - default with text choose a image
# architecture - will be x86 text field
# minimum disk - default 0
# minimum ram - default 0
# visibility- private/shared/public/community
# protected - yes /no 


class OpenStackImageListView(APIView):
    """
    API to list stored images with download links.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        images = ImageRecord.objects.all()
        image_list = [
            {
                "name": img.name,
                "image_id": img.image_id,
                "download_url": f"/api/download-image/{img.image_id}/"
            } for img in images
        ]
        return Response({"images": image_list}, status=200)


class OpenStackImageDownloadView(APIView):
    """
    API to download stored images.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, image_id):
        try:
            img_record = ImageRecord.objects.get(image_id=image_id)
            print(img_record.file_path)
            if os.path.exists(img_record.file_path):
                return FileResponse(open(img_record.file_path, "rb"), as_attachment=True, filename=img_record.name)
            else:
                return HttpResponseNotFound("File not found")
        except ImageRecord.DoesNotExist:
            return HttpResponseNotFound("Image record not found")


# ---------------------------------10 Feb 2025 ---------------------


class FloatingIPView(APIView):
    """
    API to manage OpenStack Floating IPs.
    """
    permission_classes = [IsAuthenticated]

  
    def get(self, request):
        """ List all floating IPs """
        conn = get_openstack_connection()
        floating_ips = []
        
        for ip in conn.network.ips():
            floating_ips.append({
                "id": ip.id,
                "floating_ip_address": ip.floating_ip_address,
                "fixed_ip_address": ip.fixed_ip_address,
                "port_id": ip.port_id,
                "status": ip.status
            })

        return Response({"floating_ips": floating_ips}, status=status.HTTP_200_OK)

    def post(self, request):
        """
        Create a new floating IP in OpenStack.
        Request Payload:
        {
            "network_id": "network-uuid"
        }
        """
        conn = get_openstack_connection()
        network_id = request.data.get("network_id")

        if not network_id:
            return Response({"error": "network_id is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            floating_ip = conn.network.create_ip(floating_network_id=network_id)
            return Response({
                "id": floating_ip.id,
                "floating_ip_address": floating_ip.floating_ip_address,
                "status": floating_ip.status
            }, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

# ------------------------------26 Feb 2025 ----------------------------
  
class AssociateFloatingIPView(APIView):
    """
    API to allocate and associate a floating IP with an instance.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """
        Request Payload:
        {
            "network_pool": "External Network",
            "project_name": "new_project_rakshana",
            "floating_ip": "optional_existing_ip",  # Optional: If not provided, a new one will be allocated.
            "description": "Assigning floating IP"
        }
        """
        try:
            conn = get_openstack_connection()
            
            network_pool = request.data.get("network_pool")
            project_name = request.data.get("project_name")
            floating_ip = request.data.get("floating_ip")  # Optional
            description = request.data.get("description", "")

            print("network_pool:", network_pool, "project_name:", project_name, "floating_ip:", floating_ip,)
            if not network_pool or not project_name:
                return Response({"error": "Both 'network_pool' and 'project_name' are required"}, status=status.HTTP_400_BAD_REQUEST)

            # Fetch Project
            project = conn.identity.find_project(project_name)
            if not project:
                return Response({"error": f"Project '{project_name}' not found"}, status=status.HTTP_404_NOT_FOUND)

            # Fetch Network
            network = conn.network.find_network(network_pool)
            if not network:
                return Response({"error": f"Network '{network_pool}' not found"}, status=status.HTTP_404_NOT_FOUND)

            # Handle Floating IP (If provided)
            if floating_ip:
                fip = conn.network.find_ip(floating_ip)
                if not fip:
                    return Response({"error": f"Floating IP '{floating_ip}' not found"}, status=status.HTTP_404_NOT_FOUND)
            else:
                # Allocate a new floating IP
                fip = conn.network.create_ip(floating_network_id=network.id, description=description)
                floating_ip = fip.floating_ip_address

            return Response({
                "message": f"Floating IP {floating_ip} successfully assigned",
                "project_id": project.id,
                "network_id": network.id,
                "floating_ip": floating_ip
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        
class ReleaseFloatingIPView(APIView):
    """
    API to release (disassociate and delete) a floating IP from an instance.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        floating_ip = request.data.get("floating_ip")

        if not floating_ip:
            return Response({"error": "Floating IP is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            conn = get_openstack_connection()

            # Find the floating IP object
            fip = conn.network.find_ip(floating_ip)
            if not fip:
                return Response({"error": f"Floating IP '{floating_ip}' not found"}, status=status.HTTP_404_NOT_FOUND)

            # Check if the floating IP is associated
            if fip.port_id:
                conn.network.update_ip(fip, port_id=None)  # Disassociate from instance

            # Delete the floating IP to fully release it
            conn.network.delete_ip(fip)

            return Response({"message": f"Floating IP {floating_ip} successfully released and deleted"}, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class DeleteFloatingIPView(APIView):
    """
    API to delete a floating IP from OpenStack.
    """
    permission_classes = [IsAuthenticated]
    def delete(self, request, floating_ip_id):
        try:
            conn = get_openstack_connection()

            # Find the floating IP
            fip = conn.network.get_ip(floating_ip_id)
            if not fip:
                return Response({"error": "Floating IP not found"}, status=status.HTTP_404_NOT_FOUND)

            # Delete the floating IP
            conn.network.delete_ip(floating_ip_id)
            return Response({"message": f"Floating IP {floating_ip_id} deleted successfully"}, status=status.HTTP_204_NO_CONTENT)

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        
        
        

class SendEmailView(View):
    def get(self, request):
        subject = "Hello from Django"
        message = "This is a test email from your Django app using a class-based view."
        from_email = "your_email@gmail.com"  # Must match EMAIL_HOST_USER in settings.py
        recipient_list = ["recipient@example.com"]

        try:
            send_mail(subject, message, from_email, recipient_list, fail_silently=False)
            return HttpResponse("Email sent successfully via CBV!")
        except Exception as e:
            return HttpResponse(f"Error sending email: {str(e)}")

# ------------------------------------26 March 2025--------------------------------\
class CreateVolumeTypeAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def extract_error_message(self, e):
        """
        Safely extract OpenStack / HTTP / SDK exception details.
        """
        # Case 1: OpenStack SDK exception with .details
        if hasattr(e, "details") and e.details:
            return e.details

        # Case 2: HTTP Response error
        if hasattr(e, "response") and e.response is not None:
            try:
                return e.response.json()
            except Exception:
                return e.response.text

        # Case 3: str(e) contains JSON
        try:
            return json.loads(str(e))
        except Exception:
            pass

        # Fallback
        return str(e)

    def post(self, request):
        volume_type_name = request.data.get("name")
        description = request.data.get("description", "")

        if not volume_type_name:
            return Response(
                {"error": "Volume type name is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            conn = get_openstack_connection()

            # Check if volume type already exists
            existing_types = list(conn.block_storage.types())

            for vtype in existing_types:
                if vtype.name.lower() == volume_type_name.lower():
                    return Response(
                        {
                            "exists": True,
                            "message": f"Volume type '{volume_type_name}' already exists."
                        },
                        status=status.HTTP_200_OK      # frontend will detect exists=true
                    )

            # Create new volume type
            volume_type = conn.block_storage.create_type(
                name=volume_type_name,
                description=description
            )

            return Response(
                {
                    "message": "Volume type created successfully.",
                    "volume_type_id": volume_type.id,
                    "name": volume_type.name,
                    "description": volume_type.description,
                },
                status=status.HTTP_201_CREATED
            )

        except Exception as e:
            error_message = self.extract_error_message(e)

            return Response(
                {"error": error_message},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class UpdateVolumeTypeAPIView(APIView):
    """
    API to update both name and description of a volume type in OpenStack using its ID.
    """
    permission_classes = [IsAuthenticated]

    def put(self, request, volume_type_id):
        new_name = request.data.get("name")
        new_description = request.data.get("description")

        # Require both fields
        if not new_name or not new_description:
            return Response(
                {"error": "Both 'name' and 'description' fields are required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            conn = get_openstack_connection()

            # Fetch volume type by ID
            volume_type = conn.block_storage.get_type(volume_type_id)

            if not volume_type:
                return Response(
                    {"error": f"Volume type with ID '{volume_type_id}' not found."},
                    status=status.HTTP_404_NOT_FOUND
                )

            # Update the volume type
            updated_volume_type = conn.block_storage.update_type(
                volume_type_id,
                name=new_name,
                description=new_description
            )

            return Response(
                {
                    "message": f"Volume type '{volume_type_id}' updated successfully.",
                    "volume_type_id": updated_volume_type.id,
                    "name": updated_volume_type.name,
                    "description": updated_volume_type.description,
                },
                status=status.HTTP_200_OK
            )

        except Exception as e:
            return Response(
                {"error": "An error occurred while updating the volume type.", "details": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
#-------------------------------------------------------------------------------------------------------------
class DeleteVolumeTypeAPIView(APIView):
    """
    API to delete a volume type in OpenStack using its ID.
    """

    def delete(self, request, volume_type_id):
        try:
            conn = get_openstack_connection()

            # Fetch the volume type by ID
            volume_type = conn.block_storage.get_type(volume_type_id)

            if not volume_type:
                return Response(
                    {"message": f"Volume type with ID '{volume_type_id}' not found."},
                    status=status.HTTP_404_NOT_FOUND
                )

            # Delete the volume type
            conn.block_storage.delete_type(volume_type_id)

            return Response(
                {"message": f"Volume type '{volume_type_id}' deleted successfully."},
                status=status.HTTP_200_OK
            )

        except Exception as e:
            return Response(
                {"error": "An error occurred while deleting the volume type.", "details": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

# ---------------------------------------7 Apr 2025 --------------------------------
class ListVolumesAPIView(APIView):
    """
    List all volumes in OpenStack.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            conn = get_openstack_connection()
            volumes = conn.block_storage.volumes(details=True)
            print(volumes)
            volume_list = []
            for vol in volumes:
                # print(vol)
                # print("Dict----->",vol.to_dict())
                vol_details = conn.block_storage.get_volume(vol.id)
                vol_dict = vol_details.to_dict()
                volume_list.append({
                "id": vol_dict.get("id"),
                "name": vol_dict.get("name"),
                "status": vol_dict.get("status"),
                "size": vol_dict.get("size"),
                "attached_to": vol_dict["attachments"][0].get("device") if vol_dict.get("attachments") else None,
                "volume_type": vol_dict.get("volume_type"),
                "description": vol_dict.get("description"),
                "created_at": vol_dict.get("created_at"),
                "host": vol_dict.get("host"),  # Corrected
                "bootable": vol_dict.get("is_bootable", False),  # Corrected
                "encrypted": vol_dict.get("is_encrypted", False),  # Corrected
            })
            

            return Response(volume_list, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class DeleteVolumeAPIView(APIView):
    """
    API to delete a volume in OpenStack by volume ID.
    """
    permission_classes = [IsAuthenticated]
    def delete(self, request, volume_id):
        conn = get_openstack_connection()

        try:
            # Get the volume by ID
            volume = conn.block_storage.get_volume(volume_id)

            if not volume:
                return Response({"error": "Volume not found."}, status=status.HTTP_404_NOT_FOUND)

            # Delete the volume
            conn.block_storage.delete_volume(volume, ignore_missing=False)

            return Response({"message": f"Volume '{volume_id}' deleted successfully."}, status=status.HTTP_200_OK)

        except ResourceNotFound:
            return Response({"error": "Volume not found."}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({"error": "Failed to delete volume.", "details": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class UpdateVolumeStatusAPIView(APIView):
    """
    Update the status of a volume (Admin only operation).
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, volume_id):
        new_status = request.data.get("status")

        if not new_status:
            return Response({"error": "Status field is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            conn = get_openstack_connection()
            volume = conn.block_storage.get_volume(volume_id)

            if not volume:
                return Response({"error": "Volume not found."}, status=status.HTTP_404_NOT_FOUND)

            # Force update volume status (Admin-only API)
            conn.block_storage.set_volume_status(volume, status=new_status)

            return Response({
                "message": f"Volume status updated to '{new_status}' successfully.",
                "volume_id": volume.id
            })

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# -------------------------------------2 Apr 2025 --------------------------------

class ListNodesAndVMsAPIView(APIView):
    """
    API to list compute nodes and their respective VMs in OpenStack.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
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

            return Response({"nodes": node_vm_mapping}, status=200)

        except Exception as e:
            return Response({"error": str(e)}, status=500)


# ------------------------------------27 Feb 2025---------------------------------

from django.http import JsonResponse
from django.views import View
import requests
import json
import base64

# Zabbix server details
ZABBIX_URL = "http://10.184.49.245/zabbix/api_jsonrpc.php"
ZABBIX_USER = "Admin"
ZABBIX_PASSWORD = "zabbix"

class ZabbixAPI:
    def __init__(self):
        self.session = requests.Session()
        self.auth_token = self.login()

    def login(self):
        """Authenticate with Zabbix API and return auth token."""
        payload = {
            "jsonrpc": "2.0",
            "method": "user.login",
            "params": {
                "user": ZABBIX_USER,
                "password": ZABBIX_PASSWORD
            },
            "id": 1,
            "auth": None
        }
        response = self.session.post(ZABBIX_URL, json=payload, headers={"Content-Type": "application/json"})
        result = response.json()
        return result.get("result")

    def get_graphs(self, hostid):
        """Fetch all graphs for a given host."""
        payload = {
            "jsonrpc": "2.0",
            "method": "graph.get",
            "params": {
                "hostids": hostid,
                "output": ["graphid", "name"],
            },
            "auth": self.auth_token,
            "id": 2
        }
        response = self.session.post(ZABBIX_URL, json=payload, headers={"Content-Type": "application/json"})
        return response.json().get("result", [])

    def download_graph_image_base64(self, graphid, width=500, height=200):
        """Download graph as a base64-encoded image."""
        # Zabbix UI Login URL
        login_url = "http://10.184.49.245/zabbix/index.php"
        payload = {
            "name": ZABBIX_USER,
            "password": ZABBIX_PASSWORD,
            "enter": "Sign in"
        }

        # Perform UI login (this is different from the API login)
        self.session.post(login_url, data=payload)

        # Fetch graph image
        chart_url = f"http://10.184.49.245/zabbix/chart2.php?graphid={graphid}&width={width}&height={height}&period=3600&stime=now"
        response = self.session.get(chart_url)

        if response.status_code == 200:
            return f"data:image/png;base64,{base64.b64encode(response.content).decode('utf-8')}"
        else:
            return None

class ZabbixGraphAPI(View):
    def get(self, request, hostid):
        """Fetch graphs for a host and return as base64 images."""
        zabbix_api = ZabbixAPI()
        graphs = zabbix_api.get_graphs(hostid)

        # Graphs to fetch
        graph_names = [
            "Memory usage", "CPU usage", "System load",
            "CPU utilization", "Memory utilization"
        ]

        # Filter graphs based on predefined names
        selected_graphs = []
        for graph in graphs:
            if graph["name"] in graph_names:
                base64_image = zabbix_api.download_graph_image_base64(graph["graphid"])
                if base64_image:
                    selected_graphs.append({
                        "name": graph["name"],
                        "graphid": graph["graphid"],
                        "base64_image": base64_image
                    })

        return JsonResponse({"graphs": selected_graphs}, safe=False)



# ----------------------------28 Feb 2025--------------------------------



# Zabbix API credentials
ZABBIX_URL = "http://10.184.49.245/zabbix/api_jsonrpc.php"
ZABBIX_USER = "Admin"
ZABBIX_PASSWORD = "zabbix"

# Function to authenticate with Zabbix API
def zabbix_login():
    payload = {
        "jsonrpc": "2.0",
        "method": "user.login",
        "params": {
            "user": ZABBIX_USER,
            "password": ZABBIX_PASSWORD
        },
        "id": 1,
        "auth": None
    }
    response = requests.post(ZABBIX_URL, json=payload)
    return response.json().get("result")

# Function to list all hosts in Zabbix
def list_hosts(auth_token):
    payload = {
        "jsonrpc": "2.0",
        "method": "host.get",
        "params": {
            "output": ["hostid", "host"]
        },
        "auth": auth_token,
        "id": 2
    }
    response = requests.post(ZABBIX_URL, json=payload)
    return response.json().get("result", [])

class UpdateZabbixHostID(APIView):
    def post(self, request):
        auth_token = zabbix_login()
        if not auth_token:
            return Response({"error": "Failed to authenticate with Zabbix API"}, status=status.HTTP_401_UNAUTHORIZED)

        # Fetch hosts from Zabbix
        zabbix_hosts = list_hosts(auth_token)
        print("zabbix_hosts",zabbix_hosts)
        # Store host mappings (IP -> Host ID)
        host_map = {host["host"]: host["hostid"] for host in zabbix_hosts}
        
        # Update VmInfo objects
        updated_vms = []
        for vm in VMInfo.objects.all():
            if vm.ip in host_map:
                vm.zabbix_hostid = host_map[vm.ip]
                vm.save()
                updated_vms.append({"ip": vm.ip, "zabbix_hostid": vm.zabbix_hostid})
        
        return Response({"updated_vms": updated_vms}, status=status.HTTP_200_OK)






# --------------------------------4 Mar 2025--------------------------

class UpdateZabbixHostID1(APIView):
    def post(self, request):
        auth_token = zabbix_login()
        if not auth_token:
            return Response({"error": "Failed to authenticate with Zabbix API"}, status=status.HTTP_401_UNAUTHORIZED)

        # Fetch hosts from Zabbix
        zabbix_hosts = list_hosts(auth_token)
        print("zabbix_hosts", zabbix_hosts)

        # Store host mappings (Zabbix host name -> Host ID)
        host_map = {host["host"]: host["hostid"] for host in zabbix_hosts}  # Change: Use Zabbix host names

        # Update VmInfo objects based on name
        updated_vms = []
        for vm in VMInfo.objects.all():
            if vm.vm_name in host_map:  # Change: Check vm.name instead of vm.ip
                vm.zabbix_hostid = host_map[vm.vm_name]
                vm.save()
                updated_vms.append({"name": vm.vm_name, "zabbix_hostid": vm.zabbix_hostid})

        return Response({"updated_vms": updated_vms}, status=status.HTTP_200_OK)


# ----------------------25 March 2025---------------------------------------


class CPUUtilizationView(APIView):
    """Fetch CPU utilization data from Zabbix API."""

    def get_auth_token(self):
        """Authenticate with Zabbix API and get auth token."""
        payload = {
            "jsonrpc": "2.0",
            "method": "user.login",
            "params": {
                "user": settings.ZABBIX_USER,
                "password": settings.ZABBIX_PASSWORD
            },
            "id": 1,
            "auth": None
        }
        response = requests.post(settings.ZABBIX_URL, json=payload).json()
        return response.get("result")

    def get_cpu_itemid(self, auth_token, host_id):
        """Fetch the item ID for CPU utilization from Zabbix API."""
        payload = {
            "jsonrpc": "2.0",
            "method": "item.get",
            "params": {
                "output": ["itemid", "name"],
                "hostids": host_id,
                "search": {"name": "CPU utilization"},  # Adjust based on your Zabbix naming
                "sortfield": "name"
            },
            "auth": auth_token,
            "id": 2
        }
        response = requests.post(settings.ZABBIX_URL, json=payload).json()
        items = response.get("result", [])
        return items[0]["itemid"] if items else None

    def get_cpu_utilization(self, auth_token, item_id):
        """Fetch CPU utilization history from Zabbix API."""
        payload = {
            "jsonrpc": "2.0",
            "method": "history.get",
            "params": {
                "output": ["clock", "value"],
                "history": 0,  # Numeric data type
                "itemids": item_id,
                "sortfield": "clock",
                "sortorder": "DESC",
                "limit": 50  # Fetch last 50 records
            },
            "auth": auth_token,
            "id": 3
        }
        response = requests.post(settings.ZABBIX_URL, json=payload).json()
        return response.get("result", [])

    def convert_timestamp(self, unix_timestamp):
        """Convert Unix timestamp to human-readable format."""
        return datetime.datetime.fromtimestamp(int(unix_timestamp)).strftime('%Y-%m-%d %H:%M:%S')

    def format_cpu_value(self, raw_value):
        """Convert raw CPU utilization value to a human-readable percentage."""
        return f"{float(raw_value):.2f}%"  # Format as percentage with 2 decimal places

    def get(self, request, host_id, *args, **kwargs):
        """Main API endpoint to fetch CPU utilization graph data."""
        auth_token = self.get_auth_token()
        if not auth_token:
            return Response({"error": "Authentication failed"}, status=401)

        item_id = self.get_cpu_itemid(auth_token, host_id)
        if not item_id:
            return Response({"error": "CPU utilization item not found"}, status=404)

        cpu_data = self.get_cpu_utilization(auth_token, item_id)
        formatted_data = [
            {
                "timestamp": entry["clock"],
                "human_readable_time": self.convert_timestamp(entry["clock"]),
                "raw_value": float(entry["value"]),
                "formatted_value": self.format_cpu_value(entry["value"])  # Add formatted percentage
            }
            for entry in cpu_data
        ]
        return Response(formatted_data)
    
# ---------------------10 Mar 2025--------------------




# class KubernetesServiceList(APIView):
#     """API to list Kubernetes services securely."""
#     # authentication_classes = [TokenAuthentication]  # Secure API access
#     permission_classes = [IsAuthenticated]

#     def get(self, request):
#         try:
#             # Load Kubernetes config securely
#             # kube_config_path = os.getenv("KUBE_CONFIG_PATH", "./admin.conf")
#             # Get the absolute path of the kubeconfig file
#             # BASE_DIR = os.path.dirname(os.path.abspath(__file__))  # Get the directory of views.py
#             # KUBECONFIG_PATH = os.path.join(BASE_DIR, "admin.conf")  # Path to admin.conf
#             # print("KUBECONFIG_PATH",KUBECONFIG_PATH)
#             # config.load_kube_config(config_file=KUBECONFIG_PATH)
#             # v1 = client.CoreV1Api()
            
#             v1 = get_k8s_client()
#             services = v1.list_service_for_all_namespaces()

#             service_list = []
#             for svc in services.items:
#                 service_list.append({
#                     "name": svc.metadata.name,
#                     "namespace": svc.metadata.namespace,
#                     "type": svc.spec.type
#                 })

#             return Response({"services": service_list}, status=200)

#         except ApiException as e:
#             return Response({"error": f"Kubernetes API error: {e.reason}"}, status=e.status)

#         except Exception as e:
#             return Response({"error": f"Unexpected error: {str(e)}"}, status=500)

# ---------------------------16 June 2025 ---------------------------

class KubernetesServiceList(APIView):
    """API to list Kubernetes services with detailed metadata and optional namespace filter."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            # Load kubeconfig
            BASE_DIR = os.path.dirname(os.path.abspath(__file__))
            KUBECONFIG_PATH = os.path.join(BASE_DIR, "admin.conf")
            config.load_kube_config(config_file=KUBECONFIG_PATH)

            v1 = client.CoreV1Api()

            # Get namespace from query param
            namespace = request.query_params.get("namespace", "all")

            if namespace.lower() == "all":
                services = v1.list_service_for_all_namespaces()
            else:
                services = v1.list_namespaced_service(namespace=namespace)

            service_list = []
            for svc in services.items:
                internal_endpoints = []
                external_endpoints = []

                ports = svc.spec.ports or []
                for port in ports:
                    internal_endpoints.append(f"{port.port}/{port.protocol}")

                    # LoadBalancer IPs
                    if svc.status.load_balancer and svc.status.load_balancer.ingress:
                        for ingress in svc.status.load_balancer.ingress:
                            ip = getattr(ingress, "ip", None) or getattr(ingress, "hostname", None)
                            if ip:
                                external_endpoints.append(f"{ip}:{port.port}/{port.protocol}")

                    # External IPs
                    external_ips = getattr(svc.spec, "external_i_ps", []) or getattr(svc.spec, "external_ips", [])
                    for ip in external_ips:
                        external_endpoints.append(f"{ip}:{port.port}/{port.protocol}")

                    # NodePort
                    if svc.spec.type in ["NodePort", "LoadBalancer"] and getattr(port, "node_port", None):
                        external_endpoints.append(f"<NodeIP>:{port.node_port}/{port.protocol}")

                service_list.append({
                    "name": svc.metadata.name,
                    "namespace": svc.metadata.namespace,
                    "labels": svc.metadata.labels or {},
                    "selector": svc.spec.selector or {},
                    "type": svc.spec.type,
                    "cluster_ip": svc.spec.cluster_ip,
                    "internal_endpoints": internal_endpoints,
                    "external_endpoints": external_endpoints,
                    "created": svc.metadata.creation_timestamp.strftime("%Y-%m-%d %H:%M:%S") if svc.metadata.creation_timestamp else None
                })

            return Response({"services": service_list}, status=200)

        except ApiException as e:
            return Response({"error": f"Kubernetes API error: {e.reason}"}, status=e.status)
        except Exception as e:
            return Response({"error": f"Unexpected error: {str(e)}"}, status=500)



# Load Kubernetes configuration securely
BASE_DIR = os.path.dirname(os.path.abspath(__file__))  # Get the directory of the app
KUBECONFIG_PATH = os.path.join(BASE_DIR, "admin.conf")  # Path to admin.conf

def get_k8s_client():
    """Initialize and return Kubernetes CoreV1Api client."""
    try:
        config.load_kube_config(config_file=KUBECONFIG_PATH)
        return client.CoreV1Api()
    except Exception as e:
        raise RuntimeError(f"Failed to load Kubernetes config: {str(e)}")


# class ListK8sNodes(APIView):
#     """API View to list Kubernetes nodes securely."""

#     def get(self, request):
#         try:
#             v1 = get_k8s_client()  # Get Kubernetes API client
#             nodes = v1.list_node()  # Fetch list of nodes
            
#             node_list = []
#             for node in nodes.items:
#                 node_data = {
#                     "name": node.metadata.name,
#                     "status": node.status.conditions[-1].type
#                 }
#                 node_list.append(node_data)

#             return Response({"nodes": node_list}, status=status.HTTP_200_OK)

#         except ApiException as e:
#             return Response({"error": f"Kubernetes API error: {e.reason}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

#         except Exception as e:
#             return Response({"error": f"Unexpected error: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# -----------------------------16 June 2025------------------------------

class ListK8sNodes(APIView):
    """API View to list Kubernetes nodes with detailed resource and pod info."""

    def get(self, request):
        try:
            namespace = request.query_params.get("namespace", None)
            v1 = get_k8s_client()
            nodes = v1.list_node()
            pods = v1.list_pod_for_all_namespaces() if namespace in [None, "", "all"] else v1.list_namespaced_pod(namespace)

            node_data_list = []

            for node in nodes.items:
                name = node.metadata.name
                labels = node.metadata.labels
                created_at = node.metadata.creation_timestamp

                # Get conditions and check for Ready state
                ready_status = "Unknown"
                for cond in node.status.conditions:
                    if cond.type == "Ready":
                        ready_status = cond.status
                        break

                # Get allocatable and capacity
                allocatable = node.status.allocatable
                capacity = node.status.capacity

                # Count pods scheduled on this node
                pods_on_node = [p for p in pods.items if p.spec.node_name == name]

                # Calculate CPU & memory requests/limits
                cpu_req, cpu_lim, mem_req, mem_lim = 0, 0, 0, 0
                for pod in pods_on_node:
                    for container in pod.spec.containers:
                        resources = container.resources

                        # CPU
                        if resources.requests and "cpu" in resources.requests:
                            cpu_req += parse_cpu(resources.requests["cpu"])
                        if resources.limits and "cpu" in resources.limits:
                            cpu_lim += parse_cpu(resources.limits["cpu"])

                        # Memory
                        if resources.requests and "memory" in resources.requests:
                            mem_req += parse_memory(resources.requests["memory"])
                        if resources.limits and "memory" in resources.limits:
                            mem_lim += parse_memory(resources.limits["memory"])

                node_data = {
                    "name": name,
                    "labels": labels,
                    "ready": "True" if ready_status == "True" else "False",
                    "cpu_requests": cpu_req,
                    "cpu_limits": cpu_lim,
                    "cpu_capacity": parse_cpu(capacity.get("cpu", "0")),
                    "memory_requests_bytes": mem_req,
                    "memory_limits_bytes": mem_lim,
                    "memory_capacity_bytes": parse_memory(capacity.get("memory", "0")),
                    "pods": len(pods_on_node),
                    "created": created_at.strftime("%Y-%m-%d %H:%M:%S"),
                }

                node_data_list.append(node_data)

            return Response({"nodes": node_data_list}, status=status.HTTP_200_OK)

        except ApiException as e:
            return Response({"error": f"Kubernetes API error: {e.reason}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except Exception as e:
            return Response({"error": f"Unexpected error: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# Helpers for parsing CPU and memory units
def parse_cpu(cpu_str):
    if cpu_str.endswith("m"):
        return int(cpu_str.rstrip("m")) / 1000
    return float(cpu_str)

def parse_memory(mem_str):
    mem_str = str(mem_str).lower()
    unit_map = {
        "ki": 1024, "mi": 1024 ** 2, "gi": 1024 ** 3,
        "ti": 1024 ** 4, "pi": 1024 ** 5, "ei": 1024 ** 6,
        "k": 1000, "m": 1000 ** 2, "g": 1000 ** 3,
    }

    for suffix, multiplier in unit_map.items():
        if mem_str.endswith(suffix):
            return int(float(mem_str.replace(suffix, "")) * multiplier)

    try:
        return int(mem_str)
    except ValueError:
        return 0


def get_pod_metrics(metrics_api):
    """Fetch CPU & Memory usage for all pods (requires Metrics API)."""
    try:
        metrics = metrics_api.list_cluster_custom_object("metrics.k8s.io", "v1beta1", "pods")
        pod_metrics = {m["metadata"]["name"]: m for m in metrics["items"]}
        return pod_metrics
    except ApiException as e:
        raise RuntimeError(f"Kubernetes API error: {e.reason}")
    except Exception as e:
        return {}  # Return empty metrics on failure

def get_k8s_clients():
    """Initialize and return Kubernetes CoreV1Api & Metrics API clients."""
    try:
        config.load_kube_config(config_file=KUBECONFIG_PATH)
        return client.CoreV1Api(), client.CustomObjectsApi()
    except Exception as e:
        raise RuntimeError(f"Failed to load Kubernetes config: {str(e)}")
    
# Worked for Gomathis Setup    
# def list_pods():
#     """Retrieve a list of running pods with details and resource usage."""
#     v1, metrics_api = get_k8s_clients()
#     pod_metrics = get_pod_metrics(metrics_api)  # Get metrics
    
#     try:
#         pods = v1.list_pod_for_all_namespaces(watch=False)
#         pod_list = []

#         for pod in pods.items:
#             pod_info = {
#                 "name": pod.metadata.name,
#                 "namespace": pod.metadata.namespace,
#                 "images": [c.image for c in pod.spec.containers],
#                 "labels": pod.metadata.labels if pod.metadata.labels else {},
#                 "node": pod.spec.node_name,
#                 "status": pod.status.phase,
#                 "restarts": sum([c.restart_count for c in pod.status.container_statuses]) if pod.status.container_statuses else 0,
#                 "created_at": pod.metadata.creation_timestamp,
#                 "cpu_usage": "-",
#                 "memory_usage": "-"
#             }

#             # Fetch CPU & Memory usage
#             if pod_info["name"] in pod_metrics:
#                 containers = pod_metrics[pod_info["name"]].get("containers", [])
#                 pod_info["cpu_usage"] = sum([int(c["usage"]["cpu"].rstrip("n")) / 1e9 for c in containers])  # Convert from nanocores to cores
#                 pod_info["memory_usage"] = sum([int(c["usage"]["memory"].rstrip("Ki")) * 1024 for c in containers])  # Convert from KiB to Bytes

#             pod_list.append(pod_info)

#         return pod_list

#     except ApiException as e:
#         raise RuntimeError(f"Kubernetes API error: {e.reason}")
#     except Exception as e:
#         raise RuntimeError(f"Unexpected error: {str(e)}")
def list_pods():
    """Retrieve a list of running pods with details and resource usage."""
    v1, metrics_api = get_k8s_clients()

    try:
        pod_metrics = get_pod_metrics(metrics_api)  # <== Move inside try
        
        pods = v1.list_pod_for_all_namespaces(watch=False)
        pod_list = []

        for pod in pods.items:
            pod_info = {
                "name": pod.metadata.name,
                "namespace": pod.metadata.namespace,
                "images": [c.image for c in pod.spec.containers],
                "labels": pod.metadata.labels if pod.metadata.labels else {},
                "node": pod.spec.node_name,
                "status": pod.status.phase,
                "restarts": sum([c.restart_count for c in pod.status.container_statuses]) if pod.status.container_statuses else 0,
                "created_at": pod.metadata.creation_timestamp,
                "cpu_usage": "-",
                "memory_usage": "-"
            }

            # Fetch CPU & Memory usage
            if pod_info["name"] in pod_metrics:
                containers = pod_metrics[pod_info["name"]].get("containers", [])
                pod_info["cpu_usage"] = sum([int(c["usage"]["cpu"].rstrip("n")) / 1e9 for c in containers])
                pod_info["memory_usage"] = sum([int(c["usage"]["memory"].rstrip("Ki")) * 1024 for c in containers])

            pod_list.append(pod_info)

        return pod_list

    except ApiException as e:
        raise RuntimeError(f"Kubernetes API error: {e.reason}")
    except Exception as e:
        raise RuntimeError(f"Unexpected error: {str(e)}")


class ListK8sPods(APIView):
    """API View to list Kubernetes pods securely."""

    def get(self, request):
        try:
            pods = list_pods()
            # print(pods)
            return Response({"pods": pods}, status=status.HTTP_200_OK)

        except RuntimeError as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        except Exception as e:
            return Response({"error": f"Unexpected error: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)









# OpenStack API Credentials
AUTH_URL = "http://10.184.49.18:5000/v3/auth/tokens"
USERNAME = "admin"
PASSWORD = "Meghd@@t123"
PROJECT_NAME = "admin"
DOMAIN_NAME = "Default"

# OpenStack API Endpoints
OPENSTACK_API_URL = "http://10.184.49.18:9696"  # Networking API
COMPUTE_API_URL = "http://10.184.49.18:8774"  # Compute API


class OpenStackDataView(View):
    """
    API to fetch OpenStack data with authentication and permissions.
    """
    
    # permission_classes = [IsAuthenticated]
    def get_token(self):
        auth_payload = {
            "auth": {
                "identity": {
                    "methods": ["password"],
                    "password": {
                        "user": {
                            "name": USERNAME,
                            "domain": {"name": DOMAIN_NAME},
                            "password": PASSWORD,
                        }
                    },
                },
                "scope": {
                    "project": {"name": PROJECT_NAME, "domain": {"name": DOMAIN_NAME}}
                },
            }
        }

        headers = {"Content-Type": "application/json"}

        try:
            response = requests.post(AUTH_URL, json=auth_payload, headers=headers, timeout=10)
            response.raise_for_status()
            return response.headers.get("X-Subject-Token")
        except requests.RequestException as e:
            print(f"Error fetching token: {e}")
            return None

    def fetch_data(self, url, token):
        headers = {"X-Auth-Token": token}
        try:
            response = requests.get(url, headers=headers, timeout=10)
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            print(f"Error fetching data from {url}: {e}")
            return None

    def get(self, request):
        token = self.get_token()
        if not token:
            return JsonResponse({"error": "Failed to authenticate with OpenStack"}, status=401)

        mapped_data = {"networks": {}, "routers": {}, "instances": {}}

        # Fetch data
        networks_data = self.fetch_data(f"{OPENSTACK_API_URL}/v2.0/networks", token)
        routers_data = self.fetch_data(f"{OPENSTACK_API_URL}/v2.0/routers", token)
        instances_data = self.fetch_data(f"{COMPUTE_API_URL}/v2.1/servers/detail", token)
        flavors_data = self.fetch_data(f"{COMPUTE_API_URL}/v2.1/flavors/detail", token)
        ports_data = self.fetch_data(f"{OPENSTACK_API_URL}/v2.0/ports", token)

        # Process networks
        if networks_data:
            for network in networks_data.get("networks", []):
                mapped_data["networks"][network["id"]] = {
                    "name": network["name"],
                    "id": network["id"],
                    "project_id": network.get("tenant_id", network.get("project_id")),
                    "status": network["status"],
                    "admin_state_up": network["admin_state_up"],
                    "shared": network.get("shared", False),
                    "external": network.get("router:external", False),
                    "mtu": network.get("mtu", 1500),
                    "routers": [],
                    "instances": []
                }

        # Process routers
        if routers_data:
            for router in routers_data.get("routers", []):
                mapped_data["routers"][router["id"]] = {
                    "name": router["name"],
                    "id": router["id"],
                    "project_id": router.get("tenant_id", router.get("project_id")),
                    "status": router["status"],
                    "admin_state_up": router["admin_state_up"],
                }

        # Process instances
        if instances_data and flavors_data:
            flavors = {flavor["id"]: flavor for flavor in flavors_data.get("flavors", [])}
            for instance in instances_data.get("servers", []):
                flavor_id = instance["flavor"]["id"]
                flavor = flavors.get(flavor_id, {})
                mapped_data["instances"][instance["id"]] = {
                    "name": instance["name"],
                    "id": instance["id"],
                    "status": instance["status"],
                    "flavor": {
                        "id": flavor.get("id"),
                        "name": flavor.get("name"),
                        "ram": f"{flavor.get('ram', 0)}GB",
                        "vcpus": f"{flavor.get('vcpus', 0)} VCPU",
                        "disk": f"{flavor.get('disk', 0)}GB",
                    },
                }

        return JsonResponse(mapped_data, safe=False)


# class OpenStackDataView(APIView):
#     """
#     API to fetch OpenStack data with authentication and permissions.
#     """
    
#     # authentication_classes = [TokenAuthentication]
#     # permission_classes = [IsAuthenticated]

#     def get_token(self):
#         """
#         Fetch OpenStack authentication token using get_openstack_connection.
#         """
#         try:
#             conn = get_openstack_connection()
#             return conn.session.get_token()
#         except Exception as e:
#             print(f"Error fetching OpenStack token: {e}")
#             return None

#     def fetch_data(self, url, token):
#         """
#         Fetch data from OpenStack API using the provided token.
#         """
#         headers = {"X-Auth-Token": token}
#         try:
#             response = requests.get(url, headers=headers, timeout=10)
#             response.raise_for_status()
#             return response.json()
#         except requests.RequestException as e:
#             print(f"Error fetching data from {url}: {e}")
#             return None

#     def get(self, request):
#         """
#         Handles GET requests to fetch OpenStack data.
#         """
#         token = self.get_token()
#         if not token:
#             return JsonResponse({"error": "Failed to authenticate with OpenStack"}, status=401)

#         mapped_data = {"networks": {}, "routers": {}, "instances": {}}

#         # Fetch data
#         networks_data = self.fetch_data(f"{OPENSTACK_API_URL}/v2.0/networks", token)
#         routers_data = self.fetch_data(f"{OPENSTACK_API_URL}/v2.0/routers", token)
#         instances_data = self.fetch_data(f"{COMPUTE_API_URL}/v2.1/servers/detail", token)
#         flavors_data = self.fetch_data(f"{COMPUTE_API_URL}/v2.1/flavors/detail", token)
#         ports_data = self.fetch_data(f"{OPENSTACK_API_URL}/v2.0/ports", token)

#         # Process networks
#         if networks_data:
#             for network in networks_data.get("networks", []):
#                 mapped_data["networks"][network["id"]] = {
#                     "name": network["name"],
#                     "id": network["id"],
#                     "project_id": network.get("tenant_id", network.get("project_id")),
#                     "status": network["status"],
#                     "admin_state_up": network["admin_state_up"],
#                     "shared": network.get("shared", False),
#                     "external": network.get("router:external", False),
#                     "mtu": network.get("mtu", 1500),
#                     "routers": [],
#                     "instances": []
#                 }

#         # Process routers
#         if routers_data:
#             for router in routers_data.get("routers", []):
#                 mapped_data["routers"][router["id"]] = {
#                     "name": router["name"],
#                     "id": router["id"],
#                     "project_id": router.get("tenant_id", router.get("project_id")),
#                     "status": router["status"],
#                     "admin_state_up": router["admin_state_up"],
#                 }

#         # Process instances
#         if instances_data and flavors_data:
#             flavors = {flavor["id"]: flavor for flavor in flavors_data.get("flavors", [])}
#             for instance in instances_data.get("servers", []):
#                 flavor_id = instance["flavor"]["id"]
#                 flavor = flavors.get(flavor_id, {})
#                 mapped_data["instances"][instance["id"]] = {
#                     "name": instance["name"],
#                     "id": instance["id"],
#                     "status": instance["status"],
#                     "flavor": {
#                         "id": flavor.get("id"),
#                         "name": flavor.get("name"),
#                         "ram": f"{flavor.get('ram', 0)}GB",
#                         "vcpus": f"{flavor.get('vcpus', 0)} VCPU",
#                         "disk": f"{flavor.get('disk', 0)}GB",
#                     },
#                 }

#         return JsonResponse(mapped_data, safe=False)





class KubernetesDeploymentsAPIView(APIView):
    """
    API to list Kubernetes deployments securely.
    """
    permission_classes = [IsAuthenticated]  # Enforces authentication

    def get(self, request):
        try:
            BASE_DIR = os.path.dirname(os.path.abspath(__file__))  # Get the directory of the app
            KUBECONFIG_PATH = os.path.join(BASE_DIR, "admin.conf")  # Path to admin.conf
            print("KUBECONFIG_PATH",KUBECONFIG_PATH)
            # Load Kubernetes configuration securely
            kube_config_path =  KUBECONFIG_PATH  # Use env variable
            config.load_kube_config(config_file=kube_config_path)

            apps_v1 = client.AppsV1Api()
            
            # Fetch deployments
            deployments = apps_v1.list_deployment_for_all_namespaces()
            deployment_list = [
                {
                    "name": deploy.metadata.name,
                    "namespace": deploy.metadata.namespace,
                    "replicas": deploy.spec.replicas,
                    "available_replicas": deploy.status.available_replicas or 0,
                    "labels": deploy.metadata.labels
                }
                for deploy in deployments.items
            ]

            return Response(deployment_list, status=status.HTTP_200_OK)

        except client.exceptions.ApiException as e:
            return Response({"error": f"Kubernetes API error: {e.reason}"}, status=e.status)

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)



# Determine BASE_DIR dynamically
BASE_DIR = os.path.dirname(os.path.abspath(__file__))  # Get the directory of the app
KUBECONFIG_PATH = os.path.join(BASE_DIR, "admin.conf")  # Default path

# Load Kubernetes configuration securely
kube_config_path = os.getenv("KUBE_CONFIG_PATH", KUBECONFIG_PATH)  # Use env variable
try:
    config.load_kube_config(config_file=kube_config_path)
except Exception as e:
    print(f"⚠️ Error loading kubeconfig: {e}")

# Create Kubernetes API client
v1 = client.CoreV1Api()

class KubernetesPodAPIView(APIView):
    """
    API to manage Kubernetes Pods (list, create, delete).
    """
    permission_classes = [IsAuthenticated]  # Change to IsAuthenticated for production

    def get(self, request):
        """List all running pods."""
        try:
            pods = v1.list_pod_for_all_namespaces(watch=False)
            pod_list = [
                {"name": pod.metadata.name, "namespace": pod.metadata.namespace, "status": pod.status.phase}
                for pod in pods.items
            ]
            return Response(pod_list, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def post(self, request):
        """Create a new Kubernetes pod."""
        print(f"🔹 Received request method: {request.method}")  # Debugging
        app_name = request.data.get("app_name")
        image_name = request.data.get("image_name")
        port = request.data.get("port", None)

        if not app_name or not image_name:
            return Response({"error": "app_name and image_name are required"}, status=status.HTTP_400_BAD_REQUEST)

        pod_manifest = {
            "apiVersion": "v1",
            "kind": "Pod",
            "metadata": {"name": f"{app_name}-pod"},
            "spec": {
                "containers": [
                    {
                        "name": app_name,
                        "image": image_name,
                        "ports": [{"containerPort": port}] if port else []
                    }
                ]
            }
        }

        try:
            v1.create_namespaced_pod(namespace="default", body=pod_manifest)
            return Response({"message": f"{app_name} pod created successfully!"}, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# Configure logging
logger = logging.getLogger(__name__)

# Load Kubernetes configuration securely
BASE_DIR = os.path.dirname(os.path.abspath(__file__))  # App directory
KUBECONFIG_PATH = os.getenv("KUBE_CONFIG_PATH", os.path.join(BASE_DIR, "admin.conf"))  # Use env variable or default path

try:
    config.load_kube_config(config_file=KUBECONFIG_PATH)
    logger.info("✅ Kubernetes config loaded successfully.")
except Exception as e:
    logger.error(f"❌ Failed to load kubeconfig: {e}")

# Create Kubernetes API client
v1 = client.CoreV1Api()


def get_service_nodeport(service_name, namespace="default"):
    try:
        v1 = client.CoreV1Api()
        svc = v1.read_namespaced_service(service_name, namespace)
        for p in svc.spec.ports:
            if p.node_port:
                return p.node_port
    except Exception as e:
        print("Error fetching nodePort:", e)
    return None


def get_first_node_ip():
    try:
        v1 = client.CoreV1Api()
        nodes = v1.list_node()
        node = nodes.items[0]
        for addr in node.status.addresses:
            if addr.type == "ExternalIP":
                return addr.address
            if addr.type == "InternalIP":
                return addr.address
    except:
        return None



class DeployNginxPodAPIView(APIView):
    """
    API to deploy an Nginx pod securely.
    """
    permission_classes = [IsAuthenticated]  # Require authentication

    def post(self, request):
        """Deploy an Nginx pod securely"""
        logger.info("🔹 POST request received to deploy Nginx Pod.")

        # Extract user inputs
        pod_name = request.data.get("pod_name", "nginx-pod")  # Default pod name
        namespace = request.data.get("namespace", "default")  # Default namespace

        # Validate pod_name (only allow alphanumeric and hyphens)
        if not pod_name.isalnum() and "-" not in pod_name:
            return Response({"error": "Invalid pod name. Use only letters, numbers, or hyphens."},
                            status=status.HTTP_400_BAD_REQUEST)

        # Define Pod spec securely
        pod_manifest = client.V1Pod(
            metadata=client.V1ObjectMeta(name=pod_name),
            spec=client.V1PodSpec(
                containers=[
                    client.V1Container(
                        name="nginx",
                        image="nginx:latest",
                        ports=[client.V1ContainerPort(container_port=80)],
                        security_context=client.V1SecurityContext(
                            read_only_root_filesystem=True,  # Restrict filesystem writes
                            allow_privilege_escalation=False  # Prevent privilege escalation
                        ),
                    )
                ]
            ),
        )

        try:
            # Deploy the pod
            v1.create_namespaced_pod(namespace=namespace, body=pod_manifest)
            logger.info(f"✅ Pod '{pod_name}' deployed successfully in namespace '{namespace}'.")
            return Response({"message": f"Pod '{pod_name}' deployed successfully!"}, status=status.HTTP_201_CREATED)

        except client.ApiException as e:
            logger.error(f"❌ Kubernetes API error: {e}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)




#--------------------------------------------------------------------------------



class DeployNginxHAAPIView(APIView):
    """
    API to deploy an Nginx High-Availability Deployment + NodePort Service.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        logger.info("🔹 POST request received to deploy Nginx HA Deployment.")

        namespace = request.data.get("namespace", "default")
        replicas = int(request.data.get("replicas", 2))
        deployment_name = request.data.get("deployment_name", "nginx-ha")
        service_name = deployment_name + "-svc"

        # Validate name
        if not deployment_name.replace("-", "").isalnum():
            return Response({"error": "Invalid deployment name."}, status=400)

        apps_v1 = client.AppsV1Api()
        v1 = client.CoreV1Api()

        # ---------------------------
        # 1️⃣ Create Deployment
        # ---------------------------
        deployment = client.V1Deployment(
            metadata=client.V1ObjectMeta(name=deployment_name, labels={"app": deployment_name}),
            spec=client.V1DeploymentSpec(
                replicas=replicas,
                selector=client.V1LabelSelector(match_labels={"app": deployment_name}),
                template=client.V1PodTemplateSpec(
                    metadata=client.V1ObjectMeta(labels={"app": deployment_name}),
                    spec=client.V1PodSpec(
                        containers=[
                            client.V1Container(
                                name="nginx",
                                image="nginx:latest",
                                ports=[client.V1ContainerPort(container_port=80)],
                            )
                        ]
                    ),
                ),
            ),
        )

        try:
            apps_v1.create_namespaced_deployment(namespace, deployment)
            logger.info(f"✅ Deployment '{deployment_name}' created.")
        except client.exceptions.ApiException as e:
            if e.status == 409:
                return Response({"error": "Deployment already exists."}, status=409)
            return Response({"error": str(e)}, status=500)

        # ---------------------------
        # 2️⃣ Create NodePort Service
        # ---------------------------
        service_manifest = client.V1Service(
            metadata=client.V1ObjectMeta(name=service_name),
            spec=client.V1ServiceSpec(
                type="NodePort",
                selector={"app": deployment_name},
                ports=[
                    client.V1ServicePort(
                        port=80,
                        target_port=80,
                        node_port=None  # Auto assign NodePort
                    )
                ],
            ),
        )

        try:
            v1.create_namespaced_service(namespace, service_manifest)
            logger.info(f"✅ Service '{service_name}' created.")
        except client.exceptions.ApiException as e:
            return Response({"error": f"Service error: {str(e)}"}, status=500)

        # ---------------------------
        # 3️⃣ Fetch NodePort
        # ---------------------------
        sleep(2)  # Wait for service creation
        node_port = get_service_nodeport(service_name, namespace)

        # Debug print
        print(f"🔵 NodePort assigned by Kubernetes: {node_port}")
        logger.info(f"🔵 NodePort assigned by Kubernetes: {node_port}")

        # ---------------------------
        # 4️⃣ Fetch Node IP
        # ---------------------------
        node_ip = get_first_node_ip()

        return Response(
            {
                "message": "Nginx HA deployed successfully!",
                "deployment": deployment_name,
                "service": service_name,
                "node_port": node_port,
                "node_ip": node_ip,
                "access_url": f"http://{node_ip}:{node_port}" if node_ip and node_port else None
            },
            status=201
        )


# --------------------------------12 Mar 2025---------------------------------


# Configure logging
logger = logging.getLogger(__name__)

# Load Kubernetes configuration securely
BASE_DIR = os.path.dirname(os.path.abspath(__file__))  # App directory
KUBECONFIG_PATH = os.getenv("KUBE_CONFIG_PATH", os.path.join(BASE_DIR, "admin.conf"))  # Use env variable or default path

try:
    config.load_kube_config(config_file=KUBECONFIG_PATH)
    logger.info("✅ Kubernetes config loaded successfully.")
except Exception as e:
    logger.error(f"❌ Failed to load kubeconfig: {e}")

# Create Kubernetes API client
v1 = client.CoreV1Api()

# Dictionary mapping application names to container images and ports
APPLICATION_IMAGES = {
    "nginx": {"image": "nginx:latest", "port": 80},
    "apache": {"image": "httpd:latest", "port": 80},
    "caddy": {"image": "caddy:latest", "port": 80},
    
    "mysql": {"image": "mysql:latest", "port": 3306, "env": {"MYSQL_ROOT_PASSWORD": "rootpass"}},
    "postgresql": {"image": "postgres:latest", "port": 5432, "env": {"POSTGRES_PASSWORD": "rootpass"}},
    "mongodb": {"image": "mongo:latest", "port": 27017},
    "redis": {"image": "redis:latest", "port": 6379},

    "python": {"image": "python:latest"},
    "nodejs": {"image": "node:latest"},
    "golang": {"image": "golang:latest"},
    "java": {"image": "openjdk:latest"},

    "jenkins": {"image": "jenkins/jenkins:lts", "port": 8080},
    "gitlab-runner": {"image": "gitlab/gitlab-runner:latest"},
    "docker-dind": {"image": "docker:dind"},

    "prometheus": {"image": "prom/prometheus:latest", "port": 9090},
    "grafana": {"image": "grafana/grafana:latest", "port": 3000},
    "fluentd": {"image": "fluent/fluentd:latest"},

    "haproxy": {"image": "haproxy:latest", "port": 80},
    "traefik": {"image": "traefik:latest", "port": 80},
    "envoy": {"image": "envoyproxy/envoy:latest", "port": 10000},

    "minio": {"image": "minio/minio:latest", "port": 9000},
    "rabbitmq": {"image": "rabbitmq:latest", "port": 5672},
    "elasticsearch": {"image": "docker.elastic.co/elasticsearch/elasticsearch:latest", "port": 9200},

    "tensorflow": {"image": "tensorflow/serving:latest"},
    "pytorch": {"image": "pytorch/pytorch:latest"},
}


# class DeployApplicationAPIView(APIView):
#     """
#     API to deploy different applications dynamically based on user input.
#     """
#     permission_classes = [IsAuthenticated]  # Require authentication

#     def post(self, request):
#         """Deploy an application pod based on the specified application type"""
#         logger.info("🔹 POST request received to deploy an application.")

#         # Extract user inputs
#         pod_name = request.data.get("pod_name", "app-pod")  # Default pod name
#         namespace = request.data.get("namespace", "default")  # Default namespace
#         app_type = request.data.get("app_type", "").lower()  # Application type

#         # Validate input
#         if not pod_name or not app_type:
#             return Response({"error": "pod_name and app_type are required fields."},
#                             status=status.HTTP_400_BAD_REQUEST)

#         if app_type not in APPLICATION_IMAGES:
#             return Response({"error": f"Invalid app_type. Choose from {list(APPLICATION_IMAGES.keys())}"},
#                             status=status.HTTP_400_BAD_REQUEST)

#         # Get application details
#         app_info = APPLICATION_IMAGES[app_type]
#         image = app_info["image"]
#         container_port = app_info.get("port")
#         env_vars = app_info.get("env", {})

#         # Create Kubernetes environment variable objects
#         env_list = [
#             client.V1EnvVar(name=key, value=value) for key, value in env_vars.items()
#         ] if env_vars else []

#         # Define Pod spec securely
#         pod_manifest = client.V1Pod(
#             metadata=client.V1ObjectMeta(name=pod_name),
#             spec=client.V1PodSpec(
#                 containers=[
#                     client.V1Container(
#                         name=app_type,
#                         image=image,
#                         ports=[client.V1ContainerPort(container_port=container_port)] if container_port else [],
#                         env=env_list,
#                         security_context=client.V1SecurityContext(
#                             read_only_root_filesystem=True,  # Restrict filesystem writes
#                             allow_privilege_escalation=False  # Prevent privilege escalation
#                         ),
#                     )
#                 ]
#             ),
#         )

#         try:
#             # Deploy the pod
#             v1.create_namespaced_pod(namespace=namespace, body=pod_manifest)
#             logger.info(f"✅ {app_type.capitalize()} Pod '{pod_name}' deployed successfully in namespace '{namespace}'.")
#             return Response({"message": f"{app_type.capitalize()} Pod '{pod_name}' deployed successfully!"},
#                             status=status.HTTP_201_CREATED)

#         except client.ApiException as e:
#             logger.error(f"❌ Kubernetes API error: {e}")
#             return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)





def get_available_node():
    """Retrieve the best node based on resource availability."""
    try:
        nodes = v1.list_node().items
        best_node = None
        max_cpu_available = 0

        for node in nodes:
            print("node",node)
            node_name = node.metadata.name
            allocatable = node.status.allocatable

            # Extract CPU and Memory (convert CPU to millicores)
            cpu_available = int(allocatable["cpu"].replace("m", ""))  # Convert CPU from millicores
            memory_available = allocatable["memory"]
            print("cpu_available",cpu_available,"memory_available",memory_available)    
            logger.info(f"Node: {node_name}, CPU: {cpu_available}m, Memory: {memory_available}")

            if cpu_available > max_cpu_available:
                max_cpu_available = cpu_available
                best_node = node_name

        return best_node

    except Exception as e:
        logger.error(f"Error retrieving nodes: {e}")
        return None


# class DeployApplicationAPIView(APIView):
#     """API to deploy different applications dynamically based on user input."""
#     def post(self, request):
#         """Deploy an application pod based on the specified application type"""
#         logger.info("🔹 POST request received to deploy an application.")

#         pod_name = request.data.get("pod_name", "app-pod")
#         namespace = request.data.get("namespace", "default")
#         app_type = request.data.get("app_type", "").lower()

#         if not pod_name or not app_type:
#             return Response({"error": "pod_name and app_type are required fields."}, status=status.HTTP_400_BAD_REQUEST)

#         if app_type not in APPLICATION_IMAGES:
#             return Response({"error": f"Invalid app_type. Choose from {list(APPLICATION_IMAGES.keys())}"}, status=status.HTTP_400_BAD_REQUEST)

#         app_info = APPLICATION_IMAGES[app_type]
#         image = app_info["image"]
#         container_port = app_info.get("port")
#         env_vars = app_info.get("env", {})

#         # Get best available node
#         selected_node = get_available_node()
#         print(selected_node)
    
#         if not selected_node:
#             return Response({"error": "No available nodes found."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

#         env_list = [client.V1EnvVar(name=key, value=value) for key, value in env_vars.items()] if env_vars else []

#         # Pod specification
#         pod_manifest = client.V1Pod(
#             metadata=client.V1ObjectMeta(name=pod_name),
#             spec=client.V1PodSpec(
#                 containers=[
#                     client.V1Container(
#                         name=app_type,
#                         image=image,
#                         ports=[client.V1ContainerPort(container_port=container_port)] if container_port else [],
#                         env=env_list,
#                         security_context=client.V1SecurityContext(
#                             read_only_root_filesystem=True,
#                             allow_privilege_escalation=False
#                         ),
#                     )
#                 ],
#                 node_selector={"kubernetes.io/hostname": selected_node}  # Assign to best node
#             ),
#         )

#         try:
#             # v1.create_namespaced_pod(namespace=namespace, body=pod_manifest)
#             logger.info(f"✅ {app_type.capitalize()} Pod '{pod_name}' deployed successfully on node '{selected_node}' in namespace '{namespace}'.")
#             return Response({"message": f"{app_type.capitalize()} Pod '{pod_name}' deployed successfully on node '{selected_node}'!"},
#                             status=status.HTTP_201_CREATED)

#         except client.ApiException as e:
#             logger.error(f"❌ Kubernetes API error: {e}")
#             return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# class DeployApplicationAPIView(APIView):
#     """API to deploy different applications dynamically on knode2"""
    
#     def post(self, request):
#         """Deploy an application pod on knode2"""
#         logger.info("🔹 POST request received to deploy an application.")

#         pod_name = request.data.get("pod_name", "app-pod")
#         namespace = request.data.get("namespace", "default")
#         app_type = request.data.get("app_type", "").lower()

#         if not pod_name or not app_type:
#             return Response({"error": "pod_name and app_type are required fields."}, status=status.HTTP_400_BAD_REQUEST)

#         if app_type not in APPLICATION_IMAGES:
#             return Response({"error": f"Invalid app_type. Choose from {list(APPLICATION_IMAGES.keys())}"}, status=status.HTTP_400_BAD_REQUEST)

#         app_info = APPLICATION_IMAGES[app_type]
#         image = app_info["image"]
#         container_port = app_info.get("port")
#         env_vars = app_info.get("env", {})

#         # Hardcode the node name to "knode2"
#         selected_node = "knode2"

#         env_list = [client.V1EnvVar(name=key, value=value) for key, value in env_vars.items()] if env_vars else []

#         # Pod specification
#         pod_manifest = client.V1Pod(
#             metadata=client.V1ObjectMeta(name=pod_name),
#             spec=client.V1PodSpec(
#                 containers=[
#                     client.V1Container(
#                         name=app_type,
#                         image=image,
#                         ports=[client.V1ContainerPort(container_port=container_port)] if container_port else [],
#                         env=env_list,
#                         security_context=client.V1SecurityContext(
#                             read_only_root_filesystem=True,
#                             allow_privilege_escalation=False
#                         ),
#                     )
#                 ],
#                 node_selector={"kubernetes.io/hostname": selected_node}  # Force pod on knode2
#             ),
#         )

#         try:
#             v1.create_namespaced_pod(namespace=namespace, body=pod_manifest)
#             logger.info(f"✅ {app_type.capitalize()} Pod '{pod_name}' deployed successfully on node '{selected_node}' in namespace '{namespace}'.")
#             return Response({"message": f"{app_type.capitalize()} Pod '{pod_name}' deployed successfully on node '{selected_node}'!"},
#                             status=status.HTTP_201_CREATED)

#         except client.ApiException as e:
#             logger.error(f"❌ Kubernetes API error: {e}")
#             return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# class DeployPodAPIView(APIView):
#     """API endpoint to deploy a Kubernetes pod dynamically."""

#     def post(self, request):
#         """Handle POST request to create a pod."""
#         logger.info("🔹 Received request to deploy a pod.")

#         app_name = request.data.get("app_name")
#         image_name = request.data.get("image_name")
#         port = request.data.get("port")
#         env_vars = request.data.get("env_vars", {})

#         if not app_name or not image_name:
#             return Response(
#                 {"error": "Both 'app_name' and 'image_name' are required."},
#                 status=status.HTTP_400_BAD_REQUEST,
#             )

#         pod_manifest = {
#             "apiVersion": "v1",
#             "kind": "Pod",
#             "metadata": {"name": f"{app_name}-pod"},
#             "spec": {
#                 "containers": [
#                     {
#                         "name": app_name,
#                         "image": image_name,
#                         "ports": [{"containerPort": port}] if port else [],
#                         "env": [{"name": k, "value": v} for k, v in env_vars.items()]
#                     }
#                 ]
#             }
#         }

#         try:
#             v1.create_namespaced_pod(namespace="default", body=pod_manifest)
#             logger.info(f"✅ Pod '{app_name}-pod' created successfully!")
#             return Response(
#                 {"message": f"Pod '{app_name}-pod' created successfully!"},
#                 status=status.HTTP_201_CREATED,
#             )
#         except Exception as e:
#             logger.error(f"❌ Error creating pod: {str(e)}")
#             return Response(
#                 {"error": str(e)},
#                 status=status.HTTP_500_INTERNAL_SERVER_ERROR,
#             )


# 


# -----------------------------14 Mar 2025---------------------------


class DeployPodAPIView(APIView):
    def post(self, request):
        logger.info("🔹 Received request to deploy a pod.")

        app_name = request.data.get("app_name")
        appln_type = request.data.get("app_type")

        if not app_name or not appln_type:
            return Response(
                {"error": "Both 'app_name' and 'appln_type' are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

    

        if appln_type not in APPLICATION_IMAGES:
            return Response(
                {"error": f"Application type '{appln_type}' is not supported."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        app_config = APPLICATION_IMAGES[appln_type]
        image_name = app_config["image"]
        port = app_config.get("port")

        # First try deploying on knode
        initial_node = "knode"
        final_status, _ = self.deploy_and_monitor(app_name, image_name, port, initial_node)

        # If pod fails on knode, delete and move to knode2
        if final_status in ["CrashLoopBackOff", "Failed"]:
            logger.warning(f"⚠️ Pod '{app_name}-pod' failed on {initial_node}. Deleting and redeploying on knode2...")
            self.delete_pod_if_exists(f"{app_name}-pod")  # Delete failed pod

            secondary_node = "knode2"
            final_status, deployed_node = self.deploy_and_monitor(app_name, image_name, port, secondary_node)

        # Ensure pod is actually running before confirming success
        if final_status == "Running":
            return Response(
                {"message": f"✅ Pod '{app_name}-pod' deployed successfully on {deployed_node}."},
                status=status.HTTP_201_CREATED,
            )

        return Response(
            {"error": f"❌ Pod '{app_name}-pod' failed to deploy on both nodes."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    def deploy_and_monitor(self, app_name, image_name, port, node_name):
        """Deploy the pod and monitor its status until Running or 2 restarts."""
        pod_manifest = self.create_pod_manifest(app_name, image_name, port, node_name)
        v1.create_namespaced_pod(namespace="default", body=pod_manifest)
        logger.info(f"🚀 Created pod '{app_name}-pod' on {node_name}. Monitoring status...")

        restart_count = 0

        while True:
            pod_status, restart_count, current_node = self.get_pod_status(f"{app_name}-pod")

            if pod_status == "Running":
                logger.info(f"✅ Pod '{app_name}-pod' is now Running on {current_node}.")
                print(f"✅ Pod '{app_name}-pod' is now Running on {current_node}.")
                return "Running", current_node

            if restart_count >= 2:
                print("restart count",restart_count)
                logger.warning(f"⚠️ Pod '{app_name}-pod' restarted {restart_count} times on {node_name}. Moving to another node.")
                return "CrashLoopBackOff", node_name

            logger.info(f"⌛ Waiting for pod '{app_name}-pod'. Current status: {pod_status} (Restarts: {restart_count})")
            sleep(10)

    def create_pod_manifest(self, app_name, image_name, port, node_name):
        """Generate the pod manifest with node selection."""
        return {
            "apiVersion": "v1",
            "kind": "Pod",
            "metadata": {"name": f"{app_name}-pod"},
            "spec": {
                "nodeSelector": {"kubernetes.io/hostname": node_name},
                "containers": [
                    {
                        "name": app_name,
                        "image": image_name,
                        "ports": [{"containerPort": port}] if port else [],
                    }
                ]
            }
        }

    def get_pod_status(self, pod_name):
        """Fetch the pod status, restart count, and node name."""
        try:
            pod = v1.read_namespaced_pod_status(name=pod_name, namespace="default")
            pod_status = pod.status.phase
            restart_count = 0
            node_name = pod.spec.node_name  # Get the node where the pod is running

            if pod.status.container_statuses:
                restart_count = pod.status.container_statuses[0].restart_count

            return pod_status, restart_count, node_name

        except Exception as e:
            logger.error(f"❌ Error getting pod status: {str(e)}")
            return "Unknown", 0, "Unknown"

    def delete_pod_if_exists(self, pod_name):
        """Delete the pod if it exists before redeploying."""
        try:
            v1.delete_namespaced_pod(name=pod_name, namespace="default")
            logger.info(f"🗑️ Deleted existing pod '{pod_name}' before redeploying.")
            sleep(10)  # Give time for cleanup before redeployment
        except client.exceptions.ApiException as e:
            if e.status == 404:
                logger.info(f"ℹ️ Pod '{pod_name}' does not exist, nothing to delete.")
            else:
                logger.error(f"❌ Error deleting pod '{pod_name}': {e}")



class DeletePodAPIView(APIView):
    """
    API to delete a Kubernetes pod.
    """
    permission_classes = [IsAuthenticated]  # Require authentication

    def delete(self, request):
        """Delete a specified pod in a given namespace."""
        logger.info("🔹 DELETE request received to delete a pod.")

        # Extract user inputs
        pod_name = request.data.get("pod_name")
        namespace = request.data.get("namespace", "default")  # Default namespace is 'default'

        # Validate input
        if not pod_name:
            return Response({"error": "pod_name is required."},
                            status=status.HTTP_400_BAD_REQUEST)

        try:
            # Delete the pod
            v1.delete_namespaced_pod(name=pod_name, namespace=namespace)
            logger.info(f"✅ Pod '{pod_name}' deleted successfully from namespace '{namespace}'.")
            return Response({"message": f"Pod '{pod_name}' deleted successfully!"},
                            status=status.HTTP_200_OK)

        except client.exceptions.ApiException as e:
            if e.status == 404:
                logger.error(f"❌ Pod '{pod_name}' not found in namespace '{namespace}'.")
                return Response({"error": f"Pod '{pod_name}' not found in namespace '{namespace}'."},
                                status=status.HTTP_404_NOT_FOUND)
            else:
                logger.error(f"❌ Kubernetes API error: {e}")
                return Response({"error": str(e)},
                                status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# class ListKubernetesEventsAPIView(APIView):
#     """
#     API to list Kubernetes events.
#     """
#     permission_classes = [IsAuthenticated]  # Require authentication

#     def get(self, request):
#         """Retrieve and return Kubernetes events with secure practices."""
#         logger.info("🔹 GET request received to list Kubernetes events.")
        
#         # Get namespace from query parameters (optional)
#         namespace = request.query_params.get("namespace", None)
#         print("namespace",namespace)
#         try:
#             # Fetch events (filter by namespace if provided)
#             if namespace:
#                 events = v1.list_namespaced_event(namespace).items
#             else:
#                 events = v1.list_event_for_all_namespaces().items

#             if not events:
#                 return Response({"message": "No events found."}, status=status.HTTP_200_OK)

#             # Process events
#             event_list = []
#             for event in events:
#                 event_data = {
#                     "name": event.metadata.name,
#                     "reason": event.reason or "N/A",
#                     "message": event.message,
#                     "source": event.source.component if event.source else "Unknown",
#                     "object": f"{event.involved_object.kind}/{event.involved_object.name}",
#                     "count": event.count,
#                     # "first_seen": event.first_timestamp.strftime('%Y-%m-%d %H:%M:%S') if isinstance(event.first_timestamp, datetime) else "Unknown",
#                     # "last_seen": event.last_timestamp.strftime('%Y-%m-%d %H:%M:%S') if isinstance(event.last_timestamp, datetime) else "Unknown",
#                 }
#                 event_list.append(event_data)

#             logger.info(f"✅ Retrieved {len(event_list)} Kubernetes events.")
#             return Response({"events": event_list}, status=status.HTTP_200_OK)

#         except client.exceptions.ApiException as e:
#             logger.error(f"❌ Kubernetes API error: {e}")
#             return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)



class ListKubernetesEventsAPIView(APIView):
    """
    API to list Kubernetes events.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Retrieve and return Kubernetes events with secure practices."""
        logger.info("🔹 GET request received to list Kubernetes events.")

        # Get namespace from query parameters (optional)
        namespace = request.query_params.get("namespace", None)
        print("namespace", namespace)

        try:
            # Fetch events
            if namespace:
                events = v1.list_namespaced_event(namespace).items
            else:
                events = v1.list_event_for_all_namespaces().items

            if not events:
                return Response({"message": "No events found."}, status=status.HTTP_200_OK)

            # Format helper
            def format_timestamp(ts):
                return ts.strftime('%Y-%m-%d %H:%M:%S') if isinstance(ts, datetime) else "Unknown"

            # Process events
            event_list = []
            for event in events:
                event_data = {
                    "name": event.metadata.name,
                    "reason": event.reason or "N/A",
                    "message": event.message,
                    "source": event.source.component if event.source else "Unknown",
                    "object": f"{event.involved_object.kind}/{event.involved_object.name}",
                    "count": event.count,
                    "first_seen": format_timestamp(event.first_timestamp),
                    "last_seen": format_timestamp(event.last_timestamp),
                }
                event_list.append(event_data)

            logger.info(f"✅ Retrieved {len(event_list)} Kubernetes events.")
            return Response({"events": event_list}, status=status.HTTP_200_OK)

        except client.exceptions.ApiException as e:
            logger.error(f"❌ Kubernetes API error: {e}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)






# ----------------------------------14 Mar 2025 -------------------------------




# class WorkloadDetailsAPIView(APIView):
#     """
#     API to list Kubernetes events.
#     """
#     permission_classes = [IsAuthenticated]  # Require authentication

#     def get(self, request):
#         try:
#             config.load_kube_config(config_file=KUBECONFIG_PATH)  # Load Kubernetes config (use load_incluster_config() if inside a cluster)
#             v1 = client.CoreV1Api()
#             apps_v1 = client.AppsV1Api()

#             # Get Deployments
#             deployments = apps_v1.list_namespaced_deployment(namespace="default")
#             deployment_statuses = {"Running": 0, "Failed": 0, "Pending": 0}
#             for d in deployments.items:
#                 available_replicas = d.status.available_replicas or 0
#                 total_replicas = d.spec.replicas or 0
#                 unavailable_replicas = total_replicas - available_replicas

#                 if available_replicas == total_replicas:
#                     deployment_statuses["Running"] += 1
#                 elif unavailable_replicas == total_replicas:
#                     deployment_statuses["Failed"] += 1
#                 else:
#                     deployment_statuses["Pending"] += 1

#             # Get Pods
#             pods = v1.list_namespaced_pod(namespace="default")
#             pod_statuses = {"Running": 0, "Failed": 0, "Pending": 0}
#             for p in pods.items:
#                 if p.status.phase == "Running":
#                     pod_statuses["Running"] += 1
#                 elif p.status.phase == "Failed":
#                     pod_statuses["Failed"] += 1
#                 elif p.status.phase == "Pending":
#                     pod_statuses["Pending"] += 1

#             # Get ReplicaSets
#             replicasets = apps_v1.list_namespaced_replica_set(namespace="default")
#             replicaset_statuses = {"Running": 0, "Failed": 0, "Pending": 0}
#             for rs in replicasets.items:
#                 available_replicas = rs.status.available_replicas or 0
#                 total_replicas = rs.spec.replicas or 0
#                 unavailable_replicas = total_replicas - available_replicas

#                 if available_replicas == total_replicas:
#                     replicaset_statuses["Running"] += 1
#                 elif unavailable_replicas == total_replicas:
#                     replicaset_statuses["Failed"] += 1
#                 else:
#                     replicaset_statuses["Pending"] += 1
#             # ✅ Get StatefulSets
#             statefulsets = apps_v1.list_namespaced_stateful_set(namespace="default")
#             statefulset_statuses = {"Running": 0, "Failed": 0, "Pending": 0}
#             for sts in statefulsets.items:
#                 ready = sts.status.ready_replicas or 0
#                 desired = sts.spec.replicas or 0
#                 if ready == desired:
#                     statefulset_statuses["Running"] += 1
#                 elif ready == 0:
#                     statefulset_statuses["Failed"] += 1
#                 else:
#                     statefulset_statuses["Pending"] += 1
                    
#             # Response Format
#             response_data = {
#                 "*Deployments": deployment_statuses,
#                 "*Pods": pod_statuses,
#                 "*Replica Sets": replicaset_statuses,
#                 "*Stateful Sets": statefulset_statuses
#             }

#             return Response(response_data, status=status.HTTP_200_OK)

#         except Exception as e:
#             return Response(
#                 {"error": f"Failed to fetch workload details: {str(e)}"},
#                 status=status.HTTP_500_INTERNAL_SERVER_ERROR
#             )
            
# -------------------------------------16 June 2025 ------------------------------

# class WorkloadDetailsAPIView(APIView):
#     """
#     API to list Kubernetes workload details from all namespaces.
#     """
#     permission_classes = [IsAuthenticated]

#     def get(self, request):
#         try:
#             # Load Kubernetes config
#             config.load_kube_config(config_file=KUBECONFIG_PATH)

#             v1 = client.CoreV1Api()
#             apps_v1 = client.AppsV1Api()

#             # Get Deployments from all namespaces
#             deployments = apps_v1.list_deployment_for_all_namespaces()
#             deployment_statuses = {"Running": 0, "Failed": 0, "Pending": 0}
#             for d in deployments.items:
#                 available = d.status.available_replicas or 0
#                 desired = d.spec.replicas or 0
#                 if available == desired:
#                     deployment_statuses["Running"] += 1
#                 elif available == 0:
#                     deployment_statuses["Failed"] += 1
#                 else:
#                     deployment_statuses["Pending"] += 1

#             # Get Pods from all namespaces
#             pods = v1.list_pod_for_all_namespaces()
#             pod_statuses = {"Running": 0, "Failed": 0, "Pending": 0}
#             for p in pods.items:
#                 phase = p.status.phase
#                 if phase == "Running":
#                     pod_statuses["Running"] += 1
#                 elif phase == "Failed":
#                     pod_statuses["Failed"] += 1
#                 elif phase == "Pending":
#                     pod_statuses["Pending"] += 1

#             # Get ReplicaSets from all namespaces
#             replicasets = apps_v1.list_replica_set_for_all_namespaces()
#             replicaset_statuses = {"Running": 0, "Failed": 0, "Pending": 0}
#             for rs in replicasets.items:
#                 available = rs.status.available_replicas or 0
#                 desired = rs.spec.replicas or 0
#                 if available == desired:
#                     replicaset_statuses["Running"] += 1
#                 elif available == 0:
#                     replicaset_statuses["Failed"] += 1
#                 else:
#                     replicaset_statuses["Pending"] += 1

#             # Get StatefulSets from all namespaces
#             statefulsets = apps_v1.list_stateful_set_for_all_namespaces()
#             statefulset_statuses = {"Running": 0, "Failed": 0, "Pending": 0}
#             for sts in statefulsets.items:
#                 ready = sts.status.ready_replicas or 0
#                 desired = sts.spec.replicas or 0
#                 if ready == desired:
#                     statefulset_statuses["Running"] += 1
#                 elif ready == 0:
#                     statefulset_statuses["Failed"] += 1
#                 else:
#                     statefulset_statuses["Pending"] += 1

#             response_data = {
#                 "*Deployments": deployment_statuses,
#                 "*Pods": pod_statuses,
#                 "*Replica Sets": replicaset_statuses,
#                 "*Stateful Sets": statefulset_statuses
#             }

#             return Response(response_data, status=status.HTTP_200_OK)

#         except Exception as e:
#             return Response(
#                 {"error": f"Failed to fetch workload details: {str(e)}"},
#                 status=status.HTTP_500_INTERNAL_SERVER_ERROR
#             )


class WorkloadDetailsAPIView(APIView):
    """
    API to list Kubernetes workload details by namespace (or all).
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        namespace = request.query_params.get("namespace", "default")  # default if not provided

        try:
            # Load Kubernetes config
            config.load_kube_config(config_file=KUBECONFIG_PATH)

            v1 = client.CoreV1Api()
            apps_v1 = client.AppsV1Api()

            # === DEPLOYMENTS ===
            if namespace.lower() == "all":
                deployments = apps_v1.list_deployment_for_all_namespaces()
            else:
                deployments = apps_v1.list_namespaced_deployment(namespace=namespace)

            # Add before any workload fetch:
            try:
                if namespace.lower() != "all":
                    v1.read_namespace(name=namespace)  # This will raise an error if namespace doesn't exist
            except client.exceptions.ApiException as e:
                return Response(
                    {"error": f"Namespace '{namespace}' not found."},
                    status=status.HTTP_404_NOT_FOUND
                )


            deployment_statuses = {"Running": 0, "Failed": 0, "Pending": 0}
            for d in deployments.items:
                available = d.status.available_replicas or 0
                desired = d.spec.replicas or 0
                if available == desired:
                    deployment_statuses["Running"] += 1
                elif available == 0:
                    deployment_statuses["Failed"] += 1
                else:
                    deployment_statuses["Pending"] += 1

            # === PODS ===
            if namespace.lower() == "all":
                pods = v1.list_pod_for_all_namespaces()
            else:
                pods = v1.list_namespaced_pod(namespace=namespace)

            pod_statuses = {"Running": 0, "Failed": 0, "Pending": 0}
            for p in pods.items:
                phase = p.status.phase
                if phase == "Running":
                    pod_statuses["Running"] += 1
                elif phase == "Failed":
                    pod_statuses["Failed"] += 1
                elif phase == "Pending":
                    pod_statuses["Pending"] += 1

            # === REPLICASETS ===
            if namespace.lower() == "all":
                replicasets = apps_v1.list_replica_set_for_all_namespaces()
            else:
                replicasets = apps_v1.list_namespaced_replica_set(namespace=namespace)

            replicaset_statuses = {"Running": 0, "Failed": 0, "Pending": 0}
            for rs in replicasets.items:
                available = rs.status.available_replicas or 0
                desired = rs.spec.replicas or 0
                if available == desired:
                    replicaset_statuses["Running"] += 1
                elif available == 0:
                    replicaset_statuses["Failed"] += 1
                else:
                    replicaset_statuses["Pending"] += 1

            # === STATEFULSETS ===
            if namespace.lower() == "all":
                statefulsets = apps_v1.list_stateful_set_for_all_namespaces()
            else:
                statefulsets = apps_v1.list_namespaced_stateful_set(namespace=namespace)

            statefulset_statuses = {"Running": 0, "Failed": 0, "Pending": 0}
            for sts in statefulsets.items:
                ready = sts.status.ready_replicas or 0
                desired = sts.spec.replicas or 0
                if ready == desired:
                    statefulset_statuses["Running"] += 1
                elif ready == 0:
                    statefulset_statuses["Failed"] += 1
                else:
                    statefulset_statuses["Pending"] += 1

            # === RESPONSE ===
            response_data = {
                "Namespace": namespace,
                "Deployments": deployment_statuses,
                "Pods": pod_statuses,
                "Replica Sets": replicaset_statuses,
                "Stateful Sets": statefulset_statuses
            }

            return Response(response_data, status=status.HTTP_200_OK)

        except client.exceptions.ApiException as api_exc:
            return Response(
                {"error": f"Kubernetes API error: {api_exc.reason}"},
                status=api_exc.status
            )
        except Exception as e:
            return Response(
                {"error": f"Failed to fetch workload details: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class KubernetesResourcesDetailAPIView(APIView):
    permission_classes = []  # Set to [IsAuthenticated] if needed

    def get(self, request):
        try:
            config.load_kube_config(config_file=KUBECONFIG_PATH)
            namespace = request.query_params.get("namespace", "default")

            if namespace.lower() == "all":
                namespace = None  # List across all namespaces

            v1 = client.CoreV1Api()
            apps_v1 = client.AppsV1Api()

            # Helper function for status classification
            def classify_workload(available, desired):
                if available == desired:
                    return "Running"
                elif available == 0:
                    return "Failed"
                else:
                    return "Pending"

            # Deployments
            deployments = apps_v1.list_namespaced_deployment(namespace=namespace) if namespace else apps_v1.list_deployment_for_all_namespaces()
            deployment_statuses = {"Running": 0, "Failed": 0, "Pending": 0}
            for d in deployments.items:
                desired = d.spec.replicas or 0
                available = d.status.available_replicas or 0
                status_key = classify_workload(available, desired)
                deployment_statuses[status_key] += 1

            # Pods
            pods = v1.list_namespaced_pod(namespace=namespace) if namespace else v1.list_pod_for_all_namespaces()
            pod_statuses = {"Running": 0, "Failed": 0, "Pending": 0}
            for p in pods.items:
                phase = p.status.phase
                if phase in pod_statuses:
                    pod_statuses[phase] += 1

            # ReplicaSets
            replicasets = apps_v1.list_namespaced_replica_set(namespace=namespace) if namespace else apps_v1.list_replica_set_for_all_namespaces()
            replicaset_statuses = {"Running": 0, "Failed": 0, "Pending": 0}
            for rs in replicasets.items:
                desired = rs.spec.replicas or 0
                available = rs.status.available_replicas or 0
                status_key = classify_workload(available, desired)
                replicaset_statuses[status_key] += 1

            # StatefulSets
            statefulsets = apps_v1.list_namespaced_stateful_set(namespace=namespace) if namespace else apps_v1.list_stateful_set_for_all_namespaces()
            statefulset_statuses = {"Running": 0, "Failed": 0, "Pending": 0}
            for ss in statefulsets.items:
                desired = ss.spec.replicas or 0
                available = ss.status.ready_replicas or 0
                status_key = classify_workload(available, desired)
                statefulset_statuses[status_key] += 1

            # DaemonSets
            daemonsets = apps_v1.list_namespaced_daemon_set(namespace=namespace) if namespace else apps_v1.list_daemon_set_for_all_namespaces()
            daemonset_statuses = {"Running": 0, "Failed": 0, "Pending": 0}
            for ds in daemonsets.items:
                desired = ds.status.desired_number_scheduled or 0
                ready = ds.status.number_ready or 0
                status_key = classify_workload(ready, desired)
                daemonset_statuses[status_key] += 1

            return Response({
                "Namespace": request.query_params.get("namespace", "default"),
                "Deployments": deployment_statuses,
                "Pods": pod_statuses,
                "Replica Sets": replicaset_statuses,
                "Stateful Sets": statefulset_statuses,
                "Daemon Sets": daemonset_statuses
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {"error": f"Kubernetes API error: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

            
# class ReplicaSetDetailsAPIView(APIView):
#     def get(self, request):
#         try:
#             # Load Kubernetes config securely
#             try:
#                 config.load_incluster_config()  # Use inside the cluster
#             except config.ConfigException:
#                 config.load_kube_config(config_file=KUBECONFIG_PATH)  # Use for local testing

#             apps_v1 = client.AppsV1Api()
#             namespace = "default"  # Change if needed

#             # Get ReplicaSets
#             replica_sets = apps_v1.list_namespaced_replica_set(namespace=namespace)

#             rs_data = []
#             for rs in replica_sets.items:
#                 name = rs.metadata.name
#                 labels = rs.metadata.labels or {}  # Handle missing labels
#                 created_time = rs.metadata.creation_timestamp
#                 pods = rs.status.replicas or 0  # Default to 0 if replicas are missing
#                 images = []

#                 # Extract container images from pod templates
#                 if rs.spec.template and rs.spec.template.spec:
#                     for container in rs.spec.template.spec.containers:
#                         images.append(container.image)

#                 rs_data.append({
#                     "Name": name,
#                     "Images": images,
#                     "Labels": labels,
#                     "Pods": pods,
#                     "Created": created_time.isoformat() if created_time else None
#                 })

#             return Response(rs_data, status=status.HTTP_200_OK)

#         except client.exceptions.ApiException as e:
#             return Response(
#                 {"error": "Failed to retrieve ReplicaSet details. Check cluster access."},
#                 status=status.HTTP_500_INTERNAL_SERVER_ERROR
#             )
#         except Exception as e:
#             return Response(
#                 {"error": "An unexpected error occurred."},
#                 status=status.HTTP_500_INTERNAL_SERVER_ERROR
#             )
 
#  ----------------------------30 June 2025------------------------------------------

class ReplicaSetDetailAPIView(APIView):
    def get(self, request):
        name = request.query_params.get('name')
        namespace = request.query_params.get('namespace', 'default')

        if not name:
            return Response({"error": "ReplicaSet name is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            core_v1, apps_v1 = get_k8s_client()
            rs = apps_v1.read_namespaced_replica_set(name=name, namespace=namespace)

            # Pod selector
            selector = rs.spec.selector.match_labels
            selector_str = ", ".join([f"{k}: {v}" for k, v in selector.items()]) if selector else "-"

            # Pod status
            pods = core_v1.list_namespaced_pod(namespace=namespace, label_selector=','.join([f"{k}={v}" for k, v in selector.items()]))
            pod_info = []
            for pod in pods.items:
                pod_info.append({
                    "name": pod.metadata.name,
                    "namespace": pod.metadata.namespace,
                    "images": [c.image for c in pod.spec.containers],
                    "labels": pod.metadata.labels,
                    "node": pod.spec.node_name,
                    "status": pod.status.phase,
                    "restarts": sum(cs.restart_count for cs in (pod.status.container_statuses or [])),
                    "cpu_usage": "1.00m",  # Placeholder
                    "memory_usage": "12.78Mi",  # Placeholder
                    "created": humanize_age(pod.metadata.creation_timestamp)
                })

            # Services matching labels
            services = core_v1.list_namespaced_service(namespace=namespace)
            matching_services = []
            for svc in services.items:
                if svc.spec.selector and all(item in pod.metadata.labels.items() for item in svc.spec.selector.items()):
                    matching_services.append({
                        "name": svc.metadata.name,
                        "namespace": svc.metadata.namespace,
                        "labels": svc.metadata.labels,
                        "type": svc.spec.type,
                        "cluster_ip": svc.spec.cluster_ip,
                        "internal_endpoints": [f"{port.name or svc.metadata.name}:{port.port} {port.protocol}" for port in svc.spec.ports],
                        "external_endpoints": [f"{port.name or svc.metadata.name}:{port.node_port} {port.protocol}" for port in svc.spec.ports if port.node_port],
                        "created": humanize_age(svc.metadata.creation_timestamp)
                    })

            data = {
                "name": rs.metadata.name,
                "namespace": rs.metadata.namespace,
                "created": rs.metadata.creation_timestamp.strftime("%b %d, %Y"),
                "age": humanize_age(rs.metadata.creation_timestamp),
                "uid": rs.metadata.uid,
                "labels": rs.metadata.labels or {},
                "annotations": rs.metadata.annotations or {},
                "selector": selector_str,
                "images": [c.image for c in rs.spec.template.spec.containers],
                "init_images": [c.image for c in rs.spec.template.spec.init_containers or []],
                "pods_status": {
                    "running": rs.status.ready_replicas or 0,
                    "desired": rs.spec.replicas or 0
                },
                "pods": pod_info,
                "services": matching_services,
                "events": []  # Can be extended
            }

            return Response(data, status=status.HTTP_200_OK)

        except client.exceptions.ApiException as e:
            return Response({"error": f"Kubernetes API error: {e.reason}"}, status=e.status)
        except Exception as e:
            return Response({"error": f"Unexpected error: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

 
            
class ReplicaSetDetailsAPIView(APIView):
    def get(self, request):
        try:
            namespace = request.query_params.get('namespace', 'all')

            # Load Kubernetes config
            try:
                config.load_incluster_config()
            except config.ConfigException:
                config.load_kube_config(config_file=KUBECONFIG_PATH)

            apps_v1 = client.AppsV1Api()

            # Fetch replica sets from all namespaces if 'all' is passed
            if namespace.lower() == 'all':
                replica_sets = apps_v1.list_replica_set_for_all_namespaces()
            else:
                replica_sets = apps_v1.list_namespaced_replica_set(namespace=namespace)

            rs_data = []
            for rs in replica_sets.items:
                images = [c.image for c in rs.spec.template.spec.containers] if rs.spec.template and rs.spec.template.spec else []

                rs_data.append({
                    "Name": rs.metadata.name,
                    "Namespace": rs.metadata.namespace,
                    "Images": images,
                    "Labels": rs.metadata.labels or {},
                    "Pods": rs.status.replicas or 0,
                    "Created": rs.metadata.creation_timestamp.isoformat() if rs.metadata.creation_timestamp else None
                })

            return Response(rs_data, status=status.HTTP_200_OK)

        except client.exceptions.ApiException as e:
            return Response(
                {"error": f"Kubernetes API error: {e.reason}"},
                status=e.status
            )
        except Exception as e:
            return Response(
                {"error": f"Unexpected error: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

# -------------------------------------15 Mar 2025--------------------------------------------


logger = logging.getLogger(__name__)

class DeployPodOnKnode2APIView(APIView):
    def post(self, request):
        logger.info("🔹 Received request to deploy a pod on knode2.")
        print(request.data)
        appln_name = request.data.get("appln_name")
        appln_type = request.data.get("appln_type")

        if not appln_name or not appln_type:
            return Response(
                {"error": "Both 'appln_name' and 'appln_type' are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Check if application type is supported
        if appln_type not in APPLICATION_IMAGES:
            return Response(
                {"error": f"Application type '{appln_type}' is not supported."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Fetch application details from dictionary
        app_config = APPLICATION_IMAGES[appln_type]
        image_name = app_config["image"]
        port = app_config.get("port", None)  # Default to None if not found
        env_vars = app_config.get("env", {})  # Default to empty dict if no env vars

        # Deploy directly to knode2
        node_name = "knode2"
        success = self.create_pod(appln_name, image_name, port, env_vars, node_name)

        if success:
            return Response(
                {"message": f"✅ Pod '{appln_name}-pod' successfully deployed on {node_name}."},
                status=status.HTTP_201_CREATED,
            )

        return Response(
            {"error": f"❌ Pod '{appln_name}-pod' failed to deploy on {node_name}."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    def create_pod(self, appln_name, image_name, port, env_vars, node_name):
        """Create and launch a Kubernetes pod on knode2."""
        pod_manifest = {
            "apiVersion": "v1",
            "kind": "Pod",
            "metadata": {"name": f"{appln_name}-pod"},
            "spec": {
                "nodeSelector": {"kubernetes.io/hostname": node_name},  # Force scheduling on knode2
                "containers": [
                    {
                        "name": appln_name,
                        "image": image_name,
                        "ports": [{"containerPort": port}] if port else [],
                        "env": [{"name": k, "value": v} for k, v in env_vars.items()]
                    }
                ]
            }
        }

        try:
            v1.create_namespaced_pod(namespace="default", body=pod_manifest)
            logger.info(f"✅ {appln_name}-pod created successfully on {node_name}!")
            return True
        except Exception as e:
            logger.error(f"❌ Error creating pod on {node_name}: {str(e)}")
            return False


apps_v1 = client.AppsV1Api()  # Apps API client for Deployments, ReplicaSets, etc.

class CreateReplicaSetAPIView(APIView):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.v1 = v1  # CoreV1Api instance
        self.apps_v1 = apps_v1  # AppsV1Api instance

    def post(self, request):
        """Create a ReplicaSet from an existing pod."""
        print("\n📌 Received request to create a ReplicaSet...")

        pod_name = request.data.get("pod_name")
        namespace = request.data.get("namespace")
        replicas = request.data.get("replicas", 1)

        if not pod_name or not namespace:
            print("❌ Missing required fields: 'pod_name' and 'namespace'")
            return Response(
                {"error": "Both 'pod_name' and 'namespace' are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            replicas = int(replicas)
            if replicas < 1:
                print("❌ Replica count must be greater than 0!")
                return Response(
                    {"error": "Replica count must be greater than 0"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        except ValueError:
            print("❌ Invalid replica count!")
            return Response(
                {"error": "Invalid replica count. Must be an integer."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            # Get the existing pod details
            pod = self.v1.read_namespaced_pod(name=pod_name, namespace=namespace)
        except Exception as e:
            print(f"❌ Error retrieving pod '{pod_name}': {str(e)}")
            return Response(
                {"error": f"Pod '{pod_name}' not found in namespace '{namespace}'"},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Ensure pod has labels
        pod_labels = pod.metadata.labels or {"app": pod_name}

        # Clean the pod spec (remove service account & unwanted volume mounts)
        pod_spec = self.clean_pod_spec(pod.spec)

        # Define ReplicaSet
        rs_manifest = {
            "apiVersion": "apps/v1",
            "kind": "ReplicaSet",
            "metadata": {"name": f"{pod_name}-rs"},
            "spec": {
                "replicas": replicas,
                "selector": {"matchLabels": pod_labels},
                "template": {
                    "metadata": {"labels": pod_labels},
                    "spec": pod_spec,
                },
            },
        }

        try:
            # Create the ReplicaSet using self.apps_v1
            self.apps_v1.create_namespaced_replica_set(namespace=namespace, body=rs_manifest)
            print(f"✅ Successfully created ReplicaSet '{pod_name}-rs' with {replicas} replicas in namespace '{namespace}'")
            return Response(
                {"message": f"ReplicaSet '{pod_name}-rs' created with {replicas} replicas"},
                status=status.HTTP_201_CREATED,
            )
        except Exception as e:
            print(f"❌ Error creating ReplicaSet: {str(e)}")
            return Response(
                {"error": "Failed to create ReplicaSet"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def get(self, request):
        """List all available pods in all namespaces."""
        print("\n📌 Fetching available pods...")

        try:
            pods = v1.list_pod_for_all_namespaces(watch=False)
            pod_list = [
                {
                    "name": pod.metadata.name,
                    "namespace": pod.metadata.namespace,
                    "labels": pod.metadata.labels or {},
                }
                for pod in pods.items
            ]
        except Exception as e:
            print(f"❌ Error fetching pods: {str(e)}")
            return Response({"error": "Failed to fetch pods"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        if not pod_list:
            print("⚠️ No pods found in the cluster!")
            return Response({"message": "No pods found in the cluster"}, status=status.HTTP_404_NOT_FOUND)

        print(f"✅ Found {len(pod_list)} pods.")
        return Response({"pods": pod_list}, status=status.HTTP_200_OK)

    def post(self, request):
        """Create a ReplicaSet from an existing pod."""
        print("\n📌 Received request to create a ReplicaSet...")

        pod_name = request.data.get("pod_name")
        namespace = request.data.get("namespace")
        replicas = request.data.get("replicas", 1)

        if not pod_name or not namespace:
            print("❌ Missing required fields: 'pod_name' and 'namespace'")
            return Response(
                {"error": "Both 'pod_name' and 'namespace' are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            replicas = int(replicas)
            if replicas < 1:
                print("❌ Replica count must be greater than 0!")
                return Response(
                    {"error": "Replica count must be greater than 0"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        except ValueError:
            print("❌ Invalid replica count!")
            return Response(
                {"error": "Invalid replica count. Must be an integer."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            # Get the existing pod details
            pod = v1.read_namespaced_pod(name=pod_name, namespace=namespace)
        except Exception as e:
            print(f"❌ Error retrieving pod '{pod_name}': {str(e)}")
            return Response(
                {"error": f"Pod '{pod_name}' not found in namespace '{namespace}'"},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Ensure pod has labels
        pod_labels = pod.metadata.labels or {"app": pod_name}

        # Clean the pod spec (remove service account & unwanted volume mounts)
        pod_spec = self.clean_pod_spec(pod.spec)

        # Define ReplicaSet
        rs_manifest = {
            "apiVersion": "apps/v1",
            "kind": "ReplicaSet",
            "metadata": {"name": f"{pod_name}-rs"},
            "spec": {
                "replicas": replicas,
                "selector": {"matchLabels": pod_labels},
                "template": {
                    "metadata": {"labels": pod_labels},
                    "spec": pod_spec,
                },
            },
        }

        try:
            # Create the ReplicaSet
            apps_v1.create_namespaced_replica_set(namespace=namespace, body=rs_manifest)
            print(f"✅ Successfully created ReplicaSet '{pod_name}-rs' with {replicas} replicas in namespace '{namespace}'")
            return Response(
                {"message": f"ReplicaSet '{pod_name}-rs' created with {replicas} replicas"},
                status=status.HTTP_201_CREATED,
            )
        except Exception as e:
            print(f"❌ Error creating ReplicaSet: {str(e)}")
            return Response(
                {"error": "Failed to create ReplicaSet"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def clean_pod_spec(self, pod_spec):
        """Remove unwanted fields like 'serviceAccount' and 'kube-api-access' volume mounts."""
        print("🔹 Cleaning pod spec...")

        for container in pod_spec.containers:
            if container.volume_mounts:
                container.volume_mounts = [
                    v for v in container.volume_mounts if not v.name.startswith("kube-api-access")
                ]

        if pod_spec.service_account_name:
            pod_spec.service_account_name = None

        return pod_spec
    
    
# ------------------------------------18 March 2025 ---------------------------- 
    
class WorkloadStatsAPIView(APIView):
    """
    API to fetch workload statistics from Kubernetes.
    Returns the count of DaemonSets, Pods, Deployments, and ReplicaSets.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            # Load Kubernetes configuration (works for both inside a cluster and kubeconfig)
            try:
                config.load_incluster_config()  # When running inside a cluster
            except config.ConfigException:
                config.load_kube_config(config_file=KUBECONFIG_PATH)

            v1_apps = client.AppsV1Api()
            v1_core = client.CoreV1Api()

            # Get counts
            daemonsets_count = sum(
                1 for _ in v1_apps.list_daemon_set_for_all_namespaces().items
            )
            pods_count = sum(
                1 for _ in v1_core.list_pod_for_all_namespaces().items
            )
            deployments_count = sum(
                1 for _ in v1_apps.list_deployment_for_all_namespaces().items
            )
            replicasets_count = sum(
                1 for _ in v1_apps.list_replica_set_for_all_namespaces().items
            )

            return Response(
                {
                    "daemonsets": daemonsets_count,
                    "pods": pods_count,
                    "deployments": deployments_count,
                    "replicasets": replicasets_count,
                },
                status=status.HTTP_200_OK,
            )

        except Exception as e:
            return Response(
                {"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class DaemonSetListAPIView(APIView):
    """
    API to list all DaemonSets in Kubernetes.
    Returns Name, Namespace, Images, Labels, Pod Count, and Creation Timestamp.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            # Load Kubernetes config (works for both inside cluster and kubeconfig)
            try:
                config.load_incluster_config()  # When running inside a cluster
            except config.ConfigException:
                config.load_kube_config(config_file=KUBECONFIG_PATH)  # When running outside (local development)

            v1_apps = client.AppsV1Api()

            # Fetch all DaemonSets
            daemonsets = v1_apps.list_daemon_set_for_all_namespaces().items
            daemonset_list = []

            for ds in daemonsets:
                daemonset_data = {
                    "name": ds.metadata.name,
                    "namespace": ds.metadata.namespace,
                    "images": [container.image for container in ds.spec.template.spec.containers],
                    "labels": ds.metadata.labels,
                    "pods": ds.status.number_available,  # Number of available pods in DaemonSet
                    "created": ds.metadata.creation_timestamp.strftime("%Y-%m-%d %H:%M:%S")
                }
                daemonset_list.append(daemonset_data)

            return Response(daemonset_list, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)



# ceph_views.py or views.py


class CephClusterHealthView(APIView):
    def get(self, request):
        return fetch_ceph_data("/api/cluster/health")

class CephOSDInfoView(APIView):
    def get(self, request):
        """
        Fetch data from the Ceph API's /api/osd endpoint.

        Returns:
            Response: JSON response from the Ceph API.
        """
        return fetch_ceph_data("/api/osd")


class CephClusterInfoView(APIView):
    def get(self, request):
        return fetch_ceph_data("/api/cluster", version="v0.1")


class CephHostInfoView(APIView):
    def get(self, request):
        return fetch_ceph_data("/api/host")

class CephCapacityView(APIView):
    def get(self, request):
        return fetch_ceph_data("/api/health/get_cluster_capacity")


class CephSummaryView(APIView):
    def get(self, request):
        return fetch_ceph_data("/api/summary")


class CephInventoryView(APIView):
    def get(self, request):
        endpoints = {
            "hosts": "/api/host",
            "monitors": "/api/monitor",
            "managers": "/api/manager",
            "osds": "/api/osd",
            "pools": "/api/pool",
            "pgs": "/api/pg",
            "object_gateways": "/api/rgw",
            "metadata_servers": "/api/mds",
            "iscsi_gateways": "/api/iscsi",
        }

        inventory = {}

        for key, endpoint in endpoints.items():
            data = fetch_ceph_data_inventory(endpoint)
            if "error" in data:
                inventory[key] = "Error"
            elif isinstance(data, list):
                inventory[key] = len(data)
            elif isinstance(data, dict) and "result" in data:
                inventory[key] = len(data["result"])
            else:
                inventory[key] = data.get("count", 0)

        return JsonResponse(inventory)
    
    
class CephPoolListView(APIView):
    def get(self, request):
        return fetch_ceph_data("/api/pool")


# --------------------------------15 April 2025----------------------------

# class VMExpiryNotificationAPIView(APIView):
#     def get(self, request):
#         current_user = request.user
#         print("Current logged-in user:", current_user)
#         today = timezone.now().date()
#         print(today)
#         one_week_later = today + timedelta(days=7)
#         print(one_week_later)
#         # Fetch VMs that will expire exactly in 7 days
#         vms = VMInfo.objects.filter(vm_access_to_date=one_week_later.strftime('%Y-%m-%d'))
#         print("vms",vms)
#         # Filter the VMs for this user
#         vms = VmRequest.objects.filter(
#             email=current_user,
#             admin_status="Accepted",
#             fla_status="Accepted"
#         )
       
#         for vm in vms:
#              print(f"VM Name: {vm.vm_name}, Expiry Date: {vm.login_disable_date}")
             
#         vm_details = [{"vm_name": vm.vm_name, "expiry_date": vm.login_disable_date} for vm in vms]
#         notified = []
#         for vm in vms:
#             if vm.email:
#                 subject = "VM Access Expiry Notification"
#                 message = (
#                     f"Dear User,\n\n"
#                     f"Your VM '{vm.vm_name}' is scheduled to expire on {vm.login_disable_date}.\n"
#                     f"Would you like to renew access?\n\n"
#                     f"If no action is taken, the VM will be deleted.\n\n"
#                     f"Regards,\nCloud Team"
#                 )
#                 try:
#                     send_mail(subject, message, 'rakshana@cdac.in', [vm.email])
#                     notified.append(vm.vm_name)
#                 except Exception as e:
#                     print(f"Failed to notify {vm.email}: {e}")
        
#         return Response({
#             "message": "Notifications sent.",
#             "notified_vms": vm_details
#         }, status=status.HTTP_200_OK)




# class VMExpiryNotificationAPIView(APIView):
#     def get(self, request):
#         current_user = request.user
#         today = timezone.now().date()
#         seven_days_later = today + timedelta(days=7)
        
#         # Check if the current user is an admin
#         is_admin = current_user.is_staff  # or however you identify admins in your system
        
#         # Base query to get VMs expiring within the next 7 days (including today)
#         if is_admin:
#             # For admin, get all VMs expiring between today and 7 days from now
#             vms = VmRequest.objects.filter(
#                 admin_status="Accepted",
#                 fla_status="Accepted",
#                 login_disable_date__gte=today,
#                 login_disable_date__lte=seven_days_later
#             )
#         else:
#             # For regular users, get only their VMs expiring between today and 7 days from now
#             vms = VmRequest.objects.filter(
#                 email=current_user,
#                 admin_status="Accepted",
#                 fla_status="Accepted",
#                 login_disable_date__gte=today,
#                 login_disable_date__lte=seven_days_later
#             )
            
#         vm_details = [{"vm_name": vm.vm_name, "expiry_date": vm.login_disable_date} for vm in vms]
#         notified = []
        
#         # Send notifications for each VM
#         for vm in vms:
#             if vm.email:
#                 subject = "VM Access Expiry Notification"
#                 message = (
#                     f"Dear User,\n\n"
#                     f"Your VM '{vm.vm_name}' is scheduled to expire on {vm.login_disable_date}.\n"
#                     f"Would you like to renew access?\n\n"
#                     f"If no action is taken, the VM will be deleted.\n\n"
#                     f"Regards,\nCloud Team"
#                 )
#                 try:
#                     send_mail(subject, message, 'rakshana@cdac.in', [vm.email])
#                     notified.append(vm.vm_name)
#                 except Exception as e:
#                     print(f"Failed to notify {vm.email}: {e}")
        
#         return Response({
#             "message": "Notifications sent.",
#             "notified_vms": vm_details
#         }, status=status.HTTP_200_OK)



from django.db.models import Q

class VMExpiryNotificationAPIView(APIView):
    def get(self, request):
        current_user = request.user
        today = timezone.now().date()
        seven_days_later = today + timedelta(days=7)
        
        print(f"Current logged-in user: {current_user}")
        
        # Get user role from token
        user_role = self.get_user_role_from_token(request)
        print(f"User role: {user_role}")
        
        # Base query for VMs expiring within the next 7 days
        if user_role.upper() == 'ADMIN':
            # For admin, get all VMs expiring between today and 7 days from now
            vms = VmRequest.objects.filter(
                admin_status="Accepted",
                fla_status="Accepted",
                login_disable_date__gte=today,
                login_disable_date__lte=seven_days_later
            )
            print(f"Admin role: Found {vms.count()} VMs expiring soon")
            
        elif user_role.upper() == 'FLA':
            print("Processing FLA role")
            # For FLA, get their own VMs plus VMs of reporting employees
            try:
                # Get the current employee record
                current_emp = Employee.objects.get(email=current_user)
                print(f"Found employee record for FLA: {current_emp.employee_id}")
                
                # Get all employees reporting to this FLA
                fla_related_emp_ids = Employee.objects.filter(
                    fla_employee_id=current_emp
                ).values_list('employee_id', flat=True)
                print(f"Employees reporting to this FLA: {list(fla_related_emp_ids)}")
                
                # Get the email addresses of these employees
                reporting_employees = Employee.objects.filter(
                    employee_id__in=fla_related_emp_ids
                ).values_list('email', flat=True)
                print(f"Reporting employee emails: {list(reporting_employees)}")
                
                # First, get VMs for the FLA themselves
                own_vms = VmRequest.objects.filter(
                    email=current_user,
                    admin_status="Accepted",
                    fla_status="Accepted",
                    login_disable_date__gte=today,
                    login_disable_date__lte=seven_days_later
                )
                print(f"FLA's own VMs count: {own_vms.count()}")
                
                # Then, get VMs for reporting employees
                reporting_vms = VmRequest.objects.filter(
                    email__in=reporting_employees,
                    admin_status="Accepted",
                    fla_status="Accepted",
                    login_disable_date__gte=today,
                    login_disable_date__lte=seven_days_later
                )
                print(f"Reporting employees' VMs count: {reporting_vms.count()}")
                
                # Combine both querysets
                vms = own_vms.union(reporting_vms)
                print(f"Total VMs for FLA: {vms.count()}")
                
            except Employee.DoesNotExist:
                print(f"No employee record found for FLA: {current_user}")
                # If employee record not found, just show their own VMs
                vms = VmRequest.objects.filter(
                    email=current_user,
                    admin_status="Accepted",
                    fla_status="Accepted",
                    login_disable_date__gte=today,
                    login_disable_date__lte=seven_days_later
                )
                print(f"FLA's own VMs (fallback): {vms.count()}")
                
        else:
            # For regular users, get only their VMs
            vms = VmRequest.objects.filter(
                email=current_user,
                admin_status="Accepted",
                fla_status="Accepted",
                login_disable_date__gte=today,
                login_disable_date__lte=seven_days_later
            )
            print(f"Regular user: Found {vms.count()} VMs expiring soon")
            
        vm_details = [{"vm_name": vm.vm_name, "expiry_date": vm.login_disable_date} for vm in vms]
        notified = []
        
        # Send notifications for each VM
        for vm in vms:
            if vm.email:
                subject = "VM Access Expiry Notification"
                message = (
                    f"Dear User,\n\n"
                    f"Your VM '{vm.vm_name}' is scheduled to expire on {vm.login_disable_date}.\n"
                    f"Would you like to renew access?\n\n"
                    f"If no action is taken, the VM will be deleted.\n\n"
                    f"Regards,\nCloud Team"
                )
                try:
                    send_mail(subject, message, 'rakshana@cdac.in', [vm.email])
                    notified.append(vm.vm_name)
                except Exception as e:
                    print(f"Failed to notify {vm.email}: {e}")
        
        return Response({
            "message": "Notifications sent.",
            "notified_vms": vm_details
        }, status=status.HTTP_200_OK)
    
    def get_user_role_from_token(self, request):
        """
        Extract user role from the authentication token
        """
        # Implement according to your token structure
        # For now, returning a placeholder value matching your debug output
        return request.auth.get('role', 'user') if hasattr(request, 'auth') and request.auth else 'user'
    
    
class CreateVolumeFromImageAPIView(APIView):
    def post(self, request):
        name = request.data.get("name")
        description = request.data.get("description", "")
        image_name = request.data.get("image_name")  # e.g., "cirros-test"
        size = int(request.data.get("size"))  # in GiB
        availability_zone = request.data.get("availability_zone", "nova")
        volume_type = request.data.get("type", "__DEFAULT__")

        try:
            # Initialize OpenStack connection
            conn = get_openstack_connection()

            # Find the image
            image = conn.image.find_image(image_name)
            if not image:
                return Response({"error": "Image not found"}, status=status.HTTP_400_BAD_REQUEST)

            # Create the volume
            volume = conn.block_storage.create_volume(
                name=name,
                description=description,
                size=size,
                image_id=image.id,
                volume_type=volume_type,
                availability_zone=availability_zone
            )

            return Response({
                "message": "Volume creation initiated",
                "volume_id": volume.id,
                "status": volume.status
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)



class RejectedVMRequestsAPIView(APIView):
    def get(self, request):
        current_user = request.user
        
        # Get user role from token
        user_role = self.get_user_role_from_token(request)
        print(f"Current logged-in user: {current_user}, Role: {user_role}")
        
        # Get rejected VM requests based on user role
        if user_role.upper() == 'ADMIN':
            # For admin, get all rejected VM requests
            rejected_vms = VmRequest.objects.filter(
                Q(admin_status="Rejected") | Q(fla_status="Rejected")
            ).order_by('-request_timestamp')
            
        elif user_role.upper() == 'FLA':
            try:
                # Get the current employee record
                current_emp = Employee.objects.get(email=current_user)
                
                # Get all employees reporting to this FLA
                fla_related_emp_ids = Employee.objects.filter(
                    fla_employee_id=current_emp
                ).values_list('employee_id', flat=True)
                
                # Get rejected VM requests for the FLA and their reporting employees
                rejected_vms = VmRequest.objects.filter(
                    Q(admin_status="Rejected") | Q(fla_status="Rejected")
                ).filter(
                    Q(email=current_user) | Q(employee_id__in=fla_related_emp_ids)
                ).order_by('-request_timestamp')
                
            except Employee.DoesNotExist:
                # If employee record not found, just show their own rejected requests
                rejected_vms = VmRequest.objects.filter(
                    Q(admin_status="Rejected") | Q(fla_status="Rejected"),
                    email=current_user
                ).order_by('-request_timestamp')
                
        else:
            # For regular employees, get only their rejected VM requests
            rejected_vms = VmRequest.objects.filter(
                Q(admin_status="Rejected") | Q(fla_status="Rejected"),
                email=current_user
            ).order_by('-request_timestamp')
        
        # Serialize the rejected VM requests
        rejected_vm_details = []
        for vm in rejected_vms:
            print(vm)
             # Determine reason based on who rejected
            rejection_reason = self.get_rejection_reason(vm)
            if rejection_reason == "Rejected by FLA":
                reason = vm.fla_rejection_reason
            elif rejection_reason == "Rejected by Admin":
                reason = vm.admin_rejection_reason
            else:
                reason = None  # or a default message
            vm_detail = {
                "id": vm.id,
                "name": vm.name,
                "email": vm.email,
                "employee_id": vm.employee_id,
                "vm_name": vm.vm_name,
                "purpose": vm.purpose,
                "project_name": vm.project_name,
                "image": vm.image,
                "flavor": vm.flavor,
                "admin_status": vm.admin_status,
                "fla_status": vm.fla_status,
                "request_timestamp": vm.request_timestamp,
                "reason": reason,
                "rejection_reason": self.get_rejection_reason(vm)
            }
            rejected_vm_details.append(vm_detail)
        
        return Response({
            "count": len(rejected_vm_details),
            "rejected_vm_requests": rejected_vm_details
        }, status=status.HTTP_200_OK)
    
    def get_user_role_from_token(self, request):
        """
        Extract user role from the authentication token
        """
        # Implement according to your token structure
        # For now, returning the role from auth if it exists
        return request.auth.get('role', 'user') if hasattr(request, 'auth') and request.auth else 'user'
    
    def get_rejection_reason(self, vm_request):
        """
        Helper method to determine rejection reason based on statuses
        """
        if vm_request.fla_status == "Rejected":
            return "Rejected by FLA"
        elif vm_request.admin_status == "Rejected":
            return "Rejected by Admin"
        else:
            return "Unknown"
        
        
# --------------------15 May 2025--------------------------------


class ListVolumeTypesAPIView(APIView):
    """
    API to list all volume types in OpenStack.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            conn = get_openstack_connection()
            volume_types = conn.block_storage.types()

            result = []
            for vtype in volume_types:
                qos_specs_id = getattr(vtype, 'qos_specs_id', None)

                encryption = conn.block_storage.get_type_encryption(vtype.id)
                encryption_info = None
                if encryption:
                    encryption_info = {
                        "cipher": getattr(encryption, "cipher", None),
                        "control_location": getattr(encryption, "control_location", None),
                        "key_size": getattr(encryption, "key_size", None),
                        "provider": getattr(encryption, "provider", None)
                    }

                result.append({
                    "id": vtype.id,  # <--- ADD THIS
                    "name": vtype.name,
                    "description": vtype.description,
                    "qos_spec": qos_specs_id,
                    "encryption": encryption_info,
                    "is_public": getattr(vtype, 'is_public', None)
                })

            return Response(result, status=status.HTTP_200_OK)
        
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# ---------------------16 May 2025-----------------------------------------------

from rest_framework.views import APIView
from rest_framework.response import Response
from keystoneauth1 import session
from keystoneauth1.identity import v3
from novaclient import client as nova_client

class HypervisorDataAPIView(APIView):
    def get(self, request):
        auth = v3.Password(
            auth_url="http://<your-auth-url>:5000/v3",
            username="admin",
            password="your_password",
            project_name="admin",
            user_domain_name="Default",
            project_domain_name="Default"
        )
        sess = session.Session(auth=auth)
        nova = nova_client.Client("2.1", session=sess)

        hypervisors = nova.hypervisors.list()

        resource_providers = []
        total_ram = total_ram_used = 0
        total_disk = total_disk_used = 0
        total_vcpus = total_vcpus_used = 0
        total_instances = 0

        for h in hypervisors:
            ram_used = round(h.memory_used / 1024, 1)
            ram_total = round(h.memory_mb / 1024, 1)
            disk_used = h.local_gb_used
            disk_total = h.local_gb
            vcpus_used = h.vcpus_used
            vcpus_total = h.vcpus
            instances = h.running_vms

            resource_providers.append({
                "hostname": h.hypervisor_hostname,
                "type": h.hypervisor_type,
                "ram": {
                    "used_gb": ram_used,
                    "total_gb": ram_total
                },
                "disk": {
                    "used_gb": disk_used,
                    "total_gb": disk_total
                },
                "vcpu": {
                    "used": vcpus_used,
                    "total": vcpus_total
                },
                "instances": instances
            })

            total_ram += ram_total
            total_ram_used += ram_used
            total_disk += disk_total
            total_disk_used += disk_used
            total_vcpus += vcpus_total
            total_vcpus_used += vcpus_used
            total_instances += instances

        return Response({
            "hypervisor_summary": {
                "ram": {
                    "used_gb": total_ram_used,
                    "total_gb": total_ram
                },
                "disk": {
                    "used_gb": total_disk_used,
                    "total_gb": total_disk
                },
                "total_vms": total_instances
            },
            "resource_providers": resource_providers
        })
        
        

# ------------------------2 June 2025--------------------------

load_dotenv()

guacamole_base_url = os.getenv('GUACAMOLE_BASE_URL')
guacamole_uname = os.getenv('GUACAMOLE_UNAME')
guacamole_pwd = os.getenv('GUACAMOLE_PWD')
# Load environment variables from .env file



def get_token():
    url = f"{guacamole_base_url}/tokens"

    payload=f"username={guacamole_uname}&password={guacamole_pwd}"
    headers = {
    'Content-Type': 'application/x-www-form-urlencoded'
    }

    response = requests.request("POST", url, headers=headers, data=payload)

    return response


class GuacamoleUpdatePasswordAPIView(APIView):
    """
    API to update an existing user's password in Guacamole.
    """
    def post(self, request):
        username = request.data.get("username")
        new_password = request.data.get("new_password")

        if not username or not new_password:
            return Response({"error": "Username and new password are required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # First get a fresh token
            token_response = get_token()
            if token_response.status_code != 200:
                return Response({"error": "Failed to authenticate with Guacamole"}, status=status.HTTP_401_UNAUTHORIZED)
            
            auth_token = token_response.json().get('authToken')
            if not auth_token:
                return Response({"error": "No auth token received from Guacamole"}, status=status.HTTP_401_UNAUTHORIZED)

            # Now update the password with the token
            url = f"{guacamole_base_url}/session/data/mysql/users/{username}?token={auth_token}"

            payload = {
                "username": username,
                "password": new_password,
                "attributes": {
                    "disabled": "",
                    "expired": "",
                    "access-window-start": "",
                    "access-window-end": "",
                    "valid-from": "",
                    "valid-until": "",
                    "timezone": None,
                    "guac-full-name": None,
                    "guac-organization": None,
                    "guac-organizational-role": None
                }
            }

            headers = {'Content-Type': 'application/json'}

            response = requests.put(url, headers=headers, json=payload)
            
            if response.status_code == 204:  # Guacamole returns 204 on successful update
                return Response({"message": "Password updated successfully."}, status=status.HTTP_200_OK)
            else:
                return Response({
                    "error": "Failed to update password.",
                    "details": response.text,
                    "status_code": response.status_code
                }, status=response.status_code)

        except Exception as e:
            return Response({
                "error": "An error occurred while updating the password.",
                "details": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
 
 
 
 
 
 
 
 
            
            
# class ServiceRequestAPIView(APIView):
#     permission_classes = [IsAuthenticated]

#     def get(self, request):
#         """
#         Fetch all service request details (no pagination)
#         """
#         try:
#             role = request.auth.get('role', None)
#             employee_id = request.auth.get('employee_id', None)
#             print(f"Current logged-in user: {request.user}, Role: {role}, Employee ID: {employee_id}")
#             # Filter requests based on role
#             if role == 'ADMIN':
#                 service_requests = ServiceRequest.objects.all()
#             elif role == 'FLA':
#                 employee_ids = Employee.objects.filter(fla_employee_id=employee_id).values_list('employee_id', flat=True)
#                 service_requests = ServiceRequest.objects.filter(employee_id__in=employee_ids) | ServiceRequest.objects.filter(employee_id=employee_id)
#             else:
#                 service_requests = ServiceRequest.objects.filter(employee_id=Employee.objects.get(email=request.user))

#             serializer = ServiceRequestSerializer(service_requests, many=True)
#             return Response(
#                 {
#                     "totalRecords": service_requests.count(),
#                     "data": serializer.data
#                 },
#                 status=status.HTTP_200_OK
#             )
#         except Exception as e:
#             return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


#     # def get(self, request):
#     #     """
#     #     Fetch all service request details with pagination
#     #     """
#     #     try:
#     #         role = request.auth.get('role', None)
#     #         employee_id = request.auth.get('employee_id', None)
            
#     #         # Filter requests based on role
#     #         if role == 'ADMIN':
#     #             service_requests = ServiceRequest.objects.all()
#     #         elif role == 'FLA':
#     #             employee_ids = Employee.objects.filter(fla_employee_id=employee_id).values_list('employee_id', flat=True)
#     #             service_requests = ServiceRequest.objects.filter(employee_id__in=employee_ids) | ServiceRequest.objects.filter(employee_id=employee_id)
#     #         else:
#     #             service_requests = ServiceRequest.objects.filter(employee_id=Employee.objects.get(email=request.user))
            
#     #         # Implement pagination
#     #         page = int(request.GET.get('page', 1))
#     #         size = int(request.GET.get('size', 100))
#     #         total_records = service_requests.count()
#     #         start = (page - 1) * size
#     #         end = start + size
#     #         service_requests = service_requests[start:end]
            
#     #         serializer = ServiceRequestSerializer(service_requests, many=True)
#     #         return Response(
#     #             {
#     #                 "totalRecords": total_records,
#     #                 "page": page,
#     #                 "size": size,
#     #                 "data": serializer.data
#     #             },
#     #             status=status.HTTP_200_OK
#     #         )
#     #     except Exception as e:
#     #         return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

#     def post(self, request):
#         """
#         Store service request details in the database
#         """
#         try:
#             role = request.auth.get('role', None)
            
#             # Extract allowed fields from request data
#             allowed_fields = [
#                 "employee_id",
#                 "service_name",
#                 "purpose",
#                 "project_name",
#                 "designation",
#                 "name",
#                 "email",
#                 "purpose_of_request",
#                 "service_start_date",
#                 "service_end_date",
#                 "service_requirements",
#                 "additional_notes"
#             ]
            
#             data = {key: value for key, value in request.data.items() if key in allowed_fields}
            
#             # Add default values for status fields
#             data["admin_status"] = "Pending"
#             data["fla_status"] = "Accepted" if role == "FLA" else "Pending"
            
#             # Add timestamps
#             data["request_timestamp"] = timezone.now()
#             data["fla_approved_timestamp"] = None
#             data["admin_approved_timestamp"] = None
            
#             # Serialize and save the data
#             serializer = ServiceRequestSerializer(data=data)
#             if serializer.is_valid():
#                 serializer.save()
                
#                 # Send email notification
#                 try:
#                     employee = Employee.objects.get(employee_id=data["employee_id"])
#                     subject = 'Service Request Notification'
#                     message = f'''Dear {employee.fla_name},

#                         A service request has been raised by {employee.name} for {data["service_name"]}.

#                         Please review and approve the request.

#                         Thanks & Regards,
#                         Cloud Team'''
                    
#                     from_email = 'rakshanavg20@gmail.com'
#                     to_email = [employee.fla_email]
                    
#                     # Uncomment the following line to enable email sending
#                     # send_mail(subject, message, from_email, to_email, fail_silently=False)
#                     print(f"Email notification sent for service request: {data['service_name']}")
                    
#                 except Exception as e:
#                     print(f"Error in sending email: {e}")
                
#                 return Response(
#                     {"message": "Service request stored successfully!", "data": serializer.data},
#                     status=status.HTTP_201_CREATED
#                 )
            
#             return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
#         except Exception as e:
#             return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        
class FlaServiceRequestAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """
        Fetch all service request details related to FLA
        """
        try:
            # Get current employee ID from the logged-in user's email
            current_emp_id = Employee.objects.get(email=request.user)
            
            # Get all employee IDs where current user is FLA
            fla_related_emp_ids = Employee.objects.filter(
                fla_employee_id=current_emp_id
            ).values_list('employee_id', flat=True)
            
            # Get service requests for all employees under this FLA
            service_requests = ServiceRequest.objects.filter(
                employee_id__in=fla_related_emp_ids
            )
            
            # Add pagination
            page = int(request.GET.get('page', 1))
            size = int(request.GET.get('size', 100))
            total_records = service_requests.count()
            start = (page - 1) * size
            end = start + size
            service_requests = service_requests[start:end]
            
            serializer = ServiceRequestSerializer(service_requests, many=True)
            
            return Response({
                "totalRecords": total_records,
                "page": page,
                "size": size,
                "data": serializer.data
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            print("Error in fla service requests:", e)
            return Response(
                {"error": str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def put(self, request):
        """
        Update service request status by FLA
        """
        try:
            request_id = request.data.get('request_id')
            new_status = request.data.get('status')
            
            if not request_id or not new_status:
                return Response(
                    {"error": "request_id and status are required"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )

            service_request = ServiceRequest.objects.get(id=request_id)
            
            # Update FLA status and timestamp
            service_request.fla_status = new_status
            if new_status == 'Accepted':
                service_request.fla_approved_timestamp = timezone.now()
            
            service_request.save()

            # Send email notification
            try:
                employee = Employee.objects.get(employee_id=service_request.employee_id)
                subject = 'Service Request Status Update'
                message = f'''Dear {employee.name},

Your service request for {service_request.service_name} has been {new_status} by your FLA.

Thanks & Regards,
Cloud Team'''
                
                from_email = 'rakshanavg20@gmail.com'
                to_email = [employee.email]
                
                # Uncomment to enable email sending
                # send_mail(subject, message, from_email, to_email, fail_silently=False)
                print(f"Email notification sent for service request status update: {service_request.service_name}")
                
            except Exception as e:
                print(f"Error in sending email: {e}")

            serializer = ServiceRequestSerializer(service_request)
            return Response({
                "message": "Service request status updated successfully",
                "data": serializer.data
            }, status=status.HTTP_200_OK)

        except ServiceRequest.DoesNotExist:
            return Response(
                {"error": "Service request not found"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            print("Error in updating service request status:", e)
            return Response(
                {"error": str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
            
# class ServiceRequestPendingAdminAPIView(APIView):
#     """
#     API to list service requests where FLA has approved (fla_status='Accepted')
#     but Admin status is still pending (admin_status='Pending').
#     """
#     permission_classes = [IsAuthenticated, IsAdminUserPermission]

#     def get(self, request):
#         try:
#             # Ensure the user has admin role
#             role = request.auth.get('role', None)
#             if role != 'ADMIN':
#                 return Response(
#                     {"error": "Only admins can access this API."}, 
#                     status=status.HTTP_403_FORBIDDEN
#                 )

#             # Filter service requests where FLA has accepted but Admin has not yet approved
#             service_requests = ServiceRequest.objects.filter(
#                 fla_status="Accepted", 
#                 admin_status="Pending"
#             )

#             # Implement pagination
#             page = int(request.GET.get('page', 1))
#             size = int(request.GET.get('size', 10))  # Default 10 items per page
#             total_records = service_requests.count()
#             start = (page - 1) * size
#             end = start + size
#             service_requests = service_requests[start:end]

#             # Serialize the results
#             serializer = ServiceRequestSerializer(service_requests, many=True)

#             return Response(
#                 {
#                     "totalRecords": total_records,
#                     "page": page,
#                     "size": size,
#                     "data": serializer.data,
#                 },
#                 status=status.HTTP_200_OK
#             )
#         except Exception as e:
#             return Response(
#                 {"error": str(e)}, 
#                 status=status.HTTP_500_INTERNAL_SERVER_ERROR
#             )

#     def put(self, request):
#         """
#         Update service request status by Admin
#         """
#         try:
#             request_id = request.data.get('request_id')
#             new_status = request.data.get('status')
#             remarks = request.data.get('remarks', '')  # Optional remarks field

#             if not request_id or not new_status:
#                 return Response(
#                     {"error": "request_id and status are required"}, 
#                     status=status.HTTP_400_BAD_REQUEST
#                 )

#             # Get the service request
#             service_request = ServiceRequest.objects.get(id=request_id)

#             # Verify that FLA has approved and admin hasn't processed yet
#             # if service_request.fla_status != "Accepted" or service_request.admin_status != "Pending":
#             #     return Response(
#             #         {"error": "Invalid request state. Only FLA approved and admin pending requests can be processed."}, 
#             #         status=status.HTTP_400_BAD_REQUEST
#             #     )

#             # Update admin status and timestamp
#             service_request.admin_status = new_status
#             service_request.admin_approved_timestamp = timezone.now()
#             if remarks:
#                 service_request.admin_remarks = remarks

#             service_request.save()
#             pod_name = f"nginx-service-{request_id}"
#             if deploy_nginx_pod(pod_name, 80):
#                 print(f"Successfully deployed nginx pod: {pod_name}")
#             else:
#                 print(f"Warning: Failed to deploy nginx pod: {pod_name}")
#             # Send email notification
#             try:
#                 employee = Employee.objects.get(employee_id=service_request.employee_id)
#                 subject = 'Service Request Status Update from Admin'
#                 message = f'''Dear {employee.name},

# Your service request for {service_request.service_name} has been {new_status} by the Admin.

# {f"Remarks: {remarks}" if remarks else ""}

# Thanks & Regards,
# Cloud Team'''
                
#                 from_email = 'rakshanavg20@gmail.com'
#                 to_email = [employee.email]
                
#                 # Uncomment to enable email sending
#                 # send_mail(subject, message, from_email, to_email, fail_silently=False)
#                 print(f"Email notification sent for admin service request update: {service_request.service_name}")
                
#             except Exception as e:
#                 print(f"Error in sending email: {e}")

#             serializer = ServiceRequestSerializer(service_request)
#             return Response({
#                 "message": "Service request status updated successfully by admin",
#                 "data": serializer.data
#             }, status=status.HTTP_200_OK)

#         except ServiceRequest.DoesNotExist:
#             return Response(
#                 {"error": "Service request not found"}, 
#                 status=status.HTTP_404_NOT_FOUND
#             )
#         except Exception as e:
#             print("Error in updating service request admin status:", e)
#             return Response(
#                 {"error": str(e)}, 
#                 status=status.HTTP_500_INTERNAL_SERVER_ERROR
#             )
            

class FLAEmployeesListAPIView(APIView):
    """
    API to list all employees under a specific FLA (First Level Approver).
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            # Get the FLA's employee ID from the token
            fla_employee_id = request.auth.get('employee_id')
            
            if not fla_employee_id or request.auth.get('role') != 'FLA':
                return Response(
                    {"error": "FLA employee ID not found in token or user is not a FLA"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Get all employees under this FLA
            employees = Employee.objects.filter(fla_employee_id=fla_employee_id)

            if not employees.exists():
                return Response(
                    {"message": f"No employees found under FLA with ID {fla_employee_id}"},
                    status=status.HTTP_404_NOT_FOUND
                )

            # Serialize the data
            serializer = EmployeeSerializer(employees, many=True)

            return Response({
                "fla_employee_id": fla_employee_id,
                "total_employees": employees.count(),
                "employees": serializer.data
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {"error": f"An error occurred: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
            
            
# ------------------------------19 June 2025---------------------------


# class DeploymentDetailsAPIView(APIView):
#     """
#     API to get detailed info of a specific Kubernetes deployment.
#     """
#     permission_classes = [IsAuthenticated]

#     def get(self, request):
#         deployment_name = request.query_params.get("name")
#         namespace = request.query_params.get("namespace", "default")

#         if not deployment_name:
#             return Response({"error": "Deployment name is required."}, status=400)

#         try:
#             # Load Kube config
#             BASE_DIR = os.path.dirname(os.path.abspath(__file__))
#             config_path = os.path.join(BASE_DIR, "admin.conf")
#             config.load_kube_config(config_file=config_path)

#             apps_v1 = client.AppsV1Api()
#             v1 = client.CoreV1Api()

#             # Get Deployment
#             deployment = apps_v1.read_namespaced_deployment(name=deployment_name, namespace=namespace)

#             metadata = deployment.metadata
#             spec = deployment.spec
#             status = deployment.status

#             # Extract Conditions
#             conditions = []
#             if status.conditions:
#                 for condition in deployment.status.conditions:
#                     condition_data = {
#                         "type": condition.type,
#                         "status": condition.status,
#                         "last_transition_time": condition.last_transition_time,
#                         "last_update_time": condition.last_update_time,
#                         "reason": condition.reason,
#                         "message": condition.message
#                     }

#             # Extract rolling update strategy
#             strategy = spec.strategy.rolling_update if spec.strategy and spec.strategy.rolling_update else None

#             data = {
#                 "metadata": {
#                     "name": metadata.name,
#                     "namespace": metadata.namespace,
#                     "created": metadata.creation_timestamp.strftime("%Y-%m-%d %H:%M:%S"),
#                     "uid": metadata.uid,
#                     "labels": metadata.labels or {},
#                     "annotations": metadata.annotations or {}
#                 },
#                 "resource_info": {
#                     "strategy": spec.strategy.type if spec.strategy else None,
#                     "min_ready_seconds": spec.min_ready_seconds,
#                     "revision_history_limit": spec.revision_history_limit,
#                     "selector": spec.selector.match_labels if spec.selector else {},
#                     "rolling_update_strategy": {
#                         "max_surge": strategy.max_surge if strategy else None,
#                         "max_unavailable": strategy.max_unavailable if strategy else None
#                     }
#                 },
#                 "pods_status": {
#                     "updated": status.updated_replicas or 0,
#                     "total": status.replicas or 0,
#                     "available": status.available_replicas or 0,
#                 },
#                 "conditions": conditions
#             }

#             return Response(data, status=200)

#         except ApiException as e:
#             return Response({"error": f"Kubernetes API error: {e.reason}"}, status=e.status)
#         except Exception as e:
#             return Response({"error": f"Unexpected error: {str(e)}"}, status=500)






class DeploymentDetailAPIView(APIView):
    """
    Get detailed information about a Kubernetes Deployment using its name.
    Usage: ?name=<deployment_name>&namespace=<namespace>
    """

    def get(self, request):
        deployment_name = request.query_params.get('name')
        namespace = request.query_params.get('namespace', 'default')

        if not deployment_name:
            return Response({"error": "Deployment name is required."}, status=400)

        try:
            # Load kubeconfig
            BASE_DIR = os.path.dirname(os.path.abspath(__file__))
            config_path = os.path.join(BASE_DIR, "admin.conf")
            config.load_kube_config(config_file=config_path)

            apps_v1 = client.AppsV1Api()
            autoscaling_v1 = client.AutoscalingV1Api()
            core_v1 = client.CoreV1Api()

            # Fetch deployment
            deployment = apps_v1.read_namespaced_deployment(name=deployment_name, namespace=namespace)

            # Metadata
            metadata = deployment.metadata
            deployment_info = {
                "name": metadata.name,
                "namespace": metadata.namespace,
                "created": metadata.creation_timestamp.strftime("%b %d, %Y"),
                "age": f"{(datetime.utcnow() - metadata.creation_timestamp.replace(tzinfo=None)).days} days ago",
                "uid": metadata.uid,
                "labels": metadata.labels,
                "annotations": metadata.annotations,
            }

            # Pod Status
            status_info = deployment.status
            deployment_info["pod_status"] = {
                "updated": status_info.updated_replicas or 0,
                "total": status_info.replicas or 0,
                "available": status_info.available_replicas or 0,
            }

            # Conditions
            conditions = []
            if status_info.conditions:
                for cond in status_info.conditions:
                    conditions.append({
                        "type": cond.type,
                        "status": cond.status,
                        "last_transition_time": cond.last_transition_time,
                        "reason": cond.reason,
                        "message": cond.message
                    })
            deployment_info["conditions"] = conditions

            # ReplicaSets
            replica_sets = apps_v1.list_namespaced_replica_set(namespace=namespace)

            new_rs = None
            for rs in replica_sets.items:
                if rs.metadata.owner_references:
                    for owner in rs.metadata.owner_references:
                        if owner.kind == "Deployment" and owner.name == deployment_name:
                            new_rs = rs
                            break

            if new_rs:
                deployment_info["new_replica_set"] = {
                    "name": new_rs.metadata.name,
                    "namespace": new_rs.metadata.namespace,
                    "age": f"{(datetime.utcnow() - new_rs.metadata.creation_timestamp.replace(tzinfo=None)).days} days ago",
                    "pods": f"{new_rs.status.replicas or 0} / {new_rs.spec.replicas or 0}",
                    "labels": new_rs.metadata.labels,
                    "images": [c.image for c in new_rs.spec.template.spec.containers]
                }

            # Old Replica Sets
            old_rs_list = []
            for rs in replica_sets.items:
                if rs.metadata.owner_references:
                    for owner in rs.metadata.owner_references:
                        if owner.name == deployment.metadata.name and rs.metadata.name != new_rs.metadata.name:
                            old_rs_list.append(rs.metadata.name)
            if not old_rs_list:
                old_rs_list = ["No resources found."]
            deployment_info["old_replica_sets"] = old_rs_list

            # Horizontal Pod Autoscalers
            hpas = autoscaling_v1.list_namespaced_horizontal_pod_autoscaler(namespace=namespace)
            related_hpas = [h.metadata.name for h in hpas.items if h.spec.scale_target_ref.name == deployment_name]
            if not related_hpas:
                related_hpas = ["No resources found."]
            deployment_info["horizontal_pod_autoscalers"] = related_hpas

            # Events (Optional)
            events = core_v1.list_namespaced_event(namespace=namespace)
            related_events = [e.message for e in events.items if e.involved_object.name == deployment_name]
            if not related_events:
                related_events = ["No resources found."]
            deployment_info["events"] = related_events

            # Resource Info
            spec = deployment.spec
            selector_str = ", ".join(f"{k}: {v}" for k, v in spec.selector.match_labels.items())

            deployment_info["resource_info"] = {
                "strategy": spec.strategy.type if spec.strategy else "RollingUpdate",
                "min_ready_seconds": spec.min_ready_seconds or 0,
                "revision_history_limit": spec.revision_history_limit or 10,
                "selector": selector_str
            }

            # Rolling Update Strategy
            rolling = spec.strategy.rolling_update if spec.strategy and spec.strategy.rolling_update else None
            deployment_info["rolling_update_strategy"] = {
                "max_surge": str(rolling.max_surge) if rolling and rolling.max_surge else "25%",
                "max_unavailable": str(rolling.max_unavailable) if rolling and rolling.max_unavailable else "25%"
            }

            return Response(deployment_info, status=status.HTTP_200_OK)

        except client.exceptions.ApiException as e:
            return Response({"error": f"Kubernetes API error: {e.reason}"}, status=e.status)
        except Exception as e:
            return Response({"error": f"Unexpected error: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# --------------------------------20 June 2025------------------------------

# class PodDetailAPIView(APIView):
#     """
#     Get detailed information about a Kubernetes Pod.
#     Usage: ?name=<pod_name>&namespace=<namespace>
#     """

#     def get(self, request):
#         pod_name = request.query_params.get("name")
#         namespace = request.query_params.get("namespace", "default")

#         if not pod_name:
#             return Response({"error": "Pod name is required."}, status=400)

#         try:
#             BASE_DIR = os.path.dirname(os.path.abspath(__file__))
#             config_path = os.path.join(BASE_DIR, "admin.conf")
#             config.load_kube_config(config_file=config_path)

#             v1 = client.CoreV1Api()
#             pod = v1.read_namespaced_pod(name=pod_name, namespace=namespace)

#             metadata = pod.metadata
#             status_info = pod.status
#             spec = pod.spec

#             pod_info = {
#                 "name": metadata.name,
#                 "namespace": metadata.namespace,
#                 "created": metadata.creation_timestamp.strftime("%b %d, %Y"),
#                 "age": f"{(datetime.utcnow() - metadata.creation_timestamp.replace(tzinfo=None)).days} days ago",
#                 "uid": metadata.uid,
#                 "labels": metadata.labels,
#                 "annotations": metadata.annotations,
#                 "node": spec.node_name,
#                 "status": status_info.phase,
#                 "ip": status_info.pod_ip,
#                 "qos_class": status_info.qos_class,
#                 "restarts": sum([cs.restart_count for cs in status_info.container_statuses or []]),
#                 "service_account": spec.service_account_name,
#             }

#             # Conditions
#             conditions = []
#             if status_info.conditions:
#                 for cond in status_info.conditions:
#                     conditions.append({
#                         "type": cond.type,
#                         "status": cond.status,
#                         "last_probe_time": getattr(cond, "last_probe_time", None),
#                         "last_transition_time": cond.last_transition_time,
#                         "reason": getattr(cond, "reason", None),
#                         "message": getattr(cond, "message", None),
#                     })
#             pod_info["conditions"] = conditions

#             # Persistent Volume Claims (simplified)
#             pod_info["persistent_volume_claims"] = [vol.persistent_volume_claim.claim_name for vol in spec.volumes if vol.persistent_volume_claim] if spec.volumes else []
#             if not pod_info["persistent_volume_claims"]:
#                 pod_info["persistent_volume_claims"] = ["No resources found."]

#             # Events (optional)
#             events = v1.list_namespaced_event(namespace=namespace)
#             related_events = [e.message for e in events.items if e.involved_object.name == pod_name]
#             pod_info["events"] = related_events if related_events else ["No resources found."]

#             # Containers
#             containers = []
#             for c, cs in zip(spec.containers, status_info.container_statuses or []):
#                 container = {
#                     "name": c.name,
#                     "image": c.image,
#                     "status": {
#                         "ready": cs.ready,
#                         "started": cs.started,
#                         "started_at": cs.state.running.started_at if cs.state.running else None
#                     },
#                     "mounts": []
#                 }
#                 for m in c.volume_mounts:
#                     container["mounts"].append({
#                         "name": m.name,
#                         "read_only": m.read_only,
#                         "mount_path": m.mount_path,
#                         "sub_path": m.sub_path
#                     })
#                 containers.append(container)
#             pod_info["containers"] = containers

#             return Response(pod_info, status=status.HTTP_200_OK)

#         except client.exceptions.ApiException as e:
#             return Response({"error": f"Kubernetes API error: {e.reason}"}, status=e.status)
#         except Exception as e:
#             return Response({"error": f"Unexpected error: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)





def humanize_age(dt):
    delta = datetime.utcnow() - dt.replace(tzinfo=None)
    days = delta.days
    if days == 0:
        return "Today"
    elif days == 1:
        return "1 day ago"
    else:
        return f"{days} days ago"
    
    
    
    
class ListPodsAPIView(APIView):
    """
    API View to list all pods with their details including CPU and memory usage.
    """

    def get(self, request):
        try:
            v1 = get_k8s_client()
            metrics_client = client.CustomObjectsApi()
            pods = v1.list_pod_for_all_namespaces().items

            pod_list = []
            for pod in pods:
                name = pod.metadata.name
                namespace = pod.metadata.namespace
                labels = pod.metadata.labels
                node_name = pod.spec.node_name
                status_phase = pod.status.phase
                restarts = sum([cs.restart_count for cs in pod.status.container_statuses or []])
                creation_time = pod.metadata.creation_timestamp

                # Try to fetch metrics (may fail if Metrics Server not installed)
                try:
                    metrics = metrics_client.get_namespaced_custom_object(
                        group="metrics.k8s.io",
                        version="v1beta1",
                        namespace=namespace,
                        plural="pods",
                        name=name
                    )
                    containers = metrics.get("containers", [])
                    total_cpu = sum([float(c["usage"]["cpu"].rstrip("n")) / 1e9 for c in containers])
                    total_mem = sum([
                        int(c["usage"]["memory"].rstrip("Ki")) * 1024
                        for c in containers if "memory" in c["usage"]
                    ])
                except Exception:
                    total_cpu = None
                    total_mem = None

                images = [c.image for c in pod.spec.containers]

                pod_list.append({
                    "name": name,
                    "namespace": namespace,
                    "images": images,
                    "labels": labels,
                    "node": node_name,
                    "status": status_phase,
                    "restarts": restarts,
                    "cpu_usage": round(total_cpu, 4) if total_cpu is not None else "N/A",
                    "memory_usage": total_mem if total_mem is not None else "N/A",
                    "created_at": creation_time.strftime("%b %d, %Y %H:%M:%S"),
                    "created_ago": humanize_age(creation_time)
                 })
                # print("pod list---->",pod_list)
            return Response({"pods": pod_list}, status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {"error": f"Unexpected error: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
# ------------------------------23 June 2025 ----------------------------------


logger = logging.getLogger(__name__)

class ListNamespacesAPIView(APIView):
    def get(self, request):
        try:
            # Use the shared get_k8s_client function
            v1 = get_k8s_client()
            namespaces = v1.list_namespace()
            namespace_names = [ns.metadata.name for ns in namespaces.items]

            logger.debug(f"Namespaces retrieved: {namespace_names}")

            return Response({
                "status": "success",
                "namespaces": namespace_names
            }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.exception("Error retrieving namespaces")
            return Response({
                "status": "error",
                "message": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)



class ListStatefulSetsAPIView(APIView):
    """
    API to list all StatefulSets in the cluster (or specific namespace).
    Query param:
      - ?namespace=<name> (default: all namespaces)
    """

    def get(self, request):
        try:
            # Load kubeconfig
            BASE_DIR = os.path.dirname(os.path.abspath(__file__))
            config_path = os.path.join(BASE_DIR, "admin.conf")
            config.load_kube_config(config_file=config_path)

            namespace = request.query_params.get("namespace")

            apps_v1 = client.AppsV1Api()

            if namespace and namespace.lower() != "all":
                sts_list = apps_v1.list_namespaced_stateful_set(namespace=namespace).items
            else:
                sts_list = apps_v1.list_stateful_set_for_all_namespaces().items

            response = []

            for sts in sts_list:
                name = sts.metadata.name
                ns = sts.metadata.namespace
                labels = sts.metadata.labels
                created = humanize_age(sts.metadata.creation_timestamp)
                replicas = sts.status.replicas or 0
                ready = sts.status.ready_replicas or 0
                images = [c.image for c in sts.spec.template.spec.containers]

                response.append({
                    "name": name,
                    "namespace": ns,
                    "images": images,
                    "labels": labels,
                    "pods": f"{ready}/{replicas}",
                    "created": created
                })

            return Response({"stateful_sets": response}, status=status.HTTP_200_OK)

        except client.exceptions.ApiException as e:
            return Response({"error": f"Kubernetes API error: {e.reason}"}, status=e.status)
        except Exception as e:
            return Response({"error": f"Unexpected error: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def get_k8s_client1():
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    config_path = os.path.join(BASE_DIR, "admin.conf")
    config.load_kube_config(config_file=config_path)

    core_v1 = client.CoreV1Api()
    apps_v1 = client.AppsV1Api()
    metrics_client = client.CustomObjectsApi()
    
    return core_v1, apps_v1, metrics_client


class StatefulSetDetailAPIView(APIView):
    def get(self, request):
        name = request.query_params.get('name')
        namespace = request.query_params.get('namespace', 'default')

        if not name:
            return Response({"error": "StatefulSet name is required."}, status=400)

        try:
            core_v1, apps_v1, metrics_client = get_k8s_client1()
            sts = apps_v1.read_namespaced_stateful_set(name=name, namespace=namespace)

            metadata = sts.metadata
            spec = sts.spec
            status_data = sts.status

            # Pods status
            running = status_data.ready_replicas or 0
            desired = spec.replicas or 0

            # Collect pod details
            pods = core_v1.list_namespaced_pod(namespace=namespace, label_selector=",".join([f"{k}={v}" for k, v in spec.selector.match_labels.items()]))
            pod_info = []
            for pod in pods.items:
                pod_metrics = None
                try:
                    pod_metrics = metrics_client.get_namespaced_custom_object(
                        group="metrics.k8s.io",
                        version="v1beta1",
                        namespace=namespace,
                        plural="pods",
                        name=pod.metadata.name
                    )
                except Exception:
                    pass

                total_cpu = sum([
                    float(c["usage"]["cpu"].rstrip("n")) / 1e9 for c in pod_metrics.get("containers", [])
                ]) if pod_metrics else 0

                total_mem = sum([
                    int(c["usage"]["memory"].rstrip("Ki")) * 1024 for c in pod_metrics.get("containers", [])
                    if "memory" in c["usage"]
                ]) if pod_metrics else 0

                pod_info.append({
                    "name": pod.metadata.name,
                    "namespace": pod.metadata.namespace,
                    "images": [c.image for c in pod.spec.containers],
                    "labels": pod.metadata.labels,
                    "node": pod.spec.node_name,
                    "status": pod.status.phase,
                    "restarts": sum([cs.restart_count for cs in pod.status.container_statuses or []]),
                    "cpu_usage": round(total_cpu * 1000, 2),  # in millicores
                    "memory_usage": total_mem,
                    "created": humanize_age(pod.metadata.creation_timestamp)
                })

            # Events
            events = core_v1.list_namespaced_event(namespace=namespace)
            related_events = [e.message for e in events.items if e.involved_object.name == name]
            if not related_events:
                related_events = ["No resources found."]

            data = {
                "metadata": {
                    "name": metadata.name,
                    "namespace": metadata.namespace,
                    "created": metadata.creation_timestamp.strftime("%b %d, %Y"),
                    "age": humanize_age(metadata.creation_timestamp),
                    "uid": metadata.uid,
                    "annotations": metadata.annotations
                },
                "resource_info": {
                    "images": [c.image for c in spec.template.spec.containers]
                },
                "pods_status": {
                    "running": running,
                    "desired": desired
                },
                "pods": pod_info,
                "events": related_events
            }

            return Response(data, status=status.HTTP_200_OK)

        except client.exceptions.ApiException as e:
            return Response({"error": f"Kubernetes API error: {e.reason}"}, status=e.status)
        except Exception as e:
            return Response({"error": f"Unexpected error: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ReplicaSetDetailAPIView(APIView):
    def get(self, request):
        name = request.query_params.get('name')
        namespace = request.query_params.get('namespace', 'default')

        if not name:
            return Response({"error": "ReplicaSet name is required."}, status=400)

        try:
            core_v1, apps_v1, metrics_client = get_k8s_client1()
            rs = apps_v1.read_namespaced_replica_set(name=name, namespace=namespace)

            # Metadata
            metadata = rs.metadata
            info = {
                "name": metadata.name,
                "namespace": metadata.namespace,
                "created": metadata.creation_timestamp.strftime("%b %d, %Y"),
                "age": humanize_age(metadata.creation_timestamp),
                "uid": metadata.uid,
                "labels": metadata.labels,
                "annotations": metadata.annotations
            }

            # Selector and Images
            info["resource_info"] = {
                "selector": ", ".join(f"{k}: {v}" for k, v in rs.spec.selector.match_labels.items()),
                "images": [c.image for c in rs.spec.template.spec.containers],
                "init_images": [c.image for c in rs.spec.template.spec.init_containers or []]
            }

            # Pod Status
            info["pod_status"] = {
                "running": rs.status.ready_replicas or 0,
                "desired": rs.spec.replicas or 0
            }

            # Pods
            pods = core_v1.list_namespaced_pod(namespace=namespace, label_selector=','.join(f"{k}={v}" for k,v in rs.spec.selector.match_labels.items())).items
            pod_list = []
            for pod in pods:
                images = [c.image for c in pod.spec.containers]
                restarts = sum([cs.restart_count for cs in pod.status.container_statuses or []])
                try:
                    metrics = metrics_client.get_namespaced_custom_object(
                        group="metrics.k8s.io",
                        version="v1beta1",
                        namespace=namespace,
                        plural="pods",
                        name=pod.metadata.name
                    )
                    containers = metrics.get("containers", [])
                    total_cpu = sum(float(c["usage"]["cpu"].rstrip("n")) / 1e9 for c in containers)
                    total_mem = sum(int(c["usage"]["memory"].rstrip("Ki")) * 1024 for c in containers)
                except Exception:
                    total_cpu = None
                    total_mem = None

                pod_list.append({
                    "name": pod.metadata.name,
                    "namespace": pod.metadata.namespace,
                    "images": images,
                    "labels": pod.metadata.labels,
                    "node": pod.spec.node_name,
                    "status": pod.status.phase,
                    "restarts": restarts,
                    "created": humanize_age(pod.metadata.creation_timestamp),
                    "cpu_usage_cores": round(total_cpu, 4) if total_cpu is not None else "N/A",
                    "memory_usage_bytes": total_mem if total_mem is not None else "N/A"
                })
            info["pods"] = pod_list

            # Services (Optional)
            services = core_v1.list_namespaced_service(namespace=namespace).items
            related_services = []
            for svc in services:
                selector = svc.spec.selector or {}
                if all(rs.spec.selector.match_labels.get(k) == v for k, v in selector.items()):
                    related_services.append({
                        "name": svc.metadata.name,
                        "namespace": svc.metadata.namespace,
                        "labels": svc.metadata.labels,
                        "type": svc.spec.type,
                        "cluster_ip": svc.spec.cluster_ip,
                        "internal_endpoints": [f"{port.name or name}:{port.port} {port.protocol}" for port in svc.spec.ports],
                        "external_endpoints": [f"{svc.metadata.name}:{port.node_port} {port.protocol}" for port in svc.spec.ports if port.node_port],
                        "created": humanize_age(svc.metadata.creation_timestamp)
                    })
            info["services"] = related_services or ["No services found"]

            # Events (Optional)
            events = core_v1.list_namespaced_event(namespace=namespace).items
            related_events = []
            for e in events:
                if e.involved_object.name == name:
                    related_events.append({
                        "name": e.metadata.name,
                        "reason": e.reason,
                        "message": e.message,
                        "source": e.source.component,
                        "count": e.count,
                        "first_seen": humanize_age(e.first_timestamp),
                        "last_seen": humanize_age(e.last_timestamp)
                    })
            info["events"] = related_events or ["No events found"]

            return Response(info, status=status.HTTP_200_OK)

        except client.exceptions.ApiException as e:
            return Response({"error": f"Kubernetes API error: {e.reason}"}, status=e.status)
        except Exception as e:
            return Response({"error": f"Unexpected error: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# -----------------------------------------24 June 2025------------------------------

# class PodDetailAPIView(APIView):
#     def get(self, request):
#         name = request.query_params.get('name')
#         namespace = request.query_params.get('namespace', 'default')

#         if not name:
#             return Response({"error": "Pod name is required."}, status=status.HTTP_400_BAD_REQUEST)

#         try:
#             core_v1 = get_k8s_client()
#             pod = core_v1.read_namespaced_pod(name=name, namespace=namespace)

#             metadata = pod.metadata
#             spec = pod.spec
#             pod_status = pod.status

#             info = {
#                 "name": metadata.name,
#                 "namespace": metadata.namespace,
#                 "created": metadata.creation_timestamp.strftime("%b %d, %Y"),
#                 "age": humanize_age(metadata.creation_timestamp),
#                 "uid": metadata.uid,
#                 "annotations": metadata.annotations,
#                 "node": spec.node_name,
#                 "status": pod_status.phase,
#                 "ip": pod_status.pod_ip,
#                 "qos_class": pod_status.qos_class,
#                 "restarts": sum([cs.restart_count for cs in pod_status.container_statuses or []]),
#                 "service_account": spec.service_account_name,
#             }

#             # Conditions
#             conditions = []
#             for cond in pod_status.conditions or []:
#                 conditions.append({
#                     "type": cond.type,
#                     "status": cond.status,
#                     "last_transition_time": cond.last_transition_time,
#                     "reason": getattr(cond, 'reason', '-'),
#                     "message": getattr(cond, 'message', '-')
#                 })
#             info["conditions"] = conditions or ["No conditions found"]

#             # Containers
#             containers_info = []
#             for c in spec.containers:
#                 container_status = next((cs for cs in pod_status.container_statuses or [] if cs.name == c.name), None)
#                 mounts = []
#                 for m in c.volume_mounts:
#                     mounts.append({
#                         "name": m.name,
#                         "read_only": m.read_only,
#                         "mount_path": m.mount_path,
#                         "sub_path": m.sub_path or "-"
#                     })

#                 containers_info.append({
#                     "name": c.name,
#                     "image": c.image,
#                     "status": container_status.state.terminated.reason if container_status and container_status.state.terminated else "Running" if container_status and container_status.ready else "Pending",
#                     "ready": container_status.ready if container_status else False,
#                     "started": container_status.started if container_status else False,
#                     "reason": container_status.state.terminated.reason if container_status and container_status.state.terminated else None,
#                     "commands": c.command,
#                     "mounts": mounts
#                 })
#             info["containers"] = containers_info

#             # Events (Optional)
#             events = core_v1.list_namespaced_event(namespace=namespace).items
#             related_events = []
#             for e in events:
#                 if e.involved_object.name == name:
#                     related_events.append({
#                         "name": e.metadata.name,
#                         "reason": e.reason,
#                         "message": e.message,
#                         "source": e.source.component,
#                         "count": e.count,
#                         "first_seen": humanize_age(e.first_timestamp),
#                         "last_seen": humanize_age(e.last_timestamp)
#                     })
#             info["events"] = related_events or ["No events found"]

#             return Response(info, status=status.HTTP_200_OK)

#         except client.exceptions.ApiException as e:
#             return Response({"error": f"Kubernetes API error: {e.reason}"}, status=e.status)
#         except Exception as e:
#             return Response({"error": f"Unexpected error: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)



def get_k8s_client2():
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    config_path = os.path.join(BASE_DIR, "admin.conf")
    config.load_kube_config(config_file=config_path)
    return client.CoreV1Api(), client.AppsV1Api()  # ✅ this line must return both

class PodDetailAPIView(APIView):
    def get(self, request):
        name = request.query_params.get('name')
        namespace = request.query_params.get('namespace', 'default')

        if not name:
            return Response({"error": "Pod name is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            core_v1, apps_v1 = get_k8s_client2()
            pod = core_v1.read_namespaced_pod(name=name, namespace=namespace)
            metadata = pod.metadata
            spec = pod.spec
            status_obj = pod.status

            # Controller info
            owner_refs = metadata.owner_references or []
            controlled_by = {}
            if owner_refs:
                ref = owner_refs[0]
                controlled_by = {
                    "name": ref.name,
                    "kind": ref.kind
                }

            # PVCs
            pvcs = core_v1.list_namespaced_persistent_volume_claim(namespace=namespace).items
            pod_volumes = {vol.name: vol.persistent_volume_claim.claim_name for vol in spec.volumes if vol.persistent_volume_claim}
            pvc_info = []
            for pvc in pvcs:
                if pvc.metadata.name in pod_volumes.values():
                    pvc_info.append({
                        "name": pvc.metadata.name,
                        "labels": pvc.metadata.labels,
                        "status": pvc.status.phase,
                        "volume": pvc.spec.volume_name,
                        "capacity": pvc.status.capacity.get("storage", "-"),
                        "access_modes": pvc.spec.access_modes,
                        "storage_class": pvc.metadata.annotations.get("volume.beta.kubernetes.io/storage-class", "-"),
                        "created": humanize_age(pvc.metadata.creation_timestamp)
                    })

            # Init containers
            init_containers = []
            for c in spec.init_containers or []:
                env_vars = {}
                for e in c.env or []:
                    env_vars[e.name] = e.value if e.value else os.environ.get(e.value_from.secret_key_ref.name, "") if e.value_from and e.value_from.secret_key_ref else ""
                init_containers.append({
                    "name": c.name,
                    "image": c.image,
                    "env": env_vars,
                    "commands": c.command,
                    "args": c.args,
                    "mounts": [{
                        "name": m.name,
                        "read_only": m.read_only,
                        "mount_path": m.mount_path,
                        "sub_path": m.sub_path or "-",
                        "source_type": "PersistentVolumeClaim" if "persistent" in m.name else "Projected",
                        "source_name": pod_volumes.get(m.name, "-")
                    } for m in c.volume_mounts]
                })

            # Containers
            containers_info = []
            for c in spec.containers:
                container_status = next((cs for cs in status_obj.container_statuses or [] if cs.name == c.name), None)
                env_vars = {}
                for e in c.env or []:
                    env_vars[e.name] = e.value if e.value else os.environ.get(e.value_from.secret_key_ref.name, "") if e.value_from and e.value_from.secret_key_ref else ""
                containers_info.append({
                    "name": c.name,
                    "image": c.image,
                    "status": "Ready" if container_status and container_status.ready else "Not Ready",
                    "ready": container_status.ready if container_status else False,
                    "started": container_status.started if container_status else False,
                    "started_at": container_status.state.running.started_at.isoformat() if container_status and container_status.state and container_status.state.running else None,
                    "env": env_vars,
                    "mounts": [{
                        "name": m.name,
                        "read_only": m.read_only,
                        "mount_path": m.mount_path,
                        "sub_path": m.sub_path or "-",
                        "source_type": "PersistentVolumeClaim" if "persistent" in m.name else "Projected",
                        "source_name": pod_volumes.get(m.name, "-")
                    } for m in c.volume_mounts]
                })

            # Conditions
            conditions = []
            for cond in status_obj.conditions or []:
                conditions.append({
                    "type": cond.type,
                    "status": cond.status,
                    "last_probe_time": getattr(cond, 'last_probe_time', '-') or '-',
                    "last_transition_time": humanize_age(cond.last_transition_time) if cond.last_transition_time else '-',
                    "reason": getattr(cond, 'reason', '-') or '-',
                    "message": getattr(cond, 'message', '-') or '-'
                })

            data = {
                "name": metadata.name,
                "namespace": metadata.namespace,
                "created": metadata.creation_timestamp.strftime("%b %d, %Y"),
                "age": humanize_age(metadata.creation_timestamp),
                "uid": metadata.uid,
                "labels": metadata.labels,
                "annotations": metadata.annotations,
                "node": spec.node_name,
                "status": status_obj.phase,
                "ip": status_obj.pod_ip,
                "qos_class": status_obj.qos_class,
                "restarts": sum([cs.restart_count for cs in status_obj.container_statuses or []]),
                "service_account": spec.service_account_name,
                "controlled_by": controlled_by,
                "containers": containers_info,
                "init_containers": init_containers,
                "persistent_volume_claims": pvc_info,
                "conditions": conditions,
                "events": []
            }

            return Response(data, status=status.HTTP_200_OK)

        except client.exceptions.ApiException as e:
            return Response({"error": f"Kubernetes API error: {e.reason}"}, status=e.status)
        except Exception as e:
            return Response({"error": f"Unexpected error: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PodLogsAPIView(APIView):
    def get(self, request, namespace, pod_name):
        try:
            v1 = get_k8s_client()
            log_response = v1.read_namespaced_pod_log(
                name=pod_name,
                namespace=namespace,
                tail_lines=100,  # You can make this a query param if needed
                follow=False
            )
            return Response({"logs": log_response}, status=status.HTTP_200_OK)
        except ApiException as e:
            return Response({"error": f"Kubernetes API error: {e}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)



# -------------------------------------30 June 2025------------------------------------------

class PersistentVolumeListAPIView(APIView):
    def get(self, request):
        try:
            core_v1 = get_k8s_client()
            pv_list = core_v1.list_persistent_volume().items
            
            result = []
            for pv in pv_list:
                claim_ref = pv.spec.claim_ref
                claim_name = f"{claim_ref.namespace}/{claim_ref.name}" if claim_ref else "-"

                result.append({
                    "name": pv.metadata.name,
                    "capacity": pv.spec.capacity.get("storage", "-"),
                    "access_modes": pv.spec.access_modes,
                    "reclaim_policy": pv.spec.persistent_volume_reclaim_policy,
                    "status": pv.status.phase,
                    "claim": claim_name,
                    "storage_class": pv.spec.storage_class_name or "-",
                    "reason": pv.status.message or "-",
                    "created": humanize_age(pv.metadata.creation_timestamp)
                })

            return Response(result, status=status.HTTP_200_OK)

        except client.exceptions.ApiException as e:
            return Response({"error": f"Kubernetes API error: {e.reason}"}, status=e.status)
        except Exception as e:
            return Response({"error": f"Unexpected error: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class PersistentVolumeDetailAPIView(APIView):
    def get(self, request):
        name = request.query_params.get('name')
        if not name:
            return Response({"error": "Volume name is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            core_v1 = get_k8s_client()
            volume = core_v1.read_persistent_volume(name=name)

            csi = volume.spec.csi or {}
            attributes = csi.volume_attributes or {}

            data = {
                "name": volume.metadata.name,
                "created": volume.metadata.creation_timestamp.strftime("%b %d, %Y"),
                "age": humanize_age(volume.metadata.creation_timestamp),
                "uid": volume.metadata.uid,
                "annotations": volume.metadata.annotations or {},
                "status": volume.status.phase,
                "claim": f"{volume.spec.claim_ref.namespace}/{volume.spec.claim_ref.name}" if volume.spec.claim_ref else "-",
                "reclaim_policy": volume.spec.persistent_volume_reclaim_policy,
                "storage_class": volume.spec.storage_class_name,
                "access_modes": volume.spec.access_modes or [],
                "source": {
                    "type": "CSI" if volume.spec.csi else "-",
                    "driver": csi.driver if csi else "-",
                    "volume_handle": csi.volume_handle if csi else "-",
                    "attributes": attributes
                },
                "capacity": volume.spec.capacity.get("storage", "-") if volume.spec.capacity else "-"
            }

            return Response(data, status=status.HTTP_200_OK)

        except client.exceptions.ApiException as e:
            return Response({"error": f"Kubernetes API error: {e.reason}"}, status=e.status)
        except Exception as e:
            return Response({"error": f"Unexpected error: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

def get_k8s_client3():
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    config_path = os.path.join(BASE_DIR, "admin.conf")
    config.load_kube_config(config_file=config_path)
    return client.AppsV1Api(), client.CoreV1Api()

class DeployMongoDBAPIView(APIView):
    def post(self, request):
        data = request.data
        required_fields = ["replica", "app_name", "root_password", "username", "password", "database", "node_port"]

        for field in required_fields:
            if field not in data:
                return Response({"error": f"'{field}' is required."}, status=status.HTTP_400_BAD_REQUEST)

        app_name = data["app_name"]
        namespace = "default"
        labels = {"app": app_name}

        try:
            apps_v1, core_v1 = get_k8s_client3()

            # Deployment
            container = client.V1Container(
                name=app_name,
                image="mongo:latest",
                ports=[client.V1ContainerPort(container_port=27017)],
                env=[
                    client.V1EnvVar(name="MONGO_INITDB_ROOT_USERNAME", value=data["username"]),
                    client.V1EnvVar(name="MONGO_INITDB_ROOT_PASSWORD", value=data["root_password"]),
                    client.V1EnvVar(name="MONGO_INITDB_DATABASE", value=data["database"]),
                ]
            )

            template = client.V1PodTemplateSpec(
                metadata=client.V1ObjectMeta(labels=labels),
                spec=client.V1PodSpec(containers=[container])
            )

            spec = client.V1DeploymentSpec(
                replicas=int(data["replica"]),
                selector=client.V1LabelSelector(match_labels=labels),
                template=template
            )

            deployment = client.V1Deployment(
                api_version="apps/v1",
                kind="Deployment",
                metadata=client.V1ObjectMeta(name=app_name),
                spec=spec
            )

            apps_v1.create_namespaced_deployment(namespace=namespace, body=deployment)

            # Service
            service = client.V1Service(
                metadata=client.V1ObjectMeta(name=app_name),
                spec=client.V1ServiceSpec(
                    type="NodePort",
                    selector=labels,
                    ports=[
                        client.V1ServicePort(
                            port=27017,
                            target_port=27017,
                            node_port=int(data["node_port"])
                        )
                    ]
                )
            )

            core_v1.create_namespaced_service(namespace=namespace, body=service)

            return Response({"message": f"MongoDB '{app_name}' deployed successfully."}, status=status.HTTP_201_CREATED)

        except client.exceptions.ApiException as e:
            return Response({"error": f"Kubernetes API error: {e.reason}", "details": e.body}, status=e.status)
        except Exception as e:
            return Response({"error": f"Unexpected error: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)



class TicketListAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Admin sees all tickets
        if getattr(request.user, 'is_staff', False) or getattr(request.user, 'is_superuser', False):
            tickets = Ticket.objects.all()
        else:
            # Extract employee_id from token (request.auth)
            employee_id = None
            if hasattr(request, 'auth') and request.auth:
                # For JWT, request.auth is a dict-like object
                employee_id = request.auth.get('employee_id')
            # Fallback: try to get from user model if available
            if not employee_id and hasattr(request.user, 'employee_id'):
                employee_id = request.user.employee_id

            if not employee_id:
                return Response({"error": "No employee_id found in token."}, status=400)

            employee = Employee.objects.filter(employee_id=employee_id).first()
            if not employee:
                return Response({"error": "No employee record found for this user."}, status=404)
            tickets = Ticket.objects.filter(employee=employee)
        serializer = TicketSerializer(tickets, many=True)
        return Response(serializer.data)
    
class TicketUpdateAPIView(APIView):
    permission_classes = [IsAdminUserPermission]

    def patch(self, request, pk):
        try:
            ticket = Ticket.objects.get(pk=pk)
        except Ticket.DoesNotExist:
            return Response({"error": "Ticket not found"}, status=status.HTTP_404_NOT_FOUND)

        # Check if ticket is already closed
        if ticket.status == 'Closed':
            return Response({"message": "Ticket is already closed."}, status=status.HTTP_400_BAD_REQUEST)

        serializer = TicketSerializer(ticket, data=request.data, partial=True)
        if serializer.is_valid():
            updated_ticket = serializer.save()
            # If status is closed, notify employee
            if updated_ticket.status == 'Closed':
                updated_ticket.closed_at = timezone.now()
                updated_ticket.save()
                send_mail(
                    subject=f"Your Ticket #{updated_ticket.id} is Closed",
                    message=f"Solution: {updated_ticket.solution}\n\nThank you for reaching out.",
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[updated_ticket.employee.email],
                    fail_silently=True,
                )
            return Response(TicketSerializer(updated_ticket).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST) 
    
class TicketCreateAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        employee_id = request.data.get('employee_id')
        if not employee_id:
            return Response({"error": "employee_id is required"}, status=400)
        try:
            employee = Employee.objects.get(employee_id=employee_id)
        except Employee.DoesNotExist:
            return Response({"error": "Employee not found"}, status=404)

        serializer = TicketSerializer(data=request.data)
        if serializer.is_valid():
            ticket = serializer.save(employee=employee)
            # Send email to admin
            # admin_email = settings.ADMIN_EMAIL
            admin_email = "rakshana.cdac@gmail.com"
            send_mail(
                subject=f"New Ticket Raised: {ticket.issue}",
                message=f"Issue: {ticket.issue}\nDescription: {ticket.description}\nRaised by: {employee.name} ({employee.email}, ID: {employee.employee_id})",
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[admin_email],
                fail_silently=True,
            )
            return Response(TicketSerializer(ticket).data, status=201)
        return Response(serializer.errors, status=400)
    
    
# -------------------------------------4 july 2025----------------------------------------------------------
def get_k8s_client4():
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    config_path = os.path.join(BASE_DIR, "admin.conf")
    config.load_kube_config(config_file=config_path)
    return client.CoreV1Api(), client.AppsV1Api(), client.NetworkingV1Api()

class ServiceDetailAPIView(APIView):
    def get(self, request):
        name = request.query_params.get('name')
        namespace = request.query_params.get('namespace', 'default')

        if not name:
            return Response({"error": "Service name is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            core_v1, apps_v1, net_v1 = get_k8s_client4()
            service = core_v1.read_namespaced_service(name=name, namespace=namespace)
            endpoints = core_v1.read_namespaced_endpoints(name=name, namespace=namespace)
            pods = core_v1.list_namespaced_pod(namespace=namespace, label_selector=','.join([f"{k}={v}" for k, v in (service.spec.selector or {}).items()]))
            ingresses = net_v1.list_namespaced_ingress(namespace=namespace)

            created = service.metadata.creation_timestamp
            annotations = service.metadata.annotations or {}
            selector = service.spec.selector or {}

            ports = []
            for p in service.spec.ports:
                ports.append({
                    "name": p.name or "<unset>",
                    "port": p.port,
                    "protocol": p.protocol
                })

            endpoints_data = []
            for subset in endpoints.subsets or []:
                for address in subset.addresses or []:
                    endpoints_data.append({
                        "host": address.ip,
                        "node": address.node_name,
                        "ready": True
                    })

            pod_data = []
            for pod in pods.items:
                pod_status = pod.status.phase
                usage_cpu = "2.00m"  # Placeholder
                usage_memory = "251.49Mi"  # Placeholder

                pod_data.append({
                    "name": pod.metadata.name,
                    "images": [c.image for c in pod.spec.containers],
                    "labels": pod.metadata.labels,
                    "node": pod.spec.node_name,
                    "status": pod_status,
                    "restarts": sum(cs.restart_count for cs in (pod.status.container_statuses or [])),
                    "cpu_usage": usage_cpu,
                    "memory_usage": usage_memory,
                    "created": humanize_age(pod.metadata.creation_timestamp)
                })

            ingress_data = []
            for ing in ingresses.items:
                for rule in ing.spec.rules or []:
                    ingress_data.append({
                        "name": ing.metadata.name,
                        "labels": ing.metadata.labels,
                        "endpoints": ing.status.load_balancer.ingress[0].ip if ing.status.load_balancer.ingress else "-",
                        "hosts": rule.host,
                        "created": humanize_age(ing.metadata.creation_timestamp)
                    })

            data = {
                "name": service.metadata.name,
                "namespace": service.metadata.namespace,
                "created": created.strftime("%b %d, %Y"),
                "age": humanize_age(created),
                "uid": service.metadata.uid,
                "annotations": annotations,
                "type": service.spec.type,
                "cluster_ip": service.spec.cluster_ip,
                "session_affinity": service.spec.session_affinity,
                "selector": selector,
                "ports": ports,
                "endpoints": endpoints_data,
                "pods": pod_data,
                "ingresses": ingress_data,
                "events": []
            }

            return Response(data, status=status.HTTP_200_OK)

        except client.exceptions.ApiException as e:
            return Response({"error": f"Kubernetes API error: {e.reason}"}, status=e.status)
        except Exception as e:
            return Response({"error": f"Unexpected error: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ServiceRequestAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """
        Fetch all service request details (no pagination)
        """
        try:
            role = request.auth.get('role', None)
            employee_id = request.auth.get('employee_id', None)
            
            # Filter requests based on role
            if role == 'ADMIN':
                service_requests = ServiceRequest.objects.all()
            elif role == 'FLA':
                employee_ids = Employee.objects.filter(fla_employee_id=employee_id).values_list('employee_id', flat=True)
                service_requests = ServiceRequest.objects.filter(employee_id__in=employee_ids) | ServiceRequest.objects.filter(employee_id=employee_id)
            else:
                # For regular employees, get their own requests
                service_requests = ServiceRequest.objects.filter(employee_id=employee_id)

            serializer = ServiceRequestSerializer(service_requests, many=True)
            return Response(
                {
                    "totalRecords": service_requests.count(),
                    "data": serializer.data
                },
                status=status.HTTP_200_OK
            )
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)





# class ServiceRequestCreateAPIView(APIView):
#     permission_classes = [IsAuthenticated]

#     def post(self, request):
#         try:
#             serializer = ServiceRequestSerializer(data=request.data)
#             if serializer.is_valid():
#                 service_request = serializer.save()
                
#                 # If service is MongoDB, trigger deployment
#                 if service_request.service_name.lower() in ['mongo', 'mongodb']:
#                     # Validate MongoDB required fields
#                     required_fields = ["replica", "app_name", "root_password", "username", "password", "database", "node_port"]
#                     missing_fields = [field for field in required_fields if not getattr(service_request, field)]
                    
#                     if missing_fields:
#                         return Response({
#                             "error": f"Missing MongoDB fields: {', '.join(missing_fields)}"
#                         }, status=status.HTTP_400_BAD_REQUEST)
                    
#                     # Trigger MongoDB deployment
#                     deployment_result = self.deploy_mongodb(service_request)
                    
#                     if deployment_result.get('success'):
#                         service_request.deployment_status = 'Deployed'
#                         service_request.save()
#                         return Response({
#                             "message": "Service request created and MongoDB deployed successfully",
#                             "service_request": ServiceRequestSerializer(service_request).data,
#                             "deployment": deployment_result
#                         }, status=status.HTTP_201_CREATED)
#                     else:
#                         service_request.deployment_status = 'Failed'
#                         service_request.save()
#                         return Response({
#                             "message": "Service request created but MongoDB deployment failed",
#                             "service_request": ServiceRequestSerializer(service_request).data,
#                             "deployment_error": deployment_result.get('error')
#                         }, status=status.HTTP_201_CREATED)
                
#                 return Response({
#                     "message": "Service request created successfully",
#                     "service_request": ServiceRequestSerializer(service_request).data
#                 }, status=status.HTTP_201_CREATED)
            
#             return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
#         except Exception as e:
#             return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

#     def deploy_mongodb(self, service_request):
#         """Deploy MongoDB using the existing DeployMongoDBAPIView logic"""
#         try:
#             data = {
#                 "replica": service_request.replica,
#                 "app_name": service_request.app_name,
#                 "root_password": service_request.root_password,
#                 "username": service_request.username,
#                 "password": service_request.password,
#                 "database": service_request.database,
#                 "node_port": service_request.node_port
#             }
            
#             app_name = data["app_name"]
#             namespace = "default"
#             labels = {"app": app_name}

#             apps_v1, core_v1 = get_k8s_client3()

#             # Deployment
#             container = client.V1Container(
#                 name=app_name,
#                 image="mongo:latest",
#                 ports=[client.V1ContainerPort(container_port=27017)],
#                 env=[
#                     client.V1EnvVar(name="MONGO_INITDB_ROOT_USERNAME", value=data["username"]),
#                     client.V1EnvVar(name="MONGO_INITDB_ROOT_PASSWORD", value=data["root_password"]),
#                     client.V1EnvVar(name="MONGO_INITDB_DATABASE", value=data["database"]),
#                 ]
#             )

#             template = client.V1PodTemplateSpec(
#                 metadata=client.V1ObjectMeta(labels=labels),
#                 spec=client.V1PodSpec(containers=[container])
#             )

#             spec = client.V1DeploymentSpec(
#                 replicas=int(data["replica"]),
#                 selector=client.V1LabelSelector(match_labels=labels),
#                 template=template
#             )

#             deployment = client.V1Deployment(
#                 api_version="apps/v1",
#                 kind="Deployment",
#                 metadata=client.V1ObjectMeta(name=app_name),
#                 spec=spec
#             )

#             apps_v1.create_namespaced_deployment(namespace=namespace, body=deployment)

#             # Service
#             service = client.V1Service(
#                 metadata=client.V1ObjectMeta(name=app_name),
#                 spec=client.V1ServiceSpec(
#                     type="NodePort",
#                     selector=labels,
#                     ports=[
#                         client.V1ServicePort(
#                             port=27017,
#                             target_port=27017,
#                             node_port=int(data["node_port"])
#                         )
#                     ]
#                 )
#             )

#             core_v1.create_namespaced_service(namespace=namespace, body=service)

#             return {"success": True, "message": f"MongoDB '{app_name}' deployed successfully."}

#         except client.exceptions.ApiException as e:
#             return {"success": False, "error": f"Kubernetes API error: {e.reason}"}
#         except Exception as e:
#             return {"success": False, "error": f"Unexpected error: {str(e)}"}
        

class ServiceRequestCreateAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            serializer = ServiceRequestSerializer(data=request.data)
            if serializer.is_valid():
                service_request = serializer.save()
                # Do NOT deploy here, just save the details
                return Response({
                    "message": "Service request created successfully",
                    "service_request": ServiceRequestSerializer(service_request).data
                }, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


   
        
class ServiceRequestAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """
        Fetch all service request details (no pagination)
        """
        try:
            role = request.auth.get('role', None)
            employee_id = request.auth.get('employee_id', None)
            
            # Filter requests based on role
            if role == 'ADMIN':
                service_requests = ServiceRequest.objects.all()
            elif role == 'FLA':
                employee_ids = Employee.objects.filter(fla_employee_id=employee_id).values_list('employee_id', flat=True)
                service_requests = ServiceRequest.objects.filter(employee_id__in=employee_ids) | ServiceRequest.objects.filter(employee_id=employee_id)
            else:
                # For regular employees, get their own requests
                service_requests = ServiceRequest.objects.filter(employee_id=employee_id)

            serializer = ServiceRequestSerializer(service_requests, many=True)
            return Response(
                {
                    "totalRecords": service_requests.count(),
                    "data": serializer.data
                },
                status=status.HTTP_200_OK
            )
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        
class ServiceRequestPendingAdminAPIView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUserPermission]


    def get(self, request):
        try:
            role = request.auth.get('role', None)
            if role != 'ADMIN':
                return Response({"error": "Only admins can access this API."}, status=status.HTTP_403_FORBIDDEN)

            service_requests = ServiceRequest.objects.filter(fla_status="Accepted", admin_status="Pending")
            serializer = ServiceRequestSerializer(service_requests, many=True)
            return Response({"data": serializer.data}, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def put(self, request):
        try:
            request_id = request.data.get('request_id')
            new_status = request.data.get('status')
            remarks = request.data.get('remarks', '')

            if not request_id or not new_status:
                return Response({"error": "request_id and status are required"}, status=status.HTTP_400_BAD_REQUEST)

            service_request = ServiceRequest.objects.get(id=request_id)
            service_request.admin_status = new_status
            service_request.admin_approved_timestamp = timezone.now()
            if remarks:
                service_request.admin_remarks = remarks
            service_request.save()

            # pod_name = f"{service_request.app_name}-service-{request_id}"
            
            
            service_request = ServiceRequest.objects.get(id=request_id)
            service_request.admin_status = new_status
            service_request.admin_approved_timestamp = timezone.now()
            if remarks:
                service_request.admin_remarks = remarks
            service_request.save()

            # Retrieve app_name from service_request
            app_name = service_request.app_name
            request_id_str = str(request_id)  # ensure string

            # Validate and sanitize app_name
            if not app_name or not isinstance(app_name, str):
                app_name = "defaultapp"
            else:
                app_name = re.sub(r'[^a-z0-9-.]', '', app_name.lower())

            # Sanitize request_id
            if not request_id_str or not isinstance(request_id_str, str):
                request_id_str = "defaultid"
            else:
                request_id_str = re.sub(r'[^a-z0-9-]', '', request_id_str.lower())

            # Construct pod_name
            pod_name = f"{app_name}-service-{request_id_str}"

            # Validate pod_name against RFC 1123 DNS label
            if not re.match(r'^[a-z0-9]([-a-z0-9]*[a-z0-9])?$', pod_name):
                pod_name = "default-name"
                print("Pod name invalid, set to default:", pod_name)

            # Get Kubernetes clients
            apps_v1, core_v1 = get_k8s_client3()
            print("ngix function")
            print("service name:", service_request.service_name)

                
            def get_available_node_port(core_v1):
                """Find an available NodePort in the 30000-32767 range."""
                used_ports = set()
                services = core_v1.list_service_for_all_namespaces().items
                for svc in services:
                    if svc.spec.type == "NodePort":
                        for port in svc.spec.ports:
                            if port.node_port:
                                used_ports.add(port.node_port)

                for port in range(30000, 32768):
                    if port not in used_ports:
                        return port
                raise Exception("No available NodePort found in the 30000-32767 range.")

 
            
            

            apps_v1, core_v1 = get_k8s_client3()
            print("service name:", service_request.service_name)
            if service_request.service_name.lower() == "nginx":
                # if not pod_name or not isinstance(pod_name, str):
                #     pod_name = service_request.service_name + "nginx"
                #     print("Pod name is empty or not a string, using default name:", pod_name)
                container = client.V1Container(
                    name=pod_name,
                    image="nginx:latest",
                    ports=[client.V1ContainerPort(container_port=80)]
                )
                
                template = client.V1PodTemplateSpec(
                    metadata=client.V1ObjectMeta(labels={"app": pod_name}),
                    spec=client.V1PodSpec(containers=[container])
                )

                spec = client.V1DeploymentSpec(
                    replicas=1,
                    selector=client.V1LabelSelector(match_labels={"app": pod_name}),
                    template=template
                )

                deployment = client.V1Deployment(
                    api_version="apps/v1",
                    kind="Deployment",
                    metadata=client.V1ObjectMeta(name=pod_name),
                    spec=spec
                )

                apps_v1.create_namespaced_deployment(namespace="default", body=deployment)
                random_node_port = random.randint(30000, 32767)
                service = client.V1Service(
                    metadata=client.V1ObjectMeta(name=pod_name),
                    spec=client.V1ServiceSpec(
                        type="NodePort",
                        selector={"app": pod_name},
                        ports=[client.V1ServicePort(port=80, target_port=80, node_port=random_node_port)]
                    )
                )

                # Create service
                created_service = core_v1.create_namespaced_service(namespace="default", body=service)

                # ⭐ Retrieve the assigned NodePort
                node_port = created_service.spec.ports[0].node_port
                print("Assigned NodePort:", node_port)

                # Save to DB or return to frontend
                service_request.node_port = node_port
                service_request.save()

                # ⭐⭐⭐ Set Deployment Status After Successful Deployment ⭐⭐⭐
                service_request.deployment_status = "Deployed"
                service_request.save()

                # Send deployment success email
                employee = Employee.objects.get(employee_id=service_request.employee_id)
                send_deployment_email(
                    email=employee.email,
                    employee_name=employee.name,
                    service_request=service_request
                )

                serializer = ServiceRequestSerializer(service_request)
        
                node_ip = os.getenv("node_ip")
                deployment_url = f"http://{node_ip}:{service_request.node_port}/"

                print("Deployment marked as Deployed")
                return Response({
                "message": "Service request status updated successfully by admin",
                "data": serializer.data,
                "deployment_url": deployment_url,
                "node_port": service_request.node_port,
                "service_name": service_request.service_name,
                "app_name": service_request.app_name
            }, status=status.HTTP_200_OK)

            elif service_request.service_name.lower() == "mongodb":
                data = request.data
                required_fields = ["replica", "app_name", "root_password", "username", "password", "database", "node_port"]
                for field in required_fields:
                    if field not in data:
                        return Response({"error": f"'{field}' is required."}, status=status.HTTP_400_BAD_REQUEST)

                app_name = data["app_name"]
                labels = {"app": app_name}

                container = client.V1Container(
                    name=app_name,
                    image="mongo:latest",
                    ports=[client.V1ContainerPort(container_port=27017)],
                    env=[
                        client.V1EnvVar(name="MONGO_INITDB_ROOT_USERNAME", value=data["username"]),
                        client.V1EnvVar(name="MONGO_INITDB_ROOT_PASSWORD", value=data["root_password"]),
                        client.V1EnvVar(name="MONGO_INITDB_DATABASE", value=data["database"]),
                    ]
                )

                template = client.V1PodTemplateSpec(
                    metadata=client.V1ObjectMeta(labels=labels),
                    spec=client.V1PodSpec(containers=[container])
                )

                spec = client.V1DeploymentSpec(
                    replicas=int(data["replica"]),
                    selector=client.V1LabelSelector(match_labels=labels),
                    template=template
                )

                deployment = client.V1Deployment(
                    api_version="apps/v1",
                    kind="Deployment",
                    metadata=client.V1ObjectMeta(name=app_name),
                    spec=spec
                )

                apps_v1.create_namespaced_deployment(namespace="default", body=deployment)

                service = client.V1Service(
                    metadata=client.V1ObjectMeta(name=app_name),
                    spec=client.V1ServiceSpec(
                        type="NodePort",
                        selector=labels,
                        ports=[
                            client.V1ServicePort(
                                port=27017,
                                target_port=27017,
                                node_port=int(data["node_port"])
                            )
                        ]
                    )
                )

                core_v1.create_namespaced_service(namespace="default", body=service)

                ServiceRequest.objects.create(
                    employee_id=service_request.employee_id,
                    employee_name=Employee.objects.get(employee_id=service_request.employee_id).name,
                    app_name=data["app_name"],
                    replica=data["replica"],
                    root_password=data["root_password"],
                    username=data["username"],
                    password=data["password"],
                    database=data["database"],
                    node_port=data["node_port"]
                )

            
            elif service_request.service_name.lower() == "postgresql":
                # Extract data from the model instance
                replica = service_request.replica
                app_name = service_request.app_name
                username = service_request.username
                password = service_request.password
                database = service_request.database
                node_port = service_request.node_port

                # Validate extracted fields
                required_values = {
                    "replica": replica,
                    "app_name": app_name,
                    "username": username,
                    "password": password,
                    "database": database,
                    "node_port": node_port,
                }

                for key, value in required_values.items():
                    if value in [None, ""]:
                        return Response({"error": f"'{key}' is missing in the service request."}, status=status.HTTP_400_BAD_REQUEST)

                labels = {"app": app_name}

                # Create the PostgreSQL container
                container = client.V1Container(
                    name=app_name,
                    image="postgres:latest",
                    ports=[client.V1ContainerPort(container_port=5432)],
                    env=[
                        client.V1EnvVar(name="POSTGRES_USER", value=username),
                        client.V1EnvVar(name="POSTGRES_PASSWORD", value=password),
                        client.V1EnvVar(name="POSTGRES_DB", value=database),
                    ]
                )

                # Pod template
                template = client.V1PodTemplateSpec(
                    metadata=client.V1ObjectMeta(labels=labels),
                    spec=client.V1PodSpec(containers=[container])
                )

                # Deployment spec
                spec = client.V1DeploymentSpec(
                    replicas=replica,
                    selector=client.V1LabelSelector(match_labels=labels),
                    template=template
                )

                deployment = client.V1Deployment(
                    api_version="apps/v1",
                    kind="Deployment",
                    metadata=client.V1ObjectMeta(name=app_name),
                    spec=spec
                )

                try:
                    apps_v1.create_namespaced_deployment(namespace="default", body=deployment)
                except client.exceptions.ApiException as e:
                    return Response({"error": "PostgreSQL Deployment failed", "details": e.body}, status=500)

                # Service for PostgreSQL
                service = client.V1Service(
                    metadata=client.V1ObjectMeta(name=app_name),
                    spec=client.V1ServiceSpec(
                        type="NodePort",
                        selector=labels,
                        ports=[
                            client.V1ServicePort(
                                port=5432,
                                target_port=5432,
                                node_port=node_port
                            )
                        ]
                    )
                )

                try:
                    core_v1.create_namespaced_service(namespace="default", body=service)
                except client.exceptions.ApiException as e:
                    return Response({"error": "PostgreSQL Service creation failed", "details": e.body}, status=500)

                print(f"PostgreSQL deployment and service created for {app_name}.")

            elif service_request.service_name.lower() == "mysql":
                # Extract data from the service request record
                replica = service_request.replica
                app_name = service_request.app_name
                username = service_request.username
                password = service_request.password
                database = service_request.database
                node_port = service_request.node_port

                # Validate extracted fields
                required_values = {
                    "replica": replica,
                    "app_name": app_name,
                    "username": username,
                    "password": password,
                    "database": database,
                    "node_port": node_port,
                }
                for key, value in required_values.items():
                    if value in [None, ""]:
                        return Response({"error": f"'{key}' is missing in the service request."},
                                        status=status.HTTP_400_BAD_REQUEST)

                labels = {"app": app_name}

                # MySQL container definition
                container = client.V1Container(
                    name=app_name,
                    image="mysql:latest",
                    ports=[client.V1ContainerPort(container_port=3306)],
                    env=[
                        client.V1EnvVar(name="MYSQL_ROOT_PASSWORD", value=password),
                        client.V1EnvVar(name="MYSQL_DATABASE", value=database),
                        client.V1EnvVar(name="MYSQL_USER", value=username),
                        client.V1EnvVar(name="MYSQL_PASSWORD", value=password),
                    ]
                )

                # Pod template
                template = client.V1PodTemplateSpec(
                    metadata=client.V1ObjectMeta(labels=labels),
                    spec=client.V1PodSpec(containers=[container])
                )

                # Deployment spec
                spec = client.V1DeploymentSpec(
                    replicas=replica,
                    selector=client.V1LabelSelector(match_labels=labels),
                    template=template
                )

                deployment = client.V1Deployment(
                    api_version="apps/v1",
                    kind="Deployment",
                    metadata=client.V1ObjectMeta(name=app_name),
                    spec=spec
                )

                try:
                    apps_v1.create_namespaced_deployment(namespace="default", body=deployment)
                except client.exceptions.ApiException as e:
                    return Response({"error": "MySQL Deployment failed", "details": e.body}, status=500)

                # --- Port Availability Check ---
                existing_services = core_v1.list_service_for_all_namespaces().items
                used_ports = [
                    p.node_port
                    for svc in existing_services
                    if svc.spec.type == "NodePort"
                    for p in svc.spec.ports if p.node_port
                ]

                port_changed = False
                if node_port in used_ports:
                    print(f"⚠ NodePort {node_port} is already in use. Letting Kubernetes assign a free one.")
                    node_port = None  # Kubernetes will auto-assign
                    port_changed = True

                # MySQL Service definition
                service = client.V1Service(
                    metadata=client.V1ObjectMeta(name=app_name),
                    spec=client.V1ServiceSpec(
                        type="NodePort",
                        selector=labels,
                        ports=[
                            client.V1ServicePort(
                                port=3306,
                                target_port=3306,
                                node_port=node_port
                            )
                        ]
                    )
                )

                try:
                    created_service = core_v1.create_namespaced_service(namespace="default", body=service)
                except client.exceptions.ApiException as e:
                    return Response({"error": "MySQL Service creation failed", "details": e.body}, status=500)

                # Get the assigned NodePort
                assigned_port = created_service.spec.ports[0].node_port

                if port_changed:
                    print(f"✅ Requested port was busy. Assigned free port: {assigned_port}")
                else:
                    print(f"✅ Port {assigned_port} assigned as requested.")
                    
                # Update the model with the assigned port
                service_request.node_port = assigned_port
                service_request.save()

                return Response({
                    "message": "MySQL deployment and service created successfully.",
                    "assigned_node_port": assigned_port
                }, status=status.HTTP_201_CREATED)
                
            elif service_request.service_name.replace("-", "").lower() == "nginxha":

                serializer = ServiceRequestSerializer(service_request)
                # Default replicas = 2 if empty
                replicas = int(service_request.replica) if service_request.replica else 2
                deployment_name = f"{service_request.app_name.lower()}-ha-{service_request.id}"
                service_name = f"{deployment_name}-svc"

                apps_v1, core_v1 = get_k8s_client3()

                # ---------------------------
                # 1️⃣ Create Deployment
                # ---------------------------
                deployment = client.V1Deployment(
                    api_version="apps/v1",
                    kind="Deployment",
                    metadata=client.V1ObjectMeta(
                        name=deployment_name,
                        labels={"app": deployment_name}
                    ),
                    spec=client.V1DeploymentSpec(
                        replicas=replicas,
                        selector=client.V1LabelSelector(
                            match_labels={"app": deployment_name}
                        ),
                        template=client.V1PodTemplateSpec(
                            metadata=client.V1ObjectMeta(labels={"app": deployment_name}),
                            spec=client.V1PodSpec(
                                containers=[
                                    client.V1Container(
                                        name="nginx",
                                        image="nginx:latest",
                                        ports=[client.V1ContainerPort(container_port=80)],
                                    )
                                ]
                            ),
                        ),
                    ),
                )

                try:
                    apps_v1.create_namespaced_deployment("default", deployment)
                except client.exceptions.ApiException as e:
                    return Response({
                        "error": "NGINX-HA Deployment failed",
                        "details": e.body,
                        "data": serializer.data
                    }, status=500)

                # ---------------------------
                # 2️⃣ Create NodePort service
                # ---------------------------
                # Check port availability
                used_ports = set()

                services = core_v1.list_service_for_all_namespaces().items

                for svc in services:
                    if svc.spec.type == "NodePort":
                        for p in svc.spec.ports:
                            if p.node_port:
                                used_ports.add(p.node_port)

                # Auto-select free port
                node_port = None
                for port in range(30000, 32767):
                    if port not in used_ports:
                        node_port = port
                        break

                service_manifest = client.V1Service(
                    metadata=client.V1ObjectMeta(name=service_name),
                    spec=client.V1ServiceSpec(
                        type="NodePort",
                        selector={"app": deployment_name},
                        ports=[
                            client.V1ServicePort(
                                port=80,
                                target_port=80,
                                node_port=node_port
                            )
                        ],
                    ),
                )

                try:
                    core_v1.create_namespaced_service("default", service_manifest)
                except client.exceptions.ApiException as e:
                    return Response({
                    "error": "NGINX-HA Service failed",
                    "details": str(e),
                    "data": serializer.data   # <-- now safe
                }, status=500)
                
                # Save NodePort and mark deployment status
                service_request.node_port = node_port
                service_request.deployment_status = "Deployed"
                service_request.save()

                print(f"🔥 NGINX-HA Deployed: {deployment_name}, NodePort={node_port}")

                # Send deployment success email
                employee = Employee.objects.get(employee_id=service_request.employee_id)
                send_deployment_email(
                    email=employee.email,
                    employee_name=employee.name,
                    service_request=service_request
                )
                serializer = ServiceRequestSerializer(service_request)
                node_ip = os.getenv("node_ip")

                deployment_url = f"http://{node_ip}:{service_request.node_port}/"

                return Response({   
                    "message": "NGINX-HA Deployed Successfully",
                    "data": serializer.data,
                    "deployment_url": deployment_url,
                    "node_port": service_request.node_port,
                    "service_name": service_request.service_name,
                    "app_name": service_request.app_name
                }, status=status.HTTP_200_OK)
            
                
            elif service_request.service_name.lower() == "couchdb":
                replica = service_request.replica
                app_name = service_request.app_name
                username = service_request.username
                password = service_request.password
                node_port = service_request.node_port

                for key, value in {
                    "replica": replica,
                    "app_name": app_name,
                    "username": username,
                    "password": password,
                    "node_port": node_port
                }.items():
                    if value in [None, ""]:
                        return Response({"error": f"'{key}' is missing."}, status=status.HTTP_400_BAD_REQUEST)

                # Check port availability
                try:
                    used_ports = {p.node_port for svc in core_v1.list_service_for_all_namespaces().items 
                                if svc.spec.type == "NodePort" for p in svc.spec.ports}
                    if node_port in used_ports:
                        node_port = get_available_node_port(core_v1)
                        service_request.node_port = node_port
                        service_request.save()
                except Exception as e:
                    return Response({"error": "Port check failed", "details": str(e)}, status=500)

                labels = {"app": app_name}

                container = client.V1Container(
                    name=app_name,
                    image="couchdb:latest",
                    ports=[client.V1ContainerPort(container_port=5984)],
                    env=[
                        client.V1EnvVar(name="COUCHDB_USER", value=username),
                        client.V1EnvVar(name="COUCHDB_PASSWORD", value=password)
                    ]
                )

                template = client.V1PodTemplateSpec(
                    metadata=client.V1ObjectMeta(labels=labels),
                    spec=client.V1PodSpec(containers=[container])
                )

                spec = client.V1DeploymentSpec(
                    replicas=replica,
                    selector=client.V1LabelSelector(match_labels=labels),
                    template=template
                )

                deployment = client.V1Deployment(
                    api_version="apps/v1",
                    kind="Deployment",
                    metadata=client.V1ObjectMeta(name=app_name),
                    spec=spec
                )

                try:
                    apps_v1.create_namespaced_deployment(namespace="default", body=deployment)
                except client.exceptions.ApiException as e:
                    return Response({"error": "CouchDB Deployment failed", "details": e.body}, status=500)

                service = client.V1Service(
                    metadata=client.V1ObjectMeta(name=app_name),
                    spec=client.V1ServiceSpec(
                        type="NodePort",
                        selector=labels,
                        ports=[client.V1ServicePort(port=5984, target_port=5984, node_port=node_port)]
                    )
                )

                try:
                    core_v1.create_namespaced_service(namespace="default", body=service)
                except client.exceptions.ApiException as e:
                    return Response({"error": "CouchDB Service creation failed", "details": e.body}, status=500)

                print(f"CouchDB deployment and service created for {app_name} on port {node_port}.")


            elif service_request.service_name.lower() == "mariadb":
                    replica = service_request.replica
                    app_name = service_request.app_name
                    username = service_request.username
                    password = service_request.password
                    database = service_request.database
                    node_port = service_request.node_port

                    for key, value in {
                        "replica": replica,
                        "app_name": app_name,
                        "username": username,
                        "password": password,
                        "database": database,
                        "node_port": node_port
                    }.items():
                        if value in [None, ""]:
                            return Response({"error": f"'{key}' is missing."}, status=status.HTTP_400_BAD_REQUEST)

                    # Check port availability
                    try:
                        used_ports = {p.node_port for svc in core_v1.list_service_for_all_namespaces().items 
                                    if svc.spec.type == "NodePort" for p in svc.spec.ports}
                        if node_port in used_ports:
                            node_port = get_available_node_port(core_v1)
                            service_request.node_port = node_port
                            service_request.save()
                    except Exception as e:
                        return Response({"error": "Port check failed", "details": str(e)}, status=500)

                    labels = {"app": app_name}

                    container = client.V1Container(
                        name=app_name,
                        image="mariadb:latest",
                        ports=[client.V1ContainerPort(container_port=3306)],
                        env=[
                            client.V1EnvVar(name="MYSQL_ROOT_PASSWORD", value=password),
                            client.V1EnvVar(name="MYSQL_DATABASE", value=database),
                            client.V1EnvVar(name="MYSQL_USER", value=username),
                            client.V1EnvVar(name="MYSQL_PASSWORD", value=password),
                        ]
                    )

                    template = client.V1PodTemplateSpec(
                        metadata=client.V1ObjectMeta(labels=labels),
                        spec=client.V1PodSpec(containers=[container])
                    )

                    spec = client.V1DeploymentSpec(
                        replicas=replica,
                        selector=client.V1LabelSelector(match_labels=labels),
                        template=template
                    )

                    deployment = client.V1Deployment(
                        api_version="apps/v1",
                        kind="Deployment",
                        metadata=client.V1ObjectMeta(name=app_name),
                        spec=spec
                    )

                    try:
                        apps_v1.create_namespaced_deployment(namespace="default", body=deployment)
                    except client.exceptions.ApiException as e:
                        return Response({"error": "MariaDB Deployment failed", "details": e.body}, status=500)

                    service = client.V1Service(
                        metadata=client.V1ObjectMeta(name=app_name),
                        spec=client.V1ServiceSpec(
                            type="NodePort",
                            selector=labels,
                            ports=[client.V1ServicePort(port=3306, target_port=3306, node_port=node_port)]
                        )
                    )

                    try:
                        core_v1.create_namespaced_service(namespace="default", body=service)
                    except client.exceptions.ApiException as e:
                        return Response({"error": "MariaDB Service creation failed", "details": e.body}, status=500)

                    print(f"MariaDB deployment and service created for {app_name} on port {node_port}.")


            
            try:
                employee = Employee.objects.get(employee_id=service_request.employee_id)
                subject = 'Service Request Status Update from Admin'
                message = f'''Dear {employee.name},\n\nYour service request for {service_request.service_name} has been {new_status} by the Admin.\n\n{f"Remarks: {remarks}" if remarks else ""}\n\nThanks & Regards,\nCloud Team'''

                from_email = 'rakshanavg20@gmail.com'
                to_email = [employee.email]
                print(f"Email notification sent to {to_email} for {service_request.service_name}")

            except Exception as e:
                print(f"Error sending email: {e}")

            serializer = ServiceRequestSerializer(service_request)
            return Response({
                "message": "Service request status updated successfully by admin",
                "data": serializer.data
            }, status=status.HTTP_200_OK)

        except ServiceRequest.DoesNotExist:
            return Response({"error": "Service request not found"}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def send_deployment_email(email, employee_name, service_request):
    """
    Sends service deployment success email to employee.
    Matches the same quality/style as OTP email function.
    """
    node_ip = os.getenv("node_ip", "YOUR_NODE_IP")
    deployment_url = f"http://{node_ip}:{getattr(service_request, 'node_port', '')}/"

    subject = f"{getattr(service_request, 'service_name', 'Service')} Deployment Successful - Meghdoot CMP"

    message = f'''Dear {employee_name},

Your requested service {getattr(service_request, 'service_name', '')} has been successfully deployed on the Meghdoot CMP Platform.

Below are the deployment details:

- Service Name: {getattr(service_request, 'service_name', '')}
- Application Name: {getattr(service_request, 'app_name', '')}
- Deployment Status: {getattr(service_request, 'deployment_status', '')}
- Node Port: {getattr(service_request, 'node_port', '')}
- Access URL: {deployment_url}

You may now access and use your deployed service.

If you have any questions or did not request this service, please contact the Meghdoot CMP Support Team.

Best regards,
Meghdoot CMP Cloud Team
'''

    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=getattr(settings, "EMAIL_HOST_USER", None),
            recipient_list=[email],
            fail_silently=False
        )
        print(f"Deployment email sent successfully to {email}")
        return True
    except Exception as e:
        print("Error sending deployment email:", e)
        return False
        return True

    except Exception as e:
        print("Error sending deployment email:", e)
        return False


class EmployeeDeployedServicesAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            employee_id = request.auth.get("employee_id", None)

            if not employee_id:
                return Response(
                    {"error": "Employee ID not found in token"},
                    status=status.HTTP_403_FORBIDDEN
                )

            # Fetch all successful deployments for this employee
            deployed_services = ServiceRequest.objects.filter(
                employee_id=employee_id,
                deployment_status="Deployed"
            ).order_by("-admin_approved_timestamp")

            result = []

            node_ip = os.getenv("node_ip", "0.0.0.0")

            for svc in deployed_services:
                deployment_url = (
                    f"http://{node_ip}:{svc.node_port}/"
                    if svc.node_port else None
                )

                result.append({
                    "id": svc.id,
                    "service_name": svc.service_name,
                    "app_name": svc.app_name,
                    "replica": svc.replica,
                    "project_name": svc.project_name,
                    "purpose": svc.purpose,
                    "request_timestamp": svc.request_timestamp,
                    "approved_timestamp": svc.admin_approved_timestamp,
                    "deployment_status": svc.deployment_status,
                    "node_port": svc.node_port,
                    "deployment_url": deployment_url,
                    "k8s_service_name": f"{svc.app_name.lower()}-{svc.id}",
                })

            return Response({
                "message": "Deployed services fetched successfully",
                "services": result
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({
                "error": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)





class VMDetailAPIView(APIView):
    def get(self, request):
        vm_name = request.query_params.get("vm_name")
        if not vm_name:
            return Response({"error": "vm_name query parameter is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            conn = connection.Connection(
                auth_url=os.getenv('AUTH_URL'),
                project_name=os.getenv('PROJECT_NAME'),
                username=os.getenv('OPENSTACK_UNAME'),
                password=os.getenv('PASSWORD'),
                user_domain_name=os.getenv('USER_DOMAIN_NAME'),
                project_domain_name=os.getenv('PROJECT_DOMAIN_NAME'),
            )

            # Find the server (VM) by name
            servers = list(conn.compute.servers(name=vm_name))
            if not servers:
                return Response({"error": "No VM found with that name"}, status=status.HTTP_404_NOT_FOUND)
            
            server = servers[0]  # Assume first match

            # Get flavor info
            flavor_id = server.flavor['id'] if server.flavor and 'id' in server.flavor else None
            flavor = conn.compute.find_flavor(flavor_id) if flavor_id else None

            # Get image info
            image_id = server.image['id'] if server.image and 'id' in server.image else None
            image = conn.compute.get_image(image_id) if image_id else None

            # Get volume attachment
            volumes = conn.compute.volume_attachments(server.id)
            volume_info = []
            for vol in volumes:
                vol_data = conn.block_storage.get_volume(vol.volume_id)
                volume_info.append({
                    "volume_name": vol_data.name,
                    "device": vol.device,
                    "size": vol_data.size,
                    "id": vol.volume_id,
                })

            # Get IP addresses
            ip_addresses = []
            for network_name, addresses in server.addresses.items():
                for addr in addresses:
                    ip_addresses.append(addr['addr'])

            # Prepare the response data in the desired format
            data = {
                "Name": server.name,
                "ID": server.id,
                "Description": server.description or "-",
                "Project ID": server.project_id,
                "Status": server.status,
                "Availability Zone": getattr(server, "OS-EXT-AZ:availability_zone", None),
                "Created": server.created_at,
                "Age": "5 days, 21 hours",  # You may want to calculate this dynamically
                "Host": getattr(server, "OS-EXT-SRV-ATTR:host", None),
                "Instance Name": getattr(server, "OS-EXT-SRV-ATTR:instance_name", None),
                "Reservation ID": server.reservation_id,
                "Launch Index": server.launch_index or "-",
                "Hostname": server.name,
                "Kernel ID": server.kernel_id or "-",
                "Ramdisk ID": server.ramdisk_id or "-",
                "Device Name": "/dev/vda",  # Assuming this is static as per your example
                "User  Data": "-",  # Assuming no user data is provided
                "Specs": {
                    "Flavor Name": flavor.name if flavor else "N/A",
                    "Flavor ID": flavor.id if flavor else "N/A",
                    "RAM": f"{flavor.ram}MB" if flavor else "N/A",
                    "VCPUs": flavor.vcpus if flavor else "N/A",
                    "Disk": f"{flavor.disk}GB" if flavor else "N/A"
                },
                "IP Addresses": {
                    "External Network": ip_addresses
                },
                "Security Groups": [sg['name'] for sg in server.security_groups],
                "Metadata": {
                    "Key Name": server.key_name or "None",
                    "Image Name": image.name if image else "N/A",
                    "Image ID": image.id if image else "N/A"
                },
                "Volumes Attached": volume_info
            }

            return Response({"vm_details": data}, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        
@api_view(['GET'])
def vm_full_detail_view(request):
    vm_name = request.query_params.get("vm_name")
    if not vm_name:
        return Response({"error": "vm_name query parameter is required"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        conn = get_openstack_connection()
        servers = list(conn.compute.servers(name=vm_name))
        if not servers:
            return Response({"error": "No VM found with that name"}, status=status.HTTP_404_NOT_FOUND)
        server = servers[0]

        # Flavor
        flavor = None
        if server.flavor and 'id' in server.flavor and server.flavor['id']:
            flavor = conn.compute.find_flavor(server.flavor['id'])

        # Image
        image = None
        if server.image and 'id' in server.image and server.image['id']:
            image = conn.compute.find_image(server.image['id'])

        # Project ID
        project_id = getattr(server, 'project_id', None)

        # Volumes
        volumes = conn.compute.volume_attachments(server.id)
        volume_info = []
        for vol in volumes:
            vol_data = conn.block_storage.get_volume(vol.volume_id)
            volume_info.append({
                "volume_name": vol_data.name,
                "device": vol.device,
                "size": vol_data.size,
                "id": vol.volume_id,
                "attached_to": server.name,
            })

        # IP Addresses
        ip_addresses = {}
        for network_name, addresses in server.addresses.items():
            ip_addresses[network_name] = [addr['addr'] for addr in addresses]

        # Security Groups
        security_groups = []
        for sg in getattr(server, 'security_groups', []):
            sg_detail = {
                "name": sg['name'],
                "rules": []
            }
            # Fetch rules for each security group
            for rule in conn.network.security_group_rules(security_group_id=sg['id']):
                sg_detail["rules"].append({
                    "direction": rule.direction,
                    "protocol": rule.protocol,
                    "port_range_min": rule.port_range_min,
                    "port_range_max": rule.port_range_max,
                    "remote_ip_prefix": rule.remote_ip_prefix,
                    "ethertype": rule.ethertype,
                    "remote_group_id": rule.remote_group_id,
                })
            security_groups.append(sg_detail)

        # Age calculation
        created_at_str = getattr(server, 'created_at', None)
        age = "-"
        created_at_fmt = "-"
        if created_at_str:
            created_at = datetime.strptime(created_at_str, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=dt_timezone.utc)
            now = datetime.now(dt_timezone.utc)
            delta = now - created_at
            days = delta.days
            hours, remainder = divmod(delta.seconds, 3600)
            minutes, seconds = divmod(remainder, 60)
            age = f"{days} days, {hours} hours"
            created_at_fmt = created_at.strftime("%b %d, %Y, %I:%M %p")

        # Power state
        POWER_STATE_MAP = {
            0: "NOSTATE",
            1: "Running",
            3: "Paused",
            4: "Shutdown",
            6: "Crashed",
            7: "Suspended"
        }
        power_state_num = getattr(server, 'power_state', None)
        power_state_str = POWER_STATE_MAP.get(power_state_num, str(power_state_num))

        # Compose response
        data = {
            "Name": server.name,
            "ID": server.id,
            "Description": getattr(server, "description", "-"),
            "Project ID": project_id,
            "Status": server.status,
            "Power State": power_state_str,
            "Locked": getattr(server, "locked", False),
            "Availability Zone": getattr(server, "OS-EXT-AZ:availability_zone", None),
            "Created": created_at_fmt,
            "Age": age,
            "Host": getattr(server, "OS-EXT-SRV-ATTR:host", None),
            "Instance Name": getattr(server, "OS-EXT-SRV-ATTR:instance_name", None),
            "Reservation ID": getattr(server, "reservation_id", None),
            "Launch Index": getattr(server, "launch_index", "-"),
            "Hostname": getattr(server, "hostname", server.name.replace("_", "-")),
            "Kernel ID": getattr(server, "kernel_id", "-"),
            "Ramdisk ID": getattr(server, "ramdisk_id", "-"),
            "Device Name": volume_info[0]["device"] if volume_info else "-",
            "User Data": getattr(server, "user_data", "-"),
            "Specs": {
                "Flavor Name": flavor.name if flavor else "-",
                "Flavor ID": flavor.id if flavor else "-",
                "RAM": f"{flavor.ram}MB" if flavor else "-",
                "VCPUs": f"{flavor.vcpus} VCPU" if flavor else "-",
                "Disk": f"{flavor.disk}GB" if flavor else "-",
            },
            "IP Addresses": ip_addresses,
            "Security Groups": security_groups,
            "Metadata": {
                "Key Name": getattr(server, "key_name", None),
                "Image Name": image.name if image else "-",
                "Image ID": image.id if image else "-",
            },
            "Volumes Attached": volume_info,
        }

        return Response(data, status=status.HTTP_200_OK)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR) 


@api_view(["GET"])
def get_node_details(request):
    node_name = request.query_params.get("node_name")
    if not node_name:
        return Response({"error": "Missing node_name query parameter"}, status=400)

    # Load kubeconfig
    config.load_kube_config()

    v1 = client.CoreV1Api()

    try:
        node = v1.read_node(name=node_name)
    except client.exceptions.ApiException as e:
        return Response({"error": f"Node '{node_name}' not found: {str(e)}"}, status=404)

    # --------------------
    # Metadata
    # --------------------
    metadata = {
        "name": node.metadata.name,
        "created": node.metadata.creation_timestamp.strftime("%b %d, %Y"),
        "age": str(datetime.now(node.metadata.creation_timestamp.tzinfo) - node.metadata.creation_timestamp),
        "uid": node.metadata.uid,
        "labels": node.metadata.labels,
        "annotations": node.metadata.annotations
    }

    # --------------------
    # Resource info
    # --------------------
    capacity = node.status.capacity
    allocatable = node.status.allocatable

    pod_cidr = node.spec.pod_cidr
    addresses = {addr.type: addr.address for addr in node.status.addresses}

    # --------------------
    # System info
    # --------------------
    sys_info = node.status.node_info.to_dict()

    # --------------------
    # Conditions
    # --------------------
    conditions = []
    for cond in node.status.conditions:
        conditions.append({
            "type": cond.type,
            "status": cond.status,
            "last_probe_time": cond.last_probe_time,
            "last_transition_time": cond.last_transition_time,
            "reason": cond.reason,
            "message": cond.message
        })

    # --------------------
    # Pods on this node
    # --------------------
    pods = v1.list_pod_for_all_namespaces(field_selector=f"spec.nodeName={node_name}").items
    pod_list = []
    for pod in pods:
        pod_list.append({
            "name": pod.metadata.name,
            "images": [c.image for c in pod.spec.containers],
            "labels": pod.metadata.labels,
            "node": pod.spec.node_name,
            "status": pod.status.phase,
            "restarts": sum(cs.restart_count for cs in (pod.status.container_statuses or [])),
            "created": pod.metadata.creation_timestamp
        })

    # --------------------
    # Response assembly
    # --------------------
    node_data = {
        "metadata": metadata,
        "capacity": capacity,
        "allocatable": allocatable,
        "podCIDR": pod_cidr,
        "addresses": addresses,
        "system_info": sys_info,
        "conditions": conditions,
        "pods": pod_list
    }

    return Response(node_data)



  
    
    
@api_view(["GET"])
def get_k8s_nodes(request):
    # Load kubeconfig

    apps_v1, v1 = get_k8s_client3()
    nodes = v1.list_node().items

    node_data = []
    for node in nodes:
        # Name
        name = node.metadata.name

        # Labels
        labels = node.metadata.labels

        # Ready Status
        ready_status = False
        for condition in node.status.conditions:
            if condition.type == "Ready" and condition.status == "True":
                ready_status = True
                break

        # CPU and Memory capacity
        cpu_capacity = node.status.capacity.get("cpu")
        mem_capacity = node.status.capacity.get("memory")

        # CPU and Memory allocatable
        cpu_allocatable = node.status.allocatable.get("cpu")
        mem_allocatable = node.status.allocatable.get("memory")

        # Creation time
        created_time = node.metadata.creation_timestamp
        created_human = created_time.strftime("%Y-%m-%d %H:%M:%S")

        # Pod count
        field_selector = f"spec.nodeName={name}"
        pods = v1.list_pod_for_all_namespaces(field_selector=field_selector).items
        pod_count = len(pods)

        node_data.append({
            "name": name,
            "labels": labels,
            "ready": ready_status,
            "cpu_capacity": cpu_capacity,
            "memory_capacity": mem_capacity,
            "cpu_allocatable": cpu_allocatable,
            "memory_allocatable": mem_allocatable,
            "pods": pod_count,
            "created": created_human
        })

    return Response(node_data)





@api_view(["GET"])
def get_node_details1(request):
    node_name = request.GET.get("node_name")
    if not node_name:
        return JsonResponse({"error": "node_name query parameter is required"}, status=400)

    apps_v1, core_v1 = get_k8s_client3()
    try:
        # Get Node Info
        node = core_v1.read_node(node_name)

        node_info = {
            "metadata": {
                "name": node.metadata.name,
                "uid": node.metadata.uid,
                "creationTimestamp": str(node.metadata.creation_timestamp),
                "labels": node.metadata.labels,
                "annotations": node.metadata.annotations,
            },
            "addresses": {
                addr.type: addr.address for addr in node.status.addresses
            },
            "system_info": {
                "machineID": node.status.node_info.machine_id,
                "systemUUID": node.status.node_info.system_uuid,
                "bootID": node.status.node_info.boot_id,
                "kernelVersion": node.status.node_info.kernel_version,
                "osImage": node.status.node_info.os_image,
                "containerRuntimeVersion": node.status.node_info.container_runtime_version,
                "kubeletVersion": node.status.node_info.kubelet_version,
                "kubeProxyVersion": node.status.node_info.kube_proxy_version,
                "operatingSystem": node.status.node_info.operating_system,
                "architecture": node.status.node_info.architecture,
            },
            "capacity": dict(node.status.capacity),
            "conditions": [
                {
                    "type": cond.type,
                    "status": cond.status,
                    "lastHeartbeatTime": str(cond.last_heartbeat_time),
                    "lastTransitionTime": str(cond.last_transition_time),
                    "reason": cond.reason,
                    "message": cond.message,
                }
                for cond in node.status.conditions
            ],
        }

        # Get Pods running on that node
        pods = core_v1.list_pod_for_all_namespaces(field_selector=f"spec.nodeName={node_name}").items
        node_info["pods"] = [
            {
                "name": pod.metadata.name,
                "namespace": pod.metadata.namespace,
                "status": pod.status.phase,
                "node": pod.spec.node_name,
                "startTime": str(pod.status.start_time),
                "containers": [
                    {"name": c.name, "image": c.image}
                    for c in pod.spec.containers
                ]
            }
            for pod in pods
        ]

        return JsonResponse(node_info, safe=False)

    except client.exceptions.ApiException as e:
        return JsonResponse({"error": f"Kubernetes API error: {e}"}, status=500)
    
    

@require_GET
def get_hypervisors_page(request):
    """Django view to return all hypervisors info as JSON."""
    conn = get_openstack_connection()
    hypervisors = []

    for hv in conn.compute.hypervisors():
        hypervisors.append({
            "id": hv.id,
            "name": hv.name,
            "state": hv.state,
            "status": hv.status,
            "vcpus": hv.vcpus,
            "vcpus_used": hv.vcpus_used,
            "memory_mb": hv.memory_size,
            "memory_mb_used": hv.memory_used,
            "local_gb": hv.local_disk_size,
            "local_gb_used": hv.local_disk_used,
            "running_vms": hv.running_vms,
            "hypervisor_type": hv.hypervisor_type,
            "hypervisor_version": hv.hypervisor_version,
        })

    return JsonResponse({"hypervisors": hypervisors})








class VolumeTypeView(APIView):
    """
    API to create OpenStack Volume Types (e.g., CEPH, DEFAULT, LVM).
    """

    def post(self, request):
        """
        Create a new volume type.
        Example JSON:
        {
            "name": "CEPH",
            "description": "Ceph backend volume type",
            "is_public": true
        }
        """
        name = request.data.get("name")
        description = request.data.get("description", "")
        is_public = request.data.get("is_public", True)

        if not name:
            return Response(
                {"error": "Volume type 'name' is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            conn = get_openstack_connection()

            # Create volume type
            volume_type = conn.block_storage.create_type(
                name=name,
                description=description,
                is_public=is_public
            )

            return Response(
                {
                    "message": "Volume type created successfully",
                    "volume_type": {
                        "id": volume_type.id,
                        "name": volume_type.name,
                        "description": volume_type.description,
                        "is_public": volume_type.is_public,
                    },
                },
                status=status.HTTP_201_CREATED,
            )

        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
            

# --------------------------------06 OCT 2025----------------------------



class HostAggregateAPIView(APIView):
    """
    CRUD API for OpenStack Compute Host Aggregates
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, aggregate_id=None):
        """List all aggregates or fetch a single one"""
        try:
            conn = get_openstack_connection()

            if aggregate_id:
                aggregate = conn.compute.get_aggregate(aggregate_id)
                if not aggregate:
                    return Response({"error": "Host aggregate not found"}, status=404)

                # Fetch metadata separately if needed
                metadata = getattr(aggregate, "metadata", {})
                data = {
                    "id": aggregate.id,
                    "name": aggregate.name,
                    "availability_zone": getattr(aggregate, "availability_zone", ""),
                    "hosts": getattr(aggregate, "hosts", []),
                    "metadata": metadata
                }
            else:
                aggregates = conn.compute.aggregates()
                data = []
                for aggr in aggregates:
                    data.append({
                        "id": aggr.id,
                        "name": aggr.name,
                        "availability_zone": getattr(aggr, "availability_zone", ""),
                        "hosts": getattr(aggr, "hosts", []),
                        "metadata": getattr(aggr, "metadata", {})
                    })

            return Response({"status": "success", "data": data}, status=200)

        except Exception as e:
            return Response({"error": str(e)}, status=500)

    def post(self, request):
        """Create a new host aggregate"""
        try:
            conn = get_openstack_connection()
            name = request.data.get("name")
            availability_zone = request.data.get("availability_zone", None)
            metadata = request.data.get("metadata", {})

            if not name:
                return Response({"error": "Name is required"}, status=400)

            existing_aggregates = conn.compute.aggregates()
            if any(aggr.name == name for aggr in existing_aggregates):
                return Response({"error": f"Host aggregate with name '{name}' already exists"}, status=400)

            # Step 1: Create aggregate WITHOUT metadata
            aggregate = conn.compute.create_aggregate(
                name=name,
                availability_zone=availability_zone
            )
            # Step 2: Set metadata separately
            if metadata:
                conn.compute.post(
                    f"/os-aggregates/{aggregate.id}/action",
                    json={"set_metadata": {"metadata": metadata}}
                )
                
            return Response({
                "status": "success",
                "message": "Host aggregate created successfully",
                "data": {
                    "id": aggregate.id,
                    "name": aggregate.name,
                    "availability_zone": getattr(aggregate, "availability_zone", ""),
                    "metadata": getattr(aggregate, "metadata", {})
                }
            }, status=201)

        except Exception as e:
            return Response({"error": str(e)}, status=500)

    def put(self, request, aggregate_id):
        """Update a host aggregate — name, availability zone, and metadata"""
        try:
            conn = get_openstack_connection()
            aggregate = conn.compute.get_aggregate(aggregate_id)
            if not aggregate:
                return Response({"error": "Host aggregate not found"}, status=404)

            name = request.data.get("name")
            availability_zone = request.data.get("availability_zone")
            metadata = request.data.get("metadata")

            # Step 1: Update name and AZ
            if name or availability_zone:
                conn.compute.update_aggregate(aggregate_id, name=name, availability_zone=availability_zone)

            # Step 2: Update metadata using POST action API
            if metadata is not None:
                conn.compute.post(
                    f"/os-aggregates/{aggregate_id}/action",
                    json={"set_metadata": {"metadata": metadata}}
                )

            return Response({
                "status": "success",
                "message": f"Host aggregate {aggregate_id} updated successfully"
            }, status=200)

        except Exception as e:
            return Response({"error": str(e)}, status=500)


    def delete(self, request, aggregate_id):
        """Delete a host aggregate"""
        try:
            conn = get_openstack_connection()
            conn.compute.delete_aggregate(aggregate_id, ignore_missing=False)
            return Response({
                "status": "success",
                "message": f"Host aggregate {aggregate_id} deleted successfully"
            }, status=204)
        except Exception as e:
            return Response({"error": str(e)}, status=500)


class HostAggregateActionsView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, aggregate_id):
        try:
            conn = get_openstack_connection()
            action = request.data.get("action")
            host = request.data.get("host")

            if not action or not host:
                return Response({"error": "Both 'action' and 'host' are required"}, status=400)

            if action == "add":
                try:
                    conn.compute.add_host_to_aggregate(aggregate_id, host)
                    message = f"Host '{host}' added to aggregate {aggregate_id}"
                    status_code = 200
                except ConflictException as ce:
                    return Response({
                        "error": str(ce),
                        "message": "Cannot add host due to running instances or AZ conflict. Move or stop instances first."
                    }, status=409)

            elif action == "remove":
                conn.compute.remove_host_from_aggregate(aggregate_id, host)
                message = f"Host '{host}' removed from aggregate {aggregate_id}"
                status_code = 200
            else:
                return Response({"error": "Invalid action. Use 'add' or 'remove'."}, status=400)

            return Response({"status": "success", "message": message}, status=status_code)

        except Exception as e:
            return Response({"error": str(e)}, status=500)


# ---------------------------------------------------------------
# 1️⃣ Hypervisors API — compute/hypervisors/
# ---------------------------------------------------------------

class AllHypervisorsView(APIView):
    """
    Fetch all hypervisors from OpenStack Compute in formatted numeric style
    """

    def format_gb(self, value_in_mb):
        """Convert MB to GB and format nicely"""
        if value_in_mb is None:
            return "0 GB"
        return f"{value_in_mb / 1024:.1f} GB"

    def get(self, request):
        try:
            conn = get_openstack_connection()
            response = conn.compute.get("/os-hypervisors/detail")
            data = response.json()

            if "hypervisors" not in data:
                return Response(
                    {"error": "No hypervisor data returned"},
                    status=status.HTTP_404_NOT_FOUND
                )

            hypervisors = []
            for hv in data["hypervisors"]:
                ram_used = self.format_gb(hv.get("memory_mb_used"))
                ram_total = self.format_gb(hv.get("memory_mb"))
                storage_used = f"{hv.get('local_gb_used', 0):.1f} GB"
                storage_total = f"{hv.get('local_gb', 0):.1f} GB"

                hypervisors.append({
                    "hostname": hv.get("hypervisor_hostname"),
                    "type": hv.get("hypervisor_type"),
                    "ram_used": ram_used,
                    "ram_total": ram_total,
                    "local_storage_used": storage_used,
                    "local_storage_total": storage_total,
                    "running_instances": hv.get("running_vms"),
                    "vcpus_used": hv.get("vcpus_used"),
                    "vcpus_total": hv.get("vcpus"),
                    "status": hv.get("status"),
                    "state": hv.get("state"),
                    "host_ip": hv.get("host_ip"),
                })

            return Response({
                "status": "success",
                "count": len(hypervisors),
                "data": hypervisors
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# ---------------------------------------------------------------
# 2️⃣ Compute Hosts API — compute/hosts/
# ---------------------------------------------------------------
class ComputeHostAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """List compute hosts with availability zone, state, status, etc."""
        try:
            conn = get_openstack_connection()
            services = conn.compute.services()

            data = []
            for s in services:
                if s.binary == "nova-compute":  # Filter compute services only
                    data.append({
                        "host": s.host,
                        "availability_zone": getattr(s, "zone", ""),
                        "status": s.status,
                        "state": s.state,
                        "last_updated": getattr(s, "updated_at", ""),
                        "action": "disable service" if s.status == "enabled" else "enable service"
                    })

            return Response({"status": "success", "data": data}, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def post(self, request):
        """Enable/Disable compute host service"""
        try:
            conn = get_openstack_connection()
            host_name = request.data.get("host")
            action = request.data.get("action")  # 'enable' or 'disable'

            if not host_name or action not in ["enable", "disable"]:
                return Response({"error": "Host and valid action required"}, status=status.HTTP_400_BAD_REQUEST)

            if action == "enable":
                conn.compute.enable_service(host_name, binary="nova-compute")
            else:
                conn.compute.disable_service(host_name, binary="nova-compute")

            return Response({
                "status": "success",
                "message": f"Host {host_name} {action}d successfully"
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ---------------------------------------------------------------
# 3️⃣ Resource Provider API — compute/resource-providers/
# ---------------------------------------------------------------
class ResourceProviderAPIView(APIView):
    """
    Fetch Resource Providers with metrics including reserved resources, formatted
    """

    def format_size(self, value_mb):
        """Format memory/disk in MB/GB"""
        if value_mb is None:
            return "0 MB"
        if value_mb >= 1024:
            return f"{value_mb / 1024:.1f} GB"
        return f"{value_mb} MB"

    def get(self, request):
        try:
            conn = get_openstack_connection()
            rps = list(conn.placement.resource_providers())
            data = []

            for rp in rps:
                # Inventories
                inv_resp = conn.placement.get(f"/resource_providers/{rp.id}/inventories").json()
                inv = inv_resp.get("inventories", {})

                # Usages
                try:
                    usages_resp = conn.placement.get(f"/resource_providers/{rp.id}/usages").json()
                    usages = usages_resp.get("usages", {})
                except Exception:
                    usages = {}

                # Reserved values from inventories
                vcpus_reserved = inv.get("VCPU", {}).get("reserved", 0)
                pcpus_reserved = inv.get("PCPU", {}).get("reserved", 0)
                ram_reserved_mb = inv.get("MEMORY_MB", {}).get("reserved", 0)
                disk_reserved_gb = inv.get("DISK_GB", {}).get("reserved", 0)

                # Format RAM/Disk
                ram_used = self.format_size(usages.get("MEMORY_MB", 0))
                ram_total = self.format_size(inv.get("MEMORY_MB", {}).get("total", 0))
                ram_reserved = self.format_size(ram_reserved_mb)

                disk_used = self.format_size(usages.get("DISK_GB", 0) * 1024)
                disk_total = self.format_size(inv.get("DISK_GB", {}).get("total", 0) * 1024)
                disk_reserved = self.format_size(disk_reserved_gb * 1024)

                data.append({
                    "resource_provider_name": rp.name,
                    # VCPUs
                    "vcpus_used": usages.get("VCPU", 0),
                    "vcpus_reserved": vcpus_reserved,
                    "vcpus_total": inv.get("VCPU", {}).get("total", 0),
                    "vcpus_allocation_ratio": inv.get("VCPU", {}).get("allocation_ratio", 1.0),
                    # PCPUs
                    "pcpus_used": usages.get("PCPU", 0),
                    "pcpus_reserved": pcpus_reserved,
                    "pcpus_total": inv.get("PCPU", {}).get("total", 0),
                    "pcpus_allocation_ratio": inv.get("PCPU", {}).get("allocation_ratio", 1.0),
                    # RAM
                    "ram_used": ram_used,
                    "ram_reserved": ram_reserved,
                    "ram_total": ram_total,
                    "ram_allocation_ratio": inv.get("MEMORY_MB", {}).get("allocation_ratio", 1.0),
                    # Disk
                    "disk_used": disk_used,
                    "disk_reserved": disk_reserved,
                    "disk_total": disk_total,
                    "disk_allocation_ratio": inv.get("DISK_GB", {}).get("allocation_ratio", 1.0)
                })

            return Response({"status": "success", "data": data}, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)



#------------------7 oct 2025-------------------------------





class ApplicationCredentialAPIView(APIView):
    """
    API for managing OpenStack Identity Application Credentials.
    Supports:
      ➤ GET    - List all application credentials
      ➤ POST   - Create a new credential
      ➤ DELETE - Delete by ID (passed in URL)
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """List all application credentials for the current user."""
        try:
            conn = get_openstack_connection()
            credentials = conn.identity.application_credentials(user=conn.current_user_id)

            result = []
            for cred in credentials:
                result.append({
                    "name": cred.name,
                    "project_id": getattr(cred, "project_id", "-"),
                    "description": getattr(cred, "description", "-") or "-",
                    "expiration": getattr(cred, "expires_at", "-"),
                    "id": cred.id,
                    "roles": [r.get("name") for r in getattr(cred, "roles", [])],
                    "actions": ["delete"]
                })

            return Response({"status": "success", "data": result}, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def post(self, request):
        """Create a new application credential."""
        try:
            conn = get_openstack_connection()

            name = request.data.get("name")
            description = request.data.get("description", "")
            secret = request.data.get("secret")
            expiration_date = request.data.get("expiration_date")
            expiration_time = request.data.get("expiration_time")
            roles = request.data.get("roles", ["member"])
            unrestricted = request.data.get("unrestricted", False)

            if not name:
                return Response({"error": "'name' is required."}, status=status.HTTP_400_BAD_REQUEST)

            # Combine date + time into ISO format
            expires_at = None
            if expiration_date and expiration_time:
                try:
                    exp_str = f"{expiration_date} {expiration_time}"
                    expires_at = datetime.strptime(exp_str, "%m/%d/%Y %H:%M")
                    expires_at = expires_at.strftime("%Y-%m-%dT%H:%M:%S")
                except ValueError:
                    return Response(
                        {"error": "Invalid date/time format. Use MM/DD/YYYY and HH:MM."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

            # Map role names to actual role objects
            role_objects = []
            for role_name in roles:
                role_obj = conn.identity.find_role(role_name)
                if role_obj:
                    role_objects.append({"id": role_obj.id})
                else:
                    return Response(
                        {"error": f"Role '{role_name}' not found."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

            # Create the application credential
            credential = conn.identity.create_application_credential(
                user=conn.current_user_id,
                name=name,
                secret=secret,
                description=description,
                expires_at=expires_at,
                roles=role_objects,
                unrestricted=unrestricted,
            )

            return Response(
                {
                    "status": "success",
                    "message": f"Application credential '{name}' created successfully.",
                    "data": {
                        "id": credential.id,
                        "name": credential.name,
                        "secret": credential.secret,
                        "expires_at": credential.expires_at,
                    }
                },
                status=status.HTTP_201_CREATED,
            )

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def delete(self, request, id=None):
        """Delete an application credential by ID (passed in URL)."""
        try:
            if not id:
                return Response({"error": "ID is required in the URL."}, status=status.HTTP_400_BAD_REQUEST)

            conn = get_openstack_connection()

            # Delete directly using the user_id + credential_id
            conn.identity.delete_application_credential(
                user=conn.current_user_id,
                application_credential=id,
                ignore_missing=False
            )

            return Response(
                {
                    "status": "success",
                    "message": f"Application credential '{id}' deleted successfully."
                },
                status=status.HTTP_200_OK,
            )

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)



# ---------------------------------------


# class NodeListView(APIView):
#     """
#     Fetch Kubernetes Node details with CPU/Memory requests, limits, and capacities.
#     """

#     def get(self, request):
#         try:
            
#             v1 = get_k8s_client()
#             nodes = v1.list_node()
#             node_metrics = []  # final response list

#             for node in nodes.items:
#                 # ---- Basic Info ----
#                 name = node.metadata.name
#                 labels = node.metadata.labels or {}
#                 created = node.metadata.creation_timestamp

#                 # ---- Node Conditions (Ready/Unknown) ----
#                 conditions = {c.type: c.status for c in node.status.conditions}
#                 ready_status = "True" if conditions.get("Ready") == "True" else "Unknown"

#                 # ---- CPU & Memory Capacity ----
#                 cpu_capacity = node.status.capacity.get("cpu", "0")
#                 mem_capacity = node.status.capacity.get("memory", "0")
#                 # convert memory from Ki to readable form
#                 mem_capacity_bytes = humanfriendly.parse_size(mem_capacity + "i") if mem_capacity.isdigit() == False else mem_capacity

#                 # ---- Requests & Limits ----
#                 # These are typically from metrics API or scheduler stats, so we simulate from allocatable
#                 allocatable = node.status.allocatable
#                 cpu_requests = allocatable.get("cpu", "0")
#                 mem_requests = allocatable.get("memory", "0")

#                 # Convert CPU to millicores
#                 def parse_cpu(cpu_str):
#                     if cpu_str.endswith("m"):
#                         return float(cpu_str[:-1])
#                     return float(cpu_str) * 1000

#                 def parse_memory(mem_str):
#                     try:
#                         return humanfriendly.parse_size(mem_str + "i")
#                     except Exception:
#                         return 0

#                 cpu_req_cores = parse_cpu(cpu_requests)
#                 cpu_limit_cores = 0.0  # placeholder, usually from metrics server
#                 mem_req_bytes = parse_memory(mem_requests)
#                 mem_limit_bytes = 0.0  # placeholder

#                 # ---- Pods running on Node ----
#                 pods = v1.list_pod_for_all_namespaces(field_selector=f"spec.nodeName={name}")
#                 pod_count = len(pods.items)
#                 total_pods_capacity = node.status.capacity.get("pods", "0")

#                 # ---- Format response ----
#                 node_metrics.append({
#                     "name": name,
#                     "labels": labels,
#                     "ready": ready_status,
#                     "cpu_requests_cores": f"{cpu_req_cores}m",
#                     "cpu_limits_cores": f"{cpu_limit_cores}m",
#                     "cpu_capacity_cores": cpu_capacity,
#                     "memory_requests_bytes": mem_req_bytes,
#                     "memory_limits_bytes": mem_limit_bytes,
#                     "memory_capacity_bytes": mem_capacity_bytes,
#                     "pods": f"{pod_count} ({(int(pod_count)/int(total_pods_capacity))*100:.2f}%)",
#                     "created": created.strftime("%b %d, %Y"),
#                 })

#             return Response(node_metrics, status=status.HTTP_200_OK)

#         except Exception as e:
#             return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
# ---------------------------------------10 Nov 2025----------------------------

class NodeDetailAPIView(APIView):
    def get(self, request, name):
        try:
            core_v1, apps_v1, net_v1 = get_k8s_client4()

            # Get Node
            node = core_v1.read_node(name)

            created = node.metadata.creation_timestamp

            # System / kube info
            node_info = node.status.node_info

            # Conditions
            conditions = []
            for cond in node.status.conditions or []:
                conditions.append({
                    "type": cond.type,
                    "status": cond.status,
                    "last_heartbeat_time": cond.last_heartbeat_time,
                    "last_transition_time": cond.last_transition_time,
                    "reason": cond.reason,
                    "message": cond.message
                })

            # Pods running on this node
            pod_list = core_v1.list_pod_for_all_namespaces(field_selector=f"spec.nodeName={name}")
            pods = []
            for p in pod_list.items:
                pods.append({
                    "name": p.metadata.name,
                    "namespace": p.metadata.namespace,
                    "status": p.status.phase,
                    "restarts": sum((cs.restart_count for cs in (p.status.container_statuses or []))),
                    "images": [c.image for c in p.spec.containers],
                    "created": humanize_age(p.metadata.creation_timestamp)
                })

            data = {
                "name": node.metadata.name,
                "created": created.strftime("%b %d, %Y"),
                "age": humanize_age(created),
                "uid": node.metadata.uid,
                "labels": node.metadata.labels or {},
                "annotations": node.metadata.annotations or {},

                "resource": {
                    "cpu_capacity": node.status.capacity.get("cpu", "0"),
                    "memory_capacity": node.status.capacity.get("memory", "0"),
                    "pods_capacity": node.status.capacity.get("pods", "0"),
                },

                "addresses": [
                    {"type": addr.type, "address": addr.address}
                    for addr in node.status.addresses or []
                ],

                "system_info": {
                    "machine_id": node_info.machine_id,
                    "system_uuid": node_info.system_uuid,
                    "boot_id": node_info.boot_id,
                    "kernel_version": node_info.kernel_version,
                    "os_image": node_info.os_image,
                    "container_runtime_version": node_info.container_runtime_version,
                    "kubelet_version": node_info.kubelet_version,
                    "kube_proxy_version": node_info.kube_proxy_version,
                    "operating_system": node_info.operating_system,
                    "architecture": node_info.architecture
                },

                "conditions": conditions,
                "pods": pods,
                "events": []
            }

            return Response(data, status=status.HTTP_200_OK)

        except client.exceptions.ApiException as e:
            return Response({"error": f"Kubernetes API error: {e.reason}"}, status=e.status)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        

class StorageClassListView(APIView):
    """
    Fetch Kubernetes StorageClass details.
    """

    def get(self, request):
        try:
            client = get_k8s_client()
            v1_storage = client.StorageV1Api()
            storage_classes = v1_storage.list_storage_class()

            storage_list = []
            for sc in storage_classes.items:
                name = sc.metadata.name
                provisioner = sc.provisioner
                parameters = sc.parameters or {}
                created = sc.metadata.creation_timestamp

                storage_list.append({
                    "name": name,
                    "provisioner": provisioner,
                    "parameters": parameters,
                    "created": created.strftime("%b %d, %Y"),
                })

            return Response(storage_list, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)