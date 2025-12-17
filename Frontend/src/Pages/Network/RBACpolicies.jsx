import React, { useState, useEffect } from 'react';
import apiClient from '../../Axios';
import { GoAlert } from 'react-icons/go';
import { RiDeleteBin6Line, RiBallPenLine } from 'react-icons/ri';
import '../style.css';
import { useTheme } from "@mui/material/styles";
import { CircularProgress } from '@mui/material';

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
  Typography,
  Box,
  Modal,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TablePagination,
  Snackbar, // Import Snackbar
  Alert,    // Import Alert
  Slide,    // Import Slide for transition
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { tableCellClasses } from '@mui/material/TableCell';
import { CheckCircleOutline, ErrorOutline, InfoOutlined, WarningOutlined } from '@mui/icons-material'; // Import icons

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


const RBACpolicies = () => {
  const [targetProject, setTargetProject] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [action, setAction] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [selectedPolicies, setSelectedPolicies] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [objectType, setObjectType] = useState('');
  const [network, setNetwork] = useState('');
  const [networks, setNetworks] = useState([]);
  const [rbacPolicies, setRbacPolicies] = useState([]);
  const [editingPolicy, setEditingPolicy] = useState(null);
  const [projects, setProjects] = useState([]); 
  const theme = useTheme(); 
  const [formErrors, setFormErrors] = useState({});


  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);

  // Snackbar states and handlers
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');

  const showSnackbar = (message, severity) => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const handleSnackbarClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbarOpen(false);
  };

  const getAlertIcon = (severity) => {
    switch (severity) {
      case 'success':
        return <CheckCircleOutline style={{ marginRight: '8px' }} />;
      case 'error':
        return <ErrorOutline style={{ marginRight: '8px' }} />;
      case 'warning':
        return <WarningOutlined style={{ marginRight: '8px' }} />;
      default:
        return <InfoOutlined style={{ marginRight: '8px' }} />;
    }
  };

  const validateCreateForm = () => {
    const errors = {};
  
    if (!targetProject) {
      errors.targetProject = "Target Project is required";
    }
  
    if (!objectType) {
      errors.objectType = "Object Type is required";
    }
  
    if (objectType && !network) {
      errors.network = "Network is required";
    }
  
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  


  const fetchRbacPolicies = async () => {
    setError(null);
    try {
      const response = await apiClient.get('/rbac-policies/');
      if (response.data && Array.isArray(response.data.rbac_policies)) {
        setRbacPolicies(response.data.rbac_policies);
      } else {
        setRbacPolicies([]);
      }
    } catch (error) {
      console.error('Error fetching RBAC policies:', error);
      showSnackbar('Error fetching RBAC policies.', 'error'); // Add snackbar for fetch error
      setRbacPolicies([]);
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
      showSnackbar('Error fetching networks.', 'error'); // Add snackbar for fetch error
    }
  };

  // Function to fetch projects (as provided by the user)
  const fetchProjects = async () => {
    try {
      const response = await apiClient.get('/openstack/projects/');
      setProjects(response.data);
    } catch (error) {
      console.error('Error fetching projects:', error);
      showSnackbar('Error fetching projects list.', 'error');
    }
  };

  useEffect(() => {
    if (objectType) {
      fetchNetworks();
      const actionMap = {
        external_network: 'access_as_external',
        shared_network: 'access_as_shared',
        shared_qos_policy: 'manage_qos',
      };
      setAction(actionMap[objectType] || '');
    }
  }, [objectType]);

  useEffect(() => {
    fetchRbacPolicies();
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


  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setPage(0); // Reset page on search
  };

  const filteredPolicies = rbacPolicies.filter((policy) =>
    Object.values(policy).some((value) =>
      value?.toString().toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const handleChangePage = (_, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0); // Reset page on rows per page change
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const currentVisiblePolicies = filteredPolicies.slice(
        page * rowsPerPage,
        page * rowsPerPage + rowsPerPage
      );
      const allVisibleIds = currentVisiblePolicies.map((policy) => policy.id);
      setSelectedPolicies(allVisibleIds);
    } else {
      setSelectedPolicies([]);
    }
  };

  const handleSelectPolicy = (policyId) => {
    if (selectedPolicies.includes(policyId)) {
      setSelectedPolicies(selectedPolicies.filter((id) => id !== policyId));
    } else {
      setSelectedPolicies([...selectedPolicies, policyId]);
    }
  };

  
  const createRbacPolicy = async (e) => {
    e.preventDefault();
    if (creating) return; // ⛔ prevent double click
     // 🔥 ADD HERE (validation check)
    if (!validateCreateForm()) {
      showSnackbar("Please fix the form errors.", "error");
      return;
    }
    const payload = {
      target_project_id: targetProject,
      action,
      network_id: network,
    };
    try {
      setCreating(true); // 🔄 START LOADER
      const response = await apiClient.post('/create-rbac-policy/', payload);

      if (response.status === 200 || response.status === 201) {
        showSnackbar('RBAC Policy created successfully!', 'success');
        fetchRbacPolicies();
        setShowCreateForm(false);
  
        // Reset form fields
        setTargetProject('');
        setObjectType('');
        setNetwork('');
        setAction('');
      } else {
        showSnackbar('Failed to create RBAC Policy: Unexpected response.', 'error');
      }
    } catch (error) {
      console.error('Error creating RBAC policy:', error);
  
      // Extract specific error message from response
      if (error.response) {
        const serverError = error.response.data;
  
        if (serverError.quota_exceeded) {
          showSnackbar(serverError.error, 'error');
        } else if (serverError.error) {
          showSnackbar(`Failed to create RBAC Policy: ${serverError.error}`, 'error');
        } else {
          showSnackbar('Failed to create RBAC Policy. Please try again.', 'error');
        }
      } else {
        showSnackbar('Network error. Please check your connection.', 'error');
      }
    } finally {
      setCreating(false); // ✅ STOP LOADER
    }
  };

  const updateRbacPolicy = async (e) => {
    e.preventDefault();
    if (updating) return; // ⛔ prevent double submit
    if (!editingPolicy) return; // Should not happen if button is disabled, but good to check

    const payload = {
      target_project_id: targetProject,
      // Note: action and network are not being updated in the form for now,
      // so if they were part of the initial policy, they might remain unchanged.
      // If you intend to update them, add them to the update form and payload.
    };
    try {
      setUpdating(true); // 🔄 START LOADER

      const response = await apiClient.patch(`/update-rbac-policy/${editingPolicy.id}/`, payload);
      if (response.status === 200) {
        showSnackbar('RBAC Policy updated successfully!', 'success');
        setEditingPolicy(null);
        fetchRbacPolicies();
        // Reset form fields after successful update
        setTargetProject('');
      } else {
        showSnackbar('Failed to update RBAC Policy: Unexpected response.', 'error');
      }
    } catch (error) {
      console.error('Error updating RBAC policy:', error);
      if (error.response && error.response.data && error.response.data.error) {
        showSnackbar(`Failed to update RBAC Policy: ${error.response.data.error}`, 'error');
      } else {
        showSnackbar('Failed to update RBAC Policy. Please try again.', 'error');
      }
    }
    finally {
      setUpdating(false); // ✅ STOP LOADER
    }
  };

  const deleteRbacPolicy = async (policyId) => {
    if (!window.confirm('Are you sure you want to delete this RBAC policy?')) {
      return;
    }
    try {
      const response = await apiClient.delete(`/rbac-policies/${policyId}/`);
      if (response.status === 200 || response.status === 204) { // 204 No Content is common for successful DELETE
        showSnackbar('RBAC Policy deleted successfully!', 'success');
        fetchRbacPolicies();
      } else {
        showSnackbar('Failed to delete RBAC Policy: Unexpected response.', 'error');
      }
    } catch (error) {
      console.error('Error deleting RBAC policy:', error);
      if (error.response && error.response.data && error.response.data.error) {
        showSnackbar(`Failed to delete RBAC Policy: ${error.response.data.error}`, 'error');
      } else {
        showSnackbar('Failed to delete RBAC Policy. Please try again.', 'error');
      }
    }
  };

  const handleEditClick = (policy) => {
    setEditingPolicy(policy);
    setTargetProject(policy.target_project_id);
    setObjectType(policy.object_type);
    setNetwork(policy.object_id);
    // Set action based on object_type for consistency if needed,
    // though the update form only allows target_project change currently.
    const actionMap = {
      external_network: 'access_as_external',
      shared_network: 'access_as_shared',
      shared_qos_policy: 'manage_qos',
    };
    setAction(actionMap[policy.object_type] || '');
  };

  const handleDeleteSelectedPolicies = async () => {
    if (selectedPolicies.length === 0) {
      showSnackbar('No policies selected for deletion', 'warning');
      return;
    }

    if (!window.confirm('Are you sure you want to delete the selected policies?')) {
      return;
    }

    try {
      let successfulDeletes = 0;
      for (const policyId of selectedPolicies) {
        try {
          const response = await apiClient.delete(`/rbac-policies/${policyId}/`);
          if (response.status === 200 || response.status === 204) {
            successfulDeletes++;
          } else {
            console.warn(`Failed to delete policy ${policyId}: Unexpected response`, response);
          }
        } catch (innerError) {
          console.error(`Error deleting policy ${policyId}:`, innerError);
        }
      }

      if (successfulDeletes === selectedPolicies.length) {
        showSnackbar('Selected policies deleted successfully!', 'success');
      } else if (successfulDeletes > 0) {
        showSnackbar(`Successfully deleted ${successfulDeletes} out of ${selectedPolicies.length} policies. Some deletions failed.`, 'warning');
      } else {
        showSnackbar('Failed to delete any of the selected policies.', 'error');
      }
      setSelectedPolicies([]);
      fetchRbacPolicies();
    } catch (error) {
      // This catch block might be redundant if individual deletes are caught,
      // but keeps the overall structure safe.
      console.error('An unexpected error occurred while deleting selected policies:', error);
      showSnackbar('An unexpected error occurred while deleting selected policies.', 'error');
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
    <div style={rbacContainerStyle}>
      <div style={headerContainerRbacStyle}>
        <h1>RBAC Policy Management</h1>
        <div style={searchContainerStyle}>
          <TextField
            type="text"
            label="Search policies..."
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
              Create Policy <RiBallPenLine />
            </Button>
            {selectedPolicies.length > 0 && (
              <Button variant="contained" color="error" onClick={handleDeleteSelectedPolicies}>
                Delete <RiDeleteBin6Line />
              </Button>)}
          </div>
        </div>
      </div>

      <Modal open={showCreateForm} onClose={ creating ? undefined :  () => setShowCreateForm(false)}>
        <Box sx={modalStyle}>
          <Typography variant="h6" component="h2" gutterBottom>
            Create New RBAC Policy
          </Typography>
          <form onSubmit={createRbacPolicy}>
          <FormControl fullWidth margin="normal" error={!!formErrors.targetProject}>
            <InputLabel id="targetProject-label">Target Project</InputLabel>
            <Select
              labelId="targetProject-label"
              id="targetProject"
              value={targetProject}
              onChange={(e) => setTargetProject(e.target.value)}
              label="Target Project"
              required
            >
              <MenuItem value="">Select Target Project</MenuItem>
              {projects.map((proj) => (
                <MenuItem key={proj.id} value={proj.id}>
                  {proj.name}
                </MenuItem>
              ))}
            </Select>
            {formErrors.targetProject && (
              <Typography variant="caption" color="error">{formErrors.targetProject}</Typography>
            )}
          </FormControl>


          <FormControl fullWidth margin="normal" error={!!formErrors.objectType}>
            <InputLabel id="objectType-label">Action And Object Type</InputLabel>
            <Select
              labelId="objectType-label"
              id="objectType"
              value={objectType}
              onChange={(e) => setObjectType(e.target.value)}
              label="Action And Object Type"
              required
            >
              <MenuItem value="">Select Object Type</MenuItem>
              <MenuItem value="external_network">External Network</MenuItem>
              <MenuItem value="shared_network">Shared Network</MenuItem>
              <MenuItem value="shared_qos_policy">Shared QoS Policy</MenuItem>
            </Select>
            {formErrors.objectType && (
              <Typography variant="caption" color="error">{formErrors.objectType}</Typography>
            )}
          </FormControl>

            {objectType && (
              <FormControl fullWidth margin="normal" error={!!formErrors.network}>
              <InputLabel id="network-label">Network</InputLabel>
              <Select
                labelId="network-label"
                id="network"
                value={network}
                onChange={(e) => setNetwork(e.target.value)}
                label="Network"
                required
              >
                <MenuItem value="">Select Network</MenuItem>
            
                {networks.map((net) => (
                  <MenuItem key={net.id} value={net.id}>
                    {net.network_name}
                  </MenuItem>
                ))}
            
              </Select>
            
              {formErrors.network && (
                <Typography variant="caption" color="error">
                  {formErrors.network}
                </Typography>
              )}
            </FormControl>
            
            )}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
              <Button type="submit" variant="contained" color="primary" sx={{ mr: 1 }} disabled={creating} >
              {creating ? (
                  <CircularProgress size={22} sx={{ color: "#fff" }} />
                ) : (
                  "Create"
                )}
              </Button>
              <Button type="button" onClick={() => setShowCreateForm(false)} variant="outlined">
                Cancel
              </Button>
            </Box>
          </form>
        </Box>
      </Modal>

      <Modal open={editingPolicy !== null} onClose={updating ? undefined : () => setEditingPolicy(null)}>
        <Box sx={modalStyle}>
          <Typography variant="h6" component="h2" gutterBottom>
            Update RBAC Policy
          </Typography>
          <form onSubmit={updateRbacPolicy}>
          <FormControl fullWidth margin="normal">
              <InputLabel id="targetProjectUpdate-label">Target Project</InputLabel>
              <Select
                labelId="targetProjectUpdate-label"
                id="targetProjectUpdate"
                value={targetProject}
                onChange={(e) => setTargetProject(e.target.value)}
                label="Target Project"
                required
              >
                <MenuItem value="">Select Target Project</MenuItem>
                {projects.map((proj) => (
                  <MenuItem key={proj.id} value={proj.id}>
                    {proj.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* If you add other fields for update, they would go here */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
              <Button type="submit" variant="contained" color="primary" sx={{ mr: 1 }}  disabled={updating} >
              {updating ? (
                <CircularProgress size={22} sx={{ color: "#fff" }} />
              ) : (
                "Update"
              )}
              </Button>
              <Button type="button" onClick={() => setEditingPolicy(null)} variant="outlined">
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
                <input type="checkbox" onChange={handleSelectAll} checked={filteredPolicies.length > 0 && filteredPolicies.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).every(policy => selectedPolicies.includes(policy.id))} />
              </StyledTableCell>
              <StyledTableCell>Sr. No.</StyledTableCell>
              <StyledTableCell>ID</StyledTableCell>
              <StyledTableCell>Name</StyledTableCell>
              <StyledTableCell>Target Project</StyledTableCell>
              <StyledTableCell>Action</StyledTableCell>
              <StyledTableCell>Network</StyledTableCell>
              <StyledTableCell>Actions</StyledTableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredPolicies
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((policy, index) => (
                <StyledTableRow key={policy.id}>
                  <StyledTableCell padding="checkbox">
                    <input type="checkbox" checked={selectedPolicies.includes(policy.id)} onChange={() => handleSelectPolicy(policy.id)} />
                  </StyledTableCell>
                  <StyledTableCell>{page * rowsPerPage + index + 1}</StyledTableCell>
                  <StyledTableCell>{policy.id}</StyledTableCell>
                  <StyledTableCell>{policy.object_type}</StyledTableCell>
                  <StyledTableCell>{policy.target_project_id}</StyledTableCell>
                  <StyledTableCell>{policy.action}</StyledTableCell>
                  <StyledTableCell>{policy.object_id}</StyledTableCell>
                  <StyledTableCell>
                    <Box display="flex" justifyContent="center" gap={1}>
                      <Button variant="outlined"  onClick={() => handleEditClick(policy)}>
                        Update
                      </Button>
                      <Button variant="outlined" color="error" onClick={() => deleteRbacPolicy(policy.id)}>
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
                    count={filteredPolicies.length}
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

   
      {/* Snackbar component for displaying messages */}
      <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={handleSnackbarClose} anchorOrigin={{ vertical: 'top', horizontal: 'right' }} TransitionComponent={Slide}>
        <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: '100%', display: 'flex', alignItems: 'center' }}>
          {getAlertIcon(snackbarSeverity)}
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </div>
  );
};

// Inline CSS Styles (no changes needed here)
const rbacContainerStyle = { padding: '20px', fontFamily: 'sans-serif' };
const headerContainerRbacStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' };
const searchContainerStyle = { display: 'flex', gap: '10px', alignItems: 'center' };
const rbacTableStyle = { width: '100%', borderCollapse: 'collapse', marginTop: '20px' };

export default RBACpolicies;