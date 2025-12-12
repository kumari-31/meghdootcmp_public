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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  CircularProgress,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { styled, useTheme } from "@mui/material/styles";
import { tableCellClasses } from "@mui/material/TableCell";
import apiClient from "../Axios";
import { useNavigate } from "react-router-dom";
import "../Pages/style.css";

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
const Deployments = () => {
  const [allDeployments, setAllDeployments] = useState([]);
  const [deployments, setDeployments] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(7);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [namespacesForDropdown, setNamespacesForDropdown] = useState(["all"]);
  const [selectedNamespace, setSelectedNamespace] = useState("all");

  const theme = useTheme();
  const navigate = useNavigate();

  // ---------------- Fetch Deployments ----------------
  useEffect(() => {
    const fetchDeployments = async () => {
      setLoading(true);
      try {
        const response = await apiClient.get("/k8s/deployments/");
        const data = response.data;
        setAllDeployments(data);

        const namespaces = ["all", ...new Set(data.map((d) => d.namespace || "default"))];
        setNamespacesForDropdown(namespaces);
      } catch (err) {
        console.error("Error fetching deployments:", err);
        setError("Failed to load deployments.");
      } finally {
        setLoading(false);
      }
    };
    fetchDeployments();
  }, []);

  // ---------------- Filter Deployments ----------------
  useEffect(() => {
    let filtered = allDeployments;

    if (selectedNamespace !== "all") {
      filtered = filtered.filter((d) => d.namespace === selectedNamespace);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((d) =>
        Object.values(d).some(
          (val) =>
            (typeof val === "string" && val.toLowerCase().includes(q)) ||
            (typeof val === "number" && val.toString().toLowerCase().includes(q)) ||
            (Array.isArray(val) &&
              val.some((item) => typeof item === "string" && item.toLowerCase().includes(q))) ||
            (typeof val === "object" && val !== null && JSON.stringify(val).toLowerCase().includes(q))
        )
      );
    }

    setDeployments(filtered);
    setPage(0);
  }, [allDeployments, selectedNamespace, searchQuery]);

  const handleChangePage = (_, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (e) => {
    setRowsPerPage(+e.target.value);
    setPage(0);
  };

  const numberOfColumns = 5;

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
      <Stack
        alignItems="center"
        justifyContent="center"
        sx={{ height: "80vh", color: "error.main" }}
      >
        <Typography variant="h6">{error}</Typography>
      </Stack>
    );
  }

  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
      {/* ------- Header + Search + Namespace Dropdown ------- */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <h1>Deployments</h1>

        <div style={{ display: "flex", gap: "15px", alignItems: "center" }}>
          <FormControl sx={{ minWidth: 180 }}>
            <InputLabel>Namespace</InputLabel>
            <Select
              value={selectedNamespace}
              label="Namespace"
              onChange={(e) => setSelectedNamespace(e.target.value)}
            >
              {namespacesForDropdown.map((ns) => (
                <MenuItem value={ns} key={ns}>
                  {ns === "all" ? "All Namespaces" : ns}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            label="Search Deployments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            variant="outlined"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </div>
      </div>

      {/* ---------------- TABLE ---------------- */}
      <TableContainer
        component={Paper}
        sx={{
          width: "fit-content",
          minWidth: "75%",
          margin: "0 auto",
          backgroundColor: "transparent",
          boxShadow: "none",
        }}
      >
        <Table
          sx={{
            width: "100%",
            minWidth: 650,
            border: "none",
            "& td, & th": {
              border: "none !important",
            },
          }}
        >
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
            {deployments.length === 0 ? (
              <StyledTableRow>
                <StyledTableCell colSpan={numberOfColumns} align="center">
                  No Deployments Found
                </StyledTableCell>
              </StyledTableRow>
            ) : (
              deployments
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((d, i) => (
                  <StyledTableRow key={d.name + d.namespace + i}>
                    <StyledTableCell>
                      <Typography
                        component="span"
                        sx={{
                          cursor: "pointer",
                          color: theme.palette.primary.main,
                          fontWeight: "bold",
                          "&:hover": { textDecoration: "underline" },
                        }}
                        onClick={() =>
                          navigate(
                            `/app/kubernetes/deployment-details/${d.name}?namespace=${d.namespace}`
                          )
                        }
                      >
                        {d.name}
                      </Typography>
                    </StyledTableCell>

                    <StyledTableCell>{d.namespace || "default"}</StyledTableCell>
                    <StyledTableCell>{d.replicas ?? "N/A"}</StyledTableCell>
                    <StyledTableCell>{d.available_replicas ?? "N/A"}</StyledTableCell>
                    <StyledTableCell sx={{ fontSize: "0.75rem" }}>
                      {d.labels
                        ? Object.entries(d.labels)
                            .map(([k, v]) => `${k}: ${v}`)
                            .join(", ")
                        : "N/A"}
                    </StyledTableCell>
                  </StyledTableRow>
                ))
            )}
          </TableBody>
        </Table>

        <TablePagination
          component="div"
          count={deployments.length}
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

export default Deployments;
