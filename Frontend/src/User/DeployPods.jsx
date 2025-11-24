import React, { useState, useEffect } from "react";
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  DialogActions,
  Card,
  CardContent,
  Typography,
  Grid2,
  Box,
  styled,
  FormControl,
  Select,
  InputLabel,
  MenuItem,
  Autocomplete,
} from "@mui/material";
import { CloudUpload, RocketLaunch, Cancel } from "@mui/icons-material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import { useAuth } from "../Pages/Authentication/authContext";
import apiClient from "../Axios";
import { useNavigate } from "react-router-dom";

const categorizedCards = {
  Virtualization: [
    {
      name: "Virtual Machine",
      logo: "virtual-machines.png",
      description: "Helping to create virtual machine",
    },
  ],
  "Web Server": [
    {
      name: "nginx",
      logo: "nginx.png",
      description:
        'Nginx (pronounced "engine x") is a powerful, high-performance web server and reverse proxy',
    },
    {
      name: "Nginxha",
      logo: "nginx.png",
      description:
        "Highly available Nginx setup with multiple replicas for fault tolerance.",
    },
  ],

  "Relational Databases": [
    {
      name: "PostgreSQL",
      logo: "postgresql.png",
      description:
        "Robust, open-source relational database known for its reliability and extensibility.",
    },
    {
      name: "MySQL",
      logo: "mysql.png",
      description:
        "Popular open-source relational database, widely used for web applications.",
    },
    {
      name: "MariaDB",
      logo: "mariadb.png",
      description:
        "Community-driven fork of MySQL, aiming for high performance and compatibility.",
    },
  ],
  "NoSQL Databases": [
    {
      name: "MongoDB",
      logo: "mongodb.png",
      description:
        "Scalable NoSQL database designed for high availability and developer agility.",
    },
    {
      name: "CouchDB",
      logo: "couchdb.png",
      description: "Document-oriented NoSQL database with a RESTful JSON API.",
    },
  ],
  "Messaging Systems": [
    {
      name: "RabbitMQ",
      logo: "rabbitmq.png",
      description:
        "Versatile message broker for reliable and scalable messaging.",
    },
    {
      name: "ZeroMQ",
      logo: "zeromq.png",
      description:
        "High-performance asynchronous messaging library for building concurrent applications.",
    },
    {
      name: "ActiveMQ",
      logo: "activemq.png",
      description:
        "Powerful open-source message broker supporting various messaging protocols.",
    },
    {
      name: "Kafka",
      logo: "kafka.png",
      description:
        "Distributed event streaming platform for high-throughput, real-time data feeds.",
    },
  ],
  "Search Engines": [
    {
      name: "Elasticsearch",
      logo: "elasticsearch.png",
      description:
        "Distributed search and analytics engine for real-time exploration and analysis.",
    },
  ],
};

const initialButtonCategories = Object.keys(categorizedCards);

const StyledCard = styled(Card)(({ theme }) => ({
  borderRadius: 8,
  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
  transition: "transform 0.2s ease-in-out",
  "&:hover": {
    transform: "scale(1.05)",
    boxShadow: "0 6px 16px rgba(0, 0, 0, 0.2)",
  },
  height: "100%", // Ensure cards take full height of their Grid2 cell
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
}));

const StyledButton = styled(Button)(({ theme }) => ({
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.common.white,
  "&:hover": {
    backgroundColor: theme.palette.primary.dark,
  },
}));

const CategoryButton = styled(Button)(({ theme, selected }) => ({
  margin: theme.spacing(1),
  backgroundColor: selected
    ? theme.palette.primary.main
    : theme.palette.grey[300],
  color: selected ? theme.palette.common.white : theme.palette.text.primary,
  "&:hover": {
    backgroundColor: selected
      ? theme.palette.primary.dark
      : theme.palette.grey[400],
  },
}));

