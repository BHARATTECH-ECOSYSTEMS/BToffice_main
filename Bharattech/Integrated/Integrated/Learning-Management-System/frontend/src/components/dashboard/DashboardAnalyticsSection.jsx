import React from "react";
import { ArrowUp } from "lucide-react";

export const pageData = [
  { page: "/Home page", visitors: 532, percentage: 85 },
  { page: "/Pricing", visitors: 450, percentage: 60 },
  { page: "/Contact", visitors: 320, percentage: 40 },
  { page: "/News", visitors: 200, percentage: 25 },
  { page: "/About", visitors: 345, percentage: 45 },
];

export const deviceData = [
  { device: "Total visitors", count: "2147", percentage: 100, change: "+2%" },
  { device: "Mac OS", count: "873", percentage: 41, change: "+1%" },
  { device: "Windows", count: "645", percentage: 30, change: "+3%" },
  { device: "iOS", count: "412", percentage: 19, change: "+2%" },
  { device: "Android", count: "217", percentage: 10, change: "+1%" },
];

export const PAGE_TABS = ["Pages", "Entry Pages", "Exit Pages"];

export default function DashboardAnalyticsSection({ activeTab, setActiveTab, navigate }) {
  return (
    <section className="grid grid-cols-1 gap-5 lg:grid-cols-3">
      {/* Pages Performance Table */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm lg:col-span-2">
        <div className="flex flex-col gap-3 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1">
            {PAGE_TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  activeTab === tab ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <select className="rounded-lg border border-slate-200 bg-slate-50/50 px-2.5 py-1 text-xs font-medium text-slate-600 focus:outline-none">
            <option>This month</option>
          </select>
        </div>

        <div className="mt-2 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            <span>Page Name</span>
            <span>Visitors</span>
          </div>

          {pageData.map((p) => (
            <div key={p.page} className="group flex items-center justify-between rounded-xl p-2.5 hover:bg-slate-50">
              <div className="flex-1 pr-6">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-800 group-hover:text-blue-600 transition-colors">
                    {p.page}
                  </span>
                  <span className="text-[11px] font-medium text-slate-400">{p.percentage}% share</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-blue-600 transition-all duration-500" style={{ width: `${p.percentage}%` }} />
                </div>
              </div>
              <div className="w-20 text-right text-xs font-bold text-slate-900 tabular-nums">
                {p.visitors.toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Device Distribution */}
      <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <div>
          <div className="flex items-center justify-between pb-4">
            <h3 className="text-sm font-bold text-slate-900">Device Users</h3>
            <select className="rounded-lg border border-slate-200 bg-slate-50/50 px-2.5 py-1 text-xs font-medium text-slate-600 focus:outline-none">
              <option>This month</option>
            </select>
          </div>

          <div className="space-y-4">
            {deviceData.map((d, i) => (
              <div key={d.device} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className={i === 0 ? "font-bold text-slate-900" : "font-medium text-slate-700"}>
                    {d.device}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 tabular-nums">{Number(d.count).toLocaleString()}</span>
                    <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600 border border-emerald-100">
                      {d.change}
                    </span>
                  </div>
                </div>

                {i > 0 && (
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-purple-800 transition-all duration-500"
                      style={{ width: `${d.percentage}%` }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 border-t border-slate-100 pt-4">
          <p className="text-xs text-slate-500">
            You have reached <strong className="text-slate-800 font-semibold">92%</strong> of your target statistics this month.
          </p>
          <button
            type="button"
            onClick={() => navigate("/clicks")}
            className="mt-2.5 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
          >
            <span>View detailed report</span>
            <ArrowUp className="h-3.5 w-3.5 rotate-45" />
          </button>
        </div>
      </div>
    </section>
  );
}
