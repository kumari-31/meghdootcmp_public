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
  CssBaseline,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import apiClient from '../Axios'; // Assuming apiClient is configured correctly

// Import useParams and useLocation for extracting URL parameters
import { useParams, useLocation, useNavigate } from 'react-router-dom';

/**
 * ReplicaSetDetails Component
 * Displays comprehensive details of a single Kubernetes ReplicaSet.
 * Fetches data based on replicaSetName and replicaSetNamespace extracted from URL.
 */
const ReplicaSetDetails = () => { // Removed onNavigateToPod from props
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const theme = useTheme();
  const navigate = useNavigate(); // Hook for programmatic navigation

  // Extract replicasetsName from the URL path parameter
  const { replicasetsName } = useParams();

  // Extract namespace from the URL query parameter
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const replicaSetNamespace = queryParams.get("namespace");

  useEffect(() => {
    const fetchReplicaSetData = async () => {
      setLoading(true);
      setError(null); // Clear previous errors

      if (!replicasetsName || !replicaSetNamespace) {
        setError("ReplicaSet name or namespace not provided in URL.");
        setLoading(false);
        return;
      }

      try {
        const response = await apiClient.get(
          `/k8s/replicaset-details/?name=${replicasetsName}&namespace=${replicaSetNamespace}`
        );
        setDetails(response.data);
      } catch (err) {
        console.error("Error fetching ReplicaSet details:", err);
        setError("Failed to load ReplicaSet details. Please try again.");
        setDetails(null);
      } finally {
        setLoading(false);
      }
    };

    fetchReplicaSetData();
  }, [replicasetsName, replicaSetNamespace]);


  // --- IMPORTANT CHANGE HERE ---
  // Handle click on a Pod name to navigate to PodDetails
  const handlePodNameClick = (podName, podNamespace) => {
    // Navigate directly to the PodDetails page using the correct path and query parameter
    navigate(`/app/kubernetes/pod-details/${podName}?namespace=${podNamespace}`);
  };

  // Handle back button click
  const handleBack = () => {
    navigate('/app/kubernetes'); // Navigate back to the Kubernetes Overview page
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh', bgcolor: theme.palette.background.default }}>
        <CircularProgress />
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
    return (
      <Box sx={{ p: 3, textAlign: 'center', bgcolor: theme.palette.background.default }}>
        <Typography variant="h6" color="text.secondary">No details found for this ReplicaSet.</Typography>
        <Button variant="contained" startIcon={<ArrowBackIcon />} onClick={handleBack} sx={{ mt: 2, bgcolor: theme.palette.primary.main, '&:hover': { bgcolor: theme.palette.primary.dark } }}>
          Back to Overview
        </Button>
      </Box>
    );
  }

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

  const renderTableCard = (title, columns, rows, emptyMessage = "No data found.", onRowNameClick = null, nameField = 'name') => (
    <Grid item xs={12}>
      <Card variant="outlined" sx={{ mt: 2, borderRadius: '8px', boxShadow: 2, bgcolor: theme.palette.background.paper }}>
        <CardContent>
          <Typography variant="h6" component="div" gutterBottom sx={{ textAlign: 'center', mb: 2, color: theme.palette.text.primary, fontWeight: 'bold' }}>
            {title}
          </Typography>
          {rows && rows.length > 0 && !(rows.length === 1 && rows[0] === "No resources found.") ? (
            <TableContainer component={Paper} sx={{ maxHeight: 300, overflowY: 'auto', borderRadius: '8px', bgcolor: theme.palette.background.paper }}>
              <Table size="small" aria-label={`${title} table`}>
                <TableHead>
                  <TableRow>
                    {columns.map((col) => (
                      <TableCell key={col.id} align={col.align || 'left'} >{col.label}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((row, index) => (
                    <TableRow key={index} >
                      {columns.map((col) => (
                        <TableCell key={`${index}-${col.id}`} align={col.align || 'left'} sx={{ color: theme.palette.text.secondary }}>
                          {col.id === nameField && onRowNameClick ? (
                            <Typography
                              component="span"
                              sx={{ cursor: 'pointer', color: theme.palette.primary.main, '&:hover': { textDecoration: 'underline' } }}
                              onClick={(e) => {
                                e.stopPropagation(); // Prevent row click from firing if row also has an onClick
                                onRowNameClick(row[nameField], row.namespace); // Pass name and namespace
                              }}
                            >
                              {col.format ? col.format(row[col.id]) : row[col.id]}
                            </Typography>
                          ) : (
                            col.format ? col.format(row[col.id]) : row[col.id]
                          )}
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

  const metadataContent = (
    <Table size="small" sx={{ '& td, & th': { border: 0 } }}>
      <TableBody>
        <TableRow><TableCell sx={{ fontWeight: 'bold', color: theme.palette.text.secondary }}>Name:</TableCell><TableCell sx={{ color: theme.palette.text.secondary }}>{details.name}</TableCell></TableRow>
        <TableRow><TableCell sx={{ fontWeight: 'bold', color: theme.palette.text.secondary }}>Namespace:</TableCell><TableCell sx={{ color: theme.palette.text.secondary }}>{details.namespace}</TableCell></TableRow>
        <TableRow><TableCell sx={{ fontWeight: 'bold', color: theme.palette.text.secondary }}>Created:</TableCell><TableCell sx={{ color: theme.palette.text.secondary }}>{details.created}</TableCell></TableRow>
        <TableRow><TableCell sx={{ fontWeight: 'bold', color: theme.palette.text.secondary }}>Age:</TableCell><TableCell sx={{ color: theme.palette.text.secondary }}>{details.age || 'N/A'}</TableCell></TableRow>
        <TableRow><TableCell sx={{ fontWeight: 'bold', color: theme.palette.text.secondary }}>UID:</TableCell><TableCell sx={{ color: theme.palette.text.secondary }}>{details.uid || 'N/A'}</TableCell></TableRow>
        <TableRow>
          <TableCell sx={{ fontWeight: 'bold', color: theme.palette.text.secondary }}>Labels:</TableCell>
          <TableCell>
            <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0, fontSize: '0.8rem', color: theme.palette.text.secondary }}>
              {details.labels ? JSON.stringify(details.labels, null, 2) : 'N/A'}
            </pre>
          </TableCell>
        </TableRow>
        <TableRow>
          <TableCell sx={{ fontWeight: 'bold', color: theme.palette.text.secondary }}>Annotations:</TableCell>
          <TableCell>
            <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0, fontSize: '0.8rem', color: theme.palette.text.secondary }}>
              {details.annotations ? JSON.stringify(details.annotations, null, 2) : 'N/A'}
            </pre>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );

  const basicInfoContent = (
    <Table size="small" sx={{ '& td, & th': { border: 0 } }}>
      <TableBody>
        <TableRow><TableCell sx={{ fontWeight: 'bold', color: theme.palette.text.secondary }}>Desired Pods:</TableCell><TableCell sx={{ color: theme.palette.text.secondary }}>{details.pod_status?.desired || 0}</TableCell></TableRow>
        <TableRow><TableCell sx={{ fontWeight: 'bold', color: theme.palette.text.secondary }}>Running Pods:</TableCell><TableCell sx={{ color: theme.palette.text.secondary }}>{details.pod_status?.running || 0}</TableCell></TableRow>
        <TableRow><TableCell sx={{ fontWeight: 'bold', color: theme.palette.text.secondary }}>Images:</TableCell><TableCell sx={{ color: theme.palette.text.secondary }}>{details.images?.join(', ') || 'N/A'}</TableCell></TableRow>
      </TableBody>
    </Table>
  );

  const podsColumns = [
    { id: 'name', label: 'Name' },
    { id: 'namespace', label: 'Namespace' },
    { id: 'node', label: 'Node' },
    { id: 'status', label: 'Status' },
    { id: 'restarts', label: 'Restarts', align: 'right' },
    { id: 'created', label: 'Created' },
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
        ReplicaSet Details: <span style={{ color: theme.palette.primary.main }}>{details.name}</span> (Namespace: <span style={{ color: theme.palette.primary.main }}>{details.namespace}</span>)
      </Typography>

      <Grid container spacing={3}>
        {renderDetailCard("Metadata", metadataContent)}
        {renderDetailCard("Basic Information", basicInfoContent)}
      </Grid>

      <Grid container spacing={3} sx={{ mt: 3 }}>
        {renderTableCard("Managed Pods", podsColumns, details.pods, "No pods managed by this ReplicaSet.", handlePodNameClick, 'name')}
        {renderTableCard("Events", eventsColumns, Array.isArray(details.events) ? details.events : [], "No events found for this ReplicaSet.")}
      </Grid>
    </Box>
  );
};

export default ReplicaSetDetails;