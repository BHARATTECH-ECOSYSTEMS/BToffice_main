const express = require("express");
const router = express.Router();
const taskController = require("../controllers/taskController");
const { requireAdmin } = require("../middlewares/keycloakAuth");
const { uploadTaskFile } = require("../middlewares/uploadTaskFile");

// server.js signs everyone in before these routes (app.use("/api/tasks", keycloakAuth, taskRoutes)); who may do what
// with a task is checked in the controller.

// Create task (admins, superadmins and sub admins)
router.post("/", taskController.createTask);

// Get tasks assigned to current user (supports ?assignedEmail=...&assignedRole=...)
router.get("/", taskController.getTasksForUser);

// Get the team's tasks (admins, superadmins and sub admins)
router.get("/assigned", taskController.getAssignedTasks);

// Get all tasks (Admin only)
router.get("/all", requireAdmin, taskController.getAllTasks);

// Download a task's stored document or submission
router.get("/:id/files/:fileId", taskController.streamTaskFile);

// Get task by ID
router.get("/:id", taskController.getTaskById);

// Update task status (for assigned users)
router.patch("/:id/status", taskController.updateTaskStatus);

// Attach the project document (a file upload, or a web link)
router.post("/:id/upload", uploadTaskFile, taskController.uploadProjectDocument);

// Submit task (Employee/Intern: a file upload, or a web link)
router.post("/:id/submission", uploadTaskFile, taskController.submitTask);

// Update task (general update - allows creator to update all fields)
router.patch("/:id", taskController.updateTask);

// Delete task (admins any task, sub admins their own)
router.delete("/:id", taskController.deleteTask);

module.exports = router;
