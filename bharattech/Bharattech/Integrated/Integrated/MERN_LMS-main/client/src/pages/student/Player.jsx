import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ChevronDown, CheckCircle2 } from "lucide-react";

import { useCourseData } from "../../hooks/useCourseData";
import { useCourseProgress } from "../../hooks/useCourseProgress";
import { lessonNumberStarts, lessonsLabel, minutesLabel, nextLectureAfter, upNextLecture } from "../../utils/courseHelpers";
import { metaList, primaryButton } from "../../components/students/ui";
import { useAuth } from "../../context/AuthContext";
import { useAppConfig } from "../../context/AppContext";

import Loading from "../../components/students/Loading";
import Footer from "../../components/students/Footer";
import Rating from "../../components/students/Rating";
import VideoPlayer from "../../components/common/VideoPlayer";
import ProgressBar from "../../components/students/ProgressBar";

function Player() {
  const { id } = useParams();
  const { getToken } = useAuth();
  const { backendUrl } = useAppConfig();

  // Course data
  const { courseData, handleRate, initRating } = useCourseData(id, "enrolled");

  // Course progress
  const { courseProgress, fetchProgress, markLectureCompleted } =
    useCourseProgress(id, backendUrl, getToken);

  // UI state
  const [playerData, setPlayerData] = useState(null);
  const [openSections, setOpenSections] = useState(new Set([0]));

  // Fetch progress on mount
  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  const toggleSection = (index) => {
    setOpenSections((prev) => {
      const newSet = new Set(prev);
      newSet.has(index) ? newSet.delete(index) : newSet.add(index);
      return newSet;
    });
  };

  const handlePlayLecture = (lecture, chapterIndex, lectureIndex) => {
    // "Next lesson" can move into a closed chapter: open it, so the list shows where you are
    setOpenSections((prev) => (prev.has(chapterIndex) ? prev : new Set(prev).add(chapterIndex)));
    setPlayerData({
      ...lecture,
      chapter: chapterIndex + 1,
      lecture: lectureIndex + 1,
    });
  };
  const handleClose = useCallback(() => setPlayerData(null), []);

  if (!courseData) {
    return <Loading />;
  }

  const completed = courseProgress?.lectureCompleted || [];
  const lectures = courseData.courseContent.flatMap((chapter) => chapter.chapterContent || []);
  const done = lectures.filter((lecture) => completed.includes(lecture.lectureId)).length;
  const percent = lectures.length ? Math.round((done / lectures.length) * 100) : 0;
  // the lesson the video window offers once this one is marked watched (owner's refinement A)
  const next = playerData ? nextLectureAfter(courseData, playerData.lectureId) : null;
  // the side card's "Up next" (owner's 4A, 2026-10-27): the first lesson you haven't watched yet
  const upNext = upNextLecture(courseData, completed);
  const numberStarts = lessonNumberStarts(courseData.courseContent);

  return (
    <>
      <main className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-10 px-6 pb-20 pt-10 text-left lg:grid-cols-[1fr_340px]">
        {/* on phones its parts sit in the page's own column, so the Up next card can come right after the title
            (owner's L3A, 2026-10-27); from 1024 px it is the left column as before */}
        <div className="contents lg:block lg:min-w-0">
          <div className="order-1 lg:order-none">
            <Link to="/my-enrollments" className="tap inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors duration-150 ease-snappy mhover:text-ink">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              My courses
            </Link>
            <h1 className="mt-3 font-display text-[40px] font-bold leading-[1.08] tracking-[-0.02em] text-ink">
              {courseData.courseTitle}
            </h1>
            <div className="mt-5 flex items-center gap-4">
              <ProgressBar percent={percent} label="Course progress" className="max-w-md flex-1" />
              <p className="shrink-0 text-sm tabular-nums text-muted">
                {lectures.length && done === lectures.length ? "Completed" : `${done} of ${lessonsLabel(lectures.length)} watched`}
              </p>
            </div>
          </div>

          <ul className="order-3 mt-10 overflow-hidden rounded-2xl border border-line bg-card max-lg:mt-0 lg:order-none">
            {courseData.courseContent.map((chapter, chapterIndex) => {
              const isOpen = openSections.has(chapterIndex);
              return (
                <li key={chapterIndex} className="border-b border-line last:border-b-0">
                  <button
                    type="button"
                    onClick={() => toggleSection(chapterIndex)}
                    aria-expanded={isOpen}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors duration-150 ease-snappy mhover:bg-ink/[0.02]"
                  >
                    <span className="flex items-center gap-3">
                      <ChevronDown className={`h-4 w-4 shrink-0 text-muted transition-transform duration-200 ease-snappy ${isOpen ? "rotate-180" : ""}`} aria-hidden="true" />
                      <span className="font-semibold text-ink">{chapter.chapterTitle}</span>
                    </span>
                    <span className="shrink-0 text-[13px] tabular-nums text-muted">{lessonsLabel(chapter.chapterContent?.length || 0)}</span>
                  </button>
                  {isOpen && (
                    <ul className="pb-3 motion-safe:animate-chapter-in">
                      {chapter.chapterContent.map((lecture, lectureIndex) => {
                        const watched = completed.includes(lecture.lectureId);
                        // the number (a tick once watched) sits under the chapter's arrow, so titles line up
                        const row = (
                          <>
                            {watched ? (
                              <CheckCircle2 className="h-4 w-4 shrink-0 text-tangerine" aria-hidden="true" />
                            ) : (
                              <span className="w-4 shrink-0 text-right text-[13px] tabular-nums text-muted">{numberStarts[chapterIndex] + lectureIndex}</span>
                            )}
                            <span className="min-w-0 flex-1 truncate">{lecture.lectureTitle}</span>
                            {watched && <span className="sr-only">(watched)</span>}
                            <span className="w-14 shrink-0 text-right text-[13px] tabular-nums text-muted">{minutesLabel(lecture.lectureDuration)}</span>
                          </>
                        );
                        return (
                          <li key={lectureIndex}>
                            {lecture.lectureUrl ? (
                              <button
                                type="button"
                                onClick={() => handlePlayLecture(lecture, chapterIndex, lectureIndex)}
                                className="flex w-full items-center gap-3 px-5 py-2.5 text-left text-[15px] text-ink-soft transition-colors duration-150 ease-snappy mhover:bg-act-wash mhover:text-ink"
                              >
                                {row}
                              </button>
                            ) : (
                              <div className="flex items-center gap-3 px-5 py-2.5 text-[15px] text-muted">{row}</div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        <aside className="order-2 lg:sticky lg:top-24 lg:order-none lg:self-start">
          <div className="overflow-hidden rounded-2xl border border-line bg-card">
            <div className="aspect-video overflow-hidden rounded-t-2xl bg-ink/5">
              <img src={courseData.courseThumbnail} alt="" className="h-full w-full object-cover" />
            </div>
            <div className="p-5">
              {upNext ? (
                <>
                  <h2 className="text-sm font-semibold text-ink">Up next</h2>
                  <p className="mt-2 text-[17px] font-semibold leading-[1.3] text-ink">{upNext.lecture.lectureTitle}</p>
                  <ul className={`mt-1.5 text-[13px] tabular-nums text-muted ${metaList}`}>
                    <li>Lesson {numberStarts[upNext.chapterIndex] + upNext.lectureIndex}</li>
                    {minutesLabel(upNext.lecture.lectureDuration) && <li>{minutesLabel(upNext.lecture.lectureDuration)}</li>}
                  </ul>
                  <button
                    type="button"
                    onClick={() => handlePlayLecture(upNext.lecture, upNext.chapterIndex, upNext.lectureIndex)}
                    className={`mt-4 w-full py-3 text-[15px] ${primaryButton}`}
                  >
                    {done ? "Play next lesson" : "Start the course"}
                  </button>
                </>
              ) : (
                <>
                  <h2 className="text-sm font-semibold text-ink">You've watched every lesson</h2>
                  <p className="mt-2 text-[15px] text-ink-soft">Pick any lesson from the list to watch it again.</p>
                </>
              )}
              <p className="mt-3 text-[13px] text-muted">Mark each lesson as watched when you finish it, and your progress is saved.</p>
              <div className="mt-5 border-t border-line pt-5">
                <h2 className="text-sm font-semibold text-ink">Rate this course</h2>
                <div className="mt-2">
                  <Rating initialRating={initRating} onRate={handleRate} />
                </div>
              </div>
            </div>
          </div>
        </aside>
      </main>

      {/* Video Player Modal */}
      {playerData && (
        <VideoPlayer
          lecture={playerData}
          course={courseData}
          onClose={handleClose}
          showMarkComplete={true}
          onMarkComplete={(lectureId) => markLectureCompleted(lectureId, { announce: false })}
          isCompleted={courseProgress?.lectureCompleted?.includes(
            playerData.lectureId
          )}
          onNext={next ? () => handlePlayLecture(next.lecture, next.chapterIndex, next.lectureIndex) : undefined}
        />
      )}
      <Footer />
    </>
  );
}

export default Player;
