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
  CircularProgress,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import { GoAlert } from "react-icons/go";
import apiClient from "../../Axios"; // Update path if required

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

  const [statusFilter, setStatusFilter] = useState("");
  const [filteredRows, setFilteredRows] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);

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

  // Fetch data from backend
  const fetchOverview = async (pageNo = 1, size = 10) => {
    setLoading(true);
    try {
      const res = await apiClient.get(
        `/vmdetails/overview/?page=${pageNo}&size=${size}`
      );
      setOverview(res.data);
      setError(null);
    } catch (err) {
      console.error("Error fetching overview:", err);
      setError("Failed to load data. Please try again later.");
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
    const filtered = overview.data.filter(
      (r) => r.fla_status?.toLowerCase() === statusKey
    );
    setFilteredRows(filtered);
    setOpenDialog(true);
  };

  // Handle Accept/Reject
  const handleStatusUpdate = async (id, status, reason = "") => {
    try {
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
    }
  };

  const handleChangePage = (event, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const rows = overview.data || [];
  const counts = overview.status_counts || {};
  const pendingRows = rows.filter(
    (r) => r.admin_status === "Pending" && r.fla_status === "Accepted"
  );

  // --- UI Starts Here ---
  if (loading) {
    return (
      <Stack
        alignItems="center"
        justifyContent="center"
        sx={{ height: "80vh" }}
      >
        <CircularProgress color="primary" size={60} />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Loading data...
        </Typography>
      </Stack>
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
        <Paper sx={{ p: 2, minWidth: 220, backgroundColor: "#e3f2fd" }}>
          <Typography variant="subtitle1">Total Pending Requests</Typography>
          <Typography variant="h3" color="primary">
            {counts.pending}
          </Typography>
        </Paper>

        <Paper
          sx={{
            p: 2,
            minWidth: 220,
            backgroundColor: "#e8f5e9",
            cursor: "pointer",
          }}
          onClick={() => handleCardClick("accepted")}
        >
          <Typography variant="subtitle1">Total Approved by FLA</Typography>
          <Typography variant="h3" color="success.main">
            {counts.accepted}
          </Typography>
        </Paper>

        <Paper
          sx={{
            p: 2,
            minWidth: 220,
            backgroundColor: "#ffebee",
            cursor: "pointer",
          }}
          onClick={() => handleCardClick("rejected")}
        >
          <Typography variant="subtitle1">Total Rejected by FLA</Typography>
          <Typography variant="h3" color="error.main">
            {counts.rejected}
          </Typography>
        </Paper>
      </Stack>

      {/* Pending Table */}
      <Paper
        sx={{
          width: "90%",
          margin: "auto",
          p: 3,
          borderRadius: "12px",
          boxShadow: 4,
        }}
      >
        <Typography variant="h5" sx={{ mb: 2, fontWeight: "bold" }}>
          Pending Approval Requests
        </Typography>
        <TableContainer sx={{ maxHeight: 500 }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Sr. No.</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>VM Name</TableCell>
                <TableCell>Project</TableCell>
                <TableCell>Image</TableCell>
                <TableCell>Flavor</TableCell>
                <TableCell>Purpose</TableCell>
                <TableCell>FLA Status</TableCell>
                <TableCell>Requested On</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pendingRows.map((req, index) => (
                <TableRow key={req.id} hover>
                  <TableCell>{page * rowsPerPage + index + 1}</TableCell>
                  <TableCell>{req.name}</TableCell>
                  <TableCell>{req.vm_name}</TableCell>
                  <TableCell>{req.project_name}</TableCell>
                  <TableCell>{req.image}</TableCell>
                  <TableCell>{req.flavor}</TableCell>
                  <TableCell>{req.purpose_of_request}</TableCell>
                  <TableCell>{req.fla_status}</TableCell>
                  <TableCell>
                    {new Date(req.request_timestamp).toLocaleString("en-IN")}
                  </TableCell>
                  <TableCell align="center">
                    <Stack direction="row" spacing={1} justifyContent="center">
                      <Button
                        variant="contained"
                        color="success"
                        size="small"
                        onClick={() => handleStatusUpdate(req.id, "Accepted")}
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
                            id: req.id,
                            reason: "",
                          })
                        }
                      >
                        Reject
                      </Button>
                    </Stack>
                  </TableCell>
                </TableRow>
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
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>VM Name</TableCell>
                  <TableCell>Project</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredRows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.name}</TableCell>
                    <TableCell>{r.email}</TableCell>
                    <TableCell>{r.vm_name}</TableCell>
                    <TableCell>{r.project_name}</TableCell>
                    <TableCell>{r.fla_status}</TableCell>
                  </TableRow>
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
    </>
  );
};

export default AdminApproval;

// import React, { useEffect, useState } from "react";
// import apiClient from "../../Axios";
// import {
//   Table,
//   TableBody,
//   TableCell,
//   TableContainer,
//   TableHead,
//   TableRow,
//   Paper,
//   Typography,
//   TextField,
//   Button,
//   Stack,
//   TablePagination,
//   Dialog,
//   DialogTitle,
//   DialogContent,
//   DialogActions,
// } from "@mui/material";
// import CheckCircleIcon from "@mui/icons-material/CheckCircle";
// import ErrorIcon from "@mui/icons-material/Error";
// import { styled } from "@mui/material/styles";
// import { tableCellClasses } from "@mui/material/TableCell";
// import { GoAlert } from "react-icons/go";
// import "../style.css";

// // Styled Table Components
// const StyledTableCell = styled(TableCell)(({ theme }) => ({
//   [`&.${tableCellClasses.head}`]: {
//     backgroundColor: "#253848",
//     color: theme.palette.common.white,
//     fontWeight: "bold",
//     fontSize: 16,
//     textAlign: "center",
//   },
//   [`&.${tableCellClasses.body}`]: {
//     fontSize: 14,
//     textAlign: "center",
//     color: "#000",
//   },
// }));

// const StyledTableRow = styled(TableRow)(({ theme }) => ({
//   backgroundColor: theme.palette.grey[100],
//   "&:nth-of-type(odd)": {
//     backgroundColor: theme.palette.grey[300],
//   },
//   "&:last-child td, &:last-child th": {
//     border: 0,
//   },
// }));

// const AdminApproval = () => {
//   const [requests, setRequests] = useState([]); // paginated page data
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);
//   const [page, setPage] = useState(0);
//   const [rows, setRows] = useState([]);
//   const [statusFilter, setStatusFilter] = useState("");
//   const [open, setOpen] = useState(false);
//   const [counts, setCounts] = useState({
//     pending: 0,
//     approved: 0,
//     rejected: 0,
//   });
//   const [alertDialog, setAlertDialog] = useState({
//     open: false,
//     message: "",
//     severity: "success",
//   });
//   const [rejectDialog, setRejectDialog] = useState({
//     open: false,
//     id: null,
//     reason: "",
//   });

