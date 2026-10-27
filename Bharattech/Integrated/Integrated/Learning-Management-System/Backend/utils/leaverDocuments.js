const mongoose = require("mongoose");
const User = require("../models/User");
const Verification = require("../models/Verification");
const { removeFilesOf } = require("../controllers/idDocumentController");
const { todayInIndia } = require("./days");

/*
 * The 60-day rule: an employee's uploaded verification files (Aadhaar, PAN, education, previous employer's letter) are
 * deleted ID_RETENTION_DAYS after their leaving day, and the deletion is written to the request's log. Their name,
 * dates and verification result stay. server.js runs the check when the backend starts and then once a day.
 */

const ID_RETENTION_DAYS = 60;
const DAY_MS = 24 * 60 * 60 * 1000;

/** "YYYY-MM-DD" n calendar days before `day`. */
const daysBefore = (day, n) => {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d - n)).toISOString().slice(0, 10);
};

/** Deletes the ID documents that are due on `today` (India time by default); returns how many requests it cleared. */
const deleteDueIdDocuments = async ({ today = todayInIndia() } = {}) => {
  // only people who have left: a record brought back (isDeleted false) is staff again, whatever day it still holds
  const leavers = await User.find({ isDeleted: true, leftOn: { $type: "string", $lte: daysBefore(today, ID_RETENTION_DAYS) } }).select("_id").lean();
  if (!leavers.length) return 0;

  const requests = await Verification.find({ kind: "employee", person: { $in: leavers.map((u) => u._id) }, "documents.0": { $exists: true } });
  let cleared = 0;
  for (const request of requests) {
    // files first: if this stops halfway, the record still lists them and the next run tries again
    await removeFilesOf(request);
    const updated = await Verification.findOneAndUpdate(
      { _id: request._id, "documents.0": { $exists: true } },
      {
        $set: { documents: [] },
        $push: { log: { at: new Date(), by: "System", text: `Deleted the uploaded documents automatically, ${ID_RETENTION_DAYS} days after they left` } },
      }
    );
    if (updated) cleared += 1;
  }
  return cleared;
};

/** Runs the check once the database is connected, then every 24 hours; a failure is logged and tried again next day. */
const startDailyLeaverCheck = () => {
  const run = () =>
    deleteDueIdDocuments()
      .then((cleared) => cleared && console.log(`ID documents: cleared ${cleared} request(s) past the ${ID_RETENTION_DAYS}-day rule`))
      .catch((error) => console.error("ID documents clean-up failed:", error.message));
  mongoose.connection.asPromise().then(run, () => {});
  setInterval(run, DAY_MS).unref();
};

module.exports = { ID_RETENTION_DAYS, deleteDueIdDocuments, startDailyLeaverCheck };
