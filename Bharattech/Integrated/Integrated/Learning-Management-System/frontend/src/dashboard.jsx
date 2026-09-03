import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./index.css";
import api from "./api/api"; // adjust path if needed

import { Calendar } from "./components/ui/calendar";
import {
  ExternalLink,
  Users,
  CalendarDays,
  FileText,
  ArrowUp,
  ArrowDown,
  Share2,
  Check,
  Sparkles,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

const HRMS_LOGIN_URL = "https://hrm.bharat-tech.org/login/";

const statCards = [
  {
    key: "totalCourses",
    label: "Total Courses",
    icon: FileText,
    navType: "visitors",
  },
  {
    key: "pendingCourses",
    label: "Pending Courses",
    icon: CalendarDays,
    navType: "visitors",
  },
  {
    key: "totalUsers",
    label: "Total Users",
    icon: Users,
    navType: "visitors",
  },
];

const chartData = [
  { name: "Jul", visitors: 300 },
  { name: "Aug", visitors: 400 },
  { name: "Sep", visitors: 827 },
];

const pageViewsData = [
  { name: "Jul", views: 800 },
  { name: "Aug", views: 700 },
  { name: "Sep", views: 645 },
];

const pageData = [
  { page: "/Home page", visitors: 532, percentage: 85 },
  { page: "/Pricing", visitors: 450, percentage: 60 },
  { page: "/Contact", visitors: 320, percentage: 40 },
  { page: "/News", visitors: 200, percentage: 25 },
  { page: "/About", visitors: 345, percentage: 45 },
];

const deviceData = [
  { device: "Total visitors", count: "2147", percentage: 100, change: "+2%" },
  { device: "Mac OS", count: "873", percentage: 41, change: "+1%" },
  { device: "Windows", count: "645", percentage: 30, change: "+3%" },
  { device: "iOS", count: "412", percentage: 19, change: "+2%" },
  { device: "Android", count: "217", percentage: 10, change: "+1%" },
];

const PAGE_TABS = ["Pages", "Entry Pages", "Exit Pages"];

// Custom minimal chart tooltip
const CustomChartTooltip = ({
  active,
  payload,
  label,
  unit = "visitors",
  color = "#2563eb",
}) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-slate-200/90 bg-white/95 px-3 py-2 shadow-lg backdrop-blur-sm">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          {label || payload[0].payload.name}
        </p>
        <div className="mt-1 flex items-center gap-1.5">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: color }}
          />
          <span className="text-sm font-bold text-slate-900">
            {payload[0].value.toLocaleString()}
          </span>
          <span className="text-xs text-slate-500">{unit}</span>
        </div>
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [isSharing, setIsSharing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(PAGE_TABS[0]);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await api.get("/admin/dashboard");
        setDashboardData(res.data.data);
      } catch (err) {
        console.error("Dashboard error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  const handleShareDashboard = async () => {
    setIsSharing(true);
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Bharattech Dashboard",
          text: "Check out my dashboard",
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (err) {
      console.log("Error sharing:", err);
    } finally {
      setIsSharing(false);
    }
  };

  const handleHRMSLogin = () => {
    window.open(HRMS_LOGIN_URL, "_blank", "noopener,noreferrer");
  };

  const handleViewDetails = (type) => {
    if (type === "visitors") navigate("/clicks");
    else if (type === "events") navigate("/cms");
    else if (type === "forms") navigate("/forms");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50/50 px-4 py-8 md:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="h-32 w-full animate-pulse rounded-2xl bg-slate-200" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-28 animate-pulse rounded-2xl bg-slate-200"
              />
            ))}
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="h-80 animate-pulse rounded-2xl bg-slate-200" />
            <div className="h-80 animate-pulse rounded-2xl bg-slate-200" />
            <div className="h-80 animate-pulse rounded-2xl bg-slate-200" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/60 px-4 py-6 font-sans text-slate-800 transition-all duration-300 md:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* ── 1. Hero Header Banner ── */}
        <header className="bharat-hero-banner relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 p-6 shadow-md md:p-8">
          <div className="bharat-hero-glow" />
          <div className="bharat-hero-beams" />

          <div className="relative z-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-blue-200">
                  Bharattech Platform
                </span>
                <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-white md:text-3xl">
                Dashboard Overview
              </h1>
              <p className="mt-2 text-xs text-blue-100/80 md:text-sm">
                Monitor live performance, course activities, and audience
                engagement
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/15 px-3.5 py-1.5 text-xs font-semibold text-white backdrop-blur-md">
                <Users className="h-3.5 w-3.5 text-blue-200" />
                <span>Integrated Workspace</span>
              </div>

              <button
                type="button"
                onClick={handleShareDashboard}
                disabled={isSharing}
                className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-blue-700 shadow-sm transition-all hover:bg-blue-50 hover:shadow disabled:opacity-60"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="h-3.5 w-3.5 text-blue-600" />
                    <span>{isSharing ? "Sharing..." : "Share"}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </header>

        {/* ── 2. Primary KPI Metrics ── */}
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
                      {typeof value === "number"
                        ? value.toLocaleString()
                        : value}
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

        {/* ── 3. Quick Portal & Schedule Section ── */}
        <section className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          {/* HRMS Quick Access Tile with Bullet Points */}
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
                <h3 className="text-base font-bold text-slate-900">
                  HRMS Portal Access
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                  Single sign-on access to streamline workforce administration
                  and operations.
                </p>
              </div>

              {/* Highlights List to fill the gap cleanly */}
              <div className="space-y-2.5 rounded-xl bg-slate-50/80 p-3.5 border border-slate-100">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                    <Check className="h-2.5 w-2.5 stroke-[3]" />
                  </span>
                  <span>Employee Directory & Profiles</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                    <Check className="h-2.5 w-2.5 stroke-[3]" />
                  </span>
                  <span>Leave & Attendance Tracking</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                    <Check className="h-2.5 w-2.5 stroke-[3]" />
                  </span>
                  <span>Payroll & Performance Insights</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                    <Check className="h-2.5 w-2.5 stroke-[3]" />
                  </span>
                  <span>Secure SSO Authentication</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleHRMSLogin}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-blue-600 hover:shadow-md active:scale-[0.99]"
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
                <h3 className="text-sm font-bold text-slate-900">
                  Calendar & Schedules
                </h3>
              </div>
              <span className="text-[11px] font-medium text-slate-400">
                Live Sync
              </span>
            </div>
            <div className="flex items-center justify-center overflow-x-auto">
              <Calendar className="w-full" />
            </div>
          </div>
        </section>

        {/* ── 4. Analytics & Insights Grid ── */}
        <section className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {/* Unique Visitors Chart */}
          <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">
                  Unique Visitors
                </h3>
                <select className="rounded-lg border border-slate-200 bg-slate-50/50 px-2.5 py-1 text-xs font-medium text-slate-600 transition-colors focus:border-blue-500 focus:outline-none">
                  <option>Last 3 months</option>
                </select>
              </div>

              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold tracking-tight text-slate-900 tabular-nums">
                  827
                </span>
                <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-600 border border-emerald-100">
                  <ArrowUp className="h-3 w-3" /> 3%
                </span>
              </div>
            </div>

            <div className="mt-4 h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartData}
                  margin={{ top: 10, right: 4, left: 4, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="visitorsGrad"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="#2563eb"
                        stopOpacity={0.25}
                      />
                      <stop
                        offset="100%"
                        stopColor="#2563eb"
                        stopOpacity={0.0}
                      />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#94a3b8", fontSize: 11 }}
                    dy={6}
                  />
                  <YAxis hide />
                  <Tooltip
                    content={
                      <CustomChartTooltip color="#2563eb" unit="visitors" />
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="visitors"
                    stroke="#2563eb"
                    strokeWidth={2.5}
                    fill="url(#visitorsGrad)"
                    dot={{ fill: "#2563eb", r: 3 }}
                    activeDot={{ r: 5, stroke: "#ffffff", strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Page Views Chart */}
          <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Page Views</h3>
                <select className="rounded-lg border border-slate-200 bg-slate-50/50 px-2.5 py-1 text-xs font-medium text-slate-600 transition-colors focus:border-purple-500 focus:outline-none">
                  <option>Last 3 months</option>
                </select>
              </div>

              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold tracking-tight text-slate-900 tabular-nums">
                  645
                </span>
                <span className="inline-flex items-center gap-0.5 rounded-full bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-600 border border-rose-100">
                  <ArrowDown className="h-3 w-3" /> 18%
                </span>
              </div>
            </div>

            <div className="mt-4 h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={pageViewsData}
                  margin={{ top: 10, right: 4, left: 4, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="viewsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor="#9333ea"
                        stopOpacity={0.25}
                      />
                      <stop
                        offset="100%"
                        stopColor="#9333ea"
                        stopOpacity={0.0}
                      />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#94a3b8", fontSize: 11 }}
                    dy={6}
                  />
                  <YAxis hide />
                  <Tooltip
                    content={
                      <CustomChartTooltip color="#9333ea" unit="views" />
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="views"
                    stroke="#9333ea"
                    strokeWidth={2.5}
                    fill="url(#viewsGrad)"
                    dot={{ fill: "#9333ea", r: 3 }}
                    activeDot={{ r: 5, stroke: "#ffffff", strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Nolio Intelligence Highlight Card */}
          <div className="flex flex-col justify-between rounded-2xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-6 text-white shadow-lg shadow-blue-500/15 md:col-span-2 lg:col-span-1">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-blue-200" />
                  <span className="text-sm font-bold tracking-wide">
                    Nolio Insights
                  </span>
                </div>
                <span className="rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-medium text-blue-100 backdrop-blur-sm">
                  1 hour ago
                </span>
              </div>

              <div className="mt-4">
                <div className="text-4xl font-extrabold tracking-tight md:text-5xl tabular-nums">
                  32%
                </div>
                <p className="mt-2 text-xs leading-relaxed text-blue-100/90">
                  Insight summarized this month. Audience retention is up across
                  key destination landing pages.
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-2">
              <div className="rounded-xl border border-white/15 bg-white/10 p-2.5 backdrop-blur-md transition-colors hover:bg-white/15">
                <div className="flex items-center justify-between text-xs font-medium text-white">
                  <span>• Link clicked</span>
                  <span className="text-[11px] text-blue-200">1h ago</span>
                </div>
                <p className="mt-0.5 text-[11px] text-blue-100/80">Page /</p>
              </div>

              <div className="rounded-xl border border-white/15 bg-white/10 p-2.5 backdrop-blur-md transition-colors hover:bg-white/15">
                <div className="flex items-center justify-between text-xs font-medium text-white">
                  <span>• Link clicked</span>
                  <span className="text-[11px] text-blue-200">1h ago</span>
                </div>
                <p className="mt-0.5 text-[11px] text-blue-100/80">Page /</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── 5. Detailed Breakdown (Pages Traffic & Device Distribution) ── */}
        <section className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {/* Pages Performance Table */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm lg:col-span-2">
            <div className="flex flex-col gap-3 pb-4 sm:flex-row sm:items-center sm:justify-between">
              {/* Segmented Tab Control */}
              <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1">
                {PAGE_TABS.map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                      activeTab === tab
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <select className="rounded-lg border border-slate-200 bg-slate-50/50 px-2.5 py-1 text-xs font-medium text-slate-600 transition-colors focus:border-blue-500 focus:outline-none">
                <option>This month</option>
              </select>
            </div>

            <div className="mt-2 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <span>Page Name</span>
                <span>Visitors</span>
              </div>

              {pageData.map((p) => (
                <div
                  key={p.page}
                  className="group flex items-center justify-between rounded-xl p-2.5 transition-colors hover:bg-slate-50"
                >
                  <div className="flex-1 pr-6">
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-800 group-hover:text-blue-600 transition-colors">
                        {p.page}
                      </span>
                      <span className="text-[11px] font-medium text-slate-400">
                        {p.percentage}% share
                      </span>
                    </div>
                    {/* Modern Slim Progress Bar */}
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-blue-600 transition-all duration-500"
                        style={{ width: `${p.percentage}%` }}
                      />
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
                <h3 className="text-sm font-bold text-slate-900">
                  Device Users
                </h3>
                <select className="rounded-lg border border-slate-200 bg-slate-50/50 px-2.5 py-1 text-xs font-medium text-slate-600 transition-colors focus:border-purple-500 focus:outline-none">
                  <option>This month</option>
                </select>
              </div>

              <div className="space-y-4">
                {deviceData.map((d, i) => (
                  <div key={d.device} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span
                        className={
                          i === 0
                            ? "font-bold text-slate-900"
                            : "font-medium text-slate-700"
                        }
                      >
                        {d.device}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 tabular-nums">
                          {Number(d.count).toLocaleString()}
                        </span>
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
                You have reached{" "}
                <strong className="text-slate-800 font-semibold">92%</strong> of
                your target statistics this month.
              </p>
              <button
                type="button"
                onClick={() => navigate("/clicks")}
                className="mt-2.5 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 transition-colors hover:text-blue-700"
              >
                <span>View detailed report</span>
                <ArrowUp className="h-3.5 w-3.5 rotate-45" />
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
