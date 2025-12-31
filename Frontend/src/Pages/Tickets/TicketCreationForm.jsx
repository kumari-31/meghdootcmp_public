import React, { useState, useEffect } from "react";
import {
  Button,
  Paper,
  TextField,
  Typography,
  Stack,
} from "@mui/material";
import { useAuth } from "../Authentication/useAuth";
import apiClient from "../../Axios"; 

const TicketCreationForm = () => {
  const { user } = useAuth();
  const [form, setForm] = useState({
    employee_id: user.employee_id || "",
    issue: "",
    description: "",
  });

  const [alert, setAlert] = useState("");


useEffect(() => {
  if (user?.employee_id) {
    setForm((prev) => ({
      ...prev,
      employee_id: user.employee_id,
    }));
  }
}, [user]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    if (!form.issue || !form.description) {
      setAlert("Issue and description are required.");
      return;
    }

    try {
      await apiClient.post("/tickets/create/", form);
      setAlert("Ticket submitted successfully.");
      setForm((prev) => ({ ...prev, issue: "", description: "" }));
    } catch (err) {
      setAlert("Failed to submit ticket.");
    }
  };

  return (
    <Paper sx={{ p: 4, maxWidth: 600, mx: "auto", mt: 4 }}>
      <Typography variant="h5" gutterBottom>
        Create New Ticket
      </Typography>
      <Stack spacing={2}>
        <TextField
          label="Issue"
          name="issue"
          fullWidth
          value={form.issue}
          onChange={handleChange}
        />
        <TextField
          label="Description"
          name="description"
          fullWidth
          multiline
          rows={4}
          value={form.description}
          onChange={handleChange}
        />
        <Button variant="contained" onClick={handleSubmit}>
          Submit Ticket
        </Button>
        {alert && (
          <Typography variant="body2" color="error">
            {alert}
          </Typography>
        )}
      </Stack>
    </Paper>
  );
};

export default TicketCreationForm;
