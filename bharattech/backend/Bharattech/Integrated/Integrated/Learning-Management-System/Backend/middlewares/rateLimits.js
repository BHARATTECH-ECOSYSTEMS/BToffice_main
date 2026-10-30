const { rateLimit, ipKeyGenerator } = require("express-rate-limit");
const { verifyToken } = require("./keycloakAuth");

/*
 * How many requests the API takes before it asks the caller to wait (429). A page of the portal makes about ten, and
 * the bell asks every minute, so the old single limit (100 per 15 minutes per address) locked people out after a few
 * minutes of normal use, and everyone in an office shares one address.
 * - Signed in: counted per person (the account in the sign-in token), generously.
 * - Not signed in: counted per address.
 * - Sign-in: only failed tries count, strictly per address, whoever is named, against password guessing (Keycloak's
 *   own lockout still applies on top); a whole office signing in in the morning never meets it.
 * - The other routes that take or set a password: every try counts, strictly per address (forgot password answers the
 *   same whatever happened, so its failures can't be told apart).
 * - The website's public verification form: a few an hour per address, against floods (it needs no sign-in).
 * A token counts as a person's only once its signature checks out (the same check as keycloakAuth): a made-up one
 * counts against its address, so a script can't escape the address's count by sending a new one each time.
 */

const WINDOW_MS = 15 * 60 * 1000;
const PER_PERSON = 1000;
const PER_ADDRESS = 300;
const SIGN_IN = 20;
const PUBLIC_FORM = 5;
const PUBLIC_FORM_WINDOW_MS = 60 * 60 * 1000;
// under /api
const SIGN_IN_PATHS = ["/auth/keycloak-login"];
const PASSWORD_PATHS = [
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

/**
 * Finds the account a request's sign-in token is for, or null (no token, or one Keycloak didn't sign), checking each
 * request's token once: the counting key and the limit both ask.
 */
const personFinder = (verify) => {
  const found = new WeakMap();
  const check = async (token) => {
    try {
      const claims = await verify(token);
      return typeof claims?.sub === "string" && claims.sub ? claims.sub : null;
    } catch {
      return null;
    }
  };
  return (req) => {
    if (!found.has(req)) {
      const token = /^Bearer\s+(\S+)$/i.exec(req.get("authorization") || "")?.[1];
      found.set(req, token ? check(token) : Promise.resolve(null));
    }
    return found.get(req);
  };
};

const addressOf = (req) => `address:${ipKeyGenerator(req.ip)}`;

/** The limits, with their sizes as options so tests can reach them. */
function createRateLimits({
  perPerson = PER_PERSON,
  perAddress = PER_ADDRESS,
  signIn = SIGN_IN,
  publicForm = PUBLIC_FORM,
  windowMs = WINDOW_MS,
  publicFormWindowMs = PUBLIC_FORM_WINDOW_MS,
  verify = verifyToken,
} = {}) {
  const shared = { windowMs, standardHeaders: "draft-8", legacyHeaders: false, message: WAIT };
  const personIn = personFinder(verify);
  return {
    api: rateLimit({
      ...shared,
      keyGenerator: async (req) => {
        const person = await personIn(req);
        return person ? `person:${person}` : addressOf(req);
      },
      limit: async (req) => ((await personIn(req)) ? perPerson : perAddress),
    }),
    signIn: rateLimit({ ...shared, keyGenerator: addressOf, limit: signIn, skipSuccessfulRequests: true }),
    passwords: rateLimit({ ...shared, keyGenerator: addressOf, limit: signIn }),
    publicForm: rateLimit({
      ...shared,
      windowMs: publicFormWindowMs,
      keyGenerator: addressOf,
      limit: publicForm,
      message: { message: "Too many requests from here. Try again in an hour, or email our HR team." },
    }),
  };
}

module.exports = { createRateLimits, PER_PERSON, PER_ADDRESS, SIGN_IN, SIGN_IN_PATHS, PASSWORD_PATHS, PUBLIC_FORM, PUBLIC_FORM_WINDOW_MS };
