import * as React from "react";
import { useEffect, useState } from "react";
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { styled, useTheme } from "@mui/material/styles";
import { tableCellClasses } from "@mui/material/TableCell";
import apiClient from "../Axios";

import { useNavigate } from "react-router-dom"; // Import useNavigate

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
    color: theme.palette.text.secondary,
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

/**
 * ReplicaSets Component
 * Displays a paginated and filterable table of Kubernetes ReplicaSets.
 * Allows navigation to individual ReplicaSet details.
 */
const ReplicaSets = () => {
  const [allReplicaSets, setAllReplicaSets] = useState([]);
  const [replicaSets, setReplicaSets] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const [namespacesForDropdown, setNamespacesForDropdown] = useState(["all"]);
  const [selectedNamespace, setSelectedNamespace] = useState("all");

  const theme = useTheme();
  const navigate = useNavigate(); // Use the useNavigate hook here

  // Effect to fetch all ReplicaSets and populate the namespace dropdown
  useEffect(() => {
    const fetchReplicaSetsData = async () => {
      setLoading(true);
      try {
        const response = await apiClient.get("/k8s/replicasets/");
        const fetchedReplicaSets = response.data;
        setAllReplicaSets(fetchedReplicaSets);

        const allNamespaces = fetchedReplicaSets.map(rs => rs.Namespace);
        const uniqueNamespaces = ["all", ...new Set(allNamespaces)].sort();
        setNamespacesForDropdown(uniqueNamespaces);

        if (!uniqueNamespaces.includes(selectedNamespace)) {
          setSelectedNamespace(uniqueNamespaces[0] || "all");
        }

      } catch (error) {
        console.error("Error fetching ReplicaSets or namespaces:", error);
        setAllReplicaSets([]);
        setNamespacesForDropdown(["all"]);
        setSelectedNamespace("all");
      } finally {
        setLoading(false);
      }
    };

    fetchReplicaSetsData();
    // eslint-disable-next-line 
  }, []);

  // Effect to filter ReplicaSets based on selectedNamespace and searchQuery
  useEffect(() => {
    let currentFilteredReplicaSets = allReplicaSets;

    // 1. Filter by selected Namespace
    if (selectedNamespace !== "all") {
      currentFilteredReplicaSets = currentFilteredReplicaSets.filter(
        (rs) => rs.Namespace === selectedNamespace
      );
    }

    // 2. Filter by search query
    if (searchQuery) {
      const lowerCaseSearchQuery = searchQuery.toLowerCase();
      currentFilteredReplicaSets = currentFilteredReplicaSets.filter((rs) =>
        Object.values(rs).some(
          (value) =>
            (typeof value === "string" && value.toLowerCase().includes(lowerCaseSearchQuery)) ||
            (typeof value === "number" && value.toString().toLowerCase().includes(lowerCaseSearchQuery)) ||
            (Array.isArray(value) && value.some(item =>
                typeof item === 'string' && item.toLowerCase().includes(lowerCaseSearchQuery)
            )) ||
            (typeof value === "object" && value !== null && !Array.isArray(value) &&
             JSON.stringify(value).toLowerCase().includes(lowerCaseSearchQuery))
        )
      );
    }

    setReplicaSets(currentFilteredReplicaSets);
    setPage(0);
  }, [allReplicaSets, selectedNamespace, searchQuery]);


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

  const handleChangeNamespace = (event) => {
    setSelectedNamespace(event.target.value);
  };

  // Handle click on ReplicaSet name to navigate to details
  const handleNameClick = (name, namespace) => {
    // This path MUST start with a '/' to be absolute from the root
    navigate(`/app/kubernetes/replicaset-details/${name}?namespace=${namespace}`);
  };

  const numberOfColumns = 6;

  return (
    <Paper sx={{
      width: "90%",
      margin: "20px auto",
      padding: "20px",
      borderRadius: "10px",
      boxShadow: 3,
      bgcolor: theme.palette.background.paper,
      color: theme.palette.text.primary,
    }}>
      <Typography variant="h5" sx={{ marginBottom: 2, textAlign: "left", fontWeight: "bold", color: theme.palette.text.primary }}>
        Kubernetes Replica Sets
      </Typography>

      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        mb: 2,
        justifyContent: 'flex-end',
      }}>
        <FormControl sx={{ minWidth: 180, flexShrink: 0 }}>
          <InputLabel id="namespace-select-label" sx={{ color: theme.palette.text.secondary }}>Namespace</InputLabel>
          <Select
            labelId="namespace-select-label"
            id="namespace-select"
            value={selectedNamespace}
            label="Namespace"
            onChange={handleChangeNamespace}
            sx={{
              color: theme.palette.text.secondary,
              '& .MuiOutlinedInput-notchedOutline': { borderColor: theme.palette.divider },
              '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: theme.palette.primary.main },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: theme.palette.primary.main },
            }}
          >
            {namespacesForDropdown.map((ns) => (
              <MenuItem key={ns} value={ns} sx={{ color: theme.palette.text.secondary }}>
                {ns === "all" ? "All Namespaces" : ns}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

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
        <Table stickyHeader aria-label="replica sets table">
          <TableHead>
            <TableRow>
              <StyledTableCell>Name</StyledTableCell>
              <StyledTableCell>Namespace</StyledTableCell>
              <StyledTableCell>Images</StyledTableCell>
              <StyledTableCell>Labels</StyledTableCell>
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
            ) : replicaSets.length === 0 ? (
              <StyledTableRow>
                <StyledTableCell colSpan={numberOfColumns} align="center">
                  No Replica Sets Found
                </StyledTableCell>
              </StyledTableRow>
            ) : (
              replicaSets
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((rs, index) => (
                  <StyledTableRow key={rs.Name + rs.Namespace + index} >
                    <StyledTableCell>
                      <Typography
                        component="span"
                        sx={{
                          cursor: 'pointer',
                          color: theme.palette.primary.main,
                          fontWeight: 'bold',
                          '&:hover': { textDecoration: 'underline' }
                        }}
                        onClick={() => handleNameClick(rs.Name, rs.Namespace || 'default')}
                      >
                        {rs.Name}
                      </Typography>
                    </StyledTableCell>
                    <StyledTableCell sx={{ color: theme.palette.text.secondary }}>{rs.Namespace}</StyledTableCell>
                    <StyledTableCell sx={{ color: theme.palette.text.secondary }}>{rs.Images ? rs.Images.join(", ") : 'N/A'}</StyledTableCell>
                    <StyledTableCell sx={{ fontSize: '0.7rem', color: theme.palette.text.secondary }}>
                      {rs.Labels ?
                        Object.entries(rs.Labels)
                          .map(([key, value]) => `${key}: ${value}`)
                          .join(", ")
                        : 'N/A'
                      }
                    </StyledTableCell>
                    <StyledTableCell sx={{ color: theme.palette.text.secondary }}>{rs.Pods !== undefined ? rs.Pods : 'N/A'}</StyledTableCell>
                    <StyledTableCell sx={{ color: theme.palette.text.secondary }}>{rs.Created ? new Date(rs.Created).toLocaleString() : 'N/A'}</StyledTableCell>
                  </StyledTableRow>
                ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        rowsPerPageOptions={[10, 25, 50]}
        component="div"
        count={replicaSets.length}
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

export default ReplicaSets;
