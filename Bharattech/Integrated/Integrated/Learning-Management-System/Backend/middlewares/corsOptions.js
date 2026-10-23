// Which websites may call the API from a browser. In production only the sites we name (ALLOWED_ORIGINS, a
// comma-separated list, plus FRONTEND_URL) are allowed; in development any site is, so local tools and previews keep
// working. A request with no Origin (server to server, or same-origin) is always allowed. The API authenticates with
// a Bearer token, not a cookie, so credentials stay off.

const isProduction = () => process.env.NODE_ENV === "production";

const allowedOrigins = () =>
  [process.env.FRONTEND_URL, ...(process.env.ALLOWED_ORIGINS || "").split(",")]
    .map((o) => (o || "").trim().replace(/\/$/, ""))
    .filter(Boolean);

/** Whether a browser at `origin` may call the API. No origin (server-to-server/same-origin) is allowed. */
const allowOrigin = (origin, { allowed, isProd }) => {
  if (!origin) return true;
  if (!isProd) return true;
  return allowed.includes(origin.replace(/\/$/, ""));
};

const corsOptions = {
  origin: (origin, callback) => callback(null, allowOrigin(origin, { allowed: allowedOrigins(), isProd: isProduction() })),
  credentials: false,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-demo-role", "X-Demo-Role"],
  maxAge: 600,
};

module.exports = { corsOptions, allowOrigin, allowedOrigins };
