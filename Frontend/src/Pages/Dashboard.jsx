import React, { useEffect, useState, useMemo } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Stack,
  Avatar,
  IconButton,
  Divider,
  useTheme,
} from "@mui/material";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Tooltip as ReTooltip,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from "recharts";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { motion } from "framer-motion";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import CloudIcon from '@mui/icons-material/Cloud';
// import CheckCircleIcon from "@mui/icons-material/CheckCircle";
// import StorageIcon from "@mui/icons-material/Storage";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import apiClient from "../Axios";
import dayjs from "dayjs";
import isToday from "dayjs/plugin/isToday";
dayjs.extend(isToday);
import "./Dashboard.css";
/* ------------------ Small helpers & styles ------------------ */

const GlassCard = ({ children, sx = {}, ...rest }) => (
  <Card
    elevation={0}
    className="glass-card"
    sx={{
      borderRadius: 3,
      overflow: "visible",
      backdropFilter: "blur(8px) saturate(120%)",
      background:
        "linear-gradient(135deg, rgba(255,255,255,0.55), rgba(255,255,255,0.18))",
      boxShadow: "0 6px 30px rgba(12,12,40,0.08)",
      border: "1px solid rgba(255,255,255,0.16)",
      ...sx,
    }}
    {...rest}
  >
    {children}
  </Card>
);

const StatTile = ({ icon, title, value, sparkData = [], delta, color }) => {
  // Prepare sparkData for Recharts (array of {value})
  const chartData = sparkData.length
    ? sparkData.map((v, i) => ({ x: i, value: v }))
    : Array.from({ length: 12 }).map((_, i) => ({
        x: i,
        value: Math.round(Math.random() * (value || 10)),
      }));

  return (
    <GlassCard sx={{ p: 1.5, height: "100%" }}>
      <Stack spacing={1}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Avatar sx={{ bgcolor: color || "#eee", width: 44, height: 44 }}>
            {icon}
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography variant="caption" color="text.secondary">
              {title}
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>
              {value}
            </Typography>
          </Box>
          {delta && (
            <Typography
              variant="body2"
              sx={{
                color: delta.startsWith("+") ? "success.main" : "error.main",
                fontWeight: 700,
              }}
            >
              {delta}
            </Typography>
          )}
        </Stack>

        {/* Sparkline */}
        <Box sx={{ width: "100%", height: 44 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <ReTooltip
                contentStyle={{
                  background: "rgba(255,255,255,0.9)",
                  border: "none",
                  boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
                }}
                cursor={false}
              />
              <Area
                dataKey="value"
                type="monotone"
                stroke="rgba(124,77,255,0.95)"
                strokeWidth={2}
                fill="rgba(124,77,255,0.12)"
                dot={false}
                isAnimationActive={true}
                animationDuration={800}
              />
            </AreaChart>
          </ResponsiveContainer>
        </Box>
      </Stack>
    </GlassCard>
  );
};

/* ------------------ Segmented Radial Gauge (choice 3) ------------------ */
/* Draws N segments in an arc from startAngle -> endAngle and fills proportionally.
   value: 0-100, segments: integer, thickness: stroke width.
*/
function SegmentedGauge({
  value = 75,
  size = 140,
  segments = 20,
  thickness = 14,
  startAngle = -140,
  endAngle = 140,
}) {
  // clamp
  const v = Math.max(0, Math.min(100, value));
  const filledSegments = (v / 100) * segments; // may be fractional

  const cx = size / 2;
  const cy = size / 2;
  const radius = (size - thickness) / 2;

  // convert polar to cartesian for arc path
  const polarToCartesian = (centerX, centerY, radius, angleInDegrees) => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
      x: centerX + radius * Math.cos(angleInRadians),
      y: centerY + radius * Math.sin(angleInRadians),
    };
  };

  // create arc path for segment from angleA -> angleB
  const arcPath = (angleA, angleB) => {
    const start = polarToCartesian(cx, cy, radius, angleB);
    const end = polarToCartesian(cx, cy, radius, angleA);
    const largeArcFlag = Math.abs(angleB - angleA) <= 180 ? "0" : "1";
    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
  };

  const totalAngle = endAngle - startAngle;
  const anglePerSeg = totalAngle / segments;
  const gaugeSegments = [];

  for (let i = 0; i < segments; i++) {
    const segStart = startAngle + i * anglePerSeg;
    const segEnd = segStart + anglePerSeg * 0.9; // small gap between segments
    const fillRatio = Math.max(0, Math.min(1, filledSegments - i)); // 1 = full, 0 partial/none
    // Colors: gradient from teal -> blue -> purple -> pink
    const color =
      fillRatio >= 1
        ? segmentColor(i / segments)
        : fillRatio > 0
        ? interpolateColor(i / segments, fillRatio)
        : "#e6e9ee";
    gaugeSegments.push({ d: arcPath(segStart, segEnd), color, fillRatio });
  }

  return (
    <Box
      sx={{
        width: size,
        height: size,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* background ring (faint) */}
        <g strokeLinecap="round" strokeWidth={thickness} fill="none">
          {gaugeSegments.map((seg, idx) => (
            <path
              key={idx}
              d={seg.d}
              stroke={seg.color}
              opacity={seg.fillRatio > 0 ? 1 : 0.22}
            />
          ))}
        </g>

        {/* center text */}
        <g>
          <text
            x={cx}
            y={cy - 6}
            textAnchor="middle"
            fontSize={18}
            fontWeight={800}
            fill="#0b0f13"
          >
            {Math.round(v)}%
          </text>
          <text
            x={cx}
            y={cy + 16}
            textAnchor="middle"
            fontSize={11}
            fill="#6b7280"
          >
            System Health
          </text>
        </g>
      </svg>
    </Box>
  );
}

/* color helpers: create a multi-stop gradient */
function segmentColor(t) {
  // t in [0,1] -> returns color across a palette
  const stops = [
    { p: 0.0, c: [50, 222, 212] }, // teal
    { p: 0.4, c: [59, 158, 255] }, // blue
    { p: 0.7, c: [159, 95, 255] }, // purple
    { p: 1.0, c: [240, 89, 168] }, // pink
  ];
  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i],
      b = stops[i + 1];
    if (t >= a.p && t <= b.p) {
      const local = (t - a.p) / (b.p - a.p);
      const r = Math.round(a.c[0] + (b.c[0] - a.c[0]) * local);
      const g = Math.round(a.c[1] + (b.c[1] - a.c[1]) * local);
      const bl = Math.round(a.c[2] + (b.c[2] - a.c[2]) * local);
      return `rgb(${r},${g},${bl})`;
    }
  }
  return "rgb(159,95,255)";
}
function interpolateColor(t, fillRatio) {
  // lighten color for partial fill (use segmentColor for base, then blend with white by (1-fillRatio))
  const base = parseRGB(segmentColor(t));
  const blend = (c) => Math.round(c + (255 - c) * (1 - fillRatio) * 0.55);
  return `rgb(${blend(base.r)},${blend(base.g)},${blend(base.b)})`;
}
function parseRGB(rgbStr) {
  const m = rgbStr.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (!m) return { r: 160, g: 100, b: 200 };
  return { r: +m[1], g: +m[2], b: +m[3] };
}

