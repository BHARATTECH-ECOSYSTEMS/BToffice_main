const jwt = require("jsonwebtoken");
const jwksClient = require("jwks-rsa");
const User = require("../models/User");
const { freeUsernameFor } = require("../utils/takenNames");
const { createKeyKeeper } = require("../utils/keycloakKeys");

const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM || "bharattech";
const KEYCLOAK_BASE_URL =
  process.env.KEYCLOAK_BASE_URL ||
  process.env.KEYCLOAK_URL ||
  "http://localhost:8080";
// Read at call time (not module load) so configuration and tests take effect without re-importing.
const demoAuthEnabled = () => process.env.AUTH_MODE === "demo";
const isProduction = () => process.env.NODE_ENV === "production";
const keycloakClientId = () => process.env.KEYCLOAK_CLIENT_ID;

/** A token is accepted only when it was issued for this app's Keycloak client (its azp/aud). Skipped, so it can't
 *  lock people out, when no client is configured. */
const audienceAllowed = (decoded) => {
  const clientId = keycloakClientId();
  if (!clientId) return true;
  if (decoded.azp === clientId) return true;
  const aud = decoded.aud;
  return Array.isArray(aud) ? aud.includes(clientId) : aud === clientId;
};

/** Why a loaded account may not use the API; null when it may. */
const inactiveReason = (user) =>
  user?.isDeleted ? "This account has been removed." : user?.isBanned ? "This account has been blocked." : null;

/** Refuses dangerous settings at boot (called from server.js), so production never runs on demo mode or guessable secrets. */
const assertAuthConfig = () => {
  if (demoAuthEnabled() && isProduction()) throw new Error("AUTH_MODE=demo must never be used in production.");
  if (!isProduction()) return;
  // JWT_SECRET is no longer needed: local tokens aren't accepted since step 17
  const adminPassword = process.env.KEYCLOAK_ADMIN_PASSWORD;
  if (!adminPassword || adminPassword === "admin") throw new Error("KEYCLOAK_ADMIN_PASSWORD must be set to a real password in production.");
};

// The library only fetches Keycloak's key list; the keeper decides when (utils/keycloakKeys.js), so made-up tokens
// can't use up the fetches real sign-ins need.
const jwks = jwksClient({
  jwksUri: `${KEYCLOAK_BASE_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/certs`,
  cache: false,
  rateLimit: false,
  timeout: 5000,
});
const keyFor = createKeyKeeper({ fetchKeys: () => jwks.getSigningKeys() });

const getKey = (header, callback) => keyFor(header.kid).then((key) => callback(null, key), callback);

/** The claims of a token this realm's Keycloak signed; rejects any other (made up, expired, another issuer). */
const verifyToken = (token) =>
  new Promise((resolve, reject) => {
    jwt.verify(token, getKey, { algorithms: ["RS256"], issuer: `${KEYCLOAK_BASE_URL}/realms/${KEYCLOAK_REALM}` }, (err, verified) =>
      err ? reject(err) : resolve(verified)
    );
  });

const resolveRole = (decoded) => {
  const clientRoles = decoded.resource_access?.["lms-client"]?.roles || [];
  const realmRoles = decoded.realm_access?.roles || [];
  const allRolesUpper = [...clientRoles, ...realmRoles].map((role) =>
    role.toUpperCase(),
  );

  if (
    allRolesUpper.includes("SUPERADMIN") ||
    allRolesUpper.includes("SUPER-ADMIN")
  )
    return "Superadmin";
  if (allRolesUpper.includes("ADMIN")) return "Admin";
  if (allRolesUpper.includes("SUBADMIN") || allRolesUpper.includes("SUB-ADMIN"))
    return "Subadmin";
  if (allRolesUpper.includes("EMPLOYEE")) return "Employee";
  return "Intern";
};

const buildDemoUser = (req) => {
  const requestedRole = (req.headers["x-demo-role"] || "admin")
    .toString()
    .toLowerCase();
  const safeRole = [
    "superadmin",
    "admin",
    "subadmin",
    "employee",
    "intern",
  ].includes(requestedRole)
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

// Anyone can change their own email in Keycloak (it then marks it not verified), so only a verified one (our invites
// verify it) may find an older record. An unverified email that belongs to a record is refused, not guessed at.
const UNVERIFIED_EMAIL = {
  code: "unverified-email",
  message: "Your email isn't verified, so your sign-in can't be matched to your Bharattech record. Ask an admin to finish your account.",
};

const getOrCreateUser = async (keycloakUser, keycloakUserId = null) => {
  const keycloakId = keycloakUserId || keycloakUser.sub;
  const email = (keycloakUser.email || "").toLowerCase().trim();

  try {
    let user = await User.findOne({ keycloakId });

    if (!user && email) {
      user = await User.findOne({ email });
      if (user && keycloakUser.email_verified !== true) {
        throw Object.assign(new Error(UNVERIFIED_EMAIL.message), { code: UNVERIFIED_EMAIL.code });
      }
      // Found by email but not by login: someone deleted and invited again (a new Keycloak account), or a record
      // made under an older login. Bring the record back and link it to this login, so lookups by keycloakId and
      // lists that skip deleted people find them. They keep their employee ID.
      if (user) {
        user.keycloakId = keycloakId;
        user.isDeleted = false;
        user.deletedAt = null;
        user.leftOn = undefined;
        await user.save();
      }
    }

    if (!user) {
      user = new User({
        keycloakId,
        email: email || `user-${keycloakId.slice(-6)}@lms.local`,
        // a removed person's old username would clash with the new record and refuse every sign-in
        username: await freeUsernameFor(
          keycloakUser.preferred_username ||
            keycloakUser.email ||
            `user-${keycloakId.slice(-6)}`,
          keycloakId
        ),
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
    if (demoAuthEnabled() && !authHeader?.startsWith("Bearer ")) {
      req.user = buildDemoUser(req);
      return next();
    }

    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Missing Bearer token" });
    }

    const token = authHeader.split(" ")[1];

    if (demoAuthEnabled() && token === "demo-token") {
      req.user = buildDemoUser(req);
      return next();
    }

    let decoded;
    try {
      decoded = await verifyToken(token);

      // only tokens issued for this app's Keycloak client are accepted (a token for another app is refused)
      if (!audienceAllowed(decoded)) {
        return res.status(401).json({ message: "This token was not issued for this application." });
      }

      const user = await getOrCreateUser(decoded);
      const reason = inactiveReason(user);
      if (reason) return res.status(403).json({ message: reason });

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
      if (keycloakErr.code === UNVERIFIED_EMAIL.code) return res.status(403).json(UNVERIFIED_EMAIL);
      // Only Keycloak's tokens sign in. The backend's own local tokens (signed with JWT_SECRET by the old
      // /api/auth/login, removed in step 17) are refused: that route signed in accounts that anyone could register
      // with any role. The demo/mock tokens are refused too; demo mode has its own guarded path above.
      console.warn("Token refused:", keycloakErr.message);
      // no internal error text leaks to the caller
      return res.status(401).json({ message: "Auth failed" });
    }
  } catch (error) {
    console.error("keycloakAuth middleware error:", error);
    res
      .status(500)
      .json({ message: "Internal server error during authentication" });
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
  verifyToken,
  requireAdmin,
  requireSuperAdmin,
  getOrCreateUser,
  audienceAllowed,
  inactiveReason,
  assertAuthConfig,
};