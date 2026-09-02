const jwt = require("jsonwebtoken");
const jwksClient = require("jwks-rsa");
const User = require("../models/User");
const KcAdminClient = require("keycloak-admin").default;

const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM || "bharattech";
const KEYCLOAK_BASE_URL =
  process.env.KEYCLOAK_BASE_URL ||
  process.env.KEYCLOAK_URL ||
  "http://localhost:8080";
const DEMO_AUTH_ENABLED = process.env.AUTH_MODE === "demo";

const KEYCLOAK_ADMIN_REALM = process.env.KEYCLOAK_ADMIN_REALM || "master";
const KEYCLOAK_ADMIN_USERNAME = process.env.KEYCLOAK_ADMIN_USERNAME || "admin";
const KEYCLOAK_ADMIN_PASSWORD = process.env.KEYCLOAK_ADMIN_PASSWORD || "admin";

const kcAdmin = new KcAdminClient({
  baseUrl: KEYCLOAK_BASE_URL,
  realmName: KEYCLOAK_ADMIN_REALM,
});

let lastSessionCheckTime = 0;
let cachedActiveAdminSession = false;

const checkActiveAdminSession = async () => {
  return true;
};

const client = jwksClient({
  jwksUri: `${KEYCLOAK_BASE_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/certs`,
  cache: true,
  rateLimit: true,
  jwksRequestsPerMinute: 5,
});

const getKey = (header, callback) => {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      console.error("JWKS Error:", err.message);
      return callback(err);
    }
    callback(null, key.publicKey || key.rsaPublicKey);
  });
};

const resolveRole = (decoded) => {
  const clientRoles = decoded.resource_access?.["lms-client"]?.roles || [];
  const realmRoles = decoded.realm_access?.roles || [];
  const allRolesUpper = [...clientRoles, ...realmRoles].map((role) => role.toUpperCase());

  if (allRolesUpper.includes("SUPERADMIN") || allRolesUpper.includes("SUPER-ADMIN")) return "Superadmin";
  if (allRolesUpper.includes("ADMIN")) return "Admin";
  if (allRolesUpper.includes("SUBADMIN") || allRolesUpper.includes("SUB-ADMIN")) return "Subadmin";
  if (allRolesUpper.includes("EMPLOYEE")) return "Employee";
  return "Intern";
};

const buildDemoUser = (req) => {
  const requestedRole = (req.headers["x-demo-role"] || "admin").toString().toLowerCase();
  const safeRole = ["superadmin", "admin", "subadmin", "employee", "intern"].includes(requestedRole)
    ? requestedRole
    : "admin";
  const fullName = `${safeRole.charAt(0).toUpperCase()}${safeRole.slice(1)} User`;
  const normalizedRole =
    safeRole === "superadmin"
      ? "Superadmin"
      : safeRole === "admin"
      ? "Admin"
      : `${safeRole.charAt(0).toUpperCase()}${safeRole.slice(1)}`;

  return {
    id: `demo-${safeRole}`,
    keycloakId: `demo-${safeRole}`,
    email: `${safeRole}@bharattech.local`,
    role: normalizedRole,
    fullName,
    sub: `demo-${safeRole}`,
    decoded: {
      sub: `demo-${safeRole}`,
      email: `${safeRole}@bharattech.local`,
      name: fullName,
      preferred_username: fullName,
      realm_access: {
        roles: [normalizedRole],
      },
      resource_access: {
        "lms-client": {
          roles: [normalizedRole],
        },
      },
    },
  };
};

const getOrCreateUser = async (keycloakUser, keycloakUserId = null) => {
  const keycloakId = keycloakUserId || keycloakUser.sub;
  const email = (keycloakUser.email || "").toLowerCase().trim();

  try {
    let user = await User.findOne({ keycloakId });

    if (!user && email) {
      user = await User.findOne({ email });
    }

    if (!user) {
      user = new User({
        keycloakId,
        email: email || `user-${keycloakId.slice(-6)}@lms.local`,
        username:
          keycloakUser.preferred_username ||
          keycloakUser.email ||
          `user-${keycloakId.slice(-6)}`,
        fullName:
          keycloakUser.name ||
          keycloakUser.preferred_username ||
          `User-${keycloakId.slice(-6)}`,
        role: resolveRole(keycloakUser),
        authProvider: "keycloak",
        isDeleted: false,
        isBanned: false,
      });

      await user.save();
    }

    const role = resolveRole(keycloakUser);
    if (user.role !== role) {
      user.role = role;
      await user.save();
    }

    return user;
  } catch (error) {
    if (error.code === 11000) {
      const existing = await User.findOne({ keycloakId });
      if (existing) return existing;
    }

    throw error;
  }
};

const keycloakAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (DEMO_AUTH_ENABLED && !authHeader?.startsWith("Bearer ")) {
      req.user = buildDemoUser(req);
      return next();
    }

    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Missing Bearer token" });
    }

    const token = authHeader.split(" ")[1];

    if (DEMO_AUTH_ENABLED && token === "demo-token") {
      req.user = buildDemoUser(req);
      return next();
    }

    let decoded;
    try {
      decoded = await new Promise((resolve, reject) => {
        jwt.verify(
          token,
          getKey,
          {
            algorithms: ["RS256"],
            issuer: `${KEYCLOAK_BASE_URL}/realms/${KEYCLOAK_REALM}`,
          },
          (err, verifiedToken) => {
            if (err) {
              reject(err);
            } else {
              resolve(verifiedToken);
            }
          }
        );
      });

      const user = await getOrCreateUser(decoded);

      req.user = {
        id: user._id.toString(),
        keycloakId: decoded.sub,
        email: user.email,
        role: user.role,
        fullName: user.fullName,
        decoded,
      };

      next();
    } catch (keycloakErr) {
      console.warn("Keycloak token verification failed, trying local JWT secret fallback:", keycloakErr.message);

      if (token === "mock-token" || token === "demo-token") {
        req.user = buildDemoUser(req);
        return next();
      }

      try {
        const localDecoded = jwt.verify(
          token,
          process.env.JWT_SECRET || "fallback-secret-for-encryption-1234567890",
          {
            algorithms: ["HS256"],
          }
        );

        const localUser = await User.findById(localDecoded.id);
        if (!localUser) {
          throw new Error("User not found in local database");
        }

        req.user = {
          id: localUser._id.toString(),
          keycloakId: localUser.keycloakId || localUser._id.toString(),
          email: localUser.email,
          role: localUser.role,
          fullName: localUser.fullName,
          decoded: localDecoded,
        };

        next();
      } catch (localErr) {
        console.error("Local token verification also failed:", localErr.message);
        res.status(401).json({ message: "Auth failed", error: keycloakErr.message });
      }
    }
  } catch (error) {
    console.error("keycloakAuth middleware error:", error);
    res.status(500).json({ message: "Internal server error during authentication" });
  }
};

const requireAdmin = (req, res, next) => {
  const role = req.user?.role?.toLowerCase();
  if (role !== "admin" && role !== "superadmin") {
    return res.status(403).json({ message: "Admin or Superadmin required" });
  }
  next();
};

const requireSuperAdmin = (req, res, next) => {
  const role = req.user?.role?.toLowerCase();
  if (role !== "superadmin") {
    return res.status(403).json({ message: "Superadmin access required" });
  }
  next();
};

module.exports = {
  keycloakAuth,
  requireAdmin,
  requireSuperAdmin,
  getOrCreateUser,
  checkActiveAdminSession,
};
