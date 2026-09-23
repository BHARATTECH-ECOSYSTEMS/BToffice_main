import React from "react";
import { Edit2, Mail, Phone, Save, X } from "lucide-react";

export default function ProfileContactCard({
  profile,
  userName,
  userEmail,
  userId,
  isEditing,
  editPhone,
  setEditPhone,
  editWorkPhone,
  setEditWorkPhone,
  saving,
  onEdit,
  onCancel,
  onSave
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 mb-6">
      <div className="flex flex-col lg:flex-row lg:items-start gap-4 lg:gap-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-4 flex-shrink-0">
          <div className="relative flex-shrink-0">
            <img
              src={
                profile.avatar ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&size=100&background=2563eb&color=fff`
              }
              alt={userName}
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover shadow-lg"
            />
            <div className="absolute bottom-0 right-0 w-5 h-5 bg-green-500 rounded-full border-2 border-white"></div>
          </div>
          <div className="min-w-0">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">
              {userName}
              <span className="text-sm sm:text-base font-normal text-gray-500"> (BT-{userId})</span>
            </h2>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="flex items-start sm:items-center gap-2 flex-wrap">
              <Mail className="w-4 h-4 text-gray-400" />
              <span className="text-gray-500">Work Email:</span>
              <span className="text-blue-600 font-medium">{userEmail}</span>
            </div>
            <div className="flex items-start sm:items-center gap-2 flex-wrap">
              <Mail className="w-4 h-4 text-gray-400" />
              <span className="text-gray-500">Email:</span>
              <span className="text-blue-600 font-medium">{userEmail}</span>
            </div>
            <div className="flex items-start sm:items-center gap-2 flex-wrap">
              <Phone className="w-4 h-4 text-gray-400" />
              <span className="text-gray-500">Work Phone:</span>
              {isEditing ? (
                <input
                  type="tel"
                  value={editWorkPhone}
                  onChange={(e) => setEditWorkPhone(e.target.value)}
                  maxLength={10}
                  className="px-2 py-1 rounded text-sm border"
                />
              ) : (
                <span className="font-medium">{profile.workPhone || "N/A"}</span>
              )}
            </div>
            <div className="flex items-start sm:items-center gap-2 flex-wrap">
              <Phone className="w-4 h-4 text-gray-400" />
              <span className="text-gray-500">Phone:</span>
              {isEditing ? (
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  maxLength={10}
                  className="px-2 py-1 rounded text-sm border"
                />
              ) : (
                <span className="font-medium">{profile.phone || "N/A"}</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <button
                onClick={onSave}
                disabled={saving}
                className="p-2 hover:bg-green-100 rounded-lg text-green-600 cursor-pointer disabled:opacity-50"
              >
                <Save className="w-5 h-5" />
              </button>
              <button
                onClick={onCancel}
                className="p-2 hover:bg-red-100 rounded-lg text-red-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </>
          ) : (
            <button
              onClick={onEdit}
              className="p-2 hover:bg-gray-100 rounded-lg cursor-pointer"
            >
              <Edit2 className="w-5 h-5 text-gray-500" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
