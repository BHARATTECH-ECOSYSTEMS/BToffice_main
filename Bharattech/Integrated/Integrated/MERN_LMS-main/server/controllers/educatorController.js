import fs from "fs";
import { v2 as cloudinary } from "cloudinary";
import Course from "../models/Course.js";
import Purchase from "../models/Purchase.js";
import { isValidYouTubeUrl } from "../utils/videoHelpers.js";
import { cleanDescription, hasVisibleText } from "../utils/courseDescription.js";
import { ensureUser } from "../utils/currentUser.js";

const getUserId = (req) => req.user?.id;
const hasAdminAccess = (req) =>
  req.user?.isPortalAdmin ||
  (req.user?.roles || []).some((role) =>
    ["admin", "superadmin", "super-admin"].includes(String(role).toLowerCase()),
  );
const getEducatorCourseFilter = (req) =>
  hasAdminAccess(req) ? {} : { educator: getUserId(req) };

const getCompletedEnrollmentPurchases = async (courseIds) =>
  Purchase.find({
    courseId: { $in: courseIds },
    status: "completed",
  })
    .populate("userId", "name imageUrl email")
    .populate("courseId", "courseTitle")
    .sort({ updatedAt: -1, createdAt: -1 })
    .lean();

const getLocalImageDataUrl = async (filePath, mimeType = "image/png") => {
  const imageBuffer = await fs.promises.readFile(filePath);
  return `data:${mimeType};base64,${imageBuffer.toString("base64")}`;
};

const getCourseThumbnailUrl = async (imageFile) => {
  const hasCloudinaryConfig =
    process.env.CLOUDINARY_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_SECRET_KEY;

  if (hasCloudinaryConfig) {
    try {
      const imageUpload = await cloudinary.uploader.upload(imageFile.path, {
        folder: "bharattech-lms/courses",
      });

      if (imageUpload?.secure_url) {
        return imageUpload.secure_url;
      }
    } catch (error) {
      console.warn(
        "Cloudinary thumbnail upload failed, using embedded image:",
        error.message,
      );
    }
  }

  return getLocalImageDataUrl(imageFile.path, imageFile.mimetype);
};

const normalizeCourseData = (courseData) => {
  const normalizedChapters = Array.isArray(courseData.courseContent)
    ? courseData.courseContent
        .map((chapter, chapterIndex) => ({
          chapterId: chapter.chapterId || `chapter-${chapterIndex + 1}`,
          chapterOrder: Number(chapter.chapterOrder) || chapterIndex + 1,
          chapterTitle: String(chapter.chapterTitle || "")
            .trim()
            .slice(0, 200),
          chapterContent: Array.isArray(chapter.chapterContent)
            ? chapter.chapterContent
                .map((lecture, lectureIndex) => ({
                  lectureId:
                    lecture.lectureId ||
                    `lecture-${chapterIndex + 1}-${lectureIndex + 1}`,
                  lectureTitle: String(lecture.lectureTitle || "")
                    .trim()
                    .slice(0, 200),
                  lectureDuration: Number(lecture.lectureDuration) || 1,
                  lectureUrl: String(lecture.lectureUrl || "").trim(),
                  videoSource:
                    lecture.videoSource === "cloudinary"
                      ? "cloudinary"
                      : "youtube",
                  isPreviewFree: Boolean(lecture.isPreviewFree),
                  lectureOrder:
                    Number(lecture.lectureOrder) || lectureIndex + 1,
                }))
                .filter((lecture) => lecture.lectureTitle && lecture.lectureUrl)
            : [],
        }))
        .filter((chapter) => chapter.chapterTitle)
    : [];

  return {
    courseTitle: String(courseData.courseTitle || "")
      .trim()
      .slice(0, 200),
    courseDescription: cleanDescription(
      String(courseData.courseDescription || "").slice(0, 5000),
    ),
    coursePrice: Number(courseData.coursePrice) || 0,
    discount: Number(courseData.discount) || 0,
    courseContent: normalizedChapters,
  };
};

const validateCourseData = (courseData) => {
  if (!courseData.courseTitle) return "Course title is required";
  if (!hasVisibleText(courseData.courseDescription)) return "Course description is required";
  if (
    !Array.isArray(courseData.courseContent) ||
    courseData.courseContent.length === 0
  ) {
    return "At least one chapter is required";
  }
  if (
    !courseData.courseContent.some(
      (chapter) => chapter.chapterContent.length > 0,
    )
  ) {
    return "At least one lecture with a video URL is required";
  }
  if (courseData.discount < 0 || courseData.discount > 100) {
    return "Discount must be between 0 and 100";
  }
  for (const chapter of courseData.courseContent) {
    for (const lecture of chapter.chapterContent) {
      if (
        lecture.videoSource === "youtube" &&
        !isValidYouTubeUrl(lecture.lectureUrl)
      ) {
        return `Invalid YouTube URL for lecture: "${lecture.lectureTitle || "Untitled Lecture"}"`;
      }
    }
  }
  return null;
};

