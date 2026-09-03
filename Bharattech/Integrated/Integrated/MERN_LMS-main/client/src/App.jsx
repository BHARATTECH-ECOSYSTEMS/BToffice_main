import { Navigate, Route, Routes } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import Home from "./pages/student/Home";
import CoursesList from "./pages/student/CoursesList";
import CourseDetails from "./pages/student/CourseDetails";
import MyEnrollments from "./pages/student/MyEnrollments";
import Player from "./pages/student/Player";
import Loading from "./components/students/Loading";
import Educator from "./pages/educator/Educator";
import Dashboard from "./pages/educator/Dashboard";
import AddCourse from "./pages/educator/AddCourse";
import MyCourses from "./pages/educator/MyCourses";
import StudentsEnrolled from "./pages/educator/StudentsEnrolled";
import Navbar from "./components/students/Navbar";
import RequireRole from "./components/auth/RequireRole";
import { useAuth } from "./context/AuthContext";
import EducatorNavbar from "./components/educator/Navbar";


function App() {
  const { isAdmin, viewRole, loading } = useAuth();

  if (loading) return <Loading />;

  return (
    <div className="text-default min-h-screen bg-white">
      <ToastContainer position="bottom-right" autoClose={3000} />

      {viewRole === "educator" ? <EducatorNavbar /> : <Navbar />}

      <Routes>
        <Route
          path="/"
          element={
            isAdmin() && viewRole === "educator"
              ? <Navigate to="/educator/dashboard" replace />
              : <Home />
          }
        />

        <Route path="/course-list" element={<CoursesList />} />
        <Route path="/course-list/:query" element={<CoursesList />} />
        <Route path="/course/:id" element={<CourseDetails />} />
        <Route path="/my-enrollments" element={<MyEnrollments />} />
        <Route path="/player/:id" element={<Player />} />

        {/* Admin-only educator workspace */}
       <Route
  path="/educator/*"
  element={
    <RequireRole allow={["Admin", "Super-admin"]}>
      <Educator />
    </RequireRole>
  }
>
  <Route index element={<Dashboard />} />
  <Route path="dashboard" element={<Dashboard />} />
  <Route path="add-course" element={<AddCourse />} />
  <Route path="my-courses" element={<MyCourses />} />
  <Route path="students-enrolled" element={<StudentsEnrolled />} />
</Route>

         
      </Routes>
    </div>
  );
}

export default App;
