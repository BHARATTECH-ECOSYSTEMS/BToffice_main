import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Share2, Check, Sliders, Activity } from "lucide-react";
import api from "./api/api";
import { useAuth } from "./LMS/context/AuthContext";
import { PAGE_TABS } from "./components/dashboard/DashboardAnalyticsSection";
import AdminDashboardView from "./components/dashboard/AdminDashboardView";
import SubadminDashboardView from "./components/dashboard/SubadminDashboardView";
import EmployeeDashboardView from "./components/dashboard/EmployeeDashboardView";
import InternDashboardView from "./components/dashboard/InternDashboardView";
import GeneralDashboardView from "./components/dashboard/GeneralDashboardView";
import "./index.css";

const normalizeRole = (role) => {
  if (!role) return "";
  const cleaned = String(role).trim().toUpperCase().replace(/[-_\s]/g, "");
  if (cleaned.includes("SUPERADMIN")) return "SUPERADMIN";
  if (cleaned.includes("ADMIN")) return "ADMIN";
  if (cleaned.includes("SUBADMIN")) return "SUBADMIN";
  if (cleaned.includes("EMPLOYEE")) return "EMPLOYEE";
  if (cleaned.includes("INTERN")) return "INTERN";
  return cleaned;
};

const getCachedRole = () => {
  try {
    const rawRole = localStorage.getItem("role") || localStorage.getItem("userRole");
    if (rawRole) return normalizeRole(rawRole);
    const userStr = localStorage.getItem("user");
    if (userStr) {
      const parsed = JSON.parse(userStr);
      if (parsed?.role) return normalizeRole(parsed.role);
    }
  } catch (e) {
    // ignore json error
  }
  return "";
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [isSharing, setIsSharing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [adminTab, setAdminTab] = useState("management"); // "management" | "analytics"
  const [activeTab, setActiveTab] = useState(PAGE_TABS ? PAGE_TABS[0] : null);

  // Determine role with immediate local cache fallback
  const effectiveRole = normalizeRole(user?.role) || getCachedRole();
  const isAdminOrSuperAdmin = effectiveRole === "ADMIN" || effectiveRole === "SUPERADMIN";

  // Auth guard: if finished loading and no token exists, redirect to login
  useEffect(() => {
    const token =
      localStorage.getItem("authToken") ||
      localStorage.getItem("token") ||
      localStorage.getItem("accessToken");

    if (!token && !authLoading && !user) {
      navigate("/login");
    }
  }, [authLoading, user, navigate]);

  // Fetch general metrics for Admin/Superadmin or fallback dashboard
  useEffect(() => {
    const token =
      localStorage.getItem("authToken") ||
      localStorage.getItem("token") ||
      localStorage.getItem("accessToken");

    if (!token) return;

    const fetchDashboard = async () => {
      setDataLoading(true);
      try {
        const res = await api.get("/admin/dashboard");
        setDashboardData(res.data?.data || null);
      } catch (err) {
        // If not admin, admin/dashboard might 403; non-fatal
        console.warn("Notice: General dashboard metrics not accessible for this role:", err.message);
      } finally {
        setDataLoading(false);
      }
    };

    if (["SUPERADMIN", "ADMIN", ""].includes(effectiveRole)) {
      fetchDashboard();
    }
  }, [effectiveRole]);

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

  const handleViewDetails = (type) => {
    if (type === "visitors") navigate("/clicks");
    else if (type === "events") navigate("/cms");
    else if (type === "forms") navigate("/forms");
  };

  // While auth is initializing and we have no cached role or token, show skeleton
  if (authLoading && !effectiveRole) {
    return (
      <div className="min-h-screen bg-slate-50/50 px-4 py-8 md:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="h-32 w-full animate-pulse rounded-2xl bg-slate-200" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-200" />
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
        {/* HERO — Exact same styling and structure as People page */}
        <header className="bharat-hero-banner relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 p-6 shadow-md md:p-8">
          <div className="bharat-hero-glow" />
          <div className="bharat-hero-beams" />

          <div className="relative z-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-blue-200">
                  BharatTech Platform
                </span>
                <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-white md:text-3xl">
                Dashboard
              </h1>
              <p className="mt-2 text-xs text-blue-100/80 md:text-sm">
                Monitor live performance, course activities, and audience engagement
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {isAdminOrSuperAdmin && (
                <div className="flex items-center rounded-xl bg-white/10 p-1 backdrop-blur-md">
                  <button
                    type="button"
                    onClick={() => setAdminTab("management")}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                      adminTab === "management"
                        ? "bg-white text-blue-700 shadow-sm"
                        : "text-blue-100 hover:text-white"
                    }`}
                  >
                    <Sliders className="h-3.5 w-3.5" />
                    <span>Management</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdminTab("analytics")}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                      adminTab === "analytics"
                        ? "bg-white text-blue-700 shadow-sm"
                        : "text-blue-100 hover:text-white"
                    }`}
                  >
                    <Activity className="h-3.5 w-3.5" />
                    <span>Analytics</span>
                  </button>
                </div>
              )}

              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/15 px-3.5 py-1.5 text-xs font-semibold text-white backdrop-blur-md">
                <Users className="h-3.5 w-3.5 text-blue-200" />
                <span>Integrated Workspace</span>
              </div>

              <button
                type="button"
                onClick={handleShareDashboard}
                disabled={isSharing}
                className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-blue-700 shadow-sm transition-all hover:bg-blue-50 hover:shadow disabled:opacity-60 cursor-pointer"
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

        {/* Role-based Dynamic View */}
        {isAdminOrSuperAdmin && (
          <AdminDashboardView
            dashboardData={dashboardData}
            handleViewDetails={handleViewDetails}
            activeTab={adminTab}
          />
        )}

        {effectiveRole === "SUBADMIN" && <SubadminDashboardView />}

        {effectiveRole === "EMPLOYEE" && <EmployeeDashboardView />}

        {effectiveRole === "INTERN" && <InternDashboardView />}

        {/* Fallback for users without specific operational role */}
        {!["SUPERADMIN", "ADMIN", "SUBADMIN", "EMPLOYEE", "INTERN"].includes(effectiveRole) && (
          <GeneralDashboardView
            dashboardData={dashboardData}
            handleViewDetails={handleViewDetails}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            navigate={navigate}
          />
        )}
      </div>
    </div>
  );
}
