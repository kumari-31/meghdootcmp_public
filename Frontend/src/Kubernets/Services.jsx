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
import { useNavigate } from "react-router-dom";
import apiClient from "../Axios";

// Styled Table Components (unchanged from your previous files)
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
    color: theme.palette.text.secondary, // Use theme for consistency with dark/light mode
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

const Services = () => {
  const [allServices, setAllServices] = useState([]);
  const [services, setServices] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const [namespacesForDropdown, setNamespacesForDropdown] = useState(["all"]);
  const [selectedNamespace, setSelectedNamespace] = useState("all");

  const navigate = useNavigate();
  const theme = useTheme(); // <--- Initialize useTheme

  // Effect to fetch all services and populate the namespace dropdown
  useEffect(() => {
    const fetchServicesAndPopulateNamespaces = async () => {
      setLoading(true);
      try {
        const response = await apiClient.get("/k8s/services/");
        const fetchedServices = response.data.services || [];
        setAllServices(fetchedServices);

        const allNamespaces = fetchedServices.map(svc => svc.namespace);
        const uniqueNamespaces = ["all", ...new Set(allNamespaces)].sort();
        setNamespacesForDropdown(uniqueNamespaces);

        if (!uniqueNamespaces.includes(selectedNamespace)) {
          setSelectedNamespace(uniqueNamespaces[0] || "all");
        }

      } catch (error) {
        console.error("Error fetching services or namespaces:", error);
        setAllServices([]);
        setNamespacesForDropdown(["all"]);
        setSelectedNamespace("all");
      } finally {
        setLoading(false);
      }
    };

    fetchServicesAndPopulateNamespaces();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Effect to filter services based on selectedNamespace and searchQuery
  useEffect(() => {
    let currentFilteredServices = allServices;

    if (selectedNamespace !== "all") {
      currentFilteredServices = currentFilteredServices.filter(
        (service) => service.namespace === selectedNamespace
      );
    }

    if (searchQuery) {
      const lowerCaseSearchQuery = searchQuery.toLowerCase();
      currentFilteredServices = currentFilteredServices.filter((service) =>
        Object.values(service).some(
          (value) =>
            (typeof value === "string" &&
              value.toLowerCase().includes(lowerCaseSearchQuery)) ||
            (typeof value === "number" &&
              value.toString().toLowerCase().includes(lowerCaseSearchQuery)) ||
            (typeof value === "object" && value !== null && !Array.isArray(value) &&
             JSON.stringify(value).toLowerCase().includes(lowerCaseSearchQuery))
        )
      );
    }

    setServices(currentFilteredServices);
    setPage(0);
  }, [allServices, selectedNamespace, searchQuery]);


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

  const handleServiceClick = (serviceName, serviceNamespace) => {
    navigate(`/app/kubernetes/service-details/${serviceName}?namespace=${serviceNamespace}`);
  };

  const numberOfColumns = 6;

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
        Kubernetes Services
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
        <Table stickyHeader aria-label="services table">
          <TableHead>
            <TableRow>
              <StyledTableCell>Name</StyledTableCell>
              <StyledTableCell>Namespace</StyledTableCell>
              <StyledTableCell>Type</StyledTableCell>
              <StyledTableCell>Cluster IP</StyledTableCell>
              <StyledTableCell>External IP</StyledTableCell>
              <StyledTableCell>Ports</StyledTableCell>
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
            ) : services.length === 0 ? (
              <StyledTableRow>
                <StyledTableCell colSpan={numberOfColumns} align="center">
                  No Services Found
                </StyledTableCell>
              </StyledTableRow>
            ) : (
              services
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((service, index) => (
                  <StyledTableRow key={service.name + service.namespace + index}>
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
                        onClick={() => handleServiceClick(service.name, service.namespace)}
                      >
                        {service.name}
                      </Typography>
                      {/* --- END MODIFIED SECTION --- */}
                    </StyledTableCell>
                    <StyledTableCell sx={{ color: theme.palette.text.secondary }}>{service.namespace}</StyledTableCell>
                    <StyledTableCell sx={{ color: theme.palette.text.secondary }}>{service.type}</StyledTableCell>
                    <StyledTableCell sx={{ color: theme.palette.text.secondary }}>{service.cluster_ip || 'N/A'}</StyledTableCell>
                    <StyledTableCell sx={{ color: theme.palette.text.secondary }}>{service.external_ip || 'N/A'}</StyledTableCell>
                    <StyledTableCell sx={{ color: theme.palette.text.secondary }}>
                      {service.ports && service.ports.length > 0
                        ? service.ports.map(p => `${p.port}/${p.protocol}`).join(', ')
                        : 'N/A'}
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
        count={services.length}
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

export default Services;