import { useState, useEffect } from "react";
import {
  Grid2,
  Card,
  CardMedia,
  Modal,
  Box,
  FormControl,
  MenuItem,
  Select,
  IconButton,
  Typography,
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import Tooltip from "@mui/material/Tooltip";
import jsPDF from "jspdf";
// import html2canvas from "html2canvas";
import apiClient from "../../Axios";
import "./HealthService.css";

const HealthMonitoring = () => {
  const [graphs, setGraphs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedGraph, setSelectedGraph] = useState(null);
  const [dropdown1, setDropdown1] = useState("");
  const [dropdown2, setDropdown2] = useState("");

  useEffect(() => {
    const fetchGraph = async () => {
      try {
        const graphId = localStorage.getItem("graphId") || "10457"; // Default ID if none found
        const response = await apiClient.get(`/usage/${graphId}/`);

        if (response.status !== 200) {
          throw new Error(`API Error: ${response.status}`);
        }

        if (response.data.graphs && response.data.graphs.length > 0) {
          setGraphs(response.data.graphs);
        } else {
          throw new Error("No graph data found");
        }
      } catch (error) {
        console.error("Error fetching graph:", error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchGraph();
  }, []);

  // Download a single selected graph
  const handleDownloadSingleGraph = () => {
    if (!selectedGraph) {
      alert("No graph selected for download");
      return;
    }

    const pdf = new jsPDF("landscape", "mm", "a4");
    pdf.text(selectedGraph.name, 10, 10);
    pdf.addImage(selectedGraph.base64_image, "PNG", 10, 20, 180, 120);
    pdf.save(`${selectedGraph.name}.pdf`);
  };

  // Download all graphs
  const handleDownloadAllGraphs = () => {
    if (graphs.length === 0) {
      alert("No graphs available to download.");
      return;
    }

    const pdf = new jsPDF("landscape", "mm", "a4");
    let yOffset = 10;

    graphs.forEach((graph, index) => {
      pdf.text(graph.name, 10, yOffset);
      pdf.addImage(graph.base64_image, "PNG", 10, yOffset + 10, 180, 120);
      yOffset += 130;

      if (index < graphs.length - 1) {
        pdf.addPage();
        yOffset = 10;
      }
    });

    pdf.save("Graphs_Report.pdf");
  };
  if (loading) {
    return (
      <div className="cloud-container">
        <div className="loading-message">Loading...</div>
      </div>
    );
  }

  return (
    <div className="graph-container">
      <h2>System Graphs</h2>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={10}
      >
        {/* Left Side: Dropdowns */}
        <Box display="flex" gap={2}>
          <FormControl size="small">
            <Select
              value={dropdown1}
              onChange={(e) => setDropdown1(e.target.value)}
              displayEmpty
            >
              <MenuItem value="" disabled>
                Select Option 1
              </MenuItem>
              <MenuItem value="option1">Hypervisor 1</MenuItem>
              <MenuItem value="option2">Hypervisor 2</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small">
            <Select
              value={dropdown2}
              onChange={(e) => setDropdown2(e.target.value)}
              displayEmpty
            >
              <MenuItem value="" disabled>
                Select Option 2
              </MenuItem>
              <MenuItem value="optionA">Project A</MenuItem>
              <MenuItem value="optionB">Project B</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {/* Right Side: Download Icon */}
        <Tooltip title="Download All">
          <IconButton onClick={handleDownloadAllGraphs} sx={{ mr: 10 }}>
            <DownloadIcon />
          </IconButton>
        </Tooltip>
      </Box>
      {error && <p style={{ color: "red" }}>Error: {error}</p>}

      <Grid2 container spacing={2} justifyContent="center">
        {graphs.map((graph) => (
          <Grid2 item key={graph.graphid}>
            <Card
              sx={{
                width: 320,
                height: 250,
                cursor: "pointer",
                transition: "transform 0.3s",
                "&:hover": { transform: "scale(1.5)" },
              }}
              onClick={() => setSelectedGraph(graph)}
            >
              <CardMedia
                component="img"
                image={graph.base64_image}
                alt={graph.name}
                sx={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </Card>
          </Grid2>
        ))}
      </Grid2>

      {/* Modal for Enlarged Image */}
      <Modal
        open={!!selectedGraph}
        onClose={() => setSelectedGraph(null)}
        aria-labelledby="graph-modal-title"
        aria-describedby="graph-modal-description"
      >
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 700,
            bgcolor: "background.paper",
            boxShadow: 24,
            p: 2,
            borderRadius: 2,
            textAlign: "center",
          }}
        >
          {selectedGraph && (
            <>
              <Box mt={2} position="relative" textAlign="center">
                <Typography variant="h6">{selectedGraph.name}</Typography>

                <Box position="absolute" top={-10} right={20}>
                  <Tooltip title="Download">
                    <IconButton onClick={handleDownloadSingleGraph}>
                      <DownloadIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
              <img
                src={selectedGraph.base64_image}
                alt={selectedGraph.name}
                style={{ width: "100%", height: "auto", borderRadius: "8px" }}
              />
            </>
          )}
        </Box>
      </Modal>
    </div>
  );
};

export default HealthMonitoring;
