const Task = require("../models/Task");
const User = require("../models/User");
const { taskFileType, cleanFileName, saveTaskFile, openTaskFile, deleteTaskFiles } = require("../utils/taskFiles");
const { notifyTaskGiven, notifyTaskChanged, notifyWorkHandedIn, forgetNotesAbout } = require("../utils/notify");

/*
 * Who may do what with tasks:
 * - Superadmins, admins and sub admins give tasks, and only to employees and interns.
 * - Admins and superadmins change and delete any task; a sub admin only the tasks they gave.
 * - Managers (those three) see every task; employees and interns see only the tasks given to them, and move their
 *   status along or hand in work. Handing in work marks the task completed.
 * A task someone may not see answers 404, the same as one that doesn't exist, so ids can't be probed.
 */

const STATUSES = ["pending", "in-progress", "completed"];
const PRIORITIES = ["Low", "Medium", "High", "Normal"];
const ASSIGNABLE_ROLES = ["employee", "intern"];
const TITLE_MAX = 200;
const DESCRIPTION_MAX = 5000;
const NOTES_MAX = 2000;
const LINK_MAX = 2048;
const PERSON_FIELDS = "fullName email role";

const roleKey = (role) => String(role || "").toLowerCase().replace(/[-_\s]/g, "");
const isAdmin = (user) => ["admin", "superadmin"].includes(roleKey(user.role));
const isManager = (user) => isAdmin(user) || roleKey(user.role) === "subadmin";
const isObjectId = (value) => /^[0-9a-f]{24}$/i.test(String(value ?? ""));
const idOf = (ref) => String(ref?._id ?? ref);

const doesTask = (task, user) => idOf(task.assignedTo) === String(user.id);
const canSee = (task, user) => isManager(user) || doesTask(task, user);
const canChange = (task, user) => isAdmin(user) || (isManager(user) && idOf(task.assignedBy) === String(user.id));

/** A request the caller has to fix: answered with its status and message, never as a server error. */
class Refusal extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const answerError = (res, error, what) => {
  if (error instanceof Refusal) return res.status(error.status).json({ message: error.message });
  console.error(`${what} error:`, error.message);
  return res.status(500).json({ message: "Server Error" });
};

const readTitle = (value) => {
  const title = typeof value === "string" ? value.trim() : "";
  if (!title) throw new Refusal(400, "Give the task a title.");
  if (title.length > TITLE_MAX) throw new Refusal(400, `Keep the title under ${TITLE_MAX} characters.`);
  return title;
};

const readText = (value, max, label) => {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string") throw new Refusal(400, `The ${label} must be text.`);
  if (value.length > max) throw new Refusal(400, `Keep the ${label} under ${max} characters.`);
  return value.trim();
};

// The company app's dashboards send their labels ("In Progress", "Completed"); they mean the same statuses.
const readStatus = (value) => {
  const status = typeof value === "string" ? value.trim().toLowerCase().replace(/[\s_]+/g, "-") : "";
  if (!STATUSES.includes(status)) throw new Refusal(400, `The status must be one of: ${STATUSES.join(", ")}.`);
  return status;
};

const readPriority = (value) => {
  const priority = PRIORITIES.find((p) => p.toLowerCase() === String(value).toLowerCase());
  if (!priority) throw new Refusal(400, `The priority must be one of: ${PRIORITIES.join(", ")}.`);
  return priority;
};

