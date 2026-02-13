import React, { useEffect, useState } from "react";
import {
  Box,
  Card,
  Typography,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  Grid,
  Chip,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import axios from "axios";
import dayjs from "dayjs";
import apiClient from "../../Axios";

const DeletedVMLogs = () => {
  const [logs, setLogs] = useState([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [search, setSearch] = useState("");
  const [selectedLog, setSelectedLog] = useState(null);
  const [loading, setLoading] = useState(false);

  // 🔄 Fetch Logs
  const fetchLogs = async () => {
    try {
      setLoading(true);

      
      const res = await apiClient.get("/deleted-vm-logs/", {
        params: {
          start_date: startDate,
          end_date: endDate,
          search: search,
        },
      });

      setLogs(res.data);
    } catch (error) {
      console.error("Error fetching logs:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  // 📋 Table Columns
  const columns = [
    { field: "vm_name", headerName: "VM Name", flex: 1 },
    { field: "employee_id", headerName: "Employee ID", flex: 1 },
    { field: "requested_by", headerName: "Requested By", flex: 1 },
    { field: "project_name", headerName: "Project", flex: 1 },
    { field: "delete_approved_by", headerName: "Deleted By", flex: 1 },
    {
      field: "deleted_at",
      headerName: "Deleted At",
      flex: 1,
      renderCell: (params) =>
        params.value
          ? dayjs(params.value).format("DD-MM-YYYY HH:mm")
          : "-",
    },
    {
      field: "view",
      headerName: "View",
      renderCell: (params) => (
        <Button
          variant="contained"
          size="small"
          onClick={() => setSelectedLog(params.row)}
        >
          View
        </Button>
      ),
    },
  ];

  return (
    <Box p={3}>
      <Typography variant="h4" mb={3}>
        Deleted VM Logs
      </Typography>

      {/* 🔍 Filter Section */}
      <Card sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={3}>
            <TextField
              label="Start Date"
              type="date"
              fullWidth
              InputLabelProps={{ shrink: true }}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </Grid>

          <Grid item xs={3}>
            <TextField
              label="End Date"
              type="date"
              fullWidth
              InputLabelProps={{ shrink: true }}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </Grid>

          <Grid item xs={3}>
            <TextField
              label="Search (VM / Employee / Project)"
              fullWidth
              onChange={(e) => setSearch(e.target.value)}
            />
          </Grid>

          <Grid item xs={3}>
            <Button
              variant="contained"
              fullWidth
              sx={{ height: "56px" }}
              onClick={fetchLogs}
            >
              Filter
            </Button>
          </Grid>
        </Grid>
      </Card>

      {/* 📊 Data Table */}
      <Card sx={{ height: 500 }}>
        <DataGrid
          rows={logs}
          columns={columns}
          loading={loading}
          getRowId={(row) => row.id}
          pageSizeOptions={[5, 10, 20]}
        />
      </Card>

      {/* 👁 Details Dialog */}
      <Dialog
        open={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Deleted VM Full Details</DialogTitle>

        <DialogContent dividers>
          {selectedLog && (
            <Grid container spacing={3}>

              {/* Employee Section */}
              <Grid item xs={12}>
                <Typography variant="h6">Employee Details</Typography>
              </Grid>

              <Grid item xs={6}>
                <Typography>Name: {selectedLog.name}</Typography>
                <Typography>Email: {selectedLog.email}</Typography>
                <Typography>Employee ID: {selectedLog.employee_id}</Typography>
                <Typography>Designation: {selectedLog.designation}</Typography>
              </Grid>

              {/* VM Section */}
              <Grid item xs={12}>
                <Typography variant="h6">VM Details</Typography>
              </Grid>

              <Grid item xs={6}>
                <Typography>VM Name: {selectedLog.vm_name}</Typography>
                <Typography>Instance: {selectedLog.instance_name}</Typography>
                <Typography>Host: {selectedLog.host_name}</Typography>
                <Typography>IP: {selectedLog.ip}</Typography>
                <Typography>Flavor: {selectedLog.flavor}</Typography>
                <Typography>Image: {selectedLog.image}</Typography>
              </Grid>

              {/* Timeline Section */}
              <Grid item xs={12}>
                <Typography variant="h6">Lifecycle Timeline</Typography>
              </Grid>

              <Grid item xs={6}>
                <Typography>
                  Requested At: {selectedLog.request_timestamp || "-"}
                </Typography>
                <Typography>
                  FLA Approved: {selectedLog.fla_approved_timestamp || "-"}
                </Typography>
                <Typography>
                  Admin Approved: {selectedLog.admin_approved_timestamp || "-"}
                </Typography>
                <Typography>
                  Deleted By: {selectedLog.delete_approved_by || "-"}
                </Typography>
                <Typography>
                  Deleted At: {selectedLog.deleted_at || "-"}
                </Typography>
              </Grid>

            </Grid>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default DeletedVMLogs;
