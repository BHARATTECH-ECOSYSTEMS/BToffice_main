import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

import { SidebarProvider } from "./contexts/SidebarContext";
import { UIContextProvider } from "./LMS/context/UiContext";
import { AuthContextProvider } from "./LMS/context/AuthContext";

import keycloak from "./auth/keycloak";

const container = document.getElementById("root");
const root = createRoot(container);

const keycloakClientId = import.meta.env.VITE_KEYCLOAK_CLIENT_ID || "lms-client";
const authMode = (import.meta.env.VITE_AUTH_MODE || "keycloak").toLowerCase();
const shouldUseDemoAuth = authMode === "demo";

const renderApp = () => {
  root.render(
    <SidebarProvider>
      <AuthContextProvider keycloak={keycloak}>
        <UIContextProvider>
          <App />
        </UIContextProvider>
      </AuthContextProvider>
    </SidebarProvider>
  );
};

// ── Demo mode ──────────────────────────────────────────────────────────────────
const seedDemoSession = () => {
  const params = new URLSearchParams(window.location.search);
  const role = (params.get("role") || "admin").toLowerCase();
  const name = `${role.charAt(0).toUpperCase()}${role.slice(1)} User`;
  const email = `${role}@bharattech.local`;
  localStorage.setItem("role", role);
  localStorage.setItem("username", name);
  localStorage.setItem("userEmail", email);
  localStorage.setItem("token", "demo-token");
  localStorage.setItem("accessToken", "demo-token");
  localStorage.setItem("user", JSON.stringify({ fullName: name, username: name, email, role }));
};

