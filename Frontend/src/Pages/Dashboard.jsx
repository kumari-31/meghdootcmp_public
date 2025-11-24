// import React, { useEffect, useState } from "react";
// // import Cardone from "../Components/Cardone";
// import { RadialBarChart, RadialBar, PolarAngleAxis } from "recharts";
// import Calendar from 'react-calendar';
// import 'react-calendar/dist/Calendar.css';
// import { Card, CardContent, Typography, Grid2,Box } from '@mui/material';
// import {
//   GaugeContainer,
//   GaugeValueArc,
//   GaugeReferenceArc,
//   useGaugeState
// } from '@mui/x-charts/Gauge';
// import apiClient from "../Axios";
// import "./Dashboard.css";

// function GaugePointer() {
//   const { valueAngle, outerRadius, cx, cy } = useGaugeState();

//   if (valueAngle === null) {
//     return null;
//   }

//   const target = {
//     x: cx + outerRadius * Math.sin(valueAngle),
//     y: cy - outerRadius * Math.cos(valueAngle),
//   };

//   return (
//     <g>
//       <circle cx={cx} cy={cy} r={5} fill="red" />
//       <path d={`M ${cx} ${cy} L ${target.x} ${target.y}`} stroke="red" strokeWidth={3} />
//     </g>
//   );
// }

// const Dashboard = () => {
//   const [data, setData] = useState({
//     total_instances: 0,
//     total_vcpus: 0,
//     used_vcpus: 0,
//     total_memory_mb: 0,
//     used_memory_mb: 0,
//     total_storage_gb: 0,
//     used_storage_gb: 0,
//   });
//   const [k8sData, setK8sData] = useState({
//     daemonsets: 0,
//     pods: 0,
//     deployments: 0,
//     replicasets: 0,
//   });
//   const [date, setDate] = useState(new Date());

//   const handleDateChange = (newDate) => {
//     setDate(newDate);
//   };

//   useEffect(() => {

//     const fetchData = async () => {
//       try {
//         const response = await apiClient.get("/overview/");

//         setData(response.data);
//       } catch (error) {
//         console.error("Error fetching data:", error);
//       }
//     };
//     fetchData();
//   }, []);

//   // Calculate usage percentages
//   const vcpuUsage = ((data.used_vcpus / data.total_vcpus) * 100).toFixed(1);
//   const memoryUsage = ((data.used_memory_mb / data.total_memory_mb) * 100).toFixed(1);
//   const storageUsage = ((data.used_storage_gb / data.total_storage_gb) * 100).toFixed(1);

//   // Determine bar color based on usage
//   const getBarColor = (usage) => {
//     if (usage > 80) return "#ff4d4f"; // Red for critical
//     if (usage > 60) return "#faad14"; // Orange for warning
//     return "#4caf50"; // Green for normal
//   };

//   // Create half-gauge chart data
//   const createGaugeData = (usage) => [
//     { value: usage, fill: getBarColor(usage) },
//     { value: 100 - usage, fill: "#ddd" }, // Remaining portion
//   ];

//   useEffect(() => {
//     const fetchK8sData = async () => {
//       try {
//         const response = await apiClient.get("/k8s/workloadstati/"); // Update API Endpoint
//         setK8sData(response.data);
//       } catch (error) {
//         console.error("Error fetching Kubernetes data:", error);
//       }
//     };

//     fetchK8sData();
//   }, []);

//   return (
//     <Grid2 container spacing={3}>
//       <Grid2 item xs={12} md={6}>
//         <Card sx={{ padding: 1, height: 300, minWidth:600 }}>
//           <CardContent>
//             <Typography variant="h6">Infrastructure-as-a-Service (Openstack)</Typography>
//             <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
//               <div style={{ width:350, marginTop:10 }}>
//                 {[
//                   { label: "vCPU", value: vcpuUsage, used: data.used_vcpus, total: data.total_vcpus },
//                   { label: "RAM", value: memoryUsage, used: (data.used_memory_mb / 1024).toFixed(1), total: (data.total_memory_mb / 1024).toFixed(1) },
//                   { label: "Storage", value: storageUsage, used: data.used_storage_gb, total: data.total_storage_gb },
//                 ].map((stat, index) => (
//                   <div key={index}>
//                     <Typography variant="h7"> {stat.label}</Typography>
//                     <div style={{ backgroundColor: "#ddd", height: "10px", borderRadius: "4px", margin: "8px 0", overflow: "hidden" }}>
//                       <span style={{ width: `${stat.value}%`, backgroundColor: getBarColor(stat.value), display: "block", height: "100%" }}></span>
//                     </div>
//                     <Typography>
//                       Used: <b>{stat.used}</b> Total: <b>{stat.total}</b>
//                     </Typography>
//                   </div>
//                 ))}
//               </div>
//               <div style={{ textAlign: "center" }}>
//                 <Typography variant="h4">{data.total_instances}</Typography>
//                 <Typography variant="body2">Total Virtual Machines</Typography>
//                 <div style={{ display: "flex", justifyContent: "center", gap: "20px" , marginTop: "20px" }}>
//                   {[
//                     { label: "vCPU", usage: vcpuUsage },
//                     { label: "RAM", usage: memoryUsage },
//                   ].map((gauge, idx) => (
//                     <div key={idx} style={{ textAlign: "center" }}>
//                       <Typography variant="body2">{gauge.label}</Typography>
//                       <RadialBarChart width={150} height={80} innerRadius="70%" outerRadius="100%" startAngle={180} endAngle={0} data={createGaugeData(Number(gauge.usage))}>
//                         <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
//                         <RadialBar minAngle={15} background clockWise dataKey="value" cornerRadius={5} />
//                       </RadialBarChart>
//                       <Typography variant="h7">{gauge.usage}%</Typography>
//                     </div>
//                   ))}
//                 </div>
//               </div>
//             </div>
//           </CardContent>
//         </Card>
//       </Grid2>

//       <Grid2 item xs={6}>
//         <Card sx={{ padding: 1, height: 300, minWidth:1100 }}>
//           <CardContent>
//           <Typography variant="h6">Platform As Service (Kubernetes)</Typography>
//           <Grid2 container spacing={8} sx={{ marginTop: 2, justifyContent: "center" }}>
//             {/* DaemonSets */}
//             <Grid2 item xs={6} sm={3}>
//               <Typography variant="body2" align="center">DaemonSets</Typography>
//               <GaugeContainer width={200} height={150} startAngle={-110} endAngle={110} value={k8sData.daemonsets}>
//                 <GaugeReferenceArc />
//                 <GaugeValueArc />
//                 <GaugePointer />
//               </GaugeContainer>
//               <Typography variant="body2" align="center"><b>{k8sData.daemonsets}</b></Typography>
//             </Grid2>

//             {/* Pods */}
//             <Grid2 item xs={6} sm={3}>
//               <Typography variant="body2" align="center">Pods</Typography>
//               <GaugeContainer width={200} height={150} startAngle={-110} endAngle={110} value={k8sData.pods}>
//                 <GaugeReferenceArc />
//                 <GaugeValueArc />
//                 <GaugePointer />
//               </GaugeContainer>
//               <Typography variant="body2" align="center"><b>{k8sData.pods}</b></Typography>
//             </Grid2>

