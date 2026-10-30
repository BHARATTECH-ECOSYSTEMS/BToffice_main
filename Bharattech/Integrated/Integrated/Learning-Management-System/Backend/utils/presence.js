// The live dot beside each person (the team's request, 2026-10-29): while someone is in the e-Office, the portal sends a
// small "still active" signal every few seconds while they use the laptop (POST /api/attendance/active saves it on
// their open visit as lastActiveAt). The backend decides the colour, so a wrong laptop clock can't fake it:
// - active: a sign of use (or joining) in the last 20 seconds (owner's choice, 2026-10-30; it was five minutes)
// - inactive: none for 20 seconds or more
// - out: not in the e-Office
// - off: outside working hours (10:00–20:30 India time, Monday to Friday), whatever they're doing
// Colleagues only get the colour; the inactive stretches (idleStretch) go to admins and sub admins only, in History.

const IDLE_MS = 20 * 1000;
// minutes after midnight on India's clock
const DAY_STARTS = 10 * 60;
const DAY_ENDS = 20 * 60 + 30;
// India is +05:30 all year (no daylight saving), so its clock is a fixed shift from UTC
const INDIA_OFFSET_MS = 330 * 60 * 1000;

/** Whether `now` falls in working hours on India's clock: Monday to Friday, 10:00 up to (not including) 20:30. */
const inWorkingHours = (now) => {
  const india = new Date(now.getTime() + INDIA_OFFSET_MS);
  const weekday = india.getUTCDay();
  const minute = india.getUTCHours() * 60 + india.getUTCMinutes();
  return weekday >= 1 && weekday <= 5 && minute >= DAY_STARTS && minute < DAY_ENDS;
};

const dayMoment = (day, minute) => new Date(Date.parse(`${day}T00:00:00+05:30`) + minute * 60 * 1000);

/**
 * A stretch without use, from the last sign of use to the next one (or the visit's end), for the visit's History: only
 * when it lasted IDLE_MS or more, and only the part inside that day's working hours. Null when nothing is left.
 */
const idleStretch = (from, to, day) => {
  if (to.getTime() - from.getTime() < IDLE_MS) return null;
  const start = dayMoment(day, DAY_STARTS);
  if (!inWorkingHours(start)) return null;
  const end = dayMoment(day, DAY_ENDS);
  const clipped = { from: from > start ? from : start, to: to < end ? to : end };
  return clipped.to > clipped.from ? clipped : null;
};

/** The dot for someone whose open visit today is `visit` (null when they aren't in). */
const presenceOf = (visit, now) => {
  if (!inWorkingHours(now)) return "off";
  if (!visit) return "out";
  const last = visit.lastActiveAt || visit.inAt;
  return now.getTime() - last.getTime() < IDLE_MS ? "active" : "inactive";
};

module.exports = { IDLE_MS, inWorkingHours, presenceOf, idleStretch };
