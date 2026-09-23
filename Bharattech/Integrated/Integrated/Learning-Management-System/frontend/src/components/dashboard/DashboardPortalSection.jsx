import React from "react";
import { ExternalLink, CalendarDays, Check } from "lucide-react";
import { Calendar } from "../ui/calendar";

const HRMS_LOGIN_URL = "https://hrm.bharat-tech.org/login/";

export default function DashboardPortalSection() {
  const handleHRMSLogin = () => {
    window.open(HRMS_LOGIN_URL, "_blank", "noopener,noreferrer");
  };

  return (
    <section className="grid grid-cols-1 gap-5 lg:grid-cols-12">
      {/* HRMS Access Tile */}
      <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm lg:col-span-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-md shadow-blue-500/20">
              <ExternalLink className="h-5 w-5" />
            </div>
            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700 border border-blue-100">
              HR Management
            </span>
          </div>

          <div>
            <h3 className="text-base font-bold text-slate-900">HRMS Portal Access</h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              Single sign-on access to streamline workforce administration and operations.
            </p>
          </div>

          <div className="space-y-2.5 rounded-xl bg-slate-50/80 p-3.5 border border-slate-100">
            {["Employee Directory & Profiles", "Leave & Attendance Tracking", "Payroll & Performance Insights", "Secure SSO Authentication"].map((item) => (
              <div key={item} className="flex items-center gap-2 text-xs font-medium text-slate-700">
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                  <Check className="h-2.5 w-2.5 stroke-[3]" />
                </span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={handleHRMSLogin}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-blue-600 hover:shadow-md"
        >
          <span>Launch HRMS Login</span>
          <ExternalLink className="h-3.5 w-3.5 opacity-80" />
        </button>
      </div>

      {/* Integrated Calendar Schedule */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm lg:col-span-8">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">Calendar & Schedules</h3>
          </div>
          <span className="text-[11px] font-medium text-slate-400">Live Sync</span>
        </div>
        <div className="flex items-center justify-center overflow-x-auto">
          <Calendar className="w-full" />
        </div>
      </div>
    </section>
  );
}
