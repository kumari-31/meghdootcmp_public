# createvmdash

from datetime import datetime
from pyexpat.errors import messages

from django.http import JsonResponse
from django.shortcuts import redirect, render
from rest_framework import status
from rest_framework.response import Response
from django.utils import timezone

from openstackoperations import *

from .models import CdacProject, Employee, Metric, Registration, VMInfo, VmRequest


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

            # Save form data to the database using the Registration model
            print("User Submitted Data:")
            print(f"Full Name: {full_name}")
            print(f"Organization: {organization}")
            print(f"Designation: {designation}")
            print(f"Email: {email}")
            print(f"Phone Number: {phone_number}")
            print(f"Password: {password}")
            print(f"Confirm Password: {confirm_password}")
            print(f"VDI Required: {vdi_required}")
            print(f"Image: {image}")
            print(f"Flavor: {flavor}")
            print(f"Login Enable date: {login_enable_date[0]}")
            print(f"Login Disable date: {login_disable_date[0]}")
            print(f"Login Enable Time: {login_enable_time}")
            print(f"Login Disable Time: {login_disable_time}")
            print(f"Storage Required: {storage_required}")
            print(f"Additional Storage: {additional_storage}")

            print("-=-=--", storage_required)

            # return redirect('/vm/createvm')

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
                    # 'image':  get_image_name(conn, registration.image),
                    # 'flavor': get_flavor_name(conn,registration.flavor),
                    "image": registration.image,
                    "flavor": registration.flavor,
                    "vdi_required": registration.vdi_required,
                    "creation_status": vm_info.creation_status,
                }
            )
        # if not vm_infos:
        #     # Handle case where there is no corresponding VMInfo for the email with creation_status 'Requested'
        #     combined_data.append({
        #         'name': registration.full_name,
        #         'email': registration.email,
        #         'image': registration.image,
        #         'flavor': registration.flavor,
        #         'vdi_required': registration.vdi_required,
        #         'creation_status': 'No VMInfo found with Requested status'
        #     })
    return render(request, "vm_response_display.html", {"combined_data": combined_data})


