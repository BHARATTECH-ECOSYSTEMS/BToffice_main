const InternalJob = require("../models/InternalJob");
const JobApplication = require("../models/JobApplication");
const User = require("../models/User");
const { canDeleteUser } = require("./userController");
const { restoreMember, MEMBER } = require("./communityController");
const { sendOneEach, sendTo } = require("../utils/bulkMail");
const { postingMessage, checkMessage, declinedMessage, welcomeMessage } = require("../utils/jobMail");
const { readDay, todayInIndia } = require("../utils/days");
const { Refusal, answerError, isAdmin, isManager, isObjectId } = require("../utils/refusal");

/*
 * Internal job postings for former colleagues (/api/community/jobs; server.js signs everyone in). Super Admins and
 * Admins post and run them; Sub Admins see the postings but not who applied. Posting emails the stream's members who
 * have a personal email. Applications move one step at a time: applied → meets criteria (or not this time) →
 * knowledge check sent (only once the email has gone) → rejoined (back in People, join date today, welcome email)
 * or not this time (a kind email, no reason).
 */

const { MODES, LIMITS } = InternalJob;
const { STAGES, NEXT } = JobApplication;
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INSTRUCTIONS_MAX = 1000;
const NOT_THERE = "That job isn't there any more.";

const text = (value) => (typeof value === "string" ? value.trim() : "");
const required = (value, max, missing) => {
  const v = text(value);
  if (!v) throw new Refusal(400, missing);
  if (v.length > max) throw new Refusal(400, `Keep it to ${max} characters.`);
  return v;
};

const readJob = (body = {}) => {
  if (!User.STREAMS.includes(body.stream)) throw new Refusal(400, "Pick the stream whose former colleagues it's offered to.");
  if (!MODES.includes(body.mode)) throw new Refusal(400, "Pick a work mode: on-site, hybrid or remote.");
  const openings = body.openings;
  if (!Number.isInteger(openings) || openings < 1 || openings > LIMITS.OPENINGS_MAX) throw new Refusal(400, `Openings must be a whole number from 1 to ${LIMITS.OPENINGS_MAX}.`);
  const closes = text(body.closes);
  if (closes && !readDay(closes)) throw new Refusal(400, "Give the apply-by date as a real date.");
  if (closes && closes < todayInIndia()) throw new Refusal(400, "The apply-by date has passed. Pick today or later.");
  const criteria = (Array.isArray(body.criteria) ? body.criteria : []).map(text).filter(Boolean);
  if (!criteria.length) throw new Refusal(400, 'Add at least one line under "Who can apply".');
  if (criteria.length > LIMITS.CRITERIA_MAX) throw new Refusal(400, `Keep "Who can apply" to ${LIMITS.CRITERIA_MAX} lines.`);
  if (criteria.some((c) => c.length > LIMITS.CRITERION_MAX)) throw new Refusal(400, `Keep each "Who can apply" line to ${LIMITS.CRITERION_MAX} characters.`);
  const applyEmail = text(body.applyEmail).toLowerCase();
  if (!EMAIL_SHAPE.test(applyEmail) || applyEmail.length > LIMITS.EMAIL_MAX) throw new Refusal(400, "Enter the email applications go to, like hr@bharattechorigin.com.");
  return {
    stream: body.stream,
    title: required(body.title, LIMITS.TITLE_MAX, "Enter the role, like Frontend Engineer."),
    about: required(body.about, LIMITS.ABOUT_MAX, "Say in a line or two what the role involves."),
    location: required(body.location, LIMITS.LOCATION_MAX, "Enter where the role is based, like Kanpur."),
    mode: body.mode,
    experience: required(body.experience, LIMITS.EXPERIENCE_MAX, "Enter the experience it needs, like 2+ years."),
    openings,
    closes,
    criteria,
    check: required(body.check, LIMITS.CHECK_MAX, "Describe the knowledge check, so people know what to expect."),
    applyEmail,
  };
};

// past its apply-by date (India time) a posting is closed, even before an admin closes it
const isOpen = (job) => job.open && !(job.closes && job.closes < todayInIndia());

const applicantView = (a) => ({
  id: String(a._id),
  personId: String(a.person?._id ?? a.person),
  name: a.person?.fullName || a.person?.email || "Removed user",
  stage: a.stage,
  updatedAt: a.stageAt,
  hasPersonalEmail: !!a.person?.personalEmail,
});

