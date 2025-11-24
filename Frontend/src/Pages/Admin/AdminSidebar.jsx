import React from "react";
import { List, ListItemButton, ListItemText, Box, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";

const sidebarItems = [
  { label: "Project Name", path: "projectname" },
  { label: "Add Employee", path: "addempolyee" },
  // { label: "Designation", path: "/admin/designation" },
  // Add more items as needed
];

const AdminSidebar = () => {
  const navigate = useNavigate();

  return (
    <Box sx={{ width: 250, borderRight: "2px solid #ddd", height: "100%", pt: 3, px: 1 }}>
    <Typography variant="h5" fontWeight="bold"  gutterBottom>
      Edit Panel
    </Typography>
    <List>
      {sidebarItems.map((item) => (
        <ListItemButton key={item.path} onClick={() => navigate(item.path)}>
          <ListItemText
            primary={
              <Typography fontWeight="bold" variant="body1">
                {item.label}
              </Typography>
            }
          />
        </ListItemButton>
      ))}
    </List>
  </Box>
  );
};

export default AdminSidebar;