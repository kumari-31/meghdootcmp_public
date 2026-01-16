import React, { useEffect, useState, useCallback } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  NodeToolbar,
} from "reactflow";
import "reactflow/dist/style.css"; 
import "../style.css";
import dagre from "dagre";
import {
  Box,
  Typography,
  CircularProgress,
  Paper,
  Tabs,
  Tab,
  Button,
  Stack,
  List,
  ListItem,
  ListItemText,
  Chip,
  Divider,
  IconButton,
  Modal,
  TextField,
  FormControl,
  FormControlLabel,
  Checkbox,
  InputLabel,
  Select,
  MenuItem,
  useTheme
} from "@mui/material";

// Icons
import RouterIcon from "@mui/icons-material/Router";
import StorageIcon from "@mui/icons-material/Storage";
import CloudIcon from "@mui/icons-material/Cloud";
import AddIcon from "@mui/icons-material/Add";
import TimelineIcon from '@mui/icons-material/Timeline'; 
import AccountTreeIcon from '@mui/icons-material/AccountTree'; 
import CloseIcon from '@mui/icons-material/Close';
import RiBallPenLine from "@mui/icons-material/Edit"; // Edit icon

import apiClient from "../../Axios"; 

// --- CONFIG ---
const nodeWidth = 172;
const nodeHeight = 80;

const modalStyle = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 500,
  boxShadow: 24,
  p: 4,
  borderRadius: 2,
};

const styles = `
@keyframes pulse-green {
  0% { box-shadow: 0 0 0 0 rgba(46, 125, 50, 0.7); }
  70% { box-shadow: 0 0 0 10px rgba(46, 125, 50, 0); }
  100% { box-shadow: 0 0 0 0 rgba(46, 125, 50, 0); }
}
@keyframes pulse-blue {
  0% { box-shadow: 0 0 0 0 rgba(25, 118, 210, 0.7); }
  70% { box-shadow: 0 0 0 10px rgba(25, 118, 210, 0); }
  100% { box-shadow: 0 0 0 0 rgba(25, 118, 210, 0); }
}
`;

// --- NODE INFO CARD ---
const NodeInfoCard = ({ data, onClose, isLocked, theme }) => (
  <Paper
    elevation={6}
    sx={{
      width: 280,
      p: 2,
      borderRadius: 2,
      bgcolor: theme.palette.background.paper,
      border: `1px solid ${theme.palette.divider}`,
      pointerEvents: 'all',
      color: theme.palette.text.primary
    }}
  >
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {data.type === 'router' ? <RouterIcon color="warning"/> : data.type === 'instance' ? <StorageIcon color="secondary"/> : <CloudIcon color="primary"/> }
        <Typography variant="subtitle1" fontWeight="bold" noWrap sx={{ maxWidth: 180, color: theme.palette.text.primary }}>{data.label}</Typography>
      </Box>
      {isLocked && <IconButton size="small" onClick={(e) => { e.stopPropagation(); onClose(); }}><CloseIcon fontSize="small" /></IconButton>}
    </Box>
    <Divider sx={{ mb: 1 }} />
    <List dense disablePadding>
      {data.details && Object.entries(data.details).slice(0, 4).map(([k, v]) => (
         (typeof v !== 'object' && v !== null) && (
          <ListItem key={k} disablePadding sx={{ py: 0.5 }}>
            <ListItemText 
              primary={k} 
              secondary={v} 
              primaryTypographyProps={{ fontSize: '0.70rem', fontWeight: 'bold', color: theme.palette.text.secondary }} 
              secondaryTypographyProps={{ fontSize: '0.75rem', noWrap: true, color: theme.palette.text.primary }} 
            />
          </ListItem>
         )
      ))}
    </List>
    <Box sx={{ mt: 1, display: 'flex', justifyContent: 'flex-end' }}>
       <Chip size="small" label={data.details?.status || 'Active'} color={data.details?.status === 'ERROR' ? 'error' : 'success'} variant="outlined" />
    </Box>
  </Paper>
);

// --- CUSTOM NODES ---
const CustomNetworkNode = ({ data, id, selected }) => {
  const [isHovered, setIsHovered] = useState(false);
  const theme = useTheme();

  return (
    <Box onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)} sx={{ position: 'relative' }}>
      <style>{styles}</style>
      <NodeToolbar isVisible={selected || isHovered} position={Position.Right} offset={20}>
        <NodeInfoCard data={data} isLocked={selected} onClose={() => {}} theme={theme} />
      </NodeToolbar>
      <Paper
        elevation={isHovered ? 6 : 3}
        sx={{
          p: 1,
          minWidth: 100,
          textAlign: "center",
          border: selected ? `3px solid ${theme.palette.primary.light}` : `3px solid ${theme.palette.primary.main}`,
          borderRadius: "50%",
          width: 100,
          height: 100,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          bgcolor: theme.palette.background.default,
          transition: 'all 0.3s ease',
          animation: 'pulse-blue 2s infinite',
          transform: isHovered ? 'scale(1.1)' : 'scale(1)',
          cursor: 'pointer'
        }}
      >
        <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
        <CloudIcon sx={{ fontSize: 40, color: theme.palette.primary.main }} />
        <Typography variant="caption" fontWeight="bold" sx={{ mt: 0.5, color: theme.palette.text.primary }}>{data.label}</Typography>
        <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
      </Paper>
    </Box>
  );
};

