import  { useState, useEffect } from "react";
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
  
} from "@mui/material";
import { CloudUpload, RocketLaunch, Cancel } from "@mui/icons-material";
import apiClient from "../Axios";

const loadImage = (name) => {
  try {
    return require(`../assets/${name}`);
  } catch (e) {
    console.error("Image not found:", name);
    return "";
  }
};


const categorizedCards = {
  "Web Server": [
    {
      name: "nginx",
      logo: "nginx.png",
      description:
        'Nginx (pronounced "engine x") is a powerful, high-performance web server and reverse proxy',
    },
    {
      name: "nginx-ha",
      logo: "nginx.png", // use same logo
      description:
        "Nginx HA Deployment: Highly available Nginx setup with multiple replicas and load balancing",
    },
  ],
  
  "Relational Databases": [
    {
      name: 'PostgreSQL',
      logo: 'postgresql.png',
      description: 'Robust, open-source relational database known for its reliability and extensibility.',
    },
    {
      name: 'MySQL',
      logo: 'mysql.png',
      description: 'Popular open-source relational database, widely used for web applications.',
    },
    {
      name: 'MariaDB',
      logo: 'mariadb.png',
      description: 'Community-driven fork of MySQL, aiming for high performance and compatibility.',
    },
  ],
  "NoSQL Databases": [
    {
      name: 'MongoDB',
      logo: 'mongodb.png',
      description: 'Scalable NoSQL database designed for high availability and developer agility.',
    },
    {
      name: 'Apache CouchDB',
      logo: 'couchdb.png',
      description: 'Document-oriented NoSQL database with a RESTful JSON API.',
    },
  ],
  "Messaging Systems": [
    {
      name: 'RabbitMQ',
      logo: 'rabbitmq.png',
      description: 'Versatile message broker for reliable and scalable messaging.',
    },
    {
      name: 'ZeroMQ',
      logo: 'zeromq.png',
      description: 'High-performance asynchronous messaging library for building concurrent applications.',
    },
    {
      name: 'ActiveMQ',
      logo: 'activemq.png',
      description: 'Powerful open-source message broker supporting various messaging protocols.',
    },
    {
      name: 'Kafka',
      logo: 'kafka.png',
      description: 'Distributed event streaming platform for high-throughput, real-time data feeds.',
    },
  ],
  "Search Engines": [
    {
      name: 'Elasticsearch',
      logo: 'elasticsearch.png',
      description: 'Distributed search and analytics engine for real-time exploration and analysis.',
    },
  ],
};

const initialButtonCategories = Object.keys(categorizedCards);

const fieldMapping = {
  "nginx": ["pod_name", "namespace", "replicas"],
  "nginx-ha": ["pod_name", "namespace", "replicas"], 
  PostgreSQL: ["pod_name", "namespace", "app_type"],
  MariaDB: ["pod_name", "namespace", "app_type"],
  MongoDB: ["pod_name", "namespace", "app_type"],
  CouchDB: ["pod_name", "namespace", "app_type"],
  RabbitMQ: ["pod_name", "namespace", "app_type"],
  ZeroMQ: ["pod_name", "namespace", "app_type"],
  ActiveMQ: ["pod_name", "namespace", "app_type"],
  Kafka: ["pod_name", "namespace", "app_type"],
  Elasticsearch: ["pod_name", "namespace", "app_type"],
};

const StyledCard = styled(Card)(({ theme }) => ({
  borderRadius: 8,
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
  transition: 'transform 0.2s ease-in-out',
  '&:hover': {
    transform: 'scale(1.05)',
    boxShadow: '0 6px 16px rgba(0, 0, 0, 0.2)',
  },
  height: '100%', // Ensure cards take full height of their Grid2 cell
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
}));

const StyledButton = styled(Button)(({ theme }) => ({
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.common.white,
  '&:hover': {
    backgroundColor: theme.palette.primary.dark,
  },
}));

const CategoryButton = styled(Button)(({ theme, selected }) => ({
  margin: theme.spacing(1),
  backgroundColor: selected ? theme.palette.primary.main : theme.palette.grey[300],
  color: selected ? theme.palette.common.white : theme.palette.text.primary,
  '&:hover': {
    backgroundColor: selected ? theme.palette.primary.dark : theme.palette.grey[400],
  },
}));

const DatabaseCard = ({ card }) => (
  <StyledCard
  sx={{
    width: 400,
    height: 300, // fixed height
    display: 'flex',
    flexDirection: 'column',
  }}
  >
    <CardContent
   sx={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    flexGrow: 1,
  //   height: '100%',
  }}
    >
      <Box
        sx={{
          width: '80%',
          height: '120px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          mb: 2,
        }}
      >
        <img
          src={loadImage(card.logo)}
          alt={`${card.name} Logo`}
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain',
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
    </CardContent>
  </StyledCard>
);


const Pods = () => {
  const [open, setOpen] = useState(false);
  const [selectedService, setSelectedService] = useState("");
  const [formData, setFormData] = useState({});
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [displayedCards, setDisplayedCards] = useState([]);

  useEffect(() => {
    handleCategoryClick("All"); // Initialize displayedCards with all cards
  }, []);

  const handleOpen = (service) => {
    setSelectedService(service);
    const fields = fieldMapping[service] || [];
    const initialData = fields.reduce((acc, field) => ({ ...acc, [field]: "" }), {});
    setFormData(initialData);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setFormData({});
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleDeploy = async () => {
    try {
      let payload = { ...formData };
      if (selectedService === "nginx-ha") {
        // You can customize payload for nginx-ha if needed
        payload.type = "ha";
      }
      await apiClient.post("/k8s/deploy-pod/", payload);
      alert(`${selectedService} deployed successfully`);
    } catch (error) {
      console.error("Deployment failed", error);
      alert("Deployment failed. Check console for details.");
    }
    handleClose();
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
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
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
        <DialogTitle sx={{ fontWeight: 'bold', color: 'primary.main' }}>
          Deploy {selectedService}
        </DialogTitle>
        <DialogContent>
          <Typography variant="subtitle1" color="textSecondary" mb={2}>
            Provide the necessary details to deploy the {selectedService} pod.
          </Typography>
          {Object.keys(formData).map((field) => (
            <TextField
              key={field}
              fullWidth
              margin="dense"
              label={field.replace("_", " ").toUpperCase()}
              value={formData[field]}
              onChange={(e) => handleChange(field, e.target.value)}
              variant="outlined"
            />
          ))}
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'space-between', padding: 2 }}>
          <Button onClick={handleClose} color="secondary" startIcon={<Cancel />}>
            Cancel
          </Button>
          <StyledButton onClick={handleDeploy} variant="contained" endIcon={<RocketLaunch />}>
            Deploy
          </StyledButton>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Pods;