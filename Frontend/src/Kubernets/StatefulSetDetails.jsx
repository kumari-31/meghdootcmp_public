import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
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
  Chip, // Added Chip for labels
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import apiClient from '../Axios';

// Helper to format bytes for memory usage (e.g., 258568192 Bytes -> 246.59 MB)
const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    if (bytes === null || bytes === undefined) return 'N/A';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const StatefulSetDetails = () => {
  const { statefulsetName } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const queryParams = new URLSearchParams(location.search);
  const namespace = queryParams.get('namespace');
  const name = statefulsetName;

  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true);
      setError(null);

      if (!namespace || !name) {
        setError("Invalid URL: Could not determine StatefulSet name or namespace from the URL.");
        setLoading(false);
        return;
      }

      try {
        const response = await apiClient.get(`/k8s/statefulset-details/?name=${name}&namespace=${namespace}`);
        setDetails(response.data);
      } catch (err) {
        console.error("Error fetching StatefulSet details:", err);
        setError("Failed to load StatefulSet details. It might not exist or there was an API error.");
        setDetails(null);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [name, namespace, location.search]);

  // Helper functions for rendering cards and tables (copied from ServiceDetails)
  const renderDetailCard = (title, content) => (
    <Grid item xs={12} sm={6} md={4} lg={3}> {/* Adjusted grid size for more cards */}
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

  // --- Render based on loading, error, or data ---
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="error">{error}</Typography>
        <Button variant="contained" startIcon={<ArrowBackIcon />} onClick={() => navigate('/app/kubernetes/stateful-sets')} sx={{ mt: 2 }}>
          Back to StatefulSets Overview
        </Button>
      </Box>
    );
  }

  if (!details || !details.metadata) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary">No details found for StatefulSet **{name}** in namespace **{namespace}**.</Typography>
        <Button variant="contained" startIcon={<ArrowBackIcon />} onClick={() => navigate('/app/kubernetes/stateful-sets')} sx={{ mt: 2 }}>
          Back to StatefulSets Overview
        </Button>
      </Box>
    );
  }

  // Data for rendering cards/tables (using `details` object)
  const metadataContent = (
    <Table size="small" sx={{ '& td, & th': { border: 0 } }}>
      <TableBody>
        <TableRow><TableCell sx={{ fontWeight: 'bold' }}>Name:</TableCell><TableCell>{details.metadata.name}</TableCell></TableRow>
        <TableRow><TableCell sx={{ fontWeight: 'bold' }}>Namespace:</TableCell><TableCell>{details.metadata.namespace}</TableCell></TableRow>
        <TableRow><TableCell sx={{ fontWeight: 'bold' }}>UID:</TableCell><TableCell>{details.metadata.uid}</TableCell></TableRow>
        <TableRow><TableCell sx={{ fontWeight: 'bold' }}>Created:</TableCell><TableCell>{details.metadata.created}</TableCell></TableRow>
        <TableRow><TableCell sx={{ fontWeight: 'bold' }}>Age:</TableCell><TableCell>{details.metadata.age}</TableCell></TableRow>
        <TableRow>
          <TableCell sx={{ fontWeight: 'bold' }}>Labels:</TableCell>
          <TableCell>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {details.metadata.labels && Object.keys(details.metadata.labels).length > 0 ? (
                Object.entries(details.metadata.labels).map(([key, value]) => (
                  <Chip key={key} label={`${key}: ${value}`} variant="outlined" size="small" />
                ))
              ) : (
                'N/A'
              )}
            </Box>
          </TableCell>
        </TableRow>
        <TableRow>
          <TableCell sx={{ fontWeight: 'bold' }}>Annotations:</TableCell>
          <TableCell>
            <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0, fontSize: '0.8rem' }}>
              {details.metadata.annotations ? JSON.stringify(details.metadata.annotations, null, 2) : 'N/A'}
            </pre>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );

  const basicInfoContent = (
    <Table size="small" sx={{ '& td, & th': { border: 0 } }}>
      <TableBody>
        <TableRow><TableCell sx={{ fontWeight: 'bold' }}>Desired Pods:</TableCell><TableCell>{details.pods_status?.desired || 'N/A'}</TableCell></TableRow>
        <TableRow><TableCell sx={{ fontWeight: 'bold' }}>Running Pods:</TableCell><TableCell>{details.pods_status?.running || 'N/A'}</TableCell></TableRow>
        <TableRow>
          <TableCell sx={{ fontWeight: 'bold' }}>Images:</TableCell>
          <TableCell>
            {details.resource_info?.images && details.resource_info.images.length > 0 ? (
              details.resource_info.images.join(', ')
            ) : (
              'N/A'
            )}
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );

  const podsColumns = [
    { id: 'name', label: 'Name' },
    { id: 'namespace', label: 'Namespace' },
    { id: 'status', label: 'Status' },
    { id: 'node', label: 'Node' },
    { id: 'restarts', label: 'Restarts' },
    { id: 'cpu_usage', label: 'CPU Usage', format: (value) => (value !== undefined ? `${value}m` : 'N/A') },
    { id: 'memory_usage', label: 'Memory Usage', format: formatBytes },
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
    <Box sx={{ p: 3,  minHeight: '100vh' }}>
      <Button
        variant="contained"
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate('/app/kubernetes/stateful-sets')}
        sx={{ mb: 3, bgcolor: '#5c6bc0', '&:hover': { bgcolor: '#3f51b5' } }}
      >
        Back to StatefulSets Overview
      </Button>
      <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 4, textAlign: 'center', color: '#1a237e', fontWeight: 'bold' }}>
        StatefulSet Details: <span style={{ color: '#5c6bc0' }}>{details.metadata.name}</span> (Namespace: <span style={{ color: '#5c6bc0' }}>{details.metadata.namespace}</span>)
      </Typography>

      <Grid container spacing={3}>
        {renderDetailCard("Metadata", metadataContent)}
        {renderDetailCard("Basic Information", basicInfoContent)}
      </Grid>

      <Grid container spacing={3} sx={{ mt: 3 }}>
        {renderTableCard("Pods", podsColumns, details.pods, "No pods found for this StatefulSet.")}
        {renderTableCard("Events", eventsColumns, details.events === "No resources found." ? [] : details.events, "No events found.")}
      </Grid>
    </Box>
  );
};

export default StatefulSetDetails;