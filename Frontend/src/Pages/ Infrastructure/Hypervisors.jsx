import { useEffect, useState } from "react";
import apiClient from "../../Axios";
import {
  Box,
  Paper,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Snackbar,
  Alert,
  Slide,
  CircularProgress,
  Grid,
   Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import { useTheme } from "@mui/material/styles";
import { tableCellClasses } from "@mui/material/TableCell";
import "../style.css";
const toGB = (value) => {
  if (!value) return 0;

  // convert "23.5 GB" → "23.5"
  const clean = String(value).replace(/[^0-9.]/g, "");
  const num = Number(clean);

  if (!num) return 0;

  // if value contains MB → convert MB → GB
  if (String(value).toLowerCase().includes("mb")) {
    return +(num / 1024).toFixed(2);
  }

  // already in GB
  return +num.toFixed(2);
};

// Styled Table Components
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
    color: theme.palette.text.primary, // auto adjusts
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

// ---------------- Circular Gradient Stat Component ----------------
const GradientCircularStat = ({ value, label, subLabel, gradientId }) => {
  const theme = useTheme();
  const radius = 45;
  const stroke = 6;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (value / 100) * circumference;

  // THEME COLORS
  const isDark = theme.palette.mode === "dark";

  const gradientStart = isDark ? "#4ade80" : "#42a5f5"; // greenish in dark, blue in light
  const gradientEnd = isDark ? "#16a34a" : "#1e88e5";

  const textColor = isDark ? "#f1f5f9" : "#333"; // white-ish in dark mode
  const subTextColor = isDark ? "#cbd5e1" : "#64748b";

  const baseCircleColor = isDark ? "#334155" : "#e0e0e0"; // bg stroke

  return (
    <Box sx={{ textAlign: "center" }}>
      <svg height={radius * 2} width={radius * 2}>
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={gradientStart} />
            <stop offset="100%" stopColor={gradientEnd} />
          </linearGradient>
        </defs>
        {/* Background Circle */}
        <circle
          stroke={baseCircleColor}
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        {/* Animated Usage Circle */}
        <circle
          stroke={`url(#${gradientId})`}
          fill="transparent"
          strokeWidth={stroke}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          style={{ transition: "stroke-dashoffset 0.5s ease" }}
        />
        {/* Value Text */}
        <text
          x="50%"
          y="50%"
          dy=".3em"
          textAnchor="middle"
          fontSize="16"
          fontWeight="bold"
          fill={textColor}
        >
          {value}%
        </text>
      </svg>
      <Typography
        variant="body2"
        sx={{
          mt: 1,
          fontWeight: 600,
          color: textColor,
        }}
      >
        {label}
      </Typography>
      {subLabel && (
        <Typography variant="caption" sx={{ color: subTextColor }}>
          {subLabel}
        </Typography>
      )}
    </Box>
  );
};

// ---------------- Main Component ----------------
const Hypervisors = () => {
  const [tab, setTab] = useState(0);
  const [hypervisors, setHypervisors] = useState([]);
  const [hosts, setHosts] = useState([]);
  const [resources, setResources] = useState([]);
  const theme = useTheme();
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState("");
  const [snackbarType, setSnackbarType] = useState("success");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  // 🔹 Instance popup states
  const [instanceOpen, setInstanceOpen] = useState(false);
  const [instances, setInstances] = useState([]);
  const [selectedHost, setSelectedHost] = useState("");
  const [instanceLoading, setInstanceLoading] = useState(false);
  // ---------------- Snackbar Handler ----------------//

  const showSnackbar = (msg, type) => {
    setSnackbarMsg(msg);
    setSnackbarType(type);
    setSnackbarOpen(true);
  };

  // ---------------- Fetch APIs ----------------
  const fetchHypervisors = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("infrastructure/hypervisors/");
      setHypervisors(res.data.data || []);
    } catch {
      showSnackbar("Failed to load hypervisors", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchHosts = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("infrastructure/hosts/");
      setHosts(res.data.data || []);
    } catch {
      showSnackbar("Failed to load hosts", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchResources = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("infrastructure/resource-providers/");
      setResources(res.data.data || []);
    } catch {
      showSnackbar("Failed to load resource providers", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHypervisors();
    fetchResources();
    fetchHosts();
  }, []);

  const fetchInstancesByHost = async (hostname) => {
    setSelectedHost(hostname);
    setInstanceOpen(true);
    setInstanceLoading(true);

    try {
      const res = await apiClient.get(
        `/infrastructure/hypervisors/${hostname}/instances/`
      );
      setInstances(res.data.data || []);
    } catch (err) {
      showSnackbar("Failed to load instances", "error");
    } finally {
      setInstanceLoading(false);
    }
  };

  // ⭐⭐⭐⭐⭐ ADD LOADING UI HERE ⭐⭐⭐⭐⭐
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

  // ⭐⭐⭐⭐⭐ ADD ERROR UI HERE ⭐⭐⭐⭐⭐
  if (error) {
    return (
      <div className="error-message">
        <GoAlert />
        <h2>❌ Server Down</h2>
      </div>
    );
  }

  const formatRelativeTime = (isoDate) => {
    if (!isoDate) return "-";

    const date = new Date(isoDate);
    const now = new Date();

    const diffMs = now - date;
    if (diffMs < 0) return "Just now";

    const minutes = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (days > 0) {
      const remHours = hours % 24;
      return `${days} day${days !== 1 ? "s" : ""}, ${remHours} hour${
        remHours !== 1 ? "s" : ""
      } ago`;
    }

    if (hours > 0) {
      const remMinutes = minutes % 60;
      return `${hours} hour${hours !== 1 ? "s" : ""}, ${remMinutes} min ago`;
    }

    return `${minutes} min ago`;
  };

  const handleTabChange = (_, newValue) => {
    setTab(newValue);
  };

  // ---------------- Render ----------------
  return (
    <div style={{ padding: 20 }}>
      <Typography variant="h5" sx={{ mb: 3, fontWeight: "bold" }}>
        Infrastructure Overview
      </Typography>

      {/* ------------------- SUMMARY SECTION ------------------- */}
      {/* ========= SUMMARY SECTION (DYNAMIC) ========= */}
      <Box sx={{ mb: 5 }}>
        <Grid container spacing={3}>
          {/* -------- Hypervisor Summary -------- */}
          <Grid item xs={12} md={6}>
            <Paper
              sx={{
                p: 3,
                borderRadius: 3,
                height: "100%",
                boxShadow: 6,
                background:
                  theme.palette.mode === "dark"
                    ? "linear-gradient(145deg, #0a0a0a, #1a1a1a)" // smooth black-on-black
                    : "linear-gradient(145deg, #f9fafb, #e9ecef)",
                color: theme.palette.mode === "dark" ? "#f1f5f9" : "#1e293b",
              }}
            >
              <Typography
                variant="h6"
                sx={{
                  mb: 3,
                  fontWeight: "bold",
                  textAlign: "center",
                  color: theme.palette.mode === "dark" ? "#e2e8f0" : "#1e293b",
                }}
              >
                Hypervisor Summary ({hypervisors[0]?.hostname || "N/A"})
              </Typography>

              {/* Extract first hypervisor */}
              {hypervisors.length > 0 &&
                (() => {
                  const hv = hypervisors[0];

                  const memUsed = toGB(hv.ram_used);
                  const memTotal = toGB(hv.ram_total);

                  const diskUsed = toGB(hv.local_storage_used);
                  const diskTotal = toGB(hv.local_storage_total);

                  const vcpuUsed = hv.vcpus_used || 0;
                  const vcpuTotal = hv.vcpus_total || 0;

                  return (
                    <Grid container spacing={3} justifyContent="center">
                      <Grid item xs={6} sm={4}>
                        <GradientCircularStat
                          value={
                            memTotal
                              ? ((memUsed / memTotal) * 100).toFixed(1)
                              : 0
                          }
                          label="Memory Usage"
                          subLabel={`${memUsed} / ${memTotal} GB`}
                          gradientId="grad-mem"
                        />
                      </Grid>

                      <Grid item xs={6} sm={4}>
                        <GradientCircularStat
                          value={
                            diskTotal
                              ? ((diskUsed / diskTotal) * 100).toFixed(1)
                              : 0
                          }
                          label="Disk Usage"
                          subLabel={`${diskUsed} / ${diskTotal} GB`}
                          gradientId="grad-disk"
                        />
                      </Grid>

                      <Grid item xs={6} sm={4}>
                        <GradientCircularStat
                          value={
                            vcpuTotal
                              ? ((vcpuUsed / vcpuTotal) * 100).toFixed(1)
                              : 0
                          }
                          label="VCPU Usage"
                          subLabel={`${vcpuUsed} / ${vcpuTotal}`}
                          gradientId="grad-vcpu"
                        />
                      </Grid>
                    </Grid>
                  );
                })()}
            </Paper>
          </Grid>

          {/* -------- Resource Providers Summary -------- */}
          <Grid item xs={12} md={6}>
            <Paper
              sx={{
                p: 3,
                borderRadius: 3,
                height: "100%",
                boxShadow: 6,
                background:
                  theme.palette.mode === "dark"
                    ? "linear-gradient(145deg, #0a0a0a, #1a1a1a)" // smooth black-on-black
                    : "linear-gradient(145deg, #f9fafb, #e9ecef)",
                color: theme.palette.mode === "dark" ? "#f1f5f9" : "#1e293b",
              }}
            >
              <Typography
                variant="h6"
                sx={{
                  mb: 3,
                  fontWeight: "bold",
                  textAlign: "center",
                  color: theme.palette.mode === "dark" ? "#e2e8f0" : "#1e293b",
                }}
              >
                Resource Providers Summary (All Providers)
              </Typography>

              {/* Aggregate all resource providers */}
              {resources.length > 0 &&
                (() => {
                  const vcpuUsed = resources.reduce(
                    (t, i) => t + (i.vcpus_used || 0),
                    0
                  );
                  const vcpuTotal = resources.reduce(
                    (t, i) => t + (i.vcpus_total || 0),
                    0
                  );

                  const memUsed = resources.reduce(
                    (t, i) => t + toGB(i.ram_used),
                    0
                  );
                  const memTotal = resources.reduce(
                    (t, i) => t + toGB(i.ram_total),
                    0
                  );

                  const diskUsed = resources.reduce(
                    (t, i) => t + toGB(i.disk_used),
                    0
                  );
                  const diskTotal = resources.reduce(
                    (t, i) => t + toGB(i.disk_total),
                    0
                  );

                  return (
                    <Grid container spacing={3} justifyContent="center">
                      <Grid item xs={6} sm={4}>
                        <GradientCircularStat
                          value={
                            vcpuTotal
                              ? ((vcpuUsed / vcpuTotal) * 100).toFixed(1)
                              : 0
                          }
                          label="VCPU Usage"
                          subLabel={`${vcpuUsed} / ${vcpuTotal}`}
                          gradientId="grad-vcpu2"
                        />
                      </Grid>

                      <Grid item xs={6} sm={4}>
                        <GradientCircularStat
                          value={
                            memTotal
                              ? ((memUsed / memTotal) * 100).toFixed(1)
                              : 0
                          }
                          label="Memory Usage"
                          subLabel={`${memUsed} / ${memTotal} GB`}
                          gradientId="grad-mem2"
                        />
                      </Grid>

                      <Grid item xs={6} sm={4}>
                        <GradientCircularStat
                          value={
                            diskTotal
                              ? ((diskUsed / diskTotal) * 100).toFixed(1)
                              : 0
                          }
                          label="Disk Usage"
                          subLabel={`${diskUsed} / ${diskTotal} GB`}
                          gradientId="grad-disk2"
                        />
                      </Grid>
                    </Grid>
                  );
                })()}
            </Paper>
          </Grid>
        </Grid>
      </Box>

      {/* ------------------- TABS + TABLES ------------------- */}
      <Paper sx={{ mb: 2 }}>
        <Tabs value={tab} onChange={handleTabChange} centered>
          <Tab label="Hypervisors" />
          <Tab label="Hosts" />
          <Tab label="Resource Providers" />
        </Tabs>
      </Paper>

      {loading ? (
        <Box display="flex" justifyContent="center" mt={5}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* HYPERVISORS TABLE */}
          {tab === 0 && (
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
                  <TableRow>
                    <StyledTableCell>Hostname</StyledTableCell>
                    <StyledTableCell>Type</StyledTableCell>
                    <StyledTableCell>Memory Used</StyledTableCell>
                    <StyledTableCell>Memory Total</StyledTableCell>
                    <StyledTableCell>Disk Used</StyledTableCell>
                    <StyledTableCell>Disk Total</StyledTableCell>
                    <StyledTableCell>VCPUs Used</StyledTableCell>
                    <StyledTableCell>VCPUs Total</StyledTableCell>
                    <StyledTableCell>Status</StyledTableCell>
                    <StyledTableCell>State</StyledTableCell>
                    <StyledTableCell>Host IP</StyledTableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {hypervisors.map((hv, index) => (
                    <StyledTableRow key={index}>
                      <StyledTableCell
                        sx={{
                          cursor: "pointer",
                          color: "primary.main",
                          fontWeight: 600,
                          textDecoration: "underline",
                        }}
                        onClick={() => fetchInstancesByHost(hv.hostname)}
                      >
                        {hv.hostname}
                      </StyledTableCell>

                      <StyledTableCell>{hv.type}</StyledTableCell>
                      <StyledTableCell>{hv.ram_used}</StyledTableCell>
                      <StyledTableCell>{hv.ram_total}</StyledTableCell>
                      <StyledTableCell>{hv.local_storage_used}</StyledTableCell>
                      <StyledTableCell>
                        {hv.local_storage_total}
                      </StyledTableCell>
                      <StyledTableCell>{hv.vcpus_used}</StyledTableCell>
                      <StyledTableCell>{hv.vcpus_total}</StyledTableCell>
                      <StyledTableCell>{hv.status}</StyledTableCell>
                      <StyledTableCell>{hv.state}</StyledTableCell>
                      <StyledTableCell>{hv.host_ip}</StyledTableCell>
                    </StyledTableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* HOST TABLE */}
          {tab === 1 && (
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
                  <TableRow>
                    <StyledTableCell>Host</StyledTableCell>
                    <StyledTableCell>Availability Zone</StyledTableCell>
                    <StyledTableCell>Status</StyledTableCell>
                    <StyledTableCell>State</StyledTableCell>
                    <StyledTableCell>Last Updated</StyledTableCell>
                    <StyledTableCell>Action</StyledTableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {hosts.map((host, index) => (
                    <StyledTableRow key={index}>
                      <StyledTableCell>{host.host}</StyledTableCell>
                      <StyledTableCell>
                        {host.availability_zone}
                      </StyledTableCell>
                      <StyledTableCell>{host.status}</StyledTableCell>
                      <StyledTableCell>{host.state}</StyledTableCell>
                      <StyledTableCell>
                        {formatRelativeTime(host.last_updated)}
                      </StyledTableCell>
                      <StyledTableCell>{host.action}</StyledTableCell>
                    </StyledTableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* RESOURCE PROVIDER TABLE */}
          {tab === 2 && (
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
                  <TableRow>
                    <StyledTableCell>Resource Provider</StyledTableCell>
                    <StyledTableCell>VCPU Used</StyledTableCell>
                    <StyledTableCell>VCPU Total</StyledTableCell>
                    <StyledTableCell>PCPU Used</StyledTableCell>
                    <StyledTableCell>PCPU Total</StyledTableCell>
                    <StyledTableCell>RAM Used</StyledTableCell>
                    <StyledTableCell>RAM Total</StyledTableCell>
                    <StyledTableCell>Disk Used</StyledTableCell>
                    <StyledTableCell>Disk Total</StyledTableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {resources.map((rp, index) => (
                    <StyledTableRow key={index}>
                      <StyledTableCell>
                        {rp.resource_provider_name}
                      </StyledTableCell>
                      <StyledTableCell>{rp.vcpus_used}</StyledTableCell>
                      <StyledTableCell>{rp.vcpus_total}</StyledTableCell>
                      <StyledTableCell>{rp.pcpus_used}</StyledTableCell>
                      <StyledTableCell>{rp.pcpus_total}</StyledTableCell>
                      <StyledTableCell>{rp.ram_used}</StyledTableCell>
                      <StyledTableCell>{rp.ram_total}</StyledTableCell>
                      <StyledTableCell>{rp.disk_used}</StyledTableCell>
                      <StyledTableCell>{rp.disk_total}</StyledTableCell>
                    </StyledTableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
          <Dialog
            open={instanceOpen}
            onClose={() => setInstanceOpen(false)}
            fullWidth
            maxWidth="md"
          >
            <DialogTitle>
              Instances on <b>{selectedHost}</b>
            </DialogTitle>

            <DialogContent>
              {instanceLoading ? (
                <Box display="flex" justifyContent="center" my={3}>
                  <CircularProgress />
                </Box>
              ) : (
                <>
                  <Typography variant="subtitle2" sx={{ mb: 2 }}>
                    Displaying {instances.length} items
                  </Typography>

                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <StyledTableCell>Name</StyledTableCell>
                        <StyledTableCell>Instance Name</StyledTableCell>
                        <StyledTableCell>Instance ID</StyledTableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {instances.map((inst, idx) => (
                        <StyledTableRow key={idx}>
                          <StyledTableCell>
                            {inst.name}
                          </StyledTableCell>
                          <StyledTableCell>
                            {inst.instance_name}
                          </StyledTableCell>
                          <StyledTableCell>{inst.instance_id}</StyledTableCell>
                        </StyledTableRow>
                      ))}
                    </TableBody>
                  </Table>
                </>
              )}
            </DialogContent>

            <DialogActions>
              <Button onClick={() => setInstanceOpen(false)}>Close</Button>
            </DialogActions>
          </Dialog>
        </>
      )}

      {/* Snackbar */}
      <Snackbar
        open={snackbarOpen}
        onClose={() => setSnackbarOpen(false)}
        autoHideDuration={4000}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
        TransitionComponent={Slide}
      >
        <Alert severity={snackbarType}>{snackbarMsg}</Alert>
      </Snackbar>
    </div>
  );
};

export default Hypervisors;
