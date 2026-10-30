const mongoose = require("mongoose");

// One visit to the e-Office (controllers/attendanceController.js): from "Join" to "Leave" on the portal's e-Office
// card. A person can come and go several times a day; each visit is its own record. `day` is the India day the visit
// started on ("YYYY-MM-DD"), so a day's list never shifts between time zones. A visit still open when its day ends is
// closed at the end of that day with `noCheckOut`; an admin may correct its times later, with a reason, and every
// correction is kept.
const REASON_MAX = 300;

const TimesSchema = new mongoose.Schema({ inAt: Date, outAt: Date }, { _id: false });
const StretchSchema = new mongoose.Schema({ from: { type: Date, required: true }, to: { type: Date, required: true } }, { _id: false });

const CorrectionSchema = new mongoose.Schema(
  {
    at: { type: Date, required: true },
    by: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    byName: { type: String, default: "" },
    reason: { type: String, required: true, maxlength: REASON_MAX },
    from: { type: TimesSchema, required: true },
    to: { type: TimesSchema, required: true },
  },
  { _id: false }
);

const OfficeVisitSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    day: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    inAt: { type: Date, required: true },
    outAt: { type: Date, default: null },
    open: { type: Boolean, default: true },
    noCheckOut: { type: Boolean, default: false },
    // the last "still active" signal from the portal while this visit was open (utils/presence.js); never sent out
    lastActiveAt: { type: Date, default: null },
    // finished stretches without use (utils/presence.js idleStretch), for the visit's History; the one still going
    // is worked out from lastActiveAt when the visit is read
    idle: { type: [StretchSchema], default: [] },
    corrections: { type: [CorrectionSchema], default: [] },
  },
  { timestamps: true }
);

// at most one open visit per person, so two quick clicks (or two tabs, or two servers) can't make two
OfficeVisitSchema.index({ user: 1 }, { unique: true, partialFilterExpression: { open: true } });
OfficeVisitSchema.index({ day: 1 });
OfficeVisitSchema.index({ user: 1, day: -1 });

module.exports = mongoose.model("OfficeVisit", OfficeVisitSchema);
module.exports.REASON_MAX = REASON_MAX;
