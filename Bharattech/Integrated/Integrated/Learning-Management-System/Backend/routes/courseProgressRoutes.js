const express = require("express");
const router = express.Router();
const controller = require("../controllers/courseProgressController");
const { keycloakAuth } = require("../middlewares/keycloakAuth");

// Enroll in a course
router.post("/enroll", keycloakAuth, controller.enrollCourse);

// Update course progress
router.patch("/update", keycloakAuth, controller.updateProgress);

// Get all courses for current user
router.get("/", keycloakAuth, controller.getMyCourses);

// Get specific course progress
router.get("/:courseId", keycloakAuth, controller.getCourseProgress);

module.exports = router;

