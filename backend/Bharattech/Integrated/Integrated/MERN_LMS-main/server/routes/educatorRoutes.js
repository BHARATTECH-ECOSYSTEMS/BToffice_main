import express from "express";

import upload from "../configs/multer.js";
import { protect } from "../middlewares/authMiddleware.js";
import {
  addCourse,
  getEducatorCourses,
  educatorDashboardData,
  getEnrolledStudentsData,
} from "../controllers/educatorController.js";

const educatorRouter = express.Router();

// Routes are mounted at /api/educator in server.js
// POST /api/educator/add-course
educatorRouter.post("/add-course", protect(["Subadmin", "Admin", "Superadmin", "Super-admin"]), upload.single("image"), addCourse);

// GET /api/educator/courses
educatorRouter.get("/courses", protect(["Subadmin", "Admin", "Superadmin", "Super-admin"]), getEducatorCourses);

// GET /api/educator/dashboard
educatorRouter.get("/dashboard", protect(["Subadmin", "Admin", "Superadmin", "Super-admin"]), educatorDashboardData);

// GET /api/educator/enrollments
educatorRouter.get("/enrollments", protect(["Subadmin", "Admin", "Superadmin", "Super-admin"]), getEnrolledStudentsData);

// Alias used by frontend: GET /api/educator/enrolled-students
educatorRouter.get("/enrolled-students", protect(["Subadmin", "Admin", "Superadmin", "Super-admin"]), getEnrolledStudentsData);

export default educatorRouter;
