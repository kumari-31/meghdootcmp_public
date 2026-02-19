import React, { useEffect, useState, useCallback } from "react";
import {
  Box, Card, Typography, TextField, Button, Dialog, DialogTitle,
  DialogContent, Grid, Stack, Avatar, Paper, InputAdornment, Fade, Divider, alpha, useTheme
} from "@mui/material";
import {
  DataGrid, GridToolbarContainer, GridToolbarExport, GridToolbarQuickFilter
} from "@mui/x-data-grid";
import {
  History, Computer, Search, Launch, Person, Dns, EventAvailable, 
  CancelScheduleSend, CloudDone, DeleteSweep, PendingActions, 
  Badge, BusinessCenter, Layers, Email
} from "@mui/icons-material";
import dayjs from "dayjs";
import apiClient from "../../Axios";

// --- 1. Uniform Status Component ---
const StatusTag = ({ label }) => {
  const theme = useTheme();
  const config = {
    ACTIVE: { color: theme.palette.success.main, bg: alpha(theme.palette.success.main, 0.08) },
    DELETED: { color: theme.palette.error.main, bg: alpha(theme.palette.error.main, 0.08) },
    REQUESTED: { color: theme.palette.warning.main, bg: alpha(theme.palette.warning.main, 0.08) },
    DEFAULT: { color: theme.palette.grey[600], bg: alpha(theme.palette.grey[600], 0.08) }
  };
  const style = config[label?.toUpperCase()] || config.DEFAULT;

  return (
    <Box sx={{
      width: 110, py: 0.7, borderRadius: '8px', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      backgroundColor: style.bg, border: `1px solid ${alpha(style.color, 0.2)}`,
    }}>
      <Typography variant="caption" sx={{ color: style.color, fontWeight: 700, letterSpacing: '0.8px' }}>
        {label?.toUpperCase()}
      </Typography>
    </Box>
  );
};

// --- 2. Toolbar ---
function CustomToolbar() {
  return (
    <GridToolbarContainer sx={{ p: 2, display: 'flex', justifyContent: 'space-between' }}>
      <GridToolbarQuickFilter 
        placeholder="Search Owners, VMs..."
        variant="outlined" size="small"
        sx={{ width: 350, '& .MuiOutlinedInput-root': { borderRadius: 3, bgcolor: 'white' } }} 
      />
      <GridToolbarExport variant="contained" size="small" sx={{ borderRadius: 2, px: 3, boxShadow: 'none' }} />
    </GridToolbarContainer>
  );
}

