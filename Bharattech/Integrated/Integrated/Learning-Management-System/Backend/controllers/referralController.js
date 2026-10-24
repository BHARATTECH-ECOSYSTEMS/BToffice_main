const Referral = require("../models/Referral");
const User = require("../models/User");
const { sendReferralEmails } = require("../utils/referralMail");
const { Refusal, answerError, isAdmin, isManager, isObjectId } = require("../utils/refusal");

/*
 * Referrals: jobs at other companies passed on to the former colleagues of one stream (/api/community/referrals;
 * server.js signs everyone in). Super Admins and Admins share and remove them; Sub Admins see the list too.
 * Sharing emails each member of that stream who has a personal email, once; the list keeps how many went, never
 * who they went to. Removing one doesn't take back what was sent.
 */

const { TITLE_MAX, COMPANY_MAX, NOTE_MAX, LINK_MAX } = Referral.LIMITS;

const text = (value) => (typeof value === "string" ? value.trim() : null);

const readRequired = (value, max, missing) => {
  const trimmed = text(value);
  if (!trimmed) throw new Refusal(400, missing);
  if (trimmed.length > max) throw new Refusal(400, `Keep it to ${max} characters.`);
  return trimmed;
};

/** A web address starting with http:// or https://, or "" for none. */
const readLink = (value) => {
  const raw = text(value) ?? "";
  if (!raw) return "";
  const problem = `Enter the link as a full web address starting with http:// or https:// (up to ${LINK_MAX} characters).`;
  if (raw.length > LINK_MAX) throw new Refusal(400, problem);
  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("not a web link");
    return url.href;
  } catch {
    throw new Refusal(400, problem);
  }
};

const readReferral = (body = {}) => {
  if (!User.STREAMS.includes(body.stream)) throw new Refusal(400, "Pick the stream whose former colleagues should get it.");
  const note = text(body.note) ?? "";
  if (note.length > NOTE_MAX) throw new Refusal(400, `Keep the note to ${NOTE_MAX} characters.`);
  return {
    stream: body.stream,
    title: readRequired(body.title, TITLE_MAX, "Enter the role, like Backend Engineer."),
    company: readRequired(body.company, COMPANY_MAX, "Enter the company that is hiring."),
    link: readLink(body.link),
    note,
  };
};

const referralView = (r) => ({
  id: String(r._id),
  stream: r.stream,
  title: r.title,
  company: r.company,
  link: r.link || "",
  note: r.note || "",
  sharedBy: r.sharedByName,
  sharedOn: r.createdAt,
  emailed: r.emailed || 0,
  failed: r.failed || 0,
});

// GET /api/community/referrals
exports.listReferrals = async (req, res) => {
  try {
    if (!isManager(req.user)) throw new Refusal(403, "Only Super Admins, Admins and Sub Admins see referrals.");
    const list = await Referral.find().sort({ createdAt: -1, _id: -1 }).lean();
    res.json(list.map(referralView));
  } catch (error) {
    answerError(res, error, "List referrals");
  }
};

// POST /api/community/referrals
exports.shareReferral = async (req, res) => {
  try {
    if (!isAdmin(req.user)) throw new Refusal(403, "Only Super Admins and Admins share referrals.");
    const draft = readReferral(req.body);
    const referral = await Referral.create({ ...draft, sharedBy: req.user.id, sharedByName: req.user.fullName || req.user.email || "Bharattech HR" });

    // the stream's members who gave a personal email: people who left (isDeleted + leftOn), not people deleted
    const members = await User.find({ isDeleted: true, leftOn: { $type: "string" }, stream: draft.stream, personalEmail: { $type: "string" } })
      .select("personalEmail")
      .lean();
    const counts = await sendReferralEmails(referral, members.map((m) => m.personalEmail));
    const saved = await Referral.findByIdAndUpdate(referral._id, { $set: counts }, { returnDocument: "after" }).lean();
    res.status(201).json({ referral: referralView(saved ?? { ...referral.toObject(), ...counts }) });
  } catch (error) {
    answerError(res, error, "Share a referral");
  }
};

// DELETE /api/community/referrals/:id
exports.removeReferral = async (req, res) => {
  try {
    if (!isAdmin(req.user)) throw new Refusal(403, "Only Super Admins and Admins remove referrals.");
    if (!isObjectId(req.params.id)) throw new Refusal(400, "That referral isn't there.");
    const gone = await Referral.findByIdAndDelete(req.params.id);
    if (!gone) throw new Refusal(404, "That referral isn't there any more.");
    res.json({ message: "Referral removed." });
  } catch (error) {
    answerError(res, error, "Remove a referral");
  }
};
