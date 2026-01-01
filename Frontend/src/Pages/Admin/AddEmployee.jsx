import React, { useState, useEffect } from "react";
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
  DialogActions,
  MenuItem,
   Checkbox, FormControlLabel
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import Autocomplete from "@mui/material/Autocomplete";
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
    is_fla: false, 
  });
  const [alertDialog, setAlertDialog] = useState({
    open: false,
    message: "",
    severity: "success", // "success" or "error"
  });
  const [csvFile, setCsvFile] = useState(null);
  const [groups, setGroups] = useState([]);
  const [flaList, setFlaList] = useState([]);


useEffect(() => {
  fetchGroups();
  
}, []);

const fetchGroups = async () => {
  try {
    const res = await apiClient.get("/employees/groups/");
    setGroups(res.data);
  } catch (err) {
    console.error("Failed to fetch groups", err);
  }
};

useEffect(() => {
  const fetchFlaList = async () => {
    try {
      const res = await apiClient.get("/employees/fla-list/");
      setFlaList(res.data.results || res.data || []);
    } catch (err) {
      console.error("Failed to load FLA list", err);
      setFlaList([]);
    }
  };

  fetchFlaList();
}, []);




  const handleFileChange = (e) => {
    setCsvFile(e.target.files[0]);
  };

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
        setAlertDialog({
          open: true,
          message: "Unexpected response from server.",
          severity: "error",
        });
      }
    } catch (error) {
      const errorData = error?.response?.data;

      let messages = [];

      if (errorData && typeof errorData === "object") {
        Object.entries(errorData).forEach(([field, value]) => {
          if (Array.isArray(value)) {
            value.forEach((msg) => messages.push(`${field}: ${msg}`));
          } else {
            messages.push(`${field}: ${value}`);
          }
        });
      } else {
        messages.push("Unexpected server error");
      }

      setAlertDialog({
        open: true,
        message: messages.join("\n"),
        severity: "error",
      });

      console.error("Error adding employee:", error);
    }
  };

  const handleBulkUpload = async () => {
    if (!csvFile) {
      setAlertDialog({
        open: true,
        message: "Please select a CSV file",
        severity: "error",
      });
      return;
    }

    const formData = new FormData();
    formData.append("file", csvFile);

    try {
      const response = await apiClient.post(
        "/employees/bulk-upload/",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      setAlertDialog({
        open: true,
        message: `Employees created: ${response.data.created_count}
Failed: ${response.data.failed_count}`,
        severity: "success",
      });
    } catch (error) {
      setAlertDialog({
        open: true,
        message: "Bulk upload failed",
        severity: "error",
      });
    }
  };

  const uniqueFlaList = React.useMemo(() => {
  const map = new Map();
  flaList.forEach((f) => {
    map.set(f.fla_employee_id, f);
  });
  return Array.from(map.values());
}, [flaList]);


  return (
    <Container maxWidth="md">
     <Paper elevation={3} sx={{ padding: 4, marginTop: 4 }}>
  <Typography variant="h5" gutterBottom>
    Add Employee
  </Typography>

 <form onSubmit={handleSubmit}>
  <Grid2 container spacing={2}>
    {/* Employee Basic Fields */}
    {[
      ["name", "Name"],
      ["employee_id", "Employee ID"],
      ["email", "Email"],
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

    {/* Group Dropdown */}
    <Grid2 item xs={12} sm={6} sx={{ width: "30%" }}>
      <TextField
        select
        label="Group"
        name="group"
        value={formData.group}
        onChange={handleChange}
        fullWidth
        required
      >
        {groups.map((grp) => (
          <MenuItem key={grp} value={grp}>
            {grp}
          </MenuItem>
        ))}
      </TextField>
    </Grid2>

    {/* ✅ Reporting Officer Dropdown (ADD HERE) */}
<Grid2 item xs={12} sm={6} sx={{ width: "30%" }}>
  <Autocomplete
    options={uniqueFlaList}   // or flaList if backend fixed
    fullWidth
    disablePortal
    value={
      uniqueFlaList.find(
        (f) => f.fla_employee_id === formData.fla_employee_id
      ) || null
    }
    getOptionLabel={(option) =>
      `${option.fla_name} (${option.fla_employee_id})`
    }
    isOptionEqualToValue={(option, value) =>
      option.fla_employee_id === value.fla_employee_id
    }
    onChange={(event, selected) => {
      if (!selected) return;

      setFormData((prev) => ({
        ...prev,
        fla_name: selected.fla_name,
        fla_employee_id: selected.fla_employee_id,
        fla_email: selected.fla_email,
      }));
    }}
    renderInput={(params) => (
      <TextField
        {...params}
        label="Reporting Officer (FLA / SLA)"
        fullWidth
        required
      />
    )}
  />
</Grid2>
<Grid2 item xs={12} sm={6}>
  <FormControlLabel
    control={
      <Checkbox
        checked={formData.is_fla}
        onChange={(e) =>
          setFormData((prev) => ({ ...prev, is_fla: e.target.checked }))
        }
      />
    }
    label="Mark as FLA"
  />
</Grid2>


    {/* Submit */}
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
      <Paper elevation={3} sx={{ p: 3, mt: 4 }}>
        <Typography variant="h6" gutterBottom>
          Bulk Upload Employees (CSV)
        </Typography>

        <input type="file" accept=".csv" onChange={handleFileChange} />

        <Button
          sx={{ mt: 2 }}
          variant="contained"
          color="primary"
          onClick={handleBulkUpload}
        >
          Upload CSV
        </Button>
      </Paper>
    </Container>
  );
};

export default AddEmployee;
