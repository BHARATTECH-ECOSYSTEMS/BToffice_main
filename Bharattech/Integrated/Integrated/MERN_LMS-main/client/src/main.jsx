import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { BrowserRouter } from "react-router-dom";
import React from "react";
import { AppProvider } from "./context/AppContext.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { CourseProvider } from "./context/CourseContext.jsx";
import { EnrollmentProvider } from "./context/EnrollmentContext.jsx";
import { ErrorBoundary } from "./components/common/ErrorBoundary.jsx";
import { forgetOldSignIns, goToSignIn, signIn } from "./auth/keycloak.js";

const root = createRoot(document.getElementById("root"));

const renderApp = () => {
  root.render(
    <ErrorBoundary>
      <BrowserRouter>
        <AppProvider>
          <AuthProvider>
            <CourseProvider>
              <EnrollmentProvider>
                <App />
              </EnrollmentProvider>
            </CourseProvider>
          </AuthProvider>
        </AppProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
};

const renderSignInProblem = () => {
  root.render(
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-xl font-semibold text-slate-900">We couldn't reach the sign-in service</h1>
      <p className="max-w-md text-sm text-gray-600">Try again in a minute. If it keeps happening, tell your admin.</p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
      >
        Try again
      </button>
    </main>
  );
};

// Opened directly, or with the portal signed out: before Keycloak's page, which takes only a work email or username,
// say so, and where an Employee ID does work (owner's 1A, 2026-10-25).
const renderSignIn = () => {
  root.render(
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-xl font-semibold text-slate-900">Sign in with your work email</h1>
      <p className="max-w-md text-sm text-gray-600">Use your work email and your portal password.</p>
      <button
        type="button"
        onClick={goToSignIn}
        className="rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
      >
        Continue
      </button>
      <p className="max-w-md text-xs text-gray-500">Employee ID? Open Learning from the portal and you'll arrive signed in.</p>
    </main>
  );
};

// while the portal is asked for its sign-in (it may renew it first, on a slow network for a while), say so
const renderSigningIn = () => {
  root.render(
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center" role="status">
      <p className="text-sm text-gray-600">Signing you in…</p>
    </main>
  );
};

forgetOldSignIns();
renderSigningIn();
signIn()
  .then((signedIn) => (signedIn ? renderApp() : renderSignIn()))
  .catch((error) => {
    console.error("Sign-in failed:", error);
    renderSignInProblem();
  });
