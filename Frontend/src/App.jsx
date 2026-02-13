import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { Suspense, lazy } from "react";
import PersistentVolumeDetails from "./Kubernets/PersistentVolumeDetails";
import { ImageOutlined } from "@mui/icons-material";
import FaqPage from "./Pages/Authentication/FaqPage";
const K8sRequestStatus = lazy(
  () => import("./KubernetesRBAC/K8sRequestStatus"),
);
const DeploymentDetails = lazy(
  () => import("./Kubernets/DeploymentDetailsComponent"),
);
const PodDetails = lazy(() => import("./Kubernets/PodDetailsComponent"));
const ServiceDetails = lazy(
  () => import("./Kubernets/ServiceDetailsComponent"),
);
const ReplicaSetDetails = lazy(
  () => import("./Kubernets/ReplicaSetDetailsComponent"),
);
const NodesDetails = lazy(() => import("./Kubernets/NodesDetails"));
const Services = lazy(() => import("./Kubernets/Services"));
const Nodes = lazy(() => import("./Kubernets/Nodes"));
const Deployments = lazy(() => import("./Kubernets/Deployments"));
const StatefulSets = lazy(() => import("./Kubernets/StatefulSets"));
const PersistentVolumes = lazy(() => import("./Kubernets/PersistentVolumes"));
const StatefulSetDetails = lazy(() => import("./Kubernets/StatefulSetDetails"));
const DeployPods = lazy(() => import("./User/DeployPods"));
const DeployedServices = lazy(() => import("./User/DeployedServices"));
const AddEmployee = lazy(() => import("./Pages/Admin/AddEmployee"));
const AddEmployeefla = lazy(() => import("./Pages/Fla/AddEmployee"));
const FlaServiceApproval = lazy(
  () => import("./KubernetesRBAC/FlaServiceApproval"),
);
const AdminServiceApproval = lazy(
  () => import("./KubernetesRBAC/AdminServiceApproval"),
);
const AdminEditPage = lazy(() => import("./Pages/Admin/AdminEditPage"));
const ProjectName = lazy(() => import("./Pages/Admin/ProjectName"));
const Dashboard = lazy(() => import("./Pages/Dashboard"));
const ProtectedRoute = lazy(() => import("./ProtectedRoute"));
const Layout = lazy(() => import("./Pages/Layout"));
const Instance = lazy(() => import("./Pages/Provisioning/Instance"));
const Flavors = lazy(() => import("./Pages/Provisioning/Flavors"));
const Images = lazy(() => import("./Pages/Provisioning/Images"));
const LoginForm = lazy(() => import("./Pages/Authentication/LoginForm"));
const RegistrationForm = lazy(
  () => import("./Pages/Authentication/RegistrationForm"),
);
const ApplicationCredantials = lazy(
  () => import("./Pages/Administration/ApplicationCredentials"),
);
const Unauthorized = lazy(() => import("./Pages/Unauthorized"));
const VmRequest = lazy(() => import("./User/VmRequest"));
const OpenstackOverview = lazy(() => import("./Pages/OpenstackOverview"));
const Approvals = lazy(() => import("./Pages/Fla/Approval"));
const AdminApproval = lazy(() => import("./Pages/Admin/AdminApproval"));
const VMRequestStatus = lazy(() => import("./User/VMRequestStatus"));
const KubernetOverview = lazy(() => import("./Pages/KubernetOverview"));
const Pods = lazy(() => import("./Kubernets/Pods"));
const Events = lazy(() => import("./Kubernets/Events"));
const GroupMembersManagement = lazy(
  () => import("./Pages/Administration/GroupMembersManagement"),
);
const Group = lazy(() => import("./Pages/Infrastructure/Group"));
const DRService = lazy(() => import("./Pages/Infrastructure/DRService"));
const Host = lazy(() => import("./Pages/Infrastructure/Host"));
const Hypervisors = lazy(() => import("./Pages/Infrastructure/Hypervisors"));
const Groups = lazy(() => import("./Pages/Administration/Groups"));
const Projects = lazy(() => import("./Pages/Administration/Projects"));
const Users = lazy(() => import("./Pages/Administration/Users"));
const FloatingIps = lazy(() => import("./Pages/Network/FloatingIps"));
const Networks = lazy(() => import("./Pages/Network/Networks"));
const RBACpolicies = lazy(() => import("./Pages/Network/RBACpolicies"));
const Routers = lazy(() => import("./Pages/Network/Routers"));
const ApprovedvmRequest = lazy(() => import("./Pages/Admin/ApprovedvmRequest"));
const VMDeleteApproval = lazy(() => import("./Pages/Admin/VMDeleteApproval"));
const AdminK8sDeleteApprovals = lazy(
  () => import("./Pages/Admin/AdminK8sDeleteApprovals"),
);
const Roles = lazy(() => import("./Pages/Administration/Roles"));
const ReplicaSets = lazy(() => import("./Kubernets/ReplicaSets"));
const HealthMonitoring = lazy(
  () => import("./Pages/Monitoring/HealthMonitoring"),
);
const ServiceMonitoring = lazy(
  () => import("./Pages/Monitoring/ServiceMonitoring"),
);
const LogMonitoring = lazy(() => import("./Pages/Monitoring/LogMonitoring"));
const Darpan = lazy(() => import("./Pages/Monitoring/Darpan"));
const NetworkTopology = lazy(() => import("./Pages/Network/NetworkTopology"));
const Storage = lazy(() => import("./Pages/Volume/Storage"));
const SwiftObjectStorage = lazy(
  () => import("./Pages/Volume/SwiftObjectStorage"),
);
const Fileshare = lazy(() => import("./Pages/Volume/Fileshare"));
const Volume = lazy(() => import("./Pages/Volume/Volume"));
const VolumeType = lazy(() => import("./Pages/Volume/VolumeType"));
const PricePlan = lazy(() => import("./Pages/PricePlan"));
const AdminTicketDashboard = lazy(
  () => import("./Pages/Tickets/AdminTicketDashboard"),
);
const TicketCreationForm = lazy(
  () => import("./Pages/Tickets/TicketCreationForm"),
);
const TicketDetailView = lazy(() => import("./Pages/Tickets/TicketDetailView"));
const TicketListPage = lazy(() => import("./Pages/Tickets/TicketListPage"));
const HelpdeskWrapper = lazy(() => import("./HelpdeskWrapper"));
const ForgotPassword = lazy(
  () => import("./Pages/Authentication/ForgotPassword"),
);
const ResetPassword = lazy(
  () => import("./Pages/Authentication/ResetPassword"),
);
import ShellPage from "./User/PodShellModal";
import VMShellPage from "./User/VMShellPage";

