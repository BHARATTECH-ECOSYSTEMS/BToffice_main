import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  BookOpen,
  ClipboardCheck,
  FileCheck2,
  FolderKanban,
  GraduationCap,
  Landmark,
  LayoutDashboard,
  Share2,
  Users,
} from "lucide-react";
import { useSidebar } from "../contexts/SidebarContext";
import { useAuth } from "../LMS/context/AuthContext";
import api from "../api/axios";
import { buildFallbackLaunchUrl } from "../utils/openInterviewer";

const LOCAL_HOSTS = ["localhost", "127.0.0.1"];
const LMS_PLATFORM_URL =
  "https://bharattech-integrated-mern-lms-main-uk61.onrender.com";

const isLocalUrl = (url = "") => /localhost|127\.0\.0\.1/i.test(url);

const getExternalUrl = (configuredUrl, localUrl, deployedUrl = "") => {
  const isLocalHost = LOCAL_HOSTS.includes(window.location.hostname);

  if (configuredUrl && (isLocalHost || !isLocalUrl(configuredUrl))) {
    return configuredUrl;
  }

  return isLocalHost ? localUrl : deployedUrl;
};

const buildLmsPlatformUrl = (baseUrl, user) => {
  if (!baseUrl || !user) return baseUrl;

  const params = new URLSearchParams();
  if (user.role) params.set("role", user.role);
  if (user.email) params.set("email", user.email);
  if (user.fullName || user.username) params.set("name", user.fullName || user.username);

  if (!params.toString()) return baseUrl;

  try {
    const url = new URL(baseUrl);
    params.forEach((value, key) => url.searchParams.set(key, value));
    return url.toString();
  } catch {
    const separator = baseUrl.includes("?") ? "&" : "?";
    return `${baseUrl}${separator}${params.toString()}`;
  }
};

export default function Sidebar() {
  const { sidebarOpen, toggleSidebar } = useSidebar();
  const { hasRole, loading, user } = useAuth();
  const [launchingInterview, setLaunchingInterview] = useState(false);
  const lmsUrl = buildLmsPlatformUrl(
    getExternalUrl(
      import.meta.env.VITE_LMS_URL,
      "http://localhost:5175",
      LMS_PLATFORM_URL
    ),
    user
  );
  const workspaceUrl =
    import.meta.env.VITE_WORKSPACE_URL || "http://localhost:8087/_accounts/auth/openid";

  const handleLinkClick = () => {
    if (window.innerWidth < 1024) {
      toggleSidebar();
    }
  };

  const handleInterviewLaunch = async () => {
    if (launchingInterview) return;

    const interviewWindow = window.open("", "_blank");
    setLaunchingInterview(true);
    handleLinkClick();

    try {
      const { data } = await api.post("/openinterviewer/launch-token");
      const launchUrl =
        data?.launchUrl ||
        (data?.token ? buildFallbackLaunchUrl(data.token) : null);

      if (!launchUrl) {
        throw new Error("Interview launch URL was not returned");
      }

      if (interviewWindow) {
        interviewWindow.opener = null;
        interviewWindow.location.href = launchUrl;
      } else {
        window.location.href = launchUrl;
      }
    } catch (error) {
      interviewWindow?.close();
      console.error("Interview launch failed", error);
      alert(
        error?.response?.data?.message ||
          "Could not open the interview tool. Please try again."
      );
    } finally {
      setLaunchingInterview(false);
    }
  };

  const MENU_TOP = [
    { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
    { label: "People", icon: Users, path: "/people" },
  ];

  const MENU_LEARNING = [
    {
      label: "LMS Platform",
      icon: Landmark,
      external: true,
      path: lmsUrl,
    },
  ];

  const MENU_RESOURCES = [
    { label: "Resources", icon: BookOpen, path: "/resources" },
    {
      label: "Workspace",
      icon: FolderKanban,
      external: true,
      path: workspaceUrl,
    },
    {
      label: "File Transfer",
      icon: Share2,
      external: true,
      path: "https://fileupload.wetransfer.com/",
    },
    {
      label: hasRole?.("Admin") ? "Certificates" : "Certificates",
      icon: GraduationCap,
      path: "/generate-certificate",
    },
  ];

  const MENU_ORGANIZATION = [
    {
      label: "Policy/Compliance",
      icon: FileCheck2,
      path: "/policy-compliance",
    },
  ];

const MENU_INTERVIEW = hasRole?.("Admin") || hasRole?.("Super-admin")
    ? [
        {
          label: launchingInterview ? "Opening..." : "Test",
          icon: ClipboardCheck,
          action: handleInterviewLaunch,
          disabled: launchingInterview,
        },
      ]
    : [];

  const renderLink = (item, key = item.label) => {
    const Icon = item.icon || BookOpen;

    if (item.external && !item.path) {
      return (
        <button
          key={key}
          type="button"
          disabled
          title={`${item.label} URL is not configured`}
          className="flex w-full cursor-not-allowed items-center gap-3 rounded-xl p-3 text-left text-sm font-medium text-gray-400 opacity-70"
        >
          <Icon className="h-5 w-5" />
          <span>{item.label}</span>
        </button>
      );
    }

    if (item.action) {
      return (
        <button
          key={key}
          type="button"
          onClick={item.action}
          disabled={item.disabled}
          className="flex w-full items-center gap-3 rounded-xl p-3 text-left text-sm font-medium text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 disabled:cursor-wait disabled:opacity-70"
        >
          <Icon className="h-5 w-5" />
          <span>{item.label}</span>
        </button>
      );
    }

    if (item.external) {
      return (
        <a
          key={key}
          href={item.path}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleLinkClick}
          className="flex items-center gap-3 p-3 rounded-xl text-sm font-medium text-gray-700 hover:bg-indigo-50 hover:text-indigo-600"
        >
          <Icon className="w-5 h-5" />
          <span>{item.label}</span>
        </a>
      );
    }

    return (
      <NavLink
        key={key}
        to={item.path}
        onClick={handleLinkClick}
        className={({ isActive }) =>
          `flex items-center gap-3 p-3 rounded-xl text-sm font-medium ${
            isActive
              ? "bg-indigo-600 text-white"
              : "text-gray-700 hover:bg-indigo-50 hover:text-indigo-600"
          }`
        }
      >
        <Icon className="w-5 h-5" />
        <span>{item.label}</span>
      </NavLink>
    );
  };

  if (loading) {
    return <div className="p-4">Loading...</div>;
  }

  return (
    <>
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={toggleSidebar}
        />
      )}

      <aside
        className={`fixed left-0 top-0 lg:top-[72px] z-50 lg:z-20
        h-full lg:h-[calc(100vh-72px)]
        w-[220px] bg-white shadow flex flex-col overflow-hidden
        transform transition-transform duration-300
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="h-4 flex-shrink-0" />

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3 space-y-6">
          <Section title="Navigation">{MENU_TOP.map(renderLink)}</Section>
          <Section title="Learning">{MENU_LEARNING.map(renderLink)}</Section>
          <Section title="Resources">{MENU_RESOURCES.map(renderLink)}</Section>
          <Section title="Organization Management">
            {MENU_ORGANIZATION.map(renderLink)}
          </Section>
          {MENU_INTERVIEW.length > 0 && (
            <Section title="Interview">{MENU_INTERVIEW.map(renderLink)}</Section>
          )}
        </div>
      </aside>
    </>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <p className="px-2 mb-2 text-xs font-bold text-gray-500 uppercase">
        {title}
      </p>
      <div className="space-y-1">{children}</div>
    </div>
  );
}
