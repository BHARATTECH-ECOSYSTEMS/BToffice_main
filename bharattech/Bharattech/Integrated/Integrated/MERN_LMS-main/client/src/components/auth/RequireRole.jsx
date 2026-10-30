import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const RequireRole = ({ allow = [], children }) => {
  const { user, loading } = useAuth();

  if (loading) return null;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const normalizeRole = (role) =>
    String(role || "")
      .trim()
      .toLowerCase()
      .replace(/[_\s]+/g, "-");

  const normalizedRole = normalizeRole(user.role);
  const allowedRoles = allow.map(normalizeRole);

  if (normalizedRole === "admin" || normalizedRole === "super-admin" || normalizedRole === "superadmin") {
    return children;
  }

  if (allowedRoles.includes(normalizedRole)) {
    return children;
  }

  return <Navigate to="/" replace />;
};

export default RequireRole;
