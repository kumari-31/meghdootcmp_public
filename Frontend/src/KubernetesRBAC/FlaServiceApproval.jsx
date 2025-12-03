import {
  Paper,
  TextField,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Button,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import { tableCellClasses } from "@mui/material/TableCell";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import { useEffect, useState } from "react";
import apiClient from "../Axios";

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
    color: "#000",
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
}));

const FlaServiceApproval = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [counts, setCounts] = useState({
    pending: 0,
    accepted: 0,
    rejected: 0,
  });
  const [alertDialog, setAlertDialog] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const [rejectDialog, setRejectDialog] = useState({
    open: false,
    requestId: null,
    reason: "",
  });

  const [statusDialog, setStatusDialog] = useState({
    open: false,
    status: "",
    data: [],
  });

  // ✔ Move fetchRequests outside useEffect so it can be reused
  const fetchRequests = async () => {
    try {
      const response = await apiClient.get("/fla/service-requests/");
      const data = response.data.data;

      // Sort latest → oldest
      data.sort(
        (a, b) => new Date(b.request_timestamp) - new Date(a.request_timestamp)
      );

      const pending = data.filter((req) => req.fla_status === "Pending");
      const accepted = data.filter((req) => req.fla_status === "Accepted");
      const rejected = data.filter((req) => req.fla_status === "Rejected");

      setRequests(data);
      setCounts({
        pending: pending.length,
        accepted: accepted.length,
        rejected: rejected.length,
      });
    } catch (err) {
      setError("Failed to fetch service requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleStatusUpdate = async (requestId, status) => {
    try {
      const response = await apiClient.put("/fla/service-requests/", {
        request_id: requestId,
        status,
      });

      if (response.status === 200) {
        await fetchRequests(); // Auto refresh table

        setAlertDialog({
          open: true,
          message: `Request ${status} successfully.`,
          severity: "success",
        });
      } else {
        setAlertDialog({
          open: true,
          message: "Failed to update status.",
          severity: "error",
        });
      }
    } catch (err) {
      console.error("Update error:", err);
      setAlertDialog({
        open: true,
        message: "Error occurred while updating status.",
        severity: "error",
      });
    }
  };

  const handleReject = async () => {
    try {
      const response = await apiClient.post("/service-request/reject/", {
        service_request_id: rejectDialog.requestId,
        rejection_reason: rejectDialog.reason,
      });

      if (response.status === 200) {
        await fetchRequests(); // auto refresh

        setAlertDialog({
          open: true,
          message: "Request rejected successfully.",
          severity: "success",
        });
        setRejectDialog({ open: false, requestId: null, reason: "" });
      }
    } catch (err) {
      console.error("Reject error:", err);
      setAlertDialog({
        open: true,
        message: "Error occurred while rejecting.",
        severity: "error",
      });
    }
  };

  const emptyRows =
    rowsPerPage - Math.min(rowsPerPage, requests.length - page * rowsPerPage);

  if (loading) return <div>Loading...</div>;
  if (error) return <div style={{ color: "red" }}>{error}</div>;

  return (
    <>
      {/* Count Cards */}
      <Stack
        direction="row"
        spacing={3}
        justifyContent="flex-start"
        sx={{ width: "90%", mx: "auto", mt: 4, mb: 2 }}
      >
        {/* Pending */}
        <Paper
          elevation={3}
          sx={{
            p: 2,
            minWidth: 250,
            minHeight: 150,
            backgroundColor: "#e3f2fd",
          }}
        >
          <Typography variant="subtitle1">Total Pending Request</Typography>
          <Typography variant="h3" color="primary">
            {counts.pending}
          </Typography>
        </Paper>

        {/* Accepted */}
        <Paper
          elevation={3}
          sx={{
            p: 2,
            minWidth: 250,
            backgroundColor: "#e8f5e9",
            cursor: "pointer",
          }}
          onClick={() => {
            const approvedList = requests.filter(
              (req) => req.fla_status === "Accepted"
            );
            setStatusDialog({
              open: true,
              status: "Accepted",
              data: approvedList,
            });
          }}
        >
          <Typography variant="subtitle1">Total Approved Request</Typography>
          <Typography variant="h3" color="success.main">
            {counts.accepted}
          </Typography>
        </Paper>

        {/* Rejected */}
        <Paper
          elevation={3}
          sx={{
            p: 2,
            minWidth: 250,
            backgroundColor: "#ffebee",
            cursor: "pointer",
          }}
          onClick={() => {
            const rejectedList = requests.filter(
              (req) => req.fla_status === "Rejected"
            );
            setStatusDialog({
              open: true,
              status: "Rejected",
              data: rejectedList,
            });
          }}
        >
          <Typography variant="subtitle1">Total Rejected Request</Typography>
          <Typography variant="h3" color="error.main">
            {counts.rejected}
          </Typography>
        </Paper>
      </Stack>

      {/* Pending Table */}
      <Paper
        sx={{
          width: "90%",
          margin: "20px auto",
          padding: "20px",
          borderRadius: "10px",
          boxShadow: 3,
        }}
      >
        <Typography variant="h5" sx={{ mb: 2, fontWeight: "bold" }}>
          Pending Service Requests for Approval
        </Typography>

        <TableContainer component={Paper} sx={{ maxHeight: 380 }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <StyledTableCell>Sr. No.</StyledTableCell>
                <StyledTableCell>Name</StyledTableCell>
                <StyledTableCell>Service</StyledTableCell>
                <StyledTableCell>App Name</StyledTableCell>
                <StyledTableCell>Project</StyledTableCell>
                <StyledTableCell>Designation</StyledTableCell>
                <StyledTableCell>Purpose</StyledTableCell>
                <StyledTableCell>Request Time</StyledTableCell>
                <StyledTableCell>Actions</StyledTableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {requests
                .filter((req) => req.fla_status === "Pending")
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((request, index) => (
                  <StyledTableRow key={request.id}>
                    <StyledTableCell>
                      {page * rowsPerPage + index + 1}
                    </StyledTableCell>
                    <StyledTableCell>{request.name}</StyledTableCell>
                    <StyledTableCell>{request.service_name}</StyledTableCell>
                    <StyledTableCell>{request.app_name}</StyledTableCell>
                    <StyledTableCell>{request.project_name}</StyledTableCell>
                    <StyledTableCell>{request.designation}</StyledTableCell>
                    <StyledTableCell>
                      {request.purpose_of_request}
                    </StyledTableCell>
                    <StyledTableCell>
                      {new Date(request.request_timestamp).toLocaleString(
                        "en-IN",
                        {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true,
                        }
                      )}
                    </StyledTableCell>


                    <StyledTableCell>
                      <Stack
                        direction="row"
                        spacing={1}
                        justifyContent="center"
                      >
                        <Button
                          variant="contained"
                          color="success"
                          size="small"
                          onClick={() =>
                            handleStatusUpdate(request.id, "Accepted")
                          }
                        >
                          Accept
                        </Button>

                        <Button
                          variant="contained"
                          color="error"
                          size="small"
                          onClick={() =>
                            setRejectDialog({
                              open: true,
                              requestId: request.id,
                              reason: "",
                            })
                          }
                        >
                          Reject
                        </Button>
                      </Stack>
                    </StyledTableCell>
                  </StyledTableRow>
                ))}

              {emptyRows > 0 && (
                <TableRow style={{ height: 53 * emptyRows }}>
                  <TableCell colSpan={9} />
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={requests.filter((r) => r.fla_status === "Pending").length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
        />
      </Paper>

      {/* Alert Dialog */}
      <Dialog
        open={alertDialog.open}
        onClose={() => setAlertDialog({ ...alertDialog, open: false })}
      >
        <DialogTitle sx={{ textAlign: "center", p: 3 }}>
          {alertDialog.severity === "success" ? (
            <CheckCircleIcon color="success" sx={{ fontSize: 60 }} />
          ) : (
            <ErrorIcon color="error" sx={{ fontSize: 60 }} />
          )}
        </DialogTitle>

        <DialogContent sx={{ textAlign: "center", px: 6 }}>
          <Typography variant="h6">
            {alertDialog.severity === "success" ? "Success" : "Error"}
          </Typography>
          <Typography>{alertDialog.message}</Typography>
        </DialogContent>

        <DialogActions sx={{ justifyContent: "center", pb: 3 }}>
          <Button
            onClick={() => setAlertDialog({ ...alertDialog, open: false })}
            variant="contained"
            color={alertDialog.severity}
          >
            OK
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog
        open={rejectDialog.open}
        onClose={() =>
          setRejectDialog({ open: false, requestId: null, reason: "" })
        }
      >
        <Typography sx={{ p: 2 }}>Rejection Reason</Typography>

        <DialogContent sx={{ minWidth: 500, pt: 2 }}>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Enter rejection reason"
            value={rejectDialog.reason}
            onChange={(e) =>
              setRejectDialog((prev) => ({ ...prev, reason: e.target.value }))
            }
          />
        </DialogContent>

        <DialogActions>
          <Button
            onClick={() =>
              setRejectDialog({ open: false, requestId: null, reason: "" })
            }
          >
            Cancel
          </Button>

          <Button
            onClick={handleReject}
            color="error"
            variant="contained"
            disabled={!rejectDialog.reason.trim()}
          >
            Submit
          </Button>
        </DialogActions>
      </Dialog>

      {/* Status Dialog (Accepted / Rejected) */}
      <Dialog
        open={statusDialog.open}
        onClose={() => setStatusDialog({ open: false, status: "", data: [] })}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>{statusDialog.status} Requests</DialogTitle>

        <DialogContent dividers>
          {statusDialog.data.length > 0 ? (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <StyledTableCell>Sr. No.</StyledTableCell>
                    <StyledTableCell>Name</StyledTableCell>
                    <StyledTableCell>Service</StyledTableCell>
                    <StyledTableCell>Project</StyledTableCell>
                    <StyledTableCell>Designation</StyledTableCell>
                    <StyledTableCell>Purpose</StyledTableCell>
                    <StyledTableCell>Request Time</StyledTableCell>
                    <StyledTableCell>Status</StyledTableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {statusDialog.data.map((request, index) => (
                    <StyledTableRow key={request.id}>
                      <StyledTableCell>{index + 1}</StyledTableCell>
                      <StyledTableCell>{request.name}</StyledTableCell>
                      <StyledTableCell>{request.service_name}</StyledTableCell>
                      <StyledTableCell>{request.project_name}</StyledTableCell>
                      <StyledTableCell>{request.designation}</StyledTableCell>
                      <StyledTableCell>
                        {request.purpose_of_request}
                      </StyledTableCell>
                      <StyledTableCell>
                        {new Date(request.request_timestamp).toLocaleString(
                          "en-IN"
                        )}
                      </StyledTableCell>
                      <StyledTableCell>{request.fla_status}</StyledTableCell>
                    </StyledTableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Typography>No records found.</Typography>
          )}
        </DialogContent>

        <DialogActions>
          <Button
            variant="contained"
            onClick={() =>
              setStatusDialog({ open: false, status: "", data: [] })
            }
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default FlaServiceApproval;