//             {/* Deployments */}
//             <Grid2 item xs={6} sm={3}>
//               <Typography variant="body2" align="center">Deployments</Typography>
//               <GaugeContainer width={200} height={150} startAngle={-110} endAngle={110} value={k8sData.deployments}>
//                 <GaugeReferenceArc />
//                 <GaugeValueArc />
//                 <GaugePointer />
//               </GaugeContainer>
//               <Typography variant="body2" align="center"><b>{k8sData.deployments}</b></Typography>
//             </Grid2>

//             {/* ReplicaSets */}
//             <Grid2 item xs={6} sm={3}>
//               <Typography variant="body2" align="center">ReplicaSets</Typography>
//               <GaugeContainer width={200} height={150} startAngle={-110} endAngle={110} value={k8sData.replicasets}>
//                 <GaugeReferenceArc />
//                 <GaugeValueArc />
//                 <GaugePointer />
//               </GaugeContainer>
//               <Typography variant="body2" align="center"><b>{k8sData.replicasets}</b></Typography>
//             </Grid2>
//           </Grid2>
//           </CardContent>
//         </Card>
//       </Grid2>
//       {/* Second row - Three cards */}
//       {/* {[
//         { title: "AWS", stats: ["Running: 4 EC2 Instances", "Stopped: 0 EC2 Instances"] },
//         { title: "Microsoft", stats: ["Running: 7 VM Instances", "Stopped: 0 VM Instances", "Disk: 300 GB"] },
//         { title: "Oracle", stats: ["Running: 7 VM Instances", "Stopped: 0 VM Instances", "Disk: 300 GB"] },
//       ].map((cloud, index) => (
//         <Grid2 item xs={4} key={index}>
//           <Card sx={{ padding: 2 , height: 200, minWidth:600}}>
//             <CardContent>
//               <Typography variant="h6">{cloud.title}</Typography>
//               {cloud.stats.map((stat, i) => (
//                 <Typography key={i} variant="body2">{stat}</Typography>
//               ))}
//             </CardContent>
//           </Card>
//         </Grid2>
//       ))} */}

//       {/* Third row - Three cards */}
//       <Grid2 item xs={4}>
//         <Card sx={{ padding: 2, height: 400, minWidth:670 }}>
//           <CardContent>
//             <Typography variant="h6">Devices Under Management - 166</Typography>
//             <Typography variant="body2">Servers: 3 Up</Typography>
//             <Typography variant="body2">Switches: 11 Down</Typography>
//             <Typography variant="body2">Load Balancers: 8 Not Configured</Typography>
//           </CardContent>
//         </Card>
//       </Grid2>

//       <Grid2 item xs={4}>
//         <Card sx={{ padding: 2 }}>
//           <CardContent>
//             <Typography variant="h6">Maintenance Calendar</Typography>
//             <Box
//         sx={{
//           "& .react-calendar": {
//             backgroundColor: (theme) => theme.palette.background.paper,
//             color: (theme) => theme.palette.text.primary,
//             borderRadius: 2,
//             padding: 1,
//           },
//           "& .react-calendar__tile": {
//             color: (theme) => theme.palette.text.primary,
//           },
//           "& .react-calendar__navigation button": {
//             color: (theme) => theme.palette.text.primary,
//           },
//         }}
//       >
//             <Calendar onChange={handleDateChange} value={date} />
//             </Box>
//           </CardContent>
//         </Card>
//       </Grid2>

//       <Grid2 item xs={4}>
//         <Card sx={{ padding: 2, height: 400, minWidth:700 }}>
//           <CardContent>
//             <Typography variant="h6">Alerts</Typography>
//             <Typography variant="body2">VMs: 0</Typography>
//             <Typography variant="body2">PDUs: 0</Typography>
//             <Typography variant="body2">Switches: 0</Typography>
//           </CardContent>
//         </Card>
//       </Grid2>
//     </Grid2>
// );
// };

// export default Dashboard;

// import React, { useEffect, useState } from "react";
// import Cardone from "../Components/Cardone";
// import { RadialBarChart, RadialBar, PolarAngleAxis } from "recharts";
// import Calendar from 'react-calendar';
// import 'react-calendar/dist/Calendar.css';
// import { Card, CardContent, Typography } from '@mui/material';
// import apiClient from "../Axios";
// import "./Dashboard.css";

// const Dashboard = () => {
//   const [data, setData] = useState({
//     total_instances: 0,
//     total_vcpus: 0,
//     used_vcpus: 0,
//     total_memory_mb: 0,
//     used_memory_mb: 0,
//     total_storage_gb: 0,
//     used_storage_gb: 0,
//   });
//   const [date, setDate] = useState(new Date());

//   const handleDateChange = (newDate) => {
//     setDate(newDate);
//   };

//   useEffect(() => {

//     const fetchData = async () => {
//       try {
//         const response = await apiClient.get("overview");

//         setData(response.data);
//       } catch (error) {
//         console.error("Error fetching data:", error);
//       }
//     };
//     fetchData();
//   }, []);

//   // Calculate usage percentages
//   const vcpuUsage = ((data.used_vcpus / data.total_vcpus) * 100).toFixed(1);
//   const memoryUsage = ((data.used_memory_mb / data.total_memory_mb) * 100).toFixed(1);
//   const storageUsage = ((data.used_storage_gb / data.total_storage_gb) * 100).toFixed(1);

//   // Determine bar color based on usage
//   const getBarColor = (usage) => {
//     if (usage > 80) return "#ff4d4f"; // Red for critical
//     if (usage > 60) return "#faad14"; // Orange for warning
//     return "#4caf50"; // Green for normal
//   };

//   // Create half-gauge chart data
//   const createGaugeData = (usage) => [
//     { value: usage, fill: getBarColor(usage) },
//     { value: 100 - usage, fill: "#ddd" }, // Remaining portion
//   ];

//   return (
//     <div className="dashboard">
//       <div className="dashboard-content">
//         {/* Top Section */}
//     <div className="row">
//     <div className="dashboard-card">
//   <h3>Infrastructure-as-a-Service (Openstack)</h3>

//   <div className="section">

//      {/* Stats Section */}
//      <div className="stats">
//       {/* CPU */}
//       <div className="stat">
//         <p>vCPU</p>
//         <div className="bar">
//           <span
//             className="bar-filled"
//             style={{
//               width: ${vcpuUsage}%,
//               backgroundColor: getBarColor(vcpuUsage),
//             }}
//           ></span>
//         </div>
//         <p>
//           Used: <b>{data.used_vcpus} vCPU</b> Total: <b>{data.total_vcpus} vCPU</b>
//         </p>
//       </div>
//       {/* RAM */}
//       <div className="stat">
//         <p>RAM</p>
//         <div className="bar">
//           <span
//             className="bar-filled"
//             style={{
//               width: ${memoryUsage}%,
//               backgroundColor: getBarColor(memoryUsage),
//             }}
//           ></span>
//         </div>
//         <p>
//           Used: <b>{(data.used_memory_mb / 1024).toFixed(1)} GB</b> Total:{" "}
//           <b>{(data.total_memory_mb / 1024).toFixed(1)} GB</b>
//         </p>
//       </div>
//       {/* Storage */}
//       <div className="stat">
//         <p>Storage</p>
//         <div className="bar">
//           <span
//             className="bar-filled"
//             style={{
//               width: ${storageUsage}%,
//               backgroundColor: getBarColor(storageUsage),
//             }}
//           ></span>
//         </div>
//         <p>
//           Used: <b>{data.used_storage_gb} GB</b> Total: <b>{data.total_storage_gb} GB</b>
//         </p>
//       </div>
//     </div>

