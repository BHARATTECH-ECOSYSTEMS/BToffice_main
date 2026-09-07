import React from "react";
import { NavLink } from "react-router-dom";
import { assets } from "../../assets/assets";
import { useAuth } from "../../context/AuthContext";

function Sidebar() {
  const { isEducator } = useAuth();

  if (!isEducator) return null;

  const menuItems = [
    { name: "Dashboard", path: "/educator", icon: assets.home_icon },
    { name: "Add Course", path: "/educator/add-course", icon: assets.add_icon },
    {
      name: "My Courses",
      path: "/educator/my-courses",
      icon: assets.my_course_icon,
    },
    {
      name: "Student Enrolled",
      path: "/educator/students-enrolled",
      icon: assets.person_tick_icon,
    },
  ];

  return (
    <aside className="w-16 md:w-64 min-h-screen bg-white border-r border-slate-200/80 flex flex-col justify-between select-none shadow-[1px_0_6px_0_rgba(0,0,0,0.02)] transition-all duration-300">
      <div className="flex-1 py-4">
        {/* Subtle Section Label */}
        <p className="hidden md:block px-6 pb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Educator Menu
        </p>

        {/* Navigation Items */}
        <div className="space-y-1 px-2 md:px-3">
          {menuItems.map((item, index) => (
            <NavLink
              key={index}
              to={item.path}
              end={item.path === "/educator"}
              className={({ isActive }) =>
                `group flex items-center md:justify-start justify-center gap-3.5 px-3.5 py-3 rounded-xl text-sm font-medium transition-all duration-150 ease-in-out active:scale-[0.98] ${
                  isActive
                    ? "bg-indigo-50/90 text-indigo-700 font-semibold shadow-sm shadow-indigo-100/50"
                    : "text-slate-600 hover:bg-slate-100/70 hover:text-slate-900"
                }`
              }
              title={item.name}
            >
              {({ isActive }) => (
                <>
                  <img
                    src={item.icon}
                    alt={item.name}
                    className={`w-5 h-5 flex-shrink-0 transition-opacity duration-150 ${
                      isActive
                        ? "opacity-100"
                        : "opacity-60 group-hover:opacity-100"
                    }`}
                  />
                  <span className="hidden md:block truncate text-[13.5px]">
                    {item.name}
                  </span>

                  {/* Active Indicator Accent on Desktop */}
                  {isActive && (
                    <span className="hidden md:block ml-auto w-1.5 h-1.5 rounded-full bg-indigo-600" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
