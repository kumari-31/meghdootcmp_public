import { useEffect, useState } from "react";
import apiClient from "../../Axios";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Button,
  Stack,
  TablePagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import { styled } from "@mui/material/styles";
import { tableCellClasses } from "@mui/material/TableCell";
import { GoAlert } from "react-icons/go";

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

const Approval = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [counts, setCounts] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
  });

  const [alertDialog, setAlertDialog] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const [reasonDialog, setReasonDialog] = useState({
    open: false,
    id: null,
    reason: "",
  });

  const [popup, setPopup] = useState({
    open: false,
    type: "", // "approved" or "rejected"
    data: [],
  });

  // Fetch all requests
  const fetchRequests = async () => {
    setError(null);
    setLoading(true);
    try {
      const response = await apiClient.get("/vmrequests/fla/");
      const allData = response.data;

      //  Sort by latest request first
      const sortedData = allData.sort(
        (a, b) => new Date(b.request_timestamp) - new Date(a.request_timestamp)
      );

      setRequests(sortedData);
      setCounts({
        pending: sortedData.filter((r) => r.fla_status === "Pending").length,
        approved: sortedData.filter((r) => r.fla_status === "Accepted").length,
        rejected: sortedData.filter((r) => r.fla_status === "Rejected").length,
      });
    } catch (err) {
      console.error("Error fetching requests:", err);
      setError("Failed to fetch FLA VM requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  // Handle Approve
  const handleApprove = async (id) => {
    try {
      const response = await apiClient.post("/vmrequest/status/", {
        vm_request_id: id,
        status: "Accepted",
      });
      if (response.status === 200) {
        setAlertDialog({
          open: true,
          message: "Request approved successfully!",
          severity: "success",
        });
        fetchRequests(); // refresh data
      }
    } catch (error) {
      console.error("Error approving:", error);
      setAlertDialog({
        open: true,
        message: "Error approving request.",
        severity: "error",
      });
    }
  };

  // Handle Reject (open reason dialog)
  const handleReject = (id) => {
    setReasonDialog({ open: true, id, reason: "" });
  };

  // Submit Rejection
  const handleRejectSubmit = async () => {
    try {
      const response = await apiClient.post("/vmrequest/status/", {
        vm_request_id: reasonDialog.id,
        status: "Rejected",
        fla_rejection_reason: reasonDialog.reason,
      });

      if (response.status === 200) {
        setAlertDialog({
          open: true,
          message: "Request rejected successfully!",
          severity: "success",
        });
        setReasonDialog({ open: false, id: null, reason: "" });
        fetchRequests(); // refresh after reject
      }
    } catch (error) {
      console.error("Error rejecting:", error);
      setAlertDialog({
        open: true,
        message: "Error rejecting request.",
        severity: "error",
      });
    }
  };

  const openPopup = (type) => {
    const data =
      type === "approved"
        ? requests.filter((r) => r.fla_status === "Accepted")
        : requests.filter((r) => r.fla_status === "Rejected");

    setPopup({ open: true, type, data });
  };

  const closePopup = () => setPopup({ open: false, type: "", data: [] });

  if (loading) {
    return (
      <div className="cloud-container">
        <div className="loading-message">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-message">
        <div className="error-icon">
          <GoAlert />
        </div>
        <h2>❌ {error}</h2>
      </div>
    );
  }

  const pendingRequests = requests.filter((r) => r.fla_status === "Pending");

  return (
    <>
      {/* Stats Cards */}
      <Stack
        direction="row"
        spacing={3}
        justifyContent="flex-start"
        sx={{ width: "90%", mx: "auto", mt: 4, mb: 2 }}
      >
        <Paper
          elevation={3}
          sx={{ p: 2, minWidth: 250, backgroundColor: "#e3f2fd" }}
        >
          <Typography variant="subtitle1">Total Pending Requests</Typography>
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
          onClick={() => openPopup("approved")}
        >
          <Typography variant="subtitle1">Total Approved Requests</Typography>
          <Typography variant="h3" color="success.main">
            {counts.approved}
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
          onClick={() => openPopup("rejected")}
        >
          <Typography variant="subtitle1">Total Rejected Requests</Typography>
          <Typography variant="h3" color="error.main">
            {counts.rejected}
          </Typography>
        </Paper>
      </Stack>

      {/* Main Pending Table */}
      <Paper
        sx={{
          width: "90%",
          margin: "20px auto",
          padding: "20px",
          borderRadius: "10px",
          boxShadow: 3,
        }}
      >
        <Typography variant="h5" sx={{ marginBottom: 2, fontWeight: "bold" }}>
          Pending Requests (FLA)
        </Typography>

        <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <StyledTableCell>Sr. No.</StyledTableCell>
                <StyledTableCell>Name</StyledTableCell>
                <StyledTableCell>VM Name</StyledTableCell>
                <StyledTableCell>Project</StyledTableCell>
                <StyledTableCell>Image</StyledTableCell>
                <StyledTableCell>Flavor</StyledTableCell>
                <StyledTableCell>Purpose</StyledTableCell>
                <StyledTableCell>Request Time</StyledTableCell>
                <StyledTableCell>Action</StyledTableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pendingRequests
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((req, i) => (
                  <StyledTableRow key={req.id}>
                    <StyledTableCell>
                      {page * rowsPerPage + i + 1}
                    </StyledTableCell>
                    <StyledTableCell>{req.name}</StyledTableCell>
                    <StyledTableCell>{req.vm_name.split("_").slice(1).join("_")}</StyledTableCell>
                    <StyledTableCell>{req.project_name}</StyledTableCell>
                    <StyledTableCell>{req.image}</StyledTableCell>
                    <StyledTableCell>{req.flavor}</StyledTableCell>
                    <StyledTableCell>{req.purpose_of_request}</StyledTableCell>
                    <StyledTableCell>
                      {new Date(req.request_timestamp).toLocaleString("en-IN")}
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
                          onClick={() => handleApprove(req.id)}
                        >
                          Approve
                        </Button>
                        <Button
                          variant="contained"
                          color="error"
                          size="small"
                          onClick={() => handleReject(req.id)}
                        >
                          Reject
                        </Button>
                      </Stack>
                    </StyledTableCell>
                  </StyledTableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={pendingRequests.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) =>
            setRowsPerPage(parseInt(e.target.value, 10))
          }
        />
      </Paper>

      {/* Rejection Reason Dialog */}
      <Dialog
        open={reasonDialog.open}
        onClose={() => setReasonDialog({ open: false, id: null, reason: "" })}
      >
        <DialogTitle>Enter Rejection Reason</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            placeholder="Reason for rejection..."
            value={reasonDialog.reason}
            onChange={(e) =>
              setReasonDialog({ ...reasonDialog, reason: e.target.value })
            }
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() =>
              setReasonDialog({ open: false, id: null, reason: "" })
            }
          >
            Cancel
          </Button>
          <Button
            onClick={handleRejectSubmit}
            color="error"
            variant="contained"
            disabled={!reasonDialog.reason}
          >
            Submit
          </Button>
        </DialogActions>
      </Dialog>

      {/* Alert Dialog */}
      <Dialog
        open={alertDialog.open}
        onClose={() => setAlertDialog({ ...alertDialog, open: false })}
      >
        <DialogTitle sx={{ textAlign: "center" }}>
          {alertDialog.severity === "success" ? (
            <CheckCircleIcon color="success" sx={{ fontSize: 60 }} />
          ) : (
            <ErrorIcon color="error" sx={{ fontSize: 60 }} />
          )}
        </DialogTitle>
        <DialogContent sx={{ textAlign: "center" }}>
          <Typography variant="h6">{alertDialog.message}</Typography>
        </DialogContent>
        <DialogActions sx={{ justifyContent: "center" }}>
          <Button
            variant="contained"
            onClick={() => setAlertDialog({ ...alertDialog, open: false })}
          >
            OK
          </Button>
        </DialogActions>
      </Dialog>

      {/* Approved / Rejected Popups */}
      <Dialog open={popup.open} onClose={closePopup} maxWidth="lg" fullWidth>
        <DialogTitle>
          {popup.type === "approved"
            ? "Approved Requests"
            : "Rejected Requests"}
        </DialogTitle>
        <DialogContent>
          <Table>
            <TableHead>
              <TableRow>
                <StyledTableCell>Sr No.</StyledTableCell>
                <StyledTableCell>Name</StyledTableCell>
                <StyledTableCell>VM Name</StyledTableCell>
                <StyledTableCell>Project</StyledTableCell>
                <StyledTableCell>Status</StyledTableCell>
                {popup.type === "rejected" && (
                  <StyledTableCell>Reason</StyledTableCell>
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {popup.data.map((r, i) => (
                <StyledTableRow key={r.id}>
                  <StyledTableCell>{i + 1}</StyledTableCell>
                  <StyledTableCell>{r.name}</StyledTableCell>
                  <StyledTableCell>{r.vm_name.split("_").slice(1).join("_")}</StyledTableCell>
                  <StyledTableCell>{r.project_name}</StyledTableCell>
                  <StyledTableCell>{r.fla_status}</StyledTableCell>
                  {popup.type === "rejected" && (
                    <StyledTableCell>
                      {r.fla_rejection_reason || "-"}
                    </StyledTableCell>
                  )}
                </StyledTableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
        <DialogActions>
          <Button onClick={closePopup}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default Approval;
