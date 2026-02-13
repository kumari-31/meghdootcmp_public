from datetime import datetime
from pyexpat.errors import messages
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from rest_framework import status
from rest_framework.response import Response
from openstackoperations import *
from .models import Employee, Registration, VMInfo, VmRequest





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
            first_name=first_name,
        )

        print(f"User '{email}' created successfully with ID: {user.id}")
        return user

    except Exception as e:
        print(f"Error creating user: {e}")
        return None

def user_registeration_dashboard(request):

    # if not request.user.is_superuser:
    #     return redirect('/')

    # Fetch images and flavors
    images = list(conn.image.images())
    flavors = list(conn.compute.flavors())

    if request.method == "POST":
        try:
            print("-=-=", request.POST.get("vdi"), request.POST.get("storage"))
            # Retrieve form data from the request
            full_name = request.POST.get("full_name")
            organization = request.POST.get("organization")
            designation = request.POST.get("designation")
            email = request.POST.get("email")
            phone_number = request.POST.get("phone_number")
            password = request.POST.get("password")
            confirm_password = request.POST.get("confirm_password")
            vdi_required = request.POST.get("vdi") == "Yes"
            image = request.POST.get("image", "") if vdi_required else None
            flavor = request.POST.get("flavor", "") if vdi_required else None
            login_enable_time = (
                request.POST.get("login_enable_time", "") if vdi_required else None
            )
            login_disable_time = (
                request.POST.get("login_disable_time", "") if vdi_required else None
            )
            storage_required = request.POST.get("storage") == "Yes"
            additional_storage = request.POST.get("volume_size")

            login_enable_datetime = (
                datetime.strptime(login_enable_time, "%Y-%m-%dT%H:%M")
                if vdi_required and login_enable_time
                else None
            )
            login_disable_datetime = (
                datetime.strptime(login_disable_time, "%Y-%m-%dT%H:%M")
                if vdi_required and login_disable_time
                else None
            )

            # Extract date part and store in separate variables
            login_enable_date = (
                request.POST.get("login_enable_time").split("T")
                if login_enable_datetime
                else ["", ""]
            )
            login_disable_date = (
                request.POST.get("login_disable_time").split("T")
                if login_disable_datetime
                else ["", ""]
            )

            login_enable_date_value = login_enable_date[0]
            login_disable_date_value = login_disable_date[0]

            # Extract time part and store in separate variables
            login_enable_time = (
                login_enable_datetime.time().strftime("%H:%M")
                if login_enable_datetime
                else None
            )
            login_disable_time = (
                login_disable_datetime.time().strftime("%H:%M")
                if login_disable_datetime
                else None
            )


            registration = Registration(
                full_name=full_name,
                organization=organization,
                designation=designation,
                email=email,
                phone_number=phone_number,
                password=password,
                confirm_password=confirm_password,
                vdi_required=vdi_required,
                image=image,
                flavor=flavor,
                login_enable_time=str(login_enable_time),
                login_disable_time=str(login_disable_time),
                login_enable_date=login_enable_date[0],
                login_disable_date=login_disable_date[0],
                storage_required=storage_required,
                additional_storage=additional_storage,
            )
            registration.save()

            create_user = create_user_with_details(full_name, email, password)
            if create_user == None:
                raise Exception("Unable to create user")
            # to do
            # create an volume if user selected
            # save user vm info in model

            VMInfo.objects.create(
                vm_name=full_name,
                vm_access_from_date=login_enable_date_value,
                vm_access_to_date=login_disable_date_value,
                vm_access_from_time=login_enable_time,
                vm_access_to_time=login_disable_time,
                email=email,
                creation_status="Requested",
            )
            print("SAVED TO VMInfo MODEL")
            if not vdi_required:
                messages.success(request, "Created user successfully")
                return redirect("/home/login")

            messages.success(request, "VM Requested successfully")
            return redirect("createvmdash")
        except Exception as e:
            print(f"Error processing file 1519: {e}")
            messages.error(request, str(e))
            # return render(request, 'sign-up.html')
    return render(request, "provision-vm.html", {"images": images, "flavors": flavors})


# -------------------------vm request display--------------------------------------------


