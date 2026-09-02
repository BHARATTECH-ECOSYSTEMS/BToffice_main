import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Plus, ChevronDown } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";

const navLinks = [
  { label: "About Us", href: "/about" },
  { label: "Platforms", href: "/platforms" },
  { label: "Careers", href: "/careers" },
  { label: "Research", href: "/research" },
];

const languageOptions = ["EN", "HI", "TA"];

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [language, setLanguage] = useState("EN");
  const location = useLocation();
  const navigate = useNavigate();

  const closeMenus = () => {
    setMobileOpen(false);
    setMenuOpen(false);
    setLanguageOpen(false);
  };

  const handleGetStarted = () => {
    closeMenus();

    if (location.pathname === "/employees") {
      document.getElementById("employee-access")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    navigate("/employees#employee-access");
  };

  return (
    <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 h-20 flex items-center justify-between gap-3 lg:gap-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 font-display text-xl font-bold tracking-tight text-foreground shrink-0">
          <span className="w-8 h-8 rounded-full bg-foreground text-background flex items-center justify-center text-sm">B</span>
          Bharattech
        </Link>

        {/* Centered pill nav */}
        <div className="hidden lg:flex flex-1 justify-center">
          <div className="flex items-center gap-1 px-2 py-2 rounded-full bg-card border border-border/60 shadow-sm">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                to={link.href}
                onClick={closeMenus}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${
                  location.pathname === link.href
                    ? "bg-foreground text-background"
                    : "text-foreground hover:bg-muted"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Right cluster */}
        <div className="hidden sm:flex items-center gap-2 lg:gap-3 shrink-0">
          <button
            type="button"
            onClick={handleGetStarted}
            className="inline-flex items-center gap-2 h-11 px-4 lg:px-5 rounded-full bg-card border border-border/60 text-sm font-medium text-foreground hover:bg-muted transition-colors shadow-sm"
          >
            Employee Login
          </button>
          <div className="relative">
            <button
              type="button"
              aria-expanded={languageOpen}
              onClick={() => {
                setLanguageOpen((open) => !open);
                setMenuOpen(false);
              }}
              className="inline-flex items-center gap-1.5 h-11 px-4 rounded-full bg-card border border-border/60 text-sm font-medium text-foreground hover:bg-muted transition-colors shadow-sm"
            >
              {language}
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${languageOpen ? "rotate-180" : ""}`} />
            </button>
            <AnimatePresence>
              {languageOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="absolute right-0 mt-2 w-24 overflow-hidden rounded-2xl bg-card border border-border/60 shadow-lg"
                >
                  {languageOptions.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => {
                        setLanguage(option);
                        setLanguageOpen(false);
                      }}
                      className={`block w-full px-4 py-2 text-left text-sm transition-colors ${
                        language === option ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <button
            type="button"
            aria-label="Open menu"
            aria-expanded={menuOpen}
            onClick={() => {
              setMenuOpen((open) => !open);
              setLanguageOpen(false);
            }}
            className="h-11 w-11 rounded-full bg-card border border-border/60 flex items-center justify-center text-foreground hover:bg-muted transition-colors shadow-sm"
          >
            {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>

        {/* Mobile trigger */}
        <button
          type="button"
          aria-label="Toggle navigation"
          aria-expanded={mobileOpen}
          className="sm:hidden h-10 w-10 rounded-full border border-border/60 bg-card flex items-center justify-center text-foreground shadow-sm"
          onClick={() => {
            setMobileOpen(!mobileOpen);
            setMenuOpen(false);
            setLanguageOpen(false);
          }}
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="hidden sm:block absolute right-4 lg:right-10 top-[72px] w-64 overflow-hidden rounded-3xl bg-card border border-border/60 shadow-xl"
          >
            <div className="p-3">
              <Link to="/" onClick={closeMenus} className="block rounded-2xl px-4 py-3 text-sm font-medium text-foreground hover:bg-muted">
                Home
              </Link>
              {navLinks.map((link) => (
                <Link key={link.label} to={link.href} onClick={closeMenus} className="block rounded-2xl px-4 py-3 text-sm font-medium text-foreground hover:bg-muted">
                  {link.label}
                </Link>
              ))}
              <button
                type="button"
                onClick={handleGetStarted}
                className="mt-2 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-foreground text-background text-sm font-semibold"
              >
                Employee Login
              </button>
            </div>
          </motion.div>
        )}

        {mobileOpen && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="sm:hidden bg-background border-t border-border/60 overflow-hidden">
            <div className="px-4 py-5 flex flex-col gap-2">
              <Link to="/" className="rounded-2xl px-4 py-3 text-sm font-medium text-foreground hover:bg-muted" onClick={closeMenus}>Home</Link>
              {navLinks.map((link) => (
                <Link key={link.label} to={link.href} className="rounded-2xl px-4 py-3 text-sm font-medium text-foreground hover:bg-muted" onClick={closeMenus}>{link.label}</Link>
              ))}
              <div className="grid grid-cols-3 gap-2 pt-2">
                {languageOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setLanguage(option)}
                    className={`h-10 rounded-full border border-border/60 text-sm font-medium ${
                      language === option ? "bg-foreground text-background" : "bg-card text-foreground"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={handleGetStarted}
                className="h-11 px-5 rounded-full bg-foreground text-background text-sm font-semibold w-full mt-2"
              >
                Employee Login
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
