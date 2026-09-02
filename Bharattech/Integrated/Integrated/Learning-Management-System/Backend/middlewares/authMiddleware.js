const jwt = require("jsonwebtoken");
const jwksClient = require("jwks-rsa");

const KEYCLOAK_URL = process.env.KEYCLOAK_URL || process.env.KEYCLOAK_HOST || "http://keycloak.local";
const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM || "bharattech";

const jwksUri = `${KEYCLOAK_URL.replace(/\/+$/, "")}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/certs`;

const client = jwksClient({
    jwksUri,
    cache: true,
    cacheMaxEntries: 5,
    cacheMaxAge: 10 * 60 * 1000 // 10 minutes
});

const getKey = (header, callback) => {
    client.getSigningKey(header.kid, function (err, key) {
        if (err) return callback(err);
        const signingKey = key.getPublicKey();
        callback(null, signingKey);
    });
};

const protect = (roles = []) => {
    return (req, res, next) => {
        const token = req.headers.authorization?.split(" ")[1];

        if (!token) {
            return res.status(401).json({ message: "Access denied. No token provided." });
        }

        // First try application JWT secret (backwards compatibility)
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = decoded;
            // role normalization and checks
            if (roles.length) {
                const userRole = decoded.role;
                const normalizedUserRole = userRole?.toLowerCase()?.trim();
                const normalizedRoles = roles.map(r => r?.toLowerCase()?.trim()).filter(Boolean);
                const hasAccess = normalizedRoles.includes(normalizedUserRole);
                if (!hasAccess) return res.status(403).json({ message: "Forbidden: You do not have access." });
            }
            return next();
        } catch (err) {
            // If verification with local secret fails, attempt Keycloak JWKS verification
            jwt.verify(token, getKey, { algorithms: ["RS256"] }, (error, decoded) => {
                if (error) {
                    console.error("❌ Token verification failed:", error.message);
                    return res.status(401).json({ message: "Invalid token", error: error.message });
                }

                // Attach decoded Keycloak token
                req.user = decoded;

                // Map Keycloak roles to simple role string if present
                if (!req.user.role && decoded.realm_access && decoded.realm_access.roles) {
                    req.user.role = decoded.realm_access.roles[0];
                }

                // Role-based checks
                if (roles.length) {
                    const userRole = req.user.role;
                    const normalizedUserRole = userRole?.toLowerCase()?.trim();
                    const normalizedRoles = roles.map(r => r?.toLowerCase()?.trim()).filter(Boolean);
                    const hasAccess = normalizedRoles.includes(normalizedUserRole);
                    if (!hasAccess) return res.status(403).json({ message: "Forbidden: You do not have access." });
                }

                next();
            });
        }
    };
};

module.exports = protect;