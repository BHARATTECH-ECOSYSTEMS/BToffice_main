import YouTube from "react-youtube";
import { extractYouTubeId } from "../../utils/VideoHelpers";
import React, { useEffect } from "react";
import { assets } from "../../assets/assets";
import { minutesLabel } from "../../utils/courseHelpers";
import { primaryButton, quietButton } from "../students/ui";

const VideoPlayer = ({
  lecture,
  onClose,
  showMarkComplete,
  onMarkComplete,
  isCompleted,
  onNext,
}) => {
  const renderPlayer = () => {
    if (!lecture || !lecture.lectureUrl) {
      return (
        <div className="w-full aspect-video bg-gray-100 flex items-center justify-center">
          <p className="text-gray-500">No video available</p>
        </div>
      );
    }

    // Default to youtube if videoSource is missing (backward compatibility)
    const videoSource = lecture.videoSource || "youtube";

    // YouTube video
    if (videoSource === "youtube") {
      const videoId = extractYouTubeId(lecture.lectureUrl);
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
          iframeClassName="w-full aspect-video rounded-lg"
        />
      );
    }

    // Cloudinary or direct video URL
    if (videoSource === "cloudinary" || videoSource === "direct") {
      return (
        <video
          className="w-full aspect-video rounded-lg bg-black"
          controls
          preload="metadata"
          controlsList="nodownload"
          src={lecture.lectureUrl}
        >
          <source src={lecture.lectureUrl} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      );
    }

    // Fallback
    return (
      <div className="w-full aspect-video bg-gray-100 flex items-center justify-center">
        <p className="text-gray-500">Unsupported video format</p>
      </div>
    );
  };

  // Close on ESC key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [onClose]);

  // Close on background click
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn"
      onClick={handleBackdropClick}
    >
      <div className="relative w-full max-w-5xl overflow-hidden rounded-2xl bg-card shadow-2xl animate-slideUp">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line p-4">
          <h3 className="truncate pr-4 text-lg font-semibold text-ink">
            {lecture.lectureTitle}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close the video"
            className="flex-shrink-0 rounded-full p-2 transition-colors duration-150 ease-snappy mhover:bg-ink/5"
          >
            <img
              src={assets.cross_icon}
              alt=""
              className="h-4 w-4"
            />
          </button>
        </div>

        <div className="relative bg-black">{renderPlayer()}</div>

        {/* Footer */}
        <div className="border-t border-line p-4">
          <div className="flex items-center justify-between">
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
                    onClick={onNext || onClose}
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
    </div>
  );
};

export default React.memo(VideoPlayer);
