import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { toast } from "react-toastify";
import logo from "../../assets/BHARATTECH ORIGIN Logo-01.png";
import { usePhoneMenu } from "../../hooks/usePhoneMenu";
import { menuButton, menuPanel, menuRow, primaryButton, quietButton } from "../students/ui";

// The educator pages' top bar (owner's 2A, 2026-10-26): the same bar as the learner side, with the educator's
// three pages as tabs and "Add a course" as the one action, instead of a sidebar.
const TABS = [
  { label: "Dashboard", to: "/educator/dashboard", match: (p) => p === "/educator" || p.startsWith("/educator/dashboard") },
  { label: "My courses", to: "/educator/my-courses", match: (p) => p.startsWith("/educator/my-courses") },
  { label: "Learners", to: "/educator/students-enrolled", match: (p) => p.startsWith("/educator/students-enrolled") },
];

const tab = (active) =>
  `relative px-1 py-5 text-sm font-medium transition-colors duration-150 ease-snappy ${
    active ? "text-ink after:absolute after:inset-x-1 after:bottom-0 after:h-0.5 after:rounded-full after:bg-act" : "text-muted mhover:text-ink"
  }`;

function EducatorNavbar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { switchViewRole, isAdmin, signOut } = useAuth();
  const adding = pathname.startsWith("/educator/add-course");
  // below 768 px the tabs and buttons live in a Menu panel (owner's E1A, 2026-10-27): in one row they ran 663 px
  // wide on a 375 px phone, so every educator page loaded zoomed out
  const { menuOpen, setMenuOpen, navRef } = usePhoneMenu();

  const handleStudentView = () => {
    if (!switchViewRole("student")) return;
    toast.success("You're now seeing Learning as a learner.");
    navigate("/");
  };

  return (
    <nav ref={navRef} className="sticky top-0 z-50 w-full border-b border-line bg-paper/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-6 px-6">
        <div className="flex items-center gap-8">
          <Link to="/educator/dashboard" aria-label="Educator dashboard" className="flex shrink-0 items-center py-2">
            <img src={logo} alt="Bharattech" className="h-14 w-auto object-contain" />
          </Link>
          <div className="hidden items-center gap-5 md:flex">
            {TABS.map((item) => {
              const active = item.match(pathname);
              return (
                <Link key={item.to} to={item.to} className={tab(active)} aria-current={active ? "page" : undefined}>
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="hidden shrink-0 items-center gap-2 md:flex">
          {!adding && (
            <Link to="/educator/add-course" className={`px-4 py-1.5 text-sm ${primaryButton}`}>
              Add a course
            </Link>
          )}
          {isAdmin() && (
            <button type="button" onClick={handleStudentView} className={`px-4 py-1.5 text-sm ${quietButton}`}>
              View as learner
            </button>
          )}
          <button type="button" onClick={signOut} className={`px-4 py-1.5 text-sm ${quietButton}`}>
            Sign out
          </button>
        </div>

        <button
          type="button"
          aria-controls="edu-menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
          className={menuButton}
        >
          {menuOpen ? <X className="h-4 w-4" aria-hidden="true" /> : <Menu className="h-4 w-4" aria-hidden="true" />}
          Menu
        </button>
      </div>

      {menuOpen && (
        <div id="edu-menu" className={menuPanel}>
          {TABS.map((item) => {
            const active = item.match(pathname);
            return (
              <Link key={item.to} to={item.to} className={`${menuRow} ${active ? "text-act-deep" : ""}`} aria-current={active ? "page" : undefined}>
                {item.label}
              </Link>
            );
          })}
          <div className="my-2 border-t border-line" />
          {!adding && (
            <Link to="/educator/add-course" className={`${menuRow} text-act-deep`}>
              Add a course
            </Link>
          )}
          {isAdmin() && (
            <button type="button" onClick={handleStudentView} className={menuRow}>
              View as learner
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

export default EducatorNavbar;