// A plain day ("2026-10-30", what date inputs send) is kept as that day at midnight UTC, so it reads back the same.
const readDueDate = (value) => {
  if (value === null || value === "") return null;
  if (typeof value !== "string") throw new Refusal(400, "The due date isn't a date.");
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00.000Z` : value);
  if (Number.isNaN(date.getTime())) throw new Refusal(400, "The due date isn't a date.");
  return date;
};

const readLink = (value) => {
  const link = typeof value === "string" ? value.trim() : "";
  let url;
  try {
    url = new URL(link);
  } catch {
    url = null;
  }
  if (!url || !["http:", "https:"].includes(url.protocol) || link.length > LINK_MAX) {
    throw new Refusal(400, "A file link must be a web address starting with http:// or https://.");
  }
  return link;
};

const readAssignee = async (value) => {
  if (!isObjectId(value)) throw new Refusal(400, "Pick who the task is for.");
  const person = await User.findById(value).select("email role isDeleted");
  if (!person || person.isDeleted) throw new Refusal(400, "That person isn't in the employee records.");
  if (!ASSIGNABLE_ROLES.includes(roleKey(person.role))) throw new Refusal(400, "Tasks can only be given to employees and interns.");
  return person;
};

/** The uploaded file checked against what may be attached; null when the request carried no file. */
const readUpload = (file) => {
  if (!file) return null;
  const fileName = cleanFileName(file.originalname);
  const contentType = taskFileType(fileName, file.buffer);
  if (!contentType) throw new Refusal(400, "Only PDF, Word, Excel, PowerPoint, image (PNG, JPG, GIF, WebP) or ZIP files can be attached.");
  return { buffer: file.buffer, fileName, contentType };
};

const storeUpload = async (upload, task) => ({
  fileId: await saveTaskFile(upload.buffer, { fileName: upload.fileName, contentType: upload.contentType, taskId: task._id }),
  fileName: upload.fileName,
  contentType: upload.contentType,
  size: upload.buffer.length,
});

const withPeople = (query) => query.populate("assignedBy", PERSON_FIELDS).populate("assignedTo", PERSON_FIELDS);

/** The task if this person may see it; otherwise "not found", the same as a task that doesn't exist. */
const findTask = async (id, user) => {
  const task = isObjectId(id) ? await withPeople(Task.findById(id)) : null;
  if (!task || !canSee(task, user)) throw new Refusal(404, "Task not found");
  return task;
};

const person = (p) => (p && p._id ? { _id: p._id, fullName: p.fullName, email: p.email, role: p.role } : null);
const fileUrl = (task, fileId) => `/api/tasks/${task._id}/files/${fileId}`;

function normalizeTask(task) {
  const project = task.projectFile && (task.projectFile.url || task.projectFile.fileId) ? task.projectFile : null;
  const projectFile = project && {
    url: project.fileId ? fileUrl(task, project.fileId) : project.url,
    fileName: project.fileName,
    uploadedAt: project.uploadedAt,
    contentType: project.contentType,
    size: project.size,
  };
  return {
    _id: task._id,
    id: task._id,
    title: task.title,
    description: task.description,
    status: task.status,
    assignedBy: person(task.assignedBy),
    assignedTo: person(task.assignedTo),
    assignedEmail: task.assignedEmail,
    assignedRole: task.assignedRole,
    createdBy: task.createdBy || "subadmin",
    dueDate: task.dueDate,
    completedAt: task.completedAt ?? null,
    priority: task.priority,
    projectFile,
    // older replies had a fileUrl; it now mirrors the project document
    fileUrl: projectFile?.url ?? null,
    submissions: (task.submissions || []).map((s) => ({
      _id: s._id,
      fileUrl: s.fileId ? fileUrl(task, s.fileId) : s.fileUrl,
      fileName: s.fileName,
      notes: s.notes,
      submittedAt: s.submittedAt,
      submittedBy: s.submittedBy,
      contentType: s.contentType,
      size: s.size,
    })),
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  };
}

const reply = async (res, status, id) => res.status(status).json(normalizeTask(await withPeople(Task.findById(id))));

const storedFileIds = (task) => [task.projectFile?.fileId, ...(task.submissions || []).map((s) => s.fileId)].filter(Boolean);

// CREATE TASK (admins, superadmins and sub admins give tasks to employees and interns)
exports.createTask = async (req, res) => {
  try {
    if (!isManager(req.user)) throw new Refusal(403, "Only admins and sub admins can give tasks.");
    const body = req.body || {};
    const title = readTitle(body.title);
    const description = readText(body.description, DESCRIPTION_MAX, "description");
    const status = body.status === undefined || body.status === null ? "pending" : readStatus(body.status);
    const priority = body.priority === undefined || body.priority === null ? "Normal" : readPriority(body.priority);
    const dueDate = body.dueDate === undefined ? null : readDueDate(body.dueDate);
    const assignee = await readAssignee(body.assignedTo);
    const link = body.projectFile?.url ?? body.fileUrl;
    const projectFile = link
      ? { url: readLink(link), fileName: readText(body.projectFile?.fileName, 200, "file name") || "Project document", uploadedAt: new Date() }
      : undefined;

    const task = await Task.create({
      title,
      description,
      assignedBy: req.user.id,
      assignedTo: assignee._id,
      assignedEmail: assignee.email,
      assignedRole: assignee.role,
      createdBy: isAdmin(req.user) ? "admin" : "subadmin",
      status,
      priority,
      dueDate,
      projectFile,
    });
    await notifyTaskGiven(task, req.user.fullName);
    return reply(res, 201, task._id);
  } catch (error) {
    return answerError(res, error, "Create task");
  }
};

// GET TASKS FOR USER (the tasks given to the signed-in person)
exports.getTasksForUser = async (req, res) => {
  try {
    if (!isObjectId(req.user.id)) return res.status(200).json([]);
    const query = { assignedTo: req.user.id };
    // optional narrowing the company app may send; only plain text, never a query object
    if (typeof req.query.assignedEmail === "string") query.assignedEmail = req.query.assignedEmail;
    if (typeof req.query.assignedRole === "string") query.assignedRole = req.query.assignedRole;
    const tasks = await withPeople(Task.find(query)).sort({ createdAt: -1 });
    return res.status(200).json(tasks.map(normalizeTask));
  } catch (error) {
    return answerError(res, error, "Get my tasks");
  }
};

// GET TEAM TASKS (managers see every task, whoever gave it)
exports.getAssignedTasks = async (req, res) => {
  try {
    if (!isManager(req.user)) throw new Refusal(403, "Only admins and sub admins can see the team's tasks.");
    const tasks = await withPeople(Task.find()).sort({ createdAt: -1 });
    return res.status(200).json(tasks.map(normalizeTask));
  } catch (error) {
    return answerError(res, error, "Get team tasks");
  }
};

// GET TASK BY ID
exports.getTaskById = async (req, res) => {
  try {
    return res.status(200).json(normalizeTask(await findTask(req.params.id, req.user)));
  } catch (error) {
    return answerError(res, error, "Get task");
  }
};

/** Keeps a web link the person doing the task handed in (the company app sends it with the status); true when one was. */
const addLinkedSubmission = (task, body, user) => {
  if (body.fileUrl === undefined || body.fileUrl === null || body.fileUrl === "") return false;
  task.submissions.push({
    fileUrl: readLink(body.fileUrl),
    fileName: readText(body.fileName, 200, "file name") || "Submitted work",
    submittedBy: user.id,
    submittedAt: new Date(),
  });
  return true;
};

// UPDATE TASK STATUS (the person doing the task)
exports.updateTaskStatus = async (req, res) => {
  try {
    const task = await findTask(req.params.id, req.user);
    if (!doesTask(task, req.user)) throw new Refusal(403, "Only the person doing a task changes its status here.");
    task.status = readStatus(req.body?.status);
    const handedIn = addLinkedSubmission(task, req.body || {}, req.user);
    await task.save();
    if (handedIn) await notifyWorkHandedIn(task, req.user.fullName);
    return reply(res, 200, task._id);
  } catch (error) {
    return answerError(res, error, "Update task status");
  }
};

const DETAIL_FIELDS = ["title", "description", "dueDate", "priority", "assignedTo"];

// UPDATE TASK (whoever may change it: every field; the person doing it: the status, and a link to their work)
exports.updateTask = async (req, res) => {
  try {
    const body = req.body || {};
    const task = await findTask(req.params.id, req.user);

    if (canChange(task, req.user)) {
      if (body.title !== undefined) task.title = readTitle(body.title);
      if (body.description !== undefined) task.description = readText(body.description, DESCRIPTION_MAX, "description");
      if (body.status !== undefined) task.status = readStatus(body.status);
      if (body.dueDate !== undefined) task.dueDate = readDueDate(body.dueDate);
      if (body.priority !== undefined) task.priority = readPriority(body.priority);
      let handedOver = false;
      if (body.assignedTo !== undefined && String(body.assignedTo) !== idOf(task.assignedTo)) {
        const assignee = await readAssignee(body.assignedTo);
        task.assignedTo = assignee._id;
        task.assignedEmail = assignee.email;
        task.assignedRole = assignee.role;
        handedOver = true;
      }
      let replaced = [];
      if (body.fileUrl !== undefined && body.fileUrl !== null && body.fileUrl !== "") {
        replaced = storedFileIds({ projectFile: task.projectFile });
        task.projectFile = { url: readLink(body.fileUrl), fileName: readText(body.fileName, 200, "file name") || "Project document", uploadedAt: new Date() };
      }
      await task.save();
      await deleteTaskFiles(replaced);
      // the person now doing it hears about it: as a new task when it was handed to them, else as a change
      if (handedOver) await notifyTaskGiven(task, req.user.fullName);
      else await notifyTaskChanged(task, req.user.fullName);
    } else if (doesTask(task, req.user)) {
      if (DETAIL_FIELDS.some((f) => body[f] !== undefined) || body.status === undefined) {
        throw new Refusal(403, "You can only change the status of your task.");
      }
      task.status = readStatus(body.status);
      const handedIn = addLinkedSubmission(task, body, req.user);
      await task.save();
      if (handedIn) await notifyWorkHandedIn(task, req.user.fullName);
    } else {
      throw new Refusal(403, "You can only change tasks you gave.");
    }
    return reply(res, 200, task._id);
  } catch (error) {
    return answerError(res, error, "Update task");
  }
};

// PROJECT DOCUMENT (whoever may change the task): a file upload, or a web link from the company app
exports.uploadProjectDocument = async (req, res) => {
  try {
    const task = await findTask(req.params.id, req.user);
    if (!canChange(task, req.user)) throw new Refusal(403, "Only whoever gave the task, or an admin, attaches its document.");
    const upload = readUpload(req.file);
    if (!upload && !req.body?.fileUrl) throw new Refusal(400, "Attach a file or a web link.");
    const replaced = storedFileIds({ projectFile: task.projectFile });

    task.projectFile = upload
      ? { ...(await storeUpload(upload, task)), uploadedAt: new Date() }
      : { url: readLink(req.body.fileUrl), fileName: readText(req.body.fileName, 200, "file name") || "Project document", uploadedAt: new Date() };
    await task.save();
    await deleteTaskFiles(replaced);
    await notifyTaskChanged(task, req.user.fullName);
    return reply(res, 200, task._id);
  } catch (error) {
    return answerError(res, error, "Attach task document");
  }
};

// SUBMIT TASK (the person doing it hands in a file or a web link; the task is then completed)
exports.submitTask = async (req, res) => {
  try {
    const task = await findTask(req.params.id, req.user);
    if (!doesTask(task, req.user)) throw new Refusal(403, "Only the person doing a task hands in work for it.");
    const upload = readUpload(req.file);
    if (!upload && !req.body?.fileUrl) throw new Refusal(400, "Attach a file or a web link.");
    const notes = readText(req.body?.notes, NOTES_MAX, "notes");

    const stored = upload
      ? await storeUpload(upload, task)
      : { fileUrl: readLink(req.body.fileUrl), fileName: readText(req.body.fileName, 200, "file name") || "Submitted work" };
    task.submissions.push({ ...stored, notes, submittedBy: req.user.id, submittedAt: new Date() });
    task.status = "completed";
    await task.save();
    await notifyWorkHandedIn(task, req.user.fullName);
    return reply(res, 200, task._id);
  } catch (error) {
    return answerError(res, error, "Submit task");
  }
};

// TASK FILE (a stored document or submission, for anyone who can see the task; always downloaded, never shown inline)
exports.streamTaskFile = async (req, res) => {
  try {
    const task = await findTask(req.params.id, req.user);
    const file = [task.projectFile, ...task.submissions].find((f) => f?.fileId && String(f.fileId) === req.params.fileId);
    if (!file) throw new Refusal(404, "File not found");

    res.setHeader("Content-Type", file.contentType || "application/octet-stream");
    res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(file.fileName || "file")}`);
    res.setHeader("X-Content-Type-Options", "nosniff");
    if (file.size) res.setHeader("Content-Length", String(file.size));
    return openTaskFile(file.fileId)
      .once("error", (error) => {
        console.error("Stream task file error:", error.message);
        if (!res.headersSent) res.status(404).json({ message: "File not found" });
        else res.end();
      })
      .pipe(res);
  } catch (error) {
    return answerError(res, error, "Open task file");
  }
};

// GET ALL TASKS (admins and superadmins; the route checks)
exports.getAllTasks = async (req, res) => {
  try {
    const tasks = await withPeople(Task.find()).sort({ createdAt: -1 });
    return res.status(200).json(tasks.map(normalizeTask));
  } catch (error) {
    return answerError(res, error, "Get all tasks");
  }
};

// DELETE TASK (admins and superadmins any task, a sub admin the tasks they gave), with its stored files
exports.deleteTask = async (req, res) => {
  try {
    const task = await findTask(req.params.id, req.user);
    if (!canChange(task, req.user)) throw new Refusal(403, "You can only delete tasks you gave.");
    await Task.findByIdAndDelete(task._id);
    // the task is gone either way; files that can't go now are taken by the hourly clean-up (utils/fileSweep.js)
    await deleteTaskFiles(storedFileIds(task)).catch((error) => console.error("Delete task: its files stay for the clean-up:", error.message));
    await forgetNotesAbout(task._id);
    return res.status(200).json({ message: "Task deleted successfully" });
  } catch (error) {
    return answerError(res, error, "Delete task");
  }
};
