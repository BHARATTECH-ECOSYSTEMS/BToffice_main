import React, { useState, useEffect } from "react";
import { ChevronDown, Upload } from "lucide-react";

export default function TaskModal({
  initial = null,
  assignableUsers = [],
  onClose,
  onSave,
}) {
  const [title, setTitle] = useState(initial?.title || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [dueDate, setDueDate] = useState(
    initial?.dueDate
      ? new Date(initial.dueDate).toISOString().slice(0, 16)
      : ""
  );
  const [priority, setPriority] = useState(initial?.priority || "");
  const [assignedEmail, setAssignedEmail] = useState(
    initial?.assignedEmail || ""
  );
  const [projectFile, setProjectFile] = useState(initial?.projectFile || null);

  useEffect(() => {
    if (initial) {
      setTitle(initial.title || "");
      setDescription(initial.description || "");
      setDueDate(
        initial.dueDate
          ? new Date(initial.dueDate).toISOString().slice(0, 16)
          : ""
      );
      setPriority(initial.priority || "");
      setAssignedEmail(initial.assignedEmail || "");
      setProjectFile(initial.projectFile || null);
    } else {
      setTitle("");
      setDescription("");
      setDueDate("");
      setPriority("");
      setAssignedEmail("");
      setProjectFile(null);
    }
  }, [initial]);

  const handleFileUpload = (file) => {
    if (!file) return;
    setProjectFile({
      name: file.name,
      fileUrl: URL.createObjectURL(file),
      uploadedAt: new Date().toISOString(),
    });
  };

  const handleSubmit = () => {
    if (!title.trim()) {
      alert("Please enter a task title.");
      return;
    }

    if (!assignedEmail && !initial) {
      alert("Please select a user to assign the task to.");
      return;
    }

    const user = assignableUsers.find((u) => u.email === assignedEmail);

    onSave({
      title: title.trim(),
      description: description.trim(),
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      priority,
      assignedName: user?.name || initial?.assignedName || null,
      assignedRole: user?.role || initial?.assignedRole || null,
      assignedEmail: assignedEmail || initial?.assignedEmail || null,
      fileUrl: projectFile?.fileUrl || initial?.fileUrl || null,
      status: initial?.status || "Pending",
    });
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 relative">
        <div className="flex justify-center mb-5">
          <h3 className="text-xl font-bold">
            {initial ? "Edit Task" : "Create Task"}
          </h3>
          <button
            onClick={onClose}
            className="absolute right-6 top-6 text-gray-500"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border mt-1 px-3 py-2 rounded-md"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Description</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border mt-1 px-3 py-2 rounded-md"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Due Date</label>
              <input
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full border mt-1 px-3 py-2 rounded-md"
              />
            </div>

            <div className="relative">
              <label className="text-sm font-medium">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full border mt-1 px-3 py-2 rounded-md appearance-none pr-8"
              >
                <option value="">Normal</option>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
              <ChevronDown className="w-5 h-5 absolute right-3 top-9 text-gray-400" />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">
              Assign To <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                value={assignedEmail}
                onChange={(e) => setAssignedEmail(e.target.value)}
                className="w-full border mt-1 px-3 py-2 rounded-md appearance-none pr-8"
                required
              >
                <option value="">— Select User —</option>
                {assignableUsers.length === 0 ? (
                  <option value="" disabled>
                    No users available. Please create users first.
                  </option>
                ) : (
                  assignableUsers.map((u) => {
                    const displayName =
                      u.name || u.fullName || u.email || "Unknown";
                    const displayRole = u.role || "Unknown";
                    return (
                      <option key={u.id || u._id || u.email} value={u.email}>
                        {displayName} — {displayRole}
                      </option>
                    );
                  })
                )}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Upload Task Document</label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-5 text-center mt-1 hover:border-blue-500">
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-xs text-gray-600">PDF / DOCX / ZIP allowed</p>
              <label className="mt-2 px-4 py-2 bg-blue-500 text-white rounded-md cursor-pointer inline-block">
                Browse File
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

          <div className="flex justify-end gap-3 pt-4">
            <button className="px-4 py-2 border rounded-md" onClick={onClose}>
              Cancel
            </button>
            <button
              className="px-4 py-2 bg-blue-500 rounded-md text-white"
              onClick={handleSubmit}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