/* ------------------ Main Dashboard ------------------ */

export default function Dashboard() {
  const theme = useTheme();
  const [overview, setOverview] = useState({
    total_instances: 0,
    total_vcpus: 0,
    used_vcpus: 0,
    total_memory_mb: 0,
    used_memory_mb: 0,
    total_storage_gb: 0,
    used_storage_gb: 0,
    
  });
  // const [vmRequests, setVmRequests] = useState([]);
  const [openstackReq, setOpenstackReq] = useState({
    total: 0,
    pending: 0,
    accepted: 0,
    rejected: 0,
    today: 0,
    raw: [] 
  });
  const [k8sReq, setK8sReq] = useState({
    total: 0,
    pending: 0,
    accepted: 0,
    rejected: 0,
    today: 0,
    raw: [] 
  });
  const [k8sData, setK8sData] = useState({
    daemonsets: 0,
    pods: 0,
    deployments: 0,
    replicasets: 0,
  });
  const [ticketsSummary, setTicketsSummary] = useState({
    total: 0,
    open: 0,
    inProgress: 0,
    closed: 0,
    today: 0,
  });

  const [date, setDate] = useState(new Date());

  // Fetch overview (your /overview)
  useEffect(() => {
    (async () => {
      try {
        const resp = await apiClient.get("/overview/");
        setOverview(resp.data || {});
      } catch (e) {
        console.error("overview err", e);
      }
    })();
  }, []);

  // OpenStack requests
  useEffect(() => {
  (async () => {
    try {
      const res = await apiClient.get("/vmdetails/overview/?page=1&size=500");
      const data = res.data;

      const todayCount =
        data.data?.filter((vm) => dayjs(vm.created_at).isToday()).length || 0;

      setOpenstackReq({
        total: data.total_records || 0,
        pending: data.status_counts?.pending || 0,
        accepted: data.status_counts?.accepted || 0,
        rejected: data.status_counts?.rejected || 0,
        today: todayCount,
        raw: data.data || []
      });
    } catch (err) {
      console.error("OS Overview Error:", err);
    }
  })();
}, []);

 

  // K8s service requests
  // Kubernetes Service Requests (Pending etc.)
useEffect(() => {
  (async () => {
    try {
      const res = await apiClient.get("/service-requests/");
      const data = res.data;
      const records = data.data || [];

      setK8sReq({
        total: data.totalRecords || 0,
        pending: records.filter(r => r.admin_status === "Pending").length,
        accepted: records.filter(r => r.admin_status === "Accepted").length,
        rejected: records.filter(r => r.admin_status === "Rejected").length,
        today: records.filter(r => dayjs(r.request_timestamp).isToday()).length,
        raw: records
      });

    } catch (err) {
      console.error("K8s Service Requests Error:", err);
    }
  })();
}, []);




  // useEffect(() => {
  //   (async () => {
  //     try {
  //       const res = await apiClient.get("/service-requests/");
  //       const records = res.data.data || [];
  //       setK8sReq({
  //         total: records.length,
  //         pending: records.filter((r) => r.admin_status === "Pending").length,
  //         accepted: records.filter((r) => r.admin_status === "Accepted").length,
  //         rejected: records.filter((r) => r.admin_status === "Rejected").length,
  //         today: records.filter((r) => dayjs(r.request_timestamp).isToday())
  //           .length,
  //       });
  //     } catch (err) {
  //       console.error("K8s Overview Error:", err);
  //     }
  //   })();
  // }, []);

  // K8s workload stats
  useEffect(() => {
    (async () => {
      try {
        const resp = await apiClient.get("/k8s/workloadstati/");
        setK8sData(resp.data || {});
      } catch (e) {
        console.error("k8s data err", e);
      }
    })();
  }, []);

  // Tickets
  useEffect(() => {
    (async () => {
      try {
        const response = await apiClient.get("/tickets/");
        const data = response.data || [];
        let open = 0,
          inProgress = 0,
          closed = 0,
          today = 0;
        data.forEach((t) => {
          const s = (t.status || "").toLowerCase();
          if (s === "open") open++;
          if (s === "in progress") inProgress++;
          if (s === "closed") closed++;
          if (dayjs(t.created_at).isToday()) today++;
        });
        setTicketsSummary({
          total: data.length,
          open,
          inProgress,
          closed,
          today,
        });
      } catch (err) {
        console.error("tickets err", err);
      }
    })();
  }, []);

  // quick composite health metric (example: weighted)
  const systemHealth = useMemo(() => {
    // simple algorithm: more accepted and lower pending = better
    const total = openstackReq.total + k8sReq.total || 1;
    const acceptRatio =
      (openstackReq.accepted + k8sReq.accepted) / Math.max(1, total);
    const pendingPenalty = Math.min(
      1,
      (openstackReq.pending + k8sReq.pending) / Math.max(1, total)
    );
    return Math.round(acceptRatio * 100 * (1 - pendingPenalty * 0.45));
  }, [openstackReq, k8sReq]);

  const smallMotion = {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.45 },
  };
const getDailyPendingTrend = (data = []) => {
  const days = 7;
  const counts = Array(days).fill(0);
  const today = new Date();

  data.forEach(req => {
    if (req.admin_status === "Pending") {

      const timestamp = req.request_timestamp || req.created_at;
      if (!timestamp) return;

      const reqDate = new Date(timestamp);
      const diff = Math.floor((today - reqDate) / (1000 * 60 * 60 * 24));

      if (diff >= 0 && diff < days) {
        counts[days - 1 - diff] += 1;
      }
    }
  });

  return counts;
};


