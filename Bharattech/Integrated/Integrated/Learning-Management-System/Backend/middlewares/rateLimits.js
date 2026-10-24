const { rateLimit, ipKeyGenerator } = require("express-rate-limit");

/*
 * How many requests the API takes before it asks the caller to wait (429). A page of the portal makes about ten, and
 * the bell asks every minute, so the old single limit (100 per 15 minutes per address) locked people out after a few
 * minutes of normal use, and everyone in an office shares one address.
 * - Signed in: counted per person (the account in the sign-in token), generously.
 * - Not signed in: counted per address.
 * - Routes that take or set a password: strictly per address, whoever is named, against password guessing (Keycloak's
 *   own lockout still applies on top).
 * Counting reads the token without checking it: a forged one only gets a count of its own, and keycloakAuth still
 * refuses it on every route that needs a sign-in.
 */

const WINDOW_MS = 15 * 60 * 1000;
const PER_PERSON = 1000;
const PER_ADDRESS = 300;
const SIGN_IN = 20;
// under /api
const SIGN_IN_PATHS = [
  "/auth/keycloak-login",
  "/auth/login",
  "/auth/accept-invite",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/change-password",
  "/auth/keycloak-change-password",
  "/auth/register",
  "/auth/signup",
];

const WAIT = { message: "Too many requests. Wait a minute and try again." };

/** The account a bearer token says it is for, or null when there is no readable one. */
const personIn = (req) => {
  const token = /^Bearer\s+(\S+)$/i.exec(req.get("authorization") || "")?.[1];
  const payload = token?.split(".")[1];
  if (!payload) return null;
  try {
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    const who = claims && typeof claims === "object" ? claims.sub || claims.id || claims.userId : null;
    return typeof who === "string" && who ? who : null;
  } catch {
    return null;
  }
};

const addressOf = (req) => `address:${ipKeyGenerator(req.ip)}`;

/** The limits, with their sizes as options so tests can reach them. */
function createRateLimits({ perPerson = PER_PERSON, perAddress = PER_ADDRESS, signIn = SIGN_IN, windowMs = WINDOW_MS } = {}) {
  const shared = { windowMs, standardHeaders: "draft-8", legacyHeaders: false, message: WAIT };
  return {
    api: rateLimit({
      ...shared,
      keyGenerator: (req) => {
        const person = personIn(req);
        return person ? `person:${person}` : addressOf(req);
      },
      limit: (req) => (personIn(req) ? perPerson : perAddress),
    }),
    signIn: rateLimit({ ...shared, keyGenerator: addressOf, limit: signIn }),
  };
}

module.exports = { createRateLimits, PER_PERSON, PER_ADDRESS, SIGN_IN, SIGN_IN_PATHS };
