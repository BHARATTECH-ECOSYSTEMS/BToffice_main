import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../LMS/context/AuthContext";
import { getResetLinksByRole } from "../services/passwordResetService";
import { getAssignedTasks, createTask, updateTask, deleteTask } from "../services/taskService";
import { getAssignableUsers } from "../services/userService";

export function useSubadminDashboard() {
  const navigate = useNavigate();
  const { user: authUser, logout, hasRole } = useAuth();

  const [tasks, setTasks] = useState([]);
  const [assignableUsers, setAssignableUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [resetLinks, setResetLinks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);



  useEffect(() => {
    const token = localStorage.getItem("authToken") || localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    loadTasks();
    loadUsers();
    loadResetLinks();

    const handleResetLinksUpdate = () => loadResetLinks();
    window.addEventListener("resetLinksUpdated", handleResetLinksUpdate);
    return () => window.removeEventListener("resetLinksUpdated", handleResetLinksUpdate);
  }, [navigate, authUser]);

  const loadResetLinks = async () => {
    try {
      const links = await getResetLinksByRole("subadmin");
      setResetLinks(links || []);
    } catch {
      setResetLinks([]);
    }
  };

  const mapStatusToDisplay = (status) => {
    const map = { pending: "Pending", "in-progress": "In Progress", completed: "Completed" };
    return map[status?.toLowerCase()] || status || "Pending";
  };

  const mapStatusToBackend = (status) => {
    const map = { Pending: "pending", "In Progress": "in-progress", Completed: "completed" };
    return map[status] || status?.toLowerCase() || "pending";
  };

  const loadTasks = async () => {
    try {
      setIsLoading(true);
      const all = await getAssignedTasks();
      const normalized = (Array.isArray(all) ? all : []).map(task => ({
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
      normalized.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      setTasks(normalized);
    } catch {
      setTasks([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const users = await getAssignableUsers();
      if (Array.isArray(users)) {
        setAssignableUsers(users.filter(u => {
          const r = (u.role || "").toString().toLowerCase();
          return r === "employee" || r === "intern";
        }));
      }
    } catch {
      setAssignableUsers([]);
    }
  };

  const handleSaveTask = async (data) => {
    try {
      setIsLoading(true);
      if (!data.title?.trim()) {
        alert("Please enter a task title.");
        return;
      }
      const assignedUser = assignableUsers.find(u => u.email === data.assignedEmail);
      const userId = assignedUser?._id || assignedUser?.id;
      if (!userId && !selectedTask) {
        alert("Please select a user to assign the task to.");
        return;
      }

      if (selectedTask) {
        await updateTask(selectedTask.id || selectedTask._id, {
          title: data.title.trim(),
          description: data.description || "",
          status: mapStatusToBackend(data.status || selectedTask.status),
          assignedTo: userId || selectedTask.assignedTo,
          dueDate: data.dueDate || selectedTask.dueDate || null,
          priority: data.priority || selectedTask.priority || "Normal",
          fileUrl: data.fileUrl || selectedTask.fileUrl || null
        });
      } else {
        await createTask({
          title: data.title.trim(),
          description: data.description || "",
          assignedTo: userId,
          status: mapStatusToBackend(data.status || "Pending"),
          dueDate: data.dueDate || null,
          priority: data.priority || "Normal",
          fileUrl: data.fileUrl || null
        });
      }
      await loadTasks();
      setTaskModalOpen(false);
      setSelectedTask(null);
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm("Delete this task?")) return;
    try {
      setIsLoading(true);
      await deleteTask(taskId);
      await loadTasks();
    } catch {
      alert("Unable to delete task.");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredTasks = tasks.filter(t => {
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return (t.title || "").toLowerCase().includes(s) ||
      (t.description || "").toLowerCase().includes(s) ||
      (t.assignedName || "").toLowerCase().includes(s) ||
      (t.status || "").toLowerCase().includes(s);
  });

  return {
    tasks, filteredTasks, assignableUsers, searchTerm, setSearchTerm,
    taskModalOpen, setTaskModalOpen, selectedTask, setSelectedTask,
    resetLinks, isLoading, handleSaveTask, handleDeleteTask,
    loadUsers, logout, navigate
  };
}
