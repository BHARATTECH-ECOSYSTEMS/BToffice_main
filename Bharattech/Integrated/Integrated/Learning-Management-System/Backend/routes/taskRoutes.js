const express = require("express");
const router = express.Router();
const taskController = require("../controllers/taskController");
const { keycloakAuth, requireAdmin } = require("../middlewares/keycloakAuth");

// Create task (Any authenticated user can create tasks)
router.post("/", keycloakAuth, taskController.createTask);

// Get tasks assigned to current user (supports ?assignedEmail=...&assignedRole=...)
router.get("/", keycloakAuth, taskController.getTasksForUser);

// Get tasks assigned by current user
router.get("/assigned", keycloakAuth, taskController.getAssignedTasks);

// Get all tasks (Admin only)
router.get("/all", keycloakAuth, requireAdmin, taskController.getAllTasks);

// Get task by ID
router.get("/:id", keycloakAuth, taskController.getTaskById);

// Update task status (for assigned users)
router.patch("/:id/status", keycloakAuth, taskController.updateTaskStatus);

// Upload project document
router.post("/:id/upload", keycloakAuth, taskController.uploadProjectDocument);

// Submit task (Employee/Intern)
router.post("/:id/submission", keycloakAuth, taskController.submitTask);

// Update task (general update - allows creator to update all fields)
router.patch("/:id", keycloakAuth, taskController.updateTask);

// Delete task (Admin only - simplified)
router.delete("/:id", keycloakAuth, requireAdmin, taskController.deleteTask);

module.exports = router;

