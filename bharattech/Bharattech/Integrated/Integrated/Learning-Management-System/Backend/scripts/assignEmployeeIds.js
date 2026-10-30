// Gives an employee ID to everyone who doesn't have one yet, oldest account first. Safe to run more than once.
// Run once after deploying employee IDs: node scripts/assignEmployeeIds.js

const path = require("path");
const mongoose = require("mongoose");
const User = require("../models/User");
const Counter = require("../models/Counter");

const assignMissingEmployeeIds = async () => {
  // soft-deleted people are included, so a former colleague's number is never handed to someone else
  const people = await User.find({ employeeId: { $exists: false } }, { _id: 1 }).sort({ _id: 1 }).lean();
  let assigned = 0;
  for (const { _id } of people) {
    const employeeId = User.formatEmployeeId(await Counter.next("employeeId"));
    // updateOne skips the save hook and validation of unrelated old fields; the filter keeps a concurrent save's ID
    const { modifiedCount } = await User.updateOne({ _id, employeeId: { $exists: false } }, { $set: { employeeId } });
    assigned += modifiedCount;
  }
  return assigned;
};

if (require.main === module) {
  require("dotenv").config({ path: path.resolve(__dirname, "..", "..", ".env"), quiet: true });
  const connectDB = require("../config/db");
  connectDB()
    .then(assignMissingEmployeeIds)
    .then((assigned) => console.log(`Employee IDs assigned: ${assigned}`))
    .catch((error) => {
      console.error("Assigning employee IDs failed:", error);
      process.exitCode = 1;
    })
    .finally(() => mongoose.disconnect());
}

module.exports = { assignMissingEmployeeIds };
