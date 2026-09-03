const CourseProgress = require("../models/CourseProgress");
const Course = require("../models/Course");

// ENROLL COURSE
exports.enrollCourse = async (req, res) => {
    try {
        const { courseId } = req.body;

        // Check if already enrolled
        const existing = await CourseProgress.findOne({
            userId: req.user.id,
            courseId: courseId
        });

        if (existing) {
            return res.status(400).json({ message: "Already enrolled in this course" });
        }

        const progress = await CourseProgress.create({
            userId: req.user.id,
            courseId: courseId
        });

        const populatedProgress = await CourseProgress.findById(progress._id)
            .populate("userId", "fullName email")
            .populate("courseId");

        res.status(201).json(populatedProgress);
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// UPDATE PROGRESS
exports.updateProgress = async (req, res) => {
    try {
        const { courseId, progress, completedLessons } = req.body;

        const progressData = await CourseProgress.findOneAndUpdate(
            { userId: req.user.id, courseId: courseId },
            { 
                progress: progress || 0,
                completedLessons: completedLessons || [],
                completedAt: progress === 100 ? new Date() : null
            },
            { new: true, upsert: true }
        ).populate("userId", "fullName email")
         .populate("courseId");

        res.status(200).json(progressData);
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// GET USER COURSE PROGRESS (My Courses)
exports.getMyCourses = async (req, res) => {
    try {
        const progressData = await CourseProgress.find({ userId: req.user.id })
            .populate("courseId")
            .populate("completedLessons")
            .sort({ enrolledAt: -1 });

        res.status(200).json(progressData);
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// GET SPECIFIC COURSE PROGRESS
exports.getCourseProgress = async (req, res) => {
    try {
        const { courseId } = req.params;
        const progress = await CourseProgress.findOne({
            userId: req.user.id,
            courseId: courseId
        })
        .populate("courseId")
        .populate("completedLessons");

        if (!progress) {
            return res.status(404).json({ message: "Course progress not found" });
        }

        res.status(200).json(progress);
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

