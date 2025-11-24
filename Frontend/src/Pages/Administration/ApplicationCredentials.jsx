import React, { useEffect, useState } from 'react';
import apiClient from '../../Axios';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Button, TextField, Box, Modal, FormControl, Snackbar, Alert,
  Slide, TablePagination, Checkbox, InputLabel, Select, MenuItem, Chip
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { tableCellClasses } from '@mui/material/TableCell';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker, TimePicker } from '@mui/x-date-pickers';
import dayjs from 'dayjs';
import {
  CheckCircleOutline,
  ErrorOutline,
  InfoOutlined,
  WarningOutlined
} from '@mui/icons-material';
import { RiDeleteBin6Line, RiBallPenLine } from 'react-icons/ri';
import { GoAlert } from 'react-icons/go';
import '../style.css';

// ---------- Styled Components ----------
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

// ---------- Component ----------
const ApplicationCredentials = () => {
  const [credentials, setCredentials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [selectedCredentials, setSelectedCredentials] = useState([]);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [availableRoles, setAvailableRoles] = useState([]);

  const [newCredential, setNewCredential] = useState({
    name: '',
    description: '',
    secret: '',
    expiration_date: '',
    expiration_time: '',
    roles: [],
    unrestricted: false,
  });

  // Snackbar
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');

  // ---------- Snackbar Functions ----------
  const showSnackbar = (message, severity) => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const handleSnackbarClose = (_, reason) => {
    if (reason === 'clickaway') return;
    setSnackbarOpen(false);
  };

  // ---------- Fetch Data ----------
  const fetchApplicationCredentials = async () => {
    setError(null);
    try {
      const res = await apiClient.get('/identity/application-credentials/');
      setCredentials(res.data?.data || []);
    } catch (err) {
      console.error('Error fetching credentials:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const res = await apiClient.get('/roles/');
      setAvailableRoles(res.data);
    } catch (err) {
      console.error('Error fetching roles:', err);
    }
  };

  useEffect(() => {
    fetchApplicationCredentials();
    fetchRoles();
  }, []);

  // ---------- Handlers ----------
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setPage(0);
  };

  const filteredCredentials = credentials.filter((cred) =>
    Object.values(cred).some((val) =>
      String(val).toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const currentCredentials = filteredCredentials.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const handleChangePage = (_, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (e) => {
    setRowsPerPage(parseInt(e.target.value, 10));
    setPage(0);
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const allIds = currentCredentials.map((cred) => cred.id);
      setSelectedCredentials(allIds);
    } else {
      setSelectedCredentials([]);
    }
  };

  const handleSelectCredential = (id) => {
    setSelectedCredentials((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNewCredential((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleRoleChange = (e) => {
    const { value } = e.target;
    setNewCredential((prev) => ({
      ...prev,
      roles: typeof value === 'string' ? value.split(',') : value,
    }));
  };

  // ---------- Create Credential ----------
  const handleCreateCredential = async (e) => {
    e.preventDefault();
    const payload = { ...newCredential };
    try {
      const res = await apiClient.post('/identity/application-credentials/', payload);
      if ([200, 201].includes(res.status)) {
        showSnackbar('Credential created successfully', 'success');
        setShowCreateForm(false);
        setNewCredential({
          name: '',
          description: '',
          secret: '',
          expiration_date: '',
          expiration_time: '',
          roles: [],
          unrestricted: false,
        });
        fetchApplicationCredentials();
      } else {
        showSnackbar('Unexpected response from server', 'error');
      }
    } catch (err) {
      console.error('Error creating credential:', err);
      showSnackbar(err.response?.data?.detail || 'Failed to create credential', 'error');
    }
  };

  // ---------- Delete Credential ----------
  const handleDeleteCredential = async (id) => {
    if (!window.confirm('Are you sure you want to delete this credential?')) return;
    try {
      const res = await apiClient.delete(`/identity/application-credentials/${id}/`);
      if ([200, 204].includes(res.status)) {
        showSnackbar('Credential deleted successfully', 'success');
        fetchApplicationCredentials();
      } else {
        showSnackbar('Error deleting credential', 'error');
      }
    } catch {
      showSnackbar('Error deleting credential', 'error');
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedCredentials.length === 0) {
      showSnackbar('No credentials selected for deletion', 'warning');
      return;
    }
    if (!window.confirm('Are you sure you want to delete selected credentials?')) return;

    try {
      for (const id of selectedCredentials) {
        await apiClient.delete(`/identity/application-credentials/${id}/`);
      }
      showSnackbar('Selected credentials deleted successfully', 'success');
      setSelectedCredentials([]);
      fetchApplicationCredentials();
    } catch {
      showSnackbar('Error deleting selected credentials', 'error');
    }
  };

  // ---------- Loading / Error ----------
  if (loading) {
    return (
      <div className="cloud-container">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="7.87722 9.61948 33.01 16.88">
          <path
            d="M 12 26 H 37 C 42 26 41 20 37 20 C 38 18 37 15 33 16 C 32 8 15 8 14 17 C 8 16 6 25 12 26"
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

  // ---------- Modal Styles ----------
  const modalStyle = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 600,
    bgcolor: 'background.paper',
    boxShadow: 24,
    p: 4,
    borderRadius: '8px',
  };

  const getAlertIcon = (sev) => {
    switch (sev) {
      case 'success': return <CheckCircleOutline sx={{ mr: 1 }} />;
      case 'error': return <ErrorOutline sx={{ mr: 1 }} />;
      case 'warning': return <WarningOutlined sx={{ mr: 1 }} />;
      default: return <InfoOutlined sx={{ mr: 1 }} />;
    }
  };

  // ---------- UI ----------
  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h1>Application Credential Management</h1>
        <div style={searchActionStyle}>
          <TextField
            label="Search credentials..."
            value={searchTerm}
            onChange={handleSearchChange}
            variant="outlined"
          />
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button
              variant="contained"
              style={{ backgroundColor: 'green', color: 'white' }}
              onClick={() => setShowCreateForm(true)}
            >
              Create <RiBallPenLine />
            </Button>
            <Button
              variant="contained"
              color="error"
              onClick={handleDeleteSelected}
            >
              Delete <RiDeleteBin6Line />
            </Button>
          </div>
        </div>
      </div>

      {/* ---------- Create Modal ---------- */}
      <Modal open={showCreateForm} onClose={() => setShowCreateForm(false)}>
        <Box sx={modalStyle}>
          <h2>Create Application Credential</h2>
          <form onSubmit={handleCreateCredential}>
            <TextField fullWidth label="Name" name="name" value={newCredential.name} onChange={handleInputChange} required margin="normal" />
            <TextField fullWidth label="Description" name="description" value={newCredential.description} onChange={handleInputChange} margin="normal" />
            <TextField fullWidth label="Secret" name="secret" value={newCredential.secret} onChange={handleInputChange} margin="normal" required />

            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DatePicker
                label="Expiration Date"
                value={newCredential.expiration_date ? dayjs(newCredential.expiration_date) : null}
                onChange={(date) =>
                  setNewCredential((prev) => ({
                    ...prev,
                    expiration_date: date ? date.format('MM/DD/YYYY') : '',
                  }))
                }
                slotProps={{ textField: { fullWidth: true, margin: 'normal' } }}
              />
              <TimePicker
                label="Expiration Time"
                value={newCredential.expiration_time ? dayjs(newCredential.expiration_time, 'HH:mm') : null}
                onChange={(time) =>
                  setNewCredential((prev) => ({
                    ...prev,
                    expiration_time: time ? time.format('HH:mm') : '',
                  }))
                }
                slotProps={{ textField: { fullWidth: true, margin: 'normal' } }}
              />
            </LocalizationProvider>

            <FormControl fullWidth margin="normal">
              <InputLabel>Roles</InputLabel>
              <Select
                multiple
                value={newCredential.roles}
                onChange={handleRoleChange}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((v) => <Chip key={v} label={v} />)}
                  </Box>
                )}
              >
                {availableRoles.map((r) => (
                  <MenuItem key={r.id} value={r.name}>{r.name}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
              <Button type="submit" variant="contained" color="primary" sx={{ mr: 1 }}>
                Create
              </Button>
              <Button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewCredential({
                      name: '',
                      description: '',
                      secret: '',
                      expiration_date: '',
                      expiration_time: '',
                      roles: [],
                      unrestricted: false,
                    });
                  }}
                  variant="outlined"
                >
                  Cancel
                </Button>

            </Box>
          </form>
        </Box>
      </Modal>

      {/* ---------- Table ---------- */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <StyledTableCell>
                <Checkbox
                  onChange={handleSelectAll}
                  checked={currentCredentials.length > 0 && currentCredentials.every((c) => selectedCredentials.includes(c.id))}
                />
              </StyledTableCell>
              <StyledTableCell>Sr. No.</StyledTableCell>
              <StyledTableCell>Name</StyledTableCell>
              <StyledTableCell>Description</StyledTableCell>
              <StyledTableCell>Expiration</StyledTableCell>
              <StyledTableCell>Roles</StyledTableCell>
              <StyledTableCell>ID</StyledTableCell>
              <StyledTableCell>Actions</StyledTableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {currentCredentials.map((cred, index) => (
              <StyledTableRow key={cred.id}>
                <StyledTableCell>
                  <Checkbox
                    checked={selectedCredentials.includes(cred.id)}
                    onChange={() => handleSelectCredential(cred.id)}
                  />
                </StyledTableCell>
                <StyledTableCell>{page * rowsPerPage + index + 1}</StyledTableCell>
                <StyledTableCell>{cred.name}</StyledTableCell>
                <StyledTableCell>{cred.description || '-'}</StyledTableCell>
                <StyledTableCell>{cred.expires_at || cred.expiration || '-'}</StyledTableCell>
                <StyledTableCell>{cred.roles?.join(', ') || 'N/A'}</StyledTableCell>
                <StyledTableCell>{cred.id}</StyledTableCell>
                <StyledTableCell>
                  <Box display="flex" justifyContent="center" gap={1}>
                    <Button
                      variant="outlined"
                      color="error"
                      onClick={() => handleDeleteCredential(cred.id)}
                    >
                      Delete
                    </Button>
                  </Box>
                </StyledTableCell>
              </StyledTableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* ---------- Pagination ---------- */}
      <TablePagination
        rowsPerPageOptions={[5, 10, 25]}
        component="div"
        count={filteredCredentials.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />

      {/* ---------- Snackbar ---------- */}
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

// ---------- Inline Styles ----------
const containerStyle = { padding: '20px', fontFamily: 'sans-serif' };
const headerStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '20px',
};
const searchActionStyle = { display: 'flex', gap: '10px', alignItems: 'center' };

export default ApplicationCredentials;
