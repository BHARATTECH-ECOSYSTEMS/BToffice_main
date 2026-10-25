/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useState } from "react";
import keycloak from "../auth/keycloak";

// Who is signed in comes only from the token Keycloak gave this page (main.jsx signs in before anything renders);
// nothing in the address or in browser storage can change it. The server checks every request again.

const AuthContext = createContext(null);

const EDUCATOR_ROLES = new Set(["admin", "superadmin", "super-admin", "subadmin"]);

const normalizeRoleName = (role) =>
  String(role || "")
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-");

// Highest role first, so a Super-admin who also holds Employee shows as Super-admin.
const ROLE_ORDER = [
  ["super-admin", "Super-admin"],
  ["superadmin", "Super-admin"],
  ["admin", "Admin"],
  ["subadmin", "Subadmin"],
  ["employee", "Employee"],
  ["intern", "Intern"],
];

const displayRoleOf = (roles) => {
  const held = new Set(roles.map(normalizeRoleName));
  return ROLE_ORDER.find(([name]) => held.has(name))?.[1] || "Student";
};

const canUseEducatorView = (role) => EDUCATOR_ROLES.has(normalizeRoleName(role));

const normalizeViewRole = (role) => {
  const normalized = role?.toLowerCase();
  return normalized === "educator" || normalized === "admin"
    ? "educator"
    : "student";
};

const userFromToken = () => {
  const claims = keycloak.tokenParsed || {};
  const clientId = keycloak.clientId;
  const role = displayRoleOf([
    ...(claims.realm_access?.roles || []),
    ...(claims.resource_access?.[clientId]?.roles || []),
  ]);
  const name = claims.name || claims.preferred_username || claims.email || "BharatTech User";
  return {
    id: claims.sub,
    username: name,
    fullName: name,
    name,
    email: claims.email || "",
    role,
    roles: [role, "Student"],
  };
};

const getInitialViewRole = (user) => {
  const params = new URLSearchParams(window.location.search);
  const requestedView = params.get("view");
  if (requestedView) {
    const viewRole = normalizeViewRole(requestedView);
    return viewRole === "educator" && !canUseEducatorView(user.role)
      ? "student"
      : viewRole;
  }

  if (window.location.pathname.startsWith("/educator")) {
    return canUseEducatorView(user.role) ? "educator" : "student";
  }

  return "student";
};

export const AuthProvider = ({ children }) => {
  const [user] = useState(userFromToken);
  const [viewRole, setViewRoleState] = useState(() => getInitialViewRole(user));

  const setViewRole = (role) => {
    const nextRole = normalizeViewRole(role);
    if (nextRole === "educator" && !canUseEducatorView(user.role)) {
      setViewRoleState("student");
      return false;
    }
    setViewRoleState(nextRole);
    return true;
  };

  // Stable, because pages list it as an effect dependency.
  const getToken = useCallback(async () => {
    try {
      await keycloak.updateToken(30);
      return keycloak.token || "";
    } catch {
      // The Keycloak session ended (signed out elsewhere or timed out): sign in again.
      keycloak.login();
      return "";
    }
  }, []);

  const signOut = useCallback(
    () => keycloak.logout({ redirectUri: window.location.origin }),
    []
  );

  const isAdmin = () => canUseEducatorView(user.role);
  const switchViewRole = (role) => setViewRole(role);
  const isEducator = viewRole === "educator" && isAdmin();
  const setIsEducator = (enabled) => setViewRole(enabled ? "educator" : "student");

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
    signOut,
    isLoggedIn: true,
  };

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
