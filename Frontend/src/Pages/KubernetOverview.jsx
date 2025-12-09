// src/Pages/KubernetOverview.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  AppBar,
  Toolbar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Grid,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Tabs,
  Tab,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  TablePagination,
  IconButton,
  Tooltip,
  Chip,
  Stack,
  Button,
  Menu,
  MenuItem as MUIMenuItem,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import DownloadIcon from "@mui/icons-material/Download";
import RefreshIcon from "@mui/icons-material/Refresh";
import SortIcon from "@mui/icons-material/Sort";
import { PieChart, Pie, Cell, Tooltip as ReTooltip, ResponsiveContainer } from "recharts";
import apiClient from "../Axios";

// const CACHE_TTL = 60000; // 30 sec

// Cache utilities
const setCache = (key, data, ttl = 60000) => {
  localStorage.setItem(
    key,
    JSON.stringify({ data, expiry: Date.now() + ttl })
  );
};

const getCache = (key) => {
  const item = localStorage.getItem(key);
  if (!item) return null;

  const parsed = JSON.parse(item);
  if (Date.now() > parsed.expiry) {
    // expired → remove cache
    localStorage.removeItem(key);
    return null;
  }

  return parsed.data;
};

/**
 * KubernetOverview.jsx
 *
 * Features:
 * - Donut charts (Running / Pending / Failed) for Deployments / Pods / ReplicaSets / StatefulSets
 * - Tabs for resources: Deployments | Pods | ReplicaSets | Services | Nodes
 * - Pagination and per-table sorting
 * - CSV export for visible table
 * - Clean MUI styling (cards, chips, subtle shadows)
 * - Preserves navigation handlers for details
 *
 * Notes:
 * - Adjust API endpoints if necessary to match your backend.
 * - Component is self-contained and does not modify global theme.
 */

/* ----------------------------- Helpers & Constants ----------------------------- */

// Colors used for statuses
const STATUS_COLORS = {
  Running: "#5FD113",
  Pending: "#FFD500",
  Failed: "#FF1F1F",
  Other: "#9e9e9e",
};

// safePromise wrapper to keep errors from breaking Promise.all
const safePromise = (promise) =>
  promise
    .then((value) => ({ status: "fulfilled", value }))
    .catch((reason) => ({ status: "rejected", reason }));

// CSV export utility
const arrayToCSV = (rows, columns) => {
  const escapeCell = (v) => {
    if (v === null || v === undefined) return "";
    const s = typeof v === "string" ? v : String(v);
    // avoid large HTML in CSV: strip tags if any (simple)
    const cleaned = s.replace(/<\/?[^>]+(>|$)/g, "");
    if (cleaned.includes(",") || cleaned.includes("\n") || cleaned.includes('"')) {
      return `"${cleaned.replace(/"/g, '""')}"`;
    }
    return cleaned;
  };

  const header = columns.map((c) => escapeCell(c.header)).join(",");
  const lines = rows.map((r) =>
    columns
      .map((c) => {
        const val = typeof c.selector === "function" ? c.selector(r) : r[c.key];
        return escapeCell(val);
      })
      .join(",")
  );
  return [header, ...lines].join("\n");
};

// download helper
const downloadTextFile = (text, filename) => {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/* ----------------------------- Main Component ----------------------------- */

const KubernetOverview = () => {
  const theme = useTheme();
  const navigate = useNavigate();

  // data containers
  const [piedata, setPieData] = useState(null); // expected: { Deployments: {Running: n, Pending: m, Failed: p, ...}, Pods: {...}, ... }
  const [data, setData] = useState({
    services: [],
    allPods: [],
    filteredPods: [],
    nodes: [],
    allDeployments: [],
    filteredDeployments: [],
    allReplicaSets: [],
    filteredReplicaSets: [],
  });

  // loading states
  const [loadingPieChart, setLoadingPieChart] = useState(true);
  const [loadingTables, setLoadingTables] = useState(true);

  // UI state
  const [selectedNamespace, setSelectedNamespace] = useState("all");
  const [namespaces, setNamespaces] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [tabIndex, setTabIndex] = useState(0);

  // table paging + sorting
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });

  // details view (not replacing navigation hooks; preserved)
  const [viewingDeployment, setViewingDeployment] = useState(null);
  const [viewingService, setViewingService] = useState(null);
  const [viewingPod, setViewingPod] = useState(null);
  const [viewingReplicaSet, setViewingReplicaSet] = useState(null);

  // Breakdown modal state
  const [openBreakdown, setOpenBreakdown] = useState(false);
  const [breakdownKey, setBreakdownKey] = useState(null);

  // menu anchor for export/options
  const [optionsAnchor, setOptionsAnchor] = useState(null);

  // --- Routing helpers (unchanged behavior) ---
  const handleDeploymentClick = (name, namespace) => {
    navigate(`/app/kubernetes/deployment-details/${name}?namespace=${namespace}`);
  };
  const handleServiceClick = (name, namespace) => {
    navigate(`/app/kubernetes/service-details/${name}?namespace=${namespace}`);
  };
  const handlePodClick = (name, namespace) => {
    navigate(`/app/kubernetes/pods-details/${name}?namespace=${namespace}`);
  };
  const handleNodeClick = (name) => {
    navigate(`/app/kubernetes/nodes-details/${name}`);
  };
  const handleReplicaSetClick = (name, namespace) => {
    navigate(`/app/kubernetes/replicaset-details/${name}?namespace=${namespace}`);
  };

  // simple search helpers
  const includesIgnoreCase = (field, query) =>
    ("" + (field || "")).toLowerCase().includes(query.toLowerCase());
  const matchesResource = (resource, query, fields) =>
    fields.some((field) => includesIgnoreCase(resource[field], query));

  /* ----------------------------- Data fetching ----------------------------- */

  // fetch namespaces for dropdown (from deployments endpoint)
 // fetch namespaces for dropdown