const CustomDeviceNode = ({ data, id, selected }) => {
  const [isHovered, setIsHovered] = useState(false);
  const theme = useTheme();
  const isRouter = data.type === 'router';

  return (
    <Box onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
      <NodeToolbar isVisible={selected || isHovered} position={Position.Right} offset={20}>
        <NodeInfoCard data={data} isLocked={selected} onClose={() => {}} theme={theme} />
      </NodeToolbar>
      <Paper
        elevation={isHovered ? 8 : 2}
        sx={{
          p: 1,
          minWidth: 140,
          textAlign: "center",
          borderRadius: 3,
          border: selected ? `2px solid ${theme.palette.primary.light}` : (isRouter ? "2px solid #ed6c02" : "2px solid #9c27b0"),
          bgcolor: theme.palette.background.paper,
          transition: 'all 0.3s ease',
          cursor: 'pointer',
          transform: isHovered ? 'translateY(-5px)' : 'translateY(0)'
        }}
      >
        <Handle type="target" position={Position.Top} />
        {isRouter ? <RouterIcon sx={{ color: "#ed6c02", fontSize: 30 }} /> : <StorageIcon sx={{ color: "#9c27b0", fontSize: 30 }} />}
        <Typography variant="body2" fontWeight="bold" noWrap sx={{ mt: 0.5, color: theme.palette.text.primary }}>{data.label}</Typography>
        <Handle type="source" position={Position.Bottom} />
      </Paper>
    </Box>
  );
};

const nodeTypes = { networkNode: CustomNetworkNode, deviceNode: CustomDeviceNode };

// --- DAGRE & GRAPH LAYOUT FUNCTIONS ---
const getTreeLayout = (nodes, edges) => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: "TB", ranksep: 150, nodesep: 100 });
  nodes.forEach((node) => dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight }));
  edges.forEach((edge) => dagreGraph.setEdge(edge.source, edge.target));
  dagre.layout(dagreGraph);
  const layoutNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return { ...node, targetPosition: 'top', sourcePosition: 'bottom', position: { x: nodeWithPosition.x - nodeWidth / 2, y: nodeWithPosition.y - nodeHeight / 2 } };
  });
  return { nodes: layoutNodes, edges: edges.map(e => ({ ...e, type: 'smoothstep', animated: true })) };
};

const getGraphLayout = (nodes, edges) => {
  const networks = nodes.filter(n => n.type === 'networkNode');
  const devices = nodes.filter(n => n.type === 'deviceNode');
  const updatedNodes = [];
  const networkSizes = networks.map(net => {
    const connectedEdges = edges.filter(e => e.source === net.id);
    const connectedDeviceIds = connectedEdges.map(e => e.target);
    const myDevices = devices.filter(d => connectedDeviceIds.includes(d.id));
    return { ...net, clusterRadius: Math.max(180, myDevices.length * 50), devices: myDevices };
  });
  const totalCircumference = networkSizes.reduce((acc, item) => acc + (item.clusterRadius * 2.5), 0);
  const globalRadius = Math.max(300, totalCircumference / (2 * Math.PI));

  networkSizes.forEach((netItem, index) => {
    const angle = (index / networkSizes.length) * 2 * Math.PI;
    const netX = Math.cos(angle) * globalRadius;
    const netY = Math.sin(angle) * globalRadius;
    updatedNodes.push({ id: netItem.id, type: netItem.type, data: netItem.data, position: { x: netX, y: netY }, sourcePosition: Position.Right, targetPosition: Position.Left });
    netItem.devices.forEach((dev, dIndex) => {
      const dAngle = (dIndex / netItem.devices.length) * 2 * Math.PI;
      if (!updatedNodes.find(n => n.id === dev.id)) {
        updatedNodes.push({ ...dev, position: { x: netX + Math.cos(dAngle) * netItem.clusterRadius, y: netY + Math.sin(dAngle) * netItem.clusterRadius }, sourcePosition: Position.Top, targetPosition: Position.Bottom });
      }
    });
  });
  const placedIds = new Set(updatedNodes.map(n => n.id));
  let orphanCount = 0;
  devices.forEach(d => { if (!placedIds.has(d.id)) { updatedNodes.push({ ...d, position: { x: (orphanCount * 160) - 300, y: 0 }, sourcePosition: Position.Top, targetPosition: Position.Bottom }); orphanCount++; } });
  return { nodes: updatedNodes, edges: edges.map(e => ({ ...e, type: 'default', animated: true })) };
};

