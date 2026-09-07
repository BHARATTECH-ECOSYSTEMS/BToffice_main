import dns from "dns";
// Node's default DNS resolver fails SRV lookups (mongodb+srv://) on some
// Windows setups even though the OS resolver works fine. Point it at a
// public resolver so the Mongo Atlas connection can succeed locally.
dns.setServers(["8.8.8.8", "1.1.1.1"]);

import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import mongoSanitize from "express-mongo-sanitize";
import hpp from "hpp";
import "dotenv/config";
import path from "path";
import { fileURLToPath } from "url";
import connectDB from "./configs/mongodb.js";
import connectCloudinary from "./configs/cloudinary.js";
import { stripeWebhooks } from "./controllers/webhooks.js";
import educatorRouter from "./routes/educatorRoutes.js";
import courseRouter from "./routes/courseRoutes.js";
import userRouter from "./routes/userRoutes.js";

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

const isAllowedOrigin = (origin) => {
  if (!origin) return true;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  // Allow all local dev hosts/ports
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return true;
  return false;
};

const corsOptions = {
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      return callback(null, true);
    }
    console.warn(`Blocked CORS: ${origin}`);
    callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  maxAge: 86400,
};

// === RATE LIMITING ===
const isProd = process.env.NODE_ENV === "production";
const standardLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 100 : 2000,
  message: { status: "fail", message: "Too many requests" },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: isProd ? 15 : 500,
  message: { status: "fail", message: "Too many auth attempts" },
});

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
app.use(standardLimiter);
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

// === DB & CLOUDINARY ===
await connectDB();
await connectCloudinary();

// === STRIPE WEBHOOK (raw body) ===
app.post(
  "/api/stripe",
  express.raw({ type: "application/json" }),
  stripeWebhooks
);

// === HEALTH CHECK ===
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// === PROTECTED ROUTES ===
app.use("/api/educator", authLimiter, educatorRouter);
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
  console.error("ERROR:", err);
  const statusCode = err.status || err.statusCode || 500;
  const message =
    statusCode === 500
      ? "Internal Server Error"
      : err.message || "Something went wrong";
  res.status(statusCode).json({ status: "error", message });
});

const PORT = process.env.PORT || 65535;
app.listen(PORT, () => {
  console.log(`BharatTech LMS Secure API on port ${PORT}`);
});
