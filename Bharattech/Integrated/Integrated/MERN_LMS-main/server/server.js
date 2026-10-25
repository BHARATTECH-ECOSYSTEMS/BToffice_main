import dns from "dns";
// Node's default DNS resolver fails SRV lookups (mongodb+srv://) on some
// Windows setups even though the OS resolver works fine. Point it at a
// public resolver so the Mongo Atlas connection can succeed locally.
dns.setServers(["8.8.8.8", "1.1.1.1"]);

import "dotenv/config";
import connectDB from "./configs/mongodb.js";
import connectCloudinary from "./configs/cloudinary.js";
import app from "./app.js";

// === DB & CLOUDINARY ===
await connectDB();
await connectCloudinary();

const PORT = process.env.PORT || 65535;
app.listen(PORT, () => {
  console.log(`BharatTech LMS Secure API on port ${PORT}`);
});
