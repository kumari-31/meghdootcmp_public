import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  CssBaseline, // Add CssBaseline for consistent styling
} from '@mui/material';
import { useTheme } from '@mui/material/styles'; // Import useTheme
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useParams, useLocation, useNavigate } from 'react-router-dom'; // Import hooks
import apiClient from '../Axios'; // Ensure Axios is configured for your base URL and token

/**
 * ServiceDetails Component
 * Displays comprehensive details of a single Kubernetes Service.
 * Fetches data based on serviceName and serviceNamespace extracted from URL.
 */
const ServiceDetails = () => { // Removed props, as it will get data from URL
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const theme = useTheme(); // Initialize useTheme
  const navigate = useNavigate(); // For programmatic navigation

  // Extract serviceName from the URL path parameter
  // This must match your route: path="kubernetes/service-details/:serviceName"
  const { serviceName } = useParams();

  // Extract namespace from the URL query parameter
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const serviceNamespace = queryParams.get("namespace"); // Ensure "namespace" is correctly passed in URL

  useEffect(() => {
    const fetchServiceData = async () => {
      setLoading(true);
      setError(null);

      // Check if both parameters are available from the URL
      if (!serviceName || !serviceNamespace) {
        setError("Service name or namespace not provided in URL. Please ensure the URL is correct.");
        setLoading(false);
        return;
      }

      try {
        const response = await apiClient.get(
          // *** THIS IS THE CRITICAL CHANGE ***
          // Use 'services-details' (plural) as per your backend API
          `/k8s/services-details/?name=${serviceName}&namespace=${serviceNamespace}`
        );
        setDetails(response.data);
      } catch (err) {
        console.error("Error fetching service details:", err);
        // More descriptive error handling
        if (err.response) {
            // Server responded with a status code that falls out of the range of 2xx
            setError(`Failed to load service details. Status: ${err.response.status}. Message: ${err.response.data.detail || err.response.data.message || JSON.stringify(err.response.data) || 'Server error.'}`);
        } else if (err.request) {
            // The request was made but no response was received
            setError("Failed to load service details. No response from server. Check network connection or backend server status.");
        } else {
            // Something happened in setting up the request that triggered an Error
            setError(`Failed to load service details. An unexpected error occurred: ${err.message}`);
        }
        setDetails(null);
      } finally {
        setLoading(false);
      }
    };

    fetchServiceData();
  }, [serviceName, serviceNamespace]); // Dependencies for useEffect

  const handleBack = () => {
    // Navigate back to the list of services or a general Kubernetes overview
    navigate('/app/kubernetes'); // Adjust this path if your services list is elsewhere
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh', bgcolor: theme.palette.background.default }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2, color: theme.palette.text.primary }}>Loading Service details...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3, textAlign: 'center', bgcolor: theme.palette.background.default }}>
        <Typography color="error">{error}</Typography>
        <Button variant="contained" startIcon={<ArrowBackIcon />} onClick={handleBack} sx={{ mt: 2, bgcolor: theme.palette.primary.main, '&:hover': { bgcolor: theme.palette.primary.dark } }}>
          Back to Overview
        </Button>
      </Box>
    );
  }

  if (!details) {
    // This case will be hit if error is set, or if serviceName/Namespace are missing from URL
    return (
      <Box sx={{ p: 3, textAlign: 'center', bgcolor: theme.palette.background.default }}>
        <Typography variant="h6" color="text.secondary">No details found for this service or URL is incomplete.</Typography>
        <Button variant="contained" startIcon={<ArrowBackIcon />} onClick={handleBack} sx={{ mt: 2, bgcolor: theme.palette.primary.main, '&:hover': { bgcolor: theme.palette.primary.dark } }}>
          Back to Overview
        </Button>
      </Box>
    );
  }

  // --- All rendering logic assumes 'details' is available from this point ---

  const renderDetailCard = (title, content) => (
    <Grid item xs={12} sm={6} md={4} lg={3}>
      <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column', borderRadius: '8px', boxShadow: 2, bgcolor: theme.palette.background.paper }}>
        <CardContent sx={{ flexGrow: 1, p: 2 }}>
          <Typography variant="h6" component="div" gutterBottom sx={{ textAlign: 'center', mb: 1, color: theme.palette.text.primary, fontWeight: 'bold' }}>
            {title}
          </Typography>
          <Box sx={{ fontSize: '0.875rem', maxHeight: 200, overflowY: 'auto', p: 1 }}>
            {content}
          </Box>
        </CardContent>
      </Card>
    </Grid>
  );

  const renderTableCard = (title, columns, rows, emptyMessage = "No data found.") => (
    <Grid item xs={12}>
      <Card variant="outlined" sx={{ mt: 2, borderRadius: '8px', boxShadow: 2, bgcolor: theme.palette.background.paper }}>
        <CardContent>
          <Typography variant="h6" component="div" gutterBottom sx={{ textAlign: 'center', mb: 2, color: theme.palette.text.primary, fontWeight: 'bold' }}>
            {title}
          </Typography>
          {rows && rows.length > 0 && !(rows.length === 1 && typeof rows[0] === 'string' && rows[0].includes("No resources found.")) ? (
            <TableContainer component={Paper} sx={{ maxHeight: 300, overflowY: 'auto', borderRadius: '8px', bgcolor: theme.palette.background.paper }}>
              <Table size="small" aria-label={`${title} table`}>
                <TableHead>
                  <TableRow>
                    {columns.map((col) => (
                      <TableCell key={col.id} align={col.align || 'left'} sx={{ fontWeight: 'bold' }}>{col.label}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((row, index) => (
                    <TableRow key={index} sx={{ '&:hover': { backgroundColor: theme.palette.action.hover, transition: 'background-color 0.2s ease-in-out' } }}>
                      {columns.map((col) => (
                        <TableCell key={`${index}-${col.id}`} align={col.align || 'left'} sx={{ color: theme.palette.text.secondary }}>
                          {col.format ? col.format(row[col.id]) : row[col.id]}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 2, fontStyle: 'italic' }}>
              {emptyMessage}
            </Typography>
          )}
        </CardContent>
      </Card>
    </Grid>
  );

  // Data for rendering cards/tables (using optional chaining for safety)
  const metadataContent = (
    <Table size="small" sx={{ '& td, & th': { border: 0 } }}>
      <TableBody>
        <TableRow><TableCell sx={{ fontWeight: 'bold', color: theme.palette.text.secondary }}>Name:</TableCell><TableCell sx={{ color: theme.palette.text.secondary }}>{details?.name || 'N/A'}</TableCell></TableRow>
        <TableRow><TableCell sx={{ fontWeight: 'bold', color: theme.palette.text.secondary }}>Namespace:</TableCell><TableCell sx={{ color: theme.palette.text.secondary }}>{details?.namespace || 'N/A'}</TableCell></TableRow>
        <TableRow><TableCell sx={{ fontWeight: 'bold', color: theme.palette.text.secondary }}>Created:</TableCell><TableCell sx={{ color: theme.palette.text.secondary }}>{details?.created || 'N/A'}</TableCell></TableRow>
        <TableRow><TableCell sx={{ fontWeight: 'bold', color: theme.palette.text.secondary }}>Age:</TableCell><TableCell sx={{ color: theme.palette.text.secondary }}>{details?.age || 'N/A'}</TableCell></TableRow>
        <TableRow><TableCell sx={{ fontWeight: 'bold', color: theme.palette.text.secondary }}>UID:</TableCell><TableCell sx={{ color: theme.palette.text.secondary }}>{details?.uid || 'N/A'}</TableCell></TableRow>
        <TableRow>
          <TableCell sx={{ fontWeight: 'bold', color: theme.palette.text.secondary }}>Labels:</TableCell>
          <TableCell>
            <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0, fontSize: '0.8rem', color: theme.palette.text.secondary }}>
              {details?.labels ? JSON.stringify(details.labels, null, 2) : 'N/A'}
            </pre>
          </TableCell>
        </TableRow>
        <TableRow>
          <TableCell sx={{ fontWeight: 'bold', color: theme.palette.text.secondary }}>Annotations:</TableCell>
          <TableCell>
            <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0, fontSize: '0.8rem', color: theme.palette.text.secondary }}>
              {details?.annotations ? JSON.stringify(details.annotations, null, 2) : 'N/A'}
            </pre>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );

  const basicInfoContent = (
    <Table size="small" sx={{ '& td, & th': { border: 0 } }}>
      <TableBody>
        <TableRow><TableCell sx={{ fontWeight: 'bold', color: theme.palette.text.secondary }}>Type:</TableCell><TableCell sx={{ color: theme.palette.text.secondary }}>{details?.type || 'N/A'}</TableCell></TableRow>
        <TableRow><TableCell sx={{ fontWeight: 'bold', color: theme.palette.text.secondary }}>Cluster IP:</TableCell><TableCell sx={{ color: theme.palette.text.secondary }}>{details?.cluster_ip || 'N/A'}</TableCell></TableRow>
        <TableRow><TableCell sx={{ fontWeight: 'bold', color: theme.palette.text.secondary }}>Internal Endpoints:</TableCell><TableCell sx={{ color: theme.palette.text.secondary }}>{details?.internal_endpoints?.join(', ') || 'N/A'}</TableCell></TableRow>
        <TableRow><TableCell sx={{ fontWeight: 'bold', color: theme.palette.text.secondary }}>External Endpoints:</TableCell><TableCell sx={{ color: theme.palette.text.secondary }}>{details?.external_endpoints?.join(', ') || 'N/A'}</TableCell></TableRow>
        <TableRow><TableCell sx={{ fontWeight: 'bold', color: theme.palette.text.secondary }}>Selector:</TableCell><TableCell sx={{ color: theme.palette.text.secondary }}>{details?.selector ? JSON.stringify(details.selector, null, 2) : 'N/A'}</TableCell></TableRow>
      </TableBody>
    </Table>
  );

  const portsColumns = [
    { id: 'name', label: 'Name' },
    { id: 'protocol', label: 'Protocol' },
    { id: 'port', label: 'Port' },
    { id: 'target_port', label: 'Target Port' },
    { id: 'node_port', label: 'Node Port' },
  ];

  const eventsColumns = [
    { id: 'type', label: 'Type' },
    { id: 'reason', label: 'Reason' },
    { id: 'age', label: 'Age' },
    { id: 'from', label: 'From' },
    { id: 'message', label: 'Message' },
  ];

  return (
    <Box sx={{ p: 3, bgcolor: theme.palette.background.default, minHeight: '100vh' }}>
      <CssBaseline />
      <Button
        variant="contained"
        startIcon={<ArrowBackIcon />}
        onClick={handleBack}
        sx={{ mb: 3, bgcolor: theme.palette.primary.main, '&:hover': { bgcolor: theme.palette.primary.dark } }}
      >
        Back to Overview
      </Button>
      <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 4, textAlign: 'center', color: theme.palette.text.primary, fontWeight: 'bold' }}>
        Service Details: <span style={{ color: theme.palette.primary.main }}>{details?.name || 'Loading...'}</span> (Namespace: <span style={{ color: theme.palette.primary.main }}>{details?.namespace || 'Loading...'}</span>)
      </Typography>

      <Grid container spacing={3}>
        {renderDetailCard("Metadata", metadataContent)}
        {renderDetailCard("Basic Information", basicInfoContent)}
      </Grid>

      <Grid container spacing={3} sx={{ mt: 3 }}>
        {/* Ensure details.ports is an array, provide empty array if null/undefined */}
        {renderTableCard("Ports", portsColumns, details?.ports || [], "No ports configured.")}
        {/* Ensure details.events is an array, handle "No resources found." string case */}
        {renderTableCard("Events", eventsColumns, Array.isArray(details?.events) ? details.events : [], "No events found.")}
      </Grid>
    </Box>
  );
};

export default ServiceDetails;