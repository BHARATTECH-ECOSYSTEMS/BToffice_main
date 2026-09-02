const KcAdminClient = require("keycloak-admin").default;
require("dotenv").config({ path: require("path").resolve(__dirname, "..", "..", ".env") });

const KEYCLOAK_BASE_URL = process.env.KEYCLOAK_BASE_URL || "http://localhost:4000";
const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM || "bharattech";
const KEYCLOAK_ADMIN_REALM = process.env.KEYCLOAK_ADMIN_REALM || "master";
const KEYCLOAK_ADMIN_USERNAME = process.env.KEYCLOAK_ADMIN_USERNAME || "admin";
const KEYCLOAK_ADMIN_PASSWORD = process.env.KEYCLOAK_ADMIN_PASSWORD || "admin";

const kcAdmin = new KcAdminClient({
  baseUrl: KEYCLOAK_BASE_URL,
  realmName: KEYCLOAK_ADMIN_REALM,
});

async function run() {
  try {
    await kcAdmin.auth({
      username: KEYCLOAK_ADMIN_USERNAME,
      password: KEYCLOAK_ADMIN_PASSWORD,
      grantType: "password",
      clientId: "admin-cli",
    });
    console.log("Authenticated with Keycloak!");

    // List clients in bharattech realm to find lms-client UUID
    const clients = await kcAdmin.clients.find({ realm: KEYCLOAK_REALM });
    const lmsClient = clients.find(c => c.clientId === "lms-client");
    console.log("lms-client internal ID:", lmsClient ? lmsClient.id : "Not Found");

    if (lmsClient) {
      // Try fetching client user sessions
      try {
        const sessions = await kcAdmin.clients.listSessions({
          realm: KEYCLOAK_REALM,
          id: lmsClient.id
        });
        console.log("Client Sessions:", sessions);
      } catch (err) {
        console.error("Failed to list client sessions:", err.message);
      }
    }

    // Try finding admin users and checking if they have active sessions
    const adminUsers = await kcAdmin.users.find({ realm: KEYCLOAK_REALM, max: 100 });
    console.log("Found users in Keycloak:");
    for (const u of adminUsers) {
      try {
        const userSessions = await kcAdmin.users.listSessions({ realm: KEYCLOAK_REALM, id: u.id });
        console.log(`User: ${u.username}, Sessions count: ${userSessions.length}`);
      } catch (err) {
        console.error(`Failed to get sessions for ${u.username}:`, err.message);
      }
    }

  } catch (error) {
    console.error("Error running script:", error);
  }
}

run();