const VMLogs = () => {
  const [logs, setLogs] = useState([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedLog, setSelectedLog] = useState(null);
  const [loading, setLoading] = useState(false);

  // --- API Fetch Logic ---
  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      
      // FIX: Ensure date is formatted as YYYY-MM-DD for the backend
      if (selectedDate) {
        params.date = dayjs(selectedDate).format("YYYY-MM-DD");
      }

      const res = await apiClient.get("/all-vm-logs/", { params });
      setLogs(res.data || []);
    } catch (error) {
      console.error("Fetch Error:", error);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  // Refresh data whenever the selectedDate changes
  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const columns = [
    {
      field: "vm_name",
      headerName: "Instance Identity",
      flex: 1.5,
      renderCell: (params) => (
        <Stack direction="row" spacing={2} alignItems="center">
          <Avatar variant="rounded" sx={{ bgcolor: alpha('#1976d2', 0.1), color: 'primary.main', width: 40, height: 40 }}>
            <Computer />
          </Avatar>
          <Box>
            <Typography variant="body2" fontWeight={700}>{params.value ? params.value.split("_").slice(1).join("_") : "Unnamed VM"}</Typography>
            <Typography variant="caption" color="text.secondary">IP: {params.row.ip || '---'}</Typography>
          </Box>
        </Stack>
      ),
    },
    {
      field: "name",
      headerName: "Assigned Owner",
      flex: 1.2,
      renderCell: (params) => (
        <Box>
          <Typography variant="body2" fontWeight={600}>{params.value || "Unknown"}</Typography>
          <Typography variant="caption" color="text.secondary">{params.row.designation || "User"}</Typography>
        </Box>
      ),
    },
    {
      field: "log_type",
      headerName: "Status",
      width: 140,
      align: 'center',
      renderCell: (params) => <StatusTag label={params.value} />,
    },
    {
      field: "timestamp",
      headerName: "Last Activity",
      flex: 1,
      renderCell: (params) => (
        <Typography variant="body2">
          {dayjs(params.value).format("MMM DD, YYYY • HH:mm")}
        </Typography>
      )
    }
  ];

  return (
    <Box p={4} sx={{ backgroundColor: "#F1F5F9", minHeight: "100vh" }}>
      
      {/* Header & Date Filter */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Typography variant="h4" fontWeight={900} color="#0F172A">Infrastructure Logs</Typography>
          <Typography variant="body1" color="text.secondary">Detailed audit trail for virtual instances</Typography>
        </Box>
        <Stack direction="row" spacing={2}>
            <TextField
                type="date"
                size="small"
                label="Filter by Activity Date"
                InputLabelProps={{ shrink: true }}
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                sx={{ bgcolor: 'white', borderRadius: 2, width: 220 }}
            />
            <Button 
                variant="outlined" 
                onClick={() => setSelectedDate("")} 
                sx={{ borderRadius: 2, bgcolor: 'white', textTransform: 'none' }}
            >
                View All
            </Button>
        </Stack>
      </Stack>

      {/* Summary Cards */}
      <Grid container spacing={3} mb={4}>
        <SummaryCard icon={<CloudDone color="success"/>} label="Active" count={logs.filter(l => l.log_type?.toUpperCase() === 'ACTIVE').length} color="#2e7d32" />
        <SummaryCard icon={<DeleteSweep color="error"/>} label="Terminated" count={logs.filter(l => l.log_type?.toUpperCase() === 'DELETED').length} color="#d32f2f" />
        <SummaryCard icon={<PendingActions color="warning"/>} label="Events Found" count={logs.length} color="#ed6c02" />
      </Grid>

      {/* Table Card */}
      <Card sx={{ borderRadius: 4, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', border: 'none' }}>
        <DataGrid
          rows={logs}
          columns={columns}
          loading={loading}
          getRowId={(row) => row.id}
          rowHeight={75}
          onRowClick={(params) => setSelectedLog(params.row)}
          slots={{ toolbar: CustomToolbar }}
          disableRowSelectionOnClick
          sx={{
            border: 'none',
            '& .MuiDataGrid-columnHeaders': { bgcolor: '#F8FAFC', fontWeight: 800 },
            '& .MuiDataGrid-row:hover': { backgroundColor: alpha('#1976d2', 0.04), cursor: 'pointer' },
          }}
        />
      </Card>

      {/* Audit Report Dialog */}
      <Dialog
        open={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        maxWidth="md"
        fullWidth
        TransitionComponent={Fade}
        PaperProps={{ sx: { borderRadius: 5, overflow: 'hidden' } }}
      >
        <Box sx={{ bgcolor: 'primary.main', p: 3, color: 'white' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Stack direction="row" spacing={2} alignItems="center">
              <Avatar sx={{ bgcolor: 'white', color: 'primary.main' }}><Dns /></Avatar>
              <Box>
                <Typography variant="h6" fontWeight={800}>Internal Audit Report</Typography>
                <Typography variant="caption" sx={{ opacity: 0.8 }}>Report ID: {selectedLog?.id}</Typography>
              </Box>
            </Stack>
            <StatusTag label={selectedLog?.log_type} />
          </Stack>
        </Box>

        <DialogContent sx={{ p: 4 }}>
          {selectedLog && (
            <Grid container spacing={4}>
              <Grid item xs={12} md={6}>
                <Typography variant="overline" color="primary" fontWeight={800} gutterBottom sx={{ display: 'block', mb: 1 }}>Owner Profile</Typography>
                <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, bgcolor: '#F8FAFC' }}>
                  <Stack spacing={2}>
                    <InfoRow icon={<Badge fontSize="small"/>} label="Full Name" value={selectedLog.name} />
                    <InfoRow icon={<BusinessCenter fontSize="small"/>} label="Designation" value={selectedLog.designation} />
                    <InfoRow icon={<Layers fontSize="small"/>} label="Employee ID" value={selectedLog.employee_id} />
                    <InfoRow icon={<Email fontSize="small"/>} label="Email Address" value={selectedLog.email} />
                  </Stack>
                </Paper>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="overline" color="primary" fontWeight={800} gutterBottom sx={{ display: 'block', mb: 1 }}>Infrastructure Specs</Typography>
                <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, bgcolor: '#F8FAFC' }}>
                  <Stack spacing={2}>
                    <InfoRow icon={<Dns fontSize="small"/>} label="IP Address" value={selectedLog.ip || 'Unassigned'} />
                    <InfoRow icon={<Layers fontSize="small"/>} label="Flavor / SKU" value={selectedLog.flavor} />
                    <InfoRow icon={<Computer fontSize="small"/>} label="Base Image" value={selectedLog.image} />
                    <InfoRow icon={<Launch fontSize="small"/>} label="Project Group" value={selectedLog.project_name} />
                  </Stack>
                </Paper>
              </Grid>

              <Grid item xs={12}>
                <Divider sx={{ my: 1, mb: 3 }} />
                <Typography variant="overline" color="primary" fontWeight={800}>Lifecycle Timeline</Typography>
                <Grid container spacing={2} mt={1}>
                  <TimelineBox label="Requested" time={selectedLog.request_timestamp} icon={<PendingActions color="warning"/>} />
                  <TimelineBox label="Provisioned" time={selectedLog.admin_action_timestamp} icon={<EventAvailable color="success"/>} />
                  {selectedLog.deleted_at && (
                    <Grid item xs={12}>
                        <Paper sx={{ p: 2, bgcolor: alpha('#ef4444', 0.05), border: '1px solid', borderColor: alpha('#ef4444', 0.1), borderRadius: 3 }}>
                            <Stack direction="row" spacing={2} alignItems="center">
                                <CancelScheduleSend color="error" />
                                <Box sx={{ flex: 1 }}>
                                    <Typography variant="body2" fontWeight={800} color="error">Termination Finalized: {dayjs(selectedLog.deleted_at).format("DD MMM YYYY, HH:mm")}</Typography>
                                    <Typography variant="body2" sx={{ mt: 1, p: 1.5, bgcolor: 'white', borderRadius: 2, fontSize: '0.8rem' }}>
                                        <b>Reason:</b> {selectedLog.delete_request_reason || "Scheduled policy decommissioning"}
                                    </Typography>
                                </Box>
                            </Stack>
                        </Paper>
                    </Grid>
                  )}
                </Grid>
              </Grid>
            </Grid>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

// --- Helpers ---
const SummaryCard = ({ icon, label, count, color }) => (
  <Grid item xs={12} md={4}>
    <Card sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 3, borderRadius: 4, bgcolor: 'white' }}>
      <Avatar sx={{ bgcolor: alpha(color, 0.1), color: color, width: 52, height: 52 }}>{icon}</Avatar>
      <Box>
        <Typography variant="caption" color="text.secondary" fontWeight={800}>{label.toUpperCase()}</Typography>
        <Typography variant="h4" fontWeight={900}>{count}</Typography>
      </Box>
    </Card>
  </Grid>
);

const InfoRow = ({ icon, label, value }) => (
  <Stack direction="row" spacing={2} alignItems="center">
    <Box sx={{ color: 'text.secondary', opacity: 0.7, display: 'flex' }}>{icon}</Box>
    <Box>
      <Typography variant="caption" color="text.disabled" sx={{ fontWeight: 800 }}>{label.toUpperCase()}</Typography>
      <Typography variant="body2" fontWeight={700}>{value || '---'}</Typography>
    </Box>
  </Stack>
);

const TimelineBox = ({ label, time, icon }) => (
  <Grid item xs={12} sm={6}>
    <Paper variant="outlined" sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2, borderRadius: 3 }}>
      {icon}
      <Box>
        <Typography variant="caption" fontWeight={800} color="text.secondary">{label.toUpperCase()}</Typography>
        <Typography variant="body2" fontWeight={600} display="block">
            {time ? dayjs(time).format("DD MMM YYYY, HH:mm") : 'No Record'}
        </Typography>
      </Box>
    </Paper>
  </Grid>
);

export default VMLogs;