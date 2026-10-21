const { TextEncoder } = require("util");

const DEV_FALLBACK_SECRET = "fallback-secret-for-encryption-1234567890";

const getLaunchSecret = () => {
  const secret =
    process.env.BHARATTECH_LAUNCH_SECRET ||
    process.env.ADMIN_SECRET ||
    process.env.JWT_SECRET ||
    process.env.SESSION_SECRET ||
    process.env.ADMIN_PASSWORD;

  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("OpenInterviewer launch secret is not configured");
    }
    console.warn("[DEV] No launch secret configured — using built-in dev fallback. Set BHARATTECH_LAUNCH_SECRET in production.");
    return DEV_FALLBACK_SECRET;
  }

  return secret;
};

const createOpenInterviewerToken = async (user = {}, options = {}) => {
  const { SignJWT } = await import("jose");
  const role = user.role || "Admin";
  const email = user.email || "";
  const name = user.fullName || user.username || "";

  return new SignJWT({
    type: "bharattech-admin-launch",
    role,
    email,
    name,
    redirectTo: options.redirectTo || "/dashboard",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("5m")
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

module.exports = {
  buildOpenInterviewerLaunchUrl,
  createOpenInterviewerToken,
};
