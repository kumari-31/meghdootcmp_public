# myapp/serializers.py

from datetime import datetime, timedelta

import pyotp
from django.contrib.auth import get_user_model
from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework import serializers
from rest_framework.exceptions import AuthenticationFailed, ValidationError
from rest_framework_simplejwt.serializers import (
    TokenObtainPairSerializer,
    TokenRefreshSerializer,
)
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView
from .models import VMInfo, Registration, Metric, Employee, VmRequest, CdacProject, ServiceRequest
from .models import (
    VMInfo, 
    Registration, 
    Metric, 
    Employee, 
    VmRequest, 
    CdacProject, 
    ServiceRequest
)

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    class Meta(object):
        model = User
        fields = ["id", "username", "password", "email"]


class VMInfoSerializer(serializers.ModelSerializer):
    class Meta:
        model = VMInfo
        fields = "__all__"


class RegistrationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Registration
        fields = "__all__"

    def validate(self, data):
        # Custom validation to ensure passwords match
        if data["password"] != data["confirm_password"]:
            raise serializers.ValidationError("Passwords do not match")
        return data


# Combined serializer for handling the form
class CombinedFormSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=255)
    organization = serializers.CharField(max_length=255)
    designation = serializers.CharField(max_length=255)
    email = serializers.EmailField()
    phone_number = serializers.CharField(max_length=15)
    password = serializers.CharField(max_length=255)
    confirm_password = serializers.CharField(max_length=255)
    vdi_required = serializers.BooleanField()
    image = serializers.CharField(max_length=255)
    flavor = serializers.CharField(max_length=255)
    login_enable_date = serializers.CharField(max_length=255)
    login_disable_date = serializers.CharField(max_length=255)
    login_enable_time = serializers.CharField(max_length=255)
    login_disable_time = serializers.CharField(max_length=255)
    storage_required = serializers.BooleanField()
    additional_storage = serializers.CharField(max_length=255)

    vm_name = serializers.CharField(max_length=255)
    vm_id = serializers.CharField(max_length=255)
    shutoff_status = serializers.BooleanField()
    host_name = serializers.CharField(max_length=255)
    instance_name = serializers.CharField(max_length=255)
    vnc_display = serializers.IntegerField()
    username = serializers.CharField(max_length=255)
    ip = serializers.CharField(max_length=255)
    vm_access_from_date = serializers.CharField(max_length=255)
    vm_access_to_date = serializers.CharField(max_length=255)
    vm_access_from_time = serializers.CharField(max_length=255)
    vm_access_to_time = serializers.CharField(max_length=255)
    requested_by = serializers.CharField(max_length=255)
    creation_status = serializers.CharField(max_length=255)
    remarks = serializers.CharField(max_length=255)
    volume_id = serializers.CharField(max_length=255)
    data_volume_id = serializers.CharField(max_length=255)

    # Method to handle saving to both models
    def save(self):
        # Save the data to Registration model
        registration_data = {
            "full_name": self.validated_data.get("full_name"),
            "organization": self.validated_data.get("organization"),
            "designation": self.validated_data.get("designation"),
            "email": self.validated_data.get("email"),
            "phone_number": self.validated_data.get("phone_number"),
            "password": self.validated_data.get("password"),
            "confirm_password": self.validated_data.get("confirm_password"),
            "vdi_required": self.validated_data.get("vdi_required"),
            "image": self.validated_data.get("image"),
            "flavor": self.validated_data.get("flavor"),
            "login_enable_date": self.validated_data.get("login_enable_date"),
            "login_disable_date": self.validated_data.get("login_disable_date"),
            "login_enable_time": self.validated_data.get("login_enable_time"),
            "login_disable_time": self.validated_data.get("login_disable_time"),
            "storage_required": self.validated_data.get("storage_required"),
            "additional_storage": self.validated_data.get("additional_storage"),
        }
        registration = Registration.objects.create(**registration_data)

        # Save the data to VMInfo model
        vm_info_data = {
            "vm_name": self.validated_data.get("vm_name"),
            "vm_id": self.validated_data.get("vm_id"),
            "shutoff_status": self.validated_data.get("shutoff_status"),
            "host_name": self.validated_data.get("host_name"),
            "instance_name": self.validated_data.get("instance_name"),
            "vnc_display": self.validated_data.get("vnc_display"),
            "username": self.validated_data.get("username"),
            "ip": self.validated_data.get("ip"),
            "vm_access_from_date": self.validated_data.get("vm_access_from_date"),
            "vm_access_to_date": self.validated_data.get("vm_access_to_date"),
            "vm_access_from_time": self.validated_data.get("vm_access_from_time"),
            "vm_access_to_time": self.validated_data.get("vm_access_to_time"),
            "email": registration.email,  # Link to Registration email
            "requested_by": self.validated_data.get("requested_by"),
            "creation_status": self.validated_data.get("creation_status"),
            "remarks": self.validated_data.get("remarks"),
            "volume_id": self.validated_data.get("volume_id"),
            "data_volume_id": self.validated_data.get("data_volume_id"),
        }
        VMInfo.objects.create(**vm_info_data)


class FlavorSerializer(serializers.Serializer):
    id = serializers.CharField()
    name = serializers.CharField()
    ram = serializers.CharField()
    vcpus = serializers.IntegerField()
    disk = serializers.IntegerField()
    swap = serializers.IntegerField(allow_null=True)
    ephemeral = serializers.IntegerField(allow_null=True)
    public = serializers.BooleanField()
    metadata = serializers.CharField()


