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
  Chip,
  CircularProgress,
  Box,
} from "@mui/material";
import apiClient from "../../Axios"; 

const statusColor = {
  Open: "info",
  "In Progress": "warning",
  Closed: "success",
};

const TicketDetailview = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTickets = async () => {
    try {
      const res = await apiClient.get("/tickets/");
      const sorted = res.data.sort((a, b) => {
        const order = { Open: 0, "In Progress": 1, Closed: 2 };
        return order[a.status] - order[b.status];
      });
      setTickets(sorted);
    } catch (error) {
      console.error("Error fetching tickets:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  return (
    <Paper sx={{ p: 4, maxWidth: 1000, mx: "auto", mt: 4 }}>
      <Typography variant="h5" gutterBottom>
        My Ticket Status
      </Typography>
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>Issue</strong></TableCell>
                <TableCell><strong>Solution</strong></TableCell>
                <TableCell><strong>Status</strong></TableCell>
                <TableCell><strong>Ticket Raised Time</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tickets.map((ticket) => (
                <TableRow key={ticket.id}>
                  <TableCell>{ticket.issue}</TableCell>
                  <TableCell>{ticket.solution}</TableCell>
                  <TableCell>
                    <Chip
                      label={ticket.status}
                      color={statusColor[ticket.status] || "default"}
                    />
                  </TableCell>
                  <TableCell>
                    {new Date(ticket.created_at).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Paper>
  );
};

export default TicketDetailview;






































// // TicketDetailView.js
// import React, { useState } from "react";
// import {
//   Box,
//   Typography,
//   Paper,
//   Divider,
//   TextField,
//   Button,
//   Stack,
// } from "@mui/material";

// const TicketDetailView = ({ ticket, onBack }) => {
//   const [comments, setComments] = useState([
//     { user: "Admin", text: "We're looking into this.", timestamp: "2024-01-01" },
//   ]);
//   const [newComment, setNewComment] = useState("");

//   if (!ticket) {
//     return (
//       <Paper sx={{ p: 4, maxWidth: 800, mx: "auto", mt: 4 }}>
//         <Typography variant="h6">No ticket selected</Typography>
//         <Button onClick={onBack} variant="outlined" sx={{ mt: 2 }}>
//           Back to Ticket List
//         </Button>
//       </Paper>
//     );
//   }

//   const handleComment = () => {
//     const comment = {
//       user: "You",
//       text: newComment,
//       timestamp: new Date().toLocaleString(),
//     };
//     setComments([...comments, comment]);
//     setNewComment("");
//   };

//   return (
//     <Paper sx={{ p: 4, maxWidth: 800, mx: "auto", mt: 4 }}>
//       <Typography variant="h5" gutterBottom>
//         {ticket.subject}
//       </Typography>
//       <Typography variant="subtitle1" gutterBottom>
//         Category: {ticket.category} | Status: {ticket.status}
//       </Typography>
//       <Typography variant="body1" gutterBottom>
//         {ticket.description || "No description provided."}
//       </Typography>
//       <Divider sx={{ my: 2 }} />
//       <Typography variant="h6">Comments</Typography>
//       <Box>
//         {comments.map((comment, index) => (
//           <Box key={index} sx={{ my: 1 }}>
//             <Typography variant="body2" color="text.secondary">
//               {comment.user} • {comment.timestamp}
//             </Typography>
//             <Typography variant="body1">{comment.text}</Typography>
//           </Box>
//         ))}
//       </Box>
//       <Stack spacing={2} mt={2}>
//         <TextField
//           label="Add a comment"
//           multiline
//           rows={3}
//           fullWidth
//           value={newComment}
//           onChange={(e) => setNewComment(e.target.value)}
//         />
//         <Button variant="contained" onClick={handleComment}>
//           Post Comment
//         </Button>
//         <Button variant="outlined" onClick={onBack}>
//           Back to Ticket List
//         </Button>
//       </Stack>
//     </Paper>
//   );
// };

// export default TicketDetailView;
