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
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { styled, useTheme } from "@mui/material/styles";
import { tableCellClasses } from "@mui/material/TableCell";
import apiClient from "../Axios";
import "../Pages/style.css"; 
import { useNavigate } from "react-router-dom";

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

// ------------------ PersistentVolumes Component ------------------
const PersistentVolumes = () => {
  const [allPVs, setAllPVs] = useState([]);
  const [persistentVolumes, setPersistentVolumes] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
   const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

  const [namespacesForDropdown, setNamespacesForDropdown] = useState(["all"]);
  const [selectedNamespace, setSelectedNamespace] = useState("all");

  const navigate = useNavigate();
  const theme = useTheme();

  // Fetch PVs
  useEffect(() => {
    const fetchPVs = async () => {
      setLoading(true);
      try {
        const response = await apiClient.get("/persistent-volumes/");
        const data = response.data;
        setAllPVs(data);

        // Extract unique namespaces from claim
        const namespaces = [
          "all",
          ...new Set(
            data
              .map((pv) =>
                pv.claim && pv.claim.includes("/") ? pv.claim.split("/")[0] : null
              )
              .filter(Boolean)
          ),
        ];
        setNamespacesForDropdown(namespaces);
      } catch (err) {
        console.error("Error fetching persistent volumes:", err);
        setAllPVs([]);
        setNamespacesForDropdown(["all"]);
      } finally {
        setLoading(false);
      }
    };
    fetchPVs();
  }, []);

  // Filter PVs
  useEffect(() => {
    let filtered = allPVs;

    if (selectedNamespace !== "all") {
      filtered = filtered.filter(
        (pv) => pv.claim && pv.claim.split("/")[0] === selectedNamespace
      );
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((pv) =>
        Object.values(pv).some((val) =>
          JSON.stringify(val).toLowerCase().includes(q)
        )
      );
    }

    setPersistentVolumes(filtered);
    setPage(0);
  }, [allPVs, selectedNamespace, searchQuery]);

  const handleChangePage = (_, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (e) => {
    setRowsPerPage(+e.target.value);
    setPage(0);
  };

  const numberOfColumns = 9;
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
      {/* -------- Header + Search + Namespace Dropdown -------- */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <h1>Persistent Volumes</h1>

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
            label="Search PVs..."
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
            "& td, & th": { border: "none !important" },
          }}
        >
          <TableHead>
            <TableRow>
              <StyledTableCell>Name</StyledTableCell>
              <StyledTableCell>Capacity</StyledTableCell>
              <StyledTableCell>Access Modes</StyledTableCell>
              <StyledTableCell>Reclaim Policy</StyledTableCell>
              <StyledTableCell>Status</StyledTableCell>
              <StyledTableCell>Claim</StyledTableCell>
              <StyledTableCell>Storage Class</StyledTableCell>
              <StyledTableCell>Reason</StyledTableCell>
              <StyledTableCell>Created</StyledTableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {loading ? (
              <StyledTableRow>
                
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
                .map((pv, i) => (
                  <StyledTableRow key={pv.name || i}>
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
                        onClick={() =>
                          navigate(
                            `/app/kubernetes/persistent-volume-details/${pv.name}`
                          )
                        }
                      >
                        {pv.name}
                      </Typography>
                    </StyledTableCell>
                    <StyledTableCell>{pv.capacity || "N/A"}</StyledTableCell>
                    <StyledTableCell>
                      {pv.access_modes?.join(", ") || "N/A"}
                    </StyledTableCell>
                    <StyledTableCell>{pv.reclaim_policy || "N/A"}</StyledTableCell>
                    <StyledTableCell>{pv.status || "N/A"}</StyledTableCell>
                    <StyledTableCell>{pv.claim || "N/A"}</StyledTableCell>
                    <StyledTableCell>{pv.storage_class || "N/A"}</StyledTableCell>
                    <StyledTableCell>{pv.reason || "N/A"}</StyledTableCell>
                    <StyledTableCell sx={{ color: theme.palette.text.secondary }}>
                        {pv.created || "N/A"}
                      </StyledTableCell>

                  </StyledTableRow>
                ))
            )}
          </TableBody>
        </Table>

        <TablePagination
          component="div"
          count={persistentVolumes.length}
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

export default PersistentVolumes;