//     <div className="gauges-section">
//        {/* Total Instances Info */}
//     <div className="instances-info">
//       <h2>{data.total_instances}</h2>
//       <h5>Total Virtual Machines </h5>
//     </div>
//     {/* Half-Gauge Charts */}
//     <div className="gauges">
//       {/* vCPU Half-Gauge */}
//       <div className="gauge-container">
//         <h5>vCPU</h5>
//         <RadialBarChart
//           width={150}
//           height={80}
//           innerRadius="70%"
//           outerRadius="100%"
//           startAngle={180}
//           endAngle={0}
//           data={createGaugeData(Number(vcpuUsage))}
//         >
//           <PolarAngleAxis
//             type="number"
//             domain={[0, 100]}
//             angleAxisId={0}
//             tick={false}
//           />
//           <RadialBar
//             minAngle={15}
//             background
//             clockWise
//             dataKey="value"
//             cornerRadius={5}
//           />
//         </RadialBarChart>
//         <p>
//           {vcpuUsage}% ({data.used_vcpus}/{data.total_vcpus} vCPU)
//         </p>
//       </div>

//       {/* RAM Half-Gauge */}
//       <div className="gauge-container">
//         <h5>RAM</h5>
//         <RadialBarChart
//           width={150}
//           height={80}
//           innerRadius="70%"
//           outerRadius="100%"
//           startAngle={180}
//           endAngle={0}
//           data={createGaugeData(Number(memoryUsage))}
//         >
//           <PolarAngleAxis
//             type="number"
//             domain={[0, 100]}
//             angleAxisId={0}
//             tick={false}
//           />
//           <RadialBar
//             minAngle={15}
//             background
//             clockWise
//             dataKey="value"
//             cornerRadius={5}
//           />
//         </RadialBarChart>
//         <p>
//           {memoryUsage}% (
//           {(data.used_memory_mb / 1024).toFixed(1)}/
//           {(data.total_memory_mb / 1024).toFixed(1)} GB)
//         </p>
//       </div>
//     </div>

//    </div>
//   </div>
// </div>
//     <Cardone
//             title="Platform As Service (Kubernetes)"
//             stats={[
//               { label: "vCPU", value: "Available: 9 vCPU" },
//               { label: "RAM", value: "Configured: 10 GB, Allocated: 16 GB" },
//               { label: "Storage", value: "Available: 941 GB" },
//             ]}
//             chartData={[
//               { value: 36, fill: "#faad14" },
//               { value: 64, fill: "#ddd" },
//             ]}
//             type="large"
//           />
//         </div>

//         {/* Second Section */}
//         <div className="row">
//           <Cardone
//             title="AWS"
//             stats={[
//               { label: "Running", value: "4 EC2 Instances" },
//               { label: "Stopped", value: "0 EC2 Instances" },
//             ]}
//             type="medium"
//           />
//           <Cardone
//             title="Microsoft"
//             stats={[
//               { label: "Running", value: "7 VM Instances" },
//               { label: "Stopped", value: "0 VM Instances" },
//               { label: "Disk", value: "300 GB" },
//             ]}
//             type="medium"
//           />
//            <Cardone
//             title="Oracle"
//             stats={[
//               { label: "Running", value: "7 VM Instances" },
//               { label: "Stopped", value: "0 VM Instances" },
//               { label: "Disk", value: "300 GB" },
//             ]}
//             type="medium"
//           />
//         </div>

//         {/* Bottom Section */}
//         <div className="row">
//           <Cardone
//             title="Devices Under Management - 166"
//             stats={[
//               { label: "Servers", value: "3 Up" },
//               { label: "Switches", value: "11 Down" },
//               { label: "Load Balancers", value: "8 Not Configured" },
//             ]}
//             type="wide"
//           />
//           <Card sx={{ minWidth: 275, padding: 2 }}>
//       <CardContent>
//         <Typography variant="h6" gutterBottom>
//           Maintenance Calendar
//         </Typography>
//         <Calendar
//           onChange={handleDateChange}
//           value={date}
//         />
//       </CardContent>
//     </Card>
//           <Cardone
//             title="Alerts"
//             stats={[
//               { label: "VMs", value: "0" },
//               { label: "PDUs", value: "0" },
//               { label: "Switches", value: "0" },
//             ]}
//             type="wide"
//           />
//         </div>
//       </div>
//     </div>
//   );
// };

