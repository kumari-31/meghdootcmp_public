import * as React from "react";
import { useEffect, useState } from "react";
import { useNavigate } from 'react-router-dom'; // Import useNavigate
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TablePagination,
  TextField,
  Typography,
  InputAdornment,
  Box,
  CircularProgress,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { styled, useTheme } from "@mui/material/styles"; // Import useTheme
import { tableCellClasses } from "@mui/material/TableCell";
import apiClient from "../Axios";

// Helper function to format bytes to a more readable unit (e.g., GB, MB)
const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  if (bytes === null || bytes === undefined) return 'N/A';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

// Styled Table Components
const StyledTableCell = styled(TableCell)(({ theme }) => ({
  [`&.${tableCellClasses.head}`]: {
    backgroundColor: "#253848",
    color: theme.palette.common.white,
    fontWeight: "bold",
    fontSize: 16,
    textAlign: "center",
  },
  [`&.${tableCellClasses.body}`]: {
    fontSize: 14,
    textAlign: "center",
    color: theme.palette.text.secondary, // Use theme for consistency
  },
}));

const StyledTableRow = styled(TableRow)(({ theme }) => ({
  backgroundColor: theme.palette.grey[100],
  "&:nth-of-type(odd)": {
    backgroundColor: theme.palette.grey[300],
  },
  "&:last-child td, &:last-child th": {
    border: 0,
  },
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
    transition: 'background-color 0.2s ease-in-out',
  },
}));

const Nodes = () => {
  const [nodes, setNodes] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate(); // Initialize useNavigate
  const theme = useTheme(); // Initialize useTheme

  const fetchNodes = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get("/k8s/nodes/");
      setNodes(response.data.nodes);
    } catch (error) {
      console.error("Error fetching nodes:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNodes();
  }, []);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(+event.target.value);
    setPage(0);
  };

  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
  };

  const handleNodeNameClick = (name) => {
    navigate(`/app/kubernetes/nodes-details/${name}`);
  };

  const filteredNodes = nodes.filter((node) =>
    Object.values(node).some(
      (value) =>
        (typeof value === "string" && value.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (typeof value === "object" && value !== null && !Array.isArray(value) &&
         JSON.stringify(value).toLowerCase().includes(searchQuery.toLowerCase())) ||
        (Array.isArray(value) &&
          value.some((item) => typeof item === "string" && item.toLowerCase().includes(searchQuery.toLowerCase()))
        )
    )
  );

  const numberOfColumns = 10;

  return (
    <Paper
      sx={{
        width: "90%",
        margin: "20px auto",
        padding: "20px",
        borderRadius: "10px",
        boxShadow: 3,
        bgcolor: theme.palette.background.paper,
        color: theme.palette.text.primary,
      }}
    >
      <Typography
        variant="h5"
        sx={{ marginBottom: 2, textAlign: "left", fontWeight: "bold", color: theme.palette.text.primary }}
      >
        Kubernetes Nodes
      </Typography>
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        mb: 2,
      }}>
        <TextField
          label="Search"
          variant="outlined"
          margin="dense"
          sx={{
            width: '250px',
            '& .MuiOutlinedInput-root': {
              color: theme.palette.text.secondary,
              '& fieldset': { borderColor: theme.palette.divider },
              '&:hover fieldset': { borderColor: theme.palette.primary.main },
              '&.Mui-focused fieldset': { borderColor: theme.palette.primary.main },
            },
            '& .MuiInputLabel-root': { color: theme.palette.text.secondary },
            '& .MuiInputLabel-root.Mui-focused': { color: theme.palette.primary.main },
          }}
          value={searchQuery}
          onChange={handleSearchChange}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <SearchIcon sx={{ color: theme.palette.text.secondary }} />
              </InputAdornment>
            ),
          }}
        />
      </Box>
      <TableContainer sx={{ maxHeight: 600, borderRadius: '8px', overflow: 'auto' }}>
        <Table stickyHeader aria-label="nodes table">
          <TableHead>
            <TableRow>
              <StyledTableCell>Name</StyledTableCell>
              <StyledTableCell>Ready</StyledTableCell>
              <StyledTableCell>CPU Requests</StyledTableCell>
              <StyledTableCell>CPU Limits</StyledTableCell>
              <StyledTableCell>CPU Capacity</StyledTableCell>
              <StyledTableCell>Memory Requests</StyledTableCell>
              <StyledTableCell>Memory Limits</StyledTableCell>
              <StyledTableCell>Memory Capacity</StyledTableCell>
              <StyledTableCell>Pods</StyledTableCell>
              <StyledTableCell>Created</StyledTableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <StyledTableRow>
                <StyledTableCell colSpan={numberOfColumns} align="center">
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                    <CircularProgress />
                  </Box>
                </StyledTableCell>
              </StyledTableRow>
            ) : filteredNodes.length === 0 ? (
              <StyledTableRow>
                <StyledTableCell colSpan={numberOfColumns} align="center">
                  No Nodes Found
                </StyledTableCell>
              </StyledTableRow>
            ) : (
              filteredNodes
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((node, index) => (
                  <StyledTableRow key={node.name || index}>
                    <StyledTableCell>
                      {/* --- MODIFIED SECTION for clickable name --- */}
                      <Typography
                        component="span"
                        sx={{
                          cursor: 'pointer',
                          color: theme.palette.primary.main, // Blue color by default
                          fontWeight: 'bold',
                          '&:hover': { textDecoration: 'underline' } // Underline on hover
                        }}
                        onClick={() => handleNodeNameClick(node.name)}
                      >
                        {node.name}
                      </Typography>
                      {/* --- END MODIFIED SECTION --- */}
                    </StyledTableCell>
                    <StyledTableCell>{node.ready}</StyledTableCell>
                    <StyledTableCell>{node.cpu_requests !== undefined ? node.cpu_requests.toFixed(2) : 'N/A'}</StyledTableCell>
                    <StyledTableCell>{node.cpu_limits !== undefined ? node.cpu_limits.toFixed(2) : 'N/A'}</StyledTableCell>
                    <StyledTableCell>{node.cpu_capacity !== undefined ? node.cpu_capacity.toFixed(2) : 'N/A'}</StyledTableCell>
                    <StyledTableCell>{formatBytes(node.memory_requests_bytes)}</StyledTableCell>
                    <StyledTableCell>{formatBytes(node.memory_limits_bytes)}</StyledTableCell>
                    <StyledTableCell>{formatBytes(node.memory_capacity_bytes)}</StyledTableCell>
                    <StyledTableCell>{node.pods !== undefined ? node.pods : 'N/A'}</StyledTableCell>
                    <StyledTableCell>{node.created}</StyledTableCell>
                  </StyledTableRow>
                ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[10, 25, 50]}
        component="div"
        count={filteredNodes.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        sx={{
          color: theme.palette.text.secondary,
          '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
            color: theme.palette.text.secondary,
          },
          '& .MuiTablePagination-select, & .MuiTablePagination-actions': {
            color: theme.palette.text.secondary,
          },
        }}
      />
    </Paper>
  );
};

export default Nodes;