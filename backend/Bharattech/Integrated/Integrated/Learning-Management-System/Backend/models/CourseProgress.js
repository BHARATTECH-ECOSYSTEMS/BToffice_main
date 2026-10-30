const mongoose = require("mongoose");

const CourseProgressSchema = new mongoose.Schema({
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "User", 
        required: true 
    },
    courseId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "Course", 
        required: true 
    },
    progress: { 
        type: Number, 
        default: 0,
        min: 0,
        max: 100
    },
    completedLessons: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Lesson"
    }],
    enrolledAt: { type: Date, default: Date.now },
    completedAt: { type: Date }
}, { timestamps: true });

// Prevent duplicate enrollments
CourseProgressSchema.index({ userId: 1, courseId: 1 }, { unique: true });

module.exports = mongoose.model("CourseProgress", CourseProgressSchema);

