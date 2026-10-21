import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAppConfig } from "../../context/AppContext";
import { useAuth } from "../../context/AuthContext";
import Loading from "../../components/students/Loading";
import EmptySection from "../../components/common/EmptySection";
import { assets } from "../../assets/assets";

function MyCourses() {
  const { currency, backendUrl } = useAppConfig();
  const navigate = useNavigate();
  const { isEducator, getToken } = useAuth();
  const [courses, setCourses] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchEduCourses = async () => {
    try {
      const token = await getToken();

      const { data } = await axios.get(`${backendUrl}/api/educator/courses`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (data.status === "success") {
        setCourses(data.data.courses || []);
      } else {
        setCourses([]);
      }
    } catch {
      setCourses([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isEducator) {
      setCourses([]);
      setLoading(false);
      return;
    }
    fetchEduCourses();
  }, [isEducator]);

  if (loading || !courses) {
    return <Loading />;
  }

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 pt-6 md:p-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              My Courses
            </h1>
            {courses.length > 0 && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100/80">
                {courses.length} {courses.length === 1 ? "Course" : "Courses"}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Manage your published courses, monitor enrollments, and track
            earnings.
          </p>
        </div>

        {/* Quick Add Course Button */}
        <button
          onClick={() => navigate("/educator/add-course")}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl shadow-sm shadow-indigo-500/20 transition-all duration-150 active:scale-[0.98] self-start sm:self-auto cursor-pointer"
        >
          <span className="text-base leading-none font-bold">+</span>
          <span>Add New Course</span>
        </button>
      </div>

      {/* Courses Table Card */}
      <div className="w-full max-w-6xl overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/75">
                <th className="py-3.5 px-6 text-xs font-bold uppercase tracking-wider text-slate-500">
                  Course Title
                </th>
                <th className="py-3.5 px-6 text-xs font-bold uppercase tracking-wider text-slate-500 text-center">
                  Total Earnings
                </th>
                <th className="py-3.5 px-6 text-xs font-bold uppercase tracking-wider text-slate-500 text-center">
                  Enrolled Students
                </th>
                <th className="py-3.5 px-6 text-xs font-bold uppercase tracking-wider text-slate-500 text-center">
                  Published Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {courses.length === 0 ? (
                <tr>
                  <td colSpan="4" className="py-12">
                    <EmptySection
                      imageSrc={assets.playfull_cat_vase}
                      title="No Courses Created"
                      description="You haven't created any courses yet. Start building your first course and share your knowledge!"
                      actionLabel="Create Your First Course"
                      onAction={() => navigate("/educator/add-course")}
                      size="md"
                    />
                  </td>
                </tr>
              ) : (
                courses.map((course) => {
                  const studentCount = course.enrolledStudents?.length || 0;
                  const price = course.coursePrice || 0;
                  const discount = course.discount || 0;
                  const effectivePrice = price - (discount * price) / 100;
                  const earnings = Math.floor(studentCount * effectivePrice);

                  const formattedDate = course.createdAt
                    ? new Date(course.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "—";

                  return (
                    <tr
                      key={course._id}
                      className="hover:bg-slate-50/70 transition-colors duration-150"
                    >
                      {/* Course Info */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3.5 min-w-0 max-w-md">
                          <img
                            src={course.courseThumbnail}
                            alt={course.courseTitle || "Course thumbnail"}
                            className="w-16 h-10 md:w-20 md:h-12 object-contain rounded-lg border border-slate-200/80 shadow-xs flex-shrink-0 bg-slate-100"
                            onError={(e) => {
                              e.target.src = assets.playfull_cat_vase;
                            }}
                          />
                          <span className="font-semibold text-slate-800 line-clamp-2 text-sm leading-snug">
                            {course.courseTitle || "Untitled Course"}
                          </span>
                        </div>
                      </td>

                      {/* Earnings */}
                      <td className="py-4 px-6 text-center font-semibold text-slate-900">
                        {currency || "$"} {earnings.toLocaleString()}
                      </td>

                      {/* Students */}
                      <td className="py-4 px-6 text-center">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100/60">
                          {studentCount}{" "}
                          {studentCount === 1 ? "student" : "students"}
                        </span>
                      </td>

                      {/* Published Date */}
                      <td className="py-4 px-6 text-center text-xs font-medium text-slate-500">
                        {formattedDate}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default MyCourses;
