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
import { styled, useTheme } from "@mui/material/styles"; // Import useTheme
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
  '&:hover': { // Add hover effect
    backgroundColor: theme.palette.action.hover,
    transition: 'background-color 0.2s ease-in-out',
  },
}));

const Deployments = () => {
  const [allDeployments, setAllDeployments] = useState([]);
  const [deployments, setDeployments] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const [namespacesForDropdown, setNamespacesForDropdown] = useState(["all"]);
  const [selectedNamespace, setSelectedNamespace] = useState("all");

  const theme = useTheme(); // Initialize useTheme
  const navigate = useNavigate(); // Initialize useNavigate

  useEffect(() => {
    const fetchDeploymentsAndPopulateNamespaces = async () => {
      setLoading(true);
      try {
        const response = await apiClient.get("/k8s/deployments/");
        const fetchedDeployments = response.data;
        setAllDeployments(fetchedDeployments);

        const allNamespaces = fetchedDeployments.map(dep => dep.namespace);
        const uniqueNamespaces = ["all", ...new Set(allNamespaces)].sort();
        setNamespacesForDropdown(uniqueNamespaces);

        if (!uniqueNamespaces.includes(selectedNamespace)) {
          setSelectedNamespace(uniqueNamespaces[0] || "all");
        }

      } catch (error) {
        console.error("Error fetching deployments or namespaces:", error);
        setAllDeployments([]);
        setNamespacesForDropdown(["all"]);
        setSelectedNamespace("all");
      } finally {
        setLoading(false);
      }
    };

    fetchDeploymentsAndPopulateNamespaces();
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    let currentFilteredDeployments = allDeployments;

    if (selectedNamespace !== "all") {
      currentFilteredDeployments = currentFilteredDeployments.filter(
        (deployment) => deployment.namespace === selectedNamespace
      );
    }

    if (searchQuery) {
      const lowerCaseSearchQuery = searchQuery.toLowerCase();
      currentFilteredDeployments = currentFilteredDeployments.filter((deployment) =>
        Object.values(deployment).some(
          (value) =>
            (typeof value === "string" && value.toLowerCase().includes(lowerCaseSearchQuery)) ||
            (typeof value === "number" && value.toString().toLowerCase().includes(lowerCaseSearchQuery)) ||
            (Array.isArray(value) && value.some(item => // Add array handling for labels if needed
                typeof item === 'string' && item.toLowerCase().includes(lowerCaseSearchQuery)
            )) ||
            (typeof value === "object" && value !== null && !Array.isArray(value) &&
             JSON.stringify(value).toLowerCase().includes(lowerCaseSearchQuery))
        )
      );
    }

    setDeployments(currentFilteredDeployments);
    setPage(0);
  }, [allDeployments, selectedNamespace, searchQuery]);


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

  // Handle click on Deployment name to navigate to details
  const handleNameClick = (name, namespace) => {
    // This path MUST start with a '/' to be absolute from the root
    navigate(`/app/kubernetes/deployment-details/${name}?namespace=${namespace}`);
  };

  const numberOfColumns = 5;

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
        sx={{ marginBottom: 2, textAlign: "left", fontWeight: "bold", color: theme.palette.text.primary }} // Use theme for consistency
      >
        Kubernetes Deployments
      </Typography>

      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        mb: 2,
        justifyContent: 'flex-end',
      }}>
        <FormControl sx={{ minWidth: 180, flexShrink: 0 }}>
          <InputLabel id="namespace-select-label" sx={{ color: theme.palette.text.secondary }}>Namespace</InputLabel> {/* Use theme */}
          <Select
            labelId="namespace-select-label"
            id="namespace-select"
            value={selectedNamespace}
            label="Namespace"
            onChange={handleChangeNamespace}
            sx={{
              color: theme.palette.text.secondary, // Use theme
              '& .MuiOutlinedInput-notchedOutline': { borderColor: theme.palette.divider }, // Use theme
              '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: theme.palette.primary.main }, // Use theme
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: theme.palette.primary.main }, // Use theme
            }}
          >
            {namespacesForDropdown.map((ns) => (
              <MenuItem key={ns} value={ns} sx={{ color: theme.palette.text.secondary }}> {/* Use theme */}
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
              color: theme.palette.text.secondary, // Use theme
              '& fieldset': { borderColor: theme.palette.divider }, // Use theme
              '&:hover fieldset': { borderColor: theme.palette.primary.main }, // Use theme
              '&.Mui-focused fieldset': { borderColor: theme.palette.primary.main }, // Use theme
            },
            '& .MuiInputLabel-root': { color: theme.palette.text.secondary }, // Use theme
            '& .MuiInputLabel-root.Mui-focused': { color: theme.palette.primary.main }, // Use theme
          }}
          value={searchQuery}
          onChange={handleSearchChange}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <SearchIcon sx={{ color: theme.palette.text.secondary }} /> {/* Use theme */}
              </InputAdornment>
            ),
          }}
        />
      </Box>

      <TableContainer sx={{ maxHeight: 600, borderRadius: '8px', overflow: 'auto' }}> {/* Added borderRadius and overflow */}
        <Table stickyHeader aria-label="deployments table">
          <TableHead>
            <TableRow>
              <StyledTableCell>Name</StyledTableCell>
              <StyledTableCell>Namespace</StyledTableCell>
              <StyledTableCell>Replicas</StyledTableCell>
              <StyledTableCell>Available Replicas</StyledTableCell>
              <StyledTableCell>Labels</StyledTableCell>
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
            ) : deployments.length === 0 ? (
              <StyledTableRow>
                <StyledTableCell colSpan={numberOfColumns} align="center">
                  No Deployments Found
                </StyledTableCell>
              </StyledTableRow>
            ) : (
              deployments
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((deployment, index) => (
                  <StyledTableRow key={deployment.name + deployment.namespace + index}>
                    <StyledTableCell>
                      <Typography
                        component="span"
                        sx={{
                          cursor: 'pointer',
                          color: theme.palette.primary.main, // Use theme for consistency
                          fontWeight: 'bold',
                          '&:hover': { textDecoration: 'underline' }
                        }}
                        onClick={() => handleNameClick(deployment.name, deployment.namespace || 'default')}
                      >
                        {deployment.name}
                      </Typography>
                    </StyledTableCell>
                    <StyledTableCell sx={{ color: theme.palette.text.secondary }}>{deployment.namespace}</StyledTableCell> {/* Use theme */}
                    <StyledTableCell sx={{ color: theme.palette.text.secondary }}>{deployment.replicas !== undefined ? deployment.replicas : 'N/A'}</StyledTableCell> {/* Use theme */}
                    <StyledTableCell sx={{ color: theme.palette.text.secondary }}>{deployment.available_replicas !== undefined ? deployment.available_replicas : 'N/A'}</StyledTableCell> {/* Use theme */}
                    <StyledTableCell sx={{ fontSize: '0.7rem', color: theme.palette.text.secondary }}> {/* Use theme */}
                      {deployment.labels ?
                        Object.entries(deployment.labels)
                          .map(([key, value]) => `${key}: ${value}`)
                          .join(", ")
                        : 'N/A'
                      }
                    </StyledTableCell>
                  </StyledTableRow>
                ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[10, 25, 50]}
        component="div"
        count={deployments.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        sx={{
          color: theme.palette.text.secondary, // Use theme
          '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
            color: theme.palette.text.secondary, // Use theme
          },
          '& .MuiTablePagination-select, & .MuiTablePagination-actions': {
            color: theme.palette.text.secondary, // Use theme
          },
        }}
      />
    </Paper>
  );
};

export default Deployments;