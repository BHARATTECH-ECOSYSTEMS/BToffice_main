const mongoose = require("mongoose");

// A course on the portal's learning platform (controllers/learningController.js, /api/learning): chapters of
// lectures, each a YouTube video. Kept apart from the company app's Course model (/api/courses), which its own
// pages still read. Courses are free; there are no prices.
const TITLE_MAX = 120;
const PARAGRAPH_MAX = 2000;
const PARAGRAPHS_MAX = 20;
const CHAPTERS_MAX = 30;
const LECTURES_MAX = 50;
const MINUTES_MAX = 600;

const LectureSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: TITLE_MAX },
  minutes: { type: Number, required: true, min: 1, max: MINUTES_MAX },
  // checked by readVideoUrl in the controller: https YouTube addresses only
  videoUrl: { type: String, required: true },
  // watchable before enrolling
  preview: { type: Boolean, default: false },
});

const ChapterSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: TITLE_MAX },
  lectures: { type: [LectureSchema], default: [] },
});

const LearningCourseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: TITLE_MAX },
    // one string per paragraph, plain text
    description: { type: [{ type: String, maxlength: PARAGRAPH_MAX }], default: [] },
    chapters: { type: [ChapterSchema], default: [] },
    educator: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    published: { type: Boolean, default: true },
    // when it last went live, for the catalogue's order and "Published" dates
    publishedAt: { type: Date },
    // the cover in GridFS (utils/courseThumbs.js); none means the portal draws a generated one
    thumbFileId: { type: mongoose.Schema.Types.ObjectId },
  },
  { timestamps: true }
);

LearningCourseSchema.index({ published: 1, publishedAt: -1 });
LearningCourseSchema.index({ educator: 1 });

module.exports = mongoose.model("LearningCourse", LearningCourseSchema);
Object.assign(module.exports, { TITLE_MAX, PARAGRAPH_MAX, PARAGRAPHS_MAX, CHAPTERS_MAX, LECTURES_MAX, MINUTES_MAX });
