const { test, before, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const express = require("express");
const Policy = require("../models/Policy");
const { uploadPolicyPdf } = require("../middlewares/uploadPolicy");
const { createPolicy, streamPolicyPdf, streamPolicyPdfFile, deletePolicy } = require("../controllers/policyController");
const { connectTestDb, clearTestDb, disconnectTestDb } = require("./helpers/testDb");

const DISK_DIR = path.join(__dirname, "..", "uploads", "policies");
const PDF = Buffer.from("%PDF-1.4\n1 0 obj << /Type /Catalog >> endobj\ntrailer << /Root 1 0 R >>\n%%EOF\n");

let server;
let base;

before(async () => {
  await connectTestDb();
  // the real upload handling and controllers behind a stand-in for keycloakAuth (an admin is signed in)
  const app = express();
  app.use((req, res, next) => {
    req.user = { id: "64b7f0f0f0f0f0f0f0f0f0f1", role: "Admin", email: "admin@example.test", fullName: "Test Admin", decoded: { preferred_username: "test.admin" } };
    next();
  });
  app.post("/policies", uploadPolicyPdf, createPolicy);
  app.get("/policies/:id/pdf", streamPolicyPdf);
  app.get("/policies/file/:filename", streamPolicyPdfFile);
  app.delete("/policies/:id", deletePolicy);
  await new Promise((resolve) => (server = app.listen(0, "127.0.0.1", resolve)));
  base = `http://127.0.0.1:${server.address().port}`;
});
beforeEach(clearTestDb);
after(async () => {
  // the server may never have started (a setup failure); don't wait for one that isn't there
  if (server?.listening) await new Promise((resolve) => server.close(resolve));
  await disconnectTestDb();
});

const upload = (file, { type = "application/pdf", name = "Leave Policy", fileName = "leave policy.pdf" } = {}) => {
  const form = new FormData();
  form.append("name", name);
  form.append("pages", "4");
  form.append("category", "Policies");
  form.append("pdf", new Blob([file], { type }), fileName);
  return fetch(`${base}/policies`, { method: "POST", body: form });
};
const diskFiles = () => (fs.existsSync(DISK_DIR) ? fs.readdirSync(DISK_DIR) : []);

test("an uploaded PDF is kept in the database, not on the server's disk, and opens again byte for byte", async () => {
  const onDiskBefore = diskFiles();

  const res = await upload(PDF);
  const policy = await res.json();

  assert.equal(res.status, 201);
  assert.equal(policy.name, "Leave Policy");
  assert.equal(policy.pdfName, "leave policy.pdf");
  assert.deepEqual(diskFiles(), onDiskBefore);

  const opened = await fetch(`${base}/policies/${policy._id}/pdf`);
  assert.equal(opened.status, 200);
  assert.equal(opened.headers.get("content-type"), "application/pdf");
  assert.deepEqual(Buffer.from(await opened.arrayBuffer()), PDF);
});

test("a file that only claims to be a PDF is refused, and nothing is saved", async () => {
  const res = await upload(Buffer.from("just some text, not a PDF"), { fileName: "fake.pdf" });

  assert.equal(res.status, 400);
  assert.match((await res.json()).message, /PDF/);
  assert.equal(await Policy.countDocuments(), 0);
});

test("a file that isn't a PDF type is refused", async () => {
  const res = await upload(PDF, { type: "text/plain", fileName: "notes.txt" });

  assert.equal(res.status, 400);
  assert.match((await res.json()).message, /PDF/);
});

test("a file over 20 MB is refused before it fills the server", async () => {
  const big = Buffer.concat([PDF, Buffer.alloc(20 * 1024 * 1024)]);

  const res = await upload(big);

  assert.equal(res.status, 413);
  assert.match((await res.json()).message, /20 MB/);
  assert.equal(await Policy.countDocuments(), 0);
});

test("a document saved on disk before this change still opens", async () => {
  fs.mkdirSync(DISK_DIR, { recursive: true });
  const stored = `test-legacy-${Date.now()}.pdf`;
  fs.writeFileSync(path.join(DISK_DIR, stored), PDF);
  try {
    const policy = await Policy.create({ name: "Old", pdfUrl: `/uploads/policies/${stored}`, pdfName: "old.pdf", storedFileName: stored, pages: 1, category: "Policies", uploadedBy: "Admin" });

    const opened = await fetch(`${base}/policies/${policy._id}/pdf`);

    assert.equal(opened.status, 200);
    assert.deepEqual(Buffer.from(await opened.arrayBuffer()), PDF);
  } finally {
    fs.rmSync(path.join(DISK_DIR, stored), { force: true });
  }
});

test("deleting a document deletes its stored file too", async () => {
  const policy = await (await upload(PDF)).json();

  assert.equal((await fetch(`${base}/policies/${policy._id}`, { method: "DELETE" })).status, 200);

  const files = await Policy.db.collection("policyFiles.files").countDocuments({ filename: policy.storedFileName });
  assert.equal(files, 0);
  assert.equal((await fetch(`${base}/policies/${policy._id}/pdf`)).status, 404);
});

test("a file name that points at a folder is refused, and the server keeps answering", async () => {
  // security report 2026-10-28 lead 9: "..", typed twice-encoded, opened the uploads folder itself as a file, and the
  // read error stopped the whole backend
  fs.mkdirSync(DISK_DIR, { recursive: true });

  // each reaches the controller as a name that ends in "." or ".."
  for (const name of ["%252E%252E", "%252E", "%2e%2e%2f%2e%2e"]) {
    assert.equal((await fetch(`${base}/policies/file/${name}`)).status, 400, name);
  }
  assert.equal((await fetch(`${base}/policies/file/missing.pdf`)).status, 404);
});

test("a stored name that turns out to be a folder on disk opens nothing and the server keeps answering", async () => {
  fs.mkdirSync(DISK_DIR, { recursive: true });
  const policy = await Policy.create({ name: "Odd", pdfUrl: "/uploads/policies/.", pdfName: "odd.pdf", storedFileName: ".", pages: 1, category: "Policies", uploadedBy: "Admin" });

  assert.equal((await fetch(`${base}/policies/${policy._id}/pdf`)).status, 404);
  assert.equal((await fetch(`${base}/policies/file/missing.pdf`)).status, 404);
});
