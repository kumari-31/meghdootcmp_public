// DeploymentsList.jsx
import { useEffect, useState } from "react";
import apiClient from "../Axios";
import {
  Box,
  Typography,
  Grid2,
  Card,
  CardContent,
  Button,
  useTheme,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  DialogActions,
} from "@mui/material";
import { 
  DeleteOutline  
} from '@mui/icons-material';

// load assets
const images = import.meta.glob("../assets/*.{png,jpg,jpeg,svg}", {
  eager: true,
});

// map service -> filename
const serviceLogos = {
  nginx: "nginx.png",
  nginxha: "nginx.png",
  postgresql: "postgresql.png",
  mysql: "mysql.png",
  mariadb: "mariadb.png",
  mongodb: "mongodb.png",
  redis: "redis.png",
  couchdb: "couchdb.png",
  // add more if required
};

const getServiceImage = (name) => {
  const key = (name || "").toLowerCase();
  const file = serviceLogos[key];
  if (!file) return null;
  const match = Object.keys(images).find((p) => p.includes(file));
  return match ? images[match].default : null;
};

export default function DeploymentsList() {
  const theme = useTheme();
  const [deployments, setDeployments] = useState([]);
  const [loading, setLoading] = useState(true);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedPodForDelete, setSelectedPodForDelete] = useState(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [alertDialog, setAlertDialog] = useState({
      open: false,
      message: "",
      severity: "success", // "success" | "error"
    });

  const handleOpenDelete = (pod) => {
    setSelectedPodForDelete(pod);
    setDeleteDialogOpen(true);
  };

  const handleCloseDelete = () => {
    setDeleteDialogOpen(false);
    setDeleteReason("");
  };

  const submitDeleteRequest = async () => {
    if (!deleteReason.trim()) return;

    try {
      // Note: 'id' matches your JSON data (e.g., 89, 87, etc.)
      await apiClient.post("/k8s/delete-request/", {
        id: selectedPodForDelete.id,
        reason: deleteReason,
      });

      handleCloseDelete();
      setAlertDialog({
        open: true,
        message: "Deletion request submitted for admin approval.",
        severity: "success",
      });
    } catch (err) {
      setAlertDialog({
        open: true,
        message: "Failed to submit request.",
        severity: "error",
      });
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await apiClient.get("/services/deployed/");
        if (!mounted) return;
        setDeployments(res.data?.services || []);
      } catch (e) {
        console.error(e);
        if (!mounted) return;
        setDeployments([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => (mounted = false);
  }, []);

  // small reusable style pieces
  const cardSX = {
    borderRadius: 3,
    overflow: "visible",
    border: "1px solid rgba(255,255,255,0.04)",
    background:
      theme.palette.mode === "dark"
        ? "linear-gradient(180deg, rgba(20,20,25,0.6), rgba(10,10,15,0.6))"
        : "linear-gradient(180deg, rgba(255,255,255,0.6), rgba(245,245,250,0.6))",
    boxShadow: "0 8px 30px rgba(2,6,23,0.25)",
    transition: "transform .28s ease, box-shadow .28s ease",
    "&:hover": {
      transform: "translateY(-8px)",
      boxShadow: "0 18px 50px rgba(2,6,23,0.38)",
    },
  };

  const badgeSX = {
    position: "absolute",
    top: 12,
    right: 12,
    px: 1.2,
    py: 0.5,
    borderRadius: 2,
    fontWeight: 700,
    fontSize: 12,
  };

  const openShellWindow = (d) => {
    const params = new URLSearchParams({
      namespace: d.namespace,
      // Ensure this is a string! Change .name to whatever your pod name key is
      pod: JSON.stringify(d.pod_selector),
      container: d.k8s_service_name,
    }).toString();

    // Open a 800x600 centered popup
    const w = 1000,
      h = 600;
    const left = window.screen.width / 2 - w / 2;
    const top = window.screen.height / 2 - h / 2;

    window.open(
      `/shell?${params}`,
      `shell-${d.k8s_service_name}`, // Unique ID for the window
      `width=${w},height=${h},top=${top},left=${left},resizable=yes`,
    );
  };

  return (
    <Box p={3}>
      <Typography variant="h5" gutterBottom sx={{ mb: 2, fontWeight: 700 }}>
        Deployed Services
      </Typography>

      <Grid2 container spacing={3}>
        {loading
          ? Array.from({ length: 3 }).map((_, i) => (
              <Grid2 item xs={12} sm={6} md={4} key={i}>
                <Box
                  sx={{ height: 300, borderRadius: 3, background: "#f2f2f2" }}
                />
              </Grid2>
            ))
          : deployments.map((d) => {
              const img = getServiceImage(d.service_name);
              return (
                <Grid2 item xs={12} sm={6} md={4} key={d.id}>
                  <Card
                    sx={{
                      ...cardSX,
                      height: 340,
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <Box
                      sx={{
                        position: "relative",
                        height: 200,
                        width: 350,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        // decorative gradient background with subtle animation
                        background: `radial-gradient(circle at 10% 10%, rgba(255,255,255,0.04), transparent 10%),
                                     linear-gradient(135deg, rgba(0,140,255,0.06), rgba(123,31,162,0.04))`,
                        overflow: "hidden",
                      }}
                    >
                      {/* blurred full-bleed translucent logo as backdrop */}
                      <Box
                        component="img"
                        src={
                          img ||
                          "https://via.placeholder.com/600x400?text=Service"
                        }
                        alt={d.service_name}
                        sx={{
                          position: "absolute",
                          width: "120%",
                          height: "120%",
                          objectFit: "cover",
                          filter: "blur(6px) saturate(1.1) contrast(0.9)",
                          opacity: 0.28,
                          transform: "scale(1.05)",
                        }}
                      />

                      {/* circular logo with glow */}
                      <Box
                        onClick={
                          d.deployment_url
                            ? () => window.open(d.deployment_url, "_blank")
                            : undefined
                        }
                        sx={{
                          zIndex: 2,
                          width: 110,
                          height: 110,
                          borderRadius: "50%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background:
                            "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))",
                          border: "1px solid rgba(255,255,255,0.06)",
                          boxShadow:
                            "0 8px 30px rgba(0,140,255,0.12), inset 0 1px 0 rgba(255,255,255,0.05)",
                          cursor: d.deployment_url ? "pointer" : "default", // Change cursor if not clickable
                          "&:hover": {
                            transform: d.deployment_url
                              ? "scale(1.08)"
                              : "none",
                            boxShadow: d.deployment_url
                              ? "0 18px 50px rgba(0,140,255,0.18)..."
                              : "none",
                          },
                        }}
                      >
                        <Box
                          component="img"
                          src={img || "https://via.placeholder.com/120"}
                          alt={d.service_name}
                          sx={{ width: 70, height: 70, objectFit: "contain" }}
                        />
                      </Box>
                    </Box>

                    <CardContent sx={{ pt: 2, pb: 1, flexGrow: 1 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                        {d.service_name}
                      </Typography>

                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mt: 0.5 }}
                      >
                        <strong>{d.app_name}</strong> • {d.project_name}
                      </Typography>

                      <Typography
                        variant="body2"
                        sx={{ mt: 1, color: "text.secondary" }}
                      >
                        Port: <strong>{d.node_port ?? "—"}</strong>
                      </Typography>

                      <Box
                        sx={{
                          display: "flex",
                          gap: 1,
                          alignItems: "center",
                          mt: 1,
                        }}
                      >
                        <Box
                          sx={{
                            px: 1,
                            py: 0.4,
                            borderRadius: 1,
                            bgcolor:
                              d.deployment_status === "Deployed"
                                ? "rgba(0,200,120,0.12)"
                                : "rgba(255,165,0,0.08)",
                            color:
                              d.deployment_status === "Deployed"
                                ? "#00c878"
                                : "#ff9800",
                            fontWeight: 700,
                            fontSize: 12,
                            border: `1px solid ${
                              d.deployment_status === "Deployed"
                                ? "rgba(0,200,120,0.18)"
                                : "rgba(255,165,0,0.12)"
                            }`,
                          }}
                        >
                          {d.deployment_status}
                        </Box>

                        <Typography variant="caption" color="text.disabled">
                          Requested:{" "}
                          {new Date(d.request_timestamp).toLocaleString()}
                        </Typography>
                      </Box>
                    </CardContent>

                    <Box sx={{ px: 2, pb: 2, display: "flex", gap: 1 }}>
                      {/* Only show "Open Service" if deployment_url exists */}
                      {d.deployment_url && (
                        <Button
                          fullWidth
                          variant="contained"
                          onClick={() =>
                            window.open(d.deployment_url, "_blank")
                          }
                          sx={{
                            textTransform: "none",
                            background:
                              "linear-gradient(90deg, rgba(0,140,255,0.95), rgba(123,31,162,0.95))",
                          }}
                        >
                          Web Service
                        </Button>
                      )}

                      <Button
                        fullWidth
                        variant="outlined"
                        onClick={() => openShellWindow(d)}
                        sx={{
                          textTransform: "none",
                        }}
                      >
                        Open Exec
                      </Button>
                      {/* NEW: Delete Icon Button */}
                      <IconButton
                        color="error"
                        onClick={() => handleOpenDelete(d)}
                        sx={{
                          border: "1px solid rgba(211, 47, 47, 0.5)",
                          borderRadius: "8px",
                          "&:hover": {
                            backgroundColor: "rgba(211, 47, 47, 0.04)",
                          },
                        }}
                      >
                        <DeleteOutline />
                      </IconButton>
                    </Box>
                  </Card>
                </Grid2>
              );
            })}
      </Grid2>
      <Dialog
        open={deleteDialogOpen}
        onClose={handleCloseDelete}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle
          sx={{
            fontWeight: "bold",
            color: "error.main",
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          <DeleteOutline color="error" /> Request Deletion
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            You are requesting to delete{" "}
            <strong>{selectedPodForDelete?.app_name}</strong>. Please provide a
            reason for the administrator.
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            placeholder="Reason (e.g., Project completed, resource cleanup...)"
            value={deleteReason}
            onChange={(e) => setDeleteReason(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleCloseDelete} color="inherit">
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={submitDeleteRequest}
            disabled={!deleteReason.trim()}
          >
            Submit Request
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
