const { randomBytes } = require("crypto");
const KcAdminClient = require("keycloak-admin").default;
const nodemailer = require("nodemailer");
const User = require("../models/User");

const KEYCLOAK_BASE_URL =
  process.env.KEYCLOAK_BASE_URL ||
  process.env.KEYCLOAK_URL ||
  "http://localhost:8080";
const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM || "bharattech";
const KEYCLOAK_ADMIN_REALM = process.env.KEYCLOAK_ADMIN_REALM || "master";
const DEFAULT_FRONTEND_URL = "https://bharattech-learning-management-system.onrender.com";
const isProductionRuntime = process.env.NODE_ENV === "production" || Boolean(process.env.RENDER);
const configuredFrontendUrl = process.env.FRONTEND_URL;
const isLocalFrontendUrl = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(
  configuredFrontendUrl || ""
);
const FRONTEND_URL =
  configuredFrontendUrl && !(isProductionRuntime && isLocalFrontendUrl)
    ? configuredFrontendUrl
    : DEFAULT_FRONTEND_URL;
const EMAIL_USER =
  process.env.EMAIL_USER ||
  process.env.SMTP_USER ||
  process.env.MAIL_USER ||
  process.env.GMAIL_USER ||
  process.env.KEYCLOAK_SMTP_USER;
const EMAIL_PASS =
  process.env.EMAIL_PASS ||
  process.env.SMTP_PASS ||
  process.env.SMTP_PASSWORD ||
  process.env.MAIL_PASS ||
  process.env.GMAIL_PASS ||
  process.env.KEYCLOAK_SMTP_PASS ||
  process.env.KEYCLOAK_SMTP_PASSWORD;
const EMAIL_FROM =
  process.env.EMAIL_FROM ||
  process.env.SMTP_FROM ||
  process.env.MAIL_FROM ||
  EMAIL_USER;
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_SECURE = String(process.env.SMTP_SECURE || "").toLowerCase() === "true";
const SMTP_EMAIL_TIMEOUT_MS = Number(process.env.SMTP_EMAIL_TIMEOUT_MS || 20000);

const kcAdminClient = new KcAdminClient({
  baseUrl: KEYCLOAK_BASE_URL,
  realmName: KEYCLOAK_ADMIN_REALM,
});

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

const createInviteTransporter = () => {
  if (SMTP_HOST) {
    return nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      connectionTimeout: SMTP_EMAIL_TIMEOUT_MS,
      greetingTimeout: SMTP_EMAIL_TIMEOUT_MS,
      socketTimeout: SMTP_EMAIL_TIMEOUT_MS,
      auth: EMAIL_USER && EMAIL_PASS ? { user: EMAIL_USER, pass: EMAIL_PASS } : undefined,
    });
  }

  if (EMAIL_USER && EMAIL_PASS) {
    return nodemailer.createTransport({
      service: "gmail",
      connectionTimeout: SMTP_EMAIL_TIMEOUT_MS,
      greetingTimeout: SMTP_EMAIL_TIMEOUT_MS,
      socketTimeout: SMTP_EMAIL_TIMEOUT_MS,
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS,
      },
    });
  }

  throw new Error("Invite email is not configured. Set EMAIL_USER and EMAIL_PASS.");
};

const generateTemporaryPassword = () => {
  // No fixed prefix/suffix — every character is freshly randomized so the
  // result doesn't look like a templated/reused password.
  const charset = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*";
  const bytes = randomBytes(16);
  let password = "";
  for (let i = 0; i < bytes.length; i += 1) {
    password += charset[bytes[i] % charset.length];
  }
  return password;
};

const escapeHtml = (value) =>
  String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

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

const authAdminClient = async () => {
  await kcAdminClient.auth({
    username: process.env.KEYCLOAK_ADMIN_USERNAME || "admin",
    password: process.env.KEYCLOAK_ADMIN_PASSWORD || "admin",
    grantType: "password",
    clientId: process.env.KEYCLOAK_ADMIN_CLIENT_ID || "admin-cli",
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
    const existingDbUser = await User.findOne({
      email: normalizedEmail,
    });

    const restored = Boolean(existingDbUser && existingDbUser.isDeleted);
    const resent = Boolean(existingDbUser && !existingDbUser.isDeleted);

    await authAdminClient();

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
      console.error("Invite email error:", emailError?.response?.data || emailError);

      const emailMessage =
        emailError?.response?.data?.errorMessage ||
        emailError?.response?.data?.message ||
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

    const upstreamStatus = error?.response?.status;
    const upstreamMessage =
      error?.response?.data?.errorMessage ||
      error?.response?.data?.message ||
      error?.message;

    if (upstreamStatus === 409) {
      return res.status(409).json({
        success: false,
        message: "User already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: upstreamMessage || "Failed to send invite",
    });
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
  getUsers,
  authAdminClient,
  ensureKeycloakUser,
  syncKeycloakRealmRole,
  setTemporaryPassword,
};
