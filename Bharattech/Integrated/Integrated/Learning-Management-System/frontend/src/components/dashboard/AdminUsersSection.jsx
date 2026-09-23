import React from "react";
import { Users, Plus, Search, Edit } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";

export default function AdminUsersSection({
  filteredUsers,
  isLoading,
  searchTerm,
  setSearchTerm,
  handleAddUser,
  handleEditUser,
  authUser,
  normalizeRole,
}) {
  const getRoleBadgeClass = (role) => {
    const r = (role || "").toLowerCase();
    if (r === "employee") return "bg-blue-50 text-blue-700";
    if (r === "intern") return "bg-purple-50 text-purple-700";
    if (r === "subadmin") return "bg-blue-50 text-blue-700";
    if (r === "admin") return "bg-red-50 text-red-700";
    return "bg-gray-50 text-gray-700";
  };

  const getAvatarBgClass = (role) => {
    const r = (role || "").toLowerCase();
    if (r === "employee") return "bg-blue-600";
    if (r === "intern") return "bg-purple-600";
    if (r === "subadmin") return "bg-blue-600";
    if (r === "admin") return "bg-red-600";
    return "bg-gray-600";
  };

  return (
    <Card className="mb-6 bg-white rounded-xl shadow-sm">
      <CardHeader className="px-4 sm:px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 w-full">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
              <Users className="w-5 h-5 text-gray-700" />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base sm:text-lg font-bold text-gray-900 truncate">
                Manage Team - Employees, Interns & Subadmins
              </CardTitle>
              <p className="text-xs text-gray-500 mt-1">(Cannot manage admins)</p>
            </div>
          </div>
          <button
            onClick={handleAddUser}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm font-semibold shadow-sm flex-shrink-0 w-full sm:w-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add User</span>
          </button>
        </div>
      </CardHeader>

      <CardContent className="px-4 sm:px-6 py-4 sm:py-6">
        <div className="mb-6 relative">
          <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
          <Input
            type="text"
            placeholder="Search by name, email, or role..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 sm:pl-12 rounded-lg focus:ring-blue-500 text-sm sm:text-base"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-sm text-gray-500">Loading users...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-12 text-sm text-gray-500">
            {searchTerm ? "No users found matching your search." : "No users found. Click 'Add User' to create one."}
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto rounded-xl bg-white shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="py-3 px-4 lg:px-6 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="py-3 px-4 lg:px-6 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
                    <th className="py-3 px-4 lg:px-6 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="py-3 px-4 lg:px-6 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="py-3 px-4 lg:px-6 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-4 lg:px-6">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-semibold text-white flex-shrink-0 ${getAvatarBgClass(user.role)}`}>
                            {user.name?.charAt(0)?.toUpperCase() || "U"}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate">{user.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 lg:px-6">
                        <span className={`text-xs px-3 py-1.5 rounded-full font-semibold border ${getRoleBadgeClass(user.role)}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="py-4 px-4 lg:px-6 text-sm text-gray-600 truncate max-w-xs">{user.email}</td>
                      <td className="py-4 px-4 lg:px-6">
                        <span className={`text-xs px-3 py-1.5 rounded-full font-semibold border ${user.status === "Active" ? "bg-green-50 text-green-700" : "bg-gray-50 text-gray-600"}`}>
                          {user.status}
                        </span>
                      </td>
                      <td className="py-4 px-4 lg:px-6">
                        <button
                          onClick={() => handleEditUser(user)}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white text-gray-900 hover:bg-gray-50 text-sm font-medium"
                        >
                          <Edit className="w-4 h-4" />
                          <span className="hidden lg:inline">Manage</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden space-y-4">
              {filteredUsers.map((user) => (
                <div key={user.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-semibold text-white flex-shrink-0 ${getAvatarBgClass(user.role)}`}>
                        {user.name?.charAt(0)?.toUpperCase() || "U"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-gray-900 text-sm truncate">{user.name}</p>
                        <p className="text-xs text-gray-500 truncate">{user.email}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleEditUser(user)}
                      className="text-blue-600 hover:text-blue-700 p-2 flex-shrink-0"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="space-y-2 pt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Role</span>
                      <span className={`text-xs px-3 py-1.5 rounded-full font-semibold border ${getRoleBadgeClass(user.role)}`}>
                        {user.role}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Status</span>
                      <span className={`text-xs px-3 py-1.5 rounded-full font-semibold ${user.status === "Active" ? "bg-green-50 text-green-700" : "bg-gray-50 text-gray-600"}`}>
                        {user.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="mt-4 p-3 bg-white rounded-md text-xs text-blue-700">
          <strong>Note:</strong>{" "}
          {normalizeRole(authUser?.role) === "superadmin"
            ? "Superadmin can delete Admin, Subadmin, Employee, and Intern accounts. Superadmin accounts remain protected."
            : "Admins can delete only Employee and Intern accounts."}
        </div>
      </CardContent>
    </Card>
  );
}
