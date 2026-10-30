const { test } = require("node:test");
const assert = require("node:assert/strict");

// Security report 2026-10-28 lead 2 (owner's F7A): the company's seed script writes six accounts with one shared
// password, two of them Admins, into whatever Keycloak the .env names, and it switched sign-up on for anyone and let
// every website use lms-client. It now works only on this machine's Keycloak and leaves the realm as closed as it was.
const { seedTargetProblem, LMS_CLIENT, NEW_REALM } = require("../scripts/seedKeycloakUsers");

test("only a Keycloak on this machine is seeded, and never from a live server", () => {
  for (const url of ["http://localhost:4000", "http://127.0.0.1:8080", "http://[::1]:4000/"]) {
    assert.equal(seedTargetProblem(url, {}), "", url);
  }
  for (const url of ["https://keycloak-24-0-5-9yaq.onrender.com", "http://192.168.1.20:8080", "http://localhost.evil.example", "not a url", ""]) {
    assert.notEqual(seedTargetProblem(url, {}), "", url);
  }
  assert.notEqual(seedTargetProblem("http://localhost:4000", { NODE_ENV: "production" }), "");
  assert.notEqual(seedTargetProblem("http://localhost:4000", { RENDER: "true" }), "");
});

test("nobody can sign themselves up in a realm it makes, and lms-client takes only the listed local addresses", () => {
  assert.equal(NEW_REALM.registrationAllowed, false);
  assert.ok(!LMS_CLIENT.webOrigins.includes("*"));
  assert.ok(LMS_CLIENT.webOrigins.every((o) => /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(o)), JSON.stringify(LMS_CLIENT.webOrigins));
});

test("loading the script runs nothing: it seeds only when run on its own", () => {
  // the require above would have tried to reach Keycloak and called process.exit
  assert.equal(typeof seedTargetProblem, "function");
});
