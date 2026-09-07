import mongoose from "mongoose";

const courseProgressSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
    },
    courseId: {
      type: String,
      required: true,
    },
    completed: {
      type: Boolean,
      default: false,
    },
    lectureCompleted: [],
  },
  { minimize: false }
);

// CourseProgress Model Indexes
courseProgressSchema.index({ userId: 1, courseId: 1 }, { unique: true });

const CourseProgress = mongoose.model("CourseProgress", courseProgressSchema);
export default CourseProgress;
