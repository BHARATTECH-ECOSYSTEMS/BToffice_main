import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import humanizeDuration from "humanize-duration";
import {
  Star,
  Clock,
  BookOpen,
  ChevronDown,
  PlayCircle,
  CheckCircle2,
} from "lucide-react";
import { useAppConfig } from "../../context/AppContext";

import Loading from "../../components/students/Loading";
import RatingStars from "../../components/common/RatingStars";
import {
  calculateRatings,
  calculateChapterTime,
  calculateCourseDuration,
  calculateNumOfLectures,
} from "../../utils/courseHelpers";
import Footer from "../../components/students/Footer";
import { useCourseData } from "../../hooks/useCourseData";
import { toast } from "react-toastify";
import axios from "axios";
import VideoPlayer from "../../components/common/VideoPlayer";
import { useAuth } from "../../context/AuthContext";
import { useEnrollments } from "../../context/EnrollmentContext";

const WHATS_INCLUDED = [
  "Lifetime access to all course materials",
  "Certificate of completion",
  "Downloadable resources and assignments",
  "Access to instructor Q&A and community",
  "Regular course updates and new content",
];

function CourseDetails() {
  const { id } = useParams();
  const { courseData } = useCourseData(id);

  const { backendUrl, currency } = useAppConfig();
  const { enrolledCourses, refetchEnrollments } = useEnrollments();
  const { getToken, userData } = useAuth();
  const navigate = useNavigate();

  const [openSections, setOpenSections] = useState(new Set());
  const [isAlreadyEnrolled, setIsAlreadyEnrolled] = useState(false);
  const [playerData, setPlayerData] = useState(null);
  const [showFullDesc, setShowFullDesc] = useState(false);

  // helper to strip HTML for safe excerpting
  const stripHtml = (html) => {
    if (!html) return "";
    try {
      const doc = new DOMParser().parseFromString(html, "text/html");
      return doc.body.textContent || "";
    } catch {
      // fallback server-side or parsing failure
      return html.replace(/<[^>]+>/g, "");
    }
  };

  const toggleSection = (index) => {
    setOpenSections((prev) => {
      const newSet = new Set(prev);
      newSet.has(index) ? newSet.delete(index) : newSet.add(index);
      return newSet;
    });
  };

  const enrollCourse = async () => {
    try {
      if (!userData) {
        return toast.warn("Login to Enroll");
      }
      if (isAlreadyEnrolled) {
        return toast.warn("Already Enrolled");
      }
      const token = await getToken();

      const { data } = await axios.post(
        `${backendUrl}/api/user/purchase`,
        { courseId: courseData._id },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (data.status === "success" || data.success) {
        toast.success(data.message || "Enrolled successfully");
        setIsAlreadyEnrolled(true);
        await refetchEnrollments();
        navigate("/my-enrollments");
      } else {
        toast.error(data.message || "Unable to enroll for this course");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message);
    }
  };

  const handleClose = useCallback(() => setPlayerData(null), []);

  useEffect(() => {
    setIsAlreadyEnrolled(
      Boolean(enrolledCourses?.some((c) => String(c._id) === String(id))),
    );
  }, [enrolledCourses, id]);

  return courseData ? (
    <>
      {/* lg:h-screen + lg:overflow-hidden keeps the whole page pinned to the
          viewport on desktop; the syllabus list gets its own internal
          scroll area below so nothing pushes the page taller than 100vh.
          Below lg, the layout falls back to natural scrolling since a full
          curriculum + sidebar can't realistically fit a phone screen. */}
      <div className="relative flex  flex-col bg-gradient-to-b from-indigo-50/70 via-blue-50/30 to-white lg:h-screen lg:overflow-hidden">
        <div className="min-h-0 flex-1 px-4 pt-20 pb-6 md:px-12 lg:px-20 lg:pt-24 lg:pb-8 xl:px-28">
          <div className="grid h-full grid-cols-1 gap-8 lg:h-full lg:grid-cols-[1fr_380px]">
            {/* LEFT COLUMN */}
            <div className="flex min-h-0 flex-col text-gray-600">
              <h1 className="mb-2 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
                {courseData.courseTitle}
              </h1>

              {/* Description — single instance, capped height so "Show more"
                  scrolls inside its own box instead of growing the page */}
              <div className="mb-3">
                <div
                  className={`rich-text break-words text-sm text-gray-600 transition-all duration-300 md:text-[15px] ${
                    showFullDesc
                      ? "max-h-32 overflow-y-auto pr-1"
                      : "max-h-none overflow-hidden"
                  }`}
                >
                  {showFullDesc ? (
                    <p
                      dangerouslySetInnerHTML={{
                        __html: courseData.courseDescription,
                      }}
                    />
                  ) : (
                    <p>
                      {(() => {
                        const txt = stripHtml(courseData.courseDescription);
                        return txt.length > 180
                          ? txt.slice(0, 180) + "..."
                          : txt;
                      })()}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setShowFullDesc((s) => !s)}
                  className="mt-1 text-sm font-semibold text-blue-600 transition-colors hover:text-blue-700"
                >
                  {showFullDesc ? "Show less" : "Show more"}
                </button>
              </div>

              {/* Rating + students + educator */}
              <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-slate-800">
                    {calculateRatings(courseData)}
                  </p>
                  <RatingStars
                    rating={calculateRatings(courseData)}
                    parentStyles={"flex"}
                    imgStyles={"w-3.5 h-3.5"}
                  />
                  <p className="text-blue-600">
                    ({courseData.courseRatings.length}{" "}
                    {courseData.courseRatings.length > 1 ? "ratings" : "rating"}
                    )
                  </p>
                </div>
                <p className="text-gray-500">
                  {courseData.enrolledStudents.length}{" "}
                  {courseData.enrolledStudents.length > 1
                    ? "students"
                    : "student"}
                </p>
                <p className="text-gray-500">
                  Course by{" "}
                  <span className="font-medium text-blue-600">
                    {courseData.educator?.name ||
                      courseData.educator?.email ||
                      "BharatTech"}
                  </span>
                </p>
              </div>

              {/* Course structure — scrolls internally, page stays fixed */}
              <h2 className="mb-2 text-lg font-bold tracking-tight text-slate-900">
                Course Structure
              </h2>
              <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                <div className="flex flex-col gap-2 pb-2">
                  {courseData.courseContent.map((chapter, index) => {
                    const isOpen = openSections.has(index);
                    return (
                      <div
                        key={index}
                        className="overflow-hidden rounded-xl border border-slate-200 bg-white transition-colors duration-200 hover:border-slate-300"
                      >
                        <div
                          className="flex cursor-pointer select-none items-center justify-between px-4 py-3"
                          onClick={() => toggleSection(index)}
                        >
                          <div className="flex items-center gap-2">
                            <ChevronDown
                              className={`h-4 w-4 text-slate-400 transition-transform duration-300 ${
                                isOpen ? "rotate-180" : ""
                              }`}
                            />
                            <p className="text-sm font-semibold text-slate-800 md:text-[15px]">
                              {chapter.chapterTitle}
                            </p>
                          </div>
                          <p className="text-xs text-slate-500 md:text-sm">
                            {chapter.chapterContent?.length} lectures ·{" "}
                            {calculateChapterTime(chapter)}
                          </p>
                        </div>
                        <div
                          className={`overflow-hidden transition-all duration-300 ${
                            isOpen ? "max-h-96" : "max-h-0"
                          }`}
                        >
                          <ul className="border-t border-slate-100 px-4 py-2 text-gray-600">
                            {chapter.chapterContent.map((lecture, i) => (
                              <li
                                key={i}
                                className="flex items-start gap-2 py-1.5"
                              >
                                <PlayCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                                <div className="flex w-full items-center justify-between text-xs text-slate-700 md:text-sm">
                                  <p>{lecture.lectureTitle}</p>
                                  <div className="flex items-center gap-2">
                                    {lecture.isPreviewFree && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setPlayerData({
                                            ...lecture,
                                            chapter: index + 1,
                                            lecture: i + 1,
                                          })
                                        }
                                        className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-600 transition-colors hover:bg-blue-100"
                                      >
                                        Preview
                                      </button>
                                    )}
                                    <p className="text-slate-400">
                                      {humanizeDuration(
                                        lecture.lectureDuration * 60 * 1000,
                                        ["h", "m"],
                                      )}
                                    </p>
                                  </div>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN — purchase card, same theme as Resource/Course cards */}
            <div className="lg:h-full lg:overflow-y-auto lg:pb-2">
              <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                <div className="h-[5px] bg-gradient-to-r from-sky-400 to-blue-600" />

                {/* Thumbnail — shorter, cropped instead of full natural height */}
                <img
                  className="h-36 w-full object-contain sm:h-44"
                  src={courseData.courseThumbnail}
                  alt="Course illustration"
                />

                <div className="p-5">
                  <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-600">
                    <Clock className="h-3.5 w-3.5" />5 days left at this price!
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-2xl font-bold text-slate-900 md:text-3xl">
                      {currency}
                      {(
                        courseData.coursePrice -
                        (courseData.discount * courseData.coursePrice) / 100
                      ).toFixed(2)}
                    </p>
                    <p className="text-sm text-slate-400 line-through md:text-base">
                      {currency}
                      {courseData.coursePrice}
                    </p>
                    <p className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-600">
                      {courseData.discount}% off
                    </p>
                  </div>

                  <div className="mt-3 flex items-center gap-3 text-xs text-slate-500 md:text-sm">
                    <div className="flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      <p>{calculateRatings(courseData)}</p>
                    </div>
                    <div className="h-3.5 w-px bg-slate-200" />
                    <div className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      <p>{calculateCourseDuration(courseData)}</p>
                    </div>
                    <div className="h-3.5 w-px bg-slate-200" />
                    <div className="flex items-center gap-1">
                      <BookOpen className="h-3.5 w-3.5" />
                      <p>{calculateNumOfLectures(courseData)} lessons</p>
                    </div>
                  </div>

                  <button
                    onClick={enrollCourse}
                    className={`mt-4 w-full rounded-xl py-3 text-sm font-semibold text-white shadow-md transition-all duration-200 md:mt-5 ${
                      isAlreadyEnrolled
                        ? "bg-gradient-to-br from-green-600 to-green-700 shadow-green-600/25 hover:from-green-700 hover:to-green-800"
                        : "bg-gradient-to-br from-blue-600 to-blue-700 shadow-blue-600/25 hover:from-blue-700 hover:to-blue-800 hover:shadow-lg hover:shadow-blue-600/30"
                    }`}
                  >
                    {isAlreadyEnrolled ? "Already Enrolled" : "Enroll Now"}
                  </button>

                  <div className="mt-4 border-t border-slate-100 pt-4 md:mt-5 md:pt-5">
                    <p className="mb-2 text-sm font-semibold text-slate-800">
                      What's in the course?
                    </p>
                    <ul className="grid grid-cols-1 gap-1.5 text-xs text-slate-500 sm:grid-cols-2 md:text-[13px]">
                      {WHATS_INCLUDED.map((item) => (
                        <li key={item} className="flex items-start gap-1.5">
                          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-600" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {playerData && (
        <VideoPlayer
          lecture={playerData}
          onClose={handleClose}
          showMarkComplete={false} // For free-preview ? no need!
          isCompleted={false}
        />
      )}
      {/* Footer only shows on the natural-scroll (mobile) layout */}
      <Footer />
    </>
  ) : (
    <Loading />
  );
}

export default CourseDetails;
