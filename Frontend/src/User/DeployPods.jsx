import { useState, useEffect } from "react";
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
import { useAuth } from "../Pages/Authentication/useAuth";
import apiClient from "../Axios";
import { useNavigate } from "react-router-dom";

const images = import.meta.glob("../assets/*.{png,jpg,jpeg,svg}", {
  eager: true,
});

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
  borderRadius: 24,
  padding: 12,
  background:
    theme.palette.mode === "dark"
      ? "linear-gradient(145deg, #1b1b1b, #262626)"
      : "linear-gradient(145deg, #ffffff, #eef1ff)",
  boxShadow:
    theme.palette.mode === "dark"
      ? "0 8px 20px rgba(0,0,0,0.35)"
      : "0 8px 20px rgba(160, 172, 255, 0.35)",
  border:
    theme.palette.mode === "dark"
      ? "1px solid rgba(255,255,255,0.08)"
      : "1px solid rgba(80, 100, 200, 0.15)",
  backdropFilter: "blur(8px)",
  transition: "all 0.35s ease",
  transform: "translateY(0px)",
  "&:hover": {
    transform: "translateY(-10px) scale(1.02)",
    boxShadow:
      theme.palette.mode === "dark"
        ? "0 12px 32px rgba(0,0,0,0.5)"
        : "0 12px 32px rgba(120,140,255,0.45)",
    borderColor:
      theme.palette.mode === "dark"
        ? "rgba(255,255,255,0.15)"
        : "rgba(60,80,200,0.35)",
  },
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
    { name: "service_start_date", label: "Service Start Date", type: "date" },
    { name: "service_end_date", label: "Service End Date", type: "date" },
    { name: "app_name", label: "App Name" },
    { name: "replica", label: "Replica", type: "number" },
    { name: "username", label: "Username" },
    { name: "password", label: "Password", type: "password" },
    { name: "root_password", label: "Root Password", type: "password" },
    { name: "database", label: "Database" },
    { name: "node_port", label: "Node Port", type: "number" },
    { name: "service_requirements", label: "Service Requirements" },
    { name: "additional_notes", label: "Additional Notes" },
  ],
  mariadb: [
    { name: "service_start_date", label: "Service Start Date", type: "date" },
    { name: "service_end_date", label: "Service End Date", type: "date" },
    { name: "app_name", label: "App Name" },
    { name: "replica", label: "Replica", type: "number" },
    { name: "username", label: "Username" },
    { name: "password", label: "Password", type: "password" },
    { name: "root_password", label: "Root Password", type: "password" },
    { name: "database", label: "Database" },
    { name: "node_port", label: "Node Port", type: "number" },
    { name: "service_requirements", label: "Service Requirements" },
    { name: "additional_notes", label: "Additional Notes" },
  ],
  couchdb: [
    { name: "service_start_date", label: "Service Start Date", type: "date" },
    { name: "service_end_date", label: "Service End Date", type: "date" },
    { name: "app_name", label: "App Name" },
    { name: "replica", label: "Replica", type: "number" },
    { name: "username", label: "Username" },
    { name: "password", label: "Password", type: "password" },
    { name: "root_password", label: "Root Password", type: "password" },
    { name: "database", label: "Database" },
    { name: "node_port", label: "Node Port", type: "number" },
    { name: "service_requirements", label: "Service Requirements" },
    { name: "additional_notes", label: "Additional Notes" },
  ],
  postgresql: [
    { name: "service_start_date", label: "Service Start Date", type: "date" },
    { name: "service_end_date", label: "Service End Date", type: "date" },
    { name: "app_name", label: "App Name" },
    { name: "replica", label: "Replica", type: "number" },
    { name: "username", label: "Username" },
    { name: "password", label: "Password", type: "password" },
    { name: "root_password", label: "Root Password", type: "password" },
    { name: "database", label: "Database" },
    { name: "node_port", label: "Node Port", type: "number" },
    { name: "service_requirements", label: "Service Requirements" },
    { name: "additional_notes", label: "Additional Notes" },
  ],
  mysql: [
    { name: "service_start_date", label: "Service Start Date", type: "date" },
    { name: "service_end_date", label: "Service End Date", type: "date" },
    { name: "app_name", label: "App Name" },
    { name: "replica", label: "Replica", type: "number" },
    { name: "username", label: "Username" },
    { name: "password", label: "Password", type: "password" },
    { name: "root_password", label: "Root Password", type: "password" },
    { name: "database", label: "Database" },
    { name: "node_port", label: "Node Port", type: "number" },
    { name: "service_requirements", label: "Service Requirements" },
    { name: "additional_notes", label: "Additional Notes" },
  ],
  nginx: [
    { name: "service_start_date", label: "Service Start Date", type: "date" },
    { name: "service_end_date", label: "Service End Date", type: "date" },
    { name: "app_name", label: "App Name" },
    { name: "service_requirements", label: "Service Requirements" },
    { name: "additional_notes", label: "Additional Notes" },
  ],
  nginxha: [
    { name: "service_start_date", label: "Service Start Date", type: "date" },
    { name: "service_end_date", label: "Service End Date", type: "date" },
    { name: "app_name", label: "Deployment Name" },
    { name: "replica", label: "Replica", type: "number", default: 2 },
    { name: "namespace", label: "Namespace", default: "default" },
    { name: "service_requirements", label: "Service Requirements" },
    { name: "additional_notes", label: "Additional Notes" },
  ],
};

