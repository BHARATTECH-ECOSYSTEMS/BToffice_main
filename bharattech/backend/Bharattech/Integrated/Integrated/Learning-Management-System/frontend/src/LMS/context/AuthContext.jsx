/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from "react";
import keycloakClient from "../../auth/keycloak";

export const AuthContext = createContext(null);

export const AuthContextProvider = ({ children, keycloak = keycloakClient }) => {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);
  const demoMode = (import.meta.env.VITE_AUTH_MODE || "keycloak").toLowerCase() === "demo";

  const clearStoredAuth = () => {
    [
      "accessToken", "authToken", "jwt", "loggedIn", "myId", "role", "token",
      "user", "userEmail", "userRole", "username",
    ].forEach((key) => localStorage.removeItem(key));
  };

  const logout = async () => {
    // Revoke refresh token (best-effort)
    const refreshToken = localStorage.getItem("refresh_token");
    const keycloakBase  = import.meta.env.VITE_KEYCLOAK_URL  || "http://localhost:8080";
    const keycloakRealm = import.meta.env.VITE_KEYCLOAK_REALM || "bharattech";
    if (refreshToken) {
      try {
        await fetch(`${keycloakBase}/realms/${keycloakRealm}/protocol/openid-connect/logout`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id:     import.meta.env.VITE_KEYCLOAK_CLIENT_ID || "lms-client",
            refresh_token: refreshToken,
          }),
        });
      } catch (err) {
        console.warn("Failed to revoke refresh token", err);
      }
    }

    clearStoredAuth();
    setUser(null);

    // Clear OpenInterviewer session cookie (fire-and-forget)
    try {
      const rawInterviewUrl = import.meta.env.VITE_INTERVIEW_URL || "http://localhost:3000";
      const interviewOrigin = new URL(rawInterviewUrl).origin;
      fetch(`${interviewOrigin}/api/auth/logout`, { method: "POST", credentials: "include" }).catch(() => {});
    } catch { /* ignore URL parse errors */ }

    const bharatUrl   = import.meta.env.VITE_BHARAT_URL || "http://localhost:8081";

    // Redirect to Bharat with sso_logout=1 so Bharat's initSSO() clears its own
    // local session (bharat_sso_user / bharat_access_token) — without this flag
    // a Direct-Access-Grant Bharat session survives an LMS-initiated logout.
    window.location.href = `${bharatUrl}/?sso_logout=1`;
  };

  // Only used in demo mode
  const getDemoUser = () => {
    try {
      const stored = JSON.parse(localStorage.getItem("user") || "null");
      if (stored) return { ...stored, role: (stored.role || "admin").toUpperCase() };
    } catch { /* ignore */ }
    const role = (localStorage.getItem("role") || "admin").toUpperCase();
    return {
      fullName: localStorage.getItem("username") || `${role} User`,
      username: localStorage.getItem("username") || `${role} User`,
      email:    localStorage.getItem("userEmail") || `${role.toLowerCase()}@bharattech.local`,
      role, roles: [role],
    };
  };

  const resolveRole = (roles = []) => {
    const upper = roles.map((r) => String(r).toUpperCase().replace(/[-_\s]/g, ""));
    if (upper.includes("SUPERADMIN")) return "SUPERADMIN";
    if (upper.includes("ADMIN"))      return "ADMIN";
    if (upper.includes("SUBADMIN"))   return "SUBADMIN";
    if (upper.includes("EMPLOYEE"))   return "EMPLOYEE";
    return "INTERN";
  };

  useEffect(() => {
    const init = async () => {
      try {
        if (demoMode) {
          setUser(getDemoUser());
          return;
        }

        if (!keycloak?.authenticated) {
          // Keycloak may be unreachable (e.g. Direct Access Grant from Bharat with no
          // browser session). main.jsx's bootstrapFromLocalToken stores user data in
          // localStorage — read it so the app loads without a Keycloak redirect.
          try {
            const stored = JSON.parse(localStorage.getItem("user") || "null");
            if (stored && (stored.fullName || stored.email || stored.username)) {
              const role = resolveRole([stored.role || ""]);
              setUser({ ...stored, role, roles: [role] });
              return;
            }
          } catch { /* malformed */ }
          setUser(null);
          return;
        }

        await keycloak.updateToken(30);

        // /userinfo always returns current Keycloak user attributes, even when
        // the JWT was issued before protocol mappers were added.
        let userInfo = {};
        try { userInfo = await keycloak.loadUserInfo(); } catch (e) {
          console.warn("loadUserInfo failed, using token claims only", e);
        }

        const tp = keycloak.tokenParsed || {};
        const allRoles = [
          ...(tp.realm_access?.roles || []),
          ...(tp.resource_access?.["lms-client"]?.roles || []),
        ];
        const role = resolveRole(allRoles);

        const firstName = userInfo.given_name  || tp.given_name  || "";
        const lastName  = userInfo.family_name || tp.family_name || "";
        const email     = userInfo.email       || tp.email       || "";
        const fullName  =
          [firstName, lastName].filter(Boolean).join(" ").trim() ||
          userInfo.name || tp.name || tp.preferred_username || "";

        const mappedUser = {
          fullName, firstName, lastName,
          username: tp.preferred_username || "",
          email, role,
          roles: allRoles,
        };

        setUser(mappedUser);

        // Keep localStorage in sync so other parts of the app see fresh data
        localStorage.setItem("accessToken", keycloak.token);
        localStorage.setItem("token",       keycloak.token);
        localStorage.setItem("username",    mappedUser.username);
        localStorage.setItem("userEmail",   mappedUser.email);
        localStorage.setItem("role",        mappedUser.role);
        localStorage.setItem("user",        JSON.stringify(mappedUser));
      } catch (e) {
        console.error("Auth init failed", e);
        if (demoMode) {
          setUser(getDemoUser());
        } else {
          setUser(null);
        }
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [demoMode, keycloak]);

  // Watch for mid-session SSO logout or token expiry
  useEffect(() => {
    if (demoMode || !keycloak) return;

    keycloak.onAuthLogout = () => logout();

    const handleFocus = async () => {
      if (!keycloak.authenticated) return;
      try {
        // -1 forces an unconditional refresh-token request to Keycloak — a plain
        // updateToken(5) only refreshes when the locally cached token is close to
        // expiry, so it never actually asks the server and misses a remote logout.
        await keycloak.updateToken(-1);
      } catch {
        logout();
      }
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [demoMode, keycloak]);

  const hasRole = (roles) => {
    if (!user) return false;
    const required = Array.isArray(roles) ? roles : [roles];
    const userRole = (user.role || "").toUpperCase().replace(/[-_\s]/g, "");
    const effective = new Set([userRole]);
    if (userRole === "SUPERADMIN") {
      effective.add("ADMIN");
      effective.add("SUBADMIN");
    }
    return required
      .map((r) => r.toUpperCase().replace(/[-_\s]/g, ""))
      .some((r) => effective.has(r));
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout, hasRole, keycloak }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
