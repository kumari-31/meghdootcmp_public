import json
import asyncio
import paramiko
from channels.generic.websocket import AsyncWebsocketConsumer

class VMExecConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.ssh_client = None
        self.ssh_channel = None
        await self.accept()

    async def receive(self, text_data=None):
        if not text_data: return
        
        try:
            # Handle JSON Control Messages
            if text_data.startswith('{'):
                data = json.loads(text_data)
                if "ip_address" in data:
                    await self.start_ssh(data)
                    return
                if data.get("type") == "resize" and self.ssh_channel:
                    self.ssh_channel.resize_pty(width=data["cols"], height=data["rows"])
                    return

            # Handle Shell Input
            if self.ssh_channel and self.ssh_channel.send_ready():
                self.ssh_channel.send(text_data)
        except Exception as e:
            await self.send(f"\r\n\x1b[31mError: {str(e)}\x1b[0m\r\n")

    async def start_ssh(self, data):
        ip = data["ip_address"]
        user = data.get("user") or "ubuntu" 
        # For CirrOS, it's 'gocirros'. For others, you likely need a key or a real password.
        password = data.get("password") or "gocirros" 

        try:
            self.ssh_client = paramiko.SSHClient()
            self.ssh_client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            
            # Increased timeout slightly for slow network initializations
            self.ssh_client.connect(ip, username=user, password=password, timeout=15)
            
            # Open interactive shell
            self.ssh_channel = self.ssh_client.invoke_shell(
                term='xterm-256color',
                width=data.get("cols", 80),
                height=data.get("rows", 24)
            )
            self.ssh_channel.setblocking(0)
            
            asyncio.create_task(self.read_from_ssh())
            await self.send("\r\n\x1b[32m◈ Connected to OpenStack VM via SSH Proxy\x1b[0m\r\n")
        except Exception as e:
            await self.send(f"\r\n\x1b[31m❌ SSH Failed: {str(e)}\x1b[0m\r\n")

    async def read_from_ssh(self):
        while self.ssh_channel and not self.ssh_channel.closed:
            if self.ssh_channel.recv_ready():
                output = self.ssh_channel.recv(4096).decode('utf-8', 'ignore')
                await self.send(output)
            await asyncio.sleep(0.02)

    async def disconnect(self, close_code):
        if self.ssh_channel: self.ssh_channel.close()
        if self.ssh_client: self.ssh_client.close()