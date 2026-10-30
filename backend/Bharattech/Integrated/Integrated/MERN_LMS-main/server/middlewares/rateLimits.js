import { rateLimit, ipKeyGenerator } from "express-rate-limit";
import { verifyToken } from "./authMiddleware.js";

/*
 * How many requests the API takes before it asks the caller to wait (429), the same rule as the portal's main backend
 * (Learning-Management-System/Backend/middlewares/rateLimits.js). The educator pages refresh on their own, and
 * everyone in an office shares one address, so the old limits (100 per 15 minutes per address, and 15 per hour for
 * the educator pages) locked people out within minutes on the live site.
 * - Signed in: counted per person (the account in the sign-in token), generously.
 * - Not signed in: counted per address.
 * A token counts as a person's only once its signature checks out (the same check as protect()): a made-up one counts
 * against its address, so a script can't escape the address's count by sending a new one each time.
 */

const WINDOW_MS = 15 * 60 * 1000;
export const PER_PERSON = 1000;
export const PER_ADDRESS = 300;

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

/** The limits, with their sizes as options so tests can reach them. */
export function createRateLimits({ perPerson = PER_PERSON, perAddress = PER_ADDRESS, windowMs = WINDOW_MS, verify = verifyToken } = {}) {
  const personIn = personFinder(verify);
  return {
    api: rateLimit({
      windowMs,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      message: { status: "fail", message: "Too many requests. Wait a few minutes and try again." },
      keyGenerator: async (req) => {
        const person = await personIn(req);
        return person ? `person:${person}` : `address:${ipKeyGenerator(req.ip)}`;
      },
      limit: async (req) => ((await personIn(req)) ? perPerson : perAddress),
    }),
  };
}
