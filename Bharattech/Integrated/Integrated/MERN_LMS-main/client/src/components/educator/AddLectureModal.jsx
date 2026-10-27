import { useState } from "react";
import { toast } from "react-toastify";
import { assets } from "../../assets/assets";
import { isValidYouTubeUrl } from "../../utils/VideoHelpers";
import { primaryButton, quietButton } from "../students/ui";

// Lectures are YouTube videos only (owner's 4A, 2026-10-26): uploading needs the company's Cloudinary keys, which
// the LMS doesn't have, so the "Upload" choice is gone.
const EMPTY_LECTURE = { lectureTitle: "", lectureDuration: "", lectureUrl: "", isPreviewFree: false };

const AddLectureModal = ({ isOpen, onClose, onAddLecture }) => {
  const [lectureDetails, setLectureDetails] = useState(EMPTY_LECTURE);

  const handleAddLecture = () => {
    if (!lectureDetails.lectureTitle || !lectureDetails.lectureDuration) {
      toast.error("Add the lesson's title and length.");
      return;
    }
    if (!lectureDetails.lectureUrl) {
      toast.error("Add the lesson's YouTube link.");
      return;
    }
    if (!isValidYouTubeUrl(lectureDetails.lectureUrl)) {
      toast.error("That isn't a YouTube video link.");
      return;
    }
    onAddLecture({ ...lectureDetails, videoSource: "youtube" });
    resetModal();
  };

  const resetModal = () => {
    setLectureDetails(EMPTY_LECTURE);
    onClose();
  };


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div role="dialog" aria-modal="true" aria-labelledby="lesson-title-heading" className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-card text-ink shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-card px-6 py-4">
          <h2 id="lesson-title-heading" className="font-display text-xl font-semibold text-ink">Add a lesson</h2>
          <button
            type="button"
            onClick={resetModal}
            aria-label="Close"
            className="tap rounded-full p-2 transition-colors duration-150 ease-snappy mhover:bg-ink/5"
          >
            <img src={assets.cross_icon} alt="" className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Lecture Title */}
          <div>
            <label htmlFor="lesson-title" className="mb-2 block text-sm font-medium text-ink">
              Title
            </label>
            <input
              id="lesson-title"
              type="text"
              className="h-11 w-full rounded-xl border border-line-strong bg-card px-4 text-[15px] text-ink outline-none transition-colors duration-150 ease-snappy placeholder:text-muted focus:border-act"
              placeholder="e.g. Introduction to React Hooks"
              value={lectureDetails.lectureTitle}
              onChange={(e) =>
                setLectureDetails({
                  ...lectureDetails,
                  lectureTitle: e.target.value,
                })
              }
            />
          </div>

          {/* Duration */}
          <div>
            <label htmlFor="lesson-length" className="mb-2 block text-sm font-medium text-ink">
              Length in minutes
            </label>
            <input
              id="lesson-length"
              type="number"
              min="1"
              className="h-11 w-full rounded-xl border border-line-strong bg-card px-4 text-[15px] text-ink outline-none transition-colors duration-150 ease-snappy placeholder:text-muted focus:border-act"
              placeholder="e.g. 15"
              value={lectureDetails.lectureDuration}
              onChange={(e) =>
                setLectureDetails({
                  ...lectureDetails,
                  lectureDuration: e.target.value,
                })
              }
            />
          </div>

          {/* YouTube URL Input */}
          <div>
              <label htmlFor="lesson-link" className="mb-2 block text-sm font-medium text-ink">
                YouTube link
              </label>
              <input
                id="lesson-link"
                type="url"
                className="h-11 w-full rounded-xl border border-line-strong bg-card px-4 text-[15px] text-ink outline-none transition-colors duration-150 ease-snappy placeholder:text-muted focus:border-act"
                placeholder="https://www.youtube.com/watch?v=..."
                value={lectureDetails.lectureUrl}
                onChange={(e) =>
                  setLectureDetails({
                    ...lectureDetails,
                    lectureUrl: e.target.value,
                  })
                }
              />
            </div>

          {/* Free Preview Toggle */}
          <div className="flex items-center justify-between rounded-xl border border-line p-4">
            <div>
              <p id="lesson-preview" className="font-medium text-ink">Free preview</p>
              <p className="text-sm text-muted">
                People can watch it on the course page before they enroll.
              </p>
            </div>
            <label className="tap relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                aria-labelledby="lesson-preview"
                checked={lectureDetails.isPreviewFree}
                onChange={(e) =>
                  setLectureDetails({
                    ...lectureDetails,
                    isPreviewFree: e.target.checked,
                  })
                }
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus-visible:ring-act/40 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-act"></div>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex gap-3 border-t border-line bg-card px-6 py-4">
          <button
            onClick={resetModal}
            type="button"
            className={`tap flex-1 py-2.5 text-sm ${quietButton}`}
          >
            Cancel
          </button>
          <button
            onClick={handleAddLecture}
            type="button"
            disabled={!lectureDetails.lectureTitle || !lectureDetails.lectureDuration || !lectureDetails.lectureUrl}
            className={`tap flex-1 py-2.5 text-sm ${primaryButton}`}
          >
            Add lesson
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddLectureModal;
