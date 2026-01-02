import { useEffect, useState } from "react";
import apiClient from "../../Axios";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { GoAlert } from "react-icons/go";
import "../style.css";

/* -------------------- CACHE -------------------- */
const hostCache = {};

/* -------------------- HELPERS -------------------- */
const normalizeHistory = (raw) => {
  if (!raw || typeof raw !== "object") return [];

  const series = Object.values(raw)[0];
  if (!Array.isArray(series)) return [];

  return series.map((d) => ({
    time: new Date(d.clock * 1000).toLocaleTimeString(),
    value: Number(d.value),
  }));
};

/* -------------------- MAIN COMPONENT -------------------- */
const HealthMonitoring = () => {
  const [groups, setGroups] = useState([]);
  const [hosts, setHosts] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState("");
  const [selectedHost, setSelectedHost] = useState("");

  const [cpu, setCPU] = useState([]);
  const [memory, setMemory] = useState([]);
  const [disk, setDisk] = useState([]);
  const [loadAverage, setLoadAverage] = useState({});
  const [summary, setSummary] = useState(null);
  const [alerts, setAlerts] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /* -------------------- LOAD GROUPS -------------------- */
  useEffect(() => {
    apiClient.get("/host-groups/")
      .then(res => setGroups(res.data || []))
      .catch(() => setError("Failed to load host groups"));
  }, []);

  /* -------------------- LOAD HOSTS BY GROUP -------------------- */
  useEffect(() => {
    if (!selectedGroup) return;

    setHosts([]);
    setSelectedHost("");

    apiClient.get(`/hosts/?groupid=${selectedGroup}`)
      .then(res => setHosts(res.data || []))
      .catch(() => setError("Failed to load hosts"));
  }, [selectedGroup]);

  /* -------------------- LOAD METRICS -------------------- */
  useEffect(() => {
    if (!selectedHost) return;

    setLoading(true);
    setError(null);

    if (hostCache[selectedHost]) {
      const c = hostCache[selectedHost];
      setCPU(c.cpu);
      setMemory(c.memory);
      setDisk(c.disk);
      setLoadAverage(c.loadAverage);
      setSummary(c.summary);
      setAlerts(c.alerts);
      setLoading(false);
      return;
    }

    Promise.all([
      apiClient.get(`/host-metrics/${selectedHost}/`),
      apiClient.get(`/host-health/${selectedHost}/`),
      apiClient.get(`/alerts/${selectedHost}/`),
    ])
      .then(([metrics, health, alerts]) => {
        const payload = {
          cpu: normalizeHistory(metrics.data.cpu),
          memory: normalizeHistory(metrics.data.memory),
          disk: normalizeHistory(metrics.data.disk),
          loadAverage: metrics.data.load_average || {},
          summary: health.data,
          alerts: alerts.data || [],
        };

        hostCache[selectedHost] = payload;

        setCPU(payload.cpu);
        setMemory(payload.memory);
        setDisk(payload.disk);
        setLoadAverage(payload.loadAverage);
        setSummary(payload.summary);
        setAlerts(payload.alerts);
      })
      .catch(() => setError("Failed to load host data"))
      .finally(() => setLoading(false));
  }, [selectedHost]);

  /* -------------------- PDF -------------------- */
  const downloadPDF = () => {
    window.open(
      `${apiClient.defaults.baseURL}host-health-pdf/${selectedHost}/`,
      "_blank"
    );
  };

  /* -------------------- LOADING -------------------- */
  if (loading) {
    return <div className="cloud-container">Loading...</div>;
  }

  /* -------------------- ERROR -------------------- */
  if (error) {
    return (
      <div className="error-message">
        <GoAlert size={40} />
        <h2>Error</h2>
        <p>{error}</p>
      </div>
    );
  }

  /* -------------------- UI -------------------- */
  return (
    <div style={{ padding: 24 }}>
      <h2>Health Monitoring</h2>

      {/* GROUP & HOST SELECT */}
      <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
        <select
          value={selectedGroup}
          onChange={(e) => setSelectedGroup(e.target.value)}
          style={{ padding: 8, width: 300 }}
        >
          <option value="">Select Group</option>
          {groups.map(g => (
            <option key={g.groupid} value={g.groupid}>
              {g.name}
            </option>
          ))}
        </select>

        <select
          value={selectedHost}
          onChange={(e) => setSelectedHost(e.target.value)}
          disabled={!hosts.length}
          style={{ padding: 8, width: 300 }}
        >
          <option value="">Select Host</option>
          {hosts.map(h => (
            <option key={h.hostid} value={h.hostid}>
              {h.host} ({h.ip})
            </option>
          ))}
        </select>

        {selectedHost && (
          <button
            onClick={downloadPDF}
            style={{
              padding: "10px 16px",
              borderRadius: 10,
              background: "#1976d2",
              color: "#fff",
              border: "none",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            📄 Download Report
          </button>
        )}
      </div>

      {summary && (
        <>
          <AlertStrip alerts={alerts} />
          <HealthCards summary={summary} />

          <div style={{ display: "flex", flexWrap: "wrap", gap: 20 }}>
            <Metric title="CPU Utilization (%)" data={cpu} />
            <Metric title="Memory Utilization (%)" data={memory} />
            <Metric title="Disk Utilization (%)" data={disk} />

            {Object.entries(loadAverage).map(([k, v]) => (
              <Metric
                key={k}
                title={`Load Average (${k.replace("avg", "")} min)`}
                data={normalizeHistory(v)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

/* -------------------- ALERT STRIP -------------------- */
const AlertStrip = ({ alerts }) => {
  const colors = ["#999", "#2196f3", "#ff9800", "#ff5722", "#d32f2f"];

  return (
    <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
      {alerts.map(a => (
        <div
          key={a.eventid}
          style={{
            flex: 1,
            padding: 12,
            background: colors[a.severity] || "#999",
            color: "#fff",
            borderRadius: 10,
          }}
        >
          <strong>{a.name}</strong>
          <div>{new Date(a.clock * 1000).toLocaleString()}</div>
        </div>
      ))}
    </div>
  );
};

/* -------------------- HEALTH CARDS -------------------- */
const HealthCards = ({ summary }) => {
  const statusColor = {
    Healthy: "#4caf50",
    Warning: "#ff9800",
    Critical: "#f44336",
  };

  const Card = ({ label, value }) => (
    <div
      style={{
        flex: 1,
        padding: 16,
        borderRadius: 12,
        background: "var(--card-bg)",
        boxShadow: "0 4px 12px rgba(0,0,0,.08)",
      }}
    >
      <div style={{ opacity: 0.7 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: "bold" }}>{value}</div>
    </div>
  );

  return (
    <div style={{ display: "flex", gap: 16, marginBottom: 30 }}>
      <Card
        label="Health Score"
        value={
          <span style={{ color: statusColor[summary.status] }}>
            {summary.health_score} ({summary.status})
          </span>
        }
      />
      <Card label="CPU %" value={summary.cpu} />
      <Card label="Memory %" value={summary.memory} />
      <Card label="Disk %" value={summary.disk} />
      <Card label="Load / Core" value={summary.load_per_core} />
    </div>
  );
};

/* -------------------- METRIC CHART -------------------- */
const Metric = ({ title, data }) => (
  <div
    style={{
      width: "48%",
      padding: 16,
      background: "var(--card-bg)",
      borderRadius: 12,
      boxShadow: "0 4px 12px rgba(0,0,0,.08)",
    }}
  >
    <h4>{title}</h4>
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data}>
        <XAxis dataKey="time" />
        <YAxis />
        <Tooltip />
        <Line type="monotone" dataKey="value" dot={false} />
      </LineChart>
    </ResponsiveContainer>
  </div>
);

export default HealthMonitoring;



// import { useState, useEffect } from "react";
// import {
//   Grid2,
//   Card,
//   CardMedia,
//   Modal,
//   Box,
//   FormControl,
//   MenuItem,
//   Select,
//   IconButton,
//   Typography,
// } from "@mui/material";
// import DownloadIcon from "@mui/icons-material/Download";
// import Tooltip from "@mui/material/Tooltip";
// import jsPDF from "jspdf";
// // import html2canvas from "html2canvas";
// import apiClient from "../../Axios";
// import "./HealthService.css";

// const HealthMonitoring = () => {
//   const [graphs, setGraphs] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);
//   const [selectedGraph, setSelectedGraph] = useState(null);
//   const [dropdown1, setDropdown1] = useState("");
//   const [dropdown2, setDropdown2] = useState("");

//   useEffect(() => {
//     const fetchGraph = async () => {
//       try {
//         const graphId = localStorage.getItem("graphId") || "10457"; // Default ID if none found
//         const response = await apiClient.get(`/usage/${graphId}/`);

//         if (response.status !== 200) {
//           throw new Error(`API Error: ${response.status}`);
//         }

//         if (response.data.graphs && response.data.graphs.length > 0) {
//           setGraphs(response.data.graphs);
//         } else {
//           throw new Error("No graph data found");
//         }
//       } catch (error) {
//         console.error("Error fetching graph:", error);
//         setError(error.message);
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchGraph();
//   }, []);

//   // Download a single selected graph
//   const handleDownloadSingleGraph = () => {
//     if (!selectedGraph) {
//       alert("No graph selected for download");
//       return;
//     }

//     const pdf = new jsPDF("landscape", "mm", "a4");
//     pdf.text(selectedGraph.name, 10, 10);
//     pdf.addImage(selectedGraph.base64_image, "PNG", 10, 20, 180, 120);
//     pdf.save(`${selectedGraph.name}.pdf`);
//   };

//   // Download all graphs
//   const handleDownloadAllGraphs = () => {
//     if (graphs.length === 0) {
//       alert("No graphs available to download.");
//       return;
//     }

//     const pdf = new jsPDF("landscape", "mm", "a4");
//     let yOffset = 10;

//     graphs.forEach((graph, index) => {
//       pdf.text(graph.name, 10, yOffset);
//       pdf.addImage(graph.base64_image, "PNG", 10, yOffset + 10, 180, 120);
//       yOffset += 130;

//       if (index < graphs.length - 1) {
//         pdf.addPage();
//         yOffset = 10;
//       }
//     });

//     pdf.save("Graphs_Report.pdf");
//   };
//  // ⭐⭐⭐⭐⭐ ADD LOADING UI HERE ⭐⭐⭐⭐⭐
//  if (loading) {
//   return (
//     <div className="cloud-container">
//       <svg xmlns="http://www.w3.org/2000/svg" viewBox="7.87722 9.61948 33.01 16.88">
//         <path
//           d="M 12 26 H 37 C 42 26 41 20  37 20 C 38 18 37 15 33 16 C 32 8 15 8 14 17 C 8 16 6 25 12 26"
//           className="cloud-back"
//         />
//         <path
//           d="M 12 26 H 37 C 42 26 41 20 37 20 C 38 18 37 15 33 16 C 32 8 15 8 14 17 C 8 16 6 25 12 26"
//           className="cloud-front"
//         />
//       </svg>
//       <div className="loading-message">Loading...</div>
//     </div>
//   );
// }

// // ⭐⭐⭐⭐⭐ ADD ERROR UI HERE ⭐⭐⭐⭐⭐
// if (error) {
//   return (
//     <div className="error-message">
//       <GoAlert />
//       <h2>❌ Server Down</h2>
//     </div>
//   );
// }

//   return (
//     <div className="graph-container">
//       <h2>System Graphs</h2>
//       <Box
//         display="flex"
//         justifyContent="space-between"
//         alignItems="center"
//         mb={10}
//       >
//         {/* Left Side: Dropdowns */}
//         <Box display="flex" gap={2}>
//           <FormControl size="small">
//             <Select
//               value={dropdown1}
//               onChange={(e) => setDropdown1(e.target.value)}
//               displayEmpty
//             >
//               <MenuItem value="" disabled>
//                 Select Option 1
//               </MenuItem>
//               <MenuItem value="option1">Hypervisor 1</MenuItem>
//               <MenuItem value="option2">Hypervisor 2</MenuItem>
//             </Select>
//           </FormControl>

//           <FormControl size="small">
//             <Select
//               value={dropdown2}
//               onChange={(e) => setDropdown2(e.target.value)}
//               displayEmpty
//             >
//               <MenuItem value="" disabled>
//                 Select Option 2
//               </MenuItem>
//               <MenuItem value="optionA">Project A</MenuItem>
//               <MenuItem value="optionB">Project B</MenuItem>
//             </Select>
//           </FormControl>
//         </Box>

//         {/* Right Side: Download Icon */}
//         <Tooltip title="Download All">
//           <IconButton onClick={handleDownloadAllGraphs} sx={{ mr: 10 }}>
//             <DownloadIcon />
//           </IconButton>
//         </Tooltip>
//       </Box>
//       {error && <p style={{ color: "red" }}>Error: {error}</p>}

//       <Grid2 container spacing={2} justifyContent="center">
//         {graphs.map((graph) => (
//           <Grid2 item key={graph.graphid}>
//             <Card
//               sx={{
//                 width: 320,
//                 height: 250,
//                 cursor: "pointer",
//                 transition: "transform 0.3s",
//                 "&:hover": { transform: "scale(1.5)" },
//               }}
//               onClick={() => setSelectedGraph(graph)}
//             >
//               <CardMedia
//                 component="img"
//                 image={graph.base64_image}
//                 alt={graph.name}
//                 sx={{ width: "100%", height: "100%", objectFit: "cover" }}
//               />
//             </Card>
//           </Grid2>
//         ))}
//       </Grid2>

//       {/* Modal for Enlarged Image */}
//       <Modal
//         open={!!selectedGraph}
//         onClose={() => setSelectedGraph(null)}
//         aria-labelledby="graph-modal-title"
//         aria-describedby="graph-modal-description"
//       >
//         <Box
//           sx={{
//             position: "absolute",
//             top: "50%",
//             left: "50%",
//             transform: "translate(-50%, -50%)",
//             width: 700,
//             bgcolor: "background.paper",
//             boxShadow: 24,
//             p: 2,
//             borderRadius: 2,
//             textAlign: "center",
//           }}
//         >
//           {selectedGraph && (
//             <>
//               <Box mt={2} position="relative" textAlign="center">
//                 <Typography variant="h6">{selectedGraph.name}</Typography>

//                 <Box position="absolute" top={-10} right={20}>
//                   <Tooltip title="Download">
//                     <IconButton onClick={handleDownloadSingleGraph}>
//                       <DownloadIcon />
//                     </IconButton>
//                   </Tooltip>
//                 </Box>
//               </Box>
//               <img
//                 src={selectedGraph.base64_image}
//                 alt={selectedGraph.name}
//                 style={{ width: "100%", height: "auto", borderRadius: "8px" }}
//               />
//             </>
//           )}
//         </Box>
//       </Modal>
//     </div>
//   );
// };

// export default HealthMonitoring;
