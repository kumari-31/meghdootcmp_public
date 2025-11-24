import React, { useEffect, useState } from "react";
import { Card, CardContent, Typography, CircularProgress,Box } from "@mui/material";
import { RadialBarChart, RadialBar, PolarAngleAxis } from "recharts";
import { PieChart} from "@mui/x-charts";
import { useTheme, useMediaQuery } from "@mui/material";
import apiClient from "../Axios";

const OpenstackOverview = () => {
  const [activeNetworks, setActiveNetworks] = useState(0);
  const [projects, setProjects] = useState([]);
  const [totalProjects, setTotalProjects] = useState(0);
  const [imageData, setImageData] = useState([]);
  const [visibilityCounts, setVisibilityCounts] = useState({});
  const [data, setData] = useState({
    total_instances: 0,
    total_vcpus: 0,
    used_vcpus: 0,
    total_memory_mb: 0,
    used_memory_mb: 0,
    total_storage_gb: 0,
    used_storage_gb: 0,
  });
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isTablet = useMediaQuery(theme.breakpoints.down("md"));

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await apiClient.get("/overview/");
        setData(response.data);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const fetchNetworks = async () => {
      try {
        const response = await apiClient.get("/networks/");
        setActiveNetworks(
          response.data.filter((n) => n.status === "ACTIVE").length
        );
      } catch (error) {
        console.error("Error fetching networks:", error);
      }
    };
    fetchNetworks();
  }, []);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await apiClient.get("/openstack/projects/");
        setProjects(
          response.data.map((p) => ({ id: p.id, value: 1, label: p.name }))
        );
        setTotalProjects(response.data.length);
      } catch (error) {
        console.error("Error fetching projects:", error);
      }
    };
    fetchProjects();
  }, []);

  useEffect(() => {
    const fetchImages = async () => {
      try {
        const response = await apiClient.get("/images/");
        const counts = response.data.reduce((acc, img) => {
          acc[img.visibility] = (acc[img.visibility] || 0) + 1;
          return acc;
        }, {});
        setVisibilityCounts(counts);
        setImageData(
          Object.entries(counts).map(([k, v]) => ({
            id: k,
            value: v,
            label: k,
            color:
            k === "private"
              ? "#50618f"
              : k === "shared"
              ? "#ffa600"
              : k === "public"
              ? "#2bcc56"
              : "gray",
          }))
        );
      } catch (error) {
        console.error("Error fetching images:", error);
      }
    };
    fetchImages();
  }, []);

  const vcpuUsage = ((data.used_vcpus / data.total_vcpus) * 100).toFixed(1);
  const memoryUsage = (
    (data.used_memory_mb / data.total_memory_mb) *
    100
  ).toFixed(1);
  const storageUsage = (
    (data.used_storage_gb / data.total_storage_gb) *
    100
  ).toFixed(1);

  const getBarColor = (usage) => {
    if (usage > 80) return "#ff4d4f";
    if (usage > 60) return "#faad14";
    return "#4caf50";
  };

  const createGaugeData = (value) => [
    {
      name: "Usage",
      value: value,
      fill: getBarColor(value),
    },
    {
      name: "Remaining",
      value: 100 - value,
      fill: "#c0c0c0", // Darker grey for the background of radial bar
    },
  ];

  // const totalCount = Object.values(visibilityCounts).reduce(
  //   (sum, count) => sum + count,
  //   0
  // );

  return (
    <Box
      style={{
        display: "grid",
        gap: 20,
        gridTemplateColumns: isMobile ? "1fr" : isTablet ? "repeat(2, 1fr)" : "repeat(3, 1fr)",
        alignItems: "start",
        padding: 2,
         
      }}
    >
      <Card
        sx={{  minHeight: 350,  padding: 1 ,Width: isMobile ? "100%" : 300,}}
      >
        <CardContent>
          <Typography variant="h6">Total Active Networks</Typography>
          <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        position: "relative",
        marginTop: 14,
      }}
    >
            <CircularProgress
              variant="determinate"
              value={100}
              size={160}
              thickness={4}
              style={{ color: "#e0e0e0", position: "absolute" }}
            />
            <CircularProgress
              variant="determinate"
              value={(activeNetworks / 100) * 100}
              size={160}
              thickness={4}
              style={{ position: "absolute", color:"#00FFBF"}}
            />
            <Typography
              variant="h2"
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
              }}
            >
              {activeNetworks}
            </Typography>
            </Box>
        </CardContent>
      </Card>

      <Card sx={{ width: isMobile ? "100%" : 700, minHeight: 350   }}>
        <CardContent>
          <Typography variant="h5">Infrastructure-as-a-Service</Typography>
          <div style={{ fontSize: "14px", lineHeight: "1.6" }}>
            <div style={{ marginBottom: "16px" }}>
              <p style={{ margin: 0, fontSize: "14px", color: "#666" }}>vCPU</p>
              <div
                style={{
                  backgroundColor: "#ddd",
                  height: "10px",
                  borderRadius: "4px",
                  margin: "8px 0",
                  overflow: "hidden",
                }}
              >
                <span
                  style={{
                    height: "100%",
                    display: "block",
                    width: `${vcpuUsage}%`,
                    backgroundColor: getBarColor(vcpuUsage),
                  }}
                ></span>
              </div>
              <p>
                Used: <b>{data.used_vcpus} vCPU</b> Total:{" "}
                <b>{data.total_vcpus} vCPU</b>
              </p>
            </div>
            <div style={{ marginBottom: "16px" }}>
              <p style={{ margin: 0, fontSize: "14px", color: "#666" }}>RAM</p>
              <div
                style={{
                  backgroundColor: "#ddd",
                  height: "10px",
                  borderRadius: "4px",
                  margin: "8px 0",
                  overflow: "hidden",
                }}
              >
                <span
                  style={{
                    height: "100%",
                    display: "block",
                    width: `${memoryUsage}%`,
                    backgroundColor: getBarColor(memoryUsage),
                  }}
                ></span>
              </div>
              <p>
                Used: <b>{(data.used_memory_mb / 1024).toFixed(1)} GB</b> Total:{" "}
                <b>{(data.total_memory_mb / 1024).toFixed(1)} GB</b>
              </p>
            </div>
            <div style={{ marginBottom: "16px" }}>
              <p style={{ margin: 0, fontSize: "14px", color: "#666" }}>
                Storage
              </p>
              <div
                style={{
                  backgroundColor: "#ddd",
                  height: "10px",
                  borderRadius: "4px",
                  margin: "8px 0",
                  overflow: "hidden",
                }}
              >
                <span
                  style={{
                    height: "100%",
                    display: "block",
                    width: `${storageUsage}%`,
                    backgroundColor: getBarColor(storageUsage),
                  }}
                ></span>
              </div>
              <p>
                Used: <b>{data.used_storage_gb} GB</b> Total:{" "}
                <b>{data.total_storage_gb} GB</b>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card sx={{ width: isMobile ? "100%" : 500, minHeight: 350, padding: 1   }}>
        <CardContent>
          <Typography variant="h5">Projects</Typography>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              position: "relative",
             
            }}
          >
            <PieChart
              width={isMobile ? 300 : 400}
              height={250}
              series={[
                {
                  data: projects.map((item) => ({
                    ...item,
                    label:
                      item.label.length > 7
                        ? `${item.label.slice(0, 7)}...`
                        : item.label, // Truncate labels
                  })),
                  innerRadius: 30,
                  outerRadius: 100,
                  paddingAngle:3,
                  cornerRadius:4,
                  arcLabel: (data) => (<tspan  fontSize="14" fontWeight="bold">{data.label}</tspan>),
                  arcLabelMinAngle: 25,
                  arcLabelRadius: "100%",
                  highlightScope: { faded: "global", highlighted: "item" },
                  faded: { innerRadius: 50, additionalRadius: -30, color: 'gray' },
                  // cornerRadius: 5,
                },
              ]}
              slots={{ legend: () => null }} // Removes legend
            />
            {/* Total count on the right side */}
            <Typography
              variant="h5"
              sx={{
                marginRight: 10,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: "60px", fontWeight: "bold" }}>
                {totalProjects}
              </span>
              <span style={{ fontSize: "18px" }}>Total</span>
            </Typography>
          </div>
        </CardContent>
      </Card>

      <Card sx={{  width: isMobile ? "100%" : 600, minHeight: 300, padding: 1  }}>
        <CardContent>
          <Typography variant="h6">Image Visibility</Typography>
          <div
            className="images-container"
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              marginTop: "20px",
            }}
          >
            <PieChart
              width={isMobile ? 300 : 400}
              height={250}
              series={[
                {
                  data: imageData,
                  innerRadius: 30,
                  outerRadius: 100,
                  paddingAngle:3,
                  cornerRadius:4,
                  arcLabel: (data) => <tspan fontSize="14" fontWeight="bold">{data.label}</tspan>,
                  arcLabelMinAngle: 25,
                  arcLabelRadius: "100%",
                  highlightScope: { faded: "global", highlighted: "item" },
                  faded: { innerRadius: 50, additionalRadius: -30, color: 'gray' },
                  // cornerRadius: 5,
                },
              ]}
              slots={{ legend: () => null }}
            />
            <div
              className="images-info"
              style={{
                textAlign: "left",
                backgroundColor: "#f8f9fa",
                padding: "20px",
                borderRadius: "8px",
                boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                width: "150px",
              }}
            >
              <Typography
                variant="h5"
                sx={{ color: "#333", marginBottom: "10px" }}
              >
                {Object.entries(visibilityCounts).map(([key, value]) => (
                  <p key={key} style={{ fontSize: "16px", margin: "5px 0" }}>
                    <strong>
                      {key.charAt(0).toUpperCase() + key.slice(1)}:
                    </strong>{" "}
                    {value}
                  </p>
                ))}
              </Typography>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card sx={{ minHeight: 350, padding: 1 ,paddingBottom:0 }}>
        <CardContent>
          <Typography variant="h6">Virtual Machines</Typography>
          <div style={{ textAlign: "center" }}>
            {/* Increased font size for total instances */}
            <Typography variant="h3">{data.total_instances}</Typography>
            {/* Increased font size for label */}
            <Typography variant="h6">Total Virtual Machines</Typography>
            <div style={{ display: "flex", justifyContent: "center", gap: "20px", marginTop: "20px" }}>
              {[
                { label: "vCPU", usage: vcpuUsage },
                { label: "RAM", usage: memoryUsage },
              ].map((gauge, idx) => (
                <div key={idx} style={{ textAlign: "center" }}>
                  {/* Increased font size for gauge labels */}
                  <Typography variant="subtitle1">{gauge.label}</Typography>
                  <RadialBarChart
                    width={200} // Increased width
                    height={110} // Increased height
                    innerRadius="25" // Absolute inner radius for better control
                    outerRadius="60" // Absolute outer radius for better control
                    startAngle={180}
                    endAngle={0}
                    data={createGaugeData(Number(gauge.usage))}
                  >
                    <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                    <RadialBar minAngle={15} background clockWise dataKey="value" cornerRadius={5} />
                  </RadialBarChart>
                  {/* Increased font size for percentage */}
                  <Typography variant="h6">{gauge.usage}%</Typography>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </Box>
  );
};

export default OpenstackOverview;