useEffect(() => {
  let mounted = true;

  // === Try Cache First ===
  const cachedNamespaces = getCache("k8s_namespaces");
  if (cachedNamespaces && mounted) {
    setNamespaces(cachedNamespaces);
    if (!cachedNamespaces.includes(selectedNamespace))
      setSelectedNamespace(cachedNamespaces[0] || "all");
    return;
  }

  (async () => {
    try {
      const resp = await apiClient.get("/k8s/deployments/");
      if (!mounted) return;

      const allNamespaces = Array.isArray(resp.data)
        ? resp.data.map((dep) => dep.namespace)
        : [];

      const uniqueNamespaces = ["all", "default", ...new Set(allNamespaces)];

      setNamespaces(uniqueNamespaces);
      setCache("k8s_namespaces", uniqueNamespaces);

      if (!uniqueNamespaces.includes(selectedNamespace))
        setSelectedNamespace(uniqueNamespaces[0] || "all");
    } catch (err) {
      console.error("Error fetching namespaces:", err);
      if (mounted) setNamespaces(["all", "default"]);
    }
  })();

  return () => (mounted = false);
}, []);


  // fetch pie/donut data
  // fetch pie/donut data
useEffect(() => {
  let mounted = true;
  setLoadingPieChart(true);

  const ns = selectedNamespace === "all" ? "all" : selectedNamespace;
  const cacheKey = `k8s_pie_${ns}`;

  // === Try Cache First ===
  const cachedPie = getCache(cacheKey);
  if (cachedPie && mounted) {
    setPieData(cachedPie);
    setLoadingPieChart(false);
    return;
  }

  (async () => {
    try {
      const resp = await apiClient.get(`/k8s/workloads/?namespace=${ns}`);
      if (mounted) {
        setPieData(resp.data);
        setCache(cacheKey, resp.data);
      }
    } catch (err) {
      console.error("Error fetching pie data:", err);
      if (mounted) setPieData(null);
    } finally {
      if (mounted) setLoadingPieChart(false);
    }
  })();

  return () => (mounted = false);
}, [selectedNamespace]);


  // fetch tables data (services, pods, nodes, deployments, replicasets)
  // fetch tables data (services, pods, nodes, deployments, replicasets)
