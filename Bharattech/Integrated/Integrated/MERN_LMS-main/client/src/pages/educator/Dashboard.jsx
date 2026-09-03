import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { useAppConfig } from "../../context/AppContext";
import { useAuth } from "../../context/AuthContext";
import { assets } from "../../assets/assets";
import Loading from "../../components/students/Loading";
import EmptySection from "../../components/common/EmptySection";

const emptyDashboard = {
  enrolledStudentsData: [],
  totalCourses: 0,
  totalEarnings: 0,
};

function Dashboard() {
  const { currency, backendUrl } = useAppConfig();
  const { isEducator, getToken } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = useCallback(async ({ showLoader = false } = {}) => {
    try {
      if (showLoader) setLoading(true);
      const token = await getToken();

      const { data } = await axios.get(`${backendUrl}/api/educator/dashboard`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (data.status === "success") {
        setDashboardData(data.data);
      } else {
        setDashboardData(emptyDashboard);
      }
    } catch {
      setDashboardData(emptyDashboard);
    } finally {
      setLoading(false);
    }
  }, [backendUrl, getToken]);

  useEffect(() => {
    if (!isEducator) {
      setLoading(false);
      setDashboardData(emptyDashboard);
      return;
    }

    fetchDashboardData({ showLoader: true });

    const refreshOnFocus = () => fetchDashboardData();
    const refreshInterval = window.setInterval(fetchDashboardData, 15000);

    window.addEventListener("focus", refreshOnFocus);
    return () => {
      window.removeEventListener("focus", refreshOnFocus);
      window.clearInterval(refreshInterval);
    };
  }, [fetchDashboardData, isEducator]);

  if (loading || !dashboardData) return <Loading />;

  return (
    <div className="min-h-screen flex flex-col gap-8 p-4 pt-8 md:p-8">
      <div className="flex flex-wrap gap-5">
        <div className="flex items-center gap-3 rounded-md border p-4 shadow-card">
          <img src={assets.patients_icon} alt="" />
          <div>
            <p className="text-2xl font-medium">
              {dashboardData.enrolledStudentsData.length}
            </p>
            <p>Total Enrollments</p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-md border p-4 shadow-card">
          <img src={assets.appointments_icon} alt="" />
          <div>
            <p className="text-2xl font-medium">{dashboardData.totalCourses}</p>
            <p>Total Courses</p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-md border p-4 shadow-card">
          <img src={assets.earning_icon} alt="" />
          <div>
            <p className="text-2xl font-medium">
              {currency} {dashboardData.totalEarnings}
            </p>
            <p>Total Earnings</p>
          </div>
        </div>
      </div>

      <div>
        <h2 className="pb-4 text-lg font-medium">Latest Enrollments</h2>
        <div className="overflow-hidden rounded-md border">
          <table className="w-full text-sm">
            <thead className="border-b">
              <tr>
                <th>#</th>
                <th>Student</th>
                <th>Course</th>
              </tr>
            </thead>
            <tbody>
              {dashboardData.enrolledStudentsData.length === 0 ? (
                <tr>
                  <td colSpan="3">
                    <EmptySection
                      imageSrc={assets.cat}
                      title="No Recent Enrollments"
                      description="No students enrolled yet"
                    />
                  </td>
                </tr>
              ) : (
                dashboardData.enrolledStudentsData.map((item, index) => (
                  <tr key={index}>
                    <td>{index + 1}</td>
                    <td>{item.student.name}</td>
                    <td>{item.courseTitle}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
