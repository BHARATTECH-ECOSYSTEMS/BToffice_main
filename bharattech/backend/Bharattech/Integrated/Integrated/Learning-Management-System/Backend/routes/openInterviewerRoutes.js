const express = require("express");

const {
  keycloakAuth,
  requireAdmin,
} = require("../middlewares/keycloakAuth");
const {
  LAUNCH_PASS_SECONDS,
  buildOpenInterviewerLaunchUrl,
  createOpenInterviewerToken,
  readSessionCheck,
} = require("../utils/openInterviewerToken");
const User = require("../models/User");

const router = express.Router();

router.post("/launch-token", keycloakAuth, requireAdmin, async (req, res) => {
  try {
    const token = await createOpenInterviewerToken(req.user, {
      redirectTo: process.env.OPEN_INTERVIEWER_REDIRECT_PATH || "/studies",
    });

    res.json({
      launchUrl: buildOpenInterviewerLaunchUrl(token),
      token,
      expiresIn: LAUNCH_PASS_SECONDS,
    });
  } catch (error) {
    console.error("OpenInterviewer launch token error:", error);

    const missingSecret =
      error.message === "OpenInterviewer launch secret is not configured";

    res.status(500).json({
      message: missingSecret
        ? "OpenInterviewer launch secret is not configured"
        : "Failed to create OpenInterviewer launch token",
    });
  }
});

// OpenInterviewer asks, server to server, whether the person a researcher session belongs to is still an active Admin
// or Super Admin (security report 2026-10-28 leads 7 + 8): blocking, removing, marking as left or demoting them ends
// their researcher access within a minute.
router.post("/session-check", async (req, res) => {
  try {
    const header = req.get("authorization") || "";
    const keycloakId = header.startsWith("Bearer ") ? await readSessionCheck(header.slice(7)) : null;
    if (!keycloakId) return res.status(401).json({ message: "Not a check from OpenInterviewer" });

    const active = await User.exists({
      keycloakId,
      isDeleted: { $ne: true },
      isBanned: { $ne: true },
      role: { $in: ["Admin", "Superadmin"] },
    });
    res.json({ active: Boolean(active) });
  } catch (error) {
    console.error("OpenInterviewer session check error:", error);
    res.status(500).json({ message: "Failed to check the session" });
  }
});

module.exports = router;