class ImageSerializer(serializers.Serializer):
    id = serializers.CharField()
    name = serializers.CharField()
    status = serializers.CharField()
    visibility = serializers.CharField()
    size = serializers.FloatField()
    min_disk = serializers.IntegerField()
    min_ram = serializers.IntegerField()
    created_at = serializers.DateTimeField()
    updated_at = serializers.DateTimeField()


class MetricSerializer(serializers.ModelSerializer):
    class Meta:
        model = Metric
        fields = "__all__"


class CombinedDataSerializer(serializers.Serializer):
    id = serializers.CharField()  # Combined id from VMInfo and Registration
    name = serializers.CharField()  # Full name from Registration
    email = serializers.EmailField()  # Email from Registration
    designation = serializers.CharField()  # Designation from Registration
    image = serializers.CharField()  # Image from Registration
    flavor = serializers.CharField()  # Flavor from Registration
    vdi_required = serializers.BooleanField()  # VDI requirement from Registration
    creation_status = serializers.CharField()  # Creation status from VMInfo


class EmployeeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Employee
        fields = [
            "name",
            "employee_id",
            "email",
            "phone_number",
            "group",
            "fla_name",
            "fla_email",
            "fla_employee_id",
        ]

    def validate_email(self, value):
        if Employee.objects.filter(email=value).exists():
            raise serializers.ValidationError(
                "An employee with this email already exists."
            )
        return value


class EmployeeUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Employee
        fields = ["phone_number", "designation"]

    


# class TicketSerializer(serializers.ModelSerializer):
#     employee_name = serializers.CharField(source="employee.name", read_only=True)
#     employee_email = serializers.EmailField(source="employee.email", read_only=True)
#     employee_id = serializers.CharField(source="employee.employee_id", read_only=True)

#     class Meta:
#         model = Ticket
#         fields = [
#             "id",
#             "employee_name",
#             "employee_email",
#             "employee_id",
#             "issue",
#             "description",
#             "attachment",
#             "solution",
#             "status",
#             "created_at",
#             "status_updated_at",
#             "closed_at",
#         ]
#         read_only_fields = [
#             "employee_name",
#             "employee_email",
#             "employee_id",
#             "created_at",
#             "status_updated_at",
#             "closed_at",
#         ]


import datetime

# class LoginSerializer(serializers.Serializer):
#     email = serializers.EmailField()
#     password = serializers.CharField(max_length=128, write_only=True)
#     access_token = serializers.CharField(max_length=255, read_only=True)
#     refresh_token = serializers.CharField(max_length=255, read_only=True)

#     def validate(self, data):
#         email = data.get('email', None)
#         password = data.get('password', None)
#         user = User.objects.filter(email=email).first()

#         if user is None:
#             raise serializers.ValidationError('User with this email does not exist')

#         if not user.check_password(password):
#             raise serializers.ValidationError('Incorrect password')

#         # Generate tokens
#         refresh = RefreshToken.for_user(user)

#         # Set the access token expiration to 1 hour
#         access_expiry = datetime.timedelta(hours=1)
#         refresh.access_token.set_exp(lifetime=access_expiry)

#         # Set refresh token expiration to 24 hours
#         refresh.set_exp(lifetime=datetime.timedelta(days=1))

#         # Add additional fields to the payload
#         access_payload = refresh.access_token.payload
#         access_payload.update({
#             'user_id': user.id,
#             'email': user.email,
#             'username': user.username,
#             'iat': int(timezone.now().timestamp()),
#         })

#         # Regenerate the access token with updated payload
#         access_token = str(refresh.access_token)
#         refresh_token = str(refresh)

#         return {
#             'access_token': access_token,
#             'refresh_token': refresh_token,
#         }


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):

        employee = Employee.objects.filter(email=user.email).first()

        role = "ADMIN"
        employee_id = None

        # ------------------------
        # ADMIN
        # ------------------------
        if user.is_staff or user.is_superuser:
            role = "ADMIN"

        # ------------------------
        # EMPLOYEE / FLA
        # ------------------------
        elif employee:
            employee_id = employee.employee_id
            role = "FLA" if employee.is_fla else "EMPLOYEE"

        token = super().get_token(user)

        # Custom claims
        token["email"] = user.email
        token["first_name"] = user.first_name
        token["role"] = role
        token["employee_id"] = employee_id

        return token

    def validate(self, attrs):
        return super().validate(attrs)



class CustomTokenRefreshSerializer(TokenRefreshSerializer):
    def validate(self, attrs):

        refresh = RefreshToken(attrs["refresh"])  # Decode the provided refresh token

        # Create a new refresh token
        new_refresh = RefreshToken.for_user(refresh.user)

        # Generate a new access token
        new_access = new_refresh.access_token

        return {
            "refresh": str(new_refresh),
            "access": str(new_access),
        }


class VmRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = VmRequest
        fields = "__all__"

    def validate_vm_name(self, value):
        # Check if the `vm_name` already exists
        if VmRequest.objects.filter(vm_name=value).exists():
            raise serializers.ValidationError(
                "A VM with this name already exists. Please choose a different name."
            )
        return value


class ProjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = CdacProject
        fields = ["id", "project_name"]


class OTPSerializer(serializers.Serializer):
    otp = serializers.CharField(max_length=6, min_length=6)
    username = serializers.CharField()


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(style={"input_type": "password"})


class ServiceRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceRequest
        fields = "__all__"
