import mongoose from "mongoose";
import Course from "../models/Course.js";
import Purchase from "../models/Purchase.js";
import User from "../models/User.js";
import CourseProgress from "../models/CourseProgress.js";
import { ensureUser } from "../utils/currentUser.js";
import { lectureIdsOf, progressIn } from "../utils/lectures.js";

const getUserId = (req) => req.user?.id;

export const getUserData = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthenticated" });
    }

    const user = await ensureUser(req);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.status(200).json({
      status: "success",
      data: { user },
    });
  } catch (error) {
    console.error("getUserData error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const userEnrolledCourses = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthenticated" });
    }

    await ensureUser(req);
    // without the list of who else is enrolled
    const userData = await User.findById(userId).populate({ path: "enrolledCourses", select: "-enrolledStudents" }).lean();
    if (!userData) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // and of the ratings only their own (the player shows it)
    const enrolledCourses = userData.enrolledCourses.map((course) => ({
      ...course,
      courseRatings: (course.courseRatings || []).filter((r) => r.userId === userId),
    }));
    res.status(200).json({
      status: "success",
      data: { enrolledCourses },
    });
  } catch (error) {
    console.error("userEnrolledCourses error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * GET /api/user/learning: the signed-in person's courses with how far they are, unfinished first, for the portal's
 * "My learning" card (owner's 6A). Titles and numbers only: no covers or lecture lists.
 */
export const myLearning = async (req, res) => {
  try {
    const me = await ensureUser(req);
    if (!me) {
      return res.status(401).json({ success: false, message: "Unauthenticated" });
    }
    const courses = await Course.find({ _id: { $in: me.enrolledCourses } })
      .select("courseTitle courseContent educator")
      .populate({ path: "educator", select: "name" })
      .lean();
    const progress = await CourseProgress.find({ userId: me._id, courseId: { $in: courses.map((c) => String(c._id)) } }).lean();
    const doneIn = new Map(progress.map((p) => [p.courseId, p.lectureCompleted || []]));
    const order = me.enrolledCourses.map(String);
    const summary = courses
      .map((course) => ({
        courseId: String(course._id),
        courseTitle: course.courseTitle,
        educatorName: course.educator?.name || "",
        ...progressIn(course, doneIn.get(String(course._id))),
      }))
      .sort((a, b) => Number(a.completed) - Number(b.completed) || order.indexOf(a.courseId) - order.indexOf(b.courseId));

    res.status(200).json({ status: "success", data: { courses: summary } });
  } catch (error) {
    console.error("myLearning error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const purchaseCourse = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthenticated" });
    }

    const { courseId } = req.body;
    if (!courseId || !mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({ success: false, message: "Invalid ID" });
    }

    await ensureUser(req);
    const userData = await User.findById(userId).populate("enrolledCourses").lean();
    if (!userData) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Prevent duplicate enrollment
    const isAlreadyEnrolled = userData.enrolledCourses?.some(
      (c) => (c._id ? c._id.toString() : c.toString()) === courseId.toString()
    );
    if (isAlreadyEnrolled) {
      return res.status(409).json({ success: false, message: "Already enrolled" });
    }

    const courseData = await Course.findOne({ _id: courseId, isPublished: true })
      .select("_id")
      .lean();
    if (!courseData) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }

    // every course is free (owner's 2A), older ones with a price on file included
    await Purchase.findOneAndUpdate(
      { userId, courseId: courseData._id },
      { $set: { amount: 0, status: "completed" } },
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
      message: "Failed to enroll in course",
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
    if (!courseId || !mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({ success: false, message: "Invalid ID" });
    }

    const safeLectureId = String(lectureId || "").slice(0, 100);
    if (!safeLectureId) {
      return res.status(400).json({ success: false, message: "Invalid lecture ID" });
    }

    const [course, user] = await Promise.all([
      Course.findById(courseId).select("courseContent").lean(),
      User.findById(userId).select("enrolledCourses").lean(),
    ]);
    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }
    if (!user?.enrolledCourses?.some((c) => String(c) === String(courseId))) {
      return res.status(403).json({ success: false, message: "Enroll in this course first." });
    }
    const lectureIds = lectureIdsOf(course);
    if (!lectureIds.includes(safeLectureId)) {
      return res.status(400).json({ success: false, message: "That lecture isn't in this course." });
    }

    // Atomic update with $addToSet to avoid race conditions and duplicates
    const progress = await CourseProgress.findOneAndUpdate(
      { userId, courseId },
      { $addToSet: { lectureCompleted: safeLectureId } },
      { upsert: true, new: true }
    );
    // finished once every lecture of the course is done
    const completed = lectureIds.every((id) => progress.lectureCompleted.includes(id));
    if (completed !== progress.completed) {
      await CourseProgress.updateOne({ _id: progress._id }, { $set: { completed } });
    }

    res.status(200).json({
      status: "success",
      message: "Lecture marked as completed",
      completed,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
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
    if (!courseId || !mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({ success: false, message: "Invalid ID" });
    }

    const progressData = await CourseProgress.findOne({ userId, courseId }).lean();

    res.status(200).json({
      status: "success",
      data: { progressData },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
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
    if (!courseId || !mongoose.Types.ObjectId.isValid(courseId) || !rating || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: "Invalid input" });
    }

    const [courseData, user] = await Promise.all([
      Course.findById(courseId),
      User.findById(userId).select("enrolledCourses").lean(),
    ]);

    if (!courseData) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }

    if (!user || !user.enrolledCourses?.some((c) => (c._id ? c._id.toString() : c.toString()) === courseId.toString())) {
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
    res.status(500).json({ success: false, message: "Internal server error" });
    console.error("Add user rating error:", error);
  }
};
