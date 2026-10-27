const { test, before, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const mongoose = require("mongoose");
const { verificationApp, PDF } = require("./helpers/verificationApp");

// Review 2026-10-26 M4 (owner's 3A): deleting a verification request (or a task) deleted the record first and its
// files after; when removing a file failed, it stayed in the store for good, with nothing pointing at it, and the reply
// said the delete failed although the record was gone. (Uploads racing each other left files behind too: M2.) Now an
// hourly clean-up removes stored ID documents and task files that no record refers to any more, once they are an hour
// old (an upload still being saved is younger), and a delete whose files couldn't go answers that it was done.

const app = verificationApp();
before(app.start);
beforeEach(async () => {
  await app.clear();
  await Promise.all(["taskFiles.files", "taskFiles.chunks"].map((name) => mongoose.connection.db.collection(name).deleteMany({})));
});
after(app.stop);

const Verification = require("../models/Verification");
const Task = require("../models/Task");
const User = require("../models/User");
const { imageStore } = require("../utils/userPhotos");
const { saveTaskFile } = require("../utils/taskFiles");
const { sweepUnreferencedFiles, FILE_GRACE_MS } = require("../utils/fileSweep");
const { userFields } = require("./helpers/testDb");

const idStore = imageStore("idDocuments");
const HOUR = 60 * 60 * 1000;
const ids = async (bucket) => (await mongoose.connection.db.collection(`${bucket}.files`).find().toArray()).map((f) => String(f._id)).sort();
/** Makes every stored file look `hours` old. */
const age = (bucket, hours) => mongoose.connection.db.collection(`${bucket}.files`).updateMany({}, { $set: { uploadDate: new Date(Date.now() - hours * HOUR) } });
const doc = (kind, fileId) => ({ kind, fileId, fileName: `${kind}.pdf`, size: PDF.length, uploadedAt: new Date() });

test("old ID documents and task files no record refers to are removed; the ones still referred to stay", async () => {
  const listed = await idStore.save(PDF, { name: "listed", contentType: "application/pdf" });
  const lost = await idStore.save(PDF, { name: "lost", contentType: "application/pdf" });
  await Verification.collection.insertOne({ kind: "employee", status: "pending", documents: [doc("aadhaar", listed)] });

  const people = { a: await User.create(userFields()), b: await User.create(userFields()) };
  const project = await saveTaskFile(PDF, { fileName: "brief.pdf", contentType: "application/pdf", taskId: "t1" });
  const submitted = await saveTaskFile(PDF, { fileName: "work.pdf", contentType: "application/pdf", taskId: "t1" });
  const strayTask = await saveTaskFile(PDF, { fileName: "gone.pdf", contentType: "application/pdf", taskId: "t2" });
  await Task.create({ title: "Notes", assignedBy: people.a._id, assignedTo: people.b._id, projectFile: { fileId: project, fileName: "brief.pdf" }, submissions: [{ fileId: submitted, fileName: "work.pdf" }] });

  await age("idDocuments", 2);
  await age("taskFiles", 2);
  const removed = await sweepUnreferencedFiles();

  assert.deepEqual(removed, { idDocuments: 1, taskFiles: 1 });
  assert.deepEqual(await ids("idDocuments"), [String(listed)]);
  assert.deepEqual(await ids("taskFiles"), [String(project), String(submitted)].sort());
  assert.equal((await ids("taskFiles")).includes(String(strayTask)), false);
  assert.equal((await ids("idDocuments")).includes(String(lost)), false);
});

test("a file younger than an hour stays, even with no record yet: its upload may still be saving", async () => {
  await idStore.save(PDF, { name: "in-progress", contentType: "application/pdf" });
  await saveTaskFile(PDF, { fileName: "in-progress.pdf", contentType: "application/pdf", taskId: "t3" });
  assert.deepEqual(await sweepUnreferencedFiles(), { idDocuments: 0, taskFiles: 0 });
  assert.equal((await ids("idDocuments")).length, 1);
  assert.equal((await ids("taskFiles")).length, 1);
});

test("the grace is one hour", () => {
  assert.equal(FILE_GRACE_MS, HOUR);
});

test("deleting a request whose files can't be removed right now still answers that it was deleted; the clean-up takes them later", async () => {
  const { admin, asha, id } = await app.opened();
  await app.upload(asha, "aadhaar");
  const realDelete = mongoose.mongo.GridFSBucket.prototype.delete;
  mongoose.mongo.GridFSBucket.prototype.delete = async () => {
    throw new Error("connection reset");
  };
  let reply;
  const quietError = console.error;
  console.error = () => {};
  try {
    reply = await app.call(admin, "DELETE", `/verifications/${id}`);
  } finally {
    mongoose.mongo.GridFSBucket.prototype.delete = realDelete;
    console.error = quietError;
  }
  assert.equal(reply.status, 200, JSON.stringify(reply.body));
  assert.equal(await Verification.countDocuments({ _id: id }), 0);
  assert.equal((await ids("idDocuments")).length, 1, "left behind for now");

  await age("idDocuments", 2);
  await sweepUnreferencedFiles();
  assert.deepEqual(await ids("idDocuments"), []);
});

test("deleting a task whose files can't be removed right now answers the same way", () => {
  const tasks = fs.readFileSync(path.join(__dirname, "..", "controllers", "taskController.js"), "utf8");
  assert.match(tasks, /await deleteTaskFiles\(storedFileIds\(task\)\)\.catch\(/);
});

test("the server starts the hourly clean-up", () => {
  const server = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");
  assert.match(server, /startHourlyFileSweep\(\);/);
});
