from django.db import models
from django.utils import timezone

# OIDC Integration


class CdVerifierAndNonce(models.Model):
    stateId = models.CharField(max_length=255)
    code_verifier = models.TextField()
    nonce = models.CharField(max_length=255)

    def __str__(self):
        return self.stateId


# OIDC Integration
from django.contrib.auth.models import User

class Employee(models.Model):
    user = models.OneToOneField(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="employee_profile"
    )
    name = models.CharField(max_length=100)
    employee_id = models.CharField(max_length=10, unique=True)
    email = models.EmailField(unique=True)
    group = models.CharField(max_length=50)
    fla_name = models.CharField(max_length=100, null=True, blank=True)
    fla_employee_id = models.CharField(max_length=10, null=True, blank=True)
    fla_email = models.EmailField(null=True, blank=True)
    is_fla = models.BooleanField(default=False)
    phone_number = models.CharField(blank=True, null=True, max_length=15)
    designation = models.CharField(max_length=100, blank=True, null=True)

    def __str__(self):
        return self.employee_id


class CdacProject(models.Model):
    project_name = models.CharField(max_length=255, unique=True)

    def __str__(self):
        return self.project_name


class VmRequest(models.Model):
    name = models.CharField(max_length=100, null=True, blank=True)
    email = models.EmailField(blank=True, null=True)
    employee_id = models.CharField(max_length=10)
    count_of_vms = models.IntegerField(blank=True, null=True)
    vm_name = models.CharField(blank=True, null=True, max_length=255, unique=True)
    purpose = models.CharField(blank=True, null=True, max_length=255)
    designation = models.CharField(blank=True, null=True, max_length=255)
    project_name = models.CharField(blank=True, null=True, max_length=255)
    vdi_required = models.BooleanField(default=False)
    image = models.CharField(max_length=255, blank=True, null=True)
    flavor = models.CharField(max_length=255, blank=True, null=True)
    network_id = models.CharField(max_length=100, null=True, blank=True)
    network_name = models.CharField(max_length=255, null=True, blank=True)
    login_enable_date = models.CharField(blank=True, null=True, max_length=255)
    login_disable_date = models.CharField(blank=True, null=True, max_length=255)
    login_enable_time = models.CharField(blank=True, null=True, max_length=255)
    login_disable_time = models.CharField(blank=True, null=True, max_length=255)
    storage_required = models.BooleanField(default=False)
    additional_storage = models.CharField(max_length=255, blank=True, null=True)
    admin_status = models.CharField(max_length=255, blank=True, null=True)
    fla_status = models.CharField(max_length=255, blank=True, null=True)
    purpose_of_request = models.TextField(blank=True, null=True)
    request_timestamp = models.DateTimeField(null=True, blank=True)
    fla_approved_timestamp = models.DateTimeField(null=True, blank=True)
    admin_approved_timestamp = models.DateTimeField(null=True, blank=True)
    admin_action_timestamp = models.DateTimeField(null=True, blank=True)
    creation_status = models.TextField(blank=True, null=True)
    fla_rejection_reason = models.TextField(blank=True, null=True)
    admin_rejection_reason = models.TextField(blank=True, null=True)
    creation_error_message = models.TextField(blank=True, null=True)
    

    def __str__(self):
        return self.vm_name
 
    


class VMInfo(models.Model):
    vm_name = models.CharField(max_length=255, blank=True, null=True, unique=True)
    vm_id = models.CharField(max_length=255, blank=True, null=True)
    shutoff_status = models.BooleanField(blank=True, null=True, default=False)
    host_name = models.CharField(max_length=255, blank=True, null=True)
    instance_name = models.CharField(max_length=255, blank=True, null=True)
    vnc_display = models.IntegerField(blank=True, null=True)
    connection_id = models.CharField(max_length=100, null=True, blank=True)
    username = models.CharField(max_length=255, blank=True, null=True)
    ip = models.CharField(max_length=255, blank=True, null=True, default="")
    vm_access_from_date = models.CharField(max_length=255, blank=True, null=True)
    vm_access_to_date = models.CharField(max_length=255, blank=True, null=True)
    vm_access_from_time = models.CharField(max_length=255, blank=True, null=True)
    vm_access_to_time = models.CharField(max_length=255, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    requested_by = models.CharField(max_length=255, blank=True, null=True)
    creation_status = models.CharField(max_length=255, blank=True, null=True)
    remarks = models.CharField(max_length=255, blank=True, null=True)
    volume_id = models.CharField(max_length=255, blank=True, null=True)
    delete_request_status = models.CharField(max_length=20, default="None")
    delete_request_reason = models.TextField(null=True, blank=True)

    def __str__(self):
        return f"{self.vm_name} - {self.host_name}"


class Metric(models.Model):
    name = models.CharField(max_length=255)
    value = models.FloatField()
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name}: {self.value}"


