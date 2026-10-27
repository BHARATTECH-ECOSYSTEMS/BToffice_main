const express = require("express");
const router = express.Router();
const { mustBeObjectId } = require("../utils/refusal");
// an id that can't be a record is a plain 400, not a failed database lookup (500)
router.param("courseId", mustBeObjectId);
const controller = require("../controllers/courseProgressController");
// server.js signs everyone in before these routes (app.use("/api/course-progress", keycloakAuth, courseProgressRoutes)), so they don't check again

// Enroll in a course
router.post("/enroll", controller.enrollCourse);

// Update course progress
router.patch("/update", controller.updateProgress);

// Get all courses for current user
router.get("/", controller.getMyCourses);

// Get specific course progress
router.get("/:courseId", controller.getCourseProgress);

module.exports = router;

