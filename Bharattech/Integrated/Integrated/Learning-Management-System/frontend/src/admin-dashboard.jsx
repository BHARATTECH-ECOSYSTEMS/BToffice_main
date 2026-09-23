import React from "react";
import { useNavigate } from "react-router-dom";
import TopNav from "./components/topnav";
import Sidebar from "./components/sidebar";
import { useSidebar } from "./contexts/SidebarContext";
import { Shield, LogOut } from "lucide-react";
import { Button } from "./components/ui/button";
import CertificateManagementModal from "./components/CertificateManagementModal";
import UserManagementModal from "./components/UserManagementModal";
import TaskModal from "./components/dashboard/TaskModal";
import AdminStatsCards from "./components/dashboard/AdminStatsCards";
import AdminCertificatesSection from "./components/dashboard/AdminCertificatesSection";
import AdminUsersSection from "./components/dashboard/AdminUsersSection";
import AdminTasksSection from "./components/dashboard/AdminTasksSection";
import SecurityEventsPanel from "./components/dashboard/SecurityEventsPanel";
import { useAdminDashboard } from "./hooks/useAdminDashboard";
import { generateResetLink } from "./services/passwordResetService";
import "./index.css";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { sidebarOpen } = useSidebar();
  const state = useAdminDashboard();

  const handleLogout = () => {
    try { state.logout(); } catch (e) { console.error(e); }
    localStorage.removeItem("loggedIn");
    navigate("/login");
  };

  const activeCertificates = Array.isArray(state.certificates)
    ? state.certificates.filter(c => c.status === "Active").length
    : 0;

  return (
    <>
      <TopNav />
      <Sidebar />

      <div className={`min-h-screen pt-[72px] transition-all duration-300 overflow-x-hidden ${sidebarOpen ? "lg:pl-[220px]" : "lg:pl-0"} bg-gray-50`}>
        <main className="p-3 sm:p-4 md:p-6 lg:p-8 max-w-screen-xl mx-auto w-full">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6 sm:mb-8">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Admin Dashboard</h1>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">Manage certificates, team members, and tasks</p>
              </div>
            </div>

            <Button
              onClick={handleLogout}
              variant="outline"
              className="text-red-600 hover:bg-red-50 flex items-center justify-center gap-2 px-4 w-full sm:w-auto"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>

          <AdminStatsCards
            totalCertificates={state.certificates?.length || 0}
            activeCertificates={activeCertificates}
            totalUsers={state.users?.length || 0}
            totalResetLinks={state.resetLinks?.length || 0}
          />

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

          {/* ── SecuPrompt Security Events (admin/super-admin only) ─────────── */}
          <SecurityEventsPanel />
        </main>
      </div>

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
    </>
  );
}
