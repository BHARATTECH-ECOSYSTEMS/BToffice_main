const express = require("express");

const {
  keycloakAuth,
  requireAdmin,
} = require("../middlewares/keycloakAuth");
const {
  buildOpenInterviewerLaunchUrl,
  createOpenInterviewerToken,
} = require("../utils/openInterviewerToken");

const router = express.Router();

router.post("/launch-token", keycloakAuth, requireAdmin, async (req, res) => {
  try {
    const token = await createOpenInterviewerToken(req.user, {
      redirectTo: process.env.OPEN_INTERVIEWER_REDIRECT_PATH || "/studies",
    });

    res.json({
      launchUrl: buildOpenInterviewerLaunchUrl(token),
      token,
      expiresIn: 300,
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

module.exports = router;