const openstackPendingTrend = getDailyPendingTrend(openstackReq.raw );
const k8sPendingTrend = getDailyPendingTrend(k8sReq.raw);

  // Calculate usage percentages
  const vcpuUsage = (
    (overview.used_vcpus / overview.total_vcpus) *
    100
  ).toFixed(1);
  const memoryUsage = (
    (overview.used_memory_mb / overview.total_memory_mb) *
    100
  ).toFixed(1);
  const storageUsage = (
    (overview.used_storage_gb / overview.total_storage_gb) *
    100
  ).toFixed(1);

  // Determine bar color based on usage
  const getBarColor = (usage) => {
    usage = Number(usage) || 0;
    if (usage > 80) return "#ef5350"; // Red for critical
    if (usage > 60) return "#ffa726"; // Orange for warning
    return "#66bb6a"; // Green for normal
  };

  // Create half-gauge chart data
  const createGaugeData = (usage) => [
    { value: usage, fill: getBarColor(usage) },
    { value: 100 - usage, fill: "#ddd" }, // Remaining portion
  ];

  return (
    <Box sx={{ width: "100%", p: { xs: 2, sm: 3, md: 4 } }}>
      {/* Header */}
      <Stack
        direction={{ xs: "column", md: "row" }}
        justifyContent="space-between"
        alignItems="center"
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>
            Admin Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Platform summary • updated {dayjs().format("DD MMM YYYY, HH:mm")}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <IconButton aria-label="notifications" size="large">
            <HourglassEmptyIcon />
          </IconButton>
        </Stack>
      </Stack>

      {/* Top tiles (sparklines) */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6} md={3}>
          <motion.div {...smallMotion}>
         <StatTile
  icon={<HourglassEmptyIcon />}
  title="OpenStack Pending"
  value={openstackReq.pending}
  sparkData={openstackPendingTrend}
  delta={openstackReq.pending > 0 ? "+2%" : "-"}
  color="var(--openstack-color)"
  badge="OPENSTACK"
/>
          </motion.div>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <motion.div {...smallMotion} transition={{ delay: 0.05 }}>
             <StatTile
      icon={<CloudIcon />} // choose icon of Kubernetes style
      title="K8s Pending"
      value={k8sReq.pending}
      sparkData={k8sPendingTrend}
      delta={k8sReq.pending > 0 ? "+1%" : "-"}
      color="var(--k8s-color)" // e.g. Blue
      badge="KUBERNETES"
    />
          </motion.div>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <motion.div {...smallMotion} transition={{ delay: 0.1 }}>
            <GlassCard
              sx={{
                p: 2,
                height: "100%", // keeps consistent height with neighbors
                display: "flex",
                flexDirection: "row",
              }}
            >
              {/* Title aligned like other tiles */}
              <Box sx={{ alignItems: "center", mb: 0 }}>
                <Typography
                  variant="subtitle2"
                  sx={{ fontWeight: 600, flexGrow: 1 }}
                >
                  System Health
                </Typography>
              </Box>

              {/* Gauge centered */}
              <Box
                sx={{
                  display: "flex",
                  flexGrow: 1,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <SegmentedGauge
                  value={systemHealth}
                  size={100} // tuned to match tile dimensions
                  segments={22}
                  thickness={10}
                />
              </Box>
            </GlassCard>
          </motion.div>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <motion.div {...smallMotion} transition={{ delay: 0.15 }}>
            <StatTile
              icon={<TrendingUpIcon />}
              title="Tickets Open"
              value={ticketsSummary.open}
              // sparkData={exampleSpark(ticketsSummary.open)}
              delta={`${ticketsSummary.today} today`}
              color="#D1C4E9"
            />
          </motion.div>
        </Grid>
      </Grid>

      {/* Middle row: Segmented Gauge + Activity list + Compact Calendar */}
      <Grid container spacing={2} alignItems="stretch">
        {/* Infrastructure-as-a-Service (OpenStack) */}

        <Grid item xs={12} sm={12} md={5}>
          <GlassCard
            className="glass-card"
            sx={{
              p: 2,
              height: "100%",
              width: "100%",
              borderRadius: 3,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              boxShadow: "0 8px 28px rgba(6, 8, 35, 0.08)",
            }}
          >
            <Typography variant="h6" sx={{ mb: 1 }}>
              Infrastructure-as-a-Service (OpenStack)
            </Typography>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: "10px",
                marginLeft: 50,
              }}
            >
              {/* Left Bars */}
              <div style={{ width: 300, marginTop: 6 }}>
                {[
                  {
                    label: "vCPU",
                    value: Number(vcpuUsage),
                    used: overview.used_vcpus,
                    total: overview.total_vcpus,
                  },
                  {
                    label: "RAM",
                    value: Number(memoryUsage),
                    used: (overview.used_memory_mb / 1024).toFixed(1),
                    total: (overview.total_memory_mb / 1024).toFixed(1),
                  },
                  {
                    label: "Storage",
                    value: Number(storageUsage),
                    used: overview.used_storage_gb,
                    total: overview.total_storage_gb,
                  },
                ].map((stat, index) => (
                  <div key={index} className="stat-item">
                    <Typography variant="body2" className="stat-label">
                      {stat.label}
                    </Typography>

                    {/* Animated Progress Bar with Tooltip */}
                    <div className="bar" title={`${stat.value}%`}>
                      <span
                        className="bar-fill"
                        title={`${isNaN(stat.value) ? 0 : stat.value}%`}
                        style={{
                          width: `${isNaN(stat.value) ? 0 : stat.value}%`,
                          backgroundColor: getBarColor(Number(stat.value)),
                        }}
                      />
                    </div>

                    <Typography className="stat-text">
                      <b>{stat.used}</b> Used / <b>{stat.total}</b> Total
                    </Typography>
                  </div>
                ))}
              </div>

              {/* Right Mini Gauges */}
              <div
                style={{
                  textAlign: "center",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  {overview.total_instances}
                </Typography>
                <Typography variant="caption">Total VMs</Typography>

                <div className="gauges">
                  {[
                    { label: "vCPU", usage: Number(vcpuUsage) },
                    { label: "RAM", usage: Number(memoryUsage) },
                  ].map((gauge, idx) => (
                    <div key={idx} className="gauge-container">
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {gauge.label}
                      </Typography>
                      <RadialBarChart
                        width={120}
                        height={90}
                        innerRadius="75%"
                        outerRadius="105%"
                        startAngle={180}
                        endAngle={0}
                        data={createGaugeData(gauge.usage)}
                      >
                        <PolarAngleAxis
                          domain={[0, 100]}
                          tick={false}
                          type="number"
                        />
                        <RadialBar
                          cornerRadius={6}
                          dataKey="value"
                          clockWise
                          animationDuration={1300}
                        />
                      </RadialBarChart>

                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        {gauge.usage}%
                      </Typography>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </GlassCard>
        </Grid>

        {/* Kubernetes service */}

        <Grid item xs={12} sm={12} md={4}>
          <GlassCard
            className="glass-card"
            sx={{
              p: 2,
              height: "100%",
              borderRadius: 3,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              boxShadow: "0 8px 28px rgba(6, 8, 35, 0.08)",
            }}
          >
            <Typography variant="h6" sx={{ mb: 2 }}>
              Kubernetes Workloads
            </Typography>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 66,
              }}
            >
              {/* Donut Chart */}
              <PieChart width={200} height={200}>
                <Pie
                  data={[
                    { name: "DaemonSets", value: k8sData.daemonsets || 0 },
                    { name: "Deployments", value: k8sData.deployments || 0 },
                    { name: "Pods", value: k8sData.pods || 0 },
                    { name: "ReplicaSets", value: k8sData.replicasets || 0 },
                  ]}
                  dataKey="value"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={3}
                  animationDuration={1200}
                  labelLine={false}
                >
                  <Cell fill="#FFD580" /> {/* DaemonSets */}
                  <Cell fill="#A4F3D1" /> {/* Deployments */}
                  <Cell fill="#90CAF9" /> {/* Pods */}
                  <Cell fill="#D1C4E9" /> {/* ReplicaSets */}
                </Pie>
                <Tooltip />
              </PieChart>

              {/* Quick Stats List */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  {
                    label: "DaemonSets",
                    val: k8sData.daemonsets,
                    color: "#FFD580",
                  },
                  {
                    label: "Deployments",
                    val: k8sData.deployments,
                    color: "#A4F3D1",
                  },
                  { label: "Pods", val: k8sData.pods, color: "#90CAF9" },
                  {
                    label: "ReplicaSets",
                    val: k8sData.replicasets,
                    color: "#D1C4E9",
                  },
                ].map((item, i) => (
                  <Typography
                    key={i}
                    variant="body2"
                    sx={{ display: "flex", alignItems: "center", gap: 1 }}
                  >
                    <span
                      style={{
                        width: 10,
                        height: 10,
                        display: "inline-block",
                        borderRadius: "50%",
                        backgroundColor: item.color,
                      }}
                    />
                    {item.label}: <b>{item.val ?? 0}</b>
                  </Typography>
                ))}
              </div>
            </div>
          </GlassCard>
        </Grid>

        {/* <Grid item xs={12} md={6}>
          <GlassCard sx={{ p: 2, minHeight: 220 }}>
            <Typography variant="subtitle2" color="text.secondary">
              Recent Requests
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Latest activity
            </Typography>

            {vmRequests.length === 0 ? (
              <Typography variant="caption" sx={{ mt: 2, opacity: 0.7 }}>
                No recent requests.
              </Typography>
            ) : (
              <Stack spacing={1.2} sx={{ mt: 1 }}>
                {vmRequests.slice(0, 3).map((req) => (
                  <Box
                    key={req.id}
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      p: 1,
                      borderRadius: 2,
                      background:
                        "linear-gradient(90deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))",
                    }}
                  >
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {req.service_name || "Service"} • #{req.id}
                      </Typography>

                      <Typography variant="caption" color="text.secondary">
                        {req.email} •{" "}
                        {formatDistanceToNow(new Date(req.request_timestamp))}{" "}
                        ago
                      </Typography>
                    </Box>

                    <Chip
                      label={req.admin_status}
                      size="small"
                      sx={{
                        fontWeight: 700,
                        color:
                          req.admin_status === "Accepted"
                            ? "#34D399"
                            : req.admin_status === "Rejected"
                            ? "#F87171"
                            : "#FBBF24",
                        background: "rgba(255,255,255,0.05)",
                        borderRadius: "8px",
                      }}
                    />
                  </Box>
                ))}
              </Stack>
            )}
          </GlassCard>
        </Grid> */}

        <Grid item xs={12} md={3}>
          <GlassCard sx={{ p: 2, minHeight: 220 }}>
            <Typography variant="subtitle2" color="text.secondary">
              Maintenance Calendar
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
              Planned maintenance
            </Typography>

            {/* Compact calendar: reduce default padding/height via CSS below */}
            <Box
              sx={{
                "& .react-calendar": {
                  border: "none",
                  borderRadius: 2,
                  boxShadow: "none",
                  fontSize: 12,
                },
                "& .react-calendar__tile": { padding: "6px 4px" },
              }}
            >
              <Calendar onChange={setDate} value={date} />
            </Box>
          </GlassCard>
        </Grid>
      </Grid>

      {/* K8s stats row */}
      <Grid container spacing={2} sx={{ mt: 2 }}>
        <Grid item xs={12} md={3}>
          <GlassCard sx={{ p: 2 }}>
            <Typography variant="caption" color="text.secondary">
              DaemonSets
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>
              {k8sData.daemonsets || 0}
            </Typography>
          </GlassCard>
        </Grid>
        <Grid item xs={12} md={3}>
          <GlassCard sx={{ p: 2 }}>
            <Typography variant="caption" color="text.secondary">
              Pods
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>
              {k8sData.pods || 0}
            </Typography>
          </GlassCard>
        </Grid>
        <Grid item xs={12} md={3}>
          <GlassCard sx={{ p: 2 }}>
            <Typography variant="caption" color="text.secondary">
              Deployments
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>
              {k8sData.deployments || 0}
            </Typography>
          </GlassCard>
        </Grid>
        <Grid item xs={12} md={3}>
          <GlassCard sx={{ p: 2 }}>
            <Typography variant="caption" color="text.secondary">
              ReplicaSets
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>
              {k8sData.replicasets || 0}
            </Typography>
          </GlassCard>
        </Grid>
      </Grid>

      {/* Footer / quick notes */}
      <Box sx={{ mt: 3 }}>
        <GlassCard sx={{ p: 2 }}>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
          >
            <Typography variant="body2" color="text.secondary">
              Tip
            </Typography>
            <Typography variant="body2">
              Hover cards to reveal actions. Use filters to narrow requests.
            </Typography>
          </Stack>
        </GlassCard>
      </Box>
    </Box>
  );
}

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
// GlassDashboard.jsx

// import { useEffect, useState } from "react";
// import {
//   RadialBarChart,
//   RadialBar,
//   PolarAngleAxis,
//   Tooltip,
//   ResponsiveContainer,
//   BarChart,
//   Bar,
//   XAxis,
//   YAxis,
//   LabelList,
//   ComposedChart,
//   Line,
//   Area,
// } from "recharts";
// import Calendar from "react-calendar";
// import "react-calendar/dist/Calendar.css";
// import {
//   Card,
//   CardContent,
//   Typography,
//   Grid2,
//   Box,
//   Divider,
//   Stack,
// } from "@mui/material";
// import {
//   GaugeContainer,
//   GaugeValueArc,
//   GaugeReferenceArc,
//   useGaugeState,
// } from "@mui/x-charts/Gauge";

// import "react-circular-progressbar/dist/styles.css";

// import dayjs from "dayjs";
// import isToday from "dayjs/plugin/isToday";
// dayjs.extend(isToday);
// import apiClient from "../Axios";
// import "./Dashboard.css";

// const RadialSeparators = ({ count, style }) => {
//   const turns = 1 / count;
//   return (
//     <>
//       {[...Array(count)].map((_, index) => (
//         <div
//           key={index}
//           style={{
//             position: "absolute",
//             height: "100%",
//             transform: `rotate(${index * turns}turn)`,
//             transformOrigin: "center",
//           }}
//         >
//           <div style={style} />
//         </div>
//       ))}
//     </>
//   );
// };
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
//   const [loading, setLoading] = useState(true);
//   const [summary, setSummary] = useState({
//     total: 0,
//     today: 0,
//     open: 0,
//     inProgress: 0,
//     closed: 0,
//   });
//   const [openstackReq, setOpenstackReq] = useState({
//     total: 0,
//     pending: 0,
//     accepted: 0,
//     rejected: 0,
//     today: 0,
//   });

//   const [k8sReq, setK8sReq] = useState({
//     total: 0,
//     pending: 0,
//     accepted: 0,
//     rejected: 0,
//     today: 0,
//   });

//   const handleDateChange = (newDate) => {
//     setDate(newDate);
//   };

//   //tickets
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

//           // ✅ Day.js version of "is today"
//           if (dayjs(ticket.created_at).isToday()) today++;
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
//   const radialData = [
//     { name: "Open", value: summary.open, fill: "#42a5f5" },
//     { name: "In Progress", value: summary.inProgress, fill: "#ffca28" },
//     { name: "Closed", value: summary.closed, fill: "#66bb6a" },
//     { name: "Total", value: summary.total, fill: "#ab47bc" },
//     { name: "Today", value: summary.today, fill: "#ef5350" },
//   ];

//   // ✅ Custom Tooltip
//   const CustomTooltip = ({ active, payload }) => {
//     if (active && payload && payload.length) {
//       const { name, value } = payload[0].payload;
//       return (
//         <Box
//           sx={{
//             p: 1,
//             background: "#fff",
//             border: "1px solid #ccc",
//             borderRadius: 1,
//           }}
//         >
//           <Typography variant="body2">
//             <strong>{name}:</strong> {value}
//           </Typography>
//         </Box>
//       );
//     }
//     return null;
//   };

//   useEffect(() => {
//     const fetchOpenstackOverview = async () => {
//       try {
//         const res = await apiClient.get("/vmdetails/overview/?page=1&size=500");
//         const data = res.data;

//         const todayCount =
//           data.data?.filter((vm) => dayjs(vm.created_at).isToday()).length || 0;

//         setOpenstackReq({
//           total: data.total_records,
//           pending: data.status_counts.pending,
//           accepted: data.status_counts.accepted,
//           rejected: data.status_counts.rejected,
//           today: todayCount,
//         });
//       } catch (err) {
//         console.error("OS Overview Error:", err);
//       }
//     };

//     fetchOpenstackOverview();
//   }, []);

//   useEffect(() => {
//     const fetchK8sReq = async () => {
//       try {
//         const res = await apiClient.get("/service-requests/");
//         const records = res.data.data;

//         const pending = records.filter(
//           (r) => r.admin_status === "Pending"
//         ).length;
//         const accepted = records.filter(
//           (r) => r.admin_status === "Accepted"
//         ).length;
//         const rejected = records.filter(
//           (r) => r.admin_status === "Rejected"
//         ).length;
//         const today = records.filter((r) =>
//           dayjs(r.request_timestamp).isToday()
//         ).length;

//         setK8sReq({
//           total: records.length,
//           pending,
//           accepted,
//           rejected,
//           today,
//         });
//       } catch (err) {
//         console.error("K8s Overview Error:", err);
//       }
//     };

//     fetchK8sReq();
//   }, []);

//   const makeDonutData = (stats) => [
//     { name: "Pending", value: stats.pending, fill: "#ffca28" },
//     { name: "Accepted", value: stats.accepted, fill: "#66bb6a" },
//     { name: "Rejected", value: stats.rejected, fill: "#ef5350" },
//   ];

//   /* ---------- Helpers (place near top of your component) ---------- */
//   const chartColors = {
//     pending: { start: "#FFD966", end: "#FFB86B" },
//     accepted: { start: "#6EE7B7", end: "#34D399" },
//     rejected: { start: "#FF8A80", end: "#F44336" },
//     trend: "#7C4DFF",
//   };

//   const buildStackData = (stats) => {
//     // one row with counts so horizontal stacked bar looks like a single band
//     return [
//       {
//         name: "Requests",
//         pending: stats.pending || 0,
//         accepted: stats.accepted || 0,
//         rejected: stats.rejected || 0,
//         total: stats.total || 0,
//         today: stats.today || 0,
//       },
//     ];
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
//   const memoryUsage = (
//     (data.used_memory_mb / data.total_memory_mb) *
//     100
//   ).toFixed(1);
//   const storageUsage = (
//     (data.used_storage_gb / data.total_storage_gb) *
//     100
//   ).toFixed(1);

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
//       <Grid2 item xs={12} sm={12} md={6} lg={6} xl={6}>
//         <Card
//           sx={{
//             padding: 1,
//             height: "100%",
//             width: "100%",
//             borderRadius: 4,
//             boxShadow: 6,
//           }}
//         >
//           <CardContent>
//             <Typography variant="h6">
//               Infrastructure-as-a-Service (Openstack)
//             </Typography>
//             <div
//               style={{
//                 display: "flex",
//                 justifyContent: "space-between",
//                 alignItems: "flex-start",
//               }}
//             >
//               <div style={{ width: 350, marginTop: 10 }}>
//                 {[
//                   {
//                     label: "vCPU",
//                     value: vcpuUsage,
//                     used: data.used_vcpus,
//                     total: data.total_vcpus,
//                   },
//                   {
//                     label: "RAM",
//                     value: memoryUsage,
//                     used: (data.used_memory_mb / 1024).toFixed(1),
//                     total: (data.total_memory_mb / 1024).toFixed(1),
//                   },
//                   {
//                     label: "Storage",
//                     value: storageUsage,
//                     used: data.used_storage_gb,
//                     total: data.total_storage_gb,
//                   },
//                 ].map((stat, index) => (
//                   <div key={index}>
//                     <Typography variant="h7"> {stat.label}</Typography>
//                     <div
//                       style={{
//                         backgroundColor: "#ddd",
//                         height: "10px",
//                         borderRadius: "4px",
//                         margin: "8px 0",
//                         overflow: "hidden",
//                       }}
//                     >
//                       <span
//                         style={{
//                           width: `${stat.value}%`,
//                           backgroundColor: getBarColor(stat.value),
//                           display: "block",
//                           height: "100%",
//                         }}
//                       ></span>
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
//                 <div
//                   style={{
//                     display: "flex",
//                     justifyContent: "center",
//                     gap: "20px",
//                     marginTop: "20px",
//                   }}
//                 >
//                   {[
//                     { label: "vCPU", usage: vcpuUsage },
//                     { label: "RAM", usage: memoryUsage },
//                   ].map((gauge, idx) => (
//                     <div key={idx} style={{ textAlign: "center" }}>
//                       <Typography variant="body2">{gauge.label}</Typography>
//                       <RadialBarChart
//                         width={150}
//                         height={80}
//                         innerRadius="70%"
//                         outerRadius="100%"
//                         startAngle={180}
//                         endAngle={0}
//                         data={createGaugeData(Number(gauge.usage))}
//                       >
//                         <PolarAngleAxis
//                           type="number"
//                           domain={[0, 100]}
//                           angleAxisId={0}
//                           tick={false}
//                         />
//                         <RadialBar
//                           minAngle={15}
//                           background
//                           clockWise
//                           dataKey="value"
//                           cornerRadius={5}
//                         />
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

//       <Grid2 item xs={12} sm={12} md={6} lg={6} xl={6}>
//         <Card
//           sx={{
//             padding: 1,
//             height: "100%",
//             width: "100%",
//             borderRadius: 4,
//             boxShadow: 6,
//           }}
//         >
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

//       {/* ---------- Futuristic OpenStack Card ---------- */}
//       <Grid2 item xs={12} md={12} lg={12} sx={{ mb: 2 }}>
//         <Card
//           sx={{
//             p: 2,
//             borderRadius: 3,
//             padding: 1,
//             height: "100%",
//             width: "100%",
//             boxShadow: 6,
//             // boxShadow: "0 8px 30px rgba(12, 12, 40, 0.08)",
//             // background:
//             //   "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(245,247,255,0.95))",
//           }}
//         >
//           <CardContent sx={{ pb: 1 }}>
//             <Stack
//               direction="row"
//               alignItems="center"
//               justifyContent="space-between"
//             >
//               <Box>
//                 <Typography variant="h6" sx={{ fontWeight: 700 }}>
//                   OpenStack VM Requests
//                 </Typography>
//                 <Typography
//                   variant="body2"
//                   color="text.secondary"
//                   sx={{ mt: 0.5 }}
//                 >
//                   Overview — pending requests (FLA approved) and admin decisions
//                 </Typography>
//               </Box>

//               <Stack direction="row" spacing={2} alignItems="center">
//                 <Box sx={{ textAlign: "right" }}>
//                   <Typography variant="subtitle2" color="text.secondary">
//                     Total
//                   </Typography>
//                   <Typography variant="h5" sx={{ fontWeight: 800 }}>
//                     {openstackReq.total}
//                   </Typography>
//                 </Box>

//                 <Stack direction="row" spacing={1}>
//                   <Box
//                     sx={{
//                       px: 2,
//                       py: 1,
//                       borderRadius: 2,
//                       background:
//                         "linear-gradient(90deg, rgba(255,255,255,0.6), rgba(255,255,255,0.2))",
//                       boxShadow: "inset 0 -2px 10px rgba(2,6,23,0.03)",
//                     }}
//                   >
//                     <Typography variant="caption" color="text.secondary">
//                       Today
//                     </Typography>
//                     <Typography variant="h6" sx={{ fontWeight: 700 }}>
//                       {openstackReq.today}
//                     </Typography>
//                   </Box>

//                   <Box
//                     sx={{
//                       px: 2,
//                       py: 1,
//                       borderRadius: 2,
//                       background: "linear-gradient(135deg, #EEF7FF, #F6F6FF)",
//                     }}
//                   >
//                     <Typography variant="caption" color="text.secondary">
//                       Pending
//                     </Typography>
//                     <Typography
//                       variant="h6"
//                       sx={{ color: chartColors.pending.end, fontWeight: 700 }}
//                     >
//                       {openstackReq.pending}
//                     </Typography>
//                   </Box>
//                 </Stack>
//               </Stack>
//             </Stack>

//             {/* Large wide chart area */}
//             <Box
//               sx={{
//                 mt: 2,
//                 width: "100%",
//                 height: 140,
//                 display: "flex",
//                 gap: 2,
//               }}
//             >
//               <Box sx={{ flex: 1 }}>
//                 <ResponsiveContainer width="100%" height="100%">
//                   <BarChart
//                     data={buildStackData(openstackReq)}
//                     layout="vertical"
//                     margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
//                   >
//                     <defs>
//                       <linearGradient id="gradPending" x1="0" x2="1">
//                         <stop
//                           offset="0%"
//                           stopColor={chartColors.pending.start}
//                         />
//                         <stop
//                           offset="100%"
//                           stopColor={chartColors.pending.end}
//                         />
//                       </linearGradient>
//                       <linearGradient id="gradAccepted" x1="0" x2="1">
//                         <stop
//                           offset="0%"
//                           stopColor={chartColors.accepted.start}
//                         />
//                         <stop
//                           offset="100%"
//                           stopColor={chartColors.accepted.end}
//                         />
//                       </linearGradient>
//                       <linearGradient id="gradRejected" x1="0" x2="1">
//                         <stop
//                           offset="0%"
//                           stopColor={chartColors.rejected.start}
//                         />
//                         <stop
//                           offset="100%"
//                           stopColor={chartColors.rejected.end}
//                         />
//                       </linearGradient>
//                     </defs>

//                     <XAxis type="number" hide />
//                     <YAxis type="category" dataKey="name" hide />
//                     <Tooltip
//                       cursor={{ fill: "rgba(12,12,40,0.03)" }}
//                       formatter={(value, name) => [
//                         value,
//                         name.charAt(0).toUpperCase() + name.slice(1),
//                       ]}
//                     />

//                     {/* Stacked bars */}
//                     <Bar
//                       dataKey="pending"
//                       stackId="a"
//                       barSize={28}
//                       radius={[8, 8, 8, 8]}
//                       fill="url(#gradPending)"
//                     />
//                     <Bar
//                       dataKey="accepted"
//                       stackId="a"
//                       barSize={28}
//                       radius={[8, 8, 8, 8]}
//                       fill="url(#gradAccepted)"
//                     />
//                     <Bar
//                       dataKey="rejected"
//                       stackId="a"
//                       barSize={28}
//                       radius={[8, 8, 8, 8]}
//                       fill="url(#gradRejected)"
//                     />

//                     {/* Labels on right side showing numeric values */}
//                     <LabelList
//                       dataKey="total"
//                       position="right"
//                       formatter={(val) => `Total ${val}`}
//                     />
//                   </BarChart>
//                 </ResponsiveContainer>
//               </Box>

//               {/* Right side: breakdown + mini trend */}
//               <Box
//                 sx={{
//                   width: 260,
//                   p: 1.5,
//                   borderRadius: 2,
//                   background:
//                     "linear-gradient(180deg, rgba(255,255,255,0.9), rgba(250,251,255,0.85))",
//                   boxShadow: "0 6px 18px rgba(12,12,40,0.04)",
//                 }}
//               >
//                 <Stack spacing={1.2}>
//                   <Stack
//                     direction="row"
//                     justifyContent="space-between"
//                     alignItems="center"
//                   >
//                     <Typography variant="subtitle2" color="text.secondary">
//                       Accepted
//                     </Typography>
//                     <Typography
//                       variant="h6"
//                       sx={{ color: chartColors.accepted.end, fontWeight: 800 }}
//                     >
//                       {openstackReq.accepted}
//                     </Typography>
//                   </Stack>

//                   <Stack
//                     direction="row"
//                     justifyContent="space-between"
//                     alignItems="center"
//                   >
//                     <Typography variant="subtitle2" color="text.secondary">
//                       Pending (FLA)
//                     </Typography>
//                     <Typography
//                       variant="h6"
//                       sx={{ color: chartColors.pending.end, fontWeight: 800 }}
//                     >
//                       {openstackReq.pending}
//                     </Typography>
//                   </Stack>

//                   <Stack
//                     direction="row"
//                     justifyContent="space-between"
//                     alignItems="center"
//                   >
//                     <Typography variant="subtitle2" color="text.secondary">
//                       Rejected
//                     </Typography>
//                     <Typography
//                       variant="h6"
//                       sx={{ color: chartColors.rejected.end, fontWeight: 800 }}
//                     >
//                       {openstackReq.rejected}
//                     </Typography>
//                   </Stack>

//                   <Divider sx={{ mt: 0.5 }} />

//                   <Typography variant="caption" color="text.secondary">
//                     Recent trend
//                   </Typography>
//                   <Box sx={{ width: "100%", height: 50 }}>
//                     <ResponsiveContainer width="100%" height="100%">
//                       <ComposedChart
//                         data={[
//                           {
//                             x: "t",
//                             total: openstackReq.total || 0,
//                             today: openstackReq.today || 0,
//                           },
//                         ]}
//                       >
//                         <XAxis dataKey="x" hide />
//                         <Tooltip />
//                         <Line
//                           type="monotone"
//                           dataKey="today"
//                           stroke={chartColors.trend}
//                           strokeWidth={3}
//                           dot={{ r: 3 }}
//                         />
//                         <Area
//                           type="monotone"
//                           dataKey="total"
//                           fill="rgba(124,77,255,0.08)"
//                           stroke="transparent"
//                         />
//                       </ComposedChart>
//                     </ResponsiveContainer>
//                   </Box>
//                 </Stack>
//               </Box>
//             </Box>
//           </CardContent>
//         </Card>
//       </Grid2>
//       {/*
//       <Grid2 item xs={12} sm={12} md={6} lg={6} xl={6}>
//         <Card
//           sx={{
//             padding: 2,
//             height: "100%",
//             minWidth: 450,
//             borderRadius: 4,
//             boxShadow: 6,
//           }}
//         >
//           <CardContent>
//             <Typography variant="h6">Recently Discoverd VMs</Typography>
//             <Typography variant="body2">VMs: 0</Typography>
//             <Typography variant="body2">Today: 0</Typography>
//             <Typography variant="body2">This Week: 0</Typography>
//           </CardContent>
//         </Card>
//       </Grid2> */}
//       {/* Third row - Three cards */}
//       <Grid2 item xs={12} sm={12} md={6} lg={6} xl={6}>
//         <Card
//           sx={{
//             padding: 0,
//             borderRadius: 4,
//             boxShadow: 6,
//             height: "100%",
//             width: "100%",
//           }}
//         >
//           <CardContent>
//             <Typography variant="h6">Maintenance Calendar</Typography>
//             <Box
//               sx={{
//                 "& .react-calendar": {
//                   backgroundColor: (theme) => theme.palette.background.paper,
//                   color: (theme) => theme.palette.text.primary,
//                   borderRadius: 2,
//                   padding: 1,
//                 },
//                 "& .react-calendar__tile": {
//                   color: (theme) => theme.palette.text.primary,
//                 },
//                 "& .react-calendar__navigation button": {
//                   color: (theme) => theme.palette.text.primary,
//                 },
//               }}
//             >
//               <Calendar onChange={handleDateChange} value={date} />
//             </Box>
//           </CardContent>
//         </Card>
//       </Grid2>

//       {/* ---------- Futuristic Kubernetes Card ---------- */}

//       <Grid2 item xs={12} md={12} lg={12} sx={{ mb: 2 }}>
//         <Card
//           sx={{
//             p: 2,
//             borderRadius: 3,
//             padding: 1,
//             height: "100%",
//             width: "100%",
//             boxShadow: 6,
//             // boxShadow: "0 8px 30px rgba(6, 8, 30, 0.06)",
//             // background:
//             //   "linear-gradient(180deg, rgba(255,254,250,0.98), rgba(245,250,255,0.95))",
//           }}
//         >
//           <CardContent sx={{ pb: 1 }}>
//             <Stack
//               direction="row"
//               alignItems="center"
//               justifyContent="space-between"
//             >
//               <Box>
//                 <Typography variant="h6" sx={{ fontWeight: 700 }}>
//                   Kubernetes Service Requests
//                 </Typography>
//                 <Typography
//                   variant="body2"
//                   color="text.secondary"
//                   sx={{ mt: 0.5 }}
//                 >
//                   Services requested for K8s (deployments, dbs, ingress etc.)
//                 </Typography>
//               </Box>

//               <Stack direction="row" spacing={2} alignItems="center">
//                 <Box sx={{ textAlign: "right" }}>
//                   <Typography variant="subtitle2" color="text.secondary">
//                     Total
//                   </Typography>
//                   <Typography variant="h5" sx={{ fontWeight: 800 }}>
//                     {k8sReq.total}
//                   </Typography>
//                 </Box>

//                 <Stack direction="row" spacing={1}>
//                   <Box
//                     sx={{
//                       px: 2,
//                       py: 1,
//                       borderRadius: 2,
//                       background:
//                         "linear-gradient(90deg, rgba(255,255,255,0.6), rgba(255,255,255,0.2))",
//                     }}
//                   >
//                     <Typography variant="caption" color="text.secondary">
//                       Today
//                     </Typography>
//                     <Typography variant="h6" sx={{ fontWeight: 700 }}>
//                       {k8sReq.today}
//                     </Typography>
//                   </Box>

//                   <Box
//                     sx={{
//                       px: 2,
//                       py: 1,
//                       borderRadius: 2,
//                       background: "linear-gradient(135deg, #FFF7EC, #FFFDF5)",
//                     }}
//                   >
//                     <Typography variant="caption" color="text.secondary">
//                       Pending
//                     </Typography>
//                     <Typography
//                       variant="h6"
//                       sx={{ color: chartColors.pending.end, fontWeight: 700 }}
//                     >
//                       {k8sReq.pending}
//                     </Typography>
//                   </Box>
//                 </Stack>
//               </Stack>
//             </Stack>

//             {/* Large wide chart area */}
//             <Box
//               sx={{
//                 mt: 2,
//                 width: "100%",
//                 height: 140,
//                 display: "flex",
//                 gap: 2,
//               }}
//             >
//               <Box sx={{ flex: 1 }}>
//                 <ResponsiveContainer width="100%" height="100%">
//                   <BarChart
//                     data={buildStackData(k8sReq)}
//                     layout="vertical"
//                     margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
//                   >
//                     <defs>
//                       <linearGradient id="kgradPending" x1="0" x2="1">
//                         <stop
//                           offset="0%"
//                           stopColor={chartColors.pending.start}
//                         />
//                         <stop
//                           offset="100%"
//                           stopColor={chartColors.pending.end}
//                         />
//                       </linearGradient>
//                       <linearGradient id="kgradAccepted" x1="0" x2="1">
//                         <stop
//                           offset="0%"
//                           stopColor={chartColors.accepted.start}
//                         />
//                         <stop
//                           offset="100%"
//                           stopColor={chartColors.accepted.end}
//                         />
//                       </linearGradient>
//                       <linearGradient id="kgradRejected" x1="0" x2="1">
//                         <stop
//                           offset="0%"
//                           stopColor={chartColors.rejected.start}
//                         />
//                         <stop
//                           offset="100%"
//                           stopColor={chartColors.rejected.end}
//                         />
//                       </linearGradient>
//                     </defs>

//                     <XAxis type="number" hide />
//                     <YAxis type="category" dataKey="name" hide />
//                     <Tooltip cursor={{ fill: "rgba(12,12,40,0.03)" }} />

//                     <Bar
//                       dataKey="pending"
//                       stackId="a"
//                       barSize={28}
//                       radius={[8, 8, 8, 8]}
//                       fill="url(#kgradPending)"
//                     />
//                     <Bar
//                       dataKey="accepted"
//                       stackId="a"
//                       barSize={28}
//                       radius={[8, 8, 8, 8]}
//                       fill="url(#kgradAccepted)"
//                     />
//                     <Bar
//                       dataKey="rejected"
//                       stackId="a"
//                       barSize={28}
//                       radius={[8, 8, 8, 8]}
//                       fill="url(#kgradRejected)"
//                     />

//                     <LabelList
//                       dataKey="total"
//                       position="right"
//                       formatter={(val) => `Total ${val}`}
//                     />
//                   </BarChart>
//                 </ResponsiveContainer>
//               </Box>

//               {/* Right side: breakdown + mini trend */}
//               <Box
//                 sx={{
//                   width: 260,
//                   p: 1.5,
//                   borderRadius: 2,
//                   background:
//                     "linear-gradient(180deg, rgba(255,255,255,0.9), rgba(252,255,250,0.9))",
//                   boxShadow: "0 6px 18px rgba(6,8,30,0.03)",
//                 }}
//               >
//                 <Stack spacing={1.2}>
//                   <Stack
//                     direction="row"
//                     justifyContent="space-between"
//                     alignItems="center"
//                   >
//                     <Typography variant="subtitle2" color="text.secondary">
//                       Accepted
//                     </Typography>
//                     <Typography
//                       variant="h6"
//                       sx={{ color: chartColors.accepted.end, fontWeight: 800 }}
//                     >
//                       {k8sReq.accepted}
//                     </Typography>
//                   </Stack>

//                   <Stack
//                     direction="row"
//                     justifyContent="space-between"
//                     alignItems="center"
//                   >
//                     <Typography variant="subtitle2" color="text.secondary">
//                       Pending
//                     </Typography>
//                     <Typography
//                       variant="h6"
//                       sx={{ color: chartColors.pending.end, fontWeight: 800 }}
//                     >
//                       {k8sReq.pending}
//                     </Typography>
//                   </Stack>

//                   <Stack
//                     direction="row"
//                     justifyContent="space-between"
//                     alignItems="center"
//                   >
//                     <Typography variant="subtitle2" color="text.secondary">
//                       Rejected
//                     </Typography>
//                     <Typography
//                       variant="h6"
//                       sx={{ color: chartColors.rejected.end, fontWeight: 800 }}
//                     >
//                       {k8sReq.rejected}
//                     </Typography>
//                   </Stack>

//                   <Divider sx={{ mt: 0.5 }} />

//                   <Typography variant="caption" color="text.secondary">
//                     Recent trend
//                   </Typography>
//                   <Box sx={{ width: "100%", height: 50 }}>
//                     <ResponsiveContainer width="100%" height="100%">
//                       <ComposedChart
//                         data={[
//                           {
//                             x: "t",
//                             total: k8sReq.total || 0,
//                             today: k8sReq.today || 0,
//                           },
//                         ]}
//                       >
//                         <XAxis dataKey="x" hide />
//                         <Tooltip />
//                         <Line
//                           type="monotone"
//                           dataKey="today"
//                           stroke={chartColors.trend}
//                           strokeWidth={3}
//                           dot={{ r: 3 }}
//                         />
//                         <Area
//                           type="monotone"
//                           dataKey="total"
//                           fill="rgba(124,77,255,0.08)"
//                           stroke="transparent"
//                         />
//                       </ComposedChart>
//                     </ResponsiveContainer>
//                   </Box>
//                 </Stack>
//               </Box>
//             </Box>
//           </CardContent>
//         </Card>
//       </Grid2>
//     </Grid2>
//   );
// };

// export default Dashboard;

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
