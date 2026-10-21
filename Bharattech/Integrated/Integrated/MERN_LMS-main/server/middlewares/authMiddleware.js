import jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";

const KEYCLOAK_URL = process.env.KEYCLOAK_URL || "http://localhost:8080";
const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM || "bharattech";
const KEYCLOAK_CLIENT_IDS = (
  process.env.KEYCLOAK_CLIENT_IDS || "lms2-client,lms-client"
)
  .split(",")
  .map((id) => id.trim())
  .filter(Boolean);

const normalizedKeycloakUrl = KEYCLOAK_URL.replace(/\/+$/, "");
const jwksUri = `${normalizedKeycloakUrl}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/certs`;

const client = jwksClient({
  jwksUri,
  cache: true,
  cacheMaxEntries: 5,
  cacheMaxAge: 10 * 60 * 1000,
  rateLimit: true,
  jwksRequestsPerMinute: 5,
  timeout: 5000,
});

const getKey = (header, callback) => {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      console.error("JWKS Error:", err.message);
      return callback(err);
    }
    callback(null, key.getPublicKey());
  });
};

export const protect = (roles = []) => {
  return (req, res, next) => {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;

    // No token → always reject, regardless of environment
    if (!token || token === "null" || token === "undefined") {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });
    }

    // First try local JWT secret if configured (for development / local tokens)
    if (process.env.JWT_SECRET) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const rolesFromToken = (
          Array.isArray(decoded.roles)
            ? decoded.roles
            : [decoded.role || "student"]
        ).map((r) => String(r).toLowerCase());

        req.user = {
          id: decoded.id || decoded.sub || decoded.userId,
          username: decoded.username || decoded.name || "user",
          email: decoded.email,
          roles: rolesFromToken,
        };

        if (roles.length) {
          const allowed = roles.map((r) => r.toLowerCase());
          const hasAccess =
            rolesFromToken.includes("admin") ||
            rolesFromToken.includes("superadmin") ||
            rolesFromToken.some((r) => allowed.includes(r));

          if (!hasAccess) {
            return res.status(403).json({ success: false, message: "Forbidden" });
          }
        }
        return next();
      } catch {
        // Fall back to Keycloak RS256 JWKS verification
      }
    }

    jwt.verify(
      token,
      getKey,
      {
        algorithms: ["RS256"],
        issuer: `${normalizedKeycloakUrl}/realms/${KEYCLOAK_REALM}`,
        clockTolerance: 60,
      },
      (err, decoded) => {
        if (err) {
          console.error("Token verification failed:", err.message);
          return res
            .status(401)
            .json({
              success: false,
              message: "Invalid or expired token",
              error: err.message,
            });
        }

        const clientRoles = KEYCLOAK_CLIENT_IDS.flatMap(
          (cid) => decoded?.resource_access?.[cid]?.roles || []
        );
        const realmRoles = decoded?.realm_access?.roles || [];
        const rolesFromToken = [...clientRoles, ...realmRoles].map((r) =>
          r.toLowerCase()
        );

        req.user = {
          id: decoded.sub,
          username: decoded.preferred_username,
          email: decoded.email,
          roles: rolesFromToken,
        };

        if (roles.length) {
          const allowed = roles.map((r) => r.toLowerCase());
          const hasAccess =
            rolesFromToken.includes("admin") ||
            rolesFromToken.includes("superadmin") ||
            rolesFromToken.some((r) => allowed.includes(r));

          if (!hasAccess) {
            return res
              .status(403)
              .json({ success: false, message: "Forbidden" });
          }
        }

        next();
      }
    );
  };
};
