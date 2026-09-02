// Task Service - API-based (No LocalStorage)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

// Robust token getter - checks multiple possible keys
const getAuthToken = () => {
  return (
    localStorage.getItem("authToken") ||
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("jwt")
  );
};

// Get headers with auth token
const getHeaders = () => {
  const token = getAuthToken();
  if (!token) {
    return { "Content-Type": "application/json" };
  }
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    "x-demo-role": localStorage.getItem("userRole") || localStorage.getItem("role") || "admin",
  };
};

// Get all tasks assigned to current user
export async function getTasks() {
  try {
    const token = getAuthToken();
    if (!token) {
      console.warn("No authentication token found");
      return [];
    }

    const response = await fetch(`${API_BASE_URL}/tasks`, {
      method: "GET",
      headers: getHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) {
        console.error("Unauthorized: Token invalid/expired.");
        localStorage.removeItem("token");
        localStorage.removeItem("authToken");
        localStorage.removeItem("accessToken");
        window.location.href = "/login";
        return [];
      }
      throw new Error("Failed to fetch tasks");
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return [];
  }
}

// Get tasks assigned by current user (for Sub-admin)
export async function getAssignedTasks() {
  try {
    const token = getAuthToken();
    if (!token) {
      console.warn("No authentication token found");
      return [];
    }

    console.log("📤 Fetching assigned tasks from:", `${API_BASE_URL}/tasks/assigned`);

    const response = await fetch(`${API_BASE_URL}/tasks/assigned`, {
      method: "GET",
      headers: getHeaders(),
    });

    console.log("📥 Response status:", response.status);

    if (!response.ok) {
      if (response.status === 401) {
        console.error("Unauthorized: Token invalid/expired.");
        localStorage.removeItem("token");
        localStorage.removeItem("authToken");
        localStorage.removeItem("accessToken");
        window.location.href = "/login";
        return [];
      }
      
      // Try to get error details
      let errorMessage = `Failed to fetch assigned tasks: ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
        console.error("Error details:", errorData);
      } catch (e) {
        console.error("Could not parse error response");
      }
      
      throw new Error(errorMessage);
    }

    const data = await response.json();
    console.log("✅ Received tasks:", Array.isArray(data) ? data.length : 0);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("❌ Error fetching assigned tasks:", error);
    throw error; // Re-throw so caller can handle it
  }
}

// Get task by ID
export async function getTaskById(id) {
  try {
    const tasks = await getTasks();
    return tasks.find((t) => t._id === id) || null;
  } catch (error) {
    console.error("Error fetching task:", error);
    return null;
  }
}

// Create task (Sub-admin assigns to intern)
export async function createTask(taskData) {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error("No authentication token found. Please login again.");
    }

    console.log("📤 Creating task with data:", taskData);

    const response = await fetch(`${API_BASE_URL}/tasks`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
    title: taskData.title || "Untitled task",
    description: taskData.description || "",
        assignedTo: taskData.assignedTo, // User ID (MongoDB ObjectId)
        status: taskData.status || "pending",
    dueDate: taskData.dueDate || null,
        priority: taskData.priority || "Normal",
        fileUrl: taskData.fileUrl || null,
      }),
    });

    console.log("📥 Response status:", response.status);

    // Check content type before parsing
    const contentType = response.headers.get("content-type");
    const isJson = contentType && contentType.includes("application/json");

    if (!response.ok) {
      let errorMessage = `Failed to create task: ${response.status} ${response.statusText}`;
      
      if (isJson) {
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          console.error("Failed to parse error response:", e);
        }
      } else {
        const text = await response.text();
        console.error("Non-JSON error response:", text.substring(0, 200));
        errorMessage = `Server error: ${response.status}. Check backend server.`;
      }
      
      throw new Error(errorMessage);
    }

    if (!isJson) {
      const text = await response.text();
      console.error("Expected JSON but got:", text.substring(0, 200));
      throw new Error("Server returned non-JSON response. Check backend server.");
    }

    const data = await response.json();
    console.log("✅ Task created successfully:", data);
    return data;
  } catch (error) {
    console.error("❌ Error creating task:", error);
    throw error;
  }
}

// Update task status (Intern updates their task)
export async function updateTaskStatus(id, status, fileUrl = null) {
  try {
    const response = await fetch(`${API_BASE_URL}/tasks/${id}`, {
      method: "PATCH",
      headers: getHeaders(),
      body: JSON.stringify({
        status: status,
        fileUrl: fileUrl,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to update task");
    }

    return await response.json();
  } catch (error) {
    console.error("Error updating task:", error);
    throw error;
  }
}

// Update task (general update)
export async function updateTask(id, updatedFields) {
  try {
    const response = await fetch(`${API_BASE_URL}/tasks/${id}`, {
      method: "PATCH",
      headers: getHeaders(),
      body: JSON.stringify(updatedFields),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to update task");
}

    return await response.json();
  } catch (error) {
    console.error("Error updating task:", error);
    throw error;
  }
}

// Delete task (if needed)
export async function deleteTask(id) {
  try {
    const response = await fetch(`${API_BASE_URL}/tasks/${id}`, {
      method: "DELETE",
      headers: getHeaders(),
    });

    if (!response.ok) {
      throw new Error("Failed to delete task");
    }

    return true;
  } catch (error) {
    console.error("Error deleting task:", error);
    throw error;
  }
}

// Get tasks by assigned email (for backward compatibility)
export async function getTasksByAssignedEmail(email) {
  try {
    const tasks = await getTasks();
    // Note: This requires the task to have assignedTo populated with email
    // You may need to adjust based on your API response structure
    return tasks.filter((t) => t.assignedTo?.email === email);
  } catch (error) {
    console.error("Error fetching tasks by email:", error);
    return [];
  }
}

// Add file to task (for backward compatibility)
export async function addTaskFile(id, fileName, fileUrl, byEmail = null) {
  try {
    return await updateTaskStatus(id, "completed", fileUrl);
  } catch (error) {
    console.error("Error adding file to task:", error);
    throw error;
  }
}
