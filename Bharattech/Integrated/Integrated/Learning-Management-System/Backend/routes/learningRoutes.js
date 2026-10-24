const express = require("express");
const router = express.Router();
const learning = require("../controllers/learningController");
const { uploadUserPhoto } = require("../middlewares/uploadUserPhoto");

// server.js signs everyone in before these routes (app.use("/api/learning", keycloakAuth, learningRoutes)); who may
// do what with a course is checked in the controller.

// Courses: list and one (everyone signed in), publish (admins and sub admins), change or delete (admins any; a sub
// admin their own)
router.get("/courses", learning.listCourses);
router.post("/courses", learning.publishCourse);
router.get("/courses/:id", learning.getCourse);
router.patch("/courses/:id", learning.changeCourse);
router.delete("/courses/:id", learning.deleteCourse);

// The cover image (same checks as profile photos: PNG, JPG or WebP, 2 MB)
router.get("/courses/:id/thumbnail", learning.getThumbnail);
router.put("/courses/:id/thumbnail", uploadUserPhoto("thumbnail"), learning.setThumbnail);
router.delete("/courses/:id/thumbnail", learning.removeThumbnail);

// Taking a course: enroll, mark lectures done, rate it
router.post("/courses/:id/enroll", learning.enroll);
router.put("/courses/:id/lectures/:lectureId", learning.markLecture);
router.put("/courses/:id/rating", learning.rateCourse);

// Who enrolled in the courses an educator may change
router.get("/students", learning.listStudents);

module.exports = router;
