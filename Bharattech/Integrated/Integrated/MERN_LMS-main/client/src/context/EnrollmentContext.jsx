/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useAuth } from "./AuthContext";
import { getBackendUrl } from "../utils/backendUrl";

const EnrollmentContext = createContext(null);

export const EnrollmentProvider = ({ children }) => {
  const { getToken, isLoggedIn } = useAuth();
  const backendUrl = getBackendUrl();

  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchEnrolledCourses = useCallback(async () => {
    if (!isLoggedIn || typeof getToken !== "function") return;

    try {
      setLoading(true);
      const token = await getToken();
      const { data } = await axios.get(`${backendUrl}/api/user/enrolled-courses`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (data?.status === "success") {
        setEnrolledCourses(
          Array.isArray(data.data.enrolledCourses)
            ? [...data.data.enrolledCourses].reverse()
            : []
        );
      } else {
        setEnrolledCourses([]);
      }
    } catch {
      setEnrolledCourses([]);
    } finally {
      setLoading(false);
    }
  }, [backendUrl, getToken, isLoggedIn]);

  useEffect(() => {
    fetchEnrolledCourses();
  }, [fetchEnrolledCourses]);

  return (
    <EnrollmentContext.Provider
      value={{
        enrolledCourses,
        loading,
        refetchEnrollments: fetchEnrolledCourses,
      }}
    >
      {children}
    </EnrollmentContext.Provider>
  );
};

export const useEnrollments = () => {
  const ctx = useContext(EnrollmentContext);
  if (!ctx) {
    throw new Error("useEnrollments must be used within EnrollmentProvider");
  }
  return ctx;
};
