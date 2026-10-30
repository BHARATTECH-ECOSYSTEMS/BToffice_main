const mongoose = require("mongoose");
const Verification = require("../models/Verification");
const Task = require("../models/Task");
const User = require("../models/User");

/*
 * The hourly clean-up of stored files nothing refers to any more: employees' ID documents (bucket "idDocuments",
 * listed in a Verification's documents), task files (bucket "taskFiles", a Task's project file or a submission) and
 * profile photos (bucket "userPhotos", a User's photoFileId; photos replaced at the same moment left some behind).
 * A delete removes the record first and its files after, so a failure there left files nobody could reach or remove;
 * this takes them. Only files at least an hour old: an upload saves its file before the record lists it.
 */

const HOUR_MS = 60 * 60 * 1000;
const FILE_GRACE_MS = HOUR_MS;

const BUCKETS = [
  { name: "idDocuments", referenced: async () => Verification.distinct("documents.fileId") },
  {
    name: "taskFiles",
    referenced: async () => [...(await Task.distinct("projectFile.fileId")), ...(await Task.distinct("submissions.fileId"))],
  },
  { name: "userPhotos", referenced: async () => User.distinct("photoFileId") },
];

/** Removes old stored files no record refers to; returns how many went, per bucket. */
const sweepUnreferencedFiles = async (now = Date.now()) => {
  const removed = {};
  for (const { name, referenced } of BUCKETS) {
    const db = mongoose.connection.db;
    const old = await db.collection(`${name}.files`).find({ uploadDate: { $lt: new Date(now - FILE_GRACE_MS) } }, { projection: { _id: 1 } }).toArray();
    const kept = new Set((await referenced()).filter(Boolean).map(String));
    const bucket = new mongoose.mongo.GridFSBucket(db, { bucketName: name });
    removed[name] = 0;
    for (const file of old) {
      if (kept.has(String(file._id))) continue;
      await bucket.delete(file._id).catch((error) => {
        // already gone is fine: the goal is that it isn't there
        if (!/FileNotFound|not found/i.test(error.message)) throw error;
      });
      removed[name] += 1;
    }
  }
  return removed;
};

/** Runs the clean-up once the database is connected, then every hour; a failure is logged and tried again next hour. */
const startHourlyFileSweep = () => {
  const run = () =>
    sweepUnreferencedFiles()
      .then(({ idDocuments, taskFiles }) => idDocuments + taskFiles && console.log(`Files: removed ${idDocuments} unreferenced ID document(s), ${taskFiles} task file(s)`))
      .catch((error) => console.error("File clean-up failed:", error.message));
  mongoose.connection.asPromise().then(run, () => {});
  setInterval(run, HOUR_MS).unref();
};

module.exports = { sweepUnreferencedFiles, startHourlyFileSweep, FILE_GRACE_MS };
