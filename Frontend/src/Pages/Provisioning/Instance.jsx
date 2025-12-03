import React, { useEffect, useState } from "react";
import { styled } from "@mui/material/styles";
import {
  Table,
  Grid,
  Box,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Select,
  MenuItem,
  TextField,
  FormControl,
  InputLabel,
} from "@mui/material";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

import { tableCellClasses } from "@mui/material/TableCell";
import apiClient from "../../Axios";
import { GoAlert } from "react-icons/go";
import "../style.css";

import dayjs from "dayjs";
import isToday from "dayjs/plugin/isToday";
import duration from "dayjs/plugin/duration";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import utc from "dayjs/plugin/utc";

dayjs.extend(isToday);
dayjs.extend(duration);
dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);
dayjs.extend(utc);

const StyledTableCell = styled(TableCell)(({ theme }) => ({
  [`&.${tableCellClasses.head}`]: {
    backgroundColor: "#253848",
    color: theme.palette.common.white,
    fontWeight: "bold",
    fontSize: 16,
    textAlign: "center",
  },
  [`&.${tableCellClasses.body}`]: {
    fontSize: 14,
    textAlign: "center",
    color: "#000",
  },
}));

const StyledTableRow = styled(TableRow)(({ theme }) => ({
  backgroundColor: theme.palette.grey[100],
  "&:nth-of-type(odd)": {
    backgroundColor: theme.palette.grey[300],
  },
  "&:last-child td, &:last-child th": {
    border: 0,
  },
}));

// --- Helper function using date-fns ---
// --- Helper function using Day.js ---
const formatInstanceAge = (isoDateString) => {
  if (!isoDateString) return "N/A";

  const creationDate = dayjs(isoDateString);
  if (!creationDate.isValid()) {
    console.error("Invalid date string for age:", isoDateString);
    return "Invalid Date";
  }

  const now = dayjs();

  const diff = dayjs.duration(now.diff(creationDate));

  const years = diff.years();
  const months = diff.months();
  const days = diff.days();
  const hours = diff.hours();
  const minutes = diff.minutes();

  let parts = [];

  if (years) parts.push(`${years} year${years > 1 ? "s" : ""}`);
  if (months) parts.push(`${months} month${months > 1 ? "s" : ""}`);
  if (days) parts.push(`${days} day${days > 1 ? "s" : ""}`);
  if (hours) parts.push(`${hours} hour${hours > 1 ? "s" : ""}`);

  if (minutes && parts.length === 0) {
    parts.push(`${minutes} minute${minutes > 1 ? "s" : ""}`);
  }

  if (parts.length === 0) return "Just now";

  return parts.join(", ");
};
// --- End Helper function ---

// --- End Helper function ---