//   const [totalRecords, setTotalRecords] = useState(0);
//   const [rowsPerPage, setRowsPerPage] = useState(5);

//   useEffect(() => {
//     apiClient.get("/vmrequests/admin?page=1&size=1000").then((res) => {
//       const accepted = res.data.data.filter(
//         (r) => r.admin_status === "Accepted"
//       ).length;
//       const rejected = res.data.data.filter(
//         (r) => r.admin_status === "Rejected"
//       ).length;
//       setCounts({ accepted, rejected });
//     });
//   }, []);

//   // Fetch table data when dialog opens or page changes
//   const fetchData = (status, pageNo, size) => {
//     apiClient
//       .get(`/vmrequests/admin?page=${pageNo + 1}&size=${size}`)
//       .then((res) => {
//         const filtered = res.data.data.filter((r) => r.admin_status === status);
//         setRows(filtered);
//         setTotalRecords(filtered.length); // total in this page's filter
//       });
//   };
//   const handleCardClick = (status) => {
//     setStatusFilter(status);
//     fetchData(status, 0, rowsPerPage);
//     setPage(0);
//     setOpen(true);
//   };

//   // Fetch only the paginated page (for the table)
//   const fetchPaginatedRequests = async (p = page, size = rowsPerPage) => {
//     setLoading(true);
//     setError(null);
//     try {
//       const response = await apiClient.get(
//         `/vmrequests/admin?page=${p + 1}&size=${size}`
//       );

