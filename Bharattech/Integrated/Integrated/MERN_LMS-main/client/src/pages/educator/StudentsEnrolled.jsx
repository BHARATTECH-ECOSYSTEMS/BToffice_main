import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import Loading from "../../components/students/Loading";
import { useAppConfig } from "../../context/AppContext";
import { useAuth } from "../../context/AuthContext";
import EmptySection from "../../components/common/EmptySection";
import { assets } from "../../assets/assets";

function StudentsEnrolled() {
  const [enrolledStudents, setEnrolledStudents] = useState(null);
  const [loading, setLoading] = useState(true);
  const { backendUrl } = useAppConfig();
  const { getToken, isEducator } = useAuth();

  const fetchEnrolledStudents = useCallback(async ({ showLoader = false } = {}) => {
    try {
      if (showLoader) setLoading(true);
      const token = await getToken();
      const { data } = await axios.get(
        `${backendUrl}/api/educator/enrolled-students`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (data.status === "success") {
        setEnrolledStudents(data.data.enrolledStudents || []);
      } else {
        setEnrolledStudents([]);
      }
    } catch {
      setEnrolledStudents([]);
    } finally {
      setLoading(false);
    }
  }, [backendUrl, getToken]);

  useEffect(() => {
    if (!isEducator) {
      setEnrolledStudents([]);
      setLoading(false);
      return;
    }

    fetchEnrolledStudents({ showLoader: true });

    const refreshOnFocus = () => fetchEnrolledStudents();
    const refreshInterval = window.setInterval(fetchEnrolledStudents, 15000);

    window.addEventListener("focus", refreshOnFocus);
    return () => {
      window.removeEventListener("focus", refreshOnFocus);
      window.clearInterval(refreshInterval);
    };
  }, [fetchEnrolledStudents, isEducator]);

  if (loading || !enrolledStudents) return <Loading />;

  return (
    <div className="min-h-screen flex flex-col items-start justify-between p-4 pt-8 md:p-8 md:pb-0">
      <div className="flex w-full max-w-4xl flex-col items-center overflow-hidden rounded-md border border-gray-500/20 bg-white">
        <table className="table-fixed w-full overflow-hidden pb-4 md:table-auto">
          <thead className="border-b border-gray-500/20 text-left text-sm text-gray-900">
            <tr>
              <th className="hidden px-4 py-3 text-center font-semibold sm:table-cell">
                #
              </th>
              <th className="px-4 py-3 font-semibold">Student Name</th>
              <th className="px-4 py-3 font-semibold">Course Title</th>
              <th className="hidden px-4 py-3 font-semibold sm:table-cell">
                Date
              </th>
            </tr>
          </thead>
          <tbody className="text-sm text-gray-500">
            {enrolledStudents.length === 0 ? (
              <tr>
                <td colSpan="4" className="p-0">
                  <EmptySection
                    imageSrc={assets.student}
                    title="No Students Enrolled Yet"
                    description="No students have enrolled in your courses yet. Keep creating quality content and they will come!"
                    size="md"
                  />
                </td>
              </tr>
            ) : (
              enrolledStudents.map((item, index) => (
                <tr key={index} className="border-b border-gray-500/20">
                  <td className="hidden px-4 py-3 text-center sm:table-cell">
                    {index + 1}
                  </td>
                  <td className="flex items-center space-x-3 px-2 py-3 md:px-4">
                    <img
                      src={item.student.imageUrl}
                      alt="Student"
                      className="h-9 w-8 rounded-full"
                    />
                    <span className="truncate">{item.student.name}</span>
                  </td>
                  <td className="truncate px-4 py-3">{item.courseTitle}</td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    {new Date(item.purchaseDate).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default StudentsEnrolled;
