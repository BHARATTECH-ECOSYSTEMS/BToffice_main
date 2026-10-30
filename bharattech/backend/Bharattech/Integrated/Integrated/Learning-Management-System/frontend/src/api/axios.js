import axios from "axios";
import keycloak from "../auth/keycloak";

/**
 * Central Axios instance for the app
 * - Automatically attaches Keycloak access token
 * - Safely refreshes token before every request
 */

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api",
  timeout: 15000,
});

/* ---------------- REQUEST INTERCEPTOR ---------------- */
api.interceptors.request.use(
  async (config) => {

    if (keycloak?.authenticated) {

      try {

        await keycloak.updateToken(30);

        config.headers.Authorization =
          `Bearer ${keycloak.token}`;

      } catch (err) {

        console.error("Token refresh failed", err);
      }
    }

    if (!config.headers.Authorization) {
      const token =
        localStorage.getItem("authToken") ||
        localStorage.getItem("token") ||
        localStorage.getItem("accessToken") ||
        localStorage.getItem("jwt");

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    config.headers["x-demo-role"] =
      localStorage.getItem("userRole") || localStorage.getItem("role") || "admin";

    return config;
  },
  (error) => Promise.reject(error)
);

/* ---------------- RESPONSE INTERCEPTOR ---------------- */
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;

    // 🔁 Token invalid / expired → force logout
    if (status === 401) {
      console.warn("🚨 401 detected - token invalid/expired");
      
      try {
        // Clear local state first
        localStorage.clear();
        
        // Force Keycloak logout (will redirect to login)
        await keycloak.logout({
          redirectUri: window.location.origin
        });
      } catch (e) {
        console.error("🚨 Keycloak logout failed:", e);
        // Fallback: force page reload to clear state
        window.location.href = "/";
      }
    }

    return Promise.reject(error);
  }
);

export default api;
