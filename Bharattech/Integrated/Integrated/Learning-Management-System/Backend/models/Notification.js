const mongoose = require("mongoose");

// One note in someone's notification bell: a task given or changed, work handed in, a certificate issued, a
// policy still to accept, a calendar event added, changed or cancelled, or a new learning course. Made by
// utils/notify.js when the thing happens (policy notes when the bell first asks).
const KINDS = ["task", "task-update", "work-handed-in", "certificate", "policy", "event", "course"];
const RETENTION_SECONDS = 90 * 24 * 60 * 60;

const NotificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  kind: { type: String, enum: KINDS, required: true },
  title: { type: String, required: true, maxlength: 300 },
  detail: { type: String, maxlength: 300, default: "" },
  // a page of the portal, e.g. "/portal/certificates"
  link: { type: String, required: true },
  // the task, certificate or policy it is about, so the note goes when that does
  refId: { type: String },
  readAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
});

NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ refId: 1 });
// MongoDB removes notes 90 days after they were made
NotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: RETENTION_SECONDS });
// one policy note per person per policy, even when the bell asks several times at once
NotificationSchema.index({ userId: 1, kind: 1, refId: 1 }, { unique: true, partialFilterExpression: { kind: "policy" } });

module.exports = mongoose.model("Notification", NotificationSchema);
module.exports.KINDS = KINDS;
