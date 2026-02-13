from django.urls import path, re_path
from django.views.generic import TemplateView

from . import views
from .launchvm import vm_approve_request
from .views import *

urlpatterns = [
    # -------------------------------
    # 1️⃣ Registration APIs
    # -------------------------------
    path("api/signup", views.signup, name="signup"),
    path("api/register", views.RegistrationListCreateAPIView.as_view(), name="register"),
    path("api/registration/", RegistrationListCreate.as_view(), name="registration-list-create"),
    path("api/employee/register/<str:employee_id>/", EmployeeRegisterAPIView.as_view(), name="employee-register"),
    path("api/employee/newregister/<str:employee_id>/", NewEmployeeRegisterAPIView.as_view(), name="employee-register"),
    path("api/employee/register-pending/", PendingRegistrationRequestsAPIView.as_view(), name="pending-employee-register"),
    path("api/employee/register-approve/", ApproveRegistrationRequestAPIView.as_view(), name="approve-employee-register"),
    path("api/employee/fla-approved-pending-requests/", AcceptedByFLARegistrationRequestsAPIView.as_view(), name="fla-approved-pending-requests"),
    path("api/all-registration-requests/", AllRegistrationRequestsAPIView.as_view(), name="all-registration-requests"),

    # -------------------------------
    # 2️⃣ Authentication APIs
    # -------------------------------

    path("api/v2/login/", CustomTokenObtainPairView.as_view(), name="cookie_token_obtain_pair"),
    path("api/token/refresh/", CookieTokenRefreshView.as_view(), name="token_refresh"),
    path("api/forgot-password/", ForgotPasswordView.as_view(), name="forgot_password"),
    path("api/reset-password/", ResetPasswordView.as_view(), name="reset_password"),
    path("api/logout/", LogoutView.as_view(), name="logout"),

    # OIDC Authentication #

    path("api/login", views.login, name="login"),
    path("api/test_token", views.test_token, name="test_token"),
    path("oidc-auth/", views.oidc_auth_code, name="oidc_auth_code"),
    path("processAuthCodeAndGetToken/", views.processAuthCodeAndGetToken, name="processAuthCodeAndGetToken"),

    # -------------------------------
    # 3️⃣ OpenStack APIs
    # -------------------------------
    # Flavors
    path("api/flavors/", ListFlavors.as_view(), name="get_flavor_list"),
    path("api/flavors/delete/", DeleteFlavorAPIView.as_view(), name="delete_flavor"),
    path("api/flavors/create/", CreateFlavorAPIView.as_view(), name="create_flavor"),
    path("flavors/metadata/<str:flavor_id>/", UpdateFlavorMetadataAPIView.as_view(), name="update-flavor-metadata"),
    path("api/flavorslist/", FlavorListAPIView.as_view(), name="flavor-list"),

    # Images
    path("api/images/", ListImages.as_view(), name="list_images"),
    path("api/image/create-image/", OpenStackImageCreateViewUpdated1.as_view(), name="create-image"),
    path("api/image/<str:image_id>/", ImageDetailAPIView.as_view(), name="image-detail"),
    path("api/list-images/", OpenStackImageListView.as_view(), name="list_images"),
    path("api/download-image/<str:image_id>/", OpenStackImageDownloadView.as_view(), name="download_image"),

    # Volumes
    path("api/create-volume/", CreateVolumeFromImageAPIView.as_view(), name="create-volume"),
    path("api/volume-types/", ListVolumeTypesAPIView.as_view(), name="list-volume-types"),
    path("api/create-volume-type/", CreateVolumeTypeAPIView.as_view(), name="create-volume-type"),
    path("api/update-volume-type/<str:volume_type_id>/", UpdateVolumeTypeAPIView.as_view(), name="update_volume_type"),
    path("api/delete-volume-type/<str:volume_type_id>/", DeleteVolumeTypeAPIView.as_view(), name="delete_volume_type"),
    path("api/volumes/", ListVolumesAPIView.as_view(), name="list-volumes"),
    path("api/update-volume-status/<str:volume_id>/", UpdateVolumeStatusAPIView.as_view(), name="update-volume-status"),
    path("api/delete-volume/<str:volume_id>/", DeleteVolumeAPIView.as_view(), name="delete-volume"),

    # Instances / VMs
    path("api/instances/", InstanceDetailsAPIView.as_view(), name="instance-details"),
    path("api/vm/<str:instance_id>/", VMDetailAPIView.as_view(), name="vm-detail"),
    path("api/vm-detail/", VMDetailAPIView.as_view(), name="vm-detail"),
    path("api/vm_action/", VMActionAPIView.as_view(), name="vm_action"),
    path("api/check-vm-name/", CheckVMNameAPIView.as_view(), name="check-vm-name"),

    # Networks
    path("api/networks/create/", CreateNetworkAPIViewUpdated.as_view(), name="create_network"),
    path("api/networks/", ListNetworksAPIView.as_view(), name="list_networks"),
    path("api/networks/delete/<str:network_id>/", DeleteNetworkAPIView.as_view(), name="delete_network"),
    path("api/networks/edit/<str:network_id>/", views.EditNetworkAndSubnetAPIView.as_view(), name="edit_network_and_subnet"),
    path("api/network/topology/", OpenStackDataView.as_view(), name="openstack-data"),

    # Routers
    path("api/create-router/", CreateRouterAPIView.as_view(), name="create-router"),
    path("api/routers/", ListRoutersView.as_view(), name="list-routers"),
    path("api/delete-router/<str:router_ids>/", DeleteRouterAPIView.as_view(), name="delete-routers"),
    path("api/edit-router/<str:router_id>/", EditRouterAPIView.as_view(), name="edit-routers"),

    # Projects
    path("api/projects/create/", CreateProjectAPIView.as_view(), name="create_project"),
    path("api/openstack/projects/", OpenStackProjectsAPIView.as_view(), name="openstack-projects"),
    path("api/update-project/<str:project_id>/", UpdateProjectAPIView.as_view(), name="update-project"),
    path("api/delete-project/<str:project_id>/", DeleteProjectAPIView.as_view(), name="delete-project"),
    path("api/project-user/<int:vm_request_id>/", OpenStackProjectUserAPIView.as_view(), name="openstack_project_user"),

    # Users
    path("api/users/create/", CreateUserAPIView.as_view(), name="create_user"),
    path("api/users/", ListUsersAPIView.as_view(), name="list-users"),
    path("api/delete-users/<str:user_id>/", DeleteUserAPIView.as_view(), name="delete-user"),
    path("api/update-users/<str:user_id>/", UpdateUserAPIView.as_view(), name="update-user"),

    # RBAC / Groups / Roles
    path("api/list-group/", ListGroupsAPIView.as_view(), name="list_groups"),
    path("api/create-group-with-members/", CreateGroupWithMembersAPIView.as_view(), name="create_group_with_members"),
    path("api/groups/members/<str:group_id>/", ListGroupMembersAPIView.as_view(), name="list_group_members"),
    path("api/update-group/<str:group_id>/", UpdateGroupAPIView.as_view(), name="update-group"),
    path("api/delete-group/<str:group_id>/", DeleteGroupAPIView.as_view(), name="delete-group"),
    path("api/roles/", ListRolesAPIView.as_view(), name="list-roles"),
    path("api/roles/<str:role_id>/", DeleteRoleAPIView.as_view(), name="delete-role"),
    path("api/create-roles/", CreateRoleAPIView.as_view(), name="create-role"),
    path("api/edit-roles/<str:role_id>/", EditRoleAPIView.as_view(), name="edit-role"),
    path("api/create-rbac-policy/", CreateRBACPolicyAPIView.as_view(), name="create-rbac-policy"),
    path("api/update-rbac-policy/<str:rbac_policy_id>/", UpdateRBACPolicyAPIView.as_view(), name="update_rbac_policy"),
    path("api/rbac-policies/", ListRBACPoliciesAPIView.as_view(), name="list-rbac-policies"),
    path("api/rbac-policies/<str:rbac_policy_id>/", DeleteRBACPolicyAPIView.as_view(), name="delete_rbac_policy"),

    # Floating IPs
    path("api/floating-ips/", FloatingIPView.as_view(), name="floating-ip-list-create"),
    path("api/floating-ips/associate/", AssociateFloatingIPView.as_view(), name="associate-floating-ip"),
    path("api/floating-ips/release/", ReleaseFloatingIPView.as_view(), name="release-floating-ip"),
    path("api/floating-ips/delete/<str:floating_ip_id>/", DeleteFloatingIPView.as_view(), name="delete-floating-ip"),

    # Compute / Infrastructure
    path("api/compute-services/", ComputeServicesView.as_view(), name="compute_services"),
    path("api/block-storage-services/", BlockStorageServicesView.as_view(), name="block_storage_services"),
    path("api/network-services/", NetworkAgentsView.as_view(), name="network_services"),
    path("api/openstack/servicemonitor/", ServiceMonitorView.as_view(), name="openstack-services-monitor"),
    path("api/openstack/hypervisors/", get_hypervisors_page, name="get_hypervisors"),
    path("api/infrastructure/host-aggregates/", HostAggregateAPIView.as_view(), name="host_aggregates_list"),
    path("api/infrastructure/host-aggregates/<str:aggregate_id>/", HostAggregateAPIView.as_view(), name="host_aggregate_detail"),
    path("api/infrastructure/host-aggregates/<str:aggregate_id>/actions/", HostAggregateActionsView.as_view(), name="host_aggregate_actions"),
    path("api/infrastructure/hypervisors/", AllHypervisorsView.as_view(), name="all_hypervisors"),
    path("api/infrastructure/hypervisors/<str:hostname>/instances/", HypervisorInstancesView.as_view(), name="hypervisor_instances"),
    path("api/infrastructure/hosts/", ComputeHostAPIView.as_view(), name="compute_hosts"),
    path("api/infrastructure/resource-providers/", ResourceProviderAPIView.as_view(), name="resource_providers"),
    path("api/identity/application-credentials/", ApplicationCredentialAPIView.as_view(), name="app_cred_list"),
    path("api/identity/application-credentials/<str:id>/", ApplicationCredentialAPIView.as_view(), name="app_cred_detail"),

    # -------------------------------
    # 4️⃣ Ceph APIs
    # -------------------------------
    path("api/ceph/health/", CephClusterHealthView.as_view(), name="ceph_health"),
    path("api/ceph/osd/", CephOSDInfoView.as_view(), name="ceph_osd"),
    path("api/ceph/cluster/", CephClusterInfoView.as_view(), name="ceph_cluster"),
    path("api/ceph/host/", CephHostInfoView.as_view(), name="ceph_host"),
    path("api/ceph/capacity/", views.CephCapacityView.as_view(), name="ceph_capacity"),
    path("api/ceph/summary/", views.CephSummaryView.as_view(), name="ceph_summary"),
    path("api/ceph/inventory/", views.CephInventoryView.as_view(), name="ceph_inventory"),
    path("api/ceph/pools/", CephPoolListView.as_view(), name="ceph_pools"),

    # -------------------------------
    # 5️⃣ OpenStack VM Request APIs
    # -------------------------------
    path("api/vmrequests/", VmRequestAPIView.as_view(), name="vm_requests"),
    path("api/vmrequests/update/<int:request_id>/", VmRequestUpdateAPIView.as_view(), name="vm-request-update"),
    path("api/vmrequests/admin/", VmRequestPendingAdminAPIView.as_view(), name="vm-requests-pending-admin"),
    path("api/vmrequest/status/", VmRequestStatusUpdateAPIView.as_view(), name="vm-requests-status-update"),
    path("api/vmrequest/bulk-approve/", VmRequestBulkApproveAPIView.as_view(), name="vm-requests-bulk-approval"),
    path("api/vmrequests/fla/", FlaVmRequestAPIView.as_view(), name="vm_requests_fla"),
    path("api/vmrequests/employee/", EmployeeVmRequestAPIView.as_view(), name="vm_requests_employee"),
    path("api/vmdetails/overview/", VmRequestOverviewAPIView.as_view(), name="vm_overview"),
    path("api/vmrequests/<str:employee_id>/", ListVmRequestsByEmployeeAPIView.as_view(), name="list_vm_requests_by_employee"),
    path("api/vmrequests/check/expiry/", VMExpiryNotificationAPIView.as_view(), name="vm-check-expiry"),
    path("api/rejected-vm-requests/", RejectedVMRequestsAPIView.as_view(), name="rejected-vm-requests"),
    path("api/vmrequests/approved-vms/user/", ApprovedVMsAPIView.as_view(), name="approved-vms"),
    path("api/vmrequests/action/user/", VMActionAPIUserView.as_view(), name="vm-action"),
    path("api/vmrequests/delete/request-user/", VMDeleteRequestAPIView.as_view(), name="vm-delete-request"),
    path("api/vmrequests/delete/admin/", VMDeleteAdminApprovalAPIView.as_view(), name="vm-delete-admin"),
    path("api/vmrequests/delete/pending/", VMPendingDeleteRequestsAPIView.as_view(), name="vm-delete-pending"),
    path("api/vm-request/reject/", VmRequestRejectionReasonAPIView.as_view(), name="reject-vms"),
    path("api/openstack/requests-by-date/", OpenStackRequestsByDateAPIView.as_view(), name="openstack-requests-by-date"),


    # -------------------------------
    # 6️⃣ Kubernetes APIs
    # -------------------------------
    # Services
    path("api/k8s/services/", KubernetesServiceList.as_view(), name="k8s-services"),
    path("api/k8s/services-details/", ServiceDetailAPIView.as_view(), name="k8s-services-details"),
    path("api/k8s/nodes/", ListK8sNodes.as_view(), name="list_k8s_nodes"),
    path("api/k8s/nodes/<str:name>/", NodeDetailAPIView.as_view(), name="k8s_node_detail"),
    path("api/k8s/deployments/", KubernetesDeploymentsAPIView.as_view(), name="k8s-deployments"),
    path("api/k8s/deployment-details/", DeploymentDetailAPIView.as_view(), name="k8s-deployment-details"),
    path("api/k8s/pods/", ListPodsAPIView.as_view(), name="list-pods"),
    path("api/k8s/pod-details/", PodDetailAPIView.as_view(), name="k8s-pod-details"),
    path("api/logs/<str:namespace>/<str:pod_name>/", PodLogsAPIView.as_view(), name="pod-logs"),
    path("api/k8s/daemonsets/", DaemonSetListAPIView.as_view(), name="k8s-daemonsets"),
    path("api/k8s/deploy-nginx/", DeployNginxPodAPIView.as_view(), name="deploy-nginx-pod"),
    path("api/k8s/deploy/nginx-ha/", DeployNginxHAAPIView.as_view(), name="deploy-nginx-ha"),
    path("api/k8s/deploy/mongodb/", DeployMongoDBAPIView.as_view(), name="deploy-mongodb"),
    path("api/k8s/deploy-pod/", DeployPodOnKnode2APIView.as_view(), name="deploy-pod-knode2"),
    path("api/k8s/delete-request/", PodDeleteRequestAPIView.as_view(), name="k8s-delete-request"),
    path("api/k8s/admin/delete-k8s/", PodDeleteAdminApprovalAPIView.as_view(), name="k8s-delete-admin"),
    path("api/k8s/pods/delete/pending/", PodPendingDeleteRequestsAPIView.as_view(), name="k8s-delete-pending"),
    path("api/k8s/events/", ListKubernetesEventsAPIView.as_view(), name="list-events"),
    path("api/k8s/workloads/", WorkloadDetailsAPIView.as_view(), name="workload-details"),
    path("api/k8s/workload-aggregate/", KubernetesResourcesDetailAPIView.as_view(), name="workload-aggregate"),
    path("api/k8s/replicasets/", ReplicaSetDetailsAPIView.as_view(), name="replicaset-details"),
    path("api/k8s/replicaset-details/", ReplicaSetDetailAPIView.as_view(), name="replicaset-details-kubernetes"),
    path("api/k8s/namespaces/", ListNamespacesAPIView.as_view(), name="list-namespaces"),
    path("api/k8s/statefulsets/", ListStatefulSetsAPIView.as_view(), name="list-statefulsets"),
    path("api/k8s/statefulset-details/", StatefulSetDetailAPIView.as_view(), name="statefulset-detail"),
    path("api/k8s/list-pods/", CreateReplicaSetAPIView.as_view(), name="list-pods"),
    path("api/k8s/create-replicaset/", CreateReplicaSetAPIView.as_view(), name="create-replicaset"),
    path("api/k8s/workloadstati/", WorkloadStatsAPIView.as_view(), name="k8s-workloads"),
    path("api/persistent-volumes/", PersistentVolumeListAPIView.as_view(), name="persistent-volumes"),
    path("api/kube-volume-details/", PersistentVolumeDetailAPIView.as_view(), name="volume-details"),
    path("api/kubernetes/requests-by-date/", K8sRequestsByDateAPIView.as_view(), name="kubernetes-requests-by-date"),

    # -------------------------------
    # 7️⃣ Kubernetes Service Request APIs
    # -------------------------------
    path("api/service-requests/", ServiceRequestAPIView.as_view(), name="service-requests"),
    path("api/service-requests/create/", ServiceRequestCreateAPIView.as_view(), name="service-requests"),
    path("api/fla/service-requests/", FlaServiceRequestAPIView.as_view(), name="fla-service-requests"),
    path("api/admin/pending-service-requests/", ServiceRequestPendingAdminAPIView.as_view(), name="admin-pending-service-requests"),
    path("api/admin/service-requests/bulk-approve/",ServiceRequestBulkAdminApproveAPIView.as_view(),name="admin-bulk-approve-service-requests",),
    path("api/fla/employees/", FLAEmployeesListAPIView.as_view(), name="fla-employees-list"),
    path("api/service-request/reject/", ServiceRequestRejectionAPIView.as_view(), name="reject-service-request"),
    path("api/services/deployed/", EmployeeDeployedServicesAPIView.as_view(), name="deployed-services"),

    # -------------------------------
    # 8 Zabbix APIs
    # -------------------------------
   
    # path("api/hosts/", HostAvailabilityAPIView.as_view(), name="host-availability"),
    # path("api/cpu/<str:hostid>/", CPUUtilizationAPIView.as_view(), name="cpu-utilization"),
    # path("api/memory/<str:hostid>/", MemoryUtilizationAPIView.as_view(), name="memory-utilization"),
    # path("api/disk/<str:hostid>/", DiskUtilizationAPIView.as_view(), name="disk-utilization"),
    # path("api/system-metrics/<str:hostid>/", SystemMetricsAPIView.as_view(), name="system-metrics"),
    # path("api/alerts/<str:hostid>/", ZabbixProblemsAPIView.as_view(), name="zabbix-problems"),
    # # path("api/k8s/<str:hostid>/", KubernetesNodeMetricsAPIView.as_view(), name="kubernetes-node-metrics"),
    # path("api/health-report/", HealthReportAPIView.as_view(), name="health-report"),
    # path("api/host-health/<str:hostid>/", HostHealthSummaryAPIView.as_view(), name="host-health-summary"),
    # path("api/host-health-pdf/<str:hostid>/", HostHealthPDFAPIView.as_view(), name="zabbix-host-list"),
   
    path("api/hosts/", HostAvailabilityAPIView.as_view()),

    path("api/host-metrics/<str:hostid>/", HostMetricsAPIView.as_view()),
    path("api/alerts/<str:hostid>/", ZabbixProblemsAPIView.as_view()),
    path("api/host-health/<str:hostid>/", HostHealthSummaryAPIView.as_view()),
    path("api/host-health-pdf/<str:hostid>/", HostHealthPDFAPIView.as_view()),

    path("api/health-report/", HealthReportAPIView.as_view()),
    path("api/host-graphs/<str:hostid>/", HostGraphsAPIView.as_view()),
    path("api/host-groups/", HostGroupAPIView.as_view()),
   
    path("api/host-metrics/<str:hostid>/", SystemMetricsAPIView.as_view()),

    path("api/host-all-metrics/<str:hostid>/",HostAllMetricsAPIView.as_view(),name="host-all-metrics",),



    # -------------------------------
    # 8️⃣ Miscellaneous / Helpdesk / Metrics / Email / Zabbix
    # -------------------------------
    path("api/overview/", OpenStackOverviewAPIView.as_view(), name="overview-api"),
    path("api/overview1/", OpenStackOverviewAPIView1.as_view(), name="openstack_overview"),
    path("metrics/", metrics_view, name="receive_metrics"),
    path("api/metrics/", get_metrics, name="get_metrics"),
    path("api/employee-details/", get_employee_details, name="employee-details"),
    path("api/employees/", EmployeeCreateAPIView.as_view(), name="employee-create"),
    path("api/employees/groups/", GroupListAPIView.as_view(), name="employee-groups"),
    path("api/employees/fla-list/", FLAListAPIView.as_view(), name="fla-list"),
    path("api/employees/bulk-preview/", EmployeeBulkPreviewAPIView.as_view(), name="bulk-employee-preview"),
    path("api/employees/bulk-upload/", EmployeeBulkUploadAPIView.as_view(), name="bulk-employee-create"),
    path("api/employees/csv-template/", EmployeeCSVTemplateAPIView.as_view(), name="employee-csv-template"),
    path("api/employees/delete/<str:employee_id>/", EmployeeDeleteAPIView.as_view(), name="delete-employee"),
    path("api/employees/update/<str:employee_id>/", EmployeeUpdateAPIView.as_view(), name="update-employee"),
    path("api/send-email/", SendEmailView.as_view(), name="send-test-email"),
    path("api/cdacprojects/", ProjectListAPIView.as_view(), name="project-list"),
    path("api/cdacprojects/create/", CreateCdacProjectAPIView.as_view(), name="create-project"),
    path("api/cdacprojects/delete/<int:project_id>/", DeleteCdacProjectAPIView.as_view(), name="delete-project"),
   


    # Catch-all fallback to index.html
    re_path(r"^(?:.*)/?$", TemplateView.as_view(template_name="index.html")),
]
