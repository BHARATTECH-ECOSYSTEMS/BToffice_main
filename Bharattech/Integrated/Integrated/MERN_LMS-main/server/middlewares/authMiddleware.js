import jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";
import { createKeyKeeper } from "../utils/keycloakKeys.js";

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

// The library only fetches Keycloak's key list; the keeper decides when (utils/keycloakKeys.js), so made-up tokens
// can't use up the fetches real sign-ins need.
const jwks = jwksClient({
  jwksUri,
  cache: false,
  rateLimit: false,
  timeout: 5000,
});
const keyFor = createKeyKeeper({ fetchKeys: () => jwks.getSigningKeys() });

const getKey = (header, callback) => keyFor(header.kid).then((key) => callback(null, key), callback);

/**
 * The claims of a token Keycloak signed for the LMS's own client; rejects any other. Only Keycloak-signed tokens: a
 * token signed with a shared secret could be made by anyone who knows it, with any role, and the realm signs tokens for
 * every company app.
 */
export const verifyToken = (token) =>
  new Promise((resolve, reject) => {
    jwt.verify(token, getKey, { algorithms: ["RS256"], issuer: `${normalizedKeycloakUrl}/realms/${KEYCLOAK_REALM}`, clockTolerance: 60 }, (err, decoded) => {
      if (err) return reject(err);
      if (!KEYCLOAK_CLIENT_IDS.includes(decoded?.azp)) return reject(new Error("token issued for another client"));
      resolve(decoded);
    });
  });

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

    verifyToken(token).then(
      (decoded) => {
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
          // the person's real name (the portal keeps it in Keycloak), so the LMS never shows a username instead
          name: decoded.name || [decoded.given_name, decoded.family_name].filter(Boolean).join(" ") || undefined,
          email: decoded.email,
          // Keycloak marks an email someone changed themselves not verified; only a verified one moves records
          emailVerified: decoded.email_verified === true,
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
      (err) => {
        console.error("Token verification failed:", err.message);
        res.status(401).json({ success: false, message: "Invalid or expired token" });
      }
    );
  };
};
