const bcrypt = require("bcryptjs");
const { randomUUID } = require("crypto");
const KcAdminClient = require("keycloak-admin").default;
const User = require("../models/User");

const KEYCLOAK_BASE_URL = process.env.KEYCLOAK_BASE_URL || "http://localhost:8080";
const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM || "bharattech";
const KEYCLOAK_ADMIN_REALM = process.env.KEYCLOAK_ADMIN_REALM || "master";
const KEYCLOAK_ADMIN_USERNAME = process.env.KEYCLOAK_ADMIN_USERNAME || "admin";
const KEYCLOAK_ADMIN_PASSWORD = process.env.KEYCLOAK_ADMIN_PASSWORD || "admin";
const DEMO_AUTH_ENABLED = process.env.AUTH_MODE === "demo";

const ROLE_ALIASES = {
  superadmin: "Superadmin",
  "super-admin": "Superadmin",
  "super admin": "Superadmin",
  admin: "Admin",
  subadmin: "Subadmin",
  "sub-admin": "Subadmin",
  "sub admin": "Subadmin",
  employee: "Employee",
  intern: "Intern",
};

const VALID_ROLES = ["Superadmin", "Admin", "Subadmin", "Employee", "Intern"];
const KEYCLOAK_ROLE_NAMES = {
  Superadmin: "Super-admin",
  Admin: "admin",
  Subadmin: "Subadmin",
  Employee: "Employee",
  Intern: "Intern",
};
const MANAGED_KEYCLOAK_ROLE_NAMES = [
  ...new Set([...VALID_ROLES, ...VALID_ROLES.map((role) => KEYCLOAK_ROLE_NAMES[role])]),
];

const kcAdmin = new KcAdminClient({
  baseUrl: KEYCLOAK_BASE_URL,
  realmName: KEYCLOAK_ADMIN_REALM,
});

const authKeycloakAdmin = async () => {
  await kcAdmin.auth({
    username: KEYCLOAK_ADMIN_USERNAME,
    password: KEYCLOAK_ADMIN_PASSWORD,
    grantType: "password",
    clientId: "admin-cli",
  });
};

const normalizeRole = (role) => {
  return ROLE_ALIASES[String(role || "").trim().toLowerCase()] || "Employee";
};

const normalizeEmail = (email) => {
  return String(email || "").trim().toLowerCase();
};

const keycloakRoleNameFor = (role) => {
  return KEYCLOAK_ROLE_NAMES[normalizeRole(role)] || "Employee";
};

const ensureRealmRole = async (roleName) => {
  let desiredRole = await kcAdmin.roles.findOneByName({
    realm: KEYCLOAK_REALM,
    name: roleName,
  });

  if (desiredRole?.id) return desiredRole;

  await kcAdmin.roles.create({
    realm: KEYCLOAK_REALM,
    name: roleName,
    description: `Managed by BharatTech user sync for ${roleName} users`,
  });

  desiredRole = await kcAdmin.roles.findOneByName({
    realm: KEYCLOAK_REALM,
    name: roleName,
  });

  if (!desiredRole?.id) {
    throw new Error(`Keycloak role "${roleName}" could not be created.`);
  }

  return desiredRole;
};

const syncKeycloakRealmRole = async (userId, appRole) => {
  await authKeycloakAdmin();

  const desiredRoleName = keycloakRoleNameFor(appRole);
  const desiredRole = await ensureRealmRole(desiredRoleName);
  const existingRoles =
    (await kcAdmin.users.listRealmRoleMappings({
      realm: KEYCLOAK_REALM,
      id: userId,
    })) || [];

  const rolesToRemove = existingRoles.filter(
    (role) =>
      MANAGED_KEYCLOAK_ROLE_NAMES.includes(role.name) &&
      role.name !== desiredRoleName
  );

  if (rolesToRemove.length) {
    await kcAdmin.users.delRealmRoleMappings({
      realm: KEYCLOAK_REALM,
      id: userId,
      roles: rolesToRemove.map((role) => ({ id: role.id, name: role.name })),
    });
  }

  if (!existingRoles.some((role) => role.name === desiredRoleName)) {
    await kcAdmin.users.addRealmRoleMappings({
      realm: KEYCLOAK_REALM,
      id: userId,
      roles: [{ id: desiredRole.id, name: desiredRole.name }],
    });
  }
};

