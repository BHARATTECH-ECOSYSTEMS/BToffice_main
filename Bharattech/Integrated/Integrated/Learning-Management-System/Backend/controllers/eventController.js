const CalendarEvent = require("../models/CalendarEvent");
const { KINDS, TITLE_MAX } = require("../models/CalendarEvent");
const { noteEvent } = require("../utils/notify");
const { todayInIndia, readDay } = require("../utils/days");

/*
 * The portal calendar's events (GET/POST /api/events, PATCH/DELETE /api/events/:id; server.js signs everyone in).
 * - Everyone signed in sees every event.
 * - Superadmins, admins and sub admins add events; admins and superadmins change or cancel any, a sub admin only
 *   their own (the same rule as tasks).
 * - Adding, changing or cancelling one tells everyone else in their bell and by email (utils/notify.js noteEvent),
 *   unless the event is already over.
 */

const KIND_LABEL = { meeting: "Meeting", training: "Training", deadline: "Deadline", holiday: "Holiday" };
// about 13 months: enough for any month the calendar shows plus its "coming up" list
const RANGE_MAX_DAYS = 400;
const DAY_MS = 24 * 60 * 60 * 1000;

const roleKey = (role) => String(role || "").toLowerCase().replace(/[-_\s]/g, "");
const isAdmin = (user) => ["admin", "superadmin"].includes(roleKey(user.role));
const isManager = (user) => isAdmin(user) || roleKey(user.role) === "subadmin";
const isObjectId = (value) => /^[0-9a-f]{24}$/i.test(String(value ?? ""));
const canChange = (event, user) => isAdmin(user) || (isManager(user) && String(event.createdBy?._id ?? event.createdBy) === String(user.id));

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

/** The event as the request would leave it: `current` with the request's changes, all checked. */
const readEvent = (body = {}, current = {}) => {
  const pick = (field) => (field in body ? body[field] : current[field]);
  const title = typeof pick("title") === "string" ? pick("title").trim() : "";
  if (!title) throw new Refusal(400, "Give the event a name.");
  if (title.length > TITLE_MAX) throw new Refusal(400, `Keep the name under ${TITLE_MAX} characters.`);
  const kind = pick("kind");
  if (!KINDS.includes(kind)) throw new Refusal(400, `The type must be one of: ${KINDS.join(", ")}.`);
  const date = readDay(pick("date"));
  if (!date) throw new Refusal(400, "Pick a real date.");
  if (date < todayInIndia()) throw new Refusal(400, "The date has already passed. Pick today or a later day.");
  const time = pick("time") ?? "";
  if (typeof time !== "string" || !/^(|([01]\d|2[0-3]):[0-5]\d)$/.test(time)) throw new Refusal(400, "Pick a time like 09:30, or leave it empty for all day.");
  return { title, kind, date, time };
};

const DAY_FMT = new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const whenOf = (event) => `${DAY_FMT.format(new Date(`${event.date}T00:00:00Z`))}${event.time ? `, ${event.time}` : ""}`;
const detailOf = (event, byName) => [KIND_LABEL[event.kind], whenOf(event), byName && `By ${byName}`].filter(Boolean).join(" · ");

const view = (event, user) => ({
  id: String(event._id),
  title: event.title,
  kind: event.kind,
  date: event.date,
  time: event.time || "",
  addedBy: event.createdBy?.fullName || event.createdBy?.email || "",
  canChange: canChange(event, user),
});

const findEvent = async (id) => {
  const event = isObjectId(id) ? await CalendarEvent.findById(id) : null;
  if (!event) throw new Refusal(404, "That event isn't on the calendar any more.");
  return event;
};

/** Tells everyone else about the event (unless it's over): notes now, emails after the reply has gone. */
const tellEveryone = (event, action, user) =>
  event.date < todayInIndia() || !isObjectId(user.id) ? async () => {} : noteEvent({ event, action, detail: detailOf(event, user.fullName), actorId: user.id });

// GET /api/events?from=YYYY-MM-DD&to=YYYY-MM-DD
exports.listEvents = async (req, res) => {
  try {
    const from = readDay(req.query.from);
    const to = readDay(req.query.to);
    if (!from || !to || to < from) throw new Refusal(400, "Ask for the events between two dates (from and to, YYYY-MM-DD).");
    if ((Date.parse(to) - Date.parse(from)) / DAY_MS > RANGE_MAX_DAYS) throw new Refusal(400, `Ask for at most ${RANGE_MAX_DAYS} days at a time.`);
    const events = await CalendarEvent.find({ date: { $gte: from, $lte: to } })
      .sort({ date: 1, time: 1, createdAt: 1 })
      .populate("createdBy", "fullName email");
    return res.status(200).json(events.map((e) => view(e, req.user)));
  } catch (error) {
    return answerError(res, error, "List events");
  }
};

// POST /api/events { title, kind, date, time }
exports.addEvent = async (req, res) => {
  try {
    if (!isManager(req.user)) throw new Refusal(403, "Only admins and sub admins add events.");
    const event = await CalendarEvent.create({ ...readEvent(req.body), createdBy: req.user.id });
    const sendEmails = await tellEveryone(event, "added", req.user);
    await event.populate("createdBy", "fullName email");
    res.status(201).json(view(event, req.user));
    await sendEmails();
  } catch (error) {
    return answerError(res, error, "Add event");
  }
};

// PATCH /api/events/:id { any of title, kind, date, time }
exports.changeEvent = async (req, res) => {
  try {
    const event = await findEvent(req.params.id);
    if (!canChange(event, req.user)) throw new Refusal(403, "You can only change events you added.");
    const next = readEvent(req.body, event);
    const changed = Object.keys(next).some((k) => next[k] !== (event[k] || ""));
    Object.assign(event, next);
    await event.save();
    const sendEmails = changed ? await tellEveryone(event, "changed", req.user) : async () => {};
    await event.populate("createdBy", "fullName email");
    res.status(200).json(view(event, req.user));
    await sendEmails();
  } catch (error) {
    return answerError(res, error, "Change event");
  }
};

// DELETE /api/events/:id
exports.cancelEvent = async (req, res) => {
  try {
    const event = await findEvent(req.params.id);
    if (!canChange(event, req.user)) throw new Refusal(403, "You can only cancel events you added.");
    await event.deleteOne();
    const sendEmails = await tellEveryone(event, "cancelled", req.user);
    res.status(200).json({ message: "Event cancelled" });
    await sendEmails();
  } catch (error) {
    return answerError(res, error, "Cancel event");
  }
};

exports.todayInIndia = todayInIndia;
