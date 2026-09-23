import React, { useState } from "react";
import CertificateManagementModal from "../CertificateManagementModal";
import UserManagementModal from "../UserManagementModal";
import TaskModal from "./TaskModal";
import AdminStatsCards from "./AdminStatsCards";
import AdminCertificatesSection from "./AdminCertificatesSection";
import AdminUsersSection from "./AdminUsersSection";
import AdminTasksSection from "./AdminTasksSection";
import SecurityEventsPanel from "./SecurityEventsPanel";
import { useAdminDashboard } from "../../hooks/useAdminDashboard";
import { generateResetLink } from "../../services/passwordResetService";
import DashboardPortalSection from "./DashboardPortalSection";
import DashboardMetricsSection from "./DashboardMetricsSection";
import DashboardChartsSection from "./DashboardChartsSection";
import DashboardAnalyticsSection, { PAGE_TABS } from "./DashboardAnalyticsSection";

export default function AdminDashboardView({
  dashboardData,
  handleViewDetails,
  activeTab = "management",
}) {
  const state = useAdminDashboard();
  const [analyticsPageTab, setAnalyticsPageTab] = useState(PAGE_TABS ? PAGE_TABS[0] : null);

  const activeCertificates = Array.isArray(state.certificates)
    ? state.certificates.filter((c) => c.status === "Active").length
    : 0;

  return (
    <div className="space-y-6">
      {activeTab === "management" ? (
        <>
          {/* Admin Stats */}
          <AdminStatsCards
            totalCertificates={state.certificates?.length || 0}
            activeCertificates={activeCertificates}
            totalUsers={state.users?.length || 0}
            totalResetLinks={state.resetLinks?.length || 0}
          />

          {/* HRMS & Calendar Schedules */}
          <DashboardPortalSection />

          {/* Admin Certificates */}
          <AdminCertificatesSection
            filteredCertificates={state.filteredCertificates}
            certificateSearchTerm={state.certificateSearchTerm}
            setCertificateSearchTerm={state.setCertificateSearchTerm}
            handleAddCertificate={() => {
              state.setSelectedCertificate(null);
              state.setIsCertificateModalOpen(true);
            }}
            handleEditCertificate={(cert) => {
              state.setSelectedCertificate(cert);
              state.setIsCertificateModalOpen(true);
            }}
          />

          {/* Admin Users */}
          <AdminUsersSection
            filteredUsers={state.filteredUsers}
            isLoading={state.isLoading}
            searchTerm={state.searchTerm}
            setSearchTerm={state.setSearchTerm}
            handleAddUser={() => {
              state.setSelectedUser(null);
              state.setIsModalOpen(true);
            }}
            handleEditUser={(user) => {
              state.setSelectedUser(user);
              state.setIsModalOpen(true);
            }}
            authUser={state.authUser}
            normalizeRole={state.normalizeRole}
          />

          {/* Admin Tasks */}
          <AdminTasksSection
            filteredTasks={state.filteredTasks}
            isLoading={state.isLoading}
            taskSearchTerm={state.taskSearchTerm}
            setTaskSearchTerm={state.setTaskSearchTerm}
            openCreateTaskModal={async () => {
              state.setSelectedTask(null);
              await state.loadAssignableUsers();
              state.setTaskModalOpen(true);
            }}
            openEditTaskModal={(task) => {
              state.setSelectedTask(task);
              state.setTaskModalOpen(true);
            }}
            handleDeleteTask={state.handleDeleteTask}
          />

          {/* SecuPrompt Security Events Panel */}
          <SecurityEventsPanel />
        </>
      ) : (
        <>
          {/* Platform Analytics & Metrics */}
          {dashboardData && (
            <DashboardMetricsSection
              dashboardData={dashboardData}
              handleViewDetails={handleViewDetails}
            />
          )}
          <DashboardPortalSection />
          <DashboardChartsSection />
          {analyticsPageTab && (
            <DashboardAnalyticsSection
              activeTab={analyticsPageTab}
              setActiveTab={setAnalyticsPageTab}
            />
          )}
        </>
      )}

      {/* Modals */}
      <CertificateManagementModal
        certificate={state.selectedCertificate}
        isOpen={state.isCertificateModalOpen}
        onClose={() => {
          state.setIsCertificateModalOpen(false);
          state.setSelectedCertificate(null);
        }}
        onSave={state.handleSaveCertificate}
        onDelete={state.handleDeleteCertificate}
      />

      <UserManagementModal
        user={state.selectedUser}
        isOpen={state.isModalOpen}
        onClose={() => {
          state.setIsModalOpen(false);
          state.setSelectedUser(null);
        }}
        onSave={state.handleSaveUser}
        onDelete={state.handleDeleteUser}
        onGenerateLink={generateResetLink}
      />

      {state.taskModalOpen && (
        <TaskModal
          initial={state.selectedTask}
          assignableUsers={state.assignableUsers}
          onClose={() => {
            state.setTaskModalOpen(false);
            state.setSelectedTask(null);
          }}
          onSave={state.handleSaveTask}
        />
      )}
    </div>
  );
}
