import React, { useEffect, useState } from "react";
import apiClient from "../../Axios";
import { Tabs, Tab, Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, CircularProgress, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";
import { tableCellClasses } from "@mui/material/TableCell";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import SentimentSatisfiedAltIcon from "@mui/icons-material/SentimentSatisfiedAlt"; 
import SentimentDissatisfiedIcon from "@mui/icons-material/SentimentDissatisfied";

// Styled Table Components
const StyledTableCell = styled(TableCell)(({ theme }) => ({
  [`&.${tableCellClasses.head}`]: {
    backgroundColor:
      theme.palette.mode === "dark"
        ? theme.palette.grey[900]
        : theme.palette.grey[800],
    color: theme.palette.common.white,
    fontWeight: "bold",
    fontSize: 16,
    textAlign: "center",
  },
  [`&.${tableCellClasses.body}`]: {
    fontSize: 14,
    textAlign: "center",
    color: theme.palette.text.primary, // auto adjusts
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    maxWidth: "200px",
  },
}));


const StyledTableRow = styled(TableRow)(({ theme }) => ({
  backgroundColor:
    theme.palette.mode === "dark"
      ? theme.palette.grey[800]
      : theme.palette.grey[100],

  "&:nth-of-type(odd)": {
    backgroundColor:
      theme.palette.mode === "dark"
        ? theme.palette.grey[700]
        : theme.palette.grey[300],
  },

  "&:last-child td, &:last-child th": {
    border: 0,
  },
}));



const ServiceMonitoring = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [data, setData] = useState({ compute_services: [], network_agents: [], volume_services: [] });
  // ✅ NEW STATES
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);


  useEffect(() => {
  const fetchData = async () => {
    try {
      const response = await apiClient.get("/openstack/servicemonitor/");
      setData(response.data); // Set the fetched data
      setLoading(false);
    } catch (error) {
      console.error("Error fetching data:", error);
      setError("Failed to load data"); // Set error state
      setLoading(false);
    }
  };
  fetchData(); 
}, []);


// ⭐⭐⭐⭐⭐ ADD LOADING UI HERE ⭐⭐⭐⭐⭐
if (loading) {
  return (
    <div className="cloud-container">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="7.87722 9.61948 33.01 16.88">
        <path
          d="M 12 26 H 37 C 42 26 41 20  37 20 C 38 18 37 15 33 16 C 32 8 15 8 14 17 C 8 16 6 25 12 26"
          className="cloud-back"
        />
        <path
          d="M 12 26 H 37 C 42 26 41 20 37 20 C 38 18 37 15 33 16 C 32 8 15 8 14 17 C 8 16 6 25 12 26"
          className="cloud-front"
        />
      </svg>
      <div className="loading-message">Loading...</div>
    </div>
  );
}

// ⭐⭐⭐⭐⭐ ADD ERROR UI HERE ⭐⭐⭐⭐⭐
if (error) {
  return (
    <div className="error-message">
      <GoAlert />
      <h2>❌ Server Down</h2>
    </div>
  );
}

  const handleTabChange = (_event, newValue) => {
    setActiveTab(newValue);
  };

  const renderStatusIcon = (status) => {
    if (status?.toLowerCase() === "up" || status?.toLowerCase() === "enabled") {
      return <CheckCircleIcon sx={{ color: "green" }} aria-label="Up/Enabled" />;
    }
    return <ErrorIcon sx={{ color: "red" }} aria-label="Down/Disabled" />;
  };

  const renderSmileIcon = (alive) => {
    if (alive?.toLowerCase() === ":-)") {
      return <SentimentSatisfiedAltIcon sx={{ color: "green" }} aria-label="Happy" />;
    }
    return <SentimentDissatisfiedIcon sx={{ color: "red" }} aria-label="Sad" />;
  };  

  const renderTable = (data, headers) => (
    <TableContainer component={Paper}  sx={{
      width: "fit-content",
      minWidth: "75%",
      maxWidth: "100%",
      margin: "0 auto",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      border: "none !important",
      boxShadow: "none !important",
      backgroundColor: "transparent !important"
    }}>
      <Table
      sx={{
        width: "100%",
        minWidth: 650,
        tableLayout: "auto",
    
        // REMOVE ALL BORDERS
        border: "none !important",
        "& td, & th": { border: "none !important" },
        "& .MuiTableCell-root": { borderBottom: "none !important" },
        "& .MuiTableRow-root": { border: "none !important" },
      }}
      >
        <TableHead>
          <TableRow >
            {headers.map((header) => (
              <StyledTableCell key={header} sx={{ fontWeight: "bold" }}>
                {header}
              </StyledTableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map((row, index) => (
            <StyledTableRow key={index}>
              {headers.map((header) => (
                <StyledTableCell key={header}  sx={{ textAlign: "center" }}>   {header === "Alive"
                  ? renderSmileIcon(row[header]) // Use smiley/sad icon for "Alive"
                  : ["State", "Status"].includes(header)
                  ? renderStatusIcon(row[header]) // Use existing status icons
                  : row[header] || "N/A"}</StyledTableCell>
              ))}
            </StyledTableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  
  if (loading) return <Box sx={{ textAlign: "center", mt: 4 }}><CircularProgress /></Box>;
  if (error) return <Typography color="error" sx={{ textAlign: "center", mt: 4 }}>{error}</Typography>;

  return (
    <Box sx={{ width: "100%" }}>
      <Tabs value={activeTab} onChange={handleTabChange} centered>
        <Tab label="Compute Services" />
        <Tab label="Network Agents" />
        <Tab label="Volume Services" />
      </Tabs>

      {activeTab === 0 && renderTable(data.compute_services, ["Binary", "Host", "ID", "State", "Status", "Updated At", "Zone"])}
      {activeTab === 1 && renderTable(data.network_agents, ["Agent Type", "Alive", "Availability Zone", "Binary", "Host", "ID", "State"])}
      {activeTab === 2 && renderTable(data.volume_services, ["Binary", "Host", "State", "Status", "Updated At", "Zone"])}
    </Box>
  );
};

export default ServiceMonitoring;
