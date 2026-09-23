import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../LMS/context/AuthContext";
import { getUsers, createUser, updateUser, deleteUser } from "../services/userService";
import { getCertificates, createCertificate, updateCertificate, deleteCertificate, searchCertificates } from "../services/certificateService";
import { generateResetLink, getResetLinks } from "../services/passwordResetService";
import { useAdminTasks } from "./useAdminTasks";

export function useAdminDashboard() {
  const navigate = useNavigate();
  const { user: authUser, logout, hasRole } = useAuth();

  const [certificates, setCertificates] = useState([]);
  const [filteredCertificates, setFilteredCertificates] = useState([]);
  const [certificateSearchTerm, setCertificateSearchTerm] = useState("");
  const [selectedCertificate, setSelectedCertificate] = useState(null);
  const [isCertificateModalOpen, setIsCertificateModalOpen] = useState(false);

  const [resetLinks, setResetLinks] = useState([]);
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const adminTasks = useAdminTasks();

  const normalizeRole = (role) => (role || "").toString().trim().toLowerCase().replace("-", "");

  const canDeleteUserByRole = (targetRole) => {
    const current = normalizeRole(authUser?.role);
    const target = normalizeRole(targetRole);
    if (current === "superadmin") return target !== "superadmin";
    if (current === "admin") return target === "employee" || target === "intern";
    return false;
  };

  useEffect(() => {
    const token = localStorage.getItem("authToken") || localStorage.getItem("token") || localStorage.getItem("accessToken");
    if (!token) {
      navigate("/login");
      return;
    }

    // Always load data for admin view
    loadCertificates();
    loadUsers();
    loadResetLinks();
    adminTasks.loadTasks();
    adminTasks.loadAssignableUsers();
  }, [navigate, authUser]);

  useEffect(() => {
    if (certificateSearchTerm) {
      setFilteredCertificates(searchCertificates(certificateSearchTerm));
    } else {
      setFilteredCertificates(certificates);
    }
  }, [certificateSearchTerm, certificates]);

  useEffect(() => {
    if (!Array.isArray(users)) {
      setFilteredUsers([]);
      return;
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      setFilteredUsers(users.filter(u =>
        (u.name || u.fullName || "").toLowerCase().includes(term) ||
        (u.email || "").toLowerCase().includes(term) ||
        (u.role || "").toLowerCase().includes(term)
      ));
    } else {
      setFilteredUsers(users);
    }
  }, [searchTerm, users]);

  const loadCertificates = async () => {
    try {
      const all = await getCertificates();
      const list = Array.isArray(all) ? all : [];
      setCertificates(list);
      setFilteredCertificates(list);
    } catch {
      setCertificates([]);
      setFilteredCertificates([]);
    }
  };

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const all = await getUsers();
      const list = Array.isArray(all) ? all : [];
      setUsers(list);
      setFilteredUsers(list);
    } catch {
      setUsers([]);
      setFilteredUsers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadResetLinks = async () => {
    try {
      const links = await getResetLinks();
      setResetLinks(links || []);
    } catch {
      setResetLinks([]);
    }
  };

  const handleSaveUser = async (userData) => {
    try {
      setIsLoading(true);
      if (selectedUser) {
        await updateUser(selectedUser.id, userData);
      } else {
        await createUser(userData);
        await generateResetLink(userData.email, userData.role);
      }
      await loadUsers();
      await loadResetLinks();
      setIsModalOpen(false);
      setSelectedUser(null);
    } catch (err) {
      alert(err.message || "Error saving user");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser || !window.confirm(`Delete ${selectedUser.name || selectedUser.email}?`)) return;
    if (!canDeleteUserByRole(selectedUser.role)) {
      alert("Permission denied to delete this user role.");
      return;
    }
    try {
      setIsLoading(true);
      await deleteUser(selectedUser.id || selectedUser._id);
      setUsers(p => p.filter(u => u.id !== selectedUser.id && u._id !== selectedUser._id));
      setIsModalOpen(false);
      setSelectedUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveCertificate = async (data) => {
    try {
      if (selectedCertificate) {
        const saved = await updateCertificate(selectedCertificate.id, data);
        if (saved) setCertificates(p => p.map(c => (c.id === saved.id ? saved : c)));
      } else {
        const saved = await createCertificate(data);
        if (saved) setCertificates(p => [saved, ...p]);
      }
      setIsCertificateModalOpen(false);
      setSelectedCertificate(null);
    } catch (err) {
      alert(err.message || "Error saving certificate");
    }
  };

  const handleDeleteCertificate = async () => {
    try {
      await deleteCertificate(selectedCertificate.id);
      await loadCertificates();
      setIsCertificateModalOpen(false);
      setSelectedCertificate(null);
    } catch (err) {
      alert(err.message || "Error deleting certificate");
    }
  };

  return {
    authUser, logout, normalizeRole, isLoading: isLoading || adminTasks.isTaskLoading,
    certificates, filteredCertificates, certificateSearchTerm, setCertificateSearchTerm,
    selectedCertificate, setSelectedCertificate, isCertificateModalOpen, setIsCertificateModalOpen,
    handleSaveCertificate, handleDeleteCertificate,
    users, filteredUsers, searchTerm, setSearchTerm, selectedUser, setSelectedUser,
    isModalOpen, setIsModalOpen, handleSaveUser, handleDeleteUser,
    tasks: adminTasks.tasks, filteredTasks: adminTasks.filteredTasks,
    taskSearchTerm: adminTasks.taskSearchTerm, setTaskSearchTerm: adminTasks.setTaskSearchTerm,
    assignableUsers: adminTasks.assignableUsers,
    taskModalOpen: adminTasks.taskModalOpen, setTaskModalOpen: adminTasks.setTaskModalOpen,
    selectedTask: adminTasks.selectedTask, setSelectedTask: adminTasks.setSelectedTask,
    handleSaveTask: adminTasks.handleSaveTask, handleDeleteTask: adminTasks.handleDeleteTask,
    resetLinks, loadAssignableUsers: adminTasks.loadAssignableUsers
  };
}
