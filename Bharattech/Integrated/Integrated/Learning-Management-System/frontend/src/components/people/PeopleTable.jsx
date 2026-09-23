import React from "react";
import { Loader2, Trash2, ChevronDown, UserX } from "lucide-react";
import { Btn, cardShell, cx } from "../ui/ButtonPrimitive";
import { ROLE_OPTIONS } from "../../hooks/usePeopleData";

export default function PeopleTable({
  filteredUsers,
  showActionColumns,
  canManageRolesFor,
  handleRoleChange,
  roleUpdatingId,
  canSetRoleFor,
  handleDeleteUser,
  canDeleteUser,
  deletingId,
}) {
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
    <>
      {/* DESKTOP TABLE */}
      <div className={cx(cardShell, "hidden overflow-x-auto xl:block")}>
        <table className="w-full" style={{ minWidth: showActionColumns ? "1180px" : "940px" }}>
          <thead className="bg-slate-50 text-sm text-slate-600">
            <tr>
              <th className="w-32 px-6 py-4 text-left font-semibold">Emp ID</th>
              <th className="w-44 px-6 py-4 text-left font-semibold">Name</th>
              <th className="w-56 px-6 py-4 text-left font-semibold">Email</th>
              <th className="w-[140px] px-6 py-4 text-center font-semibold">Role</th>
              <th className="w-36 px-6 py-4 text-left font-semibold">Phone No.</th>
              <th className="w-52 px-6 py-4 text-left font-semibold">Details</th>
              {showActionColumns && (
                <>
                  <th className="w-48 px-6 py-4 text-center font-semibold">Assign Role</th>
                  <th className="w-36 px-6 py-4 text-center font-semibold">Delete</th>
                </>
              )}
            </tr>
          </thead>

          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={showActionColumns ? 8 : 6}>
                  <div className="flex flex-col items-center justify-center gap-2 py-10 text-slate-400">
                    <UserX className="h-7 w-7" />
                    <p className="text-sm">No users found</p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <tr key={user.id} className="border-t border-slate-100 transition-colors duration-150 hover:bg-indigo-50/60">
                  <td className="w-[120px] px-6 py-4 text-left text-slate-600">{user.emp_id}</td>
                  <td className="w-[180px] truncate px-6 py-4 text-left font-medium text-slate-800">{user.name}</td>
                  <td className="w-[220px] truncate px-6 py-4 text-left text-slate-500">{user.email}</td>
                  <td className="w-[140px] px-6 py-4 text-center">
                    <span className={cx("inline-block whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold", getRoleClasses(user.role))}>
                      {getRoleLabel(user.role)}
                    </span>
                  </td>
                  <td className="w-[140px] px-6 py-4 text-left text-slate-500">{user.phone}</td>
                  <td className="w-[200px] truncate px-6 py-4 text-left text-slate-500">{user.details}</td>
                  {showActionColumns && (
                    <>
                      <td className="w-48 px-6 py-4 text-center">
                        {canManageRolesFor(user) ? (
                          <div className="relative mx-auto inline-block w-36">
                            <select
                              value={user.role}
                              onChange={(e) => handleRoleChange(user.id, e.target.value)}
                              disabled={roleUpdatingId === user.id}
                              className="w-full appearance-none rounded-lg border border-slate-300 bg-white py-1.5 pl-3 pr-8 text-center text-sm font-semibold text-slate-700 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {ROLE_OPTIONS.map((role) => (
                                <option key={role} value={role} disabled={!canSetRoleFor(user, role)}>
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
                          <span className="text-sm font-semibold text-slate-500">{getRoleLabel(user.role)}</span>
                        )}
                      </td>
                      <td className="w-36 px-6 py-4 text-center">
                        <Btn
                          variant="danger"
                          size="sm"
                          onClick={() => handleDeleteUser(user)}
                          disabled={!canDeleteUser(user) || deletingId === user.id}
                        >
                          {deletingId === user.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 shrink-0" />}
                          {deletingId === user.id ? "Deleting" : "Delete"}
                        </Btn>
                      </td>
                    </>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MOBILE CARDS */}
      <div className="space-y-4 xl:hidden">
        {filteredUsers.length === 0 ? (
          <div className={cardShell}>
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-slate-400">
              <UserX className="h-7 w-7" />
              <p className="text-sm">No users found</p>
            </div>
          </div>
        ) : (
          filteredUsers.map((user) => (
            <div key={user.id} className={cx(cardShell, "p-4")}>
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="break-words text-base font-bold tracking-tight text-slate-900">{user.name}</p>
                  <p className="mt-1 break-all text-sm text-slate-500">{user.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-indigo-50 px-3 py-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Emp ID</p>
                  <p className="mt-1 break-words text-sm font-medium text-slate-900">{user.emp_id || "-"}</p>
                </div>

                <div className="rounded-xl bg-indigo-50 px-3 py-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Role</p>
                  <div className="mt-1">
                    {canManageRolesFor(user) ? (
                      <select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                        disabled={roleUpdatingId === user.id}
                        className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm font-semibold text-slate-700 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {ROLE_OPTIONS.map((role) => (
                          <option key={role} value={role} disabled={!canSetRoleFor(user, role)}>
                            {getRoleLabel(role)}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className={cx("inline-flex rounded-full px-3 py-1 text-xs font-semibold", getRoleClasses(user.role))}>
                        {getRoleLabel(user.role)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="rounded-xl bg-indigo-50 px-3 py-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Phone No.</p>
                  <p className="mt-1 break-words text-sm font-medium text-slate-900">{user.phone || "-"}</p>
                </div>

                <div className="rounded-xl bg-indigo-50 px-3 py-2 sm:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Details</p>
                  <p className="mt-1 break-words text-sm text-slate-700">{user.details || "-"}</p>
                </div>
              </div>

              {showActionColumns && (
                <Btn
                  variant="danger"
                  onClick={() => handleDeleteUser(user)}
                  disabled={!canDeleteUser(user) || deletingId === user.id}
                  className="mt-4 w-full"
                >
                  {deletingId === user.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  {deletingId === user.id ? "Deleting" : "Delete"}
                </Btn>
              )}
            </div>
          ))
        )}
      </div>
    </>
  );
}
