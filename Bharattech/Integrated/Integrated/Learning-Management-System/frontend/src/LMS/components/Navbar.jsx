import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useSidebar } from "../../contexts/SidebarContext";

export default function TopNav() {
  const { toggleSidebar } = useSidebar();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  
  // Don't render on LMS routes
  if (location.pathname.startsWith('/lms')) {
    return null;
  }

  return (
    <nav className="fixed top-0 left-0 w-full z-50 glass-transparent">
      <div className="max-w-screen-2xl mx-auto px-3 sm:px-4 md:px-8">
        {/* Main Navbar */}
        <div className="flex items-center justify-between h-[72px]">
          {/* LEFT SIDE — Toggle Button + Logo */}
          <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
            {/* Toggle Button */}
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-md hover:bg-gray-100 transition-all duration-200 flex-shrink-0"
              aria-label="Toggle sidebar"
            >
              <Menu className="w-5 h-5 sm:w-6 sm:h-6 text-gray-700" strokeWidth={1.5} />
            </button>

            {/* LOGO */}
            <div className="flex items-center gap-2 sm:gap-3 select-none min-w-0">
              {/* Orange Square Icon */}
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-md flex-shrink-0">
                <span className="text-white font-semibold text-xs sm:text-sm">BT</span>
              </div>

              {/* Company Name + Tagline */}
              <div className="leading-tight min-w-0">
                <h1 className="text-base sm:text-lg font-semibold text-blue-600 truncate">
                  Bharat<span className="text-purple-600">tech</span>
                </h1>
                <p className="text-[10px] sm:text-xs text-gray-600 -mt-1 hidden sm:block">
                  Deep-Tech AI Solutions
                </p>
              </div>
            </div>
          </div>

          {/* CENTER — Navigation Links (Desktop) */}
          <div className="hidden lg:flex items-center justify-center gap-6 xl:gap-8 text-sm font-medium flex-1">
            <Link 
              to="/" 
              className="hover:text-blue-600 transition text-blue-600 relative"
            >
              Home
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600"></span>
            </Link>
            <Link 
              to="/about" 
              className="hover:text-blue-600 transition text-gray-700"
            >
              About
            </Link>
            <Link 
              to="/services" 
              className="hover:text-blue-600 transition text-gray-900"
            >
              Services
            </Link>
            <Link 
              to="/startups" 
              className="hover:text-blue-600 transition text-gray-900"
            >
              Startups
            </Link>
            <Link 
              to="/contact" 
              className="hover:text-blue-600 transition text-gray-900"
            >
              Contact
            </Link>
          </div>

          {/* RIGHT SIDE — SSO Login Button + Mobile Menu Toggle */}
          <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
            {/* SSO Login Button */}
            <Link
              to="/login"
              className="
                px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg
                bg-blue-600 hover:bg-blue-700
                text-white shadow-md
                transition
                text-xs sm:text-sm font-medium
                whitespace-nowrap
              "
            >
              <span className="hidden sm:inline">SSO Login</span>
              <span className="sm:hidden">Login</span>
            </Link>

            {/* Mobile Menu Toggle - Hidden on mobile, logic preserved */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="hidden p-2 rounded-md hover:bg-gray-100 transition-all duration-200"
              aria-label="Toggle mobile menu"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5 text-gray-700" strokeWidth={1.5} />
              ) : (
                <Menu className="w-5 h-5 text-gray-700" strokeWidth={1.5} />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-white/20 glass-transparent">
            <div className="flex flex-col py-4 space-y-1">
              <Link
                to="/"
                onClick={() => setMobileMenuOpen(false)}
                className="px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 transition"
              >
                Home
              </Link>
              <Link
                to="/about"
                onClick={() => setMobileMenuOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                About
              </Link>
              <Link
                to="/services"
                onClick={() => setMobileMenuOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50 transition"
              >
                Services
              </Link>
              <Link
                to="/startups"
                onClick={() => setMobileMenuOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50 transition"
              >
                Startups
              </Link>
              <Link
                to="/contact"
                onClick={() => setMobileMenuOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50 transition"
              >
                Contact
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
