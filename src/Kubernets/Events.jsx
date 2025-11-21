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
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { styled } from "@mui/material/styles";
import { tableCellClasses } from "@mui/material/TableCell";
import apiClient from "../Axios";

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
    color:"#000",
  },
}));

const StyledTableRow = styled(TableRow)(({ theme }) => ({
  backgroundColor: theme.palette.grey[100], // Default background for even rows
  "&:nth-of-type(odd)": {
    backgroundColor: theme.palette.grey[300], // Alternate row color
  },
  "&:last-child td, &:last-child th": {
    border: 0,
  },
}));

const Events = () => {
  const [events, setEvents] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchEvents = async () => {
    try {
      const response = await apiClient.get("/k8s/events/");
      const data = response.data.events.slice(-100); // Get the latest 100 events
      setEvents(data);
    } catch (error) {
      console.error("Error fetching events:", error);
    }finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

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

  const filteredEvents = events.filter((event) =>
    Object.values(event).some(
      (value) =>
        typeof value === "string" &&
        value.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  return (
    <Paper
      sx={{
        width: "90%",
        margin: "20px auto",
        padding: "20px",
        borderRadius: "10px",
        boxShadow: 3,
      }}
    >
      <Typography
        variant="h5"
        sx={{ marginBottom: 2, textAlign: "left", fontWeight: "bold" }}
      >
        Kubernetes Events
      </Typography>
      <TextField
        label="Search"
        variant="outlined"
        margin="dense"
        // fullWidth
        sx={{ mb: 2, px: 0, width: "20%", float: "right" }}
        value={searchQuery}
        onChange={handleSearchChange}
        slotProps={{
          input: {
            endAdornment: (
              <InputAdornment position="end">
                <SearchIcon />
              </InputAdornment>
            ),
          },
        }}
      />
      <TableContainer sx={{ maxHeight: 600 }}>
        <Table stickyHeader aria-label="sticky table">
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
                <StyledTableCell colSpan={5} align="center">
                  Loading...
                </StyledTableCell>
              </StyledTableRow>
            ) : filteredEvents.length === 0 ? (
              <StyledTableRow>
                <StyledTableCell colSpan={5} align="center">
                  No Data Found
                </StyledTableCell>
              </StyledTableRow>
            ) : (
            filteredEvents
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((event, index) => (
                <StyledTableRow  key={index}>
                  <StyledTableCell>{event.name}</StyledTableCell>
                  <StyledTableCell>{event.reason}</StyledTableCell>
                  <StyledTableCell>{event.message}</StyledTableCell>
                  <StyledTableCell>{event.source}</StyledTableCell>
                  <StyledTableCell>{event.object}</StyledTableCell>
                  <StyledTableCell>{event.count}</StyledTableCell>
                  <StyledTableCell>{event.first_seen}</StyledTableCell>
                  <StyledTableCell>{event.last_seen}</StyledTableCell>
                </StyledTableRow  >
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[10, 25, 50]}
        component="div"
        count={filteredEvents.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </Paper>
  );
};

export default Events;
