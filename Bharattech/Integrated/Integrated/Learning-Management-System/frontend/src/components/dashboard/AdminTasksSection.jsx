import React from "react";
import { FileText, Plus, Search, Edit, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";

export default function AdminTasksSection({
  filteredTasks,
  isLoading,
  taskSearchTerm,
  setTaskSearchTerm,
  openCreateTaskModal,
  openEditTaskModal,
  handleDeleteTask,
}) {
  const getStatusBadgeClass = (status) => {
    if (status === "Completed") return "bg-green-100 text-green-700 border border-green-200 text-xs";
    if (status === "In Progress") return "bg-blue-100 text-blue-700 border border-blue-200 text-xs";
    return "bg-gray-100 text-gray-600 border border-gray-200 text-xs";
  };

  return (
    <Card className="bg-white rounded-xl shadow-sm mb-8">
      <CardHeader className="px-4 sm:px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 w-full">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base sm:text-lg font-bold text-gray-900">
                Task Management
              </CardTitle>
              <p className="text-xs text-gray-500 mt-1">
                Create and manage tasks for employees and interns
              </p>
            </div>
          </div>
          <Button
            onClick={openCreateTaskModal}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-sm flex-shrink-0 w-full sm:w-auto"
          >
            <Plus className="w-4 h-4 inline mr-2" />
            <span className="hidden sm:inline">Create Task</span>
            <span className="sm:hidden">Create</span>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="px-4 sm:px-6 py-4 sm:py-6">
        <div className="mb-6 relative">
          <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
          <Input
            type="text"
            placeholder="Search tasks..."
            value={taskSearchTerm}
            onChange={(e) => setTaskSearchTerm(e.target.value)}
            className="pl-10 sm:pl-12 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
          />
        </div>

        {isLoading && filteredTasks.length === 0 ? (
          <div className="text-center py-8 text-sm text-gray-500">Loading tasks...</div>
        ) : filteredTasks.length === 0 ? (
          <div className="text-center py-12 text-sm text-gray-500">
            {taskSearchTerm ? "No tasks found matching your search." : "No tasks found. Click 'Create Task' to create one."}
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto rounded-xl bg-white shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="py-3 px-4 lg:px-6 text-left text-xs font-semibold text-gray-500">Title</th>
                    <th className="py-3 px-4 lg:px-6 text-left text-xs font-semibold text-gray-500">Assigned To</th>
                    <th className="py-3 px-4 lg:px-6 text-left text-xs font-semibold text-gray-500">Created By</th>
                    <th className="py-3 px-4 lg:px-6 text-left text-xs font-semibold text-gray-500">Status</th>
                    <th className="py-3 px-4 lg:px-6 text-left text-xs font-semibold text-gray-500">Due Date</th>
                    <th className="py-3 px-4 lg:px-6 text-left text-xs font-semibold text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTasks.map((task) => (
                    <tr key={task.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-4 lg:px-6">
                        <div className="font-semibold text-sm">{task.title}</div>
                        {task.description && (
                          <div className="text-xs text-gray-500 mt-1">{task.description}</div>
                        )}
                      </td>
                      <td className="py-4 px-4 lg:px-6 text-sm text-gray-900">{task.assignedName || "—"}</td>
                      <td className="py-4 px-4 lg:px-6">
                        <Badge className="bg-blue-100 text-blue-700 text-xs">
                          {(task.createdBy || "").toString().toLowerCase() === "admin" ? "Admin" : "Subadmin"}
                        </Badge>
                      </td>
                      <td className="py-4 px-4 lg:px-6">
                        <Badge className={getStatusBadgeClass(task.status)}>
                          {task.status}
                        </Badge>
                      </td>
                      <td className="py-4 px-4 lg:px-6 text-xs sm:text-sm text-gray-600">
                        {task.dueDate ? new Date(task.dueDate).toLocaleString() : "—"}
                      </td>
                      <td className="py-4 px-4 lg:px-6">
                        <div className="flex gap-2">
                          <button
                            onClick={() => openEditTaskModal(task)}
                            className="text-blue-600 hover:text-blue-700 text-xs flex items-center gap-1"
                          >
                            <Edit className="w-3 h-3" /> <span className="hidden lg:inline">Edit</span>
                          </button>
                          <button
                            onClick={() => handleDeleteTask(task)}
                            className="text-red-600 hover:text-red-700 text-xs flex items-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" /> <span className="hidden lg:inline">Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden space-y-3">
              {filteredTasks.map((task) => (
                <div key={task.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0 pr-2">
                      <h3 className="font-semibold text-sm text-gray-900 mb-1 break-words">{task.title}</h3>
                      {task.description && (
                        <p className="text-xs text-gray-500 line-clamp-2 break-words">{task.description}</p>
                      )}
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      <button onClick={() => openEditTaskModal(task)} className="text-blue-600 hover:text-blue-700 p-1.5">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteTask(task)} className="text-red-600 hover:text-red-700 p-1.5">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2 pt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Assigned To</span>
                      <span className="text-xs font-medium text-gray-900">{task.assignedName || "—"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Created By</span>
                      <Badge className="bg-blue-100 text-blue-700 text-xs">
                        {(task.createdBy || "").toString().toLowerCase() === "admin" ? "Admin" : "Subadmin"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Status</span>
                      <Badge className={getStatusBadgeClass(task.status)}>{task.status}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Due Date</span>
                      <span className="text-xs text-gray-600">{task.dueDate ? new Date(task.dueDate).toLocaleString() : "—"}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
