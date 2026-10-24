const Notification = require("../models/Notification");
const Policy = require("../models/Policy");
const User = require("../models/User");

/*
 * The signed-in person's notification bell (GET /api/notifications), marking notes read, and their email switches.
 * Everyone sees only their own notes. Policies still to accept are a live to-do for employees and interns: each time
 * the bell asks, a note is made for any policy they haven't accepted (so people who join later see them too) and the
 * notes for accepted or deleted policies go. A note's read state is kept on the backend, so it follows the person.
 */

const LIST_LIMIT = 50;
const EMAIL_SWITCHES = ["tasks", "certificates", "policies", "courses", "events"];

const isObjectId = (value) => /^[0-9a-f]{24}$/i.test(String(value ?? ""));
const roleKey = (role) => String(role || "").toLowerCase().replace(/[-_\s]/g, "");
// managers publish policies; only employees and interns accept them
const acceptsPolicies = (user) => ["employee", "intern"].includes(roleKey(user.role));

const view = (note) => ({
  id: String(note._id),
  kind: note.kind,
  title: note.title,
  detail: note.detail || "",
  link: note.link,
  at: note.createdAt,
  read: Boolean(note.readAt),
});

const answerError = (res, error, what) => {
  console.error(`${what} error:`, error.message);
  return res.status(500).json({ message: "Server Error" });
};

const duplicateOnly = (error) => error?.code === 11000 || (Array.isArray(error?.writeErrors) && error.writeErrors.every((e) => e.code === 11000));

/** Makes this person's policy notes match the policies they still have to accept. */
async function syncPolicyNotes(userId) {
  const me = String(userId);
  const policies = await Policy.find({}, "_id name pages acceptedBy").lean();
  const pending = policies.filter((p) => !(p.acceptedBy || []).some((a) => String(a.userId) === me));
  const pendingIds = pending.map((p) => String(p._id));

  await Notification.deleteMany({ userId, kind: "policy", refId: { $nin: pendingIds } });
  const have = new Set((await Notification.find({ userId, kind: "policy" }, "refId").lean()).map((n) => n.refId));
  const missing = pending.filter((p) => !have.has(String(p._id)));
  if (!missing.length) return;
  try {
    await Notification.insertMany(
      missing.map((p) => ({ userId, kind: "policy", title: `Policy to review: ${p.name}`, detail: `${p.pages} pages`, link: "/portal/policy", refId: String(p._id) })),
      { ordered: false },
    );
  } catch (error) {
    // the bell asked twice at once and the other request made these notes already (one per policy, unique index)
    if (!duplicateOnly(error)) throw error;
  }
}

// GET /api/notifications: { notes: latest 50, newest first, unread: how many are unread }
exports.listMine = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!isObjectId(userId)) return res.status(200).json({ notes: [], unread: 0 });
    if (acceptsPolicies(req.user)) await syncPolicyNotes(userId);
    const [notes, unread] = await Promise.all([
      Notification.find({ userId }).sort({ createdAt: -1, _id: -1 }).limit(LIST_LIMIT),
      Notification.countDocuments({ userId, readAt: null }),
    ]);
    return res.status(200).json({ notes: notes.map(view), unread });
  } catch (error) {
    return answerError(res, error, "List notifications");
  }
};

// POST /api/notifications/:id/read: someone else's note answers 404, the same as one that doesn't exist
exports.markRead = async (req, res) => {
  try {
    if (!isObjectId(req.params.id) || !isObjectId(req.user?.id)) return res.status(404).json({ message: "Notification not found" });
    const result = await Notification.updateOne({ _id: req.params.id, userId: req.user.id }, { $set: { readAt: new Date() } });
    if (!result.matchedCount) return res.status(404).json({ message: "Notification not found" });
    return res.status(200).json({ ok: true });
  } catch (error) {
    return answerError(res, error, "Mark notification read");
  }
};

// POST /api/notifications/read-all
exports.markAllRead = async (req, res) => {
  try {
    if (!isObjectId(req.user?.id)) return res.status(200).json({ updated: 0 });
    const result = await Notification.updateMany({ userId: req.user.id, readAt: null }, { $set: { readAt: new Date() } });
    return res.status(200).json({ updated: result.modifiedCount });
  } catch (error) {
    return answerError(res, error, "Mark all notifications read");
  }
};

// GET /api/notifications/prefs: { muted: the email switches this person turned off }
exports.getPrefs = async (req, res) => {
  try {
    const user = isObjectId(req.user?.id) ? await User.findById(req.user.id).select("mutedNotifications") : null;
    if (!user) return res.status(404).json({ message: "Account not found" });
    return res.status(200).json({ muted: user.mutedNotifications || [] });
  } catch (error) {
    return answerError(res, error, "Get notification settings");
  }
};

// PATCH /api/notifications/prefs { muted: [...] }
exports.setPrefs = async (req, res) => {
  try {
    const muted = req.body?.muted;
    if (!Array.isArray(muted) || !muted.every((k) => EMAIL_SWITCHES.includes(k))) {
      return res.status(400).json({ message: `muted must be a list of: ${EMAIL_SWITCHES.join(", ")}.` });
    }
    const unique = [...new Set(muted)];
    const user = isObjectId(req.user?.id) ? await User.findByIdAndUpdate(req.user.id, { $set: { mutedNotifications: unique } }, { returnDocument: "after" }).select("mutedNotifications") : null;
    if (!user) return res.status(404).json({ message: "Account not found" });
    return res.status(200).json({ muted: user.mutedNotifications });
  } catch (error) {
    return answerError(res, error, "Save notification settings");
  }
};
