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

const AdminServiceApproval = () => {
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

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const response = await apiClient.get("/service-requests/");
        const data = response.data.data.filter(
          (r) => r.fla_status === "Accepted"
        );

        const pending = data.filter((r) => r.admin_status === "Pending");
        const accepted = data.filter((r) => r.admin_status === "Accepted");
        const rejected = data.filter((r) => r.admin_status === "Rejected");

        setRequests(data); // table shows only pending
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

    fetchRequests();
  }, []);

  const handleStatusUpdate = async (requestId, status) => {
    try {
      const response = await apiClient.put("/admin/pending-service-requests/", {
        request_id: requestId,
        status,
        remarks: `Service request ${status.toLowerCase()}`,
      });

      if (response.status === 200) {
        setRequests((prev) => prev.filter((r) => r.id !== requestId));
        setCounts((prev) => ({
          ...prev,
          pending: prev.pending - 1,
          accepted: status === "Accepted" ? prev.accepted + 1 : prev.accepted,
        }));
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
        setRequests((prev) =>
          prev.filter((r) => r.id !== rejectDialog.requestId)
        );
        setCounts((prev) => ({
          ...prev,
          pending: prev.pending - 1,
          rejected: prev.rejected + 1,
        }));
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

  const handleChangePage = (_, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const emptyRows =
    rowsPerPage -
    Math.min(
      rowsPerPage,
      requests.filter((r) => r.admin_status === "Pending").length -
        page * rowsPerPage
    );

  if (loading) return <div>Loading...</div>;
  if (error) return <div style={{ color: "red" }}>{error}</div>;

  return (
    <>
      <Stack
        direction="row"
        spacing={3}
        justifyContent="flex-start"
        sx={{ width: "90%", mx: "auto", mt: 4, mb: 2 }}
      >
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
              (req) => req.admin_status === "Accepted"
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
              (req) => req.admin_status === "Rejected"
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
          Pending Service Requests for Approval
        </Typography>

        <TableContainer component={Paper} sx={{ maxHeight: 380 }}>
          <Table stickyHeader>
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
                <StyledTableCell>Actions</StyledTableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {requests
                .filter((req) => req.admin_status === "Pending")
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((request, index) => (
                  <StyledTableRow key={request.id}>
                    <StyledTableCell>
                      {page * rowsPerPage + index + 1}
                    </StyledTableCell>
                    <StyledTableCell>{request.name}</StyledTableCell>
                    <StyledTableCell>{request.service_name}</StyledTableCell>
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
                    <StyledTableCell>{request.admin_status}</StyledTableCell>
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
          count={requests.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />

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
            <Typography variant="h6" gutterBottom>
              {alertDialog.severity === "success" ? "Success" : "Error"}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {alertDialog.message}
            </Typography>
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

        {/* Rejection Reason Dialog */}
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
              variant="outlined"
              label="Enter the reason for rejection"
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
              color="inherit"
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
      </Paper>
    </>
  );
};

export default AdminServiceApproval;
