import Course from "../models/Course.js";

// Pagination helper (prevents excessive data loading when limit/page is passed)
const getPagination = (req) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = req.query.limit
    ? Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100)
    : null;
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
      .populate({ path: "educator", select: "name imageUrl email" })
      .lean();

    if (limit) {
      query = query.skip(skip).limit(limit);
    }

    const courses = await query;

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
    const course = await Course.findById(id)
      .populate({
        path: "educator",
        select: "name imageUrl email",
      })
      .lean();

    if (!course) {
      return res
        .status(404)
        .json({ success: false, message: "Course not found" });
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

    res.status(200).json({
      success: true,
      data: {
        course,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
