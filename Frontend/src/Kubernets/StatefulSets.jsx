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
import { useNavigate } from "react-router-dom";
import "../Pages/style.css"; // For cloud loader


// ------------------ Styled Table ------------------
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
  "&:last-child td, &:last-child th": { border: 0 },
}));

// ------------------ StatefulSets Component ------------------
const StatefulSets = () => {
  const [allStatefulSets, setAllStatefulSets] = useState([]);
  const [statefulSets, setStatefulSets] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
   const [error, setError] = useState(null);
  const [namespacesForDropdown, setNamespacesForDropdown] = useState(["all"]);
  const [selectedNamespace, setSelectedNamespace] = useState("all");

  const navigate = useNavigate();
  const theme = useTheme();

  // Fetch StatefulSets
  useEffect(() => {
    const fetchStatefulSets = async () => {
      setLoading(true);
      try {
        const response = await apiClient.get("/k8s/statefulsets/");
        const data = response.data.stateful_sets || [];
        setAllStatefulSets(data);

        const namespaces = [
          "all",
          ...new Set(data.map((ss) => ss.namespace).filter(Boolean)),
        ];
        setNamespacesForDropdown(namespaces);
      } catch (err) {
        console.error("Error fetching StatefulSets:", err);
        setAllStatefulSets([]);
        setNamespacesForDropdown(["all"]);
      } finally {
        setLoading(false);
      }
    };
    fetchStatefulSets();
  }, []);

  // Filter StatefulSets
  useEffect(() => {
    let filtered = allStatefulSets;

    if (selectedNamespace !== "all") {
      filtered = filtered.filter((ss) => ss.namespace === selectedNamespace);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((ss) =>
        Object.values(ss).some((val) =>
          JSON.stringify(val).toLowerCase().includes(q)
        )
      );
    }

    setStatefulSets(filtered);
    setPage(0);
  }, [allStatefulSets, selectedNamespace, searchQuery]);

  const handleChangePage = (_, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (e) => {
    setRowsPerPage(+e.target.value);
    setPage(0);
  };
  const handleSearchChange = (e) => setSearchQuery(e.target.value);
  const handleChangeNamespace = (e) => setSelectedNamespace(e.target.value);
  const handleStatefulSetClick = (name, namespace) =>
    navigate(`/app/kubernetes/statefulset-details/${name}?namespace=${namespace}`);

  const numberOfColumns = 6; // Name, Namespace, Images, Labels, Pods, Created

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
      {/* Header + Search + Namespace */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <h1>Stateful Sets</h1>
        <div style={{ display: "flex", gap: "15px", alignItems: "center" }}>
          <FormControl sx={{ minWidth: 180 }}>
            <InputLabel>Namespace</InputLabel>
            <Select
              value={selectedNamespace}
              label="Namespace"
              onChange={handleChangeNamespace}
            >
              {namespacesForDropdown.map((ns) => (
                <MenuItem value={ns} key={ns}>
                  {ns === "all" ? "All Namespaces" : ns}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            label="Search StatefulSets..."
            value={searchQuery}
            onChange={handleSearchChange}
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

      {/* Table */}
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
            "& td, & th": { border: "none !important" },
          }}
        >
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
                .map((ss, i) => (
                  <StyledTableRow key={ss.name || i}>
                    <StyledTableCell>
                      <Typography
                        component="span"
                        sx={{
                          cursor: "pointer",
                          color: theme.palette.primary.main,
                          fontWeight: "bold",
                          textUnderlineOffset: "3px",
                          "&:hover": { textDecoration: "underline" },
                        }}
                        onClick={() => handleStatefulSetClick(ss.name, ss.namespace)}
                      >
                        {ss.name}
                      </Typography>
                    </StyledTableCell>
                    <StyledTableCell>{ss.namespace}</StyledTableCell>
                    <StyledTableCell>{ss.images?.join(", ") || "N/A"}</StyledTableCell>
                    <StyledTableCell>
                      {ss.labels
                        ? Object.entries(ss.labels).map(([k, v]) => `${k}: ${v}`).join(", ")
                        : "N/A"}
                    </StyledTableCell>
                    <StyledTableCell>{ss.pods}</StyledTableCell>
                    <StyledTableCell>{ss.created || "N/A"}</StyledTableCell>
                  </StyledTableRow>
                ))
            )}
          </TableBody>
        </Table>

        <TablePagination
          component="div"
          count={statefulSets.length}
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

export default StatefulSets;
