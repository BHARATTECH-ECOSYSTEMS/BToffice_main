import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import TopNav from "./components/topnav";
import Sidebar from "./components/sidebar";
import { useSidebar } from "./contexts/SidebarContext";
import "./index.css";
import { useAuth } from "./LMS/context/AuthContext";
import CertificateManagementModal from "./components/CertificateManagementModal";
import UserManagementModal from "./components/UserManagementModal";
import { getUsers, createUser, updateUser, deleteUser, getAssignableUsers } from "./services/userService";
import {
  getCertificates,
  createCertificate,
  updateCertificate,
  deleteCertificate,
  searchCertificates
} from "./services/certificateService";
import {
  getAssignedTasks,
  createTask,
  updateTask,
  deleteTask
} from "./services/taskService";

import {
  generateResetLink,
  getResetLinks
} from "./services/passwordResetService";

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent
} from "./components/ui/card";

import { Input } from "./components/ui/input";

import {
  Award,
  Key,
  Edit,
  Search,
  Copy,
  CheckCircle,
  LogOut,
  Shield,
  Users,
  Activity,
  Clock,
  MousePointer,
  FileText,
  ArrowUp,
  ArrowDown,
  Share2,
  User,
  Plus,
  Trash2,
  ChevronDown,
  Upload
} from "lucide-react";

