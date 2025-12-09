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
  TablePagination,
} from '@mui/material';
import { useTheme } from "@mui/material/styles";

import { styled } from '@mui/material/styles';
import { tableCellClasses } from '@mui/material/TableCell';
import { CheckCircleOutline, ErrorOutline, InfoOutlined, WarningOutlined } from '@mui/icons-material';
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

const VolumeTypes = () => {
  const [volumeTypes, setVolumeTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedVolumeTypes, setSelectedVolumeTypes] = useState([]);
  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const [volumeToUpdate, setVolumeToUpdate] = useState(null);
  const [newVolumeType, setNewVolumeType] = useState({ name: '', description: '' });

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
    if (reason === 'clickaway') return;
    setSnackbarOpen(false);
  };

  // Fetch volume types
  const fetchVolumeTypes = async () => {
    setError(null);
    try {
      const response = await apiClient.get('/volume-types/');
      setVolumeTypes(response.data);
    } catch (err) {
      console.error('Error fetching volume types:', err);
      setError('Error fetching volume types');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVolumeTypes();
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

  // Pagination
  const currentVolumeTypes = volumeTypes.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const handleChangePage = (_, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Search
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    const filtered = volumeTypes.filter((vt) =>
      Object.values(vt)
        .some((value) => value?.toString().toLowerCase().includes(e.target.value.toLowerCase()))
    );
    setVolumeTypes(filtered);
    setPage(0);
  };

  // Select all / individual
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const allIds = currentVolumeTypes.map((vt) => vt.id);
      setSelectedVolumeTypes(allIds);
    } else {
      setSelectedVolumeTypes([]);
    }
  };

  const handleSelectVolume = (id) => {
    if (selectedVolumeTypes.includes(id)) {
      setSelectedVolumeTypes(selectedVolumeTypes.filter((i) => i !== id));
    } else {
      setSelectedVolumeTypes([...selectedVolumeTypes, id]);
    }
  };

  // Input change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewVolumeType((prev) => ({ ...prev, [name]: value }));
  };

  const handleUpdateInputChange = (e) => {
    const { name, value } = e.target;
    setVolumeToUpdate((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateVolumeType = async (e) => {
    e.preventDefault();
  
    try {
      const response = await apiClient.post('/create-volume-type/', newVolumeType);
  
      // 🔥 Handle duplicate
      if (response.data.exists) {
        showSnackbar(response.data.message, 'warning');
        return;
      }
  
      // 🔥 Only success case
      if (response.status === 201) {
        showSnackbar('Volume type created successfully', 'success');
        setShowCreateForm(false);
        setNewVolumeType({ name: '', description: '' });
        fetchVolumeTypes();
        return;
      }
  
    } catch (err) {
      console.error(err);
  
      showSnackbar(
        err?.response?.data?.error || "Error creating volume type",
        "error"
      );
    }
  };
  

  // Update volume type
  const handleUpdateVolumeType = async (e) => {
    e.preventDefault();
    if (!volumeToUpdate) return;
    try {
      const response = await apiClient.put(`/update-volume-type/${volumeToUpdate.id}/`, volumeToUpdate);
      if (response.status === 200) {
        showSnackbar('Volume type updated successfully', 'success');
        setShowUpdateForm(false);
        setVolumeToUpdate(null);
        fetchVolumeTypes();
      }
    } catch (err) {
      console.error(err);
      showSnackbar('Error updating volume type', 'error');
    }
  };

  // Delete
  const handleDeleteSelected = async () => {
    if (selectedVolumeTypes.length === 0) {
      showSnackbar('No volume types selected', 'error');
      return;
    }
    if (!window.confirm('Are you sure to delete selected volume types?')) return;

    try {
      for (const id of selectedVolumeTypes) {
        await apiClient.delete(`/delete-volume-type/${id}/`);
      }
      showSnackbar('Selected volume types deleted successfully', 'success');
      setSelectedVolumeTypes([]);
      fetchVolumeTypes();
    } catch (err) {
      console.error(err);
      showSnackbar('Error deleting volume types', 'error');
    }
  };

  const handleDeleteVolumeType = async (id) => {
    if (!window.confirm('Are you sure to delete this volume type?')) return;
    try {
      await apiClient.delete(`/delete-volume-type/${id}/`);
      showSnackbar('Volume type deleted', 'success');
      fetchVolumeTypes();
    } catch (err) {
      console.error(err);
      showSnackbar('Error deleting volume type', 'error');
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

  const getAlertIcon = (severity) => {
    switch (severity) {
      case 'success': return <CheckCircleOutline style={{ marginRight: '8px' }} />;
      case 'error': return <ErrorOutline style={{ marginRight: '8px' }} />;
      case 'warning': return <WarningOutlined style={{ marginRight: '8px' }} />;
      default: return <InfoOutlined style={{ marginRight: '8px' }} />;
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>Volume Types</h1>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <TextField type="text" label="Search..." value={searchTerm} onChange={handleSearchChange} variant="outlined" />
          <Button variant="contained" onClick={() => setShowCreateForm(true)}
            sx={{
              backgroundColor: theme.palette.mode === "light" ? "#2e7d32" : "#388e3c",
              color: "#fff",
              "&:hover": {
                backgroundColor: theme.palette.mode === "light" ? "#1b5e20" : "#2e7d32",
              }
            }} >
            Create Volume <RiBallPenLine />
          </Button>
          <Button variant="contained" color="error" onClick={handleDeleteSelected}>
            Delete <RiDeleteBin6Line />
          </Button>
        </div>
      </div>

      {/* Create Modal */}
      <Modal open={showCreateForm} onClose={() => setShowCreateForm(false)}>
        <Box sx={(theme) => modalStyle(theme)}>
          <h2>Create Volume Type</h2>
          <form onSubmit={handleCreateVolumeType}>
            <FormControl fullWidth margin="normal">
              <TextField label="Name" name="name" value={newVolumeType.name} onChange={handleInputChange} required />
            </FormControl>
            <FormControl fullWidth margin="normal">
              <TextField label="Description" name="description" value={newVolumeType.description} onChange={handleInputChange} />
            </FormControl>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
              <Button type="submit" variant="contained" color="primary" sx={{ mr: 1 }}>Create</Button>
              <Button type="button" variant="outlined" onClick={() => setShowCreateForm(false)}>Cancel</Button>
            </Box>
          </form>
        </Box>
      </Modal>

      {/* Update Modal */}
      <Modal open={showUpdateForm} onClose={() => setShowUpdateForm(false)}>
      <Box sx={(theme) => modalStyle(theme)}>

          <h2>Update Volume Type</h2>
          <form onSubmit={handleUpdateVolumeType}>
            <FormControl fullWidth margin="normal">
              <TextField label="Name" name="name" value={volumeToUpdate?.name || ''} onChange={handleUpdateInputChange} required />
            </FormControl>
            <FormControl fullWidth margin="normal">
              <TextField label="Description" name="description" value={volumeToUpdate?.description || ''} onChange={handleUpdateInputChange} />
            </FormControl>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
              <Button type="submit" variant="contained" color="primary" sx={{ mr: 1 }}>Update</Button>
              <Button type="button" variant="outlined" onClick={() => setShowUpdateForm(false)}>Cancel</Button>
            </Box>
          </form>
        </Box>
      </Modal>

      {/* Volume Types Table */}
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
              <StyledTableCell>
                <input type="checkbox" onChange={handleSelectAll} checked={currentVolumeTypes.every(vt => selectedVolumeTypes.includes(vt.id)) && currentVolumeTypes.length > 0} />
              </StyledTableCell>
              <StyledTableCell>Sr. No.</StyledTableCell>
              <StyledTableCell>Name</StyledTableCell>
              <StyledTableCell>Description</StyledTableCell>
              <StyledTableCell>ID</StyledTableCell>
              <StyledTableCell>Actions</StyledTableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {currentVolumeTypes.map((vt, index) => (
              <StyledTableRow key={vt.id}>
                <StyledTableCell>
                  <input type="checkbox" checked={selectedVolumeTypes.includes(vt.id)} onChange={() => handleSelectVolume(vt.id)} />
                </StyledTableCell>
                <StyledTableCell>{page * rowsPerPage + index + 1}</StyledTableCell>
                <StyledTableCell>{vt.name}</StyledTableCell>
                <StyledTableCell>{vt.description}</StyledTableCell>
                <StyledTableCell>{vt.id}</StyledTableCell>
                <StyledTableCell>
                  <Box display="flex" justifyContent="center" gap={1}>
                    <Button variant="outlined" onClick={() => { setVolumeToUpdate(vt); setShowUpdateForm(true); }}>Update</Button>
                    <Button variant="outlined" color="error" onClick={() => handleDeleteVolumeType(vt.id)}>Delete</Button>
                  </Box>
                </StyledTableCell>
              </StyledTableRow>
            ))}
          </TableBody>
        </Table>
        {/* ⬇️ PAGINATION INSIDE TABLE CONTAINER */}
                <Box sx={{ width: "100%", display: "flex", justifyContent: "center" }}>
                  <TablePagination
                    rowsPerPageOptions={[5, 10, 20]}
                    component="div"
                    count={volumeTypes.length}
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


      <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={handleSnackbarClose} anchorOrigin={{ vertical: 'top', horizontal: 'right' }} TransitionComponent={Slide}>
        <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: '100%', display: 'flex', alignItems: 'center' }}>
          {getAlertIcon(snackbarSeverity)}
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default VolumeTypes;
