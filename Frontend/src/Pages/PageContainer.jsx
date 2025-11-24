import React from "react";
import { useLocation, Link } from "react-router-dom";
import { Breadcrumbs, Typography, Paper } from "@mui/material";

const PageContainer = ({ children }) => {
  const location = useLocation();

  // Generate breadcrumb paths dynamically
  const pathnames = location.pathname.split("/").filter((x) => x);

  return (
    <Paper elevation={3} style={styles.container}>
      {/* Breadcrumb Navigation */}
      <Breadcrumbs aria-label="breadcrumb">
        <Link to="/" style={styles.link}>Home</Link>
        {pathnames.map((name, index) => {
          const routeTo = `/${pathnames.slice(0, index + 1).join("/")}`;
          return index === pathnames.length - 1 ? (
            <Typography key={name} color="text.primary">
              {name.charAt(0).toUpperCase() + name.slice(1)}
            </Typography>
          ) : (
            <Link key={name} to={routeTo} style={styles.link}>
              {name.charAt(0).toUpperCase() + name.slice(1)}
            </Link>
          );
        })}
      </Breadcrumbs>

      {/* Page Content */}
      <div style={styles.content}>{children}</div>
    </Paper>
  );
};

const styles = {
  container: {
    padding: "16px",
    margin: "10px",
    borderRadius: "8px",
    background: "#fff",
  },
  content: {
    marginTop: "16px",
  },
  link: {
    textDecoration: "none",
    color: "#1976d2",
  },
};

export default PageContainer;
