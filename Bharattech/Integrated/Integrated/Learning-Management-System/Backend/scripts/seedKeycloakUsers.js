// Script to seed Keycloak with test users
// Run with: node scripts/seedKeycloakUsers.js

require("dotenv").config({ path: require("path").resolve(__dirname, "..", "..", ".env") });
const KcAdminClient = require("@keycloak/keycloak-admin-client").default;

const KEYCLOAK_BASE_URL = process.env.KEYCLOAK_BASE_URL || process.env.KEYCLOAK_URL || "http://localhost:4000";
const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM || "bharattech";
const KEYCLOAK_ADMIN_REALM = process.env.KEYCLOAK_ADMIN_REALM || "master";
const KEYCLOAK_ADMIN_USERNAME = process.env.KEYCLOAK_ADMIN_USERNAME || "admin";
const KEYCLOAK_ADMIN_PASSWORD = process.env.KEYCLOAK_ADMIN_PASSWORD || "admin";

// Seeds only a Keycloak on this machine: the accounts below share one password, two of them are Admins, and the
// .env this reads may name the live Keycloak (security report 2026-10-28 lead 2).
const LOOPBACK_HOSTS = ["localhost", "127.0.0.1", "[::1]"];

/** Why this script refuses to seed `baseUrl`, or "" when it is a Keycloak on this machine and this isn't a live server. */
const seedTargetProblem = (baseUrl, env = process.env) => {
  if (env.NODE_ENV === "production" || env.RENDER) return "This is a live server: test accounts are never seeded here.";
  let host;
  try {
    host = new URL(baseUrl).hostname;
  } catch {
    return `"${baseUrl}" isn't a Keycloak address.`;
  }
  return LOOPBACK_HOSTS.includes(host) ? "" : `Refusing to seed ${baseUrl}: only a Keycloak on this machine (localhost) is seeded.`;
};

const KEYCLOAK_ROLE_NAMES = {
  Admin: "admin",
  Subadmin: "Subadmin",
  Employee: "Employee",
  Intern: "Intern",
};

const testUsers = [
  {
    fullName: "Ranit Bag",
    firstName: "Ranit",
    lastName: "Bag",
    username: "admin",
    email: "ranitbag007@gmail.com",
    password: "Password123",
    role: "Admin"
  },
  {
    fullName: "devesh RR Rayte",
    firstName: "devesh RR",
    lastName: "Rayte",
    username: "deveshrayte@gmail.com",
    email: "deveshrayte@gmail.com",
    password: "Password123",
    role: "Employee"
  },
  {
    fullName: "Devesh Rayte",
    firstName: "Devesh",
    lastName: "Rayte",
    username: "devmanus2005@gmail.com",
    email: "devmanus2005@gmail.com",
    password: "Password123",
    role: "Admin"
  },
  {
    fullName: "Offtushar",
    firstName: "Offtushar",
    lastName: "",
    username: "off.tushar@gmail.com",
    email: "off.tushar@gmail.com",
    password: "Password123",
    role: "Employee"
  },
  {
    fullName: "Devesh R",
    firstName: "Devesh R",
    lastName: "",
    username: "rayatedevesh@gmail.com",
    email: "rayatedevesh@gmail.com",
    password: "Password123",
    role: "Employee"
  },
  {
    fullName: "zxcczdc",
    firstName: "zxcczdc",
    lastName: "",
    username: "zczxdczx@gmail.com",
    email: "zczxdczx@gmail.com",
    password: "Password123",
    role: "Employee"
  }
];

const kcAdmin = new KcAdminClient({
  baseUrl: KEYCLOAK_BASE_URL,
  realmName: KEYCLOAK_ADMIN_REALM,
});

// A realm this script makes is invitation-only, like scripts/setupKeycloakRealm.js makes it.
const NEW_REALM = { enabled: true, registrationAllowed: false };

// The local apps' addresses only: a "*" web origin let every website use lms-client from a browser.
const LMS_CLIENT = {
  clientId: "lms-client",
  name: "LMS Client",
  enabled: true,
  protocol: "openid-connect",
  publicClient: true,
  standardFlowEnabled: true,
  directAccessGrantsEnabled: true,
  redirectUris: [
    "http://localhost:5174/*",
    "http://127.0.0.1:5174/*",
    "http://localhost:5173/*",
    "http://127.0.0.1:5173/*",
    "http://localhost:5175/*",
    "http://127.0.0.1:5175/*",
    "http://localhost:8080/*",
    "http://127.0.0.1:8080/*",
  ],
  attributes: {
    "post.logout.redirect.uris": "http://localhost:5174/*##http://127.0.0.1:5174/*##http://localhost:5173/*##http://127.0.0.1:5173/*##http://localhost:5175/*##http://127.0.0.1:5175/*##http://localhost:8080/*##http://127.0.0.1:8080/*"
  },
  webOrigins: [
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5175",
    "http://127.0.0.1:5175",
    "http://localhost:8080",
    "http://127.0.0.1:8080",
  ],
};

