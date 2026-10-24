const express = require("express");
const dotenv = require("dotenv");
const path = require("path");
const cors = require("cors");
const { createRateLimits, SIGN_IN_PATHS } = require("./middlewares/rateLimits");

// Load env before importing routes/controllers that read process.env at module scope.
dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

const app = express();
app.set("trust proxy", 1);

/* ------------------ CORS (must be registered FIRST) ------------------ */
// Only the sites we name may call the API from a browser in production; any site in development (middlewares/corsOptions.js).
const { corsOptions } = require("./middlewares/corsOptions");
// Refuse to start on dangerous production settings (demo mode, or guessable secrets).
const { assertAuthConfig } = require("./middlewares/keycloakAuth");
assertAuthConfig();
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
const notificationRoutes = require("./routes/notificationRoutes");
const eventRoutes = require("./routes/eventRoutes");
const learningRoutes = require("./routes/learningRoutes");
const verificationRoutes = require("./routes/verificationRoutes");
const verificationRequestRoutes = require("./routes/verificationRequestRoutes");
const idDocumentRoutes = require("./routes/idDocumentRoutes");
const communityRoutes = require("./routes/communityRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes");
const { startDailyLeaverCheck } = require("./utils/leaverDocuments");
const courseProgressRoutes = require("./routes/courseProgressRoutes");
const certificateRoutes = require("./routes/certificateRoutes");
const adminRoutes = require("./routes/adminRoutes");
const resetLinkRoutes = require("./routes/resetLinkRoutes");
const resourceRoutes = require("./routes/resource");
const policyRoutes = require("./routes/policyRoutes");
const openInterviewerRoutes = require("./routes/openInterviewerRoutes");
const librechatBridge = require("./routes/librechatBridge");
const { streamPolicyPdf } = require("./controllers/policyController");

// 🔐 Keycloak middleware
const { keycloakAuth } = require("./middlewares/keycloakAuth");

/* ------------------ BODY PARSING ------------------ */

app.use(express.json());

/* ------------------ INPUT SANITIZATION ------------------ */
const { applyRequestSanitizers } = require("./middlewares/requestSanitizers");
const { errorHandler } = require("./middlewares/errorHandler");

applyRequestSanitizers(app);

/* ------------------ RATE LIMITING ------------------ */
// Registered before routes so it actually applies to real requests: generous per signed-in person, strict on the
// routes that take or set a password (middlewares/rateLimits.js).
const rateLimits = createRateLimits();
app.use("/api", rateLimits.api);
app.use(SIGN_IN_PATHS.map((p) => `/api${p}`), rateLimits.signIn);

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
app.use("/api/notifications", keycloakAuth, notificationRoutes);
app.use("/api/events", keycloakAuth, eventRoutes);
app.use("/api/learning", keycloakAuth, learningRoutes);
app.use("/api/verifications", keycloakAuth, verificationRoutes);
app.use("/api/verification-documents", keycloakAuth, idDocumentRoutes);
app.use("/api/community", keycloakAuth, communityRoutes);
app.use("/api/attendance", keycloakAuth, attendanceRoutes);
// the website's public form: no sign-in, a few an hour per address
app.use("/api/verification-requests", rateLimits.publicForm, verificationRequestRoutes);
app.use("/api/course-progress", keycloakAuth, courseProgressRoutes);
app.use("/api/certificates", keycloakAuth, certificateRoutes);
app.use("/api/admin", keycloakAuth, adminRoutes);
app.use("/api/ai-assistant", keycloakAuth, librechatBridge);
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

// a plain message to the caller, the details in the server log (middlewares/errorHandler.js)
app.use(errorHandler);

/* ------------------ SERVER ------------------ */

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 API available at http://localhost:${PORT}/api`);
  startKeycloakKeepAlive();
  startSelfKeepAlive();
  // ID documents of people who left 60+ days ago: now, then daily
  startDailyLeaverCheck();
});