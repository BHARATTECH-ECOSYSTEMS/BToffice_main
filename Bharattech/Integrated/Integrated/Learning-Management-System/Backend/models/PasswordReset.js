const mongoose = require("mongoose");

// One "Forgot password?" link (controllers/passwordResetController.js). Only a SHA-256 hash of its token is kept, so
// the stored records can't be turned back into working links. Records are removed a day after they were made, which
// is long enough to count how many links someone asked for in the last hour.
const PasswordResetSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  tokenHash: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true },
  usedAt: { type: Date },
  // set when a newer link replaces this one
  cancelledAt: { type: Date },
  createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 },
});

module.exports = mongoose.model("PasswordReset", PasswordResetSchema);
