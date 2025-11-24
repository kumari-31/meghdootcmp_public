import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  IconButton,
  Grid,
  Snackbar,
} from "@mui/material";
import { Delete, Add } from "@mui/icons-material";
import apiClient from "../../Axios"; // 👈 using your custom axios instance

const ProjectName = () => {
  const [projects, setProjects] = useState([]);
  const [newProject, setNewProject] = useState("");
  const [snackbarMsg, setSnackbarMsg] = useState("");

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await apiClient.get("/cdacprojects/");
      setProjects(res.data);
    } catch (err) {
      console.error("Failed to fetch projects", err);
    }
  };

  const handleAddProject = async () => {
    if (!newProject.trim()) return;

    try {
      await apiClient.post("/cdacprojects/create/", {
        project_name: newProject,
      });
      setSnackbarMsg("Project added successfully");
      setNewProject("");
      fetchProjects();
    } catch (err) {
      console.error("Failed to add project", err);
      setSnackbarMsg("Error adding project");
    }
  };

  const handleDeleteProject = async (id) => {
    try {
      await apiClient.delete(`/cdacprojects/delete/${id}/`);
      setSnackbarMsg("Project deleted");
      fetchProjects();
    } catch (err) {
      console.error("Failed to delete project", err);
      setSnackbarMsg("Error deleting project");
    }
  };

  return (
    <div style={{ padding: 40 }}>
      <Typography variant="h4" gutterBottom>
        🛠️ Manage Project Names
      </Typography>

      <Card sx={{ mb: 4, p: 2 }}>
        {/* <Typography variant="h6">Add New Project</Typography> */}
        <Grid container spacing={2} alignItems="center" sx={{ mt: 1 }}>
          <Grid item xs={8}>
            <TextField
              fullWidth
              label="ADD New Project Name"
              value={newProject}
              onChange={(e) => setNewProject(e.target.value)}
            />
          </Grid>
          <Grid item xs={4}>
            <Button
              fullWidth
              variant="contained"
              color="primary"
              startIcon={<Add />}
              onClick={handleAddProject}
            >
              Add Project
            </Button>
          </Grid>
        </Grid>
      </Card>

      <Typography variant="h5" gutterBottom>
        📋 Existing Projects
      </Typography>

      <Grid container spacing={3}>
        {projects.map((project) => (
          <Grid item xs={12} sm={6} md={4} key={project.id}>
            <Card sx={{ position: "relative", borderRadius: 3 }}>
              <CardContent>
                <Typography variant="h6">{project.project_name}</Typography>
              </CardContent>
              <IconButton
                color="error"
                sx={{ position: "absolute", top: 10, right: 10 }}
                onClick={() => handleDeleteProject(project.id)}
              >
                <Delete />
              </IconButton>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Snackbar
        open={!!snackbarMsg}
        autoHideDuration={3000}
        onClose={() => setSnackbarMsg("")}
        message={snackbarMsg}
      />
    </div>
  );
};

export default ProjectName;
