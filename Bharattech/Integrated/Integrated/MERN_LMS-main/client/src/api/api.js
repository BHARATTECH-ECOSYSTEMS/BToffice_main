import axios from "axios";
import { getBackendUrl } from "../utils/backendUrl";

const backendUrl = getBackendUrl();

const api = axios.create({
  baseURL: `${backendUrl}/api`,
});

// Attach token automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token"); // or your token logic
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
