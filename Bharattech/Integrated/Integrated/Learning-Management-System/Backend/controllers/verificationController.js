const Verification = require("../models/Verification");
const User = require("../models/User");
const { KINDS, CHECKS, UPLOAD_CHECKS, NAME_MAX, REGISTRATION_MAX, EMAIL_MAX, URL_MAX, NOTE_MAX } = Verification;
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
 * - The employee's Aadhaar and PAN are their own uploads (controllers/idDocumentController.js): those two checks can
 *   be ticked once the file is there. Opening an employee request tells that employee (bell and email) to upload them.
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
      : { person: personView(request), documents: documentsView(request) }),
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
  const updated = await withPerson(Verification.findOneAndUpdate({ _id: id, ...expected }, change, { new: true, runValidators: true }));
  if (!updated) throw new Refusal(409, stale);
  return updated;
};

const DUPLICATE = { company: "This company already has a pending request.", employee: "They already have a pending verification." };

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
        detail: "Upload your Aadhaar and PAN in Profile, under Verification documents.",
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
    if (request.kind === "employee" && UPLOAD_CHECKS.includes(check) && done && !request.documents.some((d) => d.kind === check)) {
      throw new Refusal(409, `The ${labelOf("employee", check)} can be ticked once the employee has uploaded it.`);
    }
    // one atomic change each, so two admins ticking at the same moment both count
    const updated = await applyIf(
      request._id,
      { status: "pending" },
      { [done ? "$addToSet" : "$pull"]: { done: check }, $push: { log: entry(req.user, `${done ? "Checked" : "Unchecked"} ${labelOf(request.kind, check)}`) } },
      "This request was decided a moment ago. Reopen it to change the checks."
    );
    return res.status(200).json(await viewOne(updated));
  } catch (error) {
    return answerError(res, error, "Set verification check");
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
        { $set: { status: "pending", decidedByName: "" }, $unset: { decidedBy: 1, decidedAt: 1, answeredAt: 1 }, $push: { log: entry(req.user, "Reopened") } },
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
        { new: true }
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
    await removeFilesOf(request);
    return res.status(200).json({ id: String(request._id), message: "The request was deleted." });
  } catch (error) {
    return answerError(res, error, "Delete verification");
  }
};
