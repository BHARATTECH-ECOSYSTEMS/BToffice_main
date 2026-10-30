const mongoose = require("mongoose");

// A former colleague's application to an internal job: applied → meets criteria → knowledge check sent → rejoined,
// or not this time (from "applied" or after the check). One per person per job.

const STAGES = ["applied", "eligible", "checking", "rejoined", "declined"];
// where each stage may go next; rejoined and declined are the end of the road
const NEXT = { applied: ["eligible", "declined"], eligible: ["checking"], checking: ["rejoined", "declined"], rejoined: [], declined: [] };

const JobApplicationSchema = new mongoose.Schema(
  {
    job: { type: mongoose.Schema.Types.ObjectId, ref: "InternalJob", required: true },
    person: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    stage: { type: String, enum: STAGES, default: "applied" },
    stageAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

JobApplicationSchema.index({ job: 1, person: 1 }, { unique: true });

JobApplicationSchema.statics.STAGES = STAGES;
JobApplicationSchema.statics.NEXT = NEXT;

module.exports = mongoose.model("JobApplication", JobApplicationSchema);
