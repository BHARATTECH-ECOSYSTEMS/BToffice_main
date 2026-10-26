const bcrypt = require("bcryptjs");
const { randomUUID } = require("crypto");
const mongoose = require("mongoose");
const User = require("../models/User");
const { kcAdmin, ensureKeycloakAdmin: authKeycloakAdmin } = require("../utils/keycloakAdmin");
const { photoType, saveUserPhoto, findUserPhoto, openUserPhoto, deleteUserPhoto } = require("../utils/userPhotos");
const { isAdmin } = require("../utils/refusal");

const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM || "bharattech";
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

/** Who may change someone's details through the admin edit route: a Superadmin anyone, an Admin only those below. */
const canEditUser = (actorRole, targetRole) => {
  const actor = normalizeRole(actorRole);
  if (actor === "Superadmin") return true;
  return actor === "Admin" && ["Subadmin", "Employee", "Intern"].includes(normalizeRole(targetRole));
};

const NAME_MIN = 2;
const NAME_MAX = 60;
const NAME_PROBLEM = `Enter a name of ${NAME_MIN} to ${NAME_MAX} characters.`;

/** The name as stored: trimmed and single-spaced; null when it's too short, too long or holds control characters. */
const readFullName = (value) => {
  if (typeof value !== "string") return null;
  const name = value.replace(/[\t\n\r]+/g, " ").replace(/\s+/g, " ").trim();
  if (/[\u0000-\u001f\u007f]/.test(name)) return null;
  return name.length >= NAME_MIN && name.length <= NAME_MAX ? name : null;
};

/** Keycloak keeps a first and a last name: the first word, then the rest. */
const keycloakNames = (fullName) => {
  const [firstName, ...rest] = fullName.split(" ");
  return { firstName, lastName: rest.join(" ") };
};

// The sign-in reply and the Keycloak sync (upsertLocalUserFromKeycloak) both take the name from Keycloak, so a name
// changed only here would come back at the next sign-in. The rest of the Keycloak account is sent back unchanged.
const syncKeycloakName = async (keycloakId, fullName) => {
  await authKeycloakAdmin();
  const kcUser = await kcAdmin.users.findOne({ realm: KEYCLOAK_REALM, id: keycloakId });
  if (!kcUser) throw new Error("Keycloak user not found");
  await kcAdmin.users.update(
    { realm: KEYCLOAK_REALM, id: keycloakId },
    {
      username: kcUser.username,
      email: kcUser.email,
      emailVerified: kcUser.emailVerified,
      enabled: kcUser.enabled,
      attributes: kcUser.attributes,
      ...keycloakNames(fullName),
    }
  );
};

/**
 * Switches a Keycloak account off (someone left) or back on (brought back), sending the rest of the account back
 * unchanged. Switching off also ends every session; a failure there is only logged, because the account is already
 * off and keycloakAuth refuses a record that has left. Returns false when the account no longer exists in Keycloak.
 */
const setKeycloakEnabled = async (keycloakId, enabled) => {
  await authKeycloakAdmin();
  const kcUser = await kcAdmin.users.findOne({ realm: KEYCLOAK_REALM, id: keycloakId });
  if (!kcUser) return false;
  await kcAdmin.users.update(
    { realm: KEYCLOAK_REALM, id: keycloakId },
    {
      username: kcUser.username,
      email: kcUser.email,
      emailVerified: kcUser.emailVerified,
      firstName: kcUser.firstName,
      lastName: kcUser.lastName,
      attributes: kcUser.attributes,
      enabled,
    }
  );
  if (!enabled) {
    try {
      await kcAdmin.users.logout({ realm: KEYCLOAK_REALM, id: keycloakId });
    } catch (error) {
      console.error("Leaving: ending sessions failed:", error.message);
    }
  }
  return true;
};

const PHOTO_PROBLEM = "Choose a PNG, JPG or WebP image.";

/**
 * Stores an uploaded photo (already checked with photoType) and points `user` at it, without saving `user`. Returns
 * the old photo's id, to delete only once the record is saved, so a failed save never leaves it pointing at nothing.
 */
const storePhoto = async (user, file) => {
  const oldFileId = user.photoFileId;
  const fileId = await saveUserPhoto(file.buffer, { contentType: photoType(file.buffer), userId: user._id });
  user.photoFileId = fileId;
  // the version in the address makes browsers fetch the new photo instead of showing a cached old one
  user.profilePicture = `/api/user/${user._id}/photo?v=${fileId}`;
  return oldFileId;
};

