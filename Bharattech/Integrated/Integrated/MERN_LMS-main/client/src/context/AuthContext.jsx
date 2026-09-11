/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from "react";
import keycloak from "../auth/keycloak";

const AuthContext = createContext(null);

const EDUCATOR_ROLES = new Set(["admin", "superadmin", "super-admin"]);

const normalizeRoleName = (role) =>
  String(role || "")
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-");

const toDisplayRole = (role) => {
  const normalized = normalizeRoleName(role);
  if (normalized === "superadmin" || normalized === "super-admin")
    return "Super-admin";
  if (normalized === "admin") return "Admin";
  if (normalized === "employee") return "Employee";
  if (normalized === "intern") return "Intern";
  return "Student";
};

const canUseEducatorView = (role) =>
  EDUCATOR_ROLES.has(normalizeRoleName(role));

const defaultStudentUser = {
  id: "bharattech-portal-admin",
  username: "bharattech-user",
  email: "user@bharattech.local",
  fullName: "BharatTech User",
  name: "BharatTech User",
  roles: ["Student"],
  role: "Student",
};

const normalizeViewRole = (role) => {
  const normalized = role?.toLowerCase();
  return normalized === "educator" || normalized === "admin"
    ? "educator"
    : "student";
};

const parseJwt = (token) => {
  if (!token || typeof token !== "string") return null;

  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;

    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");

    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join(""),
    );

    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
};

const isTokenExpired = (token) => {
  if (!token || typeof token !== "string") return true;

  const payload = parseJwt(token);

  if (!payload || !payload.exp) return false;

  // If expiring within 15 seconds, treat as expired
  return payload.exp * 1000 <= Date.now() + 15000;
};

const refreshAccessToken = async () => {
  if (typeof window === "undefined") return null;

  const refreshToken =
    localStorage.getItem("refresh_token") ||
    sessionStorage.getItem("refresh_token");

  if (!refreshToken) return null;

  const keycloakUrl = (
    import.meta.env.VITE_KEYCLOAK_URL || "http://localhost:4000"
  ).replace(/\/+$/, "");

  const realm = import.meta.env.VITE_KEYCLOAK_REALM || "bharattech";

  const clientId = import.meta.env.VITE_KEYCLOAK_CLIENT_ID || "lms-client";

  try {
    const res = await fetch(
      `${keycloakUrl}/realms/${realm}/protocol/openid-connect/token`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          client_id: clientId,
          refresh_token: refreshToken,
        }),
      },
    );

    if (!res.ok) {
      console.warn("Keycloak token refresh failed:", res.status);
      return null;
    }

    const data = await res.json();

    if (data?.access_token) {
      localStorage.setItem("token", data.access_token);
      localStorage.setItem("accessToken", data.access_token);

      sessionStorage.setItem("bharattechLmsToken", data.access_token);

      if (data.refresh_token) {
        localStorage.setItem("refresh_token", data.refresh_token);
      }

      return data.access_token;
    }
  } catch (err) {
    console.error("Failed to refresh token:", err);
  }

  return null;
};

const readStoredUser = () => {
  if (typeof window === "undefined") return null;

  try {
    return JSON.parse(sessionStorage.getItem("bharattechLmsUser") || "null");
  } catch {
    return null;
  }
};

const getInitialUser = () => {
  if (typeof window === "undefined") {
    return defaultStudentUser;
  }

  const params = new URLSearchParams(window.location.search);
  const storedUser = readStoredUser();

  // Extract token from URL if present and persist
  const urlToken = params.get("token") || params.get("accessToken");

  if (urlToken) {
    localStorage.setItem("token", urlToken);
    localStorage.setItem("accessToken", urlToken);
    sessionStorage.setItem("bharattechLmsToken", urlToken);
  }

  const urlRefreshToken = params.get("refresh_token");

  if (urlRefreshToken) {
    localStorage.setItem("refresh_token", urlRefreshToken);
  }

  const activeToken =
    urlToken ||
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken") ||
    sessionStorage.getItem("bharattechLmsToken");

  const jwtPayload = parseJwt(activeToken);

  const jwtRoles = [
    ...(jwtPayload?.realm_access?.roles || []),
    ...(jwtPayload?.resource_access?.["lms-client"]?.roles || []),
    ...(jwtPayload?.resource_access?.["lms2-client"]?.roles || []),
    ...(jwtPayload?.role ? [jwtPayload.role] : []),
    ...(Array.isArray(jwtPayload?.roles) ? jwtPayload.roles : []),
  ];

  const roleFromJwt = jwtRoles.find((r) =>
    ["admin", "superadmin", "super-admin", "subadmin"].includes(
      String(r).toLowerCase(),
    ),
  );

  const role =
    params.get("role") ||
    params.get("userRole") ||
    roleFromJwt ||
    storedUser?.role;

  const email =
    params.get("email") ||
    jwtPayload?.email ||
    storedUser?.email ||
    defaultStudentUser.email;

  const name =
    params.get("name") ||
    params.get("username") ||
    jwtPayload?.name ||
    jwtPayload?.preferred_username ||
    storedUser?.name ||
    storedUser?.fullName ||
    defaultStudentUser.name;

  const normalizedRole = toDisplayRole(role);

  const user = {
    ...defaultStudentUser,
    ...storedUser,

    id:
      params.get("userId") ||
      jwtPayload?.sub ||
      storedUser?.id ||
      email ||
      defaultStudentUser.id,

    username: name,
    fullName: name,
    name,
    email,
    role: normalizedRole,
    roles: [normalizedRole, "Student"],
  };

  sessionStorage.setItem("bharattechLmsUser", JSON.stringify(user));

  return user;
};

