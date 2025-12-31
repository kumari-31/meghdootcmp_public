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
} from "@mui/material";

const dummyTickets = [
  { id: 1, subject: "Can't access VM", category: "VM Access", user: "user1", status: "Open" },
  { id: 2, subject: "K8s pod crash", category: "K8s Issue", user: "user2", status: "In Progress" },
];

const statusOptions = ["Open", "In Progress", "Resolved", "Closed"];

const AdminTicketDashboard = () => {
  const [tickets, setTickets] = useState([]);
  const [replies, setReplies] = useState({});
  const [statuses, setStatuses] = useState({});

  useEffect(() => {
    setTickets(dummyTickets);
    const initialStatus = {};
    dummyTickets.forEach((t) => (initialStatus[t.id] = t.status));
    setStatuses(initialStatus);
  }, []);

  const handleStatusChange = (id, value) => {
    setStatuses({ ...statuses, [id]: value });
  };

  const handleReplyChange = (id, value) => {
    setReplies({ ...replies, [id]: value });
  };

  const handleUpdate = (id) => {
    // console.log("Updating ticket", {
    //   id,
    //   status: statuses[id],
    //   reply: replies[id] || "",
    // });
   
  };

  return (
    <Paper sx={{ p: 4, mt: 4 }}>
      <Typography variant="h5" gutterBottom>
        Admin Ticket Dashboard
      </Typography>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Subject</TableCell>
              <TableCell>User</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Reply</TableCell>
              <TableCell>Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tickets.map((ticket) => (
              <TableRow key={ticket.id}>
                <TableCell>{ticket.subject}</TableCell>
                <TableCell>{ticket.user}</TableCell>
                <TableCell>{ticket.category}</TableCell>
                <TableCell>
                  <Select
                    value={statuses[ticket.id]}
                    onChange={(e) => handleStatusChange(ticket.id, e.target.value)}
                    size="small"
                  >
                    {statusOptions.map((opt) => (
                      <MenuItem key={opt} value={opt}>
                        {opt}
                      </MenuItem>
                    ))}
                  </Select>
                </TableCell>
                <TableCell>
                  <TextField
                    size="small"
                    fullWidth
                    value={replies[ticket.id] || ""}
                    onChange={(e) => handleReplyChange(ticket.id, e.target.value)}
                  />
                </TableCell>
                <TableCell>
                  <Button
                    variant="contained"
                    size="small"
                    onClick={() => handleUpdate(ticket.id)}
                  >
                    Update
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default AdminTicketDashboard;