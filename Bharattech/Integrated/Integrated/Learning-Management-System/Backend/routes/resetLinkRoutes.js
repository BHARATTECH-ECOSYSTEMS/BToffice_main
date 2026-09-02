const express = require("express");
const router = express.Router();
const resetLinkController = require("../controllers/resetLinkController");
const { keycloakAuth, requireAdmin } = require("../middlewares/keycloakAuth");

// Generate reset link (Admin only)
router.post("/", keycloakAuth, requireAdmin, resetLinkController.generateResetLink);

// Get reset links by role (Any authenticated user)
router.get("/", keycloakAuth, resetLinkController.getResetLinksByRole);

// Mark reset link as used (public endpoint, no auth required) - MUST come before /:id routes
router.post("/use", resetLinkController.markResetLinkUsed);

// Mark reset link as sent (Admin only)
router.patch("/:id/send", keycloakAuth, requireAdmin, async (req, res, next) => {
    console.log("🔍 Route matched: PATCH /:id/send");
    console.log("🔍 Request method:", req.method);
    console.log("🔍 Request params:", req.params);
    console.log("🔍 Request path:", req.path);
    console.log("🔍 Request originalUrl:", req.originalUrl);
    console.log("🔍 Request baseUrl:", req.baseUrl);
    next();
}, resetLinkController.markResetLinkAsSent);

module.exports = router;

