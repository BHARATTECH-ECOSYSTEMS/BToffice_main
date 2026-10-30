import { useReducer, useRef, useEffect, useState } from "react";
import { PageHead } from "../../components/educator/parts";
import { primaryButton, quietButton } from "../../components/students/ui";
import uniqid from "uniqid";
import Quill from "quill";
import { toast } from "react-toastify";
import axios from "axios";
import "quill/dist/quill.snow.css";
import { useNavigate } from "react-router-dom";
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

const field = "h-11 rounded-xl border border-line-strong bg-card px-4 text-[15px] text-ink focus-visible:outline-none focus:ring-1 focus:ring-act transition-colors duration-150 ease-snappy placeholder:text-muted focus:border-act";

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

  // one preview address per chosen file, given back when it changes (it used to make a new one on every render)
  const [coverPreview, setCoverPreview] = useState("");
  useEffect(() => {
    if (!formState.image) {
      setCoverPreview("");
      return undefined;
    }
    const url = URL.createObjectURL(formState.image);
    setCoverPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [formState.image]);

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
    toast.success("Lesson added.");

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
      toast.error("Add a title for the course.");
      return;
    }

    if (!plainDescription) {
      toast.error("Add a description of the course.");
      return;
    }

    if (!formState.image) {
      toast.error("Choose a cover image.");
      return;
    }

    if (formState.chapters.length === 0) {
      toast.error("Add at least one chapter.");
      return;
    }

    const hasLecture = formState.chapters.some(
      (chapter) => Array.isArray(chapter.chapterContent) && chapter.chapterContent.length > 0
    );

    if (!hasLecture) {
      toast.error("Add at least one lesson to a chapter.");
      return;
    }

    setIsSubmitting(true);

    try {
      const courseData = {
        courseTitle,
        courseDescription,
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
        toast.success("Published. It's live in Learning now.");
        await refetchCourses();

        // Reset form
        dispatch({ type: COURSE_ACTIONS.RESET_FORM });
        if (quillRef.current) {
          quillRef.current.root.innerHTML = "";
        }
        navigate("/educator/my-courses");
      } else {
        toast.error(data.message || "Couldn't publish the course. Try again.");
      }
    } catch (error) {
      console.error("Error creating course:", error);
      toast.error(error.response?.data?.message || "Couldn't publish the course. Check your connection and try again.");
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
    <>
      <PageHead title="Add a course">It goes live for everyone in Learning as soon as you publish it. Every course is free.</PageHead>

      <form onSubmit={handleSubmit} noValidate className="mt-10 grid max-w-3xl gap-8">
        <div className="grid gap-2">
          <label htmlFor="course-title" className="text-sm font-medium text-ink">
            Title
          </label>
          <input
            id="course-title"
            type="text"
            placeholder="e.g. Introduction to JavaScript"
            value={formState.courseTitle}
            onChange={(e) =>
              dispatch({
                type: COURSE_ACTIONS.SET_COURSE_TITLE,
                payload: e.target.value,
              })
            }
            className={field}
          />
        </div>

        <div className="grid gap-2">
          <span id="course-description" className="text-sm font-medium text-ink">
            Description
          </span>
          <div className="course-editor overflow-hidden rounded-xl border border-line-strong bg-card" role="group" aria-labelledby="course-description">
            <div ref={editorRef} className="min-h-[160px]" />
          </div>
        </div>

        <div className="grid gap-2">
          <span className="text-sm font-medium text-ink">Cover image</span>
          <div className="flex items-center gap-5">
            <div className="aspect-video w-48 shrink-0 overflow-hidden rounded-xl border border-line bg-ink/5">
              {coverPreview ? (
                <img src={coverPreview} alt="Chosen cover" className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full items-center justify-center text-[13px] text-muted">No cover yet</span>
              )}
            </div>
            <div>
              <label htmlFor="thumbnailImage" className={`inline-block cursor-pointer px-4 py-2 text-sm ${quietButton}`}>
                {coverPreview ? "Choose another image" : "Choose an image"}
              </label>
              <p className="mt-2 text-[13px] text-muted">A 16:9 picture works best, up to 5 MB.</p>
            </div>
          </div>
          <input
            type="file"
            className="sr-only"
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

        <section aria-labelledby="course-content" className="grid gap-3">
          <div>
            <h2 id="course-content" className="font-display text-[22px] font-semibold tracking-[-0.01em] text-ink">
              Chapters and lessons
            </h2>
            <p className="mt-1 text-sm text-muted">Lessons are YouTube videos. Add at least one chapter with one lesson.</p>
          </div>

          {formState.chapters.map((chapter, index) => (
            <div key={chapter.chapterId} className="overflow-hidden rounded-2xl border border-line bg-card">
              <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-3">
                <span className="font-semibold text-ink">
                  Chapter {index + 1}: {chapter.chapterTitle}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveChapter(chapter.chapterId)}
                  className="tap text-sm font-medium text-muted transition-colors duration-150 ease-snappy mhover:text-[#B42318]"
                >
                  Remove chapter<span className="sr-only"> {chapter.chapterTitle}</span>
                </button>
              </div>

              <ul className="divide-y divide-line">
                {chapter.chapterContent.map((lecture, i) => (
                  <li key={i} className="flex items-center justify-between gap-4 px-5 py-2.5 text-[15px] text-ink-soft">
                    <span>{lecture.lectureTitle}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveLecture(chapter.chapterId, i)}
                      className="tap text-sm text-muted transition-colors duration-150 ease-snappy mhover:text-[#B42318]"
                    >
                      Remove<span className="sr-only"> {lecture.lectureTitle}</span>
                    </button>
                  </li>
                ))}
              </ul>
              <div className="px-5 py-3">
                <button
                  type="button"
                  onClick={() => handleOpenLectureModal(chapter.chapterId)}
                  className="tap text-sm font-semibold text-act-deep underline-offset-2 mhover:underline"
                >
                  Add a lesson
                </button>
              </div>
            </div>
          ))}

          <button type="button" onClick={() => setShowChapterModal(true)} className={`tap justify-self-start px-5 py-2 text-sm ${quietButton}`}>
            Add a chapter
          </button>
        </section>

        <div className="flex items-center gap-4 border-t border-line pt-6">
          <button type="submit" disabled={isSubmitting} className={`px-6 py-3 text-[15px] ${primaryButton}`}>
            {isSubmitting ? "Publishing…" : "Publish course"}
          </button>
        </div>
      </form>

      {showChapterModal && (
        <EduPopup
          message="Add a chapter"
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
    </>
  );
}

export default AddCourse;
