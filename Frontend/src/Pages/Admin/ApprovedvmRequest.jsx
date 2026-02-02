import { useEffect, useState } from "react";
import apiClient from "../../Axios";
import "../style.css";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  TablePagination,
  Menu,
  MenuItem,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import { tableCellClasses } from "@mui/material/TableCell";
import { GoAlert } from "react-icons/go";
import "../style.css";

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
    color: "#000",
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

const getStatusStyles = (status, powerState) => {
  if (status === "ACTIVE" && powerState === "Running") {
    return { color: "white", background: "#4CAF50" }; // Green
  }
  if (status === "SHUTOFF" || powerState === "Shutdown") {
    return { color: "white", background: "#F44336" }; // Red
  }
  if (status === "ERROR") {
    return { color: "white", background: "#FF9800" }; // Orange
  }
  return { color: "white", background: "#9E9E9E" }; // Gray
};

const ApprovedvmRequest = () => {
  const [data, setData] = useState([]);
  const [anchorEl, setAnchorEl] = useState(null);
  const [currentVM, setCurrentVM] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0); // Current page, 0-based index
  const [rowsPerPage, setRowsPerPage] = useState(5); // VMs per page
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [confirmVM, setConfirmVM] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [alertDialog, setAlertDialog] = useState({
    open: false,
    message: "",
    severity: "info",
  });
  const [deleteReason, setDeleteReason] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [vmToDelete, setVmToDelete] = useState(null);

  // const handleOpenVM = (vm) => {
  //   const params = new URLSearchParams({
  //     ip: vm.ip,
  //     user: vm.username,
  //     name: vm.vm_name.split("_").slice(1).join("_"),
  //   }).toString();

  //   // Center the popup window
  //   const w = 1000,
  //     h = 600;
  //   const left = window.screen.width / 2 - w / 2;
  //   const top = window.screen.height / 2 - h / 2;

  //   window.open(
  //     `/vm-shell?${params}`,
  //     `shell-${vm.id}`,
  //     `width=${w},height=${h},top=${top},left=${left},resizable=yes`,
  //   );
  //   closeMenu(); // Close the menu after clicking
  // };

  const openMenu = (event, vm) => {
    setAnchorEl(event.currentTarget);
    setCurrentVM(vm);
  };

  const closeMenu = () => {
    setAnchorEl(null);
    setCurrentVM(null);
  };

  const openDeleteDialog = (vm) => {
    setVmToDelete(vm);
    setDeleteDialogOpen(true);
  };

  const closeDeleteDialog = () => {
    setDeleteReason("");
    setVmToDelete(null);
    setDeleteDialogOpen(false);
  };

  const handleDeleteRequest = async () => {
    if (!vmToDelete) return;

    setDeleteLoading(true); // button loader starts

    try {
      const response = await apiClient.post(
        "/vmrequests/delete/request-user/",
        {
          vm_id: vmToDelete.vm_name,
          reason: deleteReason,
        },
      );

      setAlertDialog({
        open: true,
        message: response.data.message || "Delete request sent to admin.",
        severity: "success",
      });

      closeDeleteDialog(); // 👈 close dialog only AFTER success

      const refreshedData = await apiClient.get(
        "/vmrequests/approved-vms/user/",
      );
      setData(refreshedData.data.data ?? []);
    } catch (err) {
      setAlertDialog({
        open: true,
        message: "Failed to send delete request!",
        severity: "error",
      });
      console.error("Delete Request Error:", err);
    } finally {
      setDeleteLoading(false);
    }
  };
  useEffect(() => {
    if (alertDialog.open) {
      const timer = setTimeout(() => {
        setAlertDialog((prev) => ({ ...prev, open: false }));
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [alertDialog.open]);

  const fetchData = async () => {
    setError(null);
    try {
      const response = await apiClient.get("/vmrequests/approved-vms/user/");
      const responseData = response?.data?.data ?? [];
      setData(responseData);
    } catch (err) {
      console.error("Error fetching approved VM requests:", err);
      setError("Failed to fetch approved VM requests.");
      setData([]); // fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const showAlert = (message, severity = "success") => {
    setAlertMessage(message);
    setAlertSeverity(severity);
    setAlertOpen(true);
  };

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
      <div className="error-message">
        <GoAlert />
        <h2>❌ {error}</h2>
      </div>
    );
  }

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0); // Reset page when rows per page changes
  };

  const emptyRows =
    rowsPerPage - Math.min(rowsPerPage, data.length - page * rowsPerPage);

  const openConfirmDialog = (vm, actionType) => {
    setConfirmVM(vm);
    setConfirmAction(actionType);
    setConfirmOpen(true);
  };

  const closeConfirmDialog = () => {
    setConfirmVM(null);
    setConfirmAction("");
    setConfirmOpen(false);
  };

  const confirmMsg = {
    reboot: "Confirm soft reboot?",
    pause: "Pause VM?",
    resume: "Resume VM?",
    delete: "Request deletion? Admin approval required.",
  };

  const executeAction = async () => {
    if (!confirmVM || !confirmAction) return;

    try {
      const response = await apiClient.post("/vmrequests/action/user/", {
        vm_id: confirmVM.vm_name,
        action: confirmAction,
      });

      setAlertDialog({
        open: true,
        message: response.data.message,
        severity: "success",
      });

      // Refresh data after action
      const refreshedData = await apiClient.get(
        "/vmrequests/approved-vms/user/",
      );
      setData(refreshedData.data.data ?? []);
    } catch (error) {
      console.error("VM Action Error:", error);
      setAlertDialog({
        open: true,
        message: "Action failed!",
        severity: "error",
      });
    } finally {
      closeConfirmDialog();
    }
  };

  return (
    <>
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
        <Typography
          variant="h5"
          sx={{ marginBottom: 2, textAlign: "left", fontWeight: "bold" }}
        >
          Approved Request
        </Typography>
        <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
          <Table stickyHeader aria-label="sticky table">
            <TableHead>
              <TableRow>
                <StyledTableCell>Sr. No.</StyledTableCell>{" "}
                {/* Sr. No. data is now after the checkbox data */}
                {/* <StyledTableCell>ID</StyledTableCell> */}
                <StyledTableCell>VM Name</StyledTableCell>
                <StyledTableCell>Project Name</StyledTableCell>
                <StyledTableCell>IP</StyledTableCell>
                <StyledTableCell>Username</StyledTableCell>
                <StyledTableCell>Password</StyledTableCell>
                <StyledTableCell>Status</StyledTableCell>
                <StyledTableCell>Power State</StyledTableCell>
                <StyledTableCell>VDI Access URL</StyledTableCell>
                <StyledTableCell>Actions</StyledTableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((item, index) => (
                  <StyledTableRow key={item.id}>
                    <StyledTableCell>
                      {page * rowsPerPage + index + 1}
                    </StyledTableCell>
                    {/* Sr. No. data is now after the checkbox data */}
                    {/* <StyledTableCell>{item.id}</StyledTableCell> */}
                    <StyledTableCell>
                      {item.vm_name.split("_").slice(1).join("_")}
                    </StyledTableCell>
                    <StyledTableCell>{item.project_name}</StyledTableCell>
                    <StyledTableCell>{item.ip}</StyledTableCell>
                    <StyledTableCell>{item.username}</StyledTableCell>
                    <StyledTableCell>{item.username}</StyledTableCell>
                    <StyledTableCell>
                      <span
                        style={{
                          padding: "4px 8px",
                          borderRadius: "6px",
                          fontWeight: "bold",
                          ...getStatusStyles(item.status, item.power_state),
                        }}
                      >
                        {item.status || "Unknown"}
                      </span>
                    </StyledTableCell>
                    <StyledTableCell>
                      {item.power_state ? item.power_state : "Unknown"}
                    </StyledTableCell>
                    <StyledTableCell>
                      <a
                        href="https://virtuallab.bosschn.in/"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Virtual Lab
                      </a>
                    </StyledTableCell>
                    <StyledTableCell>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={(e) => openMenu(e, item)}
                      >
                        Actions ▾
                      </Button>

                      <Menu
                        anchorEl={anchorEl}
                        open={Boolean(anchorEl) && currentVM?.id === item.id}
                        onClose={closeMenu}
                      >
                        {/* <MenuItem
                          onClick={() => handleOpenVM(item)}
                          sx={{ fontWeight: "bold", color: "#253848" }}
                        >
                          🖥️ Open Shell
                        </MenuItem> */}
                        <MenuItem
                          onClick={() => openConfirmDialog(item, "reboot")}
                        >
                          Soft Reboot
                        </MenuItem>
                        <MenuItem
                          onClick={() => openConfirmDialog(item, "pause")}
                        >
                          Pause
                        </MenuItem>
                        <MenuItem
                          onClick={() => openConfirmDialog(item, "resume")}
                        >
                          Resume
                        </MenuItem>
                        <MenuItem
                          onClick={() => openDeleteDialog(item)}
                          sx={{ color: "red", fontWeight: "bold" }}
                        >
                          Delete Instance
                        </MenuItem>
                      </Menu>
                    </StyledTableCell>
                  </StyledTableRow>
                ))}
              {emptyRows > 0 && (
                <TableRow style={{ height: 53 * emptyRows }}>
                  <TableCell colSpan={8} />
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={data.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>
      <Dialog open={confirmOpen} onClose={closeConfirmDialog}>
        <DialogTitle>Confirm VM Action</DialogTitle>
        <DialogContent>
          <Typography>
            {confirmAction &&
              `Are you sure you want to ${confirmAction} ${confirmVM?.vm_name}?`}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeConfirmDialog}>Cancel</Button>
          <Button variant="contained" color="error" onClick={executeAction}>
            Confirm
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteDialogOpen} onClose={closeDeleteDialog}>
        <DialogTitle>Delete VM {vmToDelete?.vm_name}?</DialogTitle>
        <DialogContent>
          <TextField
            label="Reason for deletion (optional)"
            fullWidth
            multiline
            rows={3}
            value={deleteReason}
            onChange={(e) => setDeleteReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDeleteDialog} disabled={deleteLoading}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeleteRequest}
            disabled={deleteLoading}
          >
            {deleteLoading ? "Processing..." : "Confirm Delete"}
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={alertDialog.open}
        onClose={() => setAlertDialog({ ...alertDialog, open: false })}
      >
        <DialogContent>
          <Typography
            sx={{
              fontWeight: 600,
              color:
                alertDialog.severity === "success"
                  ? "green"
                  : alertDialog.severity === "error"
                    ? "red"
                    : "black",
            }}
          >
            {alertDialog.message}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            variant="contained"
            onClick={() => setAlertDialog({ ...alertDialog, open: false })}
          >
            OK
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ApprovedvmRequest;

// const handleOpenDialog = (username) => {
//   setSelectedUser(username);
//   setNewPassword("");
//   setOpenDialog(true);
// };

// const handleCloseDialog = () => {
//   setOpenDialog(false);
// };

// const handleUpdatePassword = async (e) => {
//   e.preventDefault(); // Prevent form default submission behavior

//   if (!newPassword) {
//     alert("New password is required.");
//     return;
//   }

//   try {
//     const response = await apiClient.post("/guacamole/update-password/", {
//       username: selectedUser,
//       new_password: newPassword,
//     });

//     if (response.status === 200 || response.status === 201) {
//       alert("Password updated successfully!");
//       setOpenDialog(false); // close the dialog
//       setNewPassword("");
//       setSelectedUser("");
//     } else {
//       alert(`Failed to update password. Status: ${response.status}`);
//     }
//   } catch (error) {
//     console.error("Error updating password:", error);
//     alert(`Error updating password: ${error.message}`);
//   }
// };
