const { test, before, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const mongoose = require("mongoose");

// A stand-in for the Keycloak admin client, put in place before userController loads it. It records name changes.
const kc = { updates: [], updateError: null };
class FakeKcAdminClient {
  constructor() {
    this.users = {
      findOne: async ({ id }) => ({ id, username: `user-${id}`, email: `${id}@example.test`, firstName: "Old", lastName: "Name", attributes: { phone: ["+91 1"] } }),
      update: async (where, rep) => {
        if (kc.updateError) throw kc.updateError;
        kc.updates.push([where.id, rep]);
      },
    };
  }
  async auth() {}
}
require("./helpers/fakeKeycloakAdmin").stubKeycloakAdminPackage(FakeKcAdminClient);

const User = require("../models/User");
const { updateUser, setMyPhoto, removeMyPhoto, getUserPhoto, canEditUser, readFullName, keycloakNames } = require("../controllers/userController");
const { photoType, PHOTO_MAX_BYTES } = require("../utils/userPhotos");
const { uploadUserPhoto } = require("../middlewares/uploadUserPhoto");
const { connectTestDb, clearTestDb, disconnectTestDb, userFields } = require("./helpers/testDb");

let server;
let base;

// The real handlers behind a stand-in for keycloakAuth: the test says who is signed in through x-test-user.
before(async () => {
  await connectTestDb();
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = JSON.parse(req.get("x-test-user"));
    next();
  });
  app.put("/me/photo", uploadUserPhoto("photo"), setMyPhoto);
  app.delete("/me/photo", removeMyPhoto);
  app.get("/:id/photo", getUserPhoto);
  app.patch("/:id", uploadUserPhoto("profilePicture"), updateUser);
  await new Promise((resolve) => (server = app.listen(0, "127.0.0.1", resolve)));
  base = `http://127.0.0.1:${server.address().port}`;
});
beforeEach(async () => {
  await clearTestDb();
  await Promise.all(["userPhotos.files", "userPhotos.chunks"].map((c) => mongoose.connection.db.collection(c).deleteMany({})));
  Object.assign(kc, { updates: [], updateError: null });
});
after(async () => {
  if (server?.listening) await new Promise((resolve) => server.close(resolve));
  await disconnectTestDb();
});

const as = (p) => JSON.stringify({ id: String(p._id), role: p.role, keycloakId: p.keycloakId, email: p.email });