def combined_view(request):
    registrations = Registration.objects.all()
    combined_data = []

    for registration in registrations:
        # Filter VMInfo by email and creation_status
        # print(f"Registration Email: {registration.email}")

        vm_infos = VMInfo.objects.filter(
            email=registration.email, creation_status="Requested"
        )
        # print("VM INFO",vm_infos)
        for vm_info in vm_infos:
            combined_data.append(
                {
                    "id": f"{vm_info.id}_{registration.id}",
                    "name": registration.full_name,
                    "email": registration.email,
                    "designation": registration.designation,
                    "image": registration.image,
                    "flavor": registration.flavor,
                    "vdi_required": registration.vdi_required,
                    "creation_status": vm_info.creation_status,
                }
            )
    return render(request, "vm_response_display.html", {"combined_data": combined_data})


# ----------------------------vm request approve--------------------------------------------
def generate_vm_names(base_name, count):
    names = [base_name]  # first VM uses exact name
    for i in range(1, count):
        names.append(f"{base_name}-{i}")
    return names

def get_available_volume_type(preferred_type=None):
    """
    Returns a valid volume type.
    - Uses preferred_type if it exists
    - Otherwise falls back to default / first available
    """
    try:
        volume_types = conn.block_storage.types()
        available_types = [vt.name for vt in volume_types]

        print("Available volume types:", available_types)

        if preferred_type and preferred_type in available_types:
            return preferred_type

        # Fallback priority
        for fallback in ["__DEFAULT__", "default", "lvmdriver-1"]:
            if fallback in available_types:
                return fallback

        # Absolute fallback → first available
        if available_types:
            return available_types[0]

        return None

    except Exception as e:
        print("Error fetching volume types:", e)
        return None


def create_student_boot_volume(conn, volume_name, image_id, size_gb=20, volume_type=None):
    vol = conn.block_storage.create_volume(
        name=volume_name,
        size=size_gb,
        image_id=image_id,
        volume_type=volume_type,
    )

    conn.block_storage.wait_for_status(vol, status="available")
    return vol.id


def create_student_vm_with_volume(conn, name, flavor_id, image_id, network_id):
    try:
        volume_type = get_available_volume_type(None)
        if not volume_type:
            raise Exception("No valid volume type available")

        print("Student VM → using volume type:", volume_type)

        server = conn.compute.create_server(
            name=name,
            flavor_id=flavor_id,
            networks=[{"uuid": network_id}],
            block_device_mapping_v2=[{
                "uuid": image_id,                 # ✅ IMAGE ID
                "source_type": "image",           # ✅ MUST be image
                "destination_type": "volume",     # ✅ Volume target
                "boot_index": 0,
                "volume_size": 20,                # ✅ REQUIRED
                "delete_on_termination": True,
                "volume_type": volume_type,       # ✅ default / lvm / ceph
            }],
        )

        print(f"{name} creation initiated (ID: {server.id})")

        # Wait for server
        server = conn.compute.wait_for_server(server)

        # Fetch attached volume
        attachments = server.attached_volumes
        volume_id = attachments[0]["id"] if attachments else None

        if not volume_id:
            raise Exception("Root volume not attached to student VM")

        return {
            "status": True,
            "server_id": server.id,
            "volume_id": volume_id,
        }

    except Exception as e:
        print("❌ Student VM creation failed:", e)
        return {"status": False, "error": str(e)}


from django.core.mail import send_mail
from django.conf import settings


def send_creation_success_email(user_email, vm_details_list):
    """
    Sends a single summary email listing all newly created VMs with links from settings.
    """
    try:
        if not vm_details_list:
            return

        # Extract basic info
        username = vm_details_list[0].get("username", "User")
        vm_count = len(vm_details_list)
        # Use the base VM name for the subject line
        base_vm_name = vm_details_list[0].get("vm_name", "VM")
        
        subject = f"VM Creation Successful - {base_vm_name} ({vm_count} units) Ready"
        
        # Build the list of VMs for the email body
        vm_list_text = ""
        for vm in vm_details_list:
            vm_list_text += f"- VM Name: {vm['vm_name']}\n"

        # Fetch URL from settings (which pulls from .env)
        dashboard_url = getattr(settings, 'PORTAL_URL', 'MeghdootCMP Portal')

        message = f"""
Dear {username},

Your request for {vm_count} Virtual Machine(s) has been successfully processed and they are now ready for use.

Details of created VMs:
{vm_list_text}

Access Instructions:
1. Login to the MeghdootCMP Dashboard.
2. Navigate to: Openstack > Operations > Approved Request.
3. Use the provided links to access your respective VMs via Guacamole.

Dashboard Link: {dashboard_url}

Login Credentials:
Username: {username}
Password: {username} (Default)

Regards,
Cloud Team
        """

        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [user_email],
            fail_silently=False,
        )
        print(f"✅ Summary email sent to {user_email} for {vm_count} VMs.")

    except Exception as e:
        print(f"❌ Error sending summary email: {e}")


