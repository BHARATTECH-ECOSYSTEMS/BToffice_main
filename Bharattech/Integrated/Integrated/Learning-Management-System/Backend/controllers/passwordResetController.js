const crypto = require("crypto");
const User = require("../models/User");
const PasswordReset = require("../models/PasswordReset");
const { kcAdmin, ensureKeycloakAdmin: authKeycloakAdmin, keycloakReply } = require("../utils/keycloakAdmin");
const { createMailTransporter, escapeHtml, portalUrl, EMAIL_FROM } = require("../utils/mailer");
const { loginNameFor } = require("./authController");

// "Forgot password?" on the portal's login: a link by email that sets a new password in Keycloak. Both routes are
// public, so neither may reveal whether an account exists, and a link must be unguessable, short-lived and single-use.

const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM || "bharattech";

const RESET_LINK_MINUTES = 30;
// one link every 2 minutes and 5 an hour per account, so the form can't be used to flood someone's inbox
const MIN_GAP_MS = 2 * 60 * 1000;
const HOURLY_MAX = 5;
const HOUR_MS = 60 * 60 * 1000;
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 128;

const SAME_REPLY = `If that account exists, we've sent a reset link to its email. The link works once, for ${RESET_LINK_MINUTES} minutes.`;
const LINK_GONE = "This link has expired or was already used. Ask for a new one from the sign-in window.";

const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

/** The account an email or Employee ID belongs to, or null; the same lookup the sign-in uses. */
const findAccount = async (login) => {
  const typed = typeof login === "string" ? login.trim() : "";
  if (!typed) return null;
  const email = String(await loginNameFor(typed)).trim().toLowerCase();
  return User.findOne({ email, isDeleted: { $ne: true } });
};

const sendMail = async (user, subject, lines, button) => {
  const html = lines.map((l) => `<p>${escapeHtml(l)}</p>`).join("") + (button ? `<p><a href="${escapeHtml(button.url)}">${escapeHtml(button.label)}</a></p>` : "");
  const text = [...lines, ...(button ? [`${button.label}: ${button.url}`] : [])].join("\n\n");
  await createMailTransporter().sendMail({ from: EMAIL_FROM, to: user.email, subject, text, html });
};

const sendResetEmail = (user, token) =>
  sendMail(
    user,
    "Reset your Bharattech portal password",
    [
      `Hello ${user.fullName || user.email},`,
      `Someone asked to reset the password for your Bharattech portal account. The link below works once, for ${RESET_LINK_MINUTES} minutes.`,
      "If it wasn't you, ignore this email: your password stays the same.",
    ],
    { label: "Choose a new password", url: portalUrl(`/reset-password?token=${token}`) }
  );

const sendChangedEmail = (user) =>
  sendMail(user, "Your Bharattech portal password was changed", [
    `Hello ${user.fullName || user.email},`,
    "The password for your Bharattech portal account was just changed with a reset link, and every other sign-in was ended.",
    "If this wasn't you, tell your admin straight away.",
  ]);

// POST /api/auth/forgot-password { login }: an email or Employee ID
exports.requestPasswordReset = async (req, res) => {
  // the same reply for everyone, sent before any lookup so its timing gives nothing away either
  res.json({ message: SAME_REPLY });
  try {
    const user = await findAccount(req.body?.login);
    if (!user || user.isBanned || !user.keycloakId || user.authProvider !== "keycloak") return;

    const now = Date.now();
    const recent = await PasswordReset.find({ user: user._id, createdAt: { $gt: new Date(now - HOUR_MS) } }).select("createdAt").lean();
    if (recent.length >= HOURLY_MAX || recent.some((r) => r.createdAt > new Date(now - MIN_GAP_MS))) return;

    const token = crypto.randomBytes(32).toString("base64url");
    // only the newest link works
    await PasswordReset.updateMany({ user: user._id, usedAt: null, cancelledAt: null }, { $set: { cancelledAt: new Date(now) } });
    await PasswordReset.create({ user: user._id, tokenHash: hashToken(token), expiresAt: new Date(now + RESET_LINK_MINUTES * 60 * 1000) });
    await sendResetEmail(user, token);
  } catch (error) {
    console.error("Password reset request error:", error.message);
  }
};

// POST /api/auth/reset-password { token, newPassword }
exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body || {};
    if (typeof token !== "string" || !token || typeof newPassword !== "string") {
      return res.status(400).json({ message: "The link or the new password is missing." });
    }
    if (newPassword.length < PASSWORD_MIN || newPassword.length > PASSWORD_MAX) {
      return res.status(400).json({ message: `Choose a password of ${PASSWORD_MIN} to ${PASSWORD_MAX} characters.` });
    }

    // the link is claimed in the same step that checks it, so two clicks at once can't both use it
    const now = new Date();
    const link = await PasswordReset.findOneAndUpdate(
      { tokenHash: hashToken(token), usedAt: null, cancelledAt: null, expiresAt: { $gt: now } },
      { $set: { usedAt: now } },
      { returnDocument: "after" }
    );
    if (!link) return res.status(400).json({ code: "link-gone", message: LINK_GONE });

    const user = await User.findOne({ _id: link.user, isDeleted: { $ne: true }, isBanned: { $ne: true } });
    if (!user?.keycloakId) return res.status(400).json({ code: "link-gone", message: LINK_GONE });

    try {
      await authKeycloakAdmin();
      await kcAdmin.users.resetPassword({
        realm: KEYCLOAK_REALM,
        id: user.keycloakId,
        credential: { type: "password", value: newPassword, temporary: false },
      });
    } catch (error) {
      // nothing changed, so the link is handed back for another try
      await PasswordReset.updateOne({ _id: link._id }, { $unset: { usedAt: 1 } });
      // Keycloak refuses a password that breaks the realm's rules with a 400 and a readable reason
      const keycloak = keycloakReply(error);
      const reason = keycloak.status === 400 && keycloak.data?.error_description;
      if (reason) return res.status(400).json({ message: reason });
      console.error("Password reset Keycloak error:", keycloak.status || error.message);
      return res.status(502).json({ message: "We couldn't reach the sign-in service, so your password wasn't changed. Try the link again in a moment." });
    }

    // a stolen sign-in stops working too; the password is already changed, so a failure here doesn't undo it
    let signedOutEverywhere = true;
    try {
      await kcAdmin.users.logout({ realm: KEYCLOAK_REALM, id: user.keycloakId });
    } catch (error) {
      signedOutEverywhere = false;
      console.error("Password reset: ending sessions failed:", error.message);
    }
    try {
      await sendChangedEmail(user);
    } catch (error) {
      console.error("Password reset: the 'password changed' email wasn't sent:", error.message);
    }

    res.json({ success: true, signedOutEverywhere });
  } catch (error) {
    console.error("Password reset error:", error.message);
    res.status(500).json({ message: "Your password couldn't be reset. Try the link again in a moment." });
  }
};

exports.RESET_LINK_MINUTES = RESET_LINK_MINUTES;
exports.SAME_REPLY = SAME_REPLY;
