/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import axios from "axios";
import { getBackendUrl } from "../utils/backendUrl";

const CourseContext = createContext(null);

export const CourseProvider = ({ children }) => {
  const backendUrl = getBackendUrl();

  const [allCourses, setAllCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAllCourses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data } = await axios.get(`${backendUrl}/api/courses/all`);

      if (data?.status === "success" && Array.isArray(data.data.courses)) {
        setAllCourses(data.data.courses);
      } else {
        setAllCourses([]);
        setError("Invalid course data");
      }
    } catch (err) {
      setAllCourses([]);
      setError(
        err?.response?.data?.message ||
          (err?.code === "ERR_NETWORK"
            ? "Course service is currently unavailable"
            : "Failed to fetch courses")
      );
    } finally {
      setLoading(false);
    }
  }, [backendUrl]);

  useEffect(() => {
    fetchAllCourses();
  }, [fetchAllCourses]);

  return (
    <CourseContext.Provider
      value={{
        allCourses,
        loading,
        error,
        refetchCourses: fetchAllCourses,
      }}
    >
      {children}
    </CourseContext.Provider>
  );
};

export const useCourses = () => {
  const ctx = useContext(CourseContext);
  if (!ctx) {
    throw new Error("useCourses must be used within CourseProvider");
  }
  return ctx;
};