// Keycloak sends at most this many accounts at once
const KEYCLOAK_PAGE = 1000;

/** Keycloak's enabled accounts with their realm roles, and whether that's everyone (more than a page isn't). */
const fetchKeycloakUsers = async () => {
  await authKeycloakAdmin();

  const [users, total] = await Promise.all([kcAdmin.users.find({ realm: KEYCLOAK_REALM, max: KEYCLOAK_PAGE }), kcAdmin.users.count({ realm: KEYCLOAK_REALM })]);

  const enabledUsers = users.filter((user) => user.enabled !== false);

  const withRoles = await Promise.all(
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
  return { users: withRoles, complete: users.length >= total };
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
  const { users: keycloakUsers, complete } = await fetchKeycloakUsers();
  const activeKeycloakIds = keycloakUsers.map((user) => user.id).filter(Boolean);
  const syncedUsers = [];

  for (const kcUser of keycloakUsers) {
    syncedUsers.push(await upsertLocalUserFromKeycloak(kcUser));
  }

  // someone missing from the list was removed in Keycloak, but only when the list is everyone: from a partial one
  // (more accounts than a page) that would wrongly remove whoever didn't fit
  if (complete) {
    await User.updateMany(
      {
        keycloakId: { $exists: true, $nin: activeKeycloakIds },
        isDeleted: { $ne: true },
      },
      { $set: { isDeleted: true, deletedAt: new Date() } }
    );
  }

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
    // The company's People page reads this for every role. Only an admin's request syncs from Keycloak (the sync
    // writes to everyone's records and asks Keycloak about every account); everyone else gets the stored list.
    if (!isAdmin(req.user)) return res.json((await listLocalUsers()).map(publicUser));

    let users = [];

    try {
      users = await syncKeycloakUsersToLocal();
    } catch (syncError) {
      console.error("Keycloak sync failed, falling back to local users:", syncError?.response?.data || syncError);
      users = await listLocalUsers();
    }

    res.json(users.map(publicUser));
  } catch (error) {
    console.error("Get users error:", error?.response?.data || error);

    if (DEMO_AUTH_ENABLED) {
      try {
        const users = await listLocalUsers();
        return res.json(users.map(publicUser));
      } catch (fallbackError) {
        console.error("Demo fallback users error:", fallbackError);
      }
    }

    res.status(500).json({ message: "Failed to fetch users" });
  }
};

// Only what a colleague may see. Everything else on the user record (password hash, sessions, Keycloak ID) stays here.
const DIRECTORY_FIELDS = "employeeId fullName username email role phone phoneNumber workPhone stream team joinedOn isBanned privacySettings";

const toDirectoryEntry = (user) => {
  const showPhone = user.privacySettings?.showPhone !== false;
  return {
    id: String(user._id),
    employeeId: user.employeeId,
    name: user.fullName || user.username || user.email,
    email: user.email,
    role: user.role,
    phone: showPhone ? user.phone || user.phoneNumber || undefined : undefined,
    workPhone: showPhone ? user.workPhone || undefined : undefined,
    stream: user.stream,
    team: user.team,
    joinedOn: user.joinedOn || undefined,
    status: user.isBanned ? "inactive" : "active",
  };
};

// Fields never sent to any client: login secrets and internal bookkeeping.
const SENSITIVE_FIELDS = ["password", "tokens", "resetToken", "resetTokenExpiry", "keycloakId", "__v"];

/** Your own record for /me: everything except the secret fields, so the profile pages keep every field they read. */
const stripSensitive = (user) => {
  const obj = user?.toObject ? user.toObject() : { ...(user || {}) };
  for (const field of SENSITIVE_FIELDS) delete obj[field];
  return obj;
};

/** A colleague's record for anyone signed in: the same safe shape as the directory, plus the photo. Never secrets. */
const publicUser = (user) => {
  const showPhone = user.privacySettings?.showPhone !== false;
  return {
    id: String(user._id),
    _id: String(user._id),
    employeeId: user.employeeId,
    fullName: user.fullName || user.username || user.email,
    name: user.fullName || user.username || user.email,
    username: user.username,
    email: user.email,
    role: user.role,
    profilePicture: user.profilePicture || "",
    phone: showPhone ? user.phone || user.phoneNumber || "" : "",
    workPhone: showPhone ? user.workPhone || "" : "",
    stream: user.stream,
    team: user.team,
    joinedOn: user.joinedOn || undefined,
    isBanned: !!user.isBanned,
    status: user.isBanned ? "inactive" : "active",
    createdAt: user.createdAt,
  };
};

