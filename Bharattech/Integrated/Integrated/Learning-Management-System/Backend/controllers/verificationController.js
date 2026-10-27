const Verification = require("../models/Verification");
const User = require("../models/User");
const { KINDS, CHECKS, DOCUMENTS, SKIPPABLE_CHECKS, REASON_MAX, NAME_MAX, REGISTRATION_MAX, EMAIL_MAX, URL_MAX, NOTE_MAX } = Verification;
const { Refusal, answerError, isAdmin, isObjectId } = require("../utils/refusal");
const { forgetNotesAbout, notify } = require("../utils/notify");
const { sendAnswer } = require("../utils/verificationMail");
const { documentsView, removeFilesOf } = require("./idDocumentController");

/*
 * HR OPS verification requests (/api/verifications; server.js signs everyone in). Super Admins and Admins only.
 * - A company request is checked before we work with that company; an employee request is a background check;
 *   an employment request is another company asking us to confirm someone worked here (it comes in through the
 *   website's form, controllers/verificationRequestController.js, never from here).
 * - Admins tick off each check, then mark the request verified (every check ticked) or rejected (with a note
 *   saying why); a decision can be reopened. Only a pending request can be deleted: a decided one is the record.
 * - Every change is written to the request's log, here and nowhere else, so the trail can't be skipped.
 * - An employee check waits for the employee's upload (controllers/idDocumentController.js): Aadhaar and PAN their
 *   file, education at least one certificate, previous employment their letter. Previous employment may instead be
 *   marked "Not applicable" with a reason (by HR, or by the employee saying it's their first job), which counts as
 *   ticked. References is a plain tick. Opening an employee request tells that employee (bell and email) what to upload.
 * - Company requests send no bell notes or emails: they're the admins' working records. An employment decision is
 *   emailed to the requester (utils/verificationMail.js), and the log says whether it went.
 */

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// CIN, LLPIN and similar numbers: letters, digits and dashes
const REGISTRATION_SHAPE = /^[A-Z0-9][A-Z0-9-]*$/;
const DECISIONS = ["verified", "rejected", "pending"];
const PERSON_FIELDS = "fullName email role team employeeId isDeleted";

const requireAdmin = (user) => {
  if (!isAdmin(user)) throw new Refusal(403, "Only Super Admins and Admins use HR OPS.");
};

const nameOf = (user) => user.fullName || user.email || "An admin";
const entry = (user, text) => ({ at: new Date(), by: nameOf(user), text });
const labelOf = (kind, check) => CHECKS[kind].find((c) => c.id === check)?.label ?? check;
const companyKeyOf = (name) => name.toLowerCase().replace(/\s+/g, " ").trim();

const text = (value, max, problem) => {
  const out = typeof value === "string" ? value.trim() : "";
  if (!out || out.length > max) throw new Refusal(400, problem);
  return out;
};

const readCompany = (body) => {
  const company = text(body.company, NAME_MAX, `Enter the company name, up to ${NAME_MAX} characters.`).replace(/\s+/g, " ");
  const registration = text(body.registration, REGISTRATION_MAX, "Enter the registration number (CIN or LLPIN).").toUpperCase();
  if (!REGISTRATION_SHAPE.test(registration)) throw new Refusal(400, "A registration number has only letters, digits and dashes.");
  const contactEmail = typeof body.contactEmail === "string" ? body.contactEmail.trim().toLowerCase() : "";
  if (!EMAIL_SHAPE.test(contactEmail) || contactEmail.length > EMAIL_MAX) throw new Refusal(400, "Enter a contact email, like name@company.com.");
  let website = "";
  const raw = typeof body.website === "string" ? body.website.trim() : "";
  if (raw) {
    let url;
    try {
      url = new URL(raw);
    } catch {
      url = null;
    }
    // the portal shows it as a link people click, so only web addresses
    if (!url || !["http:", "https:"].includes(url.protocol) || url.href.length > URL_MAX) {
      throw new Refusal(400, "Enter the website as a full address, starting with https://");
    }
    website = url.href;
  }
  return { company, companyKey: companyKeyOf(company), registration, contactEmail, website };
};

const readPerson = async (personId) => {
  const person = isObjectId(personId) ? await User.findById(personId).select("role isDeleted") : null;
  if (!person || person.isDeleted) throw new Refusal(400, "That person isn't in the directory.");
  if (isAdmin(person)) throw new Refusal(400, "Super Admins and Admins aren't verified here.");
  return person._id;
};

const personView = (request) => {
  const p = request.person;
  if (p && p._id) {
    return { id: String(p._id), name: p.fullName || p.email, email: p.email, role: p.role, team: p.team || "", employeeId: p.employeeId || "", removed: !!p.isDeleted };
  }
  // the record itself is gone; populate leaves null, the id is still known
  return { id: String(request.populated("person") ?? p ?? ""), name: "", email: "", role: "", team: "", employeeId: "", removed: true };
};

