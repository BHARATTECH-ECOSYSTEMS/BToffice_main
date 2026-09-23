const { randomUUID } = require("crypto");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const {
  getKcAdminClient,
  KEYCLOAK_REALM,
  normalizeRole,
} = require("../services/keycloakService");
const {
  attributeValue,
  roleFromKeycloakUser,
  canDeleteUser,
  canAssignRole,
  syncKeycloakRealmRole,
  syncKeycloakUsersToLocal,
  listLocalUsers,
} = require("../services/userSyncService");

const DEMO_AUTH_ENABLED =
  process.env.DEMO_AUTH_ENABLED === "true" ||
  process.env.NODE_ENV !== "production";

exports.getUsers = async (req, res) => {
  try {
    let users = [];
    try {
      users = await syncKeycloakUsersToLocal();
    } catch (syncError) {
      console.error("Keycloak sync failed, falling back to local users:", syncError);
      users = await listLocalUsers();
    }
    res.json(users);
  } catch (error) {
    console.error("Get users error:", error);
    if (DEMO_AUTH_ENABLED) {
      const users = await listLocalUsers();
      return res.json(users);
    }
    res.status(500).json({ message: "Failed to fetch users", details: error.message });
  }
};

exports.getKeycloakUsers = async (req, res) => {
  try {
    const client = await getKcAdminClient();
    const kcUsers = await client.users.find({ realm: KEYCLOAK_REALM, max: 1000 });

    const users = await Promise.all(
      kcUsers
        .filter((u) => u.enabled !== false && !(u.requiredActions || []).includes("UPDATE_PASSWORD"))
        .map(async (u) => {
          const roleMappings = await client.users
            .listRealmRoleMappings({ realm: KEYCLOAK_REALM, id: u.id })
            .catch(() => []);
          const realmRoleNames = (roleMappings || []).map((r) => r.name).filter(Boolean);
          const role = roleFromKeycloakUser({ realmRoles: realmRoleNames }, "Employee");
          const fullName = [u.firstName, u.lastName].filter(Boolean).join(" ").trim() || u.username || u.email || "User";
          const attributes = u.attributes || {};
          return {
            id: u.id,
            username: u.username || "",
            email: u.email || "",
            firstName: u.firstName || "",
            lastName: u.lastName || "",
            fullName,
            role,
            roles: realmRoleNames,
            emailVerified: u.emailVerified || false,
            phone: Array.isArray(attributes.phone) ? attributes.phone[0] : attributes.phone || "",
            workPhone: Array.isArray(attributes.workPhone) ? attributes.workPhone[0] : attributes.workPhone || "",
          };
        })
    );

    res.json(users.sort((a, b) => a.fullName.localeCompare(b.fullName)));
  } catch (err) {
    console.error("getKeycloakUsers error:", err);
    res.status(500).json({ message: "Failed to fetch users from Keycloak", details: err.message });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.params.id, isDeleted: { $ne: true } });
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

    const user = await User.findOne({ $or: conditions, isDeleted: { $ne: true } });
    if (!user) return res.status(404).json({ message: "User not found" });

    const profile = user.toObject();
    if (user.keycloakId && user.authProvider === "keycloak") {
      try {
        const client = await getKcAdminClient();
        const kcUser = await client.users.findOne({ realm: KEYCLOAK_REALM, id: user.keycloakId });
        if (kcUser?.attributes) {
          const kcPhone = attributeValue(kcUser.attributes, "phone");
          const kcWorkPhone = attributeValue(kcUser.attributes, "workPhone");
          if (kcPhone) profile.phone = kcPhone;
          if (kcWorkPhone) profile.workPhone = kcWorkPhone;
        }
      } catch (kcErr) {
        console.error("Keycloak attribute fetch error:", kcErr);
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
    if (existing) return res.status(409).json({ message: "User already exists" });

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
    const user = await User.findOne({ _id: req.params.id, isDeleted: { $ne: true } });
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
    res.status(500).json({ message: "Failed to update user", details: error.message });
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
        const client = await getKcAdminClient();
        await client.users.del({ realm: KEYCLOAK_REALM, id: user.keycloakId });
      } catch (kcErr) {
        console.error("Keycloak delete error:", kcErr);
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
        const client = await getKcAdminClient();
        const kcUser = await client.users.findOne({ realm: KEYCLOAK_REALM, id: user.keycloakId });
        await client.users.update(
          { realm: KEYCLOAK_REALM, id: user.keycloakId },
          {
            attributes: {
              ...(kcUser?.attributes || {}),
              phone: [user.phone || ""],
              workPhone: [user.workPhone || ""],
            },
          }
        );
      } catch (kcErr) {
        console.error("Keycloak attribute sync error:", kcErr);
      }
    }
    res.json(user);
  } catch (error) {
    console.error("Update current user error:", error);
    res.status(500).json({ message: "Failed to update profile" });
  }
};
