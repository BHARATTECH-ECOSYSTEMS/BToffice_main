import React from "react";
import { Trash2, Loader2 } from "lucide-react";
import { Btn } from "../ui/ButtonPrimitive";

export default function DeleteUserModal({
  deleteTarget,
  onClose,
  confirmDeleteUser,
  deletingId,
  deleteErrorMessage,
}) {
  if (!deleteTarget) return null;

  return (
    <div
      className="fixed inset-0 z-[55] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
      onClick={() => {
        if (!deletingId) onClose();
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

        <h3 className="text-center text-xl font-bold text-slate-900">Delete User</h3>
        <p className="mt-2 text-center text-sm text-slate-500">
          Are you sure you want to delete {deleteTarget.name}? This user will be removed from the People page.
        </p>

        {deleteErrorMessage && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {deleteErrorMessage}
          </div>
        )}

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-center">
          <Btn variant="outline" onClick={onClose} disabled={Boolean(deletingId)}>
            Cancel
          </Btn>

          <Btn variant="danger" onClick={confirmDeleteUser} disabled={Boolean(deletingId)}>
            {deletingId === deleteTarget.id ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <Trash2 className="h-4 w-4 mr-1" />
            )}
            {deletingId === deleteTarget.id ? "Deleting..." : "Delete"}
          </Btn>
        </div>
      </div>
    </div>
  );
}
