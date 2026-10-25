import { rateLimit, ipKeyGenerator } from "express-rate-limit";

/*
 * How many requests the API takes before it asks the caller to wait (429), the same rule as the portal's main backend
 * (Learning-Management-System/Backend/middlewares/rateLimits.js). The educator pages refresh on their own, and
 * everyone in an office shares one address, so the old limits (100 per 15 minutes per address, and 15 per hour for
 * the educator pages) locked people out within minutes on the live site.
 * - Signed in: counted per person (the account in the sign-in token), generously.
 * - Not signed in: counted per address.
 * Counting reads the token without checking it: a forged one only gets a count of its own, and protect() still
 * refuses it on every route that needs a sign-in.
 */

const WINDOW_MS = 15 * 60 * 1000;
export const PER_PERSON = 1000;
export const PER_ADDRESS = 300;

/** The account a bearer token says it is for, or null when there is no readable one. */
const personIn = (req) => {
  const token = /^Bearer\s+(\S+)$/i.exec(req.get("authorization") || "")?.[1];
  const payload = token?.split(".")[1];
  if (!payload) return null;
  try {
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return typeof claims?.sub === "string" && claims.sub ? claims.sub : null;
  } catch {
    return null;
  }
};

/** The limits, with their sizes as options so tests can reach them. */
export function createRateLimits({ perPerson = PER_PERSON, perAddress = PER_ADDRESS, windowMs = WINDOW_MS } = {}) {
  return {
    api: rateLimit({
      windowMs,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      message: { status: "fail", message: "Too many requests. Wait a few minutes and try again." },
      keyGenerator: (req) => {
        const person = personIn(req);
        return person ? `person:${person}` : `address:${ipKeyGenerator(req.ip)}`;
      },
      limit: (req) => (personIn(req) ? perPerson : perAddress),
    }),
  };
}
