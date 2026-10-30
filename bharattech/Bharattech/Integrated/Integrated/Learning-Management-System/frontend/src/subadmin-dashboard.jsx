import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import TopNav from "./components/topnav";
import Sidebar from "./components/sidebar";
import { useSidebar } from "./contexts/SidebarContext";
import "./index.css";
import { useAuth } from "./LMS/context/AuthContext";

import { getResetLinksByRole } from "./services/passwordResetService";
import {
  Plus,
  LogOut,
  FileText,
  Download,
  Edit,
  Trash2,
  AlertCircle,
  Users,
  CheckCircle,
  Clock,
  TrendingUp,
  ChevronDown,
  Upload,
  Link as LinkIcon
} from "lucide-react";

import { Input } from "./components/ui/input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent
} from "./components/ui/card";

import {
  getAssignedTasks,
  createTask,
  updateTask,
  deleteTask
} from "./services/taskService";
import { getUsers } from "./services/userService";

export default function SubadminDashboard() {
  const navigate = useNavigate();
  const { sidebarOpen } = useSidebar();

  const [tasks, setTasks] = useState([]);
  const [assignableUsers, setAssignableUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [resetLinks, setResetLinks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const { user: authUser, logout, hasRole } = useAuth();

  useEffect(() => {
    if (!authUser || !hasRole("subadmin")) {
      navigate("/subadmin-login");
      return;
    }
  }, [navigate, authUser, hasRole]);

  useEffect(() => {
    const token = localStorage.getItem("authToken") || localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }
    
    loadTasks();
    loadUsers();
    loadResetLinks();

    const handleResetLinksUpdate = () => {
      console.log("📢 Reset links update event received, reloading...");
      loadResetLinks();
    };
    window.addEventListener("resetLinksUpdated", handleResetLinksUpdate);

    return () => {
      window.removeEventListener("resetLinksUpdated", handleResetLinksUpdate);
    };
  }, [navigate, authUser]);

  const loadResetLinks = async () => {
    try {
      console.log("🔄 Loading reset links for subadmin...");
      const links = await getResetLinksByRole("subadmin");
      console.log(`✅ Loaded ${links.length} reset links for subadmin`);
      setResetLinks(links);
    } catch (error) {
      console.error("❌ Error loading reset links:", error);
      setResetLinks([]);
    }
  };

  const loadTasks = async () => {
    try {
      setIsLoading(true);
      console.log("📋 Loading tasks assigned by subadmin...");
      
      const all = await getAssignedTasks();
      console.log("✅ Received tasks from API:", all?.length || 0);
      
      // Normalize task data for display
      const normalizedTasks = (Array.isArray(all) ? all : []).map(task => ({
        id: task._id || task.id,
        _id: task._id || task.id,
        title: task.title,
        description: task.description,
        status: mapStatusToDisplay(task.status),
        assignedTo: task.assignedTo?._id || task.assignedTo,
        assignedName: task.assignedTo?.fullName || task.assignedTo?.name || task.assignedTo?.email || "Unknown",
        assignedEmail: task.assignedTo?.email || "",
        assignedBy: task.assignedBy?.fullName || task.assignedBy?.name || "Unknown",
        createdBy: task.createdBy || "subadmin",
        fileUrl: task.fileUrl,
        projectFile: task.projectFile,
        priority: task.priority || "Normal",
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
        dueDate: task.dueDate || task.createdAt
      }));
      
      normalizedTasks.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      console.log("✅ Normalized and sorted tasks:", normalizedTasks.length);
      
      setTasks(normalizedTasks);
    } catch (error) {
      console.error("❌ Error loading tasks:", error);
      console.error("Error details:", error.message);
      setTasks([]);
      // Don't show alert on load error, just log it
    } finally {
      setIsLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const token = localStorage.getItem("authToken") || localStorage.getItem("token") || localStorage.getItem("accessToken");
      if (!token) {
        console.warn("No token found for loading users");
        setAssignableUsers([]);
        return;
      }

      console.log("Fetching assignable users from API...");
      
      // Use new assignable users endpoint (returns only Subadmin, Employee, Intern)
      const { getAssignableUsers } = await import("./services/userService");
      const users = await getAssignableUsers();
      
      console.log("✅ Loaded assignable users from API:", users);
      console.log("Total assignable users:", Array.isArray(users) ? users.length : 0);
      
      if (!Array.isArray(users) || users.length === 0) {
        console.warn("No assignable users returned from API");
        setAssignableUsers([]);
        return;
      }

      // Filter to only employees and interns (for task assignment)
      const assignable = users.filter(user => {
        const role = (user.role || "").toString().toLowerCase();
        return role === "employee" || role === "intern";
      });
      
      console.log("✅ Assignable users (Employees & Interns):", assignable);
      console.log("Assignable count:", assignable.length);
      
      setAssignableUsers(assignable);
    } catch (error) {
      console.error("❌ Error loading users:", error);
      console.error("Error details:", error.message, error.stack);
      alert(`Failed to load users: ${error.message}. Please check console for details.`);
      setAssignableUsers([]);
    }
  };

  // Map backend status to display format
  const mapStatusToDisplay = (status) => {
    const statusMap = {
      "pending": "Pending",
      "in-progress": "In Progress",
      "completed": "Completed"
    };
    return statusMap[status?.toLowerCase()] || status || "Pending";
  };

  // Map display status to backend format
  const mapStatusToBackend = (status) => {
    const statusMap = {
      "Pending": "pending",
      "In Progress": "in-progress",
      "Completed": "completed"
    };
    return statusMap[status] || status?.toLowerCase() || "pending";
  };

  const handleLogout = () => {
    try { logout(); } catch (e) {}
    localStorage.removeItem("subadminLoggedIn");
    navigate("/login");
  };

  const openCreateModal = async () => {
    setSelectedTask(null);
    // Refresh users list when opening create modal to get latest users
    await loadUsers();
    setTaskModalOpen(true);
  };

  const openEditModal = (task) => {
    setSelectedTask(task);
    setTaskModalOpen(true);
  };

  const handleSaveTask = async (data) => {
    try {
      setIsLoading(true);
      
      // Validate required fields
      if (!data.title || !data.title.trim()) {
        alert("Please enter a task title.");
        setIsLoading(false);
        return;
      }

      // Find user by email to get their ID
      const assignedUser = assignableUsers.find(u => u.email === data.assignedEmail);
      
      if (!assignedUser && !selectedTask) {
        alert("Please select a user to assign the task to.");
        setIsLoading(false);
        return;
      }

      // Get user ID (prioritize _id as it's MongoDB ObjectId format)
      const userId = assignedUser?._id || assignedUser?.id;
      
      if (!userId && !selectedTask) {
        alert("Invalid user selected. Please try again.");
        setIsLoading(false);
        return;
      }

      // Validate that userId looks like a MongoDB ObjectId (24 hex characters)
      if (!selectedTask && userId && !/^[0-9a-fA-F]{24}$/.test(userId.toString())) {
        console.error("Invalid user ID format:", userId);
        alert("Invalid user ID format. Please select a user from the list.");
        setIsLoading(false);
        return;
      }

      console.log("💾 Saving task with data:", {
        title: data.title,
        description: data.description,
        assignedTo: userId,
        assignedUser: assignedUser?.name || assignedUser?.email,
        status: mapStatusToBackend(data.status || "Pending"),
        fileUrl: data.fileUrl
      });

      if (selectedTask) {
        // Update existing task
        console.log("📝 Updating task:", selectedTask.id || selectedTask._id);
        const updated = await updateTask(selectedTask.id || selectedTask._id, {
          title: data.title.trim(),
          description: data.description || "",
          status: mapStatusToBackend(data.status || selectedTask.status),
          assignedTo: userId || selectedTask.assignedTo,
          dueDate: data.dueDate || selectedTask.dueDate || null,
          priority: data.priority || selectedTask.priority || "Normal",
          fileUrl: data.fileUrl || selectedTask.fileUrl || null
        });
        console.log("✅ Task updated:", updated);
      } else {
        // Create new task
        console.log("➕ Creating new task");
        const created = await createTask({
          title: data.title.trim(),
          description: data.description || "",
          assignedTo: userId, // User ID (MongoDB ObjectId)
          status: mapStatusToBackend(data.status || "Pending"),
          dueDate: data.dueDate || null,
          priority: data.priority || "Normal",
          fileUrl: data.fileUrl || null
        });
        console.log("✅ Task created successfully:", created);
        
        if (!created || !created._id) {
          throw new Error("Task creation failed - no task ID returned");
        }
      }
      
      // Reload tasks to show the new/updated task
      console.log("🔄 Reloading tasks...");
      await loadTasks();
      
      setTaskModalOpen(false);
      setSelectedTask(null);
      alert("Task saved successfully!");
    } catch (error) {
      console.error("❌ Error saving task:", error);
      const errorMessage = error.message || "Unable to save task. Please check console for details.";
      alert(`Error: ${errorMessage}`);
      // Don't close modal on error so user can retry
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTask = async (task) => {
    if (!task) return;
    if (!confirm("Delete this task?")) return;

    try {
      setIsLoading(true);
      await deleteTask(task.id || task._id);
      await loadTasks();
    } catch (error) {
      console.error("Error deleting task:", error);
      alert("Unable to delete task.");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredTasks = tasks.filter((t) => {
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return (
      (t.title || "").toLowerCase().includes(s) ||
      (t.description || "").toLowerCase().includes(s) ||
      (t.assignedRole || "").toLowerCase().includes(s) ||
      (t.status || "").toLowerCase().includes(s)
    );
  });

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === "Completed" || t.status === "completed").length;
  const inProgress = tasks.filter((t) => t.status === "In Progress" || t.status === "in-progress").length;
  const performancePercent =
    totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  return (
    <>
      <TopNav />
      <Sidebar />

      <div
        className={`dashboard-container min-h-screen pt-[86px] duration-300 ${
          sidebarOpen ? "lg:pl-[220px]" : "lg:pl-0"
        }`}
      >
        <div className="flex flex-col lg:flex-row lg:pr-6">
          <main className="flex-1 p-3 sm:p-4 md:p-6 lg:p-8">

            {/* HEADER */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6 sm:mb-8">
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-gray-900">Sub-Admin Dashboard</h1>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">Create & assign tasks.</p>
              </div>

              <button
                onClick={handleLogout}
                className="px-3 sm:px-4 py-2 rounded-lg bg-red-50 text-red-600 text-xs sm:text-sm whitespace-nowrap flex-shrink-0 w-full sm:w-auto"
              >
                <LogOut className="w-4 h-4 inline mr-1" /> Logout
              </button>
            </div>

            {/* STATS */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-6 sm:mb-8 md:mb-10">
              <StatCard title="Total Tasks" value={totalTasks} Icon={Users} />
              <StatCard title="Completed" value={completedTasks} Icon={CheckCircle} />
              <StatCard title="In Progress" value={inProgress} Icon={Clock} />
              <StatCard title="Performance" value={`${performancePercent}%`} Icon={TrendingUp} />
            </div>

            {/* ACTION BAR */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 mb-6">
              <button
                onClick={openCreateModal}
                className="inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition w-full sm:w-auto"
              >
                <Plus className="w-4 h-4" /> 
                <span>Create Task</span>
              </button>

              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search tasks..."
                className="w-full sm:max-w-sm text-sm sm:text-base"
              />
            </div>

            {/* TASK TABLE */}
            <Card className="shadow rounded-xl mb-6">
              <CardHeader className="px-4 sm:px-6 py-3 sm:py-4">
                <CardTitle className="text-base sm:text-lg font-bold flex flex-col sm:flex-row sm:justify-between gap-2">
                  <span>Tasks</span>
                  <span className="text-xs sm:text-sm text-gray-500">{filteredTasks.length} result(s)</span>
                </CardTitle>
              </CardHeader>

              <CardContent className="p-0">
                {filteredTasks.length === 0 ? (
                  <p className="text-center py-10 text-sm text-gray-500">No tasks found.</p>
                ) : (
                  <>
                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 text-gray-700">
                            <th className="p-3 lg:p-4 text-left text-xs font-semibold">Title</th>
                            <th className="p-3 lg:p-4 text-left text-xs font-semibold">Assigned To</th>
                            <th className="p-3 lg:p-4 text-left text-xs font-semibold">Created By</th>
                            <th className="p-3 lg:p-4 text-left text-xs font-semibold">Status</th>
                            <th className="p-3 lg:p-4 text-left text-xs font-semibold">Due</th>
                            <th className="p-3 lg:p-4 text-left text-xs font-semibold">Uploads</th>
                            <th className="p-3 lg:p-4 text-left text-xs font-semibold">Actions</th>
                          </tr>
                        </thead>

                        <tbody>
                          {filteredTasks.map((task) => (
                            <tr key={task.id} className="hover:bg-gray-50 transition-colors">
                              <td className="p-3 lg:p-4">
                                <div className="font-semibold text-sm">{task.title}</div>
                                {task.description && (
                                  <div className="text-xs text-gray-500 mt-1">{task.description}</div>
                                )}
                              </td>

                              <td className="p-3 lg:p-4 text-sm text-gray-900">{task.assignedName || "—"}</td>

                              <td className="p-3 lg:p-4">
                                <span
                                  className={`px-2 py-1 text-xs rounded-full ${
                                    (task.createdBy || "").toString().toLowerCase() === "admin"
                                      ? "bg-blue-100 text-blue-700"
                                      : "bg-blue-100 text-blue-700"
                                  }`}
                                >
                                  {(task.createdBy || "").toString().toLowerCase() === "admin" ? "Admin" : "Subadmin"}
                                </span>
                              </td>

                              <td className="p-3 lg:p-4">
                                <span
                                  className={`px-2 py-1 text-xs rounded-full ${
                                    task.status === "Completed"
                                      ? "bg-green-100 text-green-700"
                                      : task.status === "In Progress"
                                      ? "bg-blue-100 text-blue-700"
                                      : "bg-gray-100 text-gray-700"
                                  }`}
                                >
                                  {task.status}
                                </span>
                              </td>

                              <td className="p-3 lg:p-4 text-xs sm:text-sm text-gray-600">
                                {task.dueDate ? new Date(task.dueDate).toLocaleString() : "—"}
                              </td>

                              <td className="p-3 lg:p-4">
                                {task.projectFile ? (
                                  <a
                                    href={task.projectFile.fileUrl}
                                    download={task.projectFile.name}
                                    className="text-blue-600 underline text-xs sm:text-sm break-all hover:text-blue-700"
                                  >
                                    {task.projectFile.name}
                                  </a>
                                ) : (
                                  <span className="text-gray-400 text-xs">No file</span>
                                )}
                              </td>

                              <td className="p-3 lg:p-4">
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => openEditModal(task)}
                                    className="text-blue-600 hover:text-blue-700 text-xs flex items-center gap-1 transition-colors"
                                  >
                                    <Edit className="w-3 h-3" /> <span className="hidden lg:inline">Edit</span>
                                  </button>
                                  <button
                                    onClick={() => handleDeleteTask(task)}
                                    className="text-red-600 hover:text-red-700 text-xs flex items-center gap-1 transition-colors"
                                  >
                                    <Trash2 className="w-3 h-3" /> <span className="hidden lg:inline">Delete</span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Card View */}
                    <div className="md:hidden space-y-3 p-3 sm:p-4">
                      {filteredTasks.map((task) => (
                        <div
                          key={task.id}
                          className="bg-white rounded-xl p-3 sm:p-4 shadow-sm"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1 min-w-0 pr-2">
                              <h3 className="font-semibold text-sm text-gray-900 mb-1 break-words">
                                {task.title}
                              </h3>
                              {task.description && (
                                <p className="text-xs text-gray-500 line-clamp-2 break-words">
                                  {task.description}
                                </p>
                              )}
                            </div>
                            <div className="flex gap-1.5 sm:gap-2 flex-shrink-0">
                              <button
                                onClick={() => openEditModal(task)}
                                className="text-blue-600 hover:text-blue-700 p-1.5 sm:p-1 transition-colors"
                                aria-label="Edit task"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteTask(task)}
                                className="text-red-600 hover:text-red-700 p-1.5 sm:p-1 transition-colors"
                                aria-label="Delete task"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          <div className="space-y-2 pt-3">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs text-gray-500 flex-shrink-0">Assigned To</span>
                              <span className="text-xs font-medium text-gray-900 text-right break-words">
                                {task.assignedName || "—"}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs text-gray-500 flex-shrink-0">Created By</span>
                              <span
                                className={`px-2 py-1 text-xs rounded-full flex-shrink-0 ${
                                  (task.createdBy || "").toString().toLowerCase() === "admin"
                                    ? "bg-blue-100 text-blue-700"
                                    : "bg-blue-100 text-blue-700"
                                }`}
                              >
                                {(task.createdBy || "").toString().toLowerCase() === "admin" ? "Admin" : "Subadmin"}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs text-gray-500 flex-shrink-0">Status</span>
                              <span
                                className={`px-2 py-1 text-xs rounded-full flex-shrink-0 ${
                                  task.status === "Completed"
                                    ? "bg-green-100 text-green-700"
                                    : task.status === "In Progress"
                                    ? "bg-blue-100 text-blue-700"
                                    : "bg-gray-100 text-gray-700"
                                }`}
                              >
                                {task.status}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs text-gray-500 flex-shrink-0">Due Date</span>
                              <span className="text-xs text-gray-600 text-right break-words">
                                {task.dueDate ? new Date(task.dueDate).toLocaleString() : "—"}
                              </span>
                            </div>
                            <div className="flex items-start justify-between gap-2">
                              <span className="text-xs text-gray-500 flex-shrink-0">Uploads</span>
                              {task.projectFile ? (
                                <a
                                  href={task.projectFile.fileUrl}
                                  download={task.projectFile.name}
                                  className="text-blue-600 underline text-xs break-all text-right max-w-[70%] hover:text-blue-700"
                                >
                                  {task.projectFile.name}
                                </a>
                              ) : (
                                <span className="text-gray-400 text-xs">No file</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* FILE VISIBILITY NOTE */}
            <div className="text-xs text-gray-500 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5" />
              Uploaded documents are visible to employees and interns.
            </div>

            {/* RESET LINKS SECTION */}
            <div className="mt-4 sm:mt-6 md:mt-10 bg-white shadow rounded-lg p-3 sm:p-4 md:p-6">
              <h2 className="text-sm sm:text-base md:text-lg font-semibold flex items-center gap-2">
                <LinkIcon className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500 flex-shrink-0" />
                <span>Your Password Reset Links</span>
              </h2>

              {resetLinks.length === 0 ? (
                <p className="text-xs sm:text-sm text-gray-500 mt-2 sm:mt-3">No reset links found.</p>
              ) : (
                <div className="mt-3 sm:mt-4 space-y-2 sm:space-y-3 md:space-y-4">
                  {resetLinks.map((link) => (
                    <div key={link.id} className="bg-gray-50 p-2.5 sm:p-3 md:p-4 rounded-lg">
                      <p className="font-medium text-xs sm:text-sm md:text-base text-gray-900 break-words">{link.userEmail}</p>
                      <a href={link.link} target="_blank" rel="noreferrer" className="text-blue-600 underline break-all text-[10px] sm:text-xs md:text-sm block mt-1.5 sm:mt-2 hover:text-blue-700">
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
          </main>
        </div>
      </div>

      {/* MODAL */}
      {taskModalOpen && (
        <TaskModal
          initial={selectedTask}
          assignableUsers={assignableUsers}
          onClose={() => { setTaskModalOpen(false); setSelectedTask(null); }}
          onSave={handleSaveTask}
        />
      )}
    </>
  );
}

/* ---------- Stat Card ---------- */
function StatCard({ title, value, Icon }) {
  return (
    <div className="bg-white shadow-sm p-3 sm:p-4 md:p-5 rounded-xl border">
      <div className="flex justify-between items-center">
        <div className="min-w-0 flex-1">
          <p className="text-xs sm:text-sm text-gray-500 truncate">{title}</p>
          <p className="text-xl sm:text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-50 rounded-lg flex items-center justify-center flex-shrink-0 ml-2">
          <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
        </div>
      </div>
    </div>
  );
}

/* ---------- CREATE / EDIT TASK MODAL ---------- */
function TaskModal({ initial = null, assignableUsers = [], onClose, onSave, onRefreshUsers }) {
  const [title, setTitle] = useState(initial?.title || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [dueDate, setDueDate] = useState(initial?.dueDate ? new Date(initial.dueDate).toISOString().slice(0, 16) : "");
  const [priority, setPriority] = useState(initial?.priority || "");
  const [assignedEmail, setAssignedEmail] = useState(initial?.assignedEmail || "");
  const [projectFile, setProjectFile] = useState(initial?.projectFile || null);

  // Update form when initial task changes
  useEffect(() => {
    if (initial) {
      setTitle(initial.title || "");
      setDescription(initial.description || "");
      setDueDate(initial.dueDate ? new Date(initial.dueDate).toISOString().slice(0, 16) : "");
      setPriority(initial.priority || "");
      setAssignedEmail(initial.assignedEmail || "");
      setProjectFile(initial.projectFile || null);
    } else {
      setTitle("");
      setDescription("");
      setDueDate("");
      setPriority("");
      setAssignedEmail("");
      setProjectFile(null);
    }
  }, [initial]);

  const handleFileUpload = (file) => {
    if (!file) return;
    setProjectFile({
      name: file.name,
      fileUrl: URL.createObjectURL(file),
      uploadedAt: new Date().toISOString()
    });
  };

  const handleSubmit = () => {
    if (!title.trim()) {
      alert("Please enter a task title.");
      return;
    }

    if (!assignedEmail && !initial) {
      alert("Please select a user to assign the task to.");
      return;
    }

    const user = assignableUsers.find(u => u.email === assignedEmail);

    onSave({
      title: title.trim(),
      description: description.trim(),
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      priority,
      assignedName: user?.name || initial?.assignedName || null,
      assignedRole: user?.role || initial?.assignedRole || null,
      assignedEmail: assignedEmail || initial?.assignedEmail || null,
      fileUrl: projectFile?.fileUrl || initial?.fileUrl || null,
      status: initial?.status || "Pending"
    });
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 relative">

        <div className="flex justify-center mb-5">
          <h3 className="text-xl font-bold">{initial ? "Edit Task" : "Create Task"}</h3>
          <button onClick={onClose} className="absolute right-6 top-6 text-gray-500">✕</button>
        </div>

        {/* FORM */}
        <div className="space-y-4">

          {/* Title */}
          <div>
            <label className="text-sm font-medium">Title</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full border mt-1 px-3 py-2 rounded-md"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-medium">Description</label>
            <textarea
              rows={3}
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full border mt-1 px-3 py-2 rounded-md"
            />
          </div>

          {/* Due + Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Due Date</label>
              <input
                type="datetime-local"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="w-full border mt-1 px-3 py-2 rounded-md"
              />
            </div>

            <div className="relative">
              <label className="text-sm font-medium">Priority</label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value)}
                className="w-full border mt-1 px-3 py-2 rounded-md appearance-none pr-8"
              >
                <option value="">Normal</option>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
              <ChevronDown className="w-5 h-5 absolute right-3 top-9 text-gray-400" />
            </div>
          </div>

          {/* Assign To */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium">Assign To <span className="text-red-500">*</span></label>
              <button
                type="button"
                onClick={async () => {
                  console.log("Manual refresh triggered");
                  await loadUsers();
                }}
                className="text-xs text-blue-600 hover:text-blue-800 underline"
                title="Refresh user list"
              >
                Refresh
              </button>
            </div>
            <div className="relative">
              <select
                value={assignedEmail}
                onChange={(e) => setAssignedEmail(e.target.value)}
                className="w-full border mt-1 px-3 py-2 rounded-md appearance-none pr-8"
                required
              >
                <option value="">— Select User —</option>
                {assignableUsers.length === 0 ? (
                  <option value="" disabled>No users available. Please create users first.</option>
                ) : (
                  assignableUsers.map((u) => {
                    const displayName = u.name || u.fullName || u.email || "Unknown";
                    const displayRole = u.role || "Unknown";
                    return (
                      <option key={u.id || u._id || u.email} value={u.email}>
                        {displayName} — {displayRole}
                  </option>
                    );
                  })
                )}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
            {assignableUsers.length === 0 ? (
              <p className="text-xs text-red-500 mt-1">
                No assignable users found. Users must be created in Admin Dashboard first with role "Employee" or "Intern".
              </p>
            ) : (
              <p className="text-xs text-gray-500 mt-1">
                {assignableUsers.length} user{assignableUsers.length !== 1 ? 's' : ''} available
              </p>
            )}
          </div>

          {/* Upload Document */}
          <div>
            <label className="text-sm font-medium">Upload Task Document</label>

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-5 text-center mt-1 hover:border-blue-500">
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />

              <p className="text-xs text-gray-600">PDF / DOCX / ZIP allowed</p>

              <label className="mt-2 px-4 py-2 bg-blue-500 text-white rounded-md cursor-pointer">
                Browse File
                <input
                  type="file"
                  accept=".pdf,.docx,.zip"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e.target.files[0])}
                />
              </label>

              {projectFile && (
                <p className="text-xs text-green-600 mt-2">
                  Uploaded: {projectFile.name}
                </p>
              )}
            </div>
          </div>

          {/* BUTTONS */}
          <div className="flex justify-end gap-3 pt-4">
            <button className="px-4 py-2 border rounded-md" onClick={onClose}>
              Cancel
            </button>
            <button
              className="px-4 py-2 bg-blue-500 rounded-md text-white"
              onClick={handleSubmit}
            >
              Save
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
