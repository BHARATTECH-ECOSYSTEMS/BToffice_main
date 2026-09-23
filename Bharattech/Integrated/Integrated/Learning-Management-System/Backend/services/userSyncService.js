const { randomUUID } = require("crypto");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const {
  getKcAdminClient,
  KEYCLOAK_REALM,
  ROLE_ALIASES,
  VALID_ROLES = ["Superadmin", "Admin", "Subadmin", "Employee", "Intern"],
  KEYCLOAK_ROLE_NAMES,
  normalizeRole,
  toKeycloakRoleName,
} = require("./keycloakService");

const MANAGED_KEYCLOAK_ROLE_NAMES = [
  ...new Set([
    ...VALID_ROLES,
    ...VALID_ROLES.map((role) => KEYCLOAK_ROLE_NAMES[role] || role),
  ]),
];

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

const attributeValue = (attributes, key) => {
  const value = attributes?.[key];
  if (Array.isArray(value) && value[0]) return String(value[0]).trim();
  if (typeof value === "string" && value.trim()) return value.trim();
  return "";
};

const roleFromKeycloakUser = (kcUser, currentRole) => {
  const realmRoles = kcUser.realmRoles || [];
  const priority = ["Superadmin", "Admin", "Subadmin", "Employee", "Intern"];
  const normalizedRealmRoles = realmRoles
    .map((item) => ROLE_ALIASES[String(item || "").trim().toLowerCase()])
    .filter(Boolean);
  const keycloakRole = priority.find((role) =>
    normalizedRealmRoles.includes(role)
  );
  return keycloakRole || normalizeRole(currentRole || "Employee");
};

const canDeleteUser = (actorRole, targetRole) => {
  const currentRole = normalizeRole(actorRole);
  const roleToDelete = normalizeRole(targetRole);
  if (currentRole === "Superadmin") {
    return ["Admin", "Subadmin", "Employee", "Intern"].includes(roleToDelete);
  }
  if (currentRole === "Admin") {
    return ["Subadmin", "Employee", "Intern"].includes(roleToDelete);
  }
  return false;
};

const canAssignRole = (actorRole, targetRole, nextRole) => {
  const currentRole = normalizeRole(actorRole);
  const currentTargetRole = normalizeRole(targetRole);
  const requestedRole = normalizeRole(nextRole);
  if (currentRole === "Superadmin") {
    return ["Superadmin", "Admin", "Subadmin", "Employee", "Intern"].includes(
      requestedRole
    );
  }
  if (currentRole === "Admin") {
    const manageable = ["Subadmin", "Employee", "Intern"];
    return (
      manageable.includes(currentTargetRole) &&
      manageable.includes(requestedRole)
    );
  }
  return false;
};

const syncKeycloakRealmRole = async (userId, appRole) => {
  const client = await getKcAdminClient();
  const desiredRoleName = toKeycloakRoleName(appRole);
  let desiredRole = await client.roles.findOneByName({
    realm: KEYCLOAK_REALM,
    name: desiredRoleName,
  });

  if (!desiredRole?.id) {
    await client.roles.create({
      realm: KEYCLOAK_REALM,
      name: desiredRoleName,
      description: `Managed role for ${desiredRoleName}`,
    });
    desiredRole = await client.roles.findOneByName({
      realm: KEYCLOAK_REALM,
      name: desiredRoleName,
    });
  }

  const existingRoles =
    (await client.users.listRealmRoleMappings({
      realm: KEYCLOAK_REALM,
      id: userId,
    })) || [];

  const rolesToRemove = existingRoles.filter(
    (role) =>
      MANAGED_KEYCLOAK_ROLE_NAMES.includes(role.name) &&
      role.name !== desiredRoleName
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
      roles: [{ id: desiredRole.id, name: desiredRole.name }],
    });
  }
};

const fetchKeycloakUsers = async () => {
  const client = await getKcAdminClient();
  const users = await client.users.find({
    realm: KEYCLOAK_REALM,
    max: 1000,
  });
  const enabledUsers = users.filter((u) => u.enabled !== false);
  return Promise.all(
    enabledUsers.map(async (user) => {
      const realmRoleMappings =
        (await client.users.listRealmRoleMappings({
          realm: KEYCLOAK_REALM,
          id: user.id,
        })) || [];
      return {
        ...user,
        realmRoles: realmRoleMappings.map((r) => r.name).filter(Boolean),
      };
    })
  );
};

const upsertLocalUserFromKeycloak = async (kcUser) => {
  const email = normalizeEmail(kcUser.email || `${kcUser.username || kcUser.id}@bharattech.local`);
  const username = kcUser.username || email;
  const existing =
    (await User.findOne({ keycloakId: kcUser.id })) ||
    (email ? await User.findOne({ email }) : null) ||
    (username ? await User.findOne({ username }) : null);

  await User.updateMany(
    {
      isDeleted: true,
      keycloakId: { $ne: kcUser.id },
      _id: { $ne: existing?._id },
      $or: [...(email ? [{ email }] : []), ...(username ? [{ username }] : [])],
    },
    [
      {
        $set: {
          email: { $concat: ["deleted+", { $toString: "$_id" }, "+", "$email"] },
          username: { $concat: ["deleted_", { $toString: "$_id" }, "_", "$username"] },
        },
      },
    ],
    { updatePipeline: true }
  );

  const fullName =
    [kcUser.firstName, kcUser.lastName].filter(Boolean).join(" ").trim() ||
    kcUser.username ||
    kcUser.email ||
    "User";

  const attributes = kcUser.attributes || {};
  const phoneKeys = ["phoneNumber", "phone", "workPhone", "mobile", "contactNumber"];
  let phone = "";
  for (const k of phoneKeys) {
    const val = attributeValue(attributes, k);
    if (val) {
      phone = val;
      break;
    }
  }

  const update = {
    fullName,
    username,
    email,
    keycloakId: kcUser.id,
    role: roleFromKeycloakUser(kcUser, existing?.role),
    phoneNumber: phone || existing?.phoneNumber,
    phone: attributeValue(attributes, "phone") || existing?.phone,
    workPhone: attributeValue(attributes, "workPhone") || existing?.workPhone,
    authProvider: "keycloak",
    isDeleted: false,
    deletedAt: null,
  };

  if (existing) {
    Object.assign(existing, update);
    return existing.save();
  }

  return User.create({
    ...update,
    password: await bcrypt.hash(randomUUID(), 10),
  });
};

const syncKeycloakUsersToLocal = async () => {
  const keycloakUsers = await fetchKeycloakUsers();
  const activeKeycloakIds = keycloakUsers.map((u) => u.id).filter(Boolean);
  const syncedUsers = [];
  for (const kcUser of keycloakUsers) {
    syncedUsers.push(await upsertLocalUserFromKeycloak(kcUser));
  }

  await User.updateMany(
    {
      keycloakId: { $exists: true, $nin: activeKeycloakIds },
      isDeleted: { $ne: true },
    },
    { $set: { isDeleted: true, deletedAt: new Date() } }
  );

  return syncedUsers.sort((a, b) =>
    String(a.fullName || "").localeCompare(String(b.fullName || ""))
  );
};

const listLocalUsers = async () => {
  return User.find({ isDeleted: { $ne: true } })
    .select("-password")
    .sort({ fullName: 1, username: 1, createdAt: -1 });
};

module.exports = {
  attributeValue,
  roleFromKeycloakUser,
  canDeleteUser,
  canAssignRole,
  syncKeycloakRealmRole,
  fetchKeycloakUsers,
  upsertLocalUserFromKeycloak,
  syncKeycloakUsersToLocal,
  listLocalUsers,
};