useEffect(() => {
  let mounted = true;
  setLoadingTables(true);

  const ns = selectedNamespace === "all" ? "all" : selectedNamespace;
  const cacheKey = `k8s_tables_${ns}`;

  // === Try Cache First ===
  const cachedTables = getCache(cacheKey);
  if (cachedTables && mounted) {
    setData(cachedTables);
    setLoadingTables(false);
    return;
  }

  (async () => {
    try {
      const [
        servicesResult,
        podsResult,
        nodesResult,
        deploymentsResult,
        allReplicaSetsResult,
      ] = await Promise.all([
        safePromise(apiClient.get(`/k8s/services/?namespace=${ns}`)),
        safePromise(apiClient.get(`/k8s/pods/?namespace=${ns}`)),
        safePromise(apiClient.get(`/k8s/nodes/`)), // nodes have no namespaces
        safePromise(apiClient.get(`/k8s/deployments/?namespace=${ns}`)),
        safePromise(apiClient.get(`/k8s/replicasets/?namespace=${ns}`)),
      ]);

      const fetchedServices =
        servicesResult.status === "fulfilled"
          ? servicesResult.value.data.services ?? []
          : [];

      const fetchedAllPods =
        podsResult.status === "fulfilled"
          ? podsResult.value.data.pods ?? []
          : [];

      const fetchedNodes =
        nodesResult.status === "fulfilled"
          ? nodesResult.value.data.nodes ?? []
          : [];

      const fetchedAllDeployments =
        deploymentsResult.status === "fulfilled"
          ? deploymentsResult.value.data ?? []
          : [];

      const fetchedAllReplicaSets =
        allReplicaSetsResult.status === "fulfilled"
          ? allReplicaSetsResult.value.data ?? []
          : [];

      const filteredServices =
        ns === "all"
          ? fetchedServices
          : fetchedServices.filter((svc) => svc.namespace === ns);

      const filteredPods =
        ns === "all"
          ? fetchedAllPods
          : fetchedAllPods.filter((pod) => pod.namespace === ns);

      const filteredDeployments =
        ns === "all"
          ? fetchedAllDeployments
          : fetchedAllDeployments.filter((dep) => dep.namespace === ns);

      const filteredReplicaSets =
        ns === "all"
          ? fetchedAllReplicaSets
          : fetchedAllReplicaSets.filter((rs) => rs.Namespace === ns);

      const resultData = {
        services: filteredServices,
        allPods: fetchedAllPods,
        filteredPods: filteredPods,
        nodes: fetchedNodes,
        allDeployments: fetchedAllDeployments,
        filteredDeployments: filteredDeployments,
        allReplicaSets: fetchedAllReplicaSets,
        filteredReplicaSets: filteredReplicaSets,
      };

      if (mounted) {
        setData(resultData);
        setCache(cacheKey, resultData);
      }
    } catch (err) {
      console.error("Error fetching Kubernetes data:", err);
      if (mounted)
        setData({
          services: [],
          allPods: [],
          filteredPods: [],
          nodes: [],
          allDeployments: [],
          filteredDeployments: [],
          allReplicaSets: [],
          filteredReplicaSets: [],
        });
    } finally {
      if (mounted) setLoadingTables(false);
    }
  })();

  return () => (mounted = false);
}, [selectedNamespace]);


  /* ----------------------------- Derived lists (search+filter) ----------------------------- */

  const filteredDeploymentsForTable = useMemo(() => {
    const list = data.filteredDeployments || [];
    if (!searchQuery) return list;
    return list.filter((dep) => matchesResource(dep, searchQuery, ["name", "namespace"]));
  }, [data.filteredDeployments, searchQuery]);

  const filteredServicesForTable = useMemo(() => {
    const list = data.services || [];
    if (!searchQuery) return list;
    return list.filter((svc) => matchesResource(svc, searchQuery, ["name", "namespace", "type"]));
  }, [data.services, searchQuery]);

  const filteredPodsForTable = useMemo(() => {
    const list = data.filteredPods || [];
    if (!searchQuery) return list;
    return list.filter((pod) => matchesResource(pod, searchQuery, ["name", "namespace", "node", "status"]));
  }, [data.filteredPods, searchQuery]);

  const filteredNodesForTable = useMemo(() => {
    const list = data.nodes || [];
    if (!searchQuery) return list;
    return list.filter((node) => matchesResource(node, searchQuery, ["name", "ready"]));
  }, [data.nodes, searchQuery]);

  const filteredReplicaSetsForTable = useMemo(() => {
    if (!data.filteredReplicaSets) return [];
    return data.filteredReplicaSets
      .filter((r) => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        const name = r.name || r.Name || "";
        const ns = r.namespace || r.Namespace || "";
        return name.toLowerCase().includes(query) || ns.toLowerCase().includes(query);
      })
      .map((r) => ({
        name: r.name || r.Name || "",
        namespace: r.namespace || r.Namespace || "",
        pods: r.pods || r.Pods || 0,
        created: r.created || r.Created || "",
        images: r.images || r.Images || [],
        labels: r.labels || r.Labels || {},
      }));
  }, [data.filteredReplicaSets, searchQuery]);
  
  

  /* ----------------------------- Sorting & Pagination helpers ----------------------------- */

  const applySort = (list, columns) => {
    if (!sortConfig.key) return list;
    const { key, direction } = sortConfig;
    // find column metadata if provided
    const col = columns.find((c) => c.key === key);
    const selector = col?.selector || ((r) => r[key]);
    const sorted = [...list].sort((a, b) => {
      const av = selector(a);
      const bv = selector(b);
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      if (typeof av === "number" && typeof bv === "number") {
        return direction === "asc" ? av - bv : bv - av;
      }
      const sa = String(av).toLowerCase();
      const sb = String(bv).toLowerCase();
      if (sa < sb) return direction === "asc" ? -1 : 1;
      if (sa > sb) return direction === "asc" ? 1 : -1;
      return 0;
    });
    return sorted;
  };

  const handleRequestSort = (key) => {
    setPage(0);
    setSortConfig((prev) => {
      if (prev.key === key) {
        // toggle direction
        return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: "asc" };
    });
  };

  const handleChangePage = (_, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (e) => {
    setRowsPerPage(parseInt(e.target.value, 10));
    setPage(0);
  };

  /* ----------------------------- Donut chart processing ----------------------------- */

  // convert piedata[key] into chart-friendly array
  const processChartData = (key) => {
    if (!piedata || !piedata[key]) return [];
    const raw = piedata[key];
    const order = ["Running", "Pending", "Failed"];
    const processed = [];
    order.forEach((status) => {
      const v = Number(raw[status] || 0);
      if (v > 0) {
        processed.push({ name: status, value: v, color: STATUS_COLORS[status] });
      }
    });
    Object.entries(raw).forEach(([status, count]) => {
      if (!order.includes(status) && Number(count) > 0) {
        processed.push({ name: status, value: Number(count), color: STATUS_COLORS.Other });
      }
    });
    return processed;
  };

  /* ----------------------------- Breakdown modal ----------------------------- */

  const openBreakdownModal = (key) => {
    setBreakdownKey(key);
    setOpenBreakdown(true);
  };
  const closeBreakdownModal = () => {
    setOpenBreakdown(false);
    setBreakdownKey(null);
  };

  /* ----------------------------- CSV Export ----------------------------- */

  const handleExportCSV = (resource) => {
    let rows = [];
    let columns = [];

    if (resource === "Deployments") {
      rows = filteredDeploymentsForTable;
      columns = [
        { header: "Name", key: "name" },
        { header: "Namespace", key: "namespace" },
        { header: "Replicas", key: "replicas" },
        { header: "Available replicas", key: "available_replicas" },
        { header: "Labels", key: "labels", selector: (r) => (r.labels ? JSON.stringify(r.labels) : "") },
      ];
    } else if (resource === "Pods") {
      rows = filteredPodsForTable;
      columns = [
        { header: "Name", key: "name" },
        { header: "Namespace", key: "namespace" },
        { header: "Node", key: "node" },
        { header: "Status", key: "status" },
        { header: "Restarts", key: "restarts" },
        { header: "CPU Usage", key: "cpu_usage" },
        { header: "Memory Usage", key: "memory_usage" },
        { header: "Created At", key: "created_at" },
      ];
    } else if (resource === "Replica Sets") {
      rows = filteredReplicaSetsForTable;
    
      columns = [
        { header: "Name", key: "name" },
        { 
          header: "Images", 
          key: "images",
          selector: (r) => (r.images ? r.images.join(", ") : "") 
        },
        { 
          header: "Labels", 
          key: "labels",
          selector: (r) => (r.labels ? JSON.stringify(r.labels) : "") 
        },
        { header: "Pods", key: "pods" },
        { header: "Created", key: "created" },
      ];
    } else if (resource === "Services") {
      rows = filteredServicesForTable;
      columns = [
        { header: "Name", key: "name" },
        { header: "Namespace", key: "namespace" },
        { header: "Type", key: "type" },
        { header: "Cluster IP", key: "cluster_ip" },
        { header: "Internal Endpoints", key: "internal_endpoints", selector: (r) => (r.internal_endpoints ? r.internal_endpoints.join(", ") : "") },
        { header: "External Endpoints", key: "external_endpoints", selector: (r) => (r.external_endpoints ? r.external_endpoints.join(", ") : "") },
        { header: "Created", key: "created" },
      ];
    } else if (resource === "Nodes") {
      rows = filteredNodesForTable;
      columns = [
        { header: "Name", key: "name" },
        { header: "Ready", key: "ready" },
        { header: "CPU Requests", key: "cpu_requests" },
        { header: "CPU Limits", key: "cpu_limits" },
        { header: "CPU Capacity", key: "cpu_capacity" },
        { header: "Memory Requests", key: "memory_requests_bytes" },
        { header: "Memory Limits", key: "memory_limits_bytes" },
        { header: "Memory Capacity", key: "memory_capacity_bytes" },
        { header: "Pods", key: "pods" },
        { header: "Created", key: "created" },
      ];
    } else {
      // unknown resource
      return;
    }

    const csv = arrayToCSV(rows, columns);
    const fileName = `k8s_${resource.replace(/\s+/g, "_").toLowerCase()}_${new Date().toISOString().slice(0, 19)}.csv`;
    downloadTextFile(csv, fileName);
    setOptionsAnchor(null);
  };

  /* ----------------------------- Table column definitions ----------------------------- */

  const deploymentColumns = [
    { key: "name", header: "Name" },
    { key: "namespace", header: "Namespace" },
    { key: "replicas", header: "Replicas" },
    { key: "available_replicas", header: "Available" },
    { key: "labels", header: "Labels", selector: (r) => (r.labels ? JSON.stringify(r.labels) : "") },
  ];

  const podsColumns = [
    { key: "name", header: "Name" },
    { key: "namespace", header: "Namespace" },
    { key: "node", header: "Node" },
    { key: "status", header: "Status" },
    { key: "restarts", header: "Restarts" },
    { key: "cpu_usage", header: "CPU" },
    { key: "memory_usage", header: "Memory" },
    { key: "created_at", header: "Created At" },
  ];

  const replicaSetColumns = [
    { key: "name", header: "Name" },
    { key: "images", header: "Images", selector: (r) => (r.images ? r.images.join(", ") : "") },
    { key: "labels", header: "Labels", selector: (r) => (r.labels ? JSON.stringify(r.labels) : "") },
    { key: "pods", header: "Pods" },
    { key: "created", header: "Created" },
  ];
  
  const servicesColumns = [
    { key: "name", header: "Name" },
    { key: "namespace", header: "Namespace" },
    { key: "type", header: "Type" },
    { key: "cluster_ip", header: "Cluster IP" },
    { key: "internal_endpoints", header: "Internal" },
    { key: "external_endpoints", header: "External" },
    { key: "created", header: "Created" },
  ];

  const nodesColumns = [
    { key: "name", header: "Name" },
    { key: "ready", header: "Ready" },
    { key: "cpu_requests", header: "CPU Req" },
    { key: "cpu_limits", header: "CPU Limit" },
    { key: "cpu_capacity", header: "CPU Cap" },
    { key: "memory_requests_bytes", header: "Mem Req" },
    { key: "memory_limits_bytes", header: "Mem Limit" },
    { key: "memory_capacity_bytes", header: "Mem Cap" },
    { key: "pods", header: "Pods" },
    { key: "created", header: "Created" },
  ];

  /* ----------------------------- Render helpers for tables ----------------------------- */

  const createSortLabel = (col) => (
    <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}>
      <Typography component="span" sx={{ fontWeight: 700 }}>
        {col.header}
      </Typography>
      <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleRequestSort(col.key); }}>
        <SortIcon fontSize="small" />
      </IconButton>
    </Box>
  );

  const renderTable = (rows, columns, keyPrefix = "") => {
    // apply sorting
    const withSelector = rows.map((r) => {
      const enriched = {};
      columns.forEach((c) => {
        enriched[c.key] = c.selector ? c.selector(r) : r[c.key];
      });
      return { __orig: r, ...enriched };
    });
    const sorted = applySort(withSelector, columns);
    const visibleRows = sorted.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

    return (
      <>
        <TableContainer component={Paper} sx={{ borderRadius: 2, overflow: "hidden" }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow sx={{ backgroundColor: theme.palette.mode === "light" ? "#f4f6fb" : undefined }}>
                {columns.map((col) => (
                  <TableCell key={col.key} align={col.align || "left"}>
                    {createSortLabel(col)}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>

            <TableBody>
              {visibleRows.length > 0 ? (
                visibleRows.map((row, idx) => {
                  const orig = row.__orig;
                  const key = keyPrefix ? `${keyPrefix}-${idx}-${JSON.stringify(orig).slice(0, 20)}` : idx;
                  return (
                    <TableRow
                      key={key}
                      hover
                      sx={{
                        cursor: "pointer",
                        "&:hover": { backgroundColor: theme.palette.action.hover },
                      }}
                    >
                      {columns.map((col) => {
                        const cellValue = row[col.key];
                        // clickable name column linking to details for specific known tables
                        if (col.key === "name" && orig?.name) {
                          // determine which resource by columns set
                          if (columns === podsColumns) {
                            return (
                              <TableCell key={col.key} onClick={() => handlePodClick(orig.name, orig.namespace)} sx={{ color: theme.palette.primary.main, fontWeight: 700 }}>
                                {cellValue}
                              </TableCell>
                            );
                          } else if (columns === deploymentColumns) {
                            return (
                              <TableCell key={col.key} onClick={() => handleDeploymentClick(orig.name, orig.namespace)} sx={{ color: theme.palette.primary.main, fontWeight: 700 }}>
                                {cellValue}
                              </TableCell>
                            );
                          } else if (columns === servicesColumns) {
                            return (
                              <TableCell key={col.key} onClick={() => handleServiceClick(orig.name, orig.namespace)} sx={{ color: theme.palette.primary.main, fontWeight: 700 }}>
                                {cellValue}
                              </TableCell>
                            );
                          } else if (columns === nodesColumns) {
                            return (
                              <TableCell key={col.key} onClick={() => handleNodeClick(orig.name)} sx={{ color: theme.palette.primary.main, fontWeight: 700 }}>
                                {cellValue}
                              </TableCell>
                            );
                          }else if (columns === replicaSetColumns) {   // FIXED HERE
                            return (
                              <TableCell
                                key={col.key}
                                onClick={() => handleReplicaSetClick(orig.name, orig.namespace)}
                                sx={{
                                  color: theme.palette.primary.main,
                                  fontWeight: 700,
                                  cursor: "pointer",
                                }}
                              >
                                {cellValue}
                              </TableCell>
                            );
                          }
                      
                        }

                        // status cell: show colored chip if key is "status"
                        if (col.key === "status") {
                          const status = cellValue || orig.status || "Unknown";
                          const chipColor = status === "Running" ? STATUS_COLORS.Running : status === "Pending" ? STATUS_COLORS.Pending : STATUS_COLORS.Failed;
                          return (
                            <TableCell key={col.key}>
                              <Chip label={status} size="small" sx={{ bgcolor: chipColor, color: "#000", fontWeight: 700 }} />
                            </TableCell>
                          );
                        }

                        // generic rendering
                        return <TableCell key={col.key}>{cellValue !== undefined ? cellValue : "-"}</TableCell>;
                      })}
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} align="center" sx={{ py: 6 }}>
                    <Typography color="text.secondary">There is nothing to display here</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 1 }}>
          <Typography variant="body2" sx={{ ml: 1 }}>
            Showing {Math.min((page + 1) * rowsPerPage, (sorted || rows).length)} of {(sorted || rows).length}
          </Typography>
          <TablePagination
            component="div"
            count={(sorted || rows).length}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[5, 10, 25, 50]}
            labelRowsPerPage="Rows"
          />
        </Box>
      </>
    );
  };

  /* ----------------------------- Small UI helpers ----------------------------- */

  const getUsageColor = (value, type) => {
    const numericValue = parseFloat(value);
    if (isNaN(numericValue)) return "#9e9e9e";

    if (type === "cpu") {
      if (numericValue <= 0.001) return "#1E90FF";
      if (numericValue <= 0.005) return "#5FD113";
      if (numericValue <= 0.01) return "#FFD500";
      return "#FF1F1F";
    } else if (type === "memory") {
      const valueMB = numericValue / (1024 * 1024);
      if (valueMB <= 20) return "#1E90FF";
      if (valueMB <= 40) return "#5FD113";
      if (valueMB <= 80) return "#FFD500";
      return "#FF1F1F";
    }
    return "#9e9e9e";
  };

  // total count helper for donut centers
  const chartTotal = (arr) => (arr && arr.length ? arr.reduce((s, d) => s + (d.value || 0), 0) : 0);

  /* ----------------------------- UI: Loading guard & detail screens ----------------------------- */

  const globallyLoading = loadingPieChart && loadingTables;

  // detail screens kept from your original patterns (these will render different components if state is set)
  if (viewingDeployment) {
    return (
      <>
        <Box sx={{ p: 3 }}>
          <Typography variant="h6">Deployment details (external component)</Typography>
          <Button onClick={() => setViewingDeployment(null)}>Back</Button>
        </Box>
      </>
    );
  }
  if (viewingService) {
    return (
      <>
        <Box sx={{ p: 3 }}>
          <Typography variant="h6">Service details (external component)</Typography>
          <Button onClick={() => setViewingService(null)}>Back</Button>
        </Box>
      </>
    );
  }
  if (viewingPod) {
    return (
      <>
        <Box sx={{ p: 3 }}>
          <Typography variant="h6">Pod details (external component)</Typography>
          <Button onClick={() => setViewingPod(null)}>Back</Button>
        </Box>
      </>
    );
  }
  if (viewingReplicaSet) {
    return (
      <>
        <Box sx={{ p: 3 }}>
          <Typography variant="h6">ReplicaSet details (external component)</Typography>
          <Button onClick={() => setViewingReplicaSet(null)}>Back</Button>
        </Box>
      </>
    );
  }

  /* ----------------------------- Main Render ----------------------------- */

  return (
    <Box sx={{ p: 3, bgcolor: "background.default", minHeight: "100vh" }}>
      <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <AppBar position="static" color="transparent" elevation={0}>
          <Toolbar sx={{ gap: 2, flexWrap: "wrap" }}>
            <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700 }}>
              Kubernetes Overview
            </Typography>

            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel id="namespace-select-label">Namespace</InputLabel>
              <Select
                labelId="namespace-select-label"
                value={selectedNamespace}
                label="Namespace"
                onChange={(e) => {
                  setSelectedNamespace(e.target.value);
                  setPage(0);
                }}
              >
                {namespaces.map((n) => (
                  <MenuItem key={n} value={n}>
                    {n === "all" ? "All Namespaces" : n}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              size="small"
              placeholder="Search resources..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(0);
              }}
              sx={{ minWidth: 260 }}
            />

            <Box sx={{ display: "flex", gap: 1, alignItems: "center", ml: "auto" }}>
              <Tooltip title="Refresh data">
                <IconButton
                  onClick={() => {
                    // refresh both tables and pie data
                    setLoadingPieChart(true);
                    setLoadingTables(true);
                    // trigger the effects by re-assigning state (simple way: re-call endpoints)
                    (async () => {
                      try {
                        const ns = selectedNamespace === "all" ? "" : selectedNamespace;
                        const [pieRes, svcRes, podsRes, nodesRes, depsRes, rsRes] = await Promise.all([
                          safePromise(apiClient.get(`/k8s/workloads/?namespace=${ns}`)),
                          safePromise(apiClient.get(`/k8s/services/`)),
                          safePromise(apiClient.get(`/k8s/pods/`)),
                          safePromise(apiClient.get(`/k8s/nodes/`)),
                          safePromise(apiClient.get(`/k8s/deployments/`)),
                          safePromise(apiClient.get(`/k8s/replicasets/`)),
                        ]);
                        if (pieRes.status === "fulfilled") setPieData(pieRes.value.data);
                        // reuse previous logic to filter by namespace
                        const fetchedServices = svcRes.status === "fulfilled" ? svcRes.value.data.services ?? [] : [];
                        const fetchedAllPods = podsRes.status === "fulfilled" ? podsRes.value.data.pods ?? [] : [];
                        const fetchedNodes = nodesRes.status === "fulfilled" ? nodesRes.value.data.nodes ?? [] : [];
                        const fetchedAllDeployments = depsRes.status === "fulfilled" ? depsRes.value.data ?? [] : [];
                        const fetchedAllReplicaSets = rsRes.status === "fulfilled" ? rsRes.value.data ?? [] : [];

                        const filteredServices =
                          selectedNamespace === "all" ? fetchedServices : fetchedServices.filter((svc) => svc.namespace === selectedNamespace);
                        const filteredPods = selectedNamespace === "all" ? fetchedAllPods : fetchedAllPods.filter((pod) => pod.namespace === selectedNamespace);
                        const filteredDeployments =
                          selectedNamespace === "all" ? fetchedAllDeployments : fetchedAllDeployments.filter((dep) => dep.namespace === selectedNamespace);
                        const filteredReplicaSets =
                          selectedNamespace === "all" ? fetchedAllReplicaSets : fetchedAllReplicaSets.filter((rs) => rs.Namespace === selectedNamespace);

                        setData({
                          services: filteredServices,
                          allPods: fetchedAllPods,
                          filteredPods: filteredPods,
                          nodes: fetchedNodes,
                          allDeployments: fetchedAllDeployments,
                          filteredDeployments: filteredDeployments,
                          allReplicaSets: fetchedAllReplicaSets,
                          filteredReplicaSets: filteredReplicaSets,
                        });
                      } catch (err) {
                        console.error("Refresh error:", err);
                      } finally {
                        setLoadingPieChart(false);
                        setLoadingTables(false);
                      }
                    })();
                  }}
                >
                  <RefreshIcon />
                </IconButton>
              </Tooltip>

              <Tooltip title="Options / Export">
                <IconButton onClick={(e) => setOptionsAnchor(e.currentTarget)}>
                  <DownloadIcon />
                </IconButton>
              </Tooltip>

              <Menu open={Boolean(optionsAnchor)} anchorEl={optionsAnchor} onClose={() => setOptionsAnchor(null)}>
                <MUIMenuItem
                  onClick={() => {
                    // export current tab
                    const resource = ["Deployments", "Pods", "Replica Sets", "Services", "Nodes"][tabIndex];
                    handleExportCSV(resource);
                    setOptionsAnchor(null);
                  }}
                >
                  Export current table CSV
                </MUIMenuItem>
                <MUIMenuItem
                  onClick={() => {
                    // combined export (example)
                    handleExportCSV(["Deployments", "Pods", "Replica Sets", "Services", "Nodes"][tabIndex]);
                    setOptionsAnchor(null);
                  }}
                >
                  Export (quick)
                </MUIMenuItem>
              </Menu>
            </Box>
          </Toolbar>
        </AppBar>
      </Paper>

      {/* Workload Status section */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
          Workload Status
        </Typography>

        {globallyLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 160 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Grid container spacing={2}>
            {["Deployments", "Pods", "Replica Sets", "Stateful Sets"].map((k) => {
              const chartData = processChartData(k);
              const total = chartTotal(chartData);
              return (
                <Grid item xs={12} sm={6} md={3} key={k}>
                  <Card
                    onClick={() => openBreakdownModal(k)}
                    sx={{
                      height: 160,
                      borderRadius: 2,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                      alignItems: "center",
                      cursor: "pointer",
                      boxShadow: 2,
                      transition: "transform 0.12s ease",
                      "&:hover": { transform: "translateY(-6px)" },
                    }}
                  >
                    <CardContent sx={{ width: "100%", textAlign: "center" }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                        {k}
                      </Typography>

                      {chartData.length > 0 ? (
                        <Box sx={{ width: "100%", height: 100, position: "relative", mt: 1 }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={chartData}
                                dataKey="value"
                                nameKey="name"
                                innerRadius={30}
                                outerRadius={48}
                                paddingAngle={4}
                              >
                                {chartData.map((entry, idx) => (
                                  <Cell key={`cell-${idx}`} fill={entry.color} />
                                ))}
                              </Pie>
                              <ReTooltip />
                            </PieChart>
                          </ResponsiveContainer>

                          <Box sx={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", textAlign: "center" }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                              {total}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              total
                            </Typography>
                          </Box>
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                          No data
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}
      </Box>

      {/* Breakdown modal */}
      {openBreakdown && breakdownKey && piedata && (
        <Paper
          sx={{
            position: "fixed",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            p: 3,
            zIndex: 1400,
            width: 360,
            borderRadius: 2,
            boxShadow: 6,
          }}
        >
          <Typography variant="h6" sx={{ mb: 2 }}>
            {breakdownKey} — status breakdown
          </Typography>

          {(() => {
            const raw = piedata[breakdownKey] || {};
            const running = Number(raw.Running || 0);
            const pending = Number(raw.Pending || 0);
            const failed = Number(raw.Failed || 0);
            const others = Object.entries(raw)
              .filter(([k]) => !["Running", "Pending", "Failed"].includes(k))
              .reduce((s, [, v]) => s + Number(v || 0), 0);
            const total = running + pending + failed + others || 1;
            return (
              <>
                <Stack spacing={1} sx={{ mb: 2 }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Chip label="Running" size="small" sx={{ bgcolor: STATUS_COLORS.Running, color: "#042000", fontWeight: 600 }} />
                      <Typography sx={{ fontWeight: 600 }}>{running}</Typography>
                    </Stack>
                    <Typography color="text.secondary">{((running / total) * 100).toFixed(1)}%</Typography>
                  </Box>

                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Chip label="Pending" size="small" sx={{ bgcolor: STATUS_COLORS.Pending, color: "#3b2e00", fontWeight: 600 }} />
                      <Typography sx={{ fontWeight: 600 }}>{pending}</Typography>
                    </Stack>
                    <Typography color="text.secondary">{((pending / total) * 100).toFixed(1)}%</Typography>
                  </Box>

                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Chip label="Failed" size="small" sx={{ bgcolor: STATUS_COLORS.Failed, color: "#fff", fontWeight: 600 }} />
                      <Typography sx={{ fontWeight: 600 }}>{failed}</Typography>
                    </Stack>
                    <Typography color="text.secondary">{((failed / total) * 100).toFixed(1)}%</Typography>
                  </Box>

                  {others > 0 && (
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip label="Other" size="small" sx={{ bgcolor: STATUS_COLORS.Other, color: "#fff", fontWeight: 600 }} />
                        <Typography sx={{ fontWeight: 600 }}>{others}</Typography>
                      </Stack>
                      <Typography color="text.secondary">{((others / total) * 100).toFixed(1)}%</Typography>
                    </Box>
                  )}
                </Stack>

                <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
                  <Button onClick={closeBreakdownModal} variant="outlined" size="small">
                    Close
                  </Button>
                </Box>
              </>
            );
          })()}
        </Paper>
      )}

      <Box sx={{ mt: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
          Kubernetes Resource Details (Namespace: {selectedNamespace})
        </Typography>

        <Tabs value={tabIndex} onChange={(_, v) => { setTabIndex(v); setPage(0); setSortConfig({ key: null, direction: "asc" }); }} sx={{ mb: 2 }}>
          <Tab label={`Deployments (${filteredDeploymentsForTable.length})`} />
          <Tab label={`Pods (${filteredPodsForTable.length})`} />
          <Tab label={`Replica Sets (${filteredReplicaSetsForTable?.length || 0})`} />
          <Tab label={`Services (${filteredServicesForTable.length})`} />
          <Tab label={`Nodes (${filteredNodesForTable.length})`} />
        </Tabs>

        {/* Tab panels */}
        <Box>
       
        {tabIndex === 0 && (
          <Box>
            {renderTable(
              (Array.isArray(filteredDeploymentsForTable) ? filteredDeploymentsForTable : []).map((d) => ({ ...d })),
              deploymentColumns,
              "deployments"
            )}
          </Box>
        )}

          {tabIndex === 1 && (
            <Box>
              {renderTable(
                filteredPodsForTable.map((p) => ({
                  ...p,
                  // Keep existing fields; ensure cpu/memory display is styled
                  cpu_usage: p.cpu_usage || "N/A",
                  memory_usage: p.memory_usage || "N/A",
                })),
                podsColumns,
                "pods"
              )}
            </Box>
          )}

          {tabIndex === 2 && (
            <Box>
              {renderTable(
                (filteredReplicaSetsForTable || []).map((r) => ({
                  ...r,
                  name: r.name || "",
                  namespace: r.namespace || "",
                  pods: r.pods || 0,
                  created: r.created || "",
                  images: r.images || [],
                })),
                replicaSetColumns,
                "replicasets"
              )}
            </Box>
          )}


          {tabIndex === 3 && (
            <Box>
              {renderTable(filteredServicesForTable.map((s) => ({ ...s })), servicesColumns, "services")}
            </Box>
          )}

          {tabIndex === 4 && (
            <Box>
              {renderTable(filteredNodesForTable.map((n) => ({ ...n })), nodesColumns, "nodes")}
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default KubernetOverview;
