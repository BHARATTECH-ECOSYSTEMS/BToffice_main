import React from "react";

export default function ProfileAboutCard({ userName, userEmail, role, userId }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">About</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <div>
          <label className="text-sm text-gray-500">Full Name</label>
          <p className="font-medium">{userName}</p>
        </div>
        <div>
          <label className="text-sm text-gray-500">Email</label>
          <p className="font-medium">{userEmail}</p>
        </div>
        <div>
          <label className="text-sm text-gray-500">Role</label>
          <p className="font-medium capitalize">{role || "N/A"}</p>
        </div>
        <div>
          <label className="text-sm text-gray-500">Employee ID</label>
          <p className="font-medium">BT-{userId}</p>
        </div>
      </div>
    </div>
  );
}
