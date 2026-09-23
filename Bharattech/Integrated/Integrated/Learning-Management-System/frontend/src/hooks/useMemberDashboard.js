import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../LMS/context/AuthContext";
import { getResetLinksByRole } from "../services/passwordResetService";
import {
  getTasks,
  updateTaskStatus,
  addTaskFile
} from "../services/taskService";

export function useMemberDashboard({ role, loginPath, emailStorageKey, loggedInStorageKey }) {
  const navigate = useNavigate();
  const { user: authUser, logout, hasRole } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [resetLinks, setResetLinks] = useState([]);

  const memberEmail =
    authUser?.email ||
    localStorage.getItem("userEmail") ||
    localStorage.getItem(emailStorageKey) ||
    null;

  const loadResetLinks = useCallback(async () => {
    try {
      const links = await getResetLinksByRole(role);
      setResetLinks(links);
    } catch (error) {
      console.error("Error loading reset links:", error);
      setResetLinks([]);
    }
  }, [role]);

  const loadTasks = useCallback(async () => {
    setIsLoading(true);
    try {
      const all = await getTasks();
      const tasksArray = Array.isArray(all) ? all : [];
      const storedEmail =
        authUser?.email ||
        localStorage.getItem("userEmail") ||
        localStorage.getItem(emailStorageKey);
      
      const my = tasksArray.filter(t => {
        const assignedEmail = (t.assignedTo?.email || t.assignedEmail || "").toLowerCase();
        const userEmailNormalized = (storedEmail || "").toLowerCase();
        const assignedRole = (t.assignedTo?.role || t.assignedRole || "").toLowerCase();
        return (userEmailNormalized && assignedEmail === userEmailNormalized) || assignedRole === role.toLowerCase();
      });

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
        files: task.files,
        projectFile: task.projectFile,
        dueDate: task.dueDate,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt
      }));

      normalizedTasks.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      setTasks(normalizedTasks);
    } catch (error) {
      console.error("Error loading tasks:", error);
      setTasks([]);
    } finally {
      setIsLoading(false);
    }
  }, [authUser?.email, emailStorageKey, role]);

  useEffect(() => {
    const token =
      localStorage.getItem("authToken") ||
      localStorage.getItem("token") ||
      localStorage.getItem("accessToken");
    if (!token) {
      navigate("/login");
      return;
    }

    loadTasks();
    loadResetLinks();

    const handleResetLinksUpdate = () => {
      loadResetLinks();
    };
    window.addEventListener("resetLinksUpdated", handleResetLinksUpdate);
    return () => window.removeEventListener("resetLinksUpdated", handleResetLinksUpdate);
  }, [navigate, authUser, loadTasks, loadResetLinks]);

  const handleLogout = () => {
    try { logout(); } catch (e) {}
    localStorage.removeItem(loggedInStorageKey);
    localStorage.removeItem(emailStorageKey);
    navigate("/login");
  };

  const handleStatusChange = (taskId, newStatus) => {
    updateTaskStatus(taskId, newStatus);
    loadTasks();
  };

  const handleFileUpload = (taskId, file) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    addTaskFile(taskId, file.name, url, memberEmail);
    loadTasks();
    alert("File uploaded — Subadmin will see it.");
  };

  const progressPercent = () => {
    if (tasks.length === 0) return 0;
    const done = tasks.filter(t => t.status === "Completed").length;
    return Math.round((done / tasks.length) * 100);
  };

  return {
    tasks,
    isLoading,
    resetLinks,
    handleLogout,
    handleStatusChange,
    handleFileUpload,
    progressPercent
  };
}
