const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const { keycloakAuth, requireAdmin, requireSuperAdmin } = require("../middlewares/keycloakAuth");
const { setupKeycloakRealm } = require("../scripts/setupKeycloakRealm");

// Create user (Admin only)
router.post("/users", keycloakAuth, requireAdmin, adminController.createUser);

// Get all admin-created users (Admin only)
router.get("/users", keycloakAuth, requireAdmin, adminController.getAdminUsers);

// Get assignable users (Admin only)
router.get("/users/assignable", keycloakAuth, requireAdmin, adminController.getAssignableUsers);

// Get signup requests (Admin only)
router.get("/signup-requests", keycloakAuth, requireAdmin, adminController.getSignupRequests);

router.get("/dashboard", keycloakAuth, adminController.getDashboard);

// Approve signup request (Admin only)
router.post("/signup-requests/:id/approve", keycloakAuth, requireAdmin, adminController.approveSignupRequest);

// Keycloak realm bootstrap — SuperAdmin only
// Creates/updates realm roles, disables self-registration, configures composite hierarchy.
router.post("/setup-realm", keycloakAuth, requireSuperAdmin, async (req, res) => {
  try {
    const result = await setupKeycloakRealm();
    res.json(result);
  } catch (err) {
    console.error("Realm setup error:", err?.response?.data || err);
    res.status(500).json({
      success: false,
      message: err?.response?.data?.errorMessage || err.message || "Realm setup failed",
    });
  }
});

module.exports = router;

