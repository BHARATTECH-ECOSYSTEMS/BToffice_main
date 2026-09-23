// User Service - API-based (No LocalStorage mock)
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

const getAuthToken = () =>
  localStorage.getItem("authToken") ||
  localStorage.getItem("token") ||
  localStorage.getItem("accessToken") ||
  localStorage.getItem("jwt");

const handleUnauthorized = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("authToken");
  localStorage.removeItem("accessToken");
  localStorage.removeItem("loggedIn");
  localStorage.removeItem("userRole");
  if (typeof window !== "undefined" && window.location.pathname !== "/login") {
    window.location.href = "/login";
  }
};

const getHeaders = () => {
  const token = getAuthToken();
  const headers = { "Content-Type": "application/json" };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
    headers["x-demo-role"] =
      localStorage.getItem("userRole") ||
      localStorage.getItem("role") ||
      "admin";
  }
  return headers;
};

const apiFetch = async (endpoint, options = {}) => {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: { ...getHeaders(), ...(options.headers || {}) },
  });

  if (response.status === 401) {
    handleUnauthorized();
    return null;
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.message || `Request failed with status ${response.status}`
    );
  }

  return await response.json();
};

export const getCurrentUser = async () => {
  try {
    return await apiFetch("/user/me");
  } catch (error) {
    console.error("Error fetching current user:", error);
    return null;
  }
};

export const getUsers = async () => {
  try {
    if (!getAuthToken()) {
      handleUnauthorized();
      return [];
    }
    const data = await apiFetch("/admin/users");
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Error fetching users:", error);
    return [];
  }
};

export const getAssignableUsers = async () => {
  try {
    if (!getAuthToken()) {
      handleUnauthorized();
      return [];
    }
    const data = await apiFetch("/admin/users/assignable");
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Error fetching assignable users:", error);
    return [];
  }
};

export const getUserById = async (id) => {
  try {
    if (!getAuthToken()) return null;
    return await apiFetch(`/user/${id}`);
  } catch (error) {
    console.error("Error fetching user:", error);
    return null;
  }
};

export const createUser = async (userData) => {
  return await apiFetch("/admin/users", {
    method: "POST",
    body: JSON.stringify(userData),
  });
};

export const updateUser = async (id, userData) => {
  const data = await apiFetch(`/user/${id}`, {
    method: "PATCH",
    body: JSON.stringify(userData),
  });
  if (!data) return null;
  const user = data.user || data;
  return {
    id: user._id || user.id || id,
    name: user.fullName || user.name,
    email: user.email,
    role: user.role,
    status: user.status || "Active",
    ...user,
  };
};

export const deleteUser = async (id) => {
  try {
    await apiFetch(`/user/${id}`, { method: "DELETE" });
    return true;
  } catch (error) {
    console.error("Error deleting user:", error);
    throw error;
  }
};

export const toggleUserStatus = async (id) => {
  const user = await getUserById(id);
  if (!user) throw new Error("User not found");
  return await updateUser(id, { isBanned: !user.isBanned });
};

export const searchUsers = async (searchTerm) => {
  try {
    const users = await getUsers();
    if (!searchTerm) return users;
    const term = searchTerm.toLowerCase();
    return users.filter(
      (user) =>
        user.fullName?.toLowerCase().includes(term) ||
        user.email?.toLowerCase().includes(term) ||
        user.username?.toLowerCase().includes(term) ||
        user.role?.toLowerCase().includes(term)
    );
  } catch (error) {
    console.error("Error searching users:", error);
    return [];
  }
};
