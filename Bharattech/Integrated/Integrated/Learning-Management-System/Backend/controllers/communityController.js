const User = require("../models/User");
const { canDeleteUser, setKeycloakEnabled } = require("./userController");
const { todayInIndia } = require("../utils/days");
const { Refusal, answerError, isAdmin, isObjectId } = require("../utils/refusal");

/*
 * The Bharattech Community: people who have left (/api/community; server.js signs everyone in).
 * - Leaving: whoever may delete someone may mark them as left (never themselves). Their Keycloak account is switched
 *   off first (kept, not deleted, every session ended); only then is the record changed, so a Keycloak failure leaves
 *   everything as it was. The record stays, with isDeleted (every list of current staff skips them) and leftOn.
 * - Bringing back undoes that, with the same Employee ID.
 * - Everyone signed in sees the members' name, stream and leaving day; Super Admins and Admins also see the Employee
 *   ID, the personal email the community reaches them on, and whether they may bring each one back.
 * - Staff give their own personal email ahead of leaving; admins add or change a member's.
 * ID documents are deleted 60 days after leaving by utils/leaverDocuments.js.
 */

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMAIL_MAX = 120;
const MEMBER = { isDeleted: true, leftOn: { $type: "string" } };
const NOT_HERE = "That person isn't in the directory.";
const NOT_A_MEMBER = "They aren't in the community.";

/** A member as `viewer` sees them; Super Admins and Admins also get what they need to look after them. */
const memberView = (user, viewer) => ({
  id: String(user._id),
  name: user.fullName || user.email,
  stream: user.stream,
  leftOn: user.leftOn,
  ...(viewer && isAdmin(viewer)
    ? { employeeId: user.employeeId || "", personalEmail: user.personalEmail || "", canBringBack: canDeleteUser(viewer.role, user.role) }
    : {}),
});

const readUserId = (value) => {
  if (!isObjectId(value)) throw new Refusal(400, NOT_HERE);
  return value;
};

const mustBeAdmin = (user, message) => {
  if (!isAdmin(user)) throw new Refusal(403, message);
};

/** The personal email as it will be stored, or null to remove it. Never the person's own work email. */
const readPersonalEmail = (raw, workEmail) => {
  if (raw === "" || raw == null) return null;
  if (typeof raw !== "string") throw new Refusal(400, "Enter an email like name@gmail.com.");
  const email = raw.trim().toLowerCase();
  if (!email) return null;
  if (email.length > EMAIL_MAX) throw new Refusal(400, `That email is too long (${EMAIL_MAX} characters at most).`);
  if (!EMAIL_SHAPE.test(email)) throw new Refusal(400, "Enter an email like name@gmail.com.");
  if (email === String(workEmail || "").toLowerCase()) throw new Refusal(400, "A work email stops working when someone leaves. Use a personal one.");
  return email;
};

const TAKEN = "Someone else already uses this email.";

/** Saves (or removes) a personal email on the record matching `where`; null when no such record. */
const savePersonalEmail = async (where, user, raw) => {
  const email = readPersonalEmail(raw, user.email);
  if (email && (await User.exists({ personalEmail: email, _id: { $ne: user._id } }))) throw new Refusal(409, TAKEN);
  try {
    const saved = await User.findOneAndUpdate(where, email ? { $set: { personalEmail: email } } : { $unset: { personalEmail: 1 } }, { new: true });
    return saved ? { personalEmail: saved.personalEmail || "" } : null;
  } catch (error) {
    // two people saving the same email at once: the unique index lets one through
    if (error?.code === 11000) throw new Refusal(409, TAKEN);
    throw error;
  }
};

// GET /api/community/members
exports.listMembers = async (req, res) => {
  try {
    const list = await User.find(MEMBER).select("fullName email role stream leftOn employeeId personalEmail").sort({ leftOn: -1, fullName: 1 }).lean();
    res.json(list.map((u) => memberView(u, req.user)));
  } catch (error) {
    answerError(res, error, "List community members");
  }
};

