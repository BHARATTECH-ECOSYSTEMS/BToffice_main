const { test, before, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const { repairHtmlEntities } = require("../scripts/repairHtmlEntities");
const { connectTestDb, clearTestDb, disconnectTestDb } = require("./helpers/testDb");

before(connectTestDb);
beforeEach(clearTestDb);
after(disconnectTestDb);

const db = () => mongoose.connection.db;

// Records as the old HTML cleaner saved them: & < > turned into &amp; &lt; &gt;
const seedDamaged = async () => {
  const user = await db().collection("users").insertOne({
    fullName: "Lal &amp; Sons",
    team: "R&amp;D",
    email: "lal@example.test",
    password: "$2b$10$hash&amp;notText",
    tokens: [{ token: "abc&amp;def" }],
    keycloakId: "kc&amp;1",
    address: { city: "Delhi &amp; NCR" },
  });
  const resource = await db().collection("resources").insertOne({ title: "Terms &amp; Conditions", link: "https://example.test/search?q=react&amp;page=2" });
  const policy = await db().collection("policies").insertOne({
    name: "Leave &lt;2026&gt;",
    acceptedBy: [{ fullName: "Asha &amp; Co", email: "asha@example.test" }, { fullName: "Kabir Das" }],
  });
  return { userId: user.insertedId, resourceId: resource.insertedId, policyId: policy.insertedId };
};

test("a dry run lists every damaged text and changes nothing", async () => {
  const { userId } = await seedDamaged();

  const changes = await repairHtmlEntities({ apply: false });

  assert.deepEqual(
    changes.map((c) => `${c.collection} ${c.path}: ${c.before} -> ${c.after}`).sort(),
    [
      "policies acceptedBy.0.fullName: Asha &amp; Co -> Asha & Co",
      "policies name: Leave &lt;2026&gt; -> Leave <2026>",
      "resources link: https://example.test/search?q=react&amp;page=2 -> https://example.test/search?q=react&page=2",
      "resources title: Terms &amp; Conditions -> Terms & Conditions",
      "users address.city: Delhi &amp; NCR -> Delhi & NCR",
      "users fullName: Lal &amp; Sons -> Lal & Sons",
      "users team: R&amp;D -> R&D",
    ],
  );
  assert.equal((await db().collection("users").findOne({ _id: userId })).fullName, "Lal &amp; Sons");
});

test("--apply repairs the text in place, including inside lists", async () => {
  const { userId, resourceId, policyId } = await seedDamaged();

  await repairHtmlEntities({ apply: true });

  const user = await db().collection("users").findOne({ _id: userId });
  assert.equal(user.fullName, "Lal & Sons");
  assert.equal(user.address.city, "Delhi & NCR");
  assert.equal((await db().collection("resources").findOne({ _id: resourceId })).link, "https://example.test/search?q=react&page=2");
  const policy = await db().collection("policies").findOne({ _id: policyId });
  assert.equal(policy.name, "Leave <2026>");
  assert.deepEqual(policy.acceptedBy.map((a) => a.fullName), ["Asha & Co", "Kabir Das"]);
});

test("passwords, tokens and ids are never touched", async () => {
  const { userId } = await seedDamaged();

  await repairHtmlEntities({ apply: true });

  const user = await db().collection("users").findOne({ _id: userId });
  assert.equal(user.password, "$2b$10$hash&amp;notText");
  assert.equal(user.tokens[0].token, "abc&amp;def");
  assert.equal(user.keycloakId, "kc&amp;1");
});

test("someone who typed an entity gets it back as typed, not decoded twice", async () => {
  // they typed "&lt;b&gt;" and the cleaner saved it as "&amp;lt;b&amp;gt;"
  const { insertedId } = await db().collection("resources").insertOne({ title: "Write &amp;lt;b&amp;gt; for bold", link: "https://example.test" });

  await repairHtmlEntities({ apply: true });

  assert.equal((await db().collection("resources").findOne({ _id: insertedId })).title, "Write &lt;b&gt; for bold");
});

test("running it again finds nothing more to change when nobody typed an entity", async () => {
  await seedDamaged();
  await db().collection("resources").insertOne({ title: "Already fine & clean", link: "https://example.test/?a=1&b=2" });

  await repairHtmlEntities({ apply: true });

  assert.deepEqual(await repairHtmlEntities({ apply: true }), []);
});

// Review 2026-10-26 low list: its comment said it was safe to run more than once. It isn't: a second run decodes what
// someone typed as an entity ("&lt;b&gt;") a second time. So it says to run it once.
test("a second run would decode typed entities again, so the script says to run it once", async () => {
  const { insertedId } = await db().collection("resources").insertOne({ title: "Write &amp;lt;b&amp;gt; for bold", link: "https://example.test" });
  await repairHtmlEntities({ apply: true });
  await repairHtmlEntities({ apply: true });
  assert.equal((await db().collection("resources").findOne({ _id: insertedId })).title, "Write <b> for bold");
  const script = require("fs").readFileSync(require("path").join(__dirname, "..", "scripts", "repairHtmlEntities.js"), "utf8");
  assert.doesNotMatch(script, /safe to run more than once/i);
  assert.match(script, /Run it once/);
});
