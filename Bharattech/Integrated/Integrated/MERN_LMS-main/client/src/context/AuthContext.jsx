/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState } from "react";

const AuthContext = createContext(null);

const EDUCATOR_ROLES = new Set(["admin", "superadmin", "super-admin"]);

const normalizeRoleName = (role) =>
  String(role || "")
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-");

const toDisplayRole = (role) => {
  const normalized = normalizeRoleName(role);
  if (normalized === "superadmin" || normalized === "super-admin") return "Super-admin";
  if (normalized === "admin") return "Admin";
  if (normalized === "employee") return "Employee";
  if (normalized === "intern") return "Intern";
  return "Student";
};

const canUseEducatorView = (role) => EDUCATOR_ROLES.has(normalizeRoleName(role));

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

const readStoredUser = () => {
  if (typeof window === "undefined") return null;

  try {
    return JSON.parse(sessionStorage.getItem("bharattechLmsUser") || "null");
  } catch {
    return null;
  }
};

const getInitialUser = () => {
  if (typeof window === "undefined") return defaultStudentUser;

  const params = new URLSearchParams(window.location.search);
  const storedUser = readStoredUser();
  const role = params.get("role") || params.get("userRole") || storedUser?.role;
  const email = params.get("email") || storedUser?.email || defaultStudentUser.email;
  const name =
    params.get("name") ||
    params.get("username") ||
    storedUser?.name ||
    storedUser?.fullName ||
    defaultStudentUser.name;
  const normalizedRole = toDisplayRole(role);

  const user = {
    ...defaultStudentUser,
    ...storedUser,
    id: params.get("userId") || storedUser?.id || email || defaultStudentUser.id,
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

  const setViewRole = (role) => {
    const nextRole = normalizeViewRole(role);
    if (nextRole === "educator" && !canUseEducatorView(user.role)) {
      setViewRoleState("student");
      return false;
    }
    setViewRoleState(nextRole);
    return true;
  };

  const getToken = async () => "";
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
    isLoggedIn: true,
  };

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
