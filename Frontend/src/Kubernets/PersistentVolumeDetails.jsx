import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  Chip, // For labels and attributes
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import apiClient from '../Axios'; // Assuming your Axios instance is configured here

// Helper functions for rendering cards and tables (consistent with ServiceDetails)
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

const renderTableCard = (title, columns, rows, emptyMessage = "No data found.") => (
  <Grid item xs={12}>
    <Card variant="outlined" sx={{ mt: 2, borderRadius: '8px', boxShadow: 2 }}>
      <CardContent>
        <Typography variant="h6" component="div" gutterBottom sx={{ textAlign: 'center', mb: 2, color: '#3f51b5', fontWeight: 'bold' }}>
          {title}
        </Typography>
        {rows && rows.length > 0 ? (
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

const PersistentVolumeDetails = () => {
  const { pvName } = useParams(); // Get the PV name from the URL parameter
  const navigate = useNavigate();

  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true);
      setError(null);

      if (!pvName) {
        setError("Invalid URL: No Persistent Volume name provided.");
        setLoading(false);
        return;
      }

      try {
        const response = await apiClient.get(`/kube-volume-details/?name=${pvName}`);
        setDetails(response.data);
      } catch (err) {
        console.error("Error fetching Persistent Volume details:", err);
        setError("Failed to load Persistent Volume details. It might not exist or there was an API error.");
        setDetails(null);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [pvName]); // Re-run effect if pvName changes

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
        <Button variant="contained" startIcon={<ArrowBackIcon />} onClick={() => navigate('/app/kubernetes/persistent-volumes')} sx={{ mt: 2 }}>
          Back to Persistent Volumes Overview
        </Button>
      </Box>
    );
  }

  if (!details) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary">No details found for Persistent Volume: **{pvName}**.</Typography>
        <Button variant="contained" startIcon={<ArrowBackIcon />} onClick={() => navigate('/app/kubernetes/persistent-volumes')} sx={{ mt: 2 }}>
          Back to Persistent Volumes Overview
        </Button>
      </Box>
    );
  }

  // Data for rendering cards/tables
  const metadataContent = (
    <Table size="small" sx={{ '& td, & th': { border: 0 } }}>
      <TableBody>
        <TableRow><TableCell sx={{ fontWeight: 'bold' }}>Name:</TableCell><TableCell>{details.name}</TableCell></TableRow>
        <TableRow><TableCell sx={{ fontWeight: 'bold' }}>UID:</TableCell><TableCell>{details.uid}</TableCell></TableRow>
        <TableRow><TableCell sx={{ fontWeight: 'bold' }}>Created:</TableCell><TableCell>{details.created}</TableCell></TableRow>
        <TableRow><TableCell sx={{ fontWeight: 'bold' }}>Age:</TableCell><TableCell>{details.age}</TableCell></TableRow>
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

  const basicInfoContent = (
    <Table size="small" sx={{ '& td, & th': { border: 0 } }}>
      <TableBody>
        <TableRow><TableCell sx={{ fontWeight: 'bold' }}>Status:</TableCell><TableCell>{details.status || 'N/A'}</TableCell></TableRow>
        <TableRow><TableCell sx={{ fontWeight: 'bold' }}>Capacity:</TableCell><TableCell>{details.capacity || 'N/A'}</TableCell></TableRow>
        <TableRow>
            <TableCell sx={{ fontWeight: 'bold' }}>Access Modes:</TableCell>
            <TableCell>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {details.access_modes && details.access_modes.length > 0 ? (
                        details.access_modes.map((mode, i) => (
                            <Chip key={i} label={mode} variant="outlined" size="small" />
                        ))
                    ) : (
                        'N/A'
                    )}
                </Box>
            </TableCell>
        </TableRow>
        <TableRow><TableCell sx={{ fontWeight: 'bold' }}>Reclaim Policy:</TableCell><TableCell>{details.reclaim_policy || 'N/A'}</TableCell></TableRow>
        <TableRow><TableCell sx={{ fontWeight: 'bold' }}>Claim:</TableCell><TableCell>{details.claim || 'N/A'}</TableCell></TableRow>
        <TableRow><TableCell sx={{ fontWeight: 'bold' }}>Storage Class:</TableCell><TableCell>{details.storage_class || 'N/A'}</TableCell></TableRow>
      </TableBody>
    </Table>
  );

  const sourceInfoContent = (
    <Table size="small" sx={{ '& td, & th': { border: 0 } }}>
      <TableBody>
        <TableRow><TableCell sx={{ fontWeight: 'bold' }}>Type:</TableCell><TableCell>{details.source?.type || 'N/A'}</TableCell></TableRow>
        <TableRow><TableCell sx={{ fontWeight: 'bold' }}>Driver:</TableCell><TableCell>{details.source?.driver || 'N/A'}</TableCell></TableRow>
        <TableRow><TableCell sx={{ fontWeight: 'bold' }}>Volume Handle:</TableCell><TableCell>{details.source?.volume_handle || 'N/A'}</TableCell></TableRow>
        <TableRow>
          <TableCell sx={{ fontWeight: 'bold' }}>Attributes:</TableCell>
          <TableCell>
            <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0, fontSize: '0.8rem' }}>
              {details.source?.attributes ? JSON.stringify(details.source.attributes, null, 2) : 'N/A'}
            </pre>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );

  return (
    <Box sx={{ p: 3, minHeight: '100vh' }}>
      <Button
        variant="contained"
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate('/app/kubernetes/persistent-volumes')}
        sx={{ mb: 3, bgcolor: '#5c6bc0', '&:hover': { bgcolor: '#3f51b5' } }}
      >
        Back to Persistent Volumes Overview
      </Button>
      <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 4, textAlign: 'center', color: '#1a237e', fontWeight: 'bold' }}>
        Persistent Volume Details: <span style={{ color: '#5c6bc0' }}>{details.name}</span>
      </Typography>

      <Grid container spacing={3}>
        {renderDetailCard("Metadata", metadataContent)}
        {renderDetailCard("Basic Information", basicInfoContent)}
        {renderDetailCard("Source Information", sourceInfoContent)}
      </Grid>

      {/* If there were any other tables (like events for PVs), you'd add them here */}
      {/* For now, the provided data doesn't include an 'events' array, so we omit that section */}

    </Box>
  );
};

export default PersistentVolumeDetails;