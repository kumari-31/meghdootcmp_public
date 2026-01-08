import React, { useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  AppBar,
  Toolbar,
  Container,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Card,
  CardContent,
  Box,
  Divider,
  Button,
  TextField,
  Chip,
  Avatar,
  Stack,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import SecurityIcon from "@mui/icons-material/Security";
import LoginIcon from "@mui/icons-material/Login";
import VmIcon from "@mui/icons-material/Computer";
import KubernetesIcon from "@mui/icons-material/Storage";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";
import BrowserUpdatedIcon from "@mui/icons-material/Language";
import AssignmentIcon from "@mui/icons-material/Assignment";

const faqData = [
  // Login
  {
    category: "Login",
    icon: <LoginIcon />,
    question: "I forgot my password.",
    answer: "Click “Forgot Password?” to reset it via email instantly.",
  },
  {
    category: "Login",
    icon: <LoginIcon />,
    question: "I didn’t receive the verification or OTP email.",
    answer:
      "Check your spam/junk folder. If you still don’t receive it, request a new verification email or OTP.",
  },
  {
    category: "Login",
    icon: <LoginIcon />,
    question: "My account is locked or login fails.",
    answer:
      "Ensure your credentials are correct. For repeated login failures, contact support to unlock your account.",
  },

  // Registration
  {
    category: "Registration",
    icon: <AssignmentIcon />,
    question: "I don’t see my account or can’t register.",
    answer:
      "New users must first be added by an Admin or FLA. Once your employee details are added, you can register, and your Employee ID, Name, and Email will automatically be pre-filled in the registration form. Contact your Admin or FLA for access.",
  },

  // Browser
  {
    category: "Browser",
    icon: <BrowserUpdatedIcon />,
    question: "Which browsers are supported?",
    answer:
      "Use the latest versions of Chrome, Edge, or Firefox for the best experience.",
  },

  // VM Services
  {
    category: "VM Services",
    icon: <VmIcon />,
    question: "How do I request a new VM?",
    answer:
      "Navigate to the VM Request section, fill in the required details, and submit. Track approval in the Requests tab.",
  },
  {
    category: "VM Services",
    icon: <VmIcon />,
    question: "What is the maximum number of VMs I can request?",
    answer:
      "The quota depends on your role and allocation by Admin/FLA. Check your Dashboard for limits.",
  },
  {
    category: "VM Services",
    icon: <VmIcon />,
    question: "How do I delete a VM?",
    answer:
      "Select the VM in your dashboard and click Delete. Confirm to release resources.",
  },
  {
    category: "VM Services",
    icon: <VmIcon />,
    question: "Can I extend storage or network of my VM?",
    answer:
      "Yes, submit a request via the Storage or Network section. Approval depends on your quota.",
  },

  // Kubernetes Services
  {
    category: "Kubernetes Services",
    icon: <KubernetesIcon />,
    question: "How do I deploy a Kubernetes pod?",
    answer:
      "Go to the Kubernetes section, select a cluster, and click Deploy Pod. Fill in required configuration and submit.",
  },
  {
    category: "Kubernetes Services",
    icon: <KubernetesIcon />,
    question: "Can I scale my Kubernetes deployment?",
    answer:
      "Select the deployment and adjust the replica count. Submit to apply changes.",
  },
  {
    category: "Kubernetes Services",
    icon: <KubernetesIcon />,
    question: "How do I check pod logs?",
    answer:
      "Select the pod in the Kubernetes dashboard and click Logs to view output.",
  },
  {
    category: "Kubernetes Services",
    icon: <KubernetesIcon />,
    question: "Why is my pod not running?",
    answer:
      "Check the pod status and events in the dashboard. It may be due to insufficient resources or misconfiguration.",
  },

  // Security
  {
    category: "Security",
    icon: <SecurityIcon />,
    question: "How do I reset my two-factor authentication (2FA) or OTP?",
    answer:
      "If 2FA is enabled and you can’t access it, contact support to reset it.",
  },

  // Session
  {
    category: "Session",
    icon: <SecurityIcon />,
    question: "What should I do if my session expires?",
    answer:
      "You’ll need to log in again. Ensure you log out safely when done to keep your account secure.",
  },

  // UI Issues
  {
    category: "UI",
    icon: <AssignmentIcon />,
    question: "I’m facing issues with page loading or UI glitches.",
    answer:
      "Clear your browser cache, cookies, or try a different supported browser. Ensure your internet connection is stable.",
  },

  // Support
  {
    category: "Support",
    icon: <SupportAgentIcon />,
    question: "How do I contact CMP support?",
    answer:
      "Click “Need Help?” on the login page or email support@cmpportal.com with your issue.",
  },
];

const categories = [
  "All",
  "Login",
  "Registration",
  "Browser",
  "VM Services",
  "Kubernetes Services",
  "Session",
  "Security",
  "UI",
  "Support",
];

const categoryColors = {
  Login: "#253848",
  Registration: "#9c27b0",
  Browser: "#009688",
  "VM Services": "#f57c00",
  "Kubernetes Services": "#388e3c",
  Session: "#0288d1",
  Security: "#d32f2f",
  UI: "#7b1fa2",
  Support: "#6d4c41",
};

const FaqPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const filteredFaqs = faqData.filter((faq) => {
    const matchesCategory =
      selectedCategory === "All" || faq.category === selectedCategory;
    const matchesSearch = faq.question
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <Box sx={{ minHeight: "100vh", backgroundColor: "#f0f4f8" }}>
      {/* Navbar */}
      <AppBar position="sticky" sx={{ backgroundColor: "#253848", mb: 2 }}>
        <Toolbar sx={{ justifyContent: "space-between" }}>
          <Typography variant="h6" sx={{ fontWeight: "bold" }}>
            Meghdoot CMP
          </Typography>
          <Box>
            <Button
              component={RouterLink}
              to="/"
              color="inherit"
              sx={{ textTransform: "none", fontWeight: "bold", mr: 2 }}
            >
              Sign In
            </Button>
            <Button
              component={RouterLink}
              to="/registration"
              color="inherit"
              sx={{ textTransform: "none", fontWeight: "bold" }}
            >
              Sign Up
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ py: 4 }}>
        {/* Search Section */}
        <Typography
          variant="h4"
          align="center"
          sx={{ fontWeight: "bold", mb: 1, color: "#253848" }}
        >
          How can we help?
        </Typography>
        <Typography
          variant="subtitle1"
          align="center"
          sx={{ mb: 3, color: "gray" }}
        >
          Search for questions related to login, VM requests, Kubernetes
          services, and more
        </Typography>

        <TextField
          fullWidth
          placeholder="Search FAQs..."
          variant="outlined"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ mb: 3, backgroundColor: "#fff", borderRadius: 1 }}
        />

        {/* Categories */}
        {/* Categories */}
        <Box
          display="flex"
          flexWrap="wrap"
          gap={1}
          mb={4}
          justifyContent="center"
          sx={{ position: "sticky", top: 16, zIndex: 1000 }}
        >
          {categories.map((cat) => (
            <Chip
              key={cat}
              label={cat}
              clickable
              onClick={() => setSelectedCategory(cat)}
              sx={{
                color: selectedCategory === cat ? "#fff" : "#253848",
                backgroundColor:
                  selectedCategory === cat ? "#253848" : "#e0e0e0",
                fontWeight: selectedCategory === cat ? "bold" : "normal",
                "&:hover": {
                  backgroundColor:
                    selectedCategory === cat ? "#1f2f43" : "#d5d5d5",
                },
              }}
            />
          ))}
        </Box>

        {/* FAQ List */}
        <Box display="flex" flexDirection="column" gap={3}>
          {filteredFaqs.length ? (
            filteredFaqs.map((faq, index) => (
              <Card
                key={index}
                sx={{
                  borderRadius: 2,
                  boxShadow: 3,
                  transition: "transform 0.2s",
                  "&:hover": { transform: "scale(1.02)" },
                }}
              >
                <CardContent>
                  <Accordion
                    sx={{ boxShadow: "none", "&:before": { display: "none" } }}
                  >
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Avatar
                          sx={{
                            bgcolor: categoryColors[faq.category],
                            width: 24,
                            height: 24,
                          }}
                        >
                          {faq.icon}
                        </Avatar>
                        <Typography
                          sx={{ fontWeight: "bold", fontSize: "1rem" }}
                        >
                          {faq.question}
                        </Typography>
                      </Stack>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Divider sx={{ mb: 1 }} />
                      <Typography sx={{ fontSize: "0.95rem", color: "gray" }}>
                        {faq.answer}
                      </Typography>
                    </AccordionDetails>
                  </Accordion>
                </CardContent>
              </Card>
            ))
          ) : (
            <Typography align="center" sx={{ color: "gray", mt: 4 }}>
              No FAQs found for your search.
            </Typography>
          )}
        </Box>

        {/* Footer */}
        <Typography
          variant="body2"
          align="center"
          sx={{ mt: 6, color: "gray" }}
        >
          © 2024–25 C-DAC. All rights reserved.
        </Typography>
      </Container>
    </Box>
  );
};

export default FaqPage;