const emailFromKeycloakUser = (kcUser) => {
  return kcUser.email || `${kcUser.username || kcUser.id}@bharattech.local`;
};

const usernameFromKeycloakUser = (kcUser) => {
  return kcUser.username || emailFromKeycloakUser(kcUser);
};

const fullNameFromKeycloakUser = (kcUser) => {
  return (
    [kcUser.firstName, kcUser.lastName].filter(Boolean).join(" ").trim() ||
    kcUser.username ||
    kcUser.email ||
    "User"
  );
};

const roleFromKeycloakUser = (kcUser, currentRole) => {
  const realmRoles = kcUser.realmRoles || [];
  const priority = ["Superadmin", "Admin", "Subadmin", "Employee", "Intern"];
  const normalizedRealmRoles = realmRoles
    .map((item) => ROLE_ALIASES[String(item || "").trim().toLowerCase()])
    .filter(Boolean);
  const keycloakRole = priority.find((role) => normalizedRealmRoles.includes(role));

  return keycloakRole || normalizeRole(currentRole || "Employee");
};

const attributeValue = (attributes, key) => {
  const value = attributes?.[key];
  if (Array.isArray(value) && value[0]) return String(value[0]).trim();
  if (typeof value === "string" && value.trim()) return value.trim();
  return "";
};

const phoneFromKeycloakUser = (kcUser) => {
  const attributes = kcUser.attributes || {};
  const phoneKeys = ["phoneNumber", "phone", "workPhone", "mobile", "contactNumber"];

  for (const key of phoneKeys) {
    const value = attributeValue(attributes, key);
    if (value) return value;
  }

  return "";
};

const canDeleteUser = (actorRole, targetRole) => {
  const currentRole = normalizeRole(actorRole);
  const roleToDelete = normalizeRole(targetRole);

  if (currentRole === "Superadmin") {
    return ["Admin", "Subadmin", "Employee", "Intern"].includes(roleToDelete);
  }

  // Admins can only delete Employee/Subadmin/Intern — not peer Admins
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
    return VALID_ROLES.includes(requestedRole);
  }

  // Admins can only re-assign roles among Employee/Subadmin/Intern targets
  if (currentRole === "Admin") {
    const manageable = ["Subadmin", "Employee", "Intern"];
    return manageable.includes(currentTargetRole) && manageable.includes(requestedRole);
  }

  return false;
};

const fetchKeycloakUsers = async () => {
  await authKeycloakAdmin();

  const users = await kcAdmin.users.find({
    realm: KEYCLOAK_REALM,
    max: 1000,
  });

  const enabledUsers = users.filter((user) => user.enabled !== false);

  return Promise.all(
    enabledUsers.map(async (user) => {
      const realmRoleMappings =
        (await kcAdmin.users.listRealmRoleMappings({
          realm: KEYCLOAK_REALM,
          id: user.id,
        })) || [];

      return {
        ...user,
        realmRoles: realmRoleMappings.map((role) => role.name).filter(Boolean),
      };
    })
  );
};

