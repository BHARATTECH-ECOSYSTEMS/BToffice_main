// ./components/TaskManagementModal.jsx
import React, { useEffect, useState } from "react";
import { X, Upload, ChevronDown } from "lucide-react";

export default function TaskManagementModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  task,
  assignableUsers = [] // list of employee + intern
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState("");
  const [assignedEmail, setAssignedEmail] = useState("");

  // file (PDF/DOCX/ZIP)
  const [projectFile, setProjectFile] = useState(null);

  useEffect(() => {
    if (task) {
      setTitle(task.title || "");
      setDescription(task.description || "");
      setDueDate(task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 16) : "");
      setPriority(task.priority || "");
      setAssignedEmail(task.assignedEmail || "");
      setProjectFile(task.projectFile || null);
    } else {
      setTitle("");
      setDescription("");
      setDueDate("");
      setPriority("");
      setAssignedEmail("");
      setProjectFile(null);
    }
  }, [task, isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    let assignedUser = assignableUsers.find(u => u.email === assignedEmail);

    const payload = {
      title,
      description,
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      priority,
      assignedEmail: assignedEmail || null,
      assignedRole: assignedUser?.role || null,     // employee/intern
      assignedName: assignedUser?.name || null,     // person's name
      projectFile: projectFile || null,             // uploaded PDF/DOCX/ZIP
      status: task?.status || "Pending"
    };

    onSave(payload);
  };

  const handleDelete = () => {
    if (onDelete && task) onDelete(task);
  };

  // handle file upload
  const handleFileUpload = (file) => {
    if (!file) return;

    setProjectFile({
      name: file.name,
      fileUrl: URL.createObjectURL(file)
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-xl p-6 z-10">

        {/* MODAL HEADER */}
        <div className="relative flex items-center justify-center mb-6">
          <h3 className="text-xl font-bold text-gray-800 text-center">
            {task ? "Edit Task" : "Create Task"}
          </h3>

          {/* CLOSE BUTTON RIGHT */}
          <button
            onClick={onClose}
            className="absolute right-0 text-gray-500 hover:text-gray-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* FORM */}
        <div className="space-y-4">

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Title</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full mt-1 px-3 py-2 border rounded-md"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              rows="3"
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full mt-1 px-3 py-2 border rounded-md"
            />
          </div>

          {/* Due Date + Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">Due Date & Time</label>
              <input
                type="datetime-local"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="w-full mt-1 px-3 py-2 border rounded-md"
              />
            </div>

            <div className="relative">
              <label className="block text-sm font-medium text-gray-700">Priority</label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value)}
                className="relative w-full mt-1 px-3 py-2 pr-9 border rounded-md appearance-none"
              >
                <option value="">Normal</option>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>

              <ChevronDown className="absolute right-3 bottom-[34px] w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Assign To Person */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Assign To Person</label>
            <div className="relative">
              <select
                value={assignedEmail}
                onChange={e => setAssignedEmail(e.target.value)}
                className="w-full mt-1 px-3 py-2 pr-9 border rounded-md appearance-none"
              >
                <option value="">— Select User —</option>

                {assignableUsers.map(u => (
                  <option key={u.email} value={u.email}>
                    {u.name} — {u.role}
                  </option>
                ))}
              </select>

              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            </div>
          </div>

          {/* Upload Project File */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Upload Project Document (PDF / DOCX / ZIP)
            </label>

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-5 text-center mt-1 hover:border-blue-500 transition">
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />

              <p className="text-xs text-gray-600 mb-2">Drag & Drop or Choose File</p>

              <label className="px-4 py-2 bg-blue-500 text-white rounded-md text-sm cursor-pointer hover:bg-blue-600 transition">
                Browse Files
                <input
                  type="file"
                  accept=".pdf,.docx,.zip"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e.target.files[0])}
                />
              </label>

              {projectFile && (
                <p className="text-xs text-green-600 mt-2">
                  Uploaded: {projectFile.name}
                </p>
              )}
            </div>
          </div>

          {/* BUTTONS */}
          <div className="flex items-center justify-end gap-2 pt-4">
            {task && (
              <button
                onClick={handleDelete}
                className="px-4 py-2 rounded-md bg-red-50 text-red-600 border"
              >
                Delete
              </button>
            )}

            <button onClick={onClose} className="px-4 py-2 rounded-md border">
              Cancel
            </button>

            <button
              onClick={handleSave}
              className="px-4 py-2 rounded-md bg-blue-500 text-white"
            >
              Save
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
