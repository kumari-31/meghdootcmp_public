import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'; // Import useNavigate and useSearchParams
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
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DescriptionIcon from '@mui/icons-material/Description'; // Icon for logs
import CloseIcon from '@mui/icons-material/Close'; // For the close button on the dialog
import apiClient from '../Axios'; // Assuming your Axios instance is configured here

/**
 * PodDetails Component
 * Displays comprehensive details of a single Kubernetes Pod.
 * Fetches data based on podName and podNamespace extracted from URL.
 */
const PodDetails = () => { // No longer accepts podName, podNamespace, onBack as props
  const { podName } = useParams(); // Extract podName from URL path parameter
  const navigate = useNavigate(); // For navigation
  const [searchParams] = useSearchParams(); // To get query parameters
  const podNamespace = searchParams.get('namespace'); // Get 'namespace' query parameter

  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // State for logs and dialog visibility
  const [logs, setLogs] = useState(null);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState(null);
  const [openLogsDialog, setOpenLogsDialog] = useState(false); // Controls dialog open/close

  // --- Fetch Pod Details ---
  useEffect(() => {
    const fetchPodData = async () => {
      setLoading(true);
      setError(null);
      try {
        if (!podName || !podNamespace) { // Check if podName or podNamespace are missing
          throw new Error("Pod name or namespace is missing from the URL.");
        }
        const response = await apiClient.get(
          `/k8s/pod-details/?name=${podName}&namespace=${podNamespace}`
        );
        setDetails(response.data);
      } catch (err) {
        console.error("Error fetching pod details:", err);
        setError("Failed to load pod details. Please try again or check the URL.");
        setDetails(null);
      } finally {
        setLoading(false);
      }
    };

    fetchPodData(); // Call fetch data
  }, [podName, podNamespace]); // Re-run when podName or podNamespace changes

  // --- Handle View Logs Button Click and Fetch Logs ---
  const handleViewLogs = async () => {
    setOpenLogsDialog(true); // Open the dialog immediately
    setLogsLoading(true);
    setLogsError(null);
    setLogs(null); // Clear previous logs when opening

    try {
      if (!podName || !podNamespace) { // Essential check before API call
        throw new Error("Cannot fetch logs: Pod name or namespace is missing.");
      }
      const logsApiUrl = `/logs/${podNamespace}/${podName}/`;
      const response = await apiClient.get(logsApiUrl);
      setLogs(response.data.logs); // Assuming the response has a 'logs' field
    } catch (err) {
      console.error("Error fetching pod logs:", err);
      setLogsError("Failed to load logs. Pod logs might not be available or an API error occurred.");
    } finally {
      setLogsLoading(false);
    }
  };

  // --- Handle Closing Logs Dialog ---
  const handleCloseLogsDialog = () => {
    setOpenLogsDialog(false);
    // Optionally clear logs and errors when closing the dialog for a fresh load next time
    setLogs(null);
    setLogsError(null);
  };

  // --- Handle Back Button ---
  const handleBack = () => {
    navigate('/app/kubernetes'); // Navigate back to your overview page
  };


  // --- Loading State for Pod Details ---
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>Loading Pod details...</Typography>
      </Box>
    );
  }

  // --- Error State for Pod Details ---
  if (error) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="error">{error}</Typography>
        <Button variant="contained" startIcon={<ArrowBackIcon />} onClick={handleBack} sx={{ mt: 2 }}>
          Back to Overview
        </Button>
      </Box>
    );
  }

  // --- No Details Found State ---
  if (!details) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary">No details found for this pod.</Typography>
        <Button variant="contained" startIcon={<ArrowBackIcon />} onClick={handleBack} sx={{ mt: 2 }}>
          Back to Overview
        </Button>
      </Box>
    );
  }

  // --- Helper for Rendering Detail Cards ---
  const renderDetailCard = (title, content) => (
    <Grid item xs={12} sm={6} md={4} lg={3}>
      <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column', borderRadius: '8px', boxShadow: 2 }}>
        <CardContent sx={{ flexGrow: 1, p: 2 }}>
          <Typography variant="h6" component="div" gutterBottom sx={{ textAlign: 'center', mb: 1, color: '#3f51b5', fontWeight: 'bold' }}>
            {title}
          </Typography>
          <Box sx={{ fontSize: '0.875rem', maxHeight: 200, overflowY: 'auto', p: 1 }}>
            {content}
          </Box>
        </CardContent>
      </Card>
    </Grid>
  );

  // --- Helper for Rendering Table Cards ---
  const renderTableCard = (title, columns, rows, emptyMessage = "No data found.") => (
    <Grid item xs={12}>
      <Card variant="outlined" sx={{ mt: 2, borderRadius: '8px', boxShadow: 2 }}>
        <CardContent>
          <Typography variant="h6" component="div" gutterBottom sx={{ textAlign: 'center', mb: 2, color: '#3f51b5', fontWeight: 'bold' }}>
            {title}
          </Typography>
          {rows && rows.length > 0 && !(rows.length === 1 && rows[0] === "No resources found.") ? (
            <TableContainer component={Paper} sx={{ maxHeight: 300, overflowY: 'auto', borderRadius: '8px' }}>
              <Table size="small" aria-label={`${title} table`}>
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#e0e0e0' }}>
                    {columns.map((col) => (
                      <TableCell key={col.id} align={col.align || 'left'} sx={{ fontWeight: 'bold' }}>{col.label}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((row, index) => (
                    <TableRow key={index} sx={{ '&:nth-of-type(odd)': { backgroundColor: '#f9f9f9' } }}>
                      {columns.map((col) => (
                        <TableCell key={`${index}-${col.id}`} align={col.align || 'left'}>
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

  // --- Data for Metadata Card ---
  const metadataContent = (
    <Table size="small" sx={{ '& td, & th': { border: 0 } }}>
      <TableBody>
        <TableRow><TableCell sx={{ fontWeight: 'bold' }}>Name:</TableCell><TableCell>{details.name}</TableCell></TableRow>
        <TableRow><TableCell sx={{ fontWeight: 'bold' }}>Namespace:</TableCell><TableCell>{details.namespace}</TableCell></TableRow>
        <TableRow><TableCell sx={{ fontWeight: 'bold' }}>Created:</TableCell><TableCell>{details.created_at}</TableCell></TableRow>
        <TableRow><TableCell sx={{ fontWeight: 'bold' }}>Age:</TableCell><TableCell>{details.age || 'N/A'}</TableCell></TableRow>
        <TableRow><TableCell sx={{ fontWeight: 'bold' }}>UID:</TableCell><TableCell>{details.uid || 'N/A'}</TableCell></TableRow>
        <TableRow>
          <TableCell sx={{ fontWeight: 'bold' }}>Labels:</TableCell>
          <TableCell>
            <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0, fontSize: '0.8rem' }}>
              {details.labels ? JSON.stringify(details.labels, null, 2) : 'N/A'}
            </pre>
          </TableCell>
        </TableRow>
        <TableRow>
          <TableCell sx={{ fontWeight: 'bold' }}>Annotations:</TableCell>
          <TableCell>
            <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0, fontSize: '0.8rem' }}>
              {details.annotations ? JSON.stringify(details.annotations, null, 2) : 'N/A'}
            </pre>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );

  // --- Data for Basic Information Card ---
  const basicInfoContent = (
    <Table size="small" sx={{ '& td, & th': { border: 0 } }}>
      <TableBody>
        <TableRow><TableCell sx={{ fontWeight: 'bold' }}>Node:</TableCell><TableCell>{details.node || 'N/A'}</TableCell></TableRow>
        <TableRow><TableCell sx={{ fontWeight: 'bold' }}>Status:</TableCell><TableCell>{details.status || 'N/A'}</TableCell></TableRow>
        <TableRow><TableCell sx={{ fontWeight: 'bold' }}>Restarts:</TableCell><TableCell>{details.restarts || 0}</TableCell></TableRow>
        <TableRow><TableCell sx={{ fontWeight: 'bold' }}>IP:</TableCell><TableCell>{details.ip || 'N/A'}</TableCell></TableRow>
        <TableRow><TableCell sx={{ fontWeight: 'bold' }}>CPU Usage:</TableCell><TableCell>{details.cpu_usage || 'N/A'}</TableCell></TableRow>
        <TableRow><TableCell sx={{ fontWeight: 'bold' }}>Memory Usage (Bytes):</TableCell><TableCell>{details.memory_usage || 'N/A'}</TableCell></TableRow>
      </TableBody>
    </Table>
  );

  // --- Column Definitions for Tables ---
  const containersColumns = [
    { id: 'name', label: 'Name' },
    { id: 'image', label: 'Image' },
    { id: 'ports', label: 'Ports', format: (value) => value?.join(', ') || 'N/A' },
    { id: 'state', label: 'State' },
    { id: 'last_state', label: 'Last State' },
    { id: 'restart_count', label: 'Restart Count' },
    { id: 'ready', label: 'Ready' },
    { id: 'started', label: 'Started' },
  ];

  const conditionsColumns = [
    { id: 'type', label: 'Type' },
    { id: 'status', label: 'Status' },
    { id: 'last_transition_time', label: 'Last Transition Time' },
    { id: 'reason', label: 'Reason' },
    { id: 'message', label: 'Message' },
  ];

  const volumesColumns = [
    { id: 'name', label: 'Name' },
    { id: 'type', label: 'Type' },
    { id: 'medium', label: 'Medium' },
    { id: 'mount_path', label: 'Mount Path' },
    { id: 'read_only', label: 'Read Only', format: (value) => value ? 'True' : 'False' },
  ];

  const eventsColumns = [
    { id: 'type', label: 'Type' },
    { id: 'reason', label: 'Reason' },
    { id: 'age', label: 'Age' },
    { id: 'from', label: 'From' },
    { id: 'message', label: 'Message' },
  ];

  // --- Main Component Render ---
  return (
    <Box sx={{ p: 3, minHeight: '100vh' }}>
      {/* Back Button and View Logs Button */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Button
          variant="contained"
          startIcon={<ArrowBackIcon />}
          onClick={handleBack} // Use the new handleBack function
          sx={{ bgcolor: '#5c6bc0', '&:hover': { bgcolor: '#3f51b5' } }}
        >
          Back to Overview
        </Button>
        <IconButton
          color="primary"
          onClick={handleViewLogs}
          aria-label="view pod logs"
          sx={{
            bgcolor: '#5c6bc0',
            color: 'white',
            borderRadius: '8px',
            padding: '10px',
            '&:hover': { bgcolor: '#388e3c' },
            boxShadow: 3
          }}
        >
          <DescriptionIcon /> {/* The icon for logs */}
        </IconButton>
      </Box>

      {/* Pod Details Header */}
      <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 4, textAlign: 'center', color: '#1a237e', fontWeight: 'bold' }}>
        Pod Details: <span style={{ color: '#5c6bc0' }}>{details.name}</span> (Namespace: <span style={{ color: '#5c6bc0' }}>{details.namespace}</span>)
      </Typography>

      {/* Metadata and Basic Information Cards */}
      <Grid container spacing={3}>
        {renderDetailCard("Metadata", metadataContent)}
        {renderDetailCard("Basic Information", basicInfoContent)}
      </Grid>

      {/* Tables for Containers, Conditions, Volumes, and Events */}
      <Grid container spacing={3} sx={{ mt: 3 }}>
        {renderTableCard("Containers", containersColumns, details.containers, "No containers found.")}
        {renderTableCard("Conditions", conditionsColumns, details.conditions, "No conditions found.")}
        {renderTableCard("Volumes", volumesColumns, details.volumes, "No volumes found.")}
        {renderTableCard("Events", eventsColumns, details.events === "No resources found." ? [] : details.events, "No events found.")}
      </Grid>

      {/* --- Pod Logs Dialog (Popup) --- */}
      <Dialog
        open={openLogsDialog}
        onClose={handleCloseLogsDialog} // Allows closing by clicking outside or pressing Esc
        maxWidth="lg" // Adjust max width as needed (e.g., 'md', 'lg', 'xl', false for full width)
        fullWidth // Makes the dialog take up full width up to maxWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              Pod Logs: {podName} (Namespace: {podNamespace})
            </Typography>
            <IconButton
              aria-label="close"
              onClick={handleCloseLogsDialog}
              sx={{ color: (theme) => theme.palette.grey[500] }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0 }}> {/* Use dividers to separate content, p:0 to control inner padding */}
          {logsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200, py: 4 }}>
              <CircularProgress size={24} />
              <Typography sx={{ ml: 2 }}>Loading logs...</Typography>
            </Box>
          ) : logsError ? (
            <Box sx={{ p: 3 }}>
              <Typography color="error" sx={{ textAlign: 'center' }}>{logsError}</Typography>
            </Box>
          ) : logs ? (
            <Box
              sx={{
                p: 2, // Padding inside the logs box
                bgcolor: '#333', // Dark background for logs
                color: '#eee',   // Light text color
                fontFamily: 'monospace',
                whiteSpace: 'pre-wrap', // Preserve whitespace and wrap lines
                wordBreak: 'break-all', // Break long words
                maxHeight: '70vh', // Max height for logs, make it scrollable (relative to viewport height)
                overflowY: 'auto',
                borderRadius: '0', // No border radius inside dialog content
              }}
            >
              {logs}
            </Box>
          ) : (
            <Box sx={{ p: 3 }}>
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
                No logs to display for this pod.
              </Typography>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default PodDetails;