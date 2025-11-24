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
  Select,
  MenuItem,
  Snackbar,
  Alert,
  TablePagination,
  Typography // Added for modal title
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { tableCellClasses } from '@mui/material/TableCell';
import { useNavigate } from 'react-router-dom'; // Import useNavigate

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

const Groups = () => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0); // Current page
  const [rowsPerPage, setRowsPerPage] = useState(5); // Rows per page
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const [groupToUpdate, setGroupToUpdate] = useState(null);
  const [newGroup, setNewGroup] = useState({ name: '', description: '', members: [] });
  const [users, setUsers] = useState([]);
  const [newMember, setNewMember] = useState({ user: '' });
  const navigate = useNavigate(); // Initialize useNavigate
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');

  // State for custom confirmation modal
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [confirmMessage, setConfirmMessage] = useState('');

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

  // Function to open the custom confirmation modal
  const openConfirmModal = (message, action) => {
    setConfirmMessage(message);
    setConfirmAction(() => action); // Store the action to be executed
    setConfirmModalOpen(true);
  };

  // Function to close the custom confirmation modal
  const handleConfirmModalClose = () => {
    setConfirmModalOpen(false);
    setConfirmAction(null);
  };

  // Function to execute the confirmed action
  const handleConfirmExecute = () => {
    if (confirmAction) {
      confirmAction();
    }
    handleConfirmModalClose();
  };

  const fetchGroups = async () => {
    setError(null);
    try {
      const response = await apiClient.get('/list-group/');
      setGroups(response.data);
      
    } catch (error) {
      console.error('Error fetching groups:', error);
      setError('Failed to load groups. Please check your network connection or server status.');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await apiClient.get('/users/');
      setUsers(response.data.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  useEffect(() => {
    fetchGroups();
    fetchUsers();
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
        <h2>❌ {error}</h2>
      </div>
    );
  }
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setPage(0); // Reset page on search
  };

  const filteredGroups = groups.filter((group) =>
    Object.values(group).some((value) =>
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
      const currentVisibleGroups = filteredGroups.slice(
        page * rowsPerPage,
        page * rowsPerPage + rowsPerPage
      );
      const allVisibleIds = currentVisibleGroups.map((group) => group.id);
      setSelectedGroups(allVisibleIds);
    } else {
      setSelectedGroups([]);
    }
  };

  const handleSelectGroup = (groupId) => {
    if (selectedGroups.includes(groupId)) {
      setSelectedGroups(selectedGroups.filter((id) => id !== groupId));
    } else {
      setSelectedGroups([...selectedGroups, groupId]);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewGroup((prevState) => ({
      ...prevState,
      [name]: value,
    }));
  };

  const handleUpdateInputChange = (e) => {
    const { name, value } = e.target;
    setGroupToUpdate((prevState) => ({
      ...prevState,
      [name]: value,
    }));
  };

  const handleNewMemberChange = (e) => {
    setNewMember({ user: e.target.value });
  };

  const handleAddMember = () => {
    if (newMember.user) {
      const userToAdd = users.find((user) => user.id === newMember.user);
      if (userToAdd) {
        setNewGroup((prevState) => ({
          ...prevState,
          members: [...prevState.members, userToAdd.id],
        }));
      }
      setNewMember({ user: '' });
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();

    const existingGroup = groups.find((group) => group.name.trim() === newGroup.name.trim());

    if (existingGroup) {
      showSnackbar('A group with the same name already exists.', 'error');
      return;
    }

    const payload = {
      group_name: newGroup.name.trim(),
      description: newGroup.description,
      member_ids: newGroup.members,
    };

    if (payload.member_ids.length === 0) {
      delete payload.member_ids;
    }

    try {
      const response = await apiClient.post('/create-group-with-members/', payload);
      if (response.status === 201 || response.status === 200) {
        showSnackbar('Group created successfully', 'success');
        setShowCreateForm(false);
        setNewGroup({ name: '', description: '', members: [] });
        fetchGroups();
      } else {
        showSnackbar('Unexpected response. Please try again.', 'error');
      }
    } catch (error) {
      console.error('Error creating group:', error);
      showSnackbar('Error creating group. Please check the inputs and try again.', 'error');
    }
  };

  const handleUpdateGroup = async (e) => {
    e.preventDefault();

    if (!groupToUpdate) {
      showSnackbar('No group selected for update.', 'error');
      return;
    }

    const payload = {
      name: groupToUpdate.name,
      description: groupToUpdate.description,
    };

    try {
      const response = await apiClient.put(`/update-group/${groupToUpdate.id}/`, payload);
      if (response.status === 200) {
        showSnackbar('Group updated successfully', 'success');
        setShowUpdateForm(false);
        setGroupToUpdate(null);
        fetchGroups();
      } else {
        showSnackbar('Unexpected response. Please try again.', 'error');
      }
    } catch (error) {
      showSnackbar('Error updating group', 'error');
      console.error(error);
    }
  };

  const handleDeleteSelectedGroups = () => {
    if (selectedGroups.length === 0) {
      showSnackbar('No groups selected for deletion', 'error');
      return;
    }
    openConfirmModal(
      'Are you sure you want to delete the selected groups?',
      async () => {
        try {
          for (const groupId of selectedGroups) {
            const response = await apiClient.delete(`/delete-group/${groupId}/`);
            if (response.status === 204 || response.status === 200) {
            } else {
              showSnackbar('Error during delete, check console.', 'error');
              console.error('Unexpected response during delete', response);
            }
          }
          showSnackbar('Selected groups deleted successfully', 'success');
          setSelectedGroups([]);
          fetchGroups();
        } catch (error) {
          showSnackbar('An error occurred while deleting selected groups.', 'error');
          console.error('Error deleting selected groups:', error);
        }
      }
    );
  };

  const handleDeleteGroup = (groupId) => {
    openConfirmModal(
      'Are you sure you want to delete this group?',
      async () => {
        try {
          const response = await apiClient.delete(`/delete-group/${groupId}/`);
          if (response.status === 200 || response.status === 204) {
            showSnackbar('Group deleted successfully', 'success');
            fetchGroups();
          } else {
            showSnackbar('Unexpected server response while deleting the group.', 'error');
            console.error('Unexpected response:', response);
          }
        } catch (error) {
          showSnackbar('An error occurred while attempting to delete the group.', 'error');
          if (error.response) {
            console.error('Server error:', error.response);
          } else {
            console.error('Error:', error.message);
          }
        }
      }
    );
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

  return (
    <div style={volumesContainerStyle}>
      <div style={headerContainerVolumesStyle}>
        <h1>Group Management</h1>
        <div style={searchContainerStyle}>
          <TextField
            type="text"
            label="Search groups..."
            value={searchTerm}
            onChange={handleSearchChange}
            variant="outlined"
          />
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="contained" style={{ backgroundColor: 'green', color: 'white' }} onClick={() => setShowCreateForm(true)}>
              Create Group <RiBallPenLine />
            </Button>
            <Button variant="contained" color="error" onClick={handleDeleteSelectedGroups}>
              Delete <RiDeleteBin6Line />
            </Button>
          </div>
        </div>
      </div>

      <Modal open={showCreateForm} onClose={() => setShowCreateForm(false)}>
        <Box sx={modalStyle}>
          <h2>Create New Group</h2>
          <form onSubmit={handleCreateGroup}>
            <FormControl fullWidth margin="normal">
              <TextField label="Name" name="name" placeholder="Name" onChange={handleInputChange} value={newGroup.name} required />
            </FormControl>
            <FormControl fullWidth margin="normal">
              <TextField label="Description" name="description" placeholder="Description" onChange={handleInputChange} value={newGroup.description} required />
            </FormControl>
            <FormControl fullWidth margin="normal">
              <Select value={newMember.user} onChange={handleNewMemberChange} displayEmpty>
                <MenuItem value="">Select User</MenuItem>
                {users.map((user) => (
                  <MenuItem key={user.id} value={user.id}>
                    {user.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button type="button" onClick={handleAddMember} disabled={!newMember.user}>
              Add Member
            </Button>
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
          <h2>Update Group</h2>
          <form onSubmit={handleUpdateGroup}>
            <FormControl fullWidth margin="normal">
              <TextField label="Group Name" name="name" onChange={handleUpdateInputChange} value={groupToUpdate?.name} required />
            </FormControl>
            <FormControl fullWidth margin="normal">
              <TextField label="Description" name="description" onChange={handleUpdateInputChange} value={groupToUpdate?.description} required />
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

      {/* Custom Confirmation Modal */}
      <Modal open={confirmModalOpen} onClose={handleConfirmModalClose}>
        <Box sx={modalStyle}>
          <Typography variant="h6" component="h2">
            Confirm Action
          </Typography>
          <Typography sx={{ mt: 2 }}>
            {confirmMessage}
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
            <Button variant="outlined" onClick={handleConfirmModalClose} sx={{ mr: 1 }}>
              Cancel
            </Button>
            <Button variant="contained" color="error" onClick={handleConfirmExecute}>
              Confirm
            </Button>
          </Box>
        </Box>
      </Modal>

      <TableContainer component={Paper}>
        <Table style={volumesTableStyle}>
          <TableHead>
            <TableRow>
            <StyledTableCell padding="checkbox">
                <input
                  type="checkbox"
                  onChange={handleSelectAll}
                  checked={filteredGroups.length > 0 &&
                    filteredGroups.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).every(group => selectedGroups.includes(group.id))}
                />
              </StyledTableCell>
              <StyledTableCell>Sr. No.</StyledTableCell>
              <StyledTableCell>Group Name</StyledTableCell>
              <StyledTableCell>Group Id</StyledTableCell>
              <StyledTableCell>Description</StyledTableCell>
              <StyledTableCell>Actions</StyledTableCell>
            </TableRow>
          </TableHead>
          <TableBody>
          {filteredGroups
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((group,index) => (
                <StyledTableRow key={group.id}>
                  <StyledTableCell padding="checkbox">
                    <input
                      type="checkbox"
                      checked={selectedGroups.includes(group.id)}
                      onChange={() => handleSelectGroup(group.id)}
                    />
                  </StyledTableCell>
                  <StyledTableCell>{page * rowsPerPage + index + 1}</StyledTableCell>
                <StyledTableCell>{group.name}</StyledTableCell>
                <StyledTableCell>{group.id}</StyledTableCell>
                <StyledTableCell>{group.description}</StyledTableCell>
                <StyledTableCell>
                  <Box display="flex" justifyContent="center" gap={1}>
                    <Button variant="outlined" color="#253848" onClick={() => { setGroupToUpdate(group); setShowUpdateForm(true); }}>
                      Update
                    </Button>
                    <Button variant="outlined" color="error" onClick={() => handleDeleteGroup(group.id)}>
                      Delete
                    </Button>
                    <Button
                      variant="outlined"
                      color="info" // Using 'info' for a distinct color
                      onClick={() => navigate(`/app/openstack/groups/members/${group.id}`)} // Updated navigation path
                    >
                      Manage Members
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
        count={filteredGroups.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
      <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={handleSnackbarClose} anchorOrigin={{ vertical: 'top', horizontal: 'right' }}>
        <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: '100%' }}>
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
export default Groups;