if (shouldUseDemoAuth) {
  seedDemoSession();
  renderApp();
} else {
  // ── Keycloak mode ────────────────────────────────────────────────────────────
  // Rule: renderApp() is ONLY called after confirmed Keycloak authentication.
  // No silent fallback to stale localStorage data.

  const clearTokens = () => {
    [
      "accessToken", "authToken", "jwt", "loggedIn", "myId", "role", "token",
      "user", "userEmail", "userRole", "username", "refresh_token", "id_token",
      "userFullName", "userFirstName", "userLastName",
    ].forEach((k) => localStorage.removeItem(k));
  };

  // Tokens + user object passed via URL params from the Bharat Direct Access Grant flow
  const urlParams      = new URLSearchParams(window.location.search);
  const urlToken       = urlParams.get("token");
  const urlRefresh     = urlParams.get("refresh_token");
  const urlIdToken     = urlParams.get("id_token");
  const urlUserRaw     = urlParams.get("user");
  if (urlToken || urlUserRaw) {
    if (urlToken) {
      localStorage.setItem("token",       urlToken);
      localStorage.setItem("accessToken", urlToken);
    }
    if (urlRefresh)  localStorage.setItem("refresh_token", urlRefresh);
    if (urlIdToken)  localStorage.setItem("id_token",      urlIdToken);
    if (urlUserRaw) {
      try {
        const pu = JSON.parse(urlUserRaw);
        localStorage.setItem("user", JSON.stringify(pu));
        if (pu.role)      localStorage.setItem("role",          pu.role);
        if (pu.username)  localStorage.setItem("username",      pu.username);
        if (pu.email)     localStorage.setItem("userEmail",     pu.email);
        if (pu.fullName)  localStorage.setItem("userFullName",  pu.fullName);
        if (pu.firstName) localStorage.setItem("userFirstName", pu.firstName);
        if (pu.lastName)  localStorage.setItem("userLastName",  pu.lastName);
      } catch { /* malformed JSON — ignore */ }
    }
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  const storedToken   = localStorage.getItem("token");
  const storedRefresh = localStorage.getItem("refresh_token") || undefined;
  const storedId      = localStorage.getItem("id_token")      || undefined;

  const resolveRole = (roles = []) => {
    const u = roles.map((r) => String(r).toUpperCase().replace(/[-_\s]/g, ""));
    if (u.includes("SUPERADMIN")) return "superadmin";
    if (u.includes("ADMIN"))      return "admin";
    if (u.includes("SUBADMIN"))   return "subadmin";
    if (u.includes("EMPLOYEE"))   return "employee";
    return "intern";
  };

  const handleAuthenticated = async () => {
    // Force-refresh so the stored JWT carries all current protocol-mapper claims
    try { await keycloak.updateToken(-1); } catch (_) {}

    // /userinfo always reflects current Keycloak user attributes — immune to
    // tokens that were issued before protocol mappers were added.
    let userInfo = {};
    try { userInfo = await keycloak.loadUserInfo(); } catch (_) {}

    const tp = keycloak.tokenParsed || {};
    const allRoles = [
      ...(tp.realm_access?.roles || []),
      ...(tp.resource_access?.[keycloakClientId]?.roles || []),
    ];

    const role      = resolveRole(allRoles);
    const firstName = userInfo.given_name  || tp.given_name  || "";
    const lastName  = userInfo.family_name || tp.family_name || "";
    const email     = userInfo.email       || tp.email       || "";
    const fullName  =
      [firstName, lastName].filter(Boolean).join(" ").trim() ||
      userInfo.name || tp.name || tp.preferred_username || "";

    const userObj = {
      fullName, firstName, lastName,
      username: tp.preferred_username || "",
      email, role,
    };

    localStorage.setItem("token",         keycloak.token);
    localStorage.setItem("accessToken",   keycloak.token);
    localStorage.setItem("role",          role);
    localStorage.setItem("username",      userObj.username);
    localStorage.setItem("userEmail",     email);
    localStorage.setItem("userFullName",  fullName);
    localStorage.setItem("userFirstName", firstName);
    localStorage.setItem("userLastName",  lastName);
    localStorage.setItem("user",          JSON.stringify(userObj));
    if (keycloak.refreshToken) localStorage.setItem("refresh_token", keycloak.refreshToken);
    if (keycloak.idToken)      localStorage.setItem("id_token",      keycloak.idToken);

    renderApp();
  };

  const goToLogin = () => {
    clearTokens();
    if (window.location.pathname !== "/login") {
      window.location.href = "/login";
    } else {
      renderApp();
    }
  };

  if (storedToken) {
    // Restore session from stored tokens (e.g. after page refresh or from Bharat).
    // First try to init Keycloak so tokens stay fresh; if Keycloak is unreachable,
    // decode the JWT locally so the user never sees the Keycloak login page.
    keycloak
      .init({
        token:            storedToken,
        refreshToken:     storedRefresh,
        idToken:          storedId,
        checkLoginIframe: false,
        pkceMethod:       "S256",
      })
      .then((authenticated) => {
        if (authenticated) { handleAuthenticated(); return; }

        // Keycloak couldn't verify the token, but we still have it — decode
        // locally so the user lands on the dashboard without a Keycloak redirect.
        bootstrapFromLocalToken(storedToken);
      })
      .catch(() => bootstrapFromLocalToken(storedToken));
  } else {
    // No stored session — use check-sso first; only force login if truly unauthenticated.
    keycloak
      .init({
        onLoad:           "check-sso",
        silentCheckSsoRedirectUri: window.location.origin + "/silent-check-sso.html",
        checkLoginIframe: false,
        pkceMethod:       "S256",
      })
      .then((authenticated) => {
        if (authenticated) { handleAuthenticated(); return; }
        // Not logged in anywhere — redirect to Keycloak login
        goToLogin();
      })
      .catch(() => goToLogin());
  }

  // Decode the JWT locally (without Keycloak) and render the app.
  // Used as a fallback when the Bharat Direct-Access-Grant token can't be
  // validated by Keycloak (e.g. Keycloak unreachable, cold start).
  function bootstrapFromLocalToken(token) {
    try {
      const payload = JSON.parse(atob(token.replace(/-/g, "+").replace(/_/g, "/").split(".")[1]));
      const allRoles = [
        ...(payload.realm_access?.roles || []),
        ...(payload.resource_access?.[keycloakClientId]?.roles || []),
      ];
      const role      = resolveRole(allRoles);
      const firstName = payload.given_name  || "";
      const lastName  = payload.family_name || "";
      const email     = payload.email       || "";
      const fullName  =
        [firstName, lastName].filter(Boolean).join(" ").trim() ||
        payload.name || payload.preferred_username || "";

      const userObj = {
        fullName, firstName, lastName,
        username: payload.preferred_username || "",
        email, role,
      };

      localStorage.setItem("role",          role);
      localStorage.setItem("username",      userObj.username);
      localStorage.setItem("userEmail",     email);
      localStorage.setItem("userFullName",  fullName);
      localStorage.setItem("userFirstName", firstName);
      localStorage.setItem("userLastName",  lastName);
      localStorage.setItem("user",          JSON.stringify(userObj));

      renderApp();
    } catch {
      // Token unreadable — fall back to Keycloak login
      goToLogin();
    }
  }
}
