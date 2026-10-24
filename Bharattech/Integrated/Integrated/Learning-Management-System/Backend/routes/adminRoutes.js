const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const { requireAdmin, requireSuperAdmin } = require("../middlewares/keycloakAuth");
// server.js signs everyone in before these routes (app.use("/api/admin", keycloakAuth, adminRoutes)), so they don't check again
const { setupKeycloakRealm } = require("../scripts/setupKeycloakRealm");

// Create user (Admin only)
router.post("/users", requireAdmin, adminController.createUser);

// Get all admin-created users (Admin only)
router.get("/users", requireAdmin, adminController.getAdminUsers);

// Get assignable users (Admin only)
router.get("/users/assignable", requireAdmin, adminController.getAssignableUsers);

router.get("/dashboard", requireAdmin, adminController.getDashboard);

// Keycloak realm bootstrap — SuperAdmin only
// Creates/updates realm roles, disables self-registration, configures composite hierarchy.
router.post("/setup-realm", requireSuperAdmin, async (req, res) => {
  try {
    const result = await setupKeycloakRealm();
    res.json(result);
  } catch (err) {
    console.error("Realm setup error:", err?.response?.data || err);
    // the details stay in the server log
    res.status(500).json({ success: false, message: "Realm setup failed" });
  }
});

module.exports = router;

