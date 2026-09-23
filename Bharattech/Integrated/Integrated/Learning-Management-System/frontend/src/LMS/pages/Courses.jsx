import React, { useEffect, useState, useContext } from 'react';
import { Box } from "@mui/material";
import toast, { Toaster } from "react-hot-toast";
import axios from "axios";
import { AuthContext } from '../context/AuthContext';
import CourseCard from '../components/courses/CourseCard';
import CourseFilters from '../components/courses/CourseFilters';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

const getAuthHeaders = () => {
  const token =
    localStorage.getItem("authToken") ||
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("jwt");
  const role =
    localStorage.getItem("userRole") || localStorage.getItem("role") || "";

  return {
    ...(token && { Authorization: `Bearer ${token}` }),
    ...(role && { "x-demo-role": role }),
  };
};

const CATEGORIES = ["All", "Web Development", "Data Science", "Design", "Marketing", "Business"];

export default function Courses() {
  const [courses, setCourses] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [enrolled, setEnrolled] = useState([]);
  const { user } = useContext(AuthContext);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/courses/all-approved`, {
          headers: getAuthHeaders(),
        });
        setCourses(res.data.courses || []);
      } catch (err) {
        console.error("Error fetching courses:", err);
      }
    };

    const fetchEnrolledCourses = async () => {
      const token =
        localStorage.getItem("authToken") ||
        localStorage.getItem("token") ||
        localStorage.getItem("accessToken") ||
        localStorage.getItem("jwt");

      if (!token) return;

      try {
        const res = await axios.get(`${API_BASE_URL}/courses/enrolled`, {
          headers: getAuthHeaders(),
        });
        setEnrolled(res.data.enrolledCourses || []);
      } catch (err) {
        console.error("Error fetching enrolled courses:", err);
      }
    };

    fetchEnrolledCourses();
    fetchCourses();
  }, []);

  const handleEnroll = async (id) => {
    try {
      setLoading(true);
      const token =
        localStorage.getItem("authToken") ||
        localStorage.getItem("token") ||
        localStorage.getItem("accessToken") ||
        localStorage.getItem("jwt");

      if (!token) {
        alert("You must be logged in to enroll in a course. Please login first.");
        return;
      }

      await axios.post(
        `${API_BASE_URL}/courses/enroll/${id}`,
        {},
        {
          headers: {
            ...getAuthHeaders(),
            "Content-Type": "application/json",
          },
        }
      );

      toast.success("Enrolled Successfully!");

      const enrolledRes = await axios.get(`${API_BASE_URL}/courses/enrolled`, {
        headers: getAuthHeaders(),
      });
      setEnrolled(enrolledRes.data.enrolledCourses || []);
    } catch (err) {
      console.error("Enrollment error:", err);
      const errorMessage = err.response?.data?.message || err.message || "Failed to enroll in course";
      alert("Enrolling failed: " + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const searched = courses.filter((c) =>
    c.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col min-h-screen bg-background px-4 sm:px-6 lg:px-8 py-4">
      <Toaster position="top-center" />

      <CourseFilters
        search={search}
        setSearch={setSearch}
        categories={CATEGORIES}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
        {searched.length === 0 ? (
          <Box display="flex" justifyContent="center" alignItems="center" className="col-span-full py-12">
            <h1 className="text-lg text-muted-foreground">No Items Found...</h1>
          </Box>
        ) : (
          searched.map((course) => (
            <CourseCard
              key={course._id || course.id}
              course={course}
              isEnrolled={enrolled.some((c) => c._id === course._id)}
              loading={loading}
              onEnroll={handleEnroll}
            />
          ))
        )}
      </div>
    </div>
  );
}
