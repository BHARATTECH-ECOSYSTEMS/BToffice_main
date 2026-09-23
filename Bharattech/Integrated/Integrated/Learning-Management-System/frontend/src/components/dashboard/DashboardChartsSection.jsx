import React from "react";
import { ArrowUp, ArrowDown, Sparkles } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from "recharts";

export const chartData = [
  { name: "Jul", visitors: 300 },
  { name: "Aug", visitors: 400 },
  { name: "Sep", visitors: 827 },
];

export const pageViewsData = [
  { name: "Jul", views: 800 },
  { name: "Aug", views: 700 },
  { name: "Sep", views: 645 },
];

const CustomChartTooltip = ({ active, payload, label, unit = "visitors", color = "#2563eb" }) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-slate-200/90 bg-white/95 px-3 py-2 shadow-lg backdrop-blur-sm">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          {label || payload[0].payload.name}
        </p>
        <div className="mt-1 flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
          <span className="text-sm font-bold text-slate-900">{payload[0].value.toLocaleString()}</span>
          <span className="text-xs text-slate-500">{unit}</span>
        </div>
      </div>
    );
  }
  return null;
};

export default function DashboardChartsSection() {
  return (
    <section className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
      {/* Unique Visitors Chart */}
      <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <div>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Unique Visitors</h3>
            <select className="rounded-lg border border-slate-200 bg-slate-50/50 px-2.5 py-1 text-xs font-medium text-slate-600 focus:outline-none">
              <option>Last 3 months</option>
            </select>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-slate-900 tabular-nums">827</span>
            <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-600 border border-emerald-100">
              <ArrowUp className="h-3 w-3" /> 3%
            </span>
          </div>
        </div>

        <div className="mt-4 h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 4, left: 4, bottom: 0 }}>
              <defs>
                <linearGradient id="visitorsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563eb" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#2563eb" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} dy={6} />
              <YAxis hide />
              <Tooltip content={<CustomChartTooltip color="#2563eb" unit="visitors" />} />
              <Area type="monotone" dataKey="visitors" stroke="#2563eb" strokeWidth={2.5} fill="url(#visitorsGrad)" dot={{ fill: "#2563eb", r: 3 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Page Views Chart */}
      <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <div>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Page Views</h3>
            <select className="rounded-lg border border-slate-200 bg-slate-50/50 px-2.5 py-1 text-xs font-medium text-slate-600 focus:outline-none">
              <option>Last 3 months</option>
            </select>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-slate-900 tabular-nums">645</span>
            <span className="inline-flex items-center gap-0.5 rounded-full bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-600 border border-rose-100">
              <ArrowDown className="h-3 w-3" /> 18%
            </span>
          </div>
        </div>

        <div className="mt-4 h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={pageViewsData} margin={{ top: 10, right: 4, left: 4, bottom: 0 }}>
              <defs>
                <linearGradient id="viewsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#9333ea" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#9333ea" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} dy={6} />
              <YAxis hide />
              <Tooltip content={<CustomChartTooltip color="#9333ea" unit="views" />} />
              <Area type="monotone" dataKey="views" stroke="#9333ea" strokeWidth={2.5} fill="url(#viewsGrad)" dot={{ fill: "#9333ea", r: 3 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Intelligence Highlight Card */}
      <div className="flex flex-col justify-between rounded-2xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-6 text-white shadow-lg shadow-blue-500/15 md:col-span-2 lg:col-span-1">
        <div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-blue-200" />
              <span className="text-sm font-bold tracking-wide">Nolio Insights</span>
            </div>
            <span className="rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-medium text-blue-100 backdrop-blur-sm">
              1 hour ago
            </span>
          </div>

          <div className="mt-4">
            <div className="text-4xl font-extrabold tracking-tight md:text-5xl tabular-nums">32%</div>
            <p className="mt-2 text-xs leading-relaxed text-blue-100/90">
              Insight summarized this month. Audience retention is up across key destination landing pages.
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-2">
          <div className="rounded-xl border border-white/15 bg-white/10 p-2.5 backdrop-blur-md">
            <div className="flex items-center justify-between text-xs font-medium text-white">
              <span>• Link clicked</span>
              <span className="text-[11px] text-blue-200">1h ago</span>
            </div>
            <p className="mt-0.5 text-[11px] text-blue-100/80">Page /</p>
          </div>
          <div className="rounded-xl border border-white/15 bg-white/10 p-2.5 backdrop-blur-md">
            <div className="flex items-center justify-between text-xs font-medium text-white">
              <span>• Link clicked</span>
              <span className="text-[11px] text-blue-200">1h ago</span>
            </div>
            <p className="mt-0.5 text-[11px] text-blue-100/80">Page /</p>
          </div>
        </div>
      </div>
    </section>
  );
}
