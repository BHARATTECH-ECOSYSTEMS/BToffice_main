const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const { Pool } = require("pg");
const { keycloakAuth } = require("../middlewares/keycloakAuth");

const pool = new Pool({
  connectionString:
    process.env.LOBE_DATABASE_URL ||
    "postgresql://postgres:0227d4f9cd03c09eeb34adec4f3a9efb@localhost:5433/lobechat",
});

const AUTH_SECRET =
  process.env.LOBE_AUTH_SECRET ||
  "QVqX6wPR84AlSsGIBoUkTl9p73ZOWkMhquGZIEfE2/I=";
const LOBE_BASE_URL = (
  process.env.LOBEHUB_URL || "http://localhost:3210"
).replace(/\/+$/, "");

/**
 * Generate authenticated SSO launch URL for LobeHub
 * Seamlessly logs the LMS user into LobeHub with zero login screens
 */
router.post("/sso-url", keycloakAuth, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        status: "fail",
        message: "Authentication session required",
      });
    }

    const email =
      req.user.email ||
      req.user.preferred_username ||
      "user@bharattech.local";
    const fullName =
      req.user.fullName ||
      req.user.name ||
      [req.user.firstName, req.user.lastName].filter(Boolean).join(" ") ||
      req.user.username ||
      email.split("@")[0] ||
      "BharatTech User";
    const username = req.user.username || email.split("@")[0] || "user";
    // 1. Ensure user exists in LobeHub PostgreSQL (lookup by email to prevent duplicate key error)
    const existingUserRes = await pool.query(
      `SELECT id FROM users 
       WHERE email ILIKE $1 
          OR (normalized_email IS NOT NULL AND normalized_email ILIKE $1)
       LIMIT 1`,
      [email]
    );

    let userId;
    if (existingUserRes.rows.length > 0) {
      userId = existingUserRes.rows[0].id;
      await pool.query(
        `UPDATE users 
         SET full_name = COALESCE($2, full_name), 
             updated_at = NOW(), 
             last_active_at = NOW() 
         WHERE id = $1`,
        [userId, fullName]
      );
    } else {
      userId = "user_" + crypto.randomBytes(16).toString("hex");
      const insertRes = await pool.query(
        `INSERT INTO users (id, email, normalized_email, full_name, created_at, updated_at, last_active_at)
         VALUES ($1, $2, LOWER($2), $3, NOW(), NOW(), NOW())
         ON CONFLICT (email) DO UPDATE 
           SET full_name = EXCLUDED.full_name, 
               updated_at = NOW(),
               last_active_at = NOW()
         RETURNING id`,
        [userId, email, fullName]
      );
      if (insertRes.rows.length > 0) {
        userId = insertRes.rows[0].id;
      }
    }

    // 2. Generate active session
    const sessionToken = crypto.randomBytes(32).toString("hex");
    const sessionId = "sess_" + crypto.randomBytes(16).toString("hex");

    await pool.query(
      `INSERT INTO auth_sessions (id, user_id, token, expires_at, created_at, updated_at)
       VALUES ($1, $2, $3, NOW() + INTERVAL '30 days', NOW(), NOW())
       ON CONFLICT (token) DO UPDATE 
         SET expires_at = EXCLUDED.expires_at,
             updated_at = NOW()`,
      [sessionId, userId, sessionToken]
    );

    try {
      await pool.query(
        `INSERT INTO nextauth_sessions ("sessionToken", user_id, expires)
         VALUES ($1, $2, NOW() + INTERVAL '30 days')
         ON CONFLICT ("sessionToken") DO UPDATE 
           SET expires = EXCLUDED.expires`,
        [sessionToken, userId]
      );
    } catch (_) {
      // nextauth_sessions table fallback
    }

    // 3. Compute Better-Auth cookie signature
    const sig = crypto
      .createHmac("sha256", AUTH_SECRET)
      .update(sessionToken)
      .digest("base64");

    const ssoUrl = `${LOBE_BASE_URL}/sso?token=${sessionToken}&sig=${encodeURIComponent(
      sig
    )}`;

    return res.json({
      status: "success",
      ssoUrl,
      userId,
      email,
      name: fullName,
    });
  } catch (error) {
    console.error("LobeHub SSO bridge error:", error);
    return res.status(500).json({
      status: "fail",
      message: error.message || "Failed to generate LobeHub SSO launch URL",
    });
  }
});

module.exports = router;
