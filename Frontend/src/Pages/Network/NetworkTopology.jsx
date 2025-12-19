import { LegendToggle } from '@mui/icons-material';
import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Tooltip,
    Chip,
    CircularProgress,
    Alert
} from '@mui/material';
import { styled } from '@mui/system';
import RouterIcon from '@mui/icons-material/Router';
import StorageIcon from '@mui/icons-material/Storage';
import apiClient from "../../Axios";

/* ===================== Styled ===================== */

const NetworkLine = styled(Box)(({ color }) => ({
    width: '30px',
    minHeight: 'calc(100vh - 220px)',
    backgroundColor: color,
    borderRadius: '6px',
    position: 'absolute',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
}));

const NetworkNameTypography = styled(Typography)(() => ({
    color: '#fff',
    fontWeight: 'bold',
    fontSize: '0.7rem',
    transform: 'rotate(-90deg)',
    whiteSpace: 'nowrap',
}));

const NodeContainer = styled(Box)(({ theme }) => ({
    width: '120px',
    padding: theme.spacing(0.5),
    borderRadius: theme.shape.borderRadius,
    backgroundColor: theme.palette.background.paper,
    boxShadow: theme.shadows[2],
    textAlign: 'center',
    position: 'absolute',
    transform: 'translateY(-50%)',
    fontSize: '0.7rem',
    cursor: 'pointer',
}));

const ConnectionLine = styled(Box)(({ theme, top, left }) => ({
    position: 'absolute',
    top,
    left,
    width: '60px',
    height: '1px',
    backgroundColor: theme.palette.grey[400],
    transform: 'translateY(-50%)',
}));

/* ===================== Helpers ===================== */

const getRandomColor = () =>
    '#' + Math.floor(Math.random() * 16777215).toString(16);

const renderTooltipContent = (data) => (
    <Box sx={{ p: 1 }}>
        {Object.entries(data).map(([k, v]) => (
            <Typography key={k} variant="caption" display="block">
                <strong>{k}:</strong> {String(v)}
            </Typography>
        ))}
    </Box>
);

/* ===================== Component ===================== */

function NetworkTopology() {
    const [networks, setNetworks] = useState([]);
    const [routers, setRouters] = useState([]);
    const [instances, setInstances] = useState([]);
    const [colors, setColors] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const loadData = async () => {
            try {
                const [n, r, i] = await Promise.all([
                    apiClient.get("/networks/"),
                    apiClient.get("/routers/"),
                    apiClient.get("/instances/")
                ]);

                setNetworks(n.data);
                setRouters(r.data);
                setInstances(i.data);

                const map = {};
                n.data.forEach(net => map[net.name] = getRandomColor());
                setColors(map);

            } catch (e) {
                setError("Failed to load network topology");
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, []);

    const yPos = (i) => 50 + i * 70;

    /* ===================== States ===================== */

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}>
                <CircularProgress />
                <Typography sx={{ ml: 2 }}>Loading topology…</Typography>
            </Box>
        );
    }

    if (error) {
        return <Alert severity="error">{error}</Alert>;
    }

    /* ===================== Render ===================== */

    return (
        <Box sx={{ p: 2, background: '#f4f6f8', minHeight: '100vh' }}>

            {/* Summary */}
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <Chip label={`Networks: ${networks.length}`} />
                <Chip label={`Routers: ${routers.length}`} />
                <Chip label={`Instances: ${instances.length}`} />
            </Box>

            <Box sx={{ position: 'relative', overflowX: 'auto', height: '80vh' }}>

                {networks.map((net, index) => {
                    const netRouters = routers.filter(
                        r => r["Network Name"] === net.name
                    );
                    const netInstances = instances.filter(
                        i => Object.keys(i["IP Addresses"] || {}).includes(net.name)
                    );

                    const left = index * 220;
                    let nodeIndex = 0;

                    return (
                        <React.Fragment key={net.id}>
                            {/* Network Line */}
                            <NetworkLine
                                color={colors[net.name]}
                                sx={{ left }}
                            >
                                <NetworkNameTypography>
                                    {net.name}
                                </NetworkNameTypography>
                            </NetworkLine>

                            {/* Routers */}
                            {netRouters.map(router => {
                                const top = yPos(nodeIndex++);
                                return (
                                    <React.Fragment key={router["Router ID"]}>
                                        <ConnectionLine top={top} left={left + 30} />
                                        <Tooltip title={renderTooltipContent(router)} arrow>
                                            <NodeContainer sx={{ top, left: left + 100 }}>
                                                <RouterIcon color="primary" />
                                                <Typography fontWeight="bold">Router</Typography>
                                                <Typography>{router["Router Name"]}</Typography>
                                            </NodeContainer>
                                        </Tooltip>
                                    </React.Fragment>
                                );
                            })}

                            {/* Instances */}
                            {netInstances.map(instance => {
                                const top = yPos(nodeIndex++);
                                return (
                                    <React.Fragment key={instance["Instance ID"]}>
                                        <ConnectionLine top={top} left={left + 30} />
                                        <Tooltip title={renderTooltipContent(instance)} arrow>
                                            <NodeContainer sx={{ top, left: left + 100 }}>
                                                <StorageIcon color="secondary" />
                                                <Typography fontWeight="bold">Instance</Typography>
                                                <Typography>{instance["Instance Name"]}</Typography>
                                            </NodeContainer>
                                        </Tooltip>
                                    </React.Fragment>
                                );
                            })}
                        </React.Fragment>
                    );
                })}
            </Box>

            {/* Legend */}
            <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
                <LegendToggle />
                <Chip label="Router" icon={<RouterIcon />} size="small" />
                <Chip label="Instance" icon={<StorageIcon />} size="small" />
            </Box>
        </Box>
    );
}

export default NetworkTopology;



















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