// POST /api/community/leave/:userId
exports.markLeft = async (req, res) => {
  try {
    mustBeAdmin(req.user, "Only Super Admins and Admins mark people as left.");
    const id = readUserId(req.params.userId);
    if (id === String(req.user.id)) throw new Refusal(403, "You can't mark yourself as left.");
    const person = await User.findOne({ _id: id, isDeleted: { $ne: true } });
    if (!person) throw new Refusal(404, NOT_HERE);
    if (!canDeleteUser(req.user.role, person.role)) throw new Refusal(403, "You can't mark this person as left.");
    if (!person.stream) throw new Refusal(400, "Set their stream in Details first: it decides which community they join.");

    try {
      await setKeycloakEnabled(person.keycloakId, false);
    } catch (error) {
      console.error("Leaving: switching off the Keycloak account failed:", error.message);
      throw new Refusal(502, "Their sign-in couldn't be switched off right now, so nothing was changed. Try again in a minute.");
    }

    let left;
    try {
      left = await User.findOneAndUpdate(
        { _id: id, isDeleted: { $ne: true } },
        { $set: { isDeleted: true, deletedAt: new Date(), leftOn: todayInIndia() } },
        { new: true }
      );
    } catch (error) {
      // put their sign-in back, so a failed save doesn't leave someone locked out but still listed as staff
      await setKeycloakEnabled(person.keycloakId, true).catch((e) => console.error("Leaving: switching the account back on failed:", e.message));
      throw error;
    }
    if (!left) throw new Refusal(404, NOT_HERE);
    res.json({ member: memberView(left, null) });
  } catch (error) {
    answerError(res, error, "Mark as left");
  }
};

// POST /api/community/members/:userId/back
exports.bringBack = async (req, res) => {
  try {
    mustBeAdmin(req.user, "Only Super Admins and Admins bring people back.");
    const id = readUserId(req.params.userId);
    const member = await User.findOne({ _id: id, ...MEMBER });
    if (!member) throw new Refusal(404, NOT_A_MEMBER);
    if (!canDeleteUser(req.user.role, member.role)) throw new Refusal(403, "You can't bring this person back.");

    let hasAccount;
    try {
      hasAccount = await setKeycloakEnabled(member.keycloakId, true);
    } catch (error) {
      console.error("Bringing back: switching on the Keycloak account failed:", error.message);
      throw new Refusal(502, "Their sign-in couldn't be switched back on right now, so they're still in the community. Try again in a minute.");
    }

    const back = await User.findOneAndUpdate({ _id: id, ...MEMBER }, { $set: { isDeleted: false, deletedAt: null }, $unset: { leftOn: 1 } }, { new: true });
    if (!back) throw new Refusal(404, NOT_A_MEMBER);
    // with their Keycloak account gone, they're back in People but need an invite to sign in again
    res.json({ person: { id: String(back._id), name: back.fullName || back.email }, needsInvite: !hasAccount });
  } catch (error) {
    answerError(res, error, "Bring back");
  }
};

// GET /api/community/me/personal-email
exports.getMyPersonalEmail = async (req, res) => {
  try {
    const me = await User.findOne({ _id: req.user.id, isDeleted: { $ne: true } }).select("personalEmail").lean();
    if (!me) throw new Refusal(404, NOT_HERE);
    res.json({ personalEmail: me.personalEmail || "" });
  } catch (error) {
    answerError(res, error, "Read personal email");
  }
};

// PUT /api/community/me/personal-email
exports.setMyPersonalEmail = async (req, res) => {
  try {
    const me = await User.findOne({ _id: req.user.id, isDeleted: { $ne: true } }).select("email").lean();
    if (!me) throw new Refusal(404, NOT_HERE);
    const saved = await savePersonalEmail({ _id: me._id, isDeleted: { $ne: true } }, me, req.body?.personalEmail);
    if (!saved) throw new Refusal(404, NOT_HERE);
    res.json(saved);
  } catch (error) {
    answerError(res, error, "Save personal email");
  }
};

// PUT /api/community/members/:userId/personal-email
exports.setMemberPersonalEmail = async (req, res) => {
  try {
    mustBeAdmin(req.user, "Only Super Admins and Admins change a member's personal email.");
    const id = readUserId(req.params.userId);
    const member = await User.findOne({ _id: id, ...MEMBER }).select("email").lean();
    if (!member) throw new Refusal(404, NOT_A_MEMBER);
    const saved = await savePersonalEmail({ _id: member._id, ...MEMBER }, member, req.body?.personalEmail);
    if (!saved) throw new Refusal(404, NOT_A_MEMBER);
    res.json(saved);
  } catch (error) {
    answerError(res, error, "Save a member's personal email");
  }
};
