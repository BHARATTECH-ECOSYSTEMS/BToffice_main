import { Box } from "@mui/material";
import TopNav from "../components/topnav";
import Sidebar from "../components/sidebar";
import { useSidebar } from "../contexts/SidebarContext";  

const Layout = ({ children }) => {
  const { sidebarOpen } = useSidebar();   

  return (
    <Box className="layout-root" sx={{ minHeight: "100vh" }}>

      {/* Top Navbar */}
      <TopNav />

      {/* Main Layout */}
      <Box sx={{ display: "flex", pt: "72px", overflowX: "hidden" }}>

        {/* Sidebar */}
        <Sidebar />

        {/* Content Area */}
        <Box
          sx={{
            flex: 1,
            ml: { xs: 0, lg: sidebarOpen ? "220px" : "0px" },
            width: { xs: "100%", lg: sidebarOpen ? "calc(100% - 220px)" : "100%" },
            minWidth: 0,
            maxWidth: "100vw",
            overflowX: "hidden",
            py: 2,
            transition: "all 0.3s ease",
          }}
        >
          {children}
        </Box>

      </Box>
    </Box>
  );
};

export default Layout;
