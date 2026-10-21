const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const { keycloakAuth } = require("../middlewares/keycloakAuth");

/**
 * Generate time-limited embed token for LibreChat iframe
 * Requires authenticated Keycloak session
 */
router.get("/token", keycloakAuth, async (req, res) => {
  try {
    const librechatUrl = process.env.LIBRECHAT_URL;
    const sharedSecret =
      process.env.LIBRECHAT_SHARED_SECRET ||
      process.env.BHARATTECH_SHARED_SECRET;

    if (!sharedSecret) {
      return res.status(503).json({
        status: "fail",
        message: "AI not configured",
      });
    }

    if (!req.user) {
      return res.status(401).json({
        status: "fail",
        message: "User session required",
      });
    }

    const keycloakId =
      req.user.keycloakId || req.user.sub || req.user.id || "anonymous-user";
    const email = req.user.email || "";
    const name =
      req.user.fullName ||
      req.user.name ||
      req.user.username ||
      "BharatTech User";
    const role = req.user.role || "user";

    const embedToken = jwt.sign(
      {
        sub: keycloakId,
        email,
        name,
        role,
        tenant: "bharattech",
        scope: "chat:read chat:write",
      },
      sharedSecret,
      {
        expiresIn: "1h",
        issuer: "bharattech-lms",
      }
    );

    return res.json({
      status: "success",
      token: embedToken,
      librechatUrl: librechatUrl || "",
      expiresIn: 3600,
    });
  } catch (error) {
    console.error("LibreChat bridge error:", error);
    return res.status(500).json({
      status: "error",
      message: "AI session failed",
    });
  }
});

module.exports = router;