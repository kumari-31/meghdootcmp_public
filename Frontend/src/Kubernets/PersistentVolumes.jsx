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
import { styled, useTheme } from "@mui/material/styles"; // <--- Import useTheme
import { tableCellClasses } from "@mui/material/TableCell";
import apiClient from "../Axios";
import { useNavigate } from 'react-router-dom';

// Styled Table Components (consistent with your other components)
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
    color: theme.palette.text.secondary, // Consistent text color
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
  '&:hover': { // Add hover effect for the entire row
    backgroundColor: theme.palette.action.hover,
    transition: 'background-color 0.2s ease-in-out',
  },
}));

const PersistentVolumes = () => {
  const [allPersistentVolumes, setAllPersistentVolumes] = useState([]);
  const [persistentVolumes, setPersistentVolumes] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const [namespacesForDropdown, setNamespacesForDropdown] = useState(["all"]);
  const [selectedNamespace, setSelectedNamespace] = useState("all");

  const navigate = useNavigate();
  const theme = useTheme(); // <--- Initialize useTheme

  // Effect to fetch all Persistent Volumes and populate namespaces
  useEffect(() => {
    const fetchPersistentVolumesData = async () => {
      setLoading(true);
      try {
        const response = await apiClient.get("/persistent-volumes/");
        const fetchedPVs = response.data;
        setAllPersistentVolumes(fetchedPVs);

        // Extract unique namespaces from the 'claim' field
        const allNamespaces = fetchedPVs
          .map(pv => {
            // "claim": "namespace/claim-name"
            if (pv.claim && typeof pv.claim === 'string' && pv.claim.includes('/')) {
              return pv.claim.split('/')[0];
            }
            return null;
          })
          .filter(Boolean); // Remove nulls and undefineds

        const uniqueNamespaces = ["all", ...new Set(allNamespaces)].sort();
        setNamespacesForDropdown(uniqueNamespaces);

        if (!uniqueNamespaces.includes(selectedNamespace)) {
          setSelectedNamespace(uniqueNamespaces[0] || "all");
        }

      } catch (error) {
        console.error("Error fetching Persistent Volumes or namespaces:", error);
        setAllPersistentVolumes([]);
        setNamespacesForDropdown(["all"]);
        setSelectedNamespace("all");
      } finally {
        setLoading(false);
      }
    };

    fetchPersistentVolumesData();
  }, []);

  // Effect to filter Persistent Volumes based on selectedNamespace and searchQuery
  useEffect(() => {
    let currentFilteredPVs = allPersistentVolumes;

    // 1. Filter by selected Namespace (from the 'claim' field)
    if (selectedNamespace !== "all") {
      currentFilteredPVs = currentFilteredPVs.filter(
        (pv) => pv.claim && typeof pv.claim === 'string' && pv.claim.split('/')[0] === selectedNamespace
      );
    }

    // 2. Filter by search query across various PV properties
    if (searchQuery) {
      const lowerCaseSearchQuery = searchQuery.toLowerCase();
      currentFilteredPVs = currentFilteredPVs.filter((pv) =>
        Object.values(pv).some(
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

    setPersistentVolumes(currentFilteredPVs);
    setPage(0);
  }, [allPersistentVolumes, selectedNamespace, searchQuery]);


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

  // Function to handle click on PV name
  const handlePvNameClick = (name) => {
    navigate(`/app/kubernetes/persistent-volume-details/${name}`);
  };

  const numberOfColumns = 9;

  return (
    <Paper
      sx={{
        width: "90%",
        margin: "20px auto",
        padding: "20px",
        borderRadius: "10px",
        boxShadow: 3,
        bgcolor: theme.palette.background.paper, // Use theme for consistency
        color: theme.palette.text.primary, // Use theme for consistency
      }}
    >
      <Typography
        variant="h5"
        sx={{ marginBottom: 2, textAlign: "left", fontWeight: "bold", color: theme.palette.text.primary }}
      >
        Kubernetes Persistent Volumes
      </Typography>

      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        mb: 2,
        justifyContent: 'flex-end',
      }}>
        <FormControl sx={{ minWidth: 180, flexShrink: 0 }}>
          <InputLabel id="pv-namespace-select-label" sx={{ color: theme.palette.text.secondary }}>Claim Namespace</InputLabel>
          <Select
            labelId="pv-namespace-select-label"
            id="pv-namespace-select"
            value={selectedNamespace}
            label="Claim Namespace"
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
        <Table stickyHeader aria-label="persistent volumes table">
          <TableHead>
            <TableRow>
              <StyledTableCell>Name</StyledTableCell>
              <StyledTableCell>Capacity</StyledTableCell>
              <StyledTableCell>Access Modes</StyledTableCell>
              <StyledTableCell>Reclaim Policy</StyledTableCell>
              <StyledTableCell>Status</StyledTableCell>
              <StyledTableCell>Claim (Namespace/Name)</StyledTableCell>
              <StyledTableCell>Storage Class</StyledTableCell>
              <StyledTableCell>Reason</StyledTableCell>
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
            ) : persistentVolumes.length === 0 ? (
              <StyledTableRow>
                <StyledTableCell colSpan={numberOfColumns} align="center">
                  No Persistent Volumes Found
                </StyledTableCell>
              </StyledTableRow>
            ) : (
              persistentVolumes
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((pv, index) => (
                  <StyledTableRow key={pv.name || index}>
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
                        onClick={() => handlePvNameClick(pv.name)}
                      >
                        {pv.name}
                      </Typography>
                      {/* --- END MODIFIED SECTION --- */}
                    </StyledTableCell>
                    <StyledTableCell sx={{ color: theme.palette.text.secondary }}>{pv.capacity}</StyledTableCell>
                    <StyledTableCell sx={{ color: theme.palette.text.secondary }}>{pv.access_modes ? pv.access_modes.join(', ') : 'N/A'}</StyledTableCell>
                    <StyledTableCell sx={{ color: theme.palette.text.secondary }}>{pv.reclaim_policy}</StyledTableCell>
                    <StyledTableCell sx={{ color: theme.palette.text.secondary }}>{pv.status}</StyledTableCell>
                    <StyledTableCell sx={{ color: theme.palette.text.secondary }}>{pv.claim || '-'}</StyledTableCell>
                    <StyledTableCell sx={{ color: theme.palette.text.secondary }}>{pv.storage_class || '-'}</StyledTableCell>
                    <StyledTableCell sx={{ color: theme.palette.text.secondary }}>{pv.reason || '-'}</StyledTableCell>
                    <StyledTableCell sx={{ color: theme.palette.text.secondary }}>{pv.created}</StyledTableCell>
                  </StyledTableRow>
                ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[10, 25, 50]}
        component="div"
        count={persistentVolumes.length}
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

export default PersistentVolumes;