const send = async (who, method, path, body) => {
  const res = await fetch(base + path, {
    method,
    headers: { "Content-Type": "application/json", "x-test-user": as(who) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
};

const upload = async (who, method, path, field, bytes, fileName = "me.png") => {
  const form = new FormData();
  form.append(field, new Blob([bytes]), fileName);
  const res = await fetch(base + path, { method, headers: { "x-test-user": as(who) }, body: form });
  return { status: res.status, body: await res.json() };
};

const people = async () => ({
  superadmin: await User.create(userFields({ role: "Superadmin", fullName: "Sana Iyer" })),
  superadmin2: await User.create(userFields({ role: "Superadmin", fullName: "Vik Rao" })),
  admin: await User.create(userFields({ role: "Admin", fullName: "Ravi Menon" })),
  admin2: await User.create(userFields({ role: "Admin", fullName: "Neha Jain" })),
  subadmin: await User.create(userFields({ role: "Subadmin", fullName: "Asha Rao" })),
  employee: await User.create(userFields({ role: "Employee", fullName: "Dev Shah" })),
  intern: await User.create(userFields({ role: "Intern", fullName: "Mira Das" })),
});

const PNG = Buffer.concat([Buffer.from("89504e470d0a1a0a0000000d49484452", "hex"), Buffer.alloc(64, 1)]);
const JPEG = Buffer.concat([Buffer.from("ffd8ffe000104a464946", "hex"), Buffer.alloc(64, 2)]);
const WEBP = Buffer.concat([Buffer.from("RIFF"), Buffer.from([0x24, 0, 0, 0]), Buffer.from("WEBPVP8 "), Buffer.alloc(64, 3)]);
const storedPhotos = () => mongoose.connection.db.collection("userPhotos.files").countDocuments();

// --- the rules ---

test("who may edit whom: a Super Admin anyone, an Admin only sub admins, employees and interns", () => {
  const roles = ["Superadmin", "Admin", "Subadmin", "Employee", "Intern"];
  const allowed = {
    Superadmin: roles,
    Admin: ["Subadmin", "Employee", "Intern"],
    Subadmin: [],
    Employee: [],
    Intern: [],
  };
  for (const actor of roles) {
    for (const target of roles) assert.equal(canEditUser(actor, target), allowed[actor].includes(target), `${actor} -> ${target}`);
  }
  // roles arrive written several ways
  assert.equal(canEditUser("super-admin", "ADMIN"), true);
});

test("a name is trimmed, single-spaced and 2 to 60 characters", () => {
  assert.equal(readFullName("  Asha   Rao "), "Asha Rao");
  assert.equal(readFullName("Lal & Sons"), "Lal & Sons");
  assert.equal(readFullName("आशा राव"), "आशा राव");
  assert.equal(readFullName("A"), null);
  assert.equal(readFullName("x".repeat(61)), null);
  assert.equal(readFullName("x".repeat(60)), "x".repeat(60));
  assert.equal(readFullName("Asha\u0000Rao"), null);
  assert.equal(readFullName("Asha\nRao"), "Asha Rao");
  assert.equal(readFullName(42), null);
  assert.equal(readFullName(undefined), null);
});

test("Keycloak gets the first word as the first name and the rest as the last name", () => {
  assert.deepEqual(keycloakNames("Asha Rao"), { firstName: "Asha", lastName: "Rao" });
  assert.deepEqual(keycloakNames("Prakhar Kumar Verma"), { firstName: "Prakhar", lastName: "Kumar Verma" });
  assert.deepEqual(keycloakNames("Madonna"), { firstName: "Madonna", lastName: "" });
});

test("a photo is only a real PNG, JPG or WebP, whatever its name says", () => {
  assert.equal(photoType(PNG), "image/png");
  assert.equal(photoType(JPEG), "image/jpeg");
  assert.equal(photoType(WEBP), "image/webp");
  assert.equal(photoType(Buffer.from("<html><script>alert(1)</script></html>")), null);
  assert.equal(photoType(Buffer.from("GIF89a")), null);
  assert.equal(photoType(Buffer.alloc(0)), null);
});

// --- renaming (PATCH /api/user/:id) ---

test("an admin renames an employee in both the database and Keycloak", async () => {
  const { admin, employee } = await people();

  const res = await send(admin, "PATCH", `/${employee._id}`, { fullName: "  Dev   Shah Kumar " });

  assert.equal(res.status, 200);
  assert.equal(res.body.fullName, "Dev Shah Kumar");
  assert.equal((await User.findById(employee._id)).fullName, "Dev Shah Kumar");
  assert.equal(kc.updates.length, 1);
  const [id, rep] = kc.updates[0];
  assert.equal(id, employee.keycloakId);
  assert.equal(rep.firstName, "Dev");
  assert.equal(rep.lastName, "Shah Kumar");
  // the rest of the Keycloak account is sent back as it was, so nothing else is wiped
  assert.equal(rep.email, `${employee.keycloakId}@example.test`);
  assert.deepEqual(rep.attributes, { phone: ["+91 1"] });
});

test("an admin can't edit a super admin or another admin at all", async () => {
  const { admin, admin2, superadmin } = await people();

  for (const target of [superadmin, admin2]) {
    for (const body of [{ fullName: "Someone Else" }, { team: "Moved" }, { isBanned: true }]) {
      const res = await send(admin, "PATCH", `/${target._id}`, body);
      assert.equal(res.status, 403, `${target.role} ${JSON.stringify(body)}`);
    }
    const after = await User.findById(target._id);
    assert.equal(after.fullName, target.fullName);
    assert.equal(after.team, undefined);
    assert.equal(after.isBanned, false);
  }
  assert.equal(kc.updates.length, 0);
});

test("a super admin renames anyone, but can't block another super admin", async () => {
  const { superadmin, superadmin2, admin } = await people();

  assert.equal((await send(superadmin, "PATCH", `/${admin._id}`, { fullName: "Ravi M" })).status, 200);
  assert.equal((await send(superadmin, "PATCH", `/${superadmin2._id}`, { fullName: "Vikram Rao" })).status, 200);
  const blocked = await send(superadmin, "PATCH", `/${superadmin2._id}`, { isBanned: true });
  assert.equal(blocked.status, 403);
  assert.equal((await User.findById(superadmin2._id)).isBanned, false);
  // blocking an admin still works, as the company app uses it
  assert.equal((await send(superadmin, "PATCH", `/${admin._id}`, { isBanned: true })).status, 200);
});

test("sub admins, employees and interns are refused", async () => {
  const { subadmin, employee, intern } = await people();
  for (const actor of [subadmin, employee]) {
    assert.equal((await send(actor, "PATCH", `/${intern._id}`, { fullName: "New Name" })).status, 403);
  }
  assert.equal((await send(intern, "PATCH", `/${employee._id}`, { fullName: "New Name" })).status, 403);
  assert.equal((await User.findById(intern._id)).fullName, "Mira Das");
});

test("a bad name is the caller's mistake and changes nothing", async () => {
  const { admin, employee } = await people();
  for (const fullName of ["A", "x".repeat(61), "Bad\u0007Name", ""]) {
    const res = await send(admin, "PATCH", `/${employee._id}`, { fullName });
    assert.equal(res.status, 400, JSON.stringify(fullName));
    assert.match(res.body.message, /2 to 60 characters/);
  }
  assert.equal((await User.findById(employee._id)).fullName, "Dev Shah");
  assert.equal(kc.updates.length, 0);
});

test("when Keycloak refuses the new name, the database keeps the old one too", async () => {
  const { admin, employee } = await people();
  kc.updateError = Object.assign(new Error("connect ECONNREFUSED"), { response: { status: 503 } });

  const res = await send(admin, "PATCH", `/${employee._id}`, { fullName: "Dev Kumar" });

  assert.equal(res.status, 502);
  assert.doesNotMatch(JSON.stringify(res.body), /ECONNREFUSED/);
  assert.equal((await User.findById(employee._id)).fullName, "Dev Shah");
});

test("the same name again, or a person who doesn't sign in through Keycloak, doesn't touch Keycloak", async () => {
  const { admin, employee } = await people();
  const local = await User.create(userFields({ role: "Intern", authProvider: "local", password: "x", fullName: "Local One" }));

  assert.equal((await send(admin, "PATCH", `/${employee._id}`, { fullName: "Dev Shah", team: "Platform" })).status, 200);
  assert.equal((await send(admin, "PATCH", `/${local._id}`, { fullName: "Local Two" })).status, 200);
  assert.equal((await User.findById(local._id)).fullName, "Local Two");
  assert.equal(kc.updates.length, 0);
});

test("a photo address in the body is ignored: photos only come from the photo store", async () => {
  const { admin, employee } = await people();
  const res = await send(admin, "PATCH", `/${employee._id}`, { profilePicture: "javascript:alert(1)", team: "Platform" });
  assert.equal(res.status, 200);
  assert.equal((await User.findById(employee._id)).profilePicture, "");
});

// --- photos ---

test("your photo is saved, shown to anyone signed in, replaced and removed", async () => {
  const { employee, intern } = await people();

  const saved = await upload(employee, "PUT", "/me/photo", "photo", PNG);
  assert.equal(saved.status, 200);
  assert.match(saved.body.profilePicture, new RegExp(`^/api/user/${employee._id}/photo\\?v=[0-9a-f]{24}$`));
  assert.equal(saved.body.password, undefined);

  const shown = await fetch(`${base}/${employee._id}/photo`, { headers: { "x-test-user": as(intern) } });
  assert.equal(shown.status, 200);
  assert.equal(shown.headers.get("content-type"), "image/png");
  assert.equal(shown.headers.get("x-content-type-options"), "nosniff");
  assert.deepEqual(Buffer.from(await shown.arrayBuffer()), PNG);

  const replaced = await upload(employee, "PUT", "/me/photo", "photo", JPEG, "new.jpg");
  assert.equal(replaced.status, 200);
  assert.notEqual(replaced.body.profilePicture, saved.body.profilePicture);
  assert.equal(await storedPhotos(), 1);

  const removed = await send(employee, "DELETE", "/me/photo");
  assert.equal(removed.status, 200);
  assert.equal(removed.body.profilePicture, "");
  assert.equal(await storedPhotos(), 0);
  assert.equal((await fetch(`${base}/${employee._id}/photo`, { headers: { "x-test-user": as(intern) } })).status, 404);
});

test("a file that isn't a real image, an empty or missing file, or one over 2 MB is refused", async () => {
  const { employee } = await people();

  const fake = await upload(employee, "PUT", "/me/photo", "photo", Buffer.from("<html><script>alert(1)</script></html>"), "me.png");
  assert.equal(fake.status, 400);
  assert.match(fake.body.message, /PNG, JPG or WebP/);
  assert.equal((await upload(employee, "PUT", "/me/photo", "photo", Buffer.alloc(0))).status, 400);
  assert.equal((await send(employee, "PUT", "/me/photo", {})).status, 400);
  const big = await upload(employee, "PUT", "/me/photo", "photo", Buffer.concat([PNG, Buffer.alloc(PHOTO_MAX_BYTES)]));
  assert.equal(big.status, 413);
  assert.equal(await storedPhotos(), 0);
  assert.equal((await User.findById(employee._id)).profilePicture, "");
});

test("asking for a photo that doesn't exist answers 404", async () => {
  const { employee } = await people();
  assert.equal((await fetch(`${base}/${employee._id}/photo`, { headers: { "x-test-user": as(employee) } })).status, 404);
  assert.equal((await fetch(`${base}/not-an-id/photo`, { headers: { "x-test-user": as(employee) } })).status, 404);
  assert.equal((await fetch(`${base}/${new mongoose.Types.ObjectId()}/photo`, { headers: { "x-test-user": as(employee) } })).status, 404);
});

test("a photo an admin uploads goes into the same store, not a broken /uploads/ path", async () => {
  const { admin, employee } = await people();

  const res = await upload(admin, "PATCH", `/${employee._id}`, "profilePicture", WEBP, "face.webp");

  assert.equal(res.status, 200);
  assert.match(res.body.profilePicture, new RegExp(`^/api/user/${employee._id}/photo\\?v=`));
  assert.equal(await storedPhotos(), 1);
  // and an admin still can't do it to someone above them
  const { superadmin } = { superadmin: await User.findOne({ role: "Superadmin" }) };
  assert.equal((await upload(admin, "PATCH", `/${superadmin._id}`, "profilePicture", PNG)).status, 403);
  assert.equal(await storedPhotos(), 1);
});
