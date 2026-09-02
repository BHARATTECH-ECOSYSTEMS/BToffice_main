import Keycloak from "keycloak-js";

const normalizeKeycloakUrl = (url) =>
  (url || "https://keycloak-24-0-5-9yaq.onrender.com")
    .replace(/^https?:\/\/https?:\/\//, "https://")
    .replace(/\/$/, "");

const keycloak = new Keycloak({
  url: normalizeKeycloakUrl(import.meta.env.VITE_KEYCLOAK_URL),
  realm: import.meta.env.VITE_KEYCLOAK_REALM || "bharattech",
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID || "lms2-client",
});

export default keycloak;
