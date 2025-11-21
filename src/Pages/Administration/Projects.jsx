import React, { useEffect, useState } from 'react';
import apiClient from '../../Axios';
import { GoAlert } from 'react-icons/go';
import { RiDeleteBin6Line, RiBallPenLine } from 'react-icons/ri';
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TablePagination,
  Checkbox, // Added for multi-select checkbox
  ListItemText, // Added for multi-select text
  OutlinedInput, // Added for multi-select input
} from '@mui/material';
import { Snackbar, Alert as MuiAlert } from '@mui/material';

import { styled } from '@mui/material/styles';
import { tableCellClasses } from '@mui/material/TableCell';

// Styled Table Components for consistent UI
const StyledTableCell = styled(TableCell)(({ theme }) => ({
  [`&.${tableCellClasses.head}`]: {
    backgroundColor: '#253848', // Dark background for header
    color: theme.palette.common.white, // White text for header
    fontWeight: 'bold',
    fontSize: 16,
    textAlign: 'center',
  },
  [`&.${tableCellClasses.body}`]: {
    fontSize: 14,
    textAlign: 'center',
    color: '#000',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: '200px', // Limit width to prevent excessive stretching
  },
}));

const StyledTableRow = styled(TableRow)(({ theme }) => ({
  backgroundColor: theme.palette.grey[100], // Light grey for default rows
  '&:nth-of-type(odd)': {
    backgroundColor: theme.palette.grey[300], // Slightly darker grey for odd rows
  },
  '&:last-child td, &:last-child th': {
    border: 0, // No border on last row
  },
}));

const Projects = () => {
  // State variables for project data and UI management
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0); // Current page for pagination
  const [rowsPerPage, setRowsPerPage] = useState(5); // Number of rows per page
  const [showCreateForm, setShowCreateForm] = useState(false); // Toggle for create project modal
  const [selectedProjects, setSelectedProjects] = useState([]); // Selected projects for bulk actions
  const [showUpdateForm, setShowUpdateForm] = useState(false); // Toggle for update project modal
  const [projectToUpdate, setProjectToUpdate] = useState(null); // Project data for update modal
  const [groups, setGroups] = useState([]); // List of available groups
  const [users, setUsers] = useState([]); // List of available users

  // States for new project creation form, including new optional fields
  const [newProject, setNewProject] = useState({
    Domain_id: 'default',
    Domain_name: 'default',
    name: '',
    description: '',
    enabled: 'true', // Project enabled status
    user_roles: [], // Array of { username, role } for assigning users
    group_names: [], // Array of strings for assigning groups
  });

  // States for temporary selections within the create project modal
  const [selectedUser, setSelectedUser] = useState(''); // Currently selected user for role assignment
  const [selectedRole, setSelectedRole] = useState('member'); // Role for the selected user (default: member)
  const [selectedGroups, setSelectedGroups] = useState([]); // Currently selected groups for assignment

  // States for custom modal dialogs (alerts, success messages, confirmations)
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmAction, setConfirmAction] = useState(null); // Function to execute on confirmation

  // Fetches the list of projects from the API
  const fetchProjects = async () => {
    setError(null); // Clear previous errors
    try {
      const response = await apiClient.get('/openstack/projects/');
      setProjects(response.data);
    } catch (error) {
      console.error('Error fetching projects:', error);
      setError(error); // Set error state if API call fails
    } finally {
      setLoading(false); // End loading regardless of success or failure
    }
  };

  // Fetches the list of groups from the API
  const fetchGroups = async () => {
    setError(null); // Clear previous errors
    try {
      const response = await apiClient.get('/list-group/');
      setGroups(response.data);
    } catch (error) {
      console.error('Error fetching groups:', error);
      setError(error); // Set error state if API call fails
    } finally {
      setLoading(false); // End loading regardless of success or failure
    }
  };

  // Fetches the list of users from the API
  const fetchUsers = async () => {
    try {
      const response = await apiClient.get('/users/');
      setUsers(response.data.users || []); // Ensure users is an array
    } catch (error) {
      console.error('Error fetching users:', error);
      setError(error); // Set error state if API call fails
    }
  };

  // useEffect hook to fetch data on component mount
  useEffect(() => {
    setError(null); // Clear error on initial load
    fetchProjects();
    fetchGroups();
    fetchUsers();
  }, []); // Empty dependency array ensures this runs once on mount


  // Display loading animation while data is being fetched
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

