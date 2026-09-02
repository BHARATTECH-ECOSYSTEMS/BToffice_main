import { Outlet } from "react-router-dom";
import TopNav from "../components/topnav";
import Sidebar from "../components/sidebar";
import { useSidebar } from "../contexts/SidebarContext";

const LMSLayout = () => {
  const { sidebarOpen } = useSidebar();

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden">
      {/* TopNav at the top */}
      <TopNav />
      
      {/* Sidebar and Content below TopNav */}
      <div className="flex flex-1 pt-[72px]">
        {/* Sidebar */}
        <Sidebar />
        
        {/* Page content */}
        <div className={`min-w-0 flex-1 overflow-x-hidden transition-all duration-300 ${
          sidebarOpen ? "lg:pl-[240px]" : "lg:pl-0"
        }`}>
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default LMSLayout;

