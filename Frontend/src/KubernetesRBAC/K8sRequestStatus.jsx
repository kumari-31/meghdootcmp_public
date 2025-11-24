import React, { useEffect, useState } from "react";
import apiClient from "../Axios";
import {
  Container,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Paper,
  CircularProgress,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Grid,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from "@mui/material";
import { CheckCircle, Visibility } from "@mui/icons-material";

const K8sRequestStatus = () => {
  const [k8sRequests, setK8sRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [selectedRequestId, setSelectedRequestId] = useState("");
  const [openModal, setOpenModal] = useState(false);

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const response = await apiClient.get("/service-requests/");
        setK8sRequests(response.data.data);
      } catch (error) {
        console.error("Error fetching service requests:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, []);

  const handleRequestSelection = (event) => {
    const id = event.target.value;
    setSelectedRequestId(id);
    const req = k8sRequests.find((item) => item.id === id);
    setSelectedRequest(req);
  };

  const handleOpenModal = () => {
    setOpenModal(true);
  };

  const handleCloseModal = () => {
    setOpenModal(false);
  };

  if (loading) {
    return (
      <Container sx={{ textAlign: "center", mt: 5 }}>
        <CircularProgress />
        <Typography variant="h6">Loading Kubernetes Requests...</Typography>
      </Container>
    );
  }

  return (
    <Container>
      <Typography
        variant="h4"
        gutterBottom
        sx={{ fontWeight: "bold", color: "#1976d2", textAlign: "center" }}
      >
        Kubernetes Request Status
      </Typography>

      <FormControl fullWidth sx={{ mb: 3, width: "300px" }}>
        <InputLabel>Select a Request</InputLabel>
        <Select
          value={selectedRequestId}
          label="Select a Request"
          onChange={handleRequestSelection}
        >
          {k8sRequests.map((req) => (
            <MenuItem key={req.id} value={req.id}>
              {`${req.service_name} - ${req.project_name}`}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {selectedRequest ? (
        <Paper elevation={3} sx={{ p: 3, mt: 5, mb: 3 }}>
          <Typography variant="h6">{`ID: ${selectedRequest.id}`}</Typography>
          <Typography variant="h6">{`Service: ${selectedRequest.service_name}`}</Typography>
          <Typography variant="subtitle1">{`Purpose: ${selectedRequest.purpose_of_request}`}</Typography>

          <Box display="flex" alignItems="center" mt={2} mb={2}>
            <Typography variant="subtitle1" mr={1}>
              View Form:
            </Typography>
            <IconButton color="primary" onClick={handleOpenModal}>
              <Visibility />
            </IconButton>
          </Box>

          <Stepper
            activeStep={
              selectedRequest.fla_status === "Accepted"
                ? selectedRequest.admin_status === "Accepted"
                  ? 3
                  : 2
                : 1
            }
            alternativeLabel
          >
            {["Employee Request", "FLA Approval", "Admin Approval"].map(
              (label, index) => (
                <Step key={label}>
                  <StepLabel
                    icon={
                      index === 0 ||
                      (index === 1 &&
                        selectedRequest.fla_status === "Accepted") ||
                      (index === 2 &&
                        selectedRequest.admin_status === "Accepted") ? (
                        <CheckCircle color="success" />
                      ) : undefined
                    }
                  >
                    {label}
                  </StepLabel>
                </Step>
              )
            )}
          </Stepper>
        </Paper>
      ) : (
        <Typography variant="h6" color="textSecondary">
          Select a request to view its status.
        </Typography>
      )}

      <Dialog
        open={openModal}
        onClose={handleCloseModal}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Kubernetes Request Details</DialogTitle>
        <DialogContent>
          {selectedRequest ? (
            <Grid container spacing={2} mt={1}>
              {[
                { label: "Request ID", value: selectedRequest.id },
                { label: "Employee ID", value: selectedRequest.employee_id },
                { label: "Name", value: selectedRequest.name },
                { label: "Email", value: selectedRequest.email },
                { label: "Designation", value: selectedRequest.designation },
                { label: "Project Name", value: selectedRequest.project_name },
                { label: "Service Name", value: selectedRequest.service_name },
                { label: "Purpose", value: selectedRequest.purpose_of_request },
                {
                  label: "Notes",
                  value: selectedRequest.additional_notes || "N/A",
                },
              ].map(({ label, value }) => (
                <Grid item xs={6} key={label}>
                  <TextField fullWidth label={label} value={value} disabled />
                </Grid>
              ))}
            </Grid>
          ) : (
            <Typography>No Data Available</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseModal} color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default K8sRequestStatus;
