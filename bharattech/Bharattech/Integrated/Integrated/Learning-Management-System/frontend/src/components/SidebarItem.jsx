// src/components/ui/sidebar.jsx
import React from "react";
import { NavLink } from "react-router-dom";

import {
  LayoutDashboard,
  Blocks,
  FileText,
  MousePointerClick,
  GitMerge,
  BookOpen,
  GraduationCap,
  ClipboardList,
  CheckCircle2,
  Video,
  MessageCircle,
  Users,
  Folder,
} from "lucide-react"; // ← All valid icons

export default function Sidebar() {
  return (
    <div className="w-[220px] h-screen fixed left-0 top-0 bg-white border-r shadow-sm flex flex-col">

      {/* Logo */}
      <div className="px-4 py-6 flex items-center gap-3 border-b">
        <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center shadow-md">
          <span className="text-white font-bold text-sm">BT</span>
        </div>

        <div className="flex flex-col leading-tight">
          <span className="text-lg font-semibold text-gradient-primary">
            BharatTech
          </span>
          <span className="text-[10px] text-gray-400">
            Tech Ecosystem
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">

        {/* TOP MENU */}
        <div className="space-y-1">
          <SidebarLink path="/dashboard" icon={LayoutDashboard} label="Dashboard" />
        </div>

        {/* SECTION TITLE */}
        <SectionTitle title="LEARNING MANAGEMENT" />

        <div className="space-y-1">
          <SidebarLink path="/courses" icon={BookOpen} label="Courses" />
          <SidebarLink path="/my-learning" icon={GraduationCap} label="My Learning" />
          <SidebarLink path="/assignments" icon={ClipboardList} label="Assignments" />
          <SidebarLink path="/grades" icon={CheckCircle2} label="Grades" />
          <SidebarLink path="/live-classes" icon={Video} label="Live Classes" />
        </div>

        {/* SECTION TITLE */}
        <SectionTitle title="RESOURCES" />

        <div className="space-y-1">
          <SidebarLink path="/resources" icon={Folder} label="Resources" />
        </div>
      </div>

      {/* Bottom Box */}
      <div className="p-4 border-t bg-blue-50">
        <div className="font-semibold text-blue-700">Upgrade Plan</div>
        <p className="text-xs text-blue-600 mb-3">
          Unlock premium analytics & unlimited tools
        </p>
        <button className="w-full py-2 bg-blue-500 text-white rounded-md text-sm font-medium hover:bg-blue-600">
          Upgrade Now
        </button>
      </div>

    </div>
  );
}

function SidebarLink({ path, icon: Icon, label }) {
  return (
    <NavLink
      to={path}
      className={({ isActive }) =>
        `flex items-center gap-3 p-2 rounded-md text-sm transition-all
        ${isActive ? "bg-blue-500 text-white" : "text-gray-700 hover:bg-gray-100"}`
      }
    >
      <Icon className="w-4 h-4" />
      {label}
    </NavLink>
  );
}

function SectionTitle({ title }) {
  return <p className="px-2 text-xs text-gray-400">{title}</p>;
}
