import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { toast } from "react-toastify";
import EducatorNavbar from "../educator/Navbar";
import logo from "../../assets/BHARATTECH ORIGIN Logo-01.png";
import { usePhoneMenu } from "../../hooks/usePhoneMenu";
import { menuButton, menuPanel, menuRow, quietButton } from "./ui";

const PORTAL_URL = import.meta.env.VITE_PORTAL_URL;

const tab = ({ isActive }) =>
  `relative px-1 py-5 text-sm font-medium transition-colors duration-150 ease-snappy ${
    isActive ? "text-ink after:absolute after:inset-x-1 after:bottom-0 after:h-0.5 after:rounded-full after:bg-act" : "text-muted mhover:text-ink"
  }`;
const quiet = `${quietButton} px-4 py-1.5 text-sm`;

function Navbar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { viewRole, switchViewRole, isAdmin, signOut } = useAuth();
  // the course list and a course's page belong to Courses; a course you're taking (the player) to My courses
  const onMine = pathname.startsWith("/my-enrollments") || pathname.startsWith("/player");
  const onCourses = !onMine && (pathname === "/" || pathname.startsWith("/course"));
  // below 768 px the links live in a Menu panel (owner's L1A, 2026-10-27): in one row they ran 600 px wide on a phone
  const { menuOpen, setMenuOpen, navRef } = usePhoneMenu();

  if (viewRole === "educator") {
    return <EducatorNavbar />;
  }

  const handleEducatorView = () => {
    if (!switchViewRole("educator")) return;
    toast.success("You're now seeing Learning as an educator.");
    navigate("/educator/dashboard");
  };

  return (
    <nav ref={navRef} className="sticky top-0 z-50 w-full border-b border-line bg-paper/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-6 px-6">
        <div className="flex items-center gap-8">
          <Link to="/" aria-label="Learning home" className="flex shrink-0 items-center py-2">
            <img src={logo} alt="Bharattech" className="h-14 w-auto object-contain" />
          </Link>
          <div className="hidden items-center gap-5 md:flex">
            <Link to="/" className={tab({ isActive: onCourses })} aria-current={onCourses ? "page" : undefined}>
              Courses
            </Link>
            <Link to="/my-enrollments" className={tab({ isActive: onMine })} aria-current={onMine ? "page" : undefined}>
              My courses
            </Link>
          </div>
        </div>

        <div className="hidden shrink-0 items-center gap-2 md:flex">
          {PORTAL_URL && (
            <a href={PORTAL_URL} className="px-3 py-1.5 text-sm font-medium text-muted transition-colors duration-150 ease-snappy mhover:text-ink">
              Back to the portal
            </a>
          )}
          {isAdmin() && (
            <button type="button" onClick={handleEducatorView} className={quiet}>
              View as educator
            </button>
          )}
          <button type="button" onClick={signOut} className={quiet}>
            Sign out
          </button>
        </div>

        <button
          type="button"
          aria-controls="learn-menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
          className={menuButton}
        >
          {menuOpen ? <X className="h-4 w-4" aria-hidden="true" /> : <Menu className="h-4 w-4" aria-hidden="true" />}
          Menu
        </button>
      </div>

      {menuOpen && (
        <div id="learn-menu" className={menuPanel}>
          <Link to="/" className={`${menuRow} ${onCourses ? "text-act-deep" : ""}`} aria-current={onCourses ? "page" : undefined}>
            Courses
          </Link>
          <Link to="/my-enrollments" className={`${menuRow} ${onMine ? "text-act-deep" : ""}`} aria-current={onMine ? "page" : undefined}>
            My courses
          </Link>
          <div className="my-2 border-t border-line" />
          {PORTAL_URL && (
            <a href={PORTAL_URL} className={menuRow}>
              Back to the portal
            </a>
          )}
          {isAdmin() && (
            <button type="button" onClick={handleEducatorView} className={menuRow}>
              View as educator
            </button>
          )}
          <button type="button" onClick={signOut} className={menuRow}>
            Sign out
          </button>
        </div>
      )}
    </nav>
  );
}

export default Navbar;
