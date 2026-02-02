import json
import asyncio
from channels.generic.websocket import AsyncWebsocketConsumer
from kubernetes.stream import stream
from .k8s_utils import get_k8s_client


class PodExecConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.exec_stream = None
        await self.accept()
        print("✅ WebSocket connected")

    async def receive(self, text_data=None, bytes_data=None):
        if text_data:
            # Check if it's a JSON control message (metadata or resize)
            if text_data.startswith('{'):
                try:
                    data = json.loads(text_data)
                    
                    # Handle Resize
                    if data.get("type") == "resize":
                        if self.exec_stream and self.exec_stream.is_open():
                            self.exec_stream.write_channel(4, json.dumps({
                                "Height": data["rows"],
                                "Width": data["cols"]
                            }))
                        return

                    # Handle Metadata (First connection)
                    if "namespace" in data:
                        await self.start_exec(data)
                        return
                except json.JSONDecodeError:
                    # If it starts with { but isn't valid JSON, treat it as shell input
                    pass

            # If it's not a control message, it's shell input
            if self.exec_stream and self.exec_stream.is_open():
                self.exec_stream.write_stdin(text_data)

    async def start_exec(self, data):
        namespace = data["namespace"]
        selector = data["pod_selector"]
        requested_container = data.get("container") 

        core_v1 = get_k8s_client()
        pod_name = None
        actual_pod = None

        # 1. Locate the Pod (Handle both label-dict or name-string)
        if isinstance(selector, dict):
            label_selector = ",".join(f"{k}={v}" for k, v in selector.items())
            pods = core_v1.list_namespaced_pod(namespace=namespace, label_selector=label_selector)
            if not pods.items:
                await self.send("❌ No pod found for labels\n")
                return
            actual_pod = pods.items[0]
            pod_name = actual_pod.metadata.name
        else:
            pod_name = selector
            try:
                actual_pod = core_v1.read_namespaced_pod(name=pod_name, namespace=namespace)
            except Exception as e:
                await self.send(f"❌ Pod not found: {pod_name}\n")
                return

        # 2. VALIDATE CONTAINER (The Fix for the 400 Error)
        # Get a list of all valid container names in this pod
        valid_containers = [c.name for c in actual_pod.spec.containers]
        container_name = None

        if requested_container in valid_containers:
        # Perfect match found
            container_name = requested_container
        else:
            # Check for partial matches (e.g., if label is 'dcmpr' and container is 'dcmpr-deploy')
            partial_match = next((c for c in valid_containers if requested_container in c or c in requested_container), None)
            
            if partial_match:
                container_name = partial_match
                # We don't even need to warn the user if it's a logical match
            else:
                # No match at all, use the first one available
                container_name = valid_containers[0]
                if requested_container and len(valid_containers) > 1:
                    await self.send(f"⚠️ Container '{requested_container}' not found. Using '{container_name}'\n")

        print(f"🚀 Executing: pod={pod_name}, container={container_name}")

        # 3. Start the stream with the validated container_name
        try:
            self.exec_stream = stream(
                core_v1.connect_get_namespaced_pod_exec,
                pod_name,
                namespace,
                container=container_name,
                command=["/bin/sh", "-c", "TERM=xterm-256color; [ -x /bin/bash ] && exec /bin/bash || exec /bin/sh"],
                stdin=True, stdout=True, stderr=True, tty=True,
                _preload_content=False,
            )
            asyncio.create_task(self.read_stream())
        except Exception as e:
            await self.send(f"❌ Kubernetes Exec Failed: {str(e)}\n")

    async def read_stream(self):
        while self.exec_stream and self.exec_stream.is_open():
            self.exec_stream.update(timeout=1)

            if self.exec_stream.peek_stdout():
                await self.send(self.exec_stream.read_stdout())

            if self.exec_stream.peek_stderr():
                await self.send(self.exec_stream.read_stderr())

            await asyncio.sleep(0.01)

    async def disconnect(self, close_code):
        if self.exec_stream:
            self.exec_stream.close()
        print("❌ WebSocket disconnected")
