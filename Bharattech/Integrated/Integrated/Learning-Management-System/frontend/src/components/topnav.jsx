import React, { useEffect, useState, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Menu, X, ChevronDown, LogOut, User } from "lucide-react";
import { useSidebar } from "../contexts/SidebarContext";
import { useAuth } from "../LMS/context/AuthContext";
import logo from "../assets/logo-topnav.png";

export default function TopNav() {
  const { toggleSidebar } = useSidebar();
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profile, setProfile] = useState(null);
  const [openMenu, setOpenMenu] = useState(false);

  // Force light mode permanently
  useEffect(() => {
    document.documentElement.classList.add("light");
    document.documentElement.classList.remove("dark");
    localStorage.removeItem("theme");
  }, []);

  // Check if on login page
  const isLoginPage = location.pathname === "/login" || location.pathname === "/lms/login";

  const menuRef = useRef(null);

  const { user, logout, loading, keycloak } = useAuth();

  // Sync profile with Keycloak / AuthContext
  useEffect(() => {
    if (user) {
      setProfile(user);
      return;
    }

    // fallback to stored user
    const stored = localStorage.getItem("user");
    if (stored) {
      try {
        setProfile(JSON.parse(stored));
      } catch (e) { }
    }
  }, [user]);

  /* ---------------- Close dropdown on outside click ---------------- */
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /* ---------------- Logout ---------------- */
  const handleLogout = async () => {
    // Use Keycloak logout if available
    try {
      if (logout) await logout();
    } catch (e) {
      // fallback
      localStorage.clear();
      navigate("/login");
    }
  };

  return (
    <nav className="fixed left-0 top-0 z-50 h-[72px] w-full border-b border-gray-100 bg-white/95 shadow-sm backdrop-blur-md">
      <div className="h-full px-3 sm:px-4 md:px-8">
        <div className="flex h-full min-w-0 items-center justify-between gap-3">

          {/* LEFT SIDE — Toggle + Logo */}
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-4">
            <button
              onClick={toggleSidebar}
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md transition hover:bg-gray-100"
              aria-label="Toggle sidebar"
            >
              <Menu className="w-5 h-5 sm:w-6 sm:h-6 text-gray-700" />
            </button>

            <div className="flex min-w-0 items-center gap-3">
<div className="flex h-10 w-40 max-w-[50vw] items-center justify-start overflow-hidden sm:w-44 logo-container">                <img
                  src={logo}
                  alt="BharatTech"
                  className="logo-img h-full w-auto object-contain object-left"
                />
              </div>
            </div>
          </div>

          {/* RIGHT SIDE */}
          <div className="flex min-w-0 flex-shrink-0 items-center justify-end gap-2 sm:gap-3">

            {/* ---------- PROFILE DROPDOWN (hidden on login page) ---------- */}
            {profile && !isLoginPage && (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setOpenMenu(!openMenu)}
                  className="flex max-w-[46vw] items-center gap-2 rounded-lg px-2 py-1 transition hover:bg-gray-100 sm:max-w-[260px]"
                >
                  <img
                    src={profile.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.fullName || "U")}&size=40&background=2563eb&color=fff`}
                    alt="profile"
                    className="h-9 w-9 flex-shrink-0 rounded-full"
                  />
                  <span className="hidden min-w-0 truncate text-sm font-medium sm:block">
                    {profile.fullName || profile.email?.split("@")[0] || "User"}
                  </span>
                  <ChevronDown className="h-4 w-4 flex-shrink-0 text-gray-500" />
                </button>

                {openMenu && (
                  <div className="absolute right-0 z-[60] mt-2 w-48 overflow-hidden rounded-lg bg-white shadow-lg ring-1 ring-black/5">
                    <button
                      onClick={() => navigate("/profile")}
                      className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50 w-full"
                    >
                      <User className="w-4 h-4" /> My Profile
                    </button>

                    {/*border */}
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full"
                    >
                      <LogOut className="w-4 h-4" /> Logout
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* SSO Login Button - only show when NOT authenticated */}
            {(!keycloak?.authenticated && !profile) && (
              <Link
                to="/login"
                className="px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium shadow"
              >
                SSO Login
              </Link>
            )}

            {/* Mobile Menu Button (kept for future) */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="hidden p-2 rounded-md hover:bg-gray-100"
            >
              {mobileMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
