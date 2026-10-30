const { test, before, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");
const User = require("../models/User");
const { connectTestDb, clearTestDb, disconnectTestDb, userFields } = require("./helpers/testDb");

before(connectTestDb);
beforeEach(clearTestDb);
after(disconnectTestDb);

test("each new person gets the next employee ID, starting at BT-0001", async () => {
  const first = await User.create(userFields());
  const second = await User.create(userFields());
  const third = await new User(userFields()).save();

  assert.equal(first.employeeId, "BT-0001");
  assert.equal(second.employeeId, "BT-0002");
  assert.equal(third.employeeId, "BT-0003");
});

test("people created at the same moment never share an employee ID", async () => {
  const people = await Promise.all(Array.from({ length: 20 }, () => User.create(userFields())));
  const ids = people.map((p) => p.employeeId);

  assert.equal(new Set(ids).size, 20);
  assert.deepEqual([...ids].sort(), Array.from({ length: 20 }, (_, i) => `BT-${String(i + 1).padStart(4, "0")}`));
});

test("saving an existing person again keeps their employee ID", async () => {
  const person = await User.create(userFields());
  person.team = "Platform";
  await person.save();

  const again = await User.findById(person._id);
  assert.equal(again.employeeId, "BT-0001");
});

test("someone saved before employee IDs existed gets one on their next save", async () => {
  const person = await User.create(userFields());
  // what a person from before this change looks like in the database
  await User.collection.updateOne({ _id: person._id }, { $unset: { employeeId: "" } });

  const old = await User.findById(person._id);
  old.fullName = "Renamed";
  await old.save();

  assert.equal((await User.findById(person._id)).employeeId, "BT-0002");
});

test("two people can't hold the same employee ID", async () => {
  await User.create(userFields());
  const other = await User.create(userFields());
  await assert.rejects(User.collection.updateOne({ _id: other._id }, { $set: { employeeId: "BT-0001" } }), /duplicate key/);
});

test("stream is one of tech, operations, hr or finance", async () => {
  for (const stream of ["tech", "operations", "hr", "finance"]) {
    assert.equal((await User.create(userFields({ stream }))).stream, stream);
  }
  await assert.rejects(User.create(userFields({ stream: "sales" })), /stream/);
});

test("team is trimmed and kept to a sensible length", async () => {
  assert.equal((await User.create(userFields({ team: "  Platform  " }))).team, "Platform");
  await assert.rejects(User.create(userFields({ team: "x".repeat(81) })), /team/);
});

test("stream and team start empty", async () => {
  const person = await User.create(userFields());
  assert.equal(person.stream, undefined);
  assert.equal(person.team, undefined);
});
