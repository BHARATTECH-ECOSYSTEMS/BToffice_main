const { test, before, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");
const User = require("../models/User");
const Certificate = require("../models/Certificate");
const { myCertificates, certificatePdf, pdfDetails } = require("../controllers/certificateAccessController");
const { issueDateText } = require("../utils/generateCertifcate");
const { connectTestDb, clearTestDb, disconnectTestDb, userFields } = require("./helpers/testDb");

before(connectTestDb);
beforeEach(clearTestDb);
after(disconnectTestDb);

/** Calls a controller as Express would; `sent` is the JSON or the raw body (a PDF). */
const call = async (controller, req) => {
  const res = {
    statusCode: 200,
    headers: {},
    sent: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    set(name, value) {
      this.headers[name.toLowerCase()] = value;
      return this;
    },
    json(body) {
      this.sent = body;
      return this;
    },
    send(body) {
      this.sent = body;
      return this;
    },
  };
  await controller(req, res);
  return res;
};

/** What keycloakAuth puts on req.user for a signed-in person. */
const signedIn = (person) => ({
  user: { role: person.role, keycloakId: person.keycloakId, email: person.email, decoded: { sub: person.keycloakId, email: person.email, name: person.fullName, realm_access: { roles: [person.role] } } },
});

const issue = (person, issuer, overrides = {}) =>
  Certificate.create({ userId: person._id, issuedBy: issuer._id, title: "Bonafide Certificate", filePath: "/certificates/old-file.pdf", ...overrides });

test("my certificates are the ones issued to me, not to someone with the same name", async () => {
  const admin = await User.create(userFields({ role: "Admin", fullName: "Test Admin" }));
  const me = await User.create(userFields({ fullName: "Rahul Sharma", email: "rahul.one@example.test", username: "rahul.one" }));
  const namesake = await User.create(userFields({ fullName: "Rahul Sharma", email: "rahul.two@example.test", username: "rahul.two" }));
  const mine = await issue(me, admin, { title: "Character Certificate" });
  await issue(namesake, admin, { title: "Transfer Certificate" });

  const res = await call(myCertificates, signedIn(me));

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.sent.certificates.map((c) => String(c._id)), [String(mine._id)]);
  assert.equal(res.sent.count, 1);
});

test("someone with no certificates gets an empty list", async () => {
  const me = await User.create(userFields());
  const res = await call(myCertificates, signedIn(me));
  assert.deepEqual([res.statusCode, res.sent.count, res.sent.certificates], [200, 0, []]);
});

test("the person a certificate was issued to can open it as a PDF", async () => {
  const admin = await User.create(userFields({ role: "Admin" }));
  const me = await User.create(userFields({ fullName: "Asha Rao" }));
  const cert = await issue(me, admin);

  const res = await call(certificatePdf, { ...signedIn(me), params: { id: String(cert._id) } });

  assert.equal(res.statusCode, 200);
  assert.equal(res.headers["content-type"], "application/pdf");
  assert.equal(Buffer.from(res.sent).subarray(0, 5).toString(), "%PDF-");
});

test("it opens even though the saved file is gone, because it is made fresh", async () => {
  const admin = await User.create(userFields({ role: "Admin" }));
  const me = await User.create(userFields());
  // the stored path points at a file that doesn't exist, as after a server restart
  const cert = await issue(me, admin, { filePath: "/certificates/wiped-by-restart.pdf" });

  const res = await call(certificatePdf, { ...signedIn(me), params: { id: String(cert._id) } });

  assert.equal(res.statusCode, 200);
});

test("admins and superadmins can open anyone's certificate", async () => {
  const admin = await User.create(userFields({ role: "Admin" }));
  const superadmin = await User.create(userFields({ role: "Superadmin" }));
  const person = await User.create(userFields());
  const cert = await issue(person, admin);

  for (const viewer of [admin, superadmin]) {
    assert.equal((await call(certificatePdf, { ...signedIn(viewer), params: { id: String(cert._id) } })).statusCode, 200, viewer.role);
  }
});

test("anyone else can't open someone else's certificate", async () => {
  const admin = await User.create(userFields({ role: "Admin" }));
  const owner = await User.create(userFields());
  const cert = await issue(owner, admin);

  for (const role of ["Employee", "Intern", "Subadmin"]) {
    const other = await User.create(userFields({ role }));
    const res = await call(certificatePdf, { ...signedIn(other), params: { id: String(cert._id) } });
    assert.equal(res.statusCode, 403, role);
    assert.notEqual(res.headers["content-type"], "application/pdf");
  }
});

test("an unknown or malformed certificate id is answered plainly", async () => {
  const me = await User.create(userFields());
  assert.equal((await call(certificatePdf, { ...signedIn(me), params: { id: "64b7f0f0f0f0f0f0f0f0f0f0" } })).statusCode, 404);
  assert.equal((await call(certificatePdf, { ...signedIn(me), params: { id: "not-an-id" } })).statusCode, 400);
});

test("the fresh PDF carries the original issue date and number, not today's", async () => {
  const admin = await User.create(userFields({ role: "Admin" }));
  const me = await User.create(userFields({ fullName: "Asha Rao", role: "Employee", email: "asha@example.test", username: "asha" }));
  const issuedAt = new Date("2026-03-05T10:00:00Z");
  const cert = await issue(me, admin, { title: "Course Completion", certificateNumber: "CERT-1-2", issuedAt });

  assert.deepEqual(pdfDetails(cert, me), {
    name: "Asha Rao",
    title: "Course Completion",
    certificateNumber: "CERT-1-2",
    role: "Employee",
    email: "asha@example.test",
    username: "asha",
    issuedAt,
  });
});

test("issue dates read the way the certificate prints them", () => {
  assert.equal(issueDateText(new Date("2026-03-05T10:00:00Z")), "05 March 2026");
});

/** The plain-font text drawn in a PDF made by pdf-lib: its page streams are deflated and its text is hex. */
const pdfText = (bytes) => {
  const raw = Buffer.from(bytes).toString("latin1");
  let text = "";
  for (const [, body] of raw.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)) {
    try {
      const content = require("zlib").inflateSync(Buffer.from(body, "latin1")).toString("latin1");
      for (const [, hex] of content.matchAll(/<([0-9A-Fa-f]+)>\s*Tj/g)) text += `${Buffer.from(hex, "hex").toString("latin1")}\n`;
    } catch {
      // not a deflated stream (an embedded font, say)
    }
  }
  return text;
};

test("a certificate opened months later still prints the day it was issued", async () => {
  const { buildCertificatePdf } = require("../utils/generateCertifcate");
  const pdf = await buildCertificatePdf({ name: "Asha Rao", title: "Bonafide Certificate", certificateNumber: "CERT-TEST-1", role: "Employee", email: "asha@example.test", issuedAt: new Date("2026-03-05T10:00:00Z") });
  const text = pdfText(pdf);

  assert.match(text, /05 March 2026/);
  assert.match(text, /CERT-TEST-1/);
  assert.doesNotMatch(text, new RegExp(issueDateText(new Date())));
});
