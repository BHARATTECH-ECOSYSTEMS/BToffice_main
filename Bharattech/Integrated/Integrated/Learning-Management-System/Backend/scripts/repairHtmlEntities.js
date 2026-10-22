// Repairs text the old HTML cleaner (express-xss-sanitizer, removed) saved with & < > " turned into &amp; &lt; &gt; &quot;.
// Run once after deploying that change. First without --apply: it only lists what it would change.
//   node scripts/repairHtmlEntities.js           (report only)
//   node scripts/repairHtmlEntities.js --apply   (write the repairs)
// Tags the cleaner deleted can't be brought back. Safe to run more than once.

const path = require("path");
const mongoose = require("mongoose");

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'", "#x27": "'" };
// one pass, so "&amp;lt;" (someone typed "&lt;") becomes "&lt;", not "<"
const ENTITY = /&(amp|lt|gt|quot|#39|#x27);/g;
const decode = (text) => text.replace(ENTITY, (_, name) => ENTITIES[name]);

// secrets and ids are compared byte for byte elsewhere; they were never text someone typed
const SKIPPED_FIELDS = new Set(["_id", "password", "tokens", "token", "resetToken", "encryptedPassword", "keycloakId"]);

const findDamaged = (value, at, found) => {
  if (typeof value === "string") {
    const repaired = decode(value);
    if (repaired !== value) found.push({ path: at, before: value, after: repaired });
  } else if (Array.isArray(value)) {
    value.forEach((item, i) => findDamaged(item, `${at}.${i}`, found));
  } else if (value && typeof value === "object" && !value._bsontype && !(value instanceof Date)) {
    for (const [key, item] of Object.entries(value)) {
      if (!SKIPPED_FIELDS.has(key)) findDamaged(item, at ? `${at}.${key}` : key, found);
    }
  }
  return found;
};

const repairHtmlEntities = async ({ apply }) => {
  const db = mongoose.connection.db;
  const changes = [];
  for (const { name } of await db.listCollections().toArray()) {
    // GridFS buckets hold stored PDF files and their technical names
    if (name.startsWith("system.") || name.endsWith(".files") || name.endsWith(".chunks")) continue;
    const collection = db.collection(name);
    for await (const doc of collection.find()) {
      const found = findDamaged(doc, "", []);
      if (!found.length) continue;
      changes.push(...found.map((f) => ({ collection: name, id: String(doc._id), ...f })));
      if (apply) {
        // the old values in the filter leave a record alone if someone edited it since it was read
        const unchanged = Object.fromEntries(found.map((f) => [f.path, f.before]));
        const repaired = Object.fromEntries(found.map((f) => [f.path, f.after]));
        await collection.updateOne({ _id: doc._id, ...unchanged }, { $set: repaired });
      }
    }
  }
  return changes;
};

if (require.main === module) {
  require("dotenv").config({ path: path.resolve(__dirname, "..", "..", ".env"), quiet: true });
  const apply = process.argv.includes("--apply");
  const connectDB = require("../config/db");
  connectDB()
    .then(() => repairHtmlEntities({ apply }))
    .then((changes) => {
      for (const c of changes) console.log(`${c.collection} ${c.id} ${c.path}: ${JSON.stringify(c.before)} -> ${JSON.stringify(c.after)}`);
      console.log(`${changes.length} text fields ${apply ? "repaired" : "would be repaired (report only; run with --apply to write)"}`);
    })
    .catch((error) => {
      console.error("Repairing saved text failed:", error);
      process.exitCode = 1;
    })
    .finally(() => mongoose.disconnect());
}

module.exports = { repairHtmlEntities };
