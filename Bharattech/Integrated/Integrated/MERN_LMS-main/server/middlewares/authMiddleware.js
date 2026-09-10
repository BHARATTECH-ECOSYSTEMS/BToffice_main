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

const jwksUri = `${KEYCLOAK_URL.replace(/\/+$/, "")}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/certs`;

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

    jwt.verify(
      token,
      getKey,
      {
        algorithms: ["RS256"],
        issuer: `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}`,
        clockTolerance: 30,
      },
      (err, decoded) => {
        if (err) {
          return res
            .status(401)
            .json({ success: false, message: "Invalid or expired token" });
        }

        const clientRoles = KEYCLOAK_CLIENT_IDS.flatMap(
          (cid) => decoded?.resource_access?.[cid]?.roles || [],
        );
        const realmRoles = decoded?.realm_access?.roles || [];
        const rolesFromToken = [...clientRoles, ...realmRoles].map((r) =>
          r.toLowerCase(),
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
      },
    );
  };
};
