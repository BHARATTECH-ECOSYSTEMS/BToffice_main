import { useCallback, useLayoutEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ChevronDown, Check, Star } from "lucide-react";
import { metaList, primaryButton } from "../../components/students/ui";
import { useAppConfig } from "../../context/AppContext";
import { safeDescription } from "../../utils/safeDescription";

import Loading from "../../components/students/Loading";
import {
  enrolledCountOf,
  calculateNumOfLectures,
  excerptOf,
  lessonNumberStarts,
  lessonsLabel,
  minutesLabel,
  ratingSummary,
} from "../../utils/courseHelpers";
import Footer from "../../components/students/Footer";
import { useCourseData } from "../../hooks/useCourseData";
import { toast } from "react-toastify";
import axios from "axios";
import VideoPlayer from "../../components/common/VideoPlayer";
import { useAuth } from "../../context/AuthContext";
import { useEnrollments } from "../../context/EnrollmentContext";

// only what the LMS really gives (owner's 2A 3A): no certificate, downloads or Q&A exist
const WHATS_INCLUDED = [
  "Free, with no time limit",
  "Watch on any device",
  "Your progress is saved lecture by lecture",
  "Rate the course once you've enrolled",
];
const EXCERPT = 280;

const minutesOf = (lectures) => lectures.reduce((sum, lecture) => sum + (Number(lecture.lectureDuration) || 0), 0);