const serviceFieldConfigs = {
  mongodb: [
    { name: "replica", label: "Replica", type: "number" },
    { name: "app_name", label: "App Name" },
    { name: "root_password", label: "Root Password", type: "password" },
    { name: "username", label: "Username" },
    { name: "password", label: "Password", type: "password" },
    { name: "database", label: "Database" },
    { name: "service_start_date", label: "Service Start Date", type: "date" },
    { name: "service_end_date", label: "Service End Date", type: "date" },
    { name: "service_requirements", label: "Service Requirements" },
    { name: "additional_notes", label: "Additional Notes" },
  ],
  couchdb: [
    { name: "service_start_date", label: "Service Start Date", type: "date" },
    { name: "service_end_date", label: "Service End Date", type: "date" },
    { name: "service_requirements", label: "Service Requirements" },
    { name: "additional_notes", label: "Additional Notes" },
    { name: "app_name", label: "App Name" },
    { name: "replica", label: "Replica", type: "number" },
    { name: "root_password", label: "Root Password", type: "password" },
    { name: "username", label: "Username" },
    { name: "password", label: "Password", type: "password" },
    { name: "database", label: "Database" },
    { name: "node_port", label: "Node Port", type: "number" },
  ],
  postgresql: [
    { name: "service_start_date", label: "Service Start Date", type: "date" },
    { name: "service_end_date", label: "Service End Date", type: "date" },
    { name: "service_requirements", label: "Service Requirements" },
    { name: "additional_notes", label: "Additional Notes" },
    { name: "app_name", label: "App Name" },
    { name: "replica", label: "Replica", type: "number" },
    { name: "root_password", label: "Root Password", type: "password" },
    { name: "username", label: "Username" },
    { name: "password", label: "Password", type: "password" },
    { name: "database", label: "Database" },
    { name: "node_port", label: "Node Port", type: "number" },
  ],
  mysql: [
    { name: "service_start_date", label: "Service Start Date", type: "date" },
    { name: "service_end_date", label: "Service End Date", type: "date" },
    { name: "service_requirements", label: "Service Requirements" },
    { name: "additional_notes", label: "Additional Notes" },
    { name: "app_name", label: "App Name" },
    { name: "replica", label: "Replica", type: "number" },
    { name: "root_password", label: "Root Password", type: "password" },
    { name: "username", label: "Username" },
    { name: "password", label: "Password", type: "password" },
    { name: "database", label: "Database" },
    { name: "node_port", label: "Node Port", type: "number" },
  ],
  nginxha: [
    { name: "deployment_name", label: "Deployment Name" },
    { name: "replicas", label: "Replicas", type: "number", default: 2 },
    { name: "namespace", label: "Namespace", default: "default" },
    { name: "service_start_date", label: "Service Start Date", type: "date" },
    { name: "service_end_date", label: "Service End Date", type: "date" },
    { name: "service_requirements", label: "Service Requirements" },
    { name: "additional_notes", label: "Additional Notes" },
  ],
  nginx: [
    { name: "service_start_date", label: "Service Start Date", type: "date" },
    { name: "service_end_date", label: "Service End Date", type: "date" },
    { name: "service_requirements", label: "Service Requirements" },
    { name: "additional_notes", label: "Additional Notes" },
    { name: "app_name", label: "App Name" },
  ],
  
  
};

const DatabaseCard = ({ card, handleOpen }) => {
  const navigate = useNavigate();

  const handleLaunchVM = () => {
    navigate("/app/openstack/vmrequest");
  };

  return (
    <StyledCard
      sx={{
        width: 400,
        height: 300, // fixed height
        display: "flex",
        flexDirection: "column",
      }}
    >
      <CardContent
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          flexGrow: 1,
          //   height: '100%',
        }}
      >
        <Box
          sx={{
            width: "80%",
            height: "120px",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            mb: 2,
          }}
        >
          <img
            src={`/images/${card.logo}`}
            alt={`${card.name} Logo`}
            style={{
              maxWidth: "100%",
              maxHeight: "100%",
              objectFit: "contain",
            }}
          />
        </Box>

        <Typography
          variant="h6"
          component="h3"
          gutterBottom
          fontWeight="bold"
          color="primary"
        >
          {card.name}
        </Typography>

        <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>
          {card.description}
        </Typography>

        {card.name === "Virtual Machine" ? (
          <StyledButton
            variant="outlined"
            startIcon={<RocketLaunch />}
            onClick={handleLaunchVM}
            sx={{ mt: 2, width: "80%" }}
          >
            Launch VM
          </StyledButton>
        ) : (
          <StyledButton
            variant="contained"
            startIcon={<RocketLaunch />}
            onClick={() => handleOpen(card.name)}
            sx={{ mt: 2, width: "80%" }}
          >
            Deploy
          </StyledButton>
        )}
      </CardContent>
    </StyledCard>
  );
};