/** A job as `viewer` sees it; Super Admins and Admins also get its applicants (`applications`). */
const jobView = (job, viewer, applications = []) => ({
  id: String(job._id),
  stream: job.stream,
  title: job.title,
  about: job.about,
  location: job.location,
  mode: job.mode,
  experience: job.experience,
  openings: job.openings,
  closes: job.closes || "",
  criteria: job.criteria,
  check: job.check,
  applyEmail: job.applyEmail,
  postedBy: job.postedByName,
  postedOn: job.createdAt,
  open: isOpen(job),
  emailed: job.emailed || 0,
  failed: job.failed || 0,
  ...(isAdmin(viewer) ? { applicants: applications.filter((a) => String(a.job) === String(job._id)).map(applicantView) } : {}),
});

const applicationsOf = (jobIds) =>
  JobApplication.find({ job: { $in: jobIds } })
    .sort({ createdAt: 1 })
    .populate("person", "fullName email personalEmail")
    .lean();

/** One job as the admin now sees it, after a change. */
const freshView = async (jobId, viewer) => {
  const job = await InternalJob.findById(jobId).lean();
  if (!job) throw new Refusal(404, NOT_THERE);
  return jobView(job, viewer, await applicationsOf([job._id]));
};

const findJob = async (id) => {
  if (!isObjectId(id)) throw new Refusal(400, "That job isn't there.");
  const job = await InternalJob.findById(id).lean();
  if (!job) throw new Refusal(404, NOT_THERE);
  return job;
};
const mustRun = (user) => {
  if (!isAdmin(user)) throw new Refusal(403, "Only Super Admins and Admins run internal jobs.");
};

// GET /api/community/jobs
exports.listJobs = async (req, res) => {
  try {
    if (!isManager(req.user)) throw new Refusal(403, "Only Super Admins, Admins and Sub Admins see internal jobs.");
    const jobs = await InternalJob.find().sort({ createdAt: -1, _id: -1 }).lean();
    const applications = isAdmin(req.user) ? await applicationsOf(jobs.map((j) => j._id)) : [];
    res.json(jobs.map((j) => jobView(j, req.user, applications)));
  } catch (error) {
    answerError(res, error, "List internal jobs");
  }
};

// POST /api/community/jobs
exports.postJob = async (req, res) => {
  try {
    mustRun(req.user);
    const draft = readJob(req.body);
    const job = await InternalJob.create({ ...draft, postedBy: req.user.id, postedByName: req.user.fullName || req.user.email || "Bharattech HR" });
    // the stream's members who gave a personal email: people who left (isDeleted + leftOn), not people deleted
    const members = await User.find({ ...MEMBER, stream: draft.stream, personalEmail: { $type: "string" } }).select("personalEmail").lean();
    const counts = await sendOneEach(members.map((m) => m.personalEmail), postingMessage(job), "Internal job");
    const saved = await InternalJob.findByIdAndUpdate(job._id, { $set: counts }, { new: true }).lean();
    res.status(201).json({ job: jobView(saved, req.user) });
  } catch (error) {
    answerError(res, error, "Post an internal job");
  }
};

// PATCH /api/community/jobs/:id   { open: true | false }
exports.setJobOpen = async (req, res) => {
  try {
    mustRun(req.user);
    const job = await findJob(req.params.id);
    if (typeof req.body?.open !== "boolean") throw new Refusal(400, "Say whether the posting is open (true) or closed (false).");
    await InternalJob.updateOne({ _id: job._id }, { $set: { open: req.body.open } });
    res.json({ job: await freshView(job._id, req.user) });
  } catch (error) {
    answerError(res, error, "Open or close an internal job");
  }
};

// DELETE /api/community/jobs/:id — its applications go too; anyone who rejoined stays rejoined
exports.removeJob = async (req, res) => {
  try {
    mustRun(req.user);
    const job = await findJob(req.params.id);
    await JobApplication.deleteMany({ job: job._id });
    await InternalJob.deleteOne({ _id: job._id });
    res.json({ message: "Internal job deleted." });
  } catch (error) {
    answerError(res, error, "Delete an internal job");
  }
};

