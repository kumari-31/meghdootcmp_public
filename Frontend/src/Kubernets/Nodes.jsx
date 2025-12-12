import * as React from "react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { styled, useTheme } from "@mui/material/styles";
import { tableCellClasses } from "@mui/material/TableCell";
import apiClient from "../Axios";
import "../Pages/style.css"; // For cloud loader

// Helper to format memory bytes
const formatBytes = (bytes, decimals = 2) => {
  if (!bytes) return "N/A";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
};

// ---------------- Styled Table ----------------
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
    color: theme.palette.text.primary,
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

// ---------------- MAIN COMPONENT ----------------
const Nodes = () => {
  const [nodes, setNodes] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(7);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const theme = useTheme();
  const navigate = useNavigate();

  // Fetch Nodes
  useEffect(() => {
    const fetchNodes = async () => {
      setLoading(true);
      try {
        const response = await apiClient.get("/k8s/nodes/");
        setNodes(response.data.nodes);
      } catch (err) {
        console.error("Error fetching nodes:", err);
        setError("Failed to load nodes.");
      } finally {
        setLoading(false);
      }
    };
    fetchNodes();
  }, []);

  // Filter nodes
  const filteredNodes = nodes.filter((node) =>
    Object.values(node).some(
      (val) =>
        (typeof val === "string" && val.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (typeof val === "number" && val.toString().includes(searchQuery.toLowerCase())) ||
        (Array.isArray(val) &&
          val.some((item) => typeof item === "string" && item.toLowerCase().includes(searchQuery.toLowerCase()))) ||
        (typeof val === "object" && val !== null && JSON.stringify(val).toLowerCase().includes(searchQuery.toLowerCase()))
    )
  );

  const handleChangePage = (_, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (e) => {
    setRowsPerPage(+e.target.value);
    setPage(0);
  };

  const handleSearchChange = (e) => setSearchQuery(e.target.value);
  const handleNodeNameClick = (name) => navigate(`/app/kubernetes/nodes-details/${name}`);

  const numberOfColumns = 10;

  // ---------------- Loading Cloud ----------------
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
      <Stack alignItems="center" justifyContent="center" sx={{ height: "80vh", color: "error.main" }}>
        <Typography variant="h6">{error}</Typography>
      </Stack>
    );
  }

  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
      {/* Header + Search */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <h1>Nodes</h1>
        <TextField
          label="Search Nodes..."
          variant="outlined"
          value={searchQuery}
          onChange={handleSearchChange}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </div>

      {/* Table */}
      <TableContainer
        component={Paper}
        sx={{
          width: "fit-content",
          minWidth: "90%",
          margin: "0 auto",
          backgroundColor: "transparent",
          boxShadow: "none",
          maxHeight: 600,
        }}
      >
        <Table stickyHeader>
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
            {filteredNodes.length === 0 ? (
              <StyledTableRow>
                <StyledTableCell colSpan={numberOfColumns} align="center">
                  No Nodes Found
                </StyledTableCell>
              </StyledTableRow>
            ) : (
              filteredNodes
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((node, i) => (
                  <StyledTableRow key={node.name || i}>
                    <StyledTableCell>
                      <Typography
                        component="span"
                        sx={{
                          cursor: "pointer",
                          color: theme.palette.primary.main,
                          fontWeight: "bold",
                          "&:hover": { textDecoration: "underline" },
                        }}
                        onClick={() => handleNodeNameClick(node.name)}
                      >
                        {node.name}
                      </Typography>
                    </StyledTableCell>
                    <StyledTableCell>{node.ready}</StyledTableCell>
                    <StyledTableCell>{node.cpu_requests?.toFixed(2) ?? "N/A"}</StyledTableCell>
                    <StyledTableCell>{node.cpu_limits?.toFixed(2) ?? "N/A"}</StyledTableCell>
                    <StyledTableCell>{node.cpu_capacity?.toFixed(2) ?? "N/A"}</StyledTableCell>
                    <StyledTableCell>{formatBytes(node.memory_requests_bytes)}</StyledTableCell>
                    <StyledTableCell>{formatBytes(node.memory_limits_bytes)}</StyledTableCell>
                    <StyledTableCell>{formatBytes(node.memory_capacity_bytes)}</StyledTableCell>
                    <StyledTableCell>{node.pods ?? "N/A"}</StyledTableCell>
                    <StyledTableCell>{node.created ?? "N/A"}</StyledTableCell>
                  </StyledTableRow>
                ))
            )}
          </TableBody>
        </Table>

        <TablePagination
          component="div"
          count={filteredNodes.length}
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[10, 25, 50]}
        />
      </TableContainer>
    </div>
  );
};

export default Nodes;