// The only fields the admin edit route (PUT/PATCH /:id) may change. Everything else in the body is ignored, so
// password, tokens, keycloakId, isDeleted and the employee ID can never be set this way. The role is additionally
// checked by canAssignRole; isBanned is how an admin blocks or unblocks an account. The photo only comes as an
// uploaded file (storePhoto), never as an address in the body.
// a work email or username isn't here: changing it in the database alone left the sign-in and the portal disagreeing
// (step 17 Part 2); a new work email means inviting the new address
const EDITABLE_USER_FIELDS = [
  "fullName", "role", "phone", "phoneNumber", "workPhone",
  "stream", "team", "joinedOn", "privacySettings", "gender", "dateOfBirth",
  "qualification", "degree", "profession", "organization", "interests",
  "socialLinks", "professionalTitle", "totalExperience", "careerDescription", "isBanned",
];
const pickEditableFields = (body = {}) => {
  const out = {};
  for (const field of EDITABLE_USER_FIELDS) if (field in body) out[field] = body[field];
  return out;
};

// exported for unit tests (tests/userDataLeaks.test.js)
exports.publicUser = publicUser;
exports.stripSensitive = stripSensitive;
exports.pickEditableFields = pickEditableFields;
exports.canEditUser = canEditUser;
exports.canDeleteUser = canDeleteUser;
exports.setKeycloakEnabled = setKeycloakEnabled;
exports.readFullName = readFullName;
exports.keycloakNames = keycloakNames;

// The people directory for every signed-in person. It reads the local copy only, so it stays fast however many
// people there are; GET /api/user syncs from Keycloak instead, but returns whole records to anyone signed in.
exports.getDirectory = async (req, res) => {
  try {
    const users = await User.find({ isDeleted: { $ne: true } })
      .select(DIRECTORY_FIELDS)
      .collation({ locale: "en", strength: 2 })
      .sort({ fullName: 1, username: 1 })
      .lean();
    res.json(users.map(toDirectoryEntry));
  } catch (error) {
    console.error("Get directory error:", error);
    res.status(500).json({ message: "Failed to load the people directory" });
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

    // each person's "show my phone" lives in their stored record
    const hidden = new Set(
      (await User.find({ keycloakId: { $in: users.map((u) => u.id) }, "privacySettings.showPhone": false }).select("keycloakId").lean()).map((u) => u.keycloakId)
    );
    const shown = users.map((u) => (hidden.has(u.id) ? { ...u, phone: "", workPhone: "" } : u));

    res.json(shown.sort((a, b) => a.fullName.localeCompare(b.fullName)));
  } catch (err) {
    console.error("getKeycloakUsers error:", err?.response?.data || err.message);
    res.status(500).json({ message: "Failed to fetch users from Keycloak" });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const user = await User.findOne({
      _id: req.params.id,
      isDeleted: { $ne: true },
    });

    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(publicUser(user));
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

    res.json(stripSensitive(profile));
  } catch (error) {
    console.error("Get current user error:", error);
    res.status(500).json({ message: "Failed to fetch profile" });
  }
};

