/**
 * Registers (or updates) the Huly OIDC client in the shared BharatTech Keycloak realm,
 * so the Huly sign-in page gets a "Sign in with Keycloak" button and lands on the
 * Huly dashboard already authenticated.
 *
 * Run once:
 *   node scripts/setup-keycloak-client.js
 *
 * Requires (env vars):
 *   KEYCLOAK_ADMIN_USERNAME, KEYCLOAK_ADMIN_PASSWORD   - Keycloak admin credentials
 *
 * Optional (env vars, defaults match the existing BharatTech setup):
 *   KEYCLOAK_BASE_URL     (default: https://keycloak-24-0-5-9yaq.onrender.com)
 *   KEYCLOAK_REALM        (default: bharattech)
 *   KEYCLOAK_ADMIN_REALM  (default: master)
 *   HULY_CLIENT_ID        (default: huly-client)
 *   HULY_HOST_ADDRESS     (default: localhost:8087)  - must match Huly's .env HOST_ADDRESS
 *   HULY_SECURE           (default: "")               - set to "true" if Huly is served over https
 *
 * After it runs, copy the printed OPENID_CLIENT_ID / OPENID_CLIENT_SECRET / OPENID_ISSUER
 * values into huly-selfhost/.env, then `docker compose up -d` to apply.
 */

const KEYCLOAK_BASE_URL = process.env.KEYCLOAK_BASE_URL || "http://localhost:8080";
const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM || "bharattech";
const KEYCLOAK_ADMIN_REALM = process.env.KEYCLOAK_ADMIN_REALM || "master";
const KEYCLOAK_ADMIN_USERNAME = process.env.KEYCLOAK_ADMIN_USERNAME || "admin";
const KEYCLOAK_ADMIN_PASSWORD = process.env.KEYCLOAK_ADMIN_PASSWORD || "admin";

const HULY_CLIENT_ID = process.env.HULY_CLIENT_ID || "huly-client";
const HULY_HOST_ADDRESS = process.env.HULY_HOST_ADDRESS || "localhost:8087";
const HULY_SECURE = process.env.HULY_SECURE === "true";
const HULY_SCHEME = HULY_SECURE ? "https" : "http";
const HULY_ROOT_URL = `${HULY_SCHEME}://${HULY_HOST_ADDRESS}`;
const HULY_REDIRECT_URI = `${HULY_ROOT_URL}/_accounts/auth/openid/callback`;

async function getAdminToken() {
  const res = await fetch(`${KEYCLOAK_BASE_URL}/realms/${KEYCLOAK_ADMIN_REALM}/protocol/openid-connect/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      username: KEYCLOAK_ADMIN_USERNAME,
      password: KEYCLOAK_ADMIN_PASSWORD,
      grant_type: "password",
      client_id: "admin-cli",
    }),
  });

  if (!res.ok) {
    throw new Error(`Admin auth failed (${res.status}): ${await res.text()}`);
  }

  const { access_token } = await res.json();
  return access_token;
}

async function findClient(token) {
  const res = await fetch(
    `${KEYCLOAK_BASE_URL}/admin/realms/${KEYCLOAK_REALM}/clients?clientId=${encodeURIComponent(HULY_CLIENT_ID)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) throw new Error(`Failed to look up client (${res.status}): ${await res.text()}`);
  const clients = await res.json();
  return clients[0] || null;
}

async function createClient(token) {
  const res = await fetch(`${KEYCLOAK_BASE_URL}/admin/realms/${KEYCLOAK_REALM}/clients`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      clientId: HULY_CLIENT_ID,
      name: "Huly",
      protocol: "openid-connect",
      rootUrl: HULY_ROOT_URL,
      publicClient: false,
      standardFlowEnabled: true,
      directAccessGrantsEnabled: false,
      serviceAccountsEnabled: false,
      redirectUris: [HULY_REDIRECT_URI],
      webOrigins: [HULY_ROOT_URL],
    }),
  });

  if (!res.ok) throw new Error(`Failed to create client (${res.status}): ${await res.text()}`);
  return findClient(token);
}

async function ensureRedirectUri(token, client) {
  const redirectUris = client.redirectUris || [];
  const webOrigins = client.webOrigins || [];
  const needsRedirect = !redirectUris.includes(HULY_REDIRECT_URI);
  const needsOrigin = !webOrigins.includes(HULY_ROOT_URL);

  if (!needsRedirect && !needsOrigin) {
    console.log(`  Client "${HULY_CLIENT_ID}" already has the correct redirect URI.`);
    return;
  }

  console.log(`  Updating "${HULY_CLIENT_ID}" redirect URI / web origin...`);
  const res = await fetch(`${KEYCLOAK_BASE_URL}/admin/realms/${KEYCLOAK_REALM}/clients/${client.id}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      ...client,
      redirectUris: needsRedirect ? [...redirectUris, HULY_REDIRECT_URI] : redirectUris,
      webOrigins: needsOrigin ? [...webOrigins, HULY_ROOT_URL] : webOrigins,
    }),
  });
  if (!res.ok) throw new Error(`Failed to update client (${res.status}): ${await res.text()}`);
}

async function getClientSecret(token, client) {
  const res = await fetch(
    `${KEYCLOAK_BASE_URL}/admin/realms/${KEYCLOAK_REALM}/clients/${client.id}/client-secret`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) throw new Error(`Failed to fetch client secret (${res.status}): ${await res.text()}`);
  const { value } = await res.json();
  return value;
}

async function main() {
  if (!KEYCLOAK_ADMIN_USERNAME || !KEYCLOAK_ADMIN_PASSWORD) {
    console.error("Set KEYCLOAK_ADMIN_USERNAME and KEYCLOAK_ADMIN_PASSWORD before running this script.");
    process.exit(1);
  }

  console.log(`\n=== Huly <-> Keycloak client setup ===`);
  console.log(`  Keycloak:      ${KEYCLOAK_BASE_URL}`);
  console.log(`  Realm:         ${KEYCLOAK_REALM}`);
  console.log(`  Client ID:     ${HULY_CLIENT_ID}`);
  console.log(`  Redirect URI:  ${HULY_REDIRECT_URI}\n`);

  const token = await getAdminToken();
  console.log("Authenticated as Keycloak admin.");

  let client = await findClient(token);
  if (client) {
    console.log(`Client "${HULY_CLIENT_ID}" already exists — checking redirect URI.`);
    await ensureRedirectUri(token, client);
  } else {
    console.log(`Creating client "${HULY_CLIENT_ID}"...`);
    client = await createClient(token);
  }

  const secret = await getClientSecret(token, client);

  console.log("\n=== Setup complete ===");
  console.log("Add these to huly-selfhost/.env:\n");
  console.log(`OPENID_CLIENT_ID=${HULY_CLIENT_ID}`);
  console.log(`OPENID_CLIENT_SECRET=${secret}`);
  console.log(`OPENID_ISSUER=${KEYCLOAK_BASE_URL}/realms/${KEYCLOAK_REALM}`);
  console.log("\nThen restart Huly: docker compose up -d");
}

main().catch((err) => {
  console.error("\nSetup failed:", err.message || err);
  process.exit(1);
});
