import React, { useState } from "react";
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
  Receipt,
  KanbanSquare,
  ShieldCheck,
  MessagesSquare,
  ScreenShare,
} from "lucide-react";
import { useSidebar } from "../contexts/SidebarContext";
import { useAuth } from "../LMS/context/AuthContext";
import api from "../api/axios";
import keycloak from "../auth/keycloak";
import { buildFallbackLaunchUrl } from "../utils/openInterviewer";
import {
  LMS_PLATFORM_URL,
  FILESYNC_PLATFORM_URL,
  getExternalUrl,
  buildLmsPlatformUrl,
} from "../utils/sidebarUrls";
import { SidebarItem, SidebarSection } from "./sidebar/SidebarNavItem";

export default function Sidebar() {
  const { sidebarOpen, toggleSidebar } = useSidebar();
  const { hasRole, loading, user } = useAuth();
  const [launchingInterview, setLaunchingInterview] = useState(false);

  const lmsUrl = buildLmsPlatformUrl(
    getExternalUrl(
      import.meta.env.VITE_LMS_URL,
      "http://localhost:5175",
      LMS_PLATFORM_URL,
    ),
    user,
  );
  const workspaceUrl =
    import.meta.env.VITE_WORKSPACE_URL ||
    "http://localhost:8087/_accounts/auth/openid";
  const fileSyncUrl = getExternalUrl(
    import.meta.env.VITE_FILESYNC_URL,
    "http://localhost:8080",
    FILESYNC_PLATFORM_URL,
  );
  const invoiceBuilderUrl = getExternalUrl(
    import.meta.env.VITE_INVOICE_BUILDER_URL,
    "http://localhost:3001",
    "http://localhost:3001",
  );
  const planeUrl = getExternalUrl(
    import.meta.env.VITE_PLANE_URL,
    "http://localhost:8090",
    "http://localhost:8090",
  );
  const planeSsoUrl = `${planeUrl.replace(/\/+$/, "")}/auth/keycloak/`;
  const securoUrl = getExternalUrl(
    import.meta.env.VITE_SECURO_URL,
    "http://localhost:3002",
    "http://localhost:3002",
  );
  const securoSsoUrl = `${securoUrl.replace(/\/+$/, "")}/api/auth/oidc/login`;
  const chatwootUrl = getExternalUrl(
    import.meta.env.VITE_CHATWOOT_URL,
    "http://localhost:3000",
    "http://localhost:3000",
  );
  const chatwootSsoUrl = `${chatwootUrl.replace(/\/+$/, "")}/app/login`;
  const serverUrl = getExternalUrl(
    import.meta.env.VITE_SERVER_URL || import.meta.env.VITE_SCREEGO_URL,
    "http://localhost:5050",
    "http://localhost:5050",
  );
  const canAccessInvoice =
    hasRole?.("Admin") ||
    hasRole?.("Super-admin") ||
    hasRole?.(["admin", "superadmin"]);

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

      if (!launchUrl) throw new Error("Interview launch URL was not returned");

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
          "Could not open the interview tool. Please try again.",
      );
    } finally {
      setLaunchingInterview(false);
    }
  };

  const handleChatwootLaunch = async () => {
    handleLinkClick();
    const chatwootWindow = window.open("", "_blank");
    try {
      if (keycloak?.authenticated) {
        try { await keycloak.updateToken(30); } catch {}
      }
      const { data } = await api.post("/chatwoot/sso-url");
      const launchUrl = data?.ssoUrl || chatwootSsoUrl;
      if (chatwootWindow) {
        chatwootWindow.opener = null;
        chatwootWindow.location.href = launchUrl;
      } else {
        window.location.href = launchUrl;
      }
    } catch {
      if (chatwootWindow) chatwootWindow.location.href = chatwootSsoUrl;
    }
  };

  const handleLmsLaunch = async () => {
    handleLinkClick();
    let activeToken =
      localStorage.getItem("token") || localStorage.getItem("accessToken");
    let activeRefresh = localStorage.getItem("refresh_token");

    if (keycloak?.authenticated) {
      try {
        await keycloak.updateToken(30);
        activeToken = keycloak.token || activeToken;
        activeRefresh = keycloak.refreshToken || activeRefresh;
        if (activeToken) {
          localStorage.setItem("token", activeToken);
          localStorage.setItem("accessToken", activeToken);
        }
        if (activeRefresh) {
          localStorage.setItem("refresh_token", activeRefresh);
        }
      } catch (err) {
        console.warn("Keycloak token refresh before LMS launch failed:", err);
      }
    }

    const targetUrl = buildLmsPlatformUrl(
      getExternalUrl(
        import.meta.env.VITE_LMS_URL,
        "http://localhost:5175",
        LMS_PLATFORM_URL,
      ),
      user,
      activeToken,
      activeRefresh,
    );

    window.open(targetUrl, "_blank", "noopener,noreferrer");
  };

  const MENU_TOP = [
    { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
    { label: "People", icon: Users, path: "/people" },
  ];

  const MENU_LEARNING = [
    {
      label: "LMS Platform",
      icon: Landmark,
      action: handleLmsLaunch,
      external: true,
      path: lmsUrl,
    },
  ];

  const MENU_RESOURCES = [
    { label: "Resources", icon: BookOpen, path: "/resources" },
    { label: "Workspace", icon: FolderKanban, external: true, path: workspaceUrl },
    { label: "File Transfer", icon: Share2, external: true, path: fileSyncUrl },
    { label: "Projects (Plane)", icon: KanbanSquare, external: true, path: planeSsoUrl },
    { label: "Securo (Finance)", icon: ShieldCheck, external: true, path: securoSsoUrl },
    {
      label: "Chatwoot Support",
      icon: MessagesSquare,
      action: handleChatwootLaunch,
      external: true,
      path: chatwootSsoUrl,
    },
    { label: "Screen Share (Server)", icon: ScreenShare, external: true, path: serverUrl },
    ...(canAccessInvoice
      ? [{ label: "Invoice Builder", icon: Receipt, external: true, path: invoiceBuilderUrl }]
      : []),
    { label: "Certificates", icon: GraduationCap, path: "/generate-certificate" },
  ];

  const MENU_ORGANIZATION = [
    { label: "Policy/Compliance", icon: FileCheck2, path: "/policy-compliance" },
  ];

  const MENU_INTERVIEW =
    hasRole?.("Admin") || hasRole?.("Super-admin")
      ? [
          {
            label: launchingInterview ? "Opening..." : "Test",
            icon: ClipboardCheck,
            action: handleInterviewLaunch,
            disabled: launchingInterview,
          },
        ]
      : [];

  if (loading) return <div className="p-4">Loading...</div>;

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
          <SidebarSection title="Navigation">
            {MENU_TOP.map((item) => (
              <SidebarItem key={item.label} item={item} onLinkClick={handleLinkClick} />
            ))}
          </SidebarSection>

          <SidebarSection title="Learning">
            {MENU_LEARNING.map((item) => (
              <SidebarItem key={item.label} item={item} onLinkClick={handleLinkClick} />
            ))}
          </SidebarSection>

          <SidebarSection title="Resources">
            {MENU_RESOURCES.map((item) => (
              <SidebarItem key={item.label} item={item} onLinkClick={handleLinkClick} />
            ))}
          </SidebarSection>

          <SidebarSection title="Organization Management">
            {MENU_ORGANIZATION.map((item) => (
              <SidebarItem key={item.label} item={item} onLinkClick={handleLinkClick} />
            ))}
          </SidebarSection>

          {MENU_INTERVIEW.length > 0 && (
            <SidebarSection title="Interview">
              {MENU_INTERVIEW.map((item) => (
                <SidebarItem key={item.label} item={item} onLinkClick={handleLinkClick} />
              ))}
            </SidebarSection>
          )}
        </div>
      </aside>
    </>
  );
}