import React, { useEffect, useState } from 'react';
import { useQuery } from "@tanstack/react-query";
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
  Typography,
  Checkbox, // Import Checkbox for selection
} from '@mui/material';
import { useTheme } from "@mui/material/styles";

import { styled } from '@mui/material/styles';
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


const fetchFlavors = async () => {
  const response = await apiClient.get("/flavors/");
  return Object.values(response.data);
};

const Flavors = () => {
  const { data: initialFlavors, error, isLoading, refetch } = useQuery({
    queryKey: ["flavors"],
    queryFn: fetchFlavors,
  });
  const [flavors, setFlavors] = useState(initialFlavors || []);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(8);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedFlavorsToDelete, setSelectedFlavorsToDelete] = useState([]);

  const theme = useTheme(); 
  const [newFlavor, setNewFlavor] = useState({
    name: '',
    ram: '',
    vcpus: '',
    disk: '',
    // New optional fields
    id: '', // Optional ID
    ephemeral_disk: '', // Ephemeral disk in GB
    swap_disk: '', // SWAP disk in MB
    rx_tx_factor: '', // RX/TX factor
  });
  const [showUpdateForm, setShowUpdateForm] = useState(false); // Retained for future update functionality
  const [flavorToUpdate, setFlavorToUpdate] = useState(null); // Retained for future update functionality
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

  useEffect(() => {
    if (initialFlavors) {
      setFlavors(initialFlavors);
    }
  }, [initialFlavors]);

  if (isLoading) {
    return (
      <div className="cloud-container">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="7.87722 9.61948 33.01 16.88"
        >
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
        <div className="error-icon">
          <GoAlert />
        </div>
        <h2>❌ Server Down</h2>
        <p>{error.message}</p>
      </div>
    );
  }

  const filteredFlavors = flavors?.filter((flavor) =>
    Object.values(flavor).some(value =>
      typeof value === 'string' && value.toLowerCase().includes(searchTerm.toLowerCase()) ||
      typeof value === 'number' && value.toString().toLowerCase().includes(searchTerm.toLowerCase())
    )
  ) || [];

  const handlePageChange = (_, newPage) => setPage(newPage);
  const handleRowsPerPageChange = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setPage(0);
  };

  const currentFlavors = filteredFlavors.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const allIds = currentFlavors.map((flavor) => flavor.id);
      setSelectedFlavorsToDelete(allIds);
    } else {
      setSelectedFlavorsToDelete([]);
    }
  };

  const handleSelectFlavor = (flavorId) => {
    if (selectedFlavorsToDelete.includes(flavorId)) {
      setSelectedFlavorsToDelete(selectedFlavorsToDelete.filter((id) => id !== flavorId));
    } else {
      setSelectedFlavorsToDelete([...selectedFlavorsToDelete, flavorId]);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewFlavor((prevState) => ({
      ...prevState,
      [name]: value,
    }));
  };

  const handleCreateFlavor = async (e) => {
    e.preventDefault();

    // Prepare payload, converting numeric fields to numbers
    const payload = {
      name: newFlavor.name,
      ram: Number(newFlavor.ram),
      vcpus: Number(newFlavor.vcpus),
      disk: Number(newFlavor.disk),
    };

    // Add optional fields if they have values
    if (newFlavor.id) {
      payload.id = newFlavor.id;
    }
    if (newFlavor.ephemeral_disk) {
      payload.ephemeral_disk = Number(newFlavor.ephemeral_disk);
    }
    if (newFlavor.swap_disk) {
      payload.swap_disk = Number(newFlavor.swap_disk);
    }
    if (newFlavor.rx_tx_factor) {
      payload.rx_tx_factor = Number(newFlavor.rx_tx_factor);
    }

    try {
      const response = await apiClient.post('/flavors/create/', payload);
      if (response.status === 201) {
        showSnackbar('Flavor created successfully', 'success');
        setShowCreateForm(false);
        setNewFlavor({ // Reset all fields, including new optional ones
          name: '',
          ram: '',
          vcpus: '',
          disk: '',
          id: '',
          ephemeral_disk: '',
          swap_disk: '',
          rx_tx_factor: '',
        });
        refetch(); // Re-fetch data after creation
      } else {
        showSnackbar('Failed to create flavor', 'error');
      }
    } catch (error) {
      console.error('Error creating flavor:', error);
      showSnackbar(`Error creating flavor: ${error.response?.data?.message || error.message}`, 'error');
    }
  };

  const handleDeleteFlavor = async (flavorId) => {
    if (!window.confirm('Are you sure you want to delete this flavor?')) {
      return;
    }

    try {
      const response = await apiClient.delete('/flavors/delete/', {
        data: { flavor_id: flavorId },
      });
      if (response.status === 204 || response.status === 200) {
        showSnackbar('Flavor deleted successfully', 'success');
        refetch(); // Re-fetch data after deletion
      } else {
        showSnackbar('Failed to delete flavor', 'error');
      }
    } catch (error) {
      console.error('Error deleting flavor:', error);
      showSnackbar(`Error deleting flavor: ${error.response?.data?.message || error.message}`, 'error');
    }
  };

  const handleDeleteSelectedFlavors = async () => {
    if (selectedFlavorsToDelete.length === 0) {
      showSnackbar('No flavors selected for deletion', 'error');
      return;
    }

    if (!window.confirm('Are you sure you want to delete the selected flavors?')) {
      return;
    }

    try {
      for (const flavorId of selectedFlavorsToDelete) {
        const response = await apiClient.delete('/flavors/delete/', {
          data: { flavor_id: flavorId },
        });
        if (response.status === 204 || response.status === 200) {
        } else {
          showSnackbar(`Error deleting flavor ${flavorId}, check console.`, 'error');
          console.error('Unexpected response during delete', response);
        }
      }

      showSnackbar('Selected flavors deleted successfully', 'success');
      setSelectedFlavorsToDelete([]);
      refetch(); // Re-fetch data after batch deletion
    } catch (error) {
      console.error('Error deleting selected flavors:', error);
      showSnackbar('An error occurred while deleting selected flavors.', 'error');
    }
  };

  // Retained for future update functionality, currently not used in UI
  const handleUpdateInputChange = (e) => {
    const { name, value } = e.target;
    setFlavorToUpdate((prevState) => ({
      ...prevState,
      [name]: value,
    }));
  };

  // Retained for future update functionality, currently not used in UI
  const handleOpenUpdateForm = (flavor) => {
    setFlavorToUpdate({ ...flavor });
    setShowUpdateForm(true);
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
    <div style={flavorsContainerStyle}>
      <div style={headerContainerFlavorsStyle}>
        <Typography variant="h4" component="h1" gutterBottom>
          Flavor Management
        </Typography>
        <div style={buttonContainerStyle}>
          <TextField
            label="Search flavors..."
            variant="outlined"
            value={searchTerm}
            onChange={handleSearchChange}
            style={{ marginRight: '16px' }}
          />
          <Button
            variant="contained"
            sx={{
              backgroundColor: theme.palette.mode === "light" ? "#2e7d32" : "#388e3c",
              color: "#fff",
              "&:hover": {
                backgroundColor: theme.palette.mode === "light" ? "#1b5e20" : "#2e7d32",
              }
            }} 
            onClick={() => setShowCreateForm(true)}
            startIcon={<RiBallPenLine />}
          >
            Create Flavor
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeleteSelectedFlavors}
            startIcon={<RiDeleteBin6Line />}
          >
            Delete Selected
          </Button>
        </div>
      </div>

      {/* Create Flavor Modal */}
      <Modal open={showCreateForm} onClose={() => setShowCreateForm(false)}>
        <Box sx={modalStyle}>
          <Typography variant="h6" component="h2" gutterBottom>
            Create New Flavor
          </Typography>
          <form onSubmit={handleCreateFlavor}>
            <FormControl fullWidth margin="normal">
              <TextField label="Name" name="name" value={newFlavor.name} onChange={handleInputChange} required />
            </FormControl>
            <FormControl fullWidth margin="normal">
              <TextField label="RAM (MB)" name="ram" type="number" value={newFlavor.ram} onChange={handleInputChange} required />
            </FormControl>
            <FormControl fullWidth margin="normal">
              <TextField label="vCPUs" name="vcpus" type="number" value={newFlavor.vcpus} onChange={handleInputChange} required />
            </FormControl>
            <FormControl fullWidth margin="normal">
              <TextField label="Disk (GB)" name="disk" type="number" value={newFlavor.disk} onChange={handleInputChange} required />
            </FormControl>
            {/* New Optional Fields */}
            <FormControl fullWidth margin="normal">
              <TextField label="ID (Optional)" name="id" value={newFlavor.id} onChange={handleInputChange} />
            </FormControl>
            <FormControl fullWidth margin="normal">
              <TextField label="Ephemeral Disk (GB) (Optional)" name="ephemeral_disk" type="number" value={newFlavor.ephemeral_disk} onChange={handleInputChange} />
            </FormControl>
            <FormControl fullWidth margin="normal">
              <TextField label="SWAP Disk (MB) (Optional)" name="swap_disk" type="number" value={newFlavor.swap_disk} onChange={handleInputChange} />
            </FormControl>
            <FormControl fullWidth margin="normal">
              <TextField label="RX/TX Factor (Optional)" name="rx_tx_factor" type="number" step="0.1" value={newFlavor.rx_tx_factor} onChange={handleInputChange} />
            </FormControl>

            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
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
                <Checkbox
                  onChange={handleSelectAll}
                  checked={currentFlavors.length > 0 && currentFlavors.every(flavor => selectedFlavorsToDelete.includes(flavor.id))}
                  inputProps={{ 'aria-label': 'select all flavors' }}
                />
              </StyledTableCell>
              <StyledTableCell>ID</StyledTableCell>
              <StyledTableCell>Name</StyledTableCell>
              <StyledTableCell>RAM (MB)</StyledTableCell>
              <StyledTableCell>vCPUs</StyledTableCell>
              <StyledTableCell>Disk (GB)</StyledTableCell>
              {/* Add table headers for new optional fields if you want to display them */}
              <StyledTableCell>Actions</StyledTableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {currentFlavors.map((flavor) => (
              <StyledTableRow key={flavor.id}>
                <StyledTableCell padding="checkbox">
                  <Checkbox
                    checked={selectedFlavorsToDelete.includes(flavor.id)}
                    onChange={() => handleSelectFlavor(flavor.id)}
                    inputProps={{ 'aria-label': `select flavor ${flavor.name}` }}
                  />
                </StyledTableCell>
                <StyledTableCell>{flavor.id}</StyledTableCell>
                <StyledTableCell>{flavor.name}</StyledTableCell>
                <StyledTableCell>{flavor.ram}</StyledTableCell>
                <StyledTableCell>{flavor.vcpus}</StyledTableCell>
                <StyledTableCell>{flavor.disk}</StyledTableCell>
                <StyledTableCell>
                  <Box display="flex" justifyContent="center" gap={1}>
                    {/* Re-added Update button, as it was removed in previous iteration */}
                   
                    <Button variant="outlined" color="error" size="small" onClick={() => handleDeleteFlavor(flavor.id)}>
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
                    rowsPerPageOptions={[5, 8, 10, 25, { value: -1, label: 'All' }]}
                    component="div"
                    count={filteredFlavors.length}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={handlePageChange}
                    onRowsPerPageChange={handleRowsPerPageChange}
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

const flavorsContainerStyle = { padding: '20px', fontFamily: 'sans-serif' };
const headerContainerFlavorsStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '20px',
};
const buttonContainerStyle = {
  display: 'flex',
  gap: '16px',
  alignItems: 'center',
};

export default Flavors;
