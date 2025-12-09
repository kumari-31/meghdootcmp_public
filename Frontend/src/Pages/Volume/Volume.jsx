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
  Box,
  Modal,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TablePagination,
} from '@mui/material';
import { useTheme } from "@mui/material/styles";

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


const Volumes = () => {
  const [volumes, setVolumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0); // Current page
  const [rowsPerPage, setRowsPerPage] = useState(5); // Rows per page
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedVolumes, setSelectedVolumes] = useState([]);
  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const [volumeToUpdate, setVolumeToUpdate] = useState(null);

  const theme = useTheme(); 
  const [newVolume, setNewVolume] = useState({
    name: '', // Changed from volume_name to name
    description: '',
    volume_source: 'none', // This is for internal UI logic, not sent to API in this format
    image_name: '', // To store selected image name
    volume_type: '_Default_', // Changed from volume_type to type in API payload
    size: 1,
    availability_zone: 'nova',
    // group_id is not in your example payload, so removed from here if not needed
  });
  const [volumeTypes, setVolumeTypes] = useState(['_Default_']); // Initialize with default
  const [images, setImages] = useState([]); // To store fetched images

  // Status dropdown options
  const statusOptions = [
    'available',
    'inuse',
    'error',
    'creating',
    'attaching',
    'detaching',
    'error_deleting',
    'maintenance',
    'reserved',
  ];

  const fetchVolumes = async () => {
    setError(null);
    try {
      const response = await apiClient.get('/volumes/');
      setVolumes(response.data);
    } catch (error) {
      console.error('Error fetching volumes:', error);
      setError('Failed to fetch volumes.');
    } finally {
      setLoading(false);
    }
  };

  const fetchVolumeTypes = async () => {
    setError(null);
    try {
      const response = await apiClient.get('/volume-types/');
      if (response.data && Array.isArray(response.data)) {
        const types = response.data.map(type => type.name); // Assuming 'name' property
        setVolumeTypes([ ...types]);
      }
    } catch (error) {
      console.error('Error fetching volume types:', error);
      setError('Failed to fetch volume types.');
    }
  };

  const fetchImages = async () => {
    setError(null);
    try {
      const response = await apiClient.get('/images/'); // Your image API endpoint
      if (response.data && Array.isArray(response.data)) {
        setImages(response.data);
      }
    } catch (error) {
      console.error('Error fetching images:', error);
      setError('Failed to fetch images.');
    }
  };

  useEffect(() => {
    const initializeData = async () => {
      setLoading(true);
      await Promise.all([fetchVolumes(), fetchVolumeTypes(), fetchImages()]);
      setLoading(false);
    };
    initializeData();
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
  };

  const filteredVolumes = volumes.filter((volume) =>
    Object.values(volume)
      .some((value) =>
        value?.toString().toLowerCase().includes(searchTerm.toLowerCase())
      )
  );

  const handlePageChange = (_, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0); // Reset page when rows per page change
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const currentVisibleVolumes = filteredVolumes.slice(
        page * rowsPerPage,
        page * rowsPerPage + rowsPerPage
      );
      const allVisibleIds = currentVisibleVolumes.map((volume) => volume.id);
      setSelectedVolumes(allVisibleIds);
    } else {
      setSelectedVolumes([]);
    }
  };

  const handleSelectVolume = (volumeId) => {
    if (selectedVolumes.includes(volumeId)) {
      setSelectedVolumes(selectedVolumes.filter((id) => id !== volumeId));
    } else {
      setSelectedVolumes([...selectedVolumes, volumeId]);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewVolume((prevState) => ({
      ...prevState,
      [name]: value,
    }));
  };

  // Only for status dropdown
  const handleUpdateStatusChange = (e) => {
    const { value } = e.target;
    setVolumeToUpdate((prevState) => ({
      ...prevState,
      status: value,
    }));
  };

  const handleCreateVolume = async (e) => {
    e.preventDefault();

    if (!newVolume.name) { // Use newVolume.name as per API payload
      alert('Volume Name is required.');
      return;
    }
    if (!newVolume.size || newVolume.size <= 0) {
      alert('Size must be greater than 0.');
      return;
    }

    const payload = {
      name: newVolume.name,
      description: newVolume.description,
      size: newVolume.size,
      availability_zone: newVolume.availability_zone,
      type: newVolume.volume_type, // Map volume_type to 'type' for API
    };

    if (newVolume.volume_source === 'image' && newVolume.image_name) {
      payload.image_name = newVolume.image_name;
    } else if (newVolume.volume_source !== 'none') {
        // Handle other sources if your API supports them in a different way,
        // for now, based on your example, only 'image_name' is shown.
        // If snapshot/volume source ID is also expected, you'll need to add a field for it
        // and add it to the payload. For this example, we only cover image_name.
    }


    try {
      const response = await apiClient.post('/create-volume/', payload);
      if (response.status === 201 || response.status === 200) {
        alert('Volume created successfully');
        setShowCreateForm(false);
        setNewVolume({
          name: '',
          description: '',
          volume_source: 'none',
          image_name: '',
          volume_type: '_Default_',
          size: 1,
          availability_zone: 'nova',
        });
        fetchVolumes();
      } else {
        alert(`Failed to create volume. Status: ${response.status}`);
      }
    } catch (error) {
      console.error('Error creating volume:', error);
      alert(`Error creating volume: ${error.response?.data?.message || error.message || 'Unknown error'}`);
    }
  };

  const handleUpdateVolume = async (e) => {
    e.preventDefault();

    if (!volumeToUpdate.id ) {
      alert('Volume ID and status are required for update.');
      return;
    }

    try {
      // Use the specific update-volume-status API endpoint
      const response = await apiClient.post(`/update-volume-status/${volumeToUpdate.id}/`, {
        status: volumeToUpdate.status,
      });

      if (response.status === 200) {
        alert('Volume status updated successfully');
        setShowUpdateForm(false);
        setVolumeToUpdate(null);
        fetchVolumes();
      } else {
        alert(`Unexpected response. Please try again. Status: ${response.status}`);
      }
    } catch (error) {
      alert('Error updating volume status');
      console.error(error);
    }
  };

  const handleDeleteSelectedVolumes = async () => {
    if (selectedVolumes.length === 0) {
      alert('No volumes selected for deletion');
      return;
    }

    if (!window.confirm('Are you sure you want to delete the selected volumes?')) {
      return;
    }

    try {
      for (const volumeId of selectedVolumes) {
        await apiClient.delete(`/delete-volume/${volumeId}/`);
      }

      alert('Selected volumes deleted successfully');
      setSelectedVolumes([]);
      fetchVolumes();
    } catch (error) {
      console.error('Error deleting selected volumes:', error);
      alert('An error occurred while deleting selected volumes.');
    }
  };

  const handleDeleteVolume = async (volumeId) => {
    if (!window.confirm('Are you sure you want to delete this volume?')) {
      return;
    }

    try {
      const response = await apiClient.delete(`/delete-volume/${volumeId}/`);
      if (response.status === 200 || response.status === 204) {
        alert('Volume deleted successfully');
        fetchVolumes();
      } else {
        console.error('Unexpected response:', response);
        alert('Unexpected server response while deleting the volume.');
      }
    } catch (error) {
      if (error.response) {
        console.error('Server error:', error.response);
        alert(`Failed to delete the volume: ${error.response.data.message || 'Unknown error'}`);
      } else {
        console.error('Error:', error.message);
        alert('An error occurred while attempting to delete the volume.');
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
        <h1>Volume Details</h1>
        <div style={searchContainerStyle}>
          <TextField
            type="text"
            label="Search volumes..."
            value={searchTerm}
            onChange={handleSearchChange}
            variant="outlined"
          />
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="contained"  onClick={() => setShowCreateForm(true)}
               sx={{
                backgroundColor: theme.palette.mode === "light" ? "#2e7d32" : "#388e3c",
                color: "#fff",
                "&:hover": {
                  backgroundColor: theme.palette.mode === "light" ? "#1b5e20" : "#2e7d32",
                }
              }} > 
              Create Volume <RiBallPenLine />
            </Button>
            <Button variant="contained" color="error" onClick={handleDeleteSelectedVolumes}>
              Delete <RiDeleteBin6Line />
            </Button>
          </div>
        </div>
      </div>
      <Modal open={showCreateForm} onClose={() => setShowCreateForm(false)}>
        <Box sx={modalStyle}>
          <h2>Create New Volume</h2>
          <form onSubmit={handleCreateVolume}>
            <FormControl fullWidth margin="normal">
              <TextField
                label="Volume Name"
                name="name" // Changed name to 'name'
                placeholder="Volume Name"
                onChange={handleInputChange}
                value={newVolume.name} // Use newVolume.name
                required
              />
            </FormControl>
            <FormControl fullWidth margin="normal">
              <TextField
                label="Description"
                name="description"
                placeholder="Description"
                onChange={handleInputChange}
                value={newVolume.description}
              />
            </FormControl>
            <FormControl fullWidth margin="normal">
              <InputLabel id="volume-source-label">Volume Source</InputLabel>
              <Select
                labelId="volume-source-label"
                id="volume_source"
                name="volume_source"
                value={newVolume.volume_source}
                onChange={handleInputChange}
              >
                <MenuItem value="none">None</MenuItem>
                <MenuItem value="image">Image</MenuItem>
                <MenuItem value="snapshot">Snapshot</MenuItem>
                <MenuItem value="volume">Volume</MenuItem>
              </Select>
            </FormControl>

            {newVolume.volume_source === 'image' && (
              <FormControl fullWidth margin="normal">
                <InputLabel id="image-name-label">Source Image</InputLabel>
                <Select
                  labelId="image-name-label"
                  id="image_name"
                  name="image_name"
                  value={newVolume.image_name}
                  onChange={handleInputChange}
                  required
                >
                  {images.map((image) => (
                    <MenuItem key={image.id} value={image.name}> {/* Assuming image object has 'id' and 'name' */}
                      {image.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {(newVolume.volume_source === 'snapshot' || newVolume.volume_source === 'volume') && (
              <FormControl fullWidth margin="normal">
                <TextField
                  label={`Source ${newVolume.volume_source.charAt(0).toUpperCase() + newVolume.volume_source.slice(1)} ID`}
                  name="volume_source_id" // This would be sent to the API if it accepts snapshot/volume UUIDs directly
                  placeholder={`${newVolume.volume_source.charAt(0).toUpperCase() + newVolume.volume_source.slice(1)} UUID`}
                  onChange={handleInputChange}
                  value={newVolume.volume_source_id}
                  required
                />
              </FormControl>
            )}

            <FormControl fullWidth margin="normal">
              <InputLabel id="volume-type-label">Volume Type</InputLabel>
              <Select
                labelId="volume-type-label"
                id="volume_type"
                name="volume_type" // This will be mapped to 'type' in the payload
                value={newVolume.volume_type}
                onChange={handleInputChange}
              >
                {volumeTypes.map((type) => (
                  <MenuItem key={type} value={type}>
                    {type}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth margin="normal">
              <TextField
                type="number"
                label="Size (GB)"
                name="size"
                placeholder="Size in GB"
                onChange={handleInputChange}
                value={newVolume.size}
                required
                inputProps={{ min: 1 }}
              />
            </FormControl>
            <FormControl fullWidth margin="normal">
              <InputLabel id="availability-zone-label">Availability Zone</InputLabel>
              <Select
                labelId="availability-zone-label"
                id="availability_zone"
                name="availability_zone"
                value={newVolume.availability_zone}
                onChange={handleInputChange}
              >
                <MenuItem key="nova" value="nova">
                  nova
                </MenuItem>
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

      <Modal open={showUpdateForm} onClose={() => setShowUpdateForm(false)}>
        <Box sx={modalStyle}>
          <h2>Update Volume Status</h2>
          <form onSubmit={handleUpdateVolume}>
            <FormControl fullWidth margin="normal">
              <InputLabel id="status-label">Status</InputLabel>
              <Select
                labelId="status-label"
                id="status"
                name="status"
                value={volumeToUpdate?.status || ''}
                onChange={handleUpdateStatusChange}
                label="Status"
              >
                {statusOptions.map((status) => (
                  <MenuItem key={status} value={status}>
                    {status.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
              <Button type="submit" variant="contained" color="primary" sx={{ mr: 1 }}>
                Update Status
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
              <StyledTableCell>
                <input
                  type="checkbox"
                  onChange={handleSelectAll}
                  checked={filteredVolumes.length > 0 &&
                    filteredVolumes.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).every(volume => selectedVolumes.includes(volume.id))}
                />
              </StyledTableCell>
              <StyledTableCell>Sr. No.</StyledTableCell>
              <StyledTableCell>Volume Name</StyledTableCell>
              <StyledTableCell>Host</StyledTableCell>
              <StyledTableCell>Attached to</StyledTableCell>
              <StyledTableCell>Volume Id</StyledTableCell>
              <StyledTableCell>Status</StyledTableCell>
              <StyledTableCell>Volume Type</StyledTableCell>
              <StyledTableCell>Size</StyledTableCell>
              <StyledTableCell>Created AT</StyledTableCell>
              <StyledTableCell>Bootable</StyledTableCell>
              <StyledTableCell>Encryption </StyledTableCell>
              <StyledTableCell>Actions</StyledTableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredVolumes
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((volume, index) => (
                <StyledTableRow key={volume.id}>
                  <StyledTableCell>
                    <input
                      type="checkbox"
                      checked={selectedVolumes.includes(volume.id)}
                      onChange={() => handleSelectVolume(volume.id)}
                    />
                  </StyledTableCell>
                  <StyledTableCell>{page * rowsPerPage + index + 1}</StyledTableCell>

                  <StyledTableCell>
                    <Tooltip title={volume.name}>
                      <span>{volume.name}</span>
                    </Tooltip>
                  </StyledTableCell>
                  <StyledTableCell>
                    <Tooltip title={volume.host}>
                      <span>{volume.host}</span>
                    </Tooltip>
                  </StyledTableCell>
                  <StyledTableCell>
                    <Tooltip title={volume.attached_to}>
                      <span>{volume.attached_to}</span>
                    </Tooltip>
                  </StyledTableCell>
                  <StyledTableCell>
                    <Tooltip title={volume.id}>
                      <span>{volume.id}</span>
                    </Tooltip>
                  </StyledTableCell>
                  <StyledTableCell>
                    <Tooltip title={volume.status}>
                      <span>{volume.status}</span>
                    </Tooltip>
                  </StyledTableCell>
                  <StyledTableCell>
                    <Tooltip title={volume.volume_type}>
                      <span>{volume.volume_type}</span>
                    </Tooltip>
                  </StyledTableCell>
                  <StyledTableCell>
                    <Tooltip title={volume.size}>
                      <span>{volume.size}</span>
                    </Tooltip>
                  </StyledTableCell>
                  <StyledTableCell>
                    <Tooltip title={volume.created_at}>
                      <span>{volume.created_at}</span>
                    </Tooltip>
                  </StyledTableCell>
                  <StyledTableCell>
                    <Tooltip title={volume.bootable}>
                      <span>{volume.bootable ? 'Yes' : 'No'}</span>
                    </Tooltip>
                  </StyledTableCell>
                  <StyledTableCell>
                    <Tooltip title={volume.encryption}>
                      <span>{volume.encryption ? 'Yes' : 'No'}</span>
                    </Tooltip>
                  </StyledTableCell>
                  <StyledTableCell>
                    <Box display="flex" justifyContent="center" gap={1}>
                      <Button
                        variant="outlined"
                        color="primary"
                        onClick={() => {
                          setVolumeToUpdate(volume);
                          setShowUpdateForm(true);
                        }}
                      >
                        Update
                      </Button>
                      <Button variant="outlined" color="error" onClick={() => handleDeleteVolume(volume.id)}>
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
                    count={filteredVolumes.length}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={handlePageChange}
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

export default Volumes;