// Display error message if an error occurred during data fetching
if (error) {
    return (
        <div className="error-message">
            <GoAlert />
            <h2>❌ Server Down</h2>
        </div>
    );
}

// Handles changes in the search input field
const handleSearchChange = (e) => {
  setSearchTerm(e.target.value);
  setPage(0); // Reset page to first on search
};

// Filters projects based on the search term
const filteredProjects = projects.filter((project) =>
  Object.values(project).some((value) =>
    value?.toString().toLowerCase().includes(searchTerm.toLowerCase())
  )
);

// Handles page changes in pagination
const handleChangePage = (_, newPage) => {
  setPage(newPage);
};

// Handles changes in rows per page in pagination
const handleChangeRowsPerPage = (event) => {
  setRowsPerPage(parseInt(event.target.value, 10));
  setPage(0); // Reset page to first on rows per page change
};

// Handles selecting/deselecting all visible projects
const handleSelectAll = (e) => {
  if (e.target.checked) {
    const currentVisibleProjects = filteredProjects.slice(
      page * rowsPerPage,
      page * rowsPerPage + rowsPerPage
    );
    const allVisibleIds = currentVisibleProjects.map((project) => project.id);
    setSelectedProjects(allVisibleIds);
  } else {
    setSelectedProjects([]);
  }
};

// Handles selecting/deselecting an individual project
const handleSelectProject = (projectId) => {
  if (selectedProjects.includes(projectId)) {
    setSelectedProjects(selectedProjects.filter((id) => id !== projectId));
  } else {
    setSelectedProjects([...selectedProjects, projectId]);
  }
};

// Handles input changes for the new project form fields
const handleInputChange = (e) => {
  const { name, value, type, checked } = e.target;
  setNewProject((prevState) => ({
    ...prevState,
    [name]: type === 'checkbox' ? checked : value,
  }));
};

// Handles input changes for the update project form fields
const handleUpdateInputChange = (e) => {
  const { name, value, type, checked } = e.target;
  setProjectToUpdate((prevState) => ({
    ...prevState,
    [name]: type === 'checkbox' ? checked : value,
  }));
};

// Adds a selected user with their role to the new project's user_roles list
const handleAddUserRole = () => {
  if (selectedUser && !newProject.user_roles.some(ur => ur.username === selectedUser)) {
    setNewProject(prevState => ({
      ...prevState,
      user_roles: [...prevState.user_roles, { username: selectedUser, role: selectedRole }],
    }));
    setSelectedUser(''); // Reset selected user after adding
    setSelectedRole('member'); // Reset selected role after adding
  } else if (selectedUser) {
    // Show alert if user is already added
    setShowAlertModal(true);
    setAlertMessage(`User '${selectedUser}' is already added to project roles.`);
  }
};

// Removes a user role from the new project's user_roles list
const handleRemoveUserRole = (username) => {
  setNewProject(prevState => ({
    ...prevState,
    user_roles: prevState.user_roles.filter(ur => ur.username !== username),
  }));
};