# ----------------------------vm request approve--------------------------------------------
def generate_vm_names(base_name, count):
    names = [base_name]  # first VM uses exact name
    for i in range(1, count):
        names.append(f"{base_name}-{i}")
    return names


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

        vm_info, created = VMInfo.objects.get_or_create(
            vm_name=vm_req.vm_name,
            defaults={
                "email": vm_req.email if hasattr(vm_req, "email") else "",
                "vm_access_from_date": vm_req.login_enable_date,
                "vm_access_to_date": vm_req.login_disable_date,
                "vm_access_from_time": vm_req.login_enable_time,
                "vm_access_to_time": vm_req.login_disable_time,
                "creation_status": "Requested",
            },
        )

        print("VMInfo created:", created)
        print("VMInfo object:", vm_info)

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

        # Create VM details for each VM name
        for vm_name in vm_names:
            all_vm_details.append(
                {
                    "vm_name": vm_name,
                    "username": full_name,
                    "vm_access_from_date": vm_info.vm_access_from_date,
                    "vm_access_to_date": vm_info.vm_access_to_date,
                    "vm_access_from_time": vm_info.vm_access_from_time,
                    "vm_access_to_time": vm_info.vm_access_to_time,
                    "email": vm_info.email,
                }
            )

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

                auth_url = os.getenv("AUTH_URL")
                project_name = os.getenv("PROJECT_NAME")
                username = "admin"
                password = os.getenv("PASSWORD")

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

                    os_size = conn.image.find_image(image_id)
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
                    if vm_req.designation in ["HR", "Finance", "Senior Management"]:
                        volume_type = "CEPH"
                    else:
                        volume_type = "__DEFAULT__"
                    print("volume_type", volume_type)

                    # Create bootable volume and VM
                    created_bootable, vm_instance_id, _ignored_conn, error_message = create_bootable_volume(
                                auth_url,
                                project_name,
                                username,
                                password,
                                volume_name,
                                size_gb,
                                volume_type,
                                image_id,
                                current_vm_name,
                                flavor_id,
                                id,
                                network_id=network_id
                            )

                    # Store values into vm_detail
                    vm_detail["vm_id"] = vm_instance_id
                    vm_detail["connection_id"] = None

                    if created_bootable is None:
                        VmRequest.objects.filter(id=id).update(
                            creation_status="Failed",
                            creation_error_message=error_message,
                        )
                        print(f"VM creation failed for {current_vm_name}: {error_message}")
                        return {"status": False, "message": error_message}

                    created_vm_ids.append(vm_instance_id)
                    volume_id = ""

                    # If bootable volume was created and additional storage is required
                    if created_bootable:
                        print("additional storage", vm_req.additional_storage)
                        if (
                            vm_req.storage_required
                            and int(vm_req.additional_storage) > 0
                        ):
                            if vm_req.designation in [
                                "HR",
                                "Finance",
                                "Senior Management",
                            ]:
                                data_volume_type = "CEPH"
                            else:
                                data_volume_type = "__DEFAULT__"

                            data_volume_name = current_vm_name + "_data_volume"
                            volume_id = create_data_volume(
                                int(vm_req.additional_storage),
                                data_volume_name,
                                data_volume_type,
                            )
                            print(
                                f"Volume '{data_volume_name}' created with ID: {volume_id}"
                            )

                            # Attach the volume to the VM
                            attach_volume_to_vm(current_vm_name, volume_id)

                    # Store the volume and VM details in the vm_detail dictionary
                    vm_detail["volume_id"] = created_bootable
                    # vm_detail["vm_id"] = vm_instance_id
                    vm_detail["data_volume_id"] = volume_id

                # Save all VM details
                res = run_shell_script_to_save_vm_details(all_vm_details, False)
                print("Response from shell script:", res)
               
                if not res["status"]:
                    return {"status": False, "message": res["message"]}
                
                guac_connections = res.get("connections", {})

                for vm_detail in all_vm_details:
                    vm_name = vm_detail["vm_name"]
                    vm_detail["connection_id"] = guac_connections.get(vm_name)
                    print(f"Mapped Guac ID for {vm_name} → {vm_detail['connection_id']}")

                if res.get("status", False):
                    # Update VM info for the first VM (original VM name)
                    vm_info.creation_status = "Approved"
                    vm_info.host_name = res.get("host_name", "")
                    vm_info.username = res.get("username", "")
                    vm_info.instance_name = res.get("instance_name", "")
                    vm_info.vnc_display = res.get("vnc_display", "")
                    vm_info.ip = update_ip_by_vmname(vm_info.vm_name)

                    # If there's a data volume for the first VM
                    if all_vm_details[0].get("data_volume_id"):
                        vm_info.data_volume_id = all_vm_details[0]["data_volume_id"]

                    # If there's a volume ID for the first VM
                    if all_vm_details[0].get("volume_id"):
                        vm_info.volume_id = all_vm_details[0]["volume_id"]

                    # If there's a VM ID for the first VM
                    if all_vm_details[0].get("vm_id"):
                        vm_info.vm_id = all_vm_details[0]["vm_id"]

                    if all_vm_details[0].get("connection_id"):
                        vm_info.connection_id = all_vm_details[0]["connection_id"]


                    vm_info.save()

                    # Create additional VMInfo records for any additional VMs
                    for i in range(1, len(all_vm_details)):
                        v = all_vm_details[i]  # ✔ correct position
                        VMInfo.objects.create(
                            vm_name=v["vm_name"],
                            email=vm_info.email,
                            vm_access_from_date=vm_info.vm_access_from_date,
                            vm_access_to_date=vm_info.vm_access_to_date,
                            vm_access_from_time=vm_info.vm_access_from_time,
                            vm_access_to_time=vm_info.vm_access_to_time,
                            creation_status="Approved",
                            host_name=res.get("host_name", ""),
                            username=res.get("username", ""),
                            instance_name=res.get("instance_name", ""),
                            vnc_display=res.get("vnc_display", ""),
                            ip=update_ip_by_vmname(v["vm_name"]),
                            volume_id=v.get("volume_id", ""),
                            vm_id=v.get("vm_id", ""),
                            data_volume_id=v.get("data_volume_id", ""),
                            connection_id=v.get("connection_id", ""),
                        )

                    return {"status": res["status"], "message": res["message"]}
                
        else:
            # For Student designation
            print("img", flavor_id)
            print("flv", image_id)

            # Create a new connection for each VM
            new_conn = connection.Connection(
                auth_url=os.getenv("AUTH_URL"),
                project_name=vm_req.project_name,
                username="admin",
                password=os.getenv("PASSWORD"),
                user_domain_name=os.getenv("USER_DOMAIN_NAME"),
                project_domain_name=os.getenv("PROJECT_DOMAIN_NAME"),
            )

            # Create each VM
            for vm_detail in all_vm_details:
                current_vm_name = vm_detail["vm_name"]
                print("=====Creating VM===", current_vm_name)

                # Create the VM
                server = create_vm(
                    new_conn, current_vm_name, flavor_id, image_id, network_id
                )
                print(server, "VM created for name: ", current_vm_name)

                # Store the server ID in the vm_detail dictionary
                vm_req = VmRequest.objects.get(id=int(id))
                if server["status"]:
                    vm_detail["vm_id"] = server.id
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

            if res["status"]:
                # Update VM info for the first VM (original VM name)
                vm_info.creation_status = "Approved"
                vm_info.host_name = res.get("host_name", "")
                vm_info.instance_name = res.get("instance_name", "")
                vm_info.vnc_display = res.get("vnc_display", "")
                vm_info.username = res.get("username", "")
                vm_info.ip = update_ip_by_vmname(vm_info.vm_name)

                # If there's a VM ID for the first VM
                if all_vm_details[0].get("vm_id"):
                    vm_info.vm_id = all_vm_details[0]["vm_id"]

                vm_info.save()

                # Create additional VMInfo records for any additional VMs
                for i in range(1, len(all_vm_details)):
                    additional_vm_info = VMInfo(
                        vm_name=all_vm_details[i]["vm_name"],
                        email=vm_info.email,
                        vm_access_from_date=vm_info.vm_access_from_date,
                        vm_access_to_date=vm_info.vm_access_to_date,
                        vm_access_from_time=vm_info.vm_access_from_time,
                        vm_access_to_time=vm_info.vm_access_to_time,
                        creation_status="Approved",
                        host_name=res.get("host_name", ""),
                        username=res.get("username", ""),
                        instance_name=res.get("instance_name", ""),
                        vnc_display=res.get("vnc_display", ""),
                        ip=update_ip_by_vmname(all_vm_details[i]["vm_name"]),
                        vm_id=all_vm_details[i].get("vm_id", ""),
                    )
                    additional_vm_info.save()

                return {"status": res["status"], "message": res["message"]}
            else:
                return {"status": res["status"], "message": res["message"]}

    except Exception as e:
        print(f"Error processing VM request: {e}")
        return {"status": False, "message": str(e)}



