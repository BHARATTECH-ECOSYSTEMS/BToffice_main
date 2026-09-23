import React from "react";
import { Edit, Trash2, AlertCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";

export default function SubadminTaskTable({
  filteredTasks,
  openEditModal,
  handleDeleteTask,
}) {
  const getBadgeClass = (status) => {
    if (status === "Completed") return "bg-green-100 text-green-700";
    if (status === "In Progress") return "bg-blue-100 text-blue-700";
    return "bg-gray-100 text-gray-700";
  };

  return (
    <>
      <Card className="shadow rounded-xl mb-6">
        <CardHeader className="px-4 sm:px-6 py-3 sm:py-4">
          <CardTitle className="text-base sm:text-lg font-bold flex flex-col sm:flex-row sm:justify-between gap-2">
            <span>Tasks</span>
            <span className="text-xs sm:text-sm text-gray-500">{filteredTasks.length} result(s)</span>
          </CardTitle>
        </CardHeader>

        <CardContent className="p-0">
          {filteredTasks.length === 0 ? (
            <p className="text-center py-10 text-sm text-gray-500">No tasks found.</p>
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-gray-700">
                      <th className="p-3 lg:p-4 text-left text-xs font-semibold">Title</th>
                      <th className="p-3 lg:p-4 text-left text-xs font-semibold">Assigned To</th>
                      <th className="p-3 lg:p-4 text-left text-xs font-semibold">Created By</th>
                      <th className="p-3 lg:p-4 text-left text-xs font-semibold">Status</th>
                      <th className="p-3 lg:p-4 text-left text-xs font-semibold">Due</th>
                      <th className="p-3 lg:p-4 text-left text-xs font-semibold">Uploads</th>
                      <th className="p-3 lg:p-4 text-left text-xs font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTasks.map((task) => (
                      <tr key={task.id} className="hover:bg-gray-50 transition-colors">
                        <td className="p-3 lg:p-4">
                          <div className="font-semibold text-sm">{task.title}</div>
                          {task.description && (
                            <div className="text-xs text-gray-500 mt-1">{task.description}</div>
                          )}
                        </td>
                        <td className="p-3 lg:p-4 text-sm text-gray-900">{task.assignedName || "—"}</td>
                        <td className="p-3 lg:p-4">
                          <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700">
                            {(task.createdBy || "").toString().toLowerCase() === "admin" ? "Admin" : "Subadmin"}
                          </span>
                        </td>
                        <td className="p-3 lg:p-4">
                          <span className={`px-2 py-1 text-xs rounded-full ${getBadgeClass(task.status)}`}>
                            {task.status}
                          </span>
                        </td>
                        <td className="p-3 lg:p-4 text-xs sm:text-sm text-gray-600">
                          {task.dueDate ? new Date(task.dueDate).toLocaleString() : "—"}
                        </td>
                        <td className="p-3 lg:p-4 text-xs">
                          {task.projectFile ? (
                            <a
                              href={task.projectFile.fileUrl}
                              download={task.projectFile.name}
                              className="text-blue-600 underline hover:text-blue-700"
                            >
                              {task.projectFile.name}
                            </a>
                          ) : (
                            <span className="text-gray-400">No file</span>
                          )}
                        </td>
                        <td className="p-3 lg:p-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => openEditModal(task)}
                              className="text-blue-600 hover:text-blue-700 text-xs flex items-center gap-1"
                            >
                              <Edit className="w-3 h-3" /> Edit
                            </button>
                            <button
                              onClick={() => handleDeleteTask(task.id)}
                              className="text-red-600 hover:text-red-700 text-xs flex items-center gap-1"
                            >
                              <Trash2 className="w-3 h-3" /> Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="md:hidden space-y-3 p-3 sm:p-4">
                {filteredTasks.map((task) => (
                  <div key={task.id} className="bg-white border rounded-lg p-3 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <div className="min-w-0 flex-1 pr-2">
                        <div className="font-semibold text-sm text-gray-900 break-words">{task.title}</div>
                        {task.description && (
                          <div className="text-xs text-gray-500 mt-1 line-clamp-2 break-words">{task.description}</div>
                        )}
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button onClick={() => openEditModal(task)} className="text-blue-600 hover:text-blue-700 p-1">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteTask(task.id)} className="text-red-600 hover:text-red-700 p-1">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1.5 pt-2 border-t text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Assigned:</span>
                        <span className="font-medium text-gray-900">{task.assignedName || "—"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Status:</span>
                        <span className={`px-2 py-0.5 rounded-full ${getBadgeClass(task.status)}`}>{task.status}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Due:</span>
                        <span className="text-gray-600">{task.dueDate ? new Date(task.dueDate).toLocaleString() : "—"}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <div className="text-xs text-gray-500 flex items-start gap-2 mb-4">
        <AlertCircle className="w-4 h-4 mt-0.5" />
        Uploaded documents are visible to employees and interns.
      </div>
    </>
  );
}