const LEAD_FIELDS = "fullName employeeId role joinedOn isDeleted";
const leadOf = (person) =>
  person ? { name: person.fullName || "", employeeId: person.employeeId || "", role: person.role, joinedOn: person.joinedOn || "", current: !person.isDeleted } : null;

/**
 * For employment requests: who in our records they seem to be about, as a lead for the "Found in our records"
 * check, never a decision. The Employee ID they gave first, else the exact name (any case). People who have left
 * count: they still worked here. Names are compared as text (a collation), never as a pattern.
 */
const leadsFor = async (requests) => {
  const asked = requests.filter((r) => r.kind === "employment");
  const leads = new Map();
  if (!asked.length) return leads;
  const ids = [...new Set(asked.map((r) => r.givenEmployeeId).filter(Boolean))];
  const names = [...new Set(asked.map((r) => r.candidate).filter(Boolean))];
  const [byId, byName] = await Promise.all([
    ids.length ? User.find({ employeeId: { $in: ids } }).select(LEAD_FIELDS).lean() : [],
    names.length ? User.find({ fullName: { $in: names } }).collation({ locale: "en", strength: 2 }).select(LEAD_FIELDS).lean() : [],
  ]);
  for (const r of asked) {
    const match = byId.find((p) => r.givenEmployeeId && p.employeeId === r.givenEmployeeId) ?? byName.find((p) => (p.fullName || "").toLowerCase() === r.candidate.toLowerCase());
    leads.set(String(r._id), leadOf(match));
  }
  return leads;
};

const employmentView = (request, leads) => ({
  reference: request.reference,
  requesterCompany: request.requesterCompany,
  requesterName: request.requesterName,
  requesterEmail: request.requesterEmail,
  candidate: request.candidate,
  designation: request.designation,
  employeeId: request.givenEmployeeId || "",
  from: request.fromMonth,
  to: request.toMonth || "",
  consentAt: request.consentAt ?? null,
  // whether the current decision reached the requester
  answerEmailed: request.status !== "pending" && !!request.answeredAt,
  directoryMatch: leads.get(String(request._id)) ?? null,
});

const view = (request, leads = new Map()) => ({
  id: String(request._id),
  kind: request.kind,
  status: request.status,
  done: request.done,
  note: request.note,
  openedBy: request.openedByName,
  openedAt: request.createdAt,
  decidedBy: request.decidedByName || "",
  decidedAt: request.decidedAt ?? null,
  log: request.log.map((e) => ({ at: e.at, by: e.by, text: e.text })),
  ...(request.kind === "company"
    ? { company: request.company, registration: request.registration, contactEmail: request.contactEmail, website: request.website || "" }
    : request.kind === "employment"
      ? employmentView(request, leads)
      : {
          person: personView(request),
          documents: documentsView(request),
          notApplicable: request.notApplicable.map((n) => ({ check: n.check, reason: n.reason, by: n.by, byEmployee: !!n.byEmployee, at: n.at })),
        }),
});
/** One request as the admins see it, with its directory lead when it's an employment request. */
const viewOne = async (request) => view(request, await leadsFor([request]));

const withPerson = (query) => query.populate("person", PERSON_FIELDS);

const findRequest = async (id) => {
  const request = isObjectId(id) ? await withPerson(Verification.findById(id)) : null;
  if (!request) throw new Refusal(404, "That request isn't there any more.");
  return request;
};

/** Applies `change` only if the request is still in `expected`; anyone else's change in between makes it a 409. */
const applyIf = async (id, expected, change, stale) => {
  const updated = await withPerson(Verification.findOneAndUpdate({ _id: id, ...expected }, change, { returnDocument: "after", runValidators: true }));
  if (!updated) throw new Refusal(409, stale);
  return updated;
};

const DUPLICATE = { company: "This company already has a pending request.", employee: "They already have a pending verification." };

// What each employee check waits for before it can be ticked (a file proving it), and what to say while it waits.
// A check without an entry (References) is a plain tick.
const PROVIDED = {
  aadhaar: (r) => r.documents.some((d) => d.kind === "aadhaar"),
  pan: (r) => r.documents.some((d) => d.kind === "pan"),
  education: (r) => r.documents.some((d) => DOCUMENTS.find((x) => x.id === d.kind)?.check === "education"),
  employment: (r) => r.documents.some((d) => d.kind === "experience"),
};
const WAITING = {
  aadhaar: "The Aadhaar card can be ticked once the employee has uploaded it.",
  pan: "The PAN card can be ticked once the employee has uploaded it.",
  education: "Education certificates can be ticked once the employee has uploaded at least one.",
  employment: "Previous employment can be ticked once the employee has uploaded their letter, or mark it not applicable.",
};

