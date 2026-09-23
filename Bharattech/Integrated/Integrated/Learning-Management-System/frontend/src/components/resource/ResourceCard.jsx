import React from "react";
import { Link2, ExternalLink, Trash2, Loader2, UserPlus } from "lucide-react";
import { Btn, Eyebrow, IconBadge, Label, Select, cardShell } from "../ui/ButtonPrimitive";

export default function ResourceCard({
  resource,
  isAdmin,
  users = [],
  selectedUser = {},
  setSelectedUser,
  handleDelete,
  isDeleting = {},
  assignResource,
}) {
  const r = resource;

  return (
    <div className={cardShell}>
      <div className="h-[5px] bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800" />
      <div className="flex h-full flex-col p-5">
        <IconBadge icon={Link2} className="mb-4 bg-blue-50 text-blue-600" />
        <Eyebrow className="text-blue-500">Resource</Eyebrow>
        <h3 className="mb-1.5 text-base font-bold tracking-tight text-slate-900">
          {r?.title || "Untitled"}
        </h3>
        <p className="mb-5 min-h-[20px] truncate text-sm text-slate-500">
          {r?.link || "No link provided"}
        </p>

        <div className="mt-auto flex items-center gap-2.5">
          <Btn variant="primary" onClick={() => window.open(r?.link, "_blank")} className="flex-1">
            <ExternalLink className="h-3.5 w-3.5" />
            Open
          </Btn>

          {isAdmin && (
            <Btn
              variant="danger"
              onClick={() => handleDelete(r._id)}
              disabled={isDeleting[r._id]}
              className="flex-1"
            >
              {isDeleting[r._id] ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
              {isDeleting[r._id] ? "Deleting" : "Delete"}
            </Btn>
          )}
        </div>

        {isAdmin && (
          <div className="mt-3.5 flex flex-col gap-2.5 border-t border-slate-100 pt-3.5">
            <div>
              <Label>Assign user</Label>
              <Select
                value={selectedUser[r._id] || ""}
                onChange={(e) =>
                  setSelectedUser((prev) => ({
                    ...prev,
                    [r._id]: e.target.value,
                  }))
                }
              >
                <option value="">Select user</option>
                {users.map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.fullName || u.email}
                  </option>
                ))}
              </Select>
            </div>

            <Btn
              variant="subtle"
              size="sm"
              onClick={() => assignResource(r._id)}
              disabled={!selectedUser[r._id]}
              className="w-full py-2.5"
            >
              <UserPlus className="h-3.5 w-3.5" />
              Assign
            </Btn>
          </div>
        )}
      </div>
    </div>
  );
}
