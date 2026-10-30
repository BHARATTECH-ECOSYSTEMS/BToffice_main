import mongoose from "mongoose";

// Determine connection string: prefer common MongoDB env names, then fall back to DATABASE.
let rawDatabase = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.DATABASE;
if (!rawDatabase) {
  // Not fatal in local dev; fall back to local mongodb instance if available
  console.warn(
    "⚠️ Missing DATABASE or MONGODB_URI environment variable. Falling back to mongodb://127.0.0.1:27017/lms for local development."
  );
  rawDatabase = "mongodb://127.0.0.1:27017/lms";
}

// If DATABASE contains a placeholder <PASSWORD>, replace it. Otherwise assume it's a full connection string.
let DB;
if (rawDatabase.includes("<PASSWORD>")) {
  DB = rawDatabase.replace("<PASSWORD>", process.env.DATABASE_PASSWORD || "");
} else {
  DB = rawDatabase;
}

const connectDB = async () => {
  try {
    mongoose.connection.on("connected", () =>
      console.log("Database connected ✅")
    );
    mongoose.connection.on("error", (err) =>
      console.log(`❌ Database connection error: ${err.message}`)
    );
    mongoose.connection.on("disconnected", () =>
      console.log("⚠️ Database disconnected")
    );

    await mongoose.connect(DB, {
      dbName: "lms",
    });
  } catch (error) {
    console.error("❌ Could not connect to database:", error);
    // Continue without exiting to allow server to run in degraded mode for UI debugging
  }
};

export default connectDB;
