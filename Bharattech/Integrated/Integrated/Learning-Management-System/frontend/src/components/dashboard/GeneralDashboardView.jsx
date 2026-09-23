import React from "react";
import { Users, Share2, Check } from "lucide-react";
import DashboardMetricsSection from "./DashboardMetricsSection";
import DashboardPortalSection from "./DashboardPortalSection";
import DashboardChartsSection from "./DashboardChartsSection";
import DashboardAnalyticsSection, { PAGE_TABS } from "./DashboardAnalyticsSection";

export default function GeneralDashboardView({
  dashboardData,
  handleViewDetails,
  handleShareDashboard,
  isSharing,
  copied,
  activeTab,
  setActiveTab,
  navigate,
}) {
  return (
    <div className="space-y-6">


      <DashboardMetricsSection
        dashboardData={dashboardData}
        handleViewDetails={handleViewDetails}
      />

      <DashboardPortalSection />

      <DashboardChartsSection />

      <DashboardAnalyticsSection
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        navigate={navigate}
      />
    </div>
  );
}
