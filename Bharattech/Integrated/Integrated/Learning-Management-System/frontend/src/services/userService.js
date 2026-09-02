// User Service - API-based (No LocalStorage)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

// Robust token getter - checks multiple possible keys
const getAuthToken = () => {
  // check common keys used in different parts of the app
  return (
    localStorage.getItem("authToken") ||
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("jwt")
  );
};

// Get headers with auth token (safe version)
const getHeaders = () => {
  const token = getAuthToken();
  if (!token) {
    // no token — let caller know by returning headers without auth
    return { "Content-Type": "application/json" };
  }
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    "x-demo-role": localStorage.getItem("userRole") || localStorage.getItem("role") || "admin",
  };
};

// Get current user
export const getCurrentUser = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/user/me`, {
      method: "GET",
      headers: getHeaders(),
    });

    if (!response.ok) {
      throw new Error("Failed to fetch current user");
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching current user:", error);
    return null;
  }
};

// Get all admin-created users (Admin Dashboard - from MongoDB)
export const getUsers = async () => {
  try {
    const token = getAuthToken();
    if (!token) {
      handleUnauthorized();
      return [];
    }

    const response = await fetch(`${API_BASE_URL}/admin/users`, {
      method: "GET",
      headers: getHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) {
        handleUnauthorized();
        return [];
      }
      throw new Error(`Failed to fetch users: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Error fetching users:", error);
    return [];
  }
};

// Get assignable users (Subadmin Dashboard - for task assignment)
export const getAssignableUsers = async () => {
  try {
    const token = getAuthToken();
    if (!token) {
      handleUnauthorized();
      return [];
    }

    const response = await fetch(`${API_BASE_URL}/admin/users/assignable`, {
      method: "GET",
      headers: getHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) {
        handleUnauthorized();
        return [];
      }
      throw new Error(`Failed to fetch assignable users: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Error fetching assignable users:", error);
    return [];
  }
};

// Get user by ID
export const getUserById = async (id) => {
  try {
    const token = getAuthToken();
    if (!token) {
      console.warn("No authentication token found");
      return null;
    }

    const response = await fetch(`${API_BASE_URL}/user/${id}`, {
      method: "GET",
      headers: getHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) {
        console.error("Unauthorized: Token invalid/expired.");
        localStorage.removeItem("token");
        localStorage.removeItem("authToken");
        localStorage.removeItem("accessToken");
        localStorage.removeItem("loggedIn");
        localStorage.removeItem("userRole");
        window.location.href = "/login";
        return null;
      }
      throw new Error("Failed to fetch user");
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching user:", error);
    return null;
  }
};

// Create new user (Admin only - stores in MongoDB)
export const createUser = async (userData) => {
  try {
    const token = getAuthToken();
    if (!token) {
      handleUnauthorized();
      return null;
    }

    console.log("📤 Creating user via API:", userData);

    const response = await fetch(`${API_BASE_URL}/admin/users`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      if (response.status === 401) {
        handleUnauthorized();
        return null;
      }
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to create user");
    }

    const data = await response.json();
    console.log("✅ User created:", data);
    return data;
  } catch (error) {
    console.error("Error creating user:", error);
    throw error;
  }
};

// Update user (stores in MongoDB)
export const updateUser = async (id, userData) => {
  try {
    const token = getAuthToken();
    if (!token) {
      handleUnauthorized();
      return null;
    }

    const response = await fetch(`${API_BASE_URL}/user/${id}`, {
      method: "PATCH",
      headers: getHeaders(),
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      if (response.status === 401) {
        handleUnauthorized();
        return null;
      }
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to update user");
    }

    const data = await response.json();
    const user = data.user || data;
    return {
      id: user._id || user.id || id,
      name: user.fullName || user.name,
      email: user.email,
      role: user.role,
      status: user.status || "Active",
      ...user
    };
  } catch (error) {
    console.error("Error updating user:", error);
    throw error;
  }
};

// Delete user (soft delete in MongoDB)
export const deleteUser = async (id) => {
  try {
    const token = getAuthToken();
    if (!token) {
      handleUnauthorized();
      return false;
    }

    const response = await fetch(`${API_BASE_URL}/user/${id}`, {
      method: "DELETE",
      headers: getHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) {
        handleUnauthorized();
        return false;
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || "Failed to delete user");
    }

    console.log("✅ User deleted:", id);
    return true;
  } catch (error) {
    console.error("Error deleting user:", error);
    throw error;
  }
};

// Toggle user status (ban/unban)
export const toggleUserStatus = async (id) => {
  try {
    const user = await getUserById(id);
    if (!user) {
      throw new Error("User not found");
  }

    const updatedUser = await updateUser(id, {
      isBanned: !user.isBanned,
    });

    return updatedUser;
  } catch (error) {
    console.error("Error toggling user status:", error);
    throw error;
  }
};

// Search users
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
