const mongoose = require("mongoose");

const LIBRECHAT_MONGO_URI =
  process.env.LIBRECHAT_MONGO_URI ||
  "mongodb://librechat:changeme@localhost:27017/librechat?authSource=admin";

let librechatConn = null;

function getConnection() {
  if (!librechatConn) {
    librechatConn = mongoose.createConnection(LIBRECHAT_MONGO_URI, {
      serverSelectionTimeoutMS: 3000,
    });
    librechatConn.on("error", (err) => {
      console.warn("LibreChat MongoDB connection error:", err.message);
    });
  }
  return librechatConn;
}

const secuPromptEventSchema = new mongoose.Schema(
  {
    userId: { type: String, default: "unknown" },
    userEmail: { type: String, default: "" },
    userName: { type: String, default: "" },
    action: { type: String, enum: ["block", "sanitize"], required: true },
    risk: { type: Number, required: true },
    reasons: [{ type: String }],
    flaggedText: { type: String, default: "" },
    modules: { type: mongoose.Schema.Types.Mixed, default: {} },
    endpoint: { type: String, default: "" },
    ip: { type: String, default: "" },
    createdAt: { type: Date, default: Date.now },
  },
  { collection: "secuprompt_events" }
);

function getModel() {
  const conn = getConnection();
  return conn.models.SecuPromptEvent || conn.model("SecuPromptEvent", secuPromptEventSchema);
}

/**
 * Get paginated SecuPrompt prompt-injection events.
 */
async function getEvents({ limit = 50, skip = 0, action, userId, from, to, search }) {
  try {
    const Model = getModel();
    const filter = {};

    if (action === "block" || action === "sanitize") {
      filter.action = action;
    }

    if (userId) {
      filter.userId = userId;
    }

    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }

    if (search) {
      const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [{ userName: rx }, { userEmail: rx }, { flaggedText: rx }];
    }

    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
    const safeSkip = Math.max(parseInt(skip, 10) || 0, 0);

    const [events, total] = await Promise.all([
      Model.find(filter)
        .sort({ createdAt: -1 })
        .skip(safeSkip)
        .limit(safeLimit)
        .lean(),
      Model.countDocuments(filter),
    ]);

    return {
      events: events.map((e) => ({
        id: e._id.toString(),
        userId: e.userId,
        userEmail: e.userEmail,
        userName: e.userName,
        action: e.action,
        risk: e.risk,
        reasons: e.reasons || [],
        flaggedText: e.flaggedText || "",
        modules: e.modules || {},
        endpoint: e.endpoint,
        ip: e.ip,
        createdAt: e.createdAt,
      })),
      total,
      limit: safeLimit,
      skip: safeSkip,
      page: Math.floor(safeSkip / safeLimit) + 1,
      pages: Math.ceil(total / safeLimit) || 1,
    };
  } catch (err) {
    console.warn("Could not query SecuPrompt events from MongoDB:", err.message);
    return {
      events: [],
      total: 0,
      limit: 50,
      skip: 0,
      page: 1,
      pages: 1,
    };
  }
}

/**
 * Get aggregate SecuPrompt security stats.
 */
async function getStats() {
  try {
    const Model = getModel();
    const now = new Date();
    const h24 = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const d7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const d30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [total, blocked, sanitized, last24h, last7d, last30d, topOffenders] =
      await Promise.all([
        Model.countDocuments(),
        Model.countDocuments({ action: "block" }),
        Model.countDocuments({ action: "sanitize" }),
        Model.countDocuments({ createdAt: { $gte: h24 } }),
        Model.countDocuments({ createdAt: { $gte: d7 } }),
        Model.countDocuments({ createdAt: { $gte: d30 } }),
        Model.aggregate([
          { $match: { userEmail: { $ne: "" } } },
          {
            $group: {
              _id: "$userEmail",
              userName: { $first: "$userName" },
              count: { $sum: 1 },
              blocks: {
                $sum: { $cond: [{ $eq: ["$action", "block"] }, 1, 0] },
              },
              lastAttempt: { $max: "$createdAt" },
            },
          },
          { $sort: { count: -1 } },
          { $limit: 5 },
          {
            $project: {
              _id: 0,
              userEmail: "$_id",
              userName: 1,
              count: 1,
              blocks: 1,
              lastAttempt: 1,
            },
          },
        ]),
      ]);

    return {
      total,
      blocked,
      sanitized,
      last24h,
      last7d,
      last30d,
      topOffenders: topOffenders || [],
    };
  } catch (err) {
    console.warn("Could not query SecuPrompt stats from MongoDB:", err.message);
    return {
      total: 0,
      blocked: 0,
      sanitized: 0,
      last24h: 0,
      last7d: 0,
      last30d: 0,
      topOffenders: [],
    };
  }
}

module.exports = {
  getEvents,
  getStats,
};
