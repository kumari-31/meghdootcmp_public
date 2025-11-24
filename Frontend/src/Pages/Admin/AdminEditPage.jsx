// pages/AdminEditPage.jsx
import React from "react";
import { Outlet } from "react-router-dom";
import AdminSidebar from "./AdminSidebar";
import { Box } from "@mui/material";

const AdminEditPage = () => {
  return (
    <Box display="flex" height="100%">
      <AdminSidebar />
      <Box flex={1} p={3} sx={{ overflowY: "auto" }}>
        <Outlet /> 
      </Box>
    </Box>
  );
};

export default AdminEditPage;
