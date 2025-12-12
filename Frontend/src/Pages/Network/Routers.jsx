import React, { useEffect, useState } from 'react';
import apiClient from '../../Axios';
import { GoAlert } from 'react-icons/go';
import { RiDeleteBin6Line, RiBallPenLine } from 'react-icons/ri';
import '../style.css';
import { useTheme } from "@mui/material/styles";

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
  Checkbox,
  FormControlLabel,
  TablePagination,
} from '@mui/material';
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


const Routers = () => {
  const [routers, setRouters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [selectedRouters, setSelectedRouters] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const theme = useTheme(); 
  const [newRouter, setNewRouter] = useState({
    name: '',
    admin_state_up: true,
    external_network_name: '',
    enable_snat: false,
    project_id: '',
    project_name: '', // Added project_name to newRouter
  });
  const [formErrors, setFormErrors] = useState({
    name: "",
    external_network_name: "",
    project_id: "",
  });
  

  const [routerToUpdate, setRouterToUpdate] = useState(null);
  const [networks, setNetworks] = useState([]);
  const [projects, setProjects] = useState([]);
  const fetchRouters = async () => {
    setError(null);
    try {
      const response = await apiClient.get('/routers/');
      setRouters(response.data);
    } catch (error) {
      console.error('Error fetching routers:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    setError(null);
    try {
      const response = await apiClient.get('/openstack/projects/');
      setProjects(response.data);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchNetworks = async () => {
    try {
      const response = await apiClient.get('/networks/');
      setNetworks(response.data);
    } catch (error) {
      console.error('Error fetching networks:', error);
    }
  };

  useEffect(() => {
    fetchRouters();
    fetchNetworks();
    fetchProjects();
  }, []);

  if (loading) {
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

  const validateRouterForm = () => {
    let errors = {};
  
    // NAME REQUIRED
    if (!newRouter.name.trim()) {
      errors.name = "Router name is required.";
    } 
    // MIN LENGTH
    else if (newRouter.name.length < 3) {
      errors.name = "Router name must be at least 3 characters.";
    } 
    // ALPHABET ONLY (NO NUMBERS / NO SPECIAL CHARACTERS)
    else if (!/^[A-Za-z_\s]+$/.test(newRouter.name)) {
      errors.name = "Router name can contain only alphabets and underscore (_).";
    }
  
    // NETWORK REQUIRED
    if (!newRouter.external_network_name) {
      errors.external_network_name = "Select an external network.";
    }
  
    // PROJECT REQUIRED
    if (!newRouter.project_id) {
      errors.project_id = "Select a project.";
    }
  
    setFormErrors(errors);
  
    return Object.keys(errors).length === 0;
  };
  

  const validateUpdateForm = () => {
    let errors = {};
  
    // NAME REQUIRED
    if (!routerToUpdate?.name?.trim()) {
      errors.name = "Router name is required.";
    } 
    // MIN LENGTH
    else if (routerToUpdate.name.length < 3) {
      errors.name = "Router name must be at least 3 characters.";
    } 
    // ALPHABETS ONLY
   
    else if (!/^[A-Za-z_\s]+$/.test(routerToUpdate.name)) {
      errors.name = "Router name must contain only alphabets.";
    }
  
    setFormErrors(errors);
  
    return Object.keys(errors).length === 0;
  };
  
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setPage(0);
  };

  const filteredRouters = routers.filter((router) =>
    Object.values(router).some((value) =>
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
      const currentVisibleRouters = filteredRouters.slice(
        page * rowsPerPage,
        page * rowsPerPage + rowsPerPage
      );
      const allVisibleIds = currentVisibleRouters.map((router) => router['Router ID']);
      setSelectedRouters(allVisibleIds);
    } else {
      setSelectedRouters([]);
    }
  };

  const handleSelectRouter = (routerId) => {
    if (selectedRouters.includes(routerId)) {
      setSelectedRouters(selectedRouters.filter((id) => id !== routerId));
    } else {
      setSelectedRouters([...selectedRouters, routerId]);
    }
  };

  const handleUpdateRouterInputChange = (e) => {
    const { name, value, type, checked } = e.target;
  
    setRouterToUpdate((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  
    // Live validation for router name
    if (name === "name") {
      let error = "";
      if (!value.trim()) {
        error = "Router name is required.";
      } else if (value.length < 3) {
        error = "Router name must be at least 3 characters.";
      } else if (!/^[A-Za-z_\s]+$/.test(value)) {
        error = "Router name can contain only alphabets and underscore (_).";
      }
  
      setFormErrors((prev) => ({ ...prev, name: error }));
    }
  };
  

  const handleNewRouterNameChange = (e) => {
    const { value } = e.target;
    
    setNewRouter((prev) => ({ ...prev, name: value }));
  
    // Live validation
    let error = "";
    if (!value.trim()) {
      error = "Router name is required.";
    } else if (value.length < 3) {
      error = "Router name must be at least 3 characters.";
    } else if (!/^[A-Za-z_\s]+$/.test(value)) {
      error = "Router name can contain only alphabets and underscore (_).";
    }
  
    setFormErrors((prev) => ({ ...prev, name: error }));
  };
  

  const handleCreateRouter = async (e) => {
    e.preventDefault();

    if (!validateRouterForm()) {
      return;
    }
    

    const existingRouter = routers.find((router) => router.name === newRouter.name);
    if (existingRouter) {
      alert('A router with the same name already exists. Please choose a different name.');
      return;
    }

    const payload = {
      name: newRouter.name,
      admin_state_up: newRouter.admin_state_up,
      external_network_name: newRouter.external_network_name,
      project_id: newRouter.project_id,
      enable_snat: newRouter.enable_snat || false,
    };

    try {
      const response = await apiClient.post('/create-router/', payload);
      if (response.status === 201 || response.status === 200) {
        alert('Router created successfully');
        setNewRouter({
          name: '',
          admin_state_up: true,
          external_network_name: '',
          project_id: '',
          project_name: '', // Reset
          enable_snat: false,
        });
        fetchRouters();
        setShowCreateForm(false);
      } else {
        console.error('Unexpected response:', response);
        alert('Unexpected response from the server. Please try again.');
      }
    } catch (error) {
      console.error('Error creating router:', error);
      alert('Error creating router. Please check the inputs and try again.');
    }
  };

  const handleUpdateRouter = async (e) => {
    e.preventDefault();
    if (!validateUpdateForm()) return;
    
    const payload = {
      name: routerToUpdate.name,
      admin_state_up: routerToUpdate.admin_state_up,
    };

    try {
      const response = await apiClient.put(`/edit-router/${routerToUpdate['Router ID']}/`, payload, {});
      if (response.status === 200) {
        alert('Router updated successfully');
        fetchRouters();
        setShowUpdateForm(false);
      }
    } catch (error) {
      console.error('Error updating router:', error);
      alert('Failed to update router');
    }
  };

  const handleDeleteRouter = async (routerId) => {
    if (!routerId) {
      console.error('Invalid router ID:', routerId);
      alert('Invalid router ID. Unable to delete.');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this router?')) {
      return;
    }

    try {
      const response = await apiClient.delete(`/delete-router/${routerId}/`);
      if (response.status === 200) {
        alert('Router deleted successfully');
        fetchRouters();
      } else {
        console.error('Unexpected response:', response);
        alert('Unexpected server response while deleting the router.');
      }
    } catch (error) {
      if (error.response) {
        console.error('Server error:', error.response);
        alert(`Failed to delete the router: ${error.response.data.message || 'Unknown error'}`);
      } else {
        console.error('Error:', error.message);
        alert('An error occurred while attempting to delete the router.');
      }
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
        <h1>Router Management</h1>
        <div style={searchContainerStyle}>
          <TextField
            type="text"
            label="Search routers..."
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
            }}  onClick={() => setShowCreateForm(true)}>
              Create Router <RiBallPenLine />
            </Button>
            <Button variant="contained" color="error" onClick={() => handleDeleteRouter(routers['Router ID'])}>
              Delete <RiDeleteBin6Line />
            </Button>
          </div>
        </div>
      </div>

      <Modal open={showCreateForm} onClose={() => setShowCreateForm(false)}>
        <Box sx={modalStyle}>
          <Typography variant="h6" component="h2" gutterBottom>
            Create New Router
          </Typography>
          <form onSubmit={handleCreateRouter}>
            <FormControl fullWidth margin="normal">
            <TextField
                label="Router Name"
                name="name"
                value={newRouter.name}
                onChange={handleNewRouterNameChange}
                error={!!formErrors.name}
                helperText={formErrors.name}   // this shows error text correctly
                required
              />

              </FormControl>
            <FormControl fullWidth margin="normal">
              <FormControlLabel control={<Checkbox checked={newRouter.admin_state_up} onChange={(e) => setNewRouter({ ...newRouter, admin_state_up: e.target.checked })} />} label="Admin State Up" />
            </FormControl>
            <FormControl fullWidth margin="normal">
              <FormControlLabel control={<Checkbox checked={newRouter.enable_snat} onChange={(e) => setNewRouter({ ...newRouter, enable_snat: e.target.checked })} />} label="Enable SNAT" />
            </FormControl>
            <FormControl fullWidth margin="normal">
              <InputLabel id="external_network_name-label">
                External Network
              </InputLabel>

              <Select
                labelId="external_network_name-label"
                id="external_network_name"
                value={newRouter.external_network_name}
                onChange={(e) =>
                  setNewRouter({ ...newRouter, external_network_name: e.target.value })
                }
                error={!!formErrors.external_network_name}
                label="External Network"
                required
              >
              <MenuItem value="">Select Network</MenuItem>

              {networks
                .filter((network) => network.external === true)
                .map((network) => (
                  <MenuItem key={network.id} value={network.id}>
                    {network.network_name}
                  </MenuItem>
                ))}
              </Select>

              {formErrors.external_network_name && (
                <Typography variant="caption" color="error">
                  {formErrors.external_network_name}
                </Typography>
              )}
            </FormControl>

            {/* Project Dropdown */}
            <FormControl fullWidth margin="normal">
              <InputLabel id="project_name-label">Project</InputLabel>
              <Select
                labelId="project_name-label"
                id="project_name"
                value={newRouter.project_name}
                onChange={(e) => {
                  const selectedProject = projects.find(p => p.name === e.target.value);
                  setNewRouter({
                    ...newRouter,
                    project_id: selectedProject ? selectedProject.id : '',
                    project_name: e.target.value,
                  });
                }}
                error={!!formErrors.project_id}
                label="Project"
                required
              >
                <MenuItem value="">Select Project</MenuItem>
                {projects.map((project) => (
                  <MenuItem key={project.id} value={project.name}>
                    {project.name}
                  </MenuItem>
                ))}
              </Select>

              {formErrors.project_id && (
                <Typography variant="caption" color="error">
                  {formErrors.project_id}
                </Typography>
              )}
            </FormControl>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
              <Button type="submit" variant="contained" color="primary" sx={{ mr: 1 }}>
                Create
              </Button>
              <Button type="button" onClick={() => setShowCreateForm(false)} variant="outlined">
                Cancel
              </Button>
            </Box>
          </form>
        </Box>
      </Modal>

      <Modal open={showUpdateForm} onClose={() => setShowUpdateForm(false)}>
        <Box sx={modalStyle}>
          <Typography variant="h6" component="h2" gutterBottom>
            Update Router
          </Typography>
          <form onSubmit={handleUpdateRouter}>
            <FormControl fullWidth margin="normal">
            <TextField
              label="Router Name"
              name="name"
              value={routerToUpdate?.name || ""}
              onChange={handleUpdateRouterInputChange}
              error={!!formErrors.name}
              helperText={formErrors.name}
              required
            />
              </FormControl>
            <FormControl fullWidth margin="normal">
              <FormControlLabel control={<Checkbox checked={routerToUpdate?.admin_state_up || false} onChange={handleUpdateRouterInputChange} name="admin_state_up" />} label="Admin State Up" />
            </FormControl>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
              <Button type="submit" variant="contained" color="primary" sx={{ mr: 1 }}>
                Update
              </Button>
              <Button type="button" onClick={() => setShowUpdateForm(false)} variant="outlined">
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
        }}
        >
          <TableHead>
            <TableRow>
              <StyledTableCell padding="checkbox">
                <input
                  type="checkbox"
                  onChange={handleSelectAll}
                  checked={filteredRouters.length > 0 &&
                    filteredRouters.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).every(router => selectedRouters.includes(router['Router ID']))}
                />
              </StyledTableCell>
              <StyledTableCell>Sr. No.</StyledTableCell>
              <StyledTableCell>Router Name</StyledTableCell>
              <StyledTableCell>Router ID</StyledTableCell>
              <StyledTableCell>Network Name</StyledTableCell>
              <StyledTableCell>Status</StyledTableCell>
              <StyledTableCell>Admin State</StyledTableCell>
              <StyledTableCell>Project Name</StyledTableCell>
              <StyledTableCell>Availability Zones</StyledTableCell>
              <StyledTableCell>Actions</StyledTableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredRouters
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((router, index) => (
                <StyledTableRow key={router['Router ID']}>
                  <StyledTableCell padding="checkbox">
                    <input
                      type="checkbox"
                      checked={selectedRouters.includes(router['Router ID'])}
                      onChange={() => handleSelectRouter(router['Router ID'])}
                    />
                  </StyledTableCell>
                  <StyledTableCell>{page * rowsPerPage + index + 1}</StyledTableCell>
                  <StyledTableCell>
                    <Tooltip title={router['Router Name']}>
                      <span>{router['Router Name']}</span>
                    </Tooltip>
                  </StyledTableCell>
                  <StyledTableCell>
                    <Tooltip title={router['Router ID']}>
                      <span>{router['Router ID']}</span>
                    </Tooltip>
                  </StyledTableCell>
                  <StyledTableCell>
                    <Tooltip title={router['Network Name']}>
                      <span>{router['Network Name']}</span>
                    </Tooltip>
                  </StyledTableCell>
                  <StyledTableCell>
                    <Tooltip title={router.Status}>
                      <span>{router.Status}</span>
                    </Tooltip>
                  </StyledTableCell>
                  <StyledTableCell>
                    <Tooltip title={router['Admin State'] ? 'Active' : 'Inactive'}>
                      <span>{router['Admin State'] ? 'Active' : 'Inactive'}</span>
                    </Tooltip>
                  </StyledTableCell>
                  <StyledTableCell>
                    <Tooltip title={router['Project Name']}>
                      <span>{router['Project Name']}</span>
                    </Tooltip>
                  </StyledTableCell>
                  <StyledTableCell>
                    <Tooltip title={router['Availability Zones'].join(', ')}>
                      <span>{router['Availability Zones'].join(', ')}</span>
                    </Tooltip>
                  </StyledTableCell>
                  <StyledTableCell>
                    <Box display="flex" justifyContent="center" gap={1}>
                      <Button
                        variant="outlined"
                        
                        onClick={() => {
                          setRouterToUpdate(router);
                          setShowUpdateForm(true);
                        }}
                      >
                        Update
                      </Button>
                      <Button variant="outlined" color="error" onClick={() => handleDeleteRouter(router['Router ID'])}>
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
                    count={filteredRouters.length}
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

export default Routers;