import React, { useEffect, useState } from "react";
import {
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import {
  Card,
  CardContent,
  Typography,
  Grid2,
  Box,
  Divider,
  CircularProgress,
  Stack,
} from "@mui/material";
// import {
//   GaugeContainer,
//   GaugeValueArc,
//   GaugeReferenceArc,
//   useGaugeState,
// } from "@mui/x-charts/Gauge";
import {
  CircularProgressbarWithChildren,
  buildStyles,
} from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";

import dayjs from "dayjs";
import isToday from "dayjs/plugin/isToday";
dayjs.extend(isToday);
import apiClient from "../Axios";
import "./Dashboard.css";

const RadialSeparators = ({ count, style }) => {
  const turns = 1 / count;
  return (
    <>
      {[...Array(count)].map((_, index) => (
        <div
          key={index}
          style={{
            position: "absolute",
            height: "100%",
            transform: `rotate(${index * turns}turn)`,
            transformOrigin: "center",
          }}
        >
          <div style={style} />
        </div>
      ))}
    </>
  );
};

const GradientCircularStat = ({
  value = 80,
  label = "DaemonSets",
  gradientId = "gradientBar",
}) => {
  return (
    <div style={{ width: 120, height: 120, margin: "auto" }}>
      <CircularProgressbarWithChildren
        value={value}
        strokeWidth={12}
        styles={buildStyles({
          pathColor: `url(#${gradientId})`,
          trailColor: "#2a2a2a",
          strokeLinecap: "butt",
        })}
      >
        <RadialSeparators
          count={30}
          style={{
            background: "#111",
            width: "2px",
            height: "12%",
          }}
        />
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "100%",
            color: "#121211",
            fontSize: 18,
            fontWeight: "bold",
          }}
        >
          {value}
        </div>

        {/* SVG gradient definition */}
        <svg style={{ height: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#32ded4" />
              <stop offset="25%" stopColor="#3b9eff" />
              <stop offset="50%" stopColor="#9f5fff" />
              <stop offset="75%" stopColor="#f059a8" />
              <stop offset="100%" stopColor="#fff95b" />
            </linearGradient>
          </defs>
        </svg>
      </CircularProgressbarWithChildren>
      <p style={{ textAlign: "center", marginTop: 5, fontSize: 14 }}>{label}</p>
    </div>
  );
};

// function GaugePointer() {
//   const { valueAngle, outerRadius, cx, cy } = useGaugeState();

//   if (valueAngle === null) {
//     return null;
//   }

//   const target = {
//     x: cx + outerRadius * Math.sin(valueAngle),
//     y: cy - outerRadius * Math.cos(valueAngle),
//   };

//   return (
//     <g>
//       <circle cx={cx} cy={cy} r={5} fill="red" />
//       <path
//         d={`M ${cx} ${cy} L ${target.x} ${target.y}`}
//         stroke="red"
//         strokeWidth={3}
//       />
//     </g>
//   );
// }

const Dashboard = () => {
  const [data, setData] = useState({
    total_instances: 0,
    total_vcpus: 0,
    used_vcpus: 0,
    total_memory_mb: 0,
    used_memory_mb: 0,
    total_storage_gb: 0,
    used_storage_gb: 0,
  });
  const [k8sData, setK8sData] = useState({
    daemonsets: 0,
    pods: 0,
    deployments: 0,
    replicasets: 0,
  });
  const [date, setDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    total: 0,
    today: 0,
    open: 0,
    inProgress: 0,
    closed: 0,
  });

  const handleDateChange = (newDate) => {
    setDate(newDate);
  };

  //tickets
  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const response = await apiClient.get("/tickets/");
        const data = response.data;

        let open = 0,
          inProgress = 0,
          closed = 0,
          today = 0;

        data.forEach((ticket) => {
          const status = ticket.status.toLowerCase();
          if (status === "open") open++;
          else if (status === "in progress") inProgress++;
          else if (status === "closed") closed++;

          // ✅ Day.js version of "is today"
          if (dayjs(ticket.created_at).isToday()) today++;
        });

        setSummary({
          total: data.length,
          open,
          inProgress,
          closed,
          today,
        });
        setLoading(false);
      } catch (error) {
        console.error("Error fetching ticket data", error);
        setLoading(false);
      }
    };

    fetchTickets();
  }, []);
  const radialData = [
    { name: "Open", value: summary.open, fill: "#42a5f5" },
    { name: "In Progress", value: summary.inProgress, fill: "#ffca28" },
    { name: "Closed", value: summary.closed, fill: "#66bb6a" },
    { name: "Total", value: summary.total, fill: "#ab47bc" },
    { name: "Today", value: summary.today, fill: "#ef5350" },
  ];

  // const CustomLabel = ({
  //   cx,
  //   cy,
  //   midAngle,
  //   innerRadius,
  //   outerRadius,
  //   index,
  // }) => {
  //   const RADIAN = Math.PI / 180;
  //   const radius = innerRadius + (outerRadius - innerRadius) * 0.6;
  //   const x = cx + radius * Math.cos(-midAngle * RADIAN);
  //   const y = cy + radius * Math.sin(-midAngle * RADIAN);

  //   const item = radialData[index]; // ensure radialData is accessible in component scope

  //   return (
  //     <text
  //       x={x}
  //       y={y}
  //       fill="#000"
  //       textAnchor="middle"
  //       dominantBaseline="central"
  //       fontSize={12}
  //     >
  //       {item ? `${item.name}: ${item.value}` : ""}
  //     </text>
  //   );
  // };

  // ✅ Custom Tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const { name, value } = payload[0].payload;
      return (
        <Box
          sx={{
            p: 1,
            background: "#fff",
            border: "1px solid #ccc",
            borderRadius: 1,
          }}
        >
          <Typography variant="body2">
            <strong>{name}:</strong> {value}
          </Typography>
        </Box>
      );
    }
    return null;
  };

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

  // Calculate usage percentages
  const vcpuUsage = ((data.used_vcpus / data.total_vcpus) * 100).toFixed(1);
  const memoryUsage = (
    (data.used_memory_mb / data.total_memory_mb) *
    100
  ).toFixed(1);
  const storageUsage = (
    (data.used_storage_gb / data.total_storage_gb) *
    100
  ).toFixed(1);

  // Determine bar color based on usage
  const getBarColor = (usage) => {
    if (usage > 80) return "#ff4d4f"; // Red for critical
    if (usage > 60) return "#faad14"; // Orange for warning
    return "#4caf50"; // Green for normal
  };

  // Create half-gauge chart data
  const createGaugeData = (usage) => [
    { value: usage, fill: getBarColor(usage) },
    { value: 100 - usage, fill: "#ddd" }, // Remaining portion
  ];

  useEffect(() => {
    const fetchK8sData = async () => {
      try {
        const response = await apiClient.get("/k8s/workloadstati/"); // Update API Endpoint
        setK8sData(response.data);
      } catch (error) {
        console.error("Error fetching Kubernetes data:", error);
      }
    };

    fetchK8sData();
  }, []);

  return (
    <Grid2 container spacing={3}>
      <Grid2 item xs={12} sm={12} md={6} lg={6} xl={6}>
        <Card
          sx={{
            padding: 1,
            height: "100%",
            width: "100%",
            borderRadius: 4,
            boxShadow: 6,
          }}
        >
          <CardContent>
            <Typography variant="h6">
              Infrastructure-as-a-Service (Openstack)
            </Typography>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
              }}
            >
              <div style={{ width: 350, marginTop: 10 }}>
                {[
                  {
                    label: "vCPU",
                    value: vcpuUsage,
                    used: data.used_vcpus,
                    total: data.total_vcpus,
                  },
                  {
                    label: "RAM",
                    value: memoryUsage,
                    used: (data.used_memory_mb / 1024).toFixed(1),
                    total: (data.total_memory_mb / 1024).toFixed(1),
                  },
                  {
                    label: "Storage",
                    value: storageUsage,
                    used: data.used_storage_gb,
                    total: data.total_storage_gb,
                  },
                ].map((stat, index) => (
                  <div key={index}>
                    <Typography variant="h7"> {stat.label}</Typography>
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
                          width: `${stat.value}%`,
                          backgroundColor: getBarColor(stat.value),
                          display: "block",
                          height: "100%",
                        }}
                      ></span>
                    </div>
                    <Typography>
                      Used: <b>{stat.used}</b> Total: <b>{stat.total}</b>
                    </Typography>
                  </div>
                ))}
              </div>
              <div style={{ textAlign: "center" }}>
                <Typography variant="h4">{data.total_instances}</Typography>
                <Typography variant="body2">Total Virtual Machines</Typography>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    gap: "20px",
                    marginTop: "20px",
                  }}
                >
                  {[
                    { label: "vCPU", usage: vcpuUsage },
                    { label: "RAM", usage: memoryUsage },
                  ].map((gauge, idx) => (
                    <div key={idx} style={{ textAlign: "center" }}>
                      <Typography variant="body2">{gauge.label}</Typography>
                      <RadialBarChart
                        width={150}
                        height={80}
                        innerRadius="70%"
                        outerRadius="100%"
                        startAngle={180}
                        endAngle={0}
                        data={createGaugeData(Number(gauge.usage))}
                      >
                        <PolarAngleAxis
                          type="number"
                          domain={[0, 100]}
                          angleAxisId={0}
                          tick={false}
                        />
                        <RadialBar
                          minAngle={15}
                          background
                          clockWise
                          dataKey="value"
                          cornerRadius={5}
                        />
                      </RadialBarChart>
                      <Typography variant="h7">{gauge.usage}%</Typography>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </Grid2>

      <Grid2 item xs={12} sm={12} md={6} lg={6} xl={6}>
        <Card
          sx={{
            padding: 1,
            height: "100%",
            width: "100%",
            borderRadius: 4,
            boxShadow: 6,
          }}
        >
          <CardContent>
            <Typography variant="h6">
              Platform As Service (Kubernetes)
            </Typography>
            <Grid2
              container
              spacing={4}
              sx={{ marginTop: 2, justifyContent: "center" }}
            >
              <Grid2 item xs={6} sm={3}>
                <GradientCircularStat
                  value={k8sData.daemonsets || 0}
                  label="DaemonSets"
                  gradientId="grad1"
                />
              </Grid2>
              <Grid2 item xs={6} sm={3}>
                <GradientCircularStat
                  value={k8sData.pods || 0}
                  label="Pods"
                  gradientId="grad2"
                />
              </Grid2>
              <Grid2 item xs={6} sm={3}>
                <GradientCircularStat
                  value={k8sData.deployments || 0}
                  label="Deployments"
                  gradientId="grad3"
                />
              </Grid2>
              <Grid2 item xs={6} sm={3}>
                <GradientCircularStat
                  value={k8sData.replicasets || 0}
                  label="ReplicaSets"
                  gradientId="grad4"
                />
              </Grid2>
            </Grid2>
          </CardContent>
        </Card>
      </Grid2>
      {/* Second row - Three cards */}
      {/* {[
        { title: "AWS", stats: ["Running: 4 EC2 Instances", "Stopped: 0 EC2 Instances"] },
        { title: "Microsoft", stats: ["Running: 7 VM Instances", "Stopped: 0 VM Instances", "Disk: 300 GB"] },
        { title: "Oracle", stats: ["Running: 7 VM Instances", "Stopped: 0 VM Instances", "Disk: 300 GB"] },
      ].map((cloud, index) => (
        <Grid2 item xs={4} key={index}>
          <Card sx={{ padding: 2 , height: 200, minWidth:600}}>
            <CardContent>
              <Typography variant="h6">{cloud.title}</Typography>
              {cloud.stats.map((stat, i) => (
                <Typography key={i} variant="body2">{stat}</Typography>
              ))}
            </CardContent>
          </Card>
        </Grid2>
      ))} */}
      <Grid2 item xs={12} sm={12} md={6} lg={6} xl={6}>
        <Card
          sx={{
            padding: 2,
            height: "100%",
            minWidth: 450,
            borderRadius: 4,
            boxShadow: 6,
          }}
        >
          <CardContent>
            <Typography variant="h6">Recently Discoverd VMs</Typography>
            <Typography variant="body2">VMs: 0</Typography>
            <Typography variant="body2">Today: 0</Typography>
            <Typography variant="body2">This Week: 0</Typography>
          </CardContent>
        </Card>
      </Grid2>

      {/* Third row - Three cards */}
      <Grid2 item xs={12} sm={12} md={6} lg={6} xl={6}>
        <Card
          sx={{
            height: "auto",
            width: "100%",
            borderRadius: 4,
            boxShadow: 6,
            p: 2,
            // minWidth: 700,
            // background: "linear-gradient(145deg, #f0faff, #ffffff)",
          }}
        >
          <CardContent>
            <Typography variant="h6" gutterBottom>
              🎫 Ticket Overview
            </Typography>
            {/* <Divider sx={{ mb: 2 }} /> */}

            {loading ? (
              <Box
                display="flex"
                justifyContent="center"
                alignItems="center"
                height={100}
              >
                <CircularProgress />
              </Box>
            ) : (
              <Stack direction="row" spacing={4}>
                {/* Chart */}
                <Box sx={{ width: "50%", height: 320 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart
                      cx="50%"
                      cy="50%"
                      innerRadius="30%"
                      outerRadius="100%"
                      barSize={18}
                      data={radialData}
                    >
                      <PolarAngleAxis
                        type="number"
                        domain={[0, Math.max(summary.total, 10)]}
                        angleAxisId={0}
                        tick={false}
                      />
                      <RadialBar
                        background
                        dataKey="value"
                        cornerRadius={10}
                        label={({ index }) =>
                          `${radialData[index].name}: ${radialData[index].value}`
                        }
                      />
                      <Tooltip content={<CustomTooltip />} />
                    </RadialBarChart>
                  </ResponsiveContainer>
                </Box>

                {/* Stats */}
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                  }}
                >
                  <Typography variant="h5" sx={{ mb: 2 }}>
                    🟣 Total Tickets: {summary.total}
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 1 }}>
                    🔵 <strong>Open:</strong> {summary.open}
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 1 }}>
                    🟡 <strong>In Progress:</strong> {summary.inProgress}
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 1 }}>
                    🟢 <strong>Closed:</strong> {summary.closed}
                  </Typography>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="body1">
                    🔴 <strong>Today:</strong> {summary.today}
                  </Typography>
                </Box>
              </Stack>
            )}
          </CardContent>
        </Card>
      </Grid2>

      <Grid2 item xs={12} sm={12} md={6} lg={6} xl={6}>
        <Card
          sx={{
            padding: 0,
            borderRadius: 4,
            boxShadow: 6,
            height: "100%",
            width: "100%",
          }}
        >
          <CardContent>
            <Typography variant="h6">Maintenance Calendar</Typography>
            <Box
              sx={{
                "& .react-calendar": {
                  backgroundColor: (theme) => theme.palette.background.paper,
                  color: (theme) => theme.palette.text.primary,
                  borderRadius: 2,
                  padding: 1,
                },
                "& .react-calendar__tile": {
                  color: (theme) => theme.palette.text.primary,
                },
                "& .react-calendar__navigation button": {
                  color: (theme) => theme.palette.text.primary,
                },
              }}
            >
              <Calendar onChange={handleDateChange} value={date} />
            </Box>
          </CardContent>
        </Card>
      </Grid2>

      <Grid2 item xs={12} sm={12} md={6} lg={6} xl={6}>
        <Card
          sx={{
            padding: 2,
            height: "100%",
            minWidth: 700,
            borderRadius: 4,
            boxShadow: 6,
          }}
        >
          <CardContent>
            <Typography variant="h6">Alerts</Typography>
            <Typography variant="body2">VMs: 0</Typography>
            <Typography variant="body2">PDUs: 0</Typography>
            <Typography variant="body2">Switches: 0</Typography>
          </CardContent>
        </Card>
      </Grid2>
    </Grid2>
  );
};

