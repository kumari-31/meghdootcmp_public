import React, { useEffect, useState } from 'react';
import {
  Box, Typography, CircularProgress, Grid, Card, CardContent,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Button, CssBaseline,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import apiClient from '../Axios'; // Ensure Axios is configured

/**
 * DeploymentDetails Component
 * Displays detailed info for a single Kubernetes Deployment,
 * using URL params for name and namespace.
 */
const DeploymentDetails = () => {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { deploymentName } = useParams();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const deploymentNamespace = queryParams.get('namespace');

  const navigate = useNavigate();

  // Fetch deployment data based on URL
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      if (!deploymentName || !deploymentNamespace) {
        setError('Deployment name or namespace not provided in URL.');
        setLoading(false);
        return;
      }

      try {
        const resp = await apiClient.get(
          `/k8s/deployment-details/?name=${deploymentName}&namespace=${deploymentNamespace}`
        );
        setDetails(resp.data);
      } catch (err) {
        console.error(err);
        setError('Failed to load deployment details. Please try again.');
        setDetails(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [deploymentName, deploymentNamespace]);

  const handleBack = () => {
    navigate('/app/kubernetes');
  };

  const handleReplicaSetClick = (name, namespace) => {
    navigate(`/app/kubernetes/replicaset-details/${name}?namespace=${namespace}`);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !details) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="error">{error || 'No details found for this deployment.'}</Typography>
        <Button variant="contained" startIcon={<ArrowBackIcon />} onClick={handleBack} sx={{ mt: 2 }}>
          Back to Overview
        </Button>
      </Box>
    );
  }

  // Reusable layout helpers
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

  const renderTableCard = (title, columns, rows, emptyMessage = 'No data found.') => (
    <Grid item xs={12}>
      <Card variant="outlined" sx={{ mt: 2, borderRadius: '8px', boxShadow: 2 }}>
        <CardContent>
          <Typography variant="h6" component="div" gutterBottom sx={{ textAlign: 'center', mb: 2, color: '#3f51b5', fontWeight: 'bold' }}>
            {title}
          </Typography>
          {rows?.length > 0 ? (
            <TableContainer component={Paper} sx={{ maxHeight: 300, overflowY: 'auto', borderRadius: '8px' }}>
              <Table size="small" aria-label={`${title} table`}>
                <TableHead>
                  <TableRow> {/* Removed backgroundColor from TableRow */}
                    {columns.map((col) => (
                      <TableCell key={col.id} align={col.align || 'left'} sx={{ fontWeight: 'bold' }}>
                        {col.label}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((row, i) => (
                    <TableRow key={i}> {/* Removed alternating background color */}
                      {columns.map((col) => (
                        <TableCell key={`${i}-${col.id}`} align={col.align || 'left'}>
                          {col.id === 'name' && title === 'New Replica Set' ? (
                            <Button
                              variant="text"
                              onClick={() => handleReplicaSetClick(row.name, row.namespace)}
                              sx={{ textTransform: 'none', minWidth: 0, padding: 0 }}
                            >
                              {col.format ? col.format(row[col.id]) : row[col.id]}
                            </Button>
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

  // Card contents
  const metadata = (
    <Table size="small" sx={{ '& td, & th': { border: 0 } }}>
      <TableBody>
        {['Name','Namespace','Created','Age','UID'].map((key) => (
          <TableRow key={key}>
            <TableCell sx={{ fontWeight: 'bold' }}>{key}:</TableCell>
            <TableCell>{details[key.toLowerCase()] ?? 'N/A'}</TableCell>
          </TableRow>
        ))}
        {['labels','annotations'].map((key) => (
          <TableRow key={key}>
            <TableCell sx={{ fontWeight: 'bold' }}>{key.charAt(0).toUpperCase() + key.slice(1)}:</TableCell>
            <TableCell>
              <pre style={{ whiteSpace:'pre-wrap',wordBreak:'break-word',margin:0,fontSize:'0.8rem' }}>
                {details[key] ? JSON.stringify(details[key],null,2) : 'N/A'}
              </pre>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  const resourceInfo = (
    <Table size="small" sx={{ '& td, & th': { border: 0 } }}>
      <TableBody>
        {['strategy','min_ready_seconds','revision_history_limit','selector'].map((key) => (
          <TableRow key={key}>
            <TableCell sx={{ fontWeight: 'bold' }}>{key.replace(/_/g,' ').toUpperCase()}:</TableCell>
            <TableCell>{details.resource_info?.[key] ?? 'N/A'}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  const rollingStrategy = (
    <Table size="small" sx={{ '& td, & th': { border: 0 } }}>
      <TableBody>
        {['max_surge','max_unavailable'].map((key) => (
          <TableRow key={key}>
            <TableCell sx={{ fontWeight: 'bold' }}>{key.replace(/_/g,' ').toUpperCase()}:</TableCell>
            <TableCell>{details.rolling_update_strategy?.[key] ?? 'N/A'}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  const podStatus = (
    <Table size="small" sx={{ '& td, & th': { border: 0 } }}>
      <TableBody>
        {['updated','total','available'].map((key) => (
          <TableRow key={key}>
            <TableCell sx={{ fontWeight: 'bold' }}>{key.charAt(0).toUpperCase() + key.slice(1)}:</TableCell>
            <TableCell>{details.pod_status?.[key] ?? 0}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  // Columns for tables
  const conditionsCols = [
    { id: 'type', label: 'Type' },
    { id: 'status', label: 'Status' },
    { id: 'last_transition_time', label: 'Last Transition' },
    { id: 'reason', label: 'Reason' },
    { id: 'message', label: 'Message' },
  ];

  const newRSCols = [
    { id: 'name', label: 'Name' },
    { id: 'namespace', label: 'Namespace' },
    { id: 'age', label: 'Age' },
    { id: 'pods', label: 'Pods' },
    { id: 'labels', label: 'Labels', format: (v) => v ? JSON.stringify(v, null,2) : 'N/A' },
    { id: 'images', label: 'Images', format: (v) => v?.join(', ') ?? 'N/A' },
  ];

  const eventsCols = conditionsCols;

  // Prepare rows from details
  const newRSRows = details.new_replica_set && typeof details.new_replica_set === 'object'
    ? [details.new_replica_set]
    : [];

  return (
    <Box sx={{ p: 3, /* Removed bgcolor: '#f0f2f5' */ minHeight: '100vh' }}>
      <CssBaseline />
      <Button variant="contained" startIcon={<ArrowBackIcon />} onClick={handleBack} sx={{ mb: 3, bgcolor: '#5c6bc0', '&:hover': { bgcolor: '#3f51b5' } }}>
        Back to Overview
      </Button>

      <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 4, textAlign: 'center', color: '#1a237e', fontWeight: 'bold' }}>
        Deployment Details: <span style={{ color: '#5c6bc0' }}>{details.name}</span> (Namespace: <span style={{ color: '#5c6bc0' }}>{details.namespace}</span>)
      </Typography>

      <Grid container spacing={3}>
        {renderDetailCard('Metadata', metadata)}
        {renderDetailCard('Resource Information', resourceInfo)}
        {renderDetailCard('Rolling Update Strategy', rollingStrategy)}
        {renderDetailCard('Pod Status', podStatus)}
      </Grid>

      <Grid container spacing={3} sx={{ mt: 3 }}>
        {renderTableCard('Conditions', conditionsCols, details.conditions, 'No conditions found.')}
        {renderTableCard('New Replica Set', newRSCols, newRSRows, 'No new replica set found.')}
        {renderTableCard('Events', eventsCols, details.events, 'No events found.')}
      </Grid>
    </Box>
  );
};

export default DeploymentDetails;