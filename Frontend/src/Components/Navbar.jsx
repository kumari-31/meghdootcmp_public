import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AiOutlineKubernetes, AiOutlineLogout } from "react-icons/ai";
import { SiOpenstack } from "react-icons/si";
import { useAuth } from "../Pages/Authentication/useAuth";

import {
  Switch,
  Menu,
  MenuItem,
  IconButton,
  Typography,
  Divider,
  Box,
} from "@mui/material";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import { styled } from "@mui/material/styles";
import { useTheme } from "./ThemeProvider";
import apiClient from "../Axios";
import Badge from "@mui/material/Badge";
import NotificationsIcon from "@mui/icons-material/Notifications";
import { useNotificationRefresh } from "./PendingRequestContext";
import dayjs from "dayjs";
import isToday from "dayjs/plugin/isToday";
dayjs.extend(isToday);
import "./Navbar.css";

/* -------------------- 🌗 THEME SWITCH -------------------- */

const ThemeSwitch = styled(Switch)(({ theme }) => ({
  width: 62,
  height: 34,
  padding: 7,
  "& .MuiSwitch-switchBase": {
    margin: 1,
    padding: 0,
    transform: "translateX(6px)",
    "&.Mui-checked": {
      color: "#fff",
      transform: "translateX(22px)",
      "& .MuiSwitch-thumb:before": {
        backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" height="20" width="20" viewBox="0 0 20 20"><path fill="${encodeURIComponent(
          "#fff"
        )}" d="M4.2 2.5l-.7 1.8-1.8.7 1.8.7.7 1.8.6-1.8L6.7 5l-1.9-.7-.6-1.8zm15 8.3a6.7 6.7 0 11-6.6-6.6 5.8 5.8 0 006.6 6.6z"/></svg>')`,
      },
      "& + .MuiSwitch-track": {
        opacity: 1,
        backgroundColor: "#aab4be",
      },
    },
  },
  "& .MuiSwitch-thumb": {
    backgroundColor: "#001e3c",
    width: 32,
    height: 32,
    "&::before": {
      content: "''",
      position: "absolute",
      width: "100%",
      height: "100%",
      left: 0,
      top: 0,
      backgroundRepeat: "no-repeat",
      backgroundPosition: "center",
      backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" height="20" width="20" viewBox="0 0 20 20"><path fill="${encodeURIComponent(
        "#fff"
      )}" d="M9.305 1.667V3.75h1.389V1.667h-1.39zm-4.707 1.95l-.982.982L5.09 6.072l.982-.982-1.473-1.473zm10.802 0L13.927 5.09l.982.982 1.473-1.473-.982-.982zM10 5.139a4.872 4.872 0 00-4.862 4.86A4.872 4.872 0 0010 14.862 4.872 4.872 0 0014.86 10 4.872 4.872 0 0010 5.139zm0 1.389A3.462 3.462 0 0113.471 10a3.462 3.462 0 01-3.473 3.472A3.462 3.462 0 016.527 10 3.462 3.462 0 0110 6.528zM1.665 9.305v1.39h2.083v-1.39H1.666zm14.583 0v1.39h2.084v-1.39h-2.084zM5.09 13.928L3.616 15.4l.982.982 1.473-1.473-.982-.982zm9.82 0l-.982.982 1.473 1.473.982-.982-1.473-1.473zM9.305 16.25v2.083h1.389V16.25h-1.39z"/></svg>')`,
    },
  },
  "& .MuiSwitch-track": {
    opacity: 1,
    backgroundColor: "#aab4be",
    borderRadius: 20 / 2,
  },
}));

/* -------------------- 🧭 NAVBAR COMPONENT -------------------- */

