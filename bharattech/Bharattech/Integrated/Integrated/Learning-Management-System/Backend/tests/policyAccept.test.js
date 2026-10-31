const { test, before, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");

// Gap audit group B, owner's 4A: accepting a policy needs the person's "I have read and understood this policy" tick,
// checked here as well as on the page, so no app can accept for someone without it.

const Policy = require("../models/Policy");
const { acceptPolicy } = require("../controllers/policyController");
const { connectTestDb, clearTestDb, disconnectTestDb } = require("./helpers/testDb");

before(connectTestDb);
beforeEach(clearTestDb);
after(disconnectTestDb);

const call = async (handler, req) => {
  const reply = { status: 200, body: undefined };
  const res = {
    status(code) {
      reply.status = code;
      return res;
    },
    json(value) {
      reply.body = value;
      return res;
    },
  };
  await handler({ protocol: "http", get: () => "localhost:5000", headers: {}, ...req }, res);
  return reply;
};

const asha = { id: "6ad8bc3dd430c9b545aa2845", fullName: "Asha Rao", email: "asha@example.test", role: "Employee", decoded: { preferred_username: "asha" } };
const policy = () =>
  Policy.create({ name: "Leave policy", pdfUrl: "/api/policies/file/leave.pdf", pdfName: "leave.pdf", storedFileName: "leave.pdf", pages: 3, category: "hr", uploadedBy: "6ad8bc3dd430c9b545aa2840" });
const accept = (doc, body) => call(acceptPolicy, { params: { id: String(doc._id) }, user: asha, body });

test("accepting without the tick is refused, and nothing is recorded", async () => {
  const doc = await policy();

  for (const body of [undefined, {}, { readConfirmed: false }, { readConfirmed: "true" }, { readConfirmed: 1 }]) {
    const r = await accept(doc, body);
    assert.equal(r.status, 400, JSON.stringify(body));
    assert.match(r.body.message, /I have read and understood/);
  }
  assert.equal((await Policy.findById(doc._id)).acceptedBy.length, 0);
});

test("with the tick, the acceptance is recorded once", async () => {
  const doc = await policy();

  const first = await accept(doc, { readConfirmed: true });
  const again = await accept(doc, { readConfirmed: true });

  assert.equal(first.status, 200);
  assert.equal(first.body.userAccepted, true);
  assert.equal(again.status, 200);
  const saved = await Policy.findById(doc._id);
  assert.deepEqual(saved.acceptedBy.map((a) => [a.userId, a.email]), [[asha.id, asha.email]]);
});

// Review 2026-10-26 low list: two clicks at once both read "not accepted yet" and both saved an acceptance.
test("two accepts at the same moment are recorded once", async () => {
  const doc = await policy();
  const replies = await Promise.all([accept(doc, { readConfirmed: true }), accept(doc, { readConfirmed: true })]);
  assert.deepEqual(replies.map((r) => r.status), [200, 200]);
  const [only] = (await Policy.findById(doc._id).lean()).acceptedBy;
  assert.equal((await Policy.findById(doc._id).lean()).acceptedBy.length, 1);
  assert.ok(only.acceptedAt instanceof Date, "when they accepted is kept");
  assert.equal(only.fullName, "Asha Rao");
});
