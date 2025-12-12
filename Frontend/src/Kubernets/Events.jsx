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
  Stack,
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

// ---------------- Events Component ----------------
const Events = () => {
  const [events, setEvents] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(7);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const theme = useTheme();

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get("/k8s/events/");
      const data = response.data.events.slice(-100); // latest 100 events
      setEvents(data);
    } catch (error) {
      console.error("Error fetching events:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleChangePage = (_, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (e) => {
    setRowsPerPage(+e.target.value);
    setPage(0);
  };
  const handleSearchChange = (e) => setSearchQuery(e.target.value);

  const filteredEvents = events.filter((event) =>
    Object.values(event).some(
      (val) =>
        (typeof val === "string" || typeof val === "number") &&
        val.toString().toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  const numberOfColumns = 8;

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
        <h1>Kubernetes Events</h1>
        <TextField
          label="Search Events..."
          value={searchQuery}
          onChange={handleSearchChange}
          variant="outlined"
          size="small"
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
        }}
      >
        <Table
          stickyHeader
          sx={{
            width: "100%",
            minWidth: 650,
            "& td, & th": { border: "none !important" },
          }}
        >
          <TableHead>
            <TableRow>
              <StyledTableCell>Name</StyledTableCell>
              <StyledTableCell>Reason</StyledTableCell>
              <StyledTableCell>Message</StyledTableCell>
              <StyledTableCell>Source</StyledTableCell>
              <StyledTableCell>Object</StyledTableCell>
              <StyledTableCell>Count</StyledTableCell>
              <StyledTableCell>First Seen</StyledTableCell>
              <StyledTableCell>Last Seen</StyledTableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {loading ? (
              <StyledTableRow>
                <StyledTableCell colSpan={numberOfColumns} align="center">
                  <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
                    <CircularProgress />
                  </Box>
                </StyledTableCell>
              </StyledTableRow>
            ) : filteredEvents.length === 0 ? (
              <StyledTableRow>
                <StyledTableCell colSpan={numberOfColumns} align="center">
                  No Events Found
                </StyledTableCell>
              </StyledTableRow>
            ) : (
              filteredEvents
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((event, index) => (
                  <StyledTableRow key={index}>
                    <StyledTableCell>{event.name}</StyledTableCell>
                    <StyledTableCell>{event.reason}</StyledTableCell>
                    <StyledTableCell>{event.message}</StyledTableCell>
                    <StyledTableCell>{event.source}</StyledTableCell>
                    <StyledTableCell>{event.object}</StyledTableCell>
                    <StyledTableCell>{event.count}</StyledTableCell>
                    <StyledTableCell>{event.first_seen}</StyledTableCell>
                    <StyledTableCell>{event.last_seen}</StyledTableCell>
                  </StyledTableRow>
                ))
            )}
          </TableBody>
        </Table>

        <TablePagination
          component="div"
          count={filteredEvents.length}
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

export default Events;
