import { useEffect, useState } from "react";
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  TablePagination,
} from "@mui/material";
import apiClient from "../../Axios"; // your axios instance
import { styled } from "@mui/material/styles";

const StyledTableCell = styled(TableCell)(({ theme }) => ({
  fontWeight: "bold",
}));

const VMDeleteApproval = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [alertDialog, setAlertDialog] = useState({
    open: false,
    message: "",
    severity: "info",
  });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  const fetchPendingDeletes = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("/vmrequests/delete/pending/"); // API to fetch pending deletions
      setData(res.data.data || []);
    } catch (err) {
      console.error("Error fetching delete requests:", err);
      setError("Failed to fetch delete requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingDeletes();
  }, []);

  const handleApproveReject = async (vm_name, approve) => {
    try {
      const res = await apiClient.post("/vmrequests/delete/admin/", {
        vm_id: vm_name,
        approve,
      });

      setAlertDialog({
        open: true,
        message: res.data.message,
        severity: "success",
      });

      // Refresh data
      fetchPendingDeletes();
    } catch (err) {
      console.error("Delete approval error:", err);
      setAlertDialog({
        open: true,
        message: "Action failed!",
        severity: "error",
      });
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;

  const emptyRows =
    rowsPerPage - Math.min(rowsPerPage, data.length - page * rowsPerPage);

  return (
    <>
    <Paper sx={{ width: "90%", margin: "20px auto", padding: 2 }}>
      <Typography variant="h5" sx={{ marginBottom: 2 }}>
        VM Delete Requests (Admin Approval)
      </Typography>
      <TableContainer>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <StyledTableCell>Sr. No.</StyledTableCell>
              <StyledTableCell>VM Name</StyledTableCell>
              <StyledTableCell>Project Name</StyledTableCell>
              <StyledTableCell>IP</StyledTableCell>
              <StyledTableCell>Username</StyledTableCell>
              <StyledTableCell>Reason for Deletion</StyledTableCell>
              <StyledTableCell>Actions</StyledTableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((item, index) => (
                <TableRow key={item.id}>
                  <TableCell>{page * rowsPerPage + index + 1}</TableCell>
                  <TableCell>{item.vm_name}</TableCell>
                  <TableCell>{item.project_name}</TableCell>
                  <TableCell>{item.ip}</TableCell>
                  <TableCell>{item.username}</TableCell>
                  <TableCell>{item.delete_request_reason || "N/A"}</TableCell>
                  <TableCell>
                    <Button
                      variant="contained"
                      color="success"
                      size="small"
                      sx={{ marginRight: 1 }}
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
                  </TableCell>
                </TableRow>
              ))}
            {emptyRows > 0 && (
              <TableRow style={{ height: 53 * emptyRows }}>
                <TableCell colSpan={7} />
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


    <Dialog
      open={alertDialog.open}
      onClose={() => setAlertDialog({ ...alertDialog, open: false })}
    >
      <DialogTitle>Info</DialogTitle>
      <DialogContent>
        <Typography>{alertDialog.message}</Typography>
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

export default VMDeleteApproval;
