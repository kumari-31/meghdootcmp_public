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
  Checkbox,
  FormControlLabel,
  Snackbar,
  Alert,
  Slide,
  TablePagination, // Import TablePagination
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { useTheme } from "@mui/material/styles";
import { tableCellClasses } from '@mui/material/TableCell';
import { CheckCircleOutline, ErrorOutline, InfoOutlined, WarningOutlined } from '@mui/icons-material';

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



const Users = () => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0); // Current page, 0-based index
  const [rowsPerPage, setRowsPerPage] = useState(5); // Users per page
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const [newUser, setNewUser] = useState({
    domain_id: 'default',
    domain_name: 'default',
    username: '',
    description: '',
    email: '',
    password: '',
    confirm_password: '',
    default_project_id: '',
    role: '',
    enabled: false,
  });
  const [userToUpdate, setUserToUpdate] = useState(null);
  const [projects, setProjects] = useState([]);
  const [availableRoles, setAvailableRoles] = useState([]);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');
    const theme = useTheme();

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

  const fetchUsers = async () => {
    setError(null);
    try {
      const response = await apiClient.get('/users/');
      if (response.data && Array.isArray(response.data)) {
        setUsers(response.data);
        setFilteredUsers(response.data);
      } else if (response.data && response.data.users && Array.isArray(response.data.users)) {
        setUsers(response.data.users);
        setFilteredUsers(response.data.users);
      } else {
        setUsers([]);
        setFilteredUsers([]);
        console.error('Unexpected data format from API:', response.data);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await apiClient.get('/openstack/projects/');
      setProjects(response.data);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const fetchRoles = async () => {
    try {
      const response = await apiClient.get('/roles/');
      setAvailableRoles(response.data);
    } catch (error) {
      console.error('Error fetching roles:', error);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchProjects();
    fetchRoles();
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
    const filtered = users.filter((user) =>
      Object.values(user).some((value) => value.toString().toLowerCase().includes(e.target.value.toLowerCase()))
    );
    setFilteredUsers(filtered);
    setPage(0); // Reset page on search
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0); // Reset page when rows per page changes
  };

  const emptyRows =
    rowsPerPage - Math.min(rowsPerPage, filteredUsers.length - page * rowsPerPage);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const startIndex = page * rowsPerPage;
      const endIndex = Math.min(startIndex + rowsPerPage, filteredUsers.length);
      const currentPageUsers = filteredUsers.slice(startIndex, endIndex);
      const allIdsOnPage = currentPageUsers.map((user) => user.id);
      setSelectedUsers((prevSelected) => [...prevSelected, ...allIdsOnPage.filter(id => !prevSelected.includes(id))]);
    } else {
      const startIndex = page * rowsPerPage;
      const endIndex = Math.min(startIndex + rowsPerPage, filteredUsers.length);
      const currentPageUsers = filteredUsers.slice(startIndex, endIndex);
      const idsToRemove = currentPageUsers.map((user) => user.id);
      setSelectedUsers((prevSelected) => prevSelected.filter(id => !idsToRemove.includes(id)));
    }
  };

  const isAllSelected = () => {
    const startIndex = page * rowsPerPage;
    const endIndex = Math.min(startIndex + rowsPerPage, filteredUsers.length);
    const currentPageUsers = filteredUsers.slice(startIndex, endIndex);
    return currentPageUsers.every(user => selectedUsers.includes(user.id)) && currentPageUsers.length > 0;
  };

  const handleSelectUser = (userId) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(selectedUsers.filter((id) => id !== userId));
    } else {
      setSelectedUsers([...selectedUsers, userId]);
    }
  };

  const handleUserInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNewUser((prevState) => ({
      ...prevState,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleUpdateUserInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setUserToUpdate((prevState) => ({
      ...prevState,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!Array.isArray(users)) {
      console.error('Users data is not an array. Cannot perform check.');
      showSnackbar('An error occurred. Please try again later.', 'error');
      return;
    }

    const existingUser = users.find((user) => user.username && user.username.toLowerCase() === newUser.username.toLowerCase());

    if (existingUser) {
      showSnackbar('A user with the same username already exists.', 'error');
      return;
    }

    const payload = {
      username: newUser.username,
      description: newUser.description,
      email: newUser.email,
      password: newUser.password,
      confirm_password: newUser.confirm_password,
      role: newUser.role,
      project_id: newUser.default_project_id,
      enabled: newUser.enabled || false,
    };

    try {
      const response = await apiClient.post('/users/create/', payload);
      if (response.status === 201 || response.status === 200) {
        showSnackbar('User created successfully', 'success');
        setNewUser({
          domain_id: 'default',
          domain_name: 'default',
          username: '',
          description: '',
          email: '',
          password: '',
          confirm_password: '',
          role: '',
          default_project_id: '',
          enabled: false,
        });
        fetchUsers();
        setShowCreateForm(false);
      } else {
        console.error('Unexpected response:', response);
        showSnackbar('Unexpected response from the server. Please try again.', 'error');
      }
    } catch (error) {
      console.error('Error creating user:', error);
      if (error.response) {
        console.error('Server Response:', error.response.data);
        showSnackbar(`Error creating user: ${error.response.data?.message || JSON.stringify(error.response.data) || 'Unknown error'}`, 'error');
      } else {
        showSnackbar('Error creating user. Please check the inputs and try again.', 'error');
      }
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!userToUpdate?.id) {
      showSnackbar('Please select a user to update.', 'warning');
      return;
    }
    const payload = {
      name: userToUpdate.name,
      email: userToUpdate.email,
      enabled: userToUpdate.enabled || false,
      description: userToUpdate.description,
      role: userToUpdate.role,
      project_id: userToUpdate.default_project_id,
    };

    try {
      const response = await apiClient.patch(`/update-users/${userToUpdate.id}/`, payload);
      if (response.status === 200) {
        showSnackbar('User updated successfully', 'success');
        fetchUsers();
        setShowUpdateForm(false);
        setUserToUpdate(null);
      }
    } catch (error) {
      console.error('Error updating user:', error);
      if (error.response) {
        console.error('Server Response:', error.response.data);
        showSnackbar(`Update failed: ${error.response.data.message || 'Unknown error'}`, 'error');
      } else if (error.request) {
        console.error('No Response:', error.request);
        showSnackbar('No response from the server.', 'error');
      } else {
        console.error('Error:', error.message);
        showSnackbar('An error occurred during the update.', 'error');
      }
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!userId) {
      console.error('Invalid user ID:', userId);
      showSnackbar('Invalid user ID. Unable to delete.', 'error');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this user?')) {
      return;
    }

    try {
      const response = await apiClient.delete(`/delete-users/${userId}/`);

      if (response.status === 200 || response.status === 204) {
        showSnackbar('User deleted successfully', 'success');
        fetchUsers();
      } else {
        console.error('Unexpected response:', response);
        showSnackbar(`Server responded with status ${response.status}: ${response.data?.message || 'Unknown error'}`, 'error');
      }
    } catch (error) {
      console.error('Error deleting user:', error);

      if (error.response) {
        console.error('Server error:', error.response);
        showSnackbar(`Failed to delete the user: ${error.response.data?.message || 'Unknown error (check console)'}`, 'error');
      } else if (error.request) {
        console.error('No Response:', error.request);
        showSnackbar('No response from the server. Please check your network connection.', 'error');
      } else {
        console.error('Error:', error.message);
        showSnackbar('An error occurred while attempting to delete the user.', 'error');
      }
    }
  };

  const handleOpenUpdateModal = (user) => {
    setUserToUpdate({ ...user });
    setShowUpdateForm(true);
  };

  const getAlertIcon = (severity) => {
    switch (severity) {
      case 'success':
        return <CheckCircleOutline sx={{ mr: 1 }} />;
      case 'error':
        return <ErrorOutline sx={{ mr: 1 }} />;
      case 'warning':
        return <InfoOutlined sx={{ mr: 1 }} />;
      default:
        return <InfoOutlined sx={{ mr: 1 }} />;
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
        <h1>User Management</h1>
        <div style={searchContainerStyle}>
          <TextField
            type="text"
            label="Search users..."
            value={searchTerm}
            onChange={handleSearchChange}
            variant="outlined"
          />
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="contained" sx={{
                backgroundColor: theme.palette.mode === "light" ? "#2e7d32" : "#388e3c",
                color: "#fff",
                "&:hover": {
                  backgroundColor: theme.palette.mode === "light" ? "#1b5e20" : "#2e7d32",
                }
              }}  onClick={() => setShowCreateForm(true)}>
              Create User <RiBallPenLine />
            </Button>
            <Button variant="contained" color="error" onClick={() => {
              if (selectedUsers.length > 0 && window.confirm('Are you sure you want to delete selected users?')) {
                selectedUsers.forEach(handleDeleteUser);
              } else if (selectedUsers.length === 0) {
                showSnackbar('No users selected for deletion.', 'warning');
              }
            }}>
              Delete <RiDeleteBin6Line />
            </Button>
          </div>
        </div>
      </div>

      <Modal open={showCreateForm} onClose={() =>setShowCreateForm(false)}>
        <Box sx={modalStyle}>
          <Typography variant="h6" component="h2" gutterBottom>
            Create New User
          </Typography>
          <form onSubmit={handleCreateUser}>
            <FormControl fullWidth margin="normal">
              <TextField label="Domain ID" name="domain_id" value={newUser.domain_id} disabled />
            </FormControl>
            <FormControl fullWidth margin="normal">
              <TextField label="Domain Name" name="domain_name" value={newUser.domain_name} disabled />
            </FormControl>
            <FormControl fullWidth margin="normal">
              <TextField label="User Name" name="username" value={newUser.username} onChange={handleUserInputChange} required />
            </FormControl>
            <FormControl fullWidth margin="normal">
              <TextField label="Description" name="description" value={newUser.description} onChange={handleUserInputChange} />
            </FormControl>
            <FormControl fullWidth margin="normal">
              <TextField label="Email" name="email" value={newUser.email} onChange={handleUserInputChange} required />
            </FormControl>
            <FormControl fullWidth margin="normal">
              <TextField label="Password" name="password" type="password" value={newUser.password} onChange={handleUserInputChange} required />
            </FormControl>
            <FormControl fullWidth margin="normal">
              <TextField label="Confirm Password" name="confirm_password" type="password" value={newUser.confirm_password} onChange={handleUserInputChange} required />
            </FormControl>
            <FormControl fullWidth margin="normal">
              <InputLabel id="project-label">Project</InputLabel>
              <Select
                labelId="project-label"
                id="project"
                name="default_project_id"
                value={newUser.default_project_id}
                onChange={handleUserInputChange}
                label="Project"
                required
              >
                <MenuItem value="">Select project</MenuItem>
                {projects.map((project) => (
                  <MenuItem key={project.id} value={project.id}>
                    {project.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth margin="normal">
              <InputLabel id="role-label">Role</InputLabel>
              <Select
                labelId="role-label"
                id="role"
                name="role"
                value={newUser.role}
                onChange={handleUserInputChange}
                label="Role"
                required
              >
                <MenuItem value="">Select role</MenuItem>
                {availableRoles.map((role) => (
                  <MenuItem key={role.id} value={role.name}> {/* Assuming your role object has 'id' and 'name' */}
                    {role.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth margin="normal">
              <FormControlLabel
                control={<Checkbox checked={newUser.enabled} onChange={(e) => setNewUser({ ...newUser, enabled: e.target.checked })} name="enabled" />}
                label="Enable Status"
              />
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
            Update User
          </Typography>
          <form onSubmit={handleUpdateUser}>
            <FormControl fullWidth margin="normal">
              <TextField label="User Name" name="name" value={userToUpdate?.name} onChange={handleUpdateUserInputChange} required />
            </FormControl>
            <FormControl fullWidth margin="normal">
              <TextField label="Email" name="email" value={userToUpdate?.email} onChange={handleUpdateUserInputChange} required />
            </FormControl>
            <FormControl fullWidth margin="normal">
              <TextField label="Description" name="description" value={userToUpdate?.description} onChange={handleUpdateUserInputChange} />
            </FormControl>
            <FormControl fullWidth margin="normal">
              <InputLabel id="update-role-label">Role</InputLabel>
              <Select
                labelId="update-role-label"
                id="role"
                name="role"
                value={userToUpdate?.role}
                onChange={handleUpdateUserInputChange}
                label="Role"
                required
              >
                <MenuItem value="">Select role</MenuItem>
                {availableRoles.map((role) => (
                  <MenuItem key={role.id} value={role.name}>
                    {role.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth margin="normal">
              <InputLabel id="update-project-label">Project</InputLabel>
              <Select
                labelId="update-project-label"
                id="default_project_id"
                name="default_project_id"
                value={userToUpdate?.default_project_id}
                onChange={handleUpdateUserInputChange}
                label="Project"
                required
              >
                <MenuItem value="">Select project</MenuItem>
                {projects.map((project) => (
                  <MenuItem key={project.id} value={project.id}>
                    {project.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth margin="normal">
              <FormControlLabel
                control={<Checkbox checked={userToUpdate?.enabled} onChange={handleUpdateUserInputChange} name="enabled" />}
                label="Enable Status"
              />
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

      <TableContainer
  component={Paper}
  sx={(theme) => ({
    width: "fit-content",
    minWidth: "75%",
    maxWidth: "100%",
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",

    backgroundColor: theme.palette.background.paper,
    boxShadow: theme.shadows[3],
  })}
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
                <Checkbox
                  color="primary"
                  indeterminate={selectedUsers.length > 0 && selectedUsers.length < filteredUsers.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).length}
                  checked={isAllSelected()}
                  onChange={handleSelectAll}
                />
              </StyledTableCell>
              <StyledTableCell>Sr. No.</StyledTableCell> {/* Sr. No. data is now after the checkbox data */}
              <StyledTableCell>User Name</StyledTableCell>
              <StyledTableCell>User Id</StyledTableCell>
              <StyledTableCell>Enabled</StyledTableCell>
              <StyledTableCell>Domain Name</StyledTableCell>
              <StyledTableCell>Project</StyledTableCell>
              <StyledTableCell>Actions</StyledTableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredUsers
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((user,index) => (
                <StyledTableRow key={user.id}>
                  <StyledTableCell padding="checkbox">
                    <Checkbox
                      color="primary"
                      checked={selectedUsers.includes(user.id)}
                      onChange={() => handleSelectUser(user.id)}
                    />
                  </StyledTableCell>
                  <StyledTableCell>{page * rowsPerPage + index + 1}</StyledTableCell> {/* Sr. No. data is now after the checkbox data */}
          
                  <StyledTableCell>
                    <Tooltip title={user.name}>
                      <span>{user.name}</span>
                    </Tooltip>
                  </StyledTableCell>
                  <StyledTableCell>
                    <Tooltip title={user.id}>
                      <span>{user.id}</span>
                    </Tooltip>
                  </StyledTableCell>
                  <StyledTableCell>
                    <Tooltip title={user.enabled ? 'Yes' : 'No'}>
                      <span>{user.enabled ? 'Yes' : 'No'}</span>
                    </Tooltip>
                  </StyledTableCell>
                  <StyledTableCell>
                    <Tooltip title={user.domain_id}>
                      <span>{user.domain_id}</span>
                    </Tooltip>
                  </StyledTableCell>
                  <StyledTableCell>
                    <Tooltip title={user.default_project_id}>
                      <span>{user.default_project_id}</span>
                    </Tooltip>
                  </StyledTableCell>
                  <StyledTableCell>
                    <Box display="flex" justifyContent="center" gap={1}>
                      <Button variant="outlined" color="#253848" onClick={() => handleOpenUpdateModal(user)}>
                        Update
                      </Button>
                      <Button variant="outlined" color="error" onClick={() => handleDeleteUser(user.id)}>
                        Delete
                      </Button>
                    </Box>
                  </StyledTableCell>
                </StyledTableRow>
              ))}
            {emptyRows > 0 && (
              <TableRow style={{ height: 53 * emptyRows }}>
                <TableCell colSpan={7} />
              </TableRow>
            )}
          </TableBody>
        </Table>
        
        {/* ⬇️ PAGINATION INSIDE TABLE CONTAINER */}
        <Box sx={{ width: "100%", display: "flex", justifyContent: "center" }}>
          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={filteredUsers.length}
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

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        TransitionComponent={Slide}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: '100%', display: 'flex', alignItems: 'center' }}>
          {getAlertIcon(snackbarSeverity)}
          {snackbarMessage}
        </Alert>
      </Snackbar>
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

const getAlertIcon = (severity) => {
  switch (severity) {
    case 'success':
      return <CheckCircleOutline sx={{ mr: 1 }} />;
    case 'error':
      return <ErrorOutline sx={{ mr: 1 }} />;
    case 'warning':
      return <InfoOutlined sx={{ mr: 1 }} />;
    default:
      return <InfoOutlined sx={{ mr: 1 }} />;
  }
};

export default Users;