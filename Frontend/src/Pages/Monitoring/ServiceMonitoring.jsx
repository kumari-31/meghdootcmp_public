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
    backgroundColor: "#253848",
    color: theme.palette.common.white,
    fontWeight: "bold",
    fontSize: 16,
    textAlign: "center",
  },
  [`&.${tableCellClasses.body}`]: {
    fontSize: 14,
    textAlign: "center",
  },
}));

const StyledTableRow = styled(TableRow)(({ theme }) => ({
  backgroundColor: theme.palette.grey[100], // Default background for even rows
  "&:nth-of-type(odd)": {
    backgroundColor: theme.palette.grey[300], // Alternate row color
  },
  "&:last-child td, &:last-child th": {
    border: 0,
  },
}));



const ServiceMonitoring = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [data, setData] = useState({ compute_services: [], network_agents: [], volume_services: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
    <TableContainer component={Paper} sx={{ mt: 2 }}>
      <Table>
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
