// How the portal's newer controllers (calendar events, attendance) answer: a Refusal is the caller's to fix and goes
// back with its own status and message; anything else is logged and answered with a plain 500 that leaks nothing.

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

// Roles as keycloakAuth writes them ("Superadmin", "Super-admin", "admin"…), compared without case or separators.
const roleKey = (role) => String(role || "").toLowerCase().replace(/[-_\s]/g, "");
const isAdmin = (user) => ["admin", "superadmin"].includes(roleKey(user.role));
const isManager = (user) => isAdmin(user) || roleKey(user.role) === "subadmin";
const isObjectId = (value) => /^[0-9a-f]{24}$/i.test(String(value ?? ""));

/** For router.param: an id that can't be a record is a plain 400, before the database lookup fails on it. */
const mustBeObjectId = (_req, res, next, value) => (isObjectId(value) ? next() : res.status(400).json({ message: "That id isn't valid." }));

module.exports = { Refusal, answerError, isAdmin, isManager, isObjectId, mustBeObjectId };
