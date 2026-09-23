import React from "react";
import { Card } from "../ui/card";
import { Target, CheckCircle, Clock, TrendingUp } from "lucide-react";

function StatCard({ title, value, Icon }) {
  return (
    <Card className="dashboard-stat-card p-2.5 sm:p-3 md:p-4 lg:p-6 rounded-xl">
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <div className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-900">{value}</div>
          <div className="text-[10px] sm:text-xs md:text-sm text-gray-600 truncate leading-tight">{title}</div>
        </div>
        <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 bg-blue-600 text-white rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0 ml-1.5 sm:ml-2">
          <Icon className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 lg:w-7 lg:h-7" />
        </div>
      </div>
    </Card>
  );
}

export default function MemberStatsCards({ tasks, progressPercent }) {
  const completedCount = tasks.filter(t => t.status === "Completed").length;
  const inProgressCount = tasks.filter(t => t.status === "In Progress").length;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4 lg:gap-6 mb-4 sm:mb-6 md:mb-8">
      <StatCard title="My Tasks" value={tasks.length} Icon={Target} />
      <StatCard title="Completed" value={completedCount} Icon={CheckCircle} />
      <StatCard title="In Progress" value={inProgressCount} Icon={Clock} />
      <StatCard title="Progress" value={`${progressPercent()}%`} Icon={TrendingUp} />
    </div>
  );
}
