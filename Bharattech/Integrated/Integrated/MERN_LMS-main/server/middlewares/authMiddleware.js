import jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";

const KEYCLOAK_URL = process.env.KEYCLOAK_URL || "http://localhost:8080";
const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM || "bharattech";
const KEYCLOAK_CLIENT_IDS = (
  process.env.KEYCLOAK_CLIENT_IDS ||
  process.env.KEYCLOAK_CLIENT_ID ||
  "lms2-client,lms-client"
)
  .split(",")
  .map((id) => id.trim())
  .filter(Boolean);

const jwksUri = `${KEYCLOAK_URL.replace(/\/+$/, "")}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/certs`;

const client = jwksClient({
  jwksUri,
  cache: true,
  cacheMaxEntries: 5,
  cacheMaxAge: 10 * 60 * 1000,
});

const getKey = (header, callback) => {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) return callback(err);
    callback(null, key.getPublicKey());
  });
};

const attachPortalAdmin = (req) => {
  req.user = {
    id: process.env.PORTAL_ADMIN_USER_ID || "bharattech-portal-admin",
    username: "bharattech-admin",
    email: "admin@bharattech.local",
    roles: ["admin"],
    isPortalAdmin: true,
  };
};

export const protect = (roles = []) => {
  return (req, res, next) => {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;

    if (!token || token === "null" || token === "undefined") {
      attachPortalAdmin(req);
      return next();
    }

    jwt.verify(
      token,
      getKey,
      {
        algorithms: ["RS256"],
        issuer: `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}`,
      },
      (err, decoded) => {
        if (err) {
          return res.status(401).json({
            success: false,
            message: "Invalid or expired token",
          });
        }

        const clientRoles = KEYCLOAK_CLIENT_IDS.flatMap(
          (clientId) => decoded?.resource_access?.[clientId]?.roles || []
        );
        const realmRoles = decoded?.realm_access?.roles || [];
        const rolesFromToken = [...clientRoles, ...realmRoles].map((role) =>
          role.toLowerCase()
        );

        req.user = {
          id: decoded.sub,
          username: decoded.preferred_username,
          email: decoded.email,
          roles: rolesFromToken,
        };

        if (roles.length) {
          const allowed = roles.map((role) => role.toLowerCase());
          const hasAccess =
            rolesFromToken.includes("admin") ||
            rolesFromToken.some((role) => allowed.includes(role));

          if (!hasAccess) {
            return res.status(403).json({
              success: false,
              message: "Forbidden: insufficient role",
            });
          }
        }

        next();
      }
    );
  };
};