// POST /api/community/jobs/:id/applicants   { personId }
exports.addApplicant = async (req, res) => {
  try {
    mustRun(req.user);
    const job = await findJob(req.params.id);
    if (!isObjectId(req.body?.personId)) throw new Refusal(400, "Pick a former colleague from this community.");
    const person = await User.findOne({ _id: req.body.personId, ...MEMBER, stream: job.stream }).select("_id").lean();
    if (!person) throw new Refusal(400, "Only former colleagues from this job's community can apply.");
    if (!isOpen(job)) throw new Refusal(409, "This posting is closed. Reopen it to add applicants.");
    try {
      await JobApplication.create({ job: job._id, person: person._id });
    } catch (error) {
      if (error?.code === 11000) throw new Refusal(409, "They've already applied for this job.");
      throw error;
    }
    res.status(201).json({ job: await freshView(job._id, req.user) });
  } catch (error) {
    answerError(res, error, "Add an applicant");
  }
};

/** Moves the application from `from` to `to`, only if nobody moved it in between; false when someone did. */
const setStage = async (app, from, to) => !!(await JobApplication.findOneAndUpdate({ _id: app._id, stage: from }, { $set: { stage: to, stageAt: new Date() } }));
const CHANGED = "Someone moved this application a moment ago. The list has been refreshed.";

// POST /api/community/jobs/:id/applicants/:appId/stage   { from, to, instructions? }
exports.moveApplicant = async (req, res) => {
  try {
    mustRun(req.user);
    const job = await findJob(req.params.id);
    if (!isObjectId(req.params.appId)) throw new Refusal(400, "That application isn't there.");
    const app = await JobApplication.findOne({ _id: req.params.appId, job: job._id }).lean();
    if (!app) throw new Refusal(404, "That application isn't there any more.");
    const { from, to } = req.body ?? {};
    if (!STAGES.includes(to)) throw new Refusal(400, "Pick the next step for this application.");
    if (from !== app.stage) throw new Refusal(409, CHANGED);
    if (!NEXT[app.stage].includes(to)) throw new Refusal(409, "An application can't go there from where it is now.");

    const person = await User.findById(app.person);
    const reply = {};
    if (to === "checking") {
      const instructions = text(req.body.instructions);
      if (!instructions) throw new Refusal(400, "Add the test link or instructions to send.");
      if (instructions.length > INSTRUCTIONS_MAX) throw new Refusal(400, `Keep the instructions to ${INSTRUCTIONS_MAX} characters.`);
      if (!person?.personalEmail) throw new Refusal(400, "They have no personal email yet. Add one under Members first.");
      // the stage says "sent", so it changes only once the email has gone
      if (!(await sendTo(person.personalEmail, checkMessage(job, instructions), "Knowledge check"))) {
        throw new Refusal(502, "The knowledge check couldn't be emailed, so nothing changed. Try again in a minute.");
      }
      if (!(await setStage(app, from, to))) throw new Refusal(409, CHANGED);
      reply.emailed = true;
    } else if (to === "rejoined") {
      if (!person?.isDeleted || !person.leftOn) throw new Refusal(409, "They're no longer in the community.");
      if (!canDeleteUser(req.user.role, person.role)) throw new Refusal(403, "You can't bring this person back.");
      // claim the move first, so two admins can't both rejoin them; put it back if the rejoin itself fails
      if (!(await setStage(app, from, to))) throw new Refusal(409, CHANGED);
      let restored;
      try {
        restored = await restoreMember(person, { joinedOn: todayInIndia() });
      } catch (error) {
        await JobApplication.updateOne({ _id: app._id, stage: to }, { $set: { stage: from } });
        throw error;
      }
      reply.needsInvite = restored.needsInvite;
      reply.emailed = person.personalEmail ? await sendTo(person.personalEmail, welcomeMessage(job, restored.person), "Welcome back") : false;
    } else {
      if (!(await setStage(app, from, to))) throw new Refusal(409, CHANGED);
      if (to === "declined") reply.emailed = person?.personalEmail ? await sendTo(person.personalEmail, declinedMessage(job), "Not this time") : false;
    }
    res.json({ job: await freshView(job._id, req.user), ...reply });
  } catch (error) {
    answerError(res, error, "Move an application");
  }
};
