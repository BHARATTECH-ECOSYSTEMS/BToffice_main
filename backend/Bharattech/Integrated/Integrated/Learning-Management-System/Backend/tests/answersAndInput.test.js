const { test, before, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const express = require("express");
const mongoose = require("mongoose");

// Review 2026-10-26 low list, "answers and input": an id that can't be a record, or a request with no body (Express 5
// leaves the body undefined then), answered 500 Server Error on many routes; a missing ID file answered JSON labelled
// as a PDF. Now they're a plain 400 and a plain 404.

const { verificationApp } = require("./helpers/verificationApp");
const { mustBeObjectId } = require("../utils/refusal");
const { emptyBody } = require("../middlewares/emptyBody");
const files = verificationApp();

let server;
let root;
const admin = { id: "6a1f00000000000000000001", role: "Admin", email: "admin@example.test" };

before(async () => {
  await files.start();
  const app = express();
  app.use(express.json());
  app.use(emptyBody);
  const signIn = (req, _res, next) => ((req.user = admin), next());
  app.use("/api/user", signIn, require("../routes/userRoutes"));
  app.use("/api/policies", signIn, require("../routes/policyRoutes"));
  app.use("/api/reset-links", signIn, require("../routes/resetLinkRoutes"));
  app.use("/api/resources", signIn, require("../routes/resource"));
  app.use("/api/courses", signIn, require("../routes/courseRoutes"));
  app.use("/api/course-progress", signIn, require("../routes/courseProgressRoutes"));
  app.use("/api/certificates", signIn, require("../routes/certificateRoutes"));
  await new Promise((resolve) => (server = app.listen(0, "127.0.0.1", resolve)));
  root = `http://127.0.0.1:${server.address().port}/api`;
});
beforeEach(() => files.clear());
after(async () => {
  if (server?.listening) await new Promise((resolve) => server.close(resolve));
  await files.stop();
});

const quietly = async (work) => {
  const quiet = [console.log, console.error, console.warn];
  console.log = console.error = console.warn = () => {};
  try {
    return await work();
  } finally {
    [console.log, console.error, console.warn] = quiet;
  }
};

test("an id that can't be a record is a 400 on every route that takes one", async () => {
  for (const [method, url] of [
    ["GET", "/user/not-an-id"],
    ["PATCH", "/user/not-an-id"],
    ["DELETE", "/user/not-an-id"],
    ["GET", "/policies/not-an-id/pdf"],
    ["DELETE", "/policies/not-an-id"],
    ["PATCH", "/reset-links/not-an-id/send"],
    ["POST", "/resources/not-an-id/assign"],
    ["DELETE", "/courses/not-an-id"],
    ["PUT", "/courses/approval/not-an-id"],
    ["POST", "/courses/enroll/not-an-id"],
    ["GET", "/course-progress/not-an-id"],
  ]) {
    const res = await quietly(() => fetch(root + url, { method }));
    assert.equal(res.status, 400, `${method} ${url}`);
    assert.deepEqual(await res.json(), { message: "That id isn't valid." }, `${method} ${url}`);
  }
});

test("the shared check passes a real id on", () => {
  let passed = false;
  mustBeObjectId({}, {}, () => (passed = true), "6a1f00000000000000000001");
  assert.equal(passed, true);
});

test("a request with no body reads as an empty one: a plain 400, not a 500", async () => {
  const res = await quietly(() => fetch(`${root}/certificates/generate`, { method: "POST" }));
  assert.equal(res.status, 400);
  // and server.js reads every body that way, right after parsing JSON
  const serverJs = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");
  assert.match(serverJs, /app\.use\(express\.json\(\)\);\r?\napp\.use\(emptyBody\);/);
});

test("an ID file that's gone is a plain JSON 404, not JSON labelled as a PDF", async () => {
  const { asha } = await files.opened();
  assert.equal((await files.upload(asha, "aadhaar")).status, 200);
  await Promise.all(["idDocuments.files", "idDocuments.chunks"].map((name) => mongoose.connection.db.collection(name).deleteMany({})));
  const res = await files.raw(asha, "GET", "/verification-documents/mine/aadhaar/file");
  assert.equal(res.status, 404);
  assert.match(res.headers.get("content-type"), /^application\/json/);
  assert.equal(res.headers.get("content-disposition"), null);
  assert.deepEqual(await res.json(), { message: "That file isn't there any more." });
});