# def vm_approve_request(id):
#         try:
#             print("Inside vm approve request id--->", id)

#             print("vmid====>", id)
#             vm_req = VmRequest.objects.get(id=int(id))
#             print(f"Registration object: {vm_req}")


#             print("vm_count====>", vm_req.count_of_vms)
#             print("vm_name====>", vm_req.vm_name)
#             vm_names = generate_vm_names(vm_req.vm_name, vm_req.count_of_vms)
#             print("Generated VM Names:", vm_names)
#             vm_info = VMInfo.objects.get(vm_name=vm_req.vm_name)
#             print(f"VMInfo object: {vm_info}")

#             # return
#             # Fetch the Registration object based on the email


#             # image_id = '95c8e0ad-3b19-41b9-bd38-c57d8af57bb9'
#             network_name = 'External Network'  # Replace with your network name
#             print("network_name",network_name)
#             # Establish the OpenStack connection using your credentials
#             flv_id = conn.compute.find_flavor(vm_req.flavor)
#             print(vm_req.flavor)
#             print(vm_req.image)
#             img_id = conn.compute.find_image(vm_req.image)

#             print("flv_id",flv_id.id)
#             print("img_id",img_id.id)

#             if flv_id is None:
#                 return Response({"error": "Unable to find flavor ID. Please check the provided flavor."}, status=status.HTTP_400_BAD_REQUEST)

#             if img_id is None:
#                 return Response({"error": "Unable to find image ID. Please check the provided image."}, status=status.HTTP_400_BAD_REQUEST)


#             flavor_id = flv_id.id  # Replace with your flavor ID
#             image_id = img_id.id

#             vm_details = []
#             name=vm_req.vm_name
#             print("name",name)
#             employee_id = vm_req.vm_name.split('_')[0]  # This will extract "348063"
#             try:
#                 # Fetch the employee with the extracted employee_id
#                 employee = Employee.objects.get(employee_id=employee_id)
#                 employee_email = employee.email
#                 print(f"Employee Email: {employee_email}")
#             except Employee.DoesNotExist:
#                 print(f"No employee found with employee ID {employee_id}")

#             full_name = employee_email.split('@')[0]
#             print(f"Full Name:======= {full_name}")

#             vm_details.append({"vm_name": vm_info.vm_name, "username": full_name,"vm_access_from_date": vm_info.vm_access_from_date,"vm_access_to_date": vm_info.vm_access_to_date,"vm_access_from_time": vm_info.vm_access_from_time,"vm_access_to_time": vm_info.vm_access_to_time, "email": vm_info.email})
#             print("========================storageReuired======================================",vm_req.storage_required)
#             print("vmdetails",vm_details)

#             if vm_req.designation != 'Student':
#                 print(vm_req.designation)
#                 if vm_req.vdi_required:
#                     print(vm_req.vdi_required)
#                     auth_url=os.getenv('AUTH_URL'),
#                     project_name=os.getenv('PROJECT_NAME'),
#                     username="admin",
#                     password=os.getenv('PASSWORD'),