const App = () => {
  return (
    <Router>
      <Suspense fallback={<div>Loading...</div>}>
        <Routes>
          {/* Routes that do NOT use the layout */}
          <Route path="/" element={<LoginForm />} />
          <Route path="/shell" element={<ShellPage />} />
          <Route path="/vm-shell" element={<VMShellPage />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/registration" element={<RegistrationForm />} />
          <Route path="/unauthorized" element={<Unauthorized />} />
          <Route path="/faq" element={<FaqPage />} />

          {/* Routes that use the Layout */}
          <Route path="/app" element={<Layout />}>
            <Route
              index // This makes Dashboard the default page under Layout for "/"
              element={
                <ProtectedRoute allowedRoles={["ADMIN"]}>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="dashboard" // Do NOT use "/dashboard" (it becomes relative to parent `/`)
              element={
                <ProtectedRoute allowedRoles={["ADMIN"]}>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="price-plan"
              element={
                <ProtectedRoute allowedRoles={["ADMIN", "FLA", "EMPLOYEE"]}>
                  <PricePlan />
                </ProtectedRoute>
              }
            />
            <Route
              path="helpdesk/dashboard"
              element={
                <HelpdeskWrapper path="http://10.184.40.36:8000/helpdesk/" />
              }
            />
            <Route
              path="helpdesk/submit"
              element={
                <HelpdeskWrapper path="http://10.184.40.36:8000/helpdesk/tickets/submit/" />
              }
            />
            *****************************************/////////////OPENSTACK
            API\\\\\\\\\\\\\\\\\\\\\\\\\\***********************************************************
            <Route
              path="openstack"
              element={
                <ProtectedRoute allowedRoles={["ADMIN"]}>
                  <OpenstackOverview />
                </ProtectedRoute>
              }
            />
            <Route
              path="openstack/editpage"
              element={
                <ProtectedRoute allowedRoles={["ADMIN"]}>
                  <AdminEditPage />
                </ProtectedRoute>
              }
            >
              <Route
                index
                element={
                  <ProtectedRoute allowedRoles={["ADMIN"]}>
                    <ProjectName />
                  </ProtectedRoute>
                }
              />
              <Route
                path="projectname"
                element={
                  <ProtectedRoute allowedRoles={["ADMIN"]}>
                    <ProjectName />
                  </ProtectedRoute>
                }
              />
              <Route
                path="addempolyee"
                element={
                  <ProtectedRoute allowedRoles={["ADMIN"]}>
                    <AddEmployee />
                  </ProtectedRoute>
                }
              />
            </Route>
            <Route
              path="openstack/instance"
              element={
                <ProtectedRoute allowedRoles={["ADMIN"]}>
                  <Instance />
                </ProtectedRoute>
              }
            />
            <Route
              path="openstack/flavors"
              element={
                <ProtectedRoute allowedRoles={["ADMIN"]}>
                  <Flavors />
                </ProtectedRoute>
              }
            />
            <Route
              path="openstack/images"
              element={
                <ProtectedRoute allowedRoles={["ADMIN"]}>
                  <Images />
                </ProtectedRoute>
              }
            />
            <Route
              path="openstack/fileshare"
              element={
                <ProtectedRoute allowedRoles={["ADMIN"]}>
                  <Fileshare />
                </ProtectedRoute>
              }
            />
            <Route
              path="openstack/storage"
              element={
                <ProtectedRoute allowedRoles={["ADMIN"]}>
                  <Storage />
                </ProtectedRoute>
              }
            />
            <Route
              path="openstack/swift-object-storage"
              element={
                <ProtectedRoute allowedRoles={["ADMIN"]}>
                  <SwiftObjectStorage />
                </ProtectedRoute>
              }
            />
            <Route
              path="openstack/volumes"
              element={
                <ProtectedRoute allowedRoles={["ADMIN"]}>
                  <Volume />
                </ProtectedRoute>
              }
            />
            <Route
              path="openstack/volume-type"
              element={
                <ProtectedRoute allowedRoles={["ADMIN"]}>
                  <VolumeType />
                </ProtectedRoute>
              }
            />
            <Route
              path="openstack/vmrequest"
              element={
                <ProtectedRoute allowedRoles={["FLA", "EMPLOYEE"]}>
                  <VmRequest />
                </ProtectedRoute>
              }
            />
            <Route
              path="openstack/add-employee"
              element={
                <ProtectedRoute allowedRoles={["FLA"]}>
                  <AddEmployeefla />
                </ProtectedRoute>
              }
            />
            <Route
              path="openstack/fla/approvals"
              element={
                <ProtectedRoute allowedRoles={["FLA"]}>
                  <Approvals />
                </ProtectedRoute>
              }
            />
            <Route
              path="openstack/admin/approvals"
              element={
                <ProtectedRoute allowedRoles={["ADMIN"]}>
                  <AdminApproval />
                </ProtectedRoute>
              }
            />
            <Route
              path="openstack/vmrequeststatus"
              element={
                <ProtectedRoute allowedRoles={["FLA", "EMPLOYEE"]}>
                  <VMRequestStatus />
                </ProtectedRoute>
              }
            />
            <Route
              path="openstack/health-monitoring"
              element={
                <ProtectedRoute allowedRoles={["FLA", "EMPLOYEE", "ADMIN"]}>
                  <HealthMonitoring />
                </ProtectedRoute>
              }
            />
            <Route
              path="openstack/service-monitoring"
              element={
                <ProtectedRoute allowedRoles={["FLA", "EMPLOYEE", "ADMIN"]}>
                  <ServiceMonitoring />
                </ProtectedRoute>
              }
            />
            <Route
              path="openstack/darpan"
              element={
                <ProtectedRoute allowedRoles={["FLA", "EMPLOYEE", "ADMIN"]}>
                  <Darpan />
                </ProtectedRoute>
              }
            />
            <Route
              path="openstack/log-monitoring"
              element={
                <ProtectedRoute allowedRoles={["FLA", "EMPLOYEE", "ADMIN"]}>
                  <LogMonitoring />
                </ProtectedRoute>
              }
            />
            <Route
              path="openstack/groups"
              element={
                <ProtectedRoute allowedRoles={["ADMIN"]}>
                  <Groups />
                </ProtectedRoute>
              }
            />
            <Route
              path="openstack/groups/members/:groupId"
              element={
                <ProtectedRoute allowedRoles={["ADMIN"]}>
                  <GroupMembersManagement /> {/* Corrected component name */}
                </ProtectedRoute>
              }
            />
            <Route
              path="openstack/projects"
              element={
                <ProtectedRoute allowedRoles={["ADMIN"]}>
                  <Projects />
                </ProtectedRoute>
              }
            />
            <Route
              path="openstack/users"
              element={
                <ProtectedRoute allowedRoles={["ADMIN"]}>
                  <Users />
                </ProtectedRoute>
              }
            />
            <Route
              path="openstack/roles"
              element={
                <ProtectedRoute allowedRoles={["ADMIN"]}>
                  <Roles />
                </ProtectedRoute>
              }
            />
            <Route
              path="openstack/applicationcredentials"
              element={
                <ProtectedRoute allowedRoles={["ADMIN"]}>
                  <ApplicationCredantials />
                </ProtectedRoute>
              }
            />
            <Route
              path="openstack/floating-ips"
              element={
                <ProtectedRoute allowedRoles={["ADMIN"]}>
                  <FloatingIps />
                </ProtectedRoute>
              }
            />
            <Route
              path="openstack/networks"
              element={
                <ProtectedRoute allowedRoles={["ADMIN"]}>
                  <Networks />
                </ProtectedRoute>
              }
            />
            <Route
              path="openstack/network-topology"
              element={
                <ProtectedRoute allowedRoles={["ADMIN"]}>
                  <NetworkTopology />
                </ProtectedRoute>
              }
            />
            <Route
              path="openstack/rbac-policies"
              element={
                <ProtectedRoute allowedRoles={["ADMIN"]}>
                  <RBACpolicies />
                </ProtectedRoute>
              }
            />
            <Route
              path="openstack/routers"
              element={
                <ProtectedRoute allowedRoles={["ADMIN"]}>
                  <Routers />
                </ProtectedRoute>
              }
            />
            <Route
              path="openstack/admin/approvedvmrequest"
              element={
                <ProtectedRoute allowedRoles={["ADMIN"]}>
                  <ApprovedvmRequest />
                </ProtectedRoute>
              }
            />
            <Route
              path="openstack/admin/VMDeleteApproval"
              element={
                <ProtectedRoute allowedRoles={["ADMIN"]}>
                  <VMDeleteApproval />
                </ProtectedRoute>
              }
            />
            <Route
              path="openstack/approvedvmrequest"
              element={
                <ProtectedRoute allowedRoles={["FLA", "EMPLOYEE"]}>
                  <ApprovedvmRequest />
                </ProtectedRoute>
              }
            />
            <Route
              path="openstack/group"
              element={
                <ProtectedRoute allowedRoles={["ADMIN"]}>
                  <Group />
                </ProtectedRoute>
              }
            />
            <Route
              path="openstack/dr-as-a-service"
              element={
                <ProtectedRoute allowedRoles={["ADMIN"]}>
                  <DRService />
                </ProtectedRoute>
              }
            />
            <Route
              path="openstack/host"
              element={
                <ProtectedRoute allowedRoles={["ADMIN"]}>
                  <Host />
                </ProtectedRoute>
              }
            />
            <Route
              path="openstack/hypervisors"
              element={
                <ProtectedRoute allowedRoles={["ADMIN"]}>
                  <Hypervisors />
                </ProtectedRoute>
              }
            />
            ******************************************************************/////////Kubernetes
            API////////**************************************************************************************************
            */
            <Route
              path="kubernetes"
              element={
                <ProtectedRoute allowedRoles={["ADMIN"]}>
                  <KubernetOverview />
                </ProtectedRoute>
              }
            />
            <Route
              path="kubernetes/pods"
              element={
                <ProtectedRoute allowedRoles={["ADMIN"]}>
                  <Pods />
                </ProtectedRoute>
              }
            />
            <Route
              path="kubernetes/services"
              element={
                <ProtectedRoute allowedRoles={["ADMIN"]}>
                  <Services />
                </ProtectedRoute>
              }
            />
            <Route
              path="kubernetes/nodes"
              element={
                <ProtectedRoute allowedRoles={["ADMIN"]}>
                  <Nodes />
                </ProtectedRoute>
              }
            />
            <Route
              path="kubernetes/deployments"
              element={
                <ProtectedRoute allowedRoles={["ADMIN"]}>
                  <Deployments />
                </ProtectedRoute>
              }
            />
            <Route
              path="kubernetes/deploypods"
              element={
                <ProtectedRoute allowedRoles={["FLA", "EMPLOYEE"]}>
                  <DeployPods />
                </ProtectedRoute>
              }
            />
            <Route path="kubernetes/stateful-sets" element={<StatefulSets />} />
            <Route
              path="kubernetes/statefulset-details/:statefulsetName"
              element={<StatefulSetDetails />}
            />
            <Route
              path="kubernetes/persistent-volumes"
              element={<PersistentVolumes />}
            />
            <Route
              path="kubernetes/persistent-volume-details/:pvName"
              element={<PersistentVolumeDetails />}
            />
            <Route
              path="kubernetes/admin-service-approval"
              element={
                <ProtectedRoute allowedRoles={["ADMIN"]}>
                  <AdminServiceApproval />
                </ProtectedRoute>
              }
            />
            <Route
              path="kubernetes/admin/delete-approvals"
              element={
                <ProtectedRoute allowedRoles={["ADMIN"]}>
                  <AdminK8sDeleteApprovals />
                </ProtectedRoute>
              }
            />
            <Route
              path="kubernetes/fla-service-approval"
              element={
                <ProtectedRoute allowedRoles={["FLA"]}>
                  <FlaServiceApproval />
                </ProtectedRoute>
              }
            />
            <Route
              path="kubernetes/request-status"
              element={
                <ProtectedRoute allowedRoles={["FLA", "EMPLOYEE"]}>
                  <K8sRequestStatus />
                </ProtectedRoute>
              }
            />
            <Route
              path="kubernetes/deployed-services"
              element={
                <ProtectedRoute allowedRoles={["EMPLOYEE"]}>
                  <DeployedServices />
                </ProtectedRoute>
              }
            />{" "}
            <Route
              path="kubernetes/events"
              element={
                <ProtectedRoute allowedRoles={["ADMIN"]}>
                  <Events />
                </ProtectedRoute>
              }
            />
            <Route
              path="kubernetes/replica-sets"
              element={
                <ProtectedRoute allowedRoles={["ADMIN"]}>
                  <ReplicaSets />
                </ProtectedRoute>
              }
            />
            <Route
              path="kubernetes/replica-sets"
              element={
                <ProtectedRoute allowedRoles={["ADMIN"]}>
                  <ReplicaSets />
                </ProtectedRoute>
              }
            />
            <Route
              path="kubernetes/deployment-details/:deploymentName"
              element={<DeploymentDetails />}
            />
            <Route
              path="kubernetes/pods-details/:podName"
              element={<PodDetails />}
            />
            <Route
              path="kubernetes/service-details/:serviceName"
              element={<ServiceDetails />}
            />
            <Route
              path="kubernetes/nodes-details/:name"
              element={<NodesDetails />}
            />
            <Route
              path="kubernetes/replicaset-details/:replicasetsName"
              element={<ReplicaSetDetails />}
            />
            *****************************************************////////TICKETING
            SYSTEM\\\\\\\\\\\\\*****************************************************************
            <Route
              path="ticket"
              element={
                <ProtectedRoute allowedRoles={["ADMIN"]}>
                  <AdminTicketDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="ticketform"
              element={
                <ProtectedRoute allowedRoles={["EMPLOYEE", "FLA"]}>
                  <TicketCreationForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="ticketdetails"
              element={
                <ProtectedRoute allowedRoles={["EMPLOYEE", "FLA"]}>
                  <TicketDetailView />
                </ProtectedRoute>
              }
            />
            <Route
              path="ticketlist"
              element={
                <ProtectedRoute allowedRoles={["ADMIN"]}>
                  <TicketListPage />
                </ProtectedRoute>
              }
            />
          </Route>
        </Routes>
      </Suspense>
    </Router>
  );
};

export default App;
