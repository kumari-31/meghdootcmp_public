// src/Pages/Instance.jsx
import  { useEffect, useState } from "react";
import apiClient from "../../Axios";
import "../style.css";

import {
  TextField,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
  TablePagination,
} from "@mui/material";

import { styled } from "@mui/material/styles";
import { tableCellClasses } from "@mui/material/TableCell";
import { useTheme } from "@mui/material/styles";

/* -----------------------------------------
   Styled Table Components (Same as Roles.jsx)
-------------------------------------------- */

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

/* ------------------------------------------
              Main Component
------------------------------------------- */

const Instance = () => {
  const theme = useTheme();

  // Projects
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState("");

  // Instances
  const [instances, setInstances] = useState([]);
  const [filteredInstances, setFilteredInstances] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search + Pagination
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  /* ------------------------------------------
                Fetch Projects & Instances
  ------------------------------------------- */

  useEffect(() => {
    const fetchProjects = async () => {
      setError(null);
      try {
        const response = await apiClient.get("/openstack/projects/");
        setProjects(response.data);

        const savedProjectId = localStorage.getItem("selectedProject");

        if (savedProjectId && response.data.some((p) => p.id === savedProjectId)) {
          setSelectedProject(savedProjectId);
        } else if (response.data.length > 0) {
          setSelectedProject(response.data[0].id);
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

  /* ------------------------------------------
                 Search Filter
  ------------------------------------------- */

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);

    const filtered = instances.filter((instance) =>
      Object.values(instance).some(
        (value) =>
          value &&
          value.toString().toLowerCase().includes(e.target.value.toLowerCase())
      )
    );

    setFilteredInstances(filtered);
    setPage(0);
  };

  /* ------------------------------------------
                 Pagination Handlers
  ------------------------------------------- */
  const handlePageChange = (_, newPage) => setPage(newPage);

  const handleRowsPerPageChange = (e) => {
    setRowsPerPage(parseInt(e.target.value, 10));
    setPage(0);
  };

  const currentInstances = filteredInstances.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  /* ------------------------------------------
               Instance Action Handler
  ------------------------------------------- */

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
        `Action '${action}' successful on Instance ${instanceId}: ${response.data.message}`
      );

      // Refresh Instances
      const refresh = await apiClient.get("/instances/");
      setInstances(refresh.data);
      setFilteredInstances(refresh.data);
    } catch (err) {
      alert(
        `Failed to perform action '${action}': ${
          err.response?.data?.detail || err.message
        }`
      );
    } finally {
      setLoading(false);
    }
  };

  /* ------------------------------------------
                 Loading Screen
  ------------------------------------------- */

  if (loading && !instances.length) {
    return (
      <div className="cloud-container">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="7.9 9.6 33 16.9">
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

  /* ------------------------------------------
                 Error Screen
  ------------------------------------------- */

  if (error) {
    return (
      <div className="error-message">
        <h2>❌ Server Down</h2>
      </div>
    );
  }

  /* ------------------------------------------
                      UI
  ------------------------------------------- */

  return (
    <div style={volumesContainerStyle}>
      <div style={headerContainerVolumesStyle}>
        <h1> Instance Management</h1>
        <div style={searchContainerStyle}>
          <TextField
            type="text"
            label="Search instances..."
            value={searchTerm}
            onChange={handleSearchChange}
            variant="outlined"
          />
        </div>
      </div>
  

      {/* Table */}
      <TableContainer
        component={Paper}
        sx={{
          width: "fit-content",
          minWidth: "75%",
          margin: "0 auto",
          backgroundColor: "transparent",
          boxShadow: "none",
        }}
      >
        <Table
          sx={{
            width: "100%",
            minWidth: 650,
            border: "none",
            "& td, & th": { border: "none !important" },
          }}
        >
          <TableHead>
            <TableRow>
              <StyledTableCell>Vm Name</StyledTableCell>
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
            {currentInstances.map((item, index) => (
              <StyledTableRow key={item["Instance ID"] || index}>
                <StyledTableCell>
                  {item["VM Name"].split("_").slice(1).join("_")}
                </StyledTableCell>
                 <StyledTableCell>
                  {item["Instance Name"]}
                </StyledTableCell>
                <StyledTableCell>{item["Flavor Name"]}</StyledTableCell>
                <StyledTableCell>
                  {item["IP Addresses"]
                    ? Object.values(item["IP Addresses"])[0]?.[0] || "N/A"
                    : "N/A"}
                </StyledTableCell>
                <StyledTableCell>{item["RAM"]}</StyledTableCell>
                <StyledTableCell>{item["Disk"]}</StyledTableCell>
                <StyledTableCell>
                  {item["Image Name"] && item["Image Name"] !== "N/A"
                    ? item["Image Name"]
                    : <span style={{ color: "gray" }}>N/A</span>}
                </StyledTableCell>
                <StyledTableCell>{item["status"]}</StyledTableCell>
                <StyledTableCell>{item["power_state_str"]}</StyledTableCell>
                <StyledTableCell>{item["Age"]}</StyledTableCell>

                <StyledTableCell>
                  <FormControl size="small" sx={{ minWidth: 120 }}>
                    <InputLabel>Action</InputLabel>
                    <Select
                      value=""
                      label="Action"
                      onChange={(e) => handleActionChange(e, item["Instance ID"])}
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

        {/* Pagination */}
        <TablePagination
          component="div"
          count={filteredInstances.length}
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={handlePageChange}
          onRowsPerPageChange={handleRowsPerPageChange}
          rowsPerPageOptions={[5, 10, 25, 50]}
        />
      </TableContainer>
    </div>
  );
};


const volumesContainerStyle = { padding: '20px', fontFamily: 'sans-serif' };
const headerContainerVolumesStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '20px',
};
const searchContainerStyle = { display: 'flex', gap: '10px', alignItems: 'center' };
const volumesTableStyle = { width: '100%', borderCollapse: 'collapse', marginTop: '20px' };

export default Instance;
