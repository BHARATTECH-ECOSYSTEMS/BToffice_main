import { useReducer, useRef, useEffect, useState } from "react";
import uniqid from "uniqid";
import Quill from "quill";
import { toast } from "react-toastify";
import axios from "axios";
import "quill/dist/quill.snow.css";
import { useNavigate } from "react-router-dom";
import { assets } from "../../assets/assets";
import { useAuth } from "../../context/AuthContext";
import { useAppConfig } from "../../context/AppContext";
import { useCourses } from "../../context/CourseContext";
import EduPopup from "../../components/educator/EduPopup";
import AddLectureModal from "../../components/educator/AddLectureModal";
import {
  courseFormReducer,
  initialCourseFormState,
  COURSE_ACTIONS,
} from "../../reducers/courseFormReducer";

function AddCourse() {
  // Refs
  const quillRef = useRef(null);
  const editorRef = useRef(null);

  // Context
  const { getToken } = useAuth();
  const { backendUrl } = useAppConfig();
  const { refetchCourses } = useCourses();
  const navigate = useNavigate();

  // Reducer for course form state
  const [formState, dispatch] = useReducer(
    courseFormReducer,
    initialCourseFormState
  );

  // Local UI state
  const [showLectureModal, setShowLectureModal] = useState(false);
  const [showChapterModal, setShowChapterModal] = useState(false);
  const [currentChapterId, setCurrentChapterId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Chapter handlers
  const handleAddChapter = (title) => {
    if (title) {
      const newChapter = {
        chapterId: uniqid(),
        chapterTitle: title,
        chapterContent: [],
        collapsed: false,
        chapterOrder:
          formState.chapters.length > 0
            ? formState.chapters[formState.chapters.length - 1].chapterOrder + 1
            : 1,
      };
      dispatch({ type: COURSE_ACTIONS.ADD_CHAPTER, payload: newChapter });
    }
    setShowChapterModal(false);
  };

  const handleRemoveChapter = (chapterId) => {
    dispatch({ type: COURSE_ACTIONS.REMOVE_CHAPTER, payload: chapterId });
  };

  const handleToggleChapter = (chapterId) => {
    dispatch({ type: COURSE_ACTIONS.TOGGLE_CHAPTER, payload: chapterId });
  };

  // Lecture handlers
  const handleOpenLectureModal = (chapterId) => {
    setCurrentChapterId(chapterId);
    setShowLectureModal(true);
  };

  const handleAddLecture = (lectureData) => {
    const newLecture = {
      ...lectureData,
      lectureOrder: getCurrentChapter()?.chapterContent.length + 1 || 1,
      lectureId: uniqid(),
    };

    dispatch({
      type: COURSE_ACTIONS.ADD_LECTURE,
      payload: {
        chapterId: currentChapterId,
        lecture: newLecture,
      },
    });
    toast.success("Lecture added successfully!");

    setShowLectureModal(false);
    setCurrentChapterId(null);
  };

  const handleRemoveLecture = (chapterId, lectureIndex) => {
    dispatch({
      type: COURSE_ACTIONS.REMOVE_LECTURE,
      payload: { chapterId, lectureIndex },
    });
  };

  // Helper
  const getCurrentChapter = () => {
    return formState.chapters.find((ch) => ch.chapterId === currentChapterId);
  };

  // Form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    const courseTitle = formState.courseTitle.trim();
    const courseDescription = quillRef.current?.root?.innerHTML || "";
    const plainDescription = quillRef.current?.getText?.().trim() || "";

    if (!courseTitle) {
      toast.error("Please enter a course title");
      return;
    }

    if (!plainDescription) {
      toast.error("Please enter a course description");
      return;
    }

    if (!formState.image) {
      toast.error("Please select a course thumbnail");
      return;
    }

    if (formState.chapters.length === 0) {
      toast.error("Please add at least one chapter");
      return;
    }

    const hasLecture = formState.chapters.some(
      (chapter) => Array.isArray(chapter.chapterContent) && chapter.chapterContent.length > 0
    );

    if (!hasLecture) {
      toast.error("Please add at least one lecture");
      return;
    }

    setIsSubmitting(true);

    try {
      const courseData = {
        courseTitle,
        courseDescription,
        coursePrice: Number(formState.coursePrice),
        discount: Number(formState.discount),
        courseContent: formState.chapters,
      };

      const formData = new FormData();
      formData.append("courseData", JSON.stringify(courseData));
      formData.append("image", formState.image);

      const token = await getToken();
      const { data } = await axios.post(
        `${backendUrl}/api/educator/add-course`,
        formData,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (data.success) {
        toast.success(data.message);
        await refetchCourses();

        // Reset form
        dispatch({ type: COURSE_ACTIONS.RESET_FORM });
        if (quillRef.current) {
          quillRef.current.root.innerHTML = "";
        }
        navigate("/educator/my-courses");
      } else {
        toast.error(data.message || "Failed to create course");
      }
    } catch (error) {
      console.error("Error creating course:", error);
      toast.error(error.response?.data?.message || "Failed to create course");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Initialize Quill editor
  useEffect(() => {
    if (!quillRef.current && editorRef.current) {
      quillRef.current = new Quill(editorRef.current, {
        theme: "snow",
      });
    }
  }, []);

  return (
    <div className="min-h-screen flex justify-center items-start bg-gray-50 py-10 px-4">

      <form
        onSubmit={handleSubmit}
        noValidate
        className="w-full max-w-3xl bg-white p-8 rounded-2xl shadow-lg border border-gray-100 flex flex-col gap-6"
      >
        {/* Title */}
        <div>
          <h1 className="text-3xl font-bold text-gray-800">
            Create New Course
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Add details, structure your content, and publish your course.
          </p>
        </div>

        {/* Course Title */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">
            Course Title *
          </label>
          <input
            type="text"
            placeholder="Enter course title..."
            value={formState.courseTitle}
            onChange={(e) =>
              dispatch({
                type: COURSE_ACTIONS.SET_COURSE_TITLE,
                payload: e.target.value,
              })
            }
            className="px-4 py-3 rounded-lg border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all outline-none"
          />
        </div>

        {/* Description */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-700">
            Course Description *
          </label>
          <div className="border rounded-lg overflow-hidden">
            <div ref={editorRef} className="min-h-[120px]" />
          </div>
        </div>

        {/* Price + Thumbnail */}
        <div className="flex flex-wrap gap-6 items-center justify-between">

          {/* Price */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">
              Course Price *
            </label>
            <input
              type="number"
              placeholder="0"
              value={formState.coursePrice}
              onChange={(e) =>
                dispatch({
                  type: COURSE_ACTIONS.SET_COURSE_PRICE,
                  payload: +e.target.value,
                })
              }
              className="px-4 py-2 w-32 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          {/* Thumbnail */}
          <div className="flex flex-col items-center gap-2">
            <label className="text-sm font-medium text-gray-700">
              Thumbnail *
            </label>

            <label
              htmlFor="thumbnailImage"
              className="cursor-pointer flex flex-col items-center justify-center border-2 border-dashed border-gray-300 px-6 py-6 rounded-xl hover:border-indigo-400 hover:bg-indigo-50 transition"
            >
              <img src={assets.file_upload_icon} className="w-8 mb-2" />

              <span className="text-sm text-gray-600">
                Click to upload thumbnail
              </span>

              {formState.image && (
                <img
                  src={URL.createObjectURL(formState.image)}
                  className="mt-3 w-20 h-20 object-cover rounded-lg shadow"
                />
              )}
            </label>

            <input
              type="file"
              hidden
              id="thumbnailImage"
              accept="image/*"
              onChange={(e) =>
                dispatch({
                  type: COURSE_ACTIONS.SET_IMAGE,
                  payload: e.target.files[0],
                })
              }
            />
          </div>
        </div>

        {/* Discount */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">
            Discount % *
          </label>
          <input
            type="number"
            value={formState.discount}
            onChange={(e) =>
              dispatch({
                type: COURSE_ACTIONS.SET_DISCOUNT,
                payload: +e.target.value,
              })
            }
            className="px-4 py-2 w-32 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-400"
          />
        </div>

        {/* Course Content */}
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-3">
            Course Content
          </h3>

          {formState.chapters.map((chapter, index) => (
            <div
              key={chapter.chapterId}
              className="border rounded-xl mb-4 bg-white shadow-sm hover:shadow-md transition"
            >
              <div className="flex justify-between p-4 border-b">
                <span className="font-medium">
                  {index + 1}. {chapter.chapterTitle}
                </span>

                <button
                  type="button"
                  onClick={() => handleRemoveChapter(chapter.chapterId)}
                  className="text-red-500 text-sm"
                >
                  Remove
                </button>
              </div>

              {!chapter.collapsed && (
                <div className="p-4 space-y-2">
                  {chapter.chapterContent.map((lecture, i) => (
                    <div key={i} className="text-sm flex justify-between">
                      <span>
                        {i + 1}. {lecture.lectureTitle}
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          handleRemoveLecture(chapter.chapterId, i)
                        }
                        className="text-red-400"
                      >
                        ✕
                      </button>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => handleOpenLectureModal(chapter.chapterId)}
                    className="mt-2 text-indigo-600 text-sm font-medium"
                  >
                    + Add Lecture
                  </button>
                </div>
              )}
            </div>
          ))}

          <button
            type="button"
            onClick={() => setShowChapterModal(true)}
            className="w-full py-3 rounded-lg bg-gradient-to-r from-indigo-500 to-blue-500 text-white shadow hover:opacity-90 font-medium hover:bg-indigo-200"
          >
            + Add Chapter
          </button>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3 rounded-lg bg-gradient-to-r from-gray-900 to-black shadow-lg hover:scale-[1.01] active:scale-[0.99] transition text-white font-medium hover:opacity-90 transition"
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              Creating...
            </span>
          ) : (
            "Create Course"
          )}
        </button>
      </form>

      {showChapterModal && (
        <EduPopup
          message="Add Chapter"
          onSubmit={handleAddChapter}
          onClose={() => setShowChapterModal(false)}
        />
      )}

      <AddLectureModal
        isOpen={showLectureModal}
        onClose={() => {
          setShowLectureModal(false);
          setCurrentChapterId(null);
        }}
        onAddLecture={handleAddLecture}
      />
    </div>
  );
}

export default AddCourse;
