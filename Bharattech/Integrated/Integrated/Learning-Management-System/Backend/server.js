const express = require("express");
const dotenv = require("dotenv");
const path = require("path");
const cors = require("cors");
const { rateLimit } = require("express-rate-limit");

// Load env before importing routes/controllers that read process.env at module scope.
dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

const app = express();
app.set("trust proxy", 1);

/* ------------------ CORS (must be registered FIRST) ------------------ */
const corsOptions = {
  origin: true,
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "x-demo-role",
    "X-Demo-Role",
  ],
};
app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

const inviteRoutes = require("./routes/inviteRoutes");

const connectDB = require("./config/db");
const {
  startKeycloakKeepAlive,
  startSelfKeepAlive,
} = require("./utils/keepAlive");

// Routes
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const courseRoutes = require("./routes/courseRoutes");
const taskRoutes = require("./routes/taskRoutes");
const courseProgressRoutes = require("./routes/courseProgressRoutes");
const certificateRoutes = require("./routes/certificateRoutes");
const adminRoutes = require("./routes/adminRoutes");
const resetLinkRoutes = require("./routes/resetLinkRoutes");
const resourceRoutes = require("./routes/resource");
const policyRoutes = require("./routes/policyRoutes");
const openInterviewerRoutes = require("./routes/openInterviewerRoutes");
const { streamPolicyPdf } = require("./controllers/policyController");

// 🔐 Keycloak middleware
const { keycloakAuth } = require("./middlewares/keycloakAuth");

/* ------------------ BODY PARSING ------------------ */

app.use(express.json());

/* ------------------ INPUT SANITIZATION ------------------ */
// npm install @exortek/express-mongo-sanitize express-xss-sanitizer hpp
// Using the maintained Express-5-compatible forks — the original
// express-mongo-sanitize / xss-clean packages throw on req.query in
// Express 5, which is what caused your earlier CORS symptom.
const mongoSanitize = require("@exortek/express-mongo-sanitize");
const { xss } = require("express-xss-sanitizer");
const hpp = require("hpp");

app.use(mongoSanitize());
app.use(xss());
app.use(hpp());

/* ------------------ RATE LIMITING ------------------ */
// Registered before routes so it actually applies to real requests.
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 100,
  message: "Too many requests",
});
app.use("/api", limiter);

/* ------------------ STATIC (now behind cors + sanitization) ------------------ */

app.use("/public", express.static("public"));
app.use(
  "/uploads",
  keycloakAuth,
  express.static(path.join(__dirname, "uploads")),
);

app.use("/api/invite", inviteRoutes);
app.use("/api/openinterviewer", openInterviewerRoutes);

/* ------------------ DATABASE ------------------ */

connectDB().catch((err) => {
  console.error("❌ Failed to connect to database:", err.message);
  process.exit(1);
});

/* ------------------ ROUTES ------------------ */

// 🔓 PUBLIC ROUTES (NO Keycloak)
app.use("/api/auth", authRoutes);
app.use("/api/reset-links", resetLinkRoutes);

// 🔐 PROTECTED ROUTES (AUTO USER CREATION)
app.use("/api/resources", keycloakAuth, resourceRoutes);
app.get("/api/policies/:id/pdf", streamPolicyPdf);
app.use("/api/policies", policyRoutes);
app.use("/api/courses", keycloakAuth, courseRoutes);
app.use("/api/user", keycloakAuth, userRoutes);
app.use("/api/tasks", keycloakAuth, taskRoutes);
app.use("/api/course-progress", keycloakAuth, courseProgressRoutes);
app.use("/api/certificates", keycloakAuth, certificateRoutes);
app.use("/api/admin", keycloakAuth, adminRoutes);
app.use("/certificates", keycloakAuth, express.static("certificates"));

/* ------------------ DEFAULT ------------------ */

app.get("/", (req, res) => {
  res.json({ message: "Backend running successfully 🚀" });
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/test", (req, res) => {
  console.log("🔥 TEST HIT");
  res.send("TEST OK");
});

/* ------------------ ERROR HANDLER (must stay last) ------------------ */

app.use((err, req, res, next) => {
  console.error("Server Error:", err);
  res.status(err.status || 500).json({
    message: err.message || "Internal Server Error",
    error: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
});

/* ------------------ SERVER ------------------ */

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 API available at http://localhost:${PORT}/api`);
  startKeycloakKeepAlive();
  startSelfKeepAlive();
});
