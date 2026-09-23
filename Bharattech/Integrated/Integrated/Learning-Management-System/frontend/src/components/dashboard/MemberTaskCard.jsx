import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { FileText, Upload } from "lucide-react";

function StatusBadge({ status }) {
  return (
    <span
      className={`text-xs px-2 py-1 rounded-full ${
        status === "Completed"
          ? "bg-green-100 text-green-700"
          : "bg-blue-100 text-blue-700"
      }`}
    >
      {status}
    </span>
  );
}

export default function MemberTaskCard({
  title = "My Tasks",
  tasks,
  isLoading,
  onFileUpload,
  onStatusChange
}) {
  return (
    <Card className="mb-4 sm:mb-6">
      <CardHeader className="px-3 sm:px-4 md:px-6 py-3 sm:py-4">
        <CardTitle className="text-base sm:text-lg font-semibold">{title}</CardTitle>
      </CardHeader>

      <CardContent className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 md:py-6">
        {isLoading ? (
          <div className="py-10 text-center text-sm text-gray-500">Loading...</div>
        ) : tasks.length === 0 ? (
          <div className="py-10 text-center text-sm text-gray-500">No tasks available.</div>
        ) : (
          <div className="space-y-2 sm:space-y-3 md:space-y-4">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="p-2.5 sm:p-3 md:p-4 bg-gray-50 rounded-md hover:bg-gray-100 transition flex flex-col sm:flex-row sm:justify-between gap-2.5 sm:gap-3 md:gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                    <div className="font-medium text-sm sm:text-base text-gray-900 break-words">
                      {task.title}
                    </div>
                    <StatusBadge status={task.status} />
                  </div>

                  {task.description && (
                    <div className="text-xs text-gray-500 mb-2 break-words">
                      {task.description}
                    </div>
                  )}

                  <div className="text-xs text-gray-500 mb-2">
                    Due: {task.dueDate ? new Date(task.dueDate).toLocaleString() : "—"}
                  </div>

                  {task.projectFile && (
                    <div className="bg-white p-2 sm:p-3 rounded mt-2 mb-2">
                      <div className="text-xs font-semibold mb-1">Project Document</div>
                      <div className="flex items-center gap-2 text-xs">
                        <FileText className="w-4 h-4 text-gray-600 flex-shrink-0" />
                        <a
                          href={task.projectFile.fileUrl}
                          download={task.projectFile.name}
                          className="text-blue-600 underline break-all"
                        >
                          {task.projectFile.name}
                        </a>
                      </div>
                    </div>
                  )}

                  {Array.isArray(task.files) && task.files.length > 0 && (
                    <div className="space-y-1 mt-2">
                      {task.files.map((f, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs">
                          <FileText className="w-4 h-4 text-gray-500 flex-shrink-0" />
                          <a
                            href={f.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 underline break-all"
                          >
                            {f.name}
                          </a>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="text-xs text-gray-500 mt-2">
                    Assigned To: {task.assignedName || "—"}
                  </div>
                </div>

                <div className="flex flex-row sm:flex-col items-center sm:items-end gap-2 flex-shrink-0 pt-2 sm:pt-0">
                  <label
                    className="text-green-500 cursor-pointer hover:text-green-600 transition-colors p-1.5 sm:p-1"
                    title="Upload file"
                    aria-label="Upload file"
                  >
                    <Upload className="w-5 h-5 sm:w-4 sm:h-4" />
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => onFileUpload(task.id, e.target.files[0])}
                      accept=".pdf,.docx,.zip,.png,.jpg"
                    />
                  </label>

                  <select
                    value={task.status}
                    onChange={(e) => onStatusChange(task.id, e.target.value)}
                    className="text-xs px-2 sm:px-2 py-1.5 sm:py-1.5 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white min-w-[100px] sm:min-w-0"
                  >
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
