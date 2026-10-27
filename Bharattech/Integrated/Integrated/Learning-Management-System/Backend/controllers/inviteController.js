const { randomBytes } = require("crypto");
const User = require("../models/User");
// email settings and transport are shared with notification emails (utils/mailer.js)
const {
  DEFAULT_FRONTEND_URL,
  FRONTEND_URL,
  EMAIL_USER,
  EMAIL_PASS,
  EMAIL_FROM,
  SMTP_EMAIL_TIMEOUT_MS,
  createMailTransporter: createInviteTransporter,
  escapeHtml,
} = require("../utils/mailer");

// the backend's one Keycloak admin client; authAdminClient() reuses its login while it's still good
const { kcAdmin: kcAdminClient, ensureKeycloakAdmin: authAdminClient, keycloakReply } = require("../utils/keycloakAdmin");
const { forgetInvite, isExpired, recordInviteSent } = require("../utils/inviteExpiry");
const InviteSent = require("../models/InviteSent");

const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM || "bharattech";

const roleMap = {
  user: "Employee",
  superadmin: "Superadmin",
  "super-admin": "Superadmin",
  "super admin": "Superadmin",
  employee: "Employee",
  intern: "Intern",
  subadmin: "Subadmin",
  "sub-admin": "Subadmin",
  "sub admin": "Subadmin",
  admin: "Admin",
};

const KEYCLOAK_ROLE_NAMES = {
  Superadmin: "Super-admin",
  Admin: "admin",
  Employee: "Employee",
  Intern: "Intern",
  Subadmin: "Subadmin",
};

const managedRealmRoles = [
  ...new Set([
    ...Object.values(roleMap),
    ...Object.values(KEYCLOAK_ROLE_NAMES),
  ]),
];

const normalizeRole = (role) =>
  roleMap[String(role || "").toLowerCase()] || "Employee";

/** Whether `role` names one of the roles (any case, the portal's or Keycloak's names). */
const knownRole = (role) => Object.hasOwn(roleMap, String(role || "").trim().toLowerCase());

const toKeycloakRoleName = (role) => KEYCLOAK_ROLE_NAMES[normalizeRole(role)] || "Employee";

const canInviteRole = (actorRole, invitedRole) => {
  const currentRole = normalizeRole(actorRole);
  const targetRole = normalizeRole(invitedRole);

  if (currentRole === "Superadmin") {
    return Object.keys(KEYCLOAK_ROLE_NAMES).includes(targetRole);
  }

  if (currentRole === "Admin") {
    return targetRole === "Employee" || targetRole === "Intern";
  }

  return false;
};

const normalizeName = (name) => String(name || "").trim();

const normalizeEmail = (email) => String(email || "").toLowerCase().trim();

// "John Doe" -> firstName "John", lastName "Doe". "John Michael Doe" -> firstName
// "John", lastName "Michael Doe" (everything after the first word).
const splitName = (name) => {
  const parts = normalizeName(name).split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
};

const buildBaseUsername = (name, email) => {
  const namePart = String(name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".");
  const emailPart = String(email || "").split("@")[0];

  const rawBase = namePart || emailPart || "user";
  return rawBase.replace(/[^a-z0-9._-]/gi, "").replace(/^\.+|\.+$/g, "") || "user";
};

const getUniqueKeycloakUsername = async (name, email, excludeUserId = null) => {
  const baseUsername = buildBaseUsername(name, email);
  let username = baseUsername;
  let suffix = 1;

  const isTaken = async (candidate) => {
    const matches = await kcAdminClient.users.find({ realm: KEYCLOAK_REALM, username: candidate, exact: true });
    return matches.some((u) => u.id !== excludeUserId);
  };

  while (await isTaken(username)) {
    suffix += 1;
    username = `${baseUsername}.${suffix}`;
  }

  return username;
};

const buildLoginUrl = () => {
  try {
    return new URL("/login", FRONTEND_URL).toString();
  } catch {
    return `${DEFAULT_FRONTEND_URL}/login`;
  }
};

