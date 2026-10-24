const mongoose = require("mongoose");

// One person enrolled in one learning course (controllers/learningController.js): when they enrolled, the lectures
// they marked done (lecture ids of that course) and their 1–5 star rating, if they gave one.
const LearningEnrollmentSchema = new mongoose.Schema({
  course: { type: mongoose.Schema.Types.ObjectId, ref: "LearningCourse", required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  enrolledAt: { type: Date, default: Date.now },
  completed: { type: [String], default: [] },
  rating: { type: Number, min: 1, max: 5 },
});

// enrolling twice at the same moment still makes one enrollment
LearningEnrollmentSchema.index({ course: 1, user: 1 }, { unique: true });
LearningEnrollmentSchema.index({ user: 1 });

module.exports = mongoose.model("LearningEnrollment", LearningEnrollmentSchema);