exports.updateUser = async (req, res) => {
  try {
    // Only a fixed set of fields may be changed (pickEditableFields): password, tokens, keycloakId, isDeleted and the
    // permanent employee ID can never be set here, however the request is shaped.
    const updates = pickEditableFields(req.body);
    const requestedRole = updates.role ? normalizeRole(updates.role) : null;
    const user = await User.findOne({
      _id: req.params.id,
      isDeleted: { $ne: true },
    });

    if (!user) return res.status(404).json({ message: "User not found" });

    // requireAdmin only says who is asking; an Admin may still not change anyone at or above their own level
    if (!canEditUser(req.user?.role, user.role)) {
      return res.status(403).json({ message: "You can only change the details of sub admins, employees and interns." });
    }
    if ("isBanned" in updates && typeof updates.isBanned !== "boolean") {
      return res.status(400).json({ message: "isBanned must be true or false." });
    }
    // a Super Admin can't be locked out through this route, even by another Super Admin
    if (normalizeRole(user.role) === "Superadmin" && "isBanned" in updates && Boolean(updates.isBanned) !== Boolean(user.isBanned)) {
      return res.status(403).json({ message: "A Super Admin account can't be blocked." });
    }

    if (requestedRole && !canAssignRole(req.user?.role, user.role, requestedRole)) {
      return res.status(403).json({
        message:
          normalizeRole(req.user?.role) === "Admin"
            ? "Admins cannot change the role of a Superadmin, nor assign the Superadmin role."
            : "You do not have permission to assign this role.",
      });
    }

    if (requestedRole) updates.role = requestedRole;
    // an emptied date field clears a wrong join date (the model checks any date that is sent)
    if (updates.joinedOn === "" || updates.joinedOn === null) updates.joinedOn = undefined;

    // the company app sends the whole form, so an unchanged name (however it was first written) is left alone
    const renaming = "fullName" in updates && updates.fullName !== user.fullName;
    if (renaming) {
      const fullName = readFullName(updates.fullName);
      if (!fullName) return res.status(400).json({ message: NAME_PROBLEM });
      updates.fullName = fullName;
    } else {
      delete updates.fullName;
    }

    if (req.file && !photoType(req.file.buffer)) return res.status(400).json({ message: PHOTO_PROBLEM });

    // Blocking switches their Keycloak account off too (unblocking back on), so the other apps that sign in with
    // Keycloak refuse them as well. Keycloak goes first, like "Mark as left": if it fails, nothing is changed.
    const wasBanned = Boolean(user.isBanned);
    const switchesSignIn = "isBanned" in updates && updates.isBanned !== wasBanned && user.authProvider === "keycloak";
    if (switchesSignIn) {
      try {
        await setKeycloakEnabled(user.keycloakId, !updates.isBanned);
      } catch (keycloakError) {
        console.error("Block: switching the Keycloak account failed:", keycloakError?.message);
        return res.status(502).json({ message: "Their sign-in couldn't be switched right now, so nothing was changed. Try again in a minute." });
      }
    }
    // a failure before the record is saved puts their sign-in back as it was, so the two never disagree
    const switchSignInBack = () =>
      switchesSignIn && setKeycloakEnabled(user.keycloakId, !wasBanned).catch((e) => console.error("Block: switching the account back failed:", e.message));

    // Keycloak first: if it refuses, nothing is saved here either, so the two never disagree about the name
    if (renaming && updates.fullName !== user.fullName && user.keycloakId && user.authProvider === "keycloak") {
      try {
        await syncKeycloakName(user.keycloakId, updates.fullName);
      } catch (keycloakError) {
        console.error("Keycloak name sync error:", keycloakError?.response?.status || keycloakError?.message);
        await switchSignInBack();
        return res.status(502).json({ message: "The new name couldn't be saved to the sign-in system, so nothing was changed. Try again in a moment." });
      }
    }

    let oldPhotoId;
    try {
      oldPhotoId = req.file ? await storePhoto(user, req.file) : null;
      Object.assign(user, updates);
      await user.save();
    } catch (error) {
      await switchSignInBack();
      throw error;
    }
    await deleteUserPhoto(oldPhotoId);

    if (requestedRole && user.keycloakId && user.authProvider === "keycloak") {
      await syncKeycloakRealmRole(user.keycloakId, requestedRole);
    }

    res.json(publicUser(user));
  } catch (error) {
    // bad input (e.g. a stream that doesn't exist) is the caller's to fix, not a server failure
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: Object.values(error.errors).map((e) => e.message).join(" ") });
    }
    console.error("Update user error:", error);
    res.status(500).json({ message: "Failed to update user" });
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

// A 10-digit Indian number (owner's 2A), kept as typed: spaces and hyphens allowed, with +91 or a leading 0 in front.
// Landlines with their area code count too, since a work phone is often one.
const INDIAN_NUMBER = /^(?:\+91|0)?\d{10}$/;
const PHONE_FORMAT = /^\+?[\d\s-]+$/;

/** The number to store ("" clears it), or null when it isn't one. */
const readPhone = (value) => {
  if (typeof value !== "string") return null;
  const typed = value.trim();
  if (!typed) return "";
  if (typed.length > 20 || !PHONE_FORMAT.test(typed)) return null;
  return INDIAN_NUMBER.test(typed.replace(/[\s-]/g, "")) ? typed : null;
};

