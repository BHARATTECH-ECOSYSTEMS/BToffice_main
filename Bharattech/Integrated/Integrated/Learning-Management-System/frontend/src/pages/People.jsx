import React, { useEffect, useState, useRef } from "react";
import {
  Search,
  Trash2,
  ChevronDown,
  Plus,
  X,
  Settings2,
  CheckCircle2,
  Loader2,
  UserPlus,
  UserX,
  AlertTriangle,
} from "lucide-react";
import { useAuth } from "../LMS/context/AuthContext";
import api from "../api/axios";

const ROLE_OPTIONS = ["Superadmin", "Admin", "Employee", "Intern"];

const normalizeRole = (role) => {
  const value = String(role || "")
    .trim()
    .toLowerCase()
    .replace(/[-_\s]/g, "");
  if (value === "superadmin") return "Superadmin";
  if (value === "admin") return "Admin";
  if (value === "employee") return "Employee";
  if (value === "intern") return "Intern";
  return role || "User";
};

/* ---------------- SHARED UI PRIMITIVES ---------------- */
// Same design language as the rest of the app: one shared button
// component and one card shell instead of ad-hoc classes everywhere.

const cx = (...classes) => classes.filter(Boolean).join(" ");

const cardShell =
  "rounded-2xl border border-slate-200/90 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.08)]";

const Btn = ({
  as: Comp = "button",
  variant = "primary",
  size = "md",
  className,
  disabled,
  children,
  ...props
}) => {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2";
  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2.5 text-sm",
  };
  const variants = {
    indigo:
      "bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-md shadow-blue-600/25 hover:from-blue-700 hover:to-blue-800 hover:shadow-lg hover:shadow-blue-600/30 focus-visible:ring-blue-500",
    outlineBlue:
      "border-2 border-blue-500 bg-white text-blue-700 hover:bg-blue-50 focus-visible:ring-blue-400",
    outline:
      "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus-visible:ring-slate-400",
    danger:
      "border border-red-200 bg-white text-red-600 hover:bg-red-50 focus-visible:ring-red-400",
    dangerSolid:
      "bg-red-600 text-white shadow-md hover:bg-red-700 focus-visible:ring-red-500",
    ghost: "text-slate-500 hover:bg-slate-100 focus-visible:ring-slate-400",
  };
  return (
    <Comp
      disabled={disabled}
      className={cx(base, sizes[size], variants[variant], className)}
      {...props}
    >
      {children}
    </Comp>
  );
};

const Label = ({ children }) => (
  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
    {children}
  </label>
);

const fieldClasses =
  "w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100";

const EmptyState = ({ label }) => (
  <div className="flex flex-col items-center justify-center gap-2 py-10 text-slate-400">
    <UserX className="h-7 w-7" />
    <p className="text-sm">{label}</p>
  </div>
);

/* ---------------- MAIN COMPONENT ---------------- */