export default Dashboard;

// <Grid2 item xs={12} sm={12} md={6} lg={6} xl={6}>
//         <Card sx={{ padding: 1, height: "100%", width: "100%", borderRadius: 4,
//           boxShadow: 6,}}>
//           <CardContent>
//             <Typography variant="h6">
//               Platform As Service (Kubernetes)
//             </Typography>
//             <Grid2
//               container
//               spacing={8}
//               sx={{ marginTop: 2, justifyContent: "center" }}
//             >
//               {/* DaemonSets */}
//               <Grid2 item xs={6} sm={3}>
//                 <Typography variant="body2" align="center">
//                   DaemonSets
//                 </Typography>
//                 <GaugeContainer
//                   width={200}
//                   height={150}
//                   startAngle={-110}
//                   endAngle={110}
//                   value={k8sData.daemonsets}
//                 >
//                   <GaugeReferenceArc />
//                   <GaugeValueArc />
//                   <GaugePointer />
//                 </GaugeContainer>
//                 <Typography variant="body2" align="center">
//                   <b>{k8sData.daemonsets}</b>
//                 </Typography>
//               </Grid2>

//               {/* Pods */}
//               <Grid2 item xs={6} sm={3}>
//                 <Typography variant="body2" align="center">
//                   Pods
//                 </Typography>
//                 <GaugeContainer
//                   width={200}
//                   height={150}
//                   startAngle={-110}
//                   endAngle={110}
//                   value={k8sData.pods}
//                 >
//                   <GaugeReferenceArc />
//                   <GaugeValueArc />
//                   <GaugePointer />
//                 </GaugeContainer>
//                 <Typography variant="body2" align="center">
//                   <b>{k8sData.pods}</b>
//                 </Typography>
//               </Grid2>

