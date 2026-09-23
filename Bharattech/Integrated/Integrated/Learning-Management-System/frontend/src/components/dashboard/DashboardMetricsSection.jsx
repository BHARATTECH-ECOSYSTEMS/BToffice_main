import React from "react";
import { ArrowUp, Users, CalendarDays, FileText } from "lucide-react";

export const statCards = [
  { key: "totalCourses", label: "Total Courses", icon: FileText, navType: "visitors" },
  { key: "pendingCourses", label: "Pending Courses", icon: CalendarDays, navType: "visitors" },
  { key: "totalUsers", label: "Total Users", icon: Users, navType: "visitors" },
];

export default function DashboardMetricsSection({ dashboardData, handleViewDetails }) {
  return (
    <section aria-label="Key Performance Indicators">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-5 lg:grid-cols-3">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          const value = dashboardData?.[stat.key] ?? 0;
          return (
            <div
              key={stat.key}
              className="group relative flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm !transition-all !duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
            >
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {stat.label}
                </p>
                <div className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl tabular-nums">
                  {typeof value === "number" ? value.toLocaleString() : value}
                </div>
                <button
                  type="button"
                  onClick={() => handleViewDetails(stat.navType)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 transition-colors hover:text-blue-700"
                >
                  <span>View details</span>
                  <ArrowUp className="h-3.5 w-3.5 rotate-45 !transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </button>
              </div>

              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-md shadow-blue-500/20 !transition-transform group-hover:scale-105">
                <Icon className="h-6 w-6" />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
