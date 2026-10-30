// The backend's one Keycloak admin client (accounts, roles, passwords), shared by every controller. Its login is
// reused until shortly before its token runs out (utils/keycloakAdminSession.js); before step 17 four controllers
// each made their own client, and sign-in, invites and Change password logged in again on every call.
const KcAdminClient = require("@keycloak/keycloak-admin-client").default;
const { createKeycloakAdminSession } = require("./keycloakAdminSession");

const kcAdmin = new KcAdminClient({
  baseUrl: process.env.KEYCLOAK_BASE_URL || process.env.KEYCLOAK_URL || "http://localhost:8080",
  realmName: process.env.KEYCLOAK_ADMIN_REALM || "master",
});

/** Logs the shared client in when its last login is used up; call it before each use of `kcAdmin`. */
const ensureKeycloakAdmin = createKeycloakAdminSession(kcAdmin, {
  username: process.env.KEYCLOAK_ADMIN_USERNAME || "admin",
  password: process.env.KEYCLOAK_ADMIN_PASSWORD || "admin",
  grantType: "password",
  clientId: process.env.KEYCLOAK_ADMIN_CLIENT_ID || "admin-cli",
});

/**
 * Keycloak's HTTP status and parsed reply from an error the admin client threw (its NetworkError carries them as
 * `response` and `responseData`); both undefined when Keycloak never answered.
 */
const keycloakReply = (error) => ({ status: error?.response?.status, data: error?.responseData });

module.exports = { kcAdmin, ensureKeycloakAdmin, keycloakReply };
