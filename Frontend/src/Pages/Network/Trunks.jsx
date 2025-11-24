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
  TablePagination, // Import TablePagination
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { tableCellClasses } from '@mui/material/TableCell';


// Styled Table Components
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

const Trunks = () => {
  const [trunks, setTrunks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0); // Current page
  const [rowsPerPage, setRowsPerPage] = useState(7); // Rows per page
  const [selectedTrunks, setSelectedTrunks] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const [trunkToUpdate, setTrunkToUpdate] = useState(null);
  const [newTrunk, setNewTrunk] = useState({
    name: '',
    parent_port:'',
    subport_connt:'',
    admin_state:'',
    status:'',
  });

  const fetchTrunks = async () => {
    setError(null);
    try {
      const response = await apiClient.get('/trunks/');
      setTrunks(response.data);
    } catch (error) {
      console.error('Error fetching trunks:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrunks();
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
    // Filtering logic remains the same, but we'll apply it to the full dataset
    // and the TablePagination will handle the display.
    setPage(0); // Reset to the first page on search
  };

  const filteredTrunks = trunks.filter((trunk) =>
    Object.values(trunk).some((value) =>
      value?.toString().toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const handleChangePage = (_, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0); // Reset to the first page when rows per page changes
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const currentVisibleTrunks = filteredTrunks.slice(
        page * rowsPerPage,
        page * rowsPerPage + rowsPerPage
      );
      const allVisibleIds = currentVisibleTrunks.map((trunk) => trunk.id);
      setSelectedTrunks(allVisibleIds);
    } else {
      setSelectedTrunks([]);
    }
  };

  const handleSelectTrunk= (trunkId) => {
    if (selectedTrunks.includes(trunkId)) {
      setSelectedTrunks(selectedTrunks.filter((id) => id !== trunkId));
    } else {
      setSelectedTrunks([...selectedTrunks, trunkId]);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNewTrunk((prevState) => ({
      ...prevState,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleUpdateInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setTrunkToUpdate((prevState) => ({
      ...prevState,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleCreateTrunk = async (e) => {
    e.preventDefault();

    const existingTrunk = trunks.find((trunk) => trunk.name === newTrunk.name);

    if (existingTrunk) {
      alert('A trunk with the same name already exists. Please choose a different name.');
      return;
    }

    const payload = {
      name: newTrunk.name,
      subnet_name: newTrunk.subnet_name,
      trunk_address: newTrunk.trunk_address,
      gateway_ip: newTrunk.gateway_ip,
    };

    try {
      const response = await apiClient.post('/trunks/create/', payload);
      if (response.status === 201 || response.status === 200) {
        alert('Trunks created successfully');
        setShowCreateForm(false);
        setNewTrunk({
            name: '',
            parent_port:'',
            subport_connt:'',
            admin_state:'',
            status:'',
        });
        fetchTrunks();
      } else {
        console.error('Unexpected response:', response);
        alert('Unexpected response from the server. Please check the inputs and try again.');
      }
    } catch (error) {
      console.error('Error creating network:', error);
      alert('Error creating trunk. Please check the inputs and try again.');
    }
  };

  const handleUpdateTrunk = async (e) => {
    e.preventDefault();

    if (!trunkToUpdate) {
      alert('No trunk selected for update.');
      return;
    }

    try {
      const response = await apiClient.put(`/trunks/edit/${trunkToUpdate.id}/`, {
        trunk_name: trunkToUpdate.name,
        is_shared: trunkToUpdate.is_shared,
        subnet_name: trunkToUpdate.subnet_name,
        gateway_ip: trunkToUpdate.gateway_ip,
        cidr: trunkToUpdate.trunk_address,
      });

      if (response.status === 200) {
        alert('trunk updated successfully');
        setShowUpdateForm(false);
        setTrunkToUpdate(null);
        fetchTrunks();
      } else {
        alert('Failed to update the trunk. Please check the inputs and try again.');
      }
    } catch (error) {
      console.error('Error updating trunk:', error);
      alert('An error occurred while updating the trunk. Please try again later.');
    }
  };

  const handleDeleteSelectedTrunks = async () => {
    if (selectedTrunks.length === 0) {
      alert('No trunks selected for deletion');
      return;
    }

    if (!window.confirm('Are you sure you want to delete the selected Trunks?')) {
      return;
    }

    try {
      for (const trunkId of selectedTrunks) {
        await apiClient.delete(`/trunks/delete/${trunkId}/`);
      }

      alert('Selected trunks deleted successfully');
      setSelectedTrunks([]);
      fetchTrunks();
    } catch (error) {
      console.error('Error deleting selected trunks:', error);
      alert('An error occurred while deleting selected trunks.');
    }
  };

  const handleDeleteTrunk = async (trunkId) => {
    if (!window.confirm('Are you sure you want to delete this trunk?')) {
      return;
    }

    try {
      const response = await apiClient.delete(`/trunks/delete/${trunkId}/`);
      if (response.status === 200) {
        alert('Trunk deleted successfully');
        fetchTrunks();
      } else {
        console.error('Unexpected response:', response);
        alert('Unexpected server response while deleting the trunk.');
      }
    } catch (error) {
      if (error.response) {
        console.error('Server error:', error.response);
        alert(`Failed to delete the trunk: ${error.response.data.message || 'Unknown error'}`);
      } else {
        console.error('Error:', error.message);
        alert('An error occurred while attempting to delete the trunk.');
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

  return (
    <div style={volumesContainerStyle}>
      <div style={headerContainerVolumesStyle}>
        <h1>Trunk Management</h1>
        <div style={searchContainerStyle}>
          <TextField
            type="text"
            label="Search trunks..."
            value={searchTerm}
            onChange={handleSearchChange}
            variant="outlined"
          />
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="contained" style={{ backgroundColor: 'green', color: 'white' }} onClick={() => setShowCreateForm(true)}>
              Create Trunk <RiBallPenLine />
            </Button>
            <Button variant="contained" color="error" onClick={handleDeleteSelectedTrunks} disabled={selectedTrunks.length === 0}>
              Delete <RiDeleteBin6Line />
            </Button>
          </div>
        </div>
      </div>

      <Modal open={showCreateForm} onClose={() => setShowCreateForm(false)}>
        <Box sx={modalStyle}>
          <Typography variant="h6" component="h2" gutterBottom>
            Create New Trunk
          </Typography>
          <form onSubmit={handleCreateTrunk}>
            <TextField label="Name" name="name" onChange={handleInputChange} value={newTrunk.name} fullWidth margin="normal" required />
            <TextField label="Subnet Name" name="subnet_name" onChange={handleInputChange} value={newNetwork.subnet_name} fullWidth margin="normal" required />
            <TextField label="Network Address" name="network_address" onChange={handleInputChange} value={newNetwork.network_address} fullWidth margin="normal" required />
            <TextField label="Gateway IP" name="gateway_ip" onChange={handleInputChange} value={newNetwork.gateway_ip} fullWidth margin="normal" required />
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
            Update Trunk
          </Typography>
          <form onSubmit={handleUpdateTrunk}>
            <TextField label="Name" name="name" onChange={handleUpdateInputChange} value={networkToUpdate?.name || ''} fullWidth margin="normal" required />
            <TextField label="Subnet Name" name="subnet_name" onChange={handleUpdateInputChange} value={networkToUpdate?.subnet_name || ''} fullWidth margin="normal" required />
            <TextField label="Gateway IP" name="gateway_ip" onChange={handleUpdateInputChange} value={networkToUpdate?.gateway_ip || ''} fullWidth margin="normal" required />
            <TextField label="Network Address (CIDR)" name="network_address" onChange={handleUpdateInputChange} value={networkToUpdate?.network_address || ''} fullWidth margin="normal" required />
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
              <Typography component="label" sx={{ mr: 2 }}>
                Shared
              </Typography>
              <input type="checkbox" name="is_shared" onChange={handleUpdateInputChange} checked={networkToUpdate?.is_shared || false} />
            </Box>
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
              <StyledTableCell padding="checkbox">
                <input
                  type="checkbox"
                  onChange={handleSelectAll}
                  checked={filteredNetworks.length > 0 &&
                    filteredNetworks.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).every(network => selectedNetworks.includes(network.id))}
                />
              </StyledTableCell>
              <StyledTableCell>Network Name</StyledTableCell>
              <StyledTableCell>Status</StyledTableCell>
              <StyledTableCell>Is Shared</StyledTableCell>
              <StyledTableCell>Actions</StyledTableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredTrunks
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((trunk) => (
                <StyledTableRow key={trunk.id}>
                  <StyledTableCell padding="checkbox">
                    <input
                      type="checkbox"
                      checked={selectedTrunks.includes(trunk.id)}
                      onChange={() => handleSelectNetwork(trunk.id)}
                    />
                  </StyledTableCell>
                  <StyledTableCell>
                    <Tooltip title={trunk.name}>
                      <span>{trunk.name}</span>
                    </Tooltip>
                  </StyledTableCell>
                  <StyledTableCell>
                    <Tooltip title={trunk.status}>
                      <span>{trunk.status}</span>
                    </Tooltip>
                  </StyledTableCell>
                  <StyledTableCell>
                    <Tooltip title={trunk.is_shared}>
                      <span>{trunk.is_shared ? 'Yes' : 'No'}</span>
                    </Tooltip>
                  </StyledTableCell>
                  <StyledTableCell>
                    <Box display="flex" justifyContent="center" gap={1}> {/* Added Box with flex layout */}
                      <Button
                        variant="outlined"
                        color="#253848"
                        onClick={() => {
                          setNetworkToUpdate(network);
                          setShowUpdateForm(true);
                        }}
                      >
                        Update
                      </Button>
                      <Button variant="outlined" color="error" onClick={() => handleDeleteNetwork(trunk.id)}>
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
        count={filteredTrunks.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
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
export default Trunks;
