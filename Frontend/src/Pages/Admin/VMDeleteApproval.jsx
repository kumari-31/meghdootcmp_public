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
  TextField,
  Box,
  Snackbar,
  Alert,
  Slide,
  TablePagination,
} from "@mui/material";

import { styled } from "@mui/material/styles";
import { tableCellClasses } from "@mui/material/TableCell";
import { useTheme } from "@mui/material/styles";
import {
  CheckCircleOutline,
  ErrorOutline,
  InfoOutlined,
  WarningOutlined,
} from "@mui/icons-material";

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

const VMDeleteRequests = () => {
  const theme = useTheme();

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");

  const showSnackbar = (message, severity) => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  // Fetch pending delete requests
  const fetchPendingDeletes = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("/vmrequests/delete/pending/");
      setData(res.data.data || []);
    } catch (err) {
      console.error("Error fetching delete requests:", err);
      setError("Failed to fetch delete requests.");
    } finally {
      setLoading(false);
    }
  };

  const handleApproveReject = async (vm_name, approve) => {
    try {
      const res = await apiClient.post("/vmrequests/delete/admin/", {
        vm_id: vm_name,
        approve,
      });

      showSnackbar(res.data.message, "success");
      fetchPendingDeletes();
    } catch (err) {
      console.error("Delete approval error:", err);
      showSnackbar("Action failed!", "error");
    }
  };

  useEffect(() => {
    fetchPendingDeletes();
  }, []);

  if (loading) {
    return (
      <div className="cloud-container">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="7.87722 9.61948 33.01 16.88">
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
        <h2>❌ Server Down</h2>
      </div>
    );
  }

  const getAlertIcon = (severity) => {
    switch (severity) {
      case "success":
        return <CheckCircleOutline style={{ marginRight: "8px" }} />;
      case "error":
        return <ErrorOutline style={{ marginRight: "8px" }} />;
      case "warning":
        return <WarningOutlined style={{ marginRight: "8px" }} />;
      default:
        return <InfoOutlined style={{ marginRight: "8px" }} />;
    }
  };

  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <h1>VM Delete Requests</h1>
      </div>

      <TableContainer
        component={Paper}
        sx={(theme) => ({
          width: "fit-content",
          minWidth: "75%",
          maxWidth: "100%",
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          backgroundColor: theme.palette.background.paper,
          boxShadow: theme.shadows[3],
        })}
      >
        <Table
          stickyHeader
          sx={{
            border: "none !important",
            "& td, & th": { border: "none !important" },
          }}
        >
          <TableHead>
            <TableRow>
              <StyledTableCell>Sr. No.</StyledTableCell>
              <StyledTableCell>VM Name</StyledTableCell>
              <StyledTableCell>Project Name</StyledTableCell>
              <StyledTableCell>IP</StyledTableCell>
              <StyledTableCell>Username</StyledTableCell>
              <StyledTableCell>Reason</StyledTableCell>
              <StyledTableCell>Actions</StyledTableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {data
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((item, index) => (
                <StyledTableRow key={item.id}>
                  <StyledTableCell>{page * rowsPerPage + index + 1}</StyledTableCell>
                  <StyledTableCell>{item.vm_name}</StyledTableCell>
                  <StyledTableCell>{item.project_name}</StyledTableCell>
                  <StyledTableCell>{item.ip}</StyledTableCell>
                  <StyledTableCell>{item.username}</StyledTableCell>
                  <StyledTableCell>
                    {item.delete_request_reason || "N/A"}
                  </StyledTableCell>

                  <StyledTableCell>
                    <Box display="flex" justifyContent="center" gap={1}>
                      <Button
                        variant="contained"
                        color="success"
                        size="small"
                        onClick={() => handleApproveReject(item.vm_name, true)}
                      >
                        Approve
                      </Button>

                      <Button
                        variant="contained"
                        color="error"
                        size="small"
                        onClick={() => handleApproveReject(item.vm_name, false)}
                      >
                        Reject
                      </Button>
                    </Box>
                  </StyledTableCell>
                </StyledTableRow>
              ))}
          </TableBody>
        </Table>

        {/* Pagination */}
        <Box sx={{ width: "100%", display: "flex", justifyContent: "flex-end" }}>
          <TablePagination
            rowsPerPageOptions={[5, 7, 10]}
            component="div"
            count={data.length}
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

      {/* Snackbar */}
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

export default VMDeleteRequests;
