const express = require("express");
const router = express.Router();
const { keycloakAuth } = require("../middlewares/keycloakAuth");

/**
 * Generate authenticated SSO launch URL for Chatwoot
 * Seamlessly logs the Keycloak-authenticated LMS user into Chatwoot without displaying any login screen
 */
router.post("/sso-url", keycloakAuth, async (req, res) => {
  try {
    const chatwootBase = (process.env.CHATWOOT_URL || "http://localhost:3000").replace(/\/+$/, "");
    const platformToken = process.env.CHATWOOT_PLATFORM_APP_TOKEN || "3E6Q8A5na18vNfTghx73fcr6";

    if (!req.user) {
      return res.status(401).json({
        status: "fail",
        message: "Keycloak session required",
      });
    }

    const email = req.user.email || req.user.preferred_username || "user@bharattech.local";
    const name =
      req.user.fullName ||
      req.user.name ||
      [req.user.firstName, req.user.lastName].filter(Boolean).join(" ") ||
      req.user.username ||
      email.split("@")[0] ||
      "BharatTech User";
    const password = (req.user.keycloakId || "UserKeycloak") + "Aa1!";

    // 1. Create or retrieve user via Chatwoot Platform API
    const userResponse = await fetch(`${chatwootBase}/platform/api/v1/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api_access_token": platformToken,
      },
      body: JSON.stringify({ name, email, password }),
    });

    const userData = await userResponse.json();
    const userId = userData?.id;

    if (!userId) {
      console.error("Chatwoot user resolution failed:", userData);
      throw new Error(userData?.error || userData?.message || "Failed to resolve Chatwoot user account");
    }

    // 2. Ensure user is linked to primary Chatwoot Account
    const accountId = process.env.CHATWOOT_ACCOUNT_ID || 1;
    try {
      await fetch(`${chatwootBase}/platform/api/v1/accounts/${accountId}/account_users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api_access_token": platformToken,
        },
        body: JSON.stringify({ user_id: userId, role: "administrator" }),
      });
    } catch (accErr) {
      console.warn("Notice: user account association skipped or already linked:", accErr.message);
    }

    // 3. Generate single-use SSO authentication URL
    const loginResponse = await fetch(`${chatwootBase}/platform/api/v1/users/${userId}/login`, {
      method: "GET",
      headers: {
        "api_access_token": platformToken,
      },
    });

    const loginData = await loginResponse.json();
    if (!loginData?.url) {
      console.error("Chatwoot login generation failed:", loginData);
      throw new Error("Chatwoot SSO token could not be generated");
    }

    return res.json({
      status: "success",
      ssoUrl: loginData.url,
      userId,
      email,
    });
  } catch (error) {
    console.error("Chatwoot SSO bridge error:", error);
    return res.status(500).json({
      status: "fail",
      message: error.message || "Failed to generate Chatwoot SSO launch URL",
    });
  }
});

module.exports = router;