#                     # auth_url = 'http://10.184.49.18:5000/v3/'
#                     # project_name = 'admin'
#                     # username = 'admin'
#                     # password = 'Meghd@@t123'
#                     # volume_name = vm_req.full_name + "_volume"
#                     volume_name = vm_req.vm_name + "_volume"
#                     print("volume_name",volume_name)
#                     os_size = conn.image.find_image(image_id)
#                     print(os_size, os_size.size / (1024 ** 3),"++++++++++=")
#                     # size_gb = math.ceil(os_size.size / (1024 ** 3))
#                     size_gb = 20

#                     if vm_req.designation in ['HR', 'Finance','Senior Management']:
#                         volume_type = 'CEPH'
#                         print("volume_type",volume_type)
#                     else:
#                         volume_type = '__DEFAULT__'  # Default volume type
#                         print("volume_type",volume_type)

#                     # volume_type = '__DEFAULT__'  # Change this to the desired volume type name
#                     # volume_type = 'CEPH'
#                     # image_id = 'ed949f3d-0134-4784-a8a9-a4523f4bde2e'  # Replace with the actual ID of the image you want to use
#                     vm_name = vm_req.vm_name
#                     # flavor_id = "01ba557f-39c2-4a50-ac8a-ff0135011252 "
#                     network_name = "External Network"

#                     created_bootable, vm_instance_id = create_bootable_volume(auth_url, project_name, username, password, volume_name, size_gb, volume_type, image_id, vm_req.vm_name, flavor_id)
#                     volume_id = ""
#                     if created_bootable:
#                         print("additional storage",vm_req.additional_storage)
#                         if vm_req.storage_required  and int(vm_req.additional_storage) > 0:
#                             if vm_req.designation in ['HR', 'Finance','Senior Management']:
#                                 data_volume_type = 'CEPH'
#                             else:
#                                 data_volume_type = '__DEFAULT__'
#                             volume_id = create_data_volume(int(vm_req.additional_storage), vm_req.vm_name + '_data_volume',data_volume_type)
#                             print(f"Volume '{vm_req.vm_name + '_data_volume'}' created with ID: {volume_id}")

#                             # Attach the volume to a VM
#                             attach_volume_to_vm(vm_req.vm_name, volume_id)
#                             # print(f"Volume attached to VM '{reg.full_name}'")

#                         res = run_shell_script_to_save_vm_details(vm_details, False)
#                         context = {"status": res['status'], "message": res['message']}
#                         if res['status']:
#                             vm_info.creation_status = "Approved"
#                             vm_info.host_name = res["host_name"]
#                             vm_info.username = res["username"]
#                             vm_info.instance_name = res["instance_name"]
#                             vm_info.vnc_display = res["vnc_display"]
#                             vm_info.ip = update_ip_by_vmname(vm_info.vm_name)
#                             vm_info.data_volume_id = volume_id
#                             vm_info.volume_id = created_bootable
#                             vm_info.vm_id = vm_instance_id
#                             vm_info.save()
#                             # messages.success(request, res['message'])
#                             # convert as json response
#                             return {"status": res['status'], "message": res['message']}
#                         else:
#                             # messages.error(request, res['message'])
#                             return {"status": res['status'], "message": res['message']}

#             else:

#                 print('img',flavor_id)
#                 print('flv',image_id)

#                 # Loop to create the specified number of VMs
#                 print("====VM details=====",vm_details)
#                 for i in vm_details:
#                     name = i['vm_name']
#                     print("=====vm name===",name)
#                     # i['ip_addr'] =
#                     # create_vm(conn, name, flavor_id, image_id, network_name)
#                     new_conn = connection.Connection(
#                         auth_url=os.getenv('AUTH_URL'),
#                         project_name=vm_req.project_name,
#                         username="admin",
#                         password=os.getenv('PASSWORD'),
#                         user_domain_name=os.getenv('USER_DOMAIN_NAME'),
#                         project_domain_name=os.getenv('PROJECT_DOMAIN_NAME')
#                     )
#                     server = create_vm(conn, name, flavor_id, image_id, network_name)

#                     print(server, "VM created for name: ", name)

#                 res = run_shell_script_to_save_vm_details(vm_details, False)
#                 if res['status']:
#                     vm_info.creation_status = "Approved"
#                     vm_info.host_name = res["host_name"]
#                     vm_info.instance_name = res["instance_name"]
#                     vm_info.vnc_display = res["vnc_display"]
#                     vm_info.username = res["username"]
#                     vm_info.ip = update_ip_by_vmname(vm_info.vm_name)
#                     vm_info.save()
#                     # messages.success(request, res['message'])
#                     # convert as json response
#                     return {"status": res['status'], "message": res['message']}
#                 else:
#                     # messages.error(request, res['message'])
#                     return {"status": res['status'], "message": res['message']}


#         except Exception as e:
#             print(f"Error processing file 1161: {e}")
#             # messages.error(request, str(e))
#             return {"status": False, "message": str(e)}

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

