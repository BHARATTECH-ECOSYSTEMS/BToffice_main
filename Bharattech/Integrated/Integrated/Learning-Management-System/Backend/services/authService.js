const {
  getKcAdminClient,
  KEYCLOAK_REALM,
  KEYCLOAK_BASE_URL,
  KEYCLOAK_ROLE_NAMES,
  toKeycloakRoleName,
} = require("./keycloakService");

const KEYCLOAK_CLIENT_ID = process.env.KEYCLOAK_CLIENT_ID || "lms-client";

const passwordGrantLogin = async (username, password) => {
  const tokenUrl = `${KEYCLOAK_BASE_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/token`;

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: KEYCLOAK_CLIENT_ID,
      grant_type: "password",
      username,
      password,
    }).toString(),
  });

  const data = await response.json();
  if (!response.ok) {
    return {
      ok: false,
      error: data.error,
      errorDescription: data.error_description,
    };
  }

  const base64 = data.access_token
    .split(".")[1]
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const tp = JSON.parse(Buffer.from(base64, "base64").toString("utf8"));

  const allRoles = [
    ...(tp.realm_access?.roles || []),
    ...(tp.resource_access?.[KEYCLOAK_CLIENT_ID]?.roles || []),
  ];
  const upper = allRoles.map((r) => r.toUpperCase().replace(/[-_\s]/g, ""));

  let role = "INTERN";
  if (upper.includes("SUPERADMIN")) role = "SUPERADMIN";
  else if (upper.includes("ADMIN")) role = "ADMIN";
  else if (upper.includes("SUBADMIN")) role = "SUBADMIN";
  else if (upper.includes("EMPLOYEE")) role = "EMPLOYEE";

  const firstName = tp.given_name || "";
  const lastName = tp.family_name || "";
  const fullName =
    [firstName, lastName].filter(Boolean).join(" ") ||
    tp.name ||
    tp.preferred_username ||
    "";

  const userObj = {
    fullName,
    firstName,
    lastName,
    username: tp.preferred_username || username,
    email: tp.email || "",
    role,
  };

  try {
    const { getOrCreateUser } = require("../middlewares/keycloakAuth");
    await getOrCreateUser(tp);
  } catch (_) {
    // best-effort sync
  }

  return {
    ok: true,
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    id_token: data.id_token,
    user: userObj,
  };
};

const findKeycloakUser = async (identifier) => {
  const client = await getKcAdminClient();
  const byUsername = await client.users.find({
    realm: KEYCLOAK_REALM,
    username: identifier,
    exact: true,
  });
  if (byUsername.length > 0) return byUsername[0];

  const byEmail = await client.users.find({
    realm: KEYCLOAK_REALM,
    email: identifier,
    exact: true,
  });
  return byEmail[0] || null;
};

const createVerifiedKeycloakUser = async ({
  username,
  email,
  name,
  role,
  password,
}) => {
  const client = await getKcAdminClient();
  const matches = await client.users.find({
    realm: KEYCLOAK_REALM,
    username,
  });

  let kcUserId;
  if (matches.length > 0) {
    kcUserId = matches[0].id;
  } else {
    const created = await client.users.create({
      realm: KEYCLOAK_REALM,
      username,
      email,
      enabled: true,
      firstName: name,
      lastName: "",
      emailVerified: true,
    });
    kcUserId = created.id;
  }

  await client.users.resetPassword({
    realm: KEYCLOAK_REALM,
    id: kcUserId,
    credential: {
      type: "password",
      value: password,
      temporary: false,
    },
  });

  const roleName = toKeycloakRoleName(role);
  let targetRole;
  try {
    targetRole = await client.roles.findOneByName({
      realm: KEYCLOAK_REALM,
      name: roleName,
    });
  } catch (_) {}

  if (!targetRole || !targetRole.id) {
    await client.roles.create({
      realm: KEYCLOAK_REALM,
      name: roleName,
    });
    targetRole = await client.roles.findOneByName({
      realm: KEYCLOAK_REALM,
      name: roleName,
    });
  }

  if (targetRole?.id) {
    await client.users.addRealmRoleMappings({
      realm: KEYCLOAK_REALM,
      id: kcUserId,
      roles: [{ id: targetRole.id, name: targetRole.name }],
    });
  }

  return kcUserId;
};

module.exports = {
  passwordGrantLogin,
  findKeycloakUser,
  createVerifiedKeycloakUser,
};
