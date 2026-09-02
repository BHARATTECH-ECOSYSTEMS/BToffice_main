import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import {
  addUserRating,
  getUserCourseProgress,
  getUserData,
  purchaseCourse,
  updateUserCourseProgress,
  userEnrolledCourses,
} from "../controllers/userController.js";

const userRouter = express.Router();

userRouter.get("/profile", protect(), getUserData);
userRouter.get("/enrolled-courses", protect(), userEnrolledCourses);
userRouter.post("/purchase", protect(), purchaseCourse);
userRouter.post("/update-course-progress", protect(), updateUserCourseProgress);
userRouter.post("/get-course-progress", protect(), getUserCourseProgress);
userRouter.post("/add-rating", protect(), addUserRating);

export default userRouter;
