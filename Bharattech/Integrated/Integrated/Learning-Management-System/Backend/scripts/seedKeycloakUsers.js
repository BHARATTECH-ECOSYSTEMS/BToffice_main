// Script to seed Keycloak with test users
// Run with: node scripts/seedKeycloakUsers.js

require("dotenv").config({ path: require("path").resolve(__dirname, "..", "..", ".env") });
const KcAdminClient = require("keycloak-admin").default;

const KEYCLOAK_BASE_URL = process.env.KEYCLOAK_BASE_URL || process.env.KEYCLOAK_URL || "http://localhost:4000";
const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM || "bharattech";
const KEYCLOAK_ADMIN_REALM = process.env.KEYCLOAK_ADMIN_REALM || "master";
const KEYCLOAK_ADMIN_USERNAME = process.env.KEYCLOAK_ADMIN_USERNAME || "admin";
const KEYCLOAK_ADMIN_PASSWORD = process.env.KEYCLOAK_ADMIN_PASSWORD || "admin";

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

async function main() {
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
      await kcAdmin.realms.create({
        realm: KEYCLOAK_REALM,
        enabled: true,
        registrationAllowed: true,
      });
      console.log(`✅ Realm created!`);
    } else {
      console.log(`✅ Realm "${KEYCLOAK_REALM}" already exists. Making sure registration is enabled...`);
      await kcAdmin.realms.update({ realm: KEYCLOAK_REALM }, { registrationAllowed: true });
    }

    // Ensure client "lms-client" exists and is properly configured
    console.log("🖥️ Ensuring lms-client client exists and is properly configured...");
    const clients = await kcAdmin.clients.find({
      realm: KEYCLOAK_REALM,
    });
    const lmsClient = clients.find(c => c.clientId === "lms-client");
    const clientPayload = {
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
        "*",
      ],
    };

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

main();