// Handles changes in the multi-select dropdown for groups
const handleGroupSelectChange = (event) => {
  const {
    target: { value },
  } = event;
  setSelectedGroups(
    // On autofill we get a stringified value.
    typeof value === 'string' ? value.split(',') : value,
  );
  setNewProject(prevState => ({
    ...prevState,
    group_names: typeof value === 'string' ? value.split(',') : value, // Update newProject state
  }));
};

  // Handles the creation of a new project
  const handleCreateProject = async (e) => {
    e.preventDefault();

    // Check for duplicate project name
    const existingProject = projects.find((project) => project.name === newProject.name);
    if (existingProject) {
      setShowAlertModal(true);
      setAlertMessage('A project with the same name already exists. Please choose a different name.');
      return;
    }

    // Construct the payload for the API call
    const payload = {
      project_name: newProject.name,
      description: newProject.description,
      enabled: newProject.enabled === 'true', // Convert string 'true'/'false' to boolean
      domain_id: newProject.Domain_id,
      domain_name: newProject.Domain_name,
      user_roles: newProject.user_roles, // Include assigned user roles
      group_names: newProject.group_names, // Include assigned group names
    };

    try {
      const response = await apiClient.post('/projects/create/', payload);
      if (response.status === 201 || response.status === 200) {
        setShowSuccessModal(true);
        setSuccessMessage('Project created successfully');
        setShowCreateForm(false); // Close the modal
        // Reset new project form fields and temporary selections
        setNewProject({
          Domain_id: 'default',
          Domain_name: 'default',
          name: '',
          description: '',
          enabled: 'true',
          user_roles: [],
          group_names: [],
        });
        setSelectedUser('');
        setSelectedRole('member');
        setSelectedGroups([]);
        fetchProjects(); // Refresh the project list
      } else {
        setShowAlertModal(true);
        setAlertMessage('Unexpected response. Please try again.');
      }
    } catch (error) {
      console.error('Error creating project:', error);
      setShowAlertModal(true);
      setAlertMessage('Error creating project. Please check the inputs and try again.');
    }
  };

  // Handles the update of an existing project
  const handleUpdateProject = async (e) => {
    e.preventDefault();

    if (!projectToUpdate) {
      setShowAlertModal(true);
      setAlertMessage('No project selected for update.');
      return;
    }

    // Validate for duplicate project name during update
    try {
      const projectsResponse = await apiClient.get('/openstack/projects/');
      const isDuplicate = projectsResponse.data.some(
        (project) =>
          project.name.toLowerCase() === projectToUpdate.name.toLowerCase() && project.id !== projectToUpdate.id
      );

      if (isDuplicate) {
        setShowAlertModal(true);
        setAlertMessage('A project with the same name already exists. Please use a different name.');
        return;
      }
    } catch (error) {
      setShowAlertModal(true);
      setAlertMessage('Error fetching projects for validation.');
      console.error(error);
      return;
    }

    // Construct the payload for the update API call
    const payload = {
      name: projectToUpdate.name,
      description: projectToUpdate.description,
      enabled: projectToUpdate.enabled === 'true',
    };

    try {
      const response = await apiClient.put(`/update-project/${projectToUpdate.id}/`, payload);
      if (response.status === 200) {
        setShowSuccessModal(true);
        setSuccessMessage('Project updated successfully');
        setShowUpdateForm(false); // Close the modal
        setProjectToUpdate(null); // Clear project to update
        fetchProjects(); // Refresh the project list
      } else {
        setShowAlertModal(true);
        setAlertMessage('Unexpected response. Please try again.');
      }
    } catch (error) {
      setShowAlertModal(true);
      setAlertMessage('Error updating project');
      console.error(error);
    }
  };

  // Handles deletion of multiple selected projects
  const handleDeleteSelectedProjects = async () => {
    if (selectedProjects.length === 0) {
      setShowAlertModal(true);
      setAlertMessage('No projects selected for deletion');
      return;
    }

    // Show confirmation modal before proceeding with deletion
    setShowConfirmModal(true);
    setConfirmMessage('Are you sure you want to delete the selected projects?');
    setConfirmAction(() => async () => { // Set the action to be performed on confirmation
      try {
        for (const projectId of selectedProjects) {
          await apiClient.delete(`/projects/delete/${projectId}/`);
        }

        setShowSuccessModal(true);
        setSuccessMessage('Selected projects deleted successfully');
        setSelectedProjects([]); // Clear selected projects
        fetchProjects(); // Refresh the project list
      } catch (error) {
        console.error('Error deleting selected projects:', error);
        setShowAlertModal(true);
        setAlertMessage('An error occurred while deleting selected projects.');
      } finally {
        setShowConfirmModal(false); // Close confirm modal after action
      }
    });
  };

  // Handles deletion of a single project
  const handleDeleteProject = async (projectId) => {
    // Show confirmation modal before proceeding with deletion
    setShowConfirmModal(true);
    setConfirmMessage('Are you sure you want to delete this project?');
    setConfirmAction(() => async () => { // Set the action to be performed on confirmation
      try {
        const response = await apiClient.delete(`/delete-project/${projectId}/`);
        if (response.status === 200) {
          setShowSuccessModal(true);
          setSuccessMessage('Project deleted successfully');
          fetchProjects(); // Refresh the project list
        } else {
          console.error('Unexpected response:', response);
          setShowAlertModal(true);
          setAlertMessage('Unexpected server response while deleting the project.');
        }
      } catch (error) {
        if (error.response) {
          console.error('Server error:', error.response);
          setShowAlertModal(true);
          setAlertMessage(`Failed to delete the project: ${error.response.data.message || 'Unknown error'}`);
        } else {
          console.error('Error:', error.message);
          setShowAlertModal(true);
          setAlertMessage('An error occurred while attempting to delete the project.');
        }
      } finally {
        setShowConfirmModal(false); // Close confirm modal after action
      }
    });
  };

  // Common style for modal dialogs
  const modalStyle = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 400,
    bgcolor: 'background.paper',
    boxShadow: 24,
    p: 4,
    borderRadius: '8px',
  };

  return (
    <div style={volumesContainerStyle}>
      <div style={headerContainerVolumesStyle}>
        <h1>Project Management</h1>
        <div style={searchContainerStyle}>
          <TextField
            type="text"
            label="Search projects..."
            value={searchTerm}
            onChange={handleSearchChange}
            variant="outlined"
          />
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="contained" style={{ backgroundColor: 'green', color: 'white' }} onClick={() => setShowCreateForm(true)}>
              Create Project <RiBallPenLine />
            </Button>
            <Button variant="contained" color="error" onClick={handleDeleteSelectedProjects}>
              Delete <RiDeleteBin6Line />
            </Button>
          </div>
        </div>
      </div>

      {/* Create New Project Modal */}
      <Modal open={showCreateForm} onClose={() => setShowCreateForm(false)}>
        <Box sx={modalStyle}>
          <Typography variant="h6" component="h2" gutterBottom>
            Create New Project
          </Typography>
          <form onSubmit={handleCreateProject}>
            <FormControl fullWidth margin="normal">
              <TextField label="Domain ID" name="Domain_id" value={newProject.Domain_id} disabled />
            </FormControl>
            <FormControl fullWidth margin="normal">
              <TextField label="Domain Name" name="Domain_name" value={newProject.Domain_name} disabled />
            </FormControl>
            <FormControl fullWidth margin="normal">
              <TextField label="Name" name="name" onChange={handleInputChange} value={newProject.name} required />
            </FormControl>
            <FormControl fullWidth margin="normal">
              <TextField label="Description" name="description" onChange={handleInputChange} value={newProject.description} required />
            </FormControl>
            <FormControl fullWidth margin="normal">
              <InputLabel id="enabled-label">Enabled</InputLabel>
              <Select labelId="enabled-label" id="enabled" name="enabled" value={newProject.enabled} onChange={handleInputChange} label="Enabled" required>
                <MenuItem value="true">Yes</MenuItem>
                <MenuItem value="false">No</MenuItem>
              </Select>
            </FormControl>

            {/* Assign Users Section (Optional) */}
            <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>Assign Users (Optional)</Typography>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <FormControl sx={{ flexGrow: 1 }}>
                <InputLabel id="select-user-label">Select User</InputLabel>
                <Select
                  labelId="select-user-label"
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  label="Select User"
                >
                  <MenuItem value=""><em>None</em></MenuItem>
                  {users.length > 0 ? (
                    users.map((user) => {
                      return (
                        <MenuItem key={user.id} value={user.name}>
                          {user.name}
                        </MenuItem>
                      );
                    })
                  ) : (
                    <MenuItem disabled>
                      <em>No users available</em>
                    </MenuItem>
                  )}
                </Select>
              </FormControl>
              <FormControl sx={{ width: '120px' }}>
                <InputLabel id="select-role-label">Role</InputLabel>
                <Select
                  labelId="select-role-label"
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  label="Role"
                >
                  <MenuItem value="member">Member</MenuItem>
                  <MenuItem value="admin">Admin</MenuItem>
                </Select>
              </FormControl>
              <Button variant="contained" onClick={handleAddUserRole}>Add</Button>
            </Box>
            <Box sx={{ mt: 1 }}>
              {newProject.user_roles.map((ur, index) => (
                <Box key={index} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 0.5, border: '1px solid #ccc', borderRadius: '4px', mb: 0.5 }}>
                  <Typography>{ur.username} ({ur.role})</Typography>
                  <Button size="small" color="error" onClick={() => handleRemoveUserRole(ur.username)}>Remove</Button>
                </Box>
              ))}
            </Box>

            {/* Assign Groups Section (Optional) */}
            <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>Assign Groups (Optional)</Typography>
            <FormControl fullWidth margin="normal">
              <InputLabel id="select-groups-label">Select Groups</InputLabel>
              <Select
                labelId="select-groups-label"
                multiple
                value={selectedGroups}
                onChange={handleGroupSelectChange}
                input={<OutlinedInput label="Select Groups" />}
                renderValue={(selected) => selected.join(', ')}
              >
                {groups.map((group) => (
                  <MenuItem key={group.id} value={group.name}>
                    <Checkbox checked={selectedGroups.indexOf(group.name) > -1} />
                    <ListItemText primary={group.name} />
                  </MenuItem>
                ))}
              </Select>
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

      {/* Update Project Modal */}
      <Modal open={showUpdateForm} onClose={() => setShowUpdateForm(false)}>
        <Box sx={modalStyle}>
          <Typography variant="h6" component="h2" gutterBottom>
            Update Project
          </Typography>
          <form onSubmit={handleUpdateProject}>
            <FormControl fullWidth margin="normal">
              <TextField label="Project Name" name="name" onChange={handleUpdateInputChange} value={projectToUpdate?.name} required />
            </FormControl>
            <FormControl fullWidth margin="normal">
              <TextField label="Description" name="description" onChange={handleUpdateInputChange} value={projectToUpdate?.description} required />
            </FormControl>
            <FormControl fullWidth margin="normal">
              <InputLabel id="update-enabled-label">Enabled</InputLabel>
              <Select labelId="update-enabled-label" id="update-enabled" value={projectToUpdate?.enabled} onChange={(e) => setProjectToUpdate({ ...projectToUpdate, enabled: e.target.value })} label="Enabled">
                <MenuItem value="true">Yes</MenuItem>
                <MenuItem value="false">No</MenuItem>
              </Select>
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

      {/* Main Project Table */}
      <TableContainer component={Paper}>
        <Table style={volumesTableStyle}>
          <TableHead>
            <TableRow>
            <StyledTableCell padding="checkbox">
                <input
                  type="checkbox"
                  onChange={handleSelectAll}
                  checked={filteredProjects.length > 0 &&
                    filteredProjects.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).every(project => selectedProjects.includes(project.id))}
                />
              </StyledTableCell>
              <StyledTableCell>Sr. No. </StyledTableCell>
              <StyledTableCell>Project Name</StyledTableCell>
              <StyledTableCell>Description</StyledTableCell>
              <StyledTableCell>Project Id</StyledTableCell>
              <StyledTableCell>Enabled</StyledTableCell>
              <StyledTableCell>Actions</StyledTableCell>
            </TableRow>
          </TableHead>
          <TableBody>
          {filteredProjects
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((project,index) => (
                <StyledTableRow key={project.id}>
                  <StyledTableCell padding="checkbox">
                    <input
                      type="checkbox"
                      checked={selectedProjects.includes(project.id)}
                      onChange={() => handleSelectProject(project.id)}
                    />
                  </StyledTableCell>
                  <StyledTableCell>{page * rowsPerPage + index + 1}</StyledTableCell>
          
                <StyledTableCell>
                  <Tooltip title={project.name}>
                    <span>{project.name}</span>
                  </Tooltip>
                </StyledTableCell>
                <StyledTableCell>
                  <Tooltip title={project.description}>
                    <span>{project.description}</span>
                  </Tooltip>
                </StyledTableCell>
                <StyledTableCell>
                  <Tooltip title={project.id}>
                    <span>{project.id}</span>
                  </Tooltip>
                </StyledTableCell>
                <StyledTableCell>
                  <Tooltip title={project.enabled ? 'Yes' : 'No'}>
                    <span>{project.enabled ? 'Yes' : 'No'}</span>
                  </Tooltip>
                </StyledTableCell>
                <StyledTableCell>
                  <Box display="flex" justifyContent="center" gap={1}>
                    <Button variant="outlined" color="#253848" onClick={() => { setProjectToUpdate(project); setShowUpdateForm(true); }}>
                      Update
                    </Button>
                    <Button variant="outlined" color="error" onClick={() => handleDeleteProject(project.id)}>
                      Delete
                    </Button>
                  </Box>
                </StyledTableCell>
              </StyledTableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Table Pagination */}
      <TablePagination
        rowsPerPageOptions={[5, 7, 10]}
        component="div"
        count={filteredProjects.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />

      {/* Custom Alert Modal */}
      <Modal open={showAlertModal} onClose={() => setShowAlertModal(false)}>
        <Box sx={modalStyle}>
          <Typography variant="h6" component="h2" gutterBottom>
            Alert
          </Typography>
          <Typography sx={{ mt: 2 }}>{alertMessage}</Typography>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
            <Button onClick={() => setShowAlertModal(false)} variant="contained">
              OK
            </Button>
          </Box>
        </Box>
      </Modal>

      {/* Custom Success Modal */}
      <Modal open={showSuccessModal} onClose={() => setShowSuccessModal(false)}>
        <Box sx={modalStyle}>
          <Typography variant="h6" component="h2" gutterBottom>
            Success!
          </Typography>
          <Typography sx={{ mt: 2 }}>{successMessage}</Typography>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
            <Button onClick={() => setShowSuccessModal(false)} variant="contained" color="success">
              OK
            </Button>
          </Box>
        </Box>
      </Modal>

      {/* Custom Confirmation Modal */}
      <Modal open={showConfirmModal} onClose={() => setShowConfirmModal(false)}>
        <Box sx={modalStyle}>
          <Typography variant="h6" component="h2" gutterBottom>
            Confirm Action
          </Typography>
          <Typography sx={{ mt: 2 }}>{confirmMessage}</Typography>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
            <Button onClick={() => { if (confirmAction) confirmAction(); }} variant="contained" color="error" sx={{ mr: 1 }}>
              Confirm
            </Button>
            <Button onClick={() => setShowConfirmModal(false)} variant="outlined">
              Cancel
            </Button>
          </Box>
        </Box>
      </Modal>
    </div>
  );
};

// Inline CSS Styles for the main container and header
const volumesContainerStyle = { padding: '20px', fontFamily: 'sans-serif' };
const headerContainerVolumesStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '20px',
};
const searchContainerStyle = { display: 'flex', gap: '10px', alignItems: 'center' };
const volumesTableStyle = { width: '100%', borderCollapse: 'collapse', marginTop: '20px' };

export default Projects;
