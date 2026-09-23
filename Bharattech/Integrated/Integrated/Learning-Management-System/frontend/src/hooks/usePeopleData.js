import { useState, useEffect } from "react";
import { useAuth } from "../LMS/context/AuthContext";
import api from "../api/axios";

export const ROLE_OPTIONS = ["Superadmin", "Admin", "Employee", "Intern"];

export const normalizeRole = (role) => {
  const value = String(role || "").trim().toLowerCase().replace(/[-_\s]/g, "");
  if (value === "superadmin") return "Superadmin";
  if (value === "admin") return "Admin";
  if (value === "employee") return "Employee";
  if (value === "intern") return "Intern";
  return role || "User";
};

export function usePeopleData() {
  const { hasRole, user: authUser } = useAuth();
  const currentRole = normalizeRole(authUser?.role || localStorage.getItem("role"));
  const isSuperAdmin = currentRole === "Superadmin";
  const isAdminOnly = currentRole === "Admin";
  const isAdmin = isSuperAdmin || isAdminOnly || hasRole("Admin");
  const inviteRoleOptions = isSuperAdmin ? ROLE_OPTIONS : ["Employee", "Intern"];

  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");
  const [openMenuId, setOpenMenuId] = useState(null);
  const [users, setUsers] = useState([]);
  const [roleUpdatingId, setRoleUpdatingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteErrorMessage, setDeleteErrorMessage] = useState("");
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [inviteResult, setInviteResult] = useState(null);
  const [inviteErrorMessage, setInviteErrorMessage] = useState("");
  const [realmSetupStatus, setRealmSetupStatus] = useState(null);
  const [realmSetupLoading, setRealmSetupLoading] = useState(false);
  const [keycloakUsers, setKeycloakUsers] = useState([]);
  const [keycloakUsersLoading, setKeycloakUsersLoading] = useState(false);
  const [keycloakUsersError, setKeycloakUsersError] = useState("");
  const [form, setForm] = useState({ name: "", email: "", role: "Employee" });

  useEffect(() => {
    fetchUsers();
    fetchKeycloakUsers();
    const interval = setInterval(fetchKeycloakUsers, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await api.get("/user");
      const normalized = (Array.isArray(res.data) ? res.data : []).map((user, index) => ({
        id: user._id || user.id,
        emp_id: user.employeeId || `EMP${index + 1}`,
        name: user.fullName || user.name || user.username || "N/A",
        email: user.email || "N/A",
        role: normalizeRole(user.role || "User"),
        phone: user.phoneNumber || user.phone || user.workPhone || user.mobile || user.contactNumber || "-",
        details: "BharatTech",
      }));
      setUsers(normalized);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchKeycloakUsers = async () => {
    setKeycloakUsersLoading(true);
    setKeycloakUsersError("");
    try {
      const res = await api.get("/user/keycloak-users");
      setKeycloakUsers(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setKeycloakUsersError(err?.response?.data?.message || "Could not load Keycloak users.");
    } finally {
      setKeycloakUsersLoading(false);
    }
  };

  const canManageRolesFor = (target) => {
    if (target?.fromKeycloak) return false;
    const r = normalizeRole(target?.role);
    if (isSuperAdmin) return true;
    return isAdminOnly && ["Employee", "Intern"].includes(r);
  };

  const canSetRoleFor = (target, nextRole) => {
    if (isSuperAdmin) return true;
    return (
      isAdminOnly &&
      ["Employee", "Intern"].includes(normalizeRole(target?.role)) &&
      ["Employee", "Intern"].includes(normalizeRole(nextRole))
    );
  };

  const canDeleteUser = (target) => {
    if (target?.fromKeycloak) return false;
    const r = normalizeRole(target?.role);
    if (isSuperAdmin) return ["Admin", "Employee", "Intern"].includes(r);
    return isAdminOnly && ["Employee", "Intern"].includes(r);
  };

  const handleRoleChange = async (id, newRole) => {
    const target = users.find(u => u.id === id);
    if (!canSetRoleFor(target, newRole)) return alert("Permission denied to assign this role.");
    try {
      setRoleUpdatingId(id);
      await api.patch(`/user/${id}`, { role: newRole });
      setUsers(prev => prev.map(u => (u.id === id ? { ...u, role: newRole } : u)));
      setOpenMenuId(null);
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to update role");
    } finally {
      setRoleUpdatingId(null);
    }
  };

  const handleDeleteUser = (target) => {
    if (!canDeleteUser(target)) return alert("Permission denied to delete this user.");
    setDeleteErrorMessage("");
    setDeleteTarget(target);
  };

  const confirmDeleteUser = async () => {
    if (!deleteTarget) return;
    try {
      setDeletingId(deleteTarget.id);
      setDeleteErrorMessage("");
      await api.delete(`/user/${deleteTarget.id}`);
      setUsers(prev => prev.filter(u => u.id !== deleteTarget.id));
      setDeleteTarget(null);
      setOpenMenuId(null);
    } catch (err) {
      setDeleteErrorMessage(err?.response?.data?.message || "Failed to delete user");
    } finally {
      setDeletingId(null);
    }
  };

  const handleInvite = async () => {
    const trimmedName = form.name.trim();
    const trimmedEmail = form.email.trim().toLowerCase();
    if (!trimmedName || !trimmedEmail) return setInviteErrorMessage("Please fill all fields.");

    try {
      setInviteSubmitting(true);
      setInviteErrorMessage("");
      const res = await api.post("/invite/send-invite", {
        name: trimmedName,
        email: trimmedEmail,
        role: form.role,
      }, { timeout: 120000 });

      if (res.data?.success) {
        const sent = Boolean(res.data?.inviteEmailSent);
        const restored = /restored/i.test(res.data?.message || "");
        const resent = Boolean(res.data?.resent);
        setShowModal(false);
        setForm({ name: "", email: "", role: "Employee" });
        setInviteResult({
          emailSent: sent,
          title: sent ? (resent ? "Invite Re-sent" : restored ? "User Restored & Invited" : "Invite Sent") : "User Added",
          message: res.data?.message || (sent ? "Invite sent successfully" : "User added; email failed.")
        });
        await fetchUsers();
      }
    } catch (err) {
      setInviteErrorMessage(err?.response?.data?.message || "Failed to send invite");
    } finally {
      setInviteSubmitting(false);
    }
  };

  const handleSetupRealm = async () => {
    if (!isSuperAdmin) return;
    setRealmSetupLoading(true);
    setRealmSetupStatus(null);
    try {
      await api.post("/admin/setup-realm");
      setRealmSetupStatus({ ok: true, message: "Keycloak realm configured successfully." });
    } catch (err) {
      setRealmSetupStatus({ ok: false, message: err?.response?.data?.message || "Realm setup failed." });
    } finally {
      setRealmSetupLoading(false);
    }
  };

  const dbEmails = new Set(users.map(u => (u.email || "").toLowerCase()).filter(Boolean));
  const kcOnlyUsers = keycloakUsers
    .filter(ku => ku.email && !dbEmails.has(ku.email.toLowerCase()))
    .map((ku, i) => ({
      id: `kc-${ku.id || ku.username || i}`,
      emp_id: "—",
      name: ku.fullName || [ku.firstName, ku.lastName].filter(Boolean).join(" ") || ku.username || "N/A",
      email: ku.email || "N/A",
      role: normalizeRole(ku.role || "User"),
      phone: "—",
      details: "Keycloak Only",
      fromKeycloak: true,
    }));

  const allUsers = [...users, ...kcOnlyUsers];
  const filteredUsers = allUsers.filter(u =>
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.emp_id?.toLowerCase().includes(search.toLowerCase()) ||
    u.role?.toLowerCase().includes(search.toLowerCase())
  );

  return {
    isSuperAdmin, isAdmin, currentRole, inviteRoleOptions,
    users, allUsers, filteredUsers, search, setSearch,
    openMenuId, setOpenMenuId, roleUpdatingId, deletingId,
    deleteTarget, setDeleteTarget, deleteErrorMessage, setDeleteErrorMessage,
    showModal, setShowModal, form, setForm, inviteSubmitting,
    inviteResult, setInviteResult, inviteErrorMessage, setInviteErrorMessage,
    realmSetupLoading, realmSetupStatus, keycloakUsersLoading, keycloakUsersError,
    canManageRolesFor, canDeleteUser, handleRoleChange, handleDeleteUser,
    confirmDeleteUser, handleInvite, handleSetupRealm
  };
}
