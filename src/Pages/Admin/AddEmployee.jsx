import React, { useState } from "react";
import {
  TextField,
  Button,
  Grid2,
  Paper,
  Typography,
  Container,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import apiClient from "../../Axios";

const AddEmployee = () => {
  const [formData, setFormData] = useState({
    name: "",
    employee_id: "",
    email: "",
    group: "",
    fla_name: "",
    fla_email: "",
    fla_employee_id: "",
  });
  const [alertDialog, setAlertDialog] = useState({
    open: false,
    message: "",
    severity: "success", // "success" or "error"
  });
  

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await apiClient.post("/employees/", formData, {
        headers: { "Content-Type": "application/json" },
      });
  
      if (response.status === 200 || response.status === 201) {
        setAlertDialog({
          open: true,
          message: "Employee added successfully!",
          severity: "success",
        });
  
        setFormData({
          name: "",
          employee_id: "",
          email: "",
          group: "",
          fla_name: "",
          fla_email: "",
          fla_employee_id: "",
        });
      } else {
        // Unexpected response code — treat as error
        setAlertDialog({
          open: true,
          message: "Unexpected response from server.",
          severity: "error",
        });
      }
    } catch (error) {
      const errorData = error?.response?.data;
    
      if (errorData && typeof errorData === "object") {
        const messages = Object.entries(errorData)
          .flatMap(([field, msgs]) => msgs.map((msg) => `${field}: ${msg}`));
        setAlertDialog({
          open: true,
          message: messages.join("\n"), // Shows all errors in separate lines
          severity: "error",
        });
      } else {
        setAlertDialog({
          open: true,
          message: "An unexpected error occurred.",
          severity: "error",
        });
      }
      console.error("Error adding employee:", error);
    }
  };
  
  

  return (
    <Container maxWidth="md">
      <Paper elevation={3} sx={{ padding: 4, marginTop: 4 }}>
        <Typography variant="h5" gutterBottom>
          Add Employee
        </Typography>
        <form onSubmit={handleSubmit}>
          <Grid2 container spacing={2}>
            {[
              ["name", "Name"],
              ["employee_id", "Employee ID"],
              ["email", "Email"],
              ["group", "Group"],
              ["fla_name", "FLA Name"],
              ["fla_email", "FLA Email"],
              ["fla_employee_id", "FLA Employee ID"],
            ].map(([field, label]) => (
              <Grid2 item xs={12} sm={6} key={field}>
                <TextField
                  label={label}
                  name={field}
                  value={formData[field]}
                  onChange={handleChange}
                  fullWidth
                  required
                />
              </Grid2>
            ))}
            <Grid2 item xs={12}>
              <Button type="submit" variant="contained" color="primary">
                Add Employee
              </Button>
            </Grid2>
          </Grid2>
        </form>
      </Paper>
      <Dialog
  open={alertDialog.open}
  onClose={() => setAlertDialog({ ...alertDialog, open: false })}
>
  <DialogTitle sx={{ textAlign: "center", p: 3 }}>
    {alertDialog.severity === "success" ? (
      <CheckCircleIcon color="success" sx={{ fontSize: 60 }} />
    ) : (
      <ErrorIcon color="error" sx={{ fontSize: 60 }} />
    )}
  </DialogTitle>
  <DialogContent sx={{ textAlign: "center", px: 6 }}>
    <Typography variant="h6" gutterBottom>
      {alertDialog.severity === "success" ? "Success" : "Error"}
    </Typography>
    <Typography
      variant="body1"
      color="text.secondary"
      sx={{ whiteSpace: "pre-line" }}
    >
      {alertDialog.message}
    </Typography>
  </DialogContent>
  <DialogActions sx={{ justifyContent: "center", pb: 3 }}>
    <Button
      onClick={() => setAlertDialog({ ...alertDialog, open: false })}
      variant="contained"
      color={alertDialog.severity}
    >
      OK
    </Button>
  </DialogActions>
</Dialog>


    </Container>
  );
};

export default AddEmployee;
