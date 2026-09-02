// Password Reset Service - MongoDB-based (API)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

// Get auth token
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

// Generate a password reset link (stores in MongoDB)
export const generateResetLink = async (userEmail, userRole) => {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error("No authentication token found. Please login again.");
    }

    const response = await fetch(`${API_BASE_URL}/reset-links`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ userEmail, userRole }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to generate reset link");
    }

    const resetLink = await response.json();
    console.log("✅ Reset link generated:", resetLink);
    return resetLink;
  } catch (error) {
    console.error("Error generating reset link:", error);
    throw error;
  }
};

// Get ALL reset links (from MongoDB)
export const getResetLinks = async () => {
  try {
    const token = getAuthToken();
    if (!token) {
      return [];
    }

    const response = await fetch(`${API_BASE_URL}/reset-links`, {
      method: "GET",
      headers: getHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) {
        return [];
      }
      throw new Error("Failed to fetch reset links");
    }

    const links = await response.json();
    return Array.isArray(links) ? links : [];
  } catch (error) {
    console.error("Error loading reset links:", error);
    return [];
  }
};

// Get reset links filtered by ROLE (from MongoDB)
export const getResetLinksByRole = async (role) => {
  try {
    const token = getAuthToken();
    if (!token) {
      console.log("⚠️ No auth token found for fetching reset links");
      return [];
    }

    const url = `${API_BASE_URL}/reset-links?role=${encodeURIComponent(role)}`;
    console.log(`📤 Fetching reset links for role: ${role} from ${url}`);

    const response = await fetch(url, {
      method: "GET",
      headers: getHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) {
        console.log("⚠️ Unauthorized - no token or invalid token");
        return [];
      }
      const errorText = await response.text();
      console.error(`❌ Failed to fetch reset links: ${response.status} - ${errorText}`);
      throw new Error("Failed to fetch reset links");
    }

    const links = await response.json();
    console.log(`✅ Received ${Array.isArray(links) ? links.length : 0} reset links for role: ${role}`);
    
    // Backend already filters by status="Sent", not expired, and not used
    // So we can return the links directly
    return Array.isArray(links) ? links : [];
  } catch (error) {
    console.error("❌ Error fetching reset links:", error);
    return [];
  }
};

// Mark reset link as used (in MongoDB)
export const markResetLinkAsUsed = async (token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/reset-links/use`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });

    if (!response.ok) {
      throw new Error("Failed to mark reset link as used");
    }

    return await response.json();
  } catch (error) {
    console.error("Error updating reset link:", error);
    throw error;
  }
};

// Mark reset link as sent (when admin clicks "Send to Email")
export const markResetLinkAsSent = async (linkId) => {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error("No authentication token found. Please login again.");
    }

    // Ensure linkId is a string and properly formatted
    if (!linkId) {
      throw new Error("Link ID is required");
    }

    const url = `${API_BASE_URL}/reset-links/${encodeURIComponent(linkId)}/send`;
    console.log("📤 Calling API:", url);
    console.log("📤 Link ID:", linkId);
    console.log("📤 Link ID type:", typeof linkId);
    console.log("📤 Headers:", getHeaders());

    const response = await fetch(url, {
      method: "PATCH",
      headers: getHeaders(),
    });

    console.log("📥 Response status:", response.status);
    console.log("📥 Response ok:", response.ok);
    console.log("📥 Response URL:", response.url);

    if (!response.ok) {
      let errorMessage = `Failed to mark reset link as sent (${response.status})`;
      let errorData = null;
      
      try {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
          console.error("❌ Error response JSON:", errorData);
        } else {
          const text = await response.text();
          console.error("❌ Error response text:", text);
          errorMessage = text || errorMessage;
        }
      } catch (e) {
        console.error("❌ Error parsing error response:", e);
      }
      
      // Provide more specific error messages
      if (response.status === 404) {
        errorMessage = `API endpoint not found. Please check if the backend server is running at ${API_BASE_URL}`;
      } else if (response.status === 401) {
        errorMessage = "Authentication failed. Please login again.";
      } else if (response.status === 403) {
        errorMessage = "Access denied. Only admin users can send reset links.";
      }
      
      throw new Error(errorMessage);
    }

    const result = await response.json();
    console.log("✅ Reset link marked as sent:", result);
    return result;
  } catch (error) {
    console.error("❌ Error marking reset link as sent:", error);
    // Re-throw with more context if it's a network error
    if (error.message.includes("Failed to fetch") || error.message.includes("NetworkError")) {
      throw new Error(`Network error: Unable to connect to backend server at ${API_BASE_URL}. Please ensure the backend server is running.`);
    }
    throw error;
  }
};

// Get reset link by token (for resetting password page - from MongoDB)
export const getResetLinkByToken = async (token) => {
  try {
    const links = await getResetLinks();
    const link = links.find((l) => l.resetToken === token && !l.used);
    
    if (link) {
      // Check expiration
      const expiresAt = new Date(link.expiresAt);
      if (expiresAt < new Date()) {
        return null; // Expired
      }
    }
    
    return link;
  } catch (error) {
    console.error("Error getting reset link by token:", error);
    return null;
  }
};
