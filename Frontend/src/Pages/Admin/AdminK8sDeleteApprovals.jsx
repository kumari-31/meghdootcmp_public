import React, { useEffect, useState } from "react";
import apiClient from "../../Axios";
import { GoAlert } from "react-icons/go";
import "../style.css"; 

import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Box,
  Snackbar,
  Alert,
  Slide,
  TablePagination,
  Typography,
  Chip,
  styled,
  tableCellClasses,
  useTheme,
} from "@mui/material";

import {
  CheckCircleOutline,
  ErrorOutline,
  InfoOutlined,
  WarningOutlined,
  DeleteForever,
  Cancel,
} from "@mui/icons-material";

// --- Styled Components (Shared with VM page) ---
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

const AdminK8sDeleteApprovals = () => {
  const theme = useTheme();

  // State
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  // Snackbar
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");

  const showSnackbar = (message, severity) => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const handleSnackbarClose = () => setSnackbarOpen(false);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get("/k8s/pods/delete/pending/");
      setRequests(response.data.data || []);
    } catch (err) {
      console.error("Failed to fetch delete requests", err);
      setError("Failed to fetch delete requests.");
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id, approve) => {
    try {
      const res = await apiClient.post("/k8s/admin/delete-k8s/", {
        id: id,
        approve: approve,
      });

      showSnackbar(res.data.message || "Action processed successfully!", "success");
      fetchRequests();
    } catch (err) {
      console.error("Action failed:", err);
      const errMsg = err.response?.data?.error || "Action failed!";
      showSnackbar(errMsg, "error");
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const getAlertIcon = (severity) => {
    switch (severity) {
      case "success": return <CheckCircleOutline sx={{ mr: 1 }} />;
      case "error": return <ErrorOutline sx={{ mr: 1 }} />;
      case "warning": return <WarningOutlined sx={{ mr: 1 }} />;
      default: return <InfoOutlined sx={{ mr: 1 }} />;
    }
  };

  if (loading) {
    return (
      <div className="cloud-container">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="7.87722 9.61948 33.01 16.88">
          <path d="M 12 26 H 37 C 42 26 41 20 37 20 C 38 18 37 15 33 16 C 32 8 15 8 14 17 C 8 16 6 25 12 26" className="cloud-back" />
          <path d="M 12 26 H 37 C 42 26 41 20 37 20 C 38 18 37 15 33 16 C 32 8 15 8 14 17 C 8 16 6 25 12 26" className="cloud-front" />
        </svg>
        <div className="loading-message">Loading K8s Requests...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-message">
        <GoAlert />
        <h2>❌ Connection Error</h2>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: "bold", color: theme.palette.text.primary }}>
          K8s Deletion Approvals
        </Typography>
      </Box>

      <TableContainer
        component={Paper}
        sx={{
          width: "fit-content",
          minWidth: "85%",
          maxWidth: "100%",
          margin: "0 auto",
          boxShadow: theme.shadows[3],
          borderRadius: 2,
          overflow: "hidden"
        }}
      >
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <StyledTableCell>Sr. No.</StyledTableCell>
              <StyledTableCell>App Name</StyledTableCell>
              <StyledTableCell>Project</StyledTableCell>
              <StyledTableCell>Requester</StyledTableCell>
              <StyledTableCell>Reason</StyledTableCell>
              <StyledTableCell>Port</StyledTableCell>
              <StyledTableCell>Actions</StyledTableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {requests.length === 0 ? (
              <StyledTableRow>
                <StyledTableCell colSpan={7}>No pending K8s deletion requests.</StyledTableCell>
              </StyledTableRow>
            ) : (
              requests
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((req, index) => (
                  <StyledTableRow key={req.id}>
                    <StyledTableCell>{page * rowsPerPage + index + 1}</StyledTableCell>
                    <StyledTableCell>
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>{req.app_name}</Typography>
                      <Typography variant="caption" color="textSecondary">{req.service_name}</Typography>
                    </StyledTableCell>
                    <StyledTableCell>{req.project_name}</StyledTableCell>
                    <StyledTableCell>
                      {req.requester} <br />
                      <small style={{ color: "gray" }}>{req.email}</small>
                    </StyledTableCell>
                    <StyledTableCell sx={{ fontStyle: "italic" }}>
                      {req.reason || "N/A"}
                    </StyledTableCell>
                    <StyledTableCell>
                      <Chip label={req.node_port || "N/A"} size="small" variant="outlined" />
                    </StyledTableCell>

                    <StyledTableCell>
                      <Box display="flex" justifyContent="center" gap={1}>
                        <Button
                          variant="contained"
                          color="success"
                          size="small"
                          startIcon={<CheckCircleOutline />}
                          onClick={() => handleAction(req.id, true)}
                        >
                          Approve
                        </Button>
                        <Button
                          variant="contained"
                          color="error"
                          size="small"
                          startIcon={<Cancel />}
                          onClick={() => handleAction(req.id, false)}
                        >
                          Reject
                        </Button>
                      </Box>
                    </StyledTableCell>
                  </StyledTableRow>
                ))
            )}
          </TableBody>
        </Table>

        <Box sx={{ display: "flex", justifyContent: "flex-end", p: 1 }}>
          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={requests.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
          />
        </Box>
      </TableContainer>

      {/* Snackbar Notifications */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
        TransitionComponent={Slide}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity={snackbarSeverity}
          sx={{ width: "100%", display: "flex", alignItems: "center" }}
        >
          {getAlertIcon(snackbarSeverity)}
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default AdminK8sDeleteApprovals;