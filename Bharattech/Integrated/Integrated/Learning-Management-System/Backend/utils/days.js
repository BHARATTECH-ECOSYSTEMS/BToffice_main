// Calendar days kept as the "YYYY-MM-DD" people picked, not moments in time, so they never shift between time zones
// (calendar events, join dates, e-Office visits).

const INDIA_DAY = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" });

/** The India day a moment falls on, "YYYY-MM-DD". */
const indiaDayOf = (moment) => INDIA_DAY.format(moment);

/** Today's date in India, "YYYY-MM-DD": the day the portal's people live in, whatever the server's clock says. */
const todayInIndia = () => indiaDayOf(new Date());

/** The last moment of an India day (23:59:59.999 there). India has no daylight saving, so it is always +05:30. */
const endOfIndiaDay = (day) => new Date(`${day}T23:59:59.999+05:30`);

/** A real calendar day written "YYYY-MM-DD" (so "2026-02-30" is refused), or null. */
const readDay = (value) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [y, m, d] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(y, m - 1, d));
  return parsed.getUTCFullYear() === y && parsed.getUTCMonth() === m - 1 && parsed.getUTCDate() === d ? value : null;
};

module.exports = { todayInIndia, readDay, indiaDayOf, endOfIndiaDay };
