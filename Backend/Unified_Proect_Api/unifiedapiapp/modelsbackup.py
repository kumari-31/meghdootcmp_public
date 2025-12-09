from django.db import models

# Create your models here.


class VMInfo(models.Model):
    vm_name = models.CharField(max_length=255, blank=True, null=True)
    vm_id = models.CharField(max_length=255, blank=True, null=True)
    shutoff_status = models.BooleanField(blank=True, null=True, default=False)
    host_name = models.CharField(max_length=255, blank=True, null=True)
    instance_name = models.CharField(max_length=255, blank=True, null=True)
    vnc_display = models.IntegerField(blank=True, null=True)
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
    data_volume_id = models.CharField(max_length=255, blank=True, null=True)

    def __str__(self):
        return f"{self.vm_name} - {self.host_name}"


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


class CollectdMetric(models.Model):
    hostname = models.CharField(max_length=255)
    plugin = models.CharField(max_length=255)
    plugin_instance = models.CharField(max_length=255, blank=True, null=True)
    type = models.CharField(max_length=255)
    type_instance = models.CharField(max_length=255, blank=True, null=True)
    ds_name = models.CharField(max_length=255, blank=True, null=True)
    time = models.DateTimeField()
    interval = models.FloatField()
    value = models.FloatField()
    meta_data = models.JSONField(blank=True, null=True)

    def __str__(self):
        return f"{self.hostname} - {self.plugin} - {self.type} - {self.time}"

    class Meta:
        indexes = [
            models.Index(fields=["hostname"]),
            models.Index(fields=["plugin"]),
            models.Index(fields=["type"]),
            models.Index(fields=["time"]),
        ]
        ordering = ["-time"]


class Metric(models.Model):
    name = models.CharField(max_length=255)
    value = models.FloatField()
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name}: {self.value}"


class Employee(models.Model):
    name = models.CharField(max_length=100)
    employee_id = models.CharField(max_length=10, unique=True)
    email = models.EmailField(unique=True)
    group = models.CharField(max_length=50)
    fla_name = models.CharField(max_length=100)
    fla_employee_id = models.CharField(max_length=10)
    fla_email = models.EmailField(null=True, blank=True)
    phone_number = models.CharField(blank=True, null=True, max_length=15)
    password = models.CharField(blank=True, null=True, max_length=255)
    confirm_password = models.CharField(blank=True, null=True, max_length=255)

    def __str__(self):
        return self.name
