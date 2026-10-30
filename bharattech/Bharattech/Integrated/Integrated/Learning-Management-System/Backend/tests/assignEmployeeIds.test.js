const { test, before, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");
const User = require("../models/User");
const { assignMissingEmployeeIds } = require("../scripts/assignEmployeeIds");
const { connectTestDb, clearTestDb, disconnectTestDb, userFields } = require("./helpers/testDb");

before(connectTestDb);
beforeEach(clearTestDb);
after(disconnectTestDb);

/** People as they were before employee IDs existed: in the database, without one. */
const legacyPeople = async (count) => {
  const people = [];
  for (let i = 0; i < count; i += 1) people.push(await User.create(userFields()));
  await User.collection.updateMany({}, { $unset: { employeeId: "" } });
  await User.db.collection("counters").deleteMany({});
  return people;
};

test("people without an employee ID get one, oldest first", async () => {
  const [oldest, middle, newest] = await legacyPeople(3);

  const assigned = await assignMissingEmployeeIds();

  assert.equal(assigned, 3);
  assert.equal((await User.findById(oldest._id)).employeeId, "BT-0001");
  assert.equal((await User.findById(middle._id)).employeeId, "BT-0002");
  assert.equal((await User.findById(newest._id)).employeeId, "BT-0003");
});

test("running it again changes nothing", async () => {
  await legacyPeople(2);
  await assignMissingEmployeeIds();

  assert.equal(await assignMissingEmployeeIds(), 0);
  assert.deepEqual((await User.find().sort({ _id: 1 })).map((p) => p.employeeId), ["BT-0001", "BT-0002"]);
});

test("soft-deleted people get an ID too, so a former colleague's number is never handed out again", async () => {
  const [person] = await legacyPeople(1);
  await User.collection.updateOne({ _id: person._id }, { $set: { isDeleted: true } });

  await assignMissingEmployeeIds();

  assert.equal((await User.findById(person._id)).employeeId, "BT-0001");
});

test("new people after the script carry on from the last number", async () => {
  await legacyPeople(2);
  await assignMissingEmployeeIds();

  assert.equal((await User.create(userFields())).employeeId, "BT-0003");
});