class UserRegistrationRequest(models.Model):
    STATUS_CHOICES = [
        ("Pending", "Pending"),
        ("Accepted", "Accepted"),
        ("Rejected", "Rejected"),
    ]

    USER_TYPE_CHOICES = [("Employee", "Employee"), ("FLA", "FLA")]

    employee_id = models.CharField(max_length=50)
    name = models.CharField(max_length=100)
    email = models.EmailField()
    user_type = models.CharField(max_length=20, choices=USER_TYPE_CHOICES)
    fla_employee_id = models.CharField(max_length=50, null=True, blank=True)

    fla_status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default="Pending"
    )
    admin_status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default="Pending"
    )

    temporary_password = models.CharField(max_length=128, null=True, blank=True)

    request_timestamp = models.DateTimeField(auto_now_add=True)
    fla_approved_timestamp = models.DateTimeField(null=True, blank=True)
    admin_approved_timestamp = models.DateTimeField(null=True, blank=True)

    fla_rejection_reason = models.TextField(null=True, blank=True)
    admin_rejection_reason = models.TextField(null=True, blank=True)


class Registration(models.Model):
    full_name = models.CharField(blank=True, null=True, max_length=255)
    organization = models.CharField(blank=True, null=True, max_length=255)
    designation = models.CharField(blank=True, null=True, max_length=255)
    email = models.EmailField(blank=True, null=True)
    phone_number = models.CharField(blank=True, null=True, max_length=15)
    password = models.CharField(blank=True, null=True, max_length=255)
    confirm_password = models.CharField(blank=True, null=True, max_length=255)
    vdi_required = models.BooleanField(default=False)
    image = models.CharField(max_length=255, blank=True, null=True)
    flavor = models.CharField(max_length=255, blank=True, null=True)
    login_enable_date = models.CharField(blank=True, null=True, max_length=255)
    login_disable_date = models.CharField(blank=True, null=True, max_length=255)
    login_enable_time = models.CharField(blank=True, null=True, max_length=255)
    login_disable_time = models.CharField(blank=True, null=True, max_length=255)
    storage_required = models.BooleanField(default=False)
    additional_storage = models.CharField(max_length=255, blank=True, null=True)

    def __str__(self):
        return self.full_name


class ImageRecord(models.Model):
    name = models.CharField(max_length=255)
    file_path = models.CharField(max_length=500)
    image_id = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.name




def ticket_attachment_upload_path(instance, filename):
    return f"ticket_attachments/{instance.id}/{filename}"


def ticket_attachment_upload_path(instance, filename):
    return f"ticket_attachments/{instance.id}/{filename}"


class Ticket(models.Model):
    STATUS_CHOICES = [
        ("Open", "Open"),
        ("In Progress", "In Progress"),
        ("Closed", "Closed"),
    ]

    # Link to Employee
    employee = models.ForeignKey(
        "Employee", on_delete=models.CASCADE, related_name="tickets"
    )
    issue = models.CharField(max_length=255)
    description = models.TextField()
    attachment = models.FileField(
        upload_to=ticket_attachment_upload_path, blank=True, null=True
    )
    created_at = models.DateTimeField(auto_now_add=True)

    # Admin side
    solution = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="Open")
    status_updated_at = models.DateTimeField(auto_now=True)
    closed_at = models.DateTimeField(blank=True, null=True)

    def __str__(self):
        return f"Ticket #{self.id} - {self.issue} by {self.employee.name}"


class ServiceRequest(models.Model):
    STATUS_CHOICES = (
        ("Pending", "Pending"),
        ("Accepted", "Accepted"),
        ("Rejected", "Rejected"),
    )

    employee_id = models.CharField(max_length=100)
    service_name = models.CharField(max_length=255)
    purpose = models.TextField(blank=True, null=True)
    project_name = models.CharField(max_length=255)
    designation = models.CharField(max_length=100)
    name = models.CharField(max_length=255)  # requester's name
    email = models.EmailField()
    purpose_of_request = models.TextField(blank=True, null=True)

    # Status fields
    admin_status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default="Pending"
    )
    fla_status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default="Pending"
    )

    # Timestamp fields
    request_timestamp = models.DateTimeField(default=timezone.now)
    fla_approved_timestamp = models.DateTimeField(null=True, blank=True)
    admin_approved_timestamp = models.DateTimeField(null=True, blank=True)

    # Service specific fields
    service_start_date = models.DateField(blank=True, null=True)
    service_end_date = models.DateField(blank=True, null=True)
    service_requirements = models.TextField(blank=True, null=True)
    additional_notes = models.TextField(blank=True, null=True)

    fla_rejection_reason = models.TextField(null=True, blank=True)
    admin_rejection_reason = models.TextField(null=True, blank=True)
    fla_action_timestamp = models.DateTimeField(null=True, blank=True)
    admin_action_timestamp = models.DateTimeField(null=True, blank=True)

    # MongoDB specific fields (only used when service_name is 'mongo' or 'mongodb')
    app_name = models.CharField(max_length=100, blank=True, null=True)
    replica = models.IntegerField(blank=True, null=True)
    root_password = models.CharField(max_length=100, blank=True, null=True)
    username = models.CharField(max_length=100, blank=True, null=True)
    password = models.CharField(max_length=100, blank=True, null=True)
    database = models.CharField(max_length=100, blank=True, null=True)
    node_port = models.IntegerField(blank=True, null=True)

    # Deployment status
    deployment_status = models.CharField(
        max_length=20, default="Not Deployed"
    )  # Not Deployed, Deploying, Deployed, Failed
    # Add these to your ServiceRequest model
    delete_request_status = models.CharField(
        max_length=20, 
        choices=(("Pending", "Pending"), ("Approved", "Approved"), ("Rejected", "Rejected")), 
        null=True, blank=True
    )
    delete_request_reason = models.TextField(null=True, blank=True)

    def __str__(self):
        return f"{self.employee_id} - {self.service_name}"