const withTimeout = (promise, timeoutMs, label) =>
  Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
    }),
  ]);

const generateTemporaryPassword = () => {
  // No fixed prefix/suffix — every character is freshly randomized so the
  // result doesn't look like a templated/reused password.
  // No "$" or "&": the request sanitizers in server.js (mongoSanitize, xss)
  // change them in the password typed at sign-in, so it would never match the
  // one set in Keycloak.
  const charset = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#%*";
  const bytes = randomBytes(16);
  let password = "";
  for (let i = 0; i < bytes.length; i += 1) {
    password += charset[bytes[i] % charset.length];
  }
  return password;
};

const setTemporaryPassword = async ({ userId, temporaryPassword }) => {
  await kcAdminClient.users.resetPassword({
    realm: KEYCLOAK_REALM,
    id: userId,
    credential: {
      type: "password",
      value: temporaryPassword,
      temporary: true,
    },
  });
};

const getErrorMessage = (error) =>
  error?.response?.data?.errorMessage ||
  error?.response?.data?.message ||
  error?.message ||
  "Unknown error";

const isAdminRole = (role) => normalizeRole(role) === "Admin";

const sendBackendInviteEmail = async ({ name, username, email, role, temporaryPassword }) => {
  const transporter = createInviteTransporter();
  const loginUrl = buildLoginUrl();
  const safeName = name || "there";
  const escapedName = escapeHtml(safeName);
  const escapedUsername = escapeHtml(username);
  const escapedEmail = escapeHtml(email);
  const escapedRole = escapeHtml(role);
  const escapedLoginUrl = escapeHtml(loginUrl);
  const escapedTemporaryPassword = escapeHtml(temporaryPassword);

  const isAdmin = isAdminRole(role);
  const subject = isAdmin
    ? "You have been invited to join BharatTech LMS as an Administrator"
    : "Your BharatTech LMS invite";

  const adminNote = isAdmin
    ? `<p style="background:#f0f4ff;border-left:4px solid #4f46e5;padding:10px 14px;border-radius:4px;color:#3730a3;">
        <strong>Important:</strong> You have been granted Administrator access by a SuperAdmin.
        Your account will not be active until you accept this invitation by signing in and
        setting your password. Self-registration is not available for Administrator accounts.
       </p>`
    : "";

  const adminNoteText = isAdmin
    ? "\nIMPORTANT: You have been granted Administrator access. Your account is not active until you sign in and set your password.\n"
    : "";

  await transporter.sendMail({
    from: EMAIL_FROM,
    to: email,
    subject,
    text: [
      `Hello ${safeName},`,
      "",
      `You have been invited to BharatTech LMS as ${role}.`,
      adminNoteText,
      `Login URL: ${loginUrl}`,
      `Username: ${username}`,
      `Email: ${email}`,
      `Temporary password: ${temporaryPassword}`,
      "",
      "After you sign in, you will be prompted to create a new password.",
      "Your invitation will expire in 12 hours.",
      "",
      "BharatTech",
    ].join("\n"),
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111827; max-width: 560px;">
        <h2 style="margin: 0 0 12px; color: #1e1b4b;">${escapedRole} Invitation — BharatTech LMS</h2>
        <p>Hello ${escapedName},</p>
        <p>You have been invited to the <strong>BharatTech LMS</strong> platform as <strong>${escapedRole}</strong>.</p>
        ${adminNote}
        <p>Use the button below to open the platform, then sign in with your temporary credentials to accept the invitation and set your permanent password.</p>
        <p style="margin: 20px 0;">
          <a href="${escapedLoginUrl}" style="display: inline-block; padding: 11px 20px; background: #4f46e5; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600;">
            Accept Invitation &amp; Sign In
          </a>
        </p>
        <table style="border-collapse:collapse; margin: 8px 0; font-size: 14px;">
          <tr><td style="padding: 4px 12px 4px 0; color:#6b7280;">Username</td><td style="padding: 4px 0;"><strong>${escapedUsername}</strong></td></tr>
          <tr><td style="padding: 4px 12px 4px 0; color:#6b7280;">Email</td><td style="padding: 4px 0;"><strong>${escapedEmail}</strong></td></tr>
          <tr><td style="padding: 4px 12px 4px 0; color:#6b7280;">Temporary password</td><td style="padding: 4px 0;"><strong>${escapedTemporaryPassword}</strong></td></tr>
        </table>
        <p style="font-size:13px;color:#6b7280;">After you sign in, you will be prompted to set a new password. This invitation link expires in 12 hours.</p>
        <p style="margin-top:24px;color:#9ca3af;font-size:12px;">BharatTech — if you were not expecting this invitation, you can ignore this email.</p>
      </div>
    `,
  });
};

const findExistingKeycloakUser = async (email) => {
  const matches = await kcAdminClient.users.find({
    realm: KEYCLOAK_REALM,
    email,
  });

  return (matches || []).find(
    (user) => String(user.email || "").toLowerCase() === String(email || "").toLowerCase()
  );
};

const ensureRealmRole = async (roleName) => {
  let desiredRole = await kcAdminClient.roles.findOneByName({
    realm: KEYCLOAK_REALM,
    name: roleName,
  });

  if (desiredRole?.id) {
    return desiredRole;
  }

  await kcAdminClient.roles.create({
    realm: KEYCLOAK_REALM,
    name: roleName,
    description: `Managed by BharatTech invite flow for ${roleName} users`,
  });

  desiredRole = await kcAdminClient.roles.findOneByName({
    realm: KEYCLOAK_REALM,
    name: roleName,
  });

  if (!desiredRole?.id) {
    throw new Error(`Keycloak role "${roleName}" could not be created in realm "${KEYCLOAK_REALM}".`);
  }

  return desiredRole;
};

const syncKeycloakRealmRole = async (userId, roleName) => {
  const desiredKeycloakRoleName = toKeycloakRoleName(roleName);
  const managedKeycloakRoleNames = [
    ...new Set([...managedRealmRoles, ...managedRealmRoles.map(toKeycloakRoleName)]),
  ];
  const desiredRole = await ensureRealmRole(desiredKeycloakRoleName);

  const existingRoles =
    (await kcAdminClient.users.listRealmRoleMappings({
      realm: KEYCLOAK_REALM,
      id: userId,
    })) || [];

  const existingManagedRoles = existingRoles.filter((role) =>
    managedKeycloakRoleNames.includes(role.name)
  );

  const rolesToRemove = existingManagedRoles.filter((role) => role.name !== desiredKeycloakRoleName);

  if (rolesToRemove.length) {
    await kcAdminClient.users.delRealmRoleMappings({
      realm: KEYCLOAK_REALM,
      id: userId,
      roles: rolesToRemove.map((role) => ({ id: role.id, name: role.name })),
    });
  }

  const alreadyAssigned = existingManagedRoles.some((role) => role.name === desiredKeycloakRoleName);
  if (!alreadyAssigned) {
    await kcAdminClient.users.addRealmRoleMappings({
      realm: KEYCLOAK_REALM,
      id: userId,
      roles: [{ id: desiredRole.id, name: desiredRole.name }],
    });
  }
};

const ensureKeycloakUser = async ({ name, email, role }) => {
  const normalizedEmailAddress = normalizeEmail(email);
  const { firstName, lastName } = splitName(name);
  const normalizedRoleValue = normalizeRole(role);

  let keycloakUser = await findExistingKeycloakUser(normalizedEmailAddress);
  let username;

  if (keycloakUser?.id) {
    const baseUsername = buildBaseUsername(firstName, normalizedEmailAddress);
    const currentUsername = (keycloakUser.username || "").toLowerCase();
    const matchesNameBasedUsername = new RegExp(
      `^${baseUsername.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\.\\d+)?$`
    ).test(currentUsername);

    // Keep the existing username if it's already derived from this first name
    // (avoids pointless renames on repeat invites); otherwise it's still the
    // old email-based username from before this account adopted name-based
    // usernames, so regenerate it now.
    username = matchesNameBasedUsername
      ? keycloakUser.username
      : await getUniqueKeycloakUsername(firstName, normalizedEmailAddress, keycloakUser.id);

    await kcAdminClient.users.update(
      { realm: KEYCLOAK_REALM, id: keycloakUser.id },
      {
        username,
        email: normalizedEmailAddress,
        enabled: true,
        firstName,
        lastName,
        emailVerified: true,
        requiredActions: ["UPDATE_PASSWORD"],
      }
    );
  } else {
    username = await getUniqueKeycloakUsername(firstName, normalizedEmailAddress);

    keycloakUser = await kcAdminClient.users.create({
      realm: KEYCLOAK_REALM,
      username,
      email: normalizedEmailAddress,
      enabled: true,
      firstName,
      lastName,
      emailVerified: true,
      requiredActions: ["UPDATE_PASSWORD"],
    });
  }

  const keycloakUserId = keycloakUser.id;

  if (!keycloakUserId) {
    throw new Error("Keycloak user was created without a readable user id");
  }

  await syncKeycloakRealmRole(keycloakUserId, normalizedRoleValue);

  return {
    keycloakUserId,
    username,
  };
};

const sendInviteEmail = async ({ userId, name, username, email, role }) => {
  // Always use our own SMTP template with a link to our /login page — never
  // Keycloak's executeActionsEmail, which generates a link straight to
  // Keycloak's own hosted domain (that's what was showing the Render
  // cold-start splash instead of our login page).
  const temporaryPassword = generateTemporaryPassword();

  try {
    await setTemporaryPassword({ userId, temporaryPassword });
    // the email promises 12 hours from now (utils/inviteExpiry.js)
    await recordInviteSent({ keycloakId: userId, email, username });
    await withTimeout(
      sendBackendInviteEmail({
        name,
        username,
        email,
        role,
        temporaryPassword,
      }),
      SMTP_EMAIL_TIMEOUT_MS,
      "SMTP invite email"
    );

    return { sent: true, queued: false, provider: "smtp" };
  } catch (smtpError) {
    const error = new Error(`Invite email could not be sent. SMTP invite email: ${getErrorMessage(smtpError)}`);
    error.inviteFailures = [`SMTP invite email: ${getErrorMessage(smtpError)}`];
    throw error;
  }
};

/**
 * Invites someone: checks the inviter's role, makes their Keycloak account (or reuses an invite nobody has accepted yet)
 * and emails them a temporary password. Answers { status, body } as POST /api/invite/send-invite replies; the company
 * dashboard's "Add user" (adminController.createUser) uses it too. No record is made until they first sign in.
 */
const inviteSomeone = async ({ name, email, role, actorRole }) => {

  if (!name || !email) {
    return reply(400, {
      success: false,
      message: "Name and email are required",
    });
  }

  // a role nobody knows used to make an Employee quietly
  if (!knownRole(role)) {
    return reply(400, { success: false, message: "Pick a role for them: Super Admin, Admin, Sub Admin, Employee or Intern." });
  }
  const normalizedRole = normalizeRole(role);
  const normalizedEmail = normalizeEmail(email);
  const normalizedName = normalizeName(name);

  const roleRefused = () =>
    reply(403, {
      success: false,
      message:
        normalizeRole(actorRole) === "Admin"
          ? "Admins can invite only Employee and Intern users."
          : "You do not have permission to invite users with this role.",
    });

  if (!canInviteRole(actorRole, normalizedRole)) return roleRefused();

  try {
    const existingDbUser = await User.findOne({
      email: normalizedEmail,
    });

    // Someone who left still has their Keycloak account, switched off: an invite would give it a new password it can't
    // use. They come back through the Community's "Bring back" (controllers/communityController.js).
    if (existingDbUser?.isDeleted && existingDbUser.leftOn) {
      return reply(409, {
        success: false,
        code: "left",
        message: "They've left Bharattech. Bring them back from the Community page instead.",
      });
    }

    await authAdminClient();

    // An invite resets the account's password, role and name, so an email that already has an account is refused:
    // otherwise an Admin could demote a Super Admin this way, or switch a blocked person back on. The one exception is
    // an invite nobody has accepted yet ("Send again"), and only when this inviter may invite the role it carries.
    const existingAccount = await findExistingKeycloakUser(normalizedEmail);
    if (existingAccount) {
      if (!waitsForFirstPassword(existingAccount) || (await hasRecord(existingAccount.id))) {
        return reply(409, {
          success: false,
          code: "has-account",
          message: "They already have an account. Change their role or send a reset link from People → Details.",
        });
      }
      const roles = (await kcAdminClient.users.listRealmRoleMappings({ realm: KEYCLOAK_REALM, id: existingAccount.id })) || [];
      if (!canInviteRole(actorRole, roleOfAccount(roles.map((r) => r.name)))) return roleRefused();
    }

    const restored = Boolean(existingDbUser && existingDbUser.isDeleted);
    const resent = Boolean(existingAccount);

    const { keycloakUserId, username } = await ensureKeycloakUser({
      name: normalizedName,
      email: normalizedEmail,
      role: normalizedRole,
    });

    // Local DB user is intentionally NOT created here. It's created lazily by
    // keycloakAuth's getOrCreateUser() the first time the invitee actually logs
    // in (sets their permanent password) — so the People list only shows users
    // who have accepted their invite, not everyone who's been invited.

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

      return reply(restored || resent ? 200 : 201, {
        success: true,
        message: responseMessage,
        user: {
          id: keycloakUserId,
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
      console.error("Invite email error:", emailError?.response?.data || emailError);

      // what went wrong with the mail server stays in the log above
      return reply(500, {
        success: false,
        message: resent
          ? "User exists, but the invite email could not be re-sent."
          : restored
            ? "User was restored, but the invite email could not be sent."
            : "User account was created, but the invite email could not be sent.",
        inviteEmailSent: false,
        resent,
        keycloakSynced: true,
      });
    }
  } catch (error) {
    console.error("Invite error:", error);

    const upstreamStatus = keycloakReply(error).status;

    if (upstreamStatus === 409) {
      return reply(409, {
        success: false,
        message: "User already exists",
      });
    }

    return reply(500, {
      success: false,
      message: "Failed to send invite",
    });
  }
};

const reply = (status, body) => ({ status, body });

// POST /api/invite/send-invite { name, email, role }
const sendInvite = async (req, res) => {
  const { status, body } = await inviteSomeone({ ...req.body, actorRole: req.user?.role });
  return res.status(status).json(body);
};

// Keycloak's role names back to the portal's, highest first (an account may carry several)
const ROLES_HIGHEST_FIRST = ["Superadmin", "Admin", "Subadmin", "Employee", "Intern"];
const roleOfAccount = (roleNames) => ROLES_HIGHEST_FIRST.find((role) => roleNames.some((name) => normalizeRole(name) === role)) || "Employee";

const waitsForFirstPassword = (account) => account.enabled !== false && (account.requiredActions || []).includes("UPDATE_PASSWORD");
/** Whether a current (not removed) record exists for this Keycloak account: it's made at the first sign-in. */
const hasRecord = (keycloakId) => User.exists({ keycloakId, isDeleted: { $ne: true } });

/**
 * GET /api/invite/pending: invites nobody has accepted yet. A Keycloak account still waiting for its first password
 * with no record here (someone who already has one and was sent a fresh password isn't a new invite). An Admin sees
 * only the roles they may invite. Newest first.
 */
const listPendingInvites = async (req, res) => {
  try {
    await authAdminClient();
    const waiting = (await kcAdminClient.users.find({ realm: KEYCLOAK_REALM, max: 1000 })).filter(waitsForFirstPassword);
    const recorded = new Set((await User.find({ keycloakId: { $in: waiting.map((a) => a.id) }, isDeleted: { $ne: true } }).select("keycloakId").lean()).map((u) => u.keycloakId));
    const sent = new Map((await InviteSent.find({ keycloakId: { $in: waiting.map((a) => a.id) } }).lean()).map((s) => [s.keycloakId, s]));
    const pending = [];
    for (const account of waiting.filter((a) => !recorded.has(a.id))) {
      const roles = (await kcAdminClient.users.listRealmRoleMappings({ realm: KEYCLOAK_REALM, id: account.id })) || [];
      const role = roleOfAccount(roles.map((r) => r.name));
      if (!canInviteRole(req.user?.role, role)) continue;
      pending.push({
        id: account.id,
        name: normalizeName(`${account.firstName || ""} ${account.lastName || ""}`) || account.username || account.email,
        email: account.email || "",
        role,
        // the last time it was emailed; older invites only know when the account was made
        invitedAt: sent.get(account.id)?.sentAt?.toISOString() ?? (account.createdTimestamp ? new Date(account.createdTimestamp).toISOString() : null),
        expired: isExpired(sent.get(account.id)),
      });
    }
    pending.sort((a, b) => String(b.invitedAt).localeCompare(String(a.invitedAt)));
    return res.json(pending);
  } catch (error) {
    console.error("Pending invites error:", error?.response?.data || error);
    return res.status(500).json({ message: "Failed to load pending invites" });
  }
};

/**
 * DELETE /api/invite/pending/:id: cancels an invite by deleting its unused Keycloak account, so the emailed
 * temporary password stops working. Only an account still waiting for its first password with no record here, and
 * only for the roles this admin may invite.
 */
const cancelPendingInvite = async (req, res) => {
  try {
    await authAdminClient();
    const account = await kcAdminClient.users.findOne({ realm: KEYCLOAK_REALM, id: req.params.id });
    if (!account) return res.status(404).json({ message: "That invite isn't pending any more." });
    if (!waitsForFirstPassword(account) || (await hasRecord(account.id))) {
      return res.status(409).json({ message: "They've already accepted the invite, so it can't be cancelled. Remove them from People instead." });
    }
    const roles = (await kcAdminClient.users.listRealmRoleMappings({ realm: KEYCLOAK_REALM, id: account.id })) || [];
    if (!canInviteRole(req.user?.role, roleOfAccount(roles.map((r) => r.name)))) {
      return res.status(403).json({ message: "Your role can't cancel this invite." });
    }
    await kcAdminClient.users.del({ realm: KEYCLOAK_REALM, id: account.id });
    await forgetInvite(account.id);
    return res.json({ message: "Invite cancelled" });
  } catch (error) {
    console.error("Cancel invite error:", error?.response?.data || error);
    return res.status(500).json({ message: "Failed to cancel the invite" });
  }
};

const getUsers = async (req, res) => {
  try {
    await authAdminClient();

    const users = await kcAdminClient.users.find({
      realm: KEYCLOAK_REALM,
    });

    const formatted = users.map((u, index) => ({
      id: u.id,
      emp_id: `EMP${index + 1}`,
      name: u.firstName || u.username || "N/A",
      email: u.email || "N/A",
      role: "User",
      date: new Date().toLocaleDateString(),
      details: "BharatTech",
    }));

    return res.json({
      success: true,
      users: formatted,
    });
  } catch (error) {
    console.error("GET USERS ERROR:", error);
    return res.status(500).json({ success: false });
  }
};

module.exports = {
  sendInvite,
  inviteSomeone,
  listPendingInvites,
  cancelPendingInvite,
  getUsers,
  authAdminClient,
  ensureKeycloakUser,
  syncKeycloakRealmRole,
  setTemporaryPassword,
  generateTemporaryPassword,
  sendBackendInviteEmail,
  waitsForFirstPassword,
  hasRecord,
};