/* =====================================================
   ADD NEW COURSE (Educator + Admin)
==================================================== */
/** Checks and saves a new course; answers [status, reply] so addCourse can tidy up before replying. */
const createCourse = async (req) => {
  const userId = getUserId(req);
  if (!userId) {
    return [401, { success: false, message: "Unauthenticated" }];
  }

  const educatorUser = await ensureUser(req);

  const { courseData } = req.body;
  const imageFile = req.file;

  if (!imageFile) {
    return [400, { success: false, message: "Thumbnail is required" }];
  }

  // Validate file type against whitelist
  const allowedMimes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowedMimes.includes(imageFile.mimetype)) {
    return [400, { success: false, message: "Invalid image" }];
  }

  // Validate file size (5MB maximum)
  if (imageFile.size > 5 * 1024 * 1024) {
    return [400, { success: false, message: "Image too large" }];
  }

  let parsedCourseData;
  try {
    parsedCourseData = JSON.parse(courseData);
  } catch {
    return [400, { success: false, message: "Invalid course data format" }];
  }

  parsedCourseData = normalizeCourseData(parsedCourseData);

  const validationMessage = validateCourseData(parsedCourseData);
  if (validationMessage) {
    return [400, { success: false, message: validationMessage }];
  }

  parsedCourseData.educator = educatorUser._id;
  parsedCourseData.isPublished = true;

  parsedCourseData.courseThumbnail = await getCourseThumbnailUrl(imageFile);

  const newCourse = await Course.create(parsedCourseData);

  return [201, {
    success: true,
    message: "Course created successfully",
    data: newCourse,
  }];
};

export const addCourse = async (req, res) => {
  let status;
  let reply;
  try {
    [status, reply] = await createCourse(req);
  } catch (error) {
    console.error("addCourse error:", error);
    [status, reply] = [500, { success: false, message: "Internal server error" }];
  }
  // the cover is read into the course (or refused) by now: the uploaded file goes before the reply does
  if (req.file?.path) {
    await fs.promises.unlink(req.file.path).catch((cleanupError) => {
      console.warn("Could not remove an uploaded course cover:", cleanupError.code);
    });
  }
  return res.status(status).json(reply);
};

/* =====================================================
   GET EDUCATOR COURSES
==================================================== */
export const getEducatorCourses = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "Unauthenticated" });
    }
    // keeps the educator's name as it is in their sign-in
    await ensureUser(req);

    const courses = await Course.find(getEducatorCourseFilter(req)).lean();

    return res.status(200).json({
      status: "success",
      resultsNum: courses.length,
      data: { courses },
    });
  } catch (error) {
    console.error("getEducatorCourses error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

/* =====================================================
   EDUCATOR DASHBOARD DATA
   (total courses, total earnings, enrolled students)
==================================================== */
export const educatorDashboardData = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "Unauthenticated" });
    }
    // keeps the educator's name as it is in their sign-in
    await ensureUser(req);

    const courses = await Course.find(getEducatorCourseFilter(req))
      .select("_id")
      .lean();
    const totalCourses = courses.length;

    const courseIds = courses.map((course) => course._id);

    const purchases = await getCompletedEnrollmentPurchases(courseIds);

    const totalEarnings = purchases.reduce(
      (sum, purchase) => sum + (purchase.amount || 0),
      0,
    );

    const enrolledStudentsData = purchases
      .filter((purchase) => purchase.userId && purchase.courseId)
      .map((purchase) => ({
        student: purchase.userId,
        courseTitle: purchase.courseId.courseTitle,
        purchaseDate: purchase.updatedAt || purchase.createdAt,
      }));

    return res.status(200).json({
      status: "success",
      data: {
        totalCourses,
        totalEarnings,
        enrolledStudentsData,
      },
    });
  } catch (error) {
    console.error("educatorDashboardData error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

/* =====================================================
   GET ENROLLED STUDENTS WITH PURCHASE DATA
==================================================== */
export const getEnrolledStudentsData = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "Unauthenticated" });
    }
    // keeps the educator's name as it is in their sign-in
    await ensureUser(req);

    const courses = await Course.find(getEducatorCourseFilter(req))
      .select("_id")
      .lean();
    const courseIds = courses.map((course) => course._id);

    const purchases = await getCompletedEnrollmentPurchases(courseIds);

    const enrolledStudents = purchases
      .filter((purchase) => purchase.userId && purchase.courseId)
      .map((purchase) => ({
        student: purchase.userId,
        courseTitle: purchase.courseId.courseTitle,
        purchaseDate: purchase.updatedAt || purchase.createdAt,
      }));

    return res.status(200).json({
      status: "success",
      resultsNum: enrolledStudents.length,
      data: { enrolledStudents },
    });
  } catch (error) {
    console.error("getEnrolledStudentsData error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};