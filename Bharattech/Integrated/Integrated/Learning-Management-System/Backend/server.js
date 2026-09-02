const express = require("express");
const dotenv = require("dotenv");
const path = require("path");
const cors = require("cors");

// Load env before importing routes/controllers that read process.env at module scope.
dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

const app = express();
app.set("trust proxy", 1);

const inviteRoutes = require("./routes/inviteRoutes");

const connectDB = require("./config/db");
const { startKeycloakKeepAlive, startSelfKeepAlive } = require("./utils/keepAlive");

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
const {keycloakAuth} = require("./middlewares/keycloakAuth");


/* ------------------ MIDDLEWARES ------------------ */

app.use(express.json());

app.use("/public", express.static("public"));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

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

app.use("/api/invite", inviteRoutes);
app.use("/api/openinterviewer", openInterviewerRoutes);


/* ------------------ DATABASE ------------------ */

connectDB();

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
app.use("/certificates", express.static("certificates"));

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

/* ------------------ ERROR HANDLER ------------------ */

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