//       // response.data.data should be the current page
//       setRequests(response.data.data || []);
//       // backend may provide totalRecords; fallback will be set by counts fetch
//       setTotalRecords(
//         typeof response.data.totalRecords === "number"
//           ? response.data.totalRecords
//           : response.data.totalRecords ?? totalRecords
//       );
//     } catch (err) {
//       console.error("Error fetching paginated requests:", err);
//       setError("Failed to fetch VM requests for table.");
//       setRequests([]);
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Fetch all rows only to compute counts (cards) and fallback totalRecords if backend doesn't provide it
//   const fetchCounts = async () => {
//     try {
//       const allRes = await apiClient.get(`/vmrequests/admin?page=1&size=1000`); // large size for counts
//       const allData = allRes.data.data || [];

//       const pendingCount = allData.filter(
//         (req) => req.admin_status === "Pending"
//       ).length;
//       const approvedCount = allData.filter(
//         (req) => req.admin_status === "Accepted"
//       ).length;
//       const rejectedCount = allData.filter(
//         (req) => req.admin_status === "Rejected"
//       ).length;

//       setCounts({
//         pending: pendingCount,
//         approved: approvedCount,
//         rejected: rejectedCount,
//       });

//       // If paginated response didn't provide totalRecords, fallback to allData.length
//       if (!totalRecords || totalRecords === 0) {
//         setTotalRecords(allData.length);
//       }
//     } catch (err) {
//       console.error("Error fetching all data for counts:", err);
//     }
//   };

//   // Combined refresh
//   const refreshData = async () => {
//     await Promise.all([fetchPaginatedRequests(), fetchCounts()]);
//   };

//   useEffect(() => {
//     // Fetch current page + counts whenever page or rowsPerPage changes
//     refreshData();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [page, rowsPerPage]);

//   const handleStatusUpdate = async (id, status, reason = "") => {
//     try {
//       const response = await apiClient.post("/vmrequest/status", {
//         vm_request_id: id,
//         status,
//         admin_rejection_reason: status === "Rejected" ? reason : null,
//       });

//       if (response.status === 200) {
//         setAlertDialog({
//           open: true,
//           message: `Request ${status}!`,
//           severity: "success",
//         });
//         await refreshData();
//       } else {
//         setAlertDialog({
//           open: true,
//           message: "Failed to update the status.",
//           severity: "error",
//         });
//       }
//     } catch (error) {
//       console.error("Error updating status:", error);
//       setAlertDialog({
//         open: true,
//         message: "An error occurred while updating the status.",
//         severity: "error",
//       });
//     }
//   };

//   const handleChangePage = (event, newPage) => {
//     setPage(newPage);
//     fetchData(statusFilter, newPage, rowsPerPage);
//   };

//   const handleChangeRowsPerPage = (event) => {
//     const newSize = parseInt(event.target.value, 10);
//     setRowsPerPage(newSize);
//     setPage(0);
//     fetchData(statusFilter, 0, newSize);
//   };

//   if (loading) {
//     return (
//       <div className="cloud-container">
//         <svg
//           xmlns="http://www.w3.org/2000/svg"
//           viewBox="7.87722 9.61948 33.01 16.88"
//         >
//           <path
//             d="M 12 26 H 37 C 42 26 41 20  37 20 C 38 18 37 15 33 16 C 32 8 15 8 14 17 C 8 16 6 25 12 26"
//             className="cloud-back"
//           />
//           <path
//             d="M 12 26 H 37 C 42 26 41 20 37 20 C 38 18 37 15 33 16 C 32 8 15 8 14 17 C 8 16 6 25 12 26"
//             className="cloud-front"
//           />
//         </svg>
//         <div className="loading-message">Loading...</div>
//       </div>
//     );
//   }

//   if (error) {
//     return (
//       <div className="error-message">
//         <GoAlert />
//         <h2>❌ Server Down</h2>
//       </div>
//     );
//   }

//   // For paginated backend responses, requests.length <= rowsPerPage
//   const emptyRows = Math.max(0, rowsPerPage - requests.length);