const DatabaseCard = ({ card, handleOpen }) => {
  const navigate = useNavigate();

  const handleLaunchVM = () => {
    navigate("/app/openstack/vmrequest");
  };

// Get the image source once to reuse for backdrop and main logo
  const imgSource = images[`../assets/${card.logo}`]?.default;

  return (
    <StyledCard
      sx={{
        width: 400,
        height: 320, // fixed height
        display: "flex",
        flexDirection: "column",
        position: "relative", // Ensure relative for absolute backdrop positioning
        overflow: "hidden",
      }}
    >
    {/* --- Blurred Full-Bleed Backdrop --- */}
      <Box
        component="img"
        src={imgSource || "https://via.placeholder.com/600x400?text=Service"}
        alt=""
        sx={{
          position: "absolute",
          top: -20, // Offset to cover edges after blur
          left: -20,
          width: "120%",
          height: "150px", // Only cover the top half area
          objectFit: "cover",
          filter: "blur(12px) saturate(1.2)",
          opacity: 0.15, // Subtle opacity for the backdrop
          zIndex: 0,
          pointerEvents: "none",
        }}
      />

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
            position: "relative",
          }}
        >
          <img
            src={imgSource}
            alt={card.name}
            style={{
              maxWidth: "100%",
              maxHeight: "100%",
              objectFit: "contain",
              filter: "drop-shadow(0px 4px 12px rgba(0,0,0,0.1))", // Adds depth
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
            sx={{ mt: 2, width: "80%", borderRadius: '12px' }}
          >
            Launch VM
          </StyledButton>
        ) : (
          <StyledButton
            variant="contained"
            startIcon={<RocketLaunch />}
            onClick={() => handleOpen(card.name)}
            sx={{ mt: 2, width: "80%",borderRadius: '12px',
                background: "linear-gradient(90deg, #008cff, #7b1fa2)" }}
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
    // Lowercase, remove "apache " prefix, remove spaces
    return name
      .toLowerCase()
      .replace(/^apache\s+/, "") // remove vendor prefix
      .replace(/\s+/g, ""); // remove spaces for matching
  };

  const handleOpen = (service) => {
    const normalized = normalizeServiceName(service);
    const additionalFields = serviceFieldConfigs[normalized] || [];
    const dynamicData = Object.fromEntries(
      additionalFields.map((f) => [
        f.name,
        f.default !== undefined ? f.default : "",
      ]),
    );
   setFormData({
    employee_id: formData.employee_id,
    email: formData.email,
    name: formData.name,
    service_name: service,
    // REMOVED the "normalized !== 'mongodb'" check here
    designation: "",
    purpose: "",
    project_name: "",
    purpose_of_request: "",
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

    const optionalFields = ["node_port", "additional_notes"];

   // 1. Determine Required Fields
  const baseRequired = ["designation", "purpose", "project_name", "purpose_of_request"];
  const serviceRequired = dynamicFields
    .map((f) => f.name)
    .filter((f) => !optionalFields.includes(f));

    const requiredFields = [...baseRequired, ...serviceRequired];
    const missing = requiredFields.find((f) => !formData[f]);

    if (missing) {
      return setAlertDialog({
        open: true,
        message: `${missing.replace(/_/g, " ")} is required.`,
        severity: "error",
      });
    }

    const apiEndpoint = "/service-requests/create/";

    // Use the full formData so all fields (project, employee_id) are sent.
  const cleanedData = { ...formData, service_name: selectedService };

  if (cleanedData.node_port === "") {
    delete cleanedData.node_port;
  }

    if ("node_port" in cleanedData && cleanedData.node_port === "") {
      delete cleanedData.node_port;
    }

    try {
      const response = await apiClient.post(apiEndpoint, cleanedData);

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
                    ),
                  )}
                </Select>
              </FormControl>

              <Autocomplete
                options={projects}
                getOptionLabel={(o) => o.project_name || ""}
                value={
                  projects.find(
                    (p) => p.project_name === formData.project_name,
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
                placeholder={
                  name === "node_port"
                    ? "Leave empty for auto-assigned port (30000–32767)"
                    : ""
                }
                helperText={
                  name === "node_port"
                    ? "Optional. Kubernetes will assign a free port if left empty."
                    : ""
                }
              />
            ),
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
