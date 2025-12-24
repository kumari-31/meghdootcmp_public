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
  Chip,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
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
  const [selectedNetworks, setSelectedNetworks] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const [networkToUpdate, setNetworkToUpdate] = useState(null);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);

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
  // Validate network name: only letters, spaces, and underscore allowed
  const isValidNetworkName = (name) => /^[A-Za-z_\s]+$/.test(name);

  useEffect(() => {
    fetchNetworks();
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

  const NetworkSkeletonRow = () => (
    <StyledTableRow>
      {Array.from({ length: 12 }).map((_, index) => (
        <StyledTableCell key={index}>
          <Skeleton variant="text" width="80%" />
        </StyledTableCell>
      ))}
    </StyledTableRow>
  );

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
    const fieldValue = type === "checkbox" ? checked : value;

    setNewNetwork((prevState) => ({
      ...prevState,
      [name]: fieldValue,
    }));

    validateNetworkField(name, fieldValue); // live validation
  };

  const handleUpdateInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    const fieldValue = type === "checkbox" ? checked : value;

    setNetworkToUpdate((prevState) => ({
      ...prevState,
      [name]: fieldValue,
    }));

    if (name !== "is_shared") {
      // don't validate checkbox
      validateNetworkField(name, fieldValue);
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
    if (creating) return; // ⛔ prevent double click

    // Check for empty fields
    if (
      !newNetwork.name ||
      !newNetwork.subnet_name ||
      !newNetwork.network_address ||
      !newNetwork.gateway_ip
    ) {
      alert("All fields are required");
      return;
    }

    if (!isValidNetworkName(newNetwork.name)) {
      alert("Network name can contain only alphabets and underscore (_).");
      return;
    }
    // Validate IP address
    if (!isValidIP(newNetwork.gateway_ip)) {
      alert("Invalid Gateway IP address");
      return;
    }

    // Validate CIDR
    if (!isValidCIDR(newNetwork.network_address)) {
      alert(
        "Invalid Network Address (CIDR format required, e.g., 192.168.1.0/24)"
      );
      return;
    }

    // Check unique network name
    const existingNetwork = networks.find(
      (network) => network.name === newNetwork.name
    );
    if (existingNetwork) {
      alert(
        "A network with the same name already exists. Please choose a different name."
      );
      return;
    }

    // Proceed with API request
    try {
      setCreating(true); // 🔄 START LOADER
      const response = await apiClient.post("/networks/create/", {
        name: newNetwork.name,
        subnet_name: newNetwork.subnet_name,
        network_address: newNetwork.network_address,
        gateway_ip: newNetwork.gateway_ip,
      });
      if (response.status === 201 || response.status === 200) {
        alert("Network created successfully");
        setShowCreateForm(false);
        setNewNetwork({
          name: "",
          subnet_name: "",
          network_address: "",
          gateway_ip: "",
        });
        fetchNetworks();
      }
    } catch (error) {
      console.error("Error creating network:", error);
      alert("Error creating network. Please check the inputs and try again.");
    } finally {
      setCreating(false); // ✅ STOP LOADER
    }
  };

  const handleUpdateNetwork = async (e) => {
    e.preventDefault();

    if (updating) return; // ⛔ prevent double submit
    if (!networkToUpdate) {
      alert("No network selected for update.");
      return;
    }

    if (
      !networkToUpdate.name ||
      !networkToUpdate.subnet_name ||
      !networkToUpdate.network_address ||
      !networkToUpdate.gateway_ip
    ) {
      alert("All fields are required");
      return;
    }
    if (!isValidNetworkName(networkToUpdate.name)) {
      alert("Network name can contain only alphabets and underscore (_).");
      return;
    }

    if (!isValidIP(networkToUpdate.gateway_ip)) {
      alert("Invalid Gateway IP address");
      return;
    }

    if (!isValidCIDR(networkToUpdate.network_address)) {
      alert(
        "Invalid Network Address (CIDR format required, e.g., 192.168.1.0/24)"
      );
      return;
    }

    try {
      setUpdating(true); // 🔄 START LOADER
      const response = await apiClient.put(
        `/networks/edit/${networkToUpdate.id}/`,
        {
          network_name: networkToUpdate.name,
          is_shared: networkToUpdate.is_shared,
          subnet_name: networkToUpdate.subnet_name,
          gateway_ip: networkToUpdate.gateway_ip,
          cidr: networkToUpdate.network_address,
        }
      );

      if (response.status === 200) {
        alert("Network updated successfully");
        setShowUpdateForm(false);
        setNetworkToUpdate(null);
        fetchNetworks();
      }
    } catch (error) {
      console.error("Error updating network:", error);
      alert(
        "An error occurred while updating the network. Please try again later."
      );
    } finally {
      setUpdating(false); // ✅ STOP LOADER
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

  const NetworkTypeBadge = ({ external }) => (
  <Chip
    label={external ? "External" : "Internal"}
    color={external ? "error" : "success"}
    size="small"
    variant="outlined"
  />
);


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
        <Box sx={modalStyle}>
          <Typography variant="h6" component="h2" gutterBottom>
            Create New Network
          </Typography>
          <form onSubmit={handleCreateNetwork}>
            <TextField
              label="Name"
              name="name"
              onChange={handleInputChange}
              value={newNetwork.name}
              fullWidth
              margin="normal"
              required
              error={!!formErrors.name}
              helperText={formErrors.name}
            />
            <TextField
              label="Subnet Name"
              name="subnet_name"
              onChange={handleInputChange}
              value={newNetwork.subnet_name}
              fullWidth
              margin="normal"
              required
            />
            <TextField
              label="Network Address"
              name="network_address"
              onChange={handleInputChange}
              value={newNetwork.network_address}
              fullWidth
              margin="normal"
              required
              error={!!formErrors.network_address}
              helperText={formErrors.network_address}
            />
            <TextField
              label="Gateway IP"
              name="gateway_ip"
              onChange={handleInputChange}
              value={newNetwork.gateway_ip}
              fullWidth
              margin="normal"
              required
              error={!!formErrors.gateway_ip}
              helperText={formErrors.gateway_ip}
            />
            <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                sx={{ mr: 1 }}
                disabled={creating}
              >
                {creating ? (
                  <CircularProgress size={22} sx={{ color: "#fff" }} />
                ) : (
                  "Create"
                )}
              </Button>
              <Button
                type="button"
                onClick={() => setShowCreateForm(false)}
                variant="outlined"
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
            <TextField
              label="Subnet Name"
              name="subnet_name"
              onChange={handleUpdateInputChange}
              value={networkToUpdate?.subnet_name || ""}
              fullWidth
              margin="normal"
              required
            />
            <TextField
              label="Gateway IP"
              name="gateway_ip"
              onChange={handleUpdateInputChange}
              value={networkToUpdate?.gateway_ip || ""}
              fullWidth
              margin="normal"
              required
              error={!!formErrors.gateway_ip}
              helperText={formErrors.gateway_ip}
            />
            <TextField
              label="Network Address (CIDR)"
              name="network_address"
              onChange={handleUpdateInputChange}
              value={networkToUpdate?.network_address || ""}
              fullWidth
              margin="normal"
              required
              error={!!formErrors.network_address}
              helperText={formErrors.network_address}
            />
            <Box sx={{ display: "flex", alignItems: "center", mt: 2 }}>
              <Typography component="label" sx={{ mr: 2 }}>
                Shared
              </Typography>
              <input
                type="checkbox"
                name="is_shared"
                onChange={handleUpdateInputChange}
                checked={networkToUpdate?.is_shared || false}
              />
            </Box>
            <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
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
