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
const { requireAdmin } = require("../middlewares/keycloakAuth");
// server.js signs everyone in before these routes (app.use("/api/user", keycloakAuth, userRoutes)), so they don't check again
const { uploadUserPhoto } = require("../middlewares/uploadUserPhoto");

// Get current logged-in user
router.get("/me", getCurrentUser);

// Update current logged-in user's profile (phone, workPhone, etc.)
router.patch("/me", updateCurrentUser);

// The signed-in person's own photo (form field "photo"), kept in MongoDB
router.put("/me/photo", uploadUserPhoto("photo"), setMyPhoto);
router.delete("/me/photo", removeMyPhoto);

// Adding a person is an invite (POST /api/invite/send-invite); the old add-user, which made a database-only account
// nobody could sign in with, was removed in step 17 Part 2.

// Get all users (authenticated users can view; mutations stay admin-only)
router.get("/", getUsers);

// People directory with only the fields colleagues may see (any signed-in role) — must be before /:id
router.get("/directory", getDirectory);

// Fetch users directly from Keycloak (no MongoDB intermediary) — must be before /:id
router.get("/keycloak-users", getKeycloakUsers);

// Anyone's photo, for anyone signed in (like the directory)
router.get("/:id/photo", getUserPhoto);

// Get user by ID - MUST come after named routes to avoid conflicts
router.get("/:id", getUserById);

// Update user (PUT - full update). A photo comes as the form field "profilePicture" and goes to the same store.
router.put("/:id", requireAdmin, uploadUserPhoto("profilePicture"), updateUser);

// Partially update user (PATCH)
router.patch("/:id", requireAdmin, uploadUserPhoto("profilePicture"), partialUpdateUser);

// Delete user (soft delete - Admin only)
router.delete("/:id", requireAdmin, deleteUser);

module.exports = router;