//               {/* Deployments */}
//               <Grid2 item xs={6} sm={3}>
//                 <Typography variant="body2" align="center">
//                   Deployments
//                 </Typography>
//                 <GaugeContainer
//                   width={200}
//                   height={150}
//                   startAngle={-110}
//                   endAngle={110}
//                   value={k8sData.deployments}
//                 >
//                   <GaugeReferenceArc />
//                   <GaugeValueArc />
//                   <GaugePointer />
//                 </GaugeContainer>
//                 <Typography variant="body2" align="center">
//                   <b>{k8sData.deployments}</b>
//                 </Typography>
//               </Grid2>

//               {/* ReplicaSets */}
//               <Grid2 item xs={6} sm={3}>
//                 <Typography variant="body2" align="center">
//                   ReplicaSets
//                 </Typography>
//                 <GaugeContainer
//                   width={200}
//                   height={150}
//                   startAngle={-110}
//                   endAngle={110}
//                   value={k8sData.replicasets}
//                 >
//                   <GaugeReferenceArc />
//                   <GaugeValueArc />
//                   <GaugePointer />
//                 </GaugeContainer>
//                 <Typography variant="body2" align="center">
//                   <b>{k8sData.replicasets}</b>
//                 </Typography>
//               </Grid2>
//             </Grid2>
//           </CardContent>
//         </Card>
//       </Grid2>

// DashboardPage.jsx
// import React, { useEffect, useState } from "react";
// import {
//   Box,
//   Typography,
//   Grid2,
//   Paper,
//   CircularProgress,
//   LinearProgress,
//   Divider,
//   Stack,
//   Avatar,
//   Card,
//   CardContent,
// } from "@mui/material";
// import {
//   RadialBarChart,
//   RadialBar,
//   PolarAngleAxis,
//   PieChart,
//   Pie,
//   Cell,
//   LineChart,
//   Line,
//   XAxis,
//   YAxis,
//   CartesianGrid,
//   Tooltip,
//   ResponsiveContainer
// } from 'recharts';
// import apiClient from "../Axios";
// import { isToday } from "date-fns";
// import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';

