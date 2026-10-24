const OfficeVisit = require("../models/OfficeVisit");
const { REASON_MAX } = require("../models/OfficeVisit");
const User = require("../models/User");
const { canEditUser } = require("./userController");
const { todayInIndia, readDay, indiaDayOf, endOfIndiaDay } = require("../utils/days");
const { Refusal, answerError, isAdmin, isManager, isObjectId } = require("../utils/refusal");

/*
 * e-Office attendance (/api/attendance; server.js signs everyone in).
 * - Everyone checks in ("Join") and out ("Leave") for themselves, as often as they like; each visit is a record.
 * - A visit still open when its India day ends is closed at 23:59:59.999 that day and marked noCheckOut. That happens
 *   whenever anyone asks for attendance, in one conditional update, so two servers never close it twice differently.
 * - Everyone sees their own history; Super Admins, Admins and Sub Admins see everyone's.
 * - Super Admins and Admins correct a finished visit's times with a reason (an Admin only for the people they may
 *   edit, and themselves); every correction is kept on the visit.
 * No bell notes or emails, and no location or network checks (owner's choice 6A).
 */

// about 13 months, as the calendar
const RANGE_MAX_DAYS = 400;
const HISTORY_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;
const PERSON = "fullName email employeeId role";

const iso = (moment) => (moment ? new Date(moment).toISOString() : null);
const nameOf = (user) => user?.fullName || user?.email || "";
const shiftDay = (day, n) => new Date(Date.parse(`${day}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);

const closeFinishedDays = () =>
  OfficeVisit.updateMany(
    { open: true, day: { $lt: todayInIndia() } },
    [{ $set: { open: false, noCheckOut: true, outAt: { $dateFromString: { dateString: { $concat: ["$day", "T23:59:59.999"] }, timezone: "+05:30" } } } }],
    { updatePipeline: true }
  );

const times = (t) => ({ inAt: iso(t?.inAt), outAt: iso(t?.outAt) });
const visitView = (visit) => ({
  id: String(visit._id),
  inAt: iso(visit.inAt),
  outAt: iso(visit.outAt),
  noCheckOut: Boolean(visit.noCheckOut),
  corrections: (visit.corrections || []).map((c) => ({ at: iso(c.at), byName: c.byName, reason: c.reason, from: times(c.from), to: times(c.to) })),
});

/** Whole minutes spent in, counting a visit that's still going up to now. */
const minutesOf = (visits, now) => Math.floor(visits.reduce((sum, v) => sum + ((v.outAt ? v.outAt.getTime() : now) - v.inAt.getTime()), 0) / 60000);

/** Visits grouped by day, newest day first, each day's visits in order. */
const daysOf = (visits, now) => {
  const byDay = new Map();
  for (const visit of [...visits].sort((a, b) => a.inAt - b.inAt)) byDay.set(visit.day, [...(byDay.get(visit.day) || []), visit]);
  return [...byDay.entries()]
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .map(([day, list]) => ({ day, minutes: minutesOf(list, now), noCheckOut: list.some((v) => v.noCheckOut), visits: list.map(visitView) }));
};

/** from/to from the query, or the last HISTORY_DAYS days when neither is given. */
const readRange = (query, today) => {
  if (query.from === undefined && query.to === undefined) return { from: shiftDay(today, -HISTORY_DAYS), to: today };
  const from = readDay(query.from);
  const to = readDay(query.to);
  if (!from || !to || to < from) throw new Refusal(400, "Ask for the days between two dates (from and to, YYYY-MM-DD).");
  if ((Date.parse(to) - Date.parse(from)) / DAY_MS > RANGE_MAX_DAYS) throw new Refusal(400, `Ask for at most ${RANGE_MAX_DAYS} days at a time.`);
  return { from, to };
};

// demo sign-ins have no stored person to keep visits for
const requireRecord = (user) => {
  if (!isObjectId(user.id)) throw new Refusal(403, "This account has no attendance record.");
};

const canCorrect = (actor, person) => isAdmin(actor) && (String(person._id) === String(actor.id) || canEditUser(actor.role, person.role));

/** The person's own attendance: whether they're in now and their days in the range (today only by default). */
const myDays = async (user, range) => {
  const today = todayInIndia();
  const { from, to } = range || { from: today, to: today };
  const [visits, inNow] = await Promise.all([OfficeVisit.find({ user: user.id, day: { $gte: from, $lte: to } }), OfficeVisit.exists({ user: user.id, open: true })]);
  return { today, inNow: Boolean(inNow), days: daysOf(visits, Date.now()) };
};

// GET /api/attendance/me[?from=YYYY-MM-DD&to=YYYY-MM-DD]
exports.myAttendance = async (req, res) => {
  try {
    requireRecord(req.user);
    await closeFinishedDays();
    const today = todayInIndia();
    const asked = req.query.from !== undefined || req.query.to !== undefined;
    return res.status(200).json(await myDays(req.user, asked ? readRange(req.query, today) : null));
  } catch (error) {
    return answerError(res, error, "My attendance");
  }
};

// POST /api/attendance/check-in
exports.checkIn = async (req, res) => {
  try {
    requireRecord(req.user);
    await closeFinishedDays();
    const now = new Date();
    try {
      await OfficeVisit.create({ user: req.user.id, day: indiaDayOf(now), inAt: now, open: true });
    } catch (error) {
      if (error.code === 11000) throw new Refusal(409, "You're already checked in.");
      throw error;
    }
    return res.status(201).json(await myDays(req.user));
  } catch (error) {
    return answerError(res, error, "Check in");
  }
};

// POST /api/attendance/check-out
exports.checkOut = async (req, res) => {
  try {
    requireRecord(req.user);
    await closeFinishedDays();
    const visit = await OfficeVisit.findOneAndUpdate({ user: req.user.id, open: true }, { $set: { open: false, outAt: new Date() } });
    if (!visit) throw new Refusal(409, "You're not checked in.");
    return res.status(200).json(await myDays(req.user));
  } catch (error) {
    return answerError(res, error, "Check out");
  }
};

const personView = (person, actor) => ({ id: String(person._id), name: nameOf(person), employeeId: person.employeeId || "", role: person.role || "", canCorrect: canCorrect(actor, person) });

// GET /api/attendance/day?day=YYYY-MM-DD (Super Admins, Admins, Sub Admins)
exports.dayOverview = async (req, res) => {
  try {
    if (!isManager(req.user)) throw new Refusal(403, "Only admins and sub admins see everyone's attendance.");
    const day = readDay(req.query.day);
    if (!day) throw new Refusal(400, "Pick a real day (YYYY-MM-DD).");
    if (day > todayInIndia()) throw new Refusal(400, "That day hasn't happened yet.");
    await closeFinishedDays();
    const visits = await OfficeVisit.find({ day }).sort({ inAt: 1 });
    // everyone on staff now, plus anyone who has left since but was in that day
    const people = await User.find({ $or: [{ isDeleted: { $ne: true } }, { _id: { $in: visits.map((v) => v.user) } }] })
      .select(PERSON)
      .collation({ locale: "en", strength: 2 })
      .sort({ fullName: 1, email: 1 })
      .lean();
    const now = Date.now();
    const rows = people.map((person) => {
      const theirs = visits.filter((v) => String(v.user) === String(person._id));
      const inNow = theirs.some((v) => v.open);
      return {
        ...personView(person, req.user),
        inNow,
        minutes: minutesOf(theirs, now),
        firstIn: iso(theirs[0]?.inAt),
        lastOut: inNow || !theirs.length ? null : iso(theirs[theirs.length - 1].outAt),
        noCheckOut: theirs.some((v) => v.noCheckOut),
        visits: theirs.map(visitView),
      };
    });
    return res.status(200).json({ day, inNow: rows.filter((r) => r.inNow).length, people: rows });
  } catch (error) {
    return answerError(res, error, "Attendance day");
  }
};

// GET /api/attendance/people/:userId[?from&to] (Super Admins, Admins, Sub Admins)
exports.personHistory = async (req, res) => {
  try {
    if (!isManager(req.user)) throw new Refusal(403, "Only admins and sub admins see other people's attendance.");
    const person = isObjectId(req.params.userId) ? await User.findById(req.params.userId).select(PERSON).lean() : null;
    if (!person) throw new Refusal(404, "That person isn't in the directory.");
    const { from, to } = readRange(req.query, todayInIndia());
    await closeFinishedDays();
    const visits = await OfficeVisit.find({ user: person._id, day: { $gte: from, $lte: to } });
    return res.status(200).json({ person: personView(person, req.user), from, to, days: daysOf(visits, Date.now()) });
  } catch (error) {
    return answerError(res, error, "Attendance history");
  }
};

const readMoment = (value) => {
  const t = typeof value === "string" ? Date.parse(value) : NaN;
  if (Number.isNaN(t)) throw new Refusal(400, "Give both times as real times.");
  return new Date(t);
};

// PATCH /api/attendance/visits/:id { inAt, outAt, reason } (Super Admins, Admins)
exports.correctVisit = async (req, res) => {
  try {
    if (!isAdmin(req.user) || !isObjectId(req.user.id)) throw new Refusal(403, "Only admins correct attendance.");
    await closeFinishedDays();
    const visit = isObjectId(req.params.id) ? await OfficeVisit.findById(req.params.id) : null;
    if (!visit) throw new Refusal(404, "That visit isn't on record.");
    const person = await User.findById(visit.user).select(PERSON).lean();
    if (!person || !canCorrect(req.user, person)) throw new Refusal(403, "You can't correct this person's attendance.");
    if (visit.open) throw new Refusal(409, "They're still checked in. Correct the visit once it has ended.");

    const reason = typeof req.body?.reason === "string" ? req.body.reason.trim() : "";
    if (!reason) throw new Refusal(400, "Say why you're correcting it.");
    if (reason.length > REASON_MAX) throw new Refusal(400, `Keep the reason under ${REASON_MAX} characters.`);
    const inAt = readMoment(req.body.inAt);
    const outAt = readMoment(req.body.outAt);
    if (outAt <= inAt) throw new Refusal(400, "The time they left must be after the time they came in.");
    if (indiaDayOf(inAt) !== visit.day || outAt > endOfIndiaDay(visit.day)) throw new Refusal(400, `Both times must be on ${visit.day} (India time).`);
    if (outAt > new Date()) throw new Refusal(400, "The time they left can't be in the future.");

    const overlaps = await OfficeVisit.exists({
      _id: { $ne: visit._id },
      user: visit.user,
      day: visit.day,
      inAt: { $lt: outAt },
      $or: [{ open: true }, { outAt: { $gt: inAt } }],
    });
    if (overlaps) throw new Refusal(409, "That overlaps another visit on the same day.");

    // only if nobody changed it since we read it, so every correction's "from" is what was really replaced
    const saved = await OfficeVisit.findOneAndUpdate(
      { _id: visit._id, open: false, inAt: visit.inAt, outAt: visit.outAt },
      {
        $set: { inAt, outAt },
        $push: { corrections: { at: new Date(), by: req.user.id, byName: nameOf(req.user), reason, from: { inAt: visit.inAt, outAt: visit.outAt }, to: { inAt, outAt } } },
      },
      { returnDocument: "after" }
    );
    if (!saved) throw new Refusal(409, "Someone else just changed this visit. Reload and try again.");
    return res.status(200).json({ visit: visitView(saved) });
  } catch (error) {
    return answerError(res, error, "Correct attendance");
  }
};
