// src/pages/HostAggregates.jsx
import React, { useEffect, useState } from "react";
import apiClient from "../../Axios";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  TextField,
  Box,
  Modal,
  FormControl,
  Snackbar,
  Alert,
  Slide,
  TablePagination,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import { RiDeleteBin6Line } from "react-icons/ri";
import { tableCellClasses } from "@mui/material/TableCell";
import '../style.css';


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
    color: "#000",
  },
}));

const StyledTableRow = styled(TableRow)(({ theme }) => ({
  backgroundColor: theme.palette.grey[100],
  "&:nth-of-type(odd)": {
    backgroundColor: theme.palette.grey[300],
  },
}));

const HostAggregates = () => {
  const [aggregates, setAggregates] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");

  const [newAgg, setNewAgg] = useState({ name: "", availability_zone: "", metadata: {} });
  const [aggToUpdate, setAggToUpdate] = useState(null);

  const [showCreate, setShowCreate] = useState(false);
  const [showUpdate, setShowUpdate] = useState(false);

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");

  const [selectedAggs, setSelectedAggs] = useState([]);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
    // ✅ NEW STATES
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

  const showSnackbar = (msg, sev) => {
    setSnackbarMessage(msg);
    setSnackbarSeverity(sev);
    setSnackbarOpen(true);
  };

  const handleSnackbarClose = () => setSnackbarOpen(false);

  const fetchAggregates = async () => {
    try {
      setLoading(true);
      setError(false);

      const res = await apiClient.get("infrastructure/host-aggregates/");
      const list = res.data.data || [];

      setAggregates(list);
      setFiltered(list);
      setLoading(false);
    } catch {
      setError(true);
      setLoading(false);
      showSnackbar("Failed to load host aggregates", "error");
    }
  };

  useEffect(() => {
    fetchAggregates();
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


  const handleSearch = (e) => {
    const value = e.target.value.toLowerCase();
    setSearch(value);

    const result = aggregates.filter((v) =>
      JSON.stringify(v).toLowerCase().includes(value)
    );
    setFiltered(result);
    setPage(0);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
  
    // 🔍 Check if name already exists (case-insensitive)
    const existingAgg = aggregates.find(
      (ag) => ag.name.toLowerCase().trim() === newAgg.name.toLowerCase().trim()
    );
  
    if (existingAgg) {
      showSnackbar(
        "A host aggregate with this name already exists. Please choose a different name.",
        "error"
      );
      return;
    }
  
    try {
      const payload = {
        ...newAgg,
        metadata: newAgg.metadata ? JSON.parse(JSON.stringify(newAgg.metadata)) : {},
      };
  
      const response = await apiClient.post("infrastructure/host-aggregates/", payload);
  
      if (response.status === 200 || response.status === 201) {
        showSnackbar("Host aggregate created successfully", "success");
        setShowCreate(false);
        setNewAgg({ name: "", availability_zone: "", metadata: {} });
        fetchAggregates();
      } else {
        showSnackbar("Unexpected server response. Please try again.", "error");
      }
    } catch (error) {
      console.error("Error creating aggregate:", error);
      showSnackbar("Error creating host aggregate. Please try again.", "error");
    }
  };
  

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await apiClient.put(`infrastructure/host-aggregates/${aggToUpdate.id}/`, aggToUpdate);
      showSnackbar("Updated successfully", "success");
      setShowUpdate(false);
      fetchAggregates();
    } catch {
      showSnackbar("Update failed", "error");
    }
  };

  const toggleSelectAgg = (id) => {
    setSelectedAggs((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedAggs.length === filtered.length) {
      setSelectedAggs([]);
    } else {
      setSelectedAggs(filtered.map((ag) => ag.id));
    }
  };
  
  const deleteAggregate = async (id) => {
    if (!window.confirm("Confirm delete?")) return;
    try {
      await apiClient.delete(`infrastructure/host-aggregates/${id}/`);
      showSnackbar("Deleted successfully", "success");
      fetchAggregates();
    } catch {
      showSnackbar("Failed to delete", "error");
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedAggs.length === 0) {
      showSnackbar("No aggregates selected", "error");
      return;
    }
  
    if (!window.confirm("Are you sure you want to delete selected aggregates?"))
      return;
  
    try {
      for (const id of selectedAggs) {
        await apiClient.delete(`infrastructure/host-aggregates/${id}/`);
      }
      showSnackbar("Selected aggregates deleted successfully", "success");
      setSelectedAggs([]);
      fetchAggregates();
    } catch (error) {
      console.error(error);
      showSnackbar("Failed to delete selected aggregates", "error");
    }
  };
  
  const current = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const modalStyle = {
    position: "absolute", top: "50%", left: "50%",
    transform: "translate(-50%, -50%)", width: 400,
    bgcolor: "background.paper", boxShadow: 24, p: 4, borderRadius: 3
  };

  return (
    <div style={{ padding: 20 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <h1>Host Aggregates</h1>
        <Box display="flex" gap={2}>
          <TextField label="Search" value={search} onChange={handleSearch} size="small" />
          <Button variant="contained" onClick={() => setShowCreate(true)} style={{ background: "green" }}>
            Create
          </Button>
          <Button
          variant="contained"
          color="error"
          disabled={selectedAggs.length === 0}
          onClick={handleDeleteSelected}
        >
          Delete Selected
        </Button>

        </Box>
      </Box>

     {/* CREATE MODAL */}
           <Modal open={showCreate} onClose={() => setShowCreate(false)}>
             <Box sx={modalStyle}>
               <h3>Create Host Aggregate</h3>
               <form onSubmit={handleCreate}>
                 <TextField fullWidth label="Name" required value={newAgg.name}
                   onChange={(e) => setNewAgg({ ...newAgg, name: e.target.value })} />
     
                 <TextField fullWidth label="Availability Zone" required      sx={{ mt: 2 }} value={newAgg.availability_zone}
                   onChange={(e) => setNewAgg({ ...newAgg, availability_zone: e.target.value })} />
     
                 {/* <TextField fullWidth label="Metadata (JSON)" sx={{ mt: 2 }} placeholder='{"env":"prod"}'
                   onChange={(e) =>
                     setNewAgg({ ...newAgg, metadata: JSON.parse(e.target.value || "{}") })
                   } /> */}
     
                 <Button type="submit" variant="contained" sx={{ mt: 2 }}>Create</Button>
               </form>
             </Box>
           </Modal>
     
           {/* UPDATE MODAL */}
           <Modal open={showUpdate} onClose={() => setShowUpdate(false)}>
             <Box sx={modalStyle}>
               <h3>Update Host Aggregate</h3>
               <form onSubmit={handleUpdate}>
                 <TextField fullWidth label="Name" value={aggToUpdate?.name || ""}
                   onChange={(e) => setAggToUpdate({ ...aggToUpdate, name: e.target.value })} />
     
                 <TextField fullWidth label="Availability Zone"   disabled sx={{ mt: 2 }}
                   value={aggToUpdate?.availability_zone || ""}
                   onChange={(e) => setAggToUpdate({ ...aggToUpdate, availability_zone: e.target.value })} />
     
                 <TextField fullWidth label="Metadata (JSON)"  disabled sx={{ mt: 2 }}
                   defaultValue={JSON.stringify(aggToUpdate?.metadata || {})}
                   onChange={(e) =>
                     setAggToUpdate({ ...aggToUpdate, metadata: JSON.parse(e.target.value || "{}") })
                   }/>
     
                 <Button type="submit" variant="contained" sx={{ mt: 2 }}>Update</Button>
               </form>
             </Box>
           </Modal>

      <TableContainer component={Paper}
      sx={{
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
      }}
      >
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
            <TableRow>
            <StyledTableCell>
              <input
                type="checkbox"
                checked={selectedAggs.length === filtered.length && filtered.length > 0}
                onChange={toggleSelectAll}
              />
            </StyledTableCell>

              <StyledTableCell>Sr.</StyledTableCell>
              <StyledTableCell>Name</StyledTableCell>
              <StyledTableCell>Availability Zone</StyledTableCell>
              <StyledTableCell>Hosts</StyledTableCell>
              <StyledTableCell>Metadata</StyledTableCell>
              <StyledTableCell>Actions</StyledTableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {current.map((ag, i) => (
              <StyledTableRow key={ag.id}>
                <StyledTableCell>
                  <input
                    type="checkbox"
                    checked={selectedAggs.includes(ag.id)}
                    onChange={() => toggleSelectAgg(ag.id)}
                  />
                </StyledTableCell>

                <StyledTableCell>{page * rowsPerPage + i + 1}</StyledTableCell>
                <StyledTableCell>{ag.name}</StyledTableCell>
                <StyledTableCell>{ag.availability_zone || "-"}</StyledTableCell>
                <StyledTableCell>{ag.hosts?.join(", ") || "-"}</StyledTableCell>
                <StyledTableCell>{JSON.stringify(ag.metadata || {})}</StyledTableCell>
                <StyledTableCell>
                  <Button variant="outlined" onClick={() => { setAggToUpdate(ag); setShowUpdate(true); }}>Update</Button>
                  <Button variant="outlined" color="error" onClick={() => deleteAggregate(ag.id)}>
                    Delete <RiDeleteBin6Line />
                  </Button>
                </StyledTableCell>
              </StyledTableRow>
            ))}
          </TableBody>
        </Table>
        <Box sx={{ width: "100%", display: "flex", justifyContent: "center" }}>
                  <TablePagination
                    component="div"
                    count={filtered.length}
                    page={page}
                    rowsPerPage={rowsPerPage}
                    rowsPerPageOptions={[5, 7, 10]}
                    onPageChange={(_, p) => setPage(p)}
                    onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
                    sx={{
                      borderTop: "none",
                      width: "100%",
                    }}
                  />
                </Box>
      </TableContainer>

      <Snackbar open={snackbarOpen} autoHideDuration={4000} onClose={handleSnackbarClose} anchorOrigin={{ vertical: "top", horizontal: "right" }}>
        <Alert severity={snackbarSeverity} onClose={handleSnackbarClose}>{snackbarMessage}</Alert>
      </Snackbar>
    </div>
  );
};

export default HostAggregates;
