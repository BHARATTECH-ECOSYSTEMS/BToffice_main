import React from "react";
import { Search, Plus, X, Settings2, Loader2, AlertTriangle } from "lucide-react";
import { Btn, cx } from "../components/ui/ButtonPrimitive";
import PeopleTable from "../components/people/PeopleTable";
import InviteUserModal from "../components/people/InviteUserModal";
import DeleteUserModal from "../components/people/DeleteUserModal";
import { usePeopleData } from "../hooks/usePeopleData";

export default function People() {
  const {
    isSuperAdmin, isAdmin, inviteRoleOptions,
    filteredUsers, search, setSearch,
    roleUpdatingId, deletingId,
    deleteTarget, setDeleteTarget, deleteErrorMessage, setDeleteErrorMessage,
    showModal, setShowModal, form, setForm, inviteSubmitting,
    inviteResult, setInviteResult, inviteErrorMessage, setInviteErrorMessage,
    realmSetupLoading, realmSetupStatus, setRealmSetupStatus, keycloakUsersError,
    canManageRolesFor, canDeleteUser, handleRoleChange, handleDeleteUser,
    confirmDeleteUser, handleInvite, handleSetupRealm
  } = usePeopleData();

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
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs cursor-pointer font-semibold"
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
                    <span>{realmSetupLoading ? "Setting up…" : "Setup Realm"}</span>
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
                  : "border-red-200 bg-red-50 text-red-800"
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

          <PeopleTable
            filteredUsers={filteredUsers}
            showActionColumns={isAdmin}
            canManageRolesFor={canManageRolesFor}
            handleRoleChange={handleRoleChange}
            roleUpdatingId={roleUpdatingId}
            canSetRoleFor={(user, role) => isSuperAdmin || (user.role !== "Admin" && role !== "Admin")}
            handleDeleteUser={handleDeleteUser}
            canDeleteUser={canDeleteUser}
            deletingId={deletingId}
          />

          <InviteUserModal
            isOpen={showModal}
            onClose={() => {
              setShowModal(false);
              setInviteErrorMessage("");
            }}
            form={form}
            setForm={setForm}
            inviteRoleOptions={inviteRoleOptions}
            handleInvite={handleInvite}
            inviteSubmitting={inviteSubmitting}
            inviteErrorMessage={inviteErrorMessage}
            inviteResult={inviteResult}
            setInviteResult={setInviteResult}
          />

          <DeleteUserModal
            deleteTarget={deleteTarget}
            onClose={() => {
              setDeleteTarget(null);
              setDeleteErrorMessage("");
            }}
            confirmDeleteUser={confirmDeleteUser}
            deletingId={deletingId}
            deleteErrorMessage={deleteErrorMessage}
          />
        </main>
      </div>
    </div>
  );
}
