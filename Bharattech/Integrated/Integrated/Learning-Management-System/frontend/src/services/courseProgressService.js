// Course Progress Service - API-based (No LocalStorage)
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

// Get auth token from localStorage
const getAuthToken = () => {
  return (
    localStorage.getItem("authToken") ||
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("jwt")
  );
};

// Get headers with auth token
const getHeaders = () => {
  const token = getAuthToken();
  const role =
    localStorage.getItem("userRole") || localStorage.getItem("role") || "";

  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
    ...(role && { "x-demo-role": role }),
  };
};

// Enroll in a course
export const enrollCourse = async (courseId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/course-progress/enroll`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ courseId }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to enroll in course");
    }

    return await response.json();
  } catch (error) {
    console.error("Error enrolling in course:", error);
    throw error;
  }
};

// Update course progress
export const updateProgress = async (courseId, progress, completedLessons = []) => {
  try {
    const response = await fetch(`${API_BASE_URL}/course-progress/update`, {
      method: "PATCH",
      headers: getHeaders(),
      body: JSON.stringify({
        courseId,
        progress,
        completedLessons,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to update progress");
    }

    return await response.json();
  } catch (error) {
    console.error("Error updating progress:", error);
    throw error;
  }
};

// Get all courses for current user
export const getMyCourses = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/course-progress`, {
      method: "GET",
      headers: getHeaders(),
    });

    if (!response.ok) {
      throw new Error("Failed to fetch courses");
    }

    const data = await response.json();
    return data || [];
  } catch (error) {
    console.error("Error fetching courses:", error);
    return [];
  }
};

// Get specific course progress
export const getCourseProgress = async (courseId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/course-progress/${courseId}`, {
      method: "GET",
      headers: getHeaders(),
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null; // Not enrolled yet
      }
      throw new Error("Failed to fetch course progress");
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching course progress:", error);
    return null;
  }
};

