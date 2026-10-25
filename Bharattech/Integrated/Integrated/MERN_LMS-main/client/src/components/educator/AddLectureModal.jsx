import { useState } from "react";
import { toast } from "react-toastify";
import { assets } from "../../assets/assets";
import { isValidYouTubeUrl } from "../../utils/VideoHelpers";

// Lectures are YouTube videos only (owner's 4A, 2026-10-26): uploading needs the company's Cloudinary keys, which
// the LMS doesn't have, so the "Upload" choice is gone.
const EMPTY_LECTURE = { lectureTitle: "", lectureDuration: "", lectureUrl: "", isPreviewFree: false };

const AddLectureModal = ({ isOpen, onClose, onAddLecture }) => {
  const [lectureDetails, setLectureDetails] = useState(EMPTY_LECTURE);

  const handleAddLecture = () => {
    if (!lectureDetails.lectureTitle || !lectureDetails.lectureDuration) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (!lectureDetails.lectureUrl) {
      toast.error("Please provide a YouTube URL");
      return;
    }
    if (!isValidYouTubeUrl(lectureDetails.lectureUrl)) {
      toast.error("Invalid YouTube URL");
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
    <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-50 p-4">
      <div className="bg-white text-gray-700 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between rounded-t-xl z-10">
          <h2 className="text-xl font-bold text-gray-800">Add Lecture</h2>
          <button
            onClick={resetModal}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <img src={assets.cross_icon} alt="close" className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Lecture Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Lecture Title *
            </label>
            <input
              type="text"
              className="w-full border-2 border-gray-200 rounded-lg py-2.5 px-4 focus:border-indigo-500 focus:outline-none transition-colors"
              placeholder="e.g., Introduction to React Hooks"
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Duration (minutes) *
            </label>
            <input
              type="number"
              className="w-full border-2 border-gray-200 rounded-lg py-2.5 px-4 focus:border-indigo-500 focus:outline-none transition-colors"
              placeholder="e.g., 15"
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                YouTube Video URL *
              </label>
              <input
                type="text"
                className="w-full border-2 border-gray-200 rounded-lg py-2.5 px-4 focus:border-indigo-500 focus:outline-none transition-colors"
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
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium text-gray-800">Free Preview</p>
              <p className="text-sm text-gray-500">
                Allow non-enrolled students to watch
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={lectureDetails.isPreviewFree}
                onChange={(e) =>
                  setLectureDetails({
                    ...lectureDetails,
                    isPreviewFree: e.target.checked,
                  })
                }
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 px-6 py-4 flex gap-3 border-t">
          <button
            onClick={resetModal}
            type="button"
            className="flex-1 border-2 border-gray-300 text-gray-700 font-medium py-2.5 rounded-lg hover:bg-gray-100 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleAddLecture}
            type="button"
            disabled={!lectureDetails.lectureTitle || !lectureDetails.lectureDuration || !lectureDetails.lectureUrl}
            className="flex-1 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-medium py-2.5 rounded-lg disabled:opacity-50"
          >
            Add Lecture
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddLectureModal;
