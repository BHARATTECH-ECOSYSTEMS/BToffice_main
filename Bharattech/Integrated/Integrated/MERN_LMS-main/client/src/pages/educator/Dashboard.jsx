import React, { useCallback, useEffect, useState } from "react";
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

  const fetchDashboardData = useCallback(
    async ({ showLoader = false } = {}) => {
      try {
        if (showLoader) setLoading(true);
        const token = await getToken();

        const { data } = await axios.get(
          `${backendUrl}/api/educator/dashboard`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

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
    },
    [backendUrl, getToken],
  );

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

  const formattedEarnings =
    typeof dashboardData.totalEarnings === "number"
      ? dashboardData.totalEarnings.toLocaleString()
      : dashboardData.totalEarnings;

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 pt-6 md:p-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200/80 pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Overview Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Monitor your course engagement, student enrollments, and revenue.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto bg-white px-3 py-1.5 rounded-full border border-slate-200/80 shadow-xs">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="text-xs font-medium text-slate-600">Live Sync</span>
        </div>
      </div>

      {/* Metric Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Total Enrollments */}
        <div className="group relative overflow-hidden bg-white rounded-2xl border border-slate-200/80 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-md transition-all duration-200">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition-transform group-hover:scale-105">
              <img
                src={assets.patients_icon}
                alt="Enrollments"
                className="h-6 w-6"
              />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Total Enrollments
              </p>
              <p className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 mt-0.5">
                {dashboardData.enrolledStudentsData?.length || 0}
              </p>
            </div>
          </div>
        </div>

        {/* Total Courses */}
        <div className="group relative overflow-hidden bg-white rounded-2xl border border-slate-200/80 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-md transition-all duration-200">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 transition-transform group-hover:scale-105">
              <img
                src={assets.appointments_icon}
                alt="Courses"
                className="h-6 w-6"
              />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Active Courses
              </p>
              <p className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 mt-0.5">
                {dashboardData.totalCourses || 0}
              </p>
            </div>
          </div>
        </div>

        {/* Total Earnings */}
        <div className="group relative overflow-hidden bg-white rounded-2xl border border-slate-200/80 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-md transition-all duration-200">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 transition-transform group-hover:scale-105">
              <img
                src={assets.earning_icon}
                alt="Earnings"
                className="h-6 w-6"
              />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Total Earnings
              </p>
              <p className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 mt-0.5">
                {currency || "$"} {formattedEarnings || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Latest Enrollments Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-tight text-slate-900">
            Latest Enrollments
          </h2>
          <span className="text-xs font-medium text-slate-500">
            Showing last {dashboardData.enrolledStudentsData?.length || 0}{" "}
            students
          </span>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200/80 bg-slate-50/75">
                  <th className="py-3.5 px-6 text-xs font-bold uppercase tracking-wider text-slate-500 w-16">
                    #
                  </th>
                  <th className="py-3.5 px-6 text-xs font-bold uppercase tracking-wider text-slate-500">
                    Student
                  </th>
                  <th className="py-3.5 px-6 text-xs font-bold uppercase tracking-wider text-slate-500">
                    Course Enrolled
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {!dashboardData.enrolledStudentsData ||
                dashboardData.enrolledStudentsData.length === 0 ? (
                  <tr>
                    <td colSpan="3" className="py-12">
                      <EmptySection
                        imageSrc={assets.cat}
                        title="No Recent Enrollments"
                        description="Once students enroll in your courses, they will appear here in real time."
                      />
                    </td>
                  </tr>
                ) : (
                  dashboardData.enrolledStudentsData.map((item, index) => {
                    const studentName =
                      item?.student?.name ||
                      item?.student?.fullName ||
                      "Student";
                    const initial = studentName.charAt(0).toUpperCase();

                    return (
                      <tr
                        key={index}
                        className="hover:bg-slate-50/70 transition-colors duration-150"
                      >
                        {/* Index */}
                        <td className="py-4 px-6 font-mono text-xs text-slate-400">
                          {String(index + 1).padStart(2, "0")}
                        </td>

                        {/* Student with Avatar */}
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700 shadow-xs">
                              {initial}
                            </div>
                            <span className="font-semibold text-slate-800">
                              {studentName}
                            </span>
                          </div>
                        </td>

                        {/* Course Name */}
                        <td className="py-4 px-6">
                          <span className="inline-flex items-center rounded-lg bg-indigo-50/70 px-3 py-1 text-xs font-medium text-indigo-700 border border-indigo-100/60">
                            {item?.courseTitle || "Untitled Course"}
                          </span>
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
    </div>
  );
}

export default Dashboard;