const Instance = () => {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState("");
  const [projectData, setProjectData] = useState([]);
  const [instances, setInstances] = useState([]);
  const [filteredInstances, setFilteredInstances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProjects = async () => {
      setError(null);
      try {
        const response = await apiClient.get("/openstack/projects/");
        setProjects(response.data);
        const savedProjectId = localStorage.getItem("selectedProject");
        if (
          savedProjectId &&
          response.data.some((p) => p.id === savedProjectId)
        ) {
          setSelectedProject(savedProjectId);
          fetchProjectData(savedProjectId);
        } else if (response.data.length > 0) {
          setSelectedProject(response.data[0].id);
          fetchProjectData(response.data[0].id);
        }
      } catch (error) {
        console.error("Error fetching projects:", error);
      }
    };

    const fetchInstances = async () => {
      setError(null);
      try {
        const response = await apiClient.get("/instances/");
        setInstances(response.data);
        setFilteredInstances(response.data);
      } catch (error) {
        console.error("Error fetching instances:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
    fetchInstances();
  }, []);

  const fetchProjectData = async (projectId) => {
    setLoading(true);
    try {
      // Assuming /overview1/ still uses project_name=admin regardless of selected project for this dashboard
      const response = await apiClient.get(`/overview1/?project_name=admin`);
      const data = response.data;
      const formattedData = [
        {
          label: "VCPUs",
          used: data.used_vcpus,
          total: data.total_vcpus,
        },
        {
          label: "Memory (MB)",
          used: data.used_memory_mb,
          total: data.total_memory_mb,
        },
        {
          label: "Storage (GB)",
          used: data.used_storage_gb,
          total: data.total_storage_gb,
        },
        {
          label: "Volumes",
          used: data.total_volumes,
          total: data.total_volume_size_gb,
        },
        {
          label: "Security Groups",
          used: data.used_security_groups,
          total: data.total_security_groups,
        },
      ];
      setProjectData(formattedData);
    } catch (error) {
      console.error("Error fetching project data:", error);
      setError("Failed to fetch project data."); // Set error for project data
    } finally {
      setLoading(false);
    }
  };

  const handleProjectChange = (e) => {
    setSelectedProject(e.target.value);
    localStorage.setItem("selectedProject", e.target.value);
    fetchProjectData(e.target.value);
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    const filtered = instances.filter((instance) =>
      Object.values(instance).some(
        (value) =>
          value !== null &&
          value !== undefined &&
          value.toString().toLowerCase().includes(e.target.value.toLowerCase())
      )
    );
    setFilteredInstances(filtered);
  };

  const handleActionChange = async (event, instanceId) => {
    const action = event.target.value;
    if (!action) return;

    setLoading(true);
    try {
      const payload = {
        action: action,
        instance_ids: [instanceId],
      };

      const response = await apiClient.post("/vm_action/", payload);
      alert(
        `Action '${action}' on instance ${instanceId} successful: ${response.data.message}`
      );

      const updatedInstancesResponse = await apiClient.get("/instances/");
      setInstances(updatedInstancesResponse.data);
      setFilteredInstances(updatedInstancesResponse.data);
    } catch (err) {
      console.error(
        `Error performing ${action} on instance ${instanceId}:`,
        err
      );
      alert(
        `Failed to perform action '${action}' on instance ${instanceId}. Error: ${
          err.response?.data?.detail || err.message
        }`
      );
    } finally {
      setLoading(false);
    }
  };

  if (loading && !instances.length) {
    return (
      <div className="cloud-container">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="7.87722 9.61948 33.01 16.88"
        >
          <path
            d="M 12 26 H 37 C 42 26 41 20  37 20 C 38 18 37 15 33 16 C 32 8 15 8 14 17 C 8 16 6 25 12 26"
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

  if (error && !instances.length) {
    return (
      <div className="error-message">
        <GoAlert />
        <h2>❌ Server Down or Data Fetch Error</h2>
        <p>{error}</p>
      </div>
    );
  }

  const chartData = projectData.map((item) => ({
    label: item.label,
    used: item.used,
    available: item.total - item.used,
  }));

  return (
    <div className="instance-container">
      <Paper
        sx={{
          width: "100%",
          margin: "20px auto",
          padding: "20px",
          borderRadius: "10px",
          boxShadow: 3,
        }}
      >
        <Grid
          container
          alignItems="center"
          justifyContent="space-between"
          sx={{ marginBottom: 2 }}
        >
          <Grid item>
            <Typography variant="h5" sx={{ fontWeight: "bold" }}>
              Approved Request
            </Typography>
          </Grid>
          <Grid item>
            <TextField
              placeholder="Search instances..."
              value={searchTerm}
              onChange={handleSearchChange}
              size="small"
              variant="outlined"
              sx={{ minWidth: 250 }}
            />
          </Grid>
        </Grid>
        <TableContainer component={Paper} 
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
          backgroundColor: "transparent !important"
        }}>
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
                <StyledTableCell>Instance Name</StyledTableCell>
                <StyledTableCell>Flavor</StyledTableCell>
                <StyledTableCell>IP Address</StyledTableCell>
                <StyledTableCell>RAM</StyledTableCell>
                <StyledTableCell>Disk</StyledTableCell>
                <StyledTableCell>Image Name</StyledTableCell>
                <StyledTableCell>Status</StyledTableCell>
                <StyledTableCell>Power State</StyledTableCell>
                <StyledTableCell>Age</StyledTableCell>
                <StyledTableCell>Actions</StyledTableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredInstances.map((item, index) => (
                <StyledTableRow key={item["Instance ID"] || index}>
                  <StyledTableCell>{item["Instance Name"]}</StyledTableCell>
                  <StyledTableCell>{item["Flavor Name"]}</StyledTableCell>
                  <StyledTableCell>
                    {item["IP Addresses"]?.["External Network"]?.[0] || "N/A"}
                  </StyledTableCell>
                  <StyledTableCell>{item["RAM"]}</StyledTableCell>
                  <StyledTableCell>{item["Disk"]}</StyledTableCell>
                  <StyledTableCell>
                    {item["Image Name"] || "N/A"}
                  </StyledTableCell>
                  <StyledTableCell>{item["status"]} </StyledTableCell>
                  <StyledTableCell>{item["power_state_str"]} </StyledTableCell>
                  <StyledTableCell>
                    {formatInstanceAge(item["Age"])}
                  </StyledTableCell>
                  <StyledTableCell>
                    <FormControl
                      variant="outlined"
                      size="small"
                      sx={{ minWidth: 120 }}
                    >
                      <InputLabel
                        id={`action-select-label-${item["Instance ID"]}`}
                      >
                        Action
                      </InputLabel>
                      <Select
                        labelId={`action-select-label-${item["Instance ID"]}`}
                        id={`action-select-${item["Instance ID"]}`}
                        value=""
                        onChange={(e) =>
                          handleActionChange(e, item["Instance ID"])
                        }
                        label="Action"
                      >
                        <MenuItem value="">
                          <em>Select Action</em>
                        </MenuItem>
                        <MenuItem value="pause">Pause</MenuItem>
                        <MenuItem value="suspend">Suspend</MenuItem>
                        <MenuItem value="soft_reboot">Soft Reboot</MenuItem>
                        <MenuItem value="hard_reboot">Hard Reboot</MenuItem>
                        <MenuItem value="shutoff">Shutoff</MenuItem>
                        <MenuItem value="delete">Delete</MenuItem>
                      </Select>
                    </FormControl>
                  </StyledTableCell>
                </StyledTableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </div>
  );
};

export default Instance;
