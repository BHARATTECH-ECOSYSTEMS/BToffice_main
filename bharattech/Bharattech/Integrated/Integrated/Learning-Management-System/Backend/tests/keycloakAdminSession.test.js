const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createKeycloakAdminSession } = require("../utils/keycloakAdminSession");

const CREDENTIALS = { username: "admin", password: "test-only", grantType: "password", clientId: "admin-cli" };

/** A token whose exp claim is `expSeconds` (seconds since 1970); only exp is read. */
const jwt = (expSeconds) => `h.${Buffer.from(JSON.stringify({ exp: expSeconds })).toString("base64url")}.s`;

/** Stands in for keycloak-admin's client: counts logins, and each login sets a token valid for `lifetimeS`. */
const fakeClient = (clock, lifetimeS = 60) => {
  const client = {
    logins: 0,
    fail: false,
    accessToken: undefined,
    async auth(credentials) {
      assert.deepEqual(credentials, CREDENTIALS);
      client.logins += 1;
      await new Promise((r) => setTimeout(r, 5));
      if (client.fail) throw new Error("Keycloak unreachable");
      client.accessToken = lifetimeS === null ? "not-a-jwt" : jwt(Math.floor(clock.now / 1000) + lifetimeS);
    },
  };
  return client;
};

test("logs in once and reuses the login while its token is still valid", async () => {
  const clock = { now: 1_000_000_000_000 };
  const client = fakeClient(clock);
  const ensureLoggedIn = createKeycloakAdminSession(client, CREDENTIALS, () => clock.now);

  await ensureLoggedIn();
  clock.now += 30_000;
  await ensureLoggedIn();

  assert.equal(client.logins, 1);
});

test("logs in again shortly before the token expires", async () => {
  const clock = { now: 1_000_000_000_000 };
  const client = fakeClient(clock, 60);
  const ensureLoggedIn = createKeycloakAdminSession(client, CREDENTIALS, () => clock.now);

  await ensureLoggedIn();
  clock.now += 55_000; // 5 s left: too close to rely on
  await ensureLoggedIn();

  assert.equal(client.logins, 2);
});

test("requests arriving together share one login", async () => {
  const clock = { now: 1_000_000_000_000 };
  const client = fakeClient(clock);
  const ensureLoggedIn = createKeycloakAdminSession(client, CREDENTIALS, () => clock.now);

  await Promise.all([ensureLoggedIn(), ensureLoggedIn(), ensureLoggedIn()]);

  assert.equal(client.logins, 1);
});

test("a failed login is reported, and the next request tries again", async () => {
  const clock = { now: 1_000_000_000_000 };
  const client = fakeClient(clock);
  const ensureLoggedIn = createKeycloakAdminSession(client, CREDENTIALS, () => clock.now);

  client.fail = true;
  await assert.rejects(ensureLoggedIn(), /unreachable/);
  client.fail = false;
  await ensureLoggedIn();

  assert.equal(client.logins, 2);
});

test("a token whose expiry can't be read is never reused", async () => {
  const clock = { now: 1_000_000_000_000 };
  const client = fakeClient(clock, null);
  const ensureLoggedIn = createKeycloakAdminSession(client, CREDENTIALS, () => clock.now);

  await ensureLoggedIn();
  await ensureLoggedIn();

  assert.equal(client.logins, 2);
});
