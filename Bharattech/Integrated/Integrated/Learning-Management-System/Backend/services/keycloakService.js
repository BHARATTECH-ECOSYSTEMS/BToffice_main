const KcAdminClient = require("keycloak-admin").default;

const KEYCLOAK_BASE_URL =
  process.env.KEYCLOAK_BASE_URL ||
  process.env.KEYCLOAK_URL ||
  "http://localhost:8080";
const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM || "bharattech";
const KEYCLOAK_ADMIN_REALM = process.env.KEYCLOAK_ADMIN_REALM || "master";
const KEYCLOAK_ADMIN_USERNAME = process.env.KEYCLOAK_ADMIN_USERNAME || "admin";
const KEYCLOAK_ADMIN_PASSWORD = process.env.KEYCLOAK_ADMIN_PASSWORD || "admin";
const KEYCLOAK_ADMIN_CLIENT_ID =
  process.env.KEYCLOAK_ADMIN_CLIENT_ID || "admin-cli";

const ROLE_ALIASES = {
  user: "Employee",
  superadmin: "Superadmin",
  "super-admin": "Superadmin",
  "super admin": "Superadmin",
  subadmin: "Subadmin",
  "sub-admin": "Subadmin",
  "sub admin": "Subadmin",
  admin: "Admin",
  employee: "Employee",
  intern: "Intern",
};

const KEYCLOAK_ROLE_NAMES = {
  Superadmin: "Super-admin",
  Admin: "admin",
  Subadmin: "Subadmin",
  Employee: "Employee",
  Intern: "Intern",
};

const normalizeRole = (role) =>
  ROLE_ALIASES[String(role || "").trim().toLowerCase()] || "Employee";

const toKeycloakRoleName = (role) =>
  KEYCLOAK_ROLE_NAMES[normalizeRole(role)] || "Employee";

const kcAdmin = new KcAdminClient({
  baseUrl: KEYCLOAK_BASE_URL,
  realmName: KEYCLOAK_ADMIN_REALM,
});

let lastAuthTime = 0;
const AUTH_TTL_MS = 50 * 1000;

const getKcAdminClient = async () => {
  const now = Date.now();
  if (now - lastAuthTime > AUTH_TTL_MS) {
    await kcAdmin.auth({
      username: KEYCLOAK_ADMIN_USERNAME,
      password: KEYCLOAK_ADMIN_PASSWORD,
      grantType: "password",
      clientId: KEYCLOAK_ADMIN_CLIENT_ID,
    });
    lastAuthTime = now;
  }
  return kcAdmin;
};

const findUserByEmail = async (email) => {
  const client = await getKcAdminClient();
  const matches = await client.users.find({
    realm: KEYCLOAK_REALM,
    email: String(email || "").toLowerCase().trim(),
  });
  return (matches || []).find(
    (u) =>
      String(u.email || "").toLowerCase() ===
      String(email || "").toLowerCase().trim()
  );
};

const ensureRealmRole = async (roleName) => {
  const client = await getKcAdminClient();
  try {
    const role = await client.roles.findOneByName({
      realm: KEYCLOAK_REALM,
      name: roleName,
    });
    if (role && role.id) return role;
  } catch (err) {
    // Role might not exist yet
  }
  await client.roles.create({
    realm: KEYCLOAK_REALM,
    name: roleName,
    description: `Managed role for ${roleName}`,
  });
  return await client.roles.findOneByName({
    realm: KEYCLOAK_REALM,
    name: roleName,
  });
};

const assignUserRole = async (userId, roleName) => {
  const client = await getKcAdminClient();
  const role = await ensureRealmRole(roleName);
  if (role && role.id) {
    await client.users.addRealmRoleMappings({
      realm: KEYCLOAK_REALM,
      id: userId,
      roles: [{ id: role.id, name: role.name }],
    });
  }
};

const setUserPassword = async (userId, password, temporary = false) => {
  const client = await getKcAdminClient();
  await client.users.resetPassword({
    realm: KEYCLOAK_REALM,
    id: userId,
    credential: {
      type: "password",
      value: password,
      temporary,
    },
  });
};

const getUniqueUsername = async (name, email, excludeUserId = null) => {
  const client = await getKcAdminClient();
  const namePart = String(name || "").toLowerCase().replace(/[^a-z0-9]+/g, ".");
  const emailPart = String(email || "").split("@")[0];
  const rawBase = namePart || emailPart || "user";
  const base = rawBase.replace(/[^a-z0-9._-]/gi, "").replace(/^\.+|\.+$/g, "") || "user";

  let username = base;
  let suffix = 1;
  const isTaken = async (candidate) => {
    const matches = await client.users.find({
      realm: KEYCLOAK_REALM,
      username: candidate,
      exact: true,
    });
    return matches.some((u) => u.id !== excludeUserId);
  };

  while (await isTaken(username)) {
    suffix += 1;
    username = `${base}.${suffix}`;
  }
  return username;
};

module.exports = {
  getKcAdminClient,
  KEYCLOAK_REALM,
  KEYCLOAK_BASE_URL,
  ROLE_ALIASES,
  KEYCLOAK_ROLE_NAMES,
  normalizeRole,
  toKeycloakRoleName,
  findUserByEmail,
  ensureRealmRole,
  assignUserRole,
  setUserPassword,
  getUniqueUsername,
};
