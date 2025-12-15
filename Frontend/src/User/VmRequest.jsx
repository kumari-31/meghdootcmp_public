import { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import apiClient from "../Axios";
import { useAuth } from "../Pages/Authentication/authContext";
import {
  TextField,
  Checkbox,
  FormControlLabel,
  Button,
  Autocomplete,
  Grid2,
  Container,
  Paper,
  Select,
  MenuItem,
  FormControl,
  Popover,
  IconButton,
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  Divider,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import InfoIcon from "@mui/icons-material/Info";

const VmRequest = () => {
  const { user } = useAuth();
  const [imageOptions, setImageOptions] = useState([]);
  const [flavorOptions, setFlavorOptions] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [flavors, setFlavors] = useState([]);
  const [anchorEl, setAnchorEl] = useState(null);
  const [formData, setFormData] = useState({
    employee_id: user.employee_id || "",
    name: user.first_name || user.username || "",
    email: user.email || "",
    vm_name: "",
    count_of_vms: 1,
    purpose: "",
    purpose_of_request: "",
    project_name: "",
    designation: "",
    vdi_required: true,
    image: "",
    flavor: "",
    login_enable_date: "",
    login_disable_date: "",
    login_enable_time: "",
    login_disable_time: "",
    storage_required: false,
    additional_storage: "0",
  });
  const [vmName, setVmName] = useState("");
  const [isAvailable, setIsAvailable] = useState(null);
  const [message, setMessage] = useState("");
  const [alertDialog, setAlertDialog] = useState({
    open: false,
    message: "",
    severity: "success", // "success" | "error"
  });

  const enableDateRef = useRef(null);
  const enableTimeRef = useRef(null);
  const disableDateRef = useRef(null);
  const disableTimeRef = useRef(null);

  useEffect(() => {
    apiClient
      .get("/flavorslist/")
      .then((res) => setFlavors(res.data))
      .catch((err) => console.error("Failed to fetch flavors", err));
  }, []);

  const handlePopoverOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handlePopoverClose = () => {
    setAnchorEl(null);
  };

  const cancelRequest = useRef(null);
  const debounceTimer = useRef(null);

  const getTrimmedName = (name) => {
    const parts = name.split("_");
    return parts.length > 1 ? parts.slice(1).join("_") : name;
  };

  const checkVMName = useCallback(
    async (name) => {
      if (!name) {
        setIsAvailable(null);
        setMessage("");
        return;
      }

      try {
        const trimmedName = getTrimmedName(name);
        // Cancel previous request if still in progress
        if (cancelRequest.current) {
          cancelRequest.current.cancel("Cancelled stale request");
        }

        cancelRequest.current = axios.CancelToken.source();

        const response = await apiClient.get("/check-vm-name/", {
          params: { vm_name: trimmedName },
          cancelToken: cancelRequest.current.token,
        });

        setIsAvailable(!response.data.exists);
        setMessage(response.data.message);
      } catch (error) {
        console.error("Error checking VM name:", error);
        setIsAvailable(null);
        setMessage("Error checking VM name.");
      }
    },
    [] // add dependencies if needed
  );

  // Native debounce using useCallback and setTimeout
  // eslint-disable-next-line

  const debouncedCheck = useCallback(
    (name) => {
      clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        checkVMName(name);
      }, 800); // Adjust delay for your UX
    },
    [checkVMName]
  );

  useEffect(() => {
    debouncedCheck(vmName);
  }, [vmName, debouncedCheck]);

  // Fetch project data from API
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await apiClient.get("/cdacprojects/"); // Ensure correct endpoint

        if (response.status !== 200) {
          throw new Error(`API Error: ${response.status}`);
        }

        setProjects(response.data);
        // setFilteredProjects(response.data);
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  useEffect(() => {
    // Fetch the image data from the API
    const fetchImageData = async () => {
      try {
        const response = await apiClient.get("/images/");
        if (response.status === 200) {
          const data = response.data;
          setImageOptions(data);
        } else {
          console.error("Failed to fetch image data");
        }
      } catch (error) {
        console.error("Error fetching image data:", error);
      }
    };

    fetchImageData();
  }, []);

  useEffect(() => {
    // Fetch the image data from the API
    const fetchFlavorData = async () => {
      try {
        const response = await apiClient.get("/flavors/"); // API call for flavors
        if (response.status === 200) {
          const data = response.data;
          setFlavorOptions(data); // Update the flavors options state
        } else {
          console.error("Failed to fetch flavor data");
        }
      } catch (error) {
        console.error("Error fetching flavor data:", error);
      }
    };

    fetchFlavorData();
  }, []);

  // Handle input change
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  // Fetch data from IndexedDB on component mount
  // ✅ Rehydrate form data from AuthContext (cookie-based user)
  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        employee_id: user.employee_id || "",
        name: user.first_name || user.username || "",
        email: user.email || "",
      }));
    }
  }, [user]);

  useEffect(() => {
    const now = new Date();

    const currentDate = now.toISOString().split("T")[0]; // YYYY-MM-DD
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM

    setFormData((prev) => ({
      ...prev,
      login_enable_date: prev.login_enable_date || currentDate,
      login_enable_time: prev.login_enable_time || currentTime,
    }));
  }, []);

  // Submit form data to API
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const payload = {
        ...formData,
        name: formData.name,
        email: formData.email,
      };

      const response = await apiClient.post("/vmrequests/", payload, {
        headers: { "Content-Type": "application/json" },
      });

      if (response.status === 200 || response.status === 201) {
        setAlertDialog({
          open: true,
          message: "VM Request Submitted Successfully!",
          severity: "success",
        });

        setFormData((prev) => ({
          ...prev,
          vm_name: "",
          count_of_vms: 1,
          purpose: "",
          purpose_of_request: "",
          project_name: "",
          designation: "",
          vdi_required: true,
          image: "",
          flavor: "",
          login_enable_date: "",
          login_disable_date: "",
          login_enable_time: "",
          login_disable_time: "",
          storage_required: false,
          additional_storage: "0",
        }));
      } else {
        setAlertDialog({
          open: true,
          message: "Error submitting the form. Please try again.",
          severity: "error",
        });
      }
    } catch (error) {
      console.error("Error submitting the form:", error);
      setAlertDialog({
        open: true,
        message: "An error occurred. Please check the console for details.",
        severity: "error",
      });
    }

    setVmName("");
  };
  useEffect(() => {
    setFormData((prevData) => ({ ...prevData, vm_name: vmName }));
  }, [vmName]);

  return (
    <div className="el">
      <Container maxWidth="lg">
        {loading && <div className="loader">Loading...</div>}
        <Grid2 container spacing={2} alignItems="flex-start">
          <Grid2 item xs={12} md={8}>
            <Paper elevation={2} style={{ padding: "20px", marginTop: "20px" }}>
              <form onSubmit={handleSubmit}>
                <Grid2 container spacing={2}>
                  <Grid2 size={6}>
                    {" "}
                    <FormControl fullWidth required>
                      <InputLabel>Designation</InputLabel>
                      <Select
                        name="designation"
                        label="Designation"
                        value={formData.designation}
                        onChange={handleChange}
                      >
                        <MenuItem value="HR">HR</MenuItem>
                        <MenuItem value="Finance">Finance</MenuItem>
                        <MenuItem value="Senior Management">
                          Senior Management
                        </MenuItem>
                        <MenuItem value="Developer">Developer</MenuItem>
                        <MenuItem value="Testing">Testing</MenuItem>
                        <MenuItem value="Student">Student</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid2>
                  <Grid2 size={6}>
                    <div>
                      <TextField
                        label="VM Name"
                        variant="outlined"
                        fullWidth
                        value={vmName}
                        onChange={(e) => setVmName(e.target.value)}
                        helperText={message}
                        error={isAvailable === false}
                      />
                    </div>
                  </Grid2>
                  <Grid2 size={6}>
                    <TextField
                      label="Vm Count"
                      name="count_of_vms"
                      type="number"
                      value={formData.count_of_vms}
                      onChange={handleChange}
                      fullWidth
                      required
                    />
                  </Grid2>

                  <Grid2 size={6}>
                    <Autocomplete
                      options={projects}
                      getOptionLabel={(option) => option.project_name}
                      value={
                        projects.find(
                          (option) =>
                            option.project_name === formData.project_name
                        ) || null
                      }
                      onChange={(event, newValue) => {
                        setFormData({
                          ...formData,
                          project_name: newValue ? newValue.project_name : "",
                        });
                      }}
                      renderInput={(params) => (
                        <TextField {...params} label="Project Name" fullWidth />
                      )}
                    />
                  </Grid2>
                  <Grid2 size={6}>
                    {" "}
                    <FormControl fullWidth required>
                      <InputLabel>Purpose</InputLabel>
                      <Select
                        name="purpose"
                        label="Designation"
                        value={formData.purpose}
                        onChange={handleChange}
                        fullWidth
                        required
                      >
                        <MenuItem value="Testing">Testing</MenuItem>
                        <MenuItem value="Staging">Staging</MenuItem>
                        <MenuItem value="Production">Production</MenuItem>
                        <MenuItem value="Development">Development</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid2>
                  <Grid2 size={6}>
                    <TextField
                      label="Purpose of Request"
                      name="purpose_of_request"
                      value={formData.purpose_of_request}
                      onChange={handleChange}
                      fullWidth
                      required
                    />
                  </Grid2>
                  <Grid2 size={6}>
                    <Autocomplete
                      options={imageOptions}
                      getOptionLabel={(option) => option.name}
                      value={
                        imageOptions.find(
                          (option) => option.name === formData.image
                        ) || null
                      }
                      onChange={(event, newValue) => {
                        setFormData({
                          ...formData,
                          image: newValue ? newValue.name : "",
                        });
                      }}
                      renderInput={(params) => (
                        <TextField {...params} label="Image" fullWidth />
                      )}
                    />
                  </Grid2>
                  <Grid2 size={6}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Autocomplete
                        options={flavorOptions}
                        getOptionLabel={(option) => option.name}
                        value={
                          flavorOptions.find(
                            (option) => option.name === formData.flavor
                          ) || null
                        }
                        onChange={(event, newValue) => {
                          setFormData({
                            ...formData,
                            flavor: newValue ? newValue.name : "",
                          });
                        }}
                        renderInput={(params) => (
                          <TextField {...params} label="Flavor" fullWidth />
                        )}
                        fullWidth
                      />

                      {/* Info Icon */}
                      <IconButton onClick={handlePopoverOpen} size="small">
                        <InfoIcon fontSize="small" />
                      </IconButton>

                      <Popover
                        open={Boolean(anchorEl)}
                        anchorEl={anchorEl}
                        onClose={handlePopoverClose}
                        anchorOrigin={{
                          vertical: "bottom",
                          horizontal: "left",
                        }}
                        transformOrigin={{
                          vertical: "top",
                          horizontal: "left",
                        }}
                      >
                        <Box sx={{ p: 2, maxWidth: 300 }}>
                          <Typography variant="subtitle1" gutterBottom>
                            🗂️ Flavor Details
                          </Typography>
                          <List dense>
                            {flavors.map((flavor) => (
                              <Box key={flavor.flavor_name}>
                                <ListItem>
                                  <ListItemText
                                    primary={
                                      <strong>{flavor.flavor_name}</strong>
                                    }
                                    secondary={
                                      <Typography variant="body2">
                                        VCPUs: {flavor.vcpus}, RAM: {flavor.ram}
                                        MB, Disk: {flavor.root_disk}GB
                                      </Typography>
                                    }
                                  />
                                </ListItem>
                                <Divider />
                              </Box>
                            ))}
                          </List>
                        </Box>
                      </Popover>
                    </Box>
                  </Grid2>
                  <Grid2 size={6}>
                    <TextField
                      label="Login Enable Date"
                      name="login_enable_date"
                      type="date"
                      value={formData.login_enable_date}
                      onChange={handleChange}
                      inputRef={enableDateRef}
                      onFocus={() => enableDateRef.current.showPicker?.()}
                      fullWidth
                      required
                      slotProps={{ inputLabel: { shrink: true } }}
                    />
                  </Grid2>
                  <Grid2 size={6}>
                    <TextField
                      label="Login Enable Time"
                      name="login_enable_time"
                      type="time"
                      value={formData.login_enable_time}
                      onChange={handleChange}
                      inputRef={enableTimeRef}
                      onFocus={() => enableTimeRef.current.showPicker?.()}
                      fullWidth
                      required
                      slotProps={{ inputLabel: { shrink: true } }}
                    />
                  </Grid2>
                  <Grid2 size={6}>
                    <TextField
                      label="Login Disable Date"
                      name="login_disable_date"
                      type="date"
                      value={formData.login_disable_date}
                      onChange={handleChange}
                      inputRef={disableDateRef}
                      onFocus={() => disableDateRef.current.showPicker?.()}
                      fullWidth
                      required
                      slotProps={{ inputLabel: { shrink: true } }}
                    />
                  </Grid2>
                  <Grid2 size={6}>
                    <TextField
                      label="Login Disable Time"
                      name="login_disable_time"
                      type="time"
                      value={formData.login_disable_time}
                      onChange={handleChange}
                      inputRef={disableTimeRef}
                      onFocus={() => disableTimeRef.current.showPicker?.()}
                      fullWidth
                      required
                      slotProps={{ inputLabel: { shrink: true } }}
                    />
                  </Grid2>

                  <Grid2 size={6}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={formData.storage_required}
                          onChange={handleChange}
                          name="storage_required"
                        />
                      }
                      label="Storage Required"
                    />
                  </Grid2>
                  {formData.storage_required && (
                    <Grid2 size={6}>
                      <TextField
                        label="Additional Storage"
                        name="additional_storage"
                        type="number"
                        value={formData.additional_storage}
                        onChange={handleChange}
                        fullWidth
                        required
                      />
                    </Grid2>
                  )}

                  <Grid2 item xs={12} className="sbt-btn">
                    <Button type="submit" variant="contained" color="primary">
                      Submit Request
                    </Button>
                  </Grid2>
                </Grid2>
              </form>
            </Paper>
          </Grid2>
        </Grid2>
      </Container>
      <Dialog
        open={alertDialog.open}
        onClose={() => setAlertDialog({ ...alertDialog, open: false })}
      >
        <DialogTitle sx={{ textAlign: "center", p: 3 }}>
          {alertDialog.severity === "success" ? (
            <CheckCircleIcon color="success" sx={{ fontSize: 60 }} />
          ) : (
            <ErrorIcon color="error" sx={{ fontSize: 60 }} />
          )}
        </DialogTitle>
        <DialogContent sx={{ textAlign: "center", px: 6 }}>
          <Typography variant="h6" gutterBottom>
            {alertDialog.severity === "success" ? "Success" : "Error"}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {alertDialog.message}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ justifyContent: "center", pb: 3 }}>
          <Button
            onClick={() => setAlertDialog({ ...alertDialog, open: false })}
            variant="contained"
            color={alertDialog.severity}
          >
            OK
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default VmRequest;
