import Course from "../models/Course.js";

// public pages show how a course was rated, never who rated or enrolled
const ratingsOnly = (ratings) => (ratings || []).map(({ rating }) => ({ rating }));

// Pagination helper (prevents excessive data loading when limit/page is passed)
const getPagination = (req) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = req.query.limit ? Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100) : null;
  const skip = limit ? (page - 1) * limit : 0;
  return { page, limit, skip };
};

// Get All Courses:
export const getAllCourses = async (req, res) => {
  try {
    const { limit, skip } = getPagination(req);

    let query = Course.find({
      isPublished: true,
    })
      .select("-courseContent -enrolledStudents")
      .populate({ path: "educator", select: "name imageUrl" })
      .lean();

    if (limit) {
      query = query.skip(skip).limit(limit);
    }

    // ratings without who gave them
    const courses = (await query).map((course) => ({ ...course, courseRatings: ratingsOnly(course.courseRatings) }));

    res.status(200).json({
      status: "success",
      resultsNum: courses.length,
      data: {
        courses,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const getCourseId = async (req, res) => {
  try {
    const { id } = req.params;
    // Unpublished courses are not public.
    const course = await Course.findOne({ _id: id, isPublished: true })
      .populate({
        path: "educator",
        select: "name imageUrl",
      })
      .lean();

    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }

    // Remove lectureUrl from response if isPreviewFree is false
    if (Array.isArray(course.courseContent)) {
      course.courseContent.forEach((chapter) => {
        if (Array.isArray(chapter.chapterContent)) {
          chapter.chapterContent.forEach((lecture) => {
            if (!lecture.isPreviewFree) {
              lecture.lectureUrl = "";
            }
          });
        }
      });
    }

    const { enrolledStudents, courseRatings, ...shown } = course;
    res.status(200).json({
      success: true,
      data: {
        course: { ...shown, enrolledCount: (enrolledStudents || []).length, courseRatings: ratingsOnly(courseRatings) },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
