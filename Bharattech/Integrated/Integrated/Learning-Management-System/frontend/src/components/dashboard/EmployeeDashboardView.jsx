import React from "react";
import { Briefcase } from "lucide-react";
import { useMemberDashboard } from "../../hooks/useMemberDashboard";
import MemberStatsCards from "./MemberStatsCards";
import DashboardPortalSection from "./DashboardPortalSection";
import MemberTaskCard from "./MemberTaskCard";
import MemberResetLinksAlert from "./MemberResetLinksAlert";

export default function EmployeeDashboardView() {
  const {
    tasks,
    isLoading,
    resetLinks,
    handleStatusChange,
    handleFileUpload,
    progressPercent,
  } = useMemberDashboard({
    role: "employee",
    loginPath: "/login",
    emailStorageKey: "employeeEmail",
    loggedInStorageKey: "employeeLoggedIn",
  });

  return (
    <div className="space-y-6">
      {/* Member Stats */}
      <MemberStatsCards tasks={tasks} progressPercent={progressPercent} />

      {/* HRMS & Calendar Schedules */}
      <DashboardPortalSection />

      {/* Member Tasks */}
      <MemberTaskCard
        title="My Tasks (Employee)"
        tasks={tasks}
        isLoading={isLoading}
        onFileUpload={handleFileUpload}
        onStatusChange={handleStatusChange}
      />

      {/* Reset Links Alert */}
      <MemberResetLinksAlert resetLinks={resetLinks} />
    </div>
  );
}