// GET /api/verifications?kind=company|employee
exports.listRequests = async (req, res) => {
  try {
    requireAdmin(req.user);
    const { kind } = req.query;
    if (!KINDS.includes(kind)) throw new Refusal(400, "Say which requests: kind=company, kind=employee or kind=employment.");
    const requests = await withPerson(Verification.find({ kind }).sort({ createdAt: -1 }));
    const leads = await leadsFor(requests);
    return res.status(200).json(requests.map((r) => view(r, leads)));
  } catch (error) {
    return answerError(res, error, "List verifications");
  }
};

// POST /api/verifications { kind: "company", company, registration, contactEmail, website } | { kind: "employee", personId }
exports.openRequest = async (req, res) => {
  try {
    requireAdmin(req.user);
    const body = req.body ?? {};
    if (body.kind === "employment") throw new Refusal(400, "Requests from other companies come in through the website's form.");
    if (!KINDS.includes(body.kind)) throw new Refusal(400, "A request is for a company or an employee.");
    const fields = body.kind === "company" ? readCompany(body) : { person: await readPerson(body.personId) };
    const duplicate = body.kind === "company" ? { companyKey: fields.companyKey } : { person: fields.person };
    if (await Verification.exists({ kind: body.kind, status: "pending", ...duplicate })) throw new Refusal(409, DUPLICATE[body.kind]);
    let request;
    try {
      request = await Verification.create({
        kind: body.kind,
        ...fields,
        openedBy: req.user.id,
        openedByName: nameOf(req.user),
        log: [entry(req.user, "Opened the request")],
      });
    } catch (error) {
      // another admin opened the same one a moment ago (the partial unique indexes)
      if (error.code === 11000) throw new Refusal(409, DUPLICATE[body.kind]);
      throw error;
    }
    await request.populate("person", PERSON_FIELDS);
    if (request.kind === "employee") {
      // only they can upload their IDs, so they're told where (bell and email; never throws)
      await notify({
        userId: request.person._id,
        kind: "verification",
        title: "HR started your verification",
        detail: "Upload your Aadhaar and PAN, your education certificates and a previous employer's letter in Profile, under Verification documents.",
        link: "/portal/profile?docs=1",
        refId: request._id,
      });
    }
    return res.status(201).json(view(request));
  } catch (error) {
    return answerError(res, error, "Open verification");
  }
};

// PATCH /api/verifications/:id/checks { check, done }
exports.setCheck = async (req, res) => {
  try {
    requireAdmin(req.user);
    const request = await findRequest(req.params.id);
    const { check, done } = req.body ?? {};
    if (!CHECKS[request.kind].some((c) => c.id === check)) throw new Refusal(400, "That isn't one of this request's checks.");
    if (typeof done !== "boolean") throw new Refusal(400, "Say whether the check is done (true or false).");
    if (request.status !== "pending") throw new Refusal(409, "This request is decided. Reopen it to change the checks.");
    const skipped = request.notApplicable?.some((n) => n.check === check);
    if (request.kind === "employee" && done && !skipped && PROVIDED[check] && !PROVIDED[check](request)) throw new Refusal(409, WAITING[check]);
    // one atomic change each, so two admins ticking at the same moment both count; unticking also clears "Not applicable"
    const updated = await applyIf(
      request._id,
      { status: "pending" },
      {
        ...(done
          ? { $addToSet: { done: check } }
          : { $pull: { done: check, ...(SKIPPABLE_CHECKS.includes(check) ? { notApplicable: { check } } : {}) } }),
        $push: { log: entry(req.user, `${done ? "Checked" : "Unchecked"} ${labelOf(request.kind, check)}`) },
      },
      "This request was decided a moment ago. Reopen it to change the checks."
    );
    return res.status(200).json(await viewOne(updated));
  } catch (error) {
    return answerError(res, error, "Set verification check");
  }
};

// POST /api/verifications/:id/not-applicable { check: "employment", reason }
exports.markNotApplicable = async (req, res) => {
  try {
    requireAdmin(req.user);
    const request = await findRequest(req.params.id);
    const { check } = req.body ?? {};
    if (request.kind !== "employee") throw new Refusal(400, "Only an employee's checks can be marked not applicable.");
    if (!SKIPPABLE_CHECKS.includes(check)) throw new Refusal(400, "Only Previous employment can be marked not applicable.");
    const reason = typeof req.body.reason === "string" ? req.body.reason.trim().replace(/\s+/g, " ") : "";
    if (!reason || reason.length > REASON_MAX) throw new Refusal(400, `Say why it doesn't apply, up to ${REASON_MAX} characters.`);
    if (request.status !== "pending") throw new Refusal(409, "This request is decided. Reopen it to change the checks.");
    if (request.notApplicable.some((n) => n.check === check)) throw new Refusal(409, "It's already marked not applicable.");
    const now = new Date();
    const updated = await applyIf(
      request._id,
      { status: "pending", "notApplicable.check": { $ne: check } },
      {
        $addToSet: { done: check },
        $push: {
          notApplicable: { check, reason, by: nameOf(req.user), byEmployee: false, at: now },
          log: entry(req.user, `Marked ${labelOf("employee", check)} not applicable: ${reason}`),
        },
      },
      "Someone changed this request a moment ago. Reload it and try again."
    );
    return res.status(200).json(view(updated));
  } catch (error) {
    return answerError(res, error, "Mark verification check not applicable");
  }
};

