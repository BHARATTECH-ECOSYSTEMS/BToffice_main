import React from "react";
import { Routes, Route, Navigate, BrowserRouter} from "react-router-dom";
import { SidebarProvider } from "./contexts/SidebarContext";
import Home from "./home";
import Dashboard from "./dashboard";
import Login from "./login";
import About from "./about";
import Services from "./services";
import Startups from "./startups";
import Contact from "./contact";
import Careers from "./careers";
import CMS from "./cms";
import Forms from "./forms";
import Clicks from "./clicks";
import SplitTesting from "./split-testing";
import AdminDashboard from "./admin-dashboard";
import SubAdminDashboard from "./subadmin-dashboard";
import EmployeeDashboard from "./employee-dashboard";
import InternDashboard from "./intern-dashboard";
import Profile from "./pages/Profile";
import PolicyCompliance from "./pages/PolicyCompliance";
import Interview from "./pages/Interview";
// LMS imports
import LMSLayout from "./LMS/LMSLayout";
import LMSLogin from "./LMS/pages/Login";
import Courses from "./LMS/pages/Courses";
import MyLearning from "./LMS/pages/Mylearning";
import Assignments from "./LMS/pages/Assignment";
import Grades from "./LMS/pages/Grades";
import Certificates from "./LMS/pages/Certificates";
import LiveClasses from "./LMS/pages/Liveclasses";
import Instructors from "./LMS/pages/Instructors";
import Wow from "./LMS/pages/Wow";
import Resource from "./pages/Resource";
import Layout from "./pages/Layout";
import Workspace from "./pages/Workspace";
import MyCertificatesPage from "./pages/MyCertificatesPage";
import MyCertificates from "./pages/MyCertificates";
import People from "./pages/People";

export default function App() {
  return (
    <BrowserRouter>
    <SidebarProvider>
    <Routes>
      {/* Main Dashboard Routes */}
      <Route path="/interview" element={<Interview />} />
      <Route path="/generate-certificate" element={<Layout><MyCertificatesPage /></Layout>} />
      <Route path="/certificates" element={<Layout><MyCertificatesPage /></Layout>} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Navigate to="/login" replace />} />
      <Route path="/" element={<Layout><Dashboard /></Layout>} />
      <Route
        path="/policy-compliance"
        element={
          <Layout>
            <PolicyCompliance />
          </Layout>
        }
      />
      <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
      <Route path="/people" element={<Layout><People /></Layout>} />
      <Route path="/about" element={<About />} />
      <Route path="/services" element={<Services />} />
      <Route path="/startups" element={<Startups />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/careers" element={<Careers />} />
      <Route path="/cms" element={<CMS />} />
      <Route path="/forms" element={<Forms />} />
      <Route path="/clicks" element={<Clicks />} />
      <Route path="/split-testing" element={<SplitTesting />} />
      <Route path="/admin-dashboard" element={<AdminDashboard />} />
      <Route path="/subadmin-dashboard" element={<SubAdminDashboard />} />
      <Route path="/employee-dashboard" element={<EmployeeDashboard />} />
      <Route path="/intern-dashboard" element={<InternDashboard />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/my-certificate" element={<Navigate to="/certificates" replace />} />
      <Route path="/resources" element={<Layout><Resource /></Layout>} />
      <Route path="/workspace" element={<Workspace />} />
      
      {/* LMS Routes */}
      <Route path="/lms/login" element={<LMSLogin />} />
      <Route path="/lms" element={<LMSLayout />}>
        <Route path="courses" element={<Courses />} />
        <Route path="my-learning" element={<MyLearning />} />
        <Route path="assignments" element={<Assignments />} />
        <Route path="grades" element={<Grades />} />
        <Route path="certificates" element={<Certificates />} />
        <Route path="live" element={<LiveClasses />} />
        <Route path="instructors" element={<Instructors />} />
        <Route path="wow" element={<Wow />} />
        <Route index element={<Navigate to="/lms/courses" replace />} />
      </Route>
      
      {/* Legacy LMS routes (for backward compatibility - redirect to /lms/*) */}
      <Route path="/courses" element={<Navigate to="/lms/courses" replace />} />
      <Route path="/my-learning" element={<Navigate to="/lms/my-learning" replace />} />
      <Route path="/assignments" element={<Navigate to="/lms/assignments" replace />} />
      <Route path="/grades" element={<Navigate to="/lms/grades" replace />} />
      <Route path="/live" element={<Navigate to="/lms/live" replace />} />
      <Route path="/instructors" element={<Navigate to="/lms/instructors" replace />} />
    </Routes>
    </SidebarProvider>
    </BrowserRouter>
  );
}