import { Button } from "./components/ui/button";
import { Badge } from "./components/ui/badge";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { sidebarOpen } = useSidebar();

  const [certificates, setCertificates] = useState([]);
  const [filteredCertificates, setFilteredCertificates] = useState([]);
  const [certificateSearchTerm, setCertificateSearchTerm] = useState("");
  const [selectedCertificate, setSelectedCertificate] = useState(null);
  const [isCertificateModalOpen, setIsCertificateModalOpen] = useState(false);
  const [resetLinks, setResetLinks] = useState([]);
  const [selectedUserForReset, setSelectedUserForReset] = useState(null);
  const [copiedLink, setCopiedLink] = useState(null);
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [assignableUsers, setAssignableUsers] = useState([]);
  const [taskSearchTerm, setTaskSearchTerm] = useState("");
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);


  const { user: authUser, logout, hasRole } = useAuth();

  const normalizeRole = (role) => (role || "").toString().trim().toLowerCase().replace("-", "");

  const canDeleteUserByRole = (targetRole) => {
    const currentRole = normalizeRole(authUser?.role);
    const roleToDelete = normalizeRole(targetRole);

    if (currentRole === "superadmin") {
      return roleToDelete !== "superadmin";
    }

    if (currentRole === "admin") {
      return roleToDelete === "employee" || roleToDelete === "intern";
    }

    return false;
  };

  // Restrict access to admin only using AuthContext role when available
  useEffect(() => {
    if (!authUser || !hasRole("admin")) {
      navigate("/admin-login");
      return;
    }

    // only run loads when token exists
    const token = localStorage.getItem("authToken") || 
                  localStorage.getItem("token") || 
                  localStorage.getItem("accessToken");
    if (!token) {
      navigate("/login");
      return;
    }

    // safe initial load
    loadCertificates();
    loadUsers();
    loadResetLinks();
    loadTasks();
    loadAssignableUsers();
  }, [navigate, authUser]);

  // Search filter logic
  useEffect(() => {
    if (certificateSearchTerm) {
      const filtered = searchCertificates(certificateSearchTerm);
      setFilteredCertificates(filtered);
    } else {
      setFilteredCertificates(certificates);
    }
  }, [certificateSearchTerm, certificates]);

  const loadCertificates = async () => {
    try {
      const allCertificates = await getCertificates();
      setCertificates(Array.isArray(allCertificates) ? allCertificates : []);
      setFilteredCertificates(Array.isArray(allCertificates) ? allCertificates : []);
    } catch (error) {
      console.error("Error loading certificates:", error);
      setCertificates([]);
      setFilteredCertificates([]);
    }
  };
  
  // search filtering
  useEffect(() => {
    if (!Array.isArray(users)) {
      setFilteredUsers([]);
      return;
    }
    
  if (searchTerm) {
      const term = searchTerm.toLowerCase();
    const filtered = users.filter(user =>
        (user.name || user.fullName || "").toLowerCase().includes(term) ||
        (user.email || "").toLowerCase().includes(term) ||
        (user.role || "").toLowerCase().includes(term)
    );
    setFilteredUsers(filtered);
  } else {
    setFilteredUsers(users);
  }
}, [searchTerm, users]);


  const handleAddUser = () => {
      setSelectedUser(null);
      setIsModalOpen(true);
    };
  
    const handleEditUser = (user) => {
      setSelectedUser(user);
      setIsModalOpen(true);
    };
  
    const handleSaveUser = async (userData) => {
      try {
        setIsLoading(true);
        let saved;
        let resetLink = null;
        
        // Normalize role format for backend (capitalize first letter)
        const normalizeRole = (role) => {
          if (!role) return role;
          const roleMap = {
            "Employee": "Employee",
            "Intern": "Intern",
            "Subadmin": "Subadmin",
            "Admin": "Admin"
          };
          return roleMap[role.toLowerCase()] || role;
        };

        const normalizedUserData = {
          ...userData,
          role: normalizeRole(userData.role)
        };
        
        console.log("💾 Saving user data (MongoDB):", userData);
        
        if (selectedUser) {
          // Updating existing user
          console.log("📝 Updating user:", selectedUser.id);
          saved = await updateUser(selectedUser.id, normalizedUserData);
          if (saved) {
            // Reload users to get fresh data
            await loadUsers();
            alert("User updated successfully!");
            setIsModalOpen(false);
            setSelectedUser(null);
            return saved; // Return saved user data
          } else {
            throw new Error("Failed to update user");
          }
        } else {
          // Creating new user (MongoDB)
          console.log("➕ Creating new user in MongoDB:", normalizedUserData);
          saved = await createUser(normalizedUserData);
          console.log("✅ User created successfully:", saved);
          
          if (saved) {
            // Reload users to get fresh data
            await loadUsers();
            // Generate reset link for the new user based on their role
            resetLink = await generateResetLink(normalizedUserData.email, normalizedUserData.role);
            loadResetLinks(); // Refresh reset links list
            alert("User created successfully!");
            setIsModalOpen(false);
            setSelectedUser(null);
            // Return reset link if it was created
            return resetLink;
          } else {
            throw new Error("Failed to create user");
          }
        }
      } catch (error) {
        console.error("❌ Error saving user:", error);
        const errorMessage = error.message || "Error saving user. Please check console for details.";
        alert(errorMessage);
        // Don't close modal on error so user can retry
      } finally {
        setIsLoading(false);
      }
    };

    const loadUsers = async () => {
      setIsLoading(true);
      try {
        // Get ALL users from MongoDB (via API) - Admin can manage all users (Admin, Subadmin, Employee, Intern)
        const allUsers = await getUsers();
        const usersList = Array.isArray(allUsers) ? allUsers : [];
        setUsers(usersList);
        setFilteredUsers(usersList);
        console.log("✅ Loaded all users for admin management:", usersList.length);
        console.log("✅ Users breakdown:", {
          Admin: usersList.filter(u => (u.role || "").toString().toLowerCase() === "admin").length,
          Subadmin: usersList.filter(u => (u.role || "").toString().toLowerCase() === "subadmin").length,
          Employee: usersList.filter(u => (u.role || "").toString().toLowerCase() === "employee").length,
          Intern: usersList.filter(u => (u.role || "").toString().toLowerCase() === "intern").length
        });
      } catch (error) {
        console.error("Error loading users:", error);
        setUsers([]);
        setFilteredUsers([]);
      } finally {
        setIsLoading(false);
      }
    };

  
    const handleDeleteUser = async () => {
      if (!selectedUser) {
        alert("No user selected for deletion");
        return;
      }

      const confirmMessage = `Are you sure you want to delete "${selectedUser.name || selectedUser.email}"?\n\nThis action cannot be undone.`;
    if (!window.confirm(confirmMessage)) {
      return; // User cancelled
    }

    if (!canDeleteUserByRole(selectedUser.role)) {
      alert(
        normalizeRole(authUser?.role) === "superadmin"
          ? "Superadmin accounts cannot be deleted from here."
          : "Admins can delete only Employee and Intern accounts."
      );
      return;
    }

    try {
        setIsLoading(true);
        const success = await deleteUser(selectedUser.id || selectedUser._id);
        
        if (success) {
          // Update state immediately (remove deleted user from list)
          setUsers(prev => prev.filter(u => u.id !== selectedUser.id && u._id !== selectedUser._id));
          setFilteredUsers(prev => prev.filter(u => u.id !== selectedUser.id && u._id !== selectedUser._id));
          // Close modal and clear selection
          setIsModalOpen(false);
          setSelectedUser(null);
          alert("User deleted successfully");
        } else {
          alert("Failed to delete user");
        }
      } catch (error) {
        console.error("Delete user error:", error);
        alert(error.message || "Error deleting user. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };
  
    const handleCloseModal = () => {
      setIsModalOpen(false);
      setSelectedUser(null);
    };

  const loadResetLinks = async () => {
    try {
      const links = await getResetLinks();
      setResetLinks(links);
    } catch (error) {
      console.error("Error loading reset links:", error);
      setResetLinks([]);
    }
  };

  const handleAddCertificate = () => {
    setSelectedCertificate(null);
    setIsCertificateModalOpen(true);
  };

  const handleEditCertificate = (certificate) => {
    setSelectedCertificate(certificate);
    setIsCertificateModalOpen(true);
  };

  const handleSaveCertificate = async (certificateData) => {
    try {
      let saved;
      
      if (selectedCertificate) {
        saved = await updateCertificate(selectedCertificate.id, certificateData);
        if (saved) {
          // Replace updated certificate in state
          setCertificates(prev => prev.map(c => (c.id === saved.id || c._id === saved.id) ? saved : c));
          setFilteredCertificates(prev => prev.map(c => (c.id === saved.id || c._id === saved.id) ? saved : c));
        }
      } else {
        saved = await createCertificate(certificateData);
        if (saved) {
          // Prepend new certificate
          setCertificates(prev => [saved, ...prev]);
          setFilteredCertificates(prev => [saved, ...prev]);
        }
      }
      
      setIsCertificateModalOpen(false);
      setSelectedCertificate(null);
    } catch (error) {
      alert(error.message || "Error saving certificate");
    }
  };

  const handleDeleteCertificate = async () => {
    try {
      await deleteCertificate(selectedCertificate.id);
      await loadCertificates();
      setIsCertificateModalOpen(false);
      setSelectedCertificate(null);
    } catch (error) {
      alert(error.message || "Error deleting certificate");
    }
  };

  const handleGenerateResetLink = async (email, role) => {
    try {
      const resetLink = await generateResetLink(email, role);
      await loadResetLinks(); // Refresh reset links list
      setSelectedUserForReset({ email, role, link: resetLink });
      return resetLink; // Return the link so modal can display it
    } catch (error) {
      alert(error.message || "Error generating reset link");
      throw error; // Re-throw so modal can handle it
    }
  };

  const handleCopyLink = (link) => {
    navigator.clipboard.writeText(link);
    setCopiedLink(link);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const handleLogout = () => {
    try { logout(); } catch (e) {}
    localStorage.removeItem("loggedIn");
    navigate("/login");
  };

  // Task management functions
  const loadTasks = async () => {
    try {
      setIsLoading(true);
      const all = await getAssignedTasks();
      const normalizedTasks = (Array.isArray(all) ? all : []).map(task => ({
        id: task._id || task.id,
        _id: task._id || task.id,
        title: task.title,
        description: task.description,
        status: mapStatusToDisplay(task.status),
        assignedTo: task.assignedTo?._id || task.assignedTo,
        assignedName: task.assignedTo?.fullName || task.assignedTo?.name || task.assignedTo?.email || "Unknown",
        assignedEmail: task.assignedTo?.email || task.assignedEmail || "",
        assignedBy: task.assignedBy?.fullName || task.assignedBy?.name || "Unknown",
        createdBy: task.createdBy || "subadmin",
        fileUrl: task.fileUrl,
        projectFile: task.projectFile,
        dueDate: task.dueDate || task.createdAt,
        priority: task.priority || "Normal",
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
  };

  const loadAssignableUsers = async () => {
    try {
      const users = await getAssignableUsers();
      const assignable = (Array.isArray(users) ? users : []).filter(user => {
        const role = (user.role || "").toString().toLowerCase();
        return role === "employee" || role === "intern";
      });
      setAssignableUsers(assignable);
    } catch (error) {
      console.error("Error loading assignable users:", error);
      setAssignableUsers([]);
    }
  };

  const mapStatusToDisplay = (status) => {
    const statusMap = {
      "pending": "Pending",
      "in-progress": "In Progress",
      "completed": "Completed"
    };
    return statusMap[status?.toLowerCase()] || status || "Pending";
  };

  const mapStatusToBackend = (status) => {
    const statusMap = {
      "Pending": "pending",
      "In Progress": "in-progress",
      "Completed": "completed"
    };
    return statusMap[status] || status?.toLowerCase() || "pending";
  };

  const openCreateTaskModal = async () => {
    setSelectedTask(null);
    await loadAssignableUsers();
    setTaskModalOpen(true);
  };

  const openEditTaskModal = (task) => {
    setSelectedTask(task);
    setTaskModalOpen(true);
  };

  const handleSaveTask = async (data) => {
    try {
      setIsLoading(true);
      
      if (!data.title || !data.title.trim()) {
        alert("Please enter a task title.");
        setIsLoading(false);
        return;
      }

      const assignedUser = assignableUsers.find(u => u.email === data.assignedEmail);
      
      if (!assignedUser && !selectedTask) {
        alert("Please select a user to assign the task to.");
        setIsLoading(false);
        return;
      }

      const userId = assignedUser?._id || assignedUser?.id;
      
      if (!userId && !selectedTask) {
        alert("Invalid user selected. Please try again.");
        setIsLoading(false);
        return;
      }

      if (selectedTask) {
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
        const created = await createTask({
          title: data.title.trim(),
          description: data.description || "",
          assignedTo: userId,
          status: mapStatusToBackend(data.status || "Pending"),
          dueDate: data.dueDate || null,
          priority: data.priority || "Normal",
          fileUrl: data.fileUrl || null
        });
        console.log("✅ Task created successfully:", created);
      }
      
      await loadTasks();
      setTaskModalOpen(false);
      setSelectedTask(null);
      alert("Task saved successfully!");
    } catch (error) {
      console.error("❌ Error saving task:", error);
      alert(`Error: ${error.message || "Unable to save task."}`);
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
    if (!taskSearchTerm) return true;
    const s = taskSearchTerm.toLowerCase();
    return (
      (t.title || "").toLowerCase().includes(s) ||
      (t.description || "").toLowerCase().includes(s) ||
      (t.assignedName || "").toLowerCase().includes(s) ||
      (t.status || "").toLowerCase().includes(s)
    );
  });

  const totalCertificates = Array.isArray(certificates) ? certificates.length : 0;
  const activeCertificates = Array.isArray(certificates) ? certificates.filter(c => c.status === "Active").length : 0;
  const totalUsers = Array.isArray(users) ? users.length : 0;
  const totalResetLinks = Array.isArray(resetLinks) ? resetLinks.length : 0;

  return (
    <>
      <TopNav />
      <Sidebar />

      <div
        className={`min-h-screen pt-[72px] transition-all duration-300 overflow-x-hidden ${
          sidebarOpen ? "lg:pl-[220px]" : "lg:pl-0"
        } bg-gray-50`}
      >
        <main className="p-3 sm:p-4 md:p-6 lg:p-8 max-w-screen-xl mx-auto w-full">
                    {/* Page Title */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6 sm:mb-8">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
              </div>

              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Admin Dashboard</h1>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">Manage certificates and password resets</p>
              </div>
            </div>

            <Button
              onClick={handleLogout}
              variant="outline"
              className="text-red-600 hover:bg-red-50 flex items-center justify-center gap-2 px-4 w-full sm:w-auto"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>

          {/* ---------------- STAT CARDS (Clean LMS Style) ---------------- */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">

            {/* Total Certificates */}
            <div className="bg-white rounded-xl p-4 sm:p-5 shadow-sm flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                <Award className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500 font-medium">Total Certificates</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{totalCertificates}</p>
              </div>
            </div>

            {/* Active Certificates */}
            <div className="bg-white rounded-xl p-4 sm:p-5 shadow-sm flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500 font-medium">Active Certificates</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{activeCertificates}</p>
              </div>
            </div>

            {/* Total Users */}
            <div className="bg-white rounded-xl p-4 sm:p-5 shadow-sm flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                <Users className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500 font-medium">Total Users</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{totalUsers}</p>
              </div>
            </div>

            {/* Reset Links */}
            <div className="bg-white rounded-xl p-4 sm:p-5 shadow-sm flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                <Key className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500 font-medium">Reset Links</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{totalResetLinks}</p>
              </div>
            </div>
          </div>

          {/* ---------------- CERTIFICATE MANAGEMENT ---------------- */}
          <Card className="bg-white rounded-xl shadow-sm mb-8">
            <CardHeader className="px-4 sm:px-6 py-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3 flex-1 w-full">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <Award className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base sm:text-lg font-bold text-gray-900">
                      Certificate Management
                    </CardTitle>
                    <p className="text-xs text-gray-500 mt-1">
                      Manage and generate certificates
                    </p>
                  </div>
                </div>
                <Button
                  onClick={handleAddCertificate}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-sm flex-shrink-0 w-full sm:w-auto"
                >
                  <Plus className="w-4 h-4 inline mr-2" />
                  <span className="hidden sm:inline">Generate Certificate</span>
                  <span className="sm:hidden">Generate</span>
                </Button>
              </div>
            </CardHeader>

            <CardContent className="px-4 sm:px-6 py-4 sm:py-6">

              {/* Search bar */}
              <div className="mb-6 relative">
                <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />

                <Input
                  placeholder="Search certificates…"
                  value={certificateSearchTerm}
                  onChange={(e) => setCertificateSearchTerm(e.target.value)}
                  className="pl-10 sm:pl-12 border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
                />
              </div>

              {/* Empty State */}
              {filteredCertificates.length === 0 ? (
                <div className="text-center py-8 sm:py-12">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Award className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" />
                  </div>
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1">
                    No Certificates Found
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-500">
                    Try clearing the search or generate a new certificate.
                  </p>
                </div>
              ) : (
                <>
                  {/* Desktop Table View */}
                  <div className="hidden md:block overflow-x-auto rounded-xl bg-white shadow-sm">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                          <th className="py-3 px-4 lg:px-6 text-left text-xs font-semibold text-gray-500">
                          Certificate #
                        </th>
                          <th className="py-3 px-4 lg:px-6 text-left text-xs font-semibold text-gray-500">
                          Recipient
                        </th>
                          <th className="py-3 px-4 lg:px-6 text-left text-xs font-semibold text-gray-500">
                          Course
                        </th>
                          <th className="py-3 px-4 lg:px-6 text-left text-xs font-semibold text-gray-500">
                          Type
                        </th>
                          <th className="py-3 px-4 lg:px-6 text-left text-xs font-semibold text-gray-500">
                          Issue Date
                        </th>
                          <th className="py-3 px-4 lg:px-6 text-left text-xs font-semibold text-gray-500">
                          Status
                        </th>
                          <th className="py-3 px-4 lg:px-6 text-left text-xs font-semibold text-gray-500">
                          Actions
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredCertificates.map((cert) => (
                        <tr
                          key={cert.id}
                          className="hover:bg-gray-50"
                        >
                            <td className="py-4 px-4 lg:px-6 font-mono font-semibold text-gray-800 text-xs sm:text-sm">
                            {cert.certificateNumber}
                          </td>

                            <td className="py-4 px-4 lg:px-6">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-blue-200 flex items-center justify-center text-white font-bold flex-shrink-0">
                                {(cert.recipientName || "U").charAt(0).toUpperCase()}
                              </div>
                                <div className="min-w-0">
                                  <p className="font-medium text-gray-900 text-sm truncate">
                                  {cert.recipientName}
                                </p>
                                  <p className="text-xs text-gray-500 truncate">
                                  {cert.recipientEmail}
                                </p>
                              </div>
                            </div>
                          </td>

                            <td className="py-4 px-4 lg:px-6 text-gray-800 text-sm">
                            {cert.courseName}
                          </td>

                            <td className="py-4 px-4 lg:px-6">
                              <Badge className="bg-blue-100 text-blue-700 text-xs">
                              {cert.certificateType}
                            </Badge>
                          </td>

                            <td className="py-4 px-4 lg:px-6 text-gray-600 text-sm">
                            {new Date(cert.issueDate).toLocaleDateString()}
                          </td>

                            <td className="py-4 px-4 lg:px-6">
                            <Badge
                              className={
                                cert.status === "Active"
                                    ? "bg-green-100 text-green-700 border border-green-200 text-xs"
                                    : "bg-gray-100 text-gray-600 text-xs"
                              }
                            >
                              {cert.status}
                            </Badge>
                          </td>

                            <td className="py-4 px-4 lg:px-6">
                            <button
                              onClick={() => handleEditCertificate(cert)}
                                className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center gap-1"
                            >
                                <Edit className="w-4 h-4" />
                                <span className="hidden lg:inline">Edit</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                  {/* Mobile Card View */}
                  <div className="md:hidden space-y-4">
                    {filteredCertificates.map((cert) => (
                      <div
                        key={cert.id || cert._id}
                        className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="w-10 h-10 rounded-lg bg-blue-200 flex items-center justify-center text-white font-bold flex-shrink-0">
                              {(cert.recipientName || "U").charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-gray-900 text-sm truncate">
                                {cert.recipientName}
                              </p>
                              <p className="text-xs text-gray-500 truncate">
                                {cert.recipientEmail}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleEditCertificate(cert)}
                            className="text-blue-600 hover:text-blue-700 p-2 flex-shrink-0"
                          >
                            <Edit className="w-5 h-5" />
                          </button>
                        </div>
                        
                        <div className="space-y-2 pt-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">Certificate #</span>
                            <span className="text-xs font-mono font-semibold text-gray-800">
                              {cert.certificateNumber}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">Course</span>
                            <span className="text-xs font-medium text-gray-800">
                              {cert.courseName}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">Type</span>
                            <Badge className="bg-blue-100 text-blue-700 text-xs">
                              {cert.certificateType}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">Issue Date</span>
                            <span className="text-xs text-gray-600">
                              {new Date(cert.issueDate).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">Status</span>
                            <Badge
                              className={
                                cert.status === "Active"
                                  ? "bg-green-100 text-green-700 border border-green-200 text-xs"
                                  : "bg-gray-100 text-gray-600 border border-gray-200 text-xs"
                              }
                            >
                              {cert.status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Manage Team card */}
          <Card className="mb-6 bg-white rounded-xl shadow-sm">
            <CardHeader className="px-4 sm:px-6 py-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3 flex-1 w-full">
                  <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
                    <Users className="w-5 h-5 text-gray-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base sm:text-lg font-bold text-gray-900 truncate">
                      Manage Team - Employees, Interns & Subadmins
                    </CardTitle>
                    <p className="text-xs text-gray-500 mt-1">(Cannot manage admins)</p>
                  </div>
                </div>
                <button
                  onClick={handleAddUser}
                  className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm font-semibold shadow-sm flex-shrink-0 w-full sm:w-auto"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add User</span>
                </button>
              </div>
            </CardHeader>

            <CardContent className="px-4 sm:px-6 py-4 sm:py-6">
              {/* Search */}
              <div className="mb-6 relative">
                <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
                <Input
                  type="text"
                  placeholder="Search by name, email, or role..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 sm:pl-12  rounded-lg focus:ring-blue-500 text-sm sm:text-base"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Table / Empty */}
              {isLoading ? (
                <div className="text-center py-8 text-sm text-gray-500">Loading users...</div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-12 text-sm text-gray-500">
                  {searchTerm ? "No users found matching your search." : "No users found. Click 'Add User' to create one."}
                </div>
              ) : (
                <>
                  {/* Desktop Table View */}
                  <div className="hidden md:block overflow-x-auto rounded-xl bg-white shadow-sm">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="py-3 px-4 lg:px-6 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                          <th className="py-3 px-4 lg:px-6 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
                          <th className="py-3 px-4 lg:px-6 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                          <th className="py-3 px-4 lg:px-6 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                          <th className="py-3 px-4 lg:px-6 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>

                      <tbody>
                        {filteredUsers.map((user) => (
                          <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                            <td className="py-4 px-4 lg:px-6">
                              <div className="flex items-center gap-3">
                                {/* icon circle */}
                                <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-semibold text-white flex-shrink-0 ${
                                  user.role === "employee" || user.role === "Employee" ? "bg-blue-600" : 
                                  user.role === "intern" || user.role === "Intern" ? "bg-purple-600" : 
                                  user.role === "subadmin" || user.role === "Subadmin" ? "bg-blue-600" : 
                                  (user.role || "").toString().toLowerCase() === "admin" ? "bg-red-600" : "bg-gray-600"
                                }`}>
                                  {user.name?.charAt(0)?.toUpperCase() || "U"}
                                </div>
                                <div className="min-w-0">
                                  <div className="text-sm font-medium text-gray-900 truncate">{user.name}</div>
                                </div>
                              </div>
                            </td>

                            <td className="py-4 px-4 lg:px-6">
                              <span className={`text-xs px-3 py-1.5 rounded-full font-semibold border ${
                                user.role === "employee" || user.role === "Employee" ? "bg-blue-50 text-blue-700" : 
                                user.role === "intern" || user.role === "Intern" ? "bg-purple-50 text-purple-700" :
                                user.role === "subadmin" || user.role === "Subadmin" ? "bg-blue-50 text-blue-700" :
                                (user.role || "").toString().toLowerCase() === "admin" ? "bg-red-50 text-red-700" :
                                "bg-gray-50 text-gray-700"
                              }`}>
                                {user.role}
                              </span>
                            </td>

                            <td className="py-4 px-4 lg:px-6 text-sm text-gray-600 truncate max-w-xs">{user.email}</td>

                            <td className="py-4 px-4 lg:px-6">
                              <span className={`text-xs px-3 py-1.5 rounded-full font-semibold border ${
                                user.status === "Active" ? "bg-green-50 text-green-700" : "bg-gray-50 text-gray-600"
                              }`}>
                                {user.status}
                              </span>
                            </td>

                            <td className="py-4 px-4 lg:px-6">
                              <button
                                onClick={() => handleEditUser(user)}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white text-gray-900 hover:bg-gray-50 text-sm font-medium"
                              >
                                <Edit className="w-4 h-4" />
                                <span className="hidden lg:inline">Manage</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Card View */}
                  <div className="md:hidden space-y-4">
                    {filteredUsers.map((user) => (
                      <div
                        key={user.id}
                        className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-semibold text-white flex-shrink-0 ${
                              user.role === "employee" || user.role === "Employee" ? "bg-blue-600" : 
                              user.role === "intern" || user.role === "Intern" ? "bg-purple-600" : 
                              user.role === "subadmin" || user.role === "Subadmin" ? "bg-blue-600" : 
                              (user.role || "").toString().toLowerCase() === "admin" ? "bg-red-600" : "bg-gray-600"
                            }`}>
                              {user.name?.charAt(0)?.toUpperCase() || "U"}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-gray-900 text-sm truncate">
                                {user.name}
                              </p>
                              <p className="text-xs text-gray-500 truncate">
                                {user.email}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleEditUser(user)}
                            className="text-blue-600 hover:text-blue-700 p-2 flex-shrink-0"
                          >
                            <Edit className="w-5 h-5" />
                          </button>
                        </div>
                        
                        <div className="space-y-2 pt-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">Role</span>
                            <span className={`text-xs px-3 py-1.5 rounded-full font-semibold border ${
                              user.role === "employee" || user.role === "Employee" ? "bg-blue-50 text-blue-700" : 
                              user.role === "intern" || user.role === "Intern" ? "bg-purple-50 text-purple-700" :
                              user.role === "subadmin" || user.role === "Subadmin" ? "bg-blue-50 text-blue-700" :
                              (user.role || "").toString().toLowerCase() === "admin" ? "bg-red-50 text-red-700" :
                              "bg-gray-50 text-gray-700"
                            }`}>
                              {user.role}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">Status</span>
                            <span className={`text-xs px-3 py-1.5 rounded-full font-semibold ${
                              user.status === "Active" ? "bg-green-50 text-green-700" : "bg-gray-50 text-gray-600"
                            }`}>
                              {user.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              <div className="mt-4 p-3 bg-white rounded-md text-xs text-blue-700">
                <strong>Note:</strong>{" "}
                {normalizeRole(authUser?.role) === "superadmin"
                  ? "Superadmin can delete Admin, Subadmin, Employee, and Intern accounts. Superadmin accounts remain protected."
                  : "Admins can delete only Employee and Intern accounts."}
              </div>
            </CardContent>
          </Card>

          {/* TASK MANAGEMENT SECTION */}
          <Card className="bg-white rounded-xl shadow-sm mb-8">
            <CardHeader className="px-4 sm:px-6 py-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3 flex-1 w-full">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base sm:text-lg font-bold text-gray-900">
                      Task Management
                    </CardTitle>
                    <p className="text-xs text-gray-500 mt-1">
                      Create and manage tasks for employees and interns
                    </p>
                  </div>
                </div>
                <Button
                  onClick={openCreateTaskModal}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-sm flex-shrink-0 w-full sm:w-auto"
                >
                  <Plus className="w-4 h-4 inline mr-2" />
                  <span className="hidden sm:inline">Create Task</span>
                  <span className="sm:hidden">Create</span>
                </Button>
              </div>
            </CardHeader>

            <CardContent className="px-4 sm:px-6 py-4 sm:py-6">
              {/* Search */}
              <div className="mb-6 relative">
                <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
                <Input
                  type="text"
                  placeholder="Search tasks..."
                  value={taskSearchTerm}
                  onChange={(e) => setTaskSearchTerm(e.target.value)}
                  className="pl-10 sm:pl-12 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
                />
              </div>

              {/* Tasks Table */}
              {isLoading && filteredTasks.length === 0 ? (
                <div className="text-center py-8 text-sm text-gray-500">Loading tasks...</div>
              ) : filteredTasks.length === 0 ? (
                <div className="text-center py-12 text-sm text-gray-500">
                  {taskSearchTerm ? "No tasks found matching your search." : "No tasks found. Click 'Create Task' to create one."}
                </div>
              ) : (
                <>
                  {/* Desktop Table View */}
                  <div className="hidden md:block overflow-x-auto rounded-xl bg-white shadow-sm">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="py-3 px-4 lg:px-6 text-left text-xs font-semibold text-gray-500">Title</th>
                          <th className="py-3 px-4 lg:px-6 text-left text-xs font-semibold text-gray-500">Assigned To</th>
                          <th className="py-3 px-4 lg:px-6 text-left text-xs font-semibold text-gray-500">Created By</th>
                          <th className="py-3 px-4 lg:px-6 text-left text-xs font-semibold text-gray-500">Status</th>
                          <th className="py-3 px-4 lg:px-6 text-left text-xs font-semibold text-gray-500">Due Date</th>
                          <th className="py-3 px-4 lg:px-6 text-left text-xs font-semibold text-gray-500">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTasks.map((task) => (
                          <tr key={task.id} className="hover:bg-gray-50 transition-colors">
                            <td className="py-4 px-4 lg:px-6">
                              <div className="font-semibold text-sm">{task.title}</div>
                              {task.description && (
                                <div className="text-xs text-gray-500 mt-1">{task.description}</div>
                              )}
                            </td>
                            <td className="py-4 px-4 lg:px-6 text-sm text-gray-900">{task.assignedName || "—"}</td>
                            <td className="py-4 px-4 lg:px-6">
                              <Badge className={(task.createdBy || "").toString().toLowerCase() === "admin" ? "bg-blue-100 text-blue-700 text-xs" : "bg-blue-100 text-blue-700 text-xs"}>
                                {(task.createdBy || "").toString().toLowerCase() === "admin" ? "Admin" : "Subadmin"}
                              </Badge>
                            </td>
                            <td className="py-4 px-4 lg:px-6">
                              <Badge
                                className={
                                  task.status === "Completed"
                                    ? "bg-green-100 text-green-700 border border-green-200 text-xs"
                                    : task.status === "In Progress"
                                    ? "bg-blue-100 text-blue-700 border border-blue-200 text-xs"
                                    : "bg-gray-100 text-gray-600 border border-gray-200 text-xs"
                                }
                              >
                                {task.status}
                              </Badge>
                            </td>
                            <td className="py-4 px-4 lg:px-6 text-xs sm:text-sm text-gray-600">
                              {task.dueDate ? new Date(task.dueDate).toLocaleString() : "—"}
                            </td>
                            <td className="py-4 px-4 lg:px-6">
                              <div className="flex gap-2">
                                <button
                                  onClick={() => openEditTaskModal(task)}
                                  className="text-blue-600 hover:text-blue-700 text-xs flex items-center gap-1"
                                >
                                  <Edit className="w-3 h-3" /> <span className="hidden lg:inline">Edit</span>
                                </button>
                                <button
                                  onClick={() => handleDeleteTask(task)}
                                  className="text-red-600 hover:text-red-700 text-xs flex items-center gap-1"
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
                  <div className="md:hidden space-y-3">
                    {filteredTasks.map((task) => (
                      <div key={task.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
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
                          <div className="flex gap-1.5 flex-shrink-0">
                            <button
                              onClick={() => openEditTaskModal(task)}
                              className="text-blue-600 hover:text-blue-700 p-1.5"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteTask(task)}
                              className="text-red-600 hover:text-red-700 p-1.5"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <div className="space-y-2 pt-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">Assigned To</span>
                            <span className="text-xs font-medium text-gray-900">{task.assignedName || "—"}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">Created By</span>
                            <Badge className={(task.createdBy || "").toString().toLowerCase() === "admin" ? "bg-blue-100 text-blue-700 text-xs" : "bg-blue-100 text-blue-700 text-xs"}>
                              {(task.createdBy || "").toString().toLowerCase() === "admin" ? "Admin" : "Subadmin"}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">Status</span>
                            <Badge
                              className={
                                task.status === "Completed"
                                  ? "bg-green-100 text-green-700 text-xs"
                                  : task.status === "In Progress"
                                  ? "bg-blue-100 text-blue-700 text-xs"
                                  : "bg-gray-100 text-gray-700 text-xs"
                              }
                            >
                              {task.status}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">Due Date</span>
                            <span className="text-xs text-gray-600">
                              {task.dueDate ? new Date(task.dueDate).toLocaleString() : "—"}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </main>
      </div>

      <CertificateManagementModal
        certificate={selectedCertificate}
        isOpen={isCertificateModalOpen}
        onClose={() => {
          setIsCertificateModalOpen(false);
          setSelectedCertificate(null);
        }}
        onSave={handleSaveCertificate}
        onDelete={handleDeleteCertificate}
      />

      <UserManagementModal
        user={selectedUser}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveUser}
        onDelete={handleDeleteUser}
        onGenerateLink={handleGenerateResetLink}
      />

      {/* Task Modal */}
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

/* ---------- TASK MODAL COMPONENT ---------- */
function TaskModal({ initial = null, assignableUsers = [], onClose, onSave }) {
  const [title, setTitle] = useState(initial?.title || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [dueDate, setDueDate] = useState(initial?.dueDate ? new Date(initial.dueDate).toISOString().slice(0, 16) : "");
  const [priority, setPriority] = useState(initial?.priority || "");
  const [assignedEmail, setAssignedEmail] = useState(initial?.assignedEmail || "");
  const [projectFile, setProjectFile] = useState(initial?.projectFile || null);

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

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Title</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full border mt-1 px-3 py-2 rounded-md"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Description</label>
            <textarea
              rows={3}
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full border mt-1 px-3 py-2 rounded-md"
            />
          </div>

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

          <div>
            <label className="text-sm font-medium">Assign To <span className="text-red-500">*</span></label>
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
                No assignable users found. Users must be created with role "Employee" or "Intern".
              </p>
            ) : (
              <p className="text-xs text-gray-500 mt-1">
                {assignableUsers.length} user{assignableUsers.length !== 1 ? 's' : ''} available
              </p>
            )}
          </div>

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

