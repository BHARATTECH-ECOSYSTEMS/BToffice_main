import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ChevronDown, CheckCircle2, PlayCircle } from "lucide-react";

import { useCourseData } from "../../hooks/useCourseData";
import { useCourseProgress } from "../../hooks/useCourseProgress";
import { lessonsLabel, minutesLabel, nextLectureAfter } from "../../utils/courseHelpers";
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

  return (
    <>
      <main className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-10 px-6 pb-20 pt-10 text-left lg:grid-cols-[1fr_340px]">
        <div className="min-w-0">
          <Link to="/my-enrollments" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors duration-150 ease-snappy mhover:text-ink">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            My courses
          </Link>
          <h1 className="mt-3 font-display text-[40px] font-bold leading-[1.08] tracking-[-0.02em] text-ink">
            {courseData.courseTitle}
          </h1>
          <div className="mt-4 flex items-center gap-3">
            <ProgressBar percent={percent} label="Course progress" className="max-w-sm" />
            <p className="shrink-0 text-sm tabular-nums text-muted">
              {lectures.length && done === lectures.length ? "Completed" : `${done} of ${lessonsLabel(lectures.length)} watched`}
            </p>
          </div>

          <ul className="mt-8 overflow-hidden rounded-2xl border border-line bg-card">
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
                    <span className="shrink-0 text-[13px] text-muted">{lessonsLabel(chapter.chapterContent?.length || 0)}</span>
                  </button>
                  {isOpen && (
                    <ul className="pb-3 motion-safe:animate-chapter-in">
                      {chapter.chapterContent.map((lecture, lectureIndex) => {
                        const watched = completed.includes(lecture.lectureId);
                        const Icon = watched ? CheckCircle2 : PlayCircle;
                        const row = (
                          <>
                            <Icon className={`h-4 w-4 shrink-0 ${watched ? "text-tangerine" : "text-muted"}`} aria-hidden="true" />
                            <span className="min-w-0 flex-1 truncate">{lecture.lectureTitle}</span>
                            {watched && <span className="sr-only">(watched)</span>}
                            <span className="shrink-0 text-[13px] text-muted">{minutesLabel(lecture.lectureDuration)}</span>
                          </>
                        );
                        return (
                          <li key={lectureIndex}>
                            {lecture.lectureUrl ? (
                              <button
                                type="button"
                                onClick={() => handlePlayLecture(lecture, chapterIndex, lectureIndex)}
                                className="flex w-full items-center gap-3 px-5 py-2 pl-12 text-left text-[15px] text-ink-soft transition-colors duration-150 ease-snappy mhover:bg-act-wash mhover:text-ink"
                              >
                                {row}
                              </button>
                            ) : (
                              <div className="flex items-center gap-3 px-5 py-2 pl-12 text-[15px] text-muted">{row}</div>
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

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="overflow-hidden rounded-2xl border border-line bg-card">
            <div className="aspect-video bg-ink/5">
              <img src={courseData.courseThumbnail} alt="" className="h-full w-full object-cover" />
            </div>
            <div className="p-5">
              <p className="text-[15px] text-ink-soft">Pick a lesson from the list to watch it. Mark it as watched when you're done, and your progress is saved.</p>
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
          onClose={handleClose}
          showMarkComplete={true}
          onMarkComplete={markLectureCompleted}
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
