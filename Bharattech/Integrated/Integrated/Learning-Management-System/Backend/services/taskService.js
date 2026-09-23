const Task = require("../models/Task");
const User = require("../models/User");

const normalizeTask = (task) => ({
  _id: task._id,
  id: task._id,
  title: task.title,
  description: task.description,
  status: task.status,
  assignedBy: task.assignedBy,
  assignedTo: task.assignedTo,
  assignedEmail: task.assignedEmail,
  assignedRole: task.assignedRole,
  createdBy: task.createdBy || "subadmin",
  dueDate: task.dueDate,
  priority: task.priority,
  projectFile: task.projectFile,
  fileUrl: task.fileUrl,
  submissions: task.submissions,
  createdAt: task.createdAt,
  updatedAt: task.updatedAt,
});

const createTask = async (user, body) => {
  const { title, description, assignedTo, status, fileUrl, priority, dueDate, projectFile } = body;

  if (!title || !title.trim()) {
    const err = new Error("Task title is required");
    err.status = 400;
    throw err;
  }

  if (!assignedTo) {
    const err = new Error("Assigned user is required");
    err.status = 400;
    throw err;
  }

  const assignedUser = await User.findById(assignedTo);
  if (!assignedUser) {
    const err = new Error("Assigned user not found");
    err.status = 404;
    throw err;
  }

  const validStatuses = ["pending", "in-progress", "completed"];
  const taskStatus = status && validStatuses.includes(status.toLowerCase()) ? status.toLowerCase() : "pending";
  const userRole = (user.role || "").toString().toLowerCase();
  const createdBy = userRole === "admin" ? "admin" : "subadmin";

  const task = await Task.create({
    title: title.trim(),
    description: description || "",
    assignedBy: user.id,
    assignedTo,
    assignedEmail: assignedUser.email,
    assignedRole: assignedUser.role,
    createdBy,
    status: taskStatus,
    priority: priority || "Normal",
    dueDate: dueDate ? new Date(dueDate) : null,
    projectFile: projectFile
      ? {
          url: projectFile.url || fileUrl,
          fileName: projectFile.fileName,
          uploadedAt: new Date(),
        }
      : null,
    fileUrl: fileUrl || null,
  });

  const populated = await Task.findById(task._id)
    .populate("assignedBy", "fullName email")
    .populate("assignedTo", "fullName email");

  return normalizeTask(populated);
};

const getTasksForUser = async (userId, assignedEmail, assignedRole) => {
  const query = { assignedTo: userId };
  if (assignedEmail) query.assignedEmail = assignedEmail;
  if (assignedRole) query.assignedRole = assignedRole;

  const tasks = await Task.find(query)
    .populate("assignedBy", "fullName email role")
    .populate("assignedTo", "fullName email role")
    .sort({ createdAt: -1 });

  return tasks.map(normalizeTask);
};

const getAssignedTasks = async () => {
  const tasks = await Task.find({})
    .populate("assignedBy", "fullName email role")
    .populate("assignedTo", "fullName email role")
    .sort({ createdAt: -1 });

  return tasks.map(normalizeTask);
};

const updateTask = async (taskId, user, body) => {
  const task = await Task.findById(taskId);
  if (!task) {
    const err = new Error("Task not found");
    err.status = 404;
    throw err;
  }

  const isCreator = task.assignedBy.toString() === user.id;
  const isAssigned = task.assignedTo.toString() === user.id;
  const isAdmin = ["admin", "superadmin"].includes((user.role || "").toLowerCase());

  if (!isCreator && !isAdmin && !isAssigned) {
    const err = new Error("Access denied. You can only update tasks you created or are assigned to.");
    err.status = 403;
    throw err;
  }

  const updateData = { updatedAt: new Date() };

  if (isCreator || isAdmin) {
    if (body.title !== undefined) updateData.title = body.title.trim();
    if (body.description !== undefined) updateData.description = body.description;
    if (body.status !== undefined) {
      const valid = ["pending", "in-progress", "completed"];
      updateData.status = valid.includes(body.status.toLowerCase()) ? body.status.toLowerCase() : task.status;
    }
    if (body.dueDate !== undefined) updateData.dueDate = body.dueDate ? new Date(body.dueDate) : null;
    if (body.priority !== undefined) updateData.priority = body.priority;
    if (body.fileUrl !== undefined) updateData.fileUrl = body.fileUrl;

    if (body.assignedTo !== undefined && body.assignedTo !== task.assignedTo.toString()) {
      const assignedUser = await User.findById(body.assignedTo);
      if (!assignedUser) {
        const err = new Error("Assigned user not found");
        err.status = 404;
        throw err;
      }
      updateData.assignedTo = body.assignedTo;
      updateData.assignedEmail = assignedUser.email;
      updateData.assignedRole = assignedUser.role;
    }
  } else if (isAssigned) {
    if (body.status !== undefined) {
      const valid = ["pending", "in-progress", "completed"];
      updateData.status = valid.includes(body.status.toLowerCase()) ? body.status.toLowerCase() : task.status;
    }
  }

  const updated = await Task.findByIdAndUpdate(taskId, updateData, { new: true })
    .populate("assignedBy", "fullName email")
    .populate("assignedTo", "fullName email");

  return normalizeTask(updated);
};

const submitTask = async (taskId, userId, { fileUrl, fileName, notes }) => {
  const task = await Task.findById(taskId);
  if (!task) {
    const err = new Error("Task not found");
    err.status = 404;
    throw err;
  }

  if (task.assignedTo.toString() !== userId) {
    const err = new Error("Access denied. You can only submit your assigned tasks.");
    err.status = 403;
    throw err;
  }

  task.submissions.push({
    fileUrl,
    fileName: fileName || "submission",
    submittedBy: userId,
    notes: notes || "",
    submittedAt: new Date(),
  });

  task.status = "completed";
  task.updatedAt = new Date();
  await task.save();

  return await Task.findById(task._id)
    .populate("assignedBy", "fullName email")
    .populate("assignedTo", "fullName email")
    .populate("submissions.submittedBy", "fullName email");
};

module.exports = {
  normalizeTask,
  createTask,
  getTasksForUser,
  getAssignedTasks,
  updateTask,
  submitTask,
};
