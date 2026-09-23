import React from "react";
import { GraduationCap } from "lucide-react";
import { useMemberDashboard } from "../../hooks/useMemberDashboard";
import MemberStatsCards from "./MemberStatsCards";
import DashboardPortalSection from "./DashboardPortalSection";
import MemberTaskCard from "./MemberTaskCard";
import MemberResetLinksAlert from "./MemberResetLinksAlert";

export default function InternDashboardView() {
  const {
    tasks,
    isLoading,
    resetLinks,
    handleStatusChange,
    handleFileUpload,
    progressPercent,
  } = useMemberDashboard({
    role: "Intern",
    loginPath: "/login",
    emailStorageKey: "internEmail",
    loggedInStorageKey: "internLoggedIn",
  });

  return (
    <div className="space-y-6">
      {/* Member Stats */}
      <MemberStatsCards tasks={tasks} progressPercent={progressPercent} />

      {/* HRMS & Calendar Schedules */}
      <DashboardPortalSection />

      {/* Member Tasks */}
      <MemberTaskCard
        title="My Tasks (Interns)"
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
