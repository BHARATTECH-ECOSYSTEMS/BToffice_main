import express from "express";
import cors from "cors";
import helmet from "helmet";
import mongoSanitize from "express-mongo-sanitize";
import hpp from "hpp";
import path from "path";
import { fileURLToPath } from "url";
import educatorRouter from "./routes/educatorRoutes.js";
import courseRouter from "./routes/courseRoutes.js";
import userRouter from "./routes/userRoutes.js";
import { createRateLimits } from "./middlewares/rateLimits.js";

// The app without a database connection or a listening port, so tests can start it on their own.

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDistPath = path.join(__dirname, "..", "client", "dist");

const app = express();
app.set("trust proxy", 1);

// === STRICT CORS ===
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

// Render sets RENDER on its servers, so one counts as live even without NODE_ENV
const isLive = () => process.env.NODE_ENV === "production" || Boolean(process.env.RENDER);

export const isAllowedOrigin = (origin) => {
  if (!origin) return true;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  // local dev hosts/ports, only while it isn't live
  if (!isLive() && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return true;
  return false;
};

const corsOptions = {
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      return callback(null, true);
    }
    console.warn(`Blocked CORS: ${origin}`);
    // no CORS headers, so the browser refuses it; an error here answered 500
    callback(null, false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  maxAge: 86400,
};

// === RATE LIMITING === (middlewares/rateLimits.js: per person when signed in, per address otherwise)
const rateLimits = createRateLimits();

// === HELMET SECURITY HEADERS ===
const helmetConfig = helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false,
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  hidePoweredBy: true,
  noSniff: true,
});

// === SCANNER BLOCKER ===
const hideOpenApis = (req, res, next) => {
  res.removeHeader("X-Powered-By");
  res.setHeader("Server", "BharatTech-LMS-Gateway");
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
  ];
  if (blocked.includes(req.path.toLowerCase())) {
    return res.status(404).json({ status: "fail", message: "Not found" });
  }
  next();
};

// === SECURITY MIDDLEWARE STACK ===
app.use(helmetConfig);
app.use(hideOpenApis);
app.use(cors(corsOptions));
app.use(rateLimits.api);
app.use(express.json({ limit: "50kb" }));
app.use(express.urlencoded({ extended: true, limit: "50kb" }));

// Express 5 compatible sanitization
const sanitizeMiddleware = (req, res, next) => {
  if (req.body && typeof req.body === "object") {
    mongoSanitize.sanitize(req.body, { replaceWith: "_" });
  }
  if (req.params && typeof req.params === "object") {
    mongoSanitize.sanitize(req.params, { replaceWith: "_" });
  }
  next();
};

app.use(sanitizeMiddleware);
app.use(hpp({ whitelist: ["sort", "page", "limit"] }));

// === HEALTH CHECK ===
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// === PROTECTED ROUTES ===
app.use("/api/educator", educatorRouter);
app.use("/api/courses", courseRouter);
app.use("/api/user", userRouter);

// === STATIC CLIENT (production only) ===
if (process.env.NODE_ENV === "production") {
  app.use(express.static(clientDistPath));
  app.get("{/*splat}", (req, res, next) => {
    if (!req.path.startsWith("/api")) {
      return res.sendFile(path.join(clientDistPath, "index.html"));
    }
    next();
  });
}

// === 404 ===
app.use((req, res) => {
  res
    .status(404)
    .json({ status: "fail", message: `Cannot ${req.method} ${req.originalUrl}` });
});

// === SAFE ERROR HANDLER ===
app.use((err, req, res, next) => {
  // a cover bigger than configs/multer.js allows: the person's to fix, not a server error
  if (err?.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ success: false, message: "Choose a cover image under 5 MB." });
  }
  if (err?.code === "LIMIT_FILE_COUNT" || err?.code === "LIMIT_UNEXPECTED_FILE") {
    return res.status(400).json({ success: false, message: "Send one cover image." });
  }
  console.error("ERROR:", err);
  const statusCode = err.status || err.statusCode || 500;
  const message =
    statusCode === 500
      ? "Internal Server Error"
      : err.message || "Something went wrong";
  res.status(statusCode).json({ status: "error", message });
});

export default app;
