import React, { useEffect, useState } from "react";
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  TablePagination,
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

const ApprovedvmRequest = () => {
  const [data, setData] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0); // Current page, 0-based index
  const [rowsPerPage, setRowsPerPage] = useState(5); // VMs per page

  useEffect(() => {
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

    fetchData();
  }, []);

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

  const handleOpenDialog = (username) => {
    setSelectedUser(username);
    setNewPassword("");
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault(); // Prevent form default submission behavior

    if (!newPassword) {
      alert("New password is required.");
      return;
    }

    try {
      const response = await apiClient.post("/guacamole/update-password/", {
        username: selectedUser,
        new_password: newPassword,
      });

      if (response.status === 200 || response.status === 201) {
        alert("Password updated successfully!");
        setOpenDialog(false); // close the dialog
        setNewPassword("");
        setSelectedUser("");
      } else {
        alert(`Failed to update password. Status: ${response.status}`);
      }
    } catch (error) {
      console.error("Error updating password:", error);
      alert(`Error updating password: ${error.message}`);
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0); // Reset page when rows per page changes
  };

  const emptyRows =
    rowsPerPage - Math.min(rowsPerPage, data.length - page * rowsPerPage);

  return (
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
              <StyledTableCell>Purpose</StyledTableCell>
              <StyledTableCell>IP</StyledTableCell>
              <StyledTableCell>Username</StyledTableCell>
              <StyledTableCell>Password</StyledTableCell>
              <StyledTableCell>VDI Access URL</StyledTableCell>
              <StyledTableCell>Change Password</StyledTableCell>
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
                  <StyledTableCell>{item.purpose}</StyledTableCell>
                  <StyledTableCell>{item.ip}</StyledTableCell>
                  <StyledTableCell>{item.username}</StyledTableCell>
                  <StyledTableCell>{item.username}</StyledTableCell>
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
                      onClick={() => handleOpenDialog(item.username)}
                    >
                      Update Password
                    </Button>
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
      <Dialog open={openDialog} onClose={handleCloseDialog}>
        <DialogTitle>Update Password for {selectedUser}</DialogTitle>
        <DialogContent>
          <TextField
            label="New Password"
            type="password"
            fullWidth
            margin="dense"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleUpdatePassword}
            disabled={!newPassword}
          >
            Update
          </Button>
        </DialogActions>
      </Dialog>
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
  );
};

export default ApprovedvmRequest;
