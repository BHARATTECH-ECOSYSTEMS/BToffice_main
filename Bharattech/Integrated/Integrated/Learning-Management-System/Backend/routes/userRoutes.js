const express = require("express");
const router = express.Router();
const {
  getUsers,
  getKeycloakUsers,
  getUserById,
  getCurrentUser,
  updateUser,
  partialUpdateUser,
  deleteUser,
  updateCurrentUser,
  getDirectory,
  setMyPhoto,
  removeMyPhoto,
  getUserPhoto
} = require("../controllers/userController");
const { keycloakAuth, requireAdmin } = require("../middlewares/keycloakAuth");
const { uploadUserPhoto } = require("../middlewares/uploadUserPhoto");

// Get current logged-in user
router.get("/me", keycloakAuth, getCurrentUser);

// Update current logged-in user's profile (phone, workPhone, etc.)
router.patch("/me", keycloakAuth, updateCurrentUser);

// The signed-in person's own photo (form field "photo"), kept in MongoDB
router.put("/me/photo", keycloakAuth, uploadUserPhoto("photo"), setMyPhoto);
router.delete("/me/photo", keycloakAuth, removeMyPhoto);

// Adding a person is an invite (POST /api/invite/send-invite); the old add-user, which made a database-only account
// nobody could sign in with, was removed in step 17 Part 2.

// Get all users (authenticated users can view; mutations stay admin-only)
router.get("/", keycloakAuth, getUsers);

// People directory with only the fields colleagues may see (any signed-in role) — must be before /:id
router.get("/directory", keycloakAuth, getDirectory);

// Fetch users directly from Keycloak (no MongoDB intermediary) — must be before /:id
router.get("/keycloak-users", keycloakAuth, getKeycloakUsers);

// Anyone's photo, for anyone signed in (like the directory)
router.get("/:id/photo", keycloakAuth, getUserPhoto);

// Get user by ID - MUST come after named routes to avoid conflicts
router.get("/:id", keycloakAuth, getUserById);

// Update user (PUT - full update). A photo comes as the form field "profilePicture" and goes to the same store.
router.put("/:id", keycloakAuth, requireAdmin, uploadUserPhoto("profilePicture"), updateUser);

// Partially update user (PATCH)
router.patch("/:id", keycloakAuth, requireAdmin, uploadUserPhoto("profilePicture"), partialUpdateUser);

// Delete user (soft delete - Admin only)
router.delete("/:id", keycloakAuth, requireAdmin, deleteUser);

module.exports = router;
