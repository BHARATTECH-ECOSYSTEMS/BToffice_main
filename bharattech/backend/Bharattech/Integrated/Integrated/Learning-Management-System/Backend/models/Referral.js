const mongoose = require("mongoose");
const { STREAMS } = require("./User");

// A job at another company passed on to the former colleagues of one stream (controllers/referralController.js).
// It's emailed to them once, when it's shared; `emailed` and `failed` record how that went.

const TITLE_MAX = 120;
const COMPANY_MAX = 120;
const NOTE_MAX = 500;
const LINK_MAX = 2048;

const ReferralSchema = new mongoose.Schema(
  {
    stream: { type: String, enum: STREAMS, required: true },
    title: { type: String, required: true, maxlength: TITLE_MAX },
    company: { type: String, required: true, maxlength: COMPANY_MAX },
    link: { type: String, default: "", maxlength: LINK_MAX },
    note: { type: String, default: "", maxlength: NOTE_MAX },
    sharedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    // the name at the time, so the list still reads right after someone is renamed or leaves
    sharedByName: { type: String, required: true },
    emailed: { type: Number, default: 0 },
    failed: { type: Number, default: 0 },
  },
  { timestamps: true }
);

ReferralSchema.index({ createdAt: -1 });

ReferralSchema.statics.LIMITS = { TITLE_MAX, COMPANY_MAX, NOTE_MAX, LINK_MAX };

module.exports = mongoose.model("Referral", ReferralSchema);
