const mongoose = require("mongoose");
const { STREAMS } = require("./User");

// An internal job posting (IJP): an opening at Bharattech offered first to the former colleagues of one stream
// (controllers/jobController.js). Those who meet its criteria take a knowledge check instead of an interview, and on
// passing they rejoin. Its applications are JobApplication records.

const MODES = ["onsite", "hybrid", "remote"];
const LIMITS = { TITLE_MAX: 120, ABOUT_MAX: 1000, LOCATION_MAX: 80, EXPERIENCE_MAX: 40, CHECK_MAX: 500, CRITERIA_MAX: 10, CRITERION_MAX: 200, OPENINGS_MAX: 50, EMAIL_MAX: 120 };

const InternalJobSchema = new mongoose.Schema(
  {
    stream: { type: String, enum: STREAMS, required: true },
    title: { type: String, required: true, maxlength: LIMITS.TITLE_MAX },
    about: { type: String, required: true, maxlength: LIMITS.ABOUT_MAX },
    location: { type: String, required: true, maxlength: LIMITS.LOCATION_MAX },
    mode: { type: String, enum: MODES, required: true },
    experience: { type: String, required: true, maxlength: LIMITS.EXPERIENCE_MAX },
    openings: { type: Number, required: true, min: 1, max: LIMITS.OPENINGS_MAX },
    // the last day to apply, "YYYY-MM-DD" (India time); empty means until it's filled
    closes: { type: String, default: "" },
    criteria: { type: [{ type: String, maxlength: LIMITS.CRITERION_MAX }], default: [] },
    check: { type: String, required: true, maxlength: LIMITS.CHECK_MAX },
    applyEmail: { type: String, required: true, maxlength: LIMITS.EMAIL_MAX },
    postedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    // the name at the time, so the posting still reads right after someone is renamed or leaves
    postedByName: { type: String, required: true },
    open: { type: Boolean, default: true },
    emailed: { type: Number, default: 0 },
    failed: { type: Number, default: 0 },
  },
  { timestamps: true }
);

InternalJobSchema.index({ createdAt: -1 });

InternalJobSchema.statics.MODES = MODES;
InternalJobSchema.statics.LIMITS = LIMITS;

module.exports = mongoose.model("InternalJob", InternalJobSchema);
