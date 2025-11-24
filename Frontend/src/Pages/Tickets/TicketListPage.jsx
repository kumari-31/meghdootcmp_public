import React, { useEffect, useState } from "react";
import {
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Select,
  MenuItem,
  TextField,
  Button,
  Stack,
  Chip,
} from "@mui/material";
import apiClient from "../../Axios";

const statusColor = {
  Open: "info",
  "In Progress": "warning",
  Resolved: "success",
  Closed: "default",
};

const TicketListPage = () => {
  const [tickets, setTickets] = useState([]);
  const [editRowId, setEditRowId] = useState(null);
  const [form, setForm] = useState({ status: "", solution: "" });

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const res = await apiClient.get("/tickets/");
      const sorted = res.data.sort((a, b) => {
        const priority = { Open: 0, "In Progress": 1, Resolved: 2, Closed: 3 };
        return priority[a.status] - priority[b.status];
      });
      setTickets(sorted);
    } catch (err) {
      console.error("Failed to fetch tickets", err);
    }
  };

  const handleEdit = (ticket) => {
    setEditRowId(ticket.id);
    setForm({
      status: ticket.status,
      solution: ticket.solution || "",
    });
  };

  const handleUpdate = async (id) => {
    try {
      await apiClient.patch(`/tickets/update/${id}/`, form);
      setEditRowId(null);
      setForm({ status: "", solution: "" });
      fetchTickets();
    } catch (err) {
      console.error("Failed to update ticket", err);
    }
  };

  return (
    <Paper sx={{ p: 4, maxWidth: "100%", mx: "auto", mt: 4 }}>
      <Typography variant="h5" gutterBottom>
        Ticket Management
      </Typography>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>
                <strong>Issue</strong>
              </TableCell>
              <TableCell>
                <strong>Description</strong>
              </TableCell>
              <TableCell>
                <strong>Employee</strong>
              </TableCell>
              <TableCell>
                <strong>Status</strong>
              </TableCell>
              <TableCell>
                <strong>Solution</strong>
              </TableCell>
              <TableCell>
                <strong>Action</strong>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tickets.map((ticket) => (
              <TableRow key={ticket.id}>
                <TableCell>{ticket.issue}</TableCell>
                <TableCell>{ticket.description}</TableCell>
                <TableCell>
                  {ticket.employee_name} <br />
                  <small>{ticket.employee_email}</small>
                </TableCell>
                <TableCell>
                  {editRowId === ticket.id ? (
                    <Select
                      value={form.status}
                      onChange={(e) =>
                        setForm({ ...form, status: e.target.value })
                      }
                      fullWidth
                    >
                      {["Open", "In Progress", "Closed"].map(
                        (status) => (
                          <MenuItem key={status} value={status}>
                            {status}
                          </MenuItem>
                        )
                      )}
                    </Select>
                  ) : (
                    <Chip
                      label={ticket.status}
                      color={statusColor[ticket.status] || "default"}
                      size="small"
                    />
                  )}
                </TableCell>
                <TableCell sx={{ maxWidth: 300 }}>
                  {editRowId === ticket.id ? (
                    <TextField
                      fullWidth
                      multiline
                      minRows={2}
                      value={form.solution}
                      onChange={(e) =>
                        setForm({ ...form, solution: e.target.value })
                      }
                    />
                  ) : (
                    ticket.solution || "-"
                  )}
                </TableCell>
                <TableCell>
                  {["Open", "In Progress"].includes(ticket.status) && (
                    <>
                      {editRowId === ticket.id ? (
                        <Stack direction="row" spacing={1}>
                          <Button
                            variant="contained"
                            size="small"
                            onClick={() => handleUpdate(ticket.id)}
                          >
                            Save
                          </Button>
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => setEditRowId(null)}
                          >
                            Cancel
                          </Button>
                        </Stack>
                      ) : (
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => handleEdit(ticket)}
                        >
                          Edit
                        </Button>
                      )}
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {tickets.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  No tickets found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default TicketListPage;
