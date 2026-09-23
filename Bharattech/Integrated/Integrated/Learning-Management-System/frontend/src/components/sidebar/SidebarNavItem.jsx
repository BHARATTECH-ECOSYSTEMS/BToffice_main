import React from "react";
import { NavLink } from "react-router-dom";
import { BookOpen } from "lucide-react";

export function SidebarSection({ title, children }) {
  return (
    <div>
      <p className="px-2 mb-2 text-xs font-bold text-gray-500 uppercase">
        {title}
      </p>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

export function SidebarItem({ item, onLinkClick }) {
  const Icon = item.icon || BookOpen;

  if (item.external && !item.path) {
    return (
      <button
        type="button"
        disabled
        title={`${item.label} URL is not configured`}
        className="flex w-full cursor-not-allowed items-center gap-3 rounded-xl p-3 text-left text-sm font-medium text-gray-400 opacity-70"
      >
        <Icon className="h-5 w-5" />
        <span>{item.label}</span>
      </button>
    );
  }

  if (item.action) {
    return (
      <button
        type="button"
        onClick={item.action}
        disabled={item.disabled}
        className="flex w-full items-center gap-3 rounded-xl p-3 text-left text-sm font-medium text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 disabled:cursor-wait disabled:opacity-70 cursor-pointer"
      >
        <Icon className="h-5 w-5" />
        <span>{item.label}</span>
      </button>
    );
  }

  if (item.external) {
    return (
      <a
        href={item.path}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onLinkClick}
        className="flex items-center gap-3 p-3 rounded-xl text-sm font-medium text-gray-700 hover:bg-indigo-50 hover:text-indigo-600"
      >
        <Icon className="w-5 h-5" />
        <span>{item.label}</span>
      </a>
    );
  }

  return (
    <NavLink
      to={item.path}
      onClick={onLinkClick}
      className={({ isActive }) =>
        `flex items-center gap-3 p-3 rounded-xl text-sm font-medium ${
          isActive
            ? "bg-indigo-600 text-white"
            : "text-gray-700 hover:bg-indigo-50 hover:text-indigo-600"
        }`
      }
    >
      <Icon className="w-5 h-5" />
      <span>{item.label}</span>
    </NavLink>
  );
}