//   return (
//     <>
//       <Stack
//         direction="row"
//         spacing={3}
//         justifyContent="flex-start"
//         sx={{ width: "90%", mx: "auto", mt: 4, mb: 2 }}
//       >
//         <Paper
//           elevation={3}
//           sx={{
//             p: 2,
//             minWidth: 250,
//             minHeight: 150,
//             backgroundColor: "#e3f2fd",
//           }}
//         >
//           <Typography variant="subtitle1">Total Pending Request</Typography>
//           <Typography variant="h3" color="primary">
//             {counts.pending}
//           </Typography>
//         </Paper>
//         <Paper
//           elevation={3}
//           sx={{
//             p: 2,
//             minWidth: 250,
//             backgroundColor: "#e8f5e9",
//             cursor: "pointer",
//           }}
//           onClick={() => handleCardClick("Approved")}
//         >
//           <Typography variant="subtitle1">Total Approved Request</Typography>
//           <Typography variant="h3" color="success.main">
//             {counts.approved}
//           </Typography>
//         </Paper>
//         <Paper
//           elevation={3}
//           sx={{
//             p: 2,
//             minWidth: 250,
//             backgroundColor: "#ffebee",
//             cursor: "pointer",
//           }}
//           onClick={() => handleCardClick("Rejected")}
//         >
//           <Typography variant="subtitle1">Total Rejected Request</Typography>
//           <Typography variant="h3" color="error.main">
//             {counts.rejected}
//           </Typography>
//         </Paper>
//       </Stack>

//       <Paper
//         sx={{
//           width: "90%",
//           margin: "20px auto",
//           padding: "20px",
//           borderRadius: "10px",
//           boxShadow: 3,
//         }}
//       >
//         <Typography
//           variant="h5"
//           sx={{ marginBottom: 2, textAlign: "left", fontWeight: "bold" }}
//         >
//           Approval Page
//         </Typography>
//         <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
//           <Table stickyHeader aria-label="sticky table">
//             <TableHead>
//               <TableRow>
//                 <StyledTableCell>Sr. No.</StyledTableCell>
//                 <StyledTableCell>Name</StyledTableCell>
//                 <StyledTableCell>VM Name</StyledTableCell>
//                 <StyledTableCell>Project Name</StyledTableCell>
//                 <StyledTableCell>Image</StyledTableCell>
//                 <StyledTableCell>Flavor</StyledTableCell>
//                 <StyledTableCell>Purpose</StyledTableCell>
//                 <StyledTableCell>FLA Status</StyledTableCell>
//                 <StyledTableCell>Request Time</StyledTableCell>
//                 <StyledTableCell>FLA Approved Time</StyledTableCell>
//                 <StyledTableCell>Actions</StyledTableCell>
//               </TableRow>
//             </TableHead>
//             <TableBody>
//               {requests.map((request, index) => (
//                 <StyledTableRow key={request.id}>
//                   <StyledTableCell>
//                     {page * rowsPerPage + index + 1}
//                   </StyledTableCell>
//                   <StyledTableCell>{request.name}</StyledTableCell>
//                   <StyledTableCell>
//                     {request.vm_name
//                       ? request.vm_name.split("_").slice(1).join("_")
//                       : ""}
//                   </StyledTableCell>
//                   <StyledTableCell>{request.project_name}</StyledTableCell>
//                   <StyledTableCell>{request.image}</StyledTableCell>
//                   <StyledTableCell>{request.flavor}</StyledTableCell>
//                   <StyledTableCell>
//                     {request.purpose_of_request}
//                   </StyledTableCell>
//                   <StyledTableCell>{request.fla_status}</StyledTableCell>
//                   <StyledTableCell>
//                     {request.request_timestamp
//                       ? new Date(request.request_timestamp).toLocaleString(
//                           "en-IN",
//                           {
//                             day: "2-digit",
//                             month: "short",
//                             year: "numeric",
//                             hour: "2-digit",
//                             minute: "2-digit",
//                             hour12: true,
//                           }
//                         )
//                       : ""}
//                   </StyledTableCell>
//                   <StyledTableCell>
//                     {request.fla_approved_timestamp
//                       ? new Date(request.fla_approved_timestamp).toLocaleString(
//                           "en-IN",
//                           {
//                             day: "2-digit",
//                             month: "short",
//                             year: "numeric",
//                             hour: "2-digit",
//                             minute: "2-digit",
//                             hour12: true,
//                           }
//                         )
//                       : ""}
//                   </StyledTableCell>
//                   <StyledTableCell>
//                     {request.admin_status === "Pending" && (
//                       <Stack
//                         direction={{ xs: "column", sm: "row" }}
//                         spacing={1}
//                         justifyContent="center"
//                         alignItems="center"
//                       >
//                         <Button
//                           variant="contained"
//                           color="success"
//                           size="small"
//                           onClick={() =>
//                             handleStatusUpdate(request.id, "Accepted")
//                           }
//                         >
//                           Accept
//                         </Button>
//                         <Button
//                           variant="contained"
//                           color="error"
//                           size="small"
//                           onClick={() =>
//                             setRejectDialog({
//                               open: true,
//                               id: request.id,
//                               reason: "",
//                             })
//                           }
//                         >
//                           Reject
//                         </Button>
//                       </Stack>
//                     )}
//                   </StyledTableCell>
//                 </StyledTableRow>
//               ))}

