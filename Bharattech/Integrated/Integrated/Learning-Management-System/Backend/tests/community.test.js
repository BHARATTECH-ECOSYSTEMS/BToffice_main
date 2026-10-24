const { test, before, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const mongoose = require("mongoose");

// A stand-in for the Keycloak admin client, put in place before the controllers load it. It records every change.
const kc = { updates: [], logouts: [], calls: 0, missing: new Set(), updateError: null, logoutError: null };
class FakeKcAdminClient {
  constructor() {
    this.users = {
      findOne: async ({ id }) => {
        kc.calls += 1;
        if (kc.missing.has(id)) return null;
        return { id, username: `user-${id}`, email: `${id}@example.test`, emailVerified: true, enabled: true, firstName: "Asha", lastName: "Rao", attributes: { phone: ["+91 1"] } };
      },
      update: async (where, rep) => {
        kc.calls += 1;
        if (kc.updateError) throw kc.updateError;
        kc.updates.push([where.id, rep]);
      },
      logout: async ({ id }) => {
        kc.calls += 1;
        if (kc.logoutError) throw kc.logoutError;
        kc.logouts.push(id);
      },
      find: async () => ((kc.calls += 1), []),
    };
    this.roles = { findOneByName: async () => ((kc.calls += 1), null) };
  }
  async auth() {}
}
require.cache[require.resolve("keycloak-admin")] = { id: "keycloak-admin", loaded: true, exports: { default: FakeKcAdminClient } };

const User = require("../models/User");
const Verification = require("../models/Verification");
const communityRoutes = require("../routes/communityRoutes");
const { getDirectory } = require("../controllers/userController");
const { sendInvite } = require("../controllers/inviteController");
const { getOrCreateUser, inactiveReason } = require("../middlewares/keycloakAuth");
const { deleteDueIdDocuments, ID_RETENTION_DAYS } = require("../utils/leaverDocuments");
const { imageStore } = require("../utils/userPhotos");
const { todayInIndia } = require("../utils/days");
const { connectTestDb, clearTestDb, disconnectTestDb, userFields } = require("./helpers/testDb");

let server;
let root;

// The real routers behind a stand-in for keycloakAuth (server.js signs everyone in first).
before(async () => {
  await connectTestDb();
  const app = express();
  app.use(express.json());
  const signIn = (req, _res, next) => {
    req.user = JSON.parse(req.get("x-test-user"));
    next();
  };
  app.use("/api/community", signIn, communityRoutes);
  app.get("/api/user/directory", signIn, getDirectory);
  app.post("/api/invite", signIn, sendInvite);
  await new Promise((resolve) => (server = app.listen(0, "127.0.0.1", resolve)));
  root = `http://127.0.0.1:${server.address().port}/api`;
});
beforeEach(async () => {
  await clearTestDb();
  // the file store's own collections aren't models, so clearTestDb doesn't reach them
  await Promise.all(["idDocuments.files", "idDocuments.chunks"].map((name) => mongoose.connection.db.collection(name).deleteMany({})));
  Object.assign(kc, { updates: [], logouts: [], calls: 0, missing: new Set(), updateError: null, logoutError: null });
});
after(async () => {
  if (server?.listening) await new Promise((resolve) => server.close(resolve));
  await disconnectTestDb();
});

const header = (p) => ({ "x-test-user": JSON.stringify({ id: String(p._id), role: p.role, email: p.email, fullName: p.fullName, keycloakId: p.keycloakId }) });
const call = async (who, method, path, body) => {
  const res = await fetch(root + path, { method, headers: { "Content-Type": "application/json", ...header(who) }, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
};
const leave = (who, person) => call(who, "POST", `/community/leave/${person._id}`);
const bringBack = (who, person) => call(who, "POST", `/community/members/${person._id}/back`);
const members = async (who) => (await call(who, "GET", "/community/members")).body;
const directoryIds = async (who) => (await call(who, "GET", "/user/directory")).body.map((p) => p.id ?? p._id);

/** "YYYY-MM-DD" n days before `day`, counted on the calendar. */
const daysBefore = (day, n) => {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d - n)).toISOString().slice(0, 10);
};

const people = async () => ({
  superadmin: await User.create(userFields({ role: "Superadmin", fullName: "Sana Iyer", stream: "hr" })),
  admin: await User.create(userFields({ role: "Admin", fullName: "Test Admin", stream: "hr" })),
  subadmin: await User.create(userFields({ role: "Subadmin", fullName: "Test Subadmin", stream: "operations" })),
  asha: await User.create(userFields({ role: "Employee", fullName: "Asha Rao", stream: "tech" })),
  kabir: await User.create(userFields({ role: "Intern", fullName: "Kabir Das", stream: "finance" })),
});
/** Someone who already left on `leftOn`, as the leave route leaves them. */
const formerColleague = (overrides = {}) =>
  User.create(userFields({ role: "Employee", stream: "tech", isDeleted: true, deletedAt: new Date(), leftOn: todayInIndia(), ...overrides }));

/* ── Marking someone as left ── */

test("an admin marks an employee as left: they leave People, join their stream's community, and can't sign in", async () => {
  const p = await people();
  const res = await leave(p.admin, p.asha);
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.deepEqual(res.body.member, { id: String(p.asha._id), name: "Asha Rao", stream: "tech", leftOn: todayInIndia() });

  const saved = await User.findById(p.asha._id).lean();
  assert.equal(saved.isDeleted, true);
  assert.equal(saved.leftOn, todayInIndia());
  assert.ok(saved.deletedAt instanceof Date);
  assert.equal(saved.employeeId, p.asha.employeeId, "they keep their Employee ID");

  // Keycloak: switched off (not deleted), the rest of the account sent back unchanged, every session ended
  assert.equal(kc.updates.length, 1);
  const [kcId, rep] = kc.updates[0];
  assert.equal(kcId, p.asha.keycloakId);
  assert.equal(rep.enabled, false);
  assert.deepEqual([rep.username, rep.email, rep.firstName, rep.lastName, rep.attributes], [`user-${kcId}`, `${kcId}@example.test`, "Asha", "Rao", { phone: ["+91 1"] }]);
  assert.deepEqual(kc.logouts, [p.asha.keycloakId]);

  assert.ok(!(await directoryIds(p.admin)).includes(String(p.asha._id)), "gone from People");
  assert.deepEqual((await members(p.kabir)).map((m) => m.id), [String(p.asha._id)], "in the community");
  assert.ok(inactiveReason(saved), "a token they still hold is refused");
});

test("who may mark someone as left follows who may delete them", async () => {
  const p = await people();
  const refused = [
    [p.subadmin, p.asha],
    [p.asha, p.kabir],
    [p.kabir, p.asha],
    [p.admin, p.superadmin],
    [p.superadmin, await User.create(userFields({ role: "Superadmin", stream: "hr" }))],
    [p.admin, await User.create(userFields({ role: "Admin", stream: "hr" }))],
  ];
  for (const [who, whom] of refused) {
    const res = await leave(who, whom);
    assert.equal(res.status, 403, `${who.role} → ${whom.role}`);
    assert.equal((await User.findById(whom._id).lean()).isDeleted, false);
  }
  assert.equal(kc.calls, 0, "Keycloak isn't touched when the answer is no");

  for (const [who, whom] of [
    [p.superadmin, p.admin],
    [p.admin, p.subadmin],
    [p.admin, p.kabir],
  ]) {
    assert.equal((await leave(who, whom)).status, 200, `${who.role} → ${whom.role}`);
  }
});

test("nobody marks themselves as left", async () => {
  const p = await people();
  const res = await leave(p.superadmin, p.superadmin);
  assert.equal(res.status, 403);
  assert.match(res.body.message, /yourself/);
  assert.equal(kc.calls, 0);
});

test("someone without a stream can't be marked as left until it's set, since the stream picks their community", async () => {
  const p = await people();
  const noStream = await User.create(userFields({ role: "Employee" }));
  const res = await leave(p.admin, noStream);
  assert.equal(res.status, 400);
  assert.match(res.body.message, /stream/i);
  assert.equal((await User.findById(noStream._id).lean()).isDeleted, false);
  assert.equal(kc.calls, 0);
});

test("a bad id, an unknown person, someone deleted or someone who already left can't be marked as left", async () => {
  const p = await people();
  assert.equal((await call(p.admin, "POST", "/community/leave/not-an-id")).status, 400);
  assert.equal((await call(p.admin, "POST", `/community/leave/${new mongoose.Types.ObjectId()}`)).status, 404);
  const deleted = await User.create(userFields({ role: "Employee", stream: "tech", isDeleted: true, deletedAt: new Date() }));
  assert.equal((await leave(p.admin, deleted)).status, 404);
  const former = await formerColleague({ leftOn: "2026-01-31" });
  assert.equal((await leave(p.admin, former)).status, 404);
  assert.equal((await User.findById(former._id).lean()).leftOn, "2026-01-31", "the first leaving day stays");
  assert.equal(kc.calls, 0);
});

test("when Keycloak can't switch the account off, nothing changes", async () => {
  const p = await people();
  kc.updateError = Object.assign(new Error("connect ECONNREFUSED"), { response: { status: 503 } });
  const res = await leave(p.admin, p.asha);
  assert.equal(res.status, 502);
  assert.ok(!/ECONNREFUSED/.test(res.body.message), "no internal error text");
  const saved = await User.findById(p.asha._id).lean();
  assert.equal(saved.isDeleted, false);
  assert.equal(saved.leftOn, undefined);
  assert.deepEqual(await members(p.admin), []);
});

test("a Keycloak account that's already gone doesn't stop someone leaving", async () => {
  const p = await people();
  kc.missing.add(p.asha.keycloakId);
  assert.equal((await leave(p.admin, p.asha)).status, 200);
  assert.equal(kc.updates.length, 0);
  assert.equal((await User.findById(p.asha._id).lean()).isDeleted, true);
});

test("if ending their sessions fails, they have still left (their account is off, and the backend refuses them)", async () => {
  const p = await people();
  kc.logoutError = new Error("timeout");
  assert.equal((await leave(p.admin, p.asha)).status, 200);
  assert.equal((await User.findById(p.asha._id).lean()).isDeleted, true);
  assert.equal(kc.updates[0][1].enabled, false);
});

/* ── The members wall ── */

test("everyone signed in sees the members' name, stream and leaving day, newest first; only admins see more", async () => {
  const p = await people();
  const neha = await formerColleague({ fullName: "Neha Kapoor", leftOn: "2026-06-30", personalEmail: "neha.home@example.net" });
  const vikram = await formerColleague({ fullName: "Vikram Joshi", stream: "operations", leftOn: "2026-08-14" });
  // deleted with the Delete button: not a member
  await User.create(userFields({ role: "Employee", stream: "tech", isDeleted: true, deletedAt: new Date() }));

  const plain = [
    { id: String(vikram._id), name: "Vikram Joshi", stream: "operations", leftOn: "2026-08-14" },
    { id: String(neha._id), name: "Neha Kapoor", stream: "tech", leftOn: "2026-06-30" },
  ];
  for (const who of [p.asha, p.kabir, p.subadmin]) assert.deepEqual(await members(who), plain, who.role);
  for (const who of [p.admin, p.superadmin]) {
    assert.deepEqual(await members(who), [
      { ...plain[0], employeeId: vikram.employeeId, personalEmail: "", canBringBack: true },
      { ...plain[1], employeeId: neha.employeeId, personalEmail: "neha.home@example.net", canBringBack: true },
    ]);
  }
});

test("admins are told whom they may bring back: an Admin who left only by a Super Admin", async () => {
  const p = await people();
  await formerColleague({ role: "Admin", fullName: "Former Admin" });
  assert.equal((await members(p.admin))[0].canBringBack, false);
  assert.equal((await members(p.superadmin))[0].canBringBack, true);
});

/* ── Bringing someone back ── */

test("an admin brings back someone marked as left by mistake: same Employee ID, account on again, back in People", async () => {
  const p = await people();
  await call(p.asha, "PUT", "/community/me/personal-email", { personalEmail: "asha.home@example.net" });
  await leave(p.admin, p.asha);
  kc.updates = [];

  const res = await bringBack(p.admin, p.asha);
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.equal(res.body.needsInvite, false);
  const saved = await User.findById(p.asha._id).lean();
  assert.equal(saved.isDeleted, false);
  assert.equal(saved.leftOn, undefined);
  assert.equal(saved.deletedAt, null);
  assert.equal(saved.employeeId, p.asha.employeeId);
  assert.equal(saved.personalEmail, "asha.home@example.net", "their personal email stays");

  assert.equal(kc.updates.length, 1);
  assert.equal(kc.updates[0][1].enabled, true);
  assert.equal(kc.updates[0][1].username, `user-${p.asha.keycloakId}`);
  assert.ok((await directoryIds(p.admin)).includes(String(p.asha._id)));
  assert.deepEqual(await members(p.admin), []);
});

test("only those who could mark someone as left bring them back, and only members can be brought back", async () => {
  const p = await people();
  const formerAdmin = await formerColleague({ role: "Admin" });
  const former = await formerColleague();
  for (const [who, whom] of [
    [p.asha, former],
    [p.subadmin, former],
    [p.admin, formerAdmin],
  ]) {
    assert.equal((await bringBack(who, whom)).status, 403, `${who.role} → ${whom.role}`);
  }
  assert.equal((await bringBack(p.admin, p.kabir)).status, 404, "still here");
  const deleted = await User.create(userFields({ role: "Employee", stream: "tech", isDeleted: true, deletedAt: new Date() }));
  assert.equal((await bringBack(p.admin, deleted)).status, 404, "deleted, not left");
  assert.equal(kc.calls, 0);
  assert.equal((await bringBack(p.superadmin, formerAdmin)).status, 200);
});

test("when Keycloak can't switch the account back on, they stay in the community", async () => {
  const p = await people();
  const former = await formerColleague();
  kc.updateError = new Error("socket hang up");
  assert.equal((await bringBack(p.admin, former)).status, 502);
  const saved = await User.findById(former._id).lean();
  assert.equal(saved.isDeleted, true);
  assert.ok(saved.leftOn);
});

test("someone whose Keycloak account is gone comes back to People, and the reply says to invite them", async () => {
  const p = await people();
  const former = await formerColleague();
  kc.missing.add(former.keycloakId);
  const res = await bringBack(p.admin, former);
  assert.equal(res.status, 200);
  assert.equal(res.body.needsInvite, true);
  assert.equal((await User.findById(former._id).lean()).isDeleted, false);
});

/* ── Personal emails ── */

test("staff give their own personal email ahead of leaving; it's checked, and an empty one takes it away", async () => {
  const p = await people();
  assert.deepEqual((await call(p.asha, "GET", "/community/me/personal-email")).body, { personalEmail: "" });

  const saved = await call(p.asha, "PUT", "/community/me/personal-email", { personalEmail: "  Asha.Home@Example.NET " });
  assert.deepEqual([saved.status, saved.body], [200, { personalEmail: "asha.home@example.net" }]);
  assert.deepEqual((await call(p.asha, "GET", "/community/me/personal-email")).body, { personalEmail: "asha.home@example.net" });

  for (const [value, pattern] of [
    ["asha.home", /email/i],
    [p.asha.email.toUpperCase(), /work email/i],
    [`${"a".repeat(120)}@example.net`, /long/i],
    [42, /email/i],
  ]) {
    const res = await call(p.asha, "PUT", "/community/me/personal-email", { personalEmail: value });
    assert.equal(res.status, 400, String(value));
    assert.match(res.body.message, pattern);
  }
  await call(p.kabir, "PUT", "/community/me/personal-email", { personalEmail: "kabir.home@example.net" });
  const taken = await call(p.asha, "PUT", "/community/me/personal-email", { personalEmail: "KABIR.home@example.net" });
  assert.equal(taken.status, 409);
  assert.equal((await User.findById(p.asha._id).lean()).personalEmail, "asha.home@example.net", "a refusal changes nothing");

  assert.deepEqual((await call(p.asha, "PUT", "/community/me/personal-email", { personalEmail: "" })).body, { personalEmail: "" });
  assert.equal((await User.findById(p.asha._id).lean()).personalEmail, undefined);
});

test("the personal email goes with them into the community, where only admins see it", async () => {
  const p = await people();
  await call(p.asha, "PUT", "/community/me/personal-email", { personalEmail: "asha.home@example.net" });
  await leave(p.admin, p.asha);
  assert.equal((await members(p.admin))[0].personalEmail, "asha.home@example.net");
  assert.ok(!("personalEmail" in (await members(p.kabir))[0]));
});

test("Super Admins and Admins add or change a member's personal email; nobody else, and only for members", async () => {
  const p = await people();
  const former = await formerColleague({ email: "neha.kapoor@example.test" });
  const set = (who, whom, personalEmail) => call(who, "PUT", `/community/members/${whom._id}/personal-email`, { personalEmail });

  assert.deepEqual((await set(p.admin, former, "Neha.Home@example.net")).body, { personalEmail: "neha.home@example.net" });
  assert.equal((await set(p.superadmin, former, "neha.2@example.net")).status, 200);
  assert.equal((await set(p.subadmin, former, "x@example.net")).status, 403);
  assert.equal((await set(p.asha, former, "x@example.net")).status, 403);
  assert.equal((await set(p.admin, p.kabir, "x@example.net")).status, 404, "staff set their own");
  assert.equal((await set(p.admin, former, "neha.kapoor@example.test")).status, 400, "their old work email");
  await call(p.asha, "PUT", "/community/me/personal-email", { personalEmail: "asha.home@example.net" });
  assert.equal((await set(p.admin, former, "asha.home@example.net")).status, 409);
  assert.equal((await User.findById(former._id).lean()).personalEmail, "neha.2@example.net");
  assert.equal((await set(p.admin, former, "")).status, 200);
  assert.equal((await User.findById(former._id).lean()).personalEmail, undefined);
});

test("two people saving the same personal email at the same moment: one gets it, the other is told it's taken", async () => {
  const p = await people();
  const results = await Promise.all([p.asha, p.kabir].map((who) => call(who, "PUT", "/community/me/personal-email", { personalEmail: "shared@example.net" })));
  assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
  assert.equal(await User.countDocuments({ personalEmail: "shared@example.net" }), 1);
});

/* ── The 60-day rule for ID documents ── */

const store = imageStore("idDocuments");
const PDF = Buffer.from("%PDF-1.4\n%%EOF\n");
/** An employee verification holding stored Aadhaar and PAN files for `person`. */
const requestWithFiles = async (person, opener) => {
  const documents = [];
  for (const kind of ["aadhaar", "pan"]) {
    const fileId = await store.save(PDF, { name: `${kind}.pdf`, contentType: "application/pdf", metadata: { kind } });
    documents.push({ kind, fileId, fileName: `${kind}.pdf`, size: PDF.length, uploadedAt: new Date() });
  }
  return Verification.create({ kind: "employee", person: person._id, documents, openedBy: opener._id, openedByName: "Test Admin", log: [{ at: new Date(), by: "Test Admin", text: "Opened the request" }] });
};
const storedFileIds = async () => (await mongoose.connection.db.collection("idDocuments.files").find().toArray()).map((f) => String(f._id));

test(`ID documents are deleted ${ID_RETENTION_DAYS} days after someone leaves, logged once, and nobody else's are touched`, async () => {
  assert.equal(ID_RETENTION_DAYS, 60);
  const today = "2026-03-01";
  const p = await people();
  const due = await formerColleague({ leftOn: daysBefore(today, 60) }); // 2025-12-31
  const notYet = await formerColleague({ leftOn: daysBefore(today, 59) });
  const deletedOnly = await User.create(userFields({ role: "Employee", stream: "tech", isDeleted: true, deletedAt: new Date("2025-01-01") }));
  // brought back: no longer left, even with an old leaving day still on a record
  const back = await User.create(userFields({ role: "Employee", stream: "tech", leftOn: "2025-01-01" }));

  const dueRequest = await requestWithFiles(due, p.admin);
  const kept = [await requestWithFiles(notYet, p.admin), await requestWithFiles(p.asha, p.admin), await requestWithFiles(deletedOnly, p.admin), await requestWithFiles(back, p.admin)];
  const keptFiles = kept.flatMap((r) => r.documents.map((d) => String(d.fileId)));

  assert.equal(await deleteDueIdDocuments({ today }), 1);

  const after = await Verification.findById(dueRequest._id).lean();
  assert.deepEqual(after.documents, []);
  assert.deepEqual([after.log.at(-1).by, after.log.at(-1).text], ["System", `Deleted the ID documents automatically, ${ID_RETENTION_DAYS} days after they left`]);
  assert.deepEqual((await storedFileIds()).sort(), keptFiles.sort(), "the files are gone from the store, the others stay");
  for (const r of kept) assert.equal((await Verification.findById(r._id).lean()).documents.length, 2);

  // running again (a restart, or two servers) finds nothing more to do and logs nothing twice
  assert.equal(await deleteDueIdDocuments({ today }), 0);
  assert.equal((await Verification.findById(dueRequest._id).lean()).log.length, 2);
});

test("two checks running at the same moment (two servers) delete the files once and log it once", async () => {
  const p = await people();
  const due = await formerColleague({ leftOn: "2025-12-31" });
  const request = await requestWithFiles(due, p.admin);
  const counts = await Promise.all([deleteDueIdDocuments({ today: "2026-03-01" }), deleteDueIdDocuments({ today: "2026-03-01" })]);
  assert.equal(counts[0] + counts[1], 1);
  const after = await Verification.findById(request._id).lean();
  assert.equal(after.log.filter((e) => e.by === "System").length, 1);
  assert.deepEqual(await storedFileIds(), []);
});

test("the 60 days are counted on the calendar in India, across months and years", async () => {
  const p = await people();
  const exactly = await formerColleague({ leftOn: "2025-12-31" });
  const dayAfter = await formerColleague({ leftOn: "2026-01-01" });
  const a = await requestWithFiles(exactly, p.admin);
  const b = await requestWithFiles(dayAfter, p.admin);
  await deleteDueIdDocuments({ today: "2026-03-01" });
  assert.equal((await Verification.findById(a._id).lean()).documents.length, 0);
  assert.equal((await Verification.findById(b._id).lean()).documents.length, 2);
  // without a day given, it counts from today in India
  const old = await formerColleague({ leftOn: daysBefore(todayInIndia(), 61) });
  const c = await requestWithFiles(old, p.admin);
  await deleteDueIdDocuments();
  assert.equal((await Verification.findById(c._id).lean()).documents.length, 0);
});

/* ── Coming back through other doors ── */

test("inviting someone who left is refused: they're brought back from the Community instead", async () => {
  const p = await people();
  const former = await formerColleague({ email: "neha.kapoor@example.test" });
  const res = await call(p.admin, "POST", "/invite", { name: "Neha Kapoor", email: "Neha.Kapoor@example.test", role: "Employee" });
  assert.equal(res.status, 409);
  assert.equal(res.body.code, "left", "so the portal can show these words instead of its general 'already exists'");
  assert.match(res.body.message, /left/i);
  assert.match(res.body.message, /Community/);
  assert.equal(kc.calls, 0, "their switched-off account isn't given a new password");
  assert.equal((await User.findById(former._id).lean()).isDeleted, true);
});

test("a record restored at sign-in no longer counts as having left", async () => {
  const former = await formerColleague({ email: "neha.kapoor@example.test", keycloakId: "kc-old" });
  await getOrCreateUser({ sub: "kc-new", email: "neha.kapoor@example.test", name: "Neha Kapoor", preferred_username: "neha", realm_access: { roles: ["Employee"] } });
  const saved = await User.findById(former._id).lean();
  assert.equal(saved.isDeleted, false);
  assert.equal(saved.leftOn, undefined);
});
