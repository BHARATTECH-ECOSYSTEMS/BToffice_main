import YouTube from "react-youtube";
import { extractYouTubeId } from "../../utils/VideoHelpers";
import React, { useCallback, useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { assets } from "../../assets/assets";
import { minutesLabel } from "../../utils/courseHelpers";
import { lessonPlace } from "../../utils/videoWindow";
import { metaList, primaryButton, quietButton } from "../students/ui";

// matches the window-out / fade-out animations in tailwind.config.js
const CLOSE_MS = 150;

// in place of the video when there is nothing to play, or YouTube or the browser can't play it (owner's 4A)
const Notice = ({ title, children }) => (
  <div role="status" className="flex aspect-video w-full flex-col items-center justify-center gap-2 bg-ink px-6 text-center">
    <p className="font-display text-lg font-semibold text-white">{title}</p>
    {children}
  </div>
);

// keyed by the lesson, so one video failing doesn't carry over to the next lesson
const Stage = ({ lecture }) => {
  const [failed, setFailed] = useState(false);

  if (!lecture.lectureUrl) {
    return <Notice title="No video for this lesson yet" />;
  }

  // Default to youtube if videoSource is missing (backward compatibility)
  const videoSource = lecture.videoSource || "youtube";
  const videoId = videoSource === "youtube" ? extractYouTubeId(lecture.lectureUrl) : null;

  // YouTube's embedded player gives the same error (150) for a video that doesn't exist and for one whose owner
  // allows it only on YouTube itself (checked 2026-10-27), so the message covers both and offers YouTube
  if (failed) {
    return (
      <Notice title="This video can't be played here">
        <p className="max-w-sm text-sm text-white/70">
          {videoId ? "It may have been removed, or it may play only on YouTube." : "It may have been moved or removed."}
        </p>
        {videoId && (
          <a
            href={`https://www.youtube.com/watch?v=${videoId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 rounded-full bg-white px-5 py-2 text-sm font-semibold text-ink mhover:bg-paper"
          >
            Try it on YouTube
          </a>
        )}
        <p className="mt-1 max-w-sm text-xs text-white/50">
          {videoId ? "If it doesn't play there either, let the course's teacher know." : "Let the course's teacher know."}
        </p>
      </Notice>
    );
  }

  if (videoSource === "youtube") {
    return (
      <YouTube
        videoId={videoId}
        opts={{
          playerVars: {
            autoplay: 1,
            rel: 0,
            modestbranding: 1,
          },
        }}
        onError={() => setFailed(true)}
        iframeClassName="block h-auto w-full aspect-video"
      />
    );
  }

  // Cloudinary or direct video URL
  if (videoSource === "cloudinary" || videoSource === "direct") {
    return (
      <video
        className="block h-auto w-full aspect-video bg-black"
        controls
        preload="metadata"
        controlsList="nodownload"
        src={lecture.lectureUrl}
        onError={() => setFailed(true)}
      >
        <source src={lecture.lectureUrl} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
    );
  }

  return <Notice title="This kind of video can't be played here" />;
};

// A modal window (owner's 2A): it sits over the page in <body> while the app behind is made inert, so focus starts on
// Close, Tab and clicks can't reach the page, Escape closes, and focus goes back to the button that opened it. Not the
// browser's <dialog>: its top layer would cover the app's toasts ("Marked as watched", errors).
const VideoPlayer = ({
  lecture,
  course,
  onClose,
  showMarkComplete,
  onMarkComplete,
  isCompleted,
  onNext,
}) => {
  const titleId = useId();
  const [closing, setClosing] = useState(false);
  const place = lessonPlace(course?.courseContent, lecture.lectureId);
  const requestClose = useCallback(() => setClosing(true), []);
  // read while rendering: by the time effects run, autoFocus has already moved focus to Close
  const [opener] = useState(() => document.activeElement);

  useEffect(() => {
    const app = document.getElementById("root");
    app.inert = true;
    document.body.style.overflow = "hidden";

    return () => {
      app.inert = false;
      document.body.style.overflow = "unset";
      opener?.focus?.();
    };
  }, [opener]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") requestClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [requestClose]);

  // let the closing animation play, then close for real
  useEffect(() => {
    if (!closing) return undefined;
    const timer = setTimeout(onClose, CLOSE_MS);
    return () => clearTimeout(timer);
  }, [closing, onClose]);

  return createPortal(
    <div
      // rendered in <body>, outside the app's wrapper: it needs the wrapper's Learning font and text colour again
      className={`learn text-default text-ink fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4 backdrop-blur-sm ${
        closing ? "animate-fade-out" : "animate-card-fade"
      }`}
      onClick={(event) => {
        if (event.target === event.currentTarget) requestClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        // as wide as 64rem, but never so wide that the 16:9 video, the header (81 px) and the footer (65 px) are taller
        // than the screen: on a short laptop screen the window shrinks instead of touching the edges and scrolling
        className={`max-h-full w-full max-w-[min(64rem,calc((100dvh_-_2rem_-_146px)_*_16_/_9))] overflow-y-auto rounded-2xl bg-card shadow-2xl ${
          closing ? "motion-safe:animate-window-out motion-reduce:animate-fade-out" : "motion-safe:animate-window-in motion-reduce:animate-card-fade"
        }`}
      >
        {/* Header (owner's 1A): which course, which lesson of it, and the lesson's title */}
        <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-4">
          <div className="min-w-0">
            {(course?.courseTitle || place) && (
              <ul className={`text-xs font-medium leading-4 text-muted ${metaList}`}>
                {course?.courseTitle && <li className="truncate">{course.courseTitle}</li>}
                {place && <li className="shrink-0">Lesson {place.number} of {place.total}</li>}
              </ul>
            )}
            <h2 id={titleId} className="mt-1 truncate font-display text-xl font-semibold leading-7 tracking-[-0.01em] text-ink">
              {lecture.lectureTitle}
            </h2>
          </div>
          <button
            type="button"
            onClick={requestClose}
            aria-label="Close the video"
            autoFocus
            // -mr-2: the cross itself lines up with the 20 px edge the text keeps on the left
            className="-mr-2 flex-shrink-0 rounded-full p-2 transition-colors duration-150 ease-snappy mhover:bg-ink/5"
          >
            <img
              src={assets.cross_icon}
              alt=""
              className="h-4 w-4"
            />
          </button>
        </div>

        <div className="relative bg-black">
          <Stage key={lecture.lectureId} lecture={lecture} />
        </div>

        {/* Footer: the same 20 px edges as the header, and one height with or without its buttons */}
        <div className="border-t border-line px-5 py-3">
          <div className="flex min-h-10 items-center justify-between gap-4">
            <p className="text-sm text-muted">
              {minutesLabel(lecture.lectureDuration)}
            </p>
            {showMarkComplete && !isCompleted && (
              <button
                type="button"
                onClick={() => onMarkComplete(lecture.lectureId)}
                className={`px-5 py-2 text-sm ${primaryButton}`}
              >
                Mark as watched
              </button>
            )}
            {isCompleted && (
              <div className="flex items-center gap-2 text-tangerine-text">
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="font-medium">Watched</span>
                {/* once watched, carry on in the same window (owner's refinement A); the last lesson just closes */}
                {showMarkComplete && (
                  <button
                    type="button"
                    onClick={onNext || requestClose}
                    className={`ml-3 px-5 py-2 text-sm ${onNext ? primaryButton : quietButton}`}
                  >
                    {onNext ? "Next lesson" : "Done"}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default React.memo(VideoPlayer);
