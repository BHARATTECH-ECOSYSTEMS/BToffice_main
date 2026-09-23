import { useState } from "react";
import { getAssignedTasks, createTask, updateTask, deleteTask } from "../services/taskService";
import { getAssignableUsers } from "../services/userService";

export function useAdminTasks() {
  const [tasks, setTasks] = useState([]);
  const [assignableUsers, setAssignableUsers] = useState([]);
  const [taskSearchTerm, setTaskSearchTerm] = useState("");
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [isTaskLoading, setIsTaskLoading] = useState(false);

  const loadAssignableUsers = async () => {
    try {
      const u = await getAssignableUsers();
      setAssignableUsers((Array.isArray(u) ? u : []).filter(user => {
        const r = (user.role || "").toString().toLowerCase();
        return r === "employee" || r === "intern";
      }));
    } catch {
      setAssignableUsers([]);
    }
  };

  const loadTasks = async () => {
    try {
      setIsTaskLoading(true);
      const all = await getAssignedTasks();
      const list = (Array.isArray(all) ? all : []).map(task => ({
        id: task._id || task.id,
        title: task.title,
        description: task.description,
        status: task.status === "completed" ? "Completed" : task.status === "in-progress" ? "In Progress" : "Pending",
        assignedTo: task.assignedTo?._id || task.assignedTo,
        assignedName: task.assignedTo?.fullName || task.assignedTo?.name || task.assignedTo?.email || "—",
        assignedEmail: task.assignedTo?.email || task.assignedEmail || "",
        createdBy: task.createdBy || "subadmin",
        dueDate: task.dueDate || task.createdAt,
        priority: task.priority || "Normal",
        createdAt: task.createdAt,
        updatedAt: task.updatedAt
      }));
      list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      setTasks(list);
    } catch {
      setTasks([]);
    } finally {
      setIsTaskLoading(false);
    }
  };

  const handleSaveTask = async (data) => {
    try {
      setIsTaskLoading(true);
      const assignedUser = assignableUsers.find(u => u.email === data.assignedEmail);
      const payload = {
        title: data.title?.trim(),
        description: data.description || "",
        status: (data.status || "pending").toLowerCase(),
        dueDate: data.dueDate || null,
        priority: data.priority || "Normal",
        assignedTo: assignedUser?._id || assignedUser?.id || selectedTask?.assignedTo,
      };
      if (selectedTask) {
        await updateTask(selectedTask.id, payload);
      } else {
        await createTask(payload);
      }
      await loadTasks();
      setTaskModalOpen(false);
      setSelectedTask(null);
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setIsTaskLoading(false);
    }
  };

  const handleDeleteTask = async (task) => {
    if (!task || !confirm("Delete this task?")) return;
    try {
      setIsTaskLoading(true);
      await deleteTask(task.id || task._id);
      await loadTasks();
    } finally {
      setIsTaskLoading(false);
    }
  };

  const filteredTasks = tasks.filter(t => {
    if (!taskSearchTerm) return true;
    const s = taskSearchTerm.toLowerCase();
    return (t.title || "").toLowerCase().includes(s) || (t.assignedName || "").toLowerCase().includes(s);
  });

  return {
    tasks,
    filteredTasks,
    taskSearchTerm,
    setTaskSearchTerm,
    assignableUsers,
    taskModalOpen,
    setTaskModalOpen,
    selectedTask,
    setSelectedTask,
    isTaskLoading,
    loadTasks,
    loadAssignableUsers,
    handleSaveTask,
    handleDeleteTask
  };
}