//               {emptyRows > 0 && (
//                 <TableRow style={{ height: 53 * emptyRows }}>
//                   <TableCell colSpan={11} />
//                 </TableRow>
//               )}
//             </TableBody>
//           </Table>
//         </TableContainer>

//         <TablePagination
//           rowsPerPageOptions={[5, 10, 25]}
//           component="div"
//           count={totalRecords}
//           rowsPerPage={rowsPerPage}
//           page={page}
//           onPageChange={handleChangePage}
//           onRowsPerPageChange={handleChangeRowsPerPage}
//         />
//       </Paper>

//       <Dialog
//         open={alertDialog.open}
//         onClose={() => setAlertDialog({ ...alertDialog, open: false })}
//       >
//         <DialogTitle sx={{ textAlign: "center", p: 3 }}>
//           {alertDialog.severity === "success" ? (
//             <CheckCircleIcon color="success" sx={{ fontSize: 60 }} />
//           ) : (
//             <ErrorIcon color="error" sx={{ fontSize: 60 }} />
//           )}
//         </DialogTitle>
//         <DialogContent sx={{ textAlign: "center", px: 6 }}>
//           <Typography variant="h6" gutterBottom>
//             {alertDialog.severity === "success" ? "Success" : "Error"}
//           </Typography>
//           <Typography variant="body1" color="text.secondary">
//             {alertDialog.message}
//           </Typography>
//         </DialogContent>
//         <DialogActions sx={{ justifyContent: "center", pb: 3 }}>
//           <Button
//             onClick={() => setAlertDialog({ ...alertDialog, open: false })}
//             variant="contained"
//             color={alertDialog.severity}
//           >
//             OK
//           </Button>
//         </DialogActions>
//       </Dialog>
//       <Dialog
//         open={open}
//         onClose={() => setOpen(false)}
//         fullWidth
//         maxWidth="lg"
//       >
//         <DialogTitle>{statusFilter} Requests</DialogTitle>
//         <DialogContent>
//           <TableContainer component={Paper}>
//             <Table>
//               <TableHead>
//                 <TableRow>
//                   <TableCell>Name</TableCell>
//                   <TableCell>Email</TableCell>
//                   <TableCell>VM Name</TableCell>
//                   <TableCell>Project</TableCell>
//                   <TableCell>Status</TableCell>
//                 </TableRow>
//               </TableHead>
//               <TableBody>
//                 {rows.map((row) => (
//                   <TableRow key={row.id}>
//                     <TableCell>{row.name}</TableCell>
//                     <TableCell>{row.email}</TableCell>
//                     <TableCell>{row.vm_name}</TableCell>
//                     <TableCell>{row.project_name}</TableCell>
//                     <TableCell>{row.admin_status}</TableCell>
//                   </TableRow>
//                 ))}
//               </TableBody>
//             </Table>
//           </TableContainer>
//           <TablePagination
//             component="div"
//             count={totalRecords}
//             page={page}
//             onPageChange={handleChangePage}
//             rowsPerPage={rowsPerPage}
//             onRowsPerPageChange={handleChangeRowsPerPage}
//           />
//         </DialogContent>
//       </Dialog>
//       <Dialog
//         open={rejectDialog.open}
//         onClose={() => setRejectDialog({ ...rejectDialog, open: false })}
//       >
//         <DialogTitle>Reject Request</DialogTitle>
//         <DialogContent>
//           <Typography gutterBottom>
//             Please provide a reason for rejection:
//           </Typography>
//           <TextField
//             autoFocus
//             margin="dense"
//             label="Rejection Reason"
//             fullWidth
//             multiline
//             rows={3}
//             value={rejectDialog.reason}
//             onChange={(e) =>
//               setRejectDialog({ ...rejectDialog, reason: e.target.value })
//             }
//           />
//         </DialogContent>
//         <DialogActions>
//           <Button
//             onClick={() => setRejectDialog({ ...rejectDialog, open: false })}
//             color="secondary"
//           >
//             Cancel
//           </Button>
//           <Button
//             variant="contained"
//             color="error"
//             onClick={() => {
//               handleStatusUpdate(
//                 rejectDialog.id,
//                 "Rejected",
//                 rejectDialog.reason
//               );
//               setRejectDialog({ open: false, id: null, reason: "" });
//             }}
//             disabled={!rejectDialog.reason.trim()} // prevent empty reason
//           >
//             Submit
//           </Button>
//         </DialogActions>
//       </Dialog>
//     </>
//   );
// };

