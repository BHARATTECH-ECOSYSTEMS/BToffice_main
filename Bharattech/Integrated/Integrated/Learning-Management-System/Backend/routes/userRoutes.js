const express = require("express");
const router = express.Router();
const {
  getUsers,
  getKeycloakUsers,
  getUserById,
  getCurrentUser,
  createUser,
  updateUser,
  partialUpdateUser,
  deleteUser,
  updateCurrentUser
} = require("../controllers/userController");
const { keycloakAuth, requireAdmin } = require("../middlewares/keycloakAuth");
const { uploadSingle } = require("../middlewares/multerConfig");

// Get current logged-in user
router.get("/me", keycloakAuth, getCurrentUser);

// Update current logged-in user's profile (phone, workPhone, etc.)
router.patch("/me", keycloakAuth, updateCurrentUser);

// Create new user (Admin only) - MUST come before /:id route
router.post("/add-user", keycloakAuth, requireAdmin, createUser);

// Get all users (authenticated users can view; mutations stay admin-only)
router.get("/", keycloakAuth, getUsers);

// Fetch users directly from Keycloak (no MongoDB intermediary) — must be before /:id
router.get("/keycloak-users", keycloakAuth, getKeycloakUsers);

// Get user by ID - MUST come after named routes to avoid conflicts
router.get("/:id", keycloakAuth, getUserById);

// Update user (PUT - full update)
router.put("/:id", keycloakAuth, requireAdmin, uploadSingle, updateUser);

// Partially update user (PATCH)
router.patch("/:id", keycloakAuth, requireAdmin, uploadSingle, partialUpdateUser);

// Delete user (soft delete - Admin only)
router.delete("/:id", keycloakAuth, requireAdmin, deleteUser);

module.exports = router;
