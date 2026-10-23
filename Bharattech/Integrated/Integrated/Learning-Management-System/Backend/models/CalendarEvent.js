const mongoose = require("mongoose");

// An event on everyone's portal calendar (controllers/eventController.js): a meeting, a training, a deadline or a
// holiday. The day is kept as the "YYYY-MM-DD" people picked, not a moment in time, so it never shifts between time
// zones; the time is "HH:MM" in India time, or "" for all day.
const KINDS = ["meeting", "training", "deadline", "holiday"];
const TITLE_MAX = 80;

const CalendarEventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: TITLE_MAX },
    kind: { type: String, enum: KINDS, required: true },
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    time: { type: String, default: "", match: /^(|([01]\d|2[0-3]):[0-5]\d)$/ },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

CalendarEventSchema.index({ date: 1, time: 1 });

module.exports = mongoose.model("CalendarEvent", CalendarEventSchema);
module.exports.KINDS = KINDS;
module.exports.TITLE_MAX = TITLE_MAX;