// export default AdminApproval;

// import React, { useEffect, useState } from "react";
// import apiClient from "../../Axios";
// import {
//   Table,
//   TableBody,
//   TableCell,
//   TableContainer,
//   TableHead,
//   TableRow,
//   Paper,
//   Typography,
//   Button,
//   Stack,
//   TablePagination,
//   Dialog,
//   DialogTitle,
//   DialogContent,
//   DialogActions, // Import TablePagination
// } from "@mui/material";
// import CheckCircleIcon from "@mui/icons-material/CheckCircle";
// import ErrorIcon from "@mui/icons-material/Error";
// import { styled } from "@mui/material/styles";
// import { tableCellClasses } from "@mui/material/TableCell";
// import { GoAlert } from "react-icons/go";
// import "../style.css";

// // Styled Table Components
// const StyledTableCell = styled(TableCell)(({ theme }) => ({
//   [`&.${tableCellClasses.head}`]: {
//     backgroundColor: "#253848",
//     color: theme.palette.common.white,
//     fontWeight: "bold",
//     fontSize: 16,
//     textAlign: "center",
//   },
//   [`&.${tableCellClasses.body}`]: {
//     fontSize: 14,
//     textAlign: "center",
//     color: "#000",
//   },
// }));

// const StyledTableRow = styled(TableRow)(({ theme }) => ({
//   backgroundColor: theme.palette.grey[100],
//   "&:nth-of-type(odd)": {
//     backgroundColor: theme.palette.grey[300],
//   },
//   "&:last-child td, &:last-child th": {
//     border: 0,
//   },
// }));

// const AdminApproval = () => {
//   const [requests, setRequests] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);
//   const [page, setPage] = useState(0); // Current page, 0-based index
//   const [counts, setCounts] = useState({
//     pending: 0,
//     approved: 0,
//     rejected: 0,
//   });
//   const [alertDialog, setAlertDialog] = useState({
//     open: false,
//     message: "",
//     severity: "success", // "success" or "error"
//   });
//   const [totalRecords, setTotalRecords] = useState(0);
//   const [rowsPerPage, setRowsPerPage] = useState(5);

//   useEffect(() => {
//     const fetchRequests = async () => {
//       setLoading(true);
//       setError(null);
//       try {
//         const response = await apiClient.get( `/vmrequests/admin?page=${page + 1}&size=${rowsPerPage}`);

//         setRequests(response.data.data || []);
//         setTotalRecords(typeof response.data.totalRecords === "number"
//           ? response.data.totalRecords
//           : (response.data.totalRecords ?? totalRecords)
//       );
//          const allRes = await apiClient.get(
//         `/vmrequests/admin?page=1&size=100000` // large size to get all
//       );
//         const allData = allRes.data.data;

//         setRequests(allData);

//         // Calculate counts based on fla_status
//         const pendingCount = allData.filter(
//           (req) => req.admin_status === "Pending"
//         ).length;
//         const approvedCount = allData.filter(
//           (req) => req.admin_status === "Accepted"
//         ).length;
//         const rejectedCount = allData.filter(
//           (req) => req.admin_status === "Rejected"
//         ).length;

//         setCounts({
//           pending: pendingCount,
//           approved: approvedCount,
//           rejected: rejectedCount,
//         });
//       } catch (error) {
//         console.error("Error fetching requests:", error);
//         setError("Failed to fetch VM requests.");
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchRequests();
//   }, [page, rowsPerPage]); // Fetch requests when page or rowsPerPage changes

//   const handleStatusUpdate = async (id, status) => {
//     try {
//       const response = await apiClient.post("/vmrequest/status", {
//         vm_request_id: id,
//         status,
//       });

