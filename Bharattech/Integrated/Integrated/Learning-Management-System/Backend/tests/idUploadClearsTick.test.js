const { test, before, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");
const { verificationApp } = require("./helpers/verificationApp");
const Verification = require("../models/Verification");

// Review 2026-10-26 M3 (owner's 2A): replacing an ID file after HR ticked its check kept the tick, so a file nobody had
// looked at could end up "verified". Now any upload clears the tick of the check that file proves, and says so in the
// log, so HR looks again.

const app = verificationApp();
before(app.start);
beforeEach(app.clear);
after(app.stop);

const tick = (admin, id, check) => app.call(admin, "PATCH", `/verifications/${id}/checks`, { check, done: true });
const saved = (id) => Verification.findById(id).lean();

test("replacing a ticked file clears its tick, and the log says why", async () => {
  const { admin, asha, id } = await app.opened();
  await app.upload(asha, "aadhaar");
  assert.equal((await tick(admin, id, "aadhaar")).status, 200);
  assert.ok((await saved(id)).done.includes("aadhaar"));

  assert.equal((await app.upload(asha, "aadhaar")).status, 200);
  const after = await saved(id);
  assert.equal(after.done.includes("aadhaar"), false);
  assert.ok(after.log.some((l) => l.text === "Tick cleared: a new Aadhaar card was uploaded"), after.log.map((l) => l.text).join(" | "));
});

test("a new file for a ticked check with several files (Education) clears that check too", async () => {
  const { admin, asha, id } = await app.opened();
  await app.upload(asha, "degree");
  assert.equal((await tick(admin, id, "education")).status, 200);
  await app.upload(asha, "class12");
  assert.equal((await saved(id)).done.includes("education"), false);
});

test("a request stored before it had a tick list still takes an upload, with no ticks", async () => {
  const { asha, id } = await app.opened();
  await Verification.collection.updateOne({ _id: Verification.castObject({ _id: id })._id }, { $unset: { done: "" } });
  assert.equal((await app.upload(asha, "pan")).status, 200);
  assert.deepEqual((await saved(id)).done, []);
});

test("other checks' ticks stay, and an upload for an unticked check adds no log line about ticks", async () => {
  const { admin, asha, id } = await app.opened();
  await app.upload(asha, "aadhaar");
  await tick(admin, id, "aadhaar");
  await app.upload(asha, "pan");
  const after = await saved(id);
  assert.ok(after.done.includes("aadhaar"));
  assert.equal(after.log.some((l) => /Tick cleared/.test(l.text)), false);
});
