import { useEffect, useState } from "react";
import { useAuth } from "../Pages/Authentication/useAuth";
import apiClient from "../Axios";
import {
  Container,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Paper,
  CircularProgress,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Grid2,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Tooltip,
  Autocomplete,
} from "@mui/material";
import { CheckCircle, Visibility, Edit } from "@mui/icons-material";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import HourglassBottomIcon from "@mui/icons-material/HourglassBottom";

const VMRequestStatus = () => {
  const { user } = useAuth();
  const [vmRequests, setVmRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [employeeId, setEmployeeId] = useState(user.employee_id || null);
  const [selectedVM, setSelectedVM] = useState(null); // To store selected VM details
  const [openModal, setOpenModal] = useState(false);
  const [selectedVmId, setSelectedVmId] = useState("");
  const [openEditModal, setOpenEditModal] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [imageOptions, setImageOptions] = useState([]);
  const [flavorOptions, setFlavorOptions] = useState([]);
  const [networks, setNetworks] = useState([]);

  useEffect(() => {
    apiClient
      .get("/images/")
      .then((res) => setImageOptions(res.data))
      .catch((err) => console.error("Failed to fetch images", err));
  }, []);

  useEffect(() => {
    apiClient
      .get("/flavors/")
      .then((res) => setFlavorOptions(res.data))
      .catch((err) => console.error("Failed to fetch flavors", err));
  }, []);

  useEffect(() => {
    apiClient
      .get("/networks/")
      .then((res) => {
        const internal = res.data.filter((n) => n.external === false);
        setNetworks(internal);
      })
      .catch((err) => console.error("Failed to fetch networks", err));
  }, []);

  useEffect(() => {
    if (user?.employee_id) {
      setEmployeeId(user.employee_id);
    }
  }, [user]);

  const handleOpenModal = (vm) => {
    setSelectedVM(vm);
    setOpenModal(true);
  };

  const handleCloseModal = () => {
    setOpenModal(false);

    // setSelectedVM(null);
  };

  useEffect(() => {
    if (!employeeId) {
      setLoading(false);
      return;
    }
    const fetchVMRequests = async () => {
      try {
        const response = await apiClient.get(`/vmrequests/${employeeId}/`);
        if (response.status !== 200) {
          throw new Error(`API Error: ${response.status}`);
        }

        const sortedData = [...response.data].sort((a, b) => b.id - a.id);

        setVmRequests(sortedData);

        // ✅ Auto-select latest VM
        if (sortedData.length > 0) {
          setSelectedVM(sortedData[0]);
          setSelectedVmId(sortedData[0].id);
        }
      } catch (error) {
        console.error("Error fetching VM requests:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchVMRequests();
  }, [employeeId]);

  const handleOpenEditModal = (vm) => {
    setEditForm(vm);
    setOpenEditModal(true);
  };

  const handleCloseEditModal = () => {
    setOpenEditModal(false);
  };

  const handleVmSelection = (event) => {
    setSelectedVmId(event.target.value);
    const vm = vmRequests.find((item) => item.id === event.target.value);
    setSelectedVM(vm);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const allowedEditFields = [
    "vm_name",
    "purpose_of_request",
    "login_disable_date",
    "login_disable_time",
    "cpu",
    "ram",
    "disk",
    "os_disk",
    "additional_disk",
    "hostname",
    "remarks",
    "image",
    "flavor",
    "network_id",
  ];

  const handleUpdate = async () => {
    try {
      const updatedData = { ...editForm };

      // Only send vm_name if it was modified
      if (editForm.vm_name === selectedVM.vm_name) {
        delete updatedData.vm_name;
      }

      await apiClient.put(`/vmrequests/update/${editForm.id}/`, updatedData);
      setVmRequests((prev) =>
        prev.map((vm) =>
          vm.id === editForm.id ? { ...vm, ...updatedData } : vm
        )
      );
      setOpenEditModal(false);
    } catch (error) {
      console.error(
        "Error updating VM request:",
        error.response?.data || error
      );
    }
  };

  if (!employeeId) {
    return (
      <Container style={{ textAlign: "center", marginTop: 50 }}>
        <Typography variant="h6" color="error">
          No employee ID found. Please log in again.
        </Typography>
      </Container>
    );
  }

  if (loading) {
    return (
      <Container style={{ textAlign: "center", marginTop: 50 }}>
        <CircularProgress />
        <Typography variant="h6">Loading VM Requests...</Typography>
      </Container>
    );
  }

  return (
    <Container>
      <Typography
        variant="h4"
        gutterBottom
        sx={{
          fontSize: "24px",
          fontWeight: "bold",
          color: "#1976d2",
          textAlign: "center",
        }}
      >
        VM Request Status
      </Typography>

      {/* 🔽 Dropdown to Select VM */}
      <FormControl fullWidth sx={{ marginBottom: 3, width: "300px" }}>
        <InputLabel>Select a VM</InputLabel>
        <Select
          value={selectedVmId}
          label="Select a VM"
          onChange={handleVmSelection}
        >
          {vmRequests.map((vm) => (
            <MenuItem key={vm.id} value={vm.id}>
              {vm.vm_name.split("_").slice(1).join("_")}{" "}
              {/* Remove Employee ID Prefix */}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Show Selected VM Details */}
      {selectedVM ? (
        <Paper
          elevation={3}
          style={{ padding: 20, marginBottom: 20, marginTop: 70 }}
        >
          <Typography variant="h6">{`ID: ${selectedVM.id}`}</Typography>
          <Typography variant="h6">{`VM Name: ${selectedVM.vm_name
            .split("_")
            .slice(1)
            .join("_")}`}</Typography>
          <Typography variant="subtitle1">{`Purpose: ${selectedVM.purpose_of_request}`}</Typography>

          {/* View Form Button */}
          <Box
            display="flex"
            alignItems="center"
            marginTop={1}
            marginBottom={1}
          >
            <Typography variant="subtitle1" style={{ marginRight: 8 }}>
              View Form:
            </Typography>
            <IconButton
              color="primary"
              onClick={() => handleOpenModal(selectedVM)}
            >
              <Visibility />
            </IconButton>
          </Box>

          {selectedVM.admin_status === "Pending" && (
            <Box display="flex" alignItems="center" mt={1}>
              <Typography variant="subtitle1" mr={1}>
                Edit Form:
              </Typography>
              <IconButton
                color="secondary"
                onClick={() => handleOpenEditModal(selectedVM)}
              >
                <Edit />
              </IconButton>
            </Box>
          )}

          {/* Stepper */}
          <Stepper
            activeStep={
              selectedVM.fla_status === "Accepted"
                ? selectedVM.admin_status === "Accepted"
                  ? 3
                  : 2
                : 1
            }
            alternativeLabel
          >
            {["Employee Request", "FLA Approval", "Admin Approval"].map(
              (label, index) => (
                <Step key={label}>
                  <StepLabel
                    icon={
                      index === 0 ||
                      (index === 1 && selectedVM.fla_status === "Accepted") ||
                      (index === 2 &&
                        selectedVM.admin_status === "Accepted") ? (
                        <CheckCircle color="success" />
                      ) : undefined
                    }
                    style={{
                      color:
                        index === 1 && selectedVM.fla_status === "Accepted"
                          ? "blue"
                          : "inherit",
                    }}
                  >
                    {label}
                  </StepLabel>
                </Step>
              )
            )}
          </Stepper>
          <Box mt={3} display="flex" alignItems="center" gap={1}>
            {/* Admin accepted but VM creation failed */}
            {selectedVM.admin_status === "Pending" &&
              selectedVM.creation_status === "Failed" && (
                <>
                  <Tooltip title={selectedVM.creation_error_message}>
                    <ErrorOutlineIcon color="error" />
                  </Tooltip>
                  <Typography color="error" fontWeight="bold">
                    VM creation failed
                  </Typography>
                </>
              )}

            {/* Admin accepted and VM created */}
            {selectedVM.admin_status === "Accepted" &&
              selectedVM.creation_status === "Success" && (
                <>
                  <CheckCircle color="success" />
                  <Typography color="success.main" fontWeight="bold">
                    VM created successfully
                  </Typography>
                </>
              )}

            {/* Admin accepted but creation still running */}
            {selectedVM.admin_status === "Accepted" &&
              !selectedVM.creation_status && (
                <>
                  <HourglassBottomIcon color="warning" />
                  <Typography color="warning.main" fontWeight="bold">
                    VM creation in progress
                  </Typography>
                </>
              )}
          </Box>
        </Paper>
      ) : (
        <Typography variant="h6" color="textSecondary">
          Select a VM to view its status.
        </Typography>
      )}

      {/* View Form Modal */}
      <Dialog
        open={openModal}
        onClose={handleCloseModal}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>VM Request Details</DialogTitle>
        <DialogContent>
          {selectedVM ? (
            <Grid2 container spacing={2} sx={{ marginTop: 3 }}>
              <Grid2 item xs={6}>
                <TextField
                  fullWidth
                  label="VM Request ID"
                  value={selectedVM.id}
                  disabled
                />
              </Grid2>
              <Grid2 item xs={6}>
                <TextField
                  fullWidth
                  label="Name"
                  value={selectedVM.name}
                  disabled
                />
              </Grid2>
              <Grid2 item xs={6}>
                <TextField
                  fullWidth
                  label="Email"
                  value={selectedVM.email}
                  disabled
                />
              </Grid2>
              <Grid2 item xs={6}>
                <TextField
                  fullWidth
                  label="Employee ID"
                  value={selectedVM.employee_id}
                  disabled
                />
              </Grid2>
              <Grid2 item xs={6}>
                <TextField
                  fullWidth
                  label="Designation"
                  value={selectedVM.designation}
                  disabled
                />
              </Grid2>
              <Grid2 item xs={6}>
                <TextField
                  fullWidth
                  label="Project Name"
                  value={selectedVM.project_name || "N/A"}
                  disabled
                />
              </Grid2>
              <Grid2 item xs={6}>
                <TextField
                  fullWidth
                  label="VM Name"
                  value={selectedVM.vm_name.split("_").slice(1).join("_")}
                  disabled
                />
              </Grid2>
              <Grid2 item xs={6}>
                <TextField
                  fullWidth
                  label="Purpose"
                  value={selectedVM.purpose_of_request}
                  disabled
                />
              </Grid2>
              <Grid2 item xs={6}>
                <TextField
                  fullWidth
                  label="Image Name"
                  value={selectedVM.image}
                  disabled
                />
              </Grid2>
              <Grid2 item xs={6}>
                <TextField
                  fullWidth
                  label="Flavor Name"
                  value={selectedVM.flavor}
                  disabled
                />
              </Grid2>
            </Grid2>
          ) : (
            <Typography>No Data Available</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseModal} color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>
      {/* <Dialog
        open={openEditModal}
        onClose={handleCloseEditModal}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Edit VM Request</DialogTitle>
        <DialogContent>
          <Grid2 container spacing={2} mt={2}>
            {Object.keys(editForm).map(
              (key) =>
                ![
                  "vm_name",
                  "fla_status",
                  "admin_status",
                  "storage_required",
                  "vdi_required",
                  "id",
                  "employee_id",
                  "name",
                  "email",
                  "designation",
                  "project_name",
                  "created_at",
                  "updated_at",
                  "request_timestamp",
                  "fla_approved_timestamp",
                  "admin_approved_timestamp",
                  "delete_request_status",
                  "deletion_timestamp",
                  "fla_status",
                  "admin_status",
                  "admin_rejection_reason",
                  "fla_rejection_reason",
                  "admin_action_timestamp",
                  "delete_request_reason",
                  "creation_error_message",
                  "creation_status",
                  "network_id",
                  "purpose_of_request",
                ].includes(key) && (
                  <Grid2 item xs={6} key={key}>
                    <TextField
                      fullWidth
                      label={key.replace("_", " ").toUpperCase()}
                      name={key}
                      value={editForm[key] || ""}
                      onChange={handleInputChange}
                    />
                  </Grid2>
                )
            )}
          </Grid2>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleUpdate} color="primary">
            Save
          </Button>
          <Button onClick={handleCloseEditModal} color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog> */}
     <Dialog
  open={openEditModal}
  onClose={handleCloseEditModal}
  maxWidth="sm"
  fullWidth
>
  <DialogTitle>Edit VM Request</DialogTitle>

  <DialogContent sx={{ overflowY: "visible" }}>
    <Grid2 container spacing={3} sx={{ mt: 1 }}>
      {allowedEditFields.map((key) =>
        key in editForm && (
          <Grid2 size={{ xs: 12, sm: 6 }} key={key}>
            {/* IMAGE DROPDOWN */}
            {key === "image" ? (
              <Autocomplete
                fullWidth // Makes the container fill the Grid
                options={imageOptions}
                getOptionLabel={(option) => option.name || ""}
                value={imageOptions.find((img) => img.name === editForm.image) || null}
                onChange={(e, newValue) =>
                  setEditForm((prev) => ({ ...prev, image: newValue ? newValue.name : "" }))
                }
                renderInput={(params) => (
                  <TextField 
                    {...params} 
                    label="IMAGE" 
                    fullWidth // Makes the input fill the container
                  />
                )}
              />
            ) : key === "flavor" ? (
              /* FLAVOR DROPDOWN */
              <Autocomplete
                fullWidth
                options={flavorOptions}
                getOptionLabel={(option) => option.name || ""}
                value={flavorOptions.find((f) => f.name === editForm.flavor) || null}
                onChange={(e, newValue) =>
                  setEditForm((prev) => ({ ...prev, flavor: newValue ? newValue.name : "" }))
                }
                renderInput={(params) => (
                  <TextField 
                    {...params} 
                    label="FLAVOR" 
                    fullWidth 
                  />
                )}
              />
            ) : key === "network_id" ? (
              /* NETWORK DROPDOWN */
              <Autocomplete
                fullWidth
                options={networks}
                getOptionLabel={(option) => option.network_name || ""}
                value={networks.find((net) => net.id === editForm.network_id) || null}
                onChange={(e, newValue) =>
                  setEditForm((prev) => ({ ...prev, network_id: newValue ? newValue.id : "" }))
                }
                renderInput={(params) => (
                  <TextField 
                    {...params} 
                    label="NETWORK" 
                    fullWidth 
                  />
                )}
              />
            ) : (
              /* NORMAL TEXT FIELD */
              <TextField
                fullWidth
                label={key.replace(/_/g, " ").toUpperCase()}
                name={key}
                value={editForm[key] || ""}
                onChange={handleInputChange}
              />
            )}
          </Grid2>
        )
      )}
    </Grid2>
  </DialogContent>

  <DialogActions sx={{ p: 3 }}>
    <Button onClick={handleCloseEditModal} color="inherit">
      Cancel
    </Button>
    <Button onClick={handleUpdate} variant="contained" color="primary">
      Save Changes
    </Button>
  </DialogActions>
</Dialog>
    </Container>
  );
};

export default VMRequestStatus;
