import { useState, useEffect, useCallback, useRef } from "react";
import toast from "react-hot-toast";
import { useAuth } from "../LMS/context/AuthContext";
import api from "../api/axios";

const BHARATTECH_APP_URL = "bharattech://open";
const BHARATTECH_DOWNLOAD_URL = "/downloads/BharatTech_0.53.0_x64-setup.exe";
const BHARATTECH_INSTALLER_NAME = "BharatTech-Setup.exe";

export function useResourceData() {
  const { hasRole, loading: authLoading, keycloak } = useAuth();

  const [resources, setResources] = useState([]);
  const [users, setUsers] = useState([]);
  const [title, setTitle] = useState("");
  const [link, setLink] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [selectedUser, setSelectedUser] = useState({});
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDeleting, setIsDeleting] = useState({});
  const [isLaunchingLibreChat, setIsLaunchingLibreChat] = useState(false);
  const [isLaunchingPlane, setIsLaunchingPlane] = useState(false);
  const [isLaunchingSecuro, setIsLaunchingSecuro] = useState(false);
  const [isLaunchingChatwoot, setIsLaunchingChatwoot] = useState(false);

  const isAdmin = hasRole("Admin");
  const canAccessInvoice =
    hasRole("Admin") || hasRole("Super-admin") || hasRole(["admin", "superadmin"]);
  const abortControllerRef = useRef(null);

  const loadResources = useCallback(async (signal) => {
    try {
      setError(null);
      const res = await api.get("/resources", { signal });
      setResources(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      if (err.name === "AbortError") return;
      setResources([]);
      setError("Failed to load resources");
      toast.error("Failed to load resources");
    }
  }, []);

  const loadUsers = useCallback(async (signal) => {
    if (!isAdmin) return;
    try {
      const res = await api.get("/user", { signal });
      setUsers(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      if (err.name === "AbortError") return;
      setUsers([]);
    }
  }, [isAdmin]);

  const loadPageData = useCallback(async (signal) => {
    setPageLoading(true);
    setError(null);
    await Promise.allSettled([loadResources(signal), loadUsers(signal)]);
    setPageLoading(false);
  }, [loadResources, loadUsers]);

  useEffect(() => {
    if (authLoading) return;
    const controller = new AbortController();
    abortControllerRef.current = controller;
    loadPageData(controller.signal);

    return () => {
      controller.abort();
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
    };
  }, [authLoading, loadPageData]);

  const openCoder = useCallback(async () => {
    let token = keycloak?.token || localStorage.getItem("token") || localStorage.getItem("accessToken");
    if (keycloak?.authenticated) {
      try {
        await keycloak.updateToken(30);
        token = keycloak.token || token;
      } catch (err) {
        console.warn("Could not refresh token for Coder", err);
      }
    }
    const params = new URLSearchParams({ source: "lms" });
    if (token) params.set("token", token);
    window.location.href = `${BHARATTECH_APP_URL}?${params.toString()}`;
    toast.success("Opening BharatTech Coding Workspace app...");
  }, [keycloak]);

  const openLibreChat = useCallback(async () => {
    setIsLaunchingLibreChat(true);
    const newTab = window.open("about:blank", "_blank");
    try {
      if (keycloak?.authenticated) {
        try { await keycloak.updateToken(30); } catch {}
      }
      let librechatBase = (import.meta.env.VITE_LIBRECHAT_URL || "http://localhost:3080").replace(/\/+$/, "");
      let ssoLaunchUrl = `${librechatBase}/api/auth/sso`;

      try {
        const res = await api.get("/ai-assistant/token");
        if (res?.data?.librechatUrl) {
          librechatBase = res.data.librechatUrl.replace(/\/+$/, "");
        }
        if (res?.data?.ssoUrl) {
          ssoLaunchUrl = res.data.ssoUrl;
        } else if (res?.data?.token) {
          ssoLaunchUrl = `${librechatBase}/api/auth/sso?token=${encodeURIComponent(res.data.token)}`;
        }
      } catch (err) {
        console.warn("Could not fetch LibreChat bridge token, attempting fallback token", err);
        const fallbackToken = keycloak?.token || localStorage.getItem("token") || localStorage.getItem("accessToken");
        if (fallbackToken) {
          ssoLaunchUrl = `${librechatBase}/api/auth/sso?token=${encodeURIComponent(fallbackToken)}`;
        } else {
          ssoLaunchUrl = `${librechatBase}/oauth/openid`;
        }
      }

      if (newTab) {
        newTab.opener = null;
        newTab.location.href = ssoLaunchUrl;
      } else {
        window.open(ssoLaunchUrl, "_blank", "noopener,noreferrer");
      }
      toast.success("Opening BharatTech AI...");
    } catch {
      if (newTab) newTab.close();
      toast.error("Failed to open LibreChat");
    } finally {
      setIsLaunchingLibreChat(false);
    }
  }, [keycloak]);

  const openPlane = useCallback(async () => {
    setIsLaunchingPlane(true);
    const newTab = window.open("about:blank", "_blank");
    try {
      if (keycloak?.authenticated) {
        try { await keycloak.updateToken(30); } catch {}
      }
      const planeBase = import.meta.env.VITE_PLANE_URL || "http://localhost:8090";
      const ssoLaunchUrl = `${planeBase.replace(/\/+$/, "")}/auth/keycloak/`;
      if (newTab) {
        newTab.opener = null;
        newTab.location.href = ssoLaunchUrl;
      } else {
        window.open(ssoLaunchUrl, "_blank", "noopener,noreferrer");
      }
      toast.success("Opening Plane with SSO...");
    } catch {
      if (newTab) newTab.close();
      toast.error("Failed to open Plane");
    } finally {
      setIsLaunchingPlane(false);
    }
  }, [keycloak]);

  const openSecuro = useCallback(async () => {
    setIsLaunchingSecuro(true);
    const newTab = window.open("about:blank", "_blank");
    try {
      if (keycloak?.authenticated) {
        try { await keycloak.updateToken(30); } catch {}
      }
      const securoBase = import.meta.env.VITE_SECURO_URL || "http://localhost:3002";
      const ssoLaunchUrl = `${securoBase.replace(/\/+$/, "")}/api/auth/oidc/login`;
      if (newTab) {
        newTab.opener = null;
        newTab.location.href = ssoLaunchUrl;
      } else {
        window.open(ssoLaunchUrl, "_blank", "noopener,noreferrer");
      }
      toast.success("Opening Securo with SSO...");
    } catch {
      if (newTab) newTab.close();
      toast.error("Failed to open Securo");
    } finally {
      setIsLaunchingSecuro(false);
    }
  }, [keycloak]);

  const openChatwoot = useCallback(async () => {
    setIsLaunchingChatwoot(true);
    const newTab = window.open("about:blank", "_blank");
    try {
      if (keycloak?.authenticated) {
        try { await keycloak.updateToken(30); } catch {}
      }
      let ssoLaunchUrl = (import.meta.env.VITE_CHATWOOT_URL || "http://localhost:3000").replace(/\/+$/, "") + "/app/login";
      try {
        const res = await api.post("/chatwoot/sso-url");
        if (res?.data?.ssoUrl) {
          ssoLaunchUrl = res.data.ssoUrl;
        }
      } catch (err) {
        console.warn("Could not fetch Chatwoot SSO link, using direct URL", err);
      }

      if (newTab) {
        newTab.opener = null;
        newTab.location.href = ssoLaunchUrl;
      } else {
        window.open(ssoLaunchUrl, "_blank", "noopener,noreferrer");
      }
      toast.success("Opening Chatwoot with Keycloak SSO...");
    } catch {
      if (newTab) newTab.close();
      toast.error("Failed to open Chatwoot");
    } finally {
      setIsLaunchingChatwoot(false);
    }
  }, [keycloak]);

  const openInvoiceBuilder = useCallback(() => {
    if (!canAccessInvoice) {
      toast.error("Invoice Builder is only accessible to Admin and Super-Admin");
      return;
    }
    const url = import.meta.env.VITE_INVOICE_BUILDER_URL || "http://localhost:3001";
    window.open(url, "_blank", "noopener,noreferrer");
    toast.success("Opening Invoice Builder...");
  }, [canAccessInvoice]);

  const downloadBharatTechApp = useCallback(() => {
    const linkElement = document.createElement("a");
    linkElement.href = BHARATTECH_DOWNLOAD_URL;
    linkElement.download = BHARATTECH_INSTALLER_NAME;
    document.body.appendChild(linkElement);
    linkElement.click();
    document.body.removeChild(linkElement);
    toast.success("BharatTech app installer download started.");
  }, []);

  const handleDelete = async (id) => {
    if (isDeleting[id]) return;
    setIsDeleting(p => ({ ...p, [id]: true }));
    try {
      await api.delete(`/resources/delete/${id}`);
      setResources(p => p.filter(r => r._id !== id));
      toast.success("Deleted successfully");
    } catch {
      toast.error("Delete failed");
    } finally {
      setIsDeleting(p => ({ ...p, [id]: false }));
    }
  };

  const handleAdd = async () => {
    const t = title?.trim();
    const l = link?.trim();
    if (!t || !l) return toast.error("Title and link required");
    try {
      const res = await api.post("/resources", { title: t, link: l });
      if (res?.data?._id) {
        setResources(p => [res.data, ...p]);
        setTitle("");
        setLink("");
        setIsAdding(false);
        toast.success("Resource added");
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to add resource");
    }
  };

  const assignResource = async (resourceId) => {
    const userId = selectedUser[resourceId];
    if (!userId) return toast.error("Select a user first");
    try {
      await api.post(`/resources/${resourceId}/assign`, { userId });
      toast.success("Assigned successfully");
      setSelectedUser(p => ({ ...p, [resourceId]: "" }));
    } catch (err) {
      toast.error(err?.response?.data?.message || "Assignment failed");
    }
  };

  return {
    resources, users, title, setTitle, link, setLink,
    isAdding, setIsAdding, selectedUser, setSelectedUser,
    pageLoading, authLoading, error, isDeleting,
    isLaunchingLibreChat, isLaunchingPlane, isLaunchingSecuro, isLaunchingChatwoot,
    isAdmin, canAccessInvoice,
    openCoder, openLibreChat, openPlane, openSecuro, openChatwoot, openInvoiceBuilder,
    downloadBharatTechApp, handleDelete, handleAdd, assignResource,
    retryLoad: () => loadPageData()
  };
}
