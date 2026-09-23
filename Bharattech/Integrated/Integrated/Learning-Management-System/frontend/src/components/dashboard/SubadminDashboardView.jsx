import React from "react";
import { Plus, Users, CheckCircle, Clock, TrendingUp, ShieldAlert } from "lucide-react";
import { Input } from "../ui/input";
import TaskModal from "./TaskModal";
import SubadminTaskTable from "./SubadminTaskTable";
import SubadminResetLinksSection from "./SubadminResetLinksSection";
import DashboardPortalSection from "./DashboardPortalSection";
import { useSubadminDashboard } from "../../hooks/useSubadminDashboard";

function StatCard({ title, value, Icon }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-white p-4 shadow-sm border border-slate-100 sm:p-5">
      <div className="flex-shrink-0 rounded-xl bg-blue-50 p-3 text-blue-600">
        <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500 sm:text-sm">{title}</p>
        <p className="text-lg font-bold text-slate-900 sm:text-2xl">{value}</p>
      </div>
    </div>
  );
}

export default function SubadminDashboardView() {
  const state = useSubadminDashboard();

  const totalTasks = state.tasks.length;
  const completedTasks = state.tasks.filter((t) => t.status === "Completed").length;
  const inProgress = state.tasks.filter((t) => t.status === "In Progress").length;
  const performancePercent = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  return (
    <div className="space-y-6">


      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:gap-6 lg:grid-cols-4">
        <StatCard title="Total Tasks" value={totalTasks} Icon={Users} />
        <StatCard title="Completed" value={completedTasks} Icon={CheckCircle} />
        <StatCard title="In Progress" value={inProgress} Icon={Clock} />
        <StatCard title="Performance" value={`${performancePercent}%`} Icon={TrendingUp} />
      </div>

      {/* HRMS & Calendar Schedules */}
      <DashboardPortalSection />

      {/* Task Controls */}
      <div className="flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center sm:gap-4">
        <button
          onClick={async () => {
            state.setSelectedTask(null);
            await state.loadUsers();
            state.setTaskModalOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 sm:w-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Create Task</span>
        </button>

        <Input
          value={state.searchTerm}
          onChange={(e) => state.setSearchTerm(e.target.value)}
          placeholder="Search tasks by title, assigned user..."
          className="w-full rounded-xl border-slate-200 sm:max-w-xs"
        />
      </div>

      {/* Tasks Table */}
      <SubadminTaskTable
        filteredTasks={state.filteredTasks}
        openEditModal={(task) => {
          state.setSelectedTask(task);
          state.setTaskModalOpen(true);
        }}
        handleDeleteTask={state.handleDeleteTask}
      />

      {/* Reset Links Section */}
      <SubadminResetLinksSection resetLinks={state.resetLinks} />

      {/* Task Modal */}
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
