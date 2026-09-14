import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link, useLocation, useNavigate } from 'react-router';
import { Menu, X, ArrowUpRight, ExternalLink, Hash, FileText } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import bharattechLogo from '../../imports/BHARATTECH_ORIGIN_Logo-02.png';

const isLocalDev =
  typeof window !== 'undefined' &&
  ['localhost', '127.0.0.1'].includes(window.location.hostname);

const employeeLoginUrl = isLocalDev
  ? 'http://localhost:5173/login'
  : 'https://bharattech-learning-management-system.onrender.com/login';

interface NavItemSection {
  label: string;
  type: 'section';
  id: string;
}

interface NavItemRoute {
  label: string;
  type: 'route';
  to: string;
}

type NavItem = NavItemSection | NavItemRoute;

const mainSections: NavItemSection[] = [
  { label: 'Home', type: 'section', id: 'home' },
  { label: 'Mission', type: 'section', id: 'mission' },
  { label: 'Capabilities', type: 'section', id: 'capabilities' },
];

const pageRoutes: NavItemRoute[] = [
  { label: 'Research', type: 'route', to: '/research' },
  { label: 'Careers', type: 'route', to: '/careers' },
  { label: 'Blog', type: 'route', to: '/blog' },
  { label: 'Contact', type: 'route', to: '/contact' },
];

export const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('home');

  useEffect(() => {
    if (location.pathname !== '/') return;

    const sectionIds = mainSections.map((s) => s.id);
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 200;

      for (let i = sectionIds.length - 1; i >= 0; i--) {
        const id = sectionIds[i];
        const el = document.getElementById(id);
        if (el) {
          const top = el.offsetTop;
          if (scrollPosition >= top) {
            setActiveSection(id);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [location.pathname]);

  const handleSectionClick = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    setMobileOpen(false);
    if (location.pathname === '/') {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    } else {
      navigate('/', { state: { scrollTo: id } });
    }
  };

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-8 py-2"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center min-w-0 bg-[#F4F4F8]/85 backdrop-blur-xl px-4 py-2 rounded-full border border-[#EDEDF3] shadow-sm shadow-black/5 h-12">
          <Link to="/" className="flex items-center">
            <ImageWithFallback
              src={bharattechLogo}
              alt="Bharattech Origin Logo"
              className="h-44 object-contain flex-shrink-0 -my-14"
            />
          </Link>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex items-center gap-1.5 bg-[#F4F4F8]/85 backdrop-blur-xl px-4 py-2 rounded-full border border-[#EDEDF3] shadow-sm shadow-black/5">
          {/* Section Navigation Links */}
          <div className="flex items-center gap-1">
            {mainSections.map((item) => {
              const isActive = location.pathname === '/' && activeSection === item.id;
              return (
                <a
                  key={item.label}
                  href={`#${item.id}`}
                  onClick={handleSectionClick(item.id)}
                  className={`relative px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 flex items-center gap-1 ${
                    isActive
                      ? 'text-[#09090B] font-semibold bg-white shadow-xs'
                      : 'text-[#09090B]/60 hover:text-[#09090B] hover:bg-white/50'
                  }`}
                  title={`Scroll to ${item.label} section`}
                >
                  <span>{item.label}</span>
                </a>
              );
            })}
          </div>

          {/* Divider */}
          <div className="w-[1px] h-4 bg-[#09090B]/15 mx-1" aria-hidden="true" />

          {/* Page Navigation Links */}
          <div className="flex items-center gap-1">
            {pageRoutes.map((item) => {
              const isActive = location.pathname === item.to;
              return (
                <Link
                  key={item.label}
                  to={item.to}
                  className={`relative px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 flex items-center gap-1 ${
                    isActive
                      ? 'text-[#09090B] font-semibold bg-white shadow-xs'
                      : 'text-[#09090B]/65 hover:text-[#09090B] hover:bg-white/50'
                  }`}
                  title={`Go to ${item.label} page`}
                >
                  <span>{item.label}</span>
                  <ArrowUpRight size={12} className="opacity-45 -mr-0.5" />
                </Link>
              );
            })}
          </div>

          {/* Login Button */}
          <div className="pl-1">
            <a
              href={employeeLoginUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-1.5 rounded-full text-xs font-semibold text-white bg-[#09090B] hover:bg-[#09090B]/85 transition-all duration-200 flex items-center gap-1.5 shadow-xs"
            >
              <span>Employee Login</span>
              <ExternalLink size={12} className="opacity-75" />
            </a>
          </div>
        </div>

        {/* Mobile Menu Button */}
        <button
          type="button"
          onClick={() => setMobileOpen((open) => !open)}
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileOpen}
          className="lg:hidden flex items-center justify-center w-10 h-10 rounded-full bg-[#F4F4F8]/85 backdrop-blur-xl border border-[#EDEDF3] text-[#09090B] flex-shrink-0 shadow-xs active:scale-95 transition-transform"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="lg:hidden mt-3 max-w-7xl mx-auto flex flex-col gap-3 bg-[#F4F4F8]/95 backdrop-blur-2xl rounded-2xl border border-[#EDEDF3] p-4 shadow-xl max-h-[80vh] overflow-y-auto"
          >
            {/* Section Links */}
            <div>
              <div className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#09090B]/40 flex items-center gap-1">
                <Hash size={12} />
                <span>Page Sections</span>
              </div>
              <div className="flex flex-col gap-1 mt-1">
                {mainSections.map((item) => {
                  const isActive = location.pathname === '/' && activeSection === item.id;
                  return (
                    <a
                      key={item.label}
                      href={`#${item.id}`}
                      onClick={handleSectionClick(item.id)}
                      className={`px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center justify-between ${
                        isActive
                          ? 'bg-white text-[#09090B] font-semibold shadow-xs'
                          : 'text-[#09090B]/75 hover:bg-white/60'
                      }`}
                    >
                      <span>{item.label}</span>
                      <span className="text-xs text-[#09090B]/40 font-normal">Section</span>
                    </a>
                  );
                })}
              </div>
            </div>

            <div className="h-[1px] bg-[#09090B]/10 my-0.5" />

            {/* Page Routes */}
            <div>
              <div className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#09090B]/40 flex items-center gap-1">
                <FileText size={12} />
                <span>Pages</span>
              </div>
              <div className="flex flex-col gap-1 mt-1">
                {pageRoutes.map((item) => {
                  const isActive = location.pathname === item.to;
                  return (
                    <Link
                      key={item.label}
                      to={item.to}
                      onClick={() => setMobileOpen(false)}
                      className={`px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center justify-between ${
                        isActive
                          ? 'bg-white text-[#09090B] font-semibold shadow-xs'
                          : 'text-[#09090B]/75 hover:bg-white/60'
                      }`}
                    >
                      <span>{item.label}</span>
                      <ArrowUpRight size={14} className="opacity-40" />
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="h-[1px] bg-[#09090B]/10 my-0.5" />

            {/* Login */}
            <a
              href={employeeLoginUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setMobileOpen(false)}
              className="px-4 py-3 rounded-xl text-sm font-semibold text-white bg-[#09090B] hover:bg-[#09090B]/90 transition-colors flex items-center justify-between shadow-xs"
            >
              <span>Employee Login</span>
              <ExternalLink size={14} className="opacity-75" />
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
};
