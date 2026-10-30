// Certificate Service - API-based (No LocalStorage)
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

// Get all certificates (Admin only - returns all certificates)
export const getCertificates = async () => {
  try {
    const token = getAuthToken();
    if (!token) {
      console.warn("No authentication token found — redirecting to login");
      // clear stale data and redirect
      localStorage.removeItem("token");
      localStorage.removeItem("authToken");
      localStorage.removeItem("accessToken");
      window.location.href = "/login";
      return [];
    }

    const response = await fetch(`${API_BASE_URL}/certificates`, {
      method: "GET",
      headers: getHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) {
        console.error("Unauthorized: Token invalid/expired. Redirecting to login.");
        localStorage.removeItem("token");
        localStorage.removeItem("authToken");
        localStorage.removeItem("accessToken");
        localStorage.removeItem("loggedIn");
        localStorage.removeItem("userRole");
        window.location.href = "/login";
        return [];
      }
      throw new Error(`Failed to fetch certificates: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return Array.isArray(data) ? data : data.certificates || [];
  } catch (error) {
    console.error("Error loading certificates:", error);
    return [];
  }
};

// Get my certificates (for any authenticated user - returns only their certificates)
export const getMyCertificates = async () => {
  try {
    const token = getAuthToken();
    if (!token) {
      console.warn("No authentication token found");
      return [];
    }

    const response = await fetch(`${API_BASE_URL}/certificates/my`, {
      method: "GET",
      headers: getHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) {
        console.error("Unauthorized: Token invalid/expired.");
        return [];
      }
      throw new Error(`Failed to fetch my certificates: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return Array.isArray(data) ? data : data.certificates || [];
  } catch (error) {
    console.error("Error loading my certificates:", error);
    return [];
  }
};

// Create a new certificate
export const createCertificate = async (certificateData) => {
  try {
    const token = getAuthToken();
    if (!token) {
      console.warn("No authentication token found — redirecting to login");
      window.location.href = "/login";
      return null;
    }

    const response = await fetch(`${API_BASE_URL}/certificates`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        recipientName: certificateData.recipientName,
        recipientEmail: certificateData.recipientEmail,
        courseName: certificateData.courseName,
        certificateType: certificateData.certificateType || "Completion",
        expiryDate: certificateData.expiryDate,
        fileUrl: certificateData.fileUrl,
      }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        console.error("Unauthorized: Token invalid/expired. Redirecting to login.");
        localStorage.removeItem("token");
        localStorage.removeItem("authToken");
        localStorage.removeItem("accessToken");
        localStorage.removeItem("loggedIn");
        localStorage.removeItem("userRole");
        window.location.href = "/login";
        return null;
      }
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to create certificate");
    }

    const data = await response.json();
    // Response is already normalized from backend
    return data;
  } catch (error) {
    console.error("Error creating certificate:", error);
    throw error;
  }
};

// Get certificate by ID
export const getCertificateById = async (id) => {
  try {
    const response = await fetch(`${API_BASE_URL}/certificates/${id}`, {
      method: "GET",
      headers: getHeaders(),
    });

    if (!response.ok) {
      throw new Error("Failed to fetch certificate");
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching certificate:", error);
    throw error;
  }
};

// Update a certificate (if needed)
export const updateCertificate = async (id, certificateData) => {
  try {
    const token = getAuthToken();
    if (!token) {
      console.warn("No authentication token found — redirecting to login");
      window.location.href = "/login";
      return null;
    }

    const response = await fetch(`${API_BASE_URL}/certificates/${id}`, {
      method: "PATCH",
      headers: getHeaders(),
      body: JSON.stringify({
        recipientName: certificateData.recipientName,
        recipientEmail: certificateData.recipientEmail,
        courseName: certificateData.courseName,
        certificateType: certificateData.certificateType,
        expiryDate: certificateData.expiryDate,
        fileUrl: certificateData.fileUrl,
      }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        console.error("Unauthorized: Token invalid/expired. Redirecting to login.");
        localStorage.removeItem("token");
        localStorage.removeItem("authToken");
        localStorage.removeItem("accessToken");
        localStorage.removeItem("loggedIn");
        localStorage.removeItem("userRole");
        window.location.href = "/login";
        return null;
      }
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to update certificate");
    }

    const data = await response.json();
    // Response is already normalized from backend
    return data;
  } catch (error) {
    console.error("Error updating certificate:", error);
    throw error;
  }
};

// Delete a certificate (if needed)
export const deleteCertificate = async (id) => {
  try {
    const token = getAuthToken();
    if (!token) {
      console.warn("No authentication token found — redirecting to login");
      window.location.href = "/login";
      return false;
    }

    const response = await fetch(`${API_BASE_URL}/certificates/${id}`, {
      method: "DELETE",
      headers: getHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) {
        console.error("Unauthorized: Token invalid/expired. Redirecting to login.");
        localStorage.removeItem("token");
        localStorage.removeItem("authToken");
        localStorage.removeItem("accessToken");
        localStorage.removeItem("loggedIn");
        localStorage.removeItem("userRole");
        window.location.href = "/login";
        return false;
      }
      throw new Error("Failed to delete certificate");
    }

    return true;
  } catch (error) {
    console.error("Error deleting certificate:", error);
    throw error;
  }
};

// Search certificates
export const searchCertificates = async (searchTerm) => {
  try {
    const certificates = await getCertificates();
    if (!searchTerm) return certificates;
  
    const term = searchTerm.toLowerCase();
    return certificates.filter(
      (cert) =>
        cert.recipientName?.toLowerCase().includes(term) ||
        cert.recipientEmail?.toLowerCase().includes(term) ||
        cert.certificateNumber?.toLowerCase().includes(term) ||
        cert.courseName?.toLowerCase().includes(term)
    );
  } catch (error) {
    console.error("Error searching certificates:", error);
    return [];
  }
};
