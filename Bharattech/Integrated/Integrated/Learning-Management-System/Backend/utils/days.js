// Calendar days kept as the "YYYY-MM-DD" people picked, not moments in time, so they never shift between time zones
// (calendar events, join dates).

/** Today's date in India, "YYYY-MM-DD": the day the portal's people live in, whatever the server's clock says. */
const todayInIndia = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

/** A real calendar day written "YYYY-MM-DD" (so "2026-02-30" is refused), or null. */
const readDay = (value) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [y, m, d] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(y, m - 1, d));
  return parsed.getUTCFullYear() === y && parsed.getUTCMonth() === m - 1 && parsed.getUTCDate() === d ? value : null;
};

module.exports = { todayInIndia, readDay };
