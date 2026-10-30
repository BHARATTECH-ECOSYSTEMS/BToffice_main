const { TextEncoder } = require("util");
const { randomUUID } = require("crypto");

// A pass is only carried from the portal's click to OpenInterviewer's login page, so a minute is plenty; its id lets
// OpenInterviewer refuse it a second time (src/lib/launchAuth.ts there).
const LAUNCH_PASS_SECONDS = 60;

// The launch is signed with its own secret, shared only with OpenInterviewer. Until step 17 it fell back to
// ADMIN_SECRET, JWT_SECRET, SESSION_SECRET or ADMIN_PASSWORD, handing OpenInterviewer a secret meant for something else,
// and until step 14 to a built-in one written in this file. Without the setting, no pass is made.
const getLaunchSecret = () => {
  const secret = process.env.BHARATTECH_LAUNCH_SECRET;

  if (!secret) {
    throw new Error("OpenInterviewer launch secret is not configured");
  }

  return secret;
};

const createOpenInterviewerToken = async (user = {}, options = {}) => {
  const { SignJWT } = await import("jose");
  if (!user.role) {
    throw new Error("A launch pass needs the signed-in person's role");
  }
  const email = user.email || "";
  const name = user.fullName || user.username || "";

  const pass = new SignJWT({
    type: "bharattech-admin-launch",
    role: user.role,
    email,
    name,
    redirectTo: options.redirectTo || "/dashboard",
  })
    .setProtectedHeader({ alg: "HS256" });
  // whose pass it is: OpenInterviewer keeps it in the session and asks back whether they're still an admin
  if (user.keycloakId) pass.setSubject(user.keycloakId);
  return pass
    .setJti(randomUUID())
    .setIssuedAt()
    .setExpirationTime(`${LAUNCH_PASS_SECONDS}s`)
    .sign(new TextEncoder().encode(getLaunchSecret()));
};

const buildOpenInterviewerLaunchUrl = (token) => {
  const baseUrl =
    process.env.OPEN_INTERVIEWER_URL || "http://localhost:3000";
  const launchPath =
    process.env.OPEN_INTERVIEWER_LAUNCH_PATH || "/login";
  const redirectTo =
    process.env.OPEN_INTERVIEWER_REDIRECT_PATH || "/dashboard";

  const launchUrl = new URL(launchPath, baseUrl);
  launchUrl.searchParams.set("launchToken", token);
  launchUrl.searchParams.set("redirect", redirectTo);

  return launchUrl.toString();
};

const SESSION_CHECK_TYPE = "openinterviewer-session-check";

/**
 * The Keycloak account OpenInterviewer asks about, from its signed check (POST /api/openinterviewer/session-check), or
 * null when the check isn't OpenInterviewer's: signed with the launch secret, of its own kind, lasting a minute at most.
 */
const readSessionCheck = async (token) => {
  const { jwtVerify } = await import("jose");
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(getLaunchSecret()), {
      algorithms: ["HS256"],
      requiredClaims: ["sub", "iat", "exp"],
      maxTokenAge: LAUNCH_PASS_SECONDS,
    });
    if (payload.type !== SESSION_CHECK_TYPE || !payload.sub) return null;
    if (payload.exp - payload.iat > LAUNCH_PASS_SECONDS) return null;
    return payload.sub;
  } catch {
    return null;
  }
};

module.exports = {
  readSessionCheck,
  LAUNCH_PASS_SECONDS,
  buildOpenInterviewerLaunchUrl,
  createOpenInterviewerToken,
  getLaunchSecret,
};
