import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Plus, ChevronDown, LogOut, LayoutDashboard, User } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { initSSO, onSSOChange, ssoLogout, getConnectedApps, getSSOAccessToken, type SSOUser } from "@/lib/sso";
import { attachHoverLift } from "@/lib/animations";
import logo from "../../assets/web-logo.png";

const navLinks = [
  { label: "About Us", href: "/about" },
  { label: "Platforms", href: "/platforms" },
  { label: "Careers", href: "/careers" },
  { label: "Research", href: "/research" },
];

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [ssoUser, setSSOUser] = useState<SSOUser | null>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);

  const location = useLocation();
  const navigate = useNavigate();

  // Subtle lift + scale on every pill button/link in the navbar — pure micro-interaction, no markup change.
  useEffect(() => {
    if (!navRef.current) return;
    const targets = navRef.current.querySelectorAll<HTMLElement>("a.rounded-full, button.rounded-full");
    const cleanups = Array.from(targets).map((el) => attachHoverLift(el, { lift: 2, scale: 1.02 }));
    return () => cleanups.forEach((c) => c());
  }, [ssoUser]);

  // Initialise SSO once and subscribe to changes
  useEffect(() => {
    initSSO().then(setSSOUser);
    const unsub = onSSOChange(setSSOUser);
    return unsub;
  }, []);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const closeMenus = () => {
    setMobileOpen(false);
    setProfileOpen(false);
  };

  const handleGetStarted = () => {
    closeMenus();
    navigate("/employees");
  };

  const handleLogout = async () => {
    closeMenus();
    await ssoLogout();
  };

  const apps = getConnectedApps();
  const lmsApp = apps[0];
  const accessToken = getSSOAccessToken();
  const lmsUrl = lmsApp
    ? `${lmsApp.url}${lmsApp.dashboardPath}${accessToken ? `?token=${encodeURIComponent(accessToken)}` : ''}`
    : "http://localhost:5173/dashboard";

  const avatarInitials = ssoUser
    ? (ssoUser.firstName?.[0] || ssoUser.fullName?.[0] || "?").toUpperCase()
    : "";

  return (
<div className="sticky top-4 z-50 mx-4 sm:mx-6 lg:mx-8">     
  <nav
  ref={navRef}
  className="relative rounded-2xl border border-white/10"
  style={{
    background: "linear-gradient(90deg, #8F7BFF 0%, #4D31E8 50%, #8F7BFF 100%)",
    boxShadow: "0 10px 30px rgba(77, 49, 232, 0.35)"
  }}
>
      <div className="relative w-full px-6 lg:px-10 h-20 flex items-center justify-between gap-3 lg:gap-4">

        {/* Logo */}
        <Link
          to="/"
          className="flex items-center shrink-0"
        >
          <img
            src={logo}
            alt="Bharattech"
            className="h-10 w-auto object-cover"
            style={{
              aspectRatio: "3402 / 834",
              objectPosition: "center",
            }}
          />
        </Link>
        {/* Centered pill nav */}
        <div className="hidden lg:flex flex-1 justify-center">
          <div className="flex items-center gap-1 px-2 py-2 rounded-full bg-white/5 border border-white/10">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                to={link.href}
                onClick={closeMenus}
                className={`px-5 py-2.5 rounded-full text-sm font-medium transition-colors ${location.pathname === link.href
                  ? "bg-white text-[#040406]"
                  : "text-white/80 hover:bg-white/10 hover:text-white"
                  }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Right cluster */}
        <div className="hidden sm:flex items-center gap-2 lg:gap-3 shrink-0">

          {/* ── If user is NOT logged in: show Employee Login button ── */}
          {!ssoUser && (
            <button
              type="button"
              onClick={handleGetStarted}
              className="inline-flex items-center gap-2 h-11 px-5 rounded-full bg-white text-[#040406] text-sm font-medium hover:bg-white/90 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Employee Login
            </button>
          )}

          {/* ── If user IS logged in: show person icon + dropdown ── */}
          {ssoUser && (
            <div className="relative" ref={profileRef}>
              <button
                type="button"
                onClick={() => setProfileOpen((o) => !o)}
                className="flex items-center gap-2 h-11 px-4 rounded-full bg-white text-[#040406] text-sm font-medium hover:bg-white/90 transition-colors"
              >
                {/* Avatar circle with initials */}
                <span className="w-7 h-7 rounded-full bg-brand-primary text-white flex items-center justify-center text-xs font-bold select-none">
                  {avatarInitials}
                </span>
                <span className="hidden md:block max-w-[120px] truncate">{ssoUser.fullName}</span>
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${profileOpen ? "rotate-180" : ""}`} />
              </button>

              <AnimatePresence>
                {profileOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="absolute right-0 mt-2 w-64 overflow-hidden rounded-2xl bg-[#040406] border border-white/10 shadow-xl"
                  >
                    {/* User info header */}
                    <div className="px-4 py-3 border-b border-white/10">
                      <div className="flex items-center gap-3">
                        <span className="w-9 h-9 rounded-full bg-brand-primary text-white flex items-center justify-center text-sm font-bold select-none shrink-0">
                          {avatarInitials}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{ssoUser.fullName}</p>
                          <p className="text-xs text-brand-muted truncate">{ssoUser.email}</p>
                          <span className="inline-block mt-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded bg-brand-primary/20 text-brand-secondary uppercase tracking-wide">
                            {ssoUser.role}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Connected app links */}
                    <div className="p-2">
                      {apps.map((app, i) => {
                        const href = i === 0 && accessToken
                          ? `${app.url}${app.dashboardPath}?token=${encodeURIComponent(accessToken)}`
                          : `${app.url}${app.dashboardPath}`;
                        return (
                          <a
                            key={app.name}
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={closeMenus}
                            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white hover:bg-white/10 transition-colors"
                          >
                            <LayoutDashboard className="h-4 w-4 text-brand-secondary shrink-0" />
                            {app.name}
                          </a>
                        );
                      })}

                      <div className="my-1 border-t border-white/10" />

                      <button
                        type="button"
                        onClick={handleLogout}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        <LogOut className="h-4 w-4 shrink-0" />
                        Sign Out
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

        </div>

        {/* Mobile trigger */}
        <button
          type="button"
          aria-label="Toggle navigation"
          aria-expanded={mobileOpen}
          className="sm:hidden h-10 w-10 rounded-full bg-white flex items-center justify-center text-[#040406]"
          onClick={() => { setMobileOpen(!mobileOpen); }}
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      <AnimatePresence>
        {/* Mobile panel */}
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="sm:hidden bg-[#040406] border-t border-white/10 overflow-hidden rounded-b-2xl"
          >
            <div className="px-4 py-5 flex flex-col gap-2">
              {ssoUser && (
                <div className="flex items-center gap-3 px-2 py-3 mb-1 rounded-2xl bg-white/5">
                  <span className="w-9 h-9 rounded-full bg-brand-primary text-white flex items-center justify-center text-sm font-bold select-none shrink-0">
                    {avatarInitials}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{ssoUser.fullName}</p>
                    <p className="text-xs text-brand-muted truncate">{ssoUser.email}</p>
                  </div>
                </div>
              )}
              <Link to="/" className="rounded-2xl px-4 py-3 text-sm font-medium text-white hover:bg-white/10" onClick={closeMenus}>Home</Link>
              {navLinks.map((link) => (
                <Link key={link.label} to={link.href} className="rounded-2xl px-4 py-3 text-sm font-medium text-white hover:bg-white/10" onClick={closeMenus}>{link.label}</Link>
              ))}
              {!ssoUser ? (
                <button
                  type="button"
                  onClick={handleGetStarted}
                  className="h-11 px-5 rounded-full bg-white text-[#040406] text-sm font-semibold w-full mt-2"
                >
                  Employee Login
                </button>
              ) : (
                <>
                  <a
                    href={lmsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={closeMenus}
                    className="flex h-11 items-center justify-center gap-2 rounded-full bg-brand-primary text-white text-sm font-semibold mt-2 hover:bg-brand-primary/90"
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    Dashboard
                  </a>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex h-11 items-center justify-center gap-2 rounded-full border border-white/10 text-sm font-semibold text-red-400 mt-1 hover:bg-red-500/10"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      </nav>
    </div>
  );
};

export default Navbar;
