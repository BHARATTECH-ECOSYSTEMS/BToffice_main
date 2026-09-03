// ===================== EMPLOYEE DASHBOARD UPDATED ======================
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import TopNav from "./components/topnav";
import Sidebar from "./components/sidebar";
import { useSidebar } from "./contexts/SidebarContext";
import "./index.css";
import { useAuth } from "./LMS/context/AuthContext";
import { getResetLinksByRole } from "./services/passwordResetService";
import { Link as LinkIcon, FileText } from "lucide-react";

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent
} from "./components/ui/card";

import {
  Target,
  User,
  Upload,
  CheckCircle,
  Clock,
  TrendingUp,
  LogOut,
  Edit
} from "lucide-react";

import {
  getTasks,
  updateTaskStatus,
  addTaskFile
} from "./services/taskService";

export default function EmployeeDashboard() {
  const navigate = useNavigate();
  const { sidebarOpen } = useSidebar();

  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [resetLinks, setResetLinks] = useState([]);

  const employeeEmail = localStorage.getItem("employeeEmail") || null;

  const { user: authUser, logout, hasRole } = useAuth();

  useEffect(() => {
    if (!authUser || !hasRole("employee")) {
      navigate("/employee-login");
      return;
    }

    loadTasks();
    loadResetLinks();

    const handleResetLinksUpdate = () => {
      console.log("📢 Reset links update event received, reloading...");
      loadResetLinks();
    };
    window.addEventListener("resetLinksUpdated", handleResetLinksUpdate);
    return () => window.removeEventListener("resetLinksUpdated", handleResetLinksUpdate);
  }, [navigate, authUser, hasRole]);

  const loadResetLinks = async () => {
    try {
      console.log("🔄 Loading reset links for employee...");
      const links = await getResetLinksByRole("employee");
      console.log(`✅ Loaded ${links.length} reset links for employee`);
      setResetLinks(links);
    } catch (error) {
      console.error("❌ Error loading reset links:", error);
      setResetLinks([]);
    }
  };

  const loadTasks = async () => {
    setIsLoading(true);
    try {
      // getTasks() is async, so we need to await it
      const all = await getTasks();
      // Ensure we have an array before filtering
      const tasksArray = Array.isArray(all) ? all : [];
      
      // Filter tasks assigned to this employee (by email or role)
      const employeeEmail = localStorage.getItem("employeeEmail");
      const my = tasksArray.filter(t => {
        // Check if task is assigned to this employee
        const assignedEmail = t.assignedTo?.email || t.assignedEmail;
        const assignedRole = (t.assignedTo?.role || t.assignedRole || "").toLowerCase();
        return assignedEmail === employeeEmail || assignedRole === "employee";
      });
      
      // Normalize task data for display
      const normalizedTasks = my.map(task => ({
        id: task._id || task.id,
        _id: task._id || task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        assignedTo: task.assignedTo?._id || task.assignedTo,
        assignedName: task.assignedTo?.fullName || task.assignedTo?.name || task.assignedTo?.email || "Unknown",
        assignedEmail: task.assignedTo?.email || task.assignedEmail || "",
        assignedBy: task.assignedBy?.fullName || task.assignedBy?.name || "Unknown",
        fileUrl: task.fileUrl,
        projectFile: task.projectFile,
        dueDate: task.dueDate,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt
      }));
      
      // Sort by creation date (newest first)
      normalizedTasks.sort((a, b) => {
        const dateA = new Date(a.createdAt || 0);
        const dateB = new Date(b.createdAt || 0);
        return dateB - dateA;
      });
      
      setTasks(normalizedTasks);
    } catch (error) {
      console.error("Error loading tasks:", error);
      setTasks([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    try { logout(); } catch (e) {}
    localStorage.removeItem("employeeLoggedIn");
    localStorage.removeItem("employeeEmail");
    navigate("/login");
  };

  const handleStatusChange = (taskId, newStatus) => {
    updateTaskStatus(taskId, newStatus);
    loadTasks();
  };

  const handleFileUpload = (taskId, file) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    addTaskFile(taskId, file.name, url, employeeEmail);
    loadTasks();
    alert("File uploaded — Subadmin will see it.");
  };

  const progressPercent = () => {
    if (tasks.length === 0) return 0;
    const done = tasks.filter(t => t.status === "Completed").length;
    return Math.round((done / tasks.length) * 100);
  };

  return (
    <>
      <TopNav />
      <Sidebar />

      <div className={`dashboard-container min-h-screen pt-[72px] sm:pt-[86px] transition-all duration-300 overflow-x-hidden ${
        sidebarOpen ? "lg:pl-[220px]" : "lg:pl-0"
      }`}>

        <div className="flex flex-col lg:flex-row">
          <main className="flex-1 p-3 sm:p-4 md:p-6 lg:p-8">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6 md:mb-8">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                <div className="w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-blue-600 text-white rounded-lg sm:rounded-xl flex items-center justify-center shadow flex-shrink-0">
                  <User className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-gray-900 leading-tight">Employee Dashboard</h1>
                  <p className="text-[10px] sm:text-xs md:text-sm text-gray-600 mt-0.5 sm:mt-1 leading-tight">
                    View tasks, update status, and upload completed work.
                  </p>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-red-50 text-red-600 text-xs sm:text-sm whitespace-nowrap flex-shrink-0 w-full sm:w-auto flex items-center justify-center gap-1"
              >
                <LogOut className="w-3 h-3 sm:w-4 sm:h-4" /> 
                <span>Logout</span>
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4 lg:gap-6 mb-4 sm:mb-6 md:mb-8">
              <StatCard title="My Tasks" value={tasks.length} Icon={Target} />
              <StatCard title="Completed" value={tasks.filter(t => t.status === "Completed").length} Icon={CheckCircle} />
              <StatCard title="In Progress" value={tasks.filter(t => t.status === "In Progress").length} Icon={Clock} />
              <StatCard title="Performance" value={`${progressPercent()}%`} Icon={TrendingUp} />
            </div>

            {/* Tasks */}
            <Card className="mb-4 sm:mb-6">
              <CardHeader className="px-3 sm:px-4 md:px-6 py-3 sm:py-4">
                <CardTitle className="text-base sm:text-lg font-semibold">My Tasks (Employees)</CardTitle>
              </CardHeader>

              <CardContent className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 md:py-6">
                {isLoading ? (
                  <div className="py-10 text-center text-sm text-gray-500">Loading...</div>
                ) : tasks.length === 0 ? (
                  <div className="py-10 text-center text-sm text-gray-500">No tasks available.</div>
                ) : (
                  <div className="space-y-2 sm:space-y-3 md:space-y-4">
                    {tasks.map(task => (
                      <div key={task.id} className="p-2.5 sm:p-3 md:p-4 bg-gray-50 rounded-md flex flex-col sm:flex-row sm:justify-between gap-2.5 sm:gap-3 md:gap-4">
                        <div className="flex-1 min-w-0">

                          {/* Title + Status */}
                          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                            <div className="font-medium text-sm sm:text-base text-gray-900 break-words">{task.title}</div>
                            <StatusBadge status={task.status} />
                          </div>

                          {/* Description */}
                          {task.description && (
                            <div className="text-xs text-gray-500 mb-2 break-words">{task.description}</div>
                          )}

                          {/* Due Date */}
                          <div className="text-xs text-gray-500 mb-2">
                            Due: {task.dueDate ? new Date(task.dueDate).toLocaleString() : "—"}
                          </div>

                          {/* ================= PROJECT DOCUMENT (NEW) ================= */}
                          {task.projectFile && (
                            <div className="bg-white p-2 sm:p-3 rounded mb-2">
                              <div className="text-xs font-semibold mb-1">Project Document</div>
                              <div className="flex items-center gap-2 text-xs">
                                <FileText className="w-4 h-4 text-gray-600 flex-shrink-0" />
                                <a href={task.projectFile.fileUrl} download={task.projectFile.name} className="text-blue-600 underline break-all">
                                  {task.projectFile.name}
                                </a>
                              </div>
                            </div>
                          )}

                          {/* Uploaded Files */}
                          {Array.isArray(task.files) && task.files.length > 0 && (
                            <div className="space-y-1 mt-2">
                              {task.files.map((f, idx) => (
                                <div key={idx} className="flex items-center gap-2 text-xs">
                                  <FileText className="w-4 h-4 text-gray-500 flex-shrink-0" />
                                  <a href={f.url} target="_blank" rel="noreferrer" className="text-blue-600 underline break-all">
                                    {f.name}
                                  </a>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Assigned Person (Name only) */}
                          <div className="text-xs text-gray-500 mt-2">
                            Assigned To: {task.assignedName || "—"}
                          </div>

                        </div>

                        {/* Actions */}
                        <div className="flex flex-row sm:flex-col items-center sm:items-end gap-2 sm:gap-2 flex-shrink-0 pt-2 sm:pt-0">
                          <label className="text-green-500 cursor-pointer hover:text-green-600 transition-colors p-1.5 sm:p-1" title="Upload file" aria-label="Upload file">
                            <Upload className="w-5 h-5 sm:w-4 sm:h-4" />
                            <input
                              type="file"
                              className="hidden"
                              onChange={e => handleFileUpload(task.id, e.target.files[0])}
                              accept=".pdf,.docx,.zip,.png,.jpg"
                            />
                          </label>

                          <select
                            value={task.status}
                            onChange={e => handleStatusChange(task.id, e.target.value)}
                            className="text-xs px-2 sm:px-2 py-1.5 sm:py-1.5 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white min-w-[100px] sm:min-w-0"
                          >
                            <option value="Pending">Pending</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Completed">Completed</option>
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Reset Links */}
            <ResetLinksSection resetLinks={resetLinks} />
          </main>
        </div>
      </div>
    </>
  );
}

/* --- Small Components --- */
function StatCard({ title, value, Icon }) {
  return (
    <Card className="dashboard-stat-card p-2.5 sm:p-3 md:p-4 lg:p-6 rounded-xl">
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <div className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-900">{value}</div>
          <div className="text-[10px] sm:text-xs md:text-sm text-gray-600 truncate leading-tight">{title}</div>
        </div>
        <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 bg-blue-600 text-white rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0 ml-1.5 sm:ml-2">
          <Icon className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 lg:w-7 lg:h-7" />
        </div>
      </div>
    </Card>
  );
}

function StatusBadge({ status }) {
  return (
    <span className={`text-xs px-2 py-1 rounded-full ${
      status === "Completed"
        ? "bg-green-100 text-green-700"
        : status === "In Progress"
        ? "bg-blue-100 text-blue-700"
        : "bg-blue-100 text-blue-700"
    }`}>
      {status}
    </span>
  );
}

function ResetLinksSection({ resetLinks }) {
  return (
    <div className="mt-4 sm:mt-6 md:mt-10 bg-white shadow rounded-lg p-3 sm:p-4 md:p-6">
      <h2 className="text-sm sm:text-base md:text-lg font-semibold flex items-center gap-2">
        <LinkIcon className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500 flex-shrink-0" />
        <span>Your Password Reset Links</span>
      </h2>

      {resetLinks.length === 0 ? (
        <p className="text-xs sm:text-sm text-gray-500 mt-2 sm:mt-3">No reset links found.</p>
      ) : (
        <div className="mt-3 sm:mt-4 md:mt-5 space-y-2 sm:space-y-3 md:space-y-4">
          {resetLinks.map(link => (
            <div key={link.id} className="p-2.5 sm:p-3 md:p-4 rounded-lg bg-gray-50">
              <p className="font-medium text-xs sm:text-sm md:text-base text-gray-900 break-words">{link.userEmail}</p>
              <a href={link.link} target="_blank" rel="noreferrer" className="text-blue-600 underline break-all text-[10px] sm:text-xs md:text-sm block mt-1.5 sm:mt-2">
                {link.link}
              </a>
              <div className="text-[10px] sm:text-xs md:text-sm text-gray-600 flex gap-1.5 sm:gap-2 items-center mt-1.5 sm:mt-2">
                <Clock className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="break-words">Expires: {new Date(link.expiresAt).toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
