import React, { useEffect, useState } from 'react';
import apiClient from '../../Axios';
import { GoAlert } from 'react-icons/go';
import { RiDeleteBin6Line } from 'react-icons/ri';
import '../style.css';
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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TablePagination,
} from '@mui/material';
import { useTheme } from "@mui/material/styles";
import { CircularProgress } from '@mui/material';
import { Skeleton } from "@mui/material";

import { styled } from '@mui/material/styles';
import { tableCellClasses } from '@mui/material/TableCell';

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


const FloatingIps = () => {
  const [floatingIps, setFloatingIps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [showAssociateForm, setShowAssociateForm] = useState(false);
  const [selectedFloatingIps, setSelectedFloatingIps] = useState([]);
  const [projects, setProjects] = useState([]);
  const [networks, setNetworks] = useState([]);
  const [formErrors, setFormErrors] = useState({});
  const [creating, setCreating] = useState(false);
  const theme = useTheme(); 
  const [associateData, setAssociateData] = useState({
    network_pool: 'External Network 10.184.53.0/24',
    project_name: '',
    floating_ip: '',
    description: '',
    network_id: '',
    network_name: '',
  });

  const fetchFloatingIps = async () => {
    setError(null);
    setLoading(true);
    try {
      const response = await apiClient.get('/floating-ips/');
      if (response.data && Array.isArray(response.data.floating_ips)) {
        setFloatingIps(response.data.floating_ips);
      } else {
        setFloatingIps([]);
      }
    } catch (error) {
      console.error('Error fetching Floating IPs:', error);
      setFloatingIps([]);
      setError(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    setError(null);
    setLoading(true);
    try {
      const response = await apiClient.get('/openstack/projects/');
      setProjects(response.data);
    } catch (error) {
      console.error('Error fetching projects:', error);
      setError(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchNetworks = async () => {
    setError(null);
    setLoading(true);
    try {
      const response = await apiClient.get('/networks/');
      setNetworks(response.data);
    } catch (error) {
      console.error('Error fetching networks:', error);
      setError(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFloatingIps();
    fetchProjects();
    fetchNetworks();
  }, []);

  // 🔹 Show cloud loader ONLY on first load
const showInitialLoader = loading && floatingIps.length === 0;

  if (showInitialLoader) {
    return (
      <div className="cloud-container">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="7.87722 9.61948 33.01 16.88">
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

  if (error) {
    return (
      <div className="error-message">
        <GoAlert />
        <h2>❌ Server Down</h2>
      </div>
    );
  }

  const FloatingIpSkeletonRow = () => (
    <StyledTableRow>
      {Array.from({ length: 7 }).map((_, index) => (
        <StyledTableCell key={index}>
          <Skeleton variant="text" width="80%" />
        </StyledTableCell>
      ))}
    </StyledTableRow>
  );
  

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setPage(0);
  };

  const filteredFloatingIps = floatingIps.filter((ip) =>
    Object.values(ip).some((value) =>
      value?.toString().toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const handleChangePage = (_, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const currentVisibleFloatingIps = filteredFloatingIps.slice(
        page * rowsPerPage,
        page * rowsPerPage + rowsPerPage
      );
      const allVisibleIds = currentVisibleFloatingIps.map((floatingIp) => floatingIp.id);
      setSelectedFloatingIps(allVisibleIds);
    } else {
      setSelectedFloatingIps([]);
    }
  };

  const handleSelectFloatingIps = (floatingIpId) => {
    if (selectedFloatingIps.includes(floatingIpId)) {
      setSelectedFloatingIps(selectedFloatingIps.filter((id) => id !== floatingIpId));
    } else {
      setSelectedFloatingIps([...selectedFloatingIps, floatingIpId]);
    }
  };

  const handleDeleteFloatingIps = async (floatingIpsId) => {
    if (!window.confirm('Are you sure you want to delete this Floating IP?')) {
      return;
    }

    try {
      const response = await apiClient.delete(`/floating-ips/delete/${floatingIpsId}/`);

      if (response.status === 200 || response.status === 204) {
        alert('Floating IP deleted successfully');
        fetchFloatingIps();
      } else {
        console.error('Unexpected response:', response);
        alert('Unexpected server response while deleting the Floating IP.');
      }
    } catch (error) {
      console.error('Error deleting Floating IP:', error);
      if (error.response) {
        console.error('Server Response:', error.response);
        alert(`Delete failed: ${error.response.data?.message || 'Unknown error'}`);
      } else if (error.request) {
        console.error('No Response:', error.request);
        alert('No response from the server.');
      } else {
        console.error('Error:', error.message);
        alert('An error occurred.');
      }
    }
  };

  const validateAssociateForm = () => {
    const errors = {};
  
    if (!associateData.project_name) {
      errors.project_name = 'Project is required';
    }
  
    if (!associateData.network_name) {
      errors.network_name = 'Network is required';
    }
  
    if (associateData.floating_ip) {
      const ipRegex = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
      if (!ipRegex.test(associateData.floating_ip)) {
        errors.floating_ip = 'Invalid IP address';
      }
    }
  
    if (associateData.description && associateData.description.length > 255) {
      errors.description = 'Description must be under 255 characters';
    }
  
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFloatingIpActions = async (e) => {
    e.preventDefault();
    if (creating) return; // ⛔ prevent double click

    if (!validateAssociateForm()) {
      return; // Stop submission if validation fails
    }
  
    try {
      setCreating(true); // 🔄 START LOADER
      let floatingIp = associateData.floating_ip;
  
      if (!floatingIp) {
        const createPayload = {
          network_id: associateData.network_id,
        };
  
        const createResponse = await apiClient.post('/floating-ips/', createPayload);
  
        if (createResponse.status === 201 || createResponse.status === 200) {
          floatingIp = createResponse.data.floating_ip_address;
          alert('Floating IP created successfully: ' + floatingIp);
          fetchFloatingIps();
        } else {
          alert('Error creating Floating IP.');
          return;
        }
      }
  
      // Proceed with associate logic...
    } catch (error) {
      console.error('Error:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setAssociateData({
        network_pool: 'External Network 10.184.53.0/24',
        project_name: '',
        floating_ip: '',
        description: '',
        network_id: '',
        network_name: '',
      });
      setShowAssociateForm(false);
      setCreating(false); // ✅ STOP LOADER
    }
  };
  
  const handleReleaseFloatingIp = async (floatingIpAddress) => {
    try {
      const response = await apiClient.post('/floating-ips/release/', {
        floating_ip: floatingIpAddress,
      });
      if (response.status === 200) {
        alert('Floating IP released successfully');
        fetchFloatingIps();
      } else {
        alert('Failed to release Floating IP');
      }
    } catch (error) {
      console.error('Error releasing Floating IP:', error);
      alert('Error releasing Floating IP.');
    }
  };

  const handleAssociateInputChange = (e) => {
    const { name, value } = e.target;
    setAssociateData((prevState) => ({
      ...prevState,
      [name]: value,
    }));
  };

  const handleNetworkSelectChange = (e) => {
    const selectedNetworkName = e.target.value;
    const selectedNetwork = networks.find(
      (network) => network.network_name === selectedNetworkName && network.external
    );
  
    if (selectedNetwork) {
      setAssociateData((prevData) => ({
        ...prevData,
        network_id: selectedNetwork.id,
        network_name: selectedNetworkName,
      }));
    } else {
      setAssociateData((prevData) => ({
        ...prevData,
        network_id: '',
        network_name: '',
      }));
    }
  };
  

  const modalStyle = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 400,
    bgcolor: theme.palette.background.paper,
    boxShadow: 24,
    p: 4,
    borderRadius: '8px',
  };

  return (
    <div style={volumesContainerStyle}>
      <div style={headerContainerVolumesStyle}>
        <h1>Floating IP Management</h1>
        <div style={searchContainerStyle}>
          <TextField
            type="text"
            label="Search Floating IPs..."
            value={searchTerm}
            onChange={handleSearchChange}
            variant="outlined"
          />
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="contained"  sx={{
              backgroundColor: theme.palette.mode === "light" ? "#2e7d32" : "#388e3c",
              color: "#fff",
              "&:hover": {
                backgroundColor: theme.palette.mode === "light" ? "#1b5e20" : "#2e7d32",
              }
            }}  onClick={() => setShowAssociateForm(true)}>
              Create & Associate Floating IP
            </Button>
            <Button variant="contained" color="error" onClick={() => { }}>
              Delete <RiDeleteBin6Line />
            </Button>
          </div>
        </div>
      </div>

      <Modal open={showAssociateForm} onClose={ creating ? undefined : () => setShowAssociateForm(false)}>
        <Box sx={modalStyle}>
          <Typography variant="h6" component="h2" gutterBottom>
            Associate Floating IP
          </Typography>
          <form onSubmit={handleFloatingIpActions}>
            <FormControl fullWidth margin="normal">
              <InputLabel id="network_pool-label">Pool</InputLabel>
              <Select labelId="network_pool-label" id="network_pool" name="network_pool" value={associateData.network_pool} onChange={handleAssociateInputChange} label="Pool" required>
                <MenuItem value="External Network 10.184.53.0/24">External Network 10.184.53.0/24</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth margin="normal">
              <InputLabel id="project_name-label">Project Name</InputLabel>
              <Select
                labelId="project_name-label"
                id="project_name"
                name="project_name"
                value={associateData.project_name}
                onChange={handleAssociateInputChange}
                label="Project Name"
                required
                error={!!formErrors.project_name} // highlight error
              >
                <MenuItem value="">Select Project</MenuItem>
                {projects.map((project) => (
                  <MenuItem key={project.id} value={project.name}>
                    {project.name}
                  </MenuItem>
                ))}
              </Select>
              {formErrors.project_name && (
                <Typography variant="caption" color="error">
                  {formErrors.project_name}
                </Typography>
              )}
            </FormControl>

            <FormControl fullWidth margin="normal">
              <TextField label="Floating IP Address (optional)" name="floating_ip" value={associateData.floating_ip} onChange={handleAssociateInputChange} />
            </FormControl>
            <FormControl fullWidth margin="normal">
              <TextField label="Description (optional)" name="description" value={associateData.description} onChange={handleAssociateInputChange} />
            </FormControl>
            <FormControl fullWidth margin="normal">
              <InputLabel id="network-name-label">Network Name</InputLabel>
              <Select
                labelId="network-name-label"
                id="network_id"
                name="network_name"
                value={associateData.network_name}
                onChange={handleNetworkSelectChange}
                label="Network Name"
                required
              >
                <MenuItem value="">Select Network</MenuItem>
                
                {networks
                .filter((network) => network.external)
                .map((network) => (
                  <MenuItem key={network.id} value={network.network_name}>
                    {network.network_name}
                  </MenuItem>
              ))}


              </Select>
            </FormControl>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }} disabled={creating}>
              <Button type="submit" variant="contained" color="primary" sx={{ mr: 1 }}>
              {creating ? (
              <CircularProgress size={22} sx={{ color: "#fff" }} />
            ) : (
              "Create"
            )}
              </Button>
              <Button type="button" onClick={() => setShowAssociateForm(false)} variant="outlined">
                Cancel
              </Button>
            </Box>
          </form>
        </Box>
      </Modal>

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
        }}>
          <TableHead>
            <TableRow>
              <StyledTableCell padding="checkbox">
                <input
                  type="checkbox"
                  onChange={handleSelectAll}
                  checked={filteredFloatingIps.length > 0 &&
                    filteredFloatingIps.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).every(ip => selectedFloatingIps.includes(ip.id))}
                />
              </StyledTableCell>
              <StyledTableCell>Sr. No.</StyledTableCell> {/* Sr. No. header is now after the checkbox header */}
              <StyledTableCell>Project</StyledTableCell>
<StyledTableCell>Floating IP Address</StyledTableCell>
<StyledTableCell>Mapped Fixed IP Address</StyledTableCell>
<StyledTableCell>Description</StyledTableCell>
<StyledTableCell>Pool</StyledTableCell>
<StyledTableCell>Status</StyledTableCell>


              <StyledTableCell>Actions</StyledTableCell>
            </TableRow>
          </TableHead>
          <TableBody>
  {loading
    ? Array.from({ length: rowsPerPage }).map((_, i) => (
        <FloatingIpSkeletonRow key={i} />
      ))
    : filteredFloatingIps
        .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
        .map((floatingIp, index) => (
          <StyledTableRow key={floatingIp.id}>
            <StyledTableCell padding="checkbox">
              <input
                type="checkbox"
                checked={selectedFloatingIps.includes(floatingIp.id)}
                onChange={() => handleSelectFloatingIps(floatingIp.id)}
              />
            </StyledTableCell>

            <StyledTableCell>
              {page * rowsPerPage + index + 1}
            </StyledTableCell>

            <StyledTableCell>
  <Tooltip title={floatingIp.project_name || "Null"}>
    <span>{floatingIp.project_name || "Null"}</span>
  </Tooltip>
</StyledTableCell>

<StyledTableCell>
  <Tooltip title={floatingIp.floating_ip_address}>
    <span>{floatingIp.floating_ip_address}</span>
  </Tooltip>
</StyledTableCell>

<StyledTableCell>
  <Tooltip title={floatingIp.fixed_ip_address || "Null"}>
    <span>{floatingIp.fixed_ip_address || "Null"}</span>
  </Tooltip>
</StyledTableCell>

<StyledTableCell>
  <Tooltip title={floatingIp.description || "Null"}>
    <span>{floatingIp.description || "Null"}</span>
  </Tooltip>
</StyledTableCell>

<StyledTableCell>
  <Tooltip title={floatingIp.pool || "Null"}>
    <span>{floatingIp.pool || "Null"}</span>
  </Tooltip>
</StyledTableCell>

            <StyledTableCell>
  <Tooltip title={floatingIp.status}>
    <span>{floatingIp.status}</span>
  </Tooltip>
</StyledTableCell>

            <StyledTableCell>
              <Box display="flex" justifyContent="center" gap={1}>
                <Button
                  variant="outlined"
                  onClick={() =>
                    handleReleaseFloatingIp(floatingIp.floating_ip_address)
                  }
                >
                  Release
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  onClick={() => handleDeleteFloatingIps(floatingIp.id)}
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
                    count={filteredFloatingIps.length}
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
const volumesContainerStyle = { padding: '20px', fontFamily: 'sans-serif' };
const headerContainerVolumesStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '20px',
};
const searchContainerStyle = { display: 'flex', gap: '10px', alignItems: 'center' };
const volumesTableStyle = { width: '100%', borderCollapse: 'collapse', marginTop: '20px' };

export default FloatingIps;

