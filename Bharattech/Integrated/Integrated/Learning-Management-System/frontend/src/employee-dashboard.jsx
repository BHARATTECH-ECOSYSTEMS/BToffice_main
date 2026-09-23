import React from "react";
import TopNav from "./components/topnav";
import Sidebar from "./components/sidebar";
import { useSidebar } from "./contexts/SidebarContext";
import "./index.css";
import { User, LogOut } from "lucide-react";
import { useMemberDashboard } from "./hooks/useMemberDashboard";
import MemberStatsCards from "./components/dashboard/MemberStatsCards";
import MemberTaskCard from "./components/dashboard/MemberTaskCard";
import MemberResetLinksAlert from "./components/dashboard/MemberResetLinksAlert";

export default function EmployeeDashboard() {
  const { sidebarOpen } = useSidebar();
  const {
    tasks,
    isLoading,
    resetLinks,
    handleLogout,
    handleStatusChange,
    handleFileUpload,
    progressPercent
  } = useMemberDashboard({
    role: "employee",
    loginPath: "/employee-login",
    emailStorageKey: "employeeEmail",
    loggedInStorageKey: "employeeLoggedIn"
  });

  return (
    <>
      <TopNav />
      <Sidebar />

      <div
        className={`dashboard-container min-h-screen pt-[72px] sm:pt-[86px] transition-all duration-300 overflow-x-hidden ${
          sidebarOpen ? "lg:pl-[220px]" : "lg:pl-0"
        }`}
      >
        <div className="flex flex-col lg:flex-row">
          <main className="flex-1 p-3 sm:p-4 md:p-6 lg:p-8">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6 md:mb-8">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                <div className="w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-blue-600 text-white rounded-lg sm:rounded-xl flex items-center justify-center shadow flex-shrink-0">
                  <User className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-extrabold text-gray-900 leading-tight">
                    Employee Dashboard
                  </h1>
                  <p className="text-[10px] sm:text-xs md:text-sm text-gray-600 mt-0.5 sm:mt-1 leading-tight">
                    View tasks, update status, and upload project files.
                  </p>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-red-50 text-red-600 text-xs sm:text-sm whitespace-nowrap flex-shrink-0 w-full sm:w-auto flex items-center justify-center gap-1 cursor-pointer"
              >
                <LogOut className="w-3 h-3 sm:w-4 sm:h-4" />
                <span>Logout</span>
              </button>
            </div>

            <MemberStatsCards tasks={tasks} progressPercent={progressPercent} />

            <MemberTaskCard
              title="My Tasks (Employee)"
              tasks={tasks}
              isLoading={isLoading}
              onFileUpload={handleFileUpload}
              onStatusChange={handleStatusChange}
            />

            <MemberResetLinksAlert resetLinks={resetLinks} />
          </main>
        </div>
      </div>
    </>
  );
}
