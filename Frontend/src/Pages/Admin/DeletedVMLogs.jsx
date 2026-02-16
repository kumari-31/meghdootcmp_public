import React, { useEffect, useState, useCallback } from "react";
import {
  Box, Card, Typography, TextField, Button, Dialog, DialogTitle,
  DialogContent, Grid, Stack, Chip, Avatar, IconButton, Tooltip, Paper, Divider
} from "@mui/material";
import { DataGrid, GridToolbarContainer, GridToolbarExport } from "@mui/x-data-grid";
import { 
  History, Search, Visibility, DeleteForever, EventNote, 
  AccountCircle, CloudQueue, Lan, Storage, Info 
} from "@mui/icons-material";
import dayjs from "dayjs";
import apiClient from "../../Axios";

function CustomToolbar() {
  return (
    <GridToolbarContainer sx={{ p: 1 }}>
      <GridToolbarExport color="primary" />
    </GridToolbarContainer>
  );
}

const DeletedVMLogs = () => {
  const [logs, setLogs] = useState([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [search, setSearch] = useState("");
  const [selectedLog, setSelectedLog] = useState(null);
  const [loading, setLoading] = useState(false);

  // 🔄 Fetch Logs - Defaults to empty strings so Backend can apply "last 2 days" logic
  const fetchLogs = useCallback(async (dateInput = selectedDate, searchInput = search) => {
    try {
      setLoading(true);
      const res = await apiClient.get("/deleted-vm-logs/", {
        params: {
          date: dateInput || "", // Send empty if no date selected
          search: searchInput || "",
        },
      });
      setLogs(res.data);
    } catch (error) {
      console.error("Error fetching logs:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedDate, search]);

  // Load once on mount
  useEffect(() => {
    fetchLogs();
  }, []);

  const columns = [
    {
      field: "vm_name",
      headerName: "Virtual Machine",
      flex: 1.2,
      renderCell: (params) => (
        <Stack direction="row" spacing={1} alignItems="center">
          <Avatar sx={{ width: 28, height: 28, bgcolor: 'error.light' }}>
            <CloudQueue fontSize="small" />
          </Avatar>
          <Typography variant="body2" fontWeight="medium">
            {params.value ? params.value.split("_").slice(1).join("_") : "-"}
          </Typography>
        </Stack>
      ),
    },
    { 
      field: "employee_details", 
      headerName: "User / Employee", 
      flex: 1,
      renderCell: (params) => (
        <Box>
          <Typography variant="body2">{params.value?.name || "Unknown"}</Typography>
          <Typography variant="caption" color="text.secondary">{params.row.employee_id}</Typography>
        </Box>
      )
    },
    {
      field: "request_timestamp",
      headerName: "Created On",
      flex: 0.8,
      renderCell: (params) => params.value ? dayjs(params.value).format("MMM DD, YYYY") : "-",
    },
    {
      field: "deleted_at",
      headerName: "Deleted On",
      flex: 1,
      renderCell: (params) => (
        <Chip 
          label={params.value ? dayjs(params.value).format("DD-MM-YYYY HH:mm") : "N/A"} 
          size="small" 
          variant="outlined" 
          color="error" 
        />
      ),
    },
    {
      field: "view",
      headerName: "Audit",
      sortable: false,
      renderCell: (params) => (
        <Tooltip title="View Full Lifecycle">
          <IconButton color="primary" onClick={() => setSelectedLog(params.row)}>
            <Visibility fontSize="small" />
          </IconButton>
        </Tooltip>
      ),
    },
  ];

  return (
    <Box p={4} sx={{ backgroundColor: "#f8f9fa", minHeight: "100vh" }}>
      {/* Header Section */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Typography variant="h4" fontWeight="bold" color="text.primary">
            VM Deletion Audit
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Monitor and track the lifecycle of terminated cloud instances.
          </Typography>
        </Box>
        <Button 
          startIcon={<History />} 
          variant="outlined" 
          onClick={() => { setSelectedDate(""); setSearch(""); fetchLogs("", ""); }}
        >
          Reset View
        </Button>
      </Stack>

      {/* Statistics Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} md={4}>
          <Paper elevation={0} sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 2 }}>
            <Typography variant="overline" color="text.secondary">Total Terminated (Recent)</Typography>
            <Typography variant="h4" fontWeight="bold" color="error.main">{logs.length}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper elevation={0} sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 2 }}>
            <Typography variant="overline" color="text.secondary">Active Filters</Typography>
            <Typography variant="h6">{search || "All Projects"} / {selectedDate || "Last 2 Days"}</Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Filter Section */}
      <Card sx={{ p: 2, mb: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', borderRadius: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4}>
            <TextField
              label="Filter by Date"
              type="date"
              fullWidth
              size="small"
              InputLabelProps={{ shrink: true }}
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={5}>
            <TextField
              label="Search User, VM, or Project"
              fullWidth
              size="small"
              placeholder="e.g. Rahul / VM_Meghdoot_01"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: <Search fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />,
              }}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <Button
              variant="contained"
              fullWidth
              disableElevation
              sx={{ height: "40px", borderRadius: 2 }}
              onClick={() => fetchLogs()}
            >
              Apply Filter
            </Button>
          </Grid>
        </Grid>
      </Card>

      {/* Main Table */}
      <Card sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: 'none' }}>
        <DataGrid
          rows={logs}
          columns={columns}
          loading={loading}
          getRowId={(row) => row.id}
          pageSizeOptions={[10, 20, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
          slots={{ toolbar: CustomToolbar }}
          disableRowSelectionOnClick
          sx={{
            height: 600,
            border: 'none',
            '& .MuiDataGrid-columnHeaders': { backgroundColor: '#f1f3f5', color: '#495057' },
            '& .MuiDataGrid-cell:focus': { outline: 'none' },
          }}
        />
      </Card>

      {/* Audit Dialog */}
      <Dialog open={!!selectedLog} onClose={() => setSelectedLog(null)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: '#fdfdfd' }}>
          <DeleteForever color="error" />
          <Typography variant="h6" fontWeight="bold">
            Audit Report: {selectedLog?.vm_name?.split("_").slice(1).join("_")}
          </Typography>
        </DialogTitle>
        
        <DialogContent dividers sx={{ bgcolor: '#fafafa' }}>
          {selectedLog && (
            <Grid container spacing={3}>
              {/* Employee Info */}
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom color="primary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <AccountCircle fontSize="inherit" /> USER DETAILS
                </Typography>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="body2"><strong>Name:</strong> {selectedLog.employee_details?.name}</Typography>
                  <Typography variant="body2"><strong>Employee ID:</strong> {selectedLog.employee_id}</Typography>
                  <Typography variant="body2"><strong>Email:</strong> {selectedLog.employee_details?.email}</Typography>
                  <Typography variant="body2"><strong>Designation:</strong> {selectedLog.employee_details?.designation}</Typography>
                </Paper>
              </Grid>

              {/* VM Specs */}
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom color="primary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Lan fontSize="inherit" /> NETWORK & SPECS
                </Typography>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="body2"><strong>IP Address:</strong> {selectedLog.ip || "N/A"}</Typography>
                  <Typography variant="body2"><strong>Flavor:</strong> {selectedLog.flavor}</Typography>
                  <Typography variant="body2"><strong>Image:</strong> {selectedLog.image}</Typography>
                  <Typography variant="body2"><strong>Project:</strong> {selectedLog.project_name}</Typography>
                </Paper>
              </Grid>

              {/* Storage Info */}
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom color="primary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Storage fontSize="inherit" /> STORAGE DETAILS
                </Typography>
                <Paper variant="outlined" sx={{ p: 2, bgcolor: "#fffcf8" }}>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="body2"><strong>Volume ID:</strong> {selectedLog.volume_id || "None"}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2"><strong>Data Volume ID:</strong> {selectedLog.data_volume_id || "None"}</Typography>
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>

              {/* Deletion Details */}
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom color="error" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Info fontSize="inherit" /> TERMINATION REMARKS
                </Typography>
                <Paper variant="outlined" sx={{ p: 2, bgcolor: "#fff5f5" }}>
                  <Typography variant="body2"><strong>Requested Reason:</strong> {selectedLog.delete_request_reason || "No reason given"}</Typography>
                  <Typography variant="body2"><strong>Approved By:</strong> {selectedLog.delete_approved_by}</Typography>
                </Paper>
              </Grid>

              {/* Timeline */}
              <Grid item xs={12}>
                <Typography variant="subtitle2" mb={2} color="primary">LIFECYCLE TIMELINE</Typography>
                <Box sx={{ position: 'relative', pl: 3, borderLeft: '2px dashed #e0e0e0' }}>
                   {[
                     { label: 'Requested', time: selectedLog.request_timestamp, icon: <EventNote /> },
                     { label: 'FLA Approved', time: selectedLog.fla_approved_timestamp, icon: <AccountCircle /> },
                     { label: 'Admin Approved', time: selectedLog.admin_approved_timestamp, icon: <AccountCircle /> },
                     { label: 'Deleted At', time: selectedLog.deleted_at, icon: <DeleteForever />, color: 'error.main' },
                   ].map((step, idx) => (
                     <Box key={idx} sx={{ mb: 2, position: 'relative' }}>
                        <Box sx={{ position: 'absolute', left: -34, top: 0, bgcolor: 'white' }}>
                            <Avatar sx={{ width: 24, height: 24, bgcolor: step.color || 'primary.main', fontSize: 12 }}>{idx + 1}</Avatar>
                        </Box>
                        <Typography variant="body2" fontWeight="bold">{step.label}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {step.time ? dayjs(step.time).format("DD-MM-YYYY HH:mm:ss") : "N/A"}
                        </Typography>
                     </Box>
                   ))}
                </Box>
              </Grid>
            </Grid>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default DeletedVMLogs;