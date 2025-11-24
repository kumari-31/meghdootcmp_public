import React from "react";
import Navbar from "../Components/Navbar";
import { Outlet } from 'react-router-dom';
// import PageContainer from "./PageContainer";

const Layout = () => {
  return (
    <div style={styles.layout}>
      <Navbar />
      <div style={styles.content}>
      {/* <PageContainer> */}
      <Outlet />
      {/* </PageContainer> */}
      </div>
     
    </div>
  );
};

const styles = {
  layout: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    overflow: "hidden",
  },
  content: {
    flex: 1, 
    overflowY: "auto", 
     padding: "10px",
    // marginTop: "10px",
    //  background: "#051B33"
    
  },
};

export default Layout;
