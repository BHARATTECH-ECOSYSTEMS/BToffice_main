import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { useAppConfig } from "../../context/AppContext";
import { useAuth } from "../../context/AuthContext";
import Loading from "../../components/students/Loading";
import EmptySection from "../../components/common/EmptySection";
import { assets } from "../../assets/assets";

function StudentsEnrolled() {
  const { backendUrl } = useAppConfig();
  const { isEducator, getToken } = useAuth();

  const [enrolledStudents, setEnrolledStudents] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchEnrolledStudents = useCallback(
    async ({ showLoader = false } = {}) => {
      try {
        if (showLoader) {
          setLoading(true);
        }

        const token = await getToken();

        const { data } = await axios.get(
          `${backendUrl}/api/educator/enrolled-students`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (data.status === "success") {
          setEnrolledStudents(data.data?.enrolledStudents || []);
        } else {
          setEnrolledStudents([]);
        }
      } catch {
        setEnrolledStudents([]);
      } finally {
        setLoading(false);
      }
    },
    [backendUrl, getToken],
  );

  useEffect(() => {
    if (!isEducator) {
      setEnrolledStudents([]);
      setLoading(false);
      return;
    }

    fetchEnrolledStudents({ showLoader: true });

    const refreshOnFocus = () => {
      fetchEnrolledStudents();
    };

    const refreshInterval = window.setInterval(() => {
      fetchEnrolledStudents();
    }, 15000);

    window.addEventListener("focus", refreshOnFocus);

    return () => {
      window.removeEventListener("focus", refreshOnFocus);
      window.clearInterval(refreshInterval);
    };
  }, [fetchEnrolledStudents, isEducator]);

  if (loading || !enrolledStudents) {
    return <Loading />;
  }

  const studentCount = enrolledStudents.length;

  const formatDate = (date) => {
    if (!date) return "—";

    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 pt-6 md:p-8 space-y-6">
      {/* Top Header */}
      <div className="border-b border-slate-200/80 pb-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Enrolled Students
              </h1>

              {studentCount > 0 && (
                <span className="inline-flex items-center rounded-full border border-indigo-100/80 bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
                  {studentCount} {studentCount === 1 ? "Student" : "Students"}
                </span>
              )}
            </div>

            <p className="mt-1 text-sm text-slate-500">
              View students enrolled in your courses and their enrollment
              details.
            </p>
          </div>
        </div>
      </div>

      {/* Students Table Card */}
      <div className="w-full max-w-6xl overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/75">
                <th className="w-16 px-6 py-3.5 text-center text-xs font-bold uppercase tracking-wider text-slate-500">
                  #
                </th>

                <th className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500">
                  Student
                </th>

                <th className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500">
                  Course Title
                </th>

                <th className="px-6 py-3.5 text-center text-xs font-bold uppercase tracking-wider text-slate-500">
                  Enrollment Date
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-sm">
              {studentCount === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12">
                    <EmptySection
                      imageSrc={assets.student}
                      title="No Students Enrolled Yet"
                      description="No students have enrolled in your courses yet. Keep creating quality content and they will come!"
                      size="md"
                    />
                  </td>
                </tr>
              ) : (
                enrolledStudents.map((item, index) => {
                  const student = item?.student || {};
                  const studentName = student.name || "Unknown Student";

                  return (
                    <tr
                      key={`${student._id || student.id || studentName}-${item.courseTitle}-${item.purchaseDate}`}
                      className="transition-colors duration-150 hover:bg-slate-50/70"
                    >
                      {/* Number */}
                      <td className="px-6 py-4 text-center text-xs font-medium text-slate-400">
                        {String(index + 1).padStart(2, "0")}
                      </td>

                      {/* Student */}
                      <td className="px-6 py-4">
                        <div className="flex min-w-0 items-center gap-3.5">
                          {student.imageUrl ? (
                            <img
                              src={student.imageUrl}
                              alt={studentName}
                              loading="lazy"
                              className="h-10 w-10 flex-shrink-0 rounded-full border border-slate-200/80 object-cover bg-slate-100"
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                              }}
                            />
                          ) : (
                            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-slate-200/80 bg-slate-100 text-sm font-semibold text-slate-500">
                              {studentName.charAt(0).toUpperCase()}
                            </div>
                          )}

                          <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-800">
                              {studentName}
                            </p>

                            {student.email && (
                              <p className="mt-0.5 truncate text-xs text-slate-400">
                                {student.email}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Course */}
                      <td className="max-w-md px-6 py-4">
                        <p
                          title={item.courseTitle}
                          className="line-clamp-2 font-medium leading-snug text-slate-700"
                        >
                          {item.courseTitle || "Untitled Course"}
                        </p>
                      </td>

                      {/* Enrollment Date */}
                      <td className="whitespace-nowrap px-6 py-4 text-center text-xs font-medium text-slate-500">
                        {formatDate(item.purchaseDate)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        {studentCount > 0 && (
          <div className="border-t border-slate-200/70 bg-slate-50/40 px-6 py-3">
            <p className="text-xs font-medium text-slate-400">
              Showing {studentCount}{" "}
              {studentCount === 1 ? "enrolled student" : "enrolled students"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default StudentsEnrolled;