export default function People() {
  const { hasRole, user: authUser } = useAuth();
  const currentRole = normalizeRole(
    authUser?.role || localStorage.getItem("role"),
  );
  const isSuperAdmin = currentRole === "Superadmin";
  const isAdminOnly = currentRole === "Admin";
  const isAdmin = isSuperAdmin || isAdminOnly || hasRole("Admin");
  const showActionColumns = isAdmin;
  const inviteRoleOptions = isSuperAdmin
    ? ROLE_OPTIONS
    : ["Employee", "Intern"];

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
  const [form, setForm] = useState({
    name: "",
    email: "",
    role: "Employee",
  });

  const nameInputRef = useRef(null);

  useEffect(() => {
    fetchUsers();
    fetchKeycloakUsers();
    const interval = setInterval(fetchKeycloakUsers, 30000);
    return () => clearInterval(interval);
  }, []);

  // Escape closes whichever modal is open (guards against interrupting an
  // in-flight submit/delete, same as the rest of the app's modals).
  useEffect(() => {
    if (!showModal && !deleteTarget && !inviteResult) return;
    const onKeyDown = (e) => {
      if (e.key !== "Escape") return;
      if (inviteResult) {
        setInviteResult(null);
        return;
      }
      if (deleteTarget && !deletingId) {
        setDeleteTarget(null);
        setDeleteErrorMessage("");
        return;
      }
      if (showModal && !inviteSubmitting) {
        setShowModal(false);
        setInviteErrorMessage("");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showModal, deleteTarget, inviteResult, deletingId, inviteSubmitting]);

  useEffect(() => {
    if (showModal) nameInputRef.current?.focus();
  }, [showModal]);

  const fetchUsers = async () => {
    try {
      const res = await api.get("/user");
      const normalizedUsers = (Array.isArray(res.data) ? res.data : []).map(
        (user, index) => ({
          id: user._id || user.id,
          emp_id: user.employeeId || `EMP${index + 1}`,
          name: user.fullName || user.name || user.username || "N/A",
          email: user.email || "N/A",
          role: normalizeRole(user.role || "User"),
          phone:
            user.phoneNumber ||
            user.phone ||
            user.workPhone ||
            user.mobile ||
            user.contactNumber ||
            "-",
          details: "BharatTech",
        }),
      );

      setUsers(normalizedUsers);
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
      console.error("Keycloak users fetch failed:", err);
      setKeycloakUsersError(
        err?.response?.data?.message || "Could not load Keycloak users.",
      );
    } finally {
      setKeycloakUsersLoading(false);
    }
  };

  const canManageRolesFor = (targetUser) => {
    if (targetUser?.fromKeycloak) return false;
    const targetRole = normalizeRole(targetUser?.role);
    if (isSuperAdmin) return true;
    return isAdminOnly && ["Employee", "Intern"].includes(targetRole);
  };

  const canSetRoleFor = (targetUser, nextRole) => {
    if (isSuperAdmin) return true;
    return (
      isAdminOnly &&
      ["Employee", "Intern"].includes(normalizeRole(targetUser?.role)) &&
      ["Employee", "Intern"].includes(normalizeRole(nextRole))
    );
  };

  const canDeleteUser = (targetUser) => {
    if (targetUser?.fromKeycloak) return false;
    const targetRole = normalizeRole(targetUser?.role);
    if (isSuperAdmin)
      return ["Admin", "Employee", "Intern"].includes(targetRole);
    return isAdminOnly && ["Employee", "Intern"].includes(targetRole);
  };

  const handleRoleChange = async (id, newRole) => {
    const targetUser = users.find((user) => user.id === id);
    if (!canSetRoleFor(targetUser, newRole)) {
      alert("You do not have permission to assign this role.");
      return;
    }

    try {
      setRoleUpdatingId(id);
      await api.patch(`/user/${id}`, { role: newRole });

      setUsers((prev) =>
        prev.map((user) =>
          user.id === id ? { ...user, role: newRole } : user,
        ),
      );
      setOpenMenuId(null);
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || "Failed to update role");
    } finally {
      setRoleUpdatingId(null);
    }
  };

  const handleDeleteUser = async (targetUser) => {
    if (!canDeleteUser(targetUser)) {
      alert("You do not have permission to delete this user.");
      return;
    }

    setDeleteErrorMessage("");
    setDeleteTarget(targetUser);
  };

  const confirmDeleteUser = async () => {
    if (!deleteTarget) return;

    try {
      setDeletingId(deleteTarget.id);
      setDeleteErrorMessage("");
      await api.delete(`/user/${deleteTarget.id}`);
      setUsers((prev) => prev.filter((user) => user.id !== deleteTarget.id));
      setDeleteTarget(null);
      setOpenMenuId(null);
    } catch (err) {
      console.error(err);
      setDeleteErrorMessage(
        err?.response?.data?.message || "Failed to delete user",
      );
    } finally {
      setDeletingId(null);
    }
  };

  const handleInvite = async () => {
    const trimmedName = form.name.trim();
    const trimmedEmail = form.email.trim().toLowerCase();

    if (!trimmedName || !trimmedEmail) {
      setInviteErrorMessage("Please fill all fields.");
      return;
    }

    try {
      setInviteSubmitting(true);
      setInviteErrorMessage("");

      const res = await api.post(
        "/invite/send-invite",
        {
          name: trimmedName,
          email: trimmedEmail,
          role: form.role,
        },
        {
          timeout: 120000,
        },
      );

      if (res.data?.success) {
        const inviteEmailSent = Boolean(res.data?.inviteEmailSent);
        const restored = /restored/i.test(res.data?.message || "");
        const resent = Boolean(res.data?.resent);

        setShowModal(false);
        setForm({ name: "", email: "", role: "Employee" });
        setInviteErrorMessage("");
        setInviteResult({
          emailSent: inviteEmailSent,
          queued: false,
          title: inviteEmailSent
            ? resent
              ? "Invite Re-sent Successfully"
              : restored
                ? "User Restored And Invited"
                : "Invite Sent Successfully"
            : restored
              ? "User Restored"
              : resent
                ? "Invite Re-send Failed"
                : "User Added",
          message:
            res.data?.message ||
            (inviteEmailSent
              ? "Invite sent successfully"
              : "User was added, but the invite email could not be sent."),
        });
        await fetchUsers();
      }
    } catch (err) {
      const status = err?.response?.status;
      const timedOut = err?.code === "ECONNABORTED";
      const message = timedOut
        ? "The invite is taking longer than expected. Please try again in a moment."
        : err?.response?.data?.message || "Failed to send invite";

      if (status !== 409) {
        console.error(err);
      }

      setInviteErrorMessage(message);
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
      setRealmSetupStatus({
        ok: true,
        message:
          "Keycloak realm configured: roles created, self-registration disabled, invitation hierarchy active.",
      });
    } catch (err) {
      setRealmSetupStatus({
        ok: false,
        message: err?.response?.data?.message || "Realm setup failed.",
      });
    } finally {
      setRealmSetupLoading(false);
    }
  };

  const dbEmails = new Set(
    users.map((u) => (u.email || "").toLowerCase()).filter(Boolean),
  );
  const kcOnlyUsers = keycloakUsers
    .filter((ku) => ku.email && !dbEmails.has(ku.email.toLowerCase()))
    .map((ku, i) => ({
      id: `kc-${ku.id || ku.username || i}`,
      emp_id: "—",
      name:
        ku.fullName ||
        [ku.firstName, ku.lastName].filter(Boolean).join(" ") ||
        ku.username ||
        "N/A",
      email: ku.email || "N/A",
      role: normalizeRole(ku.role || "User"),
      phone: "—",
      details: "Keycloak",
      fromKeycloak: true,
    }));
  const mergedUsers = [...users, ...kcOnlyUsers];

  const filteredUsers = mergedUsers.filter(
    (user) =>
      user.name?.toLowerCase().includes(search.toLowerCase()) ||
      user.emp_id?.toLowerCase().includes(search.toLowerCase()) ||
      user.email?.toLowerCase().includes(search.toLowerCase()) ||
      user.phone?.toLowerCase().includes(search.toLowerCase()) ||
      user.role?.toLowerCase().includes(search.toLowerCase()),
  );

  const getRoleClasses = (role) => {
    if (role === "Superadmin") return "bg-indigo-100 text-indigo-700";
    if (role === "Admin") return "bg-red-100 text-red-600";
    if (role === "Employee") return "bg-green-100 text-green-600";
    if (role === "Intern") return "bg-blue-100 text-blue-600";
    return "bg-purple-100 text-purple-600";
  };

  const getRoleLabel = (role) => {
    if (role === "Superadmin") return "Super admin";
    return role || "User";
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6 transition-all duration-300 md:px-6 lg:px-8">
      <div className="flex flex-col lg:flex-row">
        <main className="flex-1">
          {/* HERO */}
          <header className="bharat-hero-banner mb-5 relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 p-6 shadow-md md:p-8">
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
                  People
                </h1>
                <p className="mt-2 text-xs text-blue-100/80 md:text-sm">
                  Manage users and roles in your organization
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {isAdmin && (
                  <Btn
                    variant="outlineBlue"
                    onClick={() => {
                      setInviteErrorMessage("");
                      setShowModal(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs cursor-pointer font-semibold "
                  >
                    <Plus className="h-3.5 w-3.5 text-blue-700" />
                    <span>Add People</span>
                  </Btn>
                )}

                {isSuperAdmin && (
                  <button
                    type="button"
                    onClick={handleSetupRealm}
                    disabled={realmSetupLoading}
                    title="Initialize Keycloak realm roles and disable self-registration"
                    className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-blue-700 shadow-sm transition-all hover:bg-blue-50 hover:shadow disabled:opacity-60"
                  >
                    {realmSetupLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Settings2 className="h-3.5 w-3.5 text-blue-600" />
                    )}
                    <span>
                      {realmSetupLoading ? "Setting up…" : "Setup Realm"}
                    </span>
                  </button>
                )}
              </div>
            </div>
          </header>

          {realmSetupStatus && (
            <div
              className={cx(
                "mb-6 flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm font-medium",
                realmSetupStatus.ok
                  ? "border-green-200 bg-green-50 text-green-800"
                  : "border-red-200 bg-red-50 text-red-800",
              )}
            >
              <p>{realmSetupStatus.message}</p>
              <button
                className="shrink-0 text-xs font-semibold underline opacity-70 hover:opacity-100"
                onClick={() => setRealmSetupStatus(null)}
              >
                Dismiss
              </button>
            </div>
          )}

          {keycloakUsersError && (
            <div className="mb-6 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{keycloakUsersError}</p>
            </div>
          )}

          {/* SEARCH */}
          <div className="mb-6">
            <div className="flex w-full items-center gap-3 rounded-xl border border-slate-300 bg-white px-4 py-3 shadow-sm transition focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100">
              <Search className="h-5 w-5 shrink-0 text-slate-400" />
              <input
                type="text"
                placeholder="Search users..."
                aria-label="Search users"
                className="w-full min-w-0 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                  className="shrink-0 rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* DESKTOP TABLE */}
          <div className={cx(cardShell, "hidden overflow-x-auto xl:block")}>
            <table
              className="w-full"
              style={{ minWidth: showActionColumns ? "1180px" : "940px" }}
            >
              <thead className="bg-slate-50 text-sm text-slate-600">
                <tr>
                  <th className="w-32 px-6 py-4 text-left font-semibold">
                    Emp ID
                  </th>
                  <th className="w-44 px-6 py-4 text-left font-semibold">
                    Name
                  </th>
                  <th className="w-56 px-6 py-4 text-left font-semibold">
                    Email
                  </th>
                  <th className="w-[140px] px-6 py-4 text-center font-semibold">
                    Role
                  </th>
                  <th className="w-36 px-6 py-4 text-left font-semibold">
                    Phone No.
                  </th>
                  <th className="w-52 px-6 py-4 text-left font-semibold">
                    Details
                  </th>
                  {showActionColumns && (
                    <>
                      <th className="w-48 px-6 py-4 text-center font-semibold">
                        Assign Role
                      </th>
                      <th className="w-36 px-6 py-4 text-center font-semibold">
                        Delete
                      </th>
                    </>
                  )}
                </tr>
              </thead>

              <tbody>
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={showActionColumns ? 8 : 6}>
                      <EmptyState label="No users found" />
                    </td>
                  </tr>
                )}

                {filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="border-t border-slate-100 transition-colors duration-150 hover:bg-indigo-50/60"
                  >
                    <td className="w-[120px] px-6 py-4 text-left text-slate-600">
                      {user.emp_id}
                    </td>
                    <td className="w-[180px] truncate px-6 py-4 text-left font-medium text-slate-800">
                      {user.name}
                    </td>
                    <td className="w-[220px] truncate px-6 py-4 text-left text-slate-500">
                      {user.email}
                    </td>
                    <td className="w-[140px] px-6 py-4 text-center">
                      <span
                        className={cx(
                          "inline-block whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold",
                          getRoleClasses(user.role),
                        )}
                      >
                        {getRoleLabel(user.role)}
                      </span>
                    </td>
                    <td className="w-[140px] px-6 py-4 text-left text-slate-500">
                      {user.phone}
                    </td>
                    <td className="w-[200px] truncate px-6 py-4 text-left text-slate-500">
                      {user.details}
                    </td>
                    {showActionColumns && (
                      <>
                        <td className="w-48 px-6 py-4 text-center">
                          {canManageRolesFor(user) ? (
                            <div className="relative mx-auto inline-block w-36">
                              <select
                                value={user.role}
                                onChange={(e) =>
                                  handleRoleChange(user.id, e.target.value)
                                }
                                disabled={roleUpdatingId === user.id}
                                className="w-full appearance-none rounded-lg border border-slate-300 bg-white py-1.5 pl-3 pr-8 text-center text-sm font-semibold text-slate-700 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {ROLE_OPTIONS.map((role) => (
                                  <option
                                    key={role}
                                    value={role}
                                    disabled={!canSetRoleFor(user, role)}
                                  >
                                    {getRoleLabel(role)}
                                  </option>
                                ))}
                              </select>
                              {roleUpdatingId === user.id ? (
                                <Loader2 className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />
                              ) : (
                                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                              )}
                            </div>
                          ) : (
                            <span className="text-sm font-semibold text-slate-500">
                              {getRoleLabel(user.role)}
                            </span>
                          )}
                        </td>
                        <td className="w-36 px-6 py-4 text-center">
                          <Btn
                            variant="danger"
                            size="sm"
                            onClick={() => handleDeleteUser(user)}
                            disabled={
                              !canDeleteUser(user) || deletingId === user.id
                            }
                          >
                            {deletingId === user.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4 shrink-0" />
                            )}
                            {deletingId === user.id ? "Deleting" : "Delete"}
                          </Btn>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* MOBILE CARDS */}
          <div className="space-y-4 xl:hidden">
            {filteredUsers.length === 0 ? (
              <div className={cardShell}>
                <EmptyState label="No users found" />
              </div>
            ) : (
              filteredUsers.map((user) => (
                <div key={user.id} className={cx(cardShell, "p-4")}>
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="break-words text-base font-bold tracking-tight text-slate-900">
                        {user.name}
                      </p>
                      <p className="mt-1 break-all text-sm text-slate-500">
                        {user.email}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-xl bg-indigo-50 px-3 py-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Emp ID
                      </p>
                      <p className="mt-1 break-words text-sm font-medium text-slate-900">
                        {user.emp_id || "-"}
                      </p>
                    </div>

                    <div className="rounded-xl bg-indigo-50 px-3 py-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Role
                      </p>
                      <div className="mt-1">
                        {canManageRolesFor(user) ? (
                          <select
                            value={user.role}
                            onChange={(e) =>
                              handleRoleChange(user.id, e.target.value)
                            }
                            disabled={roleUpdatingId === user.id}
                            className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm font-semibold text-slate-700 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {ROLE_OPTIONS.map((role) => (
                              <option
                                key={role}
                                value={role}
                                disabled={!canSetRoleFor(user, role)}
                              >
                                {getRoleLabel(role)}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span
                            className={cx(
                              "inline-flex rounded-full px-3 py-1 text-xs font-semibold",
                              getRoleClasses(user.role),
                            )}
                          >
                            {getRoleLabel(user.role)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="rounded-xl bg-indigo-50 px-3 py-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Phone No.
                      </p>
                      <p className="mt-1 break-words text-sm font-medium text-slate-900">
                        {user.phone || "-"}
                      </p>
                    </div>

                    <div className="rounded-xl bg-indigo-50 px-3 py-2 sm:col-span-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Details
                      </p>
                      <p className="mt-1 break-words text-sm text-slate-700">
                        {user.details || "-"}
                      </p>
                    </div>
                  </div>

                  {isAdmin && (
                    <Btn
                      variant="danger"
                      onClick={() => handleDeleteUser(user)}
                      disabled={!canDeleteUser(user) || deletingId === user.id}
                      className="mt-4 w-full"
                    >
                      {deletingId === user.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                      {deletingId === user.id ? "Deleting" : "Delete"}
                    </Btn>
                  )}
                </div>
              ))
            )}
          </div>

          {/* ADD PEOPLE MODAL */}
          {showModal && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
              onClick={() => {
                if (inviteSubmitting) return;
                setShowModal(false);
                setInviteErrorMessage("");
              }}
            >
              <div
                className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="add-people-title"
              >
                <div className="h-[5px] bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800" />

                <div className="flex items-start justify-between gap-3 px-6 pt-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-blue-600">
                      <UserPlus className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-500">
                        Invite
                      </p>
                      <h2
                        id="add-people-title"
                        className="text-lg font-bold tracking-tight text-slate-900"
                      >
                        Add New User
                      </h2>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowModal(false);
                      setInviteErrorMessage("");
                    }}
                    aria-label="Close"
                    className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-4 px-6 py-5">
                  <div>
                    <Label>Name</Label>
                    <input
                      ref={nameInputRef}
                      type="text"
                      placeholder="Full name"
                      className={fieldClasses}
                      value={form.name}
                      onChange={(e) => {
                        setForm({ ...form, name: e.target.value });
                        if (inviteErrorMessage) setInviteErrorMessage("");
                      }}
                    />
                  </div>

                  <div>
                    <Label>Email</Label>
                    <input
                      type="email"
                      placeholder="name@company.com"
                      className={fieldClasses}
                      value={form.email}
                      onChange={(e) => {
                        setForm({ ...form, email: e.target.value });
                        if (inviteErrorMessage) setInviteErrorMessage("");
                      }}
                    />
                  </div>

                  <div>
                    <Label>Role</Label>
                    <select
                      className={fieldClasses}
                      value={form.role}
                      onChange={(e) => {
                        setForm({ ...form, role: e.target.value });
                        if (inviteErrorMessage) setInviteErrorMessage("");
                      }}
                    >
                      {inviteRoleOptions.map((role) => (
                        <option key={role} value={role}>
                          {getRoleLabel(role)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {inviteErrorMessage && (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                      {inviteErrorMessage}
                    </div>
                  )}
                </div>

                <div className="flex gap-3 border-t border-slate-100 px-6 py-5">
                  <Btn
                    variant="outline"
                    onClick={() => {
                      setShowModal(false);
                      setInviteErrorMessage("");
                    }}
                    className="flex-1"
                  >
                    Cancel
                  </Btn>
                  <Btn
                    variant="indigo"
                    onClick={handleInvite}
                    disabled={inviteSubmitting}
                    className="flex-1"
                  >
                    {inviteSubmitting && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                    {inviteSubmitting ? "Sending..." : "Send Invite"}
                  </Btn>
                </div>
              </div>
            </div>
          )}

          {/* DELETE CONFIRMATION MODAL */}
          {deleteTarget && (
            <div
              className="fixed inset-0 z-[55] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
              onClick={() => {
                if (deletingId) return;
                setDeleteTarget(null);
                setDeleteErrorMessage("");
              }}
            >
              <div
                className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
              >
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
                  <Trash2 className="h-7 w-7 text-red-600" />
                </div>

                <h3 className="text-center text-xl font-bold text-slate-900">
                  Delete User
                </h3>
                <p className="mt-2 text-center text-sm text-slate-500">
                  Are you sure you want to delete {deleteTarget.name}? This user
                  will be removed from the People page.
                </p>

                {deleteErrorMessage && (
                  <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {deleteErrorMessage}
                  </div>
                )}

                <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-center">
                  <Btn
                    variant="outline"
                    onClick={() => {
                      if (deletingId) return;
                      setDeleteTarget(null);
                      setDeleteErrorMessage("");
                    }}
                    disabled={Boolean(deletingId)}
                  >
                    Cancel
                  </Btn>

                  <Btn
                    variant="dangerSolid"
                    onClick={confirmDeleteUser}
                    disabled={Boolean(deletingId)}
                  >
                    {deletingId === deleteTarget.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    {deletingId === deleteTarget.id ? "Deleting..." : "Delete"}
                  </Btn>
                </div>
              </div>
            </div>
          )}

          {/* INVITE RESULT MODAL */}
          {inviteResult && (
            <div
              className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
              onClick={() => setInviteResult(null)}
            >
              <div
                className="w-full max-w-md rounded-2xl border border-slate-200 bg-white px-6 py-7 text-center shadow-2xl"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
              >
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100">
                  <CheckCircle2 className="h-7 w-7 text-indigo-600" />
                </div>

                <h3 className="text-xl font-bold text-slate-900">
                  {inviteResult.title}
                </h3>
                <p className="mt-2 text-sm text-slate-500">
                  {inviteResult.message}
                </p>

                <Btn
                  variant="indigo"
                  onClick={() => setInviteResult(null)}
                  className="mt-6 w-full sm:w-auto"
                >
                  OK
                </Btn>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
