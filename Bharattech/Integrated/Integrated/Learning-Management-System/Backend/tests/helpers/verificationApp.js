// The verification and ID-document routers behind a stand-in for keycloakAuth, for tests that upload and tick.
// Use: const app = verificationApp(); before(app.start); beforeEach(app.clear); after(app.stop).
const express = require("express");
const mongoose = require("mongoose");
const { connectTestDb, clearTestDb, disconnectTestDb, userFields } = require("./testDb");

const nodemailer = require("nodemailer");
nodemailer.createTransport = () => ({ sendMail: async () => ({ messageId: "test" }) });
process.env.SMTP_HOST = process.env.SMTP_HOST || "127.0.0.1";

const User = require("../../models/User");
const verificationRoutes = require("../../routes/verificationRoutes");
const idDocumentRoutes = require("../../routes/idDocumentRoutes");

const PDF = Buffer.from("%PDF-1.4\n1 0 obj << /Type /Catalog >> endobj\ntrailer << /Root 1 0 R >>\n%%EOF\n");

const verificationApp = () => {
  let server;
  let root;
  const header = (p) => ({ "x-test-user": JSON.stringify({ id: String(p._id), role: p.role, email: p.email, fullName: p.fullName }) });
  const app = {
    start: async () => {
      await connectTestDb();
      const web = express();
      web.use(express.json());
      const signIn = (req, _res, next) => {
        req.user = JSON.parse(req.get("x-test-user"));
        next();
      };
      web.use("/api/verifications", signIn, verificationRoutes);
      web.use("/api/verification-documents", signIn, idDocumentRoutes);
      await new Promise((resolve) => (server = web.listen(0, "127.0.0.1", resolve)));
      root = `http://127.0.0.1:${server.address().port}/api`;
    },
    clear: async () => {
      await clearTestDb();
      // the file store's own collections aren't models, so clearTestDb doesn't reach them
      await Promise.all(["idDocuments.files", "idDocuments.chunks"].map((name) => mongoose.connection.db.collection(name).deleteMany({})));
    },
    stop: async () => {
      if (server?.listening) await new Promise((resolve) => server.close(resolve));
      await disconnectTestDb();
    },
    call: async (who, method, path, body) => {
      const res = await fetch(root + path, { method, headers: { "Content-Type": "application/json", ...header(who) }, body: body === undefined ? undefined : JSON.stringify(body) });
      const text = await res.text();
      return { status: res.status, body: text ? JSON.parse(text) : null };
    },
    /** The answer itself, for its headers. */
    raw: (who, method, path) => fetch(root + path, { method, headers: header(who) }),
    upload: async (who, kind, file = PDF, fileName = `${kind} scan.pdf`) => {
      const form = new FormData();
      form.append("file", new Blob([file], { type: "application/pdf" }), fileName);
      const res = await fetch(`${root}/verification-documents/mine/${kind}`, { method: "PUT", headers: header(who), body: form });
      const text = await res.text();
      return { status: res.status, body: text ? JSON.parse(text) : null };
    },
    storedFiles: () => mongoose.connection.db.collection("idDocuments.files").find().toArray(),
    /** An admin and an employee whose verification HR has opened; returns { admin, asha, id }. */
    opened: async () => {
      const admin = await User.create(userFields({ role: "Admin", fullName: "Test Admin" }));
      const asha = await User.create(userFields({ role: "Employee", fullName: "Asha Rao" }));
      const res = await app.call(admin, "POST", "/verifications", { kind: "employee", personId: String(asha._id) });
      if (res.status !== 201) throw new Error(`opening the verification: ${res.status} ${JSON.stringify(res.body)}`);
      return { admin, asha, id: res.body.id };
    },
  };
  return app;
};

module.exports = { verificationApp, PDF };