const upsertLocalUserFromKeycloak = async (kcUser) => {
  const email = normalizeEmail(emailFromKeycloakUser(kcUser));
  const username = usernameFromKeycloakUser(kcUser);
  const existing =
    (await User.findOne({ keycloakId: kcUser.id })) ||
    (email ? await User.findOne({ email }) : null) ||
    (username ? await User.findOne({ username }) : null);

  // A soft-deleted user keeps its unique email/username/keycloakId forever
  // (deleteUser only flips isDeleted, it never clears them). If that email or
  // username has since been reused by a *different* Keycloak account, two
  // separate stale ghost docs can each match one of the lookups above and
  // collide on save. Free up any such ghosts (other than the one we're about
  // to update) so this upsert can't throw a duplicate-key error.
  await User.updateMany(
    {
      isDeleted: true,
      keycloakId: { $ne: kcUser.id },
      _id: { $ne: existing?._id },
      $or: [
        ...(email ? [{ email }] : []),
        ...(username ? [{ username }] : []),
      ],
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

  const update = {
    fullName: fullNameFromKeycloakUser(kcUser),
    username,
    email,
    keycloakId: kcUser.id,
    role: roleFromKeycloakUser(kcUser, existing?.role),
    phoneNumber: phoneFromKeycloakUser(kcUser) || existing?.phoneNumber,
    phone: attributeValue(kcUser.attributes, "phone") || existing?.phone,
    workPhone: attributeValue(kcUser.attributes, "workPhone") || existing?.workPhone,
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
  const activeKeycloakIds = keycloakUsers.map((user) => user.id).filter(Boolean);
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

exports.getUsers = async (req, res) => {
  try {
    let users = [];

    try {
      users = await syncKeycloakUsersToLocal();
    } catch (syncError) {
      console.error("Keycloak sync failed, falling back to local users:", syncError?.response?.data || syncError);
      users = await listLocalUsers();
    }

    res.json(users);
  } catch (error) {
    console.error("Get users error:", error?.response?.data || error);

    if (DEMO_AUTH_ENABLED) {
      try {
        const users = await listLocalUsers();
        return res.json(users);
      } catch (fallbackError) {
        console.error("Demo fallback users error:", fallbackError);
      }
    }

    res.status(500).json({
      message: "Failed to fetch users",
      details: error?.response?.data?.error_description || error.message,
    });
  }
};

exports.getKeycloakUsers = async (req, res) => {
  try {
    await authKeycloakAdmin();

    const kcUsers = await kcAdmin.users.find({ realm: KEYCLOAK_REALM, max: 1000 });

    const users = await Promise.all(
      kcUsers
        // Hide invitees who haven't accepted yet (still required to set their
        // permanent password) — they should only appear once they log in.
        .filter((u) => u.enabled !== false && !(u.requiredActions || []).includes("UPDATE_PASSWORD"))
        .map(async (u) => {
          const roleMappings = await kcAdmin.users
            .listRealmRoleMappings({ realm: KEYCLOAK_REALM, id: u.id })
            .catch(() => []);

          const realmRoleNames = (roleMappings || []).map((r) => r.name).filter(Boolean);
          const role = roleFromKeycloakUser({ realmRoles: realmRoleNames }, "Employee");
          const firstName = u.firstName || "";
          const lastName = u.lastName || "";
          const fullName =
            [firstName, lastName].filter(Boolean).join(" ").trim() ||
            u.username ||
            u.email ||
            "User";

          const attributes = u.attributes || {};
          const phone = Array.isArray(attributes.phone) ? attributes.phone[0] : attributes.phone || "";
          const workPhone = Array.isArray(attributes.workPhone) ? attributes.workPhone[0] : attributes.workPhone || "";

          return {
            id: u.id,
            username: u.username || "",
            email: u.email || "",
            firstName,
            lastName,
            fullName,
            role,
            roles: realmRoleNames,
            emailVerified: u.emailVerified || false,
            phone,
            workPhone,
          };
        })
    );

    res.json(users.sort((a, b) => a.fullName.localeCompare(b.fullName)));
  } catch (err) {
    console.error("getKeycloakUsers error:", err?.response?.data || err.message);
    res.status(500).json({ message: "Failed to fetch users from Keycloak", details: err?.message });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const user = await User.findOne({
      _id: req.params.id,
      isDeleted: { $ne: true },
    });

    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (error) {
    console.error("Get user by id error:", error);
    res.status(500).json({ message: "Failed to fetch user" });
  }
};

exports.getCurrentUser = async (req, res) => {
  try {
    const keycloakId = req.user?.keycloakId;
    const email = req.user?.email;
    const conditions = [];

    if (keycloakId) conditions.push({ keycloakId });
    if (email) conditions.push({ email });

    const user = await User.findOne({
      $or: conditions,
      isDeleted: { $ne: true },
    });

    if (!user) return res.status(404).json({ message: "User not found" });

    const profile = user.toObject();

    // Keycloak is the source of truth for phone/workPhone (kept in sync on
    // save) — read it live here so the profile page always reflects it, even
    // if the local Mongo copy ever drifts (e.g. stale duplicate user docs).
    if (user.keycloakId && user.authProvider === "keycloak") {
      try {
        await authKeycloakAdmin();
        const kcUser = await kcAdmin.users.findOne({ realm: KEYCLOAK_REALM, id: user.keycloakId });
        if (kcUser) {
          const attributes = kcUser.attributes || {};
          const kcPhone = attributeValue(attributes, "phone");
          const kcWorkPhone = attributeValue(attributes, "workPhone");
          if (kcPhone) profile.phone = kcPhone;
          if (kcWorkPhone) profile.workPhone = kcWorkPhone;
        }
      } catch (keycloakError) {
        console.error("Keycloak attribute fetch error:", keycloakError?.response?.data || keycloakError);
      }
    }

    res.json(profile);
  } catch (error) {
    console.error("Get current user error:", error);
    res.status(500).json({ message: "Failed to fetch profile" });
  }
};

exports.createUser = async (req, res) => {
  try {
    const { fullName, username, email, password, role } = req.body;

    if (!email || !username) {
      return res.status(400).json({ message: "Email and username are required" });
    }

    const existing = await User.findOne({
      $or: [{ email }, { username }],
      isDeleted: { $ne: true },
    });

    if (existing) {
      return res.status(409).json({ message: "User already exists" });
    }

    const user = await User.create({
      fullName: fullName || username,
      username,
      email,
      password: await bcrypt.hash(password || randomUUID(), 10),
      keycloakId: randomUUID(),
      role: normalizeRole(role),
      authProvider: "local",
    });

    res.status(201).json(user);
  } catch (error) {
    console.error("Create user error:", error);
    res.status(500).json({ message: "Failed to create user" });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const updates = { ...req.body };
    const requestedRole = updates.role ? normalizeRole(updates.role) : null;
    const user = await User.findOne({
      _id: req.params.id,
      isDeleted: { $ne: true },
    });

    if (!user) return res.status(404).json({ message: "User not found" });

    if (requestedRole && !canAssignRole(req.user?.role, user.role, requestedRole)) {
      return res.status(403).json({
        message:
          normalizeRole(req.user?.role) === "Admin"
            ? "Admins cannot change the role of a Superadmin, nor assign the Superadmin role."
            : "You do not have permission to assign this role.",
      });
    }

    if (requestedRole) updates.role = requestedRole;
    if (req.file) updates.profilePicture = `/uploads/${req.file.filename}`;

    Object.assign(user, updates);
    await user.save();

    if (requestedRole && user.keycloakId && user.authProvider === "keycloak") {
      await syncKeycloakRealmRole(user.keycloakId, requestedRole);
    }

    res.json(user);
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({
      message: "Failed to update user",
      details: error?.response?.data?.error_description || error.message,
    });
  }
};

exports.partialUpdateUser = exports.updateUser;

exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) return res.status(404).json({ message: "User not found" });

    if (!canDeleteUser(req.user?.role, user.role)) {
      return res.status(403).json({
        message:
          normalizeRole(user.role) === "Superadmin"
            ? "Superadmin accounts cannot be deleted."
            : "You do not have permission to delete this user.",
      });
    }

    if (user.keycloakId) {
      try {
        await authKeycloakAdmin();
        await kcAdmin.users.del({ realm: KEYCLOAK_REALM, id: user.keycloakId });
      } catch (keycloakError) {
        console.error("Keycloak delete error:", keycloakError?.response?.data || keycloakError);
      }
    }

    user.isDeleted = true;
    user.deletedAt = new Date();
    await user.save();

    res.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({ message: "Failed to delete user" });
  }
};

exports.updateCurrentUser = async (req, res) => {
  try {
    const { phone, workPhone } = req.body;
    const updates = {};
    if (phone !== undefined) updates.phone = phone;
    if (workPhone !== undefined) updates.workPhone = workPhone;

    const user = await User.findOneAndUpdate(
      { keycloakId: req.user?.keycloakId, isDeleted: { $ne: true } },
      updates,
      { new: true, runValidators: true }
    );

    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.keycloakId && user.authProvider === "keycloak") {
      try {
        await authKeycloakAdmin();
        const kcUser = await kcAdmin.users.findOne({ realm: KEYCLOAK_REALM, id: user.keycloakId });
        await kcAdmin.users.update(
          { realm: KEYCLOAK_REALM, id: user.keycloakId },
          {
            attributes: {
              ...(kcUser?.attributes || {}),
              phone: [user.phone || ""],
              workPhone: [user.workPhone || ""],
            },
          }
        );
      } catch (keycloakError) {
        console.error("Keycloak attribute sync error:", keycloakError?.response?.data || keycloakError);
      }
    }

    res.json(user);
  } catch (error) {
    console.error("Update current user error:", error);
    res.status(500).json({ message: "Failed to update profile" });
  }
};
