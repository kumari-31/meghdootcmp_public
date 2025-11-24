from django.contrib import admin
from .models import *

# Register your models here.
admin.site.register([Employee, Registration, Metric, VMInfo, VmRequest,CdacProject,ServiceRequest])
