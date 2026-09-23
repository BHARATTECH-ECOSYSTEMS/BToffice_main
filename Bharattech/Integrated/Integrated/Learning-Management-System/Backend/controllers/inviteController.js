const User = require("../models/User");
const {
  getKcAdminClient,
  KEYCLOAK_REALM,
  normalizeRole,
} = require("../services/keycloakService");
const {
  canInviteRole,
  authAdminClient,
  ensureKeycloakUser,
  syncKeycloakRealmRole,
  setTemporaryPassword,
  sendInviteEmail,
} = require("../services/inviteService");

const normalizeEmail = (email) => String(email || "").toLowerCase().trim();
const normalizeName = (name) => String(name || "").trim();

const sendInvite = async (req, res) => {
  const { name, email, role } = req.body;

  if (!name || !email) {
    return res.status(400).json({
      success: false,
      message: "Name and email are required",
    });
  }

  const normalizedRole = normalizeRole(role);
  const normalizedEmail = normalizeEmail(email);
  const normalizedName = normalizeName(name);

  if (!canInviteRole(req.user?.role, normalizedRole)) {
    return res.status(403).json({
      success: false,
      message:
        normalizeRole(req.user?.role) === "Admin"
          ? "Admins can invite only Employee and Intern users."
          : "You do not have permission to invite users with this role.",
    });
  }

  try {
    const existingDbUser = await User.findOne({ email: normalizedEmail });
    const restored = Boolean(existingDbUser && existingDbUser.isDeleted);
    const resent = Boolean(existingDbUser && !existingDbUser.isDeleted);

    await authAdminClient();

    const { keycloakUserId, username } = await ensureKeycloakUser({
      name: normalizedName,
      email: normalizedEmail,
      role: normalizedRole,
    });

    try {
      const emailResult = await sendInviteEmail({
        userId: keycloakUserId,
        name: normalizedName,
        username,
        email: normalizedEmail,
        role: normalizedRole,
      });

      const responseMessage = resent
        ? "Invite re-sent successfully"
        : restored
        ? "User restored and invite email sent successfully"
        : "Invite sent successfully";

      return res.status(restored || resent ? 200 : 201).json({
        success: true,
        message: responseMessage,
        user: {
          name: normalizedName,
          username,
          email: normalizedEmail,
          role: normalizedRole,
        },
        inviteEmailSent: emailResult.sent,
        inviteEmailQueued: false,
        inviteEmailProvider: emailResult.provider,
        resent,
        keycloakSynced: true,
      });
    } catch (emailError) {
      console.error("Invite email error:", emailError?.message || emailError);
      const emailMessage =
        emailError?.message ||
        (resent
          ? "User exists, but the Keycloak invite email could not be re-sent."
          : restored
          ? "User was restored, but the Keycloak invite email could not be sent."
          : "User account was created, but the Keycloak invite email could not be sent.");

      return res.status(500).json({
        success: false,
        message: emailMessage,
        inviteEmailSent: false,
        resent,
        keycloakSynced: true,
      });
    }
  } catch (error) {
    console.error("Invite error:", error);
    if (error?.response?.status === 409) {
      return res.status(409).json({
        success: false,
        message: "User already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: error?.message || "Failed to send invite",
    });
  }
};

const getUsers = async (req, res) => {
  try {
    const client = await getKcAdminClient();
    const users = await client.users.find({ realm: KEYCLOAK_REALM });
    const formatted = (users || []).map((u, index) => ({
      id: u.id,
      emp_id: `EMP${index + 1}`,
      name: u.firstName || u.username || "N/A",
      email: u.email || "N/A",
      role: "User",
      date: new Date().toLocaleDateString(),
      details: "BharatTech",
    }));

    return res.json({ success: true, users: formatted });
  } catch (error) {
    console.error("GET USERS ERROR:", error);
    return res.status(500).json({ success: false });
  }
};

module.exports = {
  sendInvite,
  getUsers,
  authAdminClient,
  ensureKeycloakUser,
  syncKeycloakRealmRole,
  setTemporaryPassword,
};
