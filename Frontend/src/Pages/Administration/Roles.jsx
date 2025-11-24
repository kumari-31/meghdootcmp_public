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
  Box,
  Modal,
  FormControl,
  Snackbar,
  Alert,
  Slide,
  TablePagination, // Import TablePagination
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { tableCellClasses } from '@mui/material/TableCell';
import { CheckCircleOutline, ErrorOutline, InfoOutlined, WarningOutlined } from '@mui/icons-material';

const StyledTableCell = styled(TableCell)(({ theme }) => ({
  [`&.${tableCellClasses.head}`]: {
    backgroundColor: '#253848',
    color: theme.palette.common.white,
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
    maxWidth: '200px',
  },
}));

const StyledTableRow = styled(TableRow)(({ theme }) => ({
  backgroundColor: theme.palette.grey[100],
  '&:nth-of-type(odd)': {
    backgroundColor: theme.palette.grey[300],
  },
  '&:last-child td, &:last-child th': {
    border: 0,
  },
}));

const Roles = () => {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0); // Current page
  const [rowsPerPage, setRowsPerPage] = useState(5); // Rows per page
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const [roleToUpdate, setRoleToUpdate] = useState(null);
  const [newRole, setNewRole] = useState({
    name: '',
  });

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

  const fetchRoles = async () => {
    setError(null);
    try {
      const response = await apiClient.get('/roles/');
      setRoles(response.data);
    } catch (error) {
      console.error('Error fetching roles:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
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
    const filtered = roles.filter((role) =>
      Object.values(role)
        .some((value) =>
          value.toString().toLowerCase().includes(e.target.value.toLowerCase())
        )
    );
    setRoles(filtered);
    setPage(0); // Reset page on search
  };

  const handleChangePage = (_, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0); // Reset page on rows per page change
  };

  const currentRoles = roles.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const allIds = currentRoles.map((role) => role.id);
      setSelectedRoles(allIds);
    } else {
      setSelectedRoles([]);
    }
  };

  const handleSelectRole = (roleId) => {
    if (selectedRoles.includes(roleId)) {
      setSelectedRoles(selectedRoles.filter((id) => id !== roleId));
    } else {
      setSelectedRoles([...selectedRoles, roleId]);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewRole((prevState) => ({
      ...prevState,
      [name]: value,
    }));
  };

  const handleUpdateInputChange = (e) => {
    const { name, value } = e.target;
    setRoleToUpdate((prevState) => ({
      ...prevState,
      [name]: value,
    }));
  };


  const handleCreateRole = async (e) => {
    e.preventDefault();

    const existingRole = roles.find((role) => role.name === newRole.name);

    if (existingRole) {
      showSnackbar('A role with the same name already exists. Please choose a different name.', 'error');
      return;
    }

    try {
      const response = await apiClient.post('/create-roles/', newRole);
      if (response.status === 201 || response.status === 200) {
        showSnackbar('Role created successfully', 'success');
        setShowCreateForm(false);
        setNewRole({ name: '' });
        fetchRoles();
      } else {
        showSnackbar('Unexpected response. Please try again.', 'error');
      }
    } catch (error) {
      console.error('Error creating role:', error);
      showSnackbar('Error creating role. Please check the inputs and try again.', 'error');
    }
  };

  const handleUpdateRole = async (e) => {
    e.preventDefault();

    if (!roleToUpdate) {
      showSnackbar('No role selected for update.', 'error');
      return;
    }

    try {
      const response = await apiClient.put(`/edit-roles/${roleToUpdate.id}/`, roleToUpdate);
      if (response.status === 200) {
        showSnackbar('Role updated successfully', 'success');
        setShowUpdateForm(false);
        setRoleToUpdate(null);
        fetchRoles();
      } else {
        showSnackbar('Unexpected response. Please try again.', 'error');
      }
    } catch (error) {
      showSnackbar('Error updating role', 'error');
      console.error(error);
    }
  };

  const handleDeleteSelectedRoles = async () => {
    if (selectedRoles.length === 0) {
      showSnackbar('No roles selected for deletion', 'error');
      return;
    }

    if (!window.confirm('Are you sure you want to delete the selected roles?')) {
      return;
    }

    try {
      for (const roleId of selectedRoles) {
        const response = await apiClient.delete(`/roles/${roleId}/`);
        if (response.status === 204 || response.status === 200) {
        } else {
          showSnackbar('Error during delete, check console.', 'error');
          console.error('Unexpected response during delete', response);
        }
      }

      showSnackbar('Selected roles deleted successfully', 'success');
      setSelectedRoles([]);
      fetchRoles();
    } catch (error) {
      console.error('Error deleting selected roles:', error);
      showSnackbar('An error occurred while deleting selected roles.', 'error');
    }
  };

  const handleDeleteRole = async (roleId) => {
    if (!window.confirm('Are you sure you want to delete this role?')) {
      return;
    }

    try {
      const response = await apiClient.delete(`/roles/${roleId}/`);
      if (response.status === 200 || response.status === 204) {
        showSnackbar('Role deleted successfully', 'success');
        fetchRoles();
      } else {
        console.error('Unexpected response:', response);
        showSnackbar('Unexpected server response while deleting the role.', 'error');
      }
    } catch (error) {
      if (error.response) {
        console.error('Server error:', error.response);
        showSnackbar(`Failed to delete the role: ${error.response.data.message || 'Unknown error'}`, 'error');
      } else {
        console.error('Error:', error.message);
        showSnackbar('An error occurred while attempting to delete the role.', 'error');
      }
    }
  };

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
        return <CheckCircleOutline style={{ marginRight: '8px' }} />;
      case 'error':
        return <ErrorOutline style={{ marginRight: '8px' }} />;
      case 'warning':
        return <WarningOutlined style={{ marginRight: '8px' }} />;
      default:
        return <InfoOutlined style={{ marginRight: '8px' }} />;
    }
  };

  return (
    <div style={volumesContainerStyle}>
      <div style={headerContainerVolumesStyle}>
        <h1>Role Management</h1>
        <div style={searchContainerStyle}>
          <TextField
            type="text"
            label="Search roles..."
            value={searchTerm}
            onChange={handleSearchChange}
            variant="outlined"
          />
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="contained" style={{ backgroundColor: 'green', color: 'white' }} onClick={() => setShowCreateForm(true)}>
              Create Role <RiBallPenLine />
            </Button>
            <Button variant="contained" color="error" onClick={handleDeleteSelectedRoles}>
              Delete <RiDeleteBin6Line />
            </Button>
          </div>
        </div>
      </div>

      <Modal open={showCreateForm} onClose={() => setShowCreateForm(false)}>
        <Box sx={modalStyle}>
          <h2>Create New Role</h2>
          <form onSubmit={handleCreateRole}>
            <FormControl fullWidth margin="normal">
              <TextField label="Name" name="name" placeholder="Name" onChange={handleInputChange} value={newRole.name} required />
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
          <h2>Update Role</h2>
          <form onSubmit={handleUpdateRole}>
            <FormControl fullWidth margin="normal">
              <TextField label="Role Name" name="name" onChange={handleUpdateInputChange} value={roleToUpdate?.name} required />
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

      <TableContainer component={Paper}>
        <Table style={volumesTableStyle}>
          <TableHead>
            <TableRow>
            <StyledTableCell>
                <input
                  type="checkbox"
                  onChange={handleSelectAll}
                  checked={roles.length > 0 && currentRoles.every(role => selectedRoles.includes(role.id))}
                />
              </StyledTableCell>
              <StyledTableCell>Sr. No.</StyledTableCell>
              <StyledTableCell>Role Name</StyledTableCell>
              <StyledTableCell>Role Id</StyledTableCell>
              <StyledTableCell>Actions</StyledTableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {currentRoles.map((role,index) => (
              <StyledTableRow key={role.id}>
                <StyledTableCell>
                  <input
                    type="checkbox"
                    checked={selectedRoles.includes(role.id)}
                    onChange={() => handleSelectRole(role.id)}
                  />
                </StyledTableCell>
                <StyledTableCell>{page * rowsPerPage + index + 1}</StyledTableCell> {/* Sr. No. data is now after the checkbox data */}
          
                <StyledTableCell>{role.name}</StyledTableCell>
                <StyledTableCell>{role.id}</StyledTableCell>
                <StyledTableCell>
                  <Box display="flex" justifyContent="center" gap={1}>
                    <Button variant="outlined" color="#253848" onClick={() => { setRoleToUpdate(role); setShowUpdateForm(true); }}>
                      Update
                    </Button>
                    <Button variant="outlined" color="error" onClick={() => handleDeleteRole(role.id)}>
                      Delete
                    </Button>
                  </Box>
                </StyledTableCell>
              </StyledTableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        rowsPerPageOptions={[5, 7, 10]}
        component="div"
        count={roles.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        TransitionComponent={Slide}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity={snackbarSeverity}
          sx={{ width: '100%', display: 'flex', alignItems: 'center' }}
        >
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
export default Roles;