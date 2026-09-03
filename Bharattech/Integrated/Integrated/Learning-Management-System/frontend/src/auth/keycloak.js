import Keycloak from "keycloak-js";

const LOCAL_HOSTS = ["localhost", "127.0.0.1"];
const LOCAL_KEYCLOAK_URL = "http://localhost:8080";
const PRODUCTION_KEYCLOAK_URL = "https://keycloak-24-0-5-9yaq.onrender.com";

const keycloakClientId = import.meta.env.VITE_KEYCLOAK_CLIENT_ID || "lms-client";
const isLocalHost = LOCAL_HOSTS.includes(window.location.hostname);

const isLocalUrl = (url = "") => /localhost|127\.0\.0\.1/i.test(url);
const normalizeUrl = (url = "") => url.replace(/\/+$/, "");

const getKeycloakUrl = () => {
  const configuredUrl = import.meta.env.VITE_KEYCLOAK_URL;

  if (configuredUrl && (isLocalHost || !isLocalUrl(configuredUrl))) {
    return normalizeUrl(configuredUrl);
  }

  return isLocalHost ? LOCAL_KEYCLOAK_URL : PRODUCTION_KEYCLOAK_URL;
};

const keycloak = new Keycloak({
  url: getKeycloakUrl(),
  realm: import.meta.env.VITE_KEYCLOAK_REALM || "bharattech",
  clientId: keycloakClientId,
});

export const initKeycloak = async () => {
  const authenticated = await keycloak.init({
    onLoad: "login-required",
    checkLoginIframe: false,
  });

  if (authenticated) {

    console.log("TOKEN:", keycloak.tokenParsed);

    // REALM ROLES
    const realmRoles =
      keycloak.tokenParsed?.realm_access?.roles || [];

    // CLIENT ROLES
    const clientRoles =
      keycloak.tokenParsed?.resource_access?.[keycloakClientId]?.roles || [];

    // COMBINE
    const allRoles = [...realmRoles, ...clientRoles];

    console.log("ALL ROLES:", allRoles);

    // STORE ROLE
    if (
      allRoles.includes("Admin") ||
      allRoles.includes("admin")
    ) {

      localStorage.setItem("role", "admin");

    } else {

      localStorage.setItem("role", "user");
    }

    // STORE USERNAME
    localStorage.setItem(
      "username",
      keycloak.tokenParsed.preferred_username
    );

    localStorage.setItem(
      "token",
      keycloak.token
    );
  }

  return authenticated;
};

export default keycloak;
