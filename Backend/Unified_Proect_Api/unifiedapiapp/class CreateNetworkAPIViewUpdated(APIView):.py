class CreateNetworkAPIView(APIView):
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
            
            # Validate basic input data
            if not network_name:
                return Response(
                    {"error": "Network name is required."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Validate provider network options based on type
            if provider_network_type:
                if provider_network_type == "flat" and not physical_network:
                    return Response(
                        {"error": "Physical network is required for flat provider network type."},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                elif provider_network_type == "vxlan" and not segmentation_id:
                    return Response(
                        {"error": "Segmentation ID is required for VXLAN provider network type."},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                elif provider_network_type == "vlan" and (not physical_network or not segmentation_id):
                    return Response(
                        {"error": "Both physical network and segmentation ID are required for VLAN provider network type."},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            # Validate subnet data if subnet creation is requested
            if create_subnet:
                if not all([subnet_name, network_address]):
                    return Response(
                        {"error": "Subnet name and network address are required when creating a subnet."},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                if not disable_gateway and not gateway_ip:
                    return Response(
                        {"error": "Gateway IP is required when gateway is not disabled."},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            # Prepare network create arguments
            network_args = {
                "name": network_name,
                "admin_state_up": admin_state_up,
                "shared": shared,
                "is_router_external": external
            }
            
            # Add project ID if provided
            if project_id:
                network_args["project_id"] = project_id
            
            # Add provider network options if provided
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
                
                if not subnet:
                    # Rollback network if subnet creation fails
                    conn.network.delete_network(network.id)
                    return Response(
                        {"error": "Failed to create subnet. Network creation rolled back."},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR
                    )
            
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
                    "enable_dhcp": subnet.enable_dhcp
                }
            
            return Response(response_data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)