const { test } = require("node:test");
const assert = require("node:assert/strict");
const { presenceOf, inWorkingHours, idleStretch, IDLE_MS } = require("../utils/presence");

// 2026-10-26 is a Monday; India is +05:30 all year
const at = (day, hhmm) => new Date(`${day}T${hhmm}:00+05:30`);
const MONDAY = "2026-10-26";
const FRIDAY = "2026-10-30";
const SATURDAY = "2026-10-31";
const SUNDAY = "2026-11-01";

test("working hours are 10:00 to 20:30 on India's clock, Monday to Friday", () => {
  assert.equal(inWorkingHours(at(MONDAY, "09:59")), false);
  assert.equal(inWorkingHours(at(MONDAY, "10:00")), true);
  assert.equal(inWorkingHours(at(MONDAY, "20:29")), true);
  assert.equal(inWorkingHours(at(MONDAY, "20:30")), false);
  assert.equal(inWorkingHours(at(FRIDAY, "15:00")), true);
  assert.equal(inWorkingHours(at(SATURDAY, "15:00")), false);
  assert.equal(inWorkingHours(at(SUNDAY, "15:00")), false);
});

test("working hours follow India's clock whatever the server's time zone", () => {
  // 04:30 UTC on Monday is 10:00 in India; 15:00 UTC on Friday is 20:30 there
  assert.equal(inWorkingHours(new Date("2026-10-26T04:30:00Z")), true);
  assert.equal(inWorkingHours(new Date("2026-10-30T15:00:00Z")), false);
  // 19:00 UTC on Sunday is already Monday 00:30 in India, before the day starts
  assert.equal(inWorkingHours(new Date("2026-11-01T19:00:00Z")), false);
});

test("someone in the e-Office is active until 20 seconds pass without a sign of use", () => {
  assert.equal(IDLE_MS, 20_000);
  const now = at(MONDAY, "11:00");
  const ago = (ms) => new Date(now.getTime() - ms);
  const visit = (last) => ({ inAt: at(MONDAY, "10:05"), lastActiveAt: last });
  assert.equal(presenceOf(visit(ago(1000)), now), "active");
  assert.equal(presenceOf(visit(ago(IDLE_MS - 1)), now), "active");
  assert.equal(presenceOf(visit(ago(IDLE_MS)), now), "inactive");
  assert.equal(presenceOf(visit(ago(30 * 60_000)), now), "inactive");
});

test("joining counts as the first sign of use", () => {
  const now = at(MONDAY, "11:00");
  assert.equal(presenceOf({ inAt: new Date(now.getTime() - IDLE_MS + 1), lastActiveAt: null }, now), "active");
  assert.equal(presenceOf({ inAt: new Date(now.getTime() - IDLE_MS), lastActiveAt: null }, now), "inactive");
});

test("nobody in the e-Office shows as out; outside working hours everyone is off", () => {
  assert.equal(presenceOf(null, at(MONDAY, "11:00")), "out");
  const busy = { inAt: at(MONDAY, "20:00"), lastActiveAt: at(MONDAY, "20:30") };
  assert.equal(presenceOf(busy, at(MONDAY, "20:30")), "off");
  assert.equal(presenceOf(null, at(SATURDAY, "11:00")), "off");
});

test("an inactive stretch counts from the last use, only when it lasted 20 seconds, and only in working hours", () => {
  const stretch = (from, to, day = MONDAY) => idleStretch(at(day, from), at(day, to), day);
  assert.equal(stretch("11:00", "11:00"), null);
  assert.equal(idleStretch(at(MONDAY, "11:00"), new Date(at(MONDAY, "11:00").getTime() + IDLE_MS - 1), MONDAY), null);
  assert.deepEqual(stretch("11:00", "11:05"), { from: at(MONDAY, "11:00"), to: at(MONDAY, "11:05") });
  // clipped to 10:00–20:30 that day
  assert.deepEqual(stretch("09:50", "10:02"), { from: at(MONDAY, "10:00"), to: at(MONDAY, "10:02") });
  assert.deepEqual(stretch("20:25", "21:00"), { from: at(MONDAY, "20:25"), to: at(MONDAY, "20:30") });
  assert.equal(stretch("20:40", "21:00"), null);
  assert.equal(stretch("11:00", "12:00", SATURDAY), null);
});