const Navbar = () => {
  const [menuItems, setMenuItems] = useState({ openstack: [], kubernetes: [] });
  const [selectedMenu, setSelectedMenu] = useState(null);
  const [selectedSubMenu, setSelectedSubMenu] = useState(null);
  const [selectedPlatform, setSelectedPlatform] = useState(
    localStorage.getItem("selectedPlatform") || "openstack"
  );
  const { darkMode, toggleTheme } = useTheme();

  const [openstackPending, setOpenstackPending] = useState([]);
  const [k8sPending, setK8sPending] = useState([]);

  const { logout, user } = useAuth();
  const userRole = user?.role;
  const navigate = useNavigate();

  const [profileAnchor, setProfileAnchor] = useState(null);
  const [notificationAnchor, setNotificationAnchor] = useState(null);

  /* -------------------- 🔔 NOTIFICATION HANDLERS -------------------- */

  /* 🔔 Notification Handlers */
  const handleNotificationClick = (event) => {
    setNotificationAnchor(event.currentTarget);
  };
  const handleNotificationClose = () => {
    setNotificationAnchor(null);
  };

  /* -------------------- 👤 PROFILE HANDLERS -------------------- */
  const handleProfileClick = (event) => setProfileAnchor(event.currentTarget);
  const handleProfileClose = () => setProfileAnchor(null);

  /* -------------------- 🔍 FETCH PENDING REQUESTS (ADMIN and FLA ONLY) -------------------- */

  const { refreshKey } = useNotificationRefresh();

  const fetchNotifications = async () => {
    if (userRole !== "ADMIN" && userRole !== "FLA") return;
    try {
      // OpenStack
      const osEndpoint =
        userRole === "ADMIN" ? "/vmrequests/admin/" : "/vmrequests/fla/";
      const osRes = await apiClient.get(osEndpoint);
      const osAll = osRes.data.data || [];

      const osPending = osAll.filter((req) =>
        userRole === "ADMIN"
          ? req.fla_status === "Accepted" && req.admin_status === "Pending"
          : req.fla_status === "Pending"
      );

      setOpenstackPending(osPending);

      // Kubernetes
      const k8sEndpoint =
        userRole === "ADMIN" ? "/service-requests/" : "/fla/service-requests/";
      const k8sRes = await apiClient.get(k8sEndpoint);
      const k8sAll = k8sRes.data.data || [];

      const k8sPending = k8sAll.filter((req) =>
        userRole === "ADMIN"
          ? req.fla_status === "Accepted" && req.admin_status === "Pending"
          : req.fla_status === "Pending"
      );

      setK8sPending(k8sPending);
    } catch (err) {
      console.error("Notification fetch failed", err);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [userRole, refreshKey]);

  const totalPending = openstackPending.length + k8sPending.length;

  /* -------------------- 🧩 MENU GENERATOR -------------------- */

  const getMenuByRole = (role) => {
    const fullMenu = {
      openstack: [
        {
          id: 1,
          name: "Operations",
          subMenu: [
            {
              name: "VM Request",
              path: "/app/openstack/vmrequest",
              roles: ["FLA", "EMPLOYEE"],
            },
            {
              name: "Approvals",
              path: "/app/openstack/fla/approvals",
              roles: ["FLA"],
            },
            {
              name: "Add Employee",
              path: "/app/openstack/add-employee",
              roles: ["FLA"],
            },
            {
              id: "admin_approvals",
              name: "Approvals",
              path: "/app/openstack/admin/approvals",
              roles: ["ADMIN"],
            },
            {
              name: "VM DeleteApproval",
              path: "/app/openstack/admin/vmdeleteapproval",
              roles: ["ADMIN"],
            },
            {
              name: "Admin Edit",
              path: "/app/openstack/editpage",
              roles: ["ADMIN"],
            },
            {
              name: "View Request Status",
              path: "/app/openstack/vmrequeststatus",
              roles: ["FLA", "EMPLOYEE"],
            },
            {
              name: "Approved Request",
              path: "/app/openstack/approvedvmrequest",
              roles: ["FLA", "EMPLOYEE"],
            },
          ],
        },
        ...(role === "ADMIN"
          ? [
              {
                id: 2,
                name: "Provisioning",
                subMenu: ["Instance", "Flavors", "Images"].map((item) => ({
                  name: item,
                  path: `/app/openstack/${item.toLowerCase()}`,
                })),
              },
              {
                id: 3,
                name: "Infrastructure",
                subMenu: [
                  // "Group",
                  // "DR as a Service",
                  "Host",
                  "Hypervisors",
                ].map((item) => ({
                  name: item,
                  path: `/app/openstack/${item
                    .toLowerCase()
                    .replace(/\s+/g, "-")}`,
                })),
              },
              {
                id: 4,
                name: "Storage",
                subMenu: [
                  // "Storage",
                  // "Swift Object Storage",
                  // "Fileshare",
                  "Volumes",
                  "Volume Type",
                ].map((item) => ({
                  name: item,
                  path: `/app/openstack/${item
                    .toLowerCase()
                    .replace(/\s+/g, "-")}`,
                })),
              },
              {
                id: 5,
                name: "Network",
                subMenu: [
                  "Networks",
                  "Network Topology",
                  "RBAC Policies",
                  "Routers",
                  "Floating Ips",
                ].map((item) => ({
                  name: item,
                  path: `/app/openstack/${item
                    .toLowerCase()
                    .replace(/\s+/g, "-")}`,
                })),
              },
              {
                id: 6,
                name: "Monitoring",
                subMenu: [
                  // "Log Monitoring",
                  // "Darpan",
                  "Service Monitoring",
                  "Health Monitoring",
                ].map((item) => ({
                  name: item,
                  path: `/app/openstack/${item
                    .toLowerCase()
                    .replace(/\s+/g, "-")}`,
                })),
              },
              {
                id: 7,
                name: "Administration",
                subMenu: [
                  "Projects",
                  "Users",
                  "Groups",
                  "Roles",
                  "ApplicationCredentials",
                ].map((item) => ({
                  name: item,
                  path: `/app/openstack/${item
                    .toLowerCase()
                    .replace(/\s+/g, "-")}`,
                })),
              },
              // {
              //   id: 8,
              //   name: "Price Plan",
              //   subMenu: [
              //     {
              //       name: "Price Plan",
              //       path: "/app/price-plan",
              //     },
              //   ],
              // },
            ]
          : []),

        // {
        //   id: 9,
        //   name: "Support",
        //   subMenu: [
        //     {
        //       name: "Helpdesk",
        //       action: "helpdesk_redirect", // Instead of path
        //       roles: ["ADMIN", "FLA", "EMPLOYEE"],
        //     },
        //   ],
        // },
      ],

      kubernetes: [
        {
          id: 1,
          name: "Operations",
          subMenu: [
            {
              name: "FLA Approvals",
              path: "/app/kubernetes/fla-service-approval",
              roles: ["FLA"],
            },
            {
              name: "Admin Approvals",
              path: "/app/kubernetes/admin-service-approval",
              roles: ["ADMIN"],
            },
              {
              name: "Admin Delete Approvals",
              path: "/app/kubernetes/admin/delete-approvals",
              roles: ["ADMIN"],
            },
            {
              name: "Request Services",
              path: "/app/kubernetes/deploypods",
              roles: ["FLA", "EMPLOYEE"],
            },
            {
              name: "Request Service Status",
              path: "/app/kubernetes/request-status",
              roles: ["FLA", "EMPLOYEE"],
            },
            {
              name: "Deployed Services",
              path: "/app/kubernetes/deployed-services",
              roles: ["EMPLOYEE"],
            },
          ],
        },
        ...(role === "ADMIN"
          ? [
              {
                id: 2,
                name: "Catalogue",
                subMenu: [
                  { name: "Deploy Pods", path: "/app/kubernetes/pods" },
                  {
                    name: "Replica Sets",
                    path: "/app/kubernetes/replica-sets",
                  },
                ],
              },
              {
                id: 3,
                name: "Service",
                subMenu: [
                  { name: "Services", path: "/app/kubernetes/services" },
                  {
                    name: "Persistent Volume",
                    path: "/app/kubernetes/persistent-volumes",
                  },
                ],
              },
              {
                id: 4,
                name: "Cluster",
                subMenu: [
                  { name: "Nodes", path: "/app/kubernetes/nodes" },
                  { name: "Deployments", path: "/app/kubernetes/deployments" },
                  { name: "Events", path: "/app/kubernetes/events" },
                  {
                    name: "Stateful Sets",
                    path: "/app/kubernetes/stateful-sets",
                  },
                ],
              },
            ]
          : []),
      ],
    };

    // 🔍 Filters menu items based on role
    const filterMenuByRole = (menus) =>
      menus
        .map((section) => ({
          ...section,
          subMenu: section.subMenu.filter((item) => {
            if (!item.roles) return true;
            return item.roles.includes(role);
          }),
        }))
        .filter((section) => section.subMenu.length > 0);

    return {
      openstack: filterMenuByRole(fullMenu.openstack),
      kubernetes: filterMenuByRole(fullMenu.kubernetes),
    };
  };

  /* -------------------- 📋 BUILD MENUS WHEN ROLE CHANGES -------------------- */

  useEffect(() => {
    if (userRole) {
      const menus = getMenuByRole(userRole);
      setMenuItems(menus);
    }
  }, [userRole]);

  /* -------------------- ⚙️ UI HANDLERS -------------------- */
  const handleMenuClick = (menuId) =>
    setSelectedMenu(selectedMenu === menuId ? null : menuId);

  // const handleSubMenuClick = (subMenuName) => setSelectedSubMenu(subMenuName);

  const handleSubMenuClick = async (item) => {
    setSelectedSubMenu(item.name);

    if (item.action === "helpdesk_redirect") {
      if (userRole === "ADMIN") {
        navigate("/app/helpdesk/dashboard");
      } else {
        navigate("/app/helpdesk/submit");
      }
    } else if (item.path) {
      navigate(item.path);
    }
  };

  const handlePlatformChange = (platform) => {
    setSelectedPlatform(platform);
    localStorage.setItem("selectedPlatform", platform);
    setSelectedMenu(null);

    if (userRole === "ADMIN") {
      navigate(`/app/${platform}`);
    } else if (userRole === "FLA") {
      // Default route for FLA
      navigate(
        platform === "openstack"
          ? "/app/openstack/fla/approvals"
          : "/app/kubernetes/fla-service-approval"
      );
    } else if (userRole === "EMPLOYEE") {
      // Default route for Employee
      navigate(
        platform === "openstack"
          ? "/app/openstack/vmrequest"
          : "/app/kubernetes/deploypods"
      );
    }
  };

  /* 🧱 Meghdoot Cloud click handler (avoid unauthorized for FLA/EMPLOYEE) */
  const handleLogoClick = (e) => {
    e.preventDefault();
    setSelectedPlatform("openstack");

    if (userRole === "ADMIN") navigate("/app/dashboard");
    else if (userRole === "FLA") navigate("/app/openstack/fla/approvals");
    else if (userRole === "EMPLOYEE") navigate("/app/openstack/vmrequest");
  };

  /* -------------------- 🧱 RENDER -------------------- */

  return (
    <div>
      {/* Top Navbar */}
      <div className="navbar">
        <div className="left-section">
          <div className="logo">
            <a href="/" className="link" onClick={handleLogoClick}>
              Meghdoot Cloud
            </a>
          </div>

          <div className="platform-icons">
            <div
              className={`platform-icon-container openstack-name ${
                selectedPlatform === "openstack" ? "active" : ""
              }`}
              onClick={() => handlePlatformChange("openstack")}
            >
              <SiOpenstack className="platform-icon openstack-icon" />
              <span className="platform-name">OpenStack</span>
            </div>
            <div
              className={`platform-icon-container kubernet-name ${
                selectedPlatform === "kubernetes" ? "active" : ""
              }`}
              onClick={() => handlePlatformChange("kubernetes")}
            >
              <AiOutlineKubernetes className="platform-icon kubernet-icon" />
              <span className="platform-name">Kubernetes</span>
            </div>
          </div>
        </div>
        <div className="right-section">
          {(userRole === "ADMIN" || userRole === "FLA") && (
            <>
              <IconButton color="inherit" onClick={handleNotificationClick}>
                <Badge
                  badgeContent={totalPending}
                  color="error"
                  invisible={totalPending === 0}
                >
                  <NotificationsIcon />
                </Badge>
              </IconButton>

              <Menu
                anchorEl={notificationAnchor}
                open={Boolean(notificationAnchor)}
                onClose={handleNotificationClose}
                PaperProps={{
                  sx: {
                    width: 360,
                    maxHeight: 420,
                    overflowY: "auto",
                    mt: 1.7,
                    borderRadius: 2,
                  },
                }}
              >
                {/* ================= OPENSTACK ================= */}
                <Box
                  sx={{
                    px: 2,
                    py: 1,
                    bgcolor: (theme) =>
                      theme.palette.mode === "dark" ? "#2a1f14" : "#FFF7ED",
                  }}
                >
                  <Typography
                    variant="subtitle2"
                    fontWeight={700}
                    sx={{ display: "flex", alignItems: "center", gap: 1 }}
                  >
                    <SiOpenstack color="#F97316" />
                    OpenStack Requests ({openstackPending.length})
                  </Typography>
                </Box>

                <Divider />

                {openstackPending.length === 0 ? (
                  <MenuItem disabled>No pending OpenStack requests</MenuItem>
                ) : (
                  openstackPending.map((req) => (
                    <MenuItem
                      key={`os-${req.id}`}
                      onClick={() => {
                        navigate(
                          userRole === "ADMIN"
                            ? "/app/openstack/admin/approvals"
                            : "/app/openstack/fla/approvals"
                        );
                        handleNotificationClose();
                      }}
                      sx={{
                        alignItems: "flex-start",
                        gap: 1.5,
                        bgcolor: "background.paper",
                        color: "text.primary",
                        "&:hover": {
                          bgcolor: "action.hover",
                        },
                      }}
                    >
                      {/* Icon */}
                      <Box
                        sx={{
                          bgcolor: "#FDBA74",
                          p: 1,
                          borderRadius: "50%",
                          display: "flex",
                        }}
                      >
                        <SiOpenstack color="#9A3412" size={18} />
                      </Box>

                      {/* Content */}
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" fontWeight={600} noWrap color="text.secondary">
                          {req.name}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          noWrap
                        >
                          Project: {req.project_name}
                        </Typography>

                        <Typography
                          variant="caption"
                          sx={{ display: "block", mt: 0.5, textAlign: "right" }}
                          color="text.secondary"
                        >
                          {dayjs(req.request_timestamp).format(
                            "DD MMM YYYY, hh:mm A"
                          )}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))
                )}

                <Divider sx={{ my: 1 }} />

                {/* ================= KUBERNETES ================= */}
                <Box
                  sx={{
                    px: 2,
                    py: 1,
                    bgcolor: (theme) =>
                      theme.palette.mode === "dark" ? "#0f1e33" : "#EFF6FF",
                  }}
                >
                  <Typography
                    variant="subtitle2"
                    fontWeight={700}
                    sx={{ display: "flex", alignItems: "center", gap: 1 }}
                  >
                    <AiOutlineKubernetes color="#2563EB" size={18} />
                    Kubernetes Requests ({k8sPending.length})
                  </Typography>
                </Box>

                <Divider />

                {k8sPending.length === 0 ? (
                  <MenuItem disabled>No pending Kubernetes requests</MenuItem>
                ) : (
                  k8sPending.map((req) => (
                    <MenuItem
                      key={`k8s-${req.id}`}
                      onClick={() => {
                        navigate(
                          userRole === "ADMIN"
                            ? "/app/kubernetes/admin-service-approval"
                            : "/app/kubernetes/fla-service-approval"
                        );
                        handleNotificationClose();
                      }}
                      sx={{
                        alignItems: "flex-start",
                        gap: 1.5,
                        bgcolor: "background.paper",
                        color: "text.primary",
                        "&:hover": {
                          bgcolor: "action.hover",
                        },
                      }}
                    >
                      {/* Icon */}
                      <Box
                        sx={{
                          bgcolor: "#93C5FD",
                          p: 1,
                          borderRadius: "50%",
                          display: "flex",
                        }}
                      >
                        <AiOutlineKubernetes color="#1E40AF" size={18} />
                      </Box>

                      {/* Content */}
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" fontWeight={600} noWrap color="text.primary">
                          {req.app_name}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          noWrap
                        >
                          Service: {req.service_name}
                        </Typography>

                        <Typography
                          variant="caption"
                          sx={{ display: "block", mt: 0.5, textAlign: "right" }}
                          color="text.secondary"
                        >
                          {dayjs(req.request_timestamp).format(
                            "DD MMM YYYY, hh:mm A"
                          )}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))
                )}
              </Menu>
            </>
          )}
          <ThemeSwitch checked={darkMode} onChange={toggleTheme} />

          <IconButton onClick={handleProfileClick} title="Account Management">
            <AccountCircleIcon fontSize="large" sx={{ color: "white" }} />
          </IconButton>

          <Menu
            anchorEl={profileAnchor}
            open={Boolean(profileAnchor)}
            onClose={handleProfileClose}
            PaperProps={{
              sx: {
                width: 200,
                maxHeight: 400,
                overflowY: "auto",
                mt: 1.7,
              },
            }}
          >
            {user ? (
              <>
                <MenuItem disabled>
                  <Typography variant="subtitle1">
                    <b>{user.role || "Admin"}</b>
                  </Typography>
                </MenuItem>
                <MenuItem disabled>
                  <Typography variant="body2">{user.first_name}</Typography>
                </MenuItem>
                {user.email && (
                  <MenuItem disabled>
                    <Typography variant="body2">{user.email}</Typography>
                  </MenuItem>
                )}
                <Divider />
                <MenuItem onClick={logout} sx={{ color: "red" }}>
                  <AiOutlineLogout className="logout-btn" />
                  <Typography variant="body2" sx={{ ml: 1 }}>
                    Sign Out
                  </Typography>
                </MenuItem>
              </>
            ) : (
              <MenuItem disabled>
                <Typography variant="body2">Loading user data...</Typography>
              </MenuItem>
            )}
          </Menu>
        </div>
      </div>

      {/* Horizontal Menu */}
      <div className="menu-bar">
        {menuItems[selectedPlatform].map((menu) => {
          return (
            <div
              key={menu.id}
              className={`menu-item ${
                selectedMenu === menu.id ? "active" : ""
              }`}
              onClick={() => handleMenuClick(menu.id)}
            >
              <span>{menu.name}</span>
            </div>
          );
        })}
      </div>

      {/* Submenu */}
      {selectedMenu && (
        <div className="sub-menu">
          {menuItems[selectedPlatform]
            .find((menu) => menu.id === selectedMenu)
            ?.subMenu.map((item, index) => {
              const isApprovals = item.id === "admin_approvals";

              return (
                <div
                  key={index}
                  className={`sub-menu-item ${
                    selectedSubMenu === item.name ? "active" : ""
                  }`}
                  onClick={() => handleSubMenuClick(item)}
                >
                  <Link to={item.path} className="link">
                    {isApprovals ? (
                      <Badge
                        badgeContent={openstackPending.length}
                        color="error"
                        invisible={openstackPending.length === 0}
                      >
                        <span>{item.name}</span>
                      </Badge>
                    ) : (
                      <span>{item.name}</span>
                    )}
                  </Link>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
};

export default Navbar;

// import { useState, useEffect } from "react";
// import { Link, useNavigate } from "react-router-dom";
// import { AiOutlineKubernetes, AiOutlineLogout } from "react-icons/ai";
// import { SiOpenstack } from "react-icons/si";
// import { useAuth } from "../Pages/Authentication/authContext";

// import {
//   Switch,
//   Menu,
//   MenuItem,
//   IconButton,
//   Typography,
//   Divider,
//   Box,
//   Badge,
// } from "@mui/material";
// import AccountCircleIcon from "@mui/icons-material/AccountCircle";
// import { styled } from "@mui/material/styles";
// import { useTheme } from "./ThemeProvider";
// import apiClient from "../Axios";
// import NotificationsIcon from "@mui/icons-material/Notifications";
// import "./Navbar.css";

// /* -------------------- 🌗 THEME SWITCH -------------------- */
// const ThemeSwitch = styled(Switch)(({ theme }) => ({
//   width: 62,
//   height: 34,
//   padding: 7,
//   "& .MuiSwitch-switchBase": {
//     margin: 1,
//     padding: 0,
//     transform: "translateX(6px)",
//     "&.Mui-checked": {
//       color: "#fff",
//       transform: "translateX(22px)",
//       "& .MuiSwitch-thumb:before": {
//         backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" height="20" width="20" viewBox="0 0 20 20"><path fill="${encodeURIComponent(
//           "#fff"
//         )}" d="M4.2 2.5l-.7 1.8-1.8.7 1.8.7.7 1.8.6-1.8L6.7 5l-1.9-.7-.6-1.8zm15 8.3a6.7 6.7 0 11-6.6-6.6 5.8 5.8 0 006.6 6.6z"/></svg>')`,
//       },
//       "& + .MuiSwitch-track": {
//         opacity: 1,
//         backgroundColor: "#aab4be",
//       },
//     },
//   },
//   "& .MuiSwitch-thumb": {
//     backgroundColor: "#001e3c",
//     width: 32,
//     height: 32,
//     "&::before": {
//       content: "''",
//       position: "absolute",
//       width: "100%",
//       height: "100%",
//       left: 0,
//       top: 0,
//       backgroundRepeat: "no-repeat",
//       backgroundPosition: "center",
//       backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" height="20" width="20" viewBox="0 0 20 20"><path fill="${encodeURIComponent(
//         "#fff"
//       )}" d="M9.305 1.667V3.75h1.389V1.667h-1.39zm-4.707 1.95l-.982.982L5.09 6.072l.982-.982-1.473-1.473zm10.802 0L13.927 5.09l.982.982 1.473-1.473-.982-.982zM10 5.139a4.872 4.872 0 00-4.862 4.86A4.872 4.872 0 0010 14.862 4.872 4.872 0 0014.86 10 4.872 4.872 0 0010 5.139zm0 1.389A3.462 3.462 0 0113.471 10a3.462 3.462 0 01-3.473 3.472A3.462 3.462 0 016.527 10 3.462 3.462 0 0110 6.528zM1.665 9.305v1.39h2.083v-1.39H1.666zm14.583 0v1.39h2.084v-1.39h-2.084zM5.09 13.928L3.616 15.4l.982.982 1.473-1.473-.982-.982zm9.82 0l-.982.982 1.473 1.473.982-.982-1.473-1.473zM9.305 16.25v2.083h1.389V16.25h-1.39z"/></svg>')`,
//     },
//   },
//   "& .MuiSwitch-track": {
//     opacity: 1,
//     backgroundColor: "#aab4be",
//     borderRadius: 20 / 2,
//   },
// }));

// /* -------------------- 🧭 NAVBAR COMPONENT -------------------- */
// const Navbar = () => {
//   const [menuItems, setMenuItems] = useState({ openstack: [], kubernetes: [] });
//   const [selectedMenu, setSelectedMenu] = useState(null);
//   const [selectedSubMenu, setSelectedSubMenu] = useState(null);
//   const [selectedPlatform, setSelectedPlatform] = useState(
//     localStorage.getItem("selectedPlatform") || null
//   );
//   const [showMenu, setShowMenu] = useState(false);

//   const { darkMode, toggleTheme } = useTheme();
//   const [pendingRequests, setPendingRequests] = useState([]);
//   const { logout, user } = useAuth();
//   const userRole = user?.role;
//   const navigate = useNavigate();

//   const [profileAnchor, setProfileAnchor] = useState(null);
//   const [notificationAnchor, setNotificationAnchor] = useState(null);

//   /* -------------------- 🔔 Notification Handlers -------------------- */
//   const handleNotificationClick = (event) => {
//     setNotificationAnchor(event.currentTarget);
//   };
//   const handleNotificationClose = () => setNotificationAnchor(null);
//   const handleApprovalonClick = () => {
//     if (userRole === "ADMIN") navigate("/app/openstack/admin/approvals");
//     else if (userRole === "FLA") navigate("/app/openstack/fla/approvals");
//     handleNotificationClose();
//   };

//   /* -------------------- 👤 PROFILE HANDLERS -------------------- */
//   const handleProfileClick = (event) => setProfileAnchor(event.currentTarget);
//   const handleProfileClose = () => setProfileAnchor(null);

//   /* -------------------- 🔍 FETCH PENDING REQUESTS -------------------- */
//   useEffect(() => {
//     if (userRole === "ADMIN" || userRole === "FLA") {
//       (async () => {
//         try {
//           const endpoint = userRole === "ADMIN" ? "/vmrequests/admin/" : "/vmrequests/fla/";
//           const response = await apiClient.get(endpoint);
//           const all = response.data.data || [];
//           const pending = all.filter((req) =>
//             userRole === "ADMIN"
//               ? req.admin_status === "Pending"
//               : req.fla_status === "Pending"
//           );
//           setPendingRequests(pending);
//         } catch (error) {
//           console.error("Error fetching VM requests:", error);
//         }
//       })();
//     }
//   }, [userRole]);

//   /* -------------------- 🧩 MENU GENERATOR -------------------- */
//   const getMenuByRole = (role) => {
//     const fullMenu = {
//       openstack: [
//         {
//           id: 1,
//           name: "Operations",
//           subMenu: [
//             { name: "VmRequest", path: "/app/openstack/vmrequest", roles: ["FLA", "EMPLOYEE"] },
//             { name: "Approvals", path: "/app/openstack/fla/approvals", roles: ["FLA"] },
//             { name: "Add Employee", path: "/app/openstack/add-employee", roles: ["FLA"] },
//             { id: "admin_approvals", name: "Approvals", path: "/app/openstack/admin/approvals", roles: ["ADMIN"] },
//             { name: "Approved Request", path: "/app/openstack/admin/approvedvmrequest", roles: ["ADMIN"] },
//             { name: "Admin Edit", path: "/app/openstack/editpage", roles: ["ADMIN"] },
//             { name: "View Request Status", path: "/app/openstack/vmrequeststatus", roles: ["FLA", "EMPLOYEE"] },
//             { name: "Approved Request", path: "/app/openstack/approvedvmrequest", roles: ["FLA", "EMPLOYEE"] },
//           ],
//         },
//         // Admin extra menus
//         ...(role === "ADMIN" ? [
//           { id: 2, name: "Provisioning", subMenu: ["Instance", "Flavors", "Images"].map(item => ({ name: item, path: `/app/openstack/${item.toLowerCase()}` })) },
//           { id: 3, name: "Infrastructure", subMenu: ["Group", "DR as a Service", "Host", "Hypervisors"].map(item => ({ name: item, path: `/app/openstack/${item.toLowerCase().replace(/\s+/g, "-")}` })) },
//           { id: 4, name: "Storage", subMenu: ["Storage", "Swift Object Storage", "Fileshare", "Volumes", "Volume Type"].map(item => ({ name: item, path: `/app/openstack/${item.toLowerCase().replace(/\s+/g, "-")}` })) },
//           { id: 5, name: "Network", subMenu: ["Networks", "Network Topology", "RBAC Policies", "Routers", "Floating Ips"].map(item => ({ name: item, path: `/app/openstack/${item.toLowerCase().replace(/\s+/g, "-")}` })) },
//           { id: 6, name: "Monitoring", subMenu: ["Log Monitoring", "Darpan", "Service Monitoring", "Health Monitoring"].map(item => ({ name: item, path: `/app/openstack/${item.toLowerCase().replace(/\s+/g, "-")}` })) },
//           { id: 7, name: "Administration", subMenu: ["Projects", "Users", "Groups", "Roles","ApplicationCredentials"].map(item => ({ name: item, path: `/app/openstack/${item.toLowerCase().replace(/\s+/g, "-")}` })) },
//         ] : []),
//         { id: 9, name: "Support", subMenu: [
//           ...(role === "ADMIN" ? [{ name: "Ticketing", path: "/app/ticketlist" }] : []),
//           ...(role === "EMPLOYEE" || role === "FLA" ? [
//             { name: "My Tickets", path: "/app/ticketdetails" },
//             { name: "Create Ticket", path: "/app/ticketform" },
//           ] : []),
//         ] },
//       ],
//       kubernetes: [
//         {
//           id: 1,
//           name: "Operations",
//           subMenu: [
//             { name: "FLA Approvals", path: "/app/kubernetes/fla-service-approval", roles: ["FLA"] },
//             { name: "Admin Approvals", path: "/app/kubernetes/admin-service-approval", roles: ["ADMIN"] },
//             { name: "Request Services", path: "/app/kubernetes/deploypods", roles: ["FLA", "EMPLOYEE"] },
//             { name: "Request Service Status", path: "/app/kubernetes/request-status", roles: ["FLA", "EMPLOYEE"] },
//           ],
//         },
//         ...(role === "ADMIN" ? [
//           { id: 2, name: "Catalogue", subMenu: [{ name: "Deploy Pods", path: "/app/kubernetes/pods" }, { name: "Replica Sets", path: "/app/kubernetes/replica-sets" }] },
//           { id: 3, name: "Service", subMenu: [{ name: "Services", path: "/app/kubernetes/services" }, { name: "Persistent Volume", path: "/app/kubernetes/persistent-volumes" }] },
//           { id: 4, name: "Cluster", subMenu: [
//             { name: "Nodes", path: "/app/kubernetes/nodes" },
//             { name: "Deployments", path: "/app/kubernetes/deployments" },
//             { name: "Events", path: "/app/kubernetes/events" },
//             { name: "Stateful Sets", path: "/app/kubernetes/stateful-sets" },
//           ] },
//         ] : []),
//       ],
//     };

//     // Filter by role
//     const filterMenuByRole = (menus) =>
//       menus
//         .map(section => ({
//           ...section,
//           subMenu: section.subMenu.filter(item => !item.roles || item.roles.includes(role))
//         }))
//         .filter(section => section.subMenu.length > 0);

//     return {
//       openstack: filterMenuByRole(fullMenu.openstack),
//       kubernetes: filterMenuByRole(fullMenu.kubernetes),
//     };
//   };

//   useEffect(() => {
//     if (userRole) {
//       const menus = getMenuByRole(userRole);
//       setMenuItems(menus);
//     }
//   }, [userRole]);

//   /* -------------------- UI HANDLERS -------------------- */
//   const handleMenuClick = (menuId) => setSelectedMenu(selectedMenu === menuId ? null : menuId);
//   const handleSubMenuClick = (subMenuName) => setSelectedSubMenu(subMenuName);

//   const handlePlatformChange = (platform) => {
//     setSelectedPlatform(platform);
//     localStorage.setItem("selectedPlatform", platform);
//     setSelectedMenu(null);
//     setShowMenu(true);

//     if (userRole === "ADMIN") navigate(`/app/${platform}`);
//     else if (userRole === "FLA") navigate(platform === "openstack" ? "/app/openstack/fla/approvals" : "/app/kubernetes/fla-service-approval");
//     else if (userRole === "EMPLOYEE") navigate(platform === "openstack" ? "/app/openstack/vmrequest" : "/app/kubernetes/deploypods");
//   };

//   const handleLogoClick = (e) => {
//     e.preventDefault();
//     if (userRole === "ADMIN") navigate("/app/dashboard");
//     else if (userRole === "FLA") navigate("/app/openstack/fla/approvals");
//     else if (userRole === "EMPLOYEE") navigate("/app/openstack/vmrequest");
//   };

//   /* -------------------- RENDER -------------------- */
//   return (
//     <div>
//       {/* Top Navbar */}
//       <div className="navbar">
//         <div className="left-section">
//           <div className="logo">
//             <a href="/" className="link" onClick={handleLogoClick}>
//               Meghdoot Cloud
//             </a>
//           </div>

//           <div className="platform-icons">
//             <div
//               className={`platform-icon-container openstack-name ${selectedPlatform === "openstack" ? "active" : ""}`}
//               onClick={() => handlePlatformChange("openstack")}
//             >
//               <SiOpenstack className="platform-icon openstack-icon" />
//               <span className="platform-name">OpenStack</span>
//             </div>
//             <div
//               className={`platform-icon-container kubernet-name ${selectedPlatform === "kubernetes" ? "active" : ""}`}
//               onClick={() => handlePlatformChange("kubernetes")}
//             >
//               <AiOutlineKubernetes className="platform-icon kubernet-icon" />
//               <span className="platform-name">Kubernetes</span>
//             </div>
//           </div>
//         </div>

//         <div className="right-section">
//           <IconButton color="inherit" onClick={handleNotificationClick}>
//             <Badge badgeContent={pendingRequests.length} color="error" invisible={pendingRequests.length === 0}>
//               <NotificationsIcon />
//             </Badge>
//           </IconButton>

//           <Menu
//             anchorEl={notificationAnchor}
//             open={Boolean(notificationAnchor)}
//             onClose={handleNotificationClose}
//             PaperProps={{ sx: { width: 320, maxHeight: 400, overflowY: "auto", mt: 1.7 } }}
//           >
//             <Box sx={{ px: 2, py: 1 }}>
//               <Typography variant="h6">{userRole === "ADMIN" ? "Pending VM Requests" : "Pending FLA Requests"}</Typography>
//             </Box>
//             <Divider />
//             {pendingRequests.length === 0 ? (
//               <MenuItem disabled>No pending requests</MenuItem>
//             ) : (
//               pendingRequests.map((req) => (
//                 <MenuItem key={req.id} onClick={handleApprovalonClick} sx={{ alignItems: "flex-start" }}>
//                   <Box>
//                     <Typography variant="body1" noWrap>
//                       <strong>{req.name}</strong> sent request for <strong>{req.project_name}</strong>
//                     </Typography>
//                     <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
//                       {new Date(req.request_timestamp).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true })}
//                     </Typography>
//                   </Box>
//                 </MenuItem>
//               ))
//             )}
//           </Menu>

//           <ThemeSwitch checked={darkMode} onChange={toggleTheme} />

//           <IconButton onClick={handleProfileClick} title="Account Management">
//             <AccountCircleIcon fontSize="large" sx={{ color: "white" }} />
//           </IconButton>

//           <Menu
//             anchorEl={profileAnchor}
//             open={Boolean(profileAnchor)}
//             onClose={handleProfileClose}
//             PaperProps={{ sx: { width: 200, maxHeight: 400, overflowY: "auto", mt: 1.7 } }}
//           >
//             {user ? (
//               <>
//                 <MenuItem disabled><Typography variant="subtitle1"><b>{user.role || "Admin"}</b></Typography></MenuItem>
//                 <MenuItem disabled><Typography variant="body2">{user.first_name}</Typography></MenuItem>
//                 {user.email && <MenuItem disabled><Typography variant="body2">{user.email}</Typography></MenuItem>}
//                 <Divider />
//                 <MenuItem onClick={logout} sx={{ color: "red" }}>
//                   <AiOutlineLogout className="logout-btn" />
//                   <Typography variant="body2" sx={{ ml: 1 }}>Sign Out</Typography>
//                 </MenuItem>
//               </>
//             ) : (
//               <MenuItem disabled><Typography variant="body2">Loading user data...</Typography></MenuItem>
//             )}
//           </Menu>
//         </div>
//       </div>

//       {/* Horizontal Menu */}
//       {showMenu && selectedPlatform && (
//         <div className="menu-bar">
//           {menuItems[selectedPlatform].map((menu) => (
//             <div key={menu.id} className={`menu-item ${selectedMenu === menu.id ? "active" : ""}`} onClick={() => handleMenuClick(menu.id)}>
//               <span>{menu.name}</span>
//             </div>
//           ))}
//         </div>
//       )}

//       {/* Submenu */}
//       {selectedMenu && selectedPlatform && (
//         <div className="sub-menu">
//           {menuItems[selectedPlatform]
//             .find((menu) => menu.id === selectedMenu)
//             ?.subMenu.map((item, index) => {
//               const isApprovals = item.id === "admin_approvals";
//               return (
//                 <div key={index} className={`sub-menu-item ${selectedSubMenu === item.name ? "active" : ""}`} onClick={() => handleSubMenuClick(item.name)}>
//                   <Link to={item.path} className="link">
//                     {isApprovals ? (
//                       <Badge badgeContent={pendingRequests.length} color="error" invisible={pendingRequests.length === 0}>
//                         <span>{item.name}</span>
//                       </Badge>
//                     ) : (
//                       <span>{item.name}</span>
//                     )}
//                   </Link>
//                 </div>
//               );
//             })}
//         </div>
//       )}
//     </div>
//   );
// };

// export default Navbar;
