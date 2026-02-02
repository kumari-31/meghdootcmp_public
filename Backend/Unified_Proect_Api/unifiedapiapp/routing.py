from django.urls import re_path
from .pod_exec import PodExecConsumer
from .vm_exec import VMExecConsumer

websocket_urlpatterns = [
    re_path(r"ws/pods/exec/$", PodExecConsumer.as_asgi()),
    re_path(r"ws/vm/exec/$", VMExecConsumer.as_asgi()),
]
