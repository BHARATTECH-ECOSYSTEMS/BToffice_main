import mongoose from "mongoose";
import Course from "../models/Course.js";
import Purchase from "../models/Purchase.js";
import User from "../models/User.js";
import CourseProgress from "../models/CourseProgress.js";

const getUserId = (req) => req.user?.id;

const ensureCurrentUser = async (req) => {
  const userId = getUserId(req);
  if (!userId) return null;

  const fallbackName =
    req.user?.name ||
    req.user?.fullName ||
    req.user?.username ||
    req.user?.email ||
    "BharatTech User";

  return User.findByIdAndUpdate(
    userId,
    {
      $setOnInsert: {
        _id: userId,
        name: fallbackName,
        email: req.user?.email || `${userId}@bharattech.local`,
        imageUrl: req.user?.imageUrl || "",
        enrolledCourses: [],
      },
    },
    { new: true, upsert: true },
  );
};

export const getUserData = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "Unauthenticated" });
    }

    const user = await ensureCurrentUser(req);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res.status(200).json({
      status: "success",
      data: { user },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const userEnrolledCourses = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "Unauthenticated" });
    }

    await ensureCurrentUser(req);
    const userData = await User.findById(userId)
      .populate("enrolledCourses")
      .lean();
    if (!userData) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res.status(200).json({
      status: "success",
      data: { enrolledCourses: userData.enrolledCourses },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const purchaseCourse = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "Unauthenticated" });
    }

    const { courseId } = req.body;
    if (!courseId || !mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({ success: false, message: "Invalid ID" });
    }

    await ensureCurrentUser(req);
    const userData = await User.findById(userId)
      .populate("enrolledCourses")
      .lean();
    if (!userData) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Prevent duplicate enrollment
    const isAlreadyEnrolled = userData.enrolledCourses?.some(
      (c) => (c._id ? c._id.toString() : c.toString()) === courseId.toString(),
    );
    if (isAlreadyEnrolled) {
      return res
        .status(409)
        .json({ success: false, message: "Already enrolled" });
    }

    const courseData = await Course.findById(courseId)
      .select("coursePrice discount enrolledStudents")
      .lean();
    if (!courseData) {
      return res
        .status(404)
        .json({ success: false, message: "Course not found" });
    }

    const coursePrice = Number(courseData.coursePrice) || 0;
    const discount = Number(courseData.discount) || 0;
    const amount = Math.max(
      0,
      Number((coursePrice - (discount * coursePrice) / 100).toFixed(2)),
    );

    await Purchase.findOneAndUpdate(
      { userId, courseId: courseData._id },
      { $set: { amount, status: "completed" } },
      { new: true, upsert: true },
    );

    await Course.updateOne(
      { _id: courseData._id },
      { $addToSet: { enrolledStudents: String(userId) } },
    );

    await User.updateOne(
      { _id: userData._id },
      { $addToSet: { enrolledCourses: courseData._id } },
    );

    res.status(200).json({
      success: true,
      status: "success",
      message: "Enrolled successfully",
      data: { courseId: courseData._id },
    });
  } catch (error) {
    console.error("purchaseCourse error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to enroll in course",
    });
  }
};

export const updateUserCourseProgress = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "Unauthenticated" });
    }

    const { courseId, lectureId } = req.body;
    if (!courseId || !mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({ success: false, message: "Invalid ID" });
    }

    // Sanitize lectureId to prevent injection
    const safeLectureId = String(lectureId || "").slice(0, 100);
    if (!safeLectureId) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid lecture ID" });
    }

    // Atomic update with $addToSet to avoid race conditions and duplicates
    await CourseProgress.findOneAndUpdate(
      { userId, courseId },
      { $addToSet: { lectureCompleted: safeLectureId } },
      { upsert: true, new: true },
    );

    res.status(200).json({
      status: "success",
      message: "Lecture marked as completed",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
    console.error("Update course progress error:", error);
  }
};

export const getUserCourseProgress = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "Unauthenticated" });
    }

    const { courseId } = req.body;
    if (!courseId || !mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({ success: false, message: "Invalid ID" });
    }

    const progressData = await CourseProgress.findOne({
      userId,
      courseId,
    }).lean();

    res.status(200).json({
      status: "success",
      data: { progressData },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
    console.error("Get course progress error:", error);
  }
};

export const addUserRating = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "Unauthenticated" });
    }

    const { courseId, rating } = req.body;
    if (
      !courseId ||
      !mongoose.Types.ObjectId.isValid(courseId) ||
      !rating ||
      rating < 1 ||
      rating > 5
    ) {
      return res.status(400).json({ success: false, message: "Invalid input" });
    }

    const [courseData, user] = await Promise.all([
      Course.findById(courseId),
      User.findById(userId).select("enrolledCourses").lean(),
    ]);

    if (!courseData) {
      return res
        .status(404)
        .json({ success: false, message: "Course not found" });
    }

    if (
      !user ||
      !user.enrolledCourses?.some(
        (c) =>
          (c._id ? c._id.toString() : c.toString()) === courseId.toString(),
      )
    ) {
      return res.status(404).json({
        success: false,
        message: "User has not purchased this course.",
      });
    }

    const existingRatingIndex = courseData.courseRatings.findIndex(
      (courseRating) => courseRating.userId.toString() === userId.toString(),
    );

    if (existingRatingIndex !== -1) {
      courseData.courseRatings[existingRatingIndex].rating = rating;
    } else {
      courseData.courseRatings.push({ userId, rating });
    }

    await courseData.save();

    res.status(200).json({
      status: "success",
      message: "Rating added/updated successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
    console.error("Add user rating error:", error);
  }
};
