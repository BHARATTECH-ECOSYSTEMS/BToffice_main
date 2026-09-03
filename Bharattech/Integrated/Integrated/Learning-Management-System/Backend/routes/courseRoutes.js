const express = require("express");
const { uploadCourseFiles } = require("../middlewares/multerConfig");
const { 
    createCourse, 
    getCourse, 
    getAllCourses, 
    getTrainerCourses,
    updateCourse,
    enrollCourse, 
    getEnrolledCourses ,
    deleteCourse,
    updateCourseApproval, 
    getPendingCourses
} = require("../controllers/courseController");
const { keycloakAuth, requireAdmin } = require("../middlewares/keycloakAuth");
const mongoose = require("mongoose");

const router = express.Router();

// ✅ Create Course (Admin only - simplified from Trainer/Admin)
router.post(
    "/create-course",
    keycloakAuth,
    requireAdmin,
    uploadCourseFiles,
    createCourse
);

//  ✅ Get All Approved Courses (Public)
router.get("/all-approved", getAllCourses);

/**
 * ✅ Approve or Reject a Course (Admin Only)
 */
router.put("/approval/:courseId", keycloakAuth, requireAdmin, updateCourseApproval);

/**
 * ✅ Get Pending Courses (Admin Only)
 */
router.get("/pending", keycloakAuth, requireAdmin, getPendingCourses);

// ✅ Get Trainer's Courses (Admin only - simplified)
router.get("/trainer", keycloakAuth, requireAdmin, getTrainerCourses);

// Delete course (Admin only - simplified)
router.delete("/:courseId", keycloakAuth, requireAdmin, deleteCourse);

// ✅ Enroll in a Course (Any authenticated user)
router.post("/enroll/:courseId", keycloakAuth, enrollCourse);

// ✅ Get Enrolled Courses (Any authenticated user)
router.get("/enrolled", keycloakAuth, getEnrolledCourses);

// ✅ Partial Update Course (Admin Only - simplified)
router.patch("/:courseId", keycloakAuth, requireAdmin, async (req, res, next) => {
    const { courseId } = req.params;

    // ✅ Validate if courseId is a valid MongoDB ObjectId
    if (!mongoose.isValidObjectId(courseId)) {
        return res.status(400).json({ success: false, message: "Invalid course ID" });
    }

    next();
}, uploadCourseFiles, updateCourse);

// ✅ Get Single Course by ID (Logged-in Users Only)
router.get("/:id", keycloakAuth, async (req, res, next) => {
    const { id } = req.params;

    // Validate if the ID is a valid ObjectId
    if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({ success: false, message: "Invalid course ID" });
    }
    next();
}, getCourse);

module.exports = router;