exports.updateCurrentUser = async (req, res) => {
  try {
    const { phone, workPhone, showPhone } = req.body;
    const updates = {};
    // everything is checked before anything is saved, so a refused field never leaves half an edit behind
    if (phone !== undefined) {
      updates.phone = readPhone(phone);
      if (updates.phone === null) return res.status(400).json({ message: "Enter your phone as a 10-digit Indian number, like +91 98765 43210." });
    }
    if (workPhone !== undefined) {
      updates.workPhone = readPhone(workPhone);
      if (updates.workPhone === null) return res.status(400).json({ message: "Enter your work phone as a 10-digit Indian number, like +91 80 4000 1234." });
    }
    if (showPhone !== undefined) {
      if (typeof showPhone !== "boolean") return res.status(400).json({ message: "Say whether colleagues may see your phone numbers (true or false)." });
      // the one field only, so the person's other privacy choices stay as they are
      updates["privacySettings.showPhone"] = showPhone;
    }
    const phonesChanged = "phone" in updates || "workPhone" in updates;

    const user = await User.findOneAndUpdate(
      { keycloakId: req.user?.keycloakId, isDeleted: { $ne: true } },
      updates,
      { returnDocument: "after", runValidators: true }
    );

    if (!user) return res.status(404).json({ message: "User not found" });

    if (phonesChanged && user.keycloakId && user.authProvider === "keycloak") {
      try {
        await authKeycloakAdmin();
        const kcUser = await kcAdmin.users.findOne({ realm: KEYCLOAK_REALM, id: user.keycloakId });
        // the rest of the account goes back unchanged: some Keycloak versions treat a field left out as removed
        await kcAdmin.users.update(
          { realm: KEYCLOAK_REALM, id: user.keycloakId },
          {
            username: kcUser?.username,
            email: kcUser?.email,
            emailVerified: kcUser?.emailVerified,
            enabled: kcUser?.enabled,
            firstName: kcUser?.firstName,
            lastName: kcUser?.lastName,
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

    res.json(stripSensitive(user));
  } catch (error) {
    console.error("Update current user error:", error);
    res.status(500).json({ message: "Failed to update profile" });
  }
};

const findMe = (req) => User.findOne({ keycloakId: req.user?.keycloakId, isDeleted: { $ne: true } });

// PUT /api/user/me/photo: the signed-in person's own photo (form field "photo"), replacing any earlier one
exports.setMyPhoto = async (req, res) => {
  try {
    if (!req.file?.buffer?.length) return res.status(400).json({ message: "Choose a photo to upload." });
    if (!photoType(req.file.buffer)) return res.status(400).json({ message: PHOTO_PROBLEM });
    const user = await findMe(req);
    if (!user) return res.status(404).json({ message: "User not found" });
    const oldFileId = await storePhoto(user, req.file);
    await user.save();
    await deleteUserPhoto(oldFileId);
    res.json(stripSensitive(user));
  } catch (error) {
    console.error("Set photo error:", error.message);
    res.status(500).json({ message: "The photo couldn't be saved. Try again in a moment." });
  }
};

// DELETE /api/user/me/photo
exports.removeMyPhoto = async (req, res) => {
  try {
    const user = await findMe(req);
    if (!user) return res.status(404).json({ message: "User not found" });
    const oldFileId = user.photoFileId;
    user.photoFileId = undefined;
    user.profilePicture = "";
    await user.save();
    await deleteUserPhoto(oldFileId);
    res.json(stripSensitive(user));
  } catch (error) {
    console.error("Remove photo error:", error.message);
    res.status(500).json({ message: "The photo couldn't be removed. Try again in a moment." });
  }
};

// GET /api/user/:id/photo: anyone signed in, like the directory. Always an image, never run as a page.
exports.getUserPhoto = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: "No photo" });
    const user = await User.findOne({ _id: req.params.id, isDeleted: { $ne: true } }).select("photoFileId").lean();
    const file = user?.photoFileId ? await findUserPhoto(user.photoFileId) : null;
    if (!file) return res.status(404).json({ message: "No photo" });

    res.setHeader("Content-Type", file.metadata?.contentType || "application/octet-stream");
    res.setHeader("Content-Length", String(file.length));
    res.setHeader("X-Content-Type-Options", "nosniff");
    // each photo has its own address (?v=), so a browser may keep it; "private" keeps shared caches out
    res.setHeader("Cache-Control", "private, max-age=86400");
    return openUserPhoto(file._id)
      .once("error", (error) => {
        console.error("Stream photo error:", error.message);
        if (!res.headersSent) res.status(404).json({ message: "No photo" });
        else res.end();
      })
      .pipe(res);
  } catch (error) {
    console.error("Get photo error:", error.message);
    res.status(500).json({ message: "The photo couldn't be loaded." });
  }
};