// --- MAIN COMPONENT ---
export default function NetworkTopology() {
  const theme = useTheme();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0); 
  const [rawGraphData, setRawGraphData] = useState({ nodes: [], edges: [] });

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [projects, setProjects] = useState([]);
  const [rawNetworksList, setRawNetworksList] = useState([]); 
  const [error, setError] = useState(null);
  const [newRouter, setNewRouter] = useState({
    name: '',
    admin_state_up: true,
    external_network_name: '',
    project_id: '',
    project_name: '',
    enable_snat: false,
  });

  // --- DATA LOADING ---
  const loadTopologyData = async () => {
    try {
      setLoading(true);
      const [nRes, rRes, iRes, pRes] = await Promise.all([
        apiClient.get("/networks/"),
        apiClient.get("/routers/"),
        apiClient.get("/instances/"),
        apiClient.get('/openstack/projects/')
      ]);

      setRawNetworksList(nRes.data);
      setProjects(pRes.data);

      const generatedNodes = [];
      const generatedEdges = [];

      nRes.data.forEach((net) => {
        generatedNodes.push({ id: `net-${net.network_name}`, type: "networkNode", data: { label: net.network_name, details: net }, position: { x: 0, y: 0 } });
      });

      rRes.data.forEach((router) => {
        const routerId = `router-${router["Router ID"]}`;
        const netName = router["Network Name"];
        generatedNodes.push({ id: routerId, type: "deviceNode", data: { label: router["Router Name"], type: "router", details: router }, position: { x: 0, y: 0 } });
        if (netName) generatedEdges.push({ id: `e-${routerId}-${netName}`, source: `net-${netName}`, target: routerId, animated: true, style: { stroke: '#ed6c02', strokeWidth: 2 } });
      });

      iRes.data.forEach((inst) => {
        const instId = `inst-${inst["Instance ID"]}`;
        const connectedNets = Object.keys(inst["IP Addresses"] || {});
        generatedNodes.push({ id: instId, type: "deviceNode", data: { label: inst["VM Name"], type: "instance", details: inst, subLabel: connectedNets[0] ? inst["IP Addresses"][connectedNets[0]][0] : "" }, position: { x: 0, y: 0 } });
        connectedNets.forEach(netName => generatedEdges.push({ id: `e-${instId}-${netName}`, source: `net-${netName}`, target: instId, animated: true, style: { stroke: '#9c27b0' } }));
      });

      setRawGraphData({ nodes: generatedNodes, edges: generatedEdges });
      
      const layouted = tabValue === 0 
        ? getTreeLayout(generatedNodes, generatedEdges) 
        : getGraphLayout(generatedNodes, generatedEdges);
      
      setNodes(layouted.nodes);
      setEdges(layouted.edges);

    } catch (err) {
      console.error("Failed to load topology", err);
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTopologyData();
  }, []);

  const validateRouterForm = () => {
    let errors = {};
    if (!newRouter.name.trim()) errors.name = "Router name is required.";
    else if (newRouter.name.length < 3) errors.name = "Router name must be at least 3 characters.";
    else if (!/^[A-Za-z_\s]+$/.test(newRouter.name)) errors.name = "Router name can contain only alphabets and underscore (_).";
    
    if (!newRouter.external_network_name) errors.external_network_name = "Select an external network.";
    if (!newRouter.project_id) errors.project_id = "Select a project.";
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateRouter = async (e) => {
    e.preventDefault();
    if (creating) return; 
    if (!validateRouterForm()) return;

    const existingRouter = rawGraphData.nodes.find((node) => node.data.label === newRouter.name && node.data.type === 'router');
    if (existingRouter) {
      alert('A router with the same name already exists.');
      return;
    }

    const payload = {
      name: newRouter.name,
      admin_state_up: newRouter.admin_state_up,
      external_network_name: newRouter.external_network_name,
      project_id: newRouter.project_id,
      enable_snat: newRouter.enable_snat || false,
    };

    try {
      setCreating(true);
      const response = await apiClient.post('/create-router/', payload);
      if (response.status === 201 || response.status === 200) {
        alert('Router created successfully');
        setNewRouter({ name: '', admin_state_up: true, external_network_name: '', project_id: '', project_name: '', enable_snat: false });
        setShowCreateForm(false);
        loadTopologyData();
      } else {
        alert('Unexpected response from the server.');
      }
    } catch (error) {
      console.error('Error creating router:', error);
      alert('Error creating router. Please check the inputs.');
    } finally {
      setCreating(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    const layouted = newValue === 0 
      ? getTreeLayout([...rawGraphData.nodes], [...rawGraphData.edges]) 
      : getGraphLayout([...rawGraphData.nodes], [...rawGraphData.edges]);
    setNodes(layouted.nodes);
    setEdges(layouted.edges);
  };

  const onPaneClick = useCallback(() => {
    setNodes((nds) => nds.map((n) => ({ ...n, selected: false })));
  }, [setNodes]);

  if (loading) return (
    <Box sx={{ width: "100%", height: "90vh", display: "flex", justifyContent: "center", alignItems: "center" }}>
      <CircularProgress />
    </Box>
  );

  if (error) return (
    <Box sx={{ width: "100%", height: "90vh", display: "flex", justifyContent: "center", alignItems: "center" }}>
      <Typography color="error">❌ Server Error</Typography>
    </Box>
  );

  return (
    <Box sx={{ width: "100%", height: "90vh", bgcolor: theme.palette.background.default, display: "flex", flexDirection: "column" }}>
      
      {/* TOOLBAR */}
      <Paper elevation={0} sx={{ px: 3, py: 1, borderBottom: `1px solid ${theme.palette.divider}`, display: "flex", alignItems: "center", justifyContent: "space-between", zIndex: 10, bgcolor: theme.palette.background.paper }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h6" color="text.primary" sx={{ mr: 2, fontWeight: 'bold' }}>Network Topology</Typography>
          <Tabs value={tabValue} onChange={handleTabChange} indicatorColor="primary" textColor="primary" sx={{ minHeight: 40 }}>
            <Tab icon={<AccountTreeIcon fontSize="small"/>} iconPosition="start" label="Hierarchy" sx={{ minHeight: 40 }}/>
            <Tab icon={<TimelineIcon fontSize="small"/>} iconPosition="start" label="Graph" sx={{ minHeight: 40 }}/>
          </Tabs>
        </Box>
        <Stack direction="row" spacing={2}>
           <Button variant="outlined" size="small" startIcon={<AddIcon />} onClick={() => setShowCreateForm(true)}>
             Create Router
           </Button>
           {/* <Button variant="outlined" size="small" startIcon={<AddIcon />}>Create Network</Button> */}
        </Stack>
      </Paper>

      {/* CANVAS */}
      <Box sx={{ flexGrow: 1, position: "relative" }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onPaneClick={onPaneClick} 
          nodeTypes={nodeTypes}
          fitView
          minZoom={0.2}
          proOptions={{ hideAttribution: true }}
        >
          <Controls />
          <MiniMap style={{ height: 100, width: 150 }} zoomable pannable />
          <Background gap={24} size={1} color={theme.palette.divider} />
        </ReactFlow>
      </Box>

      {/* CREATE ROUTER MODAL */}
      <Modal open={showCreateForm} onClose={creating ? undefined : () => setShowCreateForm(false)}>
        <Box sx={{ ...modalStyle, bgcolor: theme.palette.background.paper, color: theme.palette.text.primary }}>
          <Typography variant="h6" component="h2" gutterBottom>Create New Router</Typography>
          <form onSubmit={handleCreateRouter}>
            <FormControl fullWidth margin="normal">
              <TextField
                label="Router Name"
                name="name"
                value={newRouter.name}
                onChange={(e) => setNewRouter({ ...newRouter, name: e.target.value })}
                error={!!formErrors.name}
                helperText={formErrors.name}
                required
              />
            </FormControl>

            <FormControl fullWidth margin="normal">
              <FormControlLabel control={<Checkbox checked={newRouter.admin_state_up} onChange={(e) => setNewRouter({ ...newRouter, admin_state_up: e.target.checked })} />} label="Admin State Up" />
            </FormControl>

            <FormControl fullWidth margin="normal">
              <FormControlLabel control={<Checkbox checked={newRouter.enable_snat} onChange={(e) => setNewRouter({ ...newRouter, enable_snat: e.target.checked })} />} label="Enable SNAT" />
            </FormControl>

            <FormControl fullWidth margin="normal">
              <InputLabel id="external_network_name-label">External Network</InputLabel>
              <Select
                labelId="external_network_name-label"
                id="external_network_name"
                value={newRouter.external_network_name}
                onChange={(e) => setNewRouter({ ...newRouter, external_network_name: e.target.value })}
                error={!!formErrors.external_network_name}
                label="External Network"
                required
              >
                <MenuItem value="">Select Network</MenuItem>
                {rawNetworksList.filter(n => n.external === true).map(n => <MenuItem key={n.id} value={n.id}>{n.network_name}</MenuItem>)}
              </Select>
              {formErrors.external_network_name && <Typography variant="caption" color="error">{formErrors.external_network_name}</Typography>}
            </FormControl>

            <FormControl fullWidth margin="normal">
              <InputLabel id="project_name-label">Project</InputLabel>
              <Select
                labelId="project_name-label"
                id="project_name"
                value={newRouter.project_name}
                onChange={(e) => {
                  const selectedProject = projects.find(p => p.name === e.target.value);
                  setNewRouter({ ...newRouter, project_id: selectedProject ? selectedProject.id : '', project_name: e.target.value });
                }}
                error={!!formErrors.project_id}
                label="Project"
                required
              >
                <MenuItem value="">Select Project</MenuItem>
                {projects.map(p => <MenuItem key={p.id} value={p.name}>{p.name}</MenuItem>)}
              </Select>
              {formErrors.project_id && <Typography variant="caption" color="error">{formErrors.project_id}</Typography>}
            </FormControl>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
              <Button type="submit" variant="contained" color="primary" sx={{ mr: 1 }} disabled={creating}>
                {creating ? <CircularProgress size={22} sx={{ color: "#fff" }} /> : "Create"}
              </Button> 
              <Button type="button" onClick={() => setShowCreateForm(false)} variant="outlined">Cancel</Button>
            </Box>
          </form>
        </Box>
      </Modal>
    </Box>
  );
}























// import React, { useEffect, useState, useRef } from "react";
// import apiClient from "../../Axios";
// import { Network } from "vis-network";
// import { DataSet } from "vis-data";

// const NetworkTopology = () => {
//   const [networks, setNetworks] = useState([]);
//   const [routers, setRouters] = useState([]);
//   const [instances, setInstances] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);
//   const [searchQuery, setSearchQuery] = useState("");
//   const [selectedProject, setSelectedProject] = useState("");
//   const [nodeDetails, setNodeDetails] = useState(null);
//   const [zoomLevel, setZoomLevel] = useState(1);
//   const [isPhysicsEnabled, setIsPhysicsEnabled] = useState(false);
//   const [layoutType, setLayoutType] = useState("standard");
//   const networkRef = useRef(null);
//   const visNetwork = useRef(null);

//   useEffect(() => {
//     fetchData();
//   }, []);

//   useEffect(() => {
//     if (!loading && !error) {
//       drawNetwork();
//     }
//   });

//   const fetchData = async () => {
//     try {
//       setLoading(true);
//       const [networksRes, routersRes, instancesRes] = await Promise.all([
//         apiClient.get("/networks/"),
//         apiClient.get("/routers/"),
//         apiClient.get("/instances/"),
//       ]);

//       setNetworks(networksRes.data || []);
//       setRouters(routersRes.data || []);
//       setInstances(instancesRes.data || []);
//     } catch (err) {
//       console.error("Error fetching data:", err);
//       setError("Failed to load data. Please try again later.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const drawNetwork = () => {
//     if (!networkRef.current) return;

//     const nodes = new DataSet();
//     const edges = new DataSet();
//     const networkMap = new Map();
//     const projectNames = new Set();

//     const filterByProject = (item) => {
//       const projectId = item.project_id || item["Project ID"];
//       const projectName = item.project_name || item["Project Name"];

//       if (projectName) projectNames.add({ id: projectId, name: projectName });
//       return !selectedProject || projectId === selectedProject;
//     };

//     // Add networks
//     networks.filter(filterByProject).forEach((network) => {
//       const details = `
//         <div class="detail-header">Network Details</div>
//         <div class="detail-content">
//           <div class="detail-row"><span class="detail-label">ID:</span> <span class="detail-value">${
//             network.id
//           }</span></div>
//           <div class="detail-row"><span class="detail-label">Name:</span> <span class="detail-value">${
//             network.name || "N/A"
//           }</span></div>
//           <div class="detail-row"><span class="detail-label">Status:</span> <span class="detail-value ${network.status.toLowerCase()}">${
//         network.status
//       }</span></div>
//           <div class="detail-row"><span class="detail-label">Shared:</span> <span class="detail-value">${
//             network.is_shared ? "Yes" : "No"
//           }</span></div>
//           <div class="detail-row"><span class="detail-label">Project:</span> <span class="detail-value">${
//             network.project_name || network.project_id || "N/A"
//           }</span></div>
//         </div>
//       `;

//       nodes.add({
//         id: network.id,
//         label: network.name || "Network",
//         title: `${network.name || "Network"} (${network.status})`,
//         shape: "box",
//         borderWidth: 2,
//         color: {
//           background: network.status === "ACTIVE" ? "#e3f2fd" : "#f5f5f5",
//           border: network.status === "ACTIVE" ? "#2196f3" : "#9e9e9e",
//           highlight: {
//             background: "#bbdefb",
//             border: "#1976d2",
//           },
//         },
//         font: { size: 14, color: "#212121" },
//         details: details,
//         group: "network",
//       });

//       networkMap.set(network.name, network.id);
//     });

//     // Add routers
//     routers.filter(filterByProject).forEach((router) => {
//       const details = `
//         <div class="detail-header">Router Details</div>
//         <div class="detail-content">
//           <div class="detail-row"><span class="detail-label">ID:</span> <span class="detail-value">${
//             router["Router ID"]
//           }</span></div>
//           <div class="detail-row"><span class="detail-label">Name:</span> <span class="detail-value">${
//             router["Router Name"] || "N/A"
//           }</span></div>
//           <div class="detail-row"><span class="detail-label">Status:</span> <span class="detail-value ${router[
//             "Status"
//           ].toLowerCase()}">${router["Status"]}</span></div>
//           <div class="detail-row"><span class="detail-label">Admin State:</span> <span class="detail-value">${
//             router["Admin State"] ? "Up" : "Down"
//           }</span></div>
//           <div class="detail-row"><span class="detail-label">External:</span> <span class="detail-value">${
//             router["External"] ? "Yes" : "No"
//           }</span></div>
//           <div class="detail-row"><span class="detail-label">Network:</span> <span class="detail-value">${
//             router["Network Name"] || "N/A"
//           }</span></div>
//           <div class="detail-row"><span class="detail-label">Project:</span> <span class="detail-value">${
//             router["Project Name"] || router["Project ID"] || "N/A"
//           }</span></div>
//           <div class="detail-row"><span class="detail-label">Subnets:</span> <span class="detail-value">${
//             router["Subnets Associated"]?.length
//               ? router["Subnets Associated"].join(", ")
//               : "None"
//           }</span></div>
//         </div>
//       `;

//       nodes.add({
//         id: router["Router ID"],
//         label: router["Router Name"] || "Router",
//         title: `${router["Router Name"] || "Router"} (${router["Status"]})`,
//         shape: "hexagon",
//         borderWidth: 2,
//         color: {
//           background: router["Status"] === "ACTIVE" ? "#e8f5e9" : "#f5f5f5",
//           border: router["Status"] === "ACTIVE" ? "#4caf50" : "#9e9e9e",
//           highlight: {
//             background: "#c8e6c9",
//             border: "#2e7d32",
//           },
//         },
//         font: { size: 14, color: "#212121" },
//         details: details,
//         group: "router",
//       });

//       // Connect Router to External Network
//       if (router["Network Name"] && networkMap.has(router["Network Name"])) {
//         edges.add({
//           id: `ext_${router["Router ID"]}_${networkMap.get(
//             router["Network Name"]
//           )}`,
//           from: networkMap.get(router["Network Name"]),
//           to: router["Router ID"],
//           arrows: { to: { enabled: true, type: "arrow", scaleFactor: 0.5 } },
//           label: "External Gateway",
//           font: { size: 10, color: "#616161", align: "middle" },
//           color: { color: "#ff5722", highlight: "#f4511e", inherit: false },
//           width: 2,
//           dashes: false,
//           smooth: { type: "straightCross" },
//         });
//       }
//       

//       // Connect Router to Internal Networks
//       router.interfaces?.forEach((iface, idx) => {
//         if (iface["Network Name"] && networkMap.has(iface["Network Name"])) {
//           edges.add({
//             id: `int_${router["Router ID"]}_${networkMap.get(
//               iface["Network Name"]
//             )}_${idx}`,
//             from: router["Router ID"],
//             to: networkMap.get(iface["Network Name"]),
//             arrows: { to: { enabled: true, type: "arrow", scaleFactor: 0.5 } },
//             label: `${iface["IP Address"] || "Connected"}`,
//             font: { size: 10, color: "#616161", align: "middle" },
//             color: { color: "#3f51b5", highlight: "#303f9f", inherit: false },
//             width: 1.5,
//             dashes: true,
//             smooth: { type: "curvedCW", roundness: 0.2 },
//           });
//         }
//       });
//     });

//     // Add instances
//     instances.filter(filterByProject).forEach((instance) => {
//       const ipAddressesObj = instance["IP Addresses"] || {};

//       let ipAddressesSection = "";
//       Object.entries(ipAddressesObj).forEach(([networkName, ipList]) => {
//         ipAddressesSection += `
//           <div class="detail-row">
//             <span class="detail-label">${networkName}:</span> 
//             <span class="detail-value">${ipList.join(", ")}</span>
//           </div>`;
//       });

//       const details = `
//         <div class="detail-header">Instance Details</div>
//         <div class="detail-content">
//           <div class="detail-row"><span class="detail-label">ID:</span> <span class="detail-value">${
//             instance["Instance ID"]
//           }</span></div>
//           <div class="detail-row"><span class="detail-label">Name:</span> <span class="detail-value">${
//             instance["Instance Name"] || "N/A"
//           }</span></div>
//           <div class="detail-row"><span class="detail-label">Status:</span> <span class="detail-value ${(
//             instance["Status"] || ""
//           ).toLowerCase()}">${instance["Status"] || "UNKNOWN"}</span></div>
//           <div class="detail-row"><span class="detail-label">Flavor:</span> <span class="detail-value">${
//             instance["Flavor Name"] || "N/A"
//           }</span></div>
//           <div class="detail-row"><span class="detail-label">Specs:</span> <span class="detail-value">${
//             instance["VCPUs"] || "?"
//           } vCPUs, ${instance["RAM"] || "?"} RAM, ${
//         instance["Disk"] || "?"
//       } Disk</span></div>
//           <div class="detail-row"><span class="detail-label">Image:</span> <span class="detail-value">${
//             instance["Image Name"] || "N/A"
//           }</span></div>
//           <div class="detail-row"><span class="detail-label">Security:</span> <span class="detail-value">${
//             instance["Security Groups"]?.length
//               ? instance["Security Groups"].join(", ")
//               : "None"
//           }</span></div>
//           <div class="detail-subheader">IP Addresses</div>
//           ${
//             ipAddressesSection ||
//             "<div class='detail-row'><span class='detail-value'>None</span></div>"
//           }
//         </div>
//       `;

//       let firstNetwork = Object.keys(ipAddressesObj)[0] || "";
//       let firstIp = ipAddressesObj[firstNetwork]?.[0] || "";
//       let statusColor = "#9e9e9e";

//       if (instance["Status"] === "ACTIVE") {
//         statusColor = "#4caf50";
//       } else if (instance["Status"] === "SHUTOFF") {
//         statusColor = "#f44336";
//       } else if (instance["Status"] === "BUILD") {
//         statusColor = "#ff9800";
//       }

//       nodes.add({
//         id: instance["Instance ID"],
//         label: instance["Instance Name"] || "Instance",
//         title: `${instance["Instance Name"] || "Instance"}\n${firstIp}`,
//         shape: "dot",
//         size: 15,
//         borderWidth: 2,
//         color: {
//           background: instance["Status"] === "ACTIVE" ? "#e8f5e9" : "#ffebee",
//           border: statusColor,
//           highlight: {
//             background: "#c8e6c9",
//             border: "#2e7d32",
//           },
//         },
//         font: { size: 12, color: "#212121" },
//         details: details,
//         group: "instance",
//       });

//       // Connect instance to networks
//       Object.entries(ipAddressesObj).forEach(([networkName, ipList], idx) => {
//         if (networkMap.has(networkName)) {
//           edges.add({
//             id: `inst_${instance["Instance ID"]}_${networkMap.get(
//               networkName
//             )}_${idx}`,
//             from: instance["Instance ID"],
//             to: networkMap.get(networkName),
//             arrows: { to: { enabled: true, type: "arrow", scaleFactor: 0.5 } },
//             label: ipList[0] || "",
//             font: { size: 10, color: "#616161", align: "horizontal" },
//             color: { color: "#009688", highlight: "#00796b", inherit: false },
//             width: 1,
//             dashes: false,
//             smooth: { type: "curvedCW", roundness: 0.2 },
//           });
//         }
//       });
//     });

//     // Configure network options
//     const options = {
//       nodes: {
//         shadow: {
//           enabled: true,
//           color: "rgba(0,0,0,0.2)",
//           size: 5,
//           x: 3,
//           y: 3,
//         },
//         font: {
//           face: "Roboto, Arial, sans-serif",
//         },
//       },
//       edges: {
//         shadow: {
//           enabled: true,
//           color: "rgba(0,0,0,0.1)",
//           size: 3,
//           x: 1,
//           y: 1,
//         },
//         font: {
//           face: "Roboto, Arial, sans-serif",
//           background: "rgba(255,255,255,0.7)",
//         },
//         smooth: {
//           type: "curvedCW",
//           roundness: 0.2,
//         },
//       },
//       groups: {
//         network: {
//           shape: "box",
//           font: { size: 14, color: "#212121" },
//         },
//         router: {
//           shape: "hexagon",
//           font: { size: 14, color: "#212121" },
//         },
//         instance: {
//           shape: "dot",
//           font: { size: 12, color: "#212121" },
//         },
//       },
//       physics: {
//         enabled: isPhysicsEnabled,
//         stabilization: {
//           iterations: 1000,
//           updateInterval: 100,
//         },
//         barnesHut: {
//           gravitationalConstant: -2000,
//           springConstant: 0.04,
//           springLength: 200,
//         },
//         hierarchicalRepulsion: {
//           centralGravity: 0.0,
//           springLength: 200,
//           springConstant: 0.01,
//           nodeDistance: 120,
//           damping: 0.09,
//         },
//       },
//       layout: getLayoutOptions(),
//       interaction: {
//         hover: true,
//         tooltipDelay: 300,
//         hideEdgesOnDrag: true,
//         navigationButtons: true,
//         keyboard: true,
//         zoomView: true,
//       },
//     };

//     // Create or update the network visualization
//     if (visNetwork.current) {
//       visNetwork.current.destroy();
//     }

//     visNetwork.current = new Network(
//       networkRef.current,
//       { nodes, edges },
//       options
//     );

//     // Set up event listeners
//     visNetwork.current.on("click", function (params) {
//       if (params.nodes.length > 0) {
//         const node = visNetwork.current.body.data.nodes.get(params.nodes[0]);
//         setNodeDetails(node);
//       } else {
//         setNodeDetails(null);
//       }
//     });

//     visNetwork.current.on("stabilizationProgress", function (params) {
//       // Update progress indicator if needed
//     });

//     visNetwork.current.on("stabilizationIterationsDone", function () {
//       // Hide progress indicator if needed
//     });

//     // Update zoom level
//     setZoomLevel(visNetwork.current.getScale());

//     // Automatically fit the network to view
//     visNetwork.current.fit({ animation: true });
//   };

//   // Get layout options based on selected layout type
//   const getLayoutOptions = () => {
//     switch (layoutType) {
//       case "hierarchical":
//         return {
//           hierarchical: {
//             direction: "UD",
//             sortMethod: "directed",
//             nodeSpacing: 150,
//             treeSpacing: 200,
//             blockShifting: true,
//             edgeMinimization: true,
//             levelSeparation: 150,
//             parentCentralization: true,
//           },
//         };
//       case "circular":
//         return {
//           improvedLayout: true,
//           randomSeed: 42,
//         };
//       default:
//         return {
//           improvedLayout: true,
//           randomSeed: undefined,
//         };
//     }
//   };

//   // Handle search functionality
//   const [suggestions, setSuggestions] = useState([]);
//   const [originalNodes, setOriginalNodes] = useState(null);
//   const [originalEdges, setOriginalEdges] = useState(null);

//   const handleSearch = (e) => {
//     const query = e.target.value;
//     setSearchQuery(query);

//     if (!visNetwork.current) return;

//     const allNodes = visNetwork.current.body.data.nodes.get();
//     const allEdges = visNetwork.current.body.data.edges.get();

//     // Store original full network only once
//     if (!originalNodes) {
//       setOriginalNodes([...allNodes]);
//       setOriginalEdges([...allEdges]);
//     }

//     // Find matching nodes
//     const foundNodes = query
//       ? allNodes.filter(
//           (node) =>
//             node.label.toLowerCase().includes(query.toLowerCase()) ||
//             node.title.toLowerCase().includes(query.toLowerCase())
//         )
//       : [];

//     // Update suggestions list
//     setSuggestions(
//       foundNodes.map((node) => ({
//         id: node.id,
//         label: node.label,
//         title: node.title,
//       }))
//     );

//     if (foundNodes.length > 0) {
//       const firstMatch = foundNodes[0].id;

//       // Get edges connected to the found node
//       const filteredEdges = allEdges.filter(
//         (edge) => edge.from === firstMatch || edge.to === firstMatch
//       );

//       // Get nodes directly connected to the found node
//       const connectedNodeIds = new Set(
//         filteredEdges.flatMap((edge) => [edge.from, edge.to])
//       );

//       // Filter nodes to include only the searched node and its connections
//       const filteredNodes = allNodes.filter((node) =>
//         connectedNodeIds.has(node.id)
//       );

//       // Ensure the searched node itself is included
//       if (!filteredNodes.find((node) => node.id === firstMatch)) {
//         filteredNodes.push(allNodes.find((node) => node.id === firstMatch));
//       }

//       // Update the network with only relevant nodes and edges
//       visNetwork.current.setData({
//         nodes: filteredNodes,
//         edges: filteredEdges,
//       });

//       // Focus and zoom on the searched node
//       visNetwork.current.selectNodes([firstMatch]);
//       visNetwork.current.focus(firstMatch, {
//         scale: 2.0,
//         animation: {
//           duration: 700,
//           easingFunction: "easeInOutQuad",
//         },
//       });
//     } else {
//       // Restore full network when search is cleared
//       if (originalNodes && originalEdges) {
//         visNetwork.current.setData({
//           nodes: originalNodes,
//           edges: originalEdges,
//         });
//       }
//     }
//   };

//   // Handle layout change
//   const handleLayoutChange = (e) => {
//     setLayoutType(e.target.value);
//   };

//   // Toggle physics
//   const togglePhysics = () => {
//     const newState = !isPhysicsEnabled;
//     setIsPhysicsEnabled(newState);

//     if (visNetwork.current) {
//       visNetwork.current.setOptions({ physics: { enabled: newState } });
//     }
//   };

//   // Reset view
//   const resetView = () => {
//     if (visNetwork.current) {
//       visNetwork.current.fit({ animation: true });
//     }
//   };

//   // Zoom controls
//   const zoomIn = () => {
//     if (visNetwork.current) {
//       const newScale = visNetwork.current.getScale() * 1.2;
//       visNetwork.current.moveTo({ scale: newScale });
//       setZoomLevel(newScale);
//     }
//   };

//   const zoomOut = () => {
//     if (visNetwork.current) {
//       const newScale = visNetwork.current.getScale() / 1.2;
//       visNetwork.current.moveTo({ scale: newScale });
//       setZoomLevel(newScale);
//     }
//   };

//   // Export as image
//   const exportImage = () => {
//     if (visNetwork.current) {
//       const canvas = visNetwork.current.canvas.frame.canvas;
//       const dataUrl = canvas.toDataURL("image/png");

//       const link = document.createElement("a");
//       link.download = "network-topology.png";
//       link.href = dataUrl;
//       link.click();
//     }
//   };

//   if (loading) {
//     return (
//       <div className="loading-container">
//         <div className="spinner"></div>
//         <p>Loading topology data...</p>
//       </div>
//     );
//   }

//   if (error) {
//     return (
//       <div className="error-container">
//         <div className="error-icon">⚠️</div>
//         <h3>Error Loading Data</h3>
//         <p>{error}</p>
//         <button onClick={fetchData}>Retry</button>
//       </div>
//     );
//   }

//   return (
//     <div className="network-topology-container">
//       <div className="header">
//         <h1>Network Topology</h1>
//         <div className="sub-header">
//           <p>
//             Visualizing {networks.length} networks, {routers.length} routers,
//             and {instances.length} instances
//           </p>
//         </div>
//       </div>

//       <div className="toolbar">
//         <div className="search-container">
//           <input
//             type="text"
//             placeholder="Search by name or IP..."
//             value={searchQuery}
//             onChange={handleSearch}
//             className="search-input"
//           />
//           {suggestions.length > 0 && searchQuery && (
//             <ul className="suggestions-list">
//               {suggestions.map((suggestion) => (
//                 <li
//                   key={suggestion.id}
//                   onClick={() => {
//                     setSearchQuery(suggestion.label);
//                     visNetwork.current.selectNodes([suggestion.id]);
//                     // Focus and zoom on the selected node
//                     visNetwork.current.focus(suggestion.id, {
//                       scale: 1.5, // Increase this value for more zoom
//                       animation: {
//                         duration: 500,
//                         easingFunction: "easeInOutQuad",
//                       },
//                     });
//                     setSuggestions([]);
//                   }}
//                 >
//                   <strong>{suggestion.label}</strong>
//                   {suggestion.title !== suggestion.label && (
//                     <span className="suggestion-title">
//                       {" "}
//                       - {suggestion.title}
//                     </span>
//                   )}
//                 </li>
//               ))}
//             </ul>
//           )}
//         </div>

//         <div className="filter-container">
//           <select
//             value={selectedProject}
//             onChange={(e) => setSelectedProject(e.target.value)}
//             className="filter-select"
//           >
//             <option value="">All Projects</option>
//             {[
//               ...new Set(
//                 [...networks, ...routers, ...instances]
//                   .map((n) => n.project_id || n["Project ID"])
//                   .filter(Boolean)
//               ),
//             ].map((projId) => (
//               <option key={projId} value={projId}>
//                 {projId}
//               </option>
//             ))}
//           </select>

//           <select
//             value={layoutType}
//             onChange={handleLayoutChange}
//             className="filter-select"
//           >
//             <option value="standard">Standard Layout</option>
//             <option value="hierarchical">Hierarchical Layout</option>
//             <option value="circular">Circular Layout</option>
//           </select>
//         </div>

//         <div className="action-buttons">
//           <button onClick={togglePhysics} className="action-button">
//             {isPhysicsEnabled ? "Disable Physics" : "Enable Physics"}
//           </button>
//           <button onClick={resetView} className="action-button">
//             Reset View
//           </button>
//           <button onClick={exportImage} className="action-button">
//             Export Image
//           </button>
//         </div>
//       </div>

//       <div className="network-visualization">
//         <div className="zoom-controls">
//           <button onClick={zoomIn} className="zoom-button">
//             +
//           </button>
//           <div className="zoom-level">{Math.round(zoomLevel * 100)}%</div>
//           <button onClick={zoomOut} className="zoom-button">
//             -
//           </button>
//         </div>

//         <div ref={networkRef} className="network-container"></div>
//       </div>

//       {nodeDetails && (
//         <div className="node-details-overlay">
//           <div className="node-details-modal">
//             <div className="modal-header">
//               <h3>{nodeDetails.label}</h3>
//               <button
//                 className="close-button"
//                 onClick={() => setNodeDetails(null)}
//               >
//                 &times;
//               </button>
//             </div>
//             <div
//               className="modal-content"
//               dangerouslySetInnerHTML={{ __html: nodeDetails.details }}
//             />
//             <div className="modal-footer">
//               <button onClick={() => setNodeDetails(null)}>Close</button>
//             </div>
//           </div>
//         </div>
//       )}



//       <style jsx>{`
//         .search-container {
//           position: relative;
//           display: inline-block;
//           width: 100%;
//         }

//         .search-input {
//           width: 100%;
//           padding: 10px;
//           font-size: 16px;
//           border: 1px solid #ccc;
//           border-radius: 5px;
//           outline: none;
//         }

//         .suggestions-list {
//           position: absolute;
//           top: 100%;
//           left: 0;
//           width: 100%;
//           background: white;
//           border: 1px solid #ccc;
//           border-top: none;
//           border-radius: 5px;
//           box-shadow: 0px 4px 6px rgba(0, 0, 0, 0.1);
//           max-height: 200px;
//           overflow-y: auto;
//           z-index: 10;
//           list-style: none;
//           padding: 0;
//           margin: 0;
//         }

//         .suggestions-list li {
//           padding: 10px;
//           cursor: pointer;
//           font-size: 16px;
//           transition: background 0.2s ease-in-out;
//         }

//         .suggestions-list li:hover {
//           background: #f0f0f0;
//         }

//         .suggestion-title {
//           color: #666;
//           font-size: 14px;
//         }

//         .network-topology-container {
//           font-family: "Roboto", Arial, sans-serif;
//           color: #212121;
//           max-width: 1200px;
//           margin: 0 auto;
//           padding: 20px;
//         }

//         .header {
//           text-align: center;
//           margin-bottom: 20px;
//         }

//         .header h1 {
//           margin: 0;
//           font-size: 28px;
//           color: #1976d2;
//         }

//         .sub-header {
//           color: #757575;
//           font-size: 14px;
//         }

//         .toolbar {
//           display: flex;
//           flex-wrap: wrap;
//           justify-content: space-between;
//           margin-bottom: 20px;
//           gap: 10px;
//         }

//         .search-container {
//           flex: 1;
//           min-width: 200px;
//         }

//         .search-input {
//           width: 100%;
//           padding: 10px;
//           border: 1px solid #e0e0e0;
//           border-radius: 4px;
//           font-size: 14px;
//         }

//         .filter-container {
//           display: flex;
//           gap: 10px;
//           flex: 2;
//         }

//         .filter-select {
//           padding: 10px;
//           border: 1px solid #e0e0e0;
//           border-radius: 4px;
//           font-size: 14px;
//           flex: 1;
//         }

//         .action-buttons {
//           display: flex;
//           gap: 10px;
//           flex-wrap: wrap;
//         }

//         .action-button {
//           padding: 10px;
//           background-color: #f5f5f5;
//           border: 1px solid #e0e0e0;
//           border-radius: 4px;
//           font-size: 14px;
//           cursor: pointer;
//           transition: background-color 0.2s;
//         }

//         .action-button:hover {
//           background-color: #e0e0e0;
//         }

//         .network-visualization {
//           position: relative;
//           height: 600px;
//           border: 1px solid #e0e0e0;
//           border-radius: 4px;
//           overflow: hidden;
//           box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
//         }

//         .network-container {
//           width: 100%;
//           height: 100%;
//           background-color: #fafafa;
//         }

//         .zoom-controls {
//           position: absolute;
//           top: 10px;
//           right: 10px;
//           display: flex;
//           flex-direction: column;
//           align-items: center;
//           background-color: rgba(255, 255, 255, 0.8);
//           padding: 5px;
//           border-radius: 4px;
//           box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
//           z-index: 10;
//         }

//         .zoom-button {
//           width: 30px;
//           height: 30px;
//           background-color: #fff;
//           border: 1px solid #e0e0e0;
//           border-radius: 50%;
//           font-size: 18px;
//           cursor: pointer;
//           display: flex;
//           align-items: center;
//           justify-content: center;
//           margin: 2px 0;
//         }

//         .zoom-level {
//           font-size: 12px;
//           margin: 5px 0;
//         }

//         .node-details-overlay {
//           position: fixed;
//           top: 0;
//           left: 0;
//           width: 100%;
//           height: 100%;
//           background-color: rgba(0, 0, 0, 0.5);
//           display: flex;
//           align-items: center;
//           justify-content: center;
//           z-index: 1000;
//         }

//         .node-details-modal {
//           background-color: #fff;
//           border-radius: 8px;
//           box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
//           width: 80%;
//           max-width: 600px;
//           max-height: 80vh;
//           overflow: hidden;
//           display: flex;
//           flex-direction: column;
//         }

//         .modal-header {
//           display: flex;
//           justify-content: space-between;
//           align-items: center;
//           padding: 15px 20px;
//           background-color: #f5f5f5;
//           border-bottom: 1px solid #e0e0e0;
//         }

//         .modal-header h3 {
//           margin: 0;
//           font-size: 18px;
//           color: #212121;
//         }

//         .close-button {
//           background: none;
//           border: none;
//           font-size: 24px;
//           cursor: pointer;
//           color: #757575;
//         }

//         .modal-content {
//           padding: 20px;
//           overflow-y: auto;
//       }
//      `}</style>
//     </div>
//   );
// };

// export default NetworkTopology;

