#!/bin/bash

# Collect command-line arguments (VM names)
vms=("$@")

script_dir=$(dirname "$(readlink -f "$0")")
csv_file="$script_dir/vm_info_new.csv"

# Create a CSV file with header
echo "VMname,Hostname,Instance Name,VNC Display" > "$csv_file"

for vm in "${vms[@]}"; do
    host=$(ssh -o 'StrictHostKeyChecking=no' cloud@10.184.43.17 \
        "source openrc && openstack server show '$vm' | awk '/OS-EXT-SRV-ATTR:host/ {print \$4}'")

    instance=$(ssh -o 'StrictHostKeyChecking=no' cloud@10.184.43.17 \
        "source openrc && openstack server show '$vm' | awk '/OS-EXT-SRV-ATTR:instance_name/ {print \$4}'")

    # Skip if instance or host empty
    if [[ -z "$host" || -z "$instance" ]]; then
        continue
    fi

    # Determine host IP based on host name
    if [[ "$host" == "fspcloud" ]]; then
        hostip="10.184.43.17"
    else
        hostip="10.184.49.18"
    fi

    vnc=$(ssh -o 'StrictHostKeyChecking=no' cloud@"$hostip" \
        "sudo virsh vncdisplay $instance | awk -F: '{print \$2}'")

    # If VNC empty, use "-"
    if [[ -z "$vnc" ]]; then
        vnc="-"
    fi

    # Append line to CSV
    echo "$vm,$host,$instance,$vnc" >> "$csv_file"
done





# #!/bin/bash

# # Declare an array to store VM names
# declare -a vms

# # Collect command-line arguments (VM names)
# vms=("$@")

# script_dir=$(dirname "$(readlink -f "$0")")
# # echo "$script_dir"

# # Source the openrc file
# source_openrc=$(ssh -o 'StrictHostKeyChecking=no' "cloud"@"10.184.43.17" "source openrc")
# csv_file="$script_dir/vm_info_new.csv"
# # Create a CSV file with header
# echo "VMname,Hostname,Instance Name,VNC Display" > "$csv_file"

# # Loop through each VM in the list
# for vm in "${vms[@]}"; do
#     # Print the VM name
#     # echo "$vm"

#     # Get the host information
#     host=$(ssh -o 'StrictHostKeyChecking=no' "cloud@10.184.43.17" "source openrc && openstack server show '$vm' | awk '/OS-EXT-SRV-ATTR:host/ {print \$4}'")
#     # echo "$host"
#     # Get the instance name information
#     instance=$(ssh -o 'StrictHostKeyChecking=no' "cloud@10.184.43.17" "source openrc && openstack server show '$vm' | awk '/OS-EXT-SRV-ATTR:instance_name/ {print \$4}'")
#     # echo "$instance"
#     if [ "$host" == "fspcloud" ] ; then
#         # Determine the appropriate host IP and get the VNC display
#         hostip="10.184.43.17"
#         vnc=$(ssh -o 'StrictHostKeyChecking=no' "cloud@$hostip" "sudo virsh vncdisplay $instance | awk -F: '{print \$2}'")

#         # vnc=$(ssh -o 'StrictHostKeyChecking=no' "cloud"@$hostip "sudo virsh vncdisplay $instance | awk -F: "{print \$2}"')
#         # echo "$vnc"

#         # echo "$vm,$host,$instance,$vnc"
#         # Print the hostname, instance name, and VNC display to the CSV file
#         echo "$vm,$host,$instance,$vnc"

#     fi
# done
