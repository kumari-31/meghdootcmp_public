import React, { useEffect, useState } from "react";
import {
  Box, Grid2, Card, CardContent, Typography, IconButton,
  Button, TextField, Dialog, DialogTitle, DialogContent, DialogActions
} from "@mui/material";
import { Delete, Edit } from "@mui/icons-material";
import apiClient from "../../Axios"; // adjust path to your actual apiClient


const AddEmployee = () => {
  const [employees, setEmployees] = useState([]);
  const [newEmployee, setNewEmployee] = useState({
    name: "", employee_id: "", email: "", phone_number: "", group: "FOSS",
    fla_name: "", fla_email: "", fla_employee_id: ""
  });
  const [editEmployee, setEditEmployee] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchEmployees = async () => {
    try {
      const res = await apiClient.get("/fla/employees/");
      setEmployees(res.data.employees || []);
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleAddEmployee = async () => {
    try {
      await apiClient.post("/employees/", newEmployee);
      setNewEmployee({ ...newEmployee, name: "", employee_id: "", email: "", phone_number: "" });
      fetchEmployees();
    } catch (error) {
      console.error("Error adding employee:", error);
    }
  };

  const handleDelete = async (empId) => {
    try {
      await apiClient.delete(`/employees/delete/${empId}/`);
      fetchEmployees();
    } catch (error) {
      console.error("Error deleting employee:", error);
    }
  };

  const handleEditOpen = (employee) => {
    setEditEmployee({ ...employee, phone_number: "" });
    setDialogOpen(true);
  };

  const handleUpdateEmployee = async () => {
    try {
      await apiClient.put(`/employees/update/${editEmployee.employee_id}/`, editEmployee);
      setDialogOpen(false);
      fetchEmployees();
    } catch (error) {
      console.error("Error updating employee:", error);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Add Employee Form */}
      <Card sx={{ mb: 3, p: 2 }}>
        <Typography variant="h6" gutterBottom>Add New Employee</Typography>
        <Grid2 container spacing={2}>
          {["name", "employee_id", "email", "phone_number"].map((field) => (
            <Grid2 item xs={12} sm={4} key={field}>
              <TextField
                fullWidth
                label={field.replace("_", " ").toUpperCase()}
                type={field === "phone_number" ? "tel" : "text"}
                value={newEmployee[field]}
                onChange={(e) => setNewEmployee({ ...newEmployee, [field]: e.target.value })}
              />
            </Grid2>
          ))}
          <Grid2 item xs={12} sm={4}>
            <Button fullWidth variant="contained" onClick={handleAddEmployee}>Add Employee</Button>
          </Grid2>
        </Grid2>
      </Card>

      {/* Employee Cards */}
      <Grid2 container spacing={2}>
        {employees.map((emp) => (
          <Grid2 item xs={12} sm={6} md={4} key={emp.employee_id}>
            <Card>
              <CardContent>
                <Typography variant="h6">{emp.name}</Typography>
                <Typography variant="body2">ID: {emp.employee_id}</Typography>
                <Typography variant="body2">Email: {emp.email}</Typography>
                <Typography variant="body2">Group: {emp.group}</Typography>
                <Box sx={{ mt: 1, display: "flex", justifyContent: "flex-end" }}>
                  <IconButton onClick={() => handleEditOpen(emp)}><Edit /></IconButton>
                  <IconButton onClick={() => handleDelete(emp.employee_id)}><Delete /></IconButton>
                </Box>
              </CardContent>
            </Card>
          </Grid2>
        ))}
      </Grid2>

      {/* Edit Dialog */}
      {editEmployee && (
        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
          <DialogTitle>Edit Employee</DialogTitle>
          <DialogContent>
            {["name",  "phone_number"].map((field) => (
              <TextField
                key={field}
                margin="dense"
                fullWidth
                label={field.replace("_", " ").toUpperCase()}
                value={editEmployee[field] || ""}
                onChange={(e) => setEditEmployee({ ...editEmployee, [field]: e.target.value })}
              />
            ))}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateEmployee} variant="contained">Update</Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
};

export default AddEmployee;