class DeletedVMLog(models.Model):
    # ───────── User / Employee Details ─────────
    name = models.CharField(max_length=100, null=True, blank=True)
    email = models.EmailField(blank=True, null=True)
    employee_id = models.CharField(max_length=10, blank=True, null=True)
    designation = models.CharField(max_length=255, blank=True, null=True)
    requested_by = models.CharField(max_length=255, blank=True, null=True)

    # ───────── VM Details ─────────
    vm_name = models.CharField(max_length=255, blank=True, null=True)
    vm_id = models.CharField(max_length=255, blank=True, null=True, db_index=True)
    instance_name = models.CharField(max_length=255, blank=True, null=True)
    host_name = models.CharField(max_length=255, blank=True, null=True)
    ip = models.CharField(max_length=255, blank=True, null=True, default="")
    vnc_display = models.IntegerField(blank=True, null=True)
    shutoff_status = models.BooleanField(default=False)

    # ───────── Storage ─────────
    volume_id = models.CharField(max_length=255, blank=True, null=True)
    data_volume_id = models.CharField(max_length=255, blank=True, null=True)
    storage_required = models.BooleanField(default=False)
    additional_storage = models.CharField(max_length=255, blank=True, null=True)

    # ───────── Flavor & Image ─────────
    flavor = models.CharField(max_length=255, blank=True, null=True)
    image = models.CharField(max_length=255, blank=True, null=True)

    # ───────── Project & Purpose ─────────
    project_name = models.CharField(max_length=255, blank=True, null=True)
    purpose = models.CharField(max_length=255, blank=True, null=True)
    purpose_of_request = models.TextField(blank=True, null=True)

    # ───────── Admin/Fla Approval & Status ─────────
    admin_status = models.CharField(max_length=255, blank=True, null=True)
    fla_status = models.CharField(max_length=255, blank=True, null=True)
    creation_status = models.CharField(max_length=255, blank=True, null=True)
    fla_rejection_reason = models.TextField(blank=True, null=True)
    admin_rejection_reason = models.TextField(blank=True, null=True)
    creation_error_message = models.TextField(blank=True, null=True)

    # ───────── Access Timing ─────────
    vm_access_from_date = models.CharField(max_length=255, blank=True, null=True)
    vm_access_to_date = models.CharField(max_length=255, blank=True, null=True)
    vm_access_from_time = models.CharField(max_length=255, blank=True, null=True)
    vm_access_to_time = models.CharField(max_length=255, blank=True, null=True)
    login_enable_date = models.CharField(max_length=255, blank=True, null=True)
    login_disable_date = models.CharField(max_length=255, blank=True, null=True)
    login_enable_time = models.CharField(max_length=255, blank=True, null=True)
    login_disable_time = models.CharField(max_length=255, blank=True, null=True)

    # ───────── Request + Delete Details ─────────
    request_timestamp = models.DateTimeField(null=True, blank=True)
    fla_approved_timestamp = models.DateTimeField(null=True, blank=True)
    admin_approved_timestamp = models.DateTimeField(null=True, blank=True)
    delete_request_status = models.CharField(max_length=20, default="None")
    delete_request_reason = models.TextField(blank=True, null=True)
    delete_approved_by = models.CharField(max_length=255, blank=True, null=True)
    delete_approved_at = models.DateTimeField(auto_now_add=True)

    # ───────── Misc ─────────
    remarks = models.CharField(max_length=255, blank=True, null=True)
    count_of_vms = models.IntegerField(blank=True, null=True)
    zabbix_hostid = models.IntegerField(blank=True, null=True)
    deleted_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.vm_name} deleted"