const DeployPods = () => {
  const [open, setOpen] = useState(false);
  const [selectedService, setSelectedService] = useState("");
  const [formData, setFormData] = useState({
    employee_id: "",
    email: "",
    name: "",
    service_name: "",
    designation: "",
    purpose: "",
    project_name: "",
    purpose_of_request: "",
  });
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [displayedCards, setDisplayedCards] = useState([]);
  const [projects, setProjects] = useState([]);
  // eslint-disable-next-line
  const [loading, setLoading] = useState(false);
  const [alertDialog, setAlertDialog] = useState({
    open: false,
    message: "",
    severity: "success", // "success" | "error"
  });
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
      ...prev,
      employee_id: user.employee_id || "",
      name: user.username || user.first_name || "",
      email: user.email || "",
    }));
  }
}, [user]);

  useEffect(() => {
    handleCategoryClick("All"); // Initialize displayedCards with all cards
  }, []);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await apiClient.get("/cdacprojects/");
        if (response.status !== 200) {
          throw new Error(`API Error: ${response.status}`);
        }
        setProjects(response.data);
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  const normalizeServiceName = (name) => {
    if (!name) return "";
    return name.toLowerCase().replace(/\s+/g, "").trim();
  };
  
  

  const handleOpen = (service) => {
    const normalized = normalizeServiceName(service.name || service);

    const additionalFields = serviceFieldConfigs[normalized] || [];
    const dynamicData = Object.fromEntries(
      additionalFields.map((f) => [f.name, f.default || ""])
    );
    
    setFormData({
      employee_id: formData.employee_id,
      email: formData.email,
      name: formData.name,
      service_name: service,
      ...(normalized  !== "mongodb" && {
        designation: "",
        purpose: "",
        project_name: "",
        purpose_of_request: "",
      }),
      ...dynamicData,
    });
    setSelectedService(service);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    const normalized = normalizeServiceName(selectedService);
  const dynamicFields = serviceFieldConfigs[normalized] || [];

    const requiredFields =
      normalized === "mongodb"
        ? dynamicFields.map((f) => f.name)
        : [
            "designation",
            "purpose",
            "project_name",
            "purpose_of_request",
            ...dynamicFields.map((f) => f.name),
          ];

    const missing = requiredFields.find((f) => !formData[f]);

    if (missing) {
      return setAlertDialog({
        open: true,
        message: `${missing.replace(/_/g, " ")} is required.`,
        severity: "error",
      });
    }

    const apiEndpoint =
      normalized === "mongodb"
        ? "/k8s/deploy/mongodb/"              // MongoDB direct deploy
        : "/service-requests/create/";        // EVERYTHING else goes to approval flow

  
    const submissionData =
      normalized === "mongodb"
        ? Object.fromEntries(dynamicFields.map((f) => [f.name, formData[f.name]]))
        : formData;   // NGINX-HA also goes here
      
  

    try {
      const response = await apiClient.post(apiEndpoint, submissionData);

      // Kubernetes-specific error returned in 200 OK response body
      if (
        response.data?.status === "Failure" ||
        response.data?.error ||
        response.data?.message?.includes("already exists")
      ) {
        const name =
          response.data?.details?.name ||
          response.data?.metadata?.name ||
          formData?.app_name ||
          selectedService;

        return setAlertDialog({
          open: true,
          message: `Service "${name}" already exists. Please use a different name.`,
          severity: "error",
        });
      }

      // ✅ Success
      setAlertDialog({
        open: true,
        message: "Service request submitted successfully!",
        severity: "success",
      });
      setOpen(false);
    } catch (err) {
      if (err?.response?.status === 409) {
        const name = err?.response?.data?.details?.name || selectedService;
        setAlertDialog({
          open: true,
          message: `Service "${name}" already exists. Please use a different name.`,
          severity: "error",
        });
      } else {
        const errorMessage =
          err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          "Failed to submit request";
        setAlertDialog({
          open: true,
          message: errorMessage,
          severity: "error",
        });
      }
    }
  };

  const handleCategoryClick = (category) => {
    setSelectedCategory(category);
    if (category === "All") {
      const allCards = Object.values(categorizedCards).flat();
      setDisplayedCards(allCards);
    } else {
      setDisplayedCards(categorizedCards[category] || []);
    }
  };

  return (
    <Box sx={{ flexGrow: 1, padding: 3 }}>
      <Box sx={{ display: "flex", justifyContent: "center", mb: 3 }}>
        <CategoryButton
          key="All"
          selected={selectedCategory === "All"}
          onClick={() => handleCategoryClick("All")}
          startIcon={<CloudUpload />}
        >
          All Services
        </CategoryButton>
        {initialButtonCategories.map((category) => (
          <CategoryButton
            key={category}
            selected={selectedCategory === category}
            onClick={() => handleCategoryClick(category)}
          >
            {category}
          </CategoryButton>
        ))}
      </Box>

      <Grid2 container spacing={3} justifyContent="center">
        {displayedCards.map((card, index) => (
          <Grid2 item xs={12} sm={6} md={4} lg={3} key={index}>
            <DatabaseCard card={card} handleOpen={handleOpen} />
          </Grid2>
        ))}
      </Grid2>

      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: "bold", color: "primary.main" }}>
          Request for {selectedService}
        </DialogTitle>
        <DialogContent>
          {selectedService.toLowerCase() !== "mongodb" && (
            <>
              <FormControl fullWidth required sx={{ my: 1 }}>
                <InputLabel>Designation</InputLabel>
                <Select
                  value={formData.designation}
                  onChange={(e) => handleChange("designation", e.target.value)}
                  label="Designation"
                >
                  {[
                    "HR",
                    "Finance",
                    "Senior Management",
                    "Developer",
                    "Testing",
                    "Student",
                  ].map((d) => (
                    <MenuItem key={d} value={d}>
                      {d}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth required sx={{ my: 1 }}>
                <InputLabel>Purpose</InputLabel>
                <Select
                  value={formData.purpose}
                  onChange={(e) => handleChange("purpose", e.target.value)}
                  label="Purpose"
                >
                  {["Testing", "Staging", "Production", "Development"].map(
                    (p) => (
                      <MenuItem key={p} value={p}>
                        {p}
                      </MenuItem>
                    )
                  )}
                </Select>
              </FormControl>

              <Autocomplete
                options={projects}
                getOptionLabel={(o) => o.project_name || ""}
                value={
                  projects.find(
                    (p) => p.project_name === formData.project_name
                  ) || null
                }
                onChange={(e, newValue) =>
                  handleChange("project_name", newValue?.project_name || "")
                }
                renderInput={(params) => (
                  <TextField {...params} label="Project Name" fullWidth />
                )}
              />

              <TextField
                fullWidth
                margin="normal"
                label="Purpose of Request"
                value={formData.purpose_of_request}
                onChange={(e) =>
                  handleChange("purpose_of_request", e.target.value)
                }
              />
            </>
          )}

          {(serviceFieldConfigs[selectedService.toLowerCase()] || []).map(
            ({ name, label, type }) => (
              <TextField
                key={name}
                fullWidth
                margin="normal"
                label={label}
                type={type || "text"}
                value={formData[name]}
                onChange={(e) => handleChange(name, e.target.value)}
                InputLabelProps={type === "date" ? { shrink: true } : {}}
              />
            )
          )}
        </DialogContent>
        <DialogActions sx={{ justifyContent: "space-between", padding: 2 }}>
          <Button
            onClick={handleClose}
            color="secondary"
            startIcon={<Cancel />}
          >
            Cancel
          </Button>
          <StyledButton
            onClick={handleSubmit}
            variant="contained"
            endIcon={<RocketLaunch />}
          >
            Deploy
          </StyledButton>
        </DialogActions>
      </Dialog>
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
          <Typography variant="body1" color="text.secondary">
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
    </Box>
  );
};

export default DeployPods;