//       if (response.status === 200) {
//         setAlertDialog({
//           open: true,
//           message: `Request ${status}!`,
//           severity: "success",
//         });
//         setRequests((prevRequests) =>
//           prevRequests.map((request) =>
//             request.id === id ? { ...request, admin_status: status } : request
//           )
//         );
//       } else {
//         setAlertDialog({
//           open: true,
//           message: "Failed to update the status.",
//           severity: "error",
//         });
//       }
//     } catch (error) {
//       console.error("Error updating status:", error);
//       setAlertDialog({
//         open: true,
//         message: "An error occurred while updating the status.",
//         severity: "error",
//       });
//     }
//   };

//   const handleChangePage = (event, newPage) => {
//     setPage(newPage);
//   };

//   const handleChangeRowsPerPage = (event) => {
//      const newSize = parseInt(event.target.value, 10);
//     setRowsPerPage(newSize);
//     setPage(0); // Reset page when rows per page changes
//   };

//   if (loading) {
//     return (
//       <div className="cloud-container">
//         <svg
//           xmlns="http://www.w3.org/2000/svg"
//           viewBox="7.87722 9.61948 33.01 16.88"
//         >
//           <path
//             d="M 12 26 H 37 C 42 26 41 20  37 20 C 38 18 37 15 33 16 C 32 8 15 8 14 17 C 8 16 6 25 12 26"
//             className="cloud-back"
//           />
//           <path
//             d="M 12 26 H 37 C 42 26 41 20 37 20 C 38 18 37 15 33 16 C 32 8 15 8 14 17 C 8 16 6 25 12 26"
//             className="cloud-front"
//           />
//         </svg>
//         <div className="loading-message">Loading...</div>
//       </div>
//     );
//   }

//   if (error) {
//     return (
//       <div className="error-message">
//         <GoAlert />
//         <h2>❌ Server Down</h2>
//       </div>
//     );
//   }

//     const emptyRows = Math.max(0, rowsPerPage - requests.length);

//   return (
//     <>
//       <Stack
//         direction="row"
//         spacing={3}
//         justifyContent="flex-start"
//         sx={{ width: "90%", mx: "auto", mt: 4, mb: 2 }}
//       >
//         <Paper
//           elevation={3}
//           sx={{
//             p: 2,
//             minWidth: 250,
//             minHeight: 150,
//             backgroundColor: "#e3f2fd",
//           }}
//         >
//           <Typography variant="subtitle1">Total Pending Request</Typography>
//           <Typography variant="h3" color="primary">
//             {counts.pending}
//           </Typography>
//         </Paper>
//         <Paper
//           elevation={3}
//           sx={{ p: 2, minWidth: 250, backgroundColor: "#e8f5e9" }}
//         >
//           <Typography variant="subtitle1">Total Approved Request</Typography>
//           <Typography variant="h3" color="success.main">
//             {counts.approved}
//           </Typography>
//         </Paper>
//         <Paper
//           elevation={3}
//           sx={{ p: 2, minWidth: 250, backgroundColor: "#ffebee" }}
//         >
//           <Typography variant="subtitle1">Total Rejected Request</Typography>
//           <Typography variant="h3" color="error.main">
//             {counts.rejected}
//           </Typography>
//         </Paper>
//       </Stack>

