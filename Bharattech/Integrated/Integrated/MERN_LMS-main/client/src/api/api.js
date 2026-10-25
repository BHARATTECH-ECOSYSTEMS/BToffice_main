import axios from "axios";
import { getBackendUrl } from "../utils/backendUrl";
import keycloak from "../auth/keycloak";

const backendUrl = getBackendUrl();

const api = axios.create({
  baseURL: `${backendUrl}/api`,
});

// Attach the signed-in person's token (kept in memory by keycloak-js, never in browser storage)
api.interceptors.request.use(async (config) => {
  try {
    await keycloak.updateToken(30);
  } catch {
    keycloak.login();
  }
  if (keycloak.token) {
    config.headers.Authorization = `Bearer ${keycloak.token}`;
  }
  return config;
});

export default api;
