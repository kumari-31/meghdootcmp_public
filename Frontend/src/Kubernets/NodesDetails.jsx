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
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../Axios';

const NodeDetails = () => {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const theme = useTheme();
  const navigate = useNavigate();

  // ✅ FIX: Use correct parameter name from route
  const { name } = useParams();

  useEffect(() => {
    const fetchNodeData = async () => {
      setLoading(true);
      try {
        // ✅ FIX: Correct API path and param variable
        const response = await apiClient.get(`/k8s/nodes/${name}/`);
        setDetails(response.data);
      } catch (err) {
        setError("Failed to load node details.");
      } finally {
        setLoading(false);
      }
    };
    fetchNodeData();
  }, [name]);

  const handleBack = () => navigate('/app/kubernetes');

   // NEW: Navigate to Pod Details
   const handlePodClick = (podName, namespace) => {
    navigate(`/app/kubernetes/pod-details/${podName}?namespace=${namespace}`);
  };

  const renderDetailCard = (title, content) => (
    <Grid item xs={12} sm={6} md={4} lg={3}>
      <Card variant="outlined" sx={{ height: '100%', borderRadius: '8px', boxShadow: 2 }}>
        <CardContent>
          <Typography variant="h6" align="center" fontWeight="bold" gutterBottom>
            {title}
          </Typography>
          <Box sx={{ fontSize: '0.85rem', maxHeight: 250, overflowY: 'auto' }}>
            {content}
          </Box>
        </CardContent>
      </Card>
    </Grid>
  );

  const renderTableCard = (title, columns, rows) => (
    <Grid item xs={12}>
      <Card variant="outlined" sx={{ mt: 3, borderRadius: '8px', boxShadow: 2 }}>
        <CardContent>
          <Typography variant="h6" align="center" fontWeight="bold" gutterBottom>
            {title}
          </Typography>

          {rows && rows.length > 0 ? (
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {columns.map(col => (
                      <TableCell key={col.id} sx={{ fontWeight: 'bold' }}>
                        {col.label}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((row, idx) => (
                    <TableRow key={idx}>
                      {columns.map(col => (
                        <TableCell key={col.id}>
                          {row[col.id] ?? "-"}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Typography align="center" sx={{ mt: 1 }} color="text.secondary">
              No data found.
            </Typography>
          )}
        </CardContent>
      </Card>
    </Grid>
  );

  if (loading)
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="80vh">
        <CircularProgress />
      </Box>
    );

  if (error || !details)
    return (
      <Box textAlign="center" p={3}>
        <Typography color="error">{error || "Node not found."}</Typography>
        <Button onClick={handleBack} sx={{ mt: 2 }} variant="contained">
          Back
        </Button>
      </Box>
    );

  const metadataContent = (
    <Table size="small">
      <TableBody>
        <TableRow><TableCell>Name</TableCell><TableCell>{details.name}</TableCell></TableRow>
        <TableRow><TableCell>Created</TableCell><TableCell>{details.created}</TableCell></TableRow>
        <TableRow><TableCell>Age</TableCell><TableCell>{details.age}</TableCell></TableRow>
        <TableRow><TableCell>UID</TableCell><TableCell>{details.uid}</TableCell></TableRow>
        <TableRow>
          <TableCell>Labels</TableCell>
          <TableCell><pre>{JSON.stringify(details.labels, null, 2)}</pre></TableCell>
        </TableRow>
        <TableRow>
          <TableCell>Annotations</TableCell>
          <TableCell><pre>{JSON.stringify(details.annotations, null, 2)}</pre></TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );

  const resourceContent = (
    <Table size="small">
      <TableBody>
      <TableRow>
        <TableCell>CPU Capacity</TableCell>
        <TableCell>{details.resource?.cpu_capacity ?? "-"}</TableCell>
      </TableRow>
      <TableRow>
        <TableCell>Memory Capacity</TableCell>
        <TableCell>{details.resource?.memory_capacity ?? "-"}</TableCell>
      </TableRow>
      <TableRow>
        <TableCell>Pods Capacity</TableCell>
        <TableCell>{details.resource?.pods_capacity ?? "-"}</TableCell>
      </TableRow>
      </TableBody>
    </Table>
  );

  const systemInfoContent = (
    <pre>{JSON.stringify(details.system_info, null, 2)}</pre>
  );

  const addressesContent = (
    <pre>{JSON.stringify(details.addresses, null, 2)}</pre>
  );

  return (
    <Box p={3}>
      <CssBaseline />

      <Button startIcon={<ArrowBackIcon />} variant="contained" onClick={handleBack} sx={{ mb: 3 }}>
        Back to Nodes
      </Button>

      <Typography variant="h4" align="center" fontWeight="bold" sx={{ mb: 4 }}>
        Node Details: {details.name}
      </Typography>

      <Grid container spacing={3}>
        {renderDetailCard("Metadata", metadataContent)}
        {renderDetailCard("Resource Capacity", resourceContent)}
        {renderDetailCard("System Information", systemInfoContent)}
        {renderDetailCard("Addresses", addressesContent)}
      </Grid>

      {renderTableCard(
        "Node Conditions",
        [
          { id: "type", label: "Type" },
          { id: "status", label: "Status" },
          { id: "reason", label: "Reason" },
          { id: "message", label: "Message" },
        ],
        details.conditions
      )}

      {/* UPDATED: POD NAME CLICKABLE */}
      {renderTableCard(
        "Pods on Node",
        [
          { id: "name", label: "Pod Name" },
          { id: "namespace", label: "Namespace" },
          { id: "status", label: "Status" },
          { id: "restarts", label: "Restarts" },
          { id: "created", label: "Created" },
        ],
        details.pods?.map(pod => ({
          ...pod,
          name: (
            <Button
              variant="text"
              sx={{ textTransform: "none", padding: 0 }}
              onClick={() => handlePodClick(pod.name, pod.namespace)}
            >
              {pod.name}
            </Button>
          )
        }))
      )}
    </Box>
  );
};

export default NodeDetails;
