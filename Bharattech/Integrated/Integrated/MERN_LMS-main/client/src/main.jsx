import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { BrowserRouter } from "react-router-dom";
import React from "react";
import { AppProvider } from "./context/AppContext.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { CourseProvider } from "./context/CourseContext.jsx";
import { EnrollmentProvider } from "./context/EnrollmentContext.jsx";

const renderApp = () => {
  createRoot(document.getElementById("root")).render(
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
  );
};

renderApp();