// POST /api/verifications/:id/decision { status: "verified" | "rejected" | "pending", note }
exports.decide = async (req, res) => {
  try {
    requireAdmin(req.user);
    const request = await findRequest(req.params.id);
    const { status } = req.body ?? {};
    if (!DECISIONS.includes(status)) throw new Refusal(400, "The decision is verified, rejected, or pending to reopen it.");
    const rawNote = req.body.note;
    if (rawNote !== undefined && (typeof rawNote !== "string" || rawNote.trim().length > NOTE_MAX)) {
      throw new Refusal(400, `Keep the note under ${NOTE_MAX} characters.`);
    }
    const note = typeof rawNote === "string" ? rawNote.trim() : undefined;

    if (status === "pending") {
      if (request.status === "pending") throw new Refusal(409, "It's still pending, so there's no decision to undo.");
      const updated = await applyIf(
        request._id,
        { status: request.status },
        // the old decision's note goes, so it isn't read as the next one's; the log keeps it
        {
          $set: { status: "pending", decidedByName: "", note: "" },
          $unset: { decidedBy: 1, decidedAt: 1, answeredAt: 1 },
          $push: { log: entry(req.user, request.note ? `Reopened. The note was: ${request.note}` : "Reopened") },
        },
        "Someone changed this request a moment ago. Reload it and try again."
      );
      return res.status(200).json(await viewOne(updated));
    }

    // a rejection without a reason leaves nobody able to fix it
    if (status === "rejected" && !note) throw new Refusal(400, "Add a note saying why it was rejected.");
    if (request.status !== "pending") throw new Refusal(409, "It's already decided. Reopen it first.");
    const checks = CHECKS[request.kind].map((c) => c.id);
    if (status === "verified" && !checks.every((c) => request.done.includes(c))) throw new Refusal(409, "Tick every check before marking it verified.");
    const updated = await applyIf(
      request._id,
      // verifying also needs every check still ticked when it's saved
      status === "verified" ? { status: "pending", done: { $all: checks } } : { status: "pending" },
      {
        $set: { status, decidedBy: req.user.id, decidedByName: nameOf(req.user), decidedAt: new Date(), ...(note !== undefined ? { note } : {}) },
        $push: { log: entry(req.user, status === "verified" ? "Marked verified" : "Rejected") },
      },
      "Someone changed this request a moment ago. Reload it and try again."
    );
    if (updated.kind !== "employment") return res.status(200).json(view(updated));
    // the requester is answered before the reply, so the desk can say truthfully whether the email went
    const emailed = await sendAnswer(updated);
    const answered = await withPerson(
      Verification.findOneAndUpdate(
        { _id: updated._id },
        {
          ...(emailed ? { $set: { answeredAt: new Date() } } : {}),
          $push: { log: { at: new Date(), by: "System", text: emailed ? `Emailed the answer to ${updated.requesterEmail}` : `Couldn't email the answer to ${updated.requesterEmail}; reply by hand` } },
        },
        { returnDocument: "after" }
      )
    );
    return res.status(200).json(await viewOne(answered ?? updated));
  } catch (error) {
    return answerError(res, error, "Decide verification");
  }
};

// DELETE /api/verifications/:id (pending only)
exports.removeRequest = async (req, res) => {
  try {
    requireAdmin(req.user);
    const request = await findRequest(req.params.id);
    const decided = "A decided request is kept as the record. Reopen it if it needs another look.";
    if (request.status !== "pending") throw new Refusal(409, decided);
    const { deletedCount } = await Verification.deleteOne({ _id: request._id, status: "pending" });
    if (!deletedCount) throw new Refusal(409, decided);
    // its bell notes (admins' for an outside request, the employee's for theirs) and an employee's uploaded IDs go too
    await forgetNotesAbout(request._id);
    // the request is gone either way; files that can't go now are taken by the hourly clean-up (utils/fileSweep.js)
    await removeFilesOf(request).catch((error) => console.error("Delete verification: its files stay for the clean-up:", error.message));
    return res.status(200).json({ id: String(request._id), message: "The request was deleted." });
  } catch (error) {
    return answerError(res, error, "Delete verification");
  }
};