//       <Paper
//         sx={{
//           width: "90%",
//           margin: "20px auto",
//           padding: "20px",
//           borderRadius: "10px",
//           boxShadow: 3,
//         }}
//       >
//         <Typography
//           variant="h5"
//           sx={{ marginBottom: 2, textAlign: "left", fontWeight: "bold" }}
//         >
//           Approval Page
//         </Typography>
//         <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
//           <Table stickyHeader aria-label="sticky table">
//             <TableHead>
//               <TableRow>
//                 <StyledTableCell>Sr. No.</StyledTableCell>
//                 <StyledTableCell>Name</StyledTableCell>
//                 <StyledTableCell>VM Name</StyledTableCell>
//                 <StyledTableCell>Project Name</StyledTableCell>
//                 <StyledTableCell>Image</StyledTableCell>
//                 <StyledTableCell>Flavor</StyledTableCell>
//                 <StyledTableCell>Purpose</StyledTableCell>
//                 <StyledTableCell>FLA Status</StyledTableCell>
//                 <StyledTableCell>Request Time</StyledTableCell>
//                 <StyledTableCell>FLA Approved Time</StyledTableCell>
//                 <StyledTableCell>Actions</StyledTableCell>
//               </TableRow>
//             </TableHead>
//             <TableBody>
//               {requests
//                 // .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
//                 .map((request, index) => (
//                   <StyledTableRow key={request.id}>
//                     <StyledTableCell>
//                       {page * rowsPerPage + index + 1}
//                     </StyledTableCell>{" "}
//                     {/* Sr. No. data is now after the checkbox data */}
//                     <StyledTableCell>{request.name}</StyledTableCell>
//                     <StyledTableCell>
//                       {request.vm_name.split("_").slice(1).join("_")}
//                     </StyledTableCell>
//                     <StyledTableCell>{request.project_name}</StyledTableCell>
//                     <StyledTableCell>{request.image}</StyledTableCell>
//                     <StyledTableCell>{request.flavor}</StyledTableCell>
//                     <StyledTableCell>
//                       {request.purpose_of_request}
//                     </StyledTableCell>
//                     <StyledTableCell>{request.fla_status}</StyledTableCell>
//                     <StyledTableCell>
//                       {" "}
//                       {new Date(request.request_timestamp).toLocaleString(
//                         "en-IN",
//                         {
//                           day: "2-digit",
//                           month: "short",
//                           year: "numeric",
//                           hour: "2-digit",
//                           minute: "2-digit",
//                           hour12: true,
//                         }
//                       )}
//                     </StyledTableCell>
//                     <StyledTableCell>
//                       {" "}
//                       {new Date(request.fla_approved_timestamp).toLocaleString(
//                         "en-IN",
//                         {
//                           day: "2-digit",
//                           month: "short",
//                           year: "numeric",
//                           hour: "2-digit",
//                           minute: "2-digit",
//                           hour12: true,
//                         }
//                       )}
//                     </StyledTableCell>
//                     <StyledTableCell>
//                       {request.admin_status === "Pending" && (
//                         <Stack
//                           direction={{ xs: "column", sm: "row" }}
//                           spacing={1}
//                           justifyContent="center"
//                           alignItems="center"
//                         >
//                           <Button
//                             variant="contained"
//                             color="success"
//                             size="small"
//                             onClick={() =>
//                               handleStatusUpdate(request.id, "Accepted")
//                             }
//                           >
//                             Accept
//                           </Button>
//                           <Button
//                             variant="contained"
//                             color="error"
//                             size="small"
//                             onClick={() =>
//                               handleStatusUpdate(request.id, "Rejected")
//                             }
//                           >
//                             Reject
//                           </Button>
//                         </Stack>
//                       )}
//                     </StyledTableCell>
//                   </StyledTableRow>
//                 ))}
//               {emptyRows > 0 && (
//                 <TableRow style={{ height: 53 * emptyRows }}>
//                   <TableCell colSpan={10} />
//                 </TableRow>
//               )}
//             </TableBody>
//           </Table>
//         </TableContainer>
//         <TablePagination
//           rowsPerPageOptions={[5, 10, 25]}
//           component="div"
//           count={totalRecords}
//           rowsPerPage={rowsPerPage}
//           page={page}
//           onPageChange={handleChangePage}
//           onRowsPerPageChange={handleChangeRowsPerPage}
//         />
//       </Paper>
//       <Dialog
//   open={alertDialog.open}
//   onClose={() => setAlertDialog({ ...alertDialog, open: false })}
// >
//   <DialogTitle sx={{ textAlign: "center", p: 3 }}>
//     {alertDialog.severity === "success" ? (
//       <CheckCircleIcon color="success" sx={{ fontSize: 60 }} />
//     ) : (
//       <ErrorIcon color="error" sx={{ fontSize: 60 }} />
//     )}
//   </DialogTitle>
//   <DialogContent sx={{ textAlign: "center", px: 6 }}>
//     <Typography variant="h6" gutterBottom>
//       {alertDialog.severity === "success" ? "Success" : "Error"}
//     </Typography>
//     <Typography variant="body1" color="text.secondary">
//       {alertDialog.message}
//     </Typography>
//   </DialogContent>
//   <DialogActions sx={{ justifyContent: "center", pb: 3 }}>
//     <Button
//       onClick={() => setAlertDialog({ ...alertDialog, open: false })}
//       variant="contained"
//       color={alertDialog.severity}
//     >
//       OK
//     </Button>
//   </DialogActions>
// </Dialog>

//     </>
//   );
// };

// export default AdminApproval;
