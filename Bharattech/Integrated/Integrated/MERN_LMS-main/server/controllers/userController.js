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
    { new: true, upsert: true }
  );
};

export const getUserData = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthenticated" });
    }

    const user = await ensureCurrentUser(req);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
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
      return res.status(401).json({ success: false, message: "Unauthenticated" });
    }

    await ensureCurrentUser(req);
    const userData = await User.findById(userId).populate("enrolledCourses");
    if (!userData) {
      return res.status(404).json({ success: false, message: "User not found" });
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
      return res.status(401).json({ success: false, message: "Unauthenticated" });
    }

    const { courseId } = req.body;
    if (!courseId) {
      return res.status(400).json({ success: false, message: "Course id is required" });
    }

    const userData = await ensureCurrentUser(req);
    const courseData = await Course.findById(courseId).select(
      "coursePrice discount enrolledStudents"
    );

    if (!userData) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    if (!courseData) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }

    const coursePrice = Number(courseData.coursePrice) || 0;
    const discount = Number(courseData.discount) || 0;
    const amount = Math.max(
      0,
      Number((coursePrice - (discount * coursePrice) / 100).toFixed(2))
    );

    await Purchase.findOneAndUpdate(
      { userId, courseId: courseData._id },
      { $set: { amount, status: "completed" } },
      { new: true, upsert: true }
    );

    await Course.updateOne(
      { _id: courseData._id },
      { $addToSet: { enrolledStudents: String(userId) } }
    );

    await User.updateOne(
      { _id: userData._id },
      { $addToSet: { enrolledCourses: courseData._id } }
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
      return res.status(401).json({ success: false, message: "Unauthenticated" });
    }

    const { courseId, lectureId } = req.body;
    const progressData = await CourseProgress.findOne({ userId, courseId });

    if (progressData) {
      if (progressData.lectureCompleted.includes(lectureId)) {
        return res.status(200).json({
          status: "success",
          message: "Lecture already marked as completed",
        });
      }

      progressData.lectureCompleted.push(lectureId);
      await progressData.save();
    } else {
      await CourseProgress.create({
        userId,
        courseId,
        lectureCompleted: [lectureId],
      });
    }

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
      return res.status(401).json({ success: false, message: "Unauthenticated" });
    }

    const { courseId } = req.body;
    const progressData = await CourseProgress.findOne({ userId, courseId });

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
      return res.status(401).json({ success: false, message: "Unauthenticated" });
    }

    const { courseId, rating } = req.body;
    if (!courseId || !rating || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: "Invalid input" });
    }

    const courseData = await Course.findById(courseId);
    if (!courseData) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }

    const user = await User.findById(userId);
    if (!user || !user.enrolledCourses.includes(courseId)) {
      return res.status(404).json({
        success: false,
        message: "User has not purchased this course.",
      });
    }

    const existingRatingIndex = courseData.courseRatings.findIndex(
      (courseRating) => courseRating.userId.toString() === userId.toString()
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
