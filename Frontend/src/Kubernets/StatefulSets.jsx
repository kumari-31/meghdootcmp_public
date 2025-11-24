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
  // Use theme colors for row backgrounds for consistency with light/dark mode
  backgroundColor: theme.palette.mode === 'light' ? theme.palette.grey[100] : theme.palette.background.paper,
  "&:nth-of-type(odd)": {
    backgroundColor: theme.palette.mode === 'light' ? theme.palette.grey[300] : theme.palette.background.default,
  },
  "&:last-child td, &:last-child th": {
    border: 0,
  },
  '&:hover': { // Add hover effect for the entire row
    backgroundColor: theme.palette.action.hover,
    transition: 'background-color 0.2s ease-in-out',
  },
}));

const StatefulSets = () => {
  const [allStatefulSets, setAllStatefulSets] = useState([]);
  const [statefulSets, setStatefulSets] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const [namespacesForDropdown, setNamespacesForDropdown] = useState(["all"]);
  const [selectedNamespace, setSelectedNamespace] = useState("all");

  const navigate = useNavigate();
  const theme = useTheme(); // <--- Initialize useTheme

  useEffect(() => {
    const fetchStatefulSetsData = async () => {
      setLoading(true);
      try {
        const response = await apiClient.get("/k8s/statefulsets/");
        const fetchedStatefulSets = response.data.stateful_sets || [];
        setAllStatefulSets(fetchedStatefulSets);

        const allNamespaces = fetchedStatefulSets.map(ss => ss.namespace).filter(Boolean);
        const uniqueNamespaces = ["all", ...new Set(allNamespaces)].sort();
        setNamespacesForDropdown(uniqueNamespaces);

        if (!uniqueNamespaces.includes(selectedNamespace)) {
          setSelectedNamespace(uniqueNamespaces[0] || "all");
        }

      } catch (error) {
        console.error("Error fetching StatefulSets or namespaces:", error);
        setAllStatefulSets([]);
        setNamespacesForDropdown(["all"]);
        setSelectedNamespace("all");
      } finally {
        setLoading(false);
      }
    };

    fetchStatefulSetsData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let currentFilteredStatefulSets = allStatefulSets;

    if (selectedNamespace !== "all") {
      currentFilteredStatefulSets = currentFilteredStatefulSets.filter(
        (ss) => ss.namespace === selectedNamespace
      );
    }

    if (searchQuery) {
      const lowerCaseSearchQuery = searchQuery.toLowerCase();
      currentFilteredStatefulSets = currentFilteredStatefulSets.filter((ss) =>
        Object.values(ss).some(
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

    setStatefulSets(currentFilteredStatefulSets);
    setPage(0);
  }, [allStatefulSets, selectedNamespace, searchQuery]);


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

  // Function to handle click on StatefulSet name
  const handleStatefulSetNameClick = (name, namespace) => {
    navigate(`/app/kubernetes/statefulset-details/${name}?namespace=${namespace}`);
  };

  const numberOfColumns = 6; // Name, Namespace, Images, Labels, Pods, Created

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
        Kubernetes Stateful Sets
      </Typography>

      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        mb: 2,
        justifyContent: 'flex-end',
      }}>
        <FormControl sx={{ minWidth: 180, flexShrink: 0 }}>
          <InputLabel id="statefulset-namespace-select-label" sx={{ color: theme.palette.text.secondary }}>Namespace</InputLabel>
          <Select
            labelId="statefulset-namespace-select-label"
            id="statefulset-namespace-select"
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
        <Table stickyHeader aria-label="stateful sets table">
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
            ) : statefulSets.length === 0 ? (
              <StyledTableRow>
                <StyledTableCell colSpan={numberOfColumns} align="center">
                  No Stateful Sets Found
                </StyledTableCell>
              </StyledTableRow>
            ) : (
              statefulSets
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((ss, index) => (
                  <StyledTableRow key={ss.name || index}>
                    <StyledTableCell>
                      {/* --- MODIFIED SECTION --- */}
                      <Typography
                        component="span" // Use span to keep it inline within the cell
                        sx={{
                          cursor: 'pointer',
                          color: theme.palette.primary.main, // Blue color by default
                          fontWeight: 'bold',
                          '&:hover': { textDecoration: 'underline' } // Underline on hover
                        }}
                        onClick={() => handleStatefulSetNameClick(ss.name, ss.namespace)}
                      >
                        {ss.name}
                      </Typography>
                      {/* --- END MODIFIED SECTION --- */}
                    </StyledTableCell>
                    <StyledTableCell sx={{ color: theme.palette.text.secondary }}>{ss.namespace}</StyledTableCell>
                    <StyledTableCell sx={{ color: theme.palette.text.secondary }}>{ss.images ? ss.images.join(', ') : 'N/A'}</StyledTableCell>
                    <StyledTableCell sx={{ color: theme.palette.text.secondary }}>
                      {ss.labels ?
                        Object.entries(ss.labels)
                          .map(([key, value]) => `${key}: ${value}`)
                          .join(', ')
                        : 'N/A'
                      }
                    </StyledTableCell>
                    <StyledTableCell sx={{ color: theme.palette.text.secondary }}>{ss.pods}</StyledTableCell>
                    <StyledTableCell sx={{ color: theme.palette.text.secondary }}>{ss.created}</StyledTableCell>
                  </StyledTableRow>
                ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[10, 25, 50]}
        component="div"
        count={statefulSets.length}
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

export default StatefulSets;