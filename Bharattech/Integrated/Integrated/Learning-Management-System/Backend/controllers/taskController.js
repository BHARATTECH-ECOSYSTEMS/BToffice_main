const Task = require("../models/Task");
const taskService = require("../services/taskService");

exports.createTask = async (req, res) => {
  try {
    const task = await taskService.createTask(req.user, req.body);
    res.status(201).json(task);
  } catch (error) {
    console.error("Create Task Error:", error);
    res.status(error.status || 500).json({
      message: error.message || "Server Error",
      details: error.errors,
    });
  }
};

exports.getTasksForUser = async (req, res) => {
  try {
    const { assignedEmail, assignedRole } = req.query;
    const tasks = await taskService.getTasksForUser(req.user.id, assignedEmail, assignedRole);
    res.status(200).json(tasks);
  } catch (error) {
    console.error("Get Tasks For User Error:", error);
    res.status(error.status || 500).json({ message: error.message || "Server Error" });
  }
};

exports.getAssignedTasks = async (req, res) => {
  try {
    const tasks = await taskService.getAssignedTasks();
    res.status(200).json(tasks);
  } catch (error) {
    console.error("Error fetching assigned tasks:", error);
    res.status(error.status || 500).json({ message: error.message || "Server Error" });
  }
};

exports.getTaskById = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate("assignedBy", "fullName email")
      .populate("assignedTo", "fullName email");
    if (!task) return res.status(404).json({ message: "Task not found" });
    res.status(200).json(task);
  } catch (error) {
    console.error("Get Task By ID Error:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

exports.updateTaskStatus = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });

    if (task.assignedTo.toString() !== req.user.id) {
      return res.status(403).json({ message: "Access denied. You can only update your assigned tasks." });
    }

    const updatedTask = await Task.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status, updatedAt: new Date() },
      { new: true }
    )
      .populate("assignedBy", "fullName email")
      .populate("assignedTo", "fullName email");

    res.status(200).json(updatedTask);
  } catch (error) {
    console.error("Update Task Status Error:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

exports.updateTask = async (req, res) => {
  try {
    const task = await taskService.updateTask(req.params.id, req.user, req.body);
    res.status(200).json(task);
  } catch (error) {
    console.error("Update Task Error:", error);
    res.status(error.status || 500).json({ message: error.message || "Server Error" });
  }
};

exports.uploadProjectDocument = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });

    if (task.assignedBy.toString() !== req.user.id) {
      return res.status(403).json({ message: "Access denied. You can only upload documents to tasks you created." });
    }

    task.projectFile = {
      url: req.body.fileUrl,
      fileName: req.body.fileName || "project-document",
      uploadedAt: new Date(),
    };
    task.updatedAt = new Date();
    await task.save();

    const populated = await Task.findById(task._id)
      .populate("assignedBy", "fullName email")
      .populate("assignedTo", "fullName email");

    res.status(200).json(populated);
  } catch (error) {
    console.error("Upload Project Document Error:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

exports.submitTask = async (req, res) => {
  try {
    const populated = await taskService.submitTask(req.params.id, req.user.id, req.body);
    res.status(200).json(populated);
  } catch (error) {
    console.error("Submit Task Error:", error);
    res.status(error.status || 500).json({ message: error.message || "Server Error" });
  }
};

exports.getAllTasks = async (req, res) => {
  try {
    const tasks = await Task.find()
      .populate("assignedBy", "fullName email")
      .populate("assignedTo", "fullName email")
      .sort({ createdAt: -1 });
    res.status(200).json(tasks);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

exports.deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });

    const isAdmin = ["admin", "superadmin"].includes((req.user.role || "").toLowerCase());
    const isAssigner = task.assignedBy.toString() === req.user.id;

    if (!isAdmin && !isAssigner) {
      return res.status(403).json({ message: "Access denied. You can only delete tasks you assigned." });
    }

    await Task.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Task deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};
