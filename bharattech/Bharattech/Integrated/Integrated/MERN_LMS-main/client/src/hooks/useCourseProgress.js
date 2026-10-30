import { useState, useCallback } from "react";
import axios from "axios";
import { toast } from "react-toastify";

export const useCourseProgress = (courseId, backendUrl, getToken) => {
  const [courseProgress, setCourseProgress] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchProgress = useCallback(async () => {
    if (!courseId) return;

    setLoading(true);
    try {
      const token = await getToken();
      const { data } = await axios.post(
        `${backendUrl}/api/user/get-course-progress`,
        { courseId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (data.status === "success") {
        setCourseProgress(data.data.progressData);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error("Failed to fetch progress:", error);
      toast.error("Failed to load course progress");
    } finally {
      setLoading(false);
    }
  }, [courseId, backendUrl, getToken]);

  // `announce: false` from the video window (owner's A, 2026-10-27): its toast covered the window's buttons, and the
  // window shows "Watched" itself; a failure is still told with a toast
  const markLectureCompleted = useCallback(
    async (lectureId, { announce = true } = {}) => {
      try {
        const token = await getToken();
        const { data } = await axios.post(
          `${backendUrl}/api/user/update-course-progress`,
          { courseId, lectureId },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (data.status === "success") {
          if (announce) toast.success("Marked as watched.");
          await fetchProgress(); // Refresh progress
        } else {
          toast.error(data.message);
        }
      } catch (error) {
        console.error("Failed to mark lecture:", error);
        toast.error("Couldn't mark this lesson as watched. Try again.");
      }
    },
    [courseId, backendUrl, getToken, fetchProgress]
  );

  return {
    courseProgress,
    loading,
    fetchProgress,
    markLectureCompleted,
  };
};
