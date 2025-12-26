import React, { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  TextField,
  Tooltip,
  Typography,
  Box,
  Modal,
  TablePagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { Tabs, Tab, Divider } from "@mui/material";

import { CircularProgress } from "@mui/material";
import { Skeleton } from "@mui/material";

import apiClient from "../../Axios";
import { GoAlert } from "react-icons/go";
import { RiDeleteBin6Line, RiBallPenLine } from "react-icons/ri";
import "../style.css";

import { styled } from "@mui/material/styles";
import { tableCellClasses } from "@mui/material/TableCell";

// Styled Table Components
// Styled Table Components
const StyledTableCell = styled(TableCell)(({ theme }) => ({
  [`&.${tableCellClasses.head}`]: {
    backgroundColor:
      theme.palette.mode === "dark"
        ? theme.palette.grey[900]
        : theme.palette.grey[800],
    color: theme.palette.common.white,
    fontWeight: "bold",
    fontSize: 16,
    textAlign: "center",
  },
  [`&.${tableCellClasses.body}`]: {
    fontSize: 14,
    textAlign: "center",
    color: theme.palette.text.primary, // auto adjusts
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    maxWidth: "200px",
  },
}));

const StyledTableRow = styled(TableRow)(({ theme }) => ({
  backgroundColor:
    theme.palette.mode === "dark"
      ? theme.palette.grey[800]
      : theme.palette.grey[100],

  "&:nth-of-type(odd)": {
    backgroundColor:
      theme.palette.mode === "dark"
        ? theme.palette.grey[700]
        : theme.palette.grey[300],
  },

  "&:last-child td, &:last-child th": {
    border: 0,
  },
}));

const Networks = () => {
  const [networks, setNetworks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(0); // Current page
  const [rowsPerPage, setRowsPerPage] = useState(5); // Rows per page
  const [projects, setProjects] = useState([]);

  const [selectedNetworks, setSelectedNetworks] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const [networkToUpdate, setNetworkToUpdate] = useState(null);

  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [nameError, setNameError] = useState("");

  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const theme = useTheme();
  const [newNetwork, setNewNetwork] = useState({
    name: "",
    subnet_name: "",
    network_address: "",
    gateway_ip: "",
    status: "",
    is_shared: false,
  });

  const [formErrors, setFormErrors] = useState({
    name: "",
    subnet_name: "",
    network_address: "",
    gateway_ip: "",
  });

  const fetchNetworks = async () => {
    setError(null);
    try {
      const response = await apiClient.get("/networks/");
      setNetworks(response.data);
    } catch (error) {
      console.error("Error fetching networks:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    setError(null);
    try {
      const response = await apiClient.get("/openstack/projects/");
      setProjects(response.data);
    } catch (error) {
      console.error("Error fetching projects:", error);
    } finally {
      setLoading(false);
    }
  };
  // Validate network name: only letters, spaces, and underscore allowed
  const isValidNetworkName = (name) => /^[A-Za-z_\s]+$/.test(name);

  useEffect(() => {
    fetchNetworks();
    fetchProjects();
  }, []);

  const showInitialLoader = loading && networks.length === 0;

  if (showInitialLoader) {
    return (
      <div className="cloud-container">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="7.87722 9.61948 33.01 16.88"
        >
          <path
            d="M 12 26 H 37 C 42 26 41 20 37 20 C 38 18 37 15 33 16 C 32 8 15 8 14 17 C 8 16 6 25 12 26"
            className="cloud-back"
          />
          <path
            d="M 12 26 H 37 C 42 26 41 20 37 20 C 38 18 37 15 33 16 C 32 8 15 8 14 17 C 8 16 6 25 12 26"
            className="cloud-front"
          />
        </svg>
        <div className="loading-message">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-message">
        <GoAlert />
        <h2>❌ Server Down</h2>
      </div>
    );
  }

  // When opening the update modal
  const handleOpenUpdateForm = (network) => {
    setNetworkToUpdate({
      id: network.id,
      name: network.name,
      admin_state_up: network.admin_state_up ?? true,
      shared: network.shared ?? false,
      external: network.external ?? false,
    });
    setFormErrors({});
    setShowUpdateForm(true);
  };

  const NetworkSkeletonRow = () => (
    <StyledTableRow>
      {Array.from({ length: 12 }).map((_, index) => (
        <StyledTableCell key={index}>
          <Skeleton variant="text" width="80%" />
        </StyledTableCell>
      ))}
    </StyledTableRow>
  );

  const isValidIP = (ip) => {
    const regex =
      /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
    return regex.test(ip);
  };

  const validateNetworkField = (name, value) => {
    let error = "";

    if (name === "name") {
      if (!value.trim()) {
        error = "Network name is required.";
      } else if (!/^[A-Za-z_\s]+$/.test(value)) {
        error = "Network name can contain only letters and underscore (_).";
      }
    }

    if (name === "network_address") {
      const regex =
        /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}\/([0-9]|[1-2][0-9]|3[0-2])$/;
      if (!regex.test(value)) {
        error = "Invalid CIDR format, e.g., 192.168.1.0/24";
      }
    }

    if (name === "gateway_ip") {
      const regex =
        /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
      if (!regex.test(value)) {
        error = "Invalid IP address";
      }
    }

    setFormErrors((prev) => ({ ...prev, [name]: error }));
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    // Filtering logic remains the same, but we'll apply it to the full dataset
    // and the TablePagination will handle the display.
    setPage(0); // Reset to the first page on search
  };

  const filteredNetworks = networks.filter((network) =>
    Object.values(network).some((value) =>
      value?.toString().toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const handleChangePage = (_, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0); // Reset to the first page when rows per page changes
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const currentVisibleNetworks = filteredNetworks.slice(
        page * rowsPerPage,
        page * rowsPerPage + rowsPerPage
      );
      const allVisibleIds = currentVisibleNetworks.map((network) => network.id);
      setSelectedNetworks(allVisibleIds);
    } else {
      setSelectedNetworks([]);
    }
  };

  const handleSelectNetwork = (networkId) => {
    if (selectedNetworks.includes(networkId)) {
      setSelectedNetworks(selectedNetworks.filter((id) => id !== networkId));
    } else {
      setSelectedNetworks([...selectedNetworks, networkId]);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;

    const val = type === "checkbox" ? checked : value;

    setNewNetwork((prev) => ({
      ...prev,
      [name]: val,
    }));

    // Real-time network name validation
    if (name === "name") {
      if (!value) {
        setNameError("Network name is required.");
      } else if (!isValidNetworkName(value)) {
        setNameError("Only letters, spaces, and underscores are allowed.");
      } else if (networks.some((n) => n.name === value)) {
        setNameError("Network name already exists.");
      } else {
        setNameError(""); // No error
      }
    }
  };

  const handleUpdateInputChange = (e) => {
    const { name, type, checked, value } = e.target;

    setNetworkToUpdate((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

    // Optional: live validation for network name
    if (name === "name") {
      if (!value.match(/^[A-Za-z_ ]*$/)) {
        setFormErrors((prev) => ({
          ...prev,
          name: "Only letters, spaces, and underscores (_) allowed",
        }));
      } else {
        setFormErrors((prev) => ({ ...prev, name: "" }));
      }
    }
  };

  // Validate CIDR format (e.g., 192.168.1.0/24)
  const isValidCIDR = (cidr) => {
    const regex =
      /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}\/([0-9]|[1-2][0-9]|3[0-2])$/;
    return regex.test(cidr);
  };

  const handleCreateNetwork = async (e) => {
    e.preventDefault();
    if (creating) return;

    // UNIQUE name check first
    if (networks.some((n) => n.name === newNetwork.name)) {
      alert("Network name already exists.");
      return;
    }
    // REQUIRED validations
    if (!newNetwork.name) {
      alert("Network name is required.");
      return;
    }

    if (!newNetwork.project_id) {
      alert("Project is required.");
      return;
    }

    if (!isValidNetworkName(newNetwork.name)) {
      alert(
        "Network name can contain only alphabets, spaces, and underscore (_)."
      );
      return;
    }

    if (newNetwork.create_subnet) {
      if (!newNetwork.subnet_name || !newNetwork.network_address) {
        alert("Subnet name and network address are required.");
        return;
      }

      if (!isValidCIDR(newNetwork.network_address)) {
        alert("Invalid CIDR format (e.g., 192.168.1.0/24)");
        return;
      }

      if (!newNetwork.disable_gateway) {
        if (!newNetwork.gateway_ip) {
          alert("Gateway IP is required.");
          return;
        }
        if (!isValidIP(newNetwork.gateway_ip)) {
          alert("Invalid Gateway IP address");
          return;
        }
      }
    }

    // UNIQUE name check
    if (networks.some((n) => n.name === newNetwork.name)) {
      alert("Network name already exists.");
      return;
    }

    try {
      setCreating(true);

      const payload = {
        name: newNetwork.name,
        project_id: newNetwork.project_id,

        provider_network_type: newNetwork.provider_network_type,
        physical_network: ["flat", "vlan"].includes(
          newNetwork.provider_network_type
        )
          ? newNetwork.physical_network
          : null,

        segmentation_id:
          newNetwork.provider_network_type === "vlan"
            ? Number(newNetwork.segmentation_id)
            : newNetwork.provider_network_type === "vxlan"
            ? Number(newNetwork.segmentation_id || 0)
            : null,

        admin_state_up: newNetwork.admin_state_up,
        shared: newNetwork.shared,
        external: newNetwork.external,

        availability_zone_hints: ["nova"],

        create_subnet: newNetwork.create_subnet,
        subnet_name: newNetwork.subnet_name,
        network_address: newNetwork.network_address,
        gateway_ip: newNetwork.disable_gateway ? null : newNetwork.gateway_ip,
        disable_gateway: newNetwork.disable_gateway,
        ip_version: newNetwork.ip_version,
        enable_dhcp: newNetwork.enable_dhcp,
        dns_nameservers: newNetwork.dns_nameservers
          ? newNetwork.dns_nameservers.split(",").map((ip) => ip.trim())
          : [],
      };

      const res = await apiClient.post("/networks/create/", payload);

      alert("Network created successfully");
      setShowCreateForm(false);
      fetchNetworks();
    } catch (err) {
      console.error(err);
      alert("Failed to create network.");
    } finally {
      setCreating(false);
    }
  };
  const handleUpdateNetwork = async (e) => {
    e.preventDefault();
    if (!networkToUpdate) return;

    // Required validation for name only (other fields are booleans)
    if (!networkToUpdate.name) {
      alert("Network name is required.");
      return;
    }
    if (!!formErrors.name) {
      alert("Please fix errors before submitting.");
      return;
    }

    try {
      setUpdating(true);

      const payload = {
        name: networkToUpdate.name,
        admin_state_up: networkToUpdate.admin_state_up,
        shared: networkToUpdate.shared,
        external: networkToUpdate.external,
      };

      const res = await apiClient.put(
        `/networks/edit/${networkToUpdate.id}/`,
        payload
      );

      if (res.status === 200) {
        alert("Network updated successfully");
        setShowUpdateForm(false);
        setNetworkToUpdate(null);
        fetchNetworks();
      }
    } catch (err) {
      console.error(err);
      alert("Failed to update network.");
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteSelectedNetworks = async () => {
    if (selectedNetworks.length === 0) {
      alert("No networks selected for deletion");
      return;
    }

    if (
      !window.confirm("Are you sure you want to delete the selected networks?")
    ) {
      return;
    }

    try {
      for (const networkId of selectedNetworks) {
        await apiClient.delete(`/networks/delete/${networkId}/`);
      }

      alert("Selected networks deleted successfully");
      setSelectedNetworks([]);
      fetchNetworks();
    } catch (error) {
      console.error("Error deleting selected networks:", error);
      alert("An error occurred while deleting selected networks.");
    }
  };

  const handleDeleteNetwork = async (networkId) => {
    if (!window.confirm("Are you sure you want to delete this network?")) {
      return;
    }

    try {
      const response = await apiClient.delete(`/networks/delete/${networkId}/`);
      if (response.status === 200) {
        alert("Network deleted successfully");
        fetchNetworks();
      } else {
        console.error("Unexpected response:", response);
        alert("Unexpected server response while deleting the network.");
      }
    } catch (error) {
      if (error.response) {
        console.error("Server error:", error.response);
        alert(
          `Failed to delete the network: ${
            error.response.data.message || "Unknown error"
          }`
        );
      } else {
        console.error("Error:", error.message);
        alert("An error occurred while attempting to delete the network.");
      }
    }
  };

  const NetworkTypeBadge = ({ external }) => (
    <Chip
      label={external ? "External" : "Internal"}
      color={external ? "error" : "success"}
      size="small"
      variant="outlined"
    />
  );

  const modalStyle = {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: 400,
    bgcolor: theme.palette.background.paper,
    boxShadow: 24,
    p: 4,
    borderRadius: "8px",
  };

  return (
    <div style={volumesContainerStyle}>
      <div style={headerContainerVolumesStyle}>
        <h1>Network Management</h1>
        <div style={searchContainerStyle}>
          <TextField
            type="text"
            label="Search networks..."
            value={searchTerm}
            onChange={handleSearchChange}
            variant="outlined"
          />
          <div style={{ display: "flex", gap: "8px" }}>
            <Button
              variant="contained"
              sx={{
                backgroundColor:
                  theme.palette.mode === "light" ? "#2e7d32" : "#388e3c",
                color: "#fff",
                "&:hover": {
                  backgroundColor:
                    theme.palette.mode === "light" ? "#1b5e20" : "#2e7d32",
                },
              }}
              onClick={() => setShowCreateForm(true)}
            >
              Create Network <RiBallPenLine />
            </Button>
            <Button
              variant="contained"
              color="error"
              onClick={handleDeleteSelectedNetworks}
              disabled={selectedNetworks.length === 0}
            >
              Delete <RiDeleteBin6Line />
            </Button>
          </div>
        </div>
      </div>

      <Modal
        open={showCreateForm}
        onClose={creating ? undefined : () => setShowCreateForm(false)}
      >
        <Box sx={{ ...modalStyle, width: 600 }}>
          <Typography variant="h6" gutterBottom>
            Create New Network
          </Typography>

          <form onSubmit={handleCreateNetwork}>
            {/* ===== TABS ===== */}
            <Tabs
              value={activeTab}
              onChange={handleTabChange}
              variant="fullWidth"
              sx={{ mb: 2 }}
            >
              <Tab label="Network" />
              <Tab label="Subnet" />
              <Tab label="Subnet Details" />
            </Tabs>

            <Divider sx={{ mb: 2 }} />

            {/* ===== TAB CONTENT SCROLL AREA ===== */}
            <Box sx={{ maxHeight: "55vh", overflowY: "auto", pr: 1 }}>
              {/* ================= TAB 0 : NETWORK ================= */}
              {activeTab === 0 && (
                <>
                  <TextField
                    label="Network Name"
                    name="name"
                    value={newNetwork.name}
                    onChange={handleInputChange}
                    fullWidth
                    margin="normal"
                    required
                    error={!!nameError}
                    helperText={nameError}
                  />

                  {/* Project */}
                  <FormControl fullWidth margin="normal" required>
                    <InputLabel>Project</InputLabel>
                    <Select
                      label="Project"
                      value={newNetwork.project_id || ""}
                      onChange={(e) =>
                        setNewNetwork({
                          ...newNetwork,
                          project_id: e.target.value,
                        })
                      }
                    >
                      <MenuItem value="">Select Project</MenuItem>
                      {projects.map((p) => (
                        <MenuItem key={p.id} value={p.id}>
                          {p.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <TextField
                    label="Provider Network Type"
                    name="provider_network_type"
                    select
                    SelectProps={{ native: true }}
                    value={newNetwork.provider_network_type || "flat"}
                    onChange={handleInputChange}
                    fullWidth
                    margin="normal"
                  >
                    <option value="flat">FLAT</option>
                    <option value="vxlan">VXLAN</option>
                    <option value="vlan">VLAN</option>
                  </TextField>

                  {(newNetwork.provider_network_type === "flat" ||
                    newNetwork.provider_network_type === "vlan") && (
                    <FormControl fullWidth margin="normal" required>
                      <InputLabel>Physical Network</InputLabel>
                      <Select
                        name="physical_network"
                        value={newNetwork.physical_network || ""}
                        onChange={handleInputChange}
                        label="Physical Network"
                      >
                        <MenuItem value="">Select Physical Network</MenuItem>
                        <MenuItem value="physnet1">physnet1</MenuItem>
                        <MenuItem value="provider">provider</MenuItem>
                      </Select>
                    </FormControl>
                  )}

                  {(newNetwork.provider_network_type === "vxlan" ||
                    newNetwork.provider_network_type === "vlan") && (
                    <TextField
                      label="Segmentation ID"
                      name="segmentation_id"
                      type="number"
                      value={newNetwork.segmentation_id || ""}
                      onChange={handleInputChange}
                      fullWidth
                      margin="normal"
                      required
                      inputProps={{
                        min:
                          newNetwork.provider_network_type === "vlan" ? 1 : 1,
                        max:
                          newNetwork.provider_network_type === "vlan"
                            ? 4094
                            : 16777215,
                      }}
                      helperText={
                        newNetwork.provider_network_type === "vlan"
                          ? "VLAN ID (1–4094)"
                          : "VXLAN VNI (1–16777215)"
                      }
                    />
                  )}

                  <Box sx={{ display: "flex", gap: 2, mt: 1 }}>
                    <label>
                      <input
                        type="checkbox"
                        name="admin_state_up"
                        checked={newNetwork.admin_state_up ?? true}
                        onChange={handleInputChange}
                      />{" "}
                      Admin State
                    </label>

                    <label>
                      <input
                        type="checkbox"
                        name="shared"
                        checked={newNetwork.shared || false}
                        onChange={handleInputChange}
                      />{" "}
                      Shared
                    </label>

                    <label>
                      <input
                        type="checkbox"
                        name="external"
                        checked={newNetwork.external || false}
                        onChange={handleInputChange}
                      />{" "}
                      External
                    </label>
                  </Box>

                  <TextField
                    label="Availability Zone Hints"
                    name="availability_zone_hints"
                    value="nova"
                    fullWidth
                    margin="normal"
                    InputProps={{
                      readOnly: true,
                    }}
                    helperText="Fixed availability zone (Nova)"
                  />

                  <TextField
                    label="MTU"
                    name="mtu"
                    type="number"
                    value={newNetwork.mtu || ""}
                    onChange={handleInputChange}
                    fullWidth
                    margin="normal"
                  />
                </>
              )}

              {/* ================= TAB 1 : SUBNET ================= */}
              {activeTab === 1 && (
                <>
                  <TextField
                    label="Subnet Name"
                    name="subnet_name"
                    value={newNetwork.subnet_name || ""}
                    onChange={handleInputChange}
                    fullWidth
                    margin="normal"
                  />

                  <TextField
                    label="Network Address (CIDR)"
                    name="network_address"
                    value={newNetwork.network_address || ""}
                    onChange={handleInputChange}
                    fullWidth
                    margin="normal"
                  />

                  <TextField
                    label="IP Version"
                    name="ip_version"
                    select
                    SelectProps={{ native: true }}
                    value={newNetwork.ip_version || 4}
                    onChange={handleInputChange}
                    fullWidth
                    margin="normal"
                  >
                    <option value={4}>IPv4</option>
                    <option value={6}>IPv6</option>
                  </TextField>
                </>
              )}

              {/* ================= TAB 2 : SUBNET DETAILS ================= */}
              {/* ================= TAB 2 : SUBNET DETAILS ================= */}
              {activeTab === 2 && (
                <>
                  <TextField
                    label="Gateway IP"
                    name="gateway_ip"
                    value={newNetwork.gateway_ip || ""}
                    onChange={handleInputChange}
                    fullWidth
                    margin="normal"
                  />

                  <label>
                    <input
                      type="checkbox"
                      name="disable_gateway"
                      checked={newNetwork.disable_gateway || false}
                      onChange={handleInputChange}
                    />{" "}
                    Disable Gateway
                  </label>

                  <label>
                    <input
                      type="checkbox"
                      name="enable_dhcp"
                      checked={newNetwork.enable_dhcp ?? true}
                      onChange={handleInputChange}
                    />{" "}
                    Enable DHCP
                  </label>

                  <TextField
                    label="DNS Nameservers (comma separated)"
                    name="dns_nameservers"
                    value={newNetwork.dns_nameservers || ""}
                    onChange={handleInputChange}
                    fullWidth
                    margin="normal"
                  />
                </>
              )}
            </Box>

            {/* ===== ACTION BUTTONS ===== */}
            <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
              <Button type="submit" variant="contained" disabled={creating}>
                {creating ? <CircularProgress size={20} /> : "Create"}
              </Button>
              <Button
                sx={{ ml: 1 }}
                variant="outlined"
                onClick={() => setShowCreateForm(false)}
              >
                Cancel
              </Button>
            </Box>
          </form>
        </Box>
      </Modal>

      <Modal
        open={showUpdateForm}
        onClose={updating ? undefined : () => setShowUpdateForm(false)}
      >
        <Box sx={modalStyle}>
          <Typography variant="h6" component="h2" gutterBottom>
            Update Network
          </Typography>
          <form onSubmit={handleUpdateNetwork}>
            {/* Network Name */}
            <TextField
              label="Name"
              name="name"
              onChange={handleUpdateInputChange}
              value={networkToUpdate?.name || ""}
              fullWidth
              margin="normal"
              required
              error={!!formErrors.name}
              helperText={formErrors.name}
            />

            {/* Admin State */}
            <Box sx={{ display: "flex", alignItems: "center", mt: 2 }}>
              <Typography component="label" sx={{ mr: 2 }}>
                Admin State
              </Typography>
              <input
                type="checkbox"
                name="admin_state_up"
                onChange={handleUpdateInputChange}
                checked={networkToUpdate?.admin_state_up ?? true}
              />
            </Box>

            {/* Shared */}
            <Box sx={{ display: "flex", alignItems: "center", mt: 2 }}>
              <Typography component="label" sx={{ mr: 2 }}>
                Shared
              </Typography>
              <input
                type="checkbox"
                name="shared"
                onChange={handleUpdateInputChange}
                checked={networkToUpdate?.shared || false}
              />
            </Box>

            {/* External */}
            <Box sx={{ display: "flex", alignItems: "center", mt: 2 }}>
              <Typography component="label" sx={{ mr: 2 }}>
                External Network
              </Typography>
              <input
                type="checkbox"
                name="external"
                onChange={handleUpdateInputChange}
                checked={networkToUpdate?.external || false}
              />
            </Box>

            {/* Action Buttons */}
            <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 3 }}>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                sx={{ mr: 1 }}
                disabled={updating}
              >
                {updating ? (
                  <CircularProgress size={22} sx={{ color: "#fff" }} />
                ) : (
                  "Update"
                )}
              </Button>
              <Button
                type="button"
                onClick={() => setShowUpdateForm(false)}
                variant="outlined"
              >
                Cancel
              </Button>
            </Box>
          </form>
        </Box>
      </Modal>

      <TableContainer
        component={Paper}
        sx={{
          width: "fit-content",
          minWidth: "75%",
          maxWidth: "100%",
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          border: "none !important",
          boxShadow: "none !important",
          backgroundColor: "transparent !important",
        }}
      >
        <Table
          sx={{
            width: "100%",
            minWidth: 650,
            tableLayout: "auto",

            // REMOVE ALL BORDERS
            border: "none !important",
            "& td, & th": { border: "none !important" },
            "& .MuiTableCell-root": { borderBottom: "none !important" },
            "& .MuiTableRow-root": { border: "none !important" },
          }}
        >
          <TableHead>
            <TableRow>
              <StyledTableCell padding="checkbox">
                <input
                  type="checkbox"
                  checked={filteredNetworks
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .every((n) => selectedNetworks.includes(n.id))}
                  onChange={handleSelectAll}
                />
              </StyledTableCell>
              <StyledTableCell>Sr. No.</StyledTableCell>
              <StyledTableCell>Project</StyledTableCell>
              <StyledTableCell>Network Name</StyledTableCell>
              <StyledTableCell>Subnets</StyledTableCell>
              <StyledTableCell>Subnet Gateway</StyledTableCell>
              <StyledTableCell>Shared</StyledTableCell>
              <StyledTableCell>External</StyledTableCell>
              <StyledTableCell>Status</StyledTableCell>
              <StyledTableCell>Admin State</StyledTableCell>
              <StyledTableCell>Availability Zones</StyledTableCell>
              <StyledTableCell>Actions</StyledTableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading
              ? Array.from({ length: rowsPerPage }).map((_, i) => (
                  <NetworkSkeletonRow key={i} />
                ))
              : filteredNetworks
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((network, index) => (
                    <StyledTableRow key={network.id}>
                      <StyledTableCell padding="checkbox">
                        <input
                          type="checkbox"
                          checked={selectedNetworks.includes(network.id)}
                          onChange={() => handleSelectNetwork(network.id)}
                        />
                      </StyledTableCell>
                      <StyledTableCell>
                        {page * rowsPerPage + index + 1}
                      </StyledTableCell>
                      <StyledTableCell>{network.project}</StyledTableCell>
                      <StyledTableCell>{network.network_name}</StyledTableCell>
                      <StyledTableCell>
                        {network.subnets?.map((s, i) => (
                          <Tooltip
                            key={i}
                            title={
                              <>
                                <div>
                                  <b>Gateway:</b> {s.gateway_ip}
                                </div>
                                <div>
                                  <b>IP Version:</b> IPv{s.ip_version}
                                </div>
                              </>
                            }
                            arrow
                          >
                            <div>
                              {s.name} ({s.cidr})
                            </div>
                          </Tooltip>
                        ))}
                      </StyledTableCell>
                      <StyledTableCell>
                        {network.subnets?.map((s, i) => (
                          <div key={i}>{s.gateway_ip}</div>
                        ))}
                      </StyledTableCell>

                      <StyledTableCell>
                        {network.shared ? "Yes" : "No"}
                      </StyledTableCell>
                      <StyledTableCell>
                        <NetworkTypeBadge external={network.external} />
                      </StyledTableCell>

                      <StyledTableCell>{network.status}</StyledTableCell>
                      <StyledTableCell>
                        {network.admin_state_up ? "Up" : "Down"}
                      </StyledTableCell>
                      <StyledTableCell>
                        {network.availability_zones?.join(", ")}
                      </StyledTableCell>
                      <StyledTableCell>
                        <Box display="flex" justifyContent="center" gap={1}>
                          <Button
                            variant="outlined"
                            onClick={() => {
                              setNetworkToUpdate(network);
                              setShowUpdateForm(true);
                            }}
                          >
                            Update
                          </Button>
                          <Button
                            variant="outlined"
                            color="error"
                            onClick={() => handleDeleteNetwork(network.id)}
                          >
                            Delete
                          </Button>
                        </Box>
                      </StyledTableCell>
                    </StyledTableRow>
                  ))}
          </TableBody>
        </Table>
        {/* ⬇️ PAGINATION INSIDE TABLE CONTAINER */}
        <Box sx={{ width: "100%", display: "flex", justifyContent: "center" }}>
          <TablePagination
            rowsPerPageOptions={[5, 7, 10]}
            component="div"
            count={filteredNetworks.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            sx={{
              borderTop: "none",
              width: "100%",
            }}
          />
        </Box>
      </TableContainer>
    </div>
  );
};

// Inline CSS Styles
const volumesContainerStyle = { padding: "20px", fontFamily: "sans-serif" };
const headerContainerVolumesStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "20px",
};
const searchContainerStyle = {
  display: "flex",
  gap: "10px",
  alignItems: "center",
};
const volumesTableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  marginTop: "20px",
};
export default Networks;
