const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { builtinModules } = require("module");
const express = require("express");

// Step 17 Part 3 (owner's 3A 4A 5A 6A 7A): every request is signed in exactly once, policy PDFs need a sign-in, the
// files nothing loads any more are gone, package.json lists exactly what the code uses, and the Node version Render
// runs (24) is allowed.

const { keycloakAuth, requireAdmin, requireSuperAdmin } = require("../middlewares/keycloakAuth");

const BACKEND = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(BACKEND, file), "utf8");
const exists = (file) => fs.existsSync(path.join(BACKEND, file));
const filesIn = (dir) => fs.readdirSync(path.join(BACKEND, dir)).filter((f) => f.endsWith(".js")).map((f) => `${dir}/${f}`);

/** Each route of a router with the functions that handle it, in order. */
const routesOf = (router) =>
  router.stack
    .filter((layer) => layer.route)
    .map((layer) => ({
      name: `${Object.keys(layer.route.methods)[0].toUpperCase()} ${layer.route.path}`,
      handlers: layer.route.stack.map((s) => s.handle),
    }));

// mounted in server.js as app.use(<path>, keycloakAuth, <router>), so their requests are already signed in
const SIGNED_IN_BY_SERVER = {
  "/api/user": "userRoutes",
  "/api/certificates": "certificateRoutes",
  "/api/admin": "adminRoutes",
  "/api/courses": "courseRoutes",
  "/api/course-progress": "courseProgressRoutes",
  "/api/ai-assistant": "librechatBridge",
};

test("server.js signs in every request to these routes before they run", () => {
  const server = read("server.js");
  for (const [mount, router] of Object.entries(SIGNED_IN_BY_SERVER)) {
    assert.match(server, new RegExp(`app\\.use\\("${mount}", keycloakAuth, ${router}\\);`), mount);
  }
});

test("routes server.js already signs in don't check the sign-in a second time", () => {
  for (const router of Object.values(SIGNED_IN_BY_SERVER)) {
    for (const route of routesOf(require(`../routes/${router}`))) {
      assert.equal(route.handlers.filter((h) => h === keycloakAuth).length, 0, `${router}: ${route.name}`);
    }
  }
  // the admin checks stay where they were
  const admin = routesOf(require("../routes/adminRoutes"));
  for (const route of admin) assert.ok(route.handlers.some((h) => h === requireAdmin || h === requireSuperAdmin), route.name);
});

// mounted without keycloakAuth in server.js: each route signs in itself, apart from these public ones
const PUBLIC = {
  authRoutes: ["POST /keycloak-login", "POST /accept-invite", "POST /forgot-password", "POST /reset-password"],
  resetLinkRoutes: ["POST /use"],
  inviteRoutes: [],
  openInterviewerRoutes: [],
  policyRoutes: [],
};

test("routes that sign in themselves do it once, and only the public ones don't", () => {
  for (const [router, open] of Object.entries(PUBLIC)) {
    for (const route of routesOf(require(`../routes/${router}`))) {
      const checks = route.handlers.filter((h) => h === keycloakAuth).length;
      assert.equal(checks, open.includes(route.name) ? 0 : 1, `${router}: ${route.name}`);
    }
  }
});

let server;
let base;
before(async () => {
  // the real routes and the real sign-in check
  const app = express();
  app.use("/api/policies", require("../routes/policyRoutes"));
  await new Promise((resolve) => (server = app.listen(0, "127.0.0.1", resolve)));
  base = `http://127.0.0.1:${server.address().port}/api/policies`;
});
after(async () => {
  if (server?.listening) await new Promise((resolve) => server.close(resolve));
});

test("a policy PDF doesn't open without a sign-in, by its id or its file name", async () => {
  for (const address of [`${base}/64b7f0f0f0f0f0f0f0f0f0f1/pdf`, `${base}/file/1700000000000-leave.pdf`]) {
    const res = await fetch(address);
    assert.equal(res.status, 401, address);
    assert.equal(res.headers.get("content-type").includes("pdf"), false);
  }
  // server.js no longer opens one by itself ahead of the routes
  assert.doesNotMatch(read("server.js"), /app\.get\("\/api\/policies/);
});

test("the files nothing loads any more are gone", () => {
  for (const file of [
    "controllers/certificateController.js",
    "middlewares/authMiddleware.js",
    "middlewares/security.middleware.js",
    "routes/passwordResetRoutes.js",
    "utils/generateToken.js",
    "models/EmailVerification.js",
    "models/SignupRequest.js",
    // made local accounts with passwords written in the file; nothing signs in with those since Part 1
    "scripts/createTestUsers.js",
  ]) {
    assert.equal(exists(file), false, file);
  }
  assert.equal("checkActiveAdminSession" in require("../middlewares/keycloakAuth"), false);
  assert.equal("canCreateRole" in require("../controllers/userController"), false);
});

// every package a backend file loads by name (tests excluded: they only use what the backend has)
const CODE = ["server.js", ...["routes", "controllers", "middlewares", "utils", "models", "config", "scripts"].flatMap(filesIn)];
const packagesLoaded = () => {
  const found = new Set();
  for (const file of CODE) {
    for (const [, name] of read(file).matchAll(/require\(\s*["']([^"'.][^"']*)["']\s*\)/g)) {
      if (name.startsWith("node:") || builtinModules.includes(name.split("/")[0])) continue;
      found.add(name.startsWith("@") ? name.split("/").slice(0, 2).join("/") : name.split("/")[0]);
    }
  }
  return found;
};

test("package.json lists exactly the packages the backend loads", () => {
  const { dependencies } = JSON.parse(read("package.json"));
  const loaded = packagesLoaded();
  assert.deepEqual([...loaded].filter((name) => !(name in dependencies)).sort(), [], "loaded but not listed");
  assert.deepEqual(Object.keys(dependencies).filter((name) => !loaded.has(name)).sort(), [], "listed but never loaded");
});

test("nodemailer is a version without the known address and header holes", () => {
  const [major, minor, patch] = require("nodemailer/package.json").version.split(".").map(Number);
  // 10.1.4 fixed the last known ones (recipients read from inside quoted text or comments)
  assert.ok(major > 10 || (major === 10 && (minor > 1 || (minor === 1 && patch >= 4))), `nodemailer ${major}.${minor}.${patch}`);
});

test("the Node versions the backend runs on are stated: 22.12 and newer, so Render's 24 too", () => {
  assert.deepEqual(JSON.parse(read("package.json")).engines, { node: ">=22.12" });
});

test("updates ask for the changed record the way current Mongoose expects", () => {
  // `new: true` still works but makes Mongoose 9.11+ print a deprecation warning on every update
  for (const file of CODE) assert.doesNotMatch(read(file), /\bnew: true\b/, file);
});