async function main() {
  const problem = seedTargetProblem(KEYCLOAK_BASE_URL);
  if (problem) {
    console.error(`❌ ${problem}`);
    process.exit(1);
  }

  try {
    console.log(`📡 Connecting to Keycloak at ${KEYCLOAK_BASE_URL}...`);
    await kcAdmin.auth({
      username: KEYCLOAK_ADMIN_USERNAME,
      password: KEYCLOAK_ADMIN_PASSWORD,
      grantType: "password",
      clientId: "admin-cli",
    });
    console.log("✅ Authenticated with Keycloak Admin API");

    // Check if realm exists
    const realms = await kcAdmin.realms.find();
    const realmExists = realms.some(r => r.realm === KEYCLOAK_REALM);
    if (!realmExists) {
      console.log(`🔨 Creating realm "${KEYCLOAK_REALM}"...`);
      await kcAdmin.realms.create({ realm: KEYCLOAK_REALM, ...NEW_REALM });
      console.log(`✅ Realm created!`);
    } else {
      // its sign-up setting is left as it is (scripts/setupKeycloakRealm.js keeps it off)
      console.log(`✅ Realm "${KEYCLOAK_REALM}" already exists.`);
    }

    // Ensure client "lms-client" exists and is properly configured
    console.log("🖥️ Ensuring lms-client client exists and is properly configured...");
    const clients = await kcAdmin.clients.find({
      realm: KEYCLOAK_REALM,
    });
    const lmsClient = clients.find(c => c.clientId === "lms-client");
    const clientPayload = LMS_CLIENT;

    if (lmsClient) {
      await kcAdmin.clients.update({
        realm: KEYCLOAK_REALM,
        id: lmsClient.id,
      }, clientPayload);
      console.log("   Updated existing lms-client configuration");
    } else {
      await kcAdmin.clients.create({
        realm: KEYCLOAK_REALM,
        ...clientPayload
      });
      console.log("   Created new lms-client configuration");
    }
 
     // Ensure roles exist in the realm
    console.log("🔑 Ensuring realm roles exist...");
    for (const roleKey of Object.keys(KEYCLOAK_ROLE_NAMES)) {
      const roleName = KEYCLOAK_ROLE_NAMES[roleKey];
      try {
        await kcAdmin.roles.create({
          realm: KEYCLOAK_REALM,
          name: roleName,
          description: `BharatTech role for ${roleKey}`,
        });
        console.log(`   Created realm role: ${roleName}`);
      } catch (err) {
        if (err.response?.status === 409) {
          console.log(`   Realm role already exists: ${roleName}`);
        } else {
          throw err;
        }
      }
    }

    // Create users
    console.log("👤 Seeding test users into Keycloak...");
    for (const user of testUsers) {
      // Check if user already exists
      const matches = await kcAdmin.users.find({
        realm: KEYCLOAK_REALM,
        username: user.username,
      });

      let kcUserId;
      if (matches.length > 0) {
        kcUserId = matches[0].id;
        await kcAdmin.users.update({
          realm: KEYCLOAK_REALM,
          id: kcUserId,
        }, {
          username: user.username,
          email: user.email,
          enabled: true,
          firstName: user.firstName,
          lastName: user.lastName,
          emailVerified: true,
        });
        console.log(`   User "${user.username}" already exists (ID: ${kcUserId}) - details updated`);
      } else {
        const createdUser = await kcAdmin.users.create({
          realm: KEYCLOAK_REALM,
          username: user.username,
          email: user.email,
          enabled: true,
          firstName: user.firstName,
          lastName: user.lastName,
          emailVerified: true,
        });
        kcUserId = createdUser.id;
        console.log(`   Created user: ${user.username} (ID: ${kcUserId})`);
      }

      // Set Password
      await kcAdmin.users.resetPassword({
        realm: KEYCLOAK_REALM,
        id: kcUserId,
        credential: {
          type: "password",
          value: user.password,
          temporary: false,
        },
      });
      console.log(`      Password set successfully`);

      // Assign Role
      const roleName = KEYCLOAK_ROLE_NAMES[user.role];
      const role = await kcAdmin.roles.findOneByName({
        realm: KEYCLOAK_REALM,
        name: roleName,
      });

      await kcAdmin.users.addRealmRoleMappings({
        realm: KEYCLOAK_REALM,
        id: kcUserId,
        roles: [{ id: role.id, name: role.name }],
      });
      console.log(`      Assigned role "${roleName}" successfully`);
    }

    console.log("\n🎉 Keycloak user seeding completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Keycloak seeding error:", error.response?.data || error);
    process.exit(1);
  }
}

module.exports = { seedTargetProblem, LMS_CLIENT, NEW_REALM };

// Run directly: node scripts/seedKeycloakUsers.js (loading it, as the tests do, seeds nothing)
if (require.main === module) main();