function CourseDetails() {
  const { id } = useParams();
  const { courseData } = useCourseData(id);

  const { backendUrl } = useAppConfig();
  const { enrolledCourses, refetchEnrollments } = useEnrollments();
  const { getToken, userData } = useAuth();
  const navigate = useNavigate();

  const [openSections, setOpenSections] = useState(new Set([0]));
  const [enrolling, setEnrolling] = useState(false);
  const [playerData, setPlayerData] = useState(null);
  const [showFullDesc, setShowFullDesc] = useState(false);

  // a course opens at its top; before the new page is drawn, so a card's cover morph lands in the right place
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [id]);

  const isAlreadyEnrolled = Boolean(enrolledCourses?.some((c) => String(c._id) === String(id)));

  const toggleSection = (index) => {
    setOpenSections((prev) => {
      const newSet = new Set(prev);
      newSet.has(index) ? newSet.delete(index) : newSet.add(index);
      return newSet;
    });
  };

  const enrollCourse = async () => {
    if (!userData) return toast.warn("Sign in to enroll");
    setEnrolling(true);
    try {
      const token = await getToken();
      const { data } = await axios.post(
        `${backendUrl}/api/user/purchase`,
        { courseId: courseData._id },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (data.status === "success" || data.success) {
        toast.success("Enrolled. Your first lesson is ready.");
        await refetchEnrollments();
        navigate(`/player/${courseData._id}`);
      } else {
        toast.error(data.message || "Couldn't enroll in this course. Try again.");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Couldn't enroll in this course. Check your connection and try again.");
    } finally {
      setEnrolling(false);
    }
  };

  const handleClose = useCallback(() => setPlayerData(null), []);

  if (!courseData) return <Loading />;

  const rating = ratingSummary(courseData);
  const learners = enrolledCountOf(courseData);
  const lectures = calculateNumOfLectures(courseData);
  const length = minutesLabel(minutesOf(courseData.courseContent.flatMap((chapter) => chapter.chapterContent || [])));
  const excerpt = excerptOf(courseData.courseDescription, EXCERPT);
  const longDescription = excerptOf(courseData.courseDescription, Infinity).length > EXCERPT;
  const numberStarts = lessonNumberStarts(courseData.courseContent);

  return (
    <>
      <main className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-10 px-6 pb-20 pt-10 text-left lg:grid-cols-[1fr_340px]">
        <div className="min-w-0">
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors duration-150 ease-snappy mhover:text-ink">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            All courses
          </Link>
          <h1 className="mt-3 font-display text-[40px] font-bold leading-[1.08] tracking-[-0.02em] text-ink">
            {courseData.courseTitle}
          </h1>
          <ul className={`mt-4 text-[15px] tabular-nums text-muted ${metaList}`}>
            <li>
              By <span className="font-medium text-ink">{courseData.educator?.name || "Bharattech"}</span>
            </li>
            <li>{lessonsLabel(lectures)}</li>
            {length && <li>{length}</li>}
            <li>
              {learners} {learners === 1 ? "learner" : "learners"}
            </li>
            {rating && (
              <li className="inline-flex items-center gap-1">
                <Star className="h-4 w-4 fill-tangerine text-tangerine" aria-hidden="true" />
                {rating.average} from {rating.count} {rating.count === 1 ? "rating" : "ratings"}
              </li>
            )}
          </ul>

          <section aria-labelledby="about" className="mt-8 max-w-[66ch]">
            <h2 id="about" className="sr-only">
              About this course
            </h2>
            {showFullDesc ? (
              <div className="rich-text" dangerouslySetInnerHTML={{ __html: safeDescription(courseData.courseDescription) }} />
            ) : (
              <p className="text-[16px] leading-relaxed text-ink-soft">{excerpt}</p>
            )}
            {longDescription && (
              <button
                type="button"
                onClick={() => setShowFullDesc((s) => !s)}
                className="mt-2 text-sm font-semibold text-act-deep underline-offset-2 mhover:underline"
                aria-expanded={showFullDesc}
              >
                {showFullDesc ? "Show less" : "Read the full description"}
              </button>
            )}
          </section>

          <section aria-labelledby="content" className="mt-12">
            <h2 id="content" className="font-display text-[22px] font-semibold tracking-[-0.01em] text-ink">
              What you'll watch
            </h2>
            <ul className="mt-5 overflow-hidden rounded-2xl border border-line bg-card">
              {courseData.courseContent.map((chapter, index) => {
                const isOpen = openSections.has(index);
                const chapterLectures = chapter.chapterContent || [];
                return (
                  <li key={index} className="border-b border-line last:border-b-0">
                    <button
                      type="button"
                      onClick={() => toggleSection(index)}
                      aria-expanded={isOpen}
                      className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors duration-150 ease-snappy mhover:bg-ink/[0.02]"
                    >
                      <span className="flex items-center gap-3">
                        <ChevronDown className={`h-4 w-4 shrink-0 text-muted transition-transform duration-200 ease-snappy ${isOpen ? "rotate-180" : ""}`} aria-hidden="true" />
                        <span className="font-semibold text-ink">{chapter.chapterTitle}</span>
                      </span>
                      <span className="shrink-0 text-[13px] tabular-nums text-muted">
                        {lessonsLabel(chapterLectures.length)}
                        {minutesOf(chapterLectures) ? ` · ${minutesLabel(minutesOf(chapterLectures))}` : ""}
                      </span>
                    </button>
                    {isOpen && (
                      <ul className="pb-3 motion-safe:animate-chapter-in">
                        {chapterLectures.map((lecture, i) => (
                          // the number sits under the chapter's arrow, so lesson titles line up with the chapter title
                          <li key={i} className="flex items-center gap-3 px-5 py-2.5 text-[15px] text-ink-soft">
                            <span className="w-4 shrink-0 text-right text-[13px] tabular-nums text-muted">{numberStarts[index] + i}</span>
                            <span className="min-w-0 flex-1">{lecture.lectureTitle}</span>
                            {lecture.isPreviewFree && (
                              <button
                                type="button"
                                onClick={() => setPlayerData({ ...lecture, chapter: index + 1, lecture: i + 1 })}
                                className="rounded-full bg-act-wash px-3 py-0.5 text-[13px] font-semibold text-act-deep transition-colors duration-150 ease-snappy mhover:bg-act/15"
                              >
                                Preview
                              </button>
                            )}
                            <span className="w-14 shrink-0 text-right text-[13px] tabular-nums text-muted">{minutesLabel(lecture.lectureDuration)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="overflow-hidden rounded-2xl border border-line bg-card">
            {/* a clicked course card's cover grows into this one (hooks/useCoverMorph.js) */}
            <div data-course-cover className="aspect-video overflow-hidden rounded-t-2xl bg-ink/5" style={{ viewTransitionName: "course-cover" }}>
              <img className="h-full w-full object-cover" src={courseData.courseThumbnail} alt="" />
            </div>
            <div className="p-5">
              {isAlreadyEnrolled ? (
                <Link
                  to={`/player/${courseData._id}`}
                  className={`block w-full py-3 text-center text-[15px] ${primaryButton}`}
                >
                  Continue learning
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={enrollCourse}
                  disabled={enrolling}
                  className={`w-full py-3 text-[15px] ${primaryButton}`}
                >
                  {enrolling ? "Enrolling…" : "Enroll"}
                </button>
              )}
              <p className="mt-3 text-center text-[13px] text-muted">
                {isAlreadyEnrolled ? "You're enrolled in this course." : "Free for everyone at Bharattech."}
              </p>

              <ul className="mt-5 flex flex-col gap-2 border-t border-line pt-5 text-sm text-ink-soft">
                {WHATS_INCLUDED.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-act" aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </aside>
      </main>

      {playerData && (
        <VideoPlayer
          lecture={playerData}
          onClose={handleClose}
          showMarkComplete={false} // For free-preview ? no need!
          isCompleted={false}
        />
      )}
      <Footer />
    </>
  );
}

export default CourseDetails;