// const DashboardPage = () => {
//   const [overviewData, setOverviewData] = useState({});
//   const [k8sData, setK8sData] = useState({});
//   const [summary, setSummary] = useState({ total: 0, open: 0, inProgress: 0, closed: 0, today: 0 });
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     const fetchData = async () => {
//       try {
//         const response = await apiClient.get("overview");
//         setOverviewData(response.data);
//       } catch (error) {
//         console.error("Error fetching data:", error);
//       }
//     };
//     fetchData();
//   }, []);

//   useEffect(() => {
//     const fetchK8sData = async () => {
//       try {
//         const response = await apiClient.get("/k8s/workloadstati/");
//         setK8sData(response.data);
//       } catch (error) {
//         console.error("Error fetching Kubernetes data:", error);
//       }
//     };
//     fetchK8sData();
//   }, []);

//   useEffect(() => {
//     const fetchTickets = async () => {
//       try {
//         const response = await apiClient.get("/tickets/");
//         const data = response.data;
//         let open = 0,
//           inProgress = 0,
//           closed = 0,
//           today = 0;

//         data.forEach((ticket) => {
//           const status = ticket.status.toLowerCase();
//           if (status === "open") open++;
//           else if (status === "in progress") inProgress++;
//           else if (status === "closed") closed++;
//           if (isToday(new Date(ticket.created_at))) today++;
//         });

//         setSummary({
//           total: data.length,
//           open,
//           inProgress,
//           closed,
//           today,
//         });
//         setLoading(false);
//       } catch (error) {
//         console.error("Error fetching ticket data", error);
//         setLoading(false);
//       }
//     };
//     fetchTickets();
//   }, []);

//   const getBarColor = (value) => value > 80 ? 'red' : value > 50 ? 'orange' : 'green';

//   const createGaugeData = (usage) => [{ name: 'Usage', value: usage }];

//   const ticketPieData = [
//     { name: 'Open', value: summary.open },
//     { name: 'In Progress', value: summary.inProgress },
//     { name: 'Closed', value: summary.closed }
//   ];

//   const lineChartData = [
//     { name: 'Data 01', value: 30 },
//     { name: 'Data 02', value: 80 },
//     { name: 'Data 03', value: 40 },
//     { name: 'Data 04', value: 60 },
//     { name: 'Data 05', value: 100 },
//   ];

//   return (
//     <Box p={2} sx={{ backgroundColor: '#fff' }}>
//       <Grid2 container spacing={2}>
//         {/* OpenStack Overview */}
//         <Grid2 item xs={12} sm={12} md={6} lg={6} xl={6}>
//           <Card sx={{ p: 2, height: '100%',width:800, borderRadius: 4, boxShadow: 6 }}>
//             <CardContent>
//               <Typography variant="h6">Infrastructure-as-a-Service (OpenStack)</Typography>
//               <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between" mt={2}>
//                 <Box flex={1}>
//                   {[
//                     {
//                       label: "vCPU",
//                       value: ((overviewData.used_vcpus?.[0] || 0) / (overviewData.total_vcpus?.[0] || 1) * 100).toFixed(1),
//                       used: overviewData.used_vcpus,
//                       total: overviewData.total_vcpus,
//                     },
//                     {
//                       label: "RAM",
//                       value: ((overviewData.used_memory_mb?.[0] || 0) / (overviewData.total_memory_mb?.[0] || 1) * 100).toFixed(1),
//                       used: (overviewData.used_memory_mb?.[0] / 1024).toFixed(1),
//                       total: (overviewData.total_memory_mb?.[0] / 1024).toFixed(1),
//                     },
//                     {
//                       label: "Storage",
//                       value: ((overviewData.used_storage_gb || 0) / (overviewData.total_storage_gb || 1) * 100).toFixed(1),
//                       used: overviewData.used_storage_gb,
//                       total: overviewData.total_storage_gb,
//                     },
//                   ].map((stat, i) => (
//                     <Box key={i} mb={1}>
//                       <Typography variant="body2">{stat.label}</Typography>
//                       <Box sx={{ backgroundColor: '#ddd', height: 10, borderRadius: 4, overflow: 'hidden', my: 0.5 }}>
//                         <Box sx={{ width: `${stat.value}%`, height: '100%', backgroundColor: getBarColor(stat.value) }} />
//                       </Box>
//                       <Typography variant="caption">Used: <b>{stat.used}</b> Total: <b>{stat.total}</b></Typography>
//                     </Box>
//                   ))}
//                 </Box>
//                 <Box textAlign="center">
//                   <Typography variant="h4">{overviewData.total_instances}</Typography>
//                   <Typography variant="body2">Total Virtual Machines</Typography>
//                   <Stack direction="row" spacing={2} mt={2} justifyContent="center">
//                     {["vCPU", "RAM"].map((label, i) => {
//                       const usage = i === 0
//                         ? ((overviewData.used_vcpus?.[0] || 0) / (overviewData.total_vcpus?.[0] || 1) * 100).toFixed(1)
//                         : ((overviewData.used_memory_mb?.[0] || 0) / (overviewData.total_memory_mb?.[0] || 1) * 100).toFixed(1);
//                       return (
//                         <Box key={i} textAlign="center">
//                           <Typography variant="body2">{label}</Typography>
//                           <RadialBarChart
//                             width={100}
//                             height={80}
//                             innerRadius="70%"
//                             outerRadius="100%"
//                             startAngle={180}
//                             endAngle={0}
//                             data={createGaugeData(Number(usage))}
//                           >
//                             <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
//                             <RadialBar dataKey="value" minAngle={15} clockWise cornerRadius={5} fill="#82ca9d" />
//                           </RadialBarChart>
//                           <Typography variant="caption">{usage}%</Typography>
//                         </Box>
//                       );
//                     })}
//                   </Stack>
//                 </Box>
//               </Stack>
//             </CardContent>
//           </Card>
//         </Grid2>

//         {/* Kubernetes Card */}
//         <Grid2 item xs={12} md={6}>
//           <Card sx={{ p: 2, height: '100%',width:800, borderRadius: 4, boxShadow: 6 }}>
//             <CardContent>
//               <Typography variant="h6" gutterBottom>Kubernetes Resources</Typography>
//               <Grid2 container spacing={2}>
//                 {Object.entries(k8sData).map(([key, val], i) => (
//                   <Grid2 item xs={6} md={3} key={i}>
//                     <Box textAlign="center">
//                       <Avatar sx={{ bgcolor: '#1976d2', width: 56, height: 56, margin: 'auto', fontSize: 20 }}>{val}</Avatar>
//                       <Typography variant="body2" mt={1}>{key}</Typography>
//                     </Box>
//                   </Grid2>
//                 ))}
//               </Grid2>
//             </CardContent>
//           </Card>
//         </Grid2>

//         {/* Ticket Pie / Calendar / Line Chart */}
//         <Grid2 item xs={12} md={4}>
//           <Card sx={{ p: 2, height: '100%',width:500, borderRadius: 4, boxShadow: 6 }}>
//             <Typography variant="h6" gutterBottom>Tickets Overview</Typography>
//             <ResponsiveContainer width="100%" height={200}>
//               <PieChart>
//                 <Pie
//                   data={ticketPieData}
//                   cx="50%"
//                   cy="50%"
//                   labelLine={false}
//                   outerRadius={70}
//                   dataKey="value"
//                 >
//                   {ticketPieData.map((_, index) => (
//                     <Cell key={`cell-${index}`} fill={["#8884d8", "#82ca9d", "#ffc658"][index % 3]} />
//                   ))}
//                 </Pie>
//               </PieChart>
//             </ResponsiveContainer>
//           </Card>
//         </Grid2>

//         <Grid2 item xs={12} md={4}>
//           <Card sx={{ p: 2, height: '100%', borderRadius: 4, boxShadow: 6 }}>
//             <Stack direction="row" alignItems="center" spacing={1} mb={2}>
//               <CalendarMonthIcon />
//               <Typography variant="h6">Calendar</Typography>
//             </Stack>
//             <Box display="grid" gridTemplateColumns="repeat(7, 1fr)" gap={1}>
//               {[...Array(31)].map((_, i) => (
//                 <Paper key={i} elevation={1} sx={{ width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", bgcolor: i === new Date().getDate() - 1 ? "primary.main" : "grey.100", color: i === new Date().getDate() - 1 ? "#fff" : "inherit" }}>{i + 1}</Paper>
//               ))}
//             </Box>
//           </Card>
//         </Grid2>

//         <Grid2 item xs={12} md={4}>
//           <Card sx={{ p: 2, height: '100%', borderRadius: 4, boxShadow: 6 }}>
//             <Typography variant="h6" gutterBottom>Performance Trend</Typography>
//             <ResponsiveContainer width="100%" height={200}>
//               <LineChart data={lineChartData}>
//                 <CartesianGrid strokeDasharray="3 3" />
//                 <XAxis dataKey="name" />
//                 <YAxis />
//                 <Tooltip />
//                 <Line type="monotone" dataKey="value" stroke="#8884d8" strokeWidth={2} dot={{ r: 4 }} />
//               </LineChart>
//             </ResponsiveContainer>
//           </Card>
//         </Grid2>
//       </Grid2>
//     </Box>
//   );
// };

// export default DashboardPage;

// import React ,{ useEffect, useState } from "react";
// import Cardone from "../Components/Cardone";
// import { RadialBarChart, RadialBar, PolarAngleAxis } from "recharts";
// import Calendar from 'react-calendar';
// import 'react-calendar/dist/Calendar.css';
// import { Card, CardContent, Typography } from '@mui/material';
// import apiClient from "../Axios";
// import "./Dashboard.css";

// const Dashboard = () => {
//   const [data, setData] = useState({
//     total_instances: 0,
//     total_vcpus: 0,
//     used_vcpus: 0,
//     total_memory_mb: 0,
//     used_memory_mb: 0,
//     total_storage_gb: 0,
//     used_storage_gb: 0,
//   });
//   const [date, setDate] = useState(new Date());

//   const handleDateChange = (newDate) => {
//     setDate(newDate);
//   };

//   useEffect(() => {

//     const fetchData = async () => {
//       try {
//         const response = await apiClient.get("overview");

//         setData(response.data);
//       } catch (error) {
//         console.error("Error fetching data:", error);
//       }
//     };
//     fetchData();
//   }, []);

//   // Calculate usage percentages
//   const vcpuUsage = ((data.used_vcpus / data.total_vcpus) * 100).toFixed(1);
//   const memoryUsage = ((data.used_memory_mb / data.total_memory_mb) * 100).toFixed(1);
//   const storageUsage = ((data.used_storage_gb / data.total_storage_gb) * 100).toFixed(1);

//   // Determine bar color based on usage
//   const getBarColor = (usage) => {
//     if (usage > 80) return "#ff4d4f"; // Red for critical
//     if (usage > 60) return "#faad14"; // Orange for warning
//     return "#4caf50"; // Green for normal
//   };

//   // Create half-gauge chart data
//   const createGaugeData = (usage) => [
//     { value: usage, fill: getBarColor(usage) },
//     { value: 100 - usage, fill: "#ddd" }, // Remaining portion
//   ];

//   return (
//     <div className="dashboard">
//       <div className="dashboard-content">
//         {/* Top Section */}
//     <div className="row">
//     <div className="dashboard-card">
//   <h3>Infrastructure-as-a-Service (Openstack)</h3>

//   <div className="section">

//      {/* Stats Section */}
//      <div className="stats">
//       {/* CPU */}
//       <div className="stat">
//         <p>vCPU</p>
//         <div className="bar">
//           <span
//             className="bar-filled"
//             style={{
//               width: ${vcpuUsage}%,
//               backgroundColor: getBarColor(vcpuUsage),
//             }}
//           ></span>
//         </div>
//         <p>
//           Used: <b>{data.used_vcpus} vCPU</b> Total: <b>{data.total_vcpus} vCPU</b>
//         </p>
//       </div>
//       {/* RAM */}
//       <div className="stat">
//         <p>RAM</p>
//         <div className="bar">
//           <span
//             className="bar-filled"
//             style={{
//               width: ${memoryUsage}%,
//               backgroundColor: getBarColor(memoryUsage),
//             }}
//           ></span>
//         </div>
//         <p>
//           Used: <b>{(data.used_memory_mb / 1024).toFixed(1)} GB</b> Total:{" "}
//           <b>{(data.total_memory_mb / 1024).toFixed(1)} GB</b>
//         </p>
//       </div>
//       {/* Storage */}
//       <div className="stat">
//         <p>Storage</p>
//         <div className="bar">
//           <span
//             className="bar-filled"
//             style={{
//               width: ${storageUsage}%,
//               backgroundColor: getBarColor(storageUsage),
//             }}
//           ></span>
//         </div>
//         <p>
//           Used: <b>{data.used_storage_gb} GB</b> Total: <b>{data.total_storage_gb} GB</b>
//         </p>
//       </div>
//     </div>

//     <div className="gauges-section">
//        {/* Total Instances Info */}
//     <div className="instances-info">
//       <h2>{data.total_instances}</h2>
//       <h5>Total Virtual Machines </h5>
//     </div>
//     {/* Half-Gauge Charts */}
//     <div className="gauges">
//       {/* vCPU Half-Gauge */}
//       <div className="gauge-container">
//         <h5>vCPU</h5>
//         <RadialBarChart
//           width={150}
//           height={80}
//           innerRadius="70%"
//           outerRadius="100%"
//           startAngle={180}
//           endAngle={0}
//           data={createGaugeData(Number(vcpuUsage))}
//         >
//           <PolarAngleAxis
//             type="number"
//             domain={[0, 100]}
//             angleAxisId={0}
//             tick={false}
//           />
//           <RadialBar
//             minAngle={15}
//             background
//             clockWise
//             dataKey="value"
//             cornerRadius={5}
//           />
//         </RadialBarChart>
//         <p>
//           {vcpuUsage}% ({data.used_vcpus}/{data.total_vcpus} vCPU)
//         </p>
//       </div>

//       {/* RAM Half-Gauge */}
//       <div className="gauge-container">
//         <h5>RAM</h5>
//         <RadialBarChart
//           width={150}
//           height={80}
//           innerRadius="70%"
//           outerRadius="100%"
//           startAngle={180}
//           endAngle={0}
//           data={createGaugeData(Number(memoryUsage))}
//         >
//           <PolarAngleAxis
//             type="number"
//             domain={[0, 100]}
//             angleAxisId={0}
//             tick={false}
//           />
//           <RadialBar
//             minAngle={15}
//             background
//             clockWise
//             dataKey="value"
//             cornerRadius={5}
//           />
//         </RadialBarChart>
//         <p>
//           {memoryUsage}% (
//           {(data.used_memory_mb / 1024).toFixed(1)}/
//           {(data.total_memory_mb / 1024).toFixed(1)} GB)
//         </p>
//       </div>
//     </div>

//    </div>
//   </div>
// </div>
//     <Cardone
//             title="Platform As Service (Kubernetes)"
//             stats={[
//               { label: "vCPU", value: "Available: 9 vCPU" },
//               { label: "RAM", value: "Configured: 10 GB, Allocated: 16 GB" },
//               { label: "Storage", value: "Available: 941 GB" },
//             ]}
//             chartData={[
//               { value: 36, fill: "#faad14" },
//               { value: 64, fill: "#ddd" },
//             ]}
//             type="large"
//           />
//         </div>

//         {/* Second Section */}
//         <div className="row">
//           <Cardone
//             title="AWS"
//             stats={[
//               { label: "Running", value: "4 EC2 Instances" },
//               { label: "Stopped", value: "0 EC2 Instances" },
//             ]}
//             type="medium"
//           />
//           <Cardone
//             title="Microsoft"
//             stats={[
//               { label: "Running", value: "7 VM Instances" },
//               { label: "Stopped", value: "0 VM Instances" },
//               { label: "Disk", value: "300 GB" },
//             ]}
//             type="medium"
//           />
//            <Cardone
//             title="Oracle"
//             stats={[
//               { label: "Running", value: "7 VM Instances" },
//               { label: "Stopped", value: "0 VM Instances" },
//               { label: "Disk", value: "300 GB" },
//             ]}
//             type="medium"
//           />
//         </div>

//         {/* Bottom Section */}
//         <div className="row">
//           <Cardone
//             title="Devices Under Management - 166"
//             stats={[
//               { label: "Servers", value: "3 Up" },
//               { label: "Switches", value: "11 Down" },
//               { label: "Load Balancers", value: "8 Not Configured" },
//             ]}
//             type="wide"
//           />
//           <Card sx={{ minWidth: 275, padding: 2 }}>
//       <CardContent>
//         <Typography variant="h6" gutterBottom>
//           Maintenance Calendar
//         </Typography>
//         <Calendar
//           onChange={handleDateChange}
//           value={date}
//         />
//       </CardContent>
//     </Card>
//           <Cardone
//             title="Alerts"
//             stats={[
//               { label: "VMs", value: "0" },
//               { label: "PDUs", value: "0" },
//               { label: "Switches", value: "0" },
//             ]}
//             type="wide"
//           />
//         </div>
//       </div>
//     </div>
//   );
// };
// export default DashboardPage;
