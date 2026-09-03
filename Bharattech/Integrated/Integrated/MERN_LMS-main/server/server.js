import dns from "dns";
// Node's default DNS resolver fails SRV lookups (mongodb+srv://) on some
// Windows setups even though the OS resolver works fine. Point it at a
// public resolver so the Mongo Atlas connection can succeed locally.
dns.setServers(["8.8.8.8", "1.1.1.1"]);

import express from "express";
import cors from "cors";
import "dotenv/config";
import path from "path";
import { fileURLToPath } from "url";
import connectDB from "./configs/mongodb.js";
import { stripeWebhooks } from "./controllers/webhooks.js";
import educatorRouter from "./routes/educatorRoutes.js";
import connectCloudinary from "./configs/cloudinary.js";
import courseRouter from "./routes/courseRoutes.js";
import userRouter from "./routes/userRoutes.js";

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDistPath = path.join(__dirname, "..", "client", "dist");

// ===== CORS - FIRST THING =====
const originn = "*"

app.use(cors({
    origin: originn, 
    credentials: true,              
    methods: ["GET", "POST", "PUT","PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));
app.options("", cors()); // Handle preflight requests globally
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", originn); // Allow frontend
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
  res.header("Access-Control-Allow-Headers", "Authorization, Content-Type");
  next();
});

// ===== DB & Cloudinary =====
await connectDB();
await connectCloudinary();

// ===== Stripe webhook BEFORE JSON parser =====
app.post("/api/stripe", 
  express.raw({ type: 'application/json' }), 
  stripeWebhooks
);

// ===== JSON parser =====
app.use(express.json());

// ===== Routes =====
app.get("/", (req, res) => {
  res.json({ message: "API is running..." });
});

app.use("/api/educator", educatorRouter);
app.use("/api/courses", courseRouter);
app.use("/api/user", userRouter);

app.use(express.static(clientDistPath));

app.use((req, res, next) => {
  if (req.method === "GET" && !req.path.startsWith("/api")) {
    return res.sendFile(path.join(clientDistPath, "index.html"));
  }

  next();
});

// ===== 404 =====
app.use((req, res) => {
  res.status(404).json({ status: "fail", message: `Can't find ${req.originalUrl}` });
});

// ===== Error handler =====
app.use((err, req, res, next) => {
  console.error("❌ ERROR:", err.message);
  res.status(500).json({ status: "error", message: "Internal Server Error" });
});

const PORT = process.env.PORT || 9001;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
