import React, { useEffect, useState } from 'react';
import apiClient from '../../Axios';
import { GoAlert } from 'react-icons/go';
import { useParams } from 'react-router-dom';
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
  Snackbar,
  Alert,
  TablePagination,
  Typography
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



const GroupMembersManagement = () => {
    const theme = useTheme();
  const { groupId } = useParams();
  const [groupMembers, setGroupMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');
  const [groupName, setGroupName] = useState('Loading Group Name...'); // Set a more informative initial state

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

  

  const fetchGroupMembers = async () => {
    setError(null);
    if (!groupId) {
      setError('No group ID provided.');
      setLoading(false);
      setGroupName('Group ID Not Found');
      return;
    }
    try {
      const response = await apiClient.get(`/groups/members/${groupId}/`);

      if (response.data && response.data.group) {
        // Now, check the structure of response.data.group from your console.log.
        // It likely has a 'name' property directly on it, or 'group_name'.
        if (response.data.group) {
          setGroupName(response.data.group);
        } else if (response.data.group) { // If your backend uses 'group_name'
          setGroupName(response.data.group);
        } else {
          setGroupName('Unknown Group (Name Property Missing)');
          console.warn("Group name property not found in response.data.group:", response.data.group);
        }
      } else {
        setGroupName('Unknown Group (Group Object Missing)');
        console.warn("The 'group' object was not found in API response:", response.data);
      }


      let membersArray = [];
      if (Array.isArray(response.data)) {
        membersArray = response.data;
        
      }
      else if (response.data && Array.isArray(response.data.members)) {
        membersArray = response.data.members;
      }
      else if (response.data && Array.isArray(response.data.data)) {
        membersArray = response.data.data;
      }
      else {
        console.warn("API response for group members was not an array or expected object structure:", response.data);
        membersArray = [];
      }

      setGroupMembers(membersArray);
    } catch (error) {
      console.error(`Error fetching members for group ${groupId}:`, error);
      setError('Failed to load group members. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (groupId) { // Only attempt to fetch if groupId is available
      
      fetchGroupMembers();
    } else {
      setLoading(false); // If no groupId, stop loading state
      setError('No group ID provided in the URL.');
    }
  }, [groupId]);

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
    setPage(0);
  };

  const filteredGroupMembers = groupMembers.filter((member) =>
    Object.values(member).some((value) =>
      value?.toString().toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const handleChangePage = (_, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  return (
    <div style={containerStyle}>
      <div style={headerContainerStyle}>
        <h1>Members for Group: {groupName}</h1> {/* Display groupName here */}
        <div style={searchContainerStyle}>
          <TextField
            type="text"
            label="Search members..."
            value={searchTerm}
            onChange={handleSearchChange}
            variant="outlined"
          />
        </div>
      </div>

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
              <StyledTableCell>Sr. No.</StyledTableCell>
              <StyledTableCell>Member ID</StyledTableCell>
              <StyledTableCell>Member Name</StyledTableCell>
              <StyledTableCell>Email</StyledTableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredGroupMembers
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((member, index) => (
                <StyledTableRow key={member.id}>
                  <StyledTableCell>{page * rowsPerPage + index + 1}</StyledTableCell>
                  <StyledTableCell>{member.id}</StyledTableCell>
                  <StyledTableCell>{member.name || member.username || 'N/A'}</StyledTableCell>
                  <StyledTableCell>{member.email || 'N/A'}</StyledTableCell>
                </StyledTableRow>
              ))}
          </TableBody>
        </Table>
          <Box sx={{ width: "100%", display: "flex", justifyContent: "center" }}>
                  <TablePagination
                    rowsPerPageOptions={[5, 7, 10]}
                    component="div"
                    count={filteredGroupMembers.length}
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
      <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={handleSnackbarClose} anchorOrigin={{ vertical: 'top', horizontal: 'right' }}>
        <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </div>
  );
};

const containerStyle = { padding: '20px', fontFamily: 'sans-serif' };
const headerContainerStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '20px',
};
const searchContainerStyle = { display: 'flex', gap: '10px', alignItems: 'center' };
const tableStyle = { width: '100%', borderCollapse: 'collapse', marginTop: '20px' };

export default GroupMembersManagement;