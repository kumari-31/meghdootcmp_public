import { useEffect, useState } from "react";
import {
  Stack,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Tooltip,
  Checkbox,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useNotificationRefresh } from "../../Components/PendingRequestContext";
import "../style.css";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import { styled } from "@mui/material/styles";
import { tableCellClasses } from "@mui/material/TableCell";
import { GoAlert } from "react-icons/go";
import apiClient from "../../Axios"; // Update path if required

// Styled Table Components (same as Roles page)
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

const AdminApproval = () => {
  const [overview, setOverview] = useState({
    role: "",
    total_records: 0,
    status_counts: { pending: 0, accepted: 0, rejected: 0 },
    data: [],
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const theme = useTheme();
  const [statusFilter, setStatusFilter] = useState("");
  const [filteredRows, setFilteredRows] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [disabledActions, setDisabledActions] = useState([]);
  const [rejectDialog, setRejectDialog] = useState({
    open: false,
    id: null,
    reason: "",
  });

  const [alertDialog, setAlertDialog] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const { triggerNotificationRefresh } = useNotificationRefresh();

  // Fetch data from backend
  const fetchOverview = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/vmdetails/overview/`);
      setOverview(res.data);
    } catch (err) {
      setError("Failed to load data.");
    } finally {
      setLoading(false);
    }
  };

  // Initial load + auto-refresh every 30 seconds

  useEffect(() => {
    fetchOverview(page + 1, rowsPerPage);
    const interval = setInterval(
      () => fetchOverview(page + 1, rowsPerPage),
      30000
    );
    return () => clearInterval(interval);
  }, [page, rowsPerPage]);

  // Handle card click (Approved/Rejected list)
  const handleCardClick = (statusKey) => {
    setStatusFilter(statusKey);

    let filtered = [];

    if (statusKey === "accepted") {
      filtered = overview.data.filter(
        (r) =>
          r.fla_status?.toLowerCase() === "accepted" &&
          r.admin_status === "Accepted"
      );
    } else if (statusKey === "rejected") {
      filtered = overview.data.filter(
        (r) =>
          r.fla_status?.toLowerCase() === "rejected" ||
          r.admin_status === "Rejected"
      );
    } else if (statusKey === "failed") {
      filtered = failedRows;
    }

    setFilteredRows(filtered);
    setOpenDialog(true);
  };

  // Handle Accept/Reject
  const handleStatusUpdate = async (id, status, reason = "") => {
    try {
      // Disable this action to prevent double click
      setDisabledActions((prev) => [...prev, id]);
      const response = await apiClient.post("/vmrequest/status/", {
        vm_request_id: id,
        status,
        admin_rejection_reason: status === "Rejected" ? reason : null,
      });

      if (response.status === 200) {
        setAlertDialog({
          open: true,
          message: `Request ${status}!`,
          severity: "success",
        });
        await fetchOverview(page + 1, rowsPerPage); // Refresh immediately
        triggerNotificationRefresh(); // Notify other components
      } else {
        throw new Error("Unexpected server response");
      }
    } catch (error) {
      console.error("Error updating status:", error);
      setAlertDialog({
        open: true,
        message: "Error updating request status.",
        severity: "error",
      });
      // Re-enable if failed
      setDisabledActions((prev) => prev.filter((r) => r !== id));
    }
  };

 const handleBulkApprove = async () => {
  setBulkLoading(true);

  try {
    const res = await apiClient.post("/vmrequest/bulk-approve/", {
      vm_request_ids: selectedIds,
      status: "Accepted",
    });

    const results = res.data.results || [];

    const successCount = results.filter(
      (r) => r.status === "Accepted"
    ).length;

    const failedCount = results.filter(
      (r) => r.status === "Failed" || r.status === "Error" || r.status === "Pending"
    ).length;

    let message = "";
    let severity = "success";

    if (failedCount > 0 && successCount > 0) {
      message = `Bulk approval completed. ${successCount} succeeded, ${failedCount} failed.`;
      severity = "warning";
    } else if (failedCount > 0) {
      message = `Bulk approval completed. ${failedCount} request(s) failed.`;
      severity = "error";
    } else {
      message = `Bulk approval completed successfully. ${successCount} request(s) approved.`;
      severity = "success";
    }

    setAlertDialog({
      open: true,
      message,
      severity,
    });

    setSelectedIds([]);
    await fetchOverview(page + 1, rowsPerPage);
    triggerNotificationRefresh();
  } catch (error) {
    console.error("Bulk approve failed:", error);

    setAlertDialog({
      open: true,
      message: "Bulk approval request failed completely.",
      severity: "error",
    });
  } finally {
    setBulkLoading(false);
  }
};

  const handleChangePage = (event, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const rows = overview.data || [];
  const counts = {
    ...overview.status_counts,
    failed: overview.data.filter((r) => r.creation_status === "Failed"&&
      r.admin_status !== "Rejected").length,
  };

  const failedRows = overview.data.filter(
    (r) => r.creation_status === "Failed" &&
    r.admin_status !== "Rejected"
  );
  const pendingRows = overview.data.filter(
    (r) =>
      (r.admin_status === "Pending" && r.fla_status === "Accepted") 
  );

  const paginatedPendingRows = pendingRows.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  if (loading) {
    return (
      <div className="cloud-container">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="7.87722 9.61948 33.01 16.88"
        >
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
      <Stack
        alignItems="center"
        justifyContent="center"
        sx={{ height: "80vh", color: "error.main" }}
      >
        <GoAlert size={60} />
        <Typography variant="h6" sx={{ mt: 2 }}>
          {error}
        </Typography>
      </Stack>
    );
  }

  return (
    <>
      {/* Overview Cards */}
      <Stack
        direction="row"
        spacing={3}
        justifyContent="center"
        sx={{ mt: 4, mb: 3 }}
      >
        <Paper
          sx={{
            p: 2,
            minWidth: 220,
            backgroundColor:
              theme.palette.mode === "dark"
                ? "#1e293b" // dark slate
                : "#e3f2fd",
            color: theme.palette.mode === "dark" ? "#f1f5f9" : "inherit",
          }}
        >
          <Typography variant="subtitle1">Total Pending Requests</Typography>
          <Typography variant="h3" color="primary">
            {counts.pending}
          </Typography>
        </Paper>

        <Paper
          sx={{
            p: 2,
            minWidth: 220,
            backgroundColor:
              theme.palette.mode === "dark" ? "#1f3323" : "#e8f5e9",
            color: theme.palette.mode === "dark" ? "#d1fae5" : "inherit",

            cursor: "pointer",
          }}
          onClick={() => handleCardClick("accepted")}
        >
          <Typography variant="subtitle1">Total Approved by Admin</Typography>
          <Typography variant="h3" color="success.main">
            {counts.accepted}
          </Typography>
        </Paper>

        <Paper
          sx={{
            p: 2,
            minWidth: 220,
            backgroundColor:
              theme.palette.mode === "dark" ? "#3b1f22" : "#ffebee",
            color: theme.palette.mode === "dark" ? "#fecaca" : "inherit",

            cursor: "pointer",
          }}
          onClick={() => handleCardClick("rejected")}
        >
          <Typography variant="subtitle1">Total Rejected by Admin</Typography>
          <Typography variant="h3" color="error.main">
            {counts.rejected}
          </Typography>
        </Paper>
        <Paper
          sx={{
            p: 2,
            minWidth: 220,
            backgroundColor:
              theme.palette.mode === "dark" ? "#3b2d1f" : "#fff3e0",
            color: theme.palette.mode === "dark" ? "#ffedd5" : "inherit",
            // Light Orange for failed
            cursor: "pointer",
          }}
          onClick={() => handleCardClick("failed")}
        >
          <Typography variant="subtitle1">Total Failed Requests</Typography>
          <Typography variant="h3" color="warning.main">
            {counts.failed}
          </Typography>
        </Paper>
      </Stack>

      {/* Pending Table */}
      <Paper
        sx={{
          width: "fit-content",
          minWidth: "75%",
          maxWidth: "100%",
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          border: "none !important",
          boxShadow: "none !important",
          backgroundColor: "transparent !important",
        }}
      >
       
        <Stack
          direction="row"
          spacing={2}
          justifyContent="space-between"
          sx={{ mb: 2 }}
        >
          <Typography variant="h5" sx={{ fontWeight: "bold" }}>
            Pending Approval Requests
          </Typography>

          <Button
            variant="contained"
            color="success"
            disabled={selectedIds.length === 0 || bulkLoading}
            onClick={handleBulkApprove}
          >
            {bulkLoading
              ? "Approving..."
              : `Approve Selected (${selectedIds.length})`}
          </Button>
        </Stack>

        <TableContainer>
          <Table
            sx={{
              width: "100%",
              minWidth: 650,
              tableLayout: "auto",

              // REMOVE ALL BORDERS
              border: "none !important",
              "& td, & th": { border: "none !important" },
              "& .MuiTableCell-root": { borderBottom: "none !important" },
              "& .MuiTableRow-root": { border: "none !important" },
            }}
          >
            <TableHead>
              <StyledTableRow>
                <StyledTableCell padding="checkbox">
                  <Checkbox
                    indeterminate={
                      selectedIds.length > 0 &&
                      selectedIds.length < paginatedPendingRows.length
                    }
                    checked={
                      paginatedPendingRows.length > 0 &&
                      selectedIds.length === paginatedPendingRows.length
                    }
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedIds(paginatedPendingRows.map((r) => r.id));
                      } else {
                        setSelectedIds([]);
                      }
                    }}
                  />
                </StyledTableCell>
                <StyledTableCell>Sr. No.</StyledTableCell>
                <StyledTableCell>Email</StyledTableCell>
                <StyledTableCell>VM Name</StyledTableCell>
                <StyledTableCell>VM Counts</StyledTableCell>
                <StyledTableCell>Project</StyledTableCell>
                <StyledTableCell>Image</StyledTableCell>
                <StyledTableCell>Flavor</StyledTableCell>
                <StyledTableCell>Purpose</StyledTableCell>
                <StyledTableCell>FLA Status</StyledTableCell>
                <StyledTableCell>Requested On</StyledTableCell>
                <StyledTableCell align="center">Actions</StyledTableCell>
              </StyledTableRow>
            </TableHead>
            <TableBody>
              {paginatedPendingRows.map((req, index) => (
                <StyledTableRow
                  key={req.id}
                  hover
                  sx={{
                    backgroundColor:
                      req.creation_status === "Failed"
                        ? "#fae1b8ff !important" // light orange
                        : "inherit",
                  }}
                >
                  <StyledTableCell padding="checkbox">
                    <Checkbox
                      checked={selectedIds.includes(req.id)}
                      disabled={disabledActions.includes(req.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedIds((prev) => [...prev, req.id]);
                        } else {
                          setSelectedIds((prev) =>
                            prev.filter((id) => id !== req.id)
                          );
                        }
                      }}
                    />
                  </StyledTableCell>

                  <StyledTableCell>
                    {page * rowsPerPage + (index + 1)}
                  </StyledTableCell>
                  <StyledTableCell>{req.name}</StyledTableCell>
                  <StyledTableCell>
                    {req.vm_name.split("_").slice(1).join("_")}
                    {req.creation_status?.toLowerCase() === "failed" && (
                      <Tooltip
                        title={req.creation_error_message || "Unknown failure"}
                        arrow
                      >
                        <ErrorOutlineIcon
                          sx={{
                            color: "red",
                            ml: 1,
                            verticalAlign: "middle",
                            fontSize: 18,
                          }}
                        />
                      </Tooltip>
                    )}
                  </StyledTableCell>
                  <StyledTableCell>{req.count_of_vms}</StyledTableCell>
                  <StyledTableCell>{req.project_name}</StyledTableCell>
                  <StyledTableCell>{req.image}</StyledTableCell>
                  <StyledTableCell>{req.flavor}</StyledTableCell>
                  <StyledTableCell>{req.purpose_of_request}</StyledTableCell>
                  <StyledTableCell>{req.fla_status}</StyledTableCell>
                  <StyledTableCell>
                    {new Date(req.request_timestamp).toLocaleString("en-IN")}
                  </StyledTableCell>
                  <StyledTableCell align="center">
                    <Stack direction="row" spacing={1} justifyContent="center">
                      <Button
                        variant="contained"
                        color="success"
                        size="small"
                        disabled={disabledActions.includes(req.id)}
                        onClick={() => handleStatusUpdate(req.id, "Accepted")}
                      >
                        Accept
                      </Button>
                      <Button
                        variant="contained"
                        color="error"
                        size="small"
                        disabled={disabledActions.includes(req.id)}
                        onClick={() =>
                          setRejectDialog({
                            open: true,
                            id: req.id,
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
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          count={overview.total_records}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>

      {/* Approved/Rejected Dialog */}
      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>
          {statusFilter === "accepted"
            ? "FLA Approved Requests"
            : "FLA Rejected Requests"}
        </DialogTitle>
        <DialogContent>
          <TableContainer>
            <Table>
              <TableHead>
                <StyledTableRow>
                  {/* <StyledTableCell>Name</StyledTableCell> */}
                  <StyledTableCell>Email</StyledTableCell>
                  <StyledTableCell>VM Name</StyledTableCell>
                  <StyledTableCell>Project</StyledTableCell>
                  <StyledTableCell>designation</StyledTableCell>
                  <StyledTableCell>Status</StyledTableCell>
                </StyledTableRow>
              </TableHead>
              <TableBody>
                {filteredRows.map((r) => (
                  <StyledTableRow key={r.id}>
                    {/* <StyledTableCell>{r.name}</StyledTableCell> */}
                    <StyledTableCell>{r.email}</StyledTableCell>
                    <StyledTableCell>
                      {r.vm_name.split("_").slice(1).join("_")}
                    </StyledTableCell>
                    <StyledTableCell>{r.project_name}</StyledTableCell>
                    <StyledTableCell>{r.designation}</StyledTableCell>
                    <StyledTableCell>{r.admin_status}</StyledTableCell>
                  </StyledTableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Reject Reason Dialog */}
      <Dialog
        open={rejectDialog.open}
        onClose={() => setRejectDialog({ ...rejectDialog, open: false })}
      >
        <DialogTitle>Reject Request</DialogTitle>
        <DialogContent>
          <Typography>Please provide a rejection reason:</Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            margin="dense"
            value={rejectDialog.reason}
            onChange={(e) =>
              setRejectDialog({ ...rejectDialog, reason: e.target.value })
            }
            label="Reason"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectDialog({ open: false })}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            disabled={!rejectDialog.reason.trim()}
            onClick={() => {
              handleStatusUpdate(
                rejectDialog.id,
                "Rejected",
                rejectDialog.reason
              );
              setRejectDialog({ open: false, id: null, reason: "" });
            }}
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
        <DialogTitle sx={{ textAlign: "center", p: 2 }}>
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
            color={alertDialog.severity}
            onClick={() => setAlertDialog({ ...alertDialog, open: false })}
          >
            OK
          </Button>
        </DialogActions>
      </Dialog>

      {/* Failed Requests Dialog */}
      <Dialog
        open={statusFilter === "failed" && openDialog}
        onClose={() => setOpenDialog(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>Failed VM Requests</DialogTitle>
        <DialogContent>
          <TableContainer sx={{ maxHeight: 400 }}>
            <Table stickyHeader>
              <TableHead>
                <StyledTableRow>
                  <StyledTableCell>Sr. No.</StyledTableCell>
                  <StyledTableCell>Email</StyledTableCell>
                  <StyledTableCell>VM Name</StyledTableCell>
                  <StyledTableCell>Error Message</StyledTableCell>
                  <StyledTableCell align="center">Actions</StyledTableCell>
                </StyledTableRow>
              </TableHead>

              <TableBody>
                {filteredRows.map((req, index) => (
                  <StyledTableRow key={req.id} hover>
                    <StyledTableCell>{index + 1}</StyledTableCell>
                    <StyledTableCell>{req.name}</StyledTableCell>
                    <StyledTableCell>
                      {req.vm_name.split("_").slice(1).join("_")}
                    </StyledTableCell>
                    <StyledTableCell>
                      {req.creation_error_message || "Unknown failure"}
                    </StyledTableCell>

                    <StyledTableCell align="center">
                      <Stack
                        direction="row"
                        spacing={1}
                        justifyContent="center"
                      >
                        {/* Retry / Approve */}
                        <Button
                          variant="contained"
                          color="success"
                          size="small"
                          disabled={disabledActions.includes(req.id)}
                          onClick={() => handleStatusUpdate(req.id, "Accepted")}
                        >
                          Retry
                        </Button>

                        {/* Reject */}
                        <Button
                          variant="contained"
                          color="error"
                          size="small"
                          disabled={disabledActions.includes(req.id)}
                          onClick={() =>
                            setRejectDialog({
                              open: true,
                              id: req.id,
                              reason: "",
                              isFailed: true,
                            })
                          }
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
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default AdminApproval;