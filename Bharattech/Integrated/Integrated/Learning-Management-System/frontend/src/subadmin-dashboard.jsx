import React from "react";
import TopNav from "./components/topnav";
import Sidebar from "./components/sidebar";
import { useSidebar } from "./contexts/SidebarContext";
import { Plus, LogOut, Users, CheckCircle, Clock, TrendingUp } from "lucide-react";
import { Input } from "./components/ui/input";
import TaskModal from "./components/dashboard/TaskModal";
import SubadminTaskTable from "./components/dashboard/SubadminTaskTable";
import SubadminResetLinksSection from "./components/dashboard/SubadminResetLinksSection";
import { useSubadminDashboard } from "./hooks/useSubadminDashboard";
import "./index.css";

function StatCard({ title, value, Icon }) {
  return (
    <div className="bg-white p-3 sm:p-4 md:p-6 rounded-xl shadow flex items-center gap-3 sm:gap-4">
      <div className="p-2 sm:p-3 bg-blue-50 rounded-lg text-blue-600 flex-shrink-0">
        <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
      </div>
      <div className="min-w-0">
        <p className="text-gray-500 text-xs sm:text-sm font-medium">{title}</p>
        <p className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
}

export default function SubadminDashboard() {
  const { sidebarOpen } = useSidebar();
  const state = useSubadminDashboard();

  const totalTasks = state.tasks.length;
  const completedTasks = state.tasks.filter(t => t.status === "Completed").length;
  const inProgress = state.tasks.filter(t => t.status === "In Progress").length;
  const performancePercent = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  const handleLogout = () => {
    try { state.logout(); } catch (e) { console.error(e); }
    localStorage.removeItem("subadminLoggedIn");
    state.navigate("/login");
  };

  return (
    <>
      <TopNav />
      <Sidebar />

      <div className={`dashboard-container min-h-screen pt-[86px] duration-300 ${sidebarOpen ? "lg:pl-[220px]" : "lg:pl-0"}`}>
        <div className="flex flex-col lg:flex-row lg:pr-6">
          <main className="flex-1 p-3 sm:p-4 md:p-6 lg:p-8">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6 sm:mb-8">
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-gray-900">Sub-Admin Dashboard</h1>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">Create & assign tasks.</p>
              </div>

              <button
                onClick={handleLogout}
                className="px-3 sm:px-4 py-2 rounded-lg bg-red-50 text-red-600 text-xs sm:text-sm whitespace-nowrap flex-shrink-0 w-full sm:w-auto"
              >
                <LogOut className="w-4 h-4 inline mr-1" /> Logout
              </button>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-6 sm:mb-8 md:mb-10">
              <StatCard title="Total Tasks" value={totalTasks} Icon={Users} />
              <StatCard title="Completed" value={completedTasks} Icon={CheckCircle} />
              <StatCard title="In Progress" value={inProgress} Icon={Clock} />
              <StatCard title="Performance" value={`${performancePercent}%`} Icon={TrendingUp} />
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 mb-6">
              <button
                onClick={async () => {
                  state.setSelectedTask(null);
                  await state.loadUsers();
                  state.setTaskModalOpen(true);
                }}
                className="inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition w-full sm:w-auto"
              >
                <Plus className="w-4 h-4" />
                <span>Create Task</span>
              </button>

              <Input
                value={state.searchTerm}
                onChange={(e) => state.setSearchTerm(e.target.value)}
                placeholder="Search tasks..."
                className="w-full sm:max-w-sm text-sm sm:text-base"
              />
            </div>

            <SubadminTaskTable
              filteredTasks={state.filteredTasks}
              openEditModal={(task) => {
                state.setSelectedTask(task);
                state.setTaskModalOpen(true);
              }}
              handleDeleteTask={state.handleDeleteTask}
            />

            <SubadminResetLinksSection resetLinks={state.resetLinks} />
          </main>
        </div>
      </div>

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
