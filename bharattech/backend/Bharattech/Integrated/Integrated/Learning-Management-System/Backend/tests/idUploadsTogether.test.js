const { test, before, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");
const { verificationApp } = require("./helpers/verificationApp");
const Verification = require("../models/Verification");
const User = require("../models/User");

// Review 2026-10-26 M2 (owner's 1A): an upload read the file list, then wrote back a whole new list built from that
// read, so two uploads at once (an Aadhaar and a PAN, say) each wrote their own list and one file fell off it, left in
// the store where nothing would ever delete it. Now the list is changed in one database step.

const app = verificationApp();
before(app.start);
beforeEach(app.clear);
after(app.stop);

const listed = async (id) => (await Verification.findById(id).lean()).documents;

test("uploads at the same moment all stay on the list, and the store holds exactly those files", async () => {
  const { asha, id } = await app.opened();
  for (let round = 0; round < 5; round++) {
    const replies = await Promise.all(["aadhaar", "pan", "degree", "marksheet"].map((kind) => app.upload(asha, kind)));
    assert.ok(replies.every((r) => r.status === 200), JSON.stringify(replies.map((r) => r.status)));
    const docs = await listed(id);
    assert.deepEqual(docs.map((d) => d.kind).sort(), ["aadhaar", "degree", "marksheet", "pan"], `round ${round}`);
    const stored = (await app.storedFiles()).map((f) => String(f._id)).sort();
    assert.deepEqual(stored, docs.map((d) => String(d.fileId)).sort(), `round ${round}: no file left behind or missing`);
  }
});

test("the same kind sent twice at once ends as one listed file, the other removed", async () => {
  const { asha, id } = await app.opened();
  const replies = await Promise.all([app.upload(asha, "aadhaar"), app.upload(asha, "aadhaar")]);
  assert.ok(replies.every((r) => r.status === 200));
  const docs = await listed(id);
  assert.equal(docs.filter((d) => d.kind === "aadhaar").length, 1);
  assert.deepEqual((await app.storedFiles()).map((f) => String(f._id)), [String(docs[0].fileId)]);
});

test('a file name or a person\'s name starting with "$" is kept as written, not read as a database instruction', async () => {
  const { asha, id } = await app.opened();
  await User.updateOne({ _id: asha._id }, { fullName: "$documents" });
  const reply = await app.upload({ ...asha.toObject(), fullName: "$documents" }, "aadhaar", undefined, "$log.pdf");
  assert.equal(reply.status, 200);
  const saved = await Verification.findById(id).lean();
  assert.equal(saved.documents[0].fileName, "$log.pdf");
  assert.equal(saved.log.at(-1).by, "$documents");
  assert.ok(Array.isArray(saved.log) && saved.log.length >= 2, "the log is still a list");
});

test("a request stored before it had a file list or a log still takes an upload", async () => {
  const { asha, id } = await app.opened();
  await Verification.collection.updateOne({ _id: Verification.castObject({ _id: id })._id }, { $unset: { documents: "", log: "" } });
  assert.equal((await app.upload(asha, "pan")).status, 200);
  const saved = await Verification.findById(id).lean();
  assert.deepEqual(saved.documents.map((d) => d.kind), ["pan"]);
  assert.deepEqual(saved.log.map((l) => l.text), ["Uploaded the PAN card"]);
});

test("each upload still says in the log whether it added or replaced the file", async () => {
  const { asha, id } = await app.opened();
  await app.upload(asha, "pan");
  await app.upload(asha, "pan");
  const log = (await Verification.findById(id).lean()).log.map((l) => l.text);
  assert.ok(log.includes("Uploaded the PAN card"), log.join(" | "));
  assert.ok(log.includes("Replaced the PAN card"), log.join(" | "));
});
