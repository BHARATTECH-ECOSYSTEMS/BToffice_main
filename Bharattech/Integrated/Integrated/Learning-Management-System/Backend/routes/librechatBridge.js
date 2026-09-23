const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const https = require("https");
const http = require("http");
const { keycloakAuth, requireAdmin } = require("../middlewares/keycloakAuth");

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
    const username =
      req.user.username ||
      req.user.preferred_username ||
      (email ? email.split("@")[0] : "user");
    const role = req.user.role || "user";

    const embedToken = jwt.sign(
      {
        sub: keycloakId,
        email,
        name,
        username,
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

    const resolvedLibreChatUrl = (librechatUrl || "http://localhost:3080").replace(/\/+$/, "");
    const ssoUrl = `${resolvedLibreChatUrl}/api/auth/sso?token=${encodeURIComponent(embedToken)}`;

    return res.json({
      status: "success",
      token: embedToken,
      librechatUrl: resolvedLibreChatUrl,
      ssoUrl,
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

router.post("/sso-url", keycloakAuth, async (req, res) => {
  try {
    const librechatUrl = process.env.LIBRECHAT_URL || "http://localhost:3080";
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
    const username =
      req.user.username ||
      req.user.preferred_username ||
      (email ? email.split("@")[0] : "user");
    const role = req.user.role || "user";

    const embedToken = jwt.sign(
      {
        sub: keycloakId,
        email,
        name,
        username,
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

    const resolvedLibreChatUrl = librechatUrl.replace(/\/+$/, "");
    const ssoUrl = `${resolvedLibreChatUrl}/api/auth/sso?token=${encodeURIComponent(embedToken)}`;

    return res.json({
      status: "success",
      token: embedToken,
      ssoUrl,
      librechatUrl: resolvedLibreChatUrl,
      expiresIn: 3600,
    });
  } catch (error) {
    console.error("LibreChat SSO generation error:", error);
    return res.status(500).json({
      status: "error",
      message: "AI SSO session failed",
    });
  }
});

// ─── Shared helper: proxy a GET to LibreChat admin API ───────────────────────

async function proxyToLibreChat(path, query = {}) {
  const sharedSecret =
    process.env.BHARATTECH_SHARED_SECRET ||
    process.env.LIBRECHAT_SHARED_SECRET;

  if (!sharedSecret) throw new Error("Shared secret not configured");

  const librechatUrl = process.env.LIBRECHAT_URL || "http://localhost:3080";
  const base = new URL(librechatUrl);
  const url = new URL(`${base.origin}${path}`);

  // Append query params
  Object.entries(query).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, v);
  });

  return new Promise((resolve, reject) => {
    const lib = url.protocol === "https:" ? https : http;
    const req = lib.request(
      url.toString(),
      {
        method: "GET",
        headers: {
          "x-bharattech-secret": sharedSecret,
          "Content-Type": "application/json",
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(data) });
          } catch {
            resolve({ status: res.statusCode, body: { raw: data } });
          }
        });
      }
    );
    req.on("error", reject);
    req.end();
  });
}

const secuPromptEventService = require("../services/secuPromptEventService");

/**
 * GET /api/ai-assistant/security-events
 * Returns paginated prompt-injection events from LibreChat's MongoDB.
 * Admin + Superadmin only.
 */
router.get("/security-events", keycloakAuth, requireAdmin, async (req, res) => {
  try {
    const { limit, skip, action, userId, from, to, search } = req.query;
    const data = await secuPromptEventService.getEvents({
      limit,
      skip,
      action,
      userId,
      from,
      to,
      search,
    });
    return res.json(data);
  } catch (err) {
    console.error("SecuPrompt events error:", err);
    return res.status(500).json({ message: "Failed to fetch security events" });
  }
});

/**
 * GET /api/ai-assistant/security-stats
 * Returns aggregate stats: total, blocked, sanitized, top offenders.
 * Admin + Superadmin only.
 */
router.get("/security-stats", keycloakAuth, requireAdmin, async (req, res) => {
  try {
    const stats = await secuPromptEventService.getStats();
    return res.json(stats);
  } catch (err) {
    console.error("SecuPrompt stats error:", err);
    return res.status(500).json({ message: "Failed to fetch security stats" });
  }
});

module.exports = router;