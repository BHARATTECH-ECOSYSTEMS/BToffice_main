import React, { useRef, useEffect } from "react";
import { UserPlus, X, Loader2, CheckCircle2 } from "lucide-react";
import { Btn, Label } from "../ui/ButtonPrimitive";

export default function InviteUserModal({
  isOpen,
  onClose,
  form,
  setForm,
  inviteRoleOptions,
  handleInvite,
  inviteSubmitting,
  inviteErrorMessage,
  inviteResult,
  setInviteResult,
}) {
  const nameInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) nameInputRef.current?.focus();
  }, [isOpen]);

  const fieldClasses =
    "w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100";

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
          onClick={() => {
            if (!inviteSubmitting) onClose();
          }}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
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
                  <h2 className="text-lg font-bold tracking-tight text-slate-900">Add New User</h2>
                </div>
              </div>
              <button
                onClick={onClose}
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
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>

              <div>
                <Label>Email</Label>
                <input
                  type="email"
                  placeholder="name@company.com"
                  className={fieldClasses}
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>

              <div>
                <Label>Role</Label>
                <select
                  className={fieldClasses}
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                >
                  {inviteRoleOptions.map((role) => (
                    <option key={role} value={role}>{role}</option>
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
              <Btn variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </Btn>
              <Btn variant="primary" onClick={handleInvite} disabled={inviteSubmitting} className="flex-1">
                {inviteSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                {inviteSubmitting ? "Sending..." : "Send Invite"}
              </Btn>
            </div>
          </div>
        </div>
      )}

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

            <h3 className="text-xl font-bold text-slate-900">{inviteResult.title}</h3>
            <p className="mt-2 text-sm text-slate-500">{inviteResult.message}</p>

            <Btn variant="primary" onClick={() => setInviteResult(null)} className="mt-6 w-full sm:w-auto">
              OK
            </Btn>
          </div>
        </div>
      )}
    </>
  );
}
