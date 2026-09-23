import React from "react";
import { Lock } from "lucide-react";

export default function ChangePasswordCard({
  showPasswordForm,
  setShowPasswordForm,
  currentPassword,
  setCurrentPassword,
  newPassword,
  setNewPassword,
  confirmNewPassword,
  setConfirmNewPassword,
  passwordError,
  setPasswordError,
  changingPassword,
  onSubmit
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 mt-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Lock className="w-5 h-5 text-gray-500" />
          Password
        </h3>
        {!showPasswordForm && (
          <button
            onClick={() => {
              setShowPasswordForm(true);
              setPasswordError("");
            }}
            className="text-sm font-medium text-blue-600 hover:text-blue-700 cursor-pointer"
          >
            Change Password
          </button>
        )}
      </div>

      {showPasswordForm && (
        <form onSubmit={onSubmit} className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl">
          <div>
            <label className="text-sm text-gray-500">Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
            />
          </div>
          <div>
            <label className="text-sm text-gray-500">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
            />
          </div>
          <div>
            <label className="text-sm text-gray-500">Confirm New Password</label>
            <input
              type="password"
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              required
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
            />
          </div>

          {passwordError && (
            <p className="sm:col-span-3 text-sm text-red-600">{passwordError}</p>
          )}

          <div className="sm:col-span-3 flex gap-2">
            <button
              type="submit"
              disabled={changingPassword}
              className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 disabled:opacity-50 cursor-pointer"
            >
              {changingPassword ? "Saving…" : "Save Password"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowPasswordForm(false);
                setCurrentPassword("");
                setNewPassword("");
                setConfirmNewPassword("");
                setPasswordError("");
              }}
              className="rounded-lg border border-gray-300 text-gray-600 text-sm font-medium px-4 py-2 hover:bg-gray-50 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
