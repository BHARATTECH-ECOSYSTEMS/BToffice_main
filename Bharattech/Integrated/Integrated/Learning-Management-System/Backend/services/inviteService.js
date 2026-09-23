const { randomBytes } = require("crypto");
const User = require("../models/User");
const {
  getKcAdminClient,
  KEYCLOAK_REALM,
  KEYCLOAK_ROLE_NAMES,
  normalizeRole,
  toKeycloakRoleName,
  getUniqueUsername,
} = require("./keycloakService");
const { sendInviteEmail: sendEmail } = require("./emailService");

const DEFAULT_FRONTEND_URL =
  "https://bharattech-learning-management-system.onrender.com";
const isProductionRuntime =
  process.env.NODE_ENV === "production" || Boolean(process.env.RENDER);
const configuredFrontendUrl = process.env.FRONTEND_URL;
const isLocalFrontendUrl = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(
  configuredFrontendUrl || ""
);
const FRONTEND_URL =
  configuredFrontendUrl && !(isProductionRuntime && isLocalFrontendUrl)
    ? configuredFrontendUrl
    : DEFAULT_FRONTEND_URL;

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

const splitName = (name) => {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
};

const generateTemporaryPassword = () => {
  const charset =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*";
  const bytes = randomBytes(16);
  let password = "";
  for (let i = 0; i < bytes.length; i += 1) {
    password += charset[bytes[i] % charset.length];
  }
  return password;
};

const buildLoginUrl = () => {
  try {
    return new URL("/login", FRONTEND_URL).toString();
  } catch {
    return `${DEFAULT_FRONTEND_URL}/login`;
  }
};

const authAdminClient = async () => {
  return await getKcAdminClient();
};

const ensureKeycloakUser = async ({ name, email, role }) => {
  const client = await getKcAdminClient();
  const normalizedEmail = String(email || "").toLowerCase().trim();
  const { firstName, lastName } = splitName(name);
  const normalizedRoleValue = normalizeRole(role);

  const matches = await client.users.find({
    realm: KEYCLOAK_REALM,
    email: normalizedEmail,
  });
  let keycloakUser = (matches || []).find(
    (u) => String(u.email || "").toLowerCase() === normalizedEmail
  );
  let username;

  if (keycloakUser?.id) {
    username = keycloakUser.username;
    await client.users.update(
      { realm: KEYCLOAK_REALM, id: keycloakUser.id },
      {
        username,
        email: normalizedEmail,
        enabled: true,
        firstName,
        lastName,
        emailVerified: true,
        requiredActions: ["UPDATE_PASSWORD"],
      }
    );
  } else {
    username = await getUniqueUsername(firstName, normalizedEmail);
    keycloakUser = await client.users.create({
      realm: KEYCLOAK_REALM,
      username,
      email: normalizedEmail,
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
  return { keycloakUserId, username };
};

const syncKeycloakRealmRole = async (userId, roleName) => {
  const client = await getKcAdminClient();
  const desiredRoleName = toKeycloakRoleName(roleName);
  let role = await client.roles.findOneByName({
    realm: KEYCLOAK_REALM,
    name: desiredRoleName,
  });
  if (!role || !role.id) {
    await client.roles.create({
      realm: KEYCLOAK_REALM,
      name: desiredRoleName,
      description: `Managed role for ${desiredRoleName}`,
    });
    role = await client.roles.findOneByName({
      realm: KEYCLOAK_REALM,
      name: desiredRoleName,
    });
  }

  const existingRoles =
    (await client.users.listRealmRoleMappings({
      realm: KEYCLOAK_REALM,
      id: userId,
    })) || [];

  const managedRoleNames = Object.values(KEYCLOAK_ROLE_NAMES);
  const rolesToRemove = existingRoles.filter(
    (r) => managedRoleNames.includes(r.name) && r.name !== desiredRoleName
  );

  if (rolesToRemove.length) {
    await client.users.delRealmRoleMappings({
      realm: KEYCLOAK_REALM,
      id: userId,
      roles: rolesToRemove.map((r) => ({ id: r.id, name: r.name })),
    });
  }

  if (!existingRoles.some((r) => r.name === desiredRoleName)) {
    await client.users.addRealmRoleMappings({
      realm: KEYCLOAK_REALM,
      id: userId,
      roles: [{ id: role.id, name: role.name }],
    });
  }
};

const setTemporaryPassword = async ({ userId, temporaryPassword }) => {
  const client = await getKcAdminClient();
  await client.users.resetPassword({
    realm: KEYCLOAK_REALM,
    id: userId,
    credential: {
      type: "password",
      value: temporaryPassword,
      temporary: true,
    },
  });
};

const sendInviteEmail = async ({ userId, name, username, email, role }) => {
  const temporaryPassword = generateTemporaryPassword();
  await setTemporaryPassword({ userId, temporaryPassword });
  await sendEmail({
    email,
    name,
    role,
    username,
    temporaryPassword,
    loginUrl: buildLoginUrl(),
  });
  return { sent: true, queued: false, provider: "smtp" };
};

module.exports = {
  canInviteRole,
  splitName,
  authAdminClient,
  ensureKeycloakUser,
  syncKeycloakRealmRole,
  setTemporaryPassword,
  sendInviteEmail,
};