const getInitialViewRole = () => {
  if (typeof window === "undefined") return "student";

  const params = new URLSearchParams(window.location.search);
  const initialUser = getInitialUser();
  const requestedView = params.get("view");

  if (requestedView) {
    const viewRole = normalizeViewRole(requestedView);

    return viewRole === "educator" && !canUseEducatorView(initialUser.role)
      ? "student"
      : viewRole;
  }

  if (window.location.pathname.startsWith("/educator")) {
    return canUseEducatorView(initialUser.role) ? "educator" : "student";
  }

  return "student";
};

export const AuthProvider = ({ children }) => {
  const [user] = useState(getInitialUser);
  const [viewRole, setViewRoleState] = useState(getInitialViewRole);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);

    if (
      params.has("token") ||
      params.has("accessToken") ||
      params.has("refresh_token")
    ) {
      params.delete("token");
      params.delete("accessToken");
      params.delete("refresh_token");

      const newQuery = params.toString() ? `?${params.toString()}` : "";

      window.history.replaceState(
        {},
        document.title,
        `${window.location.pathname}${newQuery}`,
      );
    }
  }, []);

  const setViewRole = (role) => {
    const nextRole = normalizeViewRole(role);

    if (nextRole === "educator" && !canUseEducatorView(user.role)) {
      setViewRoleState("student");
      return false;
    }

    setViewRoleState(nextRole);
    return true;
  };

  const getToken = async () => {
    if (typeof window === "undefined") return "";

    // 1. URL search params (if fresh)
    const params = new URLSearchParams(window.location.search);

    const urlToken = params.get("token") || params.get("accessToken");

    if (urlToken && !isTokenExpired(urlToken)) {
      localStorage.setItem("token", urlToken);
      localStorage.setItem("accessToken", urlToken);

      sessionStorage.setItem("bharattechLmsToken", urlToken);

      return urlToken;
    }

    // 2. Local/Session Storage
    const storedToken =
      localStorage.getItem("token") ||
      localStorage.getItem("accessToken") ||
      sessionStorage.getItem("bharattechLmsToken") ||
      sessionStorage.getItem("token");

    if (
      storedToken &&
      storedToken !== "null" &&
      storedToken !== "undefined" &&
      !isTokenExpired(storedToken)
    ) {
      return storedToken;
    }

    // 3. Stored token missing/expired -> Auto-refresh
    const refreshed = await refreshAccessToken();

    if (refreshed) {
      return refreshed;
    }

    // 4. Fallback to initialized Keycloak instance
    try {
      if (keycloak && keycloak.token) {
        await keycloak.updateToken(30);

        if (keycloak.token) {
          localStorage.setItem("token", keycloak.token);

          localStorage.setItem("accessToken", keycloak.token);

          return keycloak.token;
        }
      }
    } catch {
      // ignore
    }

    return !isTokenExpired(storedToken) ? storedToken || "" : "";
  };

  const isAdmin = () => canUseEducatorView(user.role);

  const switchViewRole = (role) => setViewRole(role);

  const isEducator = viewRole === "educator" && isAdmin();

  const setIsEducator = (enabled) =>
    setViewRole(enabled ? "educator" : "student");

  const value = {
    user,
    userData: user,
    loading: false,
    isAdmin,
    isEducator,
    setIsEducator,
    viewRole,
    switchViewRole,
    getToken,
    isLoggedIn: true,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
