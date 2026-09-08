const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const hpp = require("hpp");
const cors = require("cors");
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);
if (ALLOWED_ORIGINS.length === 0) {
  ALLOWED_ORIGINS.push("http://localhost:3000", "http://localhost:5173");
}
const corsMiddleware = cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  maxAge: 86400,
});
const standardLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { status: "fail", message: "Too many requests" },
  standardHeaders: true,
  legacyHeaders: false,
});
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { status: "fail", message: "Too many auth attempts" },
});
const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", ...ALLOWED_ORIGINS],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  hidePoweredBy: true,
  noSniff: true,
});
const hideOpenApis = (req, res, next) => {
  res.removeHeader("X-Powered-By");
  res.setHeader("Server", "BharatTech-API-Gateway");
  const blocked = [
    "/.env",
    "/.git",
    "/config.json",
    "/phpmyadmin",
    "/wp-admin",
    "/admin",
    "/api/swagger",
    "/api/docs",
    "/graphql",
    "/explorer",
  ];
  if (blocked.includes(req.path.toLowerCase())) {
    return res.status(404).json({ status: "fail", message: "Not found" });
  }
  next();
};
module.exports = {
  corsMiddleware,
  helmetMiddleware,
  standardLimiter,
  authLimiter,
  sanitizeNoSQL: mongoSanitize({ replaceWith: "_" }),
  sanitizeXSS: xss(),
  preventHPP: hpp(),
  hideOpenApis,
};