def vm_approve_request(id):
    try:
        print("Inside vm approve request id--->", id)

        vm_req = VmRequest.objects.get(id=int(id))
        print(f"Registration object: {vm_req}")

        print("vm_count====>", vm_req.count_of_vms)
        print("vm_name====>", vm_req.vm_name)

        # Generate multiple VM names based on count_of_vms
        vm_names = generate_vm_names(vm_req.vm_name, vm_req.count_of_vms)
        print("Generated VM Names:", vm_names)


        # Fetch selected network from request
        network_id = vm_req.network_id
        network_name = vm_req.network_name
        if not network_id:
            return {
                "status": False,
                "message": "No network selected for this VM request"
            }

        print("Using network →", network_name, network_id)

        # Establish the OpenStack connection and get flavor and image IDs
        flv_id = conn.compute.find_flavor(vm_req.flavor)
        img_id = conn.compute.find_image(vm_req.image)

        print("flv_id", flv_id.id)
        print("img_id", img_id.id)

        if flv_id is None:
            return Response(
                {
                    "error": "Unable to find flavor ID. Please check the provided flavor."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if img_id is None:
            return Response(
                {"error": "Unable to find image ID. Please check the provided image."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        flavor_id = flv_id.id
        image_id = img_id.id

        # Get employee details
        employee_id = vm_req.vm_name.split("_")[0]
        try:
            employee = Employee.objects.get(employee_id=employee_id)
            employee_email = employee.email
            print(f"Employee Email: {employee_email}")
        except Employee.DoesNotExist:
            print(f"No employee found with employee ID {employee_id}")
            return {
                "status": False,
                "message": f"No employee found with employee ID {employee_id}",
            }

        full_name = employee_email.split("@")[0]
        print(f"Full Name:======= {full_name}")

        # Create a list to store all VM details for each VM to be created
        all_vm_details = []
        for vm_name in vm_names:
            all_vm_details.append({
                "vm_name": vm_name,
                "username": full_name,
                "vm_access_from_date": vm_req.login_enable_date,
                "vm_access_to_date": vm_req.login_disable_date,
                "vm_access_from_time": vm_req.login_enable_time,
                "vm_access_to_time": vm_req.login_disable_time,
                "email": vm_req.email,
            })


        print("VM details for all VMs:", all_vm_details)
        print(
            "========================storageReuired======================================",
            vm_req.storage_required,
        )

        created_vm_ids = []  # List to store IDs of created VMs

        if vm_req.designation != "Student":
            print("Designation----->", vm_req.designation)
            if vm_req.vdi_required:
                print(vm_req.vdi_required)

                # Process each VM name and create corresponding VMs
                for vm_detail in all_vm_details:
                    current_vm_name = vm_detail["vm_name"]

                    # Check if VM already exists in OpenStack
                    existing_server = conn.compute.find_server(current_vm_name)
                    if existing_server:
                        print(f"VM '{current_vm_name}' already exists → skip creation")
                        # Update VMInfo if exists
                        VMInfo.objects.filter(vm_name=current_vm_name).update(
                            vm_id=existing_server.id,
                            ip=update_ip_by_vmname(current_vm_name)
                        )
                        continue
                    
                    volume_name = current_vm_name + "_volume"
                    print(
                        "Processing VM:", current_vm_name, "with volume:", volume_name
                    )

                    os_size = conn.image.get_image(image_id)
                    # Convert virtual size to GB (round up)
                    image_virtual_gb = int(os_size.virtual_size / (1024 ** 3))
                    if os_size.virtual_size % (1024 ** 3) != 0:
                        image_virtual_gb += 1

                    # Minimum 20GB, always add buffer
                    size_gb = max(image_virtual_gb + 2, 20)

                    print(
                        f"Image virtual size: {image_virtual_gb}GB → "
                        f"Creating volume of size: {size_gb}GB"
                    )

                    # Determine volume type based on designation
                    preferred_volume_type = None

                    if vm_req.designation in ["HR", "Finance", "Senior Management"]:
                        preferred_volume_type = "CEPH"

                    volume_type = get_available_volume_type(preferred_volume_type)

                    if not volume_type:
                        error_message = "No valid Cinder volume type available on this OpenStack cluster"
                        VmRequest.objects.filter(id=id).update(
                            creation_status="Failed",
                            creation_error_message=error_message,
                        )
                        return {"status": False, "message": error_message}

                    print("Using volume type →", volume_type)


                    # Create bootable volume and VM
                    result = create_bootable_volume(
                                conn,
                                volume_name,
                                size_gb,
                                volume_type,
                                image_id,
                                current_vm_name,
                                flavor_id,
                                id,
                                network_id,
                            )
                    # 🔁 CEPH fallback
                    if not result["status"] and volume_type == "CEPH":
                        print("CEPH failed, retrying with __DEFAULT__")

                        fallback_type = get_available_volume_type("__DEFAULT__")

                        result = create_bootable_volume(
                            conn,
                            volume_name + "_fallback",
                            size_gb,
                            fallback_type,
                            image_id,
                            current_vm_name,
                            flavor_id,
                            id,
                            network_id,
                        )

                    if not result["status"]:
                        VmRequest.objects.filter(id=id).update(
                            creation_status="Failed",
                            creation_error_message=result["error"],
                        )
                        error_message = result.get("error", "Unknown error")
                        print(f"VM creation failed for {current_vm_name}: {error_message}")
                        return {"status": False, "message": error_message}

                    # ✅ Success
                    boot_volume_id = result["volume_id"]
                    vm_instance_id = result["server_id"]
                    connection_id = result.get("connection_id")
                    vm_detail["volume_id"] = result["volume_id"]
                    created_vm_ids.append(vm_instance_id)
                    vm_detail["vm_id"] = vm_instance_id

                    data_volume_id = ""

                    if vm_req.storage_required and int(vm_req.additional_storage) > 0:
                        data_volume_type = get_available_volume_type(preferred_volume_type)

                        if not data_volume_type:
                            error_message = "No valid Cinder volume type available for data volume"
                            VmRequest.objects.filter(id=id).update(
                                creation_status="Failed",
                                creation_error_message=error_message,
                            )
                            return {"status": False, "message": error_message}

                        data_volume_name = f"{current_vm_name}_data_volume"

                        data_volume_id = create_data_volume(
                            int(vm_req.additional_storage),
                            data_volume_name,
                            data_volume_type,
                        )

                        print(f"Volume '{data_volume_name}' created with ID: {data_volume_id}")

                        attach_volume_to_vm(current_vm_name, data_volume_id)

                    vm_detail["data_volume_id"] = data_volume_id

                # Save all VM details
                res = run_shell_script_to_save_vm_details(all_vm_details, False)
                print("Response from shell script:", res)
               
                if not res["status"]:
                    return {"status": False, "message": res["message"]}
                
                # --- ADD THE SAVE LOGIC HERE (for Developers/Non-Students) ---
                guac_connections = res.get("connections", {})
                instance_names = res.get("instance_names", {}) # New
                vnc_displays = res.get("vnc_displays", {})
                
                for detail in all_vm_details:
                    current_name = detail["vm_name"]
                    VMInfo.objects.update_or_create(
                        vm_name=current_name,
                        defaults={
                            "vm_id": detail.get("vm_id"),
                            "volume_id": detail.get("volume_id"),
                            "data_volume_id": detail.get("data_volume_id"),
                            "creation_status": "Approved",
                            "email": detail.get("email"),
                            "username": detail.get("username"),
                            "ip": update_ip_by_vmname(current_name),
                            "connection_id": guac_connections.get(current_name),
                            "host_name": res.get("host_name"),
                            "instance_name": instance_names.get(current_name),
                            "vnc_display": vnc_displays.get(current_name),
                            "vm_access_from_date": detail.get("vm_access_from_date"),
                            "vm_access_to_date": detail.get("vm_access_to_date"),
                            "vm_access_from_time": detail.get("vm_access_from_time"),
                            "vm_access_to_time": detail.get("vm_access_to_time"),
                        }
                    )
                
                send_creation_success_email(vm_req.email, all_vm_details)
                vm_req.creation_status = "Success"
                vm_req.save()

                return {"status": res["status"], "message": res["message"]}
                
        else:
            # Create a new connection for each VM
            new_conn = connection.Connection(
                auth_url=os.getenv("AUTH_URL"),
                project_name=os.getenv("PROJECT_NAME"),
                username=os.getenv("OPENSTACK_UNAME"),
                password=os.getenv("PASSWORD"),
                user_domain_name=os.getenv("USER_DOMAIN_NAME"),
                project_domain_name=os.getenv("PROJECT_DOMAIN_NAME"),
            )

            # Create each VM
            for vm_detail in all_vm_details:
                # Create the VM
                server = create_student_vm_with_volume(
                    new_conn,
                    vm_detail["vm_name"],
                    flavor_id,
                    image_id,
                    network_id
                )

                print(server, "VM created for name:", vm_detail["vm_name"])

                # Store the server ID in the vm_detail dictionary
                vm_req = VmRequest.objects.get(id=int(id))
                if server["status"]:
                    vm_detail["vm_id"] = server["server_id"]
                    vm_detail["volume_id"] = server["volume_id"]   # ⭐ ADD THIS

                    vm_req.creation_status = "Created"
                    vm_req.save()

                else:
                    print(f"Failed to create VM {current_vm_name}: {server['error']}")
                    vm_req.creation_status = server["error"]
                    vm_req.save()
                    return {
                        "status": False,
                        "message": f"Failed to create VM {current_vm_name}: {server['error']}",
                    }
            # Save all VM details
            res = run_shell_script_to_save_vm_details(all_vm_details, False)

            if res.get("status"):
                    guac_connections = res.get("connections", {})
                    
                    for detail in all_vm_details:
                        current_name = detail["vm_name"]
                        
                        # We use update_or_create to ensure volume_id and status are saved
                        VMInfo.objects.update_or_create(
                            vm_name=current_name,
                            defaults={
                                "vm_id": detail.get("vm_id"),
                                "volume_id": detail.get("volume_id"), # Saves the ID you were missing
                                "data_volume_id": detail.get("data_volume_id"),
                                "creation_status": "Approved", # Sets status to Approved
                                "email": detail.get("email"),
                                "username": detail.get("username"),
                                "ip": update_ip_by_vmname(current_name),
                                "connection_id": guac_connections.get(current_name),
                                "host_name": res.get("host_name"),
                                "instance_name": detail.get("instance_name") or current_name,
                                "vnc_display": res.get("vnc_display"),
                                "vm_access_from_date": detail.get("vm_access_from_date"),
                                "vm_access_to_date": detail.get("vm_access_to_date"),
                                "vm_access_from_time": detail.get("vm_access_from_time"),
                                "vm_access_to_time": detail.get("vm_access_to_time"),
                            }
                        )
                    
                    send_creation_success_email(vm_req.email, all_vm_details)
                    # Update parent request status
                    vm_req.creation_status = "Success"
                    vm_req.save()

            return {"status": res["status"], "message": res["message"]}
 
    except Exception as e:
        print(f"Error processing VM request: {e}")
        return {"status": False, "message": str(e)}


# --------------------vm reject-----------------------


def vm_reject_request(request, id):
    try:
        vm_id, reg_id = id.split("_")
        vm_info = get_object_or_404(VMInfo, id=int(vm_id), creation_status="Requested")
        vm_info.creation_status = "Rejected"
        vm_info.save()
        messages.success(request, "VM request rejected successfully")
    except Exception as e:
        messages.error(request, f"Error rejecting VM request: {str(e)}")
    return redirect("vm_response_display")


def create_vm(conn, name, flavor_id, image_id, network_id):
    try:
        print("====network id",network_id)
        print("====image id", image_id)
        print("====flavor id", flavor_id)

        network = conn.network.find_network(network_id)
        if not network:
            raise Exception(f"Network not found: {network_id}")

        server = conn.compute.create_server(
            name=name,
            flavor_id=flavor_id,
            image_id=image_id,
            networks=[{"uuid": network_id}],
        )

        print(f"{server.name} creation initiated (ID: {server.id})")
        return {
            "status": True,
            "server_id": server.id
        }
    except Exception as e:
        print("❌ Error in create_vm:", str(e))
        return {
            "status": False,
            "server_id": None,
            "error": str(e)
        }


def create_multiple_vm(conn, base_name, flavor_id, image_id, network_id, count=1):
    try:
        network = conn.network.find_network(network_id)
        if not network:
            raise Exception(f"Network not found: {network_id}")

        vm_ids = []

        for i in range(count):
            vm_name = f"{base_name}_{i+1}" if count > 1 else base_name

            server = conn.compute.create_server(
                name=vm_name,
                flavor_id=flavor_id,
                image_id=image_id,
                networks=[{"uuid": network_id}],
            )

            vm_ids.append(server.id)

        return vm_ids

    except Exception as e:
        print("VM creation error:", str(e))
